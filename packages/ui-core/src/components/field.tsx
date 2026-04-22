import type { ReactNode } from "react";
import { Label } from "./label.js";
import { cn } from "../lib/cn.js";

export interface FieldProps {
  label: string;
  htmlFor?: string;
  children: ReactNode;
  className?: string;
}

export function Field({ label, htmlFor, children, className }: FieldProps) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  );
}
