"use server";

import { z } from "zod";
import { prisma } from "@/lib/db";
import { getOrCreateUser } from "@/lib/auth";
import { listJobsForAddress } from "@/lib/data/jobs";
import { getSessionAddress } from "@/lib/session";
import { getOnchainJobStatus } from "@/lib/web3/server-read";

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

// 链上 JobEscrow.Status 枚举
const ONCHAIN = { None: 0, Escrowed: 1, Delivered: 2, Settled: 3, Disputed: 4, Refunded: 5 } as const;
// DB 状态推进顺序(只往前,不回退),与 indexer 保持一致
const DB_RANK: Record<string, number> = {
  QUOTED: 0, ESCROWED: 1, DELIVERED: 2, CHALLENGED: 3, DISPUTED: 3, SETTLED: 4, REFUNDED: 4,
};

/**
 * 校验调用者确实是这单的当事人,且链上状态支持该次流转。
 * - DELIVERED 只能由 provider(其 agent 的 owner)记录,链上须已 Delivered。
 * - SETTLED / CHALLENGED 只能由 client 记录,链上须分别是 Settled / Disputed。
 * 返回受校验的 job(含当前状态),或错误。
 */
async function authorizeTransition(
  jobId: string,
  to: "DELIVERED" | "SETTLED" | "CHALLENGED",
  meAddr: string,
): Promise<{ ok: true; job: { id: string; status: string; providerId: string } } | { ok: false; error: string }> {
  const job = await prisma.job.findUnique({
    where: { id: jobId },
    select: {
      id: true,
      status: true,
      providerId: true,
      chainJobId: true,
      client: { select: { address: true } },
      provider: { select: { owner: { select: { address: true } } } },
    },
  });
  if (!job) return { ok: false, error: "Job not found" };

  const me = meAddr.toLowerCase();
  const isClient = job.client.address.toLowerCase() === me;
  const isProvider = job.provider.owner.address.toLowerCase() === me;
  if (to === "DELIVERED" && !isProvider) return { ok: false, error: "Only the assigned provider can submit delivery" };
  if ((to === "SETTLED" || to === "CHALLENGED") && !isClient)
    return { ok: false, error: "Only the client can settle or challenge this job" };

  // 链上核对:DB 状态必须由真实链上动作背书,杜绝纯 DB 伪造
  const onchain = await getOnchainJobStatus(job.chainJobId);
  if (onchain != null) {
    if (to === "DELIVERED" && onchain < ONCHAIN.Delivered)
      return { ok: false, error: "Delivery not confirmed on-chain yet" };
    if (to === "SETTLED" && onchain !== ONCHAIN.Settled)
      return { ok: false, error: "Settlement not confirmed on-chain yet" };
    if (to === "CHALLENGED" && onchain !== ONCHAIN.Disputed)
      return { ok: false, error: "Challenge not confirmed on-chain yet" };
  }

  return { ok: true, job: { id: job.id, status: job.status, providerId: job.providerId } };
}

async function transition(
  jobId: string,
  to: "DELIVERED" | "SETTLED" | "CHALLENGED",
  kind: string,
  meAddr: string,
  extra: { txHash?: string; deliverableHash?: string; deliverableUrl?: string; note?: string } = {},
): Promise<Result> {
  try {
    const auth = await authorizeTransition(jobId, to, meAddr);
    if (!auth.ok) return auth;
    const job = auth.job;

    // 幂等:不回退、不重复流转(重复调用直接视为成功但不写)
    if ((DB_RANK[to] ?? 0) <= (DB_RANK[job.status] ?? 0)) return { ok: true };

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

    // 注:jobsCompleted 声誉计数由链上 indexer 独占维护(见 lib/indexer.ts),
    // 这里不再自增,避免和 indexer 双计。
    return { ok: true };
  } catch (err) {
    console.error(`transition ${to}:`, err);
    return { ok: false, error: "Failed to update job" };
  }
}

export async function recordJobDelivered(input: z.infer<typeof TxSchema>): Promise<Result> {
  const p = TxSchema.safeParse(input);
  if (!p.success) return { ok: false, error: "Invalid input" };
  const meAddr = await getSessionAddress();
  if (!meAddr) return { ok: false, error: "Please sign in with your wallet first" };
  return transition(p.data.jobId, "DELIVERED", "delivered", meAddr, {
    txHash: p.data.txHash,
    deliverableHash: p.data.deliverableHash,
    deliverableUrl: p.data.deliverableUrl,
    note: "deliverable uploaded, hash locked on-chain",
  });
}

export async function recordJobSettled(input: z.infer<typeof TxSchema>): Promise<Result> {
  const p = TxSchema.safeParse(input);
  if (!p.success) return { ok: false, error: "Invalid input" };
  const meAddr = await getSessionAddress();
  if (!meAddr) return { ok: false, error: "Please sign in with your wallet first" };
  return transition(p.data.jobId, "SETTLED", "settled", meAddr, {
    txHash: p.data.txHash,
    note: "released to provider",
  });
}

export async function recordJobChallenged(input: z.infer<typeof TxSchema>): Promise<Result> {
  const p = TxSchema.safeParse(input);
  if (!p.success) return { ok: false, error: "Invalid input" };
  const meAddr = await getSessionAddress();
  if (!meAddr) return { ok: false, error: "Please sign in with your wallet first" };
  return transition(p.data.jobId, "CHALLENGED", "challenged", meAddr, {
    txHash: p.data.txHash,
    note: "sent to 3-evaluator panel",
  });
}
