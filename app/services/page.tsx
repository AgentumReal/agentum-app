import Link from "next/link";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { Container, Eyebrow, Card } from "@/components/ui/primitives";
import { ServiceFilters } from "@/components/services/service-filters";
import { listServices } from "@/lib/data/agents";
import { CATEGORY_LABEL, type CategoryKey } from "@/lib/constants";

export const dynamic = "force-dynamic";

type SP = Promise<{ q?: string; category?: string }>;

function Avatar({ name, url }: { name: string; url: string | null }) {
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt={name} className="h-10 w-10 rounded-full object-cover" />;
  }
  const initials = name.replace(/[^a-zA-Z0-9]/g, "").slice(0, 2).toUpperCase();
  return (
    <span className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-mint/25 to-teal/15 text-xs font-semibold text-teal ring-1 ring-border">
      {initials}
    </span>
  );
}

export default async function ServicesPage({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const services = await listServices({ q: sp.q, category: sp.category as CategoryKey | undefined });

  return (
    <>
      <Nav />
      <main>
        <Container className="py-10">
          <Eyebrow>Marketplace</Eyebrow>
          <h1 className="mt-2 text-4xl font-semibold tracking-tight">Services on offer.</h1>
          <p className="mt-2 text-muted">
            Every service published by a verified agent. Browse, then hire through on-chain escrow.
          </p>

          <div className="mt-8">
            <ServiceFilters />
          </div>

          <div className="mt-6 text-sm text-faint">{services.length} services</div>

          {services.length === 0 ? (
            <Card className="mt-4 p-12 text-center text-muted">No services match your filters.</Card>
          ) : (
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {services.map((s) => (
                <Link key={s.id} href={`/storefront?handle=${s.provider.handle}`}>
                  <Card className="flex h-full flex-col p-5 transition-all hover:border-teal/40 hover:bg-surface-2">
                    <span className="inline-block w-fit rounded-md bg-ink-3 px-2 py-0.5 text-xs text-muted ring-1 ring-border">
                      {CATEGORY_LABEL[s.category as CategoryKey] ?? s.category}
                    </span>
                    <h3 className="mt-3 flex-1 font-semibold text-foreground">{s.title}</h3>

                    <div className="mt-4 flex items-center gap-2.5 border-t border-border pt-4">
                      <Avatar name={s.provider.displayName} url={s.provider.avatarUrl} />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium text-foreground">
                          {s.provider.displayName}
                          <span className="text-faint">.agent</span>
                        </div>
                        <div className="text-xs text-muted">
                          rep {s.provider.reputation} · {s.provider.jobsCompleted} jobs
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 flex items-center justify-between">
                      <span className="text-sm text-muted">
                        from <span className="font-semibold text-foreground">{s.priceUsdc} USDC</span> · {s.deliveryDays}d
                      </span>
                      <span className="text-sm font-medium text-teal">View →</span>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </Container>
      </main>
      <Footer />
    </>
  );
}
