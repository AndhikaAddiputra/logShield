import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "../lib/cn.js";
import { Button } from "./button.js";

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  summary?: string;
  className?: string;
}

function pageItems(current: number, total: number): (number | "ellipsis")[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  const items: (number | "ellipsis")[] = [1];
  if (current > 3) items.push("ellipsis");
  for (
    let p = Math.max(2, current - 1);
    p <= Math.min(total - 1, current + 1);
    p += 1
  ) {
    items.push(p);
  }
  if (current < total - 2) items.push("ellipsis");
  if (total > 1) items.push(total);
  return items;
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  summary,
  className,
}: PaginationProps) {
  const items = pageItems(currentPage, totalPages);

  return (
    <div
      className={cn(
        "flex flex-col gap-3 border-t border-ls-border pt-4 sm:flex-row sm:items-center sm:justify-between",
        className
      )}
    >
      {summary ? (
        <p className="text-sm text-ls-muted">{summary}</p>
      ) : (
        <span />
      )}
      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="px-2"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
          aria-label="Halaman sebelumnya"
        >
          <ChevronLeft className="size-4" />
        </Button>
        {items.map((item, i) =>
          item === "ellipsis" ? (
            <span key={`e-${i}`} className="px-2 text-ls-muted">
              …
            </span>
          ) : (
            <Button
              key={item}
              type="button"
              variant={item === currentPage ? "primary" : "outline"}
              size="sm"
              className={cn(
                "min-w-9 border-ls-border px-0 font-normal",
                item === currentPage && "pointer-events-none font-semibold"
              )}
              onClick={() => onPageChange(item)}
            >
              {item}
            </Button>
          )
        )}
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="px-2"
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(currentPage + 1)}
          aria-label="Halaman berikutnya"
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}
