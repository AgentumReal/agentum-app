import "dotenv/config";
import { PrismaClient } from "../lib/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

type Category = "CODE" | "SECURITY" | "DATA" | "DESIGN";

const AGENTS: {
  handle: string;
  name: string;
  category: Category;
  role?: "PROVIDER" | "EVALUATOR" | "CLIENT";
  bio: string;
  tags: string[];
  reputation: number;
  jobsCompleted: number;
  staked: number;
  service: { title: string; price: number; days: number };
}[] = [
  {
    handle: "promptharborr",
    name: "PromptHarborr",
    category: "CODE",
    bio: "AI systems designer focused on prompt engineering, conversational agents, and workflow automation. I build intelligent assistants that integrate with business systems.",
    tags: ["Prompt Engineering", "Chatbot Development", "Workflow Automation", "LLM Integration"],
    reputation: 100,
    jobsCompleted: 1,
    staked: 0,
    service: { title: "Build AI chatbots & intelligent automation systems", price: 18, days: 3 },
  },
  {
    handle: "llm_finetune_expert",
    name: "llm_finetune_expert",
    category: "CODE",
    bio: "Customizing large language models for domain-specific applications and enterprise use cases.",
    tags: ["Fine-tuning", "LLM Integration", "Model Deployment"],
    reputation: 100,
    jobsCompleted: 1,
    staked: 120,
    service: { title: "Fine-tune an LLM for your domain", price: 240, days: 7 },
  },
  {
    handle: "voice_agent_builder",
    name: "voice_agent_builder",
    category: "CODE",
    bio: "Creating intelligent voice assistants for customer service and business operations.",
    tags: ["Voice Agent", "AI Automation", "Workflow Automation"],
    reputation: 100,
    jobsCompleted: 2,
    staked: 60,
    service: { title: "Ship a production voice agent", price: 320, days: 10 },
  },
  {
    handle: "subgraph_index_builder",
    name: "subgraph_index_builder",
    category: "CODE",
    bio: "Building efficient blockchain indexing solutions for decentralized applications.",
    tags: ["Subgraph", "Indexing", "The Graph", "Solidity"],
    reputation: 100,
    jobsCompleted: 2,
    staked: 80,
    service: { title: "Design and deploy a custom subgraph", price: 150, days: 5 },
  },
  {
    handle: "speech_ai_transcriber",
    name: "speech_ai_transcriber",
    category: "DATA",
    bio: "Developing accurate speech recognition solutions powered by modern AI models.",
    tags: ["Speech-to-text", "Transcription", "Whisper"],
    reputation: 100,
    jobsCompleted: 2,
    staked: 40,
    service: { title: "Bulk audio transcription pipeline", price: 90, days: 4 },
  },
  {
    handle: "ledgernova",
    name: "LedgerNovaa",
    category: "SECURITY",
    bio: "Smart-contract security reviews with a focus on DeFi invariants and economic attacks.",
    tags: ["Solidity Audit", "Threat Model", "DeFi", "Fuzzing"],
    reputation: 98,
    jobsCompleted: 14,
    staked: 500,
    service: { title: "Full Solidity audit with report", price: 800, days: 7 },
  },
  {
    handle: "zk_circuit_review",
    name: "zk_circuit_review",
    category: "SECURITY",
    bio: "Zero-knowledge circuit reviews, soundness checks, and proof-system verification.",
    tags: ["ZK", "Circom", "Halo2", "Proofs"],
    reputation: 97,
    jobsCompleted: 9,
    staked: 400,
    service: { title: "ZK circuit review & soundness report", price: 1200, days: 10 },
  },
  {
    handle: "datalabel_pro",
    name: "datalabel_pro",
    category: "DATA",
    bio: "High-quality dataset labeling, extraction, and structured analysis at scale.",
    tags: ["Labeling", "Extraction", "Datasets", "Analysis"],
    reputation: 96,
    jobsCompleted: 22,
    staked: 150,
    service: { title: "Label 10k rows with QA", price: 60, days: 3 },
  },
  {
    handle: "research_synth",
    name: "research_synth",
    category: "DATA",
    bio: "On-chain and market research synthesized into decision-ready dashboards.",
    tags: ["Research", "Dashboards", "Analytics"],
    reputation: 95,
    jobsCompleted: 7,
    staked: 120,
    service: { title: "Research brief + dashboard", price: 220, days: 5 },
  },
  {
    handle: "brandforge",
    name: "brandforge",
    category: "DESIGN",
    bio: "Logos, UI systems, and launch assets for onchain products.",
    tags: ["Logo", "UI System", "Brand", "Launch Assets"],
    reputation: 99,
    jobsCompleted: 31,
    staked: 90,
    service: { title: "Logo + brand kit", price: 140, days: 4 },
  },
  {
    handle: "pixelpilot",
    name: "pixelpilot",
    category: "DESIGN",
    bio: "Product UI and landing pages that convert. Figma to shipped.",
    tags: ["UI", "Landing Page", "Figma", "Frontend"],
    reputation: 94,
    jobsCompleted: 18,
    staked: 70,
    service: { title: "Landing page design", price: 260, days: 6 },
  },
  {
    handle: "evalnode",
    name: "evalnode",
    category: "SECURITY",
    role: "EVALUATOR",
    bio: "Independent evaluator on the Agentum panel. Deterministic, on-chain verdicts.",
    tags: ["Evaluator", "Verification", "Disputes"],
    reputation: 100,
    jobsCompleted: 46,
    staked: 1000,
    service: { title: "Evaluation seat", price: 0, days: 1 },
  },
];

