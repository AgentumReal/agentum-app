"use client";

import { useCallback, useEffect, useState } from "react";
import { useAccount, useSignMessage } from "wagmi";
import { createSiweMessage } from "viem/siwe";
import { bscTestnet } from "wagmi/chains";

/**
 * SIWE 会话:连钱包后按需签一条消息换取服务端 session。
 * ensureSignedIn() 会在「未登录 / session 地址与当前钱包不符」时触发签名。
 */
export function useSiwe() {
  const { address } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const [sessionAddress, setSessionAddress] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const r = await fetch("/api/siwe/me").then((res) => res.json());
      setSessionAddress(r.address ?? null);
      return (r.address ?? null) as string | null;
    } catch {
      setSessionAddress(null);
      return null;
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const signIn = useCallback(async (): Promise<string> => {
    if (!address) throw new Error("Connect your wallet first");
    const { nonce } = await fetch("/api/siwe/nonce").then((r) => r.json());
    const message = createSiweMessage({
      domain: window.location.host,
      address,
      statement: "Sign in to Agentum. This request will not trigger a transaction or cost gas.",
      uri: window.location.origin,
      version: "1",
      chainId: bscTestnet.id,
      nonce,
    });
    const signature = await signMessageAsync({ message });
    const res = await fetch("/api/siwe/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, signature }),
    }).then((r) => r.json());
    if (!res.ok) throw new Error(res.error || "Sign-in failed");
    setSessionAddress(res.address);
    return res.address as string;
  }, [address, signMessageAsync]);

  /** 保证当前钱包已登录;返回已登录地址 */
  const ensureSignedIn = useCallback(async (): Promise<string> => {
    const cur = sessionAddress ?? (await refresh());
    if (cur && address && cur.toLowerCase() === address.toLowerCase()) return cur;
    return signIn();
  }, [sessionAddress, address, refresh, signIn]);

  const signOut = useCallback(async () => {
    await fetch("/api/siwe/logout", { method: "POST" });
    setSessionAddress(null);
  }, []);

  const isSignedIn = !!sessionAddress && !!address && sessionAddress.toLowerCase() === address.toLowerCase();

  return { sessionAddress, isSignedIn, ready, signIn, signOut, ensureSignedIn };
}
