/**
 * The four tabs, defined once.
 *
 * Nav went from five destinations to three verbs plus a menu: Now, Next, Cams,
 * More. Report and Calendar collapse into Next; Journal, Settings and
 * Request-a-Spot move under More.
 *
 * Shared by the mobile pill (BottomNav) and the desktop bar (TopNav) so the two
 * cannot drift — the old ViewToggle drifting from BottomNav is exactly how
 * desktop ended up still advertising the previous IA.
 */
export const NAV_TABS = [
  { id: "now", label: "NOW", path: "/" },
  { id: "next", label: "NEXT", path: "/next" },
  { id: "cams", label: "CAMS", path: "/cams" },
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
