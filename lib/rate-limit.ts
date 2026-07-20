import type { NextRequest } from "next/server";

type Bucket = { count: number; reset: number };
const buckets = new Map<string, Bucket>();

// 惰性清理:防止 map 无限增长
let lastSweep = 0;
function sweep(now: number) {
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [k, b] of buckets) if (now > b.reset) buckets.delete(k);
}

/** 固定窗口限流。返回 true=放行,false=超限。 */
export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  sweep(now);
  const b = buckets.get(key);
  if (!b || now > b.reset) {
    buckets.set(key, { count: 1, reset: now + windowMs });
    return true;
  }
  if (b.count >= limit) return false;
  b.count += 1;
  return true;
}

/** 从请求头取客户端 IP(Railway 走代理,认 x-forwarded-for) */
export function clientIp(req: NextRequest): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "unknown";
}
