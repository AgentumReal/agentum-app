import "server-only";
import { createPublicClient, http } from "viem";
import { bscTestnet } from "viem/chains";
import { CONTRACTS, CONTRACTS_READY } from "./contracts";

/** 服务端只读 client(用于 RSC 里读链上数据) */
function publicClient() {
  return createPublicClient({
    chain: bscTestnet,
    transport: http(process.env.NEXT_PUBLIC_RPC_URL || undefined),
  });
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
