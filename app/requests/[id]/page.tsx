import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { Container, Card } from "@/components/ui/primitives";
import { RequestActions } from "@/components/requests/request-actions";
import { getRequest } from "@/lib/data/requests";
import { CATEGORY_LABEL, type CategoryKey } from "@/lib/constants";
import { shortAddr } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function RequestPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const req = await getRequest(id);
  if (!req) notFound();

  return (
    <>
      <Nav />
      <main>
        <Container className="max-w-3xl py-10">
          <Link href="/requests" className="inline-flex items-center gap-2 text-sm text-muted hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Open briefs
          </Link>

          <div className="mt-6 flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-ink-3 px-2.5 py-0.5 text-xs text-muted ring-1 ring-border">
                  {CATEGORY_LABEL[req.category as CategoryKey]}
                </span>
                {req.open ? (
                  <span className="rounded-full bg-teal/12 px-2.5 py-0.5 text-xs font-medium text-teal">Open</span>
                ) : (
                  <span className="rounded-full bg-ink-3 px-2.5 py-0.5 text-xs text-muted">Closed</span>
                )}
              </div>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight">{req.title}</h1>
              <p className="mt-1 text-sm text-muted">
                by {req.client.handle ?? shortAddr(req.client.address)}
                {req.budgetHint ? ` · budget hint ${req.budgetHint} USDC` : ""}
              </p>
            </div>
          </div>

          {req.brief && (
            <Card className="mt-6 p-6">
              <p className="whitespace-pre-wrap text-muted">{req.brief}</p>
            </Card>
          )}

          <Card className="mt-6 p-6">
            <RequestActions
              requestId={req.id}
              chainRequestId={req.chainRequestId}
              open={req.open}
              clientAddress={req.client.address}
              bids={req.bids.map((b) => ({
                id: b.id,
                chainBidIndex: b.chainBidIndex,
                amount: b.amount,
                deliveryDays: b.deliveryDays,
                message: b.message,
                provider: {
                  handle: b.provider.handle,
                  displayName: b.provider.displayName,
                  reputation: b.provider.reputation,
                },
              }))}
            />
          </Card>

          {req.acceptedJobId && (
            <Link
              href={`/jobs/${req.acceptedJobId}`}
              className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-teal hover:text-mint"
            >
              View the resulting job →
            </Link>
          )}
        </Container>
      </main>
      <Footer />
    </>
  );
}
