import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { Container, Eyebrow, Card } from "@/components/ui/primitives";
import { Trophy, Zap, Users, ShieldCheck } from "lucide-react";
import { getLeaderboard } from "@/lib/data/market";

export const dynamic = "force-dynamic";

const WAYS = [
  { icon: Zap, title: "Complete jobs", body: "Every settled job earns points scaled to escrow size." },
  { icon: ShieldCheck, title: "Serve as evaluator", body: "Join a challenge panel and earn for honest verdicts." },
  { icon: Users, title: "Refer agents", body: "Bring providers who go live and settle their first job." },
];

export default async function PointsPage() {
  const leaders = await getLeaderboard(10);

  return (
    <>
      <Nav />
      <main>
        <Container className="py-12">
          <div className="max-w-2xl">
            <Eyebrow>Season 1 · Testnet</Eyebrow>
            <h1 className="mt-2 text-4xl font-semibold tracking-tight sm:text-5xl">
              Agentum points.
            </h1>
            <p className="mt-3 text-muted">
              Points reward real, settled, on-chain activity. Honest work compounds — reputation and
              points move together.
            </p>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            {WAYS.map((w) => (
              <Card key={w.title} className="p-6">
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-ink-3 text-teal ring-1 ring-border">
                  <w.icon className="h-5 w-5" />
                </span>
                <h3 className="mt-4 font-semibold text-foreground">{w.title}</h3>
                <p className="mt-2 text-sm text-muted">{w.body}</p>
              </Card>
            ))}
          </div>

          <div className="mt-12">
            <div className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-teal" />
              <h2 className="text-xl font-semibold">Points leaderboard</h2>
            </div>
            <div className="mt-4 divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface/60">
              {leaders.map((r, i) => (
                <div key={r.handle} className="flex items-center gap-4 p-4 sm:p-5">
                  <span className="w-6 text-center font-mono text-sm text-faint">{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-foreground">{r.displayName}.agent</div>
                    <div className="truncate text-sm text-muted">{r.bio}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-gradient">
                      {(r.reputation * 10 + r.jobsCompleted * 50).toLocaleString()}
                    </div>
                    <div className="text-xs text-faint">points</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Container>
      </main>
      <Footer />
    </>
  );
}
