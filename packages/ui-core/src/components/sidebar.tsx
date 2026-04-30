import type { LucideIcon } from "lucide-react";
import {
  ChevronLeft,
  ChevronRight,
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
  productSubtitle: string;
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
        "flex shrink-0 flex-col border-r border-ls-sidebar-border bg-ls-sidebar transition-all duration-300 ease-in-out",
        isCollapsed ? "w-20" : "w-64",
        className
      )}
    >
      <div className="border-b border-ls-sidebar-border px-5 py-6">
        {!isCollapsed && (
          <>
            <p className="text-lg font-bold tracking-tight text-ls-navy">LOG-SHIELD</p>
            <p className="mt-1 text-xs text-ls-muted">{productSubtitle}</p>
          </>
        )}
        <button
          type="button"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className={cn(
            "mt-2 flex items-center justify-center rounded-ls-sm p-1.5 transition-colors hover:bg-white/80",
            isCollapsed && "mt-0"
          )}
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isCollapsed ? (
            <ChevronRight className="size-5 text-ls-muted" />
          ) : (
            <ChevronLeft className="size-5 text-ls-muted" />
          )}
        </button>
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
                "flex items-center gap-3 rounded-ls-sm px-3 py-2.5 text-left text-sm font-medium transition-colors",
                isCollapsed && "w-9 px-0 justify-center",
                !isCollapsed && "w-full",
                active
                  ? "bg-ls-sidebar-active text-ls-navy shadow-[inset_3px_0_0_0_#2563eb]"
                  : "text-ls-muted hover:bg-white/80 hover:text-ls-foreground"
              )}
              title={isCollapsed ? item.label : undefined}
            >
              <Icon className="size-5 shrink-0" aria-hidden />
              {!isCollapsed && item.label}
            </button>
          );
        })}
      </nav>
      <div className="mt-auto space-y-3 border-t border-ls-sidebar-border px-4 py-4">
        {!isCollapsed && (
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
        )}
        <div className={cn(
          "flex flex-col gap-2 text-xs text-ls-muted",
          isCollapsed && "items-center"
        )}>
          {syncSlot ?? (
            <button
              type="button"
              className={cn(
                "flex items-center gap-2 rounded-ls-sm px-2 py-1.5 text-left hover:bg-white/80 hover:text-ls-foreground",
                isCollapsed && "p-1.5"
              )}
              title={isCollapsed ? "Offline Sync" : undefined}
            >
              <RefreshCw className="size-3.5 shrink-0" aria-hidden />
              {!isCollapsed && "Offline Sync"}
            </button>
          )}
          <button
            type="button"
            onClick={onSupportClick}
            className={cn(
              "flex items-center gap-2 rounded-ls-sm px-2 py-1.5 text-left hover:bg-white/80 hover:text-ls-foreground",
              isCollapsed && "p-1.5"
            )}
            title={isCollapsed ? "Support" : undefined}
          >
            <HelpCircle className="size-3.5 shrink-0" aria-hidden />
            {!isCollapsed && "Support"}
          </button>
        </div>
        {!isCollapsed && (
          <div className="flex items-center gap-3 rounded-ls-sm border border-ls-border bg-white px-3 py-2 shadow-sm">
            <Avatar alt={user.name} src={user.avatarSrc} size="md" />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-ls-foreground">
                {user.name}
              </p>
              <p className="truncate text-xs text-ls-muted">{user.role}</p>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
