import type { ReactNode } from "react";

export function Shell(props: { title: string; children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 px-4 py-3">
        <h1 className="text-lg font-semibold tracking-tight">{props.title}</h1>
      </header>
      <main className="p-4">{props.children}</main>
    </div>
  );
}
