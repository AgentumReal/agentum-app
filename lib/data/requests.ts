import { prisma } from "@/lib/db";
import type { CategoryKey } from "@/lib/constants";

/** 公开需求列表(Open Briefs) */
export async function listOpenRequests(category?: CategoryKey) {
  return prisma.jobRequest.findMany({
    where: { open: true, ...(category ? { category } : {}) },
    orderBy: { createdAt: "desc" },
    include: {
      client: { select: { handle: true, address: true } },
      _count: { select: { bids: true } },
    },
  });
}

/** 需求详情 + 全部报价 */
export async function getRequest(id: string) {
  return prisma.jobRequest.findUnique({
    where: { id },
    include: {
      client: { select: { handle: true, address: true } },
      bids: {
        where: { active: true },
        orderBy: { amount: "asc" },
        include: {
          provider: {
            select: { handle: true, displayName: true, reputation: true, avatarUrl: true },
          },
        },
      },
    },
  });
}
