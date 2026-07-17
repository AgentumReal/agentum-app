/**
 * Agentum 测试网活动生成器
 * 每轮:生成 N 个钱包 → FUND 批量发 tBNB → client 领 MockUSDT → 双方 mint 链上身份
 *       → 全生命周期(post→bid→accept→deliver→settle),链上真交易 + 同步写库。
 *
 * 运行(从 agentum-app 目录):
 *   # 先给 FUND 钱包充 tBNB。DB 指向哪个库,数据就进哪个库(线上用 Railway 的 DATABASE_PUBLIC_URL)。
 *   DATABASE_URL="<railway public url>" pnpm exec tsx scripts/simulate-activity.ts
 *
 * 常用环境变量:
 *   BATCH_SIZE=100  CLIENT_RATIO=0.5  CONCURRENCY=8  FUND_PER_WALLET=0.003
 *   DRY_RUN=1       (不发链上交易,仅验证内容+写库路径)
 *   RPC_URL=...     (默认 publicnode,比官方 data-seed 稳)
 */
import { config as dotenv } from "dotenv";
import { resolve } from "path";
import {
  createPublicClient,
  createWalletClient,
  http,
  parseEther,
  parseUnits,
  parseGwei,
  keccak256,
  toBytes,
  decodeEventLog,
  formatEther,
  type Hex,
  type Address,
} from "viem";
import { privateKeyToAccount, generatePrivateKey } from "viem/accounts";
import { bscTestnet } from "viem/chains";
import { PrismaClient } from "../lib/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { AgentIdentityAbi } from "../lib/web3/abis/AgentIdentity";
import { MockUSDTAbi } from "../lib/web3/abis/MockUSDT";
import { JobEscrowAbi } from "../lib/web3/abis/JobEscrow";
import {
  providerProfile,
  jobBrief,
  bidTerms,
  deliverableText,
  makeHandle,
  toDisplay,
  pick,
  randInt,
  CATEGORIES,
  type Category,
} from "./sim/content";

// ── 加载环境:agentum-app/.env(DB+合约) + 根 .env(FUND)──
dotenv({ path: resolve(process.cwd(), ".env") });
dotenv({ path: resolve(process.cwd(), "../.env") });

const CFG = {
  batchSize: Number(process.env.BATCH_SIZE ?? 100),
  clientRatio: Number(process.env.CLIENT_RATIO ?? 0.5),
  concurrency: Number(process.env.CONCURRENCY ?? 8),
  fundPerWallet: process.env.FUND_PER_WALLET ?? "0.004",
  bidsMin: Number(process.env.BIDS_MIN ?? 1),
  bidsMax: Number(process.env.BIDS_MAX ?? 3),
  dryRun: !!process.env.DRY_RUN && process.env.DRY_RUN !== "0",
  rpc: process.env.RPC_URL || "https://bsc-testnet-rpc.publicnode.com",
  gasPrice: parseGwei(process.env.GAS_GWEI ?? "3"),
  // job 最终状态分布(默认全部 settled → 资金全额放款给 provider,不留在 escrow)
  dist: {
    settled: Number(process.env.RATE_SETTLED ?? 1),
    delivered: Number(process.env.RATE_DELIVERED ?? 0),
    escrowed: Number(process.env.RATE_ESCROWED ?? 0),
    open: Number(process.env.RATE_OPEN ?? 0),
  },
};

const ADDR = {
  identity: (process.env.NEXT_PUBLIC_AGENT_IDENTITY_ADDRESS ?? "") as Address,
  usdt: (process.env.NEXT_PUBLIC_MOCK_USDT_ADDRESS ?? "") as Address,
  escrow: (process.env.NEXT_PUBLIC_JOB_ESCROW_ADDRESS ?? "") as Address,
};

const FUND_PK = (process.env.FUND_PRIVATE_KEY ?? "") as Hex;
if (!CFG.dryRun && (!FUND_PK || !ADDR.identity || !ADDR.escrow)) {
  throw new Error("Missing FUND_PRIVATE_KEY or contract addresses. Set them in .env (or use DRY_RUN=1).");
}

