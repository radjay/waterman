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
    <header
      className={`border-b-2 border-ink/20 pb-4 mb-6 pt-6 md:pt-0 ${className}`}
    >
      {/* Auth UI - positioned at top right */}
      <div className="flex justify-end mb-4">
        {!loading && (
          <>
            {isAuthenticated ? (
              <UserMenu />
            ) : (
              <button
                onClick={() => router.push("/auth/login")}
                className="flex items-center gap-2 px-4 py-2 rounded-md border border-ink/30 bg-newsprint hover:bg-ink/5 transition-colors text-sm font-medium text-ink"
              >
                <LogIn className="w-4 h-4" />
                Sign In
              </button>
            )}
          </>
        )}
      </div>

      {/* Title and Date */}
      <div className="text-center">
        <h1 className="font-headline text-[1.8rem] md:text-[3.5rem] font-black uppercase tracking-[-2px] leading-none mb-3 text-ink">
          <Link href="/" className="cursor-pointer">
            The Waterman Report
          </Link>
        </h1>
        <div className="flex justify-center font-headline font-bold uppercase text-[0.9rem] text-ink py-4">
          <span>{todayStr}</span>
        </div>
      </div>
    </header>
  );
}
