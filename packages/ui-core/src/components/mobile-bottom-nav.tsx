import type { LucideIcon } from "lucide-react";
import { cn } from "../lib/cn.js";

export interface MobileNavItem {
  id: string;
  label: string;
  icon: LucideIcon;
}

export interface MobileBottomNavProps {
  items: MobileNavItem[];
  activeId: string;
  onChange?: (id: string) => void;
  className?: string;
}

export function MobileBottomNav({
  items,
  activeId,
  onChange,
  className,
}: MobileBottomNavProps) {
  return (
    <nav
      className={cn(
        "fixed bottom-0 left-0 right-0 z-40 flex border-t border-ls-border bg-white px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1 shadow-ls-md",
        className
      )}
      aria-label="Navigasi utama"
    >
      {items.map((item) => {
        const active = item.id === activeId;
        const Icon = item.icon;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onChange?.(item.id)}
            className={cn(
              "flex flex-1 flex-col items-center gap-1 rounded-ls-sm py-2 text-[10px] font-bold uppercase tracking-wide transition-colors",
              active
                ? "bg-ls-navy text-white"
                : "text-ls-navy hover:bg-ls-sidebar"
            )}
          >
            <Icon className="size-5" aria-hidden />
            {item.label}
          </button>
        );
      })}
    </nav>
  );
}
