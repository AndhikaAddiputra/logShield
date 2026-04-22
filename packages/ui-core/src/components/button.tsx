import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { cn } from "../lib/cn.js";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "outline"
  | "ghost"
  | "destructive";

export type ButtonSize = "sm" | "md" | "lg";

const variants: Record<ButtonVariant, string> = {
  primary:
    "bg-ls-navy text-white hover:bg-ls-navy-deep shadow-sm disabled:opacity-50",
  secondary:
    "bg-ls-border/60 text-ls-foreground hover:bg-ls-border disabled:opacity-50",
  outline:
    "border border-ls-border bg-white text-ls-navy hover:bg-ls-sidebar disabled:opacity-50",
  ghost: "text-ls-muted hover:bg-ls-sidebar hover:text-ls-foreground",
  destructive:
    "bg-ls-danger-soft text-ls-danger hover:bg-ls-danger/15 border border-ls-danger/20",
};

const sizes: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-xs gap-1.5 rounded-ls-sm",
  md: "h-10 px-4 text-sm gap-2 rounded-ls-sm",
  lg: "h-11 px-5 text-sm gap-2 rounded-ls",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    {
      className,
      variant = "primary",
      size = "md",
      leftIcon,
      rightIcon,
      children,
      type = "button",
      ...props
    },
    ref
  ) {
    return (
      <button
        ref={ref}
        type={type}
        className={cn(
          "inline-flex items-center justify-center font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ls-accent focus-visible:ring-offset-2 disabled:pointer-events-none",
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      >
        {leftIcon}
        {children}
        {rightIcon}
      </button>
    );
  }
);
