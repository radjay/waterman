"use client";

import { CameraOff, Maximize } from "lucide-react";
import { LiveCam, streamUrlFor } from "../now/LiveCam";
import { dtf } from "../../lib/datetime";

/**
 * The cam, in a box.
 *
 * Every screen shows the same picture at the same ratio, so the frame is one
 * component: 16:9, no overlay chrome except the fullscreen affordance, and an
 * explicit offline state rather than a black rectangle.
 *
 * A dead cam is information. The card around it still carries the station
 * reading and the score, so the frame says WHEN it died — "CAM OFFLINE SINCE
 * 08:20" — rather than just failing quietly. A spot that never had a cam gets
 * the same treatment without a time, because "no cam here" and "the cam broke
 * this morning" are different answers.
 *
 * @param {object} spot
 * @param {boolean} [rounded]   corner radius token, 0 for the full-bleed hero
 * @param {Function} [onFullscreen]
 * @param {number|null} [offlineSince] ms — renders the offline plate
 */
const TZ = "Europe/Lisbon";
const clock = (ms) =>
  dtf("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: TZ }).format(new Date(ms));

export function CamFrame({
  spot,
  radius = 0,
  onFullscreen,
  offlineSince = null,
  ratio = "16 / 9",
  fill = false,
  overlay = null,
  className = "",
}) {
  const hasStream = Boolean(streamUrlFor(spot));

  return (
    <div
      className={`relative overflow-hidden bg-offline-bg ${fill ? "w-full h-full" : "w-full"} ${className}`}
      style={{ borderRadius: radius || undefined, aspectRatio: fill ? undefined : ratio }}
    >
      {hasStream ? (
        <LiveCam spot={spot} />
      ) : (
        <CamOffline since={offlineSince} never={!spot?.webcamUrl && !spot?.webcamStreamId} />
      )}

      {overlay}

      {onFullscreen && hasStream && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onFullscreen();
          }}
          aria-label="Open the cam fullscreen"
          className="absolute top-[11px] right-[14px] w-8 h-8 rounded-full flex items-center justify-center focus-ring transition-opacity duration-fast ease-smooth hover:opacity-80"
          style={{
            // Fixed, not tokenised: this sits on a photograph, not on the page,
            // so it must not follow the theme.
            background: "rgba(4,8,13,.6)",
            border: "1px solid rgba(234,244,246,.28)",
            color: "#EAF4F6",
          }}
        >
          <Maximize size={14} />
        </button>
      )}
    </div>
  );
}

export function CamOffline({ since = null, never = false }) {
  return (
    <span className="absolute inset-0 bg-offline-bg flex flex-col items-center justify-center gap-[9px]">
      <CameraOff size={24} className="text-dim" />
      <span className="font-data text-[10px] tracking-[0.18em] text-dim uppercase text-center px-3">
        {never ? "No cam at this spot" : since ? `Cam offline since ${clock(since)}` : "Cam offline"}
      </span>
    </span>
  );
}

/** The 76×50 still used in the compact spot cards under the Now hero. */
export function CamThumb({ spot, className = "" }) {
  const hasStream = Boolean(streamUrlFor(spot));
  return (
    <div
      className={`relative overflow-hidden rounded-[9px] flex-none w-[76px] h-[50px] ${
        hasStream ? "" : "bg-offline-bg flex items-center justify-center text-dim"
      } ${className}`}
    >
      {hasStream ? <LiveCam spot={spot} /> : <CameraOff size={17} />}
    </div>
  );
}
