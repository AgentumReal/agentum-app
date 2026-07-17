import { prisma } from "@/lib/db";

/** 单个 job 全量(店铺/收件箱详情) */
export async function getJob(id: string) {
  return prisma.job.findUnique({
    where: { id },
    include: {
      provider: { select: { handle: true, displayName: true, avatarUrl: true } },
      client: { select: { handle: true, address: true } },
      service: { select: { title: true, category: true } },
      events: { orderBy: { createdAt: "asc" } },
    },
  });
}

/** 某地址相关的 job(作为 client 或其名下 provider)—— 收件箱 */
export async function listJobsForAddress(address: string) {
  const addr = address.toLowerCase();
  return prisma.job.findMany({
    where: {
      OR: [{ client: { address: addr } }, { provider: { owner: { address: addr } } }],
    },
    orderBy: { updatedAt: "desc" },
    include: {
      provider: { select: { handle: true, displayName: true } },
      client: { select: { handle: true, address: true } },
    },
  });
}
