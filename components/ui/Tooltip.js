"use client";

import { useEffect, useId, useRef, useState } from "react";

/**
 * Tooltip — short copy on hover, and on click/tap for touch.
 *
 * Use `wide` for multi-line AI verdicts and other prose tips; the default is a
 * single-line chip for scale keys and icons.
 *
 * @param {React.ReactNode} children
 * @param {React.ReactNode} content
 * @param {"top"|"bottom"|"left"|"right"} [position]
 * @param {boolean} [wide]  Wrap long copy; max-width for timeslot verdicts
 * @param {string} [className]  Applied to the wrapper (may be absolute for charts)
 * @param {object} [style]
 */
export function Tooltip({
  children,
  content,
  position = "top",
  wide = false,
  className = "",
  style,
}) {
  const [isVisible, setIsVisible] = useState(false);
  const wrapRef = useRef(null);
  const tipId = useId();

  useEffect(() => {
    if (!isVisible) return;
    const onPointerDown = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setIsVisible(false);
      }
    };
    const onKey = (e) => {
      if (e.key === "Escape") setIsVisible(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [isVisible]);

  const positionClasses = {
    top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
    bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
    left: "right-full top-1/2 -translate-y-1/2 mr-2",
    right: "left-full top-1/2 -translate-y-1/2 ml-2",
  };

  const show = Boolean(isVisible && content);
  // Callers like ScoreBand pass `absolute` so the tip sits on a chart column.
  // Adding `relative` on top of that made Tailwind resolve to relative and
  // dropped the columns out of the plot into document flow.
  const positioned = /\b(absolute|fixed|sticky)\b/.test(className);

  return (
    <div
      ref={wrapRef}
      className={`${positioned ? "" : "relative"} ${className}`}
      style={style}
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
      onFocus={() => setIsVisible(true)}
      onBlur={(e) => {
        if (!wrapRef.current?.contains(e.relatedTarget)) setIsVisible(false);
      }}
      onPointerUp={(e) => {
        // Hover already reveals on a mouse. Touch/pen has no hover, so tap toggles.
        if (e.pointerType === "touch" || e.pointerType === "pen") {
          setIsVisible((v) => !v);
        }
      }}
    >
      {children}
      <div
        id={tipId}
        className={`absolute ${positionClasses[position]} z-50 pointer-events-none transition-all duration-fast ease-smooth ${
          wide
            ? "px-3 py-2 text-[11px] leading-[1.4] font-body text-left whitespace-normal max-w-[220px] w-max"
            : "px-2.5 py-1.5 text-xs font-medium whitespace-nowrap"
        } text-newsprint bg-ink rounded-ui shadow-elevated ${
          show ? "opacity-100 translate-y-0" : "opacity-0 translate-y-1"
        }`}
        role="tooltip"
        aria-hidden={!show}
      >
        {content}
      </div>
    </div>
  );
}
