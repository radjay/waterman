"use client";

import { formatTideTime } from "../../lib/utils";

export function TideSection({ slots, className = "" }) {
  // Extract unique tide events from slots
  const tideEvents = [];
  const seenTides = new Set();

  slots.forEach((slot) => {
    if (slot.tideType && slot.tideTime && !seenTides.has(slot.tideTime)) {
      seenTides.add(slot.tideTime);
      const timeStr = formatTideTime(slot.tideTime);
      
      tideEvents.push({
        time: slot.tideTime,
        type: slot.tideType,
        height: slot.tideHeight,
        timeStr,
      });
    }
  });

  // Sort by time
  tideEvents.sort((a, b) => a.time - b.time);

  if (tideEvents.length === 0) {
    return null;
  }

  return (
    <div className={`mb-4 ${className}`}>
      <div className="font-headline text-sm font-bold text-ink mb-2 uppercase">
        Tides
      </div>
      <ul className="list-none space-y-1">
        {tideEvents.map((tide, idx) => (
          <li key={idx} className="font-body text-ink text-sm">
            - {tide.type} {tide.timeStr}{tide.height !== null ? ` ${tide.height.toFixed(1)}m` : ''}
          </li>
        ))}
      </ul>
    </div>
  );
}

