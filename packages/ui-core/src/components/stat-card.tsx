import type { LucideIcon } from "lucide-react";
import { cn } from "../lib/cn.js";
import { Card, CardContent } from "./card.js";

export type StatTone = "default" | "danger" | "success" | "muted";

const toneValue: Record<StatTone, string> = {
  default: "text-ls-navy",
  danger: "text-ls-danger",
  success: "text-ls-success",
  muted: "text-ls-muted",
};

export interface StatCardProps {
  label: string;
  value: string;
  sublabel?: string;
  icon?: LucideIcon;
  tone?: StatTone;
  className?: string;
}

export function StatCard({
  label,
  value,
  sublabel,
  icon: Icon,
  tone = "default",
  className,
}: StatCardProps) {
  return (
    <Card className={cn("shadow-ls-md", className)}>
      <CardContent className="flex flex-col gap-2 p-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-wide text-ls-muted">
            {label}
          </p>
          <p className={cn("text-2xl font-bold tabular-nums", toneValue[tone])}>
            {value}
          </p>
          {sublabel ? (
            <p className="text-xs text-ls-muted">{sublabel}</p>
          ) : null}
        </div>
        {Icon ? (
          <div className="rounded-ls-sm bg-ls-sidebar p-2 text-ls-navy">
            <Icon className="size-5" aria-hidden />
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
