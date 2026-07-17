import { cn } from "@/lib/utils";

export function AgentumMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 500 500" className={cn("h-7 w-7", className)} aria-hidden>
      <defs>
        <radialGradient id="agm-rg" gradientUnits="userSpaceOnUse" cx="250" cy="250" r="195">
          <stop offset="0" stopColor="#FFFFFF" />
          <stop offset="0.1" stopColor="#E6FFD8" />
          <stop offset="0.38" stopColor="#A8FF60" />
          <stop offset="1" stopColor="#14F195" />
        </radialGradient>
      </defs>
      <g fill="url(#agm-rg)">
        {[0, 90, 180, 270].map((r) => (
          <path
            key={r}
            d="M250 250 C213 205 172 190 172 135 A78 78 0 1 1 328 135 C328 190 287 205 250 250 Z"
            transform={`rotate(${r} 250 250)`}
          />
        ))}
      </g>
    </svg>
  );
}

export function Logo({ className, showWord = true }: { className?: string; showWord?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-ink-3 ring-1 ring-border-strong">
        <AgentumMark className="h-6 w-6" />
      </span>
      {showWord && (
        <span className="text-[19px] font-semibold tracking-tight text-foreground">agentum</span>
      )}
    </span>
  );
}
