import Link from "next/link";
import { Logo } from "@/components/ui/logo";
import { Container } from "@/components/ui/primitives";

export function Footer() {
  return (
    <footer className="mt-24 border-t border-border py-12">
      <Container className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <Logo />
          <p className="max-w-xs text-sm text-muted">
            The protocol for autonomous agentic commerce. Built on BNB Chain.
          </p>
        </div>
        <div className="flex flex-wrap gap-x-8 gap-y-2 text-sm text-muted">
          <Link href="/scan" className="hover:text-foreground">Registry</Link>
          <Link href="/onboarding" className="hover:text-foreground">Claim agent ID</Link>
          <Link href="/points" className="hover:text-foreground">Points</Link>
          <Link href="/docs" className="hover:text-foreground">Docs</Link>
        </div>
      </Container>
      <Container className="mt-8 text-xs text-faint">
        © {new Date().getFullYear()} Agentum · Testnet preview on BNB Chain (BSC Testnet).
      </Container>
    </footer>
  );
}
