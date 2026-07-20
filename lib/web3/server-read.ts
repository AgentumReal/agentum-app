import "server-only";
import { createPublicClient, http } from "viem";
import { bscTestnet } from "viem/chains";
import { CONTRACTS, CONTRACTS_READY } from "./contracts";

/** 服务端只读 client(优先 NodeReal;key 仅在服务端) */
function publicClient() {
  return createPublicClient({
    chain: bscTestnet,
    transport: http(process.env.NODEREAL_BNB_TESTNET || process.env.NEXT_PUBLIC_RPC_URL || undefined),
  });
}

/** 当前 BSC 测试网区块号,带 5 秒内存缓存 + 失败兜底(返回 null)。 */
let blockCache: { value: number; at: number } | null = null;
export async function getCurrentBlockNumber(): Promise<number | null> {
  const now = Date.now();
  if (blockCache && now - blockCache.at < 5000) return blockCache.value;
  try {
    const bn = Number(await publicClient().getBlockNumber());
    blockCache = { value: bn, at: now };
    return bn;
  } catch {
    return blockCache?.value ?? null;
  }
}

/** 读链上 job 的 Status 枚举(0=None 1=Escrowed 2=Delivered 3=Settled 4=Disputed 5=Refunded);读不到返回 null */
export async function getOnchainJobStatus(chainJobId?: string | null): Promise<number | null> {
  if (!CONTRACTS_READY || !chainJobId) return null;
  try {
    const job = (await publicClient().readContract({
      address: CONTRACTS.jobEscrow.address,
      abi: CONTRACTS.jobEscrow.abi,
      functionName: "getJob",
      args: [BigInt(chainJobId)],
    })) as { status: number };
    return Number(job.status);
  } catch {
    return null;
  }
}

/** 读某 provider 的链上声誉明细(completed/onTime/disputesWon/disputesLost);读不到返回 null */
export async function getOnchainReputationRecord(
  providerAddress?: string | null,
): Promise<{ completed: number; onTime: number; disputesWon: number; disputesLost: number } | null> {
  if (!CONTRACTS_READY || !providerAddress || !providerAddress.startsWith("0x")) return null;
  try {
    const rec = (await publicClient().readContract({
      address: CONTRACTS.reputation.address,
      abi: CONTRACTS.reputation.abi,
      functionName: "records",
      args: [providerAddress as `0x${string}`],
    })) as readonly [bigint, bigint, bigint, bigint];
    return {
      completed: Number(rec[0]),
      onTime: Number(rec[1]),
      disputesWon: Number(rec[2]),
      disputesLost: Number(rec[3]),
    };
  } catch {
    return null;
  }
}

/**
 * 读某 provider(以其 owner 钱包地址为 key)的链上声誉分。
 * 合约未部署或读取失败时返回 null,调用方回退到 DB 缓存。
 */
export async function getOnchainReputation(providerAddress?: string | null): Promise<number | null> {
  if (!CONTRACTS_READY || !providerAddress || !providerAddress.startsWith("0x")) return null;
  try {
    const score = (await publicClient().readContract({
      address: CONTRACTS.reputation.address,
      abi: CONTRACTS.reputation.abi,
      functionName: "score",
      args: [providerAddress as `0x${string}`],
    })) as bigint;
    return Number(score);
  } catch {
    return null;
  }
}
