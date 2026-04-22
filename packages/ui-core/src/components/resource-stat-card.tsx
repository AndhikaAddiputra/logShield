import type { LucideIcon } from "lucide-react";
import { cn } from "../lib/cn.js";

export interface ResourceStatCardProps {
  title: string;
  value: string;
  unit?: string;
  icon?: LucideIcon;
  /** 0–100 */
  progressPercent: number;
  className?: string;
}

export function ResourceStatCard({
  title,
  value,
  unit,
  icon: Icon,
  progressPercent,
  className,
}: ResourceStatCardProps) {
  const pct = Math.min(100, Math.max(0, progressPercent));
  return (
    <div
      className={cn(
        "rounded-ls-lg border border-ls-border bg-white p-4 shadow-ls",
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-ls-muted">
            {title}
          </p>
          <p className="mt-1 text-2xl font-bold text-ls-navy">
            {value}
            {unit ? (
              <span className="ml-1 text-sm font-semibold text-ls-muted">
                {unit}
              </span>
            ) : null}
          </p>
        </div>
        {Icon ? (
          <div className="rounded-ls-sm bg-ls-sidebar p-2 text-ls-navy">
            <Icon className="size-5" aria-hidden />
          </div>
        ) : null}
      </div>
      <div
        className="mt-4 h-2 overflow-hidden rounded-full bg-ls-sidebar"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className="h-full rounded-full bg-ls-accent transition-[width]"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
