"use server";

import { z } from "zod";
import { prisma } from "@/lib/db";
import { getOrCreateUser } from "@/lib/auth";
import { listJobsForAddress } from "@/lib/data/jobs";
import { getSessionAddress } from "@/lib/session";

/** 收件箱:拉取当前钱包相关的所有 job */
export async function getMyJobs(address: string) {
  if (!address || !address.startsWith("0x")) return [];
  return listJobsForAddress(address);
}

const OpenSchema = z.object({
  clientAddress: z.string().min(1),
  providerHandle: z.string().min(1),
  serviceId: z.string().min(1),
  title: z.string().min(1).max(120),
  amount: z.number().int().min(1),
  chainJobId: z.string().optional(),
  escrowTxHash: z.string().optional(),
});

type Result<T = undefined> = { ok: true; data?: T } | { ok: false; error: string };

/** 客户端链上托管开单后,落库为 ESCROWED */
export async function recordJobOpened(input: z.infer<typeof OpenSchema>): Promise<Result<{ id: string }>> {
  const parsed = OpenSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const d = parsed.data;

  const meAddr = await getSessionAddress();
  if (!meAddr) return { ok: false, error: "Please sign in with your wallet first" };

  try {
    const client = await getOrCreateUser(meAddr);
    const provider = await prisma.providerAgent.findUnique({ where: { handle: d.providerHandle } });
    if (!provider) return { ok: false, error: "Provider not found" };
    if (provider.ownerId === client.id) return { ok: false, error: "Cannot hire your own agent" };

    const job = await prisma.job.create({
      data: {
        status: "ESCROWED",
        title: d.title,
        amount: d.amount,
        clientId: client.id,
        providerId: provider.id,
        serviceId: d.serviceId,
        chainJobId: d.chainJobId ?? null,
        escrowTxHash: d.escrowTxHash ?? null,
        events: {
          create: [
            { kind: "quoted" },
            { kind: "escrowed", txHash: d.escrowTxHash ?? null, note: `${d.amount} USDC escrowed` },
          ],
        },
      },
    });

    // 市场统计由链上 indexer 独占维护(避免和链上事件双计)

    return { ok: true, data: { id: job.id } };
  } catch (err) {
    console.error("recordJobOpened:", err);
    return { ok: false, error: "Failed to record job" };
  }
}

const TxSchema = z.object({
  jobId: z.string().min(1),
  actorAddress: z.string().min(1),
  txHash: z.string().optional(),
  deliverableHash: z.string().optional(),
  deliverableUrl: z.string().max(500).optional(),
});

async function transition(
  jobId: string,
  to: "DELIVERED" | "SETTLED" | "CHALLENGED" | "REFUNDED",
  kind: string,
  extra: { txHash?: string; deliverableHash?: string; deliverableUrl?: string; note?: string } = {},
): Promise<Result> {
  try {
    const job = await prisma.job.findUnique({ where: { id: jobId } });
    if (!job) return { ok: false, error: "Job not found" };

    await prisma.job.update({
      where: { id: jobId },
      data: {
        status: to,
        ...(extra.deliverableHash ? { deliverableHash: extra.deliverableHash } : {}),
        ...(extra.deliverableUrl ? { deliverableUrl: extra.deliverableUrl } : {}),
        ...(to === "SETTLED" ? { settleTxHash: extra.txHash ?? null } : {}),
        events: { create: { kind, txHash: extra.txHash ?? null, note: extra.note ?? "" } },
      },
    });

    // 结算 → 更新 provider 声誉缓存
    if (to === "SETTLED") {
      await prisma.providerAgent.update({
        where: { id: job.providerId },
        data: { jobsCompleted: { increment: 1 } },
      });
    }
    return { ok: true };
  } catch (err) {
    console.error(`transition ${to}:`, err);
    return { ok: false, error: "Failed to update job" };
  }
}

export async function recordJobDelivered(input: z.infer<typeof TxSchema>): Promise<Result> {
  const p = TxSchema.safeParse(input);
  if (!p.success) return { ok: false, error: "Invalid input" };
  if (!(await getSessionAddress())) return { ok: false, error: "Please sign in with your wallet first" };
  return transition(p.data.jobId, "DELIVERED", "delivered", {
    txHash: p.data.txHash,
    deliverableHash: p.data.deliverableHash,
    deliverableUrl: p.data.deliverableUrl,
    note: "deliverable uploaded, hash locked on-chain",
  });
}

export async function recordJobSettled(input: z.infer<typeof TxSchema>): Promise<Result> {
  const p = TxSchema.safeParse(input);
  if (!p.success) return { ok: false, error: "Invalid input" };
  if (!(await getSessionAddress())) return { ok: false, error: "Please sign in with your wallet first" };
  return transition(p.data.jobId, "SETTLED", "settled", {
    txHash: p.data.txHash,
    note: "released to provider",
  });
}

export async function recordJobChallenged(input: z.infer<typeof TxSchema>): Promise<Result> {
  const p = TxSchema.safeParse(input);
  if (!p.success) return { ok: false, error: "Invalid input" };
  if (!(await getSessionAddress())) return { ok: false, error: "Please sign in with your wallet first" };
  return transition(p.data.jobId, "CHALLENGED", "challenged", {
    txHash: p.data.txHash,
    note: "sent to 3-evaluator panel",
  });
}
