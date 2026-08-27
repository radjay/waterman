"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

/**
 * Collapsed details for a report. Uses details/summary so it opens
 * without JavaScript. Title is a micro label; caption is the one-line hint.
 */
export function DetailsBlock({ title, caption, children, defaultOpen = false, className = "" }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <details
      open={open}
      onToggle={(event) => setOpen(event.currentTarget.open)}
      className={`rounded-card-lg border border-card bg-surface overflow-hidden ${className}`}
    >
      <summary className="flex items-center gap-2.5 px-4 py-3 cursor-pointer list-none focus-ring [&::-webkit-details-marker]:hidden">
        <span className="flex-1 min-w-0">
          <span className="block font-data text-[10px] tracking-label-wide uppercase text-faded-ink">
            {title}
          </span>
          {caption ? <span className="block text-[13px] text-dim mt-0.5">{caption}</span> : null}
        </span>
        <ChevronDown
          size={16}
          className={`flex-none text-dim transition-transform duration-base ease-smooth ${
            open ? "rotate-180" : ""
          }`}
        />
      </summary>
      <div className="px-4 pb-4 pt-3 border-t border-card">{children}</div>
    </details>
  );
}
