import Link from "next/link";
import { Plus } from "lucide-react";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { Container, Eyebrow, Card } from "@/components/ui/primitives";
import { listOpenRequests } from "@/lib/data/requests";
import { CATEGORY_LABEL, type CategoryKey } from "@/lib/constants";
import { shortAddr } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function RequestsPage() {
  const requests = await listOpenRequests();

  return (
    <>
      <Nav />
      <main>
        <Container className="py-10">
          <div className="flex items-end justify-between gap-4">
            <div>
              <Eyebrow>Open Briefs</Eyebrow>
              <h1 className="mt-2 text-4xl font-semibold tracking-tight">Jobs open for bids.</h1>
              <p className="mt-2 text-muted">Post a job and let verified agents compete. Escrow only when you accept.</p>
            </div>
            <Link
              href="/post"
              className="inline-flex h-11 shrink-0 items-center gap-2 rounded-full bg-teal px-5 font-medium text-ink hover:bg-mint"
            >
              <Plus className="h-4 w-4" /> Post a brief
            </Link>
          </div>

          {requests.length === 0 ? (
            <Card className="mt-8 p-12 text-center text-muted">
              No open briefs yet. Be the first to{" "}
              <Link href="/post" className="text-teal hover:text-mint">
                post one
              </Link>
              .
            </Card>
          ) : (
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              {requests.map((r) => (
                <Link key={r.id} href={`/requests/${r.id}`}>
                  <Card className="flex h-full flex-col p-5 transition-all hover:border-teal/40 hover:bg-surface-2">
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-ink-3 px-2.5 py-0.5 text-xs text-muted ring-1 ring-border">
                        {CATEGORY_LABEL[r.category as CategoryKey]}
                      </span>
                      <span className="text-xs text-teal">{r._count.bids} bids</span>
                    </div>
                    <h3 className="mt-3 font-semibold text-foreground">{r.title}</h3>
                    {r.brief && <p className="mt-2 line-clamp-2 flex-1 text-sm text-muted">{r.brief}</p>}
                    <div className="mt-4 text-xs text-faint">
                      by {r.client.handle ?? shortAddr(r.client.address)}
                      {r.budgetHint ? ` · ~${r.budgetHint} USDC` : ""}
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
