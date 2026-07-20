"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useAccount } from "wagmi";
import { ArrowLeft, Send, Loader2, MessagesSquare } from "lucide-react";
import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";
import { Container, Eyebrow, Card } from "@/components/ui/primitives";
import { WalletButton } from "@/components/wallet-button";
import { shortAddr } from "@/lib/utils";
import { useSiwe } from "@/lib/web3/use-siwe";
import {
  sendMessage,
  getMyConversations,
  getThread,
  type Conversation,
  type ThreadMessage,
} from "@/app/actions/messages";

function InboxInner() {
  const { address, isConnected } = useAccount();
  const params = useSearchParams();
  const to = params.get("to");
  const name = params.get("name");

  return (
    <>
      <Nav />
      <main>
        <Container className="max-w-3xl py-10">
          {!isConnected ? (
            <>
              <Eyebrow>Inbox</Eyebrow>
              <h1 className="mt-2 text-4xl font-semibold tracking-tight">Messages</h1>
              <Card className="mt-8 flex flex-col items-center gap-4 p-10 text-center">
                <p className="text-muted">Connect your wallet to see your messages.</p>
                <WalletButton />
              </Card>
            </>
          ) : to ? (
            <Thread myAddress={address!} otherAddress={to} name={name} />
          ) : (
            <ConversationList myAddress={address!} />
          )}
        </Container>
      </main>
      <Footer />
    </>
  );
}

function ConversationList({ myAddress }: { myAddress: string }) {
  const [convos, setConvos] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMyConversations(myAddress)
      .then(setConvos)
      .finally(() => setLoading(false));
  }, [myAddress]);

  return (
    <>
      <Eyebrow>Inbox</Eyebrow>
      <h1 className="mt-2 text-4xl font-semibold tracking-tight">Messages</h1>
      <p className="mt-2 text-muted">Talk to clients and providers before and during a job.</p>

      {loading ? (
        <Card className="mt-8 p-10 text-center text-muted">Loading…</Card>
      ) : convos.length === 0 ? (
        <Card className="mt-8 flex flex-col items-center gap-3 p-10 text-center text-muted">
          <MessagesSquare className="h-6 w-6 text-faint" />
          No messages yet. Open an agent&apos;s storefront and hit{" "}
          <span className="text-foreground">Message</span> to start a conversation.
          <Link href="/scan" className="mt-1 text-teal hover:text-mint">
            Browse agents →
          </Link>
        </Card>
      ) : (
        <div className="mt-8 divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface/60">
          {convos.map((c) => (
            <Link
              key={c.address}
              href={`/inbox?to=${c.address}`}
              className="flex items-center gap-4 p-4 hover:bg-surface-2 sm:p-5"
            >
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-gradient-to-br from-mint/25 to-teal/15 text-sm font-semibold text-teal ring-1 ring-border">
                {(c.handle ?? c.address).slice(2, 4).toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <div className="font-medium text-foreground">{c.handle ?? shortAddr(c.address)}</div>
                <div className="truncate text-sm text-muted">
                  {c.fromMe && "You: "}
                  {c.lastBody}
                </div>
              </div>
              {c.unread > 0 && (
                <span className="grid h-5 min-w-5 place-items-center rounded-full bg-teal px-1.5 text-xs font-semibold text-ink">
                  {c.unread}
                </span>
              )}
            </Link>
          ))}
        </div>
      )}
    </>
  );
}

function Thread({
  myAddress,
  otherAddress,
  name,
}: {
  myAddress: string;
  otherAddress: string;
  name: string | null;
}) {
  const { ensureSignedIn } = useSiwe();
  const [messages, setMessages] = useState<ThreadMessage[]>([]);
  const [otherHandle, setOtherHandle] = useState<string | null>(name);
  const [loading, setLoading] = useState(true);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    return getThread(myAddress, otherAddress).then((r) => {
      setMessages(r.messages);
      if (r.other?.handle) setOtherHandle(r.other.handle);
    });
  }, [myAddress, otherAddress]);

  useEffect(() => {
    load().finally(() => setLoading(false));
    const t = setInterval(load, 5000); // 轻量轮询
    return () => clearInterval(t);
  }, [load]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    setSending(true);
    setError(null);
    try {
      await ensureSignedIn();
      const res = await sendMessage({ fromAddress: myAddress, toAddress: otherAddress, body });
      if (res.ok) {
        setBody("");
        load();
      } else setError(res.error);
    } catch (err) {
      setError(err instanceof Error ? err.message.slice(0, 100) : "Failed to send");
    } finally {
      setSending(false);
    }
  }

  const title = otherHandle ?? shortAddr(otherAddress);

  return (
    <div className="flex h-[70vh] flex-col">
      <div className="flex items-center gap-3 border-b border-border pb-4">
        <Link href="/inbox" className="text-muted hover:text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <span className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-mint/25 to-teal/15 text-sm font-semibold text-teal ring-1 ring-border">
          {title.replace(/[^a-zA-Z0-9]/g, "").slice(0, 2).toUpperCase()}
        </span>
        <div>
          <div className="font-semibold text-foreground">{title}</div>
          <div className="font-mono text-xs text-faint">{shortAddr(otherAddress)}</div>
        </div>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto py-5">
        {loading ? (
          <p className="text-center text-sm text-muted">Loading…</p>
        ) : messages.length === 0 ? (
          <p className="text-center text-sm text-muted">No messages yet. Say hello 👋</p>
        ) : (
          messages.map((m) => (
            <div key={m.id} className={`flex ${m.fromMe ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm ${
                  m.fromMe ? "bg-teal text-ink" : "bg-ink-3 text-foreground ring-1 ring-border"
                }`}
              >
                {m.body}
              </div>
            </div>
          ))
        )}
      </div>

      {error && <p className="pb-2 text-sm text-danger">{error}</p>}
      <form onSubmit={submit} className="flex items-center gap-2 border-t border-border pt-4">
        <input
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Write a message…"
          className="w-full rounded-full border border-border bg-ink-2 px-4 py-2.5 text-sm text-foreground placeholder:text-faint focus:border-teal/50 focus:outline-none"
        />
        <button
          type="submit"
          disabled={sending || !body.trim()}
          className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-teal text-ink hover:bg-mint disabled:opacity-50"
        >
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </button>
      </form>
    </div>
  );
}

export default function InboxPage() {
  return (
    <Suspense fallback={null}>
      <InboxInner />
    </Suspense>
  );
}
