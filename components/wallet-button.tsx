"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { cn } from "@/lib/utils";

export function WalletButton({ compact = false }: { compact?: boolean }) {
  return (
    <ConnectButton.Custom>
      {({ account, chain, openAccountModal, openChainModal, openConnectModal, mounted }) => {
        const ready = mounted;
        const connected = ready && account && chain;
        const btn =
          "inline-flex h-10 items-center justify-center gap-2 rounded-full px-4 text-sm font-medium transition-all";
        return (
          <div
            {...(!ready && { "aria-hidden": true, style: { opacity: 0, pointerEvents: "none" } })}
          >
            {(() => {
              if (!connected) {
                return (
                  <button
                    onClick={openConnectModal}
                    className={cn(btn, "bg-teal text-ink hover:bg-mint glow-mint")}
                  >
                    Connect wallet
                  </button>
                );
              }
              if (chain.unsupported) {
                return (
                  <button onClick={openChainModal} className={cn(btn, "bg-danger/90 text-ink")}>
                    Wrong network
                  </button>
                );
              }
              return (
                <div className="flex items-center gap-2">
                  {!compact && (
                    <button
                      onClick={openChainModal}
                      className={cn(btn, "bg-ink-3 text-foreground ring-1 ring-border")}
                    >
                      <span className="h-2 w-2 rounded-full bg-teal" />
                      {chain.name}
                    </button>
                  )}
                  <button
                    onClick={openAccountModal}
                    className={cn(btn, "bg-ink-3 text-foreground ring-1 ring-border hover:ring-border-strong")}
                  >
                    {account.displayName}
                  </button>
                </div>
              );
            })()}
          </div>
        );
      }}
    </ConnectButton.Custom>
  );
}
