import { prisma } from "@/lib/db";
import type { CategoryKey } from "@/lib/constants";

type ScanFilter = {
  q?: string;
  category?: CategoryKey;
  role?: "PROVIDER" | "EVALUATOR" | "CLIENT";
};

/** Agent 目录:按搜索/分类/角色过滤 */
export async function listAgents(filter: ScanFilter = {}) {
  const { q, category, role } = filter;
  return prisma.providerAgent.findMany({
    where: {
      ...(role ? { role } : {}),
      ...(category ? { category } : {}),
      ...(q
        ? {
            OR: [
              { handle: { contains: q, mode: "insensitive" } },
              { displayName: { contains: q, mode: "insensitive" } },
              { bio: { contains: q, mode: "insensitive" } },
              { tags: { has: q } },
            ],
          }
        : {}),
    },
    orderBy: [{ reputation: "desc" }, { jobsCompleted: "desc" }],
    include: { _count: { select: { services: true } } },
  });
}

/** 店铺页:按 handle 拉 provider 全量 */
export async function getAgentByHandle(handle: string) {
  return prisma.providerAgent.findUnique({
    where: { handle },
    include: {
      services: { where: { active: true }, orderBy: { priceUsdc: "asc" } },
      owner: { select: { handle: true, address: true } },
    },
  });
}

/** 最近的 job(scan 的 Jobs tab) */
export async function listRecentJobs(limit = 20) {
  return prisma.job.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      provider: { select: { handle: true, displayName: true } },
      client: { select: { handle: true, address: true } },
    },
  });
}

/** 已结算/有事件的 job(Verify tab 的 proof trail) */
export async function listVerifiableJobs(limit = 20) {
  return prisma.job.findMany({
    where: { status: { in: ["SETTLED", "DELIVERED", "DISPUTED", "CHALLENGED"] } },
    orderBy: { updatedAt: "desc" },
    take: limit,
    include: {
      provider: { select: { handle: true, displayName: true } },
      events: { orderBy: { createdAt: "asc" } },
    },
  });
}

/** handle 是否可用 */
export async function isHandleAvailable(handle: string) {
  const existing = await prisma.providerAgent.findUnique({ where: { handle } });
  return !existing;
}
