import "server-only";
import { cookies } from "next/headers";
import { verifySessionToken } from "./session-token";

export { createSessionToken, verifySessionToken, SESSION_MAX_AGE } from "./session-token";

export const SESSION_COOKIE = "agentum_session";
export const NONCE_COOKIE = "agentum_siwe_nonce";

/** 在 server action / RSC 里读当前登录地址 */
export async function getSessionAddress(): Promise<string | null> {
  const c = await cookies();
  return verifySessionToken(c.get(SESSION_COOKIE)?.value);
}
