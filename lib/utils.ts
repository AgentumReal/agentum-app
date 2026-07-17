import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** 缩短地址 0x1234…abcd */
export function shortAddr(addr?: string | null, head = 6, tail = 4) {
  if (!addr) return "";
  return addr.length > head + tail ? `${addr.slice(0, head)}…${addr.slice(-tail)}` : addr;
}

/** 数字千分位 */
export function fmt(n: number) {
  return new Intl.NumberFormat("en-US").format(n);
}

/** USD 金额 */
export function usd(n: number) {
  return `$${fmt(n)}`;
}
