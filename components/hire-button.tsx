"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAccount } from "wagmi";
import { Loader2 } from "lucide-react";
import { useEscrow } from "@/lib/web3/use-escrow";
import { CONTRACTS_READY } from "@/lib/web3/contracts";
import { recordJobOpened } from "@/app/actions/jobs";
import { useToast } from "@/components/toast/toast-provider";

export function HireButton({
  providerHandle,
  providerAddress,
  serviceId,
  serviceTitle,
  priceUsdc,
  deliveryDays,
}: {
  providerHandle: string;
  providerAddress: string;
  serviceId: string;
  serviceTitle: string;
  priceUsdc: number;
  deliveryDays: number;
}) {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const { openJob } = useEscrow();
  const { push, update } = useToast();
  const [busy, setBusy] = useState(false);

  async function hire() {
    if (!isConnected || !address) {
      push({ type: "error", message: "Connect your wallet first." });
      return;
    }
    setBusy(true);
    const tid = push({ type: "loading", message: "Approving & escrowing USDT on-chain…" });
    try {
      let chainJobId: string | undefined;
      let escrowTxHash: string | undefined;

      if (CONTRACTS_READY) {
        const r = await openJob(providerAddress as `0x${string}`, priceUsdc, deliveryDays);
        chainJobId = r.chainJobId;
        escrowTxHash = r.txHash;
      }

      update(tid, { type: "loading", message: "Recording job…", txHash: escrowTxHash });
      const res = await recordJobOpened({
        clientAddress: address,
        providerHandle,
        serviceId,
        title: serviceTitle,
        amount: priceUsdc,
        chainJobId,
        escrowTxHash,
      });
      setBusy(false);
      if (res.ok && res.data) {
        update(tid, { type: "success", message: `${priceUsdc} USDC escrowed. Job opened.`, txHash: escrowTxHash });
        router.push(`/jobs/${res.data.id}`);
      } else {
        update(tid, { type: "error", message: res.ok ? "Done" : res.error });
      }
    } catch (err) {
      setBusy(false);
      const m = err instanceof Error ? err.message : "Transaction failed";
      update(tid, { type: "error", message: m.length > 120 ? m.slice(0, 120) + "…" : m });
    }
  }

  return (
    <button
      onClick={hire}
      disabled={busy}
      className="inline-flex h-10 shrink-0 items-center gap-2 rounded-full bg-teal px-5 text-sm font-medium text-ink transition-colors hover:bg-mint disabled:opacity-60"
    >
      {busy && <Loader2 className="h-4 w-4 animate-spin" />}
      Hire · {priceUsdc} USDC
    </button>
  );
}
