"use client";

import Link from "next/link";
import { formatFullDate } from "../../lib/utils";

export function Header({ className = "" }) {
  const todayStr = formatFullDate(new Date());

  return (
    <header className={`relative z-[100] border-b border-ink/20 pb-4 mb-6 ${className}`}>
      {/* Main header row - title centered */}
      <div className="mb-3">
        {/* Title - centered on page */}
        <div className="flex items-center justify-center min-h-[44px]">
          <h1 className="font-headline text-[1.44rem] sm:text-[1.8rem] md:text-[2.4rem] font-black uppercase tracking-[-1px] leading-none text-ink">
            <Link href="/" className="cursor-pointer hover:opacity-80 transition-opacity">
              The Waterman Report
            </Link>
          </h1>
        </div>
      </div>

      {/* Date - centered below */}
      <div className="flex justify-center font-headline font-bold uppercase text-[0.9rem] text-ink/60 py-2">
        <span>{todayStr}</span>
      </div>
    </header>
  );
}