const publicClient = createPublicClient({ chain: bscTestnet, transport: http(CFG.rpc) });
// 稳的连接池:keepAlive + 超时 + 上限,应对 Railway 公网代理掐连接
const pgPool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 6,
  keepAlive: true,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 20_000,
});
pgPool.on("error", () => {}); // 忽略空闲连接被代理掐断的噪音,交给重试
const prisma = new PrismaClient({ adapter: new PrismaPg(pgPool) });

// DB 操作重试(连接类错误重试;逻辑错误不重试)
async function dbOp<T>(fn: () => Promise<T>, tries = 4): Promise<T> {
  let last: unknown;
  for (let i = 0; i < tries; i++) {
    try {
      return await fn();
    } catch (e) {
      last = e;
      const msg = e instanceof Error ? e.message : String(e);
      if (!/terminated|ECONNRESET|Connection|timeout|socket|ETIMEDOUT|pool/i.test(msg)) throw e;
      await new Promise((r) => setTimeout(r, 1000 * (i + 1)));
    }
  }
  throw last;
}

// ── 工具:并发限制 / 重试 / 每钱包串行 nonce ──
async function mapLimit<T, R>(items: T[], limit: number, fn: (t: T, i: number) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let idx = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (idx < items.length) {
      const i = idx++;
      out[i] = await fn(items[i], i);
    }
  });
  await Promise.all(workers);
  return out;
}

async function withRetry<T>(fn: () => Promise<T>, tries = 4, label = ""): Promise<T> {
  let last: unknown;
  for (let i = 0; i < tries; i++) {
    try {
      return await fn();
    } catch (e) {
      last = e;
      const msg = e instanceof Error ? e.message : String(e);
      if (/reverted|insufficient funds|already known|nonce too low/i.test(msg) && i > 0) break;
      await new Promise((r) => setTimeout(r, 1500 * (i + 1)));
    }
  }
  throw new Error(`${label} failed: ${last instanceof Error ? last.message : last}`);
}

// 每个钱包串行,避免同一钱包并发交易 nonce 冲突
const chains = new Map<string, Promise<unknown>>();
function onWallet<T>(addr: string, fn: () => Promise<T>): Promise<T> {
  const prev = chains.get(addr) ?? Promise.resolve();
  const next = prev.then(fn, fn);
  chains.set(addr, next.catch(() => {}));
  return next as Promise<T>;
}

type Wallet = ReturnType<typeof makeWallet>;
function makeWallet(pk: Hex) {
  const account = privateKeyToAccount(pk);
  const client = createWalletClient({ account, chain: bscTestnet, transport: http(CFG.rpc) });
  return { pk, account, address: account.address as Address, client };
}

/** 发一笔合约写交易(legacy gas,串行 nonce,等回执)并可选解析事件返回值 */
async function write(
  w: Wallet,
  address: Address,
  abi: readonly unknown[],
  functionName: string,
  args: unknown[],
  eventName?: string,
  eventKey?: string,
): Promise<{ txHash: Hex; value?: string }> {
  return onWallet(w.address, async () => {
    let last: unknown;
    for (let attempt = 0; attempt < 6; attempt++) {
      try {
        // 每次都从链上现取 nonce(串行 + 现取 → 自愈 RPC 视图不一致 / nonce too low)
        const nonce = await publicClient.getTransactionCount({ address: w.address, blockTag: "pending" });
        const hash = await w.client.writeContract({
          address,
          abi: abi as never,
          functionName,
          args,
          gasPrice: CFG.gasPrice,
          nonce,
        });
        const receipt = await publicClient.waitForTransactionReceipt({ hash });
        let value: string | undefined;
        if (eventName && eventKey) {
          for (const log of receipt.logs) {
            try {
              const p = decodeEventLog({ abi: abi as never, data: log.data, topics: log.topics });
              if (p.eventName === eventName) {
                const v = (p.args as Record<string, unknown>)[eventKey];
                value = typeof v === "bigint" ? v.toString() : String(v);
                break;
              }
            } catch {
              /* not ours */
            }
          }
        }
        return { txHash: hash, value };
      } catch (e) {
        last = e;
        const msg = e instanceof Error ? e.message : String(e);
        if (/reverted|insufficient funds for/i.test(msg)) throw e; // 逻辑错误,不重试
        await new Promise((r) => setTimeout(r, 1200 * (attempt + 1))); // nonce/网络类:等一下,下轮重取 nonce 自愈
      }
    }
    throw new Error(`${functionName} failed: ${last instanceof Error ? last.message : last}`);
  });
}

