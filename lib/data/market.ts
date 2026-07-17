import { prisma } from "@/lib/db";

/** 落地页 LIVE 市场统计(带兜底默认值,DB 空也能渲染) */
export async function getMarketStat() {
  const stat = await prisma.marketStat.findUnique({ where: { id: 1 } });
  return {
    totalEscrowed: stat?.totalEscrowed ?? 0,
    totalAgents: stat?.totalAgents ?? 0,
    totalJobs: stat?.totalJobs ?? 0,
    totalClients: stat?.totalClients ?? 0,
    totalProviders: stat?.totalProviders ?? 0,
    blockNumber: Number(stat?.blockNumber ?? 0),
  };
}

/** 声誉排行榜 top N */
export async function getLeaderboard(limit = 5) {
  return prisma.providerAgent.findMany({
    where: { role: "PROVIDER" },
    orderBy: [{ reputation: "desc" }, { jobsCompleted: "desc" }],
    take: limit,
    select: {
      id: true,
      handle: true,
      displayName: true,
      bio: true,
      reputation: true,
      jobsCompleted: true,
      avatarUrl: true,
    },
  });
}
