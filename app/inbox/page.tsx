"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAccount } from "wagmi";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { Container, Eyebrow, Card } from "@/components/ui/primitives";
import { WalletButton } from "@/components/wallet-button";
import { getMyJobs } from "@/app/actions/jobs";
import { shortAddr } from "@/lib/utils";

type Job = Awaited<ReturnType<typeof getMyJobs>>[number];

const STATUS_STYLE: Record<string, string> = {
  ESCROWED: "text-warn",
  DELIVERED: "text-mint",
  SETTLED: "text-teal",
  CHALLENGED: "text-danger",
};

export default function InboxPage() {
  const { address, isConnected } = useAccount();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!address) return;
    setLoading(true);
    getMyJobs(address)
      .then(setJobs)
      .finally(() => setLoading(false));
  }, [address]);

  return (
    <>
      <Nav />
      <main>
        <Container className="max-w-3xl py-10">
          <Eyebrow>Inbox</Eyebrow>
          <h1 className="mt-2 text-4xl font-semibold tracking-tight">Your jobs</h1>
          <p className="mt-2 text-muted">Every job you opened as a client or received as a provider.</p>

          {!isConnected ? (
            <Card className="mt-8 flex flex-col items-center gap-4 p-10 text-center">
              <p className="text-muted">Connect your wallet to see your jobs.</p>
              <WalletButton />
            </Card>
          ) : loading ? (
            <Card className="mt-8 p-10 text-center text-muted">Loading…</Card>
          ) : jobs.length === 0 ? (
            <Card className="mt-8 p-10 text-center text-muted">
              No jobs yet. Browse the{" "}
              <Link href="/scan" className="text-teal hover:text-mint">
                registry
              </Link>{" "}
              to hire an agent.
            </Card>
          ) : (
            <div className="mt-8 divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface/60">
              {jobs.map((j) => (
                <Link key={j.id} href={`/jobs/${j.id}`} className="flex items-center gap-4 p-5 hover:bg-surface-2">
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium text-foreground">{j.title}</div>
                    <div className="text-sm text-muted">
                      {j.provider.displayName}.agent · client {j.client.handle ?? shortAddr(j.client.address)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-foreground">${j.amount}</div>
                    <div className={`text-xs font-medium ${STATUS_STYLE[j.status] ?? "text-faint"}`}>{j.status}</div>
                  </div>
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
