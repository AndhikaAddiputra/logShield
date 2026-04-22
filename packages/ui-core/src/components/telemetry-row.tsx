import { cn } from "../lib/cn.js";

export interface TelemetryRowProps {
  label: string;
  value: string;
  /** danger styling for low signal etc. */
  valueTone?: "default" | "danger";
  className?: string;
}

export function TelemetryRow({
  label,
  value,
  valueTone = "default",
  className,
}: TelemetryRowProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-4 text-sm",
        className
      )}
    >
      <span className="font-medium text-ls-muted">{label}</span>
      <span
        className={cn(
          "font-bold",
          valueTone === "danger" ? "text-ls-danger" : "text-ls-foreground"
        )}
      >
        {value}
      </span>
    </div>
  );
}
