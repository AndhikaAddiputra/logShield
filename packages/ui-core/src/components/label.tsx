import type { LabelHTMLAttributes } from "react";
import { cn } from "../lib/cn.js";

export function Label({
  className,
  ...props
}: LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn(
        "text-xs font-semibold uppercase tracking-wide text-ls-navy",
        className
      )}
      {...props}
    />
  );
}
