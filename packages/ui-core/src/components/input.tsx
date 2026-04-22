import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "../lib/cn.js";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, error, type = "text", ...props },
  ref
) {
  return (
    <input
      ref={ref}
      type={type}
      className={cn(
        "h-10 w-full rounded-ls-sm border border-ls-border bg-white px-3 text-sm text-ls-foreground shadow-sm transition-colors placeholder:text-ls-muted/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ls-accent/40 disabled:cursor-not-allowed disabled:opacity-50",
        error && "border-ls-danger focus-visible:ring-ls-danger/40",
        className
      )}
      {...props}
    />
  );
});
