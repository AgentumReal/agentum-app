import "server-only";
import { createPublicClient, http, formatUnits } from "viem";
import { bscTestnet } from "viem/chains";
import { prisma } from "./db";
import { CONTRACTS, CONTRACTS_READY } from "./web3/contracts";

// 服务端优先用 NodeReal(archive,支持历史 getLogs);key 仅在服务端,不进客户端 bundle。
const RPC = process.env.NODEREAL_BNB_TESTNET || process.env.NEXT_PUBLIC_RPC_URL;
const client = createPublicClient({ chain: bscTestnet, transport: http(RPC) });

const START_BLOCK = BigInt(process.env.INDEXER_START_BLOCK || "0");
const CHUNK = BigInt(45000); // NodeReal 单次 getLogs 上限 5 万块,留余量
const MAX_CHUNKS_PER_TICK = 6; // 单 tick 最多扫 27 万块 → 137 万块约 6 tick 追上

// DB 状态推进顺序(只往前,不回退)
const RANK: Record<string, number> = {
  QUOTED: 0,
  ESCROWED: 1,
  DELIVERED: 2,
  CHALLENGED: 3,
  DISPUTED: 3,
  SETTLED: 4,
  REFUNDED: 4,
};

async function advanceStatus(jobId: string, to: "DELIVERED" | "SETTLED" | "CHALLENGED") {
  const job = await prisma.job.findFirst({ where: { chainJobId: jobId }, select: { id: true, status: true, providerId: true } });
  if (!job) return 0;
  if ((RANK[to] ?? 0) <= (RANK[job.status] ?? 0)) return 0;
  await prisma.job.update({ where: { id: job.id }, data: { status: to } });
  if (to === "SETTLED") {
    await prisma.providerAgent.update({ where: { id: job.providerId }, data: { jobsCompleted: { increment: 1 } } });
  }
  return 1;
}

let ticking = false;

/**
 * 事件 indexer:从游标往前分块扫 JobEscrow 日志。
 * - JobOpened → 累计任务数 + 托管总额(纯链上派生)
 * - JobDelivered / JobSettled / JobChallenged → 推进 DB 里对应 job 的状态(修脱节)
 * 游标存 MarketStat.indexedBlock,每块处理成功后推进,失败下 tick 从断点续。
 */
export async function runIndexerTick(): Promise<Record<string, unknown>> {
  if (!CONTRACTS_READY || ticking) return { skipped: true };
  ticking = true;
  try {
    const stat = await prisma.marketStat.findUnique({ where: { id: 1 } });
    const cursor = stat?.indexedBlock ?? BigInt(0);
    const firstRun = cursor < START_BLOCK;
    let from = firstRun ? START_BLOCK : cursor + BigInt(1);

    const head = await client.getBlockNumber();
    if (from > head) return { upToDate: true, head: Number(head) };

    let openedCount = 0;
    let escrowedAdd = 0;
    let statusFixes = 0;
    let processedTo = from - BigInt(1);
    let firstBatch = firstRun;

    for (let c = 0; c < MAX_CHUNKS_PER_TICK && from <= head; c++) {
      const to = from + CHUNK - BigInt(1) > head ? head : from + CHUNK - BigInt(1);
      const logs = await client.getContractEvents({
        address: CONTRACTS.jobEscrow.address,
        abi: CONTRACTS.jobEscrow.abi,
        fromBlock: from,
        toBlock: to,
      });

      for (const log of logs) {
        const args = log.args as Record<string, unknown>;
        const jobId = args.jobId != null ? String(args.jobId) : null;
        if (log.eventName === "JobOpened") {
          openedCount += 1;
          if (args.amount != null) escrowedAdd += Number(formatUnits(args.amount as bigint, 18));
        } else if (log.eventName === "JobDelivered" && jobId) {
          statusFixes += await advanceStatus(jobId, "DELIVERED");
        } else if (log.eventName === "JobSettled" && jobId) {
          statusFixes += await advanceStatus(jobId, "SETTLED");
        } else if (log.eventName === "JobChallenged" && jobId) {
          statusFixes += await advanceStatus(jobId, "CHALLENGED");
        }
      }

      // 本块累计写入(首块 set 清掉 seed 假值,之后各块 increment)
      await prisma.marketStat.update({
        where: { id: 1 },
        data: {
          indexedBlock: to,
          totalJobs: firstBatch ? openedCount : { increment: openedCount },
          totalEscrowed: firstBatch ? Math.round(escrowedAdd) : { increment: Math.round(escrowedAdd) },
        },
      });
      firstBatch = false;
      openedCount = 0;
      escrowedAdd = 0;
      processedTo = to;
      from = to + BigInt(1);
    }

    // agent/client 计数取 DB 真值 + 记录实时区块
    const [totalAgents, totalProviders, totalClients] = await Promise.all([
      prisma.providerAgent.count(),
      prisma.providerAgent.count({ where: { role: "PROVIDER" } }),
      prisma.user.count(),
    ]);
    await prisma.marketStat.update({
      where: { id: 1 },
      data: { totalAgents, totalProviders, totalClients, blockNumber: head },
    });

    return {
      indexedTo: Number(processedTo),
      head: Number(head),
      caughtUp: processedTo >= head,
      statusFixes,
    };
  } catch (err) {
    console.error("indexer tick:", err);
    return { error: err instanceof Error ? err.message : String(err) };
  } finally {
    ticking = false;
  }
}
