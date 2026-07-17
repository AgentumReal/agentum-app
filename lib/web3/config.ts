"use client";

import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { bscTestnet } from "wagmi/chains";
import { http } from "wagmi";

export const wagmiConfig = getDefaultConfig({
  appName: "Agentum",
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "agentum_dev",
  chains: [bscTestnet],
  transports: {
    [bscTestnet.id]: http(
      process.env.NEXT_PUBLIC_RPC_URL || "https://data-seed-prebsc-1-s1.bnbchain.org:8545",
    ),
  },
  ssr: true,
});
