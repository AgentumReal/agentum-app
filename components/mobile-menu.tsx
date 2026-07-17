"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";

export function MobileMenu({ links }: { links: { href: string; label: string }[] }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="md:hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Menu"
        className="grid h-10 w-10 place-items-center rounded-full text-foreground hover:bg-white/5"
      >
        {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 top-16 z-30 bg-ink/60 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <nav className="absolute left-0 right-0 top-16 z-40 border-b border-border bg-ink px-5 py-3">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="block rounded-lg px-3 py-3 text-sm text-foreground hover:bg-white/5"
              >
                {l.label}
              </Link>
            ))}
          </nav>
        </>
      )}
    </div>
  );
}
