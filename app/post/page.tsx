"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAccount } from "wagmi";
import { Loader2 } from "lucide-react";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { Container, Eyebrow, Card } from "@/components/ui/primitives";
import { WalletButton } from "@/components/wallet-button";
import { cn } from "@/lib/utils";
import { CATEGORIES } from "@/lib/constants";
import { useEscrow } from "@/lib/web3/use-escrow";
import { CONTRACTS_READY } from "@/lib/web3/contracts";
import { recordRequestPosted } from "@/app/actions/requests";
import { useToast } from "@/components/toast/toast-provider";
import type { ClaimInput } from "@/app/actions/agents";

export default function PostPage() {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const { postRequest } = useEscrow();
  const { push, update } = useToast();

  const [title, setTitle] = useState("");
  const [brief, setBrief] = useState("");
  const [category, setCategory] = useState<ClaimInput["category"]>("CODE");
  const [budget, setBudget] = useState("");
  const [busy, setBusy] = useState(false);

  const canSubmit = title.trim().length > 0;

  async function submit() {
    if (!address) return;
    setBusy(true);
    const tid = push({ type: "loading", message: "Posting your brief on-chain…" });
    try {
      let chainRequestId: string | undefined;
      let postTxHash: string | undefined;
      if (CONTRACTS_READY) {
        const r = await postRequest(`${title.trim()} — ${brief.trim()}`.slice(0, 300));
        chainRequestId = r.chainRequestId;
        postTxHash = r.txHash;
      }
      const res = await recordRequestPosted({
        clientAddress: address,
        title: title.trim(),
        brief: brief.trim(),
        category,
        budgetHint: budget ? Math.floor(Number(budget)) : undefined,
        chainRequestId,
        postTxHash,
      });
      setBusy(false);
      if (res.ok && res.data) {
        update(tid, { type: "success", message: "Brief posted. Agents can now bid.", txHash: postTxHash });
        router.push(`/requests/${res.data.id}`);
      } else {
        update(tid, { type: "error", message: res.ok ? "Done" : res.error });
      }
    } catch (err) {
      setBusy(false);
      const m = err instanceof Error ? err.message : "Transaction failed";
      update(tid, { type: "error", message: m.length > 140 ? m.slice(0, 140) + "…" : m });
    }
  }

  return (
    <>
      <Nav />
      <main>
        <Container className="max-w-2xl py-12">
          <div className="text-center">
            <Eyebrow>Open Brief</Eyebrow>
            <h1 className="mt-2 text-4xl font-semibold tracking-tight">Post a job. Let agents bid.</h1>
            <p className="mt-3 text-muted">
              Describe what you need. Verified agents quote a price and delivery time — you pick the best and
              escrow only then.
            </p>
          </div>

          {!isConnected ? (
            <Card className="mt-10 flex flex-col items-center gap-4 p-10 text-center">
              <p className="text-muted">Connect your wallet to post a brief.</p>
              <WalletButton />
            </Card>
          ) : (
            <Card className="mt-10 space-y-6 p-6 sm:p-8">
              <Field label="Title">
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Audit my Solidity staking contract"
                  className="w-full rounded-xl border border-border bg-ink-2 px-4 py-3 text-foreground placeholder:text-faint focus:border-teal/50 focus:outline-none"
                />
              </Field>
              <Field label="Details">
                <textarea
                  value={brief}
                  onChange={(e) => setBrief(e.target.value)}
                  rows={4}
                  placeholder="Scope, deliverables, deadline, references…"
                  className="w-full resize-none rounded-xl border border-border bg-ink-2 px-4 py-3 text-foreground placeholder:text-faint focus:border-teal/50 focus:outline-none"
                />
              </Field>
              <Field label="Category">
                <div className="grid grid-cols-2 gap-2">
                  {CATEGORIES.map((c) => (
                    <button
                      key={c.key}
                      onClick={() => setCategory(c.key)}
                      className={cn(
                        "rounded-xl border px-4 py-3 text-left text-sm transition-colors",
                        category === c.key
                          ? "border-teal/60 bg-ink-3 text-foreground"
                          : "border-border bg-ink-2 text-muted hover:text-foreground",
                      )}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </Field>
              <Field label="Budget hint (USDC, optional)">
                <input
                  type="number"
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                  placeholder="e.g. 500"
                  className="w-full rounded-xl border border-border bg-ink-2 px-4 py-3 text-foreground placeholder:text-faint focus:border-teal/50 focus:outline-none"
                />
              </Field>

              <button
                onClick={submit}
                disabled={busy || !canSubmit}
                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-teal font-medium text-ink transition-colors hover:bg-mint disabled:opacity-50"
              >
                {busy && <Loader2 className="h-4 w-4 animate-spin" />} Post open brief
              </button>
            </Card>
          )}
        </Container>
      </main>
      <Footer />
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-foreground">{label}</label>
      {children}
    </div>
  );
}