const fakeHash = () => ("0x" + Math.random().toString(16).slice(2).padEnd(64, "0").slice(0, 64)) as Hex;

// ── DB 写入(复刻 server actions)──
async function dbCreateProvider(
  addr: Address,
  p: ReturnType<typeof providerProfile>,
  chain: { tokenId?: string; txHash?: string },
) {
  const owner = await prisma.user.upsert({
    where: { address: addr.toLowerCase() },
    create: { address: addr.toLowerCase(), handle: `user-${addr.slice(2, 8).toLowerCase()}` },
    update: {},
  });
  const agent = await prisma.providerAgent.create({
    data: {
      handle: p.handle,
      displayName: p.displayName,
      category: p.category,
      bio: p.bio,
      tags: p.tags,
      avatarUrl: p.avatar,
      verified: true,
      chainTokenId: chain.tokenId ?? null,
      identityTxHash: chain.txHash ?? null,
      ownerId: owner.id,
      services: {
        create: {
          title: p.service.title,
          category: p.category,
          description: p.bio,
          priceUsdc: p.service.priceUsdc,
          deliveryDays: p.service.deliveryDays,
        },
      },
    },
  });
  await prisma.marketStat.update({
    where: { id: 1 },
    data: { totalAgents: { increment: 1 }, totalProviders: { increment: 1 } },
  });
  return { agentId: agent.id, ownerId: owner.id };
}

async function dbCreateClient(addr: Address, handle: string) {
  const existing = await prisma.user.findUnique({ where: { address: addr.toLowerCase() } });
  const user = await prisma.user.upsert({
    where: { address: addr.toLowerCase() },
    create: { address: addr.toLowerCase(), handle },
    update: {},
  });
  if (!existing) {
    await prisma.marketStat.update({ where: { id: 1 }, data: { totalClients: { increment: 1 } } });
  }
  return user.id;
}

async function dbCreateRequest(
  clientId: string,
  b: { title: string; brief: string; budgetHint: number; category: Category },
  chain: { chainRequestId?: string; txHash?: string },
) {
  const r = await prisma.jobRequest.create({
    data: {
      title: b.title,
      brief: b.brief,
      category: b.category,
      budgetHint: b.budgetHint,
      clientId,
      chainRequestId: chain.chainRequestId ?? null,
      postTxHash: chain.txHash ?? null,
    },
  });
  return r.id;
}

async function dbCreateBid(
  requestId: string,
  providerId: string,
  t: { amount: number; deliveryDays: number; message: string },
  chain: { chainBidIndex?: number; txHash?: string },
) {
  const bid = await prisma.bid.create({
    data: {
      requestId,
      providerId,
      amount: t.amount,
      deliveryDays: t.deliveryDays,
      message: t.message,
      chainBidIndex: chain.chainBidIndex ?? null,
      bidTxHash: chain.txHash ?? null,
    },
  });
  return bid.id;
}

async function dbAcceptBid(
  requestId: string,
  clientId: string,
  providerId: string,
  amount: number,
  title: string,
  brief: string,
  chain: { chainJobId?: string; escrowTxHash?: string },
) {
  const job = await prisma.job.create({
    data: {
      status: "ESCROWED",
      title,
      brief,
      amount,
      clientId,
      providerId,
      chainJobId: chain.chainJobId ?? null,
      escrowTxHash: chain.escrowTxHash ?? null,
      events: {
        create: [
          { kind: "quoted", note: `bid ${amount} USDC accepted` },
          { kind: "escrowed", txHash: chain.escrowTxHash ?? null, note: `${amount} USDC escrowed` },
        ],
      },
    },
  });
  await prisma.jobRequest.update({ where: { id: requestId }, data: { open: false, acceptedJobId: job.id } });
  await prisma.marketStat.update({
    where: { id: 1 },
    data: { totalJobs: { increment: 1 }, totalEscrowed: { increment: amount } },
  });
  return job.id;
}

