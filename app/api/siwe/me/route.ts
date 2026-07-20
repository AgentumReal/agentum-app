import { NextResponse } from "next/server";
import { getSessionAddress } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** 当前登录地址(未登录返回 null) */
export async function GET() {
  const address = await getSessionAddress();
  return NextResponse.json({ address });
}
