import { Menu, CloudOff, Cloud } from "lucide-react";
import { cn } from "../lib/cn.js";
import { Button } from "./button.js";

export interface MobileHeaderProps {
  brand?: string;
  onMenuPress?: () => void;
  /** When true, show offline pill */
  offline?: boolean;
  className?: string;
}

export function MobileHeader({
  brand = "LOG-SHIELD",
  onMenuPress,
  offline,
  className,
}: MobileHeaderProps) {
  return (
    <header
      className={cn(
        "flex items-center justify-between border-b border-ls-border bg-white px-4 py-3",
        className
      )}
    >
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="px-2 text-ls-navy"
        onClick={onMenuPress}
        aria-label="Menu"
      >
        <Menu className="size-6" />
      </Button>
      <span className="text-sm font-bold tracking-wide text-ls-navy">{brand}</span>
      <div
        className={cn(
          "flex items-center gap-1 rounded-full border px-2 py-1 text-[10px] font-bold uppercase tracking-wide",
          offline
            ? "border-ls-border bg-ls-sidebar text-ls-muted"
            : "border-ls-success/30 bg-ls-success-soft text-ls-success"
        )}
        role="status"
      >
        {offline ? (
          <CloudOff className="size-3.5" aria-hidden />
        ) : (
          <Cloud className="size-3.5" aria-hidden />
        )}
        {offline ? "Offline" : "Online"}
      </div>
    </header>
  );
}
