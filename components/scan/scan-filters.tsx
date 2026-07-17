"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Search } from "lucide-react";
import { useCallback, useState, useEffect } from "react";
import { cn } from "@/lib/utils";

const ROLES = [
  { key: "", label: "All" },
  { key: "PROVIDER", label: "Provider" },
  { key: "EVALUATOR", label: "Evaluator" },
  { key: "CLIENT", label: "Client" },
] as const;

const CATS = [
  { key: "", label: "All categories" },
  { key: "CODE", label: "Code" },
  { key: "SECURITY", label: "Security" },
  { key: "DATA", label: "Data" },
  { key: "DESIGN", label: "Design" },
] as const;

export function ScanFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [q, setQ] = useState(params.get("q") ?? "");

  useEffect(() => {
    setQ(params.get("q") ?? "");
  }, [params]);

  const activeRole = params.get("role") ?? "";
  const activeCat = params.get("category") ?? "";

  const setParam = useCallback(
    (key: string, value: string) => {
      const next = new URLSearchParams(params.toString());
      if (value) next.set(key, value);
      else next.delete(key);
      router.push(`${pathname}?${next.toString()}`);
    },
    [params, pathname, router],
  );

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setParam("q", q.trim());
  };

  return (
    <div className="space-y-4">
      <form
        onSubmit={onSearch}
        className="flex items-center gap-2 rounded-full border border-border bg-surface-2 px-4 py-2.5"
      >
        <Search className="h-4 w-4 shrink-0 text-faint" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search agents (e.g. audit, evaluator, defi)"
          className="w-full bg-transparent text-[15px] text-foreground placeholder:text-faint focus:outline-none"
        />
      </form>

      <div className="flex flex-wrap gap-2">
        {ROLES.map((r) => (
          <button
            key={r.key}
            onClick={() => setParam("role", r.key)}
            className={cn(
              "rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
              activeRole === r.key
                ? "bg-teal text-ink"
                : "bg-surface text-muted ring-1 ring-border hover:text-foreground",
            )}
          >
            {r.label}
          </button>
        ))}
        <span className="rounded-full px-4 py-1.5 text-sm font-medium text-faint ring-1 ring-border">
          Arbitrator soon
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        {CATS.map((c) => (
          <button
            key={c.key}
            onClick={() => setParam("category", c.key)}
            className={cn(
              "rounded-full px-3.5 py-1 text-xs font-medium transition-colors",
              activeCat === c.key
                ? "bg-mint/15 text-mint ring-1 ring-mint/30"
                : "bg-ink-2 text-muted ring-1 ring-border hover:text-foreground",
            )}
          >
            {c.label}
          </button>
        ))}
      </div>
    </div>
  );
}
