"use client";

import { useState } from "react";
import { useAccount, useSwitchChain } from "wagmi";
import { bscTestnet } from "wagmi/chains";
import { Droplet, Loader2, ExternalLink, AlertTriangle } from "lucide-react";
import { useEscrow } from "@/lib/web3/use-escrow";
import { CONTRACTS_READY } from "@/lib/web3/contracts";
import { useToast } from "@/components/toast/toast-provider";

export function TestnetBar() {
  const { isConnected, chainId } = useAccount();
  const { switchChain, isPending: switching } = useSwitchChain();
  const { faucet } = useEscrow();
  const { push, update } = useToast();
  const [busy, setBusy] = useState(false);

  const wrongNetwork = isConnected && chainId !== bscTestnet.id;

  async function getUsdt() {
    setBusy(true);
    const tid = push({ type: "loading", message: "Requesting test USDT from faucet…" });
    try {
      const tx = await faucet();
      update(tid, { type: "success", message: "+1000 test USDT received.", txHash: tx });
    } catch (err) {
      const m = err instanceof Error ? err.message : "Failed";
      update(tid, {
        type: "error",
        message: /cooldown/i.test(m) ? "Faucet cooldown — try again in an hour." : "Faucet request failed.",
      });
    } finally {
      setBusy(false);
    }
  }

  // 错网时:整条变成醒目切链提示
  if (wrongNetwork) {
    return (
      <div className="border-b border-warn/30 bg-warn/10">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-x-3 gap-y-1 px-5 py-1.5 text-xs sm:px-6">
          <span className="inline-flex items-center gap-1.5 font-medium text-warn">
            <AlertTriangle className="h-3.5 w-3.5" />
            Wrong network — Agentum runs on BSC Testnet
          </span>
          <button
            onClick={() => switchChain({ chainId: bscTestnet.id })}
            disabled={switching}
            className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-warn px-3 py-1 font-semibold text-ink hover:opacity-90 disabled:opacity-50"
          >
            {switching && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Switch to BSC Testnet
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="border-b border-border bg-ink-2/60">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-x-4 gap-y-1 px-5 py-1.5 text-xs sm:px-6">
        <span className="inline-flex items-center gap-1.5 font-medium text-teal">
          <span className="h-1.5 w-1.5 rounded-full bg-teal" />
          BSC Testnet
        </span>
        <span className="text-faint">Contracts live · no real funds</span>

        <div className="ml-auto flex items-center gap-4">
          {isConnected && CONTRACTS_READY && (
            <button
              onClick={getUsdt}
              disabled={busy}
              className="inline-flex items-center gap-1.5 font-medium text-mint hover:text-teal disabled:opacity-50"
            >
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Droplet className="h-3.5 w-3.5" />}
              Get test USDT
            </button>
          )}
          <a
            href="https://www.bnbchain.org/en/testnet-faucet"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-muted hover:text-foreground"
          >
            Get tBNB <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>
    </div>
  );
}
