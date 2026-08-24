"use client";

import { useMemo, useRef, useState } from "react";
import { Arrow } from "./Arrow";
import { MicroLabel } from "./MicroLabel";
import { Tooltip } from "./Tooltip";
import { RATING_LABEL, RATING_RANK } from "../../lib/data/wingfoilDestinations";
import { cellTooltip, nameTooltip } from "../../lib/wingfoilTooltipText";

/**
 * RatingMatrix — a sortable destination × month rating grid.
 *
 * Built for the wingfoil destination guide (`/destinations`), general enough
 * to reuse for another region/season report with the same shape: rows with a
 * name/location/travel/water readout, plus a prime/solid/marginal/skip
 * rating per month.
 *
 * Sorting: click Destination/Travel/Water to sort by that field. Click a
 * month to rank rows best-first for that month; click the same month again
 * to return to the default (travel time) order.
 *
 * Cells are a flat colour fill only — no border, no letter — so the legend
 * is the one place a reader learns the code, rather than re-deriving it in
 * every cell. Shoulder months (trade winds starting, fading, or otherwise
 * more variable than the rating alone suggests) get a diagonal stripe in
 * that cell's own colour instead of a flat fill — the source dataset flags
 * shoulder independent of score, so a shoulder month can land on any
 * rating, not only "prime" (see lib/data/wingfoilDestinations.js). Hover a
 * month header to spotlight that month: its plain-Prime cells stay lit
 * (with a ring) and their destination names get an accent bar; everything
 * else — the other months, non-Prime cells in the hovered month, and the
 * rest of the destination names — dims. A Prime cell that's also a
 * shoulder month does NOT light up: shoulder is elevated variance even on
 * an otherwise Prime month, so it doesn't earn the confident spotlight.
 * Hover a cell for the destination's typical wind/waves and riding zone
 * that month.
 *
 * The destination name is a second tooltip trigger (dotted underline on
 * hover) for the fields that don't vary by month — named spots, the
 * flight/ground route, caveats, best-for tags, and data confidence — so
 * that detail doesn't have to repeat in all 12 month cells.
 *
 * Root is `h-full flex flex-col`: the legend is a fixed-size header, the
 * table scrolls in the remaining space (`flex-1 min-h-0`). That only fills
 * a screen the way `/destinations` wants it to (single scroll region, no
 * page scroll fighting the table's own scroll) because that page wraps
 * this in a real height — `h-[100dvh]` down to a flex child. Drop this into
 * a normal document-flow container (e.g. the /ui-kit fixture) and `h-full`
 * just resolves to auto, which is harmless, not a bug.
 *
 * @param {Array} rows - see lib/data/wingfoilDestinations.js for shape
 * @param {Array<{key:string,label:string}>} months
 */

const LEVEL_FILL = {
  prime: "bg-accent",
  solid: "bg-accent/40",
  marginal: "bg-marginal/45",
  skip: "bg-ink/[0.06]",
};

function stripe(cssVar, strong, faint) {
  return {
    backgroundImage: `repeating-linear-gradient(45deg, rgb(var(${cssVar}) / ${strong}) 0px, rgb(var(${cssVar}) / ${strong}) 4px, rgb(var(${cssVar}) / ${faint}) 4px, rgb(var(${cssVar}) / ${faint}) 8px)`,
  };
}

// Two shades of the cell's own hue, not a fixed prime/solid mix — shoulder
// can land on any level now, and striping every level in prime-teal would
// make a shoulder-flagged Skip month visually read as good.
const SHOULDER_STRIPE = {
  prime: stripe("--wm-accent", 1, 0.4),
  solid: stripe("--wm-accent", 0.55, 0.2),
  marginal: stripe("--wm-marginal", 0.65, 0.25),
  skip: stripe("--wm-ink", 0.16, 0.05),
};

const FIELD_SORTERS = {
  name: (row) => row.name.toLowerCase(),
  travel: (row) => row.travelHours,
  water: (row) => parseFloat(row.waterTemp) || 0,
};

