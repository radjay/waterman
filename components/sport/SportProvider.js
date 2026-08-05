"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

/**
 * The selected sport, singular.
 *
 * The sport selector switches the whole app's context, including the verdict.
 * It is not a filter on a list — that distinction is the reason this is a
 * single value rather than the array the legacy report persists.
 *
 * The legacy `waterman_report_sports` array stays as it is. It means something
 * different (an empty array means "all"), and the audit identifies that
 * ambiguity as the root of RAD-60. The two are bridged, not merged: resolving
 * the preference hierarchy properly is RAD-60's job, and this must not make it
 * worse.
 */

export const SPORTS = [
  { id: "wingfoil", label: "WING", noun: "wings" },
  { id: "kitesurfing", label: "KITE", noun: "kites" },
  { id: "surfing", label: "SURF", noun: "surfers" },
];

export const SPORT_IDS = SPORTS.map((s) => s.id);
export const SPORT_STORAGE_KEY = "waterman_sport";
const DEFAULT_SPORT = "wingfoil";

export const sportMeta = (id) => SPORTS.find((s) => s.id === id) || SPORTS[0];

/** Wind sports have model spread; surfing does not — the models differ only in wind. */
export const isWindSport = (id) => id === "wingfoil" || id === "kitesurfing";

const SportContext = createContext({
  sport: DEFAULT_SPORT,
  setSport: () => {},
  meta: SPORTS[0],
});

export function SportProvider({ children }) {
  const [sport, setSportState] = useState(DEFAULT_SPORT);

  // Read after mount so SSR and the first client render agree.
  useEffect(() => {
    try {
      const stored = localStorage.getItem(SPORT_STORAGE_KEY);
      if (SPORT_IDS.includes(stored)) setSportState(stored);
    } catch {
      /* private browsing */
    }
  }, []);

  const setSport = useCallback((next) => {
    if (!SPORT_IDS.includes(next)) return;
    setSportState(next);
    try {
      localStorage.setItem(SPORT_STORAGE_KEY, next);
    } catch {
      /* private browsing */
    }
  }, []);

  return (
    <SportContext.Provider value={{ sport, setSport, meta: sportMeta(sport) }}>
      {children}
    </SportContext.Provider>
  );
}

export function useSport() {
  return useContext(SportContext);
}
