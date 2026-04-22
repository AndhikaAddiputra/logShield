import { forwardRef, type SelectHTMLAttributes } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "../lib/cn.js";

export interface SelectFieldProps extends SelectHTMLAttributes<HTMLSelectElement> {}

export const SelectField = forwardRef<HTMLSelectElement, SelectFieldProps>(
  function SelectField({ className, children, ...props }, ref) {
    return (
      <div className="relative">
        <select
          ref={ref}
          className={cn(
            "h-10 w-full appearance-none rounded-ls-sm border border-ls-border bg-white py-2 pl-3 pr-9 text-sm text-ls-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ls-accent/40 disabled:opacity-50",
            className
          )}
          {...props}
        >
          {children}
        </select>
        <ChevronDown
          className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-ls-muted"
          aria-hidden
        />
      </div>
    );
  }
);
