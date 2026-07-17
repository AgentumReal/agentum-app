"use client";

import { useWriteContract, usePublicClient, useAccount } from "wagmi";
import { parseUnits, decodeEventLog, maxUint256 } from "viem";
import { CONTRACTS } from "./contracts";

const USDT_DECIMALS = 18;

/**
 * JobEscrow 客户端交互:授权 + 开单托管 + 交付 + 结算 + 挑战。
 * 每个函数返回 txHash(及必要的解析结果),调用方拿到后再落库。
 */
export function useEscrow() {
  const { address } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient();

  async function ensureAllowance(amountWei: bigint) {
    if (!publicClient || !address) throw new Error("Wallet not ready");
    const allowance = (await publicClient.readContract({
      address: CONTRACTS.mockUsdt.address,
      abi: CONTRACTS.mockUsdt.abi,
      functionName: "allowance",
      args: [address, CONTRACTS.jobEscrow.address],
    })) as bigint;
    if (allowance < amountWei) {
      const tx = await writeContractAsync({
        address: CONTRACTS.mockUsdt.address,
        abi: CONTRACTS.mockUsdt.abi,
        functionName: "approve",
        args: [CONTRACTS.jobEscrow.address, maxUint256],
      });
      await publicClient.waitForTransactionReceipt({ hash: tx });
    }
  }

  /** 领测试 USDT */
  async function faucet() {
    if (!publicClient) throw new Error("Wallet not ready");
    const tx = await writeContractAsync({
      address: CONTRACTS.mockUsdt.address,
      abi: CONTRACTS.mockUsdt.abi,
      functionName: "faucet",
    });
    await publicClient.waitForTransactionReceipt({ hash: tx });
    return tx;
  }

  /** 开单并托管;返回链上 jobId + txHash */
  async function openJob(providerAddress: `0x${string}`, amountUsdc: number, deliveryDays: number) {
    if (!publicClient) throw new Error("Wallet not ready");
    const amountWei = parseUnits(String(amountUsdc), USDT_DECIMALS);
    await ensureAllowance(amountWei);

    const tx = await writeContractAsync({
      address: CONTRACTS.jobEscrow.address,
      abi: CONTRACTS.jobEscrow.abi,
      functionName: "openJob",
      args: [providerAddress, amountWei, BigInt(deliveryDays * 86400)],
    });
    const receipt = await publicClient.waitForTransactionReceipt({ hash: tx });

    let chainJobId: string | undefined;
    for (const log of receipt.logs) {
      try {
        const p = decodeEventLog({ abi: CONTRACTS.jobEscrow.abi, data: log.data, topics: log.topics });
        if (p.eventName === "JobOpened") {
          chainJobId = (p.args as { jobId: bigint }).jobId.toString();
          break;
        }
      } catch {
        /* skip */
      }
    }
    return { txHash: tx, chainJobId };
  }

  /** provider 交付:提交交付物内容哈希(链上锁定,可事后比对真文件) */
  async function deliver(chainJobId: string, deliverableHash: `0x${string}`) {
    if (!publicClient) throw new Error("Wallet not ready");
    const tx = await writeContractAsync({
      address: CONTRACTS.jobEscrow.address,
      abi: CONTRACTS.jobEscrow.abi,
      functionName: "deliver",
      args: [BigInt(chainJobId), deliverableHash],
    });
    await publicClient.waitForTransactionReceipt({ hash: tx });
    return { txHash: tx, deliverableHash };
  }

  async function settle(chainJobId: string) {
    if (!publicClient) throw new Error("Wallet not ready");
    const tx = await writeContractAsync({
      address: CONTRACTS.jobEscrow.address,
      abi: CONTRACTS.jobEscrow.abi,
      functionName: "settle",
      args: [BigInt(chainJobId)],
    });
    await publicClient.waitForTransactionReceipt({ hash: tx });
    return { txHash: tx };
  }

  async function challenge(chainJobId: string) {
    if (!publicClient) throw new Error("Wallet not ready");
    const tx = await writeContractAsync({
      address: CONTRACTS.jobEscrow.address,
      abi: CONTRACTS.jobEscrow.abi,
      functionName: "challenge",
      args: [BigInt(chainJobId)],
    });
    await publicClient.waitForTransactionReceipt({ hash: tx });
    return { txHash: tx };
  }

  function parseEventArg(receipt: { logs: readonly { data: `0x${string}`; topics: readonly `0x${string}`[] }[] }, eventName: string, key: string): string | undefined {
    for (const log of receipt.logs) {
      try {
        const p = decodeEventLog({ abi: CONTRACTS.jobEscrow.abi, data: log.data, topics: log.topics as [`0x${string}`, ...`0x${string}`[]] });
        if (p.eventName === eventName) {
          const v = (p.args as Record<string, unknown>)[key];
          return typeof v === "bigint" ? v.toString() : String(v);
        }
      } catch {
        /* skip */
      }
    }
    return undefined;
  }

  // ── Open Brief 竞价流程 ──

  /** ① 发布需求(不动资金);返回链上 requestId */
  async function postRequest(brief: string) {
    if (!publicClient) throw new Error("Wallet not ready");
    const tx = await writeContractAsync({
      address: CONTRACTS.jobEscrow.address,
      abi: CONTRACTS.jobEscrow.abi,
      functionName: "postRequest",
      args: [brief],
    });
    const receipt = await publicClient.waitForTransactionReceipt({ hash: tx });
    return { txHash: tx, chainRequestId: parseEventArg(receipt, "RequestPosted", "requestId") };
  }

  /** ② provider 报价;返回链上 bidIndex */
  async function placeBid(chainRequestId: string, amountUsdc: number, deliveryDays: number) {
    if (!publicClient) throw new Error("Wallet not ready");
    const amountWei = parseUnits(String(amountUsdc), USDT_DECIMALS);
    const tx = await writeContractAsync({
      address: CONTRACTS.jobEscrow.address,
      abi: CONTRACTS.jobEscrow.abi,
      functionName: "placeBid",
      args: [BigInt(chainRequestId), amountWei, BigInt(deliveryDays)],
    });
    const receipt = await publicClient.waitForTransactionReceipt({ hash: tx });
    return { txHash: tx, chainBidIndex: parseEventArg(receipt, "BidPlaced", "bidIndex") };
  }

  /** ③ 客户端接受报价 —— 此刻授权 + 托管 + 建单;返回链上 jobId */
  async function acceptBid(chainRequestId: string, chainBidIndex: number, amountUsdc: number) {
    if (!publicClient) throw new Error("Wallet not ready");
    const amountWei = parseUnits(String(amountUsdc), USDT_DECIMALS);
    await ensureAllowance(amountWei);
    const tx = await writeContractAsync({
      address: CONTRACTS.jobEscrow.address,
      abi: CONTRACTS.jobEscrow.abi,
      functionName: "acceptBid",
      args: [BigInt(chainRequestId), BigInt(chainBidIndex)],
    });
    const receipt = await publicClient.waitForTransactionReceipt({ hash: tx });
    return { txHash: tx, chainJobId: parseEventArg(receipt, "BidAccepted", "jobId") };
  }

  return { faucet, openJob, deliver, settle, challenge, postRequest, placeBid, acceptBid };
}
