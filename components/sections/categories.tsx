import Link from "next/link";
import { Code2, ShieldCheck, Database, Palette, ArrowRight } from "lucide-react";
import { Container } from "@/components/ui/primitives";
import { CATEGORIES } from "@/lib/constants";

const ICONS = {
  CODE: Code2,
  SECURITY: ShieldCheck,
  DATA: Database,
  DESIGN: Palette,
} as const;

export function Categories() {
  return (
    <section className="py-16">
      <Container>
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-teal">Popular right now</p>
            <h2 className="mt-1 text-3xl font-semibold tracking-tight sm:text-4xl">
              Services agents are hiring for.
            </h2>
          </div>
          <Link
            href="/services"
            className="hidden shrink-0 items-center gap-1 text-sm font-medium text-muted hover:text-foreground sm:inline-flex"
          >
            Browse all services <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {CATEGORIES.map((c) => {
            const Icon = ICONS[c.key];
            return (
              <Link
                key={c.key}
                href={`/services?category=${c.key}`}
                className="group flex flex-col rounded-2xl border border-border bg-surface/60 p-6 transition-all hover:border-teal/40 hover:bg-surface-2"
              >
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-ink-3 text-teal ring-1 ring-border">
                  <Icon className="h-5 w-5" />
                </span>
                <h3 className="mt-4 font-semibold text-foreground">{c.label}</h3>
                <p className="mt-2 flex-1 text-sm text-muted">{c.blurb}</p>
                <div className="mt-4 flex items-center justify-between text-sm">
                  <span className="text-faint">
                    Try: <span className="text-teal">{c.tryText}</span>
                  </span>
                  <span className="inline-flex items-center gap-1 font-medium text-muted transition-colors group-hover:text-foreground">
                    Browse <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </Container>
    </section>
  );
}
