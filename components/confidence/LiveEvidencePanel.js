"use client";

import { useState } from "react";
import { Expand } from "lucide-react";
import { Badge } from "../ui/Badge";
import { LiveCam, streamUrlFor } from "../now/LiveCam";
import { StationCard } from "../now/EvidenceStack";
import { WebcamFullscreen } from "../webcam/WebcamFullscreen";
import {
  LiveWindIndicator,
  extractWindguruStationId,
} from "../wind/LiveWindIndicator";

/**
 * Live check for the window page.
 *
 * Order: station numbers (actionable) → cam preview (scene). The cam is a
 * fixed short strip, not a hero — fullscreen is one tap away. A section
 * label matches HourByHour / ScoreFactors so the page reads as a stack of
 * equal sections rather than a score, a list, then a full-bleed beach.
 */
export function LiveEvidencePanel({ spot, station, score = null, className = "" }) {
  const [camOpen, setCamOpen] = useState(false);
  const hasCam = Boolean(spot && streamUrlFor(spot));
  if (!hasCam && !station) return null;

  return (
    <section className={`min-w-0 ${className}`}>
      <h2 className="font-data text-[9px] tracking-label-wide text-dim mb-2.5">LIVE</h2>

      <div className="flex flex-col gap-2.5">
        {station && <StationCard station={station} />}

        {hasCam && (
          <button
            type="button"
            onClick={() => setCamOpen(true)}
            aria-label="Open the live cam fullscreen"
            // Fixed short strip — a full-width 16:9 hero was eating the
            // viewport. Cover fills the strip (peek the scene); tap for the
            // uncropped frame in fullscreen.
            className="group relative block w-full h-[160px] sm:h-[200px] rounded-[15px] overflow-hidden border border-card bg-black focus-ring text-left"
          >
            <LiveCam spot={spot} fit="cover" />
            <span className="absolute top-[9px] left-[9px] z-10 flex items-center gap-[7px] pointer-events-none">
              <LiveWindIndicator
                stationId={extractWindguruStationId(spot?.liveReportUrl)}
                compact
                fallback={
                  <Badge variant="live">
                    <span className="w-1.5 h-1.5 rounded-full bg-page" />
                    LIVE
                  </Badge>
                }
              />
            </span>
            <span
              className="absolute bottom-[9px] right-[9px] z-10 flex items-center gap-1 rounded-pill bg-black/55 px-2 py-1 font-data text-[9px] tracking-label text-white pointer-events-none opacity-90 group-hover:opacity-100"
              aria-hidden="true"
            >
              <Expand size={11} />
              FULLSCREEN
            </span>
          </button>
        )}
      </div>

      {camOpen && spot && (
        <WebcamFullscreen
          spot={spot}
          score={score}
          onClose={() => setCamOpen(false)}
        />
      )}
    </section>
  );
}
