import type { ReactNode } from "react";
import { cn } from "../lib/cn.js";

export interface AppLayoutProps {
  sidebar: ReactNode;
  children: ReactNode;
  className?: string;
}

/** Web dashboard shell: sidebar + main scroll area */
export function AppLayout({ sidebar, children, className }: AppLayoutProps) {
  return (
    <div className={cn("flex min-h-screen bg-ls-surface text-ls-foreground", className)}>
      {sidebar}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-auto">
        {children}
      </div>
    </div>
  );
}
