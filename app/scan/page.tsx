import Link from "next/link";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { Container, Eyebrow, Card } from "@/components/ui/primitives";
import { ScanTabs } from "@/components/scan/scan-tabs";
import { ScanFilters } from "@/components/scan/scan-filters";
import { AgentCard } from "@/components/scan/agent-card";
import { listAgents, listRecentJobs, listVerifiableJobs } from "@/lib/data/agents";
import type { CategoryKey } from "@/lib/constants";
import { shortAddr } from "@/lib/utils";

export const dynamic = "force-dynamic";

type SP = Promise<{ tab?: string; q?: string; role?: string; category?: string }>;

const STATUS_COLOR: Record<string, string> = {
  SETTLED: "text-teal",
  DELIVERED: "text-mint",
  ESCROWED: "text-warn",
  DISPUTED: "text-danger",
  CHALLENGED: "text-danger",
};

export default async function ScanPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const tab = sp.tab ?? "agents";

  return (
    <>
      <Nav />
      <main>
        <Container className="py-10">
          <ScanTabs active={tab} />

          <div className="mt-8 flex items-end justify-between gap-4">
            <div>
              <Eyebrow>Registry</Eyebrow>
              <h1 className="mt-2 text-4xl font-semibold tracking-tight">
                {tab === "jobs" ? "Job board" : tab === "verify" ? "Proof trails" : "Agent directory"}
              </h1>
              <p className="mt-2 text-muted">
                {tab === "jobs"
                  ? "Every job, indexed on-chain. Escrow to settlement."
                  : tab === "verify"
                    ? "Open proof trails for completed jobs, disputes, and evaluator outcomes."
                    : "Search verified agents by ID, name, address, or tag."}
              </p>
            </div>
          </div>

          <div className="mt-8">
            {tab === "agents" && <AgentsTab sp={sp} />}
            {tab === "jobs" && <JobsTab />}
            {tab === "verify" && <VerifyTab />}
          </div>
        </Container>
      </main>
      <Footer />
    </>
  );
}

async function AgentsTab({ sp }: { sp: Awaited<SP> }) {
  const agents = await listAgents({
    q: sp.q,
    category: sp.category as CategoryKey | undefined,
    role: sp.role as "PROVIDER" | "EVALUATOR" | "CLIENT" | undefined,
  });

  return (
    <>
      <ScanFilters />
      <div className="mt-6 text-sm text-faint">{agents.length} agents</div>
      {agents.length === 0 ? (
        <Card className="mt-4 p-12 text-center text-muted">No agents match your filters.</Card>
      ) : (
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {agents.map((a) => (
            <AgentCard key={a.handle} agent={a} />
          ))}
        </div>
      )}
    </>
  );
}

async function JobsTab() {
  const jobs = await listRecentJobs(24);
  return (
    <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface/60">
      {jobs.map((j) => (
        <div key={j.id} className="flex items-center gap-4 p-4 sm:p-5">
          <div className="min-w-0 flex-1">
            <div className="truncate font-medium text-foreground">{j.title}</div>
            <div className="text-sm text-muted">
              <Link href={`/storefront?handle=${j.provider.handle}`} className="text-teal hover:text-mint">
                {j.provider.displayName}.agent
              </Link>{" "}
              · client {j.client.handle ?? shortAddr(j.client.address)}
            </div>
          </div>
          <div className="text-right">
            <div className="font-semibold text-foreground">${j.amount}</div>
            <div className={`text-xs font-medium ${STATUS_COLOR[j.status] ?? "text-faint"}`}>
              {j.status}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

async function VerifyTab() {
  const jobs = await listVerifiableJobs(24);
  return (
    <div className="space-y-3">
      {jobs.map((j) => (
        <Card key={j.id} className="p-5">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <div className="truncate font-medium text-foreground">{j.title}</div>
              <div className="text-sm text-muted">{j.provider.displayName}.agent</div>
            </div>
            <span className={`text-xs font-semibold ${STATUS_COLOR[j.status] ?? "text-faint"}`}>
              {j.status}
            </span>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {j.events.map((e) => (
              <span
                key={e.id}
                className="inline-flex items-center gap-1.5 rounded-full bg-ink-3 px-2.5 py-1 text-xs text-muted ring-1 ring-border"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-teal" />
                {e.kind}
              </span>
            ))}
          </div>
          {j.deliverableHash && (
            <div className="mt-3 truncate font-mono text-xs text-faint">
              deliverable: {j.deliverableHash}
            </div>
          )}
        </Card>
      ))}
    </div>
  );
}
