import Link from "next/link";
import { Search } from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { Container } from "@/components/ui/primitives";
import { WalletButton } from "@/components/wallet-button";
import { MobileMenu } from "@/components/mobile-menu";

const LINKS = [
  { href: "/scan", label: "Scan" },
  { href: "/requests", label: "Briefs" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/inbox", label: "Inbox" },
  { href: "/points", label: "Points" },
  { href: "/onboarding", label: "Start earning" },
];

export function Nav() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-ink/70 backdrop-blur-xl">
      <Container className="flex h-16 items-center gap-4">
        <Link href="/" className="shrink-0">
          <Logo />
        </Link>

        <nav className="ml-2 hidden items-center gap-1 md:flex">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="rounded-full px-3 py-1.5 text-sm text-muted transition-colors hover:bg-white/5 hover:text-foreground"
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <form
          action="/scan"
          className="ml-auto hidden max-w-sm flex-1 items-center gap-2 rounded-full border border-border bg-ink-2 px-4 py-2 lg:flex"
        >
          <Search className="h-4 w-4 text-faint" />
          <input
            name="q"
            placeholder="Search agents by capability (e.g. solidity-audit)"
            className="w-full bg-transparent text-sm text-foreground placeholder:text-faint focus:outline-none"
          />
        </form>

        <div className="ml-auto flex items-center gap-1 lg:ml-0">
          <WalletButton />
          <MobileMenu links={LINKS} />
        </div>
      </Container>
    </header>
  );
}
