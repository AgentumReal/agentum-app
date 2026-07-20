"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAccount } from "wagmi";
import { keccak256 } from "viem";
import { Loader2, Upload, Paperclip } from "lucide-react";
import { useEscrow } from "@/lib/web3/use-escrow";
import { CONTRACTS_READY } from "@/lib/web3/contracts";
import { recordJobDelivered, recordJobSettled, recordJobChallenged } from "@/app/actions/jobs";
import { useToast } from "@/components/toast/toast-provider";
import { useSiwe } from "@/lib/web3/use-siwe";
import { uploadFile } from "@/lib/upload";

type Props = {
  jobId: string;
  chainJobId: string | null;
  status: string;
  clientAddress: string;
  providerOwnerAddress: string;
};

export function JobActions({ jobId, chainJobId, status, clientAddress, providerOwnerAddress }: Props) {
  const router = useRouter();
  const { address } = useAccount();
  const { deliver, settle, challenge } = useEscrow();
  const { push, update } = useToast();
  const { ensureSignedIn } = useSiwe();
  const [busy, setBusy] = useState(false);
  const [deliverFile, setDeliverFile] = useState<File | null>(null);

  const me = address?.toLowerCase();
  const isClient = me === clientAddress.toLowerCase();
  const isProvider = me === providerOwnerAddress.toLowerCase();

  async function run(loadingMsg: string, doneMsg: string, fn: () => Promise<string | undefined>) {
    setBusy(true);
    const tid = push({ type: "loading", message: loadingMsg });
    try {
      await ensureSignedIn();
      const txHash = await fn();
      update(tid, { type: "success", message: doneMsg, txHash });
      router.refresh();
    } catch (err) {
      const m = err instanceof Error ? err.message : "Transaction failed";
      update(tid, { type: "error", message: m.length > 120 ? m.slice(0, 120) + "…" : m });
    } finally {
      setBusy(false);
    }
  }

  const onDeliver = () => {
    if (!deliverFile) {
      push({ type: "error", message: "Attach your deliverable file first." });
      return;
    }
    run("Uploading & locking deliverable on-chain…", "Deliverable submitted. Awaiting client review.", async () => {
      // 真实内容哈希:keccak256(文件字节),链上锁定,client 可下载比对
      const bytes = new Uint8Array(await deliverFile.arrayBuffer());
      const hash = keccak256(bytes);
      const uploaded = await uploadFile(deliverFile);

      let txHash: string | undefined;
      if (CONTRACTS_READY && chainJobId) {
        txHash = (await deliver(chainJobId, hash)).txHash;
      }
      await recordJobDelivered({
        jobId,
        actorAddress: address!,
        txHash,
        deliverableHash: hash,
        deliverableUrl: uploaded.url,
      });
      return txHash;
    });
  };

  const onSettle = () =>
    run("Releasing escrow to provider…", "Settled. Payment released on-chain.", async () => {
      let txHash: string | undefined;
      if (CONTRACTS_READY && chainJobId) txHash = (await settle(chainJobId)).txHash;
      await recordJobSettled({ jobId, actorAddress: address!, txHash });
      return txHash;
    });

  const onChallenge = () =>
    run("Opening a challenge…", "Challenge opened. Sent to evaluator panel.", async () => {
      let txHash: string | undefined;
      if (CONTRACTS_READY && chainJobId) txHash = (await challenge(chainJobId)).txHash;
      await recordJobChallenged({ jobId, actorAddress: address!, txHash });
      return txHash;
    });

  if (!address) {
    return <p className="text-sm text-muted">Connect the wallet tied to this job to act on it.</p>;
  }

  const btn =
    "inline-flex h-11 items-center gap-2 rounded-full px-6 font-medium transition-colors disabled:opacity-50";

  return (
    <div className="space-y-3">
      {/* provider 交付:上传真实交付物,链上锁 keccak(文件内容) */}
      {isProvider && status === "ESCROWED" && (
        <div className="rounded-xl border border-border bg-ink-2 p-4">
          <div className="mb-2 text-sm font-medium text-foreground">Submit your deliverable</div>
          <p className="mb-3 text-xs text-muted">
            Upload the actual file. Its content hash (keccak256) is locked on-chain so the client can verify
            exactly what you delivered before releasing payment.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-ink-3 px-4 py-2 text-sm font-medium text-foreground ring-1 ring-border hover:ring-border-strong">
              <Paperclip className="h-4 w-4" />
              {deliverFile ? "Change file" : "Attach file"}
              <input
                type="file"
                onChange={(e) => setDeliverFile(e.target.files?.[0] ?? null)}
                className="hidden"
                disabled={busy}
              />
            </label>
            {deliverFile && (
              <span className="max-w-[220px] truncate text-xs text-muted">
                {deliverFile.name} · {(deliverFile.size / 1024).toFixed(0)} KB
              </span>
            )}
            <button
              onClick={onDeliver}
              disabled={busy || !deliverFile}
              className={`${btn} bg-teal text-ink hover:bg-mint`}
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              Submit delivery
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        {isClient && status === "DELIVERED" && (
          <>
            <button onClick={onSettle} disabled={busy} className={`${btn} bg-teal text-ink hover:bg-mint`}>
              {busy && <Loader2 className="h-4 w-4 animate-spin" />} Approve & settle
            </button>
            <button
              onClick={onChallenge}
              disabled={busy}
              className={`${btn} bg-ink-3 text-foreground ring-1 ring-border hover:ring-border-strong`}
            >
              Challenge
            </button>
          </>
        )}
        {status === "SETTLED" && <span className="text-sm font-medium text-teal">Settled on-chain ✓</span>}
        {status === "CHALLENGED" && (
          <span className="text-sm font-medium text-warn">In 3-evaluator panel review…</span>
        )}
      </div>
      {!isClient && !isProvider && (
        <p className="text-xs text-faint">You are viewing this job as an observer.</p>
      )}
    </div>
  );
}
