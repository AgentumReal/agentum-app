"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAccount } from "wagmi";
import { Bell, Store, FileText, Briefcase, ArrowRight } from "lucide-react";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { Container, Eyebrow, Card } from "@/components/ui/primitives";
import { WalletButton } from "@/components/wallet-button";
import { getMyAgents } from "@/app/actions/agents";
import { getMyJobs } from "@/app/actions/jobs";
import { getMyRequests } from "@/app/actions/requests";
import { shortAddr } from "@/lib/utils";

type Agents = Awaited<ReturnType<typeof getMyAgents>>;
type Jobs = Awaited<ReturnType<typeof getMyJobs>>;
type Requests = Awaited<ReturnType<typeof getMyRequests>>;

const STATUS_COLOR: Record<string, string> = {
  ESCROWED: "text-warn",
  DELIVERED: "text-mint",
  SETTLED: "text-teal",
  CHALLENGED: "text-danger",
};

export default function DashboardPage() {
  const { address, isConnected } = useAccount();
  const [agents, setAgents] = useState<Agents>([]);
  const [jobs, setJobs] = useState<Jobs>([]);
  const [requests, setRequests] = useState<Requests>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!address) return;
    setLoading(true);
    Promise.all([getMyAgents(address), getMyJobs(address), getMyRequests(address)])
      .then(([a, j, r]) => {
        setAgents(a);
        setJobs(j);
        setRequests(r);
      })
      .finally(() => setLoading(false));
  }, [address]);

  const me = address?.toLowerCase();
  // 待办:我是 provider 且 ESCROWED → 该交付;我是 client 且 DELIVERED → 该验收
  const todos = jobs.flatMap((j) => {
    const iAmClient = j.client.address.toLowerCase() === me;
    if (!iAmClient && j.status === "ESCROWED")
      return [{ id: j.id, label: `Deliver: ${j.title}`, cta: "Submit delivery" }];
    if (iAmClient && j.status === "DELIVERED")
      return [{ id: j.id, label: `Review: ${j.title}`, cta: "Review & settle" }];
    return [];
  });

  return (
    <>
      <Nav />
      <main>
        <Container className="py-10">
          <Eyebrow>Dashboard</Eyebrow>
          <h1 className="mt-2 text-4xl font-semibold tracking-tight">Your Agentum.</h1>

          {!isConnected ? (
            <Card className="mt-8 flex flex-col items-center gap-4 p-10 text-center">
              <p className="text-muted">Connect your wallet to see your dashboard.</p>
              <WalletButton />
            </Card>
          ) : loading ? (
            <Card className="mt-8 p-10 text-center text-muted">Loading…</Card>
          ) : (
            <div className="mt-8 space-y-8">
              {/* 待办 */}
              {todos.length > 0 && (
                <section>
                  <SectionHead icon={Bell} title={`Needs your action (${todos.length})`} />
                  <div className="mt-3 space-y-2">
                    {todos.map((t) => (
                      <Link
                        key={t.id}
                        href={`/jobs/${t.id}`}
                        className="flex items-center justify-between gap-4 rounded-xl border border-teal/30 bg-teal/5 p-4 hover:bg-teal/10"
                      >
                        <span className="truncate text-sm text-foreground">{t.label}</span>
                        <span className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-teal">
                          {t.cta} <ArrowRight className="h-4 w-4" />
                        </span>
                      </Link>
                    ))}
                  </div>
                </section>
              )}

              <div className="grid gap-8 lg:grid-cols-2">
                {/* 我的 agents */}
                <section>
                  <SectionHead icon={Store} title={`My agents (${agents.length})`} action={{ href: "/onboarding", label: "Claim new" }} />
                  <div className="mt-3 space-y-2">
                    {agents.length === 0 ? (
                      <Empty>
                        No agents yet.{" "}
                        <Link href="/onboarding" className="text-teal hover:text-mint">
                          Claim your first
                        </Link>
                        .
                      </Empty>
                    ) : (
                      agents.map((a) => (
                        <Link
                          key={a.handle}
                          href={`/storefront?handle=${a.handle}`}
                          className="flex items-center justify-between rounded-xl border border-border bg-surface/60 p-4 hover:bg-surface-2"
                        >
                          <span className="font-medium text-foreground">{a.displayName}.agent</span>
                          <ArrowRight className="h-4 w-4 text-faint" />
                        </Link>
                      ))
                    )}
                  </div>
                </section>

                {/* 我发的需求 */}
                <section>
                  <SectionHead icon={FileText} title={`My briefs (${requests.length})`} action={{ href: "/post", label: "Post new" }} />
                  <div className="mt-3 space-y-2">
                    {requests.length === 0 ? (
                      <Empty>
                        No briefs yet.{" "}
                        <Link href="/post" className="text-teal hover:text-mint">
                          Post one
                        </Link>
                        .
                      </Empty>
                    ) : (
                      requests.map((r) => (
                        <Link
                          key={r.id}
                          href={`/requests/${r.id}`}
                          className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface/60 p-4 hover:bg-surface-2"
                        >
                          <span className="min-w-0 truncate text-sm font-medium text-foreground">{r.title}</span>
                          <span className="shrink-0 text-xs text-muted">
                            {r._count.bids} bids · {r.open ? "open" : "closed"}
                          </span>
                        </Link>
                      ))
                    )}
                  </div>
                </section>
              </div>

              {/* 我的任务 */}
              <section>
                <SectionHead icon={Briefcase} title={`My jobs (${jobs.length})`} action={{ href: "/inbox", label: "Inbox" }} />
                <div className="mt-3 space-y-2">
                  {jobs.length === 0 ? (
                    <Empty>No jobs yet.</Empty>
                  ) : (
                    jobs.map((j) => (
                      <Link
                        key={j.id}
                        href={`/jobs/${j.id}`}
                        className="flex items-center justify-between gap-4 rounded-xl border border-border bg-surface/60 p-4 hover:bg-surface-2"
                      >
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium text-foreground">{j.title}</div>
                          <div className="text-xs text-muted">
                            {j.client.address.toLowerCase() === me ? "as client" : "as provider"} ·{" "}
                            {j.provider.displayName}.agent
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-semibold text-foreground">${j.amount}</div>
                          <div className={`text-xs font-medium ${STATUS_COLOR[j.status] ?? "text-faint"}`}>
                            {j.status}
                          </div>
                        </div>
                      </Link>
                    ))
                  )}
                </div>
              </section>
            </div>
          )}
        </Container>
      </main>
      <Footer />
    </>
  );
}

function SectionHead({
  icon: Icon,
  title,
  action,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  action?: { href: string; label: string };
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="inline-flex items-center gap-2 font-semibold text-foreground">
        <Icon className="h-4 w-4 text-teal" /> {title}
      </span>
      {action && (
        <Link href={action.href} className="text-sm font-medium text-muted hover:text-foreground">
          {action.label}
        </Link>
      )}
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <div className="rounded-xl border border-border bg-surface/40 p-5 text-sm text-muted">{children}</div>;
}
