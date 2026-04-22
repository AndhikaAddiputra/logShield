import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "../lib/cn.js";

export function Card({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-ls-lg border border-ls-border bg-ls-card text-ls-foreground shadow-ls",
        className
      )}
      {...props}
    />
  );
}

export function CardHeader({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex flex-col gap-1 border-b border-ls-border px-5 py-4 sm:flex-row sm:items-start sm:justify-between",
        className
      )}
      {...props}
    />
  );
}

export function CardTitle({
  className,
  ...props
}: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn("text-lg font-semibold tracking-tight text-ls-navy", className)}
      {...props}
    />
  );
}

export function CardDescription({
  className,
  ...props
}: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cn("text-sm text-ls-muted", className)} {...props} />
  );
}

export function CardAction({ children }: { children?: ReactNode }) {
  return <div className="shrink-0">{children}</div>;
}

export function CardContent({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-5", className)} {...props} />;
}

export function CardFooter({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex items-center justify-between border-t border-ls-border bg-ls-sidebar/50 px-5 py-3 text-sm text-ls-foreground",
        className
      )}
      {...props}
    />
  );
}
