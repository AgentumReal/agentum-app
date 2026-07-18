// 活动生成器内容池 —— 原创、随机、量足。
// 4 个分类:CODE / SECURITY / DATA / DESIGN。每个分类有 provider 档案、服务、job 简报、交付物。

export type Category = "CODE" | "SECURITY" | "DATA" | "DESIGN";
export const CATEGORIES: Category[] = ["CODE", "SECURITY", "DATA", "DESIGN"];

export function pick<T>(arr: T[], rand = Math.random): T {
  return arr[Math.floor(rand() * arr.length)];
}
export function pickN<T>(arr: T[], n: number, rand = Math.random): T[] {
  const pool = [...arr];
  const out: T[] = [];
  while (out.length < n && pool.length) out.push(pool.splice(Math.floor(rand() * pool.length), 1)[0]);
  return out;
}
export function randInt(min: number, max: number, rand = Math.random) {
  return Math.floor(rand() * (max - min + 1)) + min;
}

// ── provider handle 组词 ──
const HANDLE_ADJ = [
  "chain", "onchain", "cipher", "proof", "quantum", "vector", "atlas", "nova", "prism", "sentinel",
  "forge", "hyper", "meta", "neural", "solid", "zk", "spark", "delta", "orbit", "aegis",
  "flux", "ledger", "byte", "logic", "signal", "vertex", "helix", "photon", "cobalt", "ember",
];
const HANDLE_NOUN = [
  "labs", "works", "forge", "guild", "node", "smith", "craft", "core", "stack", "foundry",
  "systems", "collective", "studio", "engine", "protocol", "kit", "sync", "matrix", "arc", "grid",
];

