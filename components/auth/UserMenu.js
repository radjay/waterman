"use client";

import { useState, useRef, useEffect } from "react";
import { useAuth } from "./AuthProvider";
import { User, LogOut, ChevronDown, Calendar, FileText, BookOpen } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function UserMenu() {
  const { user, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);
  const router = useRouter();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [isOpen]);

  if (!user) return null;

  const handleLogout = async () => {
    await logout();
    setIsOpen(false);
    router.push("/");
  };

  // Get user initials for avatar
  const getInitials = () => {
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

  // Get first name only (or email if no name)
  const getDisplayName = () => {
    if (user.name) {
      // Split on space and take the first part (first name)
      return user.name.split(" ")[0];
    }
    return user.email;
  };

  return (
    <div className="relative overflow-visible" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-2 py-1.5 rounded-md border border-ink/30 bg-newsprint hover:bg-newsprint hover:border-ink/50 transition-colors"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <div className="w-7 h-7 rounded-full bg-ink text-newsprint flex items-center justify-center text-xs font-medium">
          {getInitials()}
        </div>
        <span className="hidden sm:block text-xs text-ink max-w-[70px] truncate">
          {getDisplayName()}
        </span>
        <ChevronDown
          className={`hidden sm:block w-4 h-4 text-ink transition-transform ${
            isOpen ? "transform rotate-180" : ""
          }`}
        />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-white border border-ink/20 rounded-md shadow-lg z-[9999]">
          <div className="py-2 px-4 border-b border-ink/10">
            <p className="text-sm font-medium text-ink truncate">
              {user.name || "Account"}
            </p>
            <p className="text-xs text-ink/60 truncate">{user.email}</p>
          </div>

          <div className="py-1">
            <button
              onClick={() => {
                router.push("/profile");
                setIsOpen(false);
              }}
              className="w-full flex items-center gap-2 px-4 py-2 text-sm text-ink hover:bg-ink/5 transition-colors"
            >
              <User className="w-4 h-4" />
              Profile
            </button>

            <button
              onClick={() => {
                router.push("/journal");
                setIsOpen(false);
              }}
              className="w-full flex items-center gap-2 px-4 py-2 text-sm text-ink hover:bg-ink/5 transition-colors"
            >
              <BookOpen className="w-4 h-4" />
              Journal
            </button>

            <div className="border-t border-ink/10 my-1" />

            <button
              onClick={() => {
                router.push("/subscribe");
                setIsOpen(false);
              }}
              className="w-full flex items-center gap-2 px-4 py-2 text-sm text-ink hover:bg-ink/5 transition-colors"
            >
              <Calendar className="w-4 h-4" />
              Add to Calendar
            </button>

            <Link
              href="/changelog"
              onClick={() => setIsOpen(false)}
              className="w-full flex items-center gap-2 px-4 py-2 text-sm text-ink hover:bg-ink/5 transition-colors"
            >
              <FileText className="w-4 h-4" />
              Changelog
            </Link>

            <div className="border-t border-ink/10 my-1" />

            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2 px-4 py-2 text-sm text-ink hover:bg-ink/5 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
