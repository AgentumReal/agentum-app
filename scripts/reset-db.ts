/**
 * 清空数据库(按外键安全顺序),并把 MarketStat 归零。
 * 用于「只留真实链上活动」:清完再跑 simulate-activity。
 * 运行:  DATABASE_URL="<目标库>" pnpm exec tsx scripts/reset-db.ts
 */
import { config as dotenv } from "dotenv";
import { resolve } from "path";
import { PrismaClient } from "../lib/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

dotenv({ path: resolve(process.cwd(), ".env") });

const url = process.env.DATABASE_URL ?? "";
const where = /localhost|127\.0\.0\.1/.test(url) ? "LOCAL" : /proxy\.rlwy|railway/.test(url) ? "RAILWAY" : "custom";

const pool = new Pool({ connectionString: url, max: 3, keepAlive: true, connectionTimeoutMillis: 20_000 });
pool.on("error", () => {});
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function del(label: string, fn: () => Promise<unknown>) {
  for (let i = 0; i < 4; i++) {
    try {
      await fn();
      console.info(`  ✓ cleared ${label}`);
      return;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (!/terminated|ECONNRESET|Connection|timeout|socket/i.test(msg)) throw e;
      await new Promise((r) => setTimeout(r, 1200 * (i + 1)));
    }
  }
  throw new Error(`failed clearing ${label}`);
}

async function main() {
  console.info(`\n⚠ WIPING database → ${where}\n  ${url.replace(/:[^:@]+@/, ":****@")}\n`);
  await del("jobEvent", () => prisma.jobEvent.deleteMany());
  await del("evaluation", () => prisma.evaluation.deleteMany());
  await del("message", () => prisma.message.deleteMany());
  await del("bid", () => prisma.bid.deleteMany());
  await del("job", () => prisma.job.deleteMany());
  await del("jobRequest", () => prisma.jobRequest.deleteMany());
  await del("service", () => prisma.service.deleteMany());
  await del("pointsEntry", () => prisma.pointsEntry.deleteMany());
  await del("providerAgent", () => prisma.providerAgent.deleteMany());
  await del("mediaAsset", () => prisma.mediaAsset.deleteMany());
  await del("user", () => prisma.user.deleteMany());
  await del("marketStat→0", () =>
    prisma.marketStat.upsert({
      where: { id: 1 },
      create: { id: 1 },
      update: {
        totalEscrowed: 0,
        totalAgents: 0,
        totalJobs: 0,
        totalClients: 0,
        totalProviders: 0,
        blockNumber: 0n,
      },
    }),
  );
  const s = await prisma.marketStat.findUnique({ where: { id: 1 } });
  console.info(`\n✓ wiped. stats now → agents ${s?.totalAgents} · providers ${s?.totalProviders} · clients ${s?.totalClients} · jobs ${s?.totalJobs} · TVL $${s?.totalEscrowed}\n`);
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error("✗ reset failed:", e instanceof Error ? e.message : e);
  await prisma.$disconnect();
  process.exit(1);
});
