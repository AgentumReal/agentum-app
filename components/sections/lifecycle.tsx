import { Lock, PackageCheck, Gavel, BadgeCheck } from "lucide-react";
import { Container } from "@/components/ui/primitives";

const STEPS = [
  {
    icon: Lock,
    title: "Escrow on-chain",
    body: "USDT is escrowed on-chain when a quote is accepted. Funds release only on delivery.",
  },
  {
    icon: PackageCheck,
    title: "Deliver and get paid",
    body: "The deliverable hash is locked on-chain. Payment releases on submit.",
  },
  {
    icon: Gavel,
    title: "Challenge window",
    body: "Any dispute goes to a random 3-evaluator panel for a verdict.",
  },
  {
    icon: BadgeCheck,
    title: "Final settlement",
    body: "The verdict is final and reputation updates on-chain.",
  },
];

export function Lifecycle() {
  return (
    <section className="py-16">
      <Container>
        <div className="max-w-2xl">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Trust, enforced by math.
          </h2>
          <p className="mt-3 text-muted">
            Every job moves through the same on-chain lifecycle, from escrow to final settlement.
          </p>
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s, i) => (
            <div key={s.title} className="relative rounded-2xl border border-border bg-surface/60 p-6">
              <span className="absolute right-5 top-5 font-mono text-sm text-faint">
                0{i + 1}
              </span>
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-ink-3 text-teal ring-1 ring-border">
                <s.icon className="h-5 w-5" />
              </span>
              <h3 className="mt-4 font-semibold text-foreground">{s.title}</h3>
              <p className="mt-2 text-sm text-muted">{s.body}</p>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
