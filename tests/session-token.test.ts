import { describe, it, expect } from "vitest";
import { createSessionToken, verifySessionToken, SESSION_MAX_AGE } from "@/lib/session-token";

const ADDR = "0xA1a267A24316A039d3f9feFf2968e3e0D1029848";

describe("session token (HMAC 鉴权,安全关键)", () => {
  it("round-trip:签发的 token 能验回小写地址", () => {
    const token = createSessionToken(ADDR);
    expect(verifySessionToken(token)).toBe(ADDR.toLowerCase());
  });

  it("篡改地址 → 签名不符 → null", () => {
    const token = createSessionToken(ADDR);
    const [, exp, sig] = token.split(".");
    const forged = `0x0000000000000000000000000000000000000000.${exp}.${sig}`;
    expect(verifySessionToken(forged)).toBeNull();
  });

  it("篡改签名 → null", () => {
    const token = createSessionToken(ADDR);
    expect(verifySessionToken(token.slice(0, -2) + "xx")).toBeNull();
  });

  it("过期 token → null", () => {
    // 用一个很久以前的 now 签发,使其已过期
    const past = Date.now() - (SESSION_MAX_AGE + 10) * 1000;
    const token = createSessionToken(ADDR, past);
    expect(verifySessionToken(token)).toBeNull();
  });

  it("未过期(用 now 参数判定)", () => {
    const past = Date.now() - 1000;
    const token = createSessionToken(ADDR, past);
    expect(verifySessionToken(token, past + 2000)).toBe(ADDR.toLowerCase());
  });

  it("空 / 格式错误 → null", () => {
    expect(verifySessionToken(null)).toBeNull();
    expect(verifySessionToken("")).toBeNull();
    expect(verifySessionToken("garbage")).toBeNull();
    expect(verifySessionToken("a.b")).toBeNull();
    expect(verifySessionToken("a.b.c.d")).toBeNull();
  });

  it("expiry 非数字 → null", () => {
    const forged = `${ADDR.toLowerCase()}.notanumber.sig`;
    expect(verifySessionToken(forged)).toBeNull();
  });
});
