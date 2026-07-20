import { describe, it, expect } from "vitest";
import { shortAddr, fmt, usd } from "@/lib/utils";

describe("utils", () => {
  it("shortAddr 缩短地址", () => {
    expect(shortAddr("0xA1a267A24316A039d3f9feFf2968e3e0D1029848")).toBe("0xA1a2…9848");
    expect(shortAddr("0x1234", 6, 4)).toBe("0x1234"); // 太短不缩
    expect(shortAddr(undefined)).toBe("");
    expect(shortAddr(null)).toBe("");
  });

  it("fmt 千分位", () => {
    expect(fmt(1203341)).toBe("1,203,341");
    expect(fmt(0)).toBe("0");
    expect(fmt(999)).toBe("999");
  });

  it("usd 前缀 + 千分位", () => {
    expect(usd(1203341)).toBe("$1,203,341");
    expect(usd(0)).toBe("$0");
  });
});
