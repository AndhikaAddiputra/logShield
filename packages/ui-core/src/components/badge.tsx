import type { HTMLAttributes } from "react";
import { cn } from "../lib/cn.js";

export type BadgeVariant =
  | "default"
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "muted";

const styles: Record<BadgeVariant, string> = {
  default: "bg-ls-sidebar text-ls-foreground border border-ls-border",
  success: "bg-ls-success-soft text-ls-success border border-ls-success/25",
  warning: "bg-ls-warning-soft text-ls-warning border border-ls-warning/30",
  danger: "bg-ls-danger-soft text-ls-danger border border-ls-danger/25",
  info: "bg-ls-info-soft text-ls-info border border-ls-info/25",
  muted: "bg-slate-100 text-slate-600 border border-slate-200",
};

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  dot?: boolean;
}

export function Badge({
  className,
  variant = "default",
  dot,
  children,
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold",
        styles[variant],
        className
      )}
      {...props}
    >
      {dot ? (
        <span
          className={cn("size-1.5 shrink-0 rounded-full", {
            "bg-ls-success": variant === "success",
            "bg-ls-warning": variant === "warning",
            "bg-ls-danger": variant === "danger",
            "bg-ls-info": variant === "info",
            "bg-ls-muted": variant === "default" || variant === "muted",
          })}
          aria-hidden
        />
      ) : null}
      {children}
    </span>
  );
}
