"use client";

import { CameraOff, Maximize, CircleGauge, ChartNoAxesCombined } from "lucide-react";
import { LiveCam, streamUrlFor } from "../now/LiveCam";
import { LiveStationBadge } from "./LiveStationBadge";
import { dtf } from "../../lib/datetime";

/**
 * The cam, in a box.
 *
 * Every screen shows the same picture at the same ratio, so the frame is one
 * component: 16:9, no overlay chrome except the fullscreen affordance and (when
 * the spot has a live reading) LiveStationBadge in the top-left, plus an
 * explicit offline state rather than a black rectangle.
 *
 * A dead cam is information. The card around it still carries the station
 * reading and the score, so the frame says WHEN it died — "CAM OFFLINE SINCE
 * 08:20" — rather than just failing quietly. A spot that never had a cam gets
 * the same treatment without a time, because "no cam here" and "the cam broke
 * this morning" are different answers.
 *
 * When `onFullscreen` is set and the stream is live, the whole frame opens
 * WebcamFullscreen — not only the corner button. Thumbs use the same contract.
 *
 * Pass the same `pack.station` the wind chart uses — LiveStationBadge returns
 * null when there is no reading, so spots without a station stay clean.
 *
 * `showExternalLinks` (NOW / LIVE) puts Windguru + Windy icons top-right, left
 * of Maximize, with the same over-video scrim. Clicks stopPropagation so they
 * do not open fullscreen.
 *
 * @param {object} spot
 * @param {object|null} [station] pack.station — LIVE badge top-left when present
 * @param {boolean} [showExternalLinks] Windguru/Windy overlays (NOW / LIVE)
 * @param {boolean} [rounded]   corner radius token, 0 for the full-bleed hero
 * @param {Function} [onFullscreen]
 * @param {number|null} [offlineSince] ms — renders the offline plate
 */
const TZ = "Europe/Lisbon";
const clock = (ms) =>
  dtf("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: TZ }).format(new Date(ms));

/** Scrim for controls that sit on footage — must not follow the theme. */
export const OVER_VIDEO_SCRIM = {
  background: "rgba(4,8,13,.6)",
  border: "1px solid rgba(234,244,246,.28)",
  color: "#EAF4F6",
};

function openFullscreen(e, onFullscreen) {
  if (!onFullscreen) return;
  e?.stopPropagation?.();
  e?.preventDefault?.();
  onFullscreen();
}

export function CamFrame({
  spot,
  station = null,
  showExternalLinks = false,
  radius = 0,
  onFullscreen,
  offlineSince = null,
  ratio = "16 / 9",
  fill = false,
  overlay = null,
  className = "",
}) {
  const hasStream = Boolean(streamUrlFor(spot));
  const clickable = Boolean(onFullscreen && hasStream);
  const windguruUrl = showExternalLinks ? spot?.liveReportUrl : null;
  const windyUrl = showExternalLinks ? spot?.url : null;
  const hasLinks = Boolean(windguruUrl || windyUrl);
  const showTopRight = hasLinks || clickable;

  return (
    <div
      className={`relative overflow-hidden bg-offline-bg ${fill ? "w-full h-full" : "w-full"} ${
        clickable ? "cursor-pointer focus-ring" : ""
      } ${className}`}
      style={{ borderRadius: radius || undefined, aspectRatio: fill ? undefined : ratio }}
      role={clickable ? "button" : undefined}
      tabIndex={clickable ? 0 : undefined}
      aria-label={clickable ? "Open the cam fullscreen" : undefined}
      onClick={clickable ? (e) => openFullscreen(e, onFullscreen) : undefined}
      onKeyDown={
        clickable
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") openFullscreen(e, onFullscreen);
            }
          : undefined
      }
    >
      {hasStream ? (
        <LiveCam spot={spot} />
      ) : (
        <CamOffline since={offlineSince} never={!spot?.webcamUrl && !spot?.webcamStreamId} />
      )}

      {(station || overlay) && (
        <span className="absolute top-[11px] left-3 z-[1] pointer-events-none flex items-center gap-2">
          {station && <LiveStationBadge station={station} />}
          {overlay}
        </span>
      )}

      {showTopRight && (
        <span className="absolute top-[11px] right-[14px] z-[1] flex items-center gap-2">
          {windguruUrl && (
            <a
              href={windguruUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
              className="w-8 h-8 rounded-full flex items-center justify-center focus-ring"
              style={OVER_VIDEO_SCRIM}
              aria-label="Open Windguru live report"
              title="Windguru"
            >
              <CircleGauge size={14} />
            </a>
          )}
          {windyUrl && (
            <a
              href={windyUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
              className="w-8 h-8 rounded-full flex items-center justify-center focus-ring"
              style={OVER_VIDEO_SCRIM}
              aria-label="Open Windy forecast"
              title="Windy"
            >
              <ChartNoAxesCombined size={14} />
            </a>
          )}
          {clickable && (
            <span
              aria-hidden="true"
              className="w-8 h-8 rounded-full flex items-center justify-center pointer-events-none transition-opacity duration-fast ease-smooth"
              style={OVER_VIDEO_SCRIM}
            >
              <Maximize size={14} />
            </span>
          )}
        </span>
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
export function CamThumb({ spot, onFullscreen, className = "" }) {
  const hasStream = Boolean(streamUrlFor(spot));
  const clickable = Boolean(onFullscreen && hasStream);
  return (
    <div
      className={`relative overflow-hidden rounded-[9px] flex-none w-[76px] h-[50px] ${
        hasStream ? "" : "bg-offline-bg flex items-center justify-center text-dim"
      } ${clickable ? "cursor-pointer focus-ring" : ""} ${className}`}
      role={clickable ? "button" : undefined}
      tabIndex={clickable ? 0 : undefined}
      aria-label={clickable ? `Open ${spot?.name ?? "cam"} fullscreen` : undefined}
      onClick={clickable ? (e) => openFullscreen(e, onFullscreen) : undefined}
      onKeyDown={
        clickable
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") openFullscreen(e, onFullscreen);
            }
          : undefined
      }
    >
      {hasStream ? <LiveCam spot={spot} /> : <CameraOff size={17} />}
    </div>
  );
}