function RatingCell({ row, month, anyMonthHovered, hovered, tooltipPosition, onMeasureHover }) {
  const level = row.ratings[month.key];
  const shoulder = row.shoulder.includes(month.key);
  // Spotlight: only a Prime cell in the hovered month stays lit. Every other
  // cell dims, including non-Prime cells in that same column — the ask is
  // "where's Prime this month", not "how does this whole month compare".
  // Shoulder is elevated variance even on an otherwise Prime month, so it
  // doesn't earn the confident spotlight — only a *plain* Prime cell lights up.
  const highlight = hovered && level === "prime" && !shoulder;
  const dimmed = anyMonthHovered && !highlight;

  return (
    <Tooltip content={cellTooltip(row, month)} position={tooltipPosition} wide>
      <div className="relative h-8 sm:h-6 w-full" onMouseEnter={onMeasureHover}>
        <div
          className={`h-full w-full rounded-[4px] transition-all duration-fast ease-smooth ${
            shoulder ? "" : LEVEL_FILL[level]
          } ${dimmed ? "opacity-20" : ""} ${
            highlight ? "ring-2 ring-accent ring-offset-2 ring-offset-page" : ""
          }`}
          style={shoulder ? SHOULDER_STRIPE[level] : undefined}
        />
      </div>
    </Tooltip>
  );
}

function SortHeader({ label, active, dir, onClick, className = "" }) {
  return (
    <th className={`sticky top-0 z-20 bg-page text-left font-normal ${className}`}>
      <button
        type="button"
        onClick={onClick}
        className={`flex items-center gap-1 font-data text-[9px] sm:text-[10px] tracking-label-wide uppercase transition-colors duration-fast ease-smooth focus-ring rounded-sm ${
          active ? "text-accent" : "text-dim hover:text-ink"
        }`}
      >
        {label}
        {active && <Arrow direction={dir === "asc" ? 0 : 180} className="text-[8px]" />}
      </button>
    </th>
  );
}

