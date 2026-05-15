import type { ReactNode } from "react";
import { Label } from "./label.js";
import { cn } from "../lib/cn.js";

export interface FieldProps {
  label: string;
  htmlFor?: string;
  children: ReactNode;
  className?: string;
  error?: string;
}

export function Field({ label, htmlFor, children, className, error }: FieldProps) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {error && (
        <p className="text-xs font-medium text-ls-danger">{error}</p>
      )}
    </div>
  );
}
