import { cn } from "../lib/cn.js";

export type StatusBannerVariant = "success" | "warning" | "danger" | "neutral";

const styles: Record<StatusBannerVariant, string> = {
  success: "bg-ls-success text-white",
  warning: "bg-ls-warning text-white",
  danger: "bg-ls-danger text-white",
  neutral: "bg-ls-sidebar text-ls-foreground border border-ls-border",
};

export interface StatusBannerProps {
  message: string;
  variant?: StatusBannerVariant;
  /** Optional leading dot */
  showDot?: boolean;
  className?: string;
}

export function StatusBanner({
  message,
  variant = "success",
  showDot = true,
  className,
}: StatusBannerProps) {
  return (
    <div
      role="status"
      className={cn(
        "flex items-center gap-2 px-4 py-2.5 text-sm font-semibold",
        styles[variant],
        className
      )}
    >
      {showDot ? (
        <span
          className="size-2 shrink-0 rounded-full bg-white/90"
          aria-hidden
        />
      ) : null}
      {message}
    </div>
  );
}
