"use client";

import { useState, useEffect, useLayoutEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { LogIn } from "lucide-react";
import { formatFullDate } from "../../lib/utils";
import { ViewToggle } from "./ViewToggle";
import { useAuth } from "../auth/AuthProvider";
import UserMenu from "../auth/UserMenu";
import { useRouter, usePathname } from "next/navigation";
import { ShareButton } from "../ui/ShareButton";

// Routes where the share button shows the app homepage URL instead of the
// current page URL (content is personalised; the URL itself has no value).
const USER_SPECIFIC_PATHS = ["/dashboard", "/journal", "/settings", "/profile"];

// Routes where no share button is shown at all.
const NO_SHARE_PATHS = ["/admin", "/auth", "/ui-kit"];

/**
 * Header — clean sticky header.
 *
 * Mobile: masthead only (title + date). Nav is handled by BottomNav.
 * Desktop: masthead (container-width) + full-width nav bar with auth inside.
 * Collapses on scroll with smooth Framer Motion animation.
 *
 * A ShareButton is rendered automatically on every page. User-specific routes
 * (/dashboard, /journal, /settings, /profile) share the app homepage URL;
 * all other routes share the current page URL.
 */
export function Header({ className = "" }) {
  const todayStr = formatFullDate(new Date());
  const [isScrolled, setIsScrolled] = useState(false);
  const [hasMounted, setHasMounted] = useState(false);
  const { isAuthenticated, loading: authLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const isHome = pathname === "/dashboard";

  const showShareButton = !NO_SHARE_PATHS.some((p) => pathname?.startsWith(p));
  const isUserSpecificPath = USER_SPECIFIC_PATHS.some((p) =>
    pathname?.startsWith(p)
  );
  // Resolve at render time (client only); empty string is safe for SSR.
  const shareUrl =
    typeof window !== "undefined"
      ? isUserSpecificPath
        ? window.location.origin
        : window.location.href
      : "";

  useLayoutEffect(() => {
    setIsScrolled(window.scrollY > 20);
    setHasMounted(true);
  }, []);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const authContent = (
    <AuthButton
      isAuthenticated={isAuthenticated}
      authLoading={authLoading}
      router={router}
    />
  );

  const shareContent = showShareButton ? (
    <ShareButton url={shareUrl} />
  ) : null;

  return (
    <header
      className={`sticky top-0 z-50 -mx-4 md:-mx-8 transition-colors duration-300 ease-smooth ${
        isScrolled
          ? "bg-newsprint/80 backdrop-blur-xl shadow-card"
          : ""
      } ${className}`}
    >
      {/* ── Masthead: title + date — smooth collapse on scroll ── */}
      {/* On mobile, only show on home/dashboard tab */}
      <motion.div
        initial={false}
        animate={isScrolled ? "collapsed" : "expanded"}
        variants={{
          expanded: { height: "auto", opacity: 1 },
          collapsed: { height: 0, opacity: 0 },
        }}
        transition={
          hasMounted
            ? {
                height: { duration: 0.3, ease: [0.32, 0.72, 0, 1] },
                opacity: { duration: 0.2, ease: "easeOut" },
              }
            : { duration: 0 }
        }
        className={`overflow-hidden ${!isHome ? "hidden md:block" : ""}`}
      >
        <div className="px-4 md:px-8 pt-3 md:pt-4 pb-5 md:pb-6">
          {/* Centered title */}
          <div className="flex items-center justify-center">
            <Link
              href="/"
              className="font-headline font-black uppercase tracking-[-0.5px] leading-none text-ink text-[1.5rem] sm:text-[1.75rem] md:text-[2rem] hover:opacity-80 transition-opacity text-center"
            >
              The Waterman Report
            </Link>
          </div>

          {/* Date */}
          <div className="flex justify-center mt-2">
            <span className="font-headline font-bold uppercase text-[0.7rem] md:text-xs text-ink/50 tracking-wide">
              {todayStr}
            </span>
          </div>
        </div>
        {/* Divider under logo on mobile */}
        <div className="md:hidden border-b border-ink/10" />
      </motion.div>

      {/* ── Nav bar (desktop only) — full-width pill bar with Sign In ── */}
      {/* Mobile nav is handled by BottomNav */}
      <div className="hidden md:flex items-center gap-3 px-4 md:px-6 py-2">
        {/* Scrolled-only: compact brand */}
        <AnimatePresence initial={false}>
          {isScrolled && (
            <motion.div
              key="brand-group"
              initial={{ opacity: 0, x: -12, width: 0 }}
              animate={{ opacity: 1, x: 0, width: "auto" }}
              exit={{ opacity: 0, x: -12, width: 0 }}
              transition={{
                duration: hasMounted ? 0.25 : 0,
                ease: [0.32, 0.72, 0, 1],
              }}
              className="shrink-0 overflow-hidden"
            >
              <Link
                href="/"
                className="font-headline font-black uppercase text-sm tracking-tight text-ink hover:opacity-70 transition-opacity leading-none whitespace-nowrap"
              >
                Waterman
              </Link>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Full-width nav bar with Share + Sign In inside */}
        <ViewToggle
          compact={isScrolled}
          rightContent={
            /* RAD-30: share icon is a round pill matching the account pill height;
               extra gap (gap-3) separates the two. */
            <div className="flex items-center gap-3">
              {showShareButton && (
                <ShareButton
                  url={shareUrl}
                  className="h-[27px] w-[27px] rounded-full ring-1 ring-inset ring-ink/15 shadow-sm bg-newsprint hover:bg-white active:scale-[0.98] transition-all duration-fast ease-smooth"
                />
              )}
              {authContent}
            </div>
          }
          className="flex-1"
        />
      </div>

    </header>
  );
}

/**
 * AuthButton — Sign In or UserMenu, rendered inside the nav bar.
 */
function AuthButton({ isAuthenticated, authLoading, router }) {
  if (authLoading) return <div className="w-20 h-8" />;

  if (isAuthenticated) {
    return <UserMenu />;
  }

  return (
    <button
      onClick={() => router.push("/auth/login")}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-newsprint ring-1 ring-inset ring-ink/15 shadow-sm text-ink text-xs font-semibold uppercase tracking-wider leading-none hover:bg-white active:scale-[0.98] transition-all duration-fast ease-smooth focus-ring"
    >
      <LogIn className="w-[15px] h-[15px]" />
      <span>Sign In</span>
    </button>
  );
}
