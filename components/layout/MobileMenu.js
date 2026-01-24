"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "../auth/AuthProvider";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Menu, X, LogIn, User, LogOut, Calendar, FileText } from "lucide-react";

export function MobileMenu() {
  const [isOpen, setIsOpen] = useState(false);
  const { isAuthenticated, user, logout, loading } = useAuth();
  const router = useRouter();
  const menuRef = useRef(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      // Prevent body scroll when menu is open
      document.body.style.overflow = "hidden";
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
        document.body.style.overflow = "unset";
      };
    }
  }, [isOpen]);

  const handleLogout = async () => {
    await logout();
    setIsOpen(false);
    router.push("/");
  };

  const handleNavigation = (path) => {
    setIsOpen(false);
    router.push(path);
  };

  // Get user initials for avatar
  const getInitials = () => {
    if (!user) return "";
    if (user.name) {
      return user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .substring(0, 2);
    }
    return user.email[0].toUpperCase();
  };

  if (loading) return null;

  return (
    <>
      {/* Hamburger button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed top-6 left-4 z-[200] p-1 rounded-md border border-ink/30 bg-newsprint hover:bg-ink/5 transition-colors md:hidden"
        aria-label="Menu"
        aria-expanded={isOpen}
      >
        {isOpen ? (
          <X className="w-4 h-4 text-ink" />
        ) : (
          <Menu className="w-4 h-4 text-ink" />
        )}
      </button>

      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-[190] md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Slide-out panel */}
      <div
        ref={menuRef}
        className={`fixed top-0 left-0 h-full w-64 bg-newsprint border-r border-ink/20 shadow-xl z-[195] transform transition-transform duration-300 ease-in-out md:hidden ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex flex-col h-full pt-20 px-4 pb-6">
          {/* Account section */}
          <div className="border-b border-ink/10 pb-4 mb-4">
            {isAuthenticated ? (
              <>
                {/* User info */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-ink text-newsprint flex items-center justify-center text-sm font-medium">
                    {getInitials()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-ink truncate">
                      {user?.name || "Account"}
                    </p>
                    <p className="text-xs text-ink/60 truncate">{user?.email}</p>
                  </div>
                </div>

                {/* Profile button */}
                <button
                  onClick={() => handleNavigation("/profile")}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-ink hover:bg-ink/5 rounded-md transition-colors"
                >
                  <User className="w-4 h-4" />
                  Profile
                </button>
              </>
            ) : (
              <button
                onClick={() => handleNavigation("/auth/login")}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium text-ink border border-ink/30 rounded-md hover:bg-ink/5 transition-colors"
              >
                <LogIn className="w-4 h-4" />
                Sign In
              </button>
            )}
          </div>

          {/* Navigation links */}
          <div className="flex-1 space-y-1">
            <a
              href="/api/calendar/wingfoil"
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-ink hover:bg-ink/5 rounded-md transition-colors"
              title="Subscribe to wingfoil calendar feed"
            >
              <Calendar className="w-4 h-4" />
              Wing Calendar
            </a>

            <a
              href="/api/calendar/surfing"
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-ink hover:bg-ink/5 rounded-md transition-colors"
              title="Subscribe to surfing calendar feed"
            >
              <Calendar className="w-4 h-4" />
              Surf Calendar
            </a>

            <button
              onClick={() => handleNavigation("/changelog")}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-ink hover:bg-ink/5 rounded-md transition-colors"
            >
              <FileText className="w-4 h-4" />
              Changelog
            </button>
          </div>

          {/* Sign out button at bottom */}
          {isAuthenticated && (
            <div className="border-t border-ink/10 pt-4">
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-ink hover:bg-ink/5 rounded-md transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