async function dbDeliver(jobId: string, hash: string, url: string | null, txHash?: string) {
  await prisma.job.update({
    where: { id: jobId },
    data: {
      status: "DELIVERED",
      deliverableHash: hash,
      deliverableUrl: url,
      events: { create: { kind: "delivered", txHash: txHash ?? null, note: "deliverable uploaded, hash locked on-chain" } },
    },
  });
}

async function dbSettle(jobId: string, providerId: string, txHash?: string) {
  await prisma.job.update({
    where: { id: jobId },
    data: {
      status: "SETTLED",
      settleTxHash: txHash ?? null,
      events: { create: { kind: "settled", txHash: txHash ?? null, note: "released to provider" } },
    },
  });
  await prisma.providerAgent.update({ where: { id: providerId }, data: { jobsCompleted: { increment: 1 } } });
}

// ── 保证链上 handle 唯一 ──
async function uniqueHandle(base: string): Promise<string> {
  let h = base.toLowerCase().replace(/[^a-z0-9_-]/g, "").slice(0, 24);
  if (h.length < 3) h = `agent-${h}`;
  for (let i = 0; i < 6; i++) {
    if (CFG.dryRun) return i === 0 ? h : `${h}${randInt(10, 99)}`;
    const avail = (await publicClient.readContract({
      address: ADDR.identity,
      abi: AgentIdentityAbi,
      functionName: "isHandleAvailable",
      args: [h],
    })) as boolean;
    const inDb = await prisma.providerAgent.findUnique({ where: { handle: h } }).catch(() => null);
    if (avail && !inDb) return h;
    h = `${base.toLowerCase().replace(/[^a-z0-9_-]/g, "").slice(0, 20)}${randInt(10, 999)}`;
  }
  return `${base.slice(0, 16)}${Date.now().toString().slice(-5)}`;
}

function chooseFinalState(): "settled" | "delivered" | "escrowed" | "open" {
  const r = Math.random();
  const d = CFG.dist;
  if (r < d.settled) return "settled";
  if (r < d.settled + d.delivered) return "delivered";
  if (r < d.settled + d.delivered + d.escrowed) return "escrowed";
  return "open";
}

