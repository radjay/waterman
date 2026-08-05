/**
 * The four tabs, defined once.
 *
 * Three user goals, three verbs (+ menu):
 *   NOW  — can I go right now?
 *   NEXT — when should I go?
 *   LIVE — what's happening on the water right now? (cams; path stays /cams)
 *   MORE — everything else
 *
 * Shared by BottomNav and TopNav so the two cannot drift.
 */
export const NAV_TABS = [
  { id: "now", label: "NOW", path: "/" },
  { id: "next", label: "NEXT", path: "/next" },
  { id: "cams", label: "LIVE", path: "/cams" },
  { id: "more", label: "MORE", path: "/more" },
];

/** Legacy routes still reachable from More, mapped to the tab that owns them. */
const OWNED_BY = {
  next: ["/next", "/report", "/calendar", "/window", "/wing", "/kite", "/surf"],
  cams: ["/cams"],
  more: ["/more", "/journal", "/settings", "/profile", "/subscribe", "/dashboard"],
};

export function activeTabFor(pathname) {
  if (pathname === "/") return "now";
  for (const [tab, prefixes] of Object.entries(OWNED_BY)) {
    if (prefixes.some((p) => pathname === p || pathname?.startsWith(`${p}/`))) return tab;
  }
  return "now";
}
