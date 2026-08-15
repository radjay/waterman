"use client";

import { useEffect, useState } from "react";

/**
 * A media query as state.
 *
 * Mobile-first on purpose: the initial value is always false so the server and
 * the first client render agree, and the desktop layout arrives one frame
 * later. Duplicating the markup behind `hidden md:block` would be cheaper for a
 * button; for the chart panel it means building two full plots and animating
 * neither.
 */
export function useMediaQuery(query) {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(query);
    setMatches(mq.matches);
    const onChange = (e) => setMatches(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [query]);

  return matches;
}

/** Tailwind's `md`. The one breakpoint the redesign actually switches on. */
export const useIsDesktop = () => useMediaQuery("(min-width: 768px)");