// ═══════════════════════ 主流程 ═══════════════════════
async function main() {
  const t0 = Date.now();
  console.info(`\n▶ Agentum activity sim — batch=${CFG.batchSize}, dryRun=${CFG.dryRun}, db=${dbLabel()}\n`);

  // 确保 MarketStat 存在
  await prisma.marketStat.upsert({ where: { id: 1 }, create: { id: 1 }, update: {} });

  // 1) 生成钱包
  const n = CFG.batchSize;
  const nClients = Math.round(n * CFG.clientRatio);
  const wallets = Array.from({ length: n }, () => makeWallet(generatePrivateKey()));
  const clients = wallets.slice(0, nClients);
  const providers = wallets.slice(nClients);
  console.info(`  wallets: ${n}  (clients ${clients.length} / providers ${providers.length})`);

  // 2) FUND 批量发 tBNB
  if (!CFG.dryRun) {
    const fund = makeWallet(FUND_PK);
    const bal = await publicClient.getBalance({ address: fund.address });
    const need = parseEther(CFG.fundPerWallet) * BigInt(n);
    console.info(`  FUND ${fund.address}  balance=${formatEther(bal)} tBNB  need≈${formatEther(need)}`);
    if (bal < need) throw new Error(`FUND wallet has insufficient tBNB. Top up ${fund.address} and retry.`);
    // 顺序发送 + 本地 nonce 递增,遇 nonce 类错误重新同步(应对高频复用钱包 + 公网 RPC 滞后)
    const value = parseEther(CFG.fundPerWallet);
    let nonce = await publicClient.getTransactionCount({ address: fund.address, blockTag: "pending" });
    let lastHash: Hex | undefined;
    let funded = 0;
    for (const w of wallets) {
      for (let attempt = 0; attempt < 8; attempt++) {
        try {
          lastHash = await fund.client.sendTransaction({ to: w.address, value, gasPrice: CFG.gasPrice, nonce });
          nonce++;
          funded++;
          break;
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          if (/insufficient funds/i.test(msg)) throw e;
          nonce = await publicClient.getTransactionCount({ address: fund.address, blockTag: "pending" });
          await new Promise((r) => setTimeout(r, 700 * (attempt + 1)));
        }
      }
    }
    if (lastHash) await publicClient.waitForTransactionReceipt({ hash: lastHash });
    console.info(`  ✓ funded ${funded}/${n} wallets`);
  }

  // 3) 建 providers(mint 身份 + 建库 agent/service)
  const provIds = new Map<string, { agentId: string; category: Category; profile: ReturnType<typeof providerProfile> }>();
  console.info(`  setting up ${providers.length} providers…`);
  await mapLimit(providers, CFG.concurrency, async (w) => {
    try {
      const profile = providerProfile();
      const handle = await uniqueHandle(profile.handle);
      profile.handle = handle;
      profile.displayName = toDisplay(handle);
      let tokenId: string | undefined, txHash: string | undefined;
      if (!CFG.dryRun) {
        const r = await write(w, ADDR.identity, AgentIdentityAbi, "mint", [w.address, handle], "IdentityMinted", "tokenId");
        tokenId = r.value;
        txHash = r.txHash;
      }
      const { agentId } = await dbOp(() => dbCreateProvider(w.address, profile, { tokenId, txHash }));
      provIds.set(w.address, { agentId, category: profile.category, profile });
    } catch (e) {
      console.warn(`  ! provider ${w.address.slice(0, 10)} skipped: ${e instanceof Error ? e.message : e}`);
    }
  });
  console.info(`  ✓ ${provIds.size} providers live in directory`);

  // 4) 建 clients(mint 身份 + 领 USDT + 建库 user)
  const clientIds = new Map<string, string>();
  console.info(`  setting up ${clients.length} clients…`);
  await mapLimit(clients, CFG.concurrency, async (w) => {
    try {
      const handle = await uniqueHandle(makeHandle());
      if (!CFG.dryRun) {
        await write(w, ADDR.identity, AgentIdentityAbi, "mint", [w.address, handle]); // client DID
        await write(w, ADDR.usdt, MockUSDTAbi, "mintTo", [w.address, parseUnits("5000", 18)]); // 领 USDT
        await write(w, ADDR.usdt, MockUSDTAbi, "approve", [ADDR.escrow, parseUnits("1000000", 18)]); // 预授权
      }
      const uid = await dbOp(() => dbCreateClient(w.address, handle));
      clientIds.set(w.address, uid);
    } catch (e) {
      console.warn(`  ! client ${w.address.slice(0, 10)} skipped: ${e instanceof Error ? e.message : e}`);
    }
  });
  console.info(`  ✓ ${clientIds.size} clients ready`);

  // 5) 任务生命周期(每个 client 发一单,随机 provider 竞价,按分布推进)
  const providerList = [...provIds.entries()];
  let stats = { open: 0, escrowed: 0, delivered: 0, settled: 0 };
  console.info(`  running job lifecycles…`);
  await mapLimit(clients, CFG.concurrency, async (cw) => {
    try {
      const clientId = clientIds.get(cw.address)!;
      const category = pick(CATEGORIES);
      const brief = { ...jobBrief(category), category };
      const finalState = chooseFinalState();

      // ① post request
      let chainRequestId: string | undefined, postTx: string | undefined;
      if (!CFG.dryRun) {
        const r = await write(cw, ADDR.escrow, JobEscrowAbi, "postRequest", [`${brief.title} — ${brief.brief}`.slice(0, 300)], "RequestPosted", "requestId");
        chainRequestId = r.value;
        postTx = r.txHash;
      }
      const requestId = await dbOp(() => dbCreateRequest(clientId, brief, { chainRequestId, txHash: postTx }));

      // ② bids from random providers
      const bidders = pickRandom(providerList, randInt(CFG.bidsMin, CFG.bidsMax));
      const bids: { bidId: string; providerWallet: Wallet; providerId: string; amount: number; chainBidIndex?: number }[] = [];
      for (const [pAddr, pInfo] of bidders) {
        const pw = providers.find((x) => x.address === pAddr)!;
        const terms = bidTerms(category, brief.budgetHint);
        let chainBidIndex: number | undefined, bidTx: string | undefined;
        if (!CFG.dryRun && chainRequestId) {
          const r = await write(pw, ADDR.escrow, JobEscrowAbi, "placeBid", [BigInt(chainRequestId), parseUnits(String(terms.amount), 18), BigInt(terms.deliveryDays)], "BidPlaced", "bidIndex");
          chainBidIndex = r.value ? Number(r.value) : undefined;
          bidTx = r.txHash;
        }
        const bidId = await dbOp(() => dbCreateBid(requestId, pInfo.agentId, terms, { chainBidIndex, txHash: bidTx }));
        bids.push({ bidId, providerWallet: pw, providerId: pInfo.agentId, amount: terms.amount, chainBidIndex });
      }

      if (finalState === "open" || bids.length === 0) {
        stats.open++;
        return;
      }

      // ③ accept lowest bid → escrow
      const winner = bids.reduce((a, b) => (b.amount < a.amount ? b : a));
      let chainJobId: string | undefined, escrowTx: string | undefined;
      if (!CFG.dryRun && chainRequestId && winner.chainBidIndex != null) {
        const r = await write(cw, ADDR.escrow, JobEscrowAbi, "acceptBid", [BigInt(chainRequestId), BigInt(winner.chainBidIndex)], "BidAccepted", "jobId");
        chainJobId = r.value;
        escrowTx = r.txHash;
      }
      const jobId = await dbOp(() => dbAcceptBid(requestId, clientId, winner.providerId, winner.amount, brief.title, brief.brief, { chainJobId, escrowTxHash: escrowTx }));

      if (finalState === "escrowed") {
        stats.escrowed++;
        return;
      }

      // ④ provider delivers
      const dtext = deliverableText(category, brief.title);
      const dhash = keccak256(toBytes(dtext));
      let deliverTx: string | undefined;
      if (!CFG.dryRun && chainJobId) {
        const r = await write(winner.providerWallet, ADDR.escrow, JobEscrowAbi, "deliver", [BigInt(chainJobId), dhash]);
        deliverTx = r.txHash;
      }
      await dbOp(() => dbDeliver(jobId, dhash, null, deliverTx));

      if (finalState === "delivered") {
        stats.delivered++;
        return;
      }

      // ⑤ client settles → payout + reputation
      let settleTx: string | undefined;
      if (!CFG.dryRun && chainJobId) {
        const r = await write(cw, ADDR.escrow, JobEscrowAbi, "settle", [BigInt(chainJobId)]);
        settleTx = r.txHash;
      }
      await dbOp(() => dbSettle(jobId, winner.providerId, settleTx));
      stats.settled++;
    } catch (e) {
      console.warn(`  ! storyline failed for ${cw.address.slice(0, 10)}: ${e instanceof Error ? e.message : e}`);
    }
  });

  // 6) 用真实当前区块刷新 LIVE·BLOCK
  if (!CFG.dryRun) {
    const blk = await publicClient.getBlockNumber();
    await prisma.marketStat.update({ where: { id: 1 }, data: { blockNumber: blk } });
  }

  const stat = await prisma.marketStat.findUnique({ where: { id: 1 } });
  console.info(`\n✓ done in ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  console.info(`  jobs this run → open ${stats.open} · escrowed ${stats.escrowed} · delivered ${stats.delivered} · settled ${stats.settled}`);
  console.info(`  market totals → agents ${stat?.totalAgents} · providers ${stat?.totalProviders} · clients ${stat?.totalClients} · jobs ${stat?.totalJobs} · TVL $${stat?.totalEscrowed}\n`);
  await prisma.$disconnect();
}

function pickRandom<T>(arr: T[], k: number): T[] {
  const pool = [...arr];
  const out: T[] = [];
  while (out.length < k && pool.length) out.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
  return out;
}
function dbLabel() {
  const u = process.env.DATABASE_URL ?? "";
  return /localhost|127\.0\.0\.1/.test(u) ? "LOCAL" : /proxy\.rlwy|railway/.test(u) ? "RAILWAY" : "custom";
}

main().catch(async (e) => {
  console.error("\n✗ sim failed:", e instanceof Error ? e.message : e);
  await prisma.$disconnect();
  process.exit(1);
});
