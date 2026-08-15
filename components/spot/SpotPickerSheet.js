"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronDown, ChevronUp, Settings2 } from "lucide-react";
import { SpotRow } from "./SpotRow";
import { sportMeta } from "../sport/SportProvider";

/**
 * The spot picker: every spot with its score and its live wind, right now.
 *
 * Not a select. The choice a rider is making is "which of my beaches is worth
 * it", so the control has to carry the same evidence the screen does — a list
 * of names would make them pick blind and then check, four times.
 *
 * It opens from the screen title rather than from a settings icon because the
 * title IS the current spot; the chevron on it is the affordance. EDIT MY SPOTS
 * sits at the bottom, after the answer, so the common case (switch spot) is one
 * tap and the rare one (change the list) is still reachable.
 */
export const ALL_SPOTS = "__all__";
/** Full coast wall on LIVE — distinct from favorites (`ALL_SPOTS`). */
export const ALL_COAST_SPOTS = "__all_coast__";

export function SpotPickerSheet({
  open,
  onClose,
  spots = [],
  value,
  onChange,
  sport,
  title,
  /**
   * Adds an "All my spots" row at the top. Next and Live are lists rather than
   * single-spot views, so they need a way back out of a spot as well as into
   * one — Now and Spot forecast are always about exactly one beach and do not.
   */
  allOption = false,
  /**
   * LIVE only: adds an "All spots" row (full coast via useCoastData.spots).
   * Kept separate from "All my spots" so favorites stay the default.
   */
  coastAllOption = false,
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose?.();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const router = useRouter();
  if (!open) return null;

  const hasAggregate = allOption || coastAllOption;

  return (
    <>
      <div
        className="fixed inset-0 z-40"
        style={{ background: "rgba(4,8,13,.6)", backdropFilter: "blur(2px)" }}
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        role="listbox"
        aria-label="Spot"
        className="absolute left-0 right-0 top-full mt-3 z-50 rounded-card-xl bg-nav-bg border border-nav-border shadow-nav backdrop-blur-md overflow-hidden md:left-auto md:right-auto md:min-w-[360px]"
      >
        <div className="px-4 pt-[13px] pb-[9px] font-data text-[9px] tracking-label-wide text-dim uppercase">
          {title ?? "My spots"} · {sportMeta(sport).label}
        </div>

        {allOption && (
          <button
            type="button"
            onClick={() => {
              onChange?.(ALL_SPOTS);
              onClose?.();
            }}
            className={`w-full flex items-center gap-3 px-4 py-3 text-left focus-ring transition-colors duration-fast ease-smooth ${
              value === ALL_SPOTS ? "bg-accent-tint" : "hover:bg-ink-hover"
            }`}
          >
            <span className="flex-1 font-headline font-bold text-[16px] tracking-display text-ink">
              All my spots
            </span>
            {value === ALL_SPOTS && <Check size={17} className="text-accent flex-none" />}
          </button>
        )}

        {coastAllOption && (
          <button
            type="button"
            onClick={() => {
              onChange?.(ALL_COAST_SPOTS);
              onClose?.();
            }}
            className={`w-full flex items-center gap-3 px-4 py-3 text-left focus-ring transition-colors duration-fast ease-smooth border-t border-card ${
              value === ALL_COAST_SPOTS ? "bg-accent-tint" : "hover:bg-ink-hover"
            }`}
          >
            <span className="flex-1 font-headline font-bold text-[16px] tracking-display text-ink">
              All spots
            </span>
            {value === ALL_COAST_SPOTS && <Check size={17} className="text-accent flex-none" />}
          </button>
        )}

        {spots.map((entry, i) => {
          const active = entry.spot._id === value;
          return (
            <SpotRow
              key={entry.spot._id}
              spot={entry.spot}
              score={entry.score}
              slot={entry.slot}
              station={entry.station}
              sport={sport}
              suffix={entry.suffix}
              size="sm"
              dim={entry.score === null || entry.score === undefined}
              onClick={() => {
                onChange?.(entry.spot._id);
                onClose?.();
              }}
              className={`${i > 0 || hasAggregate ? "border-t border-card" : ""} ${
                active ? "bg-accent-tint" : "hover:bg-ink-hover"
              } transition-colors duration-fast ease-smooth`}
              trailing={active ? <Check size={17} className="text-accent flex-none" /> : null}
            />
          );
        })}

        {spots.length === 0 && (
          <div className="px-4 py-5 text-[13px] text-faded-ink">
            No spots do {sportMeta(sport).label.toLowerCase()} yet.
          </div>
        )}

        <button
          type="button"
          onClick={() => {
            onClose?.();
            router.push("/settings");
          }}
          className="w-full flex items-center gap-2.5 px-4 py-3 border-t border-card font-data text-[11px] tracking-label text-faded-ink hover:bg-ink-hover transition-colors duration-fast ease-smooth focus-ring"
        >
          <Settings2 size={14} />
          EDIT MY SPOTS
        </button>
      </div>
    </>
  );
}

/**
 * The title that opens it. A heading and its chevron, not a heading with a
 * button next to it — the whole phrase is the target.
 */
export function SpotTitle({
  children,
  open,
  onClick,
  size = 24,
  desktopSize,
  className = "",
}) {
  const Chevron = open ? ChevronUp : ChevronDown;
  // One element, two sizes, rather than two copies behind `md:hidden`. The
  // duplicate version could not truncate: an inline wrapper ignores min-w-0,
  // so a long spot name ("Bico, Sao Pedro do Estoril") ran straight through
  // the sport pill instead of ellipsing.
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={open}
      aria-haspopup="listbox"
      className={`flex items-center gap-2 min-w-0 text-left focus-ring rounded-[6px] ${className}`}
      style={{ "--h": `${size}px`, "--hd": `${desktopSize ?? size}px` }}
    >
      <span className="font-headline font-extrabold tracking-display-tight text-ink leading-none truncate text-[length:var(--h)] md:text-[length:var(--hd)]">
        {children}
      </span>
      <Chevron
        className={`flex-none w-[17px] h-[17px] md:w-[22px] md:h-[22px] ${
          open ? "text-accent" : "text-faded-ink"
        }`}
      />
    </button>
  );
}
