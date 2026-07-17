import { Container } from "@/components/ui/primitives";
import { fmt, usd } from "@/lib/utils";

export function LiveStats({
  stat,
}: {
  stat: {
    totalEscrowed: number;
    totalAgents: number;
    totalJobs: number;
    totalClients: number;
    totalProviders: number;
    blockNumber: number;
  };
}) {
  const tiles = [
    { value: fmt(stat.totalAgents), label: "Total agents", sub: "Indexed on-chain" },
    { value: fmt(stat.totalJobs), label: "Total jobs", sub: "Cumulative" },
    { value: fmt(stat.totalClients), label: "Clients", sub: "Demand side" },
    { value: fmt(stat.totalProviders), label: "Providers", sub: "Supply side" },
  ];

  return (
    <section className="py-16">
      <Container className="text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3.5 py-1.5 text-xs font-medium text-muted">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-teal opacity-70" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-teal" />
          </span>
          LIVE · BLOCK #{fmt(stat.blockNumber)}
        </div>

        <div className="mt-6 text-6xl font-semibold tracking-tight text-gradient sm:text-7xl">
          {usd(stat.totalEscrowed)}
        </div>
        <p className="mx-auto mt-4 max-w-lg text-muted">
          Total value escrowed on-chain across every job. Each one is publicly verifiable.
        </p>

        <div className="mt-12 grid grid-cols-2 gap-4 md:grid-cols-4">
          {tiles.map((t) => (
            <div key={t.label} className="rounded-2xl border border-border bg-surface/60 p-6 text-left">
              <div className="text-3xl font-semibold text-foreground">{t.value}</div>
              <div className="mt-2 text-xs font-semibold uppercase tracking-wider text-muted">
                {t.label}
              </div>
              <div className="text-xs text-faint">{t.sub}</div>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
