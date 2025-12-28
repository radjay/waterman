import { WavesArrowDown, WavesArrowUp } from "lucide-react";
import { formatTideTime } from "../../lib/utils";

/**
 * Display tide information with icon and formatted time.
 * 
 * Shows exact tide time if a high/low tide occurs within the slot period,
 * otherwise shows rising/falling trend indicator (no time, no height).
 * 
 * @param {Object} tide - Tide object with {type, time, height, isExactTime, isRising, isFalling}
 * @param {string} className - Additional CSS classes
 */
export function TideDisplay({ tide, className = "" }) {
  if (!tide) return null;
  
  // If this is an exact tide event (high/low within slot period)
  if (tide.isExactTime) {
    const type = tide.type?.toLowerCase();
    // Use the exact tide time (e.g., "15:30" not the slot time "15:00")
    const timeStr = tide.timeStr || formatTideTime(tide.time);
    // Only show height for exact tide events
    const heightStr = tide.height !== null && tide.height !== undefined 
      ? `(${tide.height.toFixed(1)}m)` 
      : '';
    
    return (
      <div className={`flex items-center gap-2 text-sm text-ink ${className}`}>
        {type === 'high' ? (
          <WavesArrowUp size={16} className="text-ink flex-shrink-0" strokeWidth={2} />
        ) : type === 'low' ? (
          <WavesArrowDown size={16} className="text-ink flex-shrink-0" strokeWidth={2} />
        ) : (
          <span className="text-ink">•</span>
        )}
        <span className="font-body whitespace-nowrap">
          {timeStr} {heightStr}
        </span>
      </div>
    );
  }
  
  // Otherwise, show rising/falling trend (no time, no height)
  // Use WavesArrowUp for rising, WavesArrowDown for falling
  return (
    <div className={`flex items-center gap-2 text-sm text-ink ${className}`}>
      {tide.isRising ? (
        <WavesArrowUp size={16} className="text-ink flex-shrink-0" strokeWidth={2} />
      ) : tide.isFalling ? (
        <WavesArrowDown size={16} className="text-ink flex-shrink-0" strokeWidth={2} />
      ) : (
        <span className="text-ink">•</span>
      )}
      {/* No text for trends - just the icon */}
    </div>
  );
}


