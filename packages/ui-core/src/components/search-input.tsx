import { forwardRef, type InputHTMLAttributes } from "react";
import { Search } from "lucide-react";
import { cn } from "../lib/cn.js";

export interface SearchInputProps extends InputHTMLAttributes<HTMLInputElement> {}

export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(
  function SearchInput({ className, placeholder = "Search assets...", ...props }, ref) {
    return (
      <div className={cn("relative w-full max-w-md", className)}>
        <Search
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ls-muted"
          aria-hidden
        />
        <input
          ref={ref}
          type="search"
          placeholder={placeholder}
          className="h-10 w-full rounded-ls border border-ls-border bg-white py-2 pl-10 pr-3 text-sm text-ls-foreground shadow-sm placeholder:text-ls-muted/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ls-accent/40"
          {...props}
        />
      </div>
    );
  }
);
