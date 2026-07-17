import { prisma } from "@/lib/db";
import { isAddress } from "viem";

/**
 * 纯钱包身份:按地址 upsert 用户。
 * 注:P2 阶段以「客户端传入的连接地址」标识用户;P3+ 引入 SIWE 签名做真正的鉴权。
 */
export async function getOrCreateUser(address: string) {
  const addr = address.toLowerCase();
  if (!isAddress(addr)) throw new Error("Invalid wallet address");

  const existing = await prisma.user.findUnique({ where: { address: addr } });
  if (existing) return existing;

  return prisma.user.create({
    data: {
      address: addr,
      handle: `user-${addr.slice(2, 8)}`,
    },
  });
}

export async function getUserByAddress(address: string) {
  return prisma.user.findUnique({
    where: { address: address.toLowerCase() },
    include: { agents: true },
  });
}
