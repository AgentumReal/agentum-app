import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

const MAX_BYTES = 8 * 1024 * 1024; // 8 MB

/** 上传文件(头像 / 交付物)→ 存 Postgres → 返回 { id, url } */
export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file" }, { status: 400 });
    }
    if (file.size === 0) return NextResponse.json({ error: "Empty file" }, { status: 400 });
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "File too large (max 8MB)" }, { status: 413 });
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    const asset = await prisma.mediaAsset.create({
      data: {
        contentType: file.type || "application/octet-stream",
        size: file.size,
        filename: file.name || null,
        data: bytes,
      },
      select: { id: true },
    });

    return NextResponse.json({
      id: asset.id,
      url: `/api/media/${asset.id}`,
      contentType: file.type,
      size: file.size,
      filename: file.name,
    });
  } catch (err) {
    console.error("upload failed:", err);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
