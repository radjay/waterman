"use client";

import { useState } from "react";
import { ChevronDown, FlaskConical } from "lucide-react";

/**
 * Collapsed-by-default container for exploratory readouts.
 *
 * The model comparison is interesting but it is not the verdict, and putting it
 * under the confidence label implied the label was derived from it. Behind a
 * Labs disclosure it stays available to anyone curious without presenting
 * itself as the reason for the answer above.
 *
 * Uses details/summary so it is keyboard-operable and expandable before
 * hydration, rather than a div that needs JavaScript to open.
 */
export function LabsSection({ title, caption, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <details
      open={open}
      onToggle={(e) => setOpen(e.currentTarget.open)}
      className="mt-7 rounded-[15px] border border-card bg-surface overflow-hidden"
    >
      <summary className="flex items-center gap-2.5 px-[14px] py-[13px] cursor-pointer list-none focus-ring [&::-webkit-details-marker]:hidden">
        <FlaskConical size={14} className="text-faded-ink flex-none" />
        <span className="flex-1 min-w-0">
          <span className="block font-data text-[10px] tracking-label text-faded-ink">
            LABS · {title}
          </span>
          {caption && (
            <span className="block font-data text-[9px] text-dim mt-0.5">{caption}</span>
          )}
        </span>
        <ChevronDown
          size={16}
          className={`flex-none text-dim transition-transform duration-base ease-smooth ${
            open ? "rotate-180" : ""
          }`}
        />
      </summary>

      <div className="px-[14px] pb-[14px] pt-1 border-t border-card">{children}</div>
    </details>
  );
}
