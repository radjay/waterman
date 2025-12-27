import { WavesArrowDown, WavesArrowUp } from "lucide-react";
import { formatTideTime } from "../../lib/utils";

/**
 * Display tide information with icon and formatted time.
 * 
 * @param {Object} tide - Tide object with {type, time, height}
 * @param {string} className - Additional CSS classes
 */
export function TideDisplay({ tide, className = "" }) {
  if (!tide) return null;
  
  const type = tide.type?.toLowerCase();
  const timeStr = tide.timeStr || formatTideTime(tide.time);
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


