"use client";

import { useState, useEffect, useLayoutEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { formatFullDate } from "../../lib/utils";
import { MobileMenu } from "./MobileMenu";

export function Header({ className = "" }) {
  const todayStr = formatFullDate(new Date());
  const [isScrolled, setIsScrolled] = useState(false);
  const [hasMounted, setHasMounted] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Check scroll position before paint to avoid layout shift
  useLayoutEffect(() => {
    // Set initial scroll state synchronously before first paint
    setIsScrolled(window.scrollY > 20);
    setHasMounted(true);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Animation duration - 0 on mount, normal after
  const animationDuration = hasMounted ? 0.15 : 0;

  return (
    <header className={`sticky top-0 z-50 bg-newsprint relative ${className}`}>
      {/* Mobile menu - always render, but hide wrapper positioning when menu is open */}
      <div 
        className={`md:hidden ${isMenuOpen ? "pointer-events-none" : "absolute z-[60]"}`}
        style={isMenuOpen ? {} : { left: 0, top: 12 }}
      >
        <MobileMenu onOpenChange={setIsMenuOpen} />
      </div>

      {/* Main header content */}
      <motion.div 
        initial={false}
        animate={{ paddingTop: isScrolled ? 12 : 12, paddingBottom: isScrolled ? 12 : 16 }}
        transition={{ duration: animationDuration, ease: "easeOut" }}
      >
        {/* Title - centered */}
        <div className="flex items-center justify-center">
          <motion.h1 
            className="font-headline font-black uppercase tracking-[-1px] leading-none text-ink"
            initial={false}
            animate={{ 
              fontSize: isScrolled ? "clamp(1.44rem, 4vw, 2rem)" : "clamp(1.44rem, 5vw, 2.4rem)"
            }}
            transition={{ duration: animationDuration, ease: "easeOut" }}
          >
            <Link href="/" className="cursor-pointer hover:opacity-80 transition-opacity">
              The Waterman Report
            </Link>
          </motion.h1>
        </div>

        {/* Date - only visible when NOT scrolled */}
        <AnimatePresence initial={false}>
          {!isScrolled && (
            <motion.div 
              className="flex justify-center font-headline font-bold uppercase text-[0.9rem] text-ink/60 mt-2"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: animationDuration, ease: "easeOut" }}
            >
              <span>{todayStr}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </header>
  );
}
