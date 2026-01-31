"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { api } from "../../convex/_generated/api";
import { ConvexHttpClient } from "convex/browser";
import Link from "next/link";
import { useAuth } from "../../components/auth/AuthProvider";
import { User, LogOut, ChevronDown } from "lucide-react";

export default function AdminLayout({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout } = useAuth();

  useEffect(() => {
    // Skip auth check on login page
    if (pathname === "/admin/login") {
      setLoading(false);
      return;
    }

    const checkAuth = async () => {
      const sessionToken = localStorage.getItem("admin_session_token");
      if (!sessionToken) {
        router.push("/admin/login");
        return;
      }

      try {
        const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);
        const result = await client.query(api.admin.verifyAdminSession, {
          sessionToken,
        });

        if (result.isAuthenticated) {
          setIsAuthenticated(true);
        } else {
          localStorage.removeItem("admin_session_token");
          router.push("/admin/login");
        }
      } catch (error) {
        localStorage.removeItem("admin_session_token");
        router.push("/admin/login");
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [pathname, router]);

  // Close account menu when clicking outside
  useEffect(() => {
    if (!accountMenuOpen) return;
    const handleClickOutside = (event) => {
      const target = event.target;
      if (!target.closest('.account-menu-container')) {
        setAccountMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [accountMenuOpen]);

  // Hide GlobalNavigation when in admin pages
  useEffect(() => {
    const hideGlobalNav = () => {
      const globalNav = document.querySelector('[class*="fixed"][class*="top-4"][class*="right-4"]');
      if (globalNav) {
        globalNav.style.display = 'none';
      }
    };
    
    hideGlobalNav();
    // Also hide it after a short delay in case it renders later
    const timeout = setTimeout(hideGlobalNav, 100);
    
    return () => {
      clearTimeout(timeout);
      const globalNav = document.querySelector('[class*="fixed"][class*="top-4"][class*="right-4"]');
      if (globalNav) {
        globalNav.style.display = '';
      }
    };
  }, []);

  const handleSignOut = () => {
    localStorage.removeItem("admin_session_token");
    if (user) {
      logout();
    }
    router.push("/admin/login");
  };

  // Get user initials for avatar
  const getInitials = () => {
    if (user?.name) {
      return user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .substring(0, 2);
    }
    if (user?.email) {
      return user.email[0].toUpperCase();
    }
    return "A";
  };

  // Get display name
  const getDisplayName = () => {
    if (user?.name) {
      return user.name.split(" ")[0];
    }
    if (user?.email) {
      return user.email;
    }
    return "Account";
  };

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div>Loading...</div>
      </div>
    );
  }

  // Don't render layout on login page
  if (pathname === "/admin/login") {
    return children;
  }

  // Don't render layout if not authenticated
  if (!isAuthenticated) {
    return null;
  }

  const navItems = [
    { href: "/admin", label: "Dashboard" },
    { href: "/admin/spots", label: "Spots" },
    { href: "/admin/prompts", label: "Prompts" },
    { href: "/admin/expert-inputs", label: "Expert Inputs" },
    { href: "/admin/logs", label: "Logs" },
    { href: "/admin/scoring-debug", label: "Scoring Debug" },
    { href: "/admin/operations", label: "Operations" },
  ];

  return (
    <div className="min-h-screen bg-newsprint">
      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 bg-white border-r border-ink/20 min-h-screen">
          <div className="p-6 border-b border-ink/20">
            <h1 className="text-xl font-bold">Waterman Admin</h1>
          </div>
          <nav className="p-4">
            <ul className="space-y-2">
              {navItems.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`block px-4 py-2 rounded-md ${
                      pathname === item.href
                        ? "bg-ink/10 text-ink font-semibold"
                        : "text-ink/70 hover:bg-ink/5"
                    }`}
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <div className="absolute bottom-0 w-64 p-4 border-t border-ink/20 bg-white">
            <div className="relative account-menu-container">
              <button
                onClick={() => setAccountMenuOpen(!accountMenuOpen)}
                className="w-full flex items-center gap-2 px-4 py-2 text-ink/70 hover:bg-ink/5 rounded-md transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-ink text-white flex items-center justify-center text-xs font-medium">
                  {getInitials()}
                </div>
                <span className="flex-1 text-left text-sm text-ink/70 truncate">
                  {getDisplayName()}
                </span>
                <ChevronDown
                  className={`w-4 h-4 text-ink/70 transition-transform ${
                    accountMenuOpen ? "transform rotate-180" : ""
                  }`}
                />
              </button>

              {accountMenuOpen && (
                <div className="absolute bottom-full left-0 mb-2 w-full bg-white border border-ink/20 rounded-md shadow-lg z-[9999]">
                  <div className="py-2 px-4 border-b border-ink/10">
                    <p className="text-sm font-medium text-ink truncate">
                      {user?.name || "Account"}
                    </p>
                    {user?.email && (
                      <p className="text-xs text-ink/60 truncate">{user.email}</p>
                    )}
                  </div>

                  <div className="py-1">
                    <button
                      onClick={() => {
                        router.push("/profile");
                        setAccountMenuOpen(false);
                      }}
                      className="w-full flex items-center gap-2 px-4 py-2 text-sm text-ink hover:bg-ink/5 transition-colors"
                    >
                      <User className="w-4 h-4" />
                      Profile
                    </button>

                    <div className="border-t border-ink/10 my-1" />

                    <button
                      onClick={handleSignOut}
                      className="w-full flex items-center gap-2 px-4 py-2 text-sm text-ink hover:bg-ink/5 transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 p-8">
          {children}
        </main>
      </div>
    </div>
  );
}