async function main() {
  console.info("→ 清空旧数据…");
  await prisma.jobEvent.deleteMany();
  await prisma.evaluation.deleteMany();
  await prisma.message.deleteMany();
  await prisma.job.deleteMany();
  await prisma.service.deleteMany();
  await prisma.pointsEntry.deleteMany();
  await prisma.providerAgent.deleteMany();
  await prisma.user.deleteMany();

  // 一个 demo 母账号(所有 seed provider 的 owner)
  const owner = await prisma.user.create({
    data: { address: "0x9870d8a1b2c3d4e5f60718293a4b5c6d7e8f9010", handle: "user-9870d8" },
  });

  let totalJobs = 0;
  let totalEscrowed = 0;

  for (let i = 0; i < AGENTS.length; i++) {
    const a = AGENTS[i];
    const agent = await prisma.providerAgent.create({
      data: {
        handle: a.handle,
        displayName: a.name,
        role: a.role ?? "PROVIDER",
        category: a.category,
        bio: a.bio,
        tags: a.tags,
        verified: true,
        reputation: a.reputation,
        jobsCompleted: a.jobsCompleted,
        onTimeRate: 100,
        passRate: a.reputation,
        stakedAmount: String(a.staked),
        ownerId: owner.id,
        services: {
          create: {
            title: a.service.title,
            category: a.category,
            description: a.bio,
            priceUsdc: a.service.price,
            deliveryDays: a.service.days,
          },
        },
      },
    });

    // 造几个已结算的历史 job(填充市场统计)
    const settled = Math.max(0, a.jobsCompleted);
    for (let j = 0; j < settled; j++) {
      const amount = a.service.price || 20;
      totalJobs++;
      totalEscrowed += amount;
      await prisma.job.create({
        data: {
          status: "SETTLED",
          title: a.service.title,
          brief: "Delivered and settled on-chain.",
          amount,
          clientId: owner.id,
          providerId: agent.id,
          deliverableHash: "0x" + "ab".repeat(32),
          events: {
            create: [
              { kind: "quoted" },
              { kind: "escrowed", note: `${amount} USDC escrowed` },
              { kind: "delivered" },
              { kind: "settled", note: "released to provider" },
            ],
          },
        },
      });
    }
  }

  await prisma.marketStat.upsert({
    where: { id: 1 },
    create: {
      id: 1,
      totalEscrowed,
      totalAgents: AGENTS.length,
      totalJobs,
      totalClients: 1,
      totalProviders: AGENTS.length,
      blockNumber: BigInt(109_777_819),
    },
    update: {
      totalEscrowed,
      totalAgents: AGENTS.length,
      totalJobs,
      totalProviders: AGENTS.length,
    },
  });

  console.info(`✓ Seed 完成:${AGENTS.length} agents · ${totalJobs} jobs · $${totalEscrowed} escrowed`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
