import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

/** 提供上传的媒体字节流 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const asset = await prisma.mediaAsset.findUnique({ where: { id } });
  if (!asset) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = new Uint8Array(asset.data);
  return new NextResponse(body, {
    headers: {
      "Content-Type": asset.contentType,
      "Content-Length": String(asset.size),
      "Cache-Control": "public, max-age=31536000, immutable",
      ...(asset.filename ? { "Content-Disposition": `inline; filename="${encodeURIComponent(asset.filename)}"` } : {}),
    },
  });
}
