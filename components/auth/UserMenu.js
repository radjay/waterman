"use client";

import { useState, useRef, useEffect } from "react";
import { useAuth } from "./AuthProvider";
import { User, LogOut, ChevronDown } from "lucide-react";
import { useRouter } from "next/navigation";

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

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-md border border-ink/30 bg-newsprint hover:bg-ink/5 transition-colors"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <div className="w-8 h-8 rounded-full bg-ink text-newsprint flex items-center justify-center text-sm font-medium">
          {getInitials()}
        </div>
        <span className="hidden sm:block text-sm text-ink">
          {user.name || user.email}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-ink transition-transform ${
            isOpen ? "transform rotate-180" : ""
          }`}
        />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-white border border-ink/20 rounded-md shadow-lg z-50">
          <div className="py-2 px-4 border-b border-ink/10">
            <p className="text-sm font-medium text-ink truncate">
              {user.name || "Account"}
            </p>
            <p className="text-xs text-ink/60 truncate">{user.email}</p>
          </div>

          <div className="py-1">
            {/* Future: Profile link
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
            */}

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
