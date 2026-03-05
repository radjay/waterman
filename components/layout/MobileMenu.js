"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence, useDragControls } from "framer-motion";
import { useAuth } from "../auth/AuthProvider";
import { useRouter } from "next/navigation";
import { LogIn, User, LogOut, Calendar, FileText, MapPin, Settings } from "lucide-react";

export function MobileMenu({ isOpen: controlledOpen, onOpenChange }) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const isOpen = isControlled ? controlledOpen : internalOpen;
  const setIsOpen = (val) => {
    if (!isControlled) setInternalOpen(val);
    onOpenChange?.(val);
  };
  const { isAuthenticated, user, logout, loading } = useAuth();
  const router = useRouter();
  const sheetRef = useRef(null);

  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      return () => {
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
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/40 z-[190] pointer-events-auto"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setIsOpen(false)}
          />

          {/* Bottom sheet */}
          <motion.div
            ref={sheetRef}
            className="fixed bottom-0 left-0 right-0 bg-newsprint rounded-t-2xl shadow-elevated z-[195] pointer-events-auto"
            style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 60px)" }}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 320 }}
            drag="y"
            dragConstraints={{ top: 0 }}
            dragElastic={0.1}
            onDragEnd={(_, info) => {
              if (info.offset.y > 80 || info.velocity.y > 300) {
                setIsOpen(false);
              }
            }}
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-10 h-1 rounded-full bg-ink/20" />
            </div>

            <div className="px-4 pb-4">
              {/* Account section */}
              <div className="border-b border-ink/10 pb-4 mb-3">
                {isAuthenticated ? (
                  <>
                    <div className="flex items-center gap-3 mb-3">
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

                    <button
                      onClick={() => handleNavigation("/profile")}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-ink hover:bg-warm-highlight rounded-ui transition-all duration-fast ease-smooth"
                    >
                      <User className="w-4 h-4" />
                      Profile
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => handleNavigation("/auth/login")}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium text-ink border border-ink/15 rounded-ui hover:bg-warm-highlight transition-all duration-fast ease-smooth"
                  >
                    <LogIn className="w-4 h-4" />
                    Sign In
                  </button>
                )}
              </div>

              {/* Navigation links — ordered by importance: Settings first, Changelog last */}
              <div className="space-y-1">
                <button
                  onClick={() => handleNavigation("/settings")}
                  className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-ink hover:bg-warm-highlight rounded-ui transition-all duration-fast ease-smooth"
                >
                  <Settings className="w-4 h-4" />
                  Settings
                </button>

                <button
                  onClick={() => handleNavigation("/calendar")}
                  className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-ink hover:bg-warm-highlight rounded-ui transition-all duration-fast ease-smooth"
                >
                  <Calendar className="w-4 h-4" />
                  Calendar
                </button>

                <button
                  onClick={() => handleNavigation("/subscribe")}
                  className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-ink hover:bg-warm-highlight rounded-ui transition-all duration-fast ease-smooth"
                >
                  <Calendar className="w-4 h-4" />
                  Add to Calendar
                </button>

                <button
                  onClick={() => handleNavigation("/request-spot")}
                  className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-ink hover:bg-warm-highlight rounded-ui transition-all duration-fast ease-smooth"
                >
                  <MapPin className="w-4 h-4" />
                  Request a Spot
                </button>

                <button
                  onClick={() => handleNavigation("/changelog")}
                  className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-ink hover:bg-warm-highlight rounded-ui transition-all duration-fast ease-smooth"
                >
                  <FileText className="w-4 h-4" />
                  Changelog
                </button>
              </div>

              {/* Sign out at bottom */}
              {isAuthenticated && (
                <div className="border-t border-ink/10 pt-3 mt-3">
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-ink hover:bg-warm-highlight rounded-ui transition-all duration-fast ease-smooth"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
