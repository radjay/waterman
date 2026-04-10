"use client";

const ALL_SPORT_IDS = ["wingfoil", "kitesurfing", "surfing"];

const SPORT_OPTIONS = [
  { id: "wingfoil", label: "Wing" },
  { id: "kitesurfing", label: "Kite" },
  { id: "surfing", label: "Surf" },
];

/**
 * SportFilter — multi-select sport toggle pills.
 *
 * Each sport can be toggled independently.
 * Empty selectedSports array = all sports active (no filter applied).
 *
 * @param {string[]} selectedSports - Currently selected sport IDs (empty = all)
 * @param {(sportId: string) => void} onToggle - Called with the toggled sport ID
 */
export function SportFilter({ selectedSports, onToggle }) {
  return (
    <div className="inline-flex items-center gap-0.5 p-1 bg-ink/[0.04] rounded-full">
      {SPORT_OPTIONS.map((option) => {
        const isActive =
          selectedSports.length === 0 || selectedSports.includes(option.id);
        return (
          <button
            key={option.id}
            onClick={() => onToggle(option.id)}
            className="relative px-3 py-1 text-xs font-semibold uppercase tracking-wider whitespace-nowrap transition-colors duration-fast ease-smooth"
          >
            {isActive && (
              <span className="absolute inset-0 bg-newsprint rounded-full shadow-card border border-ink/10" />
            )}
            <span
              className={`relative z-10 ${
                isActive ? "text-ink" : "text-faded-ink hover:text-ink"
              }`}
            >
              {option.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

export { ALL_SPORT_IDS };
