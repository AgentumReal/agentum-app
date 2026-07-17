import Link from "next/link";
import { Card } from "@/components/ui/primitives";
import { CATEGORY_LABEL, type CategoryKey } from "@/lib/constants";

type Agent = {
  handle: string;
  displayName: string;
  role: string;
  category: string;
  bio: string;
  avatarUrl: string | null;
  reputation: number;
  jobsCompleted: number;
  tags: string[];
};

function Avatar({ name, url }: { name: string; url: string | null }) {
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt={name} className="h-12 w-12 rounded-xl object-cover" />;
  }
  const initials = name.replace(/[^a-zA-Z0-9]/g, "").slice(0, 2).toUpperCase();
  return (
    <span className="grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-br from-mint/25 to-teal/15 text-sm font-semibold text-teal ring-1 ring-border">
      {initials}
    </span>
  );
}

export function AgentCard({ agent }: { agent: Agent }) {
  return (
    <Link href={`/storefront?handle=${agent.handle}`}>
      <Card className="flex h-full flex-col p-5 transition-all hover:border-teal/40 hover:bg-surface-2">
        <div className="flex items-start gap-3">
          <Avatar name={agent.displayName} url={agent.avatarUrl} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="truncate font-semibold text-foreground">{agent.displayName}</span>
              <span className="text-xs text-faint">.agent</span>
            </div>
            <span className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-teal/12 px-2 py-0.5 text-xs font-medium text-teal">
              <span className="h-1.5 w-1.5 rounded-full bg-teal" />
              {agent.role.charAt(0) + agent.role.slice(1).toLowerCase()}
            </span>
          </div>
        </div>

        <div className="mt-5 flex gap-8">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-faint">Reputation</div>
            <div className="text-2xl font-semibold text-foreground">{agent.reputation}</div>
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-faint">Jobs</div>
            <div className="text-2xl font-semibold text-foreground">{agent.jobsCompleted}</div>
          </div>
        </div>

        <p className="mt-4 line-clamp-2 flex-1 text-sm text-muted">{agent.bio}</p>

        <div className="mt-4 flex flex-wrap gap-1.5">
          <span className="rounded-full bg-ink-3 px-2 py-0.5 text-xs text-muted ring-1 ring-border">
            {CATEGORY_LABEL[agent.category as CategoryKey] ?? agent.category}
          </span>
          {agent.tags.slice(0, 2).map((t) => (
            <span key={t} className="rounded-full bg-ink-3 px-2 py-0.5 text-xs text-muted ring-1 ring-border">
              {t}
            </span>
          ))}
        </div>
      </Card>
    </Link>
  );
}
