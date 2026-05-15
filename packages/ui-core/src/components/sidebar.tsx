import type { LucideIcon } from "lucide-react";
import {
  ChevronLeft,
  FilePlus2,
  HelpCircle,
  RefreshCw,
} from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";
import { cn } from "../lib/cn.js";
import { Avatar } from "./avatar.js";
import { Button } from "./button.js";

export interface SidebarNavItem {
  id: string;
  label: string;
  icon: LucideIcon;
}

export interface LogShieldSidebarProps {
  /** e.g. Disaster Response v1.2 */
  productSubtitle?: string;
  brandName?: string;
  brandLogoSrc?: string;
  brandLogoAlt?: string;
  navItems: SidebarNavItem[];
  activeId: string;
  onNavigate?: (id: string) => void;
  onNewReport?: () => void;
  syncSlot?: ReactNode;
  onSupportClick?: () => void;
  user: { name: string; role: string; avatarSrc?: string | null };
  className?: string;
}

export function LogShieldSidebar({
  productSubtitle,
  brandName = "LogShield",
  brandLogoSrc,
  brandLogoAlt,
  navItems,
  activeId,
  onNavigate,
  onNewReport,
  syncSlot,
  onSupportClick,
  user,
  className,
}: LogShieldSidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        "flex w-64 shrink-0 flex-col border-r border-ls-sidebar-border bg-ls-sidebar transition-all duration-300",
        isCollapsed && "w-20",
        className
      )}
    >
      <div className="border-b border-ls-sidebar-border px-5 py-6">
        <div
          className={cn(
            "flex gap-3",
            isCollapsed ? "flex-col items-center" : "items-center justify-between"
          )}
        >
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-ls-sm border border-ls-border bg-white"
              )}
            >
              {brandLogoSrc ? (
                <img
                  src={brandLogoSrc}
                  alt={brandLogoAlt ?? brandName}
                  className="size-7 object-contain"
                />
              ) : (
                <span className="text-sm font-bold text-ls-navy">LS</span>
              )}
            </div>
            {!isCollapsed && (
              <div className="min-w-0">
                <p className="text-lg font-bold tracking-tight text-ls-navy">{brandName}</p>
                {productSubtitle ? (
                  <p className="mt-1 text-xs text-ls-muted">{productSubtitle}</p>
                ) : null}
              </div>
            )}
          </div>
          <div className="flex shrink-0 items-center justify-center">
            <button
              type="button"
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="flex size-8 items-center justify-center rounded-full border border-ls-border bg-white transition-colors hover:bg-gray-50"
              aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              <ChevronLeft
                className={cn("size-4 transition-transform", isCollapsed && "rotate-180")}
                aria-hidden
              />
            </button>
          </div>
        </div>
      </div>
      <nav className="flex flex-1 flex-col gap-1 px-3 py-4" aria-label="Utama">
        {navItems.map((item) => {
          const active = item.id === activeId;
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onNavigate?.(item.id)}
              className={cn(
                "flex w-full items-center gap-3 rounded-ls-sm px-3 py-2.5 text-left text-sm font-medium transition-colors",
                active
                  ? "bg-ls-sidebar-active text-ls-navy shadow-[inset_3px_0_0_0_#2563eb]"
                  : "text-ls-muted hover:bg-white/80 hover:text-ls-foreground",
                isCollapsed && "justify-center px-0"
              )}
              title={isCollapsed ? item.label : undefined}
            >
              <Icon className="size-5 shrink-0" aria-hidden />
              {!isCollapsed && item.label}
            </button>
          );
        })}
      </nav>
      <div className={cn("mt-auto space-y-3 border-t border-ls-sidebar-border px-4 py-4", isCollapsed && "hidden")}>
        <Button
          type="button"
          variant="primary"
          size="lg"
          className="w-full rounded-ls"
          leftIcon={<FilePlus2 className="size-4" />}
          onClick={onNewReport}
        >
          New Report
        </Button>
        <div className="flex flex-col gap-2 text-xs text-ls-muted">
          {syncSlot ?? (
            <button
              type="button"
              className="flex items-center gap-2 rounded-ls-sm px-2 py-1.5 text-left hover:bg-white/80 hover:text-ls-foreground"
            >
              <RefreshCw className="size-3.5 shrink-0" aria-hidden />
              Offline Sync
            </button>
          )}
          <button
            type="button"
            onClick={onSupportClick}
            className="flex items-center gap-2 rounded-ls-sm px-2 py-1.5 text-left hover:bg-white/80 hover:text-ls-foreground"
          >
            <HelpCircle className="size-3.5 shrink-0" aria-hidden />
            Support
          </button>
        </div>
        <div className="flex items-center gap-3 rounded-ls-sm border border-ls-border bg-white px-3 py-2 shadow-sm">
          <Avatar alt={user.name} src={user.avatarSrc} size="md" />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-ls-foreground">
              {user.name}
            </p>
            <p className="truncate text-xs text-ls-muted">{user.role}</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
