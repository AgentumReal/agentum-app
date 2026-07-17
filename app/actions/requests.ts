"use server";

import { z } from "zod";
import { prisma } from "@/lib/db";
import { getOrCreateUser } from "@/lib/auth";

type Result<T = undefined> = { ok: true; data?: T } | { ok: false; error: string };

/** 某钱包发布的需求(仪表盘用) */
export async function getMyRequests(address: string) {
  if (!address || !address.startsWith("0x")) return [];
  return prisma.jobRequest.findMany({
    where: { client: { address: address.toLowerCase() } },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { bids: true } } },
  });
}

const PostSchema = z.object({
  clientAddress: z.string().min(1),
  title: z.string().min(1).max(120),
  brief: z.string().max(2000).default(""),
  category: z.enum(["CODE", "SECURITY", "DATA", "DESIGN"]),
  budgetHint: z.number().int().min(0).max(1_000_000).optional(),
  chainRequestId: z.string().optional(),
  postTxHash: z.string().optional(),
});

/** ① 客户端发布公开需求(链上 postRequest 后落库) */
export async function recordRequestPosted(input: z.infer<typeof PostSchema>): Promise<Result<{ id: string }>> {
  const p = PostSchema.safeParse(input);
  if (!p.success) return { ok: false, error: p.error.issues[0]?.message ?? "Invalid input" };
  const d = p.data;
  try {
    const client = await getOrCreateUser(d.clientAddress);
    const req = await prisma.jobRequest.create({
      data: {
        title: d.title,
        brief: d.brief,
        category: d.category,
        budgetHint: d.budgetHint ?? null,
        clientId: client.id,
        chainRequestId: d.chainRequestId ?? null,
        postTxHash: d.postTxHash ?? null,
      },
    });
    return { ok: true, data: { id: req.id } };
  } catch (err) {
    console.error("recordRequestPosted:", err);
    return { ok: false, error: "Failed to post request" };
  }
}

const BidSchema = z.object({
  requestId: z.string().min(1),
  providerHandle: z.string().min(1),
  providerAddress: z.string().min(1),
  amount: z.number().int().min(1),
  deliveryDays: z.number().int().min(1).max(60),
  message: z.string().max(500).default(""),
  chainBidIndex: z.number().int().optional(),
  bidTxHash: z.string().optional(),
});

/** ② provider 报价(链上 placeBid 后落库) */
export async function recordBidPlaced(input: z.infer<typeof BidSchema>): Promise<Result> {
  const p = BidSchema.safeParse(input);
  if (!p.success) return { ok: false, error: p.error.issues[0]?.message ?? "Invalid input" };
  const d = p.data;
  try {
    const req = await prisma.jobRequest.findUnique({ where: { id: d.requestId } });
    if (!req || !req.open) return { ok: false, error: "Request not open" };

    const provider = await prisma.providerAgent.findUnique({
      where: { handle: d.providerHandle },
      include: { owner: { select: { address: true } } },
    });
    if (!provider) return { ok: false, error: "Provider not found" };
    if (provider.owner.address.toLowerCase() !== d.providerAddress.toLowerCase()) {
      return { ok: false, error: "Bid must come from the agent owner wallet" };
    }

    await prisma.bid.create({
      data: {
        requestId: d.requestId,
        providerId: provider.id,
        amount: d.amount,
        deliveryDays: d.deliveryDays,
        message: d.message,
        chainBidIndex: d.chainBidIndex ?? null,
        bidTxHash: d.bidTxHash ?? null,
      },
    });
    return { ok: true };
  } catch (err) {
    console.error("recordBidPlaced:", err);
    return { ok: false, error: "Failed to place bid" };
  }
}

const AcceptSchema = z.object({
  requestId: z.string().min(1),
  bidId: z.string().min(1),
  clientAddress: z.string().min(1),
  chainJobId: z.string().optional(),
  escrowTxHash: z.string().optional(),
});

/** ③ 客户端接受报价 → 建 Job(ESCROWED)+ 关闭需求 */
export async function recordBidAccepted(input: z.infer<typeof AcceptSchema>): Promise<Result<{ jobId: string }>> {
  const p = AcceptSchema.safeParse(input);
  if (!p.success) return { ok: false, error: p.error.issues[0]?.message ?? "Invalid input" };
  const d = p.data;
  try {
    const client = await getOrCreateUser(d.clientAddress);
    const req = await prisma.jobRequest.findUnique({ where: { id: d.requestId } });
    if (!req || !req.open) return { ok: false, error: "Request not open" };
    if (req.clientId !== client.id) return { ok: false, error: "Not your request" };

    const bid = await prisma.bid.findUnique({ where: { id: d.bidId } });
    if (!bid || bid.requestId !== d.requestId) return { ok: false, error: "Bid not found" };

    const job = await prisma.job.create({
      data: {
        status: "ESCROWED",
        title: req.title,
        brief: req.brief,
        amount: bid.amount,
        clientId: client.id,
        providerId: bid.providerId,
        chainJobId: d.chainJobId ?? null,
        escrowTxHash: d.escrowTxHash ?? null,
        events: {
          create: [
            { kind: "quoted", note: `bid ${bid.amount} USDC accepted` },
            { kind: "escrowed", txHash: d.escrowTxHash ?? null, note: `${bid.amount} USDC escrowed` },
          ],
        },
      },
    });

    await prisma.jobRequest.update({
      where: { id: req.id },
      data: { open: false, acceptedJobId: job.id },
    });

    await prisma.marketStat.update({
      where: { id: 1 },
      data: { totalJobs: { increment: 1 }, totalEscrowed: { increment: bid.amount } },
    });

    return { ok: true, data: { jobId: job.id } };
  } catch (err) {
    console.error("recordBidAccepted:", err);
    return { ok: false, error: "Failed to accept bid" };
  }
}
