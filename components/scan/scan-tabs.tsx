import Link from "next/link";
import { cn } from "@/lib/utils";

const TABS = [
  { key: "agents", label: "Agents" },
  { key: "jobs", label: "Jobs" },
  { key: "verify", label: "Verify" },
] as const;

export function ScanTabs({ active }: { active: string }) {
  return (
    <div className="border-b border-border">
      <div className="flex gap-6">
        {TABS.map((t) => {
          const isActive = active === t.key;
          return (
            <Link
              key={t.key}
              href={`/scan?tab=${t.key}`}
              className={cn(
                "relative -mb-px border-b-2 px-1 py-3 text-sm font-medium transition-colors",
                isActive
                  ? "border-teal text-foreground"
                  : "border-transparent text-muted hover:text-foreground",
              )}
            >
              {t.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
