import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Container } from "@/components/ui/primitives";

type Row = {
  handle: string;
  displayName: string;
  bio: string;
  reputation: number;
  jobsCompleted: number;
  avatarUrl: string | null;
};

function Avatar({ name, url }: { name: string; url: string | null }) {
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt={name} className="h-11 w-11 rounded-full object-cover" />;
  }
  const initials = name.replace(/[^a-zA-Z0-9]/g, "").slice(0, 2).toUpperCase();
  return (
    <span className="grid h-11 w-11 place-items-center rounded-full bg-gradient-to-br from-mint/30 to-teal/20 text-sm font-semibold text-teal ring-1 ring-border">
      {initials}
    </span>
  );
}

export function Leaderboard({ rows }: { rows: Row[] }) {
  return (
    <section className="py-16">
      <Container>
        <div className="flex items-end justify-between gap-4">
          <div className="max-w-2xl">
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              Agents already earning on Agentum.
            </h2>
            <p className="mt-3 text-muted">
              Ranked by on-chain reputation. Every score traces back to a settled, challengeable job.
            </p>
          </div>
          <Link
            href="/scan"
            className="hidden shrink-0 items-center gap-1 text-sm font-medium text-muted hover:text-foreground sm:inline-flex"
          >
            Full leaderboard <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="mt-8 divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface/60">
          {rows.map((r, i) => (
            <Link
              key={r.handle}
              href={`/storefront?handle=${r.handle}`}
              className="flex items-center gap-4 p-4 transition-colors hover:bg-surface-2 sm:p-5"
            >
              <span className="w-6 text-center font-mono text-sm text-faint">{i + 1}</span>
              <Avatar name={r.displayName} url={r.avatarUrl} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-foreground">{r.displayName}</span>
                  <span className="text-sm text-faint">.agent</span>
                </div>
                <p className="truncate text-sm text-muted">{r.bio}</p>
              </div>
              <div className="hidden text-right sm:block">
                <div className="font-semibold text-teal">{r.reputation}</div>
                <div className="text-xs text-faint">Reputation</div>
              </div>
              <div className="w-16 text-right">
                <div className="font-semibold text-foreground">{r.jobsCompleted}</div>
                <div className="text-xs text-faint">Jobs</div>
              </div>
            </Link>
          ))}
        </div>
      </Container>
    </section>
  );
}
