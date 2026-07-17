import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Download } from "lucide-react";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { Container, Card } from "@/components/ui/primitives";
import { JobActions } from "@/components/job/job-actions";
import { getJob } from "@/lib/data/jobs";
import { prisma } from "@/lib/db";
import { shortAddr } from "@/lib/utils";
import { BSC_TESTNET_EXPLORER } from "@/lib/web3/contracts";

export const dynamic = "force-dynamic";

const STATUS_STYLE: Record<string, string> = {
  ESCROWED: "bg-warn/12 text-warn",
  DELIVERED: "bg-mint/12 text-mint",
  SETTLED: "bg-teal/12 text-teal",
  CHALLENGED: "bg-danger/12 text-danger",
  DISPUTED: "bg-danger/12 text-danger",
  REFUNDED: "bg-ink-3 text-muted",
};

export default async function JobPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const job = await getJob(id);
  if (!job) notFound();

  // provider 的 owner 地址(用于判断当前钱包是否为 provider)
  const provider = await prisma.providerAgent.findUnique({
    where: { id: job.providerId },
    include: { owner: { select: { address: true } } },
  });

  return (
    <>
      <Nav />
      <main>
        <Container className="max-w-3xl py-10">
          <Link href="/scan?tab=jobs" className="inline-flex items-center gap-2 text-sm text-muted hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Job board
          </Link>

          <div className="mt-6 flex items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight">{job.title}</h1>
              <p className="mt-2 text-muted">
                <Link href={`/storefront?handle=${job.provider.handle}`} className="text-teal hover:text-mint">
                  {job.provider.displayName}.agent
                </Link>{" "}
                · client {job.client.handle ?? shortAddr(job.client.address)}
              </p>
            </div>
            <span className={`rounded-full px-3 py-1 text-sm font-medium ${STATUS_STYLE[job.status] ?? "bg-ink-3 text-muted"}`}>
              {job.status}
            </span>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
            <Card className="p-5">
              <div className="text-xs uppercase tracking-wider text-faint">Escrow</div>
              <div className="mt-1 text-2xl font-semibold">${job.amount}</div>
            </Card>
            <Card className="p-5">
              <div className="text-xs uppercase tracking-wider text-faint">Chain job</div>
              <div className="mt-1 text-2xl font-semibold">#{job.chainJobId ?? "—"}</div>
            </Card>
            <Card className="p-5">
              <div className="text-xs uppercase tracking-wider text-faint">Network</div>
              <div className="mt-1 text-lg font-semibold">BSC Testnet</div>
            </Card>
          </div>

          {/* 操作面板 */}
          <Card className="mt-6 p-6">
            <h2 className="mb-4 text-lg font-semibold">Actions</h2>
            <JobActions
              jobId={job.id}
              chainJobId={job.chainJobId}
              status={job.status}
              clientAddress={job.client.address}
              providerOwnerAddress={provider?.owner.address ?? ""}
            />
          </Card>

          {/* 生命周期时间线 */}
          <Card className="mt-6 p-6">
            <h2 className="mb-4 text-lg font-semibold">On-chain lifecycle</h2>
            <ol className="space-y-4">
              {job.events.map((e) => (
                <li key={e.id} className="flex gap-3">
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-teal" />
                  <div className="flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium capitalize text-foreground">{e.kind}</span>
                      {e.txHash && (
                        <a
                          href={`${BSC_TESTNET_EXPLORER}/tx/${e.txHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-mono text-xs text-teal hover:text-mint"
                        >
                          {shortAddr(e.txHash, 10, 8)}
                        </a>
                      )}
                    </div>
                    {e.note && <p className="text-sm text-muted">{e.note}</p>}
                  </div>
                </li>
              ))}
            </ol>
            {job.deliverableHash && (
              <div className="mt-5 space-y-3 border-t border-border pt-4">
                {job.deliverableUrl && (
                  <a
                    href={job.deliverableUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-full bg-ink-3 px-4 py-2 text-sm font-medium text-foreground ring-1 ring-border hover:ring-border-strong"
                  >
                    <Download className="h-4 w-4" /> Download deliverable
                  </a>
                )}
                <div>
                  <div className="text-xs uppercase tracking-wider text-faint">
                    Deliverable content hash (locked on-chain)
                  </div>
                  <div className="mt-1 truncate font-mono text-sm text-foreground">{job.deliverableHash}</div>
                  {job.deliverableUrl && (
                    <p className="mt-1 text-xs text-faint">
                      keccak256 of the uploaded file — verify the download matches this hash before settling.
                    </p>
                  )}
                </div>
              </div>
            )}
          </Card>
        </Container>
      </main>
      <Footer />
    </>
  );
}
