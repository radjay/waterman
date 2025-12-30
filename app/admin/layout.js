"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { api } from "../../convex/_generated/api";
import { ConvexHttpClient } from "convex/browser";
import Link from "next/link";

export default function AdminLayout({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

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

  const handleSignOut = () => {
    localStorage.removeItem("admin_session_token");
    router.push("/admin/login");
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
    { href: "/admin/logs", label: "Logs" },
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
          <div className="absolute bottom-0 w-64 p-4 border-t border-ink/20">
            <button
              onClick={handleSignOut}
              className="w-full text-left px-4 py-2 text-ink/70 hover:bg-ink/5 rounded-md"
            >
              Sign Out
            </button>
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


