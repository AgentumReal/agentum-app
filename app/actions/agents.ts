"use server";

import { z } from "zod";
import { prisma } from "@/lib/db";
import { getOrCreateUser } from "@/lib/auth";
import { isHandleAvailable } from "@/lib/data/agents";

const ClaimSchema = z.object({
  address: z.string().min(1),
  handle: z
    .string()
    .min(3, "At least 3 characters")
    .max(24, "At most 24 characters")
    .regex(/^[a-z0-9][a-z0-9_-]*$/i, "Letters, numbers, _ and - only"),
  displayName: z.string().min(1).max(40),
  category: z.enum(["CODE", "SECURITY", "DATA", "DESIGN"]),
  bio: z.string().max(600).default(""),
  tags: z.array(z.string().max(30)).max(8).default([]),
  avatarUrl: z.string().max(500).optional(),
  chainTokenId: z.string().optional(),
  identityTxHash: z.string().optional(),
  service: z.object({
    title: z.string().min(1).max(80),
    priceUsdc: z.number().int().min(1).max(100000),
    deliveryDays: z.number().int().min(1).max(60),
  }),
});

export type ClaimInput = z.infer<typeof ClaimSchema>;

export type ClaimResult =
  | { ok: true; handle: string }
  | { ok: false; error: string };

export async function claimAgent(input: ClaimInput): Promise<ClaimResult> {
  const parsed = ClaimSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const data = parsed.data;
  const handle = data.handle.toLowerCase();

  try {
    if (!(await isHandleAvailable(handle))) {
      return { ok: false, error: `Handle "${handle}.agent" is taken` };
    }

    const owner = await getOrCreateUser(data.address);

    await prisma.providerAgent.create({
      data: {
        handle,
        displayName: data.displayName,
        category: data.category,
        bio: data.bio,
        tags: data.tags,
        avatarUrl: data.avatarUrl || null,
        verified: true,
        chainTokenId: data.chainTokenId || null,
        identityTxHash: data.identityTxHash || null,
        ownerId: owner.id,
        services: {
          create: {
            title: data.service.title,
            category: data.category,
            description: data.bio,
            priceUsdc: data.service.priceUsdc,
            deliveryDays: data.service.deliveryDays,
          },
        },
      },
    });

    // 维护全站统计
    await prisma.marketStat.update({
      where: { id: 1 },
      data: { totalAgents: { increment: 1 }, totalProviders: { increment: 1 } },
    });

    return { ok: true, handle };
  } catch (err) {
    console.error("claimAgent failed:", err);
    return { ok: false, error: "Something went wrong. Please try again." };
  }
}

/** 拉取某钱包名下的 provider 子账号(竞价时选身份用) */
export async function getMyAgents(address: string) {
  if (!address || !address.startsWith("0x")) return [];
  return prisma.providerAgent.findMany({
    where: { owner: { address: address.toLowerCase() }, role: "PROVIDER" },
    select: { handle: true, displayName: true },
    orderBy: { createdAt: "asc" },
  });
}

/** 校验 handle 是否可用(供 onboarding 实时提示) */
export async function checkHandle(handle: string): Promise<boolean> {
  const h = handle.trim().toLowerCase();
  if (!/^[a-z0-9][a-z0-9_-]{2,23}$/i.test(h)) return false;
  return isHandleAvailable(h);
}
