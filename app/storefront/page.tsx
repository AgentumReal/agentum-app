import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, MessageSquare, Clock } from "lucide-react";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { Container, Card } from "@/components/ui/primitives";
import { AgentumMark } from "@/components/ui/logo";
import { getAgentByHandle } from "@/lib/data/agents";
import { CATEGORY_LABEL, type CategoryKey } from "@/lib/constants";
import { shortAddr } from "@/lib/utils";
import { HireButton } from "@/components/hire-button";
import { getOnchainReputation, getOnchainReputationRecord } from "@/lib/web3/server-read";

export const dynamic = "force-dynamic";

type SP = Promise<{ handle?: string }>;

export default async function StorefrontPage({ searchParams }: { searchParams: SP }) {
  const { handle } = await searchParams;
  if (!handle) notFound();

  const agent = await getAgentByHandle(handle);
  if (!agent) notFound();

  // 优先读链上声誉;读不到(未部署/新地址)回退 DB 缓存
  const [onchainRep, rep] = await Promise.all([
    getOnchainReputation(agent.owner.address),
    getOnchainReputationRecord(agent.owner.address),
  ]);
  // 有链上声誉记录(completed>0)时,Completed / On-time / Disputes won 全用链上真值
  const hasChainRecord = rep != null && rep.completed > 0;
  const onTimePct = hasChainRecord ? Math.round((rep.onTime / rep.completed) * 100) : agent.onTimeRate;

  const stats = [
    { value: onchainRep ?? agent.reputation, label: "Reputation", onchain: onchainRep != null },
    { value: hasChainRecord ? rep.completed : agent.jobsCompleted, label: "Completed", onchain: hasChainRecord },
    { value: `${onTimePct}%`, label: "On time", onchain: hasChainRecord },
    { value: `${agent.passRate}%`, label: "Pass rate", onchain: false },
    { value: hasChainRecord ? rep.disputesWon : agent.disputesWon, label: "Disputes won", onchain: hasChainRecord },
  ];

  return (
    <>
      <Nav />
      <main>
        <Container className="py-10">
          <Link
            href="/scan"
            className="inline-flex items-center gap-2 text-sm text-muted hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </Link>

          {/* Header */}
          <div className="mt-6 flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex gap-4">
              <span className="grid h-20 w-20 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-mint/25 to-teal/15 ring-1 ring-border-strong">
                {agent.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={agent.avatarUrl} alt={agent.displayName} className="h-20 w-20 rounded-2xl object-cover" />
                ) : (
                  <AgentumMark className="h-10 w-10" />
                )}
              </span>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-3xl font-semibold tracking-tight">{agent.displayName}</h1>
                  {agent.verified && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-teal/12 px-2.5 py-1 text-xs font-medium text-teal">
                      <span className="h-1.5 w-1.5 rounded-full bg-teal" /> Verified
                    </span>
                  )}
                  {agent.availableNow && (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-mint/10 px-2.5 py-1 text-xs font-medium text-mint">
                      <span className="h-1.5 w-1.5 rounded-full bg-mint" /> Available now
                    </span>
                  )}
                </div>
                <div className="mt-1 text-sm text-muted">
                  {agent.role.charAt(0) + agent.role.slice(1).toLowerCase()} · sub-account of{" "}
                  <span className="text-teal">@{agent.owner.handle ?? shortAddr(agent.owner.address)}</span>
                </div>
                <div className="mt-1 flex items-center gap-1.5 text-xs text-faint">
                  <Clock className="h-3.5 w-3.5" /> Typically replies fast · BSC network
                </div>
              </div>
            </div>
            <Link
              href={`/inbox?to=${agent.owner.address}&name=${encodeURIComponent(agent.displayName)}`}
              className="inline-flex h-11 items-center gap-2 rounded-full bg-ink-3 px-5 text-sm font-medium text-foreground ring-1 ring-border hover:ring-border-strong"
            >
              <MessageSquare className="h-4 w-4" /> Message
            </Link>
          </div>

          {agent.bio && <p className="mt-6 max-w-2xl text-muted">{agent.bio}</p>}

          <div className="mt-4 flex flex-wrap gap-2">
            <span className="rounded-full bg-ink-3 px-3 py-1 text-sm text-muted ring-1 ring-border">
              {CATEGORY_LABEL[agent.category as CategoryKey]}
            </span>
            {agent.tags.map((t) => (
              <span key={t} className="rounded-full bg-ink-3 px-3 py-1 text-sm text-muted ring-1 ring-border">
                {t}
              </span>
            ))}
          </div>

          {/* Performance */}
          <div className="mt-10">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-faint">
              Performance · on-chain reputation, verifiable on chain
            </div>
            <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
              {stats.map((s) => (
                <Card key={s.label} className="p-6 text-center">
                  <div className="text-4xl font-semibold text-foreground">{s.value}</div>
                  <div className="mt-2 text-sm text-muted">{s.label}</div>
                  {s.onchain && (
                    <div className="mt-1 inline-flex items-center gap-1 text-[10px] font-medium uppercase tracking-wide text-teal">
                      <span className="h-1 w-1 rounded-full bg-teal" /> on-chain
                    </div>
                  )}
                </Card>
              ))}
            </div>
          </div>

          {/* Services + side panel */}
          <div className="mt-10 grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <h2 className="text-xl font-semibold">Services ({agent.services.length})</h2>
              <div className="mt-4 space-y-4">
                {agent.services.map((s) => (
                  <Card key={s.id} className="flex items-center justify-between gap-4 p-5">
                    <div className="min-w-0">
                      <span className="inline-block rounded-md bg-ink-3 px-2 py-0.5 text-xs text-muted ring-1 ring-border">
                        {CATEGORY_LABEL[s.category as CategoryKey]}
                      </span>
                      <div className="mt-2 font-medium text-foreground">{s.title}</div>
                      <div className="text-sm text-muted">
                        from {s.priceUsdc} USDC · {s.deliveryDays}d delivery
                      </div>
                    </div>
                    <HireButton
                      providerHandle={agent.handle}
                      providerAddress={agent.owner.address}
                      serviceId={s.id}
                      serviceTitle={s.title}
                      priceUsdc={s.priceUsdc}
                      deliveryDays={s.deliveryDays}
                    />
                  </Card>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <Card className="p-6">
                <div className="text-xs font-semibold uppercase tracking-wider text-faint">
                  Sub-account stake pool
                </div>
                <div className="mt-2 text-3xl font-semibold text-foreground">
                  ${agent.stakedAmount}
                  <span className="ml-1 text-base font-normal text-muted">staked</span>
                </div>
                <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-ink">
                  <div className="h-full w-1/4 rounded-full bg-gradient-to-r from-mint to-teal" />
                </div>
                <div className="mt-3 flex justify-between text-xs text-muted">
                  <span>${agent.lockedAmount} locked</span>
                  <span>0 active jobs</span>
                </div>
              </Card>

              <Card className="p-6">
                <div className="text-xs font-semibold uppercase tracking-wider text-faint">
                  On-chain identity
                </div>
                <dl className="mt-4 space-y-3 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-muted">Status</dt>
                    <dd className="text-teal">{agent.verified ? "Verified" : "Pending"}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted">Parent</dt>
                    <dd className="text-foreground">@{agent.owner.handle}</dd>
                  </div>
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted">Token ID</dt>
                    <dd className="truncate font-mono text-foreground">
                      {agent.chainTokenId ?? "—(link pending)"}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted">Chain</dt>
                    <dd className="text-foreground">BSC Testnet</dd>
                  </div>
                </dl>
              </Card>
            </div>
          </div>
        </Container>
      </main>
      <Footer />
    </>
  );
}
