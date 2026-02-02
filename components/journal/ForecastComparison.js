"use client";

import { Wind, Waves, ArrowUp } from "lucide-react";
import { getDisplayWindDirection } from "../../lib/utils";

export function ForecastComparison({ forecastSlots, sport }) {
  if (!forecastSlots || forecastSlots.length === 0) {
    return (
      <div className="bg-ink/5 rounded-lg p-4 border-2 border-ink/10">
        <div className="text-sm text-ink/60">
          No forecast data available
        </div>
      </div>
    );
  }

  return (
    <div className="bg-ink/5 rounded-lg p-4 border-2 border-ink/10 space-y-4">
      <div className="text-sm font-medium text-ink/70 uppercase">
        Forecasted Conditions
      </div>
      {forecastSlots.map((slot, idx) => (
        <div
          key={slot._id}
          className={`bg-white rounded-md p-4 ${
            forecastSlots.length > 1 ? "border-2 border-ink/10" : ""
          }`}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm font-medium text-ink">
              {new Date(slot.timestamp).toLocaleTimeString("en-US", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </div>
            {slot.score && (
              <div className="flex items-center gap-2">
                <div
                  className={`text-lg font-bold ${
                    slot.score.value >= 90
                      ? "text-purple-600"
                      : slot.score.value >= 75
                      ? "text-green-600"
                      : slot.score.value >= 60
                      ? "text-yellow-600"
                      : "text-ink/50"
                  }`}
                >
                  {slot.score.value}
                </div>
                {slot.score.value >= 90 && (
                  <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs font-medium rounded">
                    EPIC
                  </span>
                )}
                {slot.score.value >= 75 && slot.score.value < 90 && (
                  <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded">
                    IDEAL
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <div className="text-xs text-ink/50 uppercase mb-1">Wind</div>
              <div className="flex items-center gap-1">
                <Wind className="w-4 h-4 text-ink/50" />
                <span className="font-medium">{slot.speed}</span>
                <span className="text-ink/50">kts</span>
                <ArrowUp
                  className="w-3 h-3 text-ink/50"
                  style={{ transform: `rotate(${slot.direction}deg)` }}
                />
                <span className="text-ink/50">
                  {getDisplayWindDirection(slot.direction)}
                </span>
              </div>
              <div className="text-xs text-ink/50 mt-1">
                Gust: {slot.gust} kts
              </div>
            </div>

            {slot.waveHeight !== undefined && (
              <>
                <div>
                  <div className="text-xs text-ink/50 uppercase mb-1">Waves</div>
                  <div className="flex items-center gap-1">
                    <Waves className="w-4 h-4 text-ink/50" />
                    <span className="font-medium">{slot.waveHeight}</span>
                    <span className="text-ink/50">m</span>
                  </div>
                  {slot.wavePeriod !== undefined && (
                    <div className="text-xs text-ink/50 mt-1">
                      Period: {slot.wavePeriod}s
                    </div>
                  )}
                </div>
              </>
            )}

            {slot.score?.reasoning && (
              <div className="col-span-2">
                <div className="text-xs text-ink/50 uppercase mb-1">Reasoning</div>
                <div className="text-sm text-ink/70">{slot.score.reasoning}</div>
              </div>
            )}
          </div>

          {forecastSlots.length > 1 && idx < forecastSlots.length - 1 && (
            <div className="text-center text-ink/30 mt-2">↓</div>
          )}
        </div>
      ))}
    </div>
  );
}
