"use server";

import { z } from "zod";
import { prisma } from "@/lib/db";
import { getOrCreateUser } from "@/lib/auth";
import { getSessionAddress } from "@/lib/session";

type Result<T = undefined> = { ok: true; data?: T } | { ok: false; error: string };

const SendSchema = z.object({
  fromAddress: z.string().min(1),
  toAddress: z.string().min(1),
  body: z.string().trim().min(1, "Message is empty").max(2000),
  jobId: z.string().optional(),
});

/** 发一条站内信(client ↔ provider,钱包对钱包) */
export async function sendMessage(input: z.infer<typeof SendSchema>): Promise<Result> {
  const p = SendSchema.safeParse(input);
  if (!p.success) return { ok: false, error: p.error.issues[0]?.message ?? "Invalid input" };
  const d = p.data;
  // 发送者取自 session,不信前端传的 fromAddress
  const meAddr = await getSessionAddress();
  if (!meAddr) return { ok: false, error: "Please sign in with your wallet first" };
  if (meAddr.toLowerCase() === d.toAddress.toLowerCase()) {
    return { ok: false, error: "You can't message yourself" };
  }
  try {
    const from = await getOrCreateUser(meAddr);
    const to = await getOrCreateUser(d.toAddress);
    await prisma.message.create({
      data: { body: d.body, fromId: from.id, toId: to.id, jobId: d.jobId ?? null },
    });
    return { ok: true };
  } catch (err) {
    console.error("sendMessage:", err);
    return { ok: false, error: "Failed to send" };
  }
}

export type Conversation = {
  address: string;
  handle: string | null;
  lastBody: string;
  lastAt: string;
  fromMe: boolean;
  unread: number;
};

/** 会话列表:按对方钱包分组,带最后一条 + 未读数 */
export async function getMyConversations(address: string): Promise<Conversation[]> {
  if (!address?.startsWith("0x")) return [];
  const me = await prisma.user.findUnique({ where: { address: address.toLowerCase() } });
  if (!me) return [];

  const msgs = await prisma.message.findMany({
    where: { OR: [{ fromId: me.id }, { toId: me.id }] },
    orderBy: { createdAt: "desc" },
    include: {
      from: { select: { id: true, address: true, handle: true } },
      to: { select: { id: true, address: true, handle: true } },
    },
  });

  const byOther = new Map<string, Conversation>();
  for (const m of msgs) {
    const other = m.fromId === me.id ? m.to : m.from;
    const key = other.id;
    if (!byOther.has(key)) {
      byOther.set(key, {
        address: other.address,
        handle: other.handle,
        lastBody: m.body,
        lastAt: m.createdAt.toISOString(),
        fromMe: m.fromId === me.id,
        unread: 0,
      });
    }
    // 未读 = 对方发给我且未读
    if (m.toId === me.id && m.fromId === other.id && !m.readAt) {
      byOther.get(key)!.unread += 1;
    }
  }
  return [...byOther.values()];
}

export type ThreadMessage = { id: string; body: string; fromMe: boolean; at: string };

/** 与某个对方钱包的会话内容(并把收到的标记为已读) */
export async function getThread(
  myAddress: string,
  otherAddress: string,
): Promise<{ messages: ThreadMessage[]; other: { address: string; handle: string | null } | null }> {
  if (!myAddress?.startsWith("0x") || !otherAddress?.startsWith("0x")) {
    return { messages: [], other: null };
  }
  const me = await getOrCreateUser(myAddress);
  const other = await prisma.user.findUnique({ where: { address: otherAddress.toLowerCase() } });
  if (!other) return { messages: [], other: null };

  const rows = await prisma.message.findMany({
    where: {
      OR: [
        { fromId: me.id, toId: other.id },
        { fromId: other.id, toId: me.id },
      ],
    },
    orderBy: { createdAt: "asc" },
  });

  await prisma.message.updateMany({
    where: { fromId: other.id, toId: me.id, readAt: null },
    data: { readAt: new Date() },
  });

  return {
    messages: rows.map((m) => ({
      id: m.id,
      body: m.body,
      fromMe: m.fromId === me.id,
      at: m.createdAt.toISOString(),
    })),
    other: { address: other.address, handle: other.handle },
  };
}
