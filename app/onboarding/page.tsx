"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAccount, useWriteContract, usePublicClient } from "wagmi";
import { decodeEventLog } from "viem";
import { Check, Loader2, ChevronRight, ChevronLeft, Upload, Image as ImageIcon } from "lucide-react";
import { CONTRACTS, CONTRACTS_READY } from "@/lib/web3/contracts";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { Container, Eyebrow, Card } from "@/components/ui/primitives";
import { WalletButton } from "@/components/wallet-button";
import { cn } from "@/lib/utils";
import { CATEGORIES } from "@/lib/constants";
import { claimAgent, type ClaimInput } from "@/app/actions/agents";
import { useToast } from "@/components/toast/toast-provider";

const STEPS = ["Identity", "Details", "Live"] as const;
const PRESET_AVATARS = Array.from({ length: 8 }, (_, i) => `/avatars/a${i + 1}.svg`);

export default function OnboardingPage() {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient();
  const { push, update } = useToast();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  // form state
  const [handle, setHandle] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [category, setCategory] = useState<ClaimInput["category"]>("CODE");
  const [bio, setBio] = useState("");
  const [tagsRaw, setTagsRaw] = useState("");
  const [svcTitle, setSvcTitle] = useState("");
  const [svcPrice, setSvcPrice] = useState("18");
  const [svcDays, setSvcDays] = useState("3");
  const [avatarUrl, setAvatarUrl] = useState<string>("");
  const [avatarBusy, setAvatarBusy] = useState(false);

  async function onAvatarPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      push({ type: "error", message: "Please choose an image file." });
      return;
    }
    setAvatarBusy(true);
    try {
      const { uploadFile } = await import("@/lib/upload");
      const r = await uploadFile(file);
      setAvatarUrl(r.url);
    } catch (err) {
      push({ type: "error", message: err instanceof Error ? err.message : "Upload failed" });
    } finally {
      setAvatarBusy(false);
    }
  }

  const canNext0 = handle.trim().length >= 3 && displayName.trim().length >= 1;
  const canNext1 = svcTitle.trim().length >= 1 && Number(svcPrice) > 0;

  async function submit() {
    if (!address) return;
    setSubmitting(true);
    const tid = push({ type: "loading", message: "Minting your .agent identity on BSC Testnet…" });

    let chainTokenId: string | undefined;
    let identityTxHash: string | undefined;

    try {
      // 合约已部署 → 真的在链上 mint .agent 身份 NFT
      if (CONTRACTS_READY && publicClient) {
        const txHash = await writeContractAsync({
          address: CONTRACTS.agentIdentity.address,
          abi: CONTRACTS.agentIdentity.abi,
          functionName: "mint",
          args: [address, handle.trim()],
        });
        identityTxHash = txHash;
        update(tid, { type: "loading", message: "Waiting for on-chain confirmation…", txHash });
        const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });

        // 从 IdentityMinted 事件解析 tokenId
        for (const log of receipt.logs) {
          try {
            const parsed = decodeEventLog({
              abi: CONTRACTS.agentIdentity.abi,
              data: log.data,
              topics: log.topics,
            });
            if (parsed.eventName === "IdentityMinted") {
              chainTokenId = (parsed.args as { tokenId: bigint }).tokenId.toString();
              break;
            }
          } catch {
            /* 非本合约日志,跳过 */
          }
        }
      }

      update(tid, { type: "loading", message: "Saving your storefront…", txHash: identityTxHash });
      const res = await claimAgent({
        address,
        handle: handle.trim(),
        displayName: displayName.trim(),
        category,
        bio: bio.trim(),
        tags: tagsRaw.split(",").map((t) => t.trim()).filter(Boolean).slice(0, 8),
        avatarUrl: avatarUrl || undefined,
        chainTokenId,
        identityTxHash,
        service: {
          title: svcTitle.trim(),
          priceUsdc: Math.floor(Number(svcPrice)),
          deliveryDays: Math.floor(Number(svcDays)),
        },
      });
      setSubmitting(false);
      if (res.ok) {
        update(tid, {
          type: "success",
          message: `${handle.trim().toLowerCase()}.agent is live on-chain.`,
          txHash: identityTxHash,
        });
        router.push(`/storefront?handle=${res.handle}`);
      } else {
        update(tid, { type: "error", message: res.error });
      }
    } catch (err) {
      setSubmitting(false);
      const msg = err instanceof Error ? err.message : "Transaction failed";
      update(tid, { type: "error", message: msg.length > 140 ? msg.slice(0, 140) + "…" : msg });
    }
  }

  return (
    <>
      <Nav />
      <main>
        <Container className="max-w-2xl py-12">
          {/* Stepper */}
          <div className="flex items-center justify-center gap-2">
            {STEPS.map((s, i) => (
              <div key={s} className="flex items-center gap-2">
                <span
                  className={cn(
                    "grid h-8 w-8 place-items-center rounded-full text-sm font-semibold ring-1 transition-colors",
                    i < step
                      ? "bg-teal text-ink ring-teal"
                      : i === step
                        ? "bg-ink-3 text-teal ring-teal"
                        : "bg-ink-2 text-faint ring-border",
                  )}
                >
                  {i < step ? <Check className="h-4 w-4" /> : i + 1}
                </span>
                <span
                  className={cn(
                    "text-xs font-semibold uppercase tracking-wider",
                    i === step ? "text-foreground" : "text-faint",
                  )}
                >
                  {s}
                </span>
                {i < STEPS.length - 1 && <span className="mx-2 h-px w-8 bg-border sm:w-16" />}
              </div>
            ))}
          </div>

          <div className="mt-10 text-center">
            <Eyebrow>Provider account</Eyebrow>
            <h1 className="mt-2 text-4xl font-semibold tracking-tight">
              {step === 0 ? "Claim your provider handle" : step === 1 ? "Describe your service" : "Go live on-chain"}
            </h1>
          </div>

          {!isConnected ? (
            <Card className="mt-10 flex flex-col items-center gap-4 p-10 text-center">
              <p className="text-muted">Connect your wallet to claim a .agent identity on BSC Testnet.</p>
              <WalletButton />
            </Card>
          ) : (
            <Card className="mt-10 p-6 sm:p-8">
              {/* STEP 0 — Identity */}
              {step === 0 && (
                <div className="space-y-6">
                  <Field label="Storefront logo" hint="PNG, JPG, WebP or GIF. Up to 8 MB.">
                    <div className="flex items-center gap-4">
                      <span className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-xl bg-ink-3 ring-1 ring-border">
                        {avatarUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={avatarUrl} alt="avatar" className="h-16 w-16 object-cover" />
                        ) : (
                          <ImageIcon className="h-6 w-6 text-faint" />
                        )}
                      </span>
                      <label className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-ink-3 px-4 py-2 text-sm font-medium text-foreground ring-1 ring-border hover:ring-border-strong">
                        {avatarBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                        {avatarUrl ? "Change image" : "Upload image"}
                        <input type="file" accept="image/*" onChange={onAvatarPick} className="hidden" disabled={avatarBusy} />
                      </label>
                    </div>

                    <div className="mt-4">
                      <div className="mb-2 text-xs text-faint">Or pick a default</div>
                      <div className="flex flex-wrap gap-2.5">
                        {PRESET_AVATARS.map((src) => (
                          <button
                            key={src}
                            type="button"
                            onClick={() => setAvatarUrl(src)}
                            className={cn(
                              "h-11 w-11 overflow-hidden rounded-full ring-2 transition-all",
                              avatarUrl === src
                                ? "ring-teal ring-offset-2 ring-offset-surface"
                                : "ring-border hover:ring-border-strong",
                            )}
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={src} alt="avatar option" className="h-11 w-11 object-cover" />
                          </button>
                        ))}
                      </div>
                    </div>
                  </Field>

                  <Field label="Name" hint="Minted on-chain with a .agent suffix.">
                    <div className="flex items-stretch overflow-hidden rounded-xl border border-border bg-ink-2 focus-within:border-teal/50">
                      <input
                        value={handle}
                        onChange={(e) => setHandle(e.target.value.replace(/[^a-zA-Z0-9_-]/g, ""))}
                        placeholder="codewriter-audit"
                        className="w-full bg-transparent px-4 py-3 text-foreground placeholder:text-faint focus:outline-none"
                      />
                      <span className="grid place-items-center border-l border-border px-4 text-sm text-muted">
                        .agent
                      </span>
                    </div>
                  </Field>

                  <Field label="Display name">
                    <input
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="CodeWriter Audit"
                      className="w-full rounded-xl border border-border bg-ink-2 px-4 py-3 text-foreground placeholder:text-faint focus:border-teal/50 focus:outline-none"
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
                </div>
              )}

              {/* STEP 1 — Details */}
              {step === 1 && (
                <div className="space-y-6">
                  <Field label="Bio">
                    <textarea
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      rows={3}
                      placeholder="What you build, how you deliver, what makes you reliable."
                      className="w-full resize-none rounded-xl border border-border bg-ink-2 px-4 py-3 text-foreground placeholder:text-faint focus:border-teal/50 focus:outline-none"
                    />
                  </Field>
                  <Field label="Tags" hint="Comma-separated, up to 8.">
                    <input
                      value={tagsRaw}
                      onChange={(e) => setTagsRaw(e.target.value)}
                      placeholder="Solidity, Audit, DeFi"
                      className="w-full rounded-xl border border-border bg-ink-2 px-4 py-3 text-foreground placeholder:text-faint focus:border-teal/50 focus:outline-none"
                    />
                  </Field>
                  <Field label="First service">
                    <input
                      value={svcTitle}
                      onChange={(e) => setSvcTitle(e.target.value)}
                      placeholder="Full Solidity audit with report"
                      className="w-full rounded-xl border border-border bg-ink-2 px-4 py-3 text-foreground placeholder:text-faint focus:border-teal/50 focus:outline-none"
                    />
                  </Field>
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Price (USDC)">
                      <input
                        type="number"
                        value={svcPrice}
                        onChange={(e) => setSvcPrice(e.target.value)}
                        className="w-full rounded-xl border border-border bg-ink-2 px-4 py-3 text-foreground focus:border-teal/50 focus:outline-none"
                      />
                    </Field>
                    <Field label="Delivery (days)">
                      <input
                        type="number"
                        value={svcDays}
                        onChange={(e) => setSvcDays(e.target.value)}
                        className="w-full rounded-xl border border-border bg-ink-2 px-4 py-3 text-foreground focus:border-teal/50 focus:outline-none"
                      />
                    </Field>
                  </div>
                </div>
              )}

              {/* STEP 2 — Live */}
              {step === 2 && (
                <div className="space-y-5">
                  <Row label="Identity" value={`${handle.toLowerCase()}.agent`} />
                  <Row label="Display name" value={displayName} />
                  <Row label="Category" value={CATEGORIES.find((c) => c.key === category)?.label ?? ""} />
                  <Row label="Service" value={`${svcTitle} · from ${svcPrice} USDC`} />
                  <Row label="Owner wallet" value={address ?? ""} mono />
                  <Row label="Chain" value="BSC Testnet (chainId 97)" />
                  <p className="rounded-xl bg-ink-2 p-4 text-sm text-muted">
                    {CONTRACTS_READY
                      ? "Claiming mints your .agent identity NFT on BSC Testnet — you'll confirm the transaction in your wallet — then publishes your storefront."
                      : "Claiming publishes your provider sub-account. On-chain minting of the .agent identity NFT activates once contracts are deployed to BSC Testnet."}
                  </p>
                </div>
              )}

              {/* Nav buttons */}
              <div className="mt-8 flex items-center justify-between">
                <button
                  onClick={() => setStep((s) => Math.max(0, s - 1))}
                  disabled={step === 0}
                  className="inline-flex items-center gap-1 text-sm text-muted hover:text-foreground disabled:opacity-0"
                >
                  <ChevronLeft className="h-4 w-4" /> Back
                </button>

                {step < 2 ? (
                  <button
                    onClick={() => setStep((s) => s + 1)}
                    disabled={(step === 0 && !canNext0) || (step === 1 && !canNext1)}
                    className="inline-flex h-11 items-center gap-2 rounded-full bg-teal px-6 font-medium text-ink transition-colors hover:bg-mint disabled:opacity-40"
                  >
                    Continue <ChevronRight className="h-4 w-4" />
                  </button>
                ) : (
                  <button
                    onClick={submit}
                    disabled={submitting}
                    className="inline-flex h-11 items-center gap-2 rounded-full bg-teal px-6 font-medium text-ink transition-colors hover:bg-mint disabled:opacity-60"
                  >
                    {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                    Claim agent ID
                  </button>
                )}
              </div>
            </Card>
          )}
        </Container>
      </main>
      <Footer />
    </>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-foreground">{label}</label>
      {children}
      {hint && <p className="mt-1.5 text-xs text-faint">{hint}</p>}
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border pb-3">
      <span className="text-sm text-muted">{label}</span>
      <span className={cn("truncate text-sm text-foreground", mono && "font-mono text-xs")}>
        {value}
      </span>
    </div>
  );
}
