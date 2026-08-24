"use client";

import { useState } from "react";
import Link from "next/link";
import { PillToggle } from "../../components/ui/PillToggle";
import { RatingMatrix } from "../../components/ui/RatingMatrix";
import { RouteMap } from "../../components/ui/RouteMap";

const VIEWS = [
    { id: "table", label: "Table" },
    { id: "map", label: "Map" },
];

/**
 * Client-side island for /destinations: page.js stays a server component
 * (it exports `metadata`, which can't live in a "use client" file). This
 * owns the one piece of state the page actually needs — which view is
 * showing — and renders both the header (the Table/Map toggle sits beside
 * the heading, so it has to live where that state is) and the content.
 */
export function ViewSwitcher({ rows, months }) {
    const [view, setView] = useState("table");

    return (
        <>
            <header className="flex-none border-b border-card px-4 sm:px-8 pb-3 sm:pb-4 pt-[max(0.75rem,env(safe-area-inset-top))] sm:pt-5">
                <Link
                    href="/"
                    className="font-headline font-extrabold text-[15px] sm:text-[18px] tracking-display-tight text-ink leading-none focus-ring rounded-[4px]"
                >
                    Waterman
                </Link>
                <div className="flex items-center justify-between gap-3 mt-1.5 sm:mt-2">
                    <h1 className="font-headline font-extrabold text-[19px] sm:text-[25px] tracking-display-tight text-ink leading-tight">
                        Wingfoil Destinations
                    </h1>
                    <PillToggle name="destinations-view" options={VIEWS} value={view} onChange={setView} className="flex-none" />
                </div>
                <p className="text-[11px] sm:text-[13px] text-faded-ink leading-[1.4] mt-1 max-w-[60ch]">
                    21 spots, wind reliability by month, sorted by travel time from Lisbon. Tap a rating for detail.
                </p>
            </header>
            <div className="flex-1 min-h-0 px-4 sm:px-8 pt-3 sm:pt-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:pb-6">
                {view === "table" ? (
                    <RatingMatrix rows={rows} months={months} />
                ) : (
                    <RouteMap rows={rows} months={months} />
                )}
            </div>
        </>
    );
}
