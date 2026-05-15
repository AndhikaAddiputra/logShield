import type { ReactNode } from "react";
import { Bell } from "lucide-react";
import { cn } from "../lib/cn.js";
import { SearchInput } from "./search-input.js";
import { Button } from "./button.js";

export interface PageHeaderProps {
  title: string;
  searchPlaceholder?: string;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  /** Set false to hide search (rare) */
  showSearch?: boolean;
  actions?: ReactNode;
  showNotifications?: boolean;
  onNotificationClick?: () => void;
  className?: string;
}

export function PageHeader({
  title,
  searchPlaceholder = "Search...",
  searchValue,
  onSearchChange,
  showSearch = true,
  actions,
  showNotifications = true,
  onNotificationClick,
  className,
}: PageHeaderProps) {
  const controlled = searchValue !== undefined;

  return (
    <header
      className={cn(
        "flex flex-col gap-4 border-b border-ls-border bg-white px-6 py-5 lg:flex-row lg:items-center lg:justify-between",
        className
      )}
    >
      <h1 className="text-2xl font-bold tracking-tight text-ls-navy">{title}</h1>
      <div className="flex flex-1 flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-end lg:max-w-3xl">
        {showSearch ? (
          <SearchInput
            placeholder={searchPlaceholder}
            {...(controlled
              ? { value: searchValue, onChange: (e) => onSearchChange?.(e.target.value) }
              : { defaultValue: "", onChange: (e) => onSearchChange?.(e.target.value) })}
            className="max-w-none sm:max-w-md"
          />
        ) : null}
        <div className="flex items-center justify-end gap-2">
          {actions}
          {showNotifications ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="relative text-amber-600"
              onClick={onNotificationClick}
              aria-label="Notifikasi"
            >
              <Bell className="size-5" />
              <span className="absolute right-1 top-1 size-2 rounded-full bg-amber-500" />
            </Button>
          ) : null}
        </div>
      </div>
    </header>
  );
}
