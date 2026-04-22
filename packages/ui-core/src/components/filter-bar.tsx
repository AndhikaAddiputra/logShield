import { Filter } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "../lib/cn.js";
import { Button } from "./button.js";

export interface FilterBarProps {
  children: ReactNode;
  /** Right-aligned meta, e.g. record count */
  meta?: ReactNode;
  onFilterClick?: () => void;
  className?: string;
}

export function FilterBar({
  children,
  meta,
  onFilterClick,
  className,
}: FilterBarProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 border-b border-ls-border bg-white px-6 py-4 sm:flex-row sm:items-center sm:justify-between",
        className
      )}
    >
      <div className="flex flex-1 flex-wrap items-center gap-2">{children}</div>
      <div className="flex items-center gap-3">
        {onFilterClick ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="px-2"
            onClick={onFilterClick}
            aria-label="Filter lanjutan"
          >
            <Filter className="size-4" />
          </Button>
        ) : null}
        {meta ? (
          <span className="text-sm font-medium text-ls-muted">{meta}</span>
        ) : null}
      </div>
    </div>
  );
}
