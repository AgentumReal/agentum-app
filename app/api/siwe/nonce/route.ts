import { NextRequest, NextResponse } from "next/server";
import { generateSiweNonce } from "viem/siwe";
import { NONCE_COOKIE } from "@/lib/session";
import { rateLimit, clientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** 下发一次性 nonce,并塞进 httpOnly cookie 供 verify 校验(防重放) */
export async function GET(req: NextRequest) {
  if (!rateLimit(`siwe-nonce:${clientIp(req)}`, 30, 60_000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }
  const nonce = generateSiweNonce();
  const res = NextResponse.json({ nonce });
  res.cookies.set(NONCE_COOKIE, nonce, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 300,
  });
  return res;
}
