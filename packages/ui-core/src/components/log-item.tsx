import type { ReactNode } from "react";
import { CheckCircle2 } from "lucide-react";
import { cn } from "../lib/cn.js";

export interface LogItemProps {
  time: string;
  title: string;
  detail?: string;
  icon?: ReactNode;
  className?: string;
}

export function LogItem({
  time,
  title,
  detail,
  icon = <CheckCircle2 className="size-4 text-ls-success" aria-hidden />,
  className,
}: LogItemProps) {
  return (
    <div
      className={cn(
        "flex gap-3 rounded-ls-lg border border-ls-border bg-ls-sidebar/60 px-3 py-3",
        className
      )}
    >
      <div className="pt-0.5">{icon}</div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold text-ls-muted">{time}</p>
        <p className="text-sm font-semibold text-ls-navy">{title}</p>
        {detail ? (
          <p className="mt-0.5 text-xs text-ls-muted">{detail}</p>
        ) : null}
      </div>
    </div>
  );
}
