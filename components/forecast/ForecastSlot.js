import { WindGroup } from "./WindGroup";
import { WaveGroup } from "./WaveGroup";
import { TideDisplay } from "../tide/TideDisplay";
import { Flame, ChevronRight, User } from "lucide-react";
import { useState } from "react";
import { ScoreModal } from "../common/ScoreModal";
import { Tooltip } from "../ui/Tooltip";

/**
 * FlameRating - shows 1-3 flames based on score quality
 * 3 flames + "EPIC!" = score >= 90
 * 2 flames = score >= 75
 * 1 flame = score >= 60
 */
function FlameRating({ score }) {
  if (!score || score < 60) return null;
  
  const flameCount = score >= 90 ? 3 : score >= 75 ? 2 : 1;
  const isEpic = score >= 90;
  
  return (
    <div className="flex items-center gap-0.5 text-green-700">
      {isEpic && <span className="mr-1 font-headline font-bold text-[0.65rem] uppercase tracking-wide">EPIC!</span>}
      {Array.from({ length: flameCount }).map((_, i) => (
        <Flame key={i} size={14} fill="currentColor" />
      ))}
    </div>
  );
}

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
 * @param {string} spotName - Name of the spot (for score modal)
 * @param {string} className - Additional CSS classes
 */
export function ForecastSlot({
  slot,
  nearbyTide,
  isSurfing = false,
  showFilter = "best",
  spotName = "",
  className = "",
}) {
  const [isScoreModalOpen, setIsScoreModalOpen] = useState(false);

  // Generate ID for this slot (for deep linking)
  const slotId = slot._id || `slot-${slot.timestamp}`;

  return (
    <>
      {/* Desktop: Row layout */}
      <div
        id={slotId}
        className={`hidden md:grid ${
          isSurfing
            ? "grid-cols-[80px_0.7fr_1.1fr_150px_120px] gap-2"
            : "grid-cols-[80px_1fr_1fr_120px] gap-2"
        } items-stretch py-3 px-0 border-b border-ink/20 font-body text-[0.95rem] w-full group ${
          showFilter === "all" &&
          slot.score &&
          slot.score.value >= 60 &&
          !slot.isIdeal
            ? "bg-[rgba(134,239,172,0.15)]"
            : slot.isIdeal
              ? "bg-[rgba(134,239,172,0.3)]"
              : "bg-transparent"
        } ${slot.isEpic ? "is-epic" : ""} ${slot.isContextual ? "opacity-50" : ""} ${className}`}
      >
        <div className="font-bold text-ink pl-2 flex items-center h-full">
          {slot.hour}
        </div>

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

        {/* Tide column */}
        {isSurfing && nearbyTide && <TideDisplay tide={nearbyTide} />}

        <div className="flex items-center justify-end mr-2 gap-2 min-w-[120px]">
          {slot.score && <FlameRating score={slot.score.value} />}
          {/* Personalized indicator + Score button */}
          {slot.score ? (
            <button
              onClick={() => setIsScoreModalOpen(true)}
              className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity text-ink hover:text-ink/60 pointer-events-none group-hover:pointer-events-auto"
              aria-label="View score report"
            >
              {slot.score.isPersonalized && (
                <Tooltip content="Personalized for you" position="left">
                  <User size={12} className="text-ink/40" />
                </Tooltip>
              )}
              <ChevronRight size={18} />
            </button>
          ) : (
            <div className="w-[18px]"></div>
          )}
        </div>
      </div>

      {/* Mobile: Card layout */}
      <div
        id={slotId}
        className={`md:hidden border-b border-ink/20 px-2 py-4 ${
          showFilter === "all" &&
          slot.score &&
          slot.score.value >= 60 &&
          !slot.isIdeal
            ? "bg-[rgba(134,239,172,0.15)]"
            : slot.isIdeal
              ? "bg-[rgba(134,239,172,0.3)]"
              : "bg-newsprint"
        } ${slot.isEpic ? "is-epic" : ""} ${slot.isContextual ? "opacity-50" : ""} ${className}`}
      >
        <div className="flex justify-between items-start mb-3">
          <div>
            <div className="font-bold text-ink text-lg">{slot.hour}</div>
          </div>
          <div className="flex items-center gap-2">
            {slot.score && <FlameRating score={slot.score.value} />}
            {/* Personalized indicator + Score button for mobile */}
            {slot.score && (
              <button
                onClick={() => setIsScoreModalOpen(true)}
                className="flex items-center justify-center gap-1 text-ink hover:text-ink/60 transition-colors"
                aria-label="View score report"
              >
                {slot.score.isPersonalized && (
                  <Tooltip content="Personalized for you" position="left">
                    <User size={12} className="text-ink/40" />
                  </Tooltip>
                )}
                <ChevronRight size={18} />
              </button>
            )}
          </div>
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
          {isSurfing && nearbyTide && <TideDisplay tide={nearbyTide} />}
        </div>
      </div>

      {/* Score Modal */}
      {slot.score && (
        <ScoreModal
          isOpen={isScoreModalOpen}
          onClose={() => setIsScoreModalOpen(false)}
          score={slot.score}
          slot={slot}
          spotName={spotName}
        />
      )}
    </>
  );
}
