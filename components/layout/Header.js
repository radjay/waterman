"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatFullDate } from "../../lib/utils";
import { useAuth } from "../auth/AuthProvider";
import UserMenu from "../auth/UserMenu";
import { LogIn } from "lucide-react";

export function Header({ className = "" }) {
  const todayStr = formatFullDate(new Date());
  const { isAuthenticated, loading } = useAuth();
  const router = useRouter();

  return (
    <header className={`border-b border-ink/20 pb-4 mb-6 ${className}`}>
      {/* Main header row - title centered, auth absolute positioned */}
      <div className="relative pt-6 md:pt-0 mb-3">
        {/* Title - centered on page */}
        <div className="flex items-center justify-center min-h-[44px]">
          <h1 className="font-headline text-[1.44rem] sm:text-[1.8rem] md:text-[2.4rem] font-black uppercase tracking-[-1px] leading-none text-ink">
            <Link href="/" className="cursor-pointer hover:opacity-80 transition-opacity">
              The Waterman Report
            </Link>
          </h1>
        </div>

        {/* Auth UI - absolute positioned top right, vertically centered */}
        <div className="absolute right-0 top-1/2 -translate-y-1/2">
          {!loading && (
            <>
              {isAuthenticated ? (
                <UserMenu />
              ) : (
                <button
                  onClick={() => router.push("/auth/login")}
                  className="flex items-center gap-2 px-3 py-2 sm:px-4 rounded-md border border-ink/30 bg-newsprint hover:bg-ink/5 transition-colors text-sm font-medium text-ink"
                >
                  <LogIn className="w-4 h-4" />
                  <span className="hidden sm:inline">Sign In</span>
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Date - centered below */}
      <div className="flex justify-center font-headline font-bold uppercase text-[0.9rem] text-ink/60 py-4">
        <span>{todayStr}</span>
      </div>
    </header>
  );
}
