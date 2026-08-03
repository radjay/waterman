"use client";

import { createContext, useContext, useCallback, useEffect, useState } from "react";
import {
  DEFAULT_COORDS,
  THEME_COLORS,
  THEME_STORAGE_KEY,
  nextThemeBoundary,
  resolveTheme,
} from "../../lib/theme";

const ThemeContext = createContext({
  theme: "night",
  preference: "auto",
  setPreference: () => {},
});

export const useTheme = () => useContext(ThemeContext);

/**
 * Applies Nightglass/Dayglass and keeps it current.
 *
 * The initial value is already on <html> from the blocking bootstrap script in
 * app/layout.js, so this provider never causes the flash it exists to prevent —
 * it reads what the script decided rather than deciding again on mount.
 *
 * On "auto" it schedules a single timer for the next sunrise/sunset rather than
 * polling, and re-checks on visibilitychange so a backgrounded PWA that missed
 * its timer corrects itself when the rider opens it at dawn.
 */
export function ThemeProvider({ children }) {
  const [preference, setPreferenceState] = useState("auto");
  const [theme, setTheme] = useState("night");

  // Adopt whatever the bootstrap script already decided.
  useEffect(() => {
    let stored = null;
    try {
      stored = localStorage.getItem(THEME_STORAGE_KEY);
    } catch {
      /* private browsing */
    }
    const applied = document.documentElement.getAttribute("data-theme");
    setPreferenceState(stored === "night" || stored === "day" ? stored : "auto");
    if (applied === "night" || applied === "day") setTheme(applied);
  }, []);

  const apply = useCallback((next) => {
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", THEME_COLORS[next]);
  }, []);

  // Auto mode: one timer to the next boundary, plus a visibility re-check.
  // A fixed preference cancels the timer rather than leaving it running.
  useEffect(() => {
    if (preference !== "auto") {
      apply(preference);
      return;
    }

    let timer;
    const tick = () => {
      const now = Date.now();
      apply(resolveTheme("auto", now, DEFAULT_COORDS));
      const boundary = nextThemeBoundary(DEFAULT_COORDS.lat, DEFAULT_COORDS.lon, now);
      // setTimeout saturates past ~24.8 days; boundaries are always < 24h away,
      // but clamp anyway so a bad clock cannot fire an immediate loop.
      const delay = Math.min(Math.max(boundary - now + 1000, 1000), 24 * 60 * 60 * 1000);
      timer = setTimeout(tick, delay);
    };
    tick();

    const onVisible = () => {
      if (document.visibilityState === "visible") {
        clearTimeout(timer);
        tick();
      }
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [preference, apply]);

  const setPreference = useCallback((next) => {
    setPreferenceState(next);
    try {
      if (next === "auto") localStorage.removeItem(THEME_STORAGE_KEY);
      else localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      /* private browsing */
    }
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, preference, setPreference }}>
      {children}
    </ThemeContext.Provider>
  );
}
