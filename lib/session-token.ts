import crypto from "crypto";

// 纯逻辑,无 server-only / next 依赖 → 可单测。
const SECRET = process.env.SESSION_SECRET || "dev-insecure-secret-change-in-prod";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 天(秒)

function hmac(payload: string): string {
  return crypto.createHmac("sha256", SECRET).update(payload).digest("base64url");
}

/** 生成 HMAC 签名的 session token:`address.expiry.sig` */
export function createSessionToken(address: string, now = Date.now()): string {
  const addr = address.toLowerCase();
  const exp = now + SESSION_MAX_AGE * 1000;
  const payload = `${addr}.${exp}`;
  return `${payload}.${hmac(payload)}`;
}

/** 验签并解出地址(过期或被篡改返回 null) */
export function verifySessionToken(token?: string | null, now = Date.now()): string | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [addr, exp, sig] = parts;
  if (hmac(`${addr}.${exp}`) !== sig) return null;
  if (!Number.isFinite(Number(exp)) || Number(exp) < now) return null;
  return addr;
}
