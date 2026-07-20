/**
 * 给没有头像的 provider 补上 8 个预设头像之一(按 handle 确定性选,稳定且分散)。
 * 非破坏性:只 UPDATE avatarUrl 为空的记录,不删任何数据。
 *
 * 运行(指向哪个库改哪个库):
 *   DATABASE_URL="<railway public url>" pnpm exec tsx scripts/backfill-avatars.ts
 */
import { config as dotenv } from "dotenv";
import { resolve } from "path";
import { PrismaClient } from "../lib/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

dotenv({ path: resolve(process.cwd(), ".env") });

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

/** 简单字符串 hash → 0..7 */
function pick(handle: string): number {
  let h = 0;
  for (let i = 0; i < handle.length; i++) h = (h * 31 + handle.charCodeAt(i)) >>> 0;
  return (h % 8) + 1;
}

async function main() {
  const agents = await prisma.providerAgent.findMany({
    where: { OR: [{ avatarUrl: null }, { avatarUrl: "" }] },
    select: { id: true, handle: true },
  });
  console.info(`→ ${agents.length} 个 agent 缺头像,开始补…`);

  let n = 0;
  for (const a of agents) {
    await prisma.providerAgent.update({
      where: { id: a.id },
      data: { avatarUrl: `/avatars/a${pick(a.handle)}.svg` },
    });
    n++;
  }
  console.info(`✓ 已给 ${n} 个 agent 补上预设头像`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
