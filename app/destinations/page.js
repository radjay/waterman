import { ViewSwitcher } from "./ViewSwitcher";
import { MONTHS, WINGFOIL_DESTINATIONS } from "../../lib/data/wingfoilDestinations";

export const metadata = {
    title: "Waterman - Wingfoil Destinations",
    description: "Year-round wingfoil destination guide from Lisbon: wind reliability by month, travel time, and water temperature.",
};

/**
 * Deliberately chromeless: no TopNav/BottomNav. This is a standalone,
 * unlinked reference page (see lib/data/wingfoilDestinations.js), and on a
 * phone the tab bar + sport switcher + bottom pill left barely any height
 * for the one thing this page is actually for — the table or map.
 *
 * h-[100dvh] + flex-col + ViewSwitcher's own flex-1 is what makes this a
 * single scroll region instead of two nested ones (page scroll fighting a
 * view's internal scroll is exactly what made the table hard to use on
 * mobile before). This file stays a server component (it exports
 * `metadata`) — the header (with the Table/Map toggle, which needs to sit
 * beside the heading) lives in ViewSwitcher.js since it shares the `view`
 * state with the content below it.
 */
export default function DestinationsPage() {
    return (
        <div className="h-[100dvh] flex flex-col bg-page overflow-hidden">
            <ViewSwitcher rows={WINGFOIL_DESTINATIONS} months={MONTHS} />
        </div>
    );
}
