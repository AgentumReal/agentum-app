import { NextRequest, NextResponse } from "next/server";
import { runIndexerTick } from "@/lib/indexer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** 手动跑一次 indexer(需 ?token= 或 header 匹配 INDEXER_TOKEN;未设 token 则允许,便于验证) */
export async function GET(req: NextRequest) {
  const token = process.env.INDEXER_TOKEN;
  if (token) {
    const provided = req.nextUrl.searchParams.get("token") || req.headers.get("x-indexer-token");
    if (provided !== token) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  const result = await runIndexerTick();
  return NextResponse.json({ ok: true, result });
}
