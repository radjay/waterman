import { WindGroup } from "./WindGroup";
import { WaveGroup } from "./WaveGroup";
import { Badge } from "../ui/Badge";
import { WavesArrowDown, WavesArrowUp } from "lucide-react";

/**
 * ForecastSlot component displays a single forecast time slot.
 * 
 * Shows wind, wave, and tide data for a specific time. Displays differently
 * on desktop (row layout) vs mobile (card layout).
 * 
 * @param {Object} slot - Forecast slot data with timestamp, speed, gust, direction, wave data, etc.
 * @param {Object|null} nearbyTide - Nearby tide information (for surfing spots)
 * @param {boolean} isSurfing - Whether this is a surfing spot
 * @param {string} showFilter - Filter mode: "best" (only ideal conditions) or "all" (all conditions)
 * @param {string} className - Additional CSS classes
 */
export function ForecastSlot({ slot, nearbyTide, isSurfing = false, showFilter = "best", className = "" }) {
  return (
    <>
      {/* Desktop: Row layout */}
      <div
        className={`hidden md:grid grid-cols-[80px_1fr_1fr_100px_60px] items-stretch py-3 px-0 border-b border-ink font-body text-[0.95rem] ${
          showFilter === "all" && slot.matchesCriteria && !slot.isIdeal
            ? "bg-[rgba(134,239,172,0.15)]"
            : slot.isIdeal
            ? "bg-[rgba(134,239,172,0.3)]"
            : "bg-transparent"
        } ${slot.isEpic ? "is-epic" : ""} ${className}`}
      >
        <div className="font-bold text-ink pl-3 flex items-center h-full">
          {slot.hour}
        </div>

        <WindGroup 
          speed={slot.speed} 
          gust={slot.gust} 
          direction={slot.direction}
          showGust={!isSurfing}
          className="mr-8"
        />

        <WaveGroup
          waveHeight={slot.waveHeight}
          wavePeriod={slot.wavePeriod}
          waveDirection={slot.waveDirection}
        />

        {/* Tide column */}
        {isSurfing && nearbyTide && (
          <div className="flex items-center gap-2 text-sm text-ink">
            {nearbyTide.type?.toLowerCase() === 'high' ? (
              <WavesArrowUp size={16} className="text-ink flex-shrink-0" strokeWidth={2} />
            ) : nearbyTide.type?.toLowerCase() === 'low' ? (
              <WavesArrowDown size={16} className="text-ink flex-shrink-0" strokeWidth={2} />
            ) : (
              <span className="text-ink">•</span>
            )}
            <span className="font-body whitespace-nowrap">
              {nearbyTide.timeStr} {nearbyTide.height !== null ? `(${nearbyTide.height.toFixed(1)}m)` : ''}
            </span>
          </div>
        )}

        <div className="flex items-center">
          {slot.isEpic && <Badge variant="epic">EPIC</Badge>}
        </div>
      </div>

      {/* Mobile: Card layout */}
      <div
        className={`md:hidden border-b border-ink p-4 ${
          showFilter === "all" && slot.matchesCriteria && !slot.isIdeal
            ? "bg-[rgba(134,239,172,0.15)]"
            : slot.isIdeal
            ? "bg-[rgba(134,239,172,0.3)]"
            : "bg-newsprint"
        } ${slot.isEpic ? "is-epic" : ""} ${className}`}
      >
        <div className="flex justify-between items-start mb-3">
          <div>
            <div className="font-bold text-ink text-lg">{slot.hour}</div>
          </div>
          {slot.isEpic && <Badge variant="epic">EPIC</Badge>}
        </div>

        <div className="space-y-3">
          <WindGroup 
            speed={slot.speed} 
            gust={slot.gust} 
            direction={slot.direction}
            showGust={!isSurfing}
          />
          <WaveGroup
            waveHeight={slot.waveHeight}
            wavePeriod={slot.wavePeriod}
            waveDirection={slot.waveDirection}
          />
          {isSurfing && nearbyTide && (
            <div className="flex items-center gap-2 text-sm text-ink">
              {nearbyTide.type?.toLowerCase() === 'high' ? (
                <WavesArrowUp size={16} className="text-ink flex-shrink-0" strokeWidth={2} />
              ) : nearbyTide.type?.toLowerCase() === 'low' ? (
                <WavesArrowDown size={16} className="text-ink flex-shrink-0" strokeWidth={2} />
              ) : (
                <span className="text-ink">•</span>
              )}
              <span className="font-body whitespace-nowrap">
                {nearbyTide.timeStr} {nearbyTide.height !== null ? `(${nearbyTide.height.toFixed(1)}m)` : ''}
              </span>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

