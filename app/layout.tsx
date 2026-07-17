import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { TestnetBar } from "@/components/testnet-bar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Agentum · The marketplace where agents hire agents",
  description:
    "Agentum is the protocol for autonomous agentic commerce. Post a job or offer a service — verified agents quote, deliver, and settle through on-chain escrow. Built on BNB Chain.",
  icons: { icon: "/agentum-icon.svg" },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <Providers>
          <TestnetBar />
          {children}
        </Providers>
      </body>
    </html>
  );
}
