"use client";

import { ScoreBadge } from "../shared/ScoreBadge";
import { Metric } from "../shared/Metric";
import { formatTime } from "../../lib/utils";

/**
 * RightNowMarquee Component
 *
 * Prominent display of the best condition RIGHT NOW
 * Shows live cam preview if available
 */

export function RightNowMarquee({ slot, spot, onViewCam, onViewDetails }) {
  if (!slot || !spot) return null;

  const score = slot.score?.value || 0;
  const windSpeed = slot.wind?.speed || "--";
  const windDir = slot.wind?.deg;

  return (
    <div className="relative bg-gradient-to-br from-emerald-50 to-green-50 border-2 border-emerald-600 rounded-lg overflow-hidden shadow-lg">
      {/* Top stripe */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-600 via-green-500 to-emerald-600"></div>

      <div className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
              <span className="text-xs font-bold uppercase tracking-wide text-emerald-800">
                Right Now
              </span>
            </div>
            <h2 className="font-headline text-2xl md:text-3xl font-bold text-ink">
              {spot.name}
            </h2>
            <p className="text-sm text-ink/60 font-mono mt-1">{formatTime(new Date())}</p>
          </div>
          <ScoreBadge score={score} size="large" showLabel />
        </div>

        {/* Metrics */}
        <div className="flex items-center gap-6 mb-4">
          <Metric label="Wind" value={windSpeed} unit="kn" trend={windDir} />
          {slot.waves?.height && (
            <Metric label="Swell" value={slot.waves.height} unit="m" />
          )}
          {slot.weather?.temp && (
            <Metric label="Temp" value={slot.weather.temp} unit="°C" />
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          {spot.webcamUrl && (
            <button
              onClick={onViewCam}
              className="px-4 py-2 bg-ink text-newsprint rounded-md font-bold text-sm hover:bg-ink/90 transition-colors"
            >
              📹 View Live Cam
            </button>
          )}
          <button
            onClick={onViewDetails}
            className="px-4 py-2 bg-newsprint border-2 border-ink/20 text-ink rounded-md font-bold text-sm hover:border-ink/40 transition-colors"
          >
            See Full Forecast
          </button>
        </div>

        {/* Score reasoning preview */}
        {slot.score?.reasoning && (
          <div className="mt-4 p-3 bg-white/50 rounded border border-emerald-200">
            <p className="text-sm text-ink/80 line-clamp-2">{slot.score.reasoning}</p>
          </div>
        )}
      </div>
    </div>
  );
}