export function makeHandle(rand = Math.random): string {
  const style = rand();
  if (style < 0.5) return `${pick(HANDLE_ADJ, rand)}_${pick(HANDLE_NOUN, rand)}`;
  if (style < 0.8) return `${pick(HANDLE_ADJ, rand)}${pick(HANDLE_NOUN, rand)}`;
  return `${pick(HANDLE_ADJ, rand)}-${pick(HANDLE_ADJ, rand)}`;
}
export function toDisplay(handle: string): string {
  return handle
    .split(/[_-]/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

// ── 头像池(public/avatars 下,若不足 8 会取模)──
export const AVATARS = Array.from({ length: 8 }, (_, i) => `/avatars/a${i + 1}.svg`);

// ── 每个分类的档案 / 服务 / job 简报 / 交付物 ──
type CatContent = {
  bios: string[];
  tags: string[];
  services: string[];
  jobs: { title: string; brief: string }[];
  deliverables: string[];
  priceRange: [number, number];
  daysRange: [number, number];
};

const CONTENT: Record<Category, CatContent> = {
  CODE: {
    bios: [
      "Full-stack protocol engineer. I ship Solidity, subgraphs, and the TypeScript SDKs that wire them to your frontend.",
      "Smart-contract developer focused on gas-tight, upgrade-safe systems. ERC-4626 vaults, staking, and custom AMMs.",
      "I build agent tooling: on-chain actions, wallet abstraction, and MCP integrations for autonomous workflows.",
      "Backend + chain engineer. Indexers, keeper bots, and reliable event pipelines that don't drop a block.",
      "Solidity + Foundry specialist. I deliver contracts with 90%+ test coverage and a clean deployment runbook.",
      "Integrations engineer. Bridges, oracle wiring, and cross-chain messaging done without the footguns.",
    ],
    tags: ["Solidity", "Foundry", "TypeScript", "Subgraph", "ERC-4626", "Wallet Abstraction", "Keeper Bots", "SDK", "Hardhat", "Viem"],
    services: [
      "Solidity smart-contract development",
      "Custom staking / vault contract",
      "Subgraph design and deployment",
      "Agent SDK + on-chain actions",
      "Keeper bot + automation",
      "Frontend ↔ contract integration",
    ],
    jobs: [
      { title: "Build an ERC-4626 staking vault with rewards", brief: "Need a production-ready staking vault: deposit/withdraw, streaming rewards, per-second accrual, and an emergency pause. Provide Foundry tests (happy + failure paths) and a deploy script for BSC. ~400 LOC target." },
      { title: "Ship a subgraph for our marketplace events", brief: "Index Escrow + Identity contract events (JobOpened, BidPlaced, JobSettled, IdentityMinted). Entities for agents, jobs, and settlements with derived reputation. Deploy to a hosted node and hand over the schema + queries." },
      { title: "Agent action layer: post/bid/settle from a workflow", brief: "Wrap our on-chain marketplace calls into a clean TypeScript SDK an AI agent can call: postRequest, placeBid, acceptBid, deliver, settle. Handle nonces, retries, and receipt parsing. Include usage examples." },
      { title: "Keeper bot to auto-settle expired challenge windows", brief: "A resilient off-chain bot that watches Delivered jobs and calls settle() once the challenge window passes. Needs restart-safety, RPC failover, and alerting on failures." },
      { title: "Gas-optimize our reward distribution contract", brief: "Current claimAll() loops unbounded and is expensive. Refactor to a checkpoint/index model, cut SSTOREs, and prove savings with a gas snapshot before/after. Keep the external interface stable." },
      { title: "Frontend integration for wallet connect + tx flow", brief: "Wire wagmi/viem into our Next.js app: connect, network guard, approve+escrow flow, and toast-based tx feedback with explorer links. Must handle wrong-network and rejected-tx gracefully." },
      { title: "Cross-chain message relay (BSC ↔ opBNB)", brief: "Design and implement a minimal message-passing relay for our token between BSC and opBNB testnets, with replay protection and a small demo UI. Document the trust assumptions clearly." },
      { title: "Deploy + verify a token with vesting", brief: "Standard ERC-20 plus a linear vesting contract for team/investor allocations. Deploy to BSC testnet, verify on BscScan, and provide a one-page ops guide for releasing tranches." },
      { title: "Build an indexer + REST API for on-chain jobs", brief: "Postgres-backed indexer that turns escrow events into a queryable API: list jobs, filter by status, per-agent stats. Include backfill from genesis and a live tail." },
      { title: "Write Foundry invariant tests for our AMM", brief: "Add invariant/fuzz tests covering k-value preservation, no-free-lunch, and fee accounting for our constant-product pool. Target meaningful coverage and document each invariant." },
    ],
    deliverables: [
      "Contracts + Foundry test suite (all green), deploy script, and a short runbook. Verified on BscScan.",
      "Subgraph schema, mappings, and deployed endpoint with example queries and a handover doc.",
      "TypeScript SDK package with typed methods, retry/nonce handling, and a runnable example script.",
      "Keeper bot repo with Dockerfile, RPC-failover config, alerting hooks, and a deploy guide.",
    ],
    priceRange: [80, 900],
    daysRange: [3, 14],
  },
  SECURITY: {
    bios: [
      "Smart-contract auditor. DeFi invariants, reentrancy, and economic attacks — with severity-rated reports.",
      "Security researcher. I write threat models and PoC exploits, then verify the fixes actually hold.",
      "ZK + cryptography reviewer. Circuit soundness, trusted-setup hygiene, and proof-system pitfalls.",
      "Independent auditor with a bias for economic edge cases: oracle manipulation, MEV, and liquidation griefing.",
      "I do fast pre-audit reviews before you pay for a full firm — catch the obvious criticals cheaply.",
      "Protocol security engineer. Fuzzing, formal invariants, and monitoring/alerting for live contracts.",
    ],
    tags: ["Audit", "Reentrancy", "Threat Model", "ZK", "Fuzzing", "Formal Verification", "MEV", "Oracle", "PoC", "Invariants"],
    services: [
      "Full Solidity audit with report",
      "Pre-audit security review",
      "ZK circuit soundness review",
      "Threat model + attack surface map",
      "Invariant / fuzz test suite",
      "Live-contract monitoring setup",
    ],
    jobs: [
      { title: "Audit our staking vault before mainnet", brief: "~450 LOC staking vault. Full review: reentrancy, reward-accounting rounding, access control, and upgrade safety. Deliver a severity-rated report (Critical→Info) with concrete fixes and re-test after patches." },
      { title: "Pre-audit review of our lending market", brief: "Fast 3-day review to catch the obvious criticals before we book a full firm. Focus on collateral math, oracle usage, and liquidation paths. Short report with the top risks ranked." },
      { title: "ZK circuit soundness review (Circom)", brief: "Review a ~1.5k-constraint Circom circuit for under-constrained signals, alias attacks, and trusted-setup handling. Provide a soundness assessment and any exploitable findings." },
      { title: "Threat model for our agent escrow protocol", brief: "Map the attack surface of an escrow + reputation system: griefing, sybil bids, fake deliverables, evaluator collusion. Deliver a threat model doc with mitigations ranked by cost/benefit." },
      { title: "Write invariant tests for our AMM + vault", brief: "Foundry invariant/fuzz suite covering solvency, fee accounting, and share-price monotonicity. Each invariant documented; must actually catch a seeded bug we'll plant." },
      { title: "Oracle-manipulation review of our pricing", brief: "We read a single DEX pool for price. Assess manipulation/MEV risk, model a sandwich + spot-manipulation attack, and recommend a TWAP or multi-source fix with tradeoffs." },
      { title: "Set up monitoring + alerting for live contracts", brief: "Watch our deployed contracts for anomalous events (large withdrawals, ownership changes, paused states) and alert to Telegram. Include a runbook for each alert." },
      { title: "Review upgrade + proxy setup for footguns", brief: "We use a UUPS proxy. Check for storage-collision risk, uninitialized implementations, and admin-key exposure. Deliver findings + a safe upgrade checklist." },
      { title: "Exploit PoC for a suspected rounding bug", brief: "We suspect a rounding issue lets an attacker drain dust over many calls. Build a Foundry PoC that demonstrates (or rules out) the exploit and quantify the impact." },
      { title: "Bridge security review (message passing)", brief: "Review a minimal cross-chain message relay for replay, forged-proof, and finality-assumption risks. Report the trust model gaps and how to close them." },
    ],
    deliverables: [
      "Severity-rated audit report (Critical/High/Medium/Low/Info) with PoCs and remediation; findings re-verified after fixes.",
      "Threat model document: assets, actors, attack paths, and mitigations ranked by cost/benefit.",
      "ZK soundness assessment with any under-constrained signals and exploit sketches.",
      "Foundry invariant/fuzz suite that reproduces the class of bug, plus a coverage summary.",
    ],
    priceRange: [150, 1500],
    daysRange: [3, 12],
  },
  DATA: {
    bios: [
      "Data engineer for onchain teams. Labeling, extraction, and dashboards that answer the question you actually asked.",
      "I turn raw chain data into decision-ready analysis: cohort retention, flow-of-funds, and wallet clustering.",
      "ML data specialist. Dataset curation, cleaning, and evaluation sets for fine-tuning agents.",
      "Research analyst. Competitive teardowns, tokenomics models, and market maps backed by real numbers.",
      "I build ETL pipelines and keep them alive — schema-checked, monitored, and reproducible.",
      "Speech + text data: transcription, structured extraction, and QA at scale with a human-in-the-loop.",
    ],
    tags: ["Labeling", "Dashboards", "Analytics", "ETL", "Wallet Clustering", "Tokenomics", "Datasets", "Transcription", "Research", "SQL"],
    services: [
      "Dataset labeling with QA",
      "On-chain analytics dashboard",
      "Flow-of-funds / wallet clustering",
      "Tokenomics model + sim",
      "ETL pipeline build",
      "Bulk transcription + extraction",
    ],
    jobs: [
      { title: "Label 10k rows with a QA pass", brief: "10,000 short text rows to classify into a 6-label taxonomy we provide. Need a second-pass QA, an inter-annotator agreement number, and the cleaned dataset in CSV + JSONL." },
      { title: "Build an on-chain analytics dashboard", brief: "Dashboard tracking daily active wallets, TVL, job volume, and settlement rate for our marketplace. Pull from our indexer, refresh hourly, and make each number click-through verifiable." },
      { title: "Flow-of-funds analysis for a set of wallets", brief: "Given ~50 seed addresses, cluster related wallets, map fund flows, and flag anything that looks like wash/sybil activity. Deliver a written brief + an interactive graph." },
      { title: "Tokenomics model with emissions + sinks", brief: "Model supply, emissions schedule, staking sinks, and fee flows over 24 months. Provide a spreadsheet with adjustable assumptions and a one-page summary of the equilibrium." },
      { title: "ETL pipeline: contract events → warehouse", brief: "Reliable pipeline from BSC logs to Postgres/warehouse with backfill, schema checks, and monitoring. Must be reproducible and alert on gaps. Hand over docs + runbook." },
      { title: "Transcribe + structure 20 hours of audio", brief: "Transcribe 20h of recorded AMAs, then extract structured fields (topics, questions, action items) into JSON. Accuracy target 95%+, with a human QA pass on the extraction." },
      { title: "Curate a fine-tuning dataset for an agent", brief: "Assemble and clean ~5k instruction/response pairs for a support agent in our domain. Dedup, filter low-quality, and produce a held-out eval set with a scoring rubric." },
      { title: "Competitive teardown of 5 agent protocols", brief: "Research and compare five agent-commerce protocols: mechanism, fees, traction, and token model. Deliver a market map + a 5-page brief with sourced numbers." },
      { title: "Weekly KPI report automation", brief: "Automate a weekly KPI email: new agents, jobs posted/settled, GMV, and retention. Pull from the DB, render charts, and send to a Telegram channel every Monday." },
      { title: "Dashboard for provider reputation trends", brief: "Visualize on-chain reputation over time per provider: completion rate, on-time %, disputes. Let us filter by category and export the underlying data." },
    ],
    deliverables: [
      "Cleaned dataset (CSV + JSONL), labeling guidelines, QA/IAA numbers, and a held-out eval split.",
      "Live dashboard with hourly refresh, click-through-verifiable metrics, and a short methodology note.",
      "Analysis brief + interactive graph, with the query set and assumptions documented for reproducibility.",
      "ETL repo with backfill, schema checks, monitoring, and a runbook.",
    ],
    priceRange: [40, 600],
    daysRange: [2, 10],
  },
  DESIGN: {
    bios: [
      "Brand + product designer for onchain teams. Logos, design systems, and launch assets that don't look templated.",
      "UI/UX designer. Figma-to-shipped landing pages and app flows that actually convert.",
      "Motion + 3D designer. Announcement videos, token visuals, and loop animations for socials.",
      "I design the whole launch kit: logo, palette, type, banners, and a pitch-deck template in one system.",
      "Product designer focused on wallet UX and complex tx flows made legible for normal humans.",
      "Visual designer. Twitter/X thread graphics, explainer diagrams, and OG cards that get clicks.",
    ],
    tags: ["Logo", "Design System", "Figma", "Landing Page", "Motion", "3D", "Brand", "UI/UX", "Pitch Deck", "Social Assets"],
    services: [
      "Logo + brand kit",
      "Landing page design (Figma)",
      "Full launch asset pack",
      "Product UI / app flows",
      "Motion / announcement video",
      "Pitch-deck design",
    ],
    jobs: [
      { title: "Logo + brand kit for an AI-agent protocol", brief: "Design a distinctive logo (mark + wordmark), a color palette, type pairing, and usage rules. Deliver SVG + PNG exports and a one-page brand sheet. Aesthetic: modern, onchain, not generic." },
      { title: "Design our landing page in Figma", brief: "One-page marketing site: hero, how-it-works, protocol pillars, and CTA. Dark, premium, mobile-first. Deliver a Figma file with components and hand-off specs a dev can build from." },
      { title: "Launch asset pack for token announcement", brief: "Twitter banner, OG/share card, 3–4 thread graphics, and a Telegram sticker set — all one coherent system. Source files + exports. Turnaround matters; we launch in a week." },
      { title: "App UI for a marketplace directory", brief: "Design the agent-directory and profile screens: cards, filters, reputation stats, and an onboarding wizard. Consistent, accessible, dark theme. Figma with a small component library." },
      { title: "30s announcement video (motion)", brief: "A punchy 30-second launch video: logo reveal, one-line thesis, three benefit beats, and a CTA. Deliver 1080p + a vertical cut for Shorts, with our palette and a licensed track." },
      { title: "Pitch-deck design (12–14 slides)", brief: "Turn our raw content into an investor-grade 16:9 deck: cover, problem, solution, mechanism, traction, team, ask. On-brand, clean, with editable source." },
      { title: "Explainer diagram of our job lifecycle", brief: "A single clear diagram of post → bid → escrow → deliver → settle, plus the challenge path. Needs to read at a glance in a tweet and in the docs. SVG + PNG." },
      { title: "Redesign our onboarding flow", brief: "Our claim-identity wizard drops users. Redesign the 3-step flow for clarity and momentum, with preset avatar options and inline validation. Figma prototype + specs." },
      { title: "Set of 8 default avatars (onchain vibe)", brief: "Design 8 cohesive default avatars users can pick instead of uploading — gradient/geometric, on-brand, and distinct at small sizes. Deliver SVGs sized for circle + square crops." },
      { title: "OG cards + social template system", brief: "A reusable template system for share cards and thread graphics: title, subtitle, mark, and a slot for a stat. Deliver Figma components + export presets for X and Telegram." },
    ],
    deliverables: [
      "Logo (mark + wordmark), palette, type, and usage sheet — SVG + PNG exports and a Figma source file.",
      "Figma file with components and dev hand-off specs, plus a mobile pass.",
      "Coherent asset pack (banner, OG card, thread graphics, stickers) with source files and export presets.",
      "1080p + vertical video cuts, project file, and the licensed track reference.",
    ],
    priceRange: [60, 700],
    daysRange: [2, 9],
  },
};

const BID_MESSAGES = [
  "Done this exact scope before — can start today and hit your deadline.",
  "I'll deliver with tests and a short handover doc. Happy to do a quick call first.",
  "Fixed price, no surprises. Includes one round of revisions.",
  "Can go faster than the deadline if you need it. References on request.",
  "I'll ship a clean, reviewable deliverable and a summary of decisions.",
  "Priced to win — I want the reputation on this new marketplace.",
  "Strong fit for my stack. I'll flag risks early rather than at the end.",
  "Includes a short Loom walkthrough of the deliverable on completion.",
];

export function providerProfile(rand = Math.random) {
  const category = pick(CATEGORIES, rand);
  const c = CONTENT[category];
  const handle = makeHandle(rand);
  return {
    category,
    handle,
    displayName: toDisplay(handle),
    bio: pick(c.bios, rand),
    tags: pickN(c.tags, randInt(2, 4, rand), rand),
    avatar: pick(AVATARS, rand),
    service: {
      title: pick(c.services, rand),
      priceUsdc: randInt(c.priceRange[0], c.priceRange[1], rand),
      deliveryDays: randInt(c.daysRange[0], c.daysRange[1], rand),
    },
  };
}

export function jobBrief(category: Category, rand = Math.random) {
  const c = CONTENT[category];
  const j = pick(c.jobs, rand);
  return {
    title: j.title,
    brief: j.brief,
    budgetHint: randInt(c.priceRange[0], c.priceRange[1], rand),
  };
}

// 高价真实分布:多数中小单 + 少量大单(长尾),让 job 金额有真实差异、不趋同。
// 平均约 ~$9k,用于把 TVL 冲到较大规模;每个数字仍是真实链上 escrow。
export function whaleAmount(rand = Math.random): number {
  const r = rand();
  if (r < 0.45) return randInt(400, 3000, rand); // 45% 小单
  if (r < 0.8) return randInt(4000, 18000, rand); // 35% 中单
  if (r < 0.95) return randInt(20000, 45000, rand); // 15% 大单
  return randInt(50000, 95000, rand); // 5% 巨鲸单
}

export function bidTerms(category: Category, budgetHint: number, rand = Math.random) {
  const c = CONTENT[category];
  // 报价围绕预算上下浮动 -25% ~ +15%
  const amount = Math.max(
    c.priceRange[0],
    Math.round(budgetHint * (0.75 + rand() * 0.4)),
  );
  return {
    amount,
    deliveryDays: randInt(c.daysRange[0], c.daysRange[1], rand),
    message: pick(BID_MESSAGES, rand),
  };
}

export function deliverableText(category: Category, jobTitle: string, rand = Math.random) {
  const c = CONTENT[category];
  return [
    `# Deliverable — ${jobTitle}`,
    `Category: ${category}`,
    "",
    pick(c.deliverables, rand),
    "",
    `Notes: scope met as specified; one revision round included. Ping me with any follow-ups.`,
  ].join("\n");
}
