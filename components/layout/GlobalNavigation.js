"use client";

import { useAuth } from "../auth/AuthProvider";
import UserMenu from "../auth/UserMenu";
import { LogIn } from "lucide-react";
import { useRouter } from "next/navigation";

export function GlobalNavigation() {
  const { isAuthenticated, loading } = useAuth();
  const router = useRouter();

  return (
    <>
      {/* Desktop auth button - fixed to top right of page */}
      <div className="fixed top-4 right-4 z-[100] hidden md:block">
        {!loading && (
          <>
            {isAuthenticated ? (
              <UserMenu />
            ) : (
              <button
                onClick={() => router.push("/auth/login")}
                className="flex items-center gap-2 px-3 py-2 sm:px-4 rounded-md border border-ink/30 bg-newsprint hover:bg-ink/5 transition-colors text-sm font-medium text-ink shadow-sm"
              >
                <LogIn className="w-4 h-4" />
                <span className="hidden sm:inline">Sign In</span>
              </button>
            )}
          </>
        )}
      </div>
    </>
  );
}
