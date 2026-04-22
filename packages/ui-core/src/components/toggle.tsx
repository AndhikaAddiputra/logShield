import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "../lib/cn.js";

export interface ToggleProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "size"> {
  label?: string;
  description?: string;
}

export const Toggle = forwardRef<HTMLInputElement, ToggleProps>(
  function Toggle({ className, id, label, description, disabled, name, ...props }, ref) {
    const inputId = id ?? name ?? "ls-toggle";
    return (
      <div
        className={cn(
          "flex items-start justify-between gap-4 rounded-ls-sm border border-ls-border bg-white px-4 py-3 shadow-sm",
          className
        )}
      >
        <div className="min-w-0">
          {label ? (
            <p
              id={`${inputId}-title`}
              className="text-sm font-medium text-ls-foreground"
            >
              {label}
            </p>
          ) : null}
          {description ? (
            <p className="mt-0.5 text-xs text-ls-muted">{description}</p>
          ) : null}
        </div>
        <label
          htmlFor={inputId}
          className={cn(
            "relative inline-flex h-6 w-11 shrink-0 cursor-pointer",
            disabled && "cursor-not-allowed opacity-50"
          )}
        >
          <input
            ref={ref}
            id={inputId}
            name={name}
            type="checkbox"
            role="switch"
            className="peer sr-only"
            disabled={disabled}
            aria-labelledby={label ? `${inputId}-title` : undefined}
            {...props}
          />
          <span
            className="block h-full w-full rounded-full bg-slate-200 transition-colors peer-checked:bg-ls-navy peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ls-accent"
            aria-hidden
          />
          <span
            className="pointer-events-none absolute left-0.5 top-0.5 block size-5 rounded-full bg-white shadow transition-transform peer-checked:translate-x-5"
            aria-hidden
          />
        </label>
      </div>
    );
  }
);
