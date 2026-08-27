"use client";

import { usePathname } from "next/navigation";
import { ExperimentNav } from "./ExperimentNav.js";

export function ExperimentShell({ children }) {
  const pathname = usePathname();
  const wide = pathname?.startsWith("/experiment/guincho-model-skill");
  const width = wide ? "max-w-[1440px]" : "max-w-lg";

  return (
    <div className="min-h-screen bg-page text-ink">
      <header className="border-b border-card bg-surface">
        <div className={`mx-auto flex items-center justify-between px-4 py-3 ${width}`}>
          <p className="font-semibold text-ink">{wide ? "Guincho" : "Cascais Bay"}</p>
          <ExperimentNav />
        </div>
      </header>
      <main className={`mx-auto px-4 py-6 ${width}`}>{children}</main>
    </div>
  );
}
