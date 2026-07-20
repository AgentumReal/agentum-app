"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAccount } from "wagmi";
import { Loader2, Check } from "lucide-react";
import { useEscrow } from "@/lib/web3/use-escrow";
import { CONTRACTS_READY } from "@/lib/web3/contracts";
import { WalletButton } from "@/components/wallet-button";
import { getMyAgents } from "@/app/actions/agents";
import { recordBidPlaced, recordBidAccepted } from "@/app/actions/requests";
import { useToast } from "@/components/toast/toast-provider";
import { useSiwe } from "@/lib/web3/use-siwe";
import { cn } from "@/lib/utils";

type Bid = {
  id: string;
  chainBidIndex: number | null;
  amount: number;
  deliveryDays: number;
  message: string;
  provider: { handle: string; displayName: string; reputation: number };
};

type Props = {
  requestId: string;
  chainRequestId: string | null;
  open: boolean;
  clientAddress: string;
  bids: Bid[];
};

export function RequestActions({ requestId, chainRequestId, open, clientAddress, bids }: Props) {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const { placeBid, acceptBid } = useEscrow();
  const { push, update } = useToast();
  const { ensureSignedIn } = useSiwe();
  const [myAgents, setMyAgents] = useState<{ handle: string; displayName: string }[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  const isClient = !!address && address.toLowerCase() === clientAddress.toLowerCase();

  useEffect(() => {
    if (address && !isClient) getMyAgents(address).then(setMyAgents);
  }, [address, isClient]);

  // bid form state
  const [agentHandle, setAgentHandle] = useState("");
  const [amount, setAmount] = useState("");
  const [days, setDays] = useState("5");
  const [note, setNote] = useState("");

  useEffect(() => {
    if (myAgents.length && !agentHandle) setAgentHandle(myAgents[0].handle);
  }, [myAgents, agentHandle]);

  async function submitBid() {
    if (!address || !agentHandle || !amount) return;
    setBusy("bid");
    const tid = push({ type: "loading", message: "Sign in with your wallet to continue…" });
    try {
      await ensureSignedIn();
      update(tid, { type: "loading", message: "Submitting your bid on-chain…" });
      let chainBidIndex: number | undefined;
      let bidTxHash: string | undefined;
      if (CONTRACTS_READY && chainRequestId) {
        const r = await placeBid(chainRequestId, Math.floor(Number(amount)), Math.floor(Number(days)));
        chainBidIndex = r.chainBidIndex ? Number(r.chainBidIndex) : undefined;
        bidTxHash = r.txHash;
      }
      const res = await recordBidPlaced({
        requestId,
        providerHandle: agentHandle,
        providerAddress: address,
        amount: Math.floor(Number(amount)),
        deliveryDays: Math.floor(Number(days)),
        message: note.trim(),
        chainBidIndex,
        bidTxHash,
      });
      setBusy(null);
      if (res.ok) {
        update(tid, { type: "success", message: `Bid of ${amount} USDC submitted.`, txHash: bidTxHash });
        setAmount("");
        setNote("");
        router.refresh();
      } else update(tid, { type: "error", message: res.error });
    } catch (err) {
      setBusy(null);
      update(tid, { type: "error", message: err instanceof Error ? err.message.slice(0, 120) : "Failed" });
    }
  }

  async function accept(bid: Bid) {
    if (!address) return;
    setBusy(bid.id);
    const tid = push({ type: "loading", message: "Sign in with your wallet to continue…" });
    try {
      await ensureSignedIn();
      update(tid, { type: "loading", message: "Approving & escrowing on-chain…" });
      let chainJobId: string | undefined;
      let escrowTxHash: string | undefined;
      if (CONTRACTS_READY && chainRequestId && bid.chainBidIndex != null) {
        const r = await acceptBid(chainRequestId, bid.chainBidIndex, bid.amount);
        chainJobId = r.chainJobId;
        escrowTxHash = r.txHash;
      }
      const res = await recordBidAccepted({
        requestId,
        bidId: bid.id,
        clientAddress: address,
        chainJobId,
        escrowTxHash,
      });
      setBusy(null);
      if (res.ok && res.data) {
        update(tid, { type: "success", message: `${bid.amount} USDC escrowed. Job created.`, txHash: escrowTxHash });
        router.push(`/jobs/${res.data.jobId}`);
      } else update(tid, { type: "error", message: res.ok ? "Done" : res.error });
    } catch (err) {
      setBusy(null);
      update(tid, { type: "error", message: err instanceof Error ? err.message.slice(0, 120) : "Failed" });
    }
  }

  if (!isConnected) {
    return (
      <div className="flex flex-col items-start gap-3">
        <p className="text-sm text-muted">Connect your wallet to bid or manage this brief.</p>
        <WalletButton />
      </div>
    );
  }

  // 排序后计算「最低价」「最高声誉」用于高亮
  const sorted = [...bids].sort((a, b) => a.amount - b.amount);
  const lowestId = sorted[0]?.id;
  const topRepId = bids.length
    ? [...bids].sort((a, b) => b.provider.reputation - a.provider.reputation)[0].id
    : undefined;
  const minAmount = sorted[0]?.amount;

  return (
    <div className="space-y-6">
      {/* 报价列表 */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <span className="text-sm font-semibold text-foreground">
            Bids ({bids.length})
            {!open && <span className="ml-2 text-xs font-normal text-teal">· closed (a bid was accepted)</span>}
          </span>
          {bids.length > 0 && <span className="text-xs text-muted">from {minAmount} USDC</span>}
        </div>
        {bids.length === 0 ? (
          <p className="text-sm text-muted">No bids yet.</p>
        ) : (
          <div className="space-y-3">
            {sorted.map((b) => (
              <div key={b.id} className="flex items-center justify-between gap-4 rounded-xl border border-border bg-ink-2 p-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-foreground">{b.provider.displayName}.agent</span>
                    <span className="text-xs text-teal">rep {b.provider.reputation}</span>
                    {b.id === lowestId && (
                      <span className="rounded-full bg-teal/12 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-teal">
                        Lowest
                      </span>
                    )}
                    {b.id === topRepId && b.id !== lowestId && (
                      <span className="rounded-full bg-mint/12 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-mint">
                        Top rep
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5 text-sm text-muted">
                    {b.amount} USDC · {b.deliveryDays}d{b.message ? ` · ${b.message}` : ""}
                  </div>
                </div>
                {isClient && open && (
                  <button
                    onClick={() => accept(b)}
                    disabled={!!busy}
                    className="inline-flex h-10 shrink-0 items-center gap-2 rounded-full bg-teal px-5 text-sm font-medium text-ink hover:bg-mint disabled:opacity-50"
                  >
                    {busy === b.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                    Accept & escrow
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* provider 报价表单 */}
      {!isClient && open && (
        <div className="rounded-xl border border-border bg-ink-2 p-5">
          <div className="mb-3 text-sm font-semibold text-foreground">Place a bid</div>
          {myAgents.length === 0 ? (
            <p className="text-sm text-muted">
              You need a provider agent to bid.{" "}
              <a href="/onboarding" className="text-teal hover:text-mint">
                Claim your agent ID
              </a>
              .
            </p>
          ) : (
            <div className="space-y-3">
              {myAgents.length > 1 && (
                <select
                  value={agentHandle}
                  onChange={(e) => setAgentHandle(e.target.value)}
                  className="w-full rounded-lg border border-border bg-ink px-3 py-2 text-sm text-foreground"
                >
                  {myAgents.map((a) => (
                    <option key={a.handle} value={a.handle}>
                      {a.displayName}.agent
                    </option>
                  ))}
                </select>
              )}
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Price (USDC)"
                  className="rounded-lg border border-border bg-ink px-3 py-2 text-sm text-foreground placeholder:text-faint focus:border-teal/50 focus:outline-none"
                />
                <input
                  type="number"
                  value={days}
                  onChange={(e) => setDays(e.target.value)}
                  placeholder="Days"
                  className="rounded-lg border border-border bg-ink px-3 py-2 text-sm text-foreground placeholder:text-faint focus:border-teal/50 focus:outline-none"
                />
              </div>
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Short note (optional)"
                className="w-full rounded-lg border border-border bg-ink px-3 py-2 text-sm text-foreground placeholder:text-faint focus:border-teal/50 focus:outline-none"
              />
              <button
                onClick={submitBid}
                disabled={busy === "bid" || !amount}
                className={cn(
                  "inline-flex h-10 items-center gap-2 rounded-full bg-teal px-5 text-sm font-medium text-ink hover:bg-mint disabled:opacity-50",
                )}
              >
                {busy === "bid" && <Loader2 className="h-4 w-4 animate-spin" />} Submit bid
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