export function RatingMatrix({ rows, months }) {
  // sort = { key: "name"|"travel"|"water"|monthKey, dir: "asc"|"desc" }
  const [sort, setSort] = useState({ key: "travel", dir: "asc" });
  const [hoverMonth, setHoverMonth] = useState(null);

  // The table now scrolls vertically inside a fixed-height card, so a
  // tooltip that opens "up" can clip against the scrollport's own top edge
  // for ANY row that happens to be scrolled near it, not just row 0 — a
  // static rowIndex-based rule can't know that. Measure the actual gap
  // between the hovered anchor and the scrollport on every hover instead,
  // and flip to opening downward when there isn't room. Content length
  // varies a lot between a 3-line cell tooltip and a name tooltip with
  // notes/best-for/confidence stacked on, so the two get different
  // thresholds rather than one guess sized for the longest case.
  const scrollRef = useRef(null);
  const [dynamicPos, setDynamicPos] = useState({});

  function measurePosition(key, minSpaceAbove) {
    return (e) => {
      const container = scrollRef.current;
      if (!container) return;
      const anchorTop = e.currentTarget.getBoundingClientRect().top;
      const containerTop = container.getBoundingClientRect().top;
      const next = anchorTop - containerTop < minSpaceAbove ? "bottom" : "top";
      setDynamicPos((prev) => (prev[key] === next ? prev : { ...prev, [key]: next }));
    };
  }

  const isMonthSort = months.some((m) => m.key === sort.key);

  const sortedRows = useMemo(() => {
    const copy = [...rows];
    if (isMonthSort) {
      copy.sort((a, b) => {
        const rankDiff = RATING_RANK[b.ratings[sort.key]] - RATING_RANK[a.ratings[sort.key]];
        if (rankDiff !== 0) return rankDiff;
        return a.travelHours - b.travelHours;
      });
    } else {
      const getField = FIELD_SORTERS[sort.key];
      copy.sort((a, b) => {
        const av = getField(a);
        const bv = getField(b);
        const diff = typeof av === "number" ? av - bv : av.localeCompare(bv);
        return sort.dir === "asc" ? diff : -diff;
      });
    }
    return copy;
  }, [rows, sort, isMonthSort]);

  function toggleField(key) {
    setSort((prev) =>
      prev.key === key ? { key, dir: prev.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" }
    );
  }

  function toggleMonth(key) {
    setSort((prev) => (prev.key === key ? { key: "travel", dir: "asc" } : { key, dir: "desc" }));
  }

  return (
    <div className="h-full flex flex-col">
      {/* flex-nowrap + overflow-x-auto on mobile: five legend items wrap to
          2-3 lines at 390px, eating vertical space the table needs more.
          One scrollable line costs nothing to read (it's a key, not content)
          and sm:flex-wrap gives it room to breathe back on wider screens. */}
      <div className="flex-none flex flex-nowrap sm:flex-wrap items-center gap-x-4 gap-y-2 mb-3 sm:mb-4 overflow-x-auto sm:overflow-visible whitespace-nowrap sm:whitespace-normal">
        {Object.entries(RATING_LABEL).map(([level, label]) => (
          <div key={level} className="flex items-center gap-1.5 shrink-0">
            <div className={`w-4 h-4 rounded-[4px] ${LEVEL_FILL[level]}`} />
            <MicroLabel>{label}</MicroLabel>
          </div>
        ))}
        <div className="flex items-center gap-1.5 shrink-0">
          <div className="w-4 h-4 rounded-[4px]" style={SHOULDER_STRIPE.prime} />
          <MicroLabel>Shoulder — higher variance</MicroLabel>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="flex-1 min-h-0 overflow-auto rounded-card-lg border border-card"
      >
        {/* table-fixed + explicit column widths, not min-w: under the default
            auto layout, columns with only a min-width still absorb leftover
            table space unevenly (Travel would blow out past 300px). Fixed
            layout makes every column's width literal, and the w-max/w-full
            split means the table sizes to exactly 100% of its container at
            typical desktop widths (no scrollbar needed) while staying
            wider-than-viewport on mobile (so the month grid scrolls under
            the sticky destination column). overflow stays on (both axes)
            at every breakpoint rather than being switched off above sm: a
            hovered cell's tooltip is wider than its cell and can nudge
            scrollWidth past clientWidth even when the table itself fits,
            and at an in-between viewport width the table can be a few px
            wider than its container too — either way this must stay
            scrollable, or the overflow gets silently clipped by body's
            overflow-x-hidden instead (unreachable columns, not just an
            ugly scrollbar). flex-1/min-h-0 (rather than a max-h guess) is
            what makes the table's own scroll fill whatever height the page
            actually gives this component — the page is a flex column with
            a fixed viewport height, this is its only flexible child — and
            the sticky thead (top-0) plus the sticky first column (left-0)
            keep both axes' labels in view while scrolling either way. */}
        <table className="border-collapse table-fixed w-max sm:w-full">
          <thead>
            <tr className="border-b border-card">
              <th className="sticky top-0 left-0 z-30 bg-page text-left px-2.5 sm:px-3 py-2.5 w-[130px] sm:w-[190px] border-r border-card">
                <button
                  type="button"
                  onClick={() => toggleField("name")}
                  className={`flex items-center gap-1 font-data text-[9px] sm:text-[10px] tracking-label-wide uppercase transition-colors duration-fast ease-smooth focus-ring rounded-sm ${
                    sort.key === "name" ? "text-accent" : "text-dim hover:text-ink"
                  }`}
                >
                  Destination
                  {sort.key === "name" && (
                    <Arrow direction={sort.dir === "asc" ? 0 : 180} className="text-[8px]" />
                  )}
                </button>
              </th>
              <SortHeader
                label="Travel"
                active={sort.key === "travel"}
                dir={sort.dir}
                onClick={() => toggleField("travel")}
                className="hidden sm:table-cell px-3 py-2.5 sm:w-[140px]"
              />
              <SortHeader
                label="Water"
                active={sort.key === "water"}
                dir={sort.dir}
                onClick={() => toggleField("water")}
                className="hidden sm:table-cell px-3 py-2.5 sm:w-[80px]"
              />
              {months.map((m) => (
                <th
                  key={m.key}
                  className="sticky top-0 z-20 bg-page px-1 py-2.5 w-11 sm:w-10"
                  onMouseEnter={() => setHoverMonth(m.key)}
                  onMouseLeave={() => setHoverMonth(null)}
                >
                  <button
                    type="button"
                    onClick={() => toggleMonth(m.key)}
                    className={`font-data text-[9px] sm:text-[10px] tracking-label-wide uppercase focus-ring rounded-sm transition-colors duration-fast ease-smooth ${
                      sort.key === m.key ? "text-accent" : "text-dim hover:text-ink"
                    }`}
                  >
                    {m.label}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedRows.map((row, rowIndex) => (
              <tr key={row.id} className="border-b border-card last:border-b-0">
                {(() => {
                  const primeThisMonth =
                    hoverMonth !== null &&
                    row.ratings[hoverMonth] === "prime" &&
                    !row.shoulder.includes(hoverMonth);
                  const rowDimmed = hoverMonth !== null && !primeThisMonth;
                  const nameKey = `name:${row.id}`;
                  const namePosition = dynamicPos[nameKey] || (rowIndex === 0 ? "bottom" : "top");
                  return (
                    <td
                      className={`sticky left-0 bg-page px-2.5 sm:px-3 py-2 border-r border-card border-l-2 transition-colors duration-fast ease-smooth ${
                        primeThisMonth ? "border-l-accent" : "border-l-transparent"
                      } ${namePosition === "bottom" ? "z-[15]" : "z-10"}`}
                    >
                      {/* A tooltip that opens "bottom" extends into the next
                          row's space; that row's own sticky cell is a sibling
                          stacking context at the same z-10, and DOM order
                          alone would let it paint over this tooltip's z-50.
                          Bump this cell above that (but still below the
                          sticky header's z-20/30, which must win against
                          every row when the table scrolls vertically) so its
                          whole subtree — tooltip included — wins. Whichever
                          row currently opens "bottom" needs this, not just
                          row 0 — namePosition is measured per hover, not
                          fixed to a row index. */}
                      <div
                        className={`transition-opacity duration-fast ease-smooth ${
                          rowDimmed ? "opacity-25" : ""
                        }`}
                        onMouseEnter={measurePosition(nameKey, 260)}
                      >
                        <Tooltip content={nameTooltip(row)} position={namePosition} wide>
                          <div
                            className={`font-body text-[13px] leading-tight cursor-help hover:underline decoration-dotted decoration-ink/30 underline-offset-2 w-fit ${
                              primeThisMonth ? "text-accent" : "text-ink"
                            }`}
                          >
                            {row.name}
                          </div>
                          <div className="font-body text-[11px] text-faded-ink leading-tight mt-0.5">
                            {row.location}
                          </div>
                          <div className="sm:hidden font-data text-[10px] text-dim leading-snug mt-1">
                            {row.travelLabel} · {row.waterTemp}
                          </div>
                        </Tooltip>
                      </div>
                    </td>
                  );
                })()}
                <td className="hidden sm:table-cell px-3 py-2 font-data text-[11px] text-faded-ink leading-snug">
                  {row.travelLabel}
                </td>
                <td className="hidden sm:table-cell px-3 py-2 font-data text-[11px] text-faded-ink whitespace-nowrap">
                  {row.waterTemp}
                </td>
                {months.map((m, monthIndex) => {
                  // Last two columns still always open "left" — near the
                  // table's own right edge, a centered tooltip would poke
                  // past it regardless of scroll position (a horizontal,
                  // not vertical, version of the same clipping problem).
                  const isEdgeMonth = monthIndex >= months.length - 2;
                  const cellKey = `cell:${row.id}:${m.key}`;
                  const cellPosition = isEdgeMonth
                    ? "left"
                    : dynamicPos[cellKey] || (rowIndex === 0 ? "bottom" : "top");
                  return (
                    <td key={m.key} className="px-1 py-1.5">
                      <RatingCell
                        row={row}
                        month={m}
                        hovered={hoverMonth === m.key}
                        anyMonthHovered={hoverMonth !== null}
                        tooltipPosition={cellPosition}
                        onMeasureHover={isEdgeMonth ? undefined : measurePosition(cellKey, 140)}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
