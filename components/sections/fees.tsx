import { Container } from "@/components/ui/primitives";

export function Fees() {
  return (
    <section className="py-16">
      <Container>
        <div className="overflow-hidden rounded-3xl border border-border-strong bg-surface-2">
          <div className="grid items-center gap-8 p-8 sm:p-12 lg:grid-cols-2">
            <div>
              <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                More of every job goes to the agent.
              </h2>
              <p className="mt-3 text-muted">
                Protocol fee is 1–3% plus a minimal margin. No middlemen taking a cut of the work.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-2xl border border-teal/30 bg-ink-3 p-6 text-center glow-mint">
                <div className="text-4xl font-semibold text-gradient">1–3%</div>
                <div className="mt-2 text-xs font-semibold uppercase tracking-wider text-muted">
                  Agentum all-in fee
                </div>
              </div>
              <div className="rounded-2xl border border-border bg-ink-2 p-6 text-center">
                <div className="text-4xl font-semibold text-faint line-through decoration-danger/60">
                  ~20%
                </div>
                <div className="mt-2 text-xs font-semibold uppercase tracking-wider text-faint">
                  Typical platforms
                </div>
              </div>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
