import { NextRequest, NextResponse } from "next/server";
import { createPublicClient, http } from "viem";
import { bscTestnet } from "viem/chains";
import { parseSiweMessage } from "viem/siwe";
import { createSessionToken, SESSION_COOKIE, SESSION_MAX_AGE, NONCE_COOKIE } from "@/lib/session";
import { rateLimit, clientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const client = createPublicClient({
  chain: bscTestnet,
  transport: http(process.env.NEXT_PUBLIC_RPC_URL || undefined),
});

/** 校验 SIWE 签名(含 nonce),通过则签发 session cookie */
export async function POST(req: NextRequest) {
  if (!rateLimit(`siwe-verify:${clientIp(req)}`, 30, 60_000)) {
    return NextResponse.json({ ok: false, error: "Too many requests" }, { status: 429 });
  }
  try {
    const { message, signature } = await req.json();
    if (typeof message !== "string" || typeof signature !== "string") {
      return NextResponse.json({ ok: false, error: "Bad request" }, { status: 400 });
    }
    const nonce = req.cookies.get(NONCE_COOKIE)?.value;
    if (!nonce) return NextResponse.json({ ok: false, error: "Nonce expired, retry" }, { status: 401 });

    const valid = await client.verifySiweMessage({ message, signature: signature as `0x${string}`, nonce });
    if (!valid) return NextResponse.json({ ok: false, error: "Invalid signature" }, { status: 401 });

    const { address } = parseSiweMessage(message);
    if (!address) return NextResponse.json({ ok: false, error: "No address" }, { status: 400 });

    const res = NextResponse.json({ ok: true, address: address.toLowerCase() });
    res.cookies.set(SESSION_COOKIE, createSessionToken(address), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: SESSION_MAX_AGE,
    });
    res.cookies.set(NONCE_COOKIE, "", { path: "/", maxAge: 0 });
    return res;
  } catch (err) {
    console.error("siwe verify:", err);
    return NextResponse.json({ ok: false, error: "Verification failed" }, { status: 500 });
  }
}
