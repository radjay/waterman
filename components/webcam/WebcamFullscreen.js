"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, X, CircleGauge, ChartNoAxesCombined } from "lucide-react";
import Hls from "hls.js";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../convex/_generated/api";
import { WindGroup } from "../forecast/WindGroup";
import { ScoreDial } from "../ui/ScoreDial";
import { LiveStationBadge } from "../ui/LiveStationBadge";
import { OVER_VIDEO_SCRIM } from "../ui/CamFrame";
import { WaveGroup } from "../forecast/WaveGroup";
import { WavesArrowDown, WavesArrowUp } from "lucide-react";
import { formatTideTime } from "../../lib/utils";
import { useVisualViewportRect } from "../../lib/hooks/useVisualViewportRect";

const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);

/**
 * Fullscreen webcam modal component with video and metadata.
 *
 * @param {Object} spot - Webcam spot object
 * @param {number|null} score - Condition score for this spot right now. Passed
 *   in rather than fetched: scores live in condition_scores (not the forecast
 *   slots this component loads), and every caller already has the number the
 *   rider is here to confirm.
 * @param {object|null} station - Same pack.station as CamFrame / wind chart.
 *   LiveStationBadge top-left when present; surfing callers pass null.
 * @param {boolean} [showExternalLinks] Windguru + Windy (NOW / LIVE) left of close.
 * @param {Function} onClose - Callback to close the modal
 * @param {Array} allWebcams - Array of all available webcams for navigation
 * @param {Function} onNavigate - Callback to navigate to a different webcam
 */
export function WebcamFullscreen({
  spot,
  score = null,
  station = null,
  showExternalLinks = false,
  onClose,
  allWebcams = [],
  onNavigate,
}) {
  const videoRef = useRef(null);
  const shellRef = useRef(null);
  const zoomContainerRef = useRef(null);
  const hlsRef = useRef(null);
  const [currentConditions, setCurrentConditions] = useState(null);
  const [tides, setTides] = useState([]);
  const [loading, setLoading] = useState(true);
  // Match the visible iOS viewport (not layout viewport after rotate/zoom).
  const viewport = useVisualViewportRect();

  // Get stream URL based on source
  const getStreamUrl = () => {
    // New format: webcamStreamId + webcamStreamSource
    if (spot.webcamStreamId) {
      if (spot.webcamStreamSource === "quanteec") {
        return `https://deliverys5.quanteec.com/contents/encodings/live/${spot.webcamStreamId}/media_0.m3u8`;
      } else if (spot.webcamStreamSource === "iol") {
        return spot.webcamStreamId; // IOL streamId is already the full URL
      }
    }
    
    // Old format: webcamUrl (full URL)
    if (spot.webcamUrl && spot.webcamUrl.trim() !== "") {
      return spot.webcamUrl;
    }
    
    return null;
  };

  // Initialize HLS player
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const streamUrl = getStreamUrl();
    if (!streamUrl) {
      console.error("No stream URL available for spot:", spot.name);
      return;
    }

    const initializePlayer = () => {
      if (Hls.isSupported()) {
        // Clean up existing HLS instance
        if (hlsRef.current) {
          hlsRef.current.destroy();
        }

        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: true,
          backBufferLength: 90,
        });

        hlsRef.current = hls;
        hls.loadSource(streamUrl);
        hls.attachMedia(video);

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          // Check if video element is still valid before playing
          if (video && videoRef.current === video) {
            const playPromise = video.play();
            if (playPromise !== undefined) {
              playPromise.catch((error) => {
                // Ignore AbortError - it's expected when cleanup happens
                if (error.name !== "AbortError" && error.name !== "NotAllowedError") {
                  console.error("Error playing video:", error);
                }
              });
            }
          }
        });

        hls.on(Hls.Events.ERROR, (event, data) => {
          if (data.fatal) {
            switch (data.type) {
              case Hls.ErrorTypes.NETWORK_ERROR:
                console.log("Fatal network error encountered, trying to recover");
                hls.startLoad();
                break;
              case Hls.ErrorTypes.MEDIA_ERROR:
                console.log("Fatal media error encountered, trying to recover");
                hls.recoverMediaError();
                break;
              default:
                console.log("Fatal error, cannot recover");
                hls.destroy();
                break;
            }
          }
        });
      } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
        // For Safari, which has native HLS support
        video.src = streamUrl;
        video.addEventListener("loadedmetadata", () => {
          // Check if video element is still valid before playing
          if (video && videoRef.current === video) {
            const playPromise = video.play();
            if (playPromise !== undefined) {
              playPromise.catch((error) => {
                // Ignore AbortError - it's expected when cleanup happens
                if (error.name !== "AbortError" && error.name !== "NotAllowedError") {
                  console.error("Error playing video:", error);
                }
              });
            }
          }
        });
      }
    };

    initializePlayer();

    // Cleanup function
    return () => {
      // Pause video before cleanup to prevent AbortError
      if (video && videoRef.current === video) {
        video.pause();
        video.src = "";
        video.load();
      }
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [spot.webcamStreamId, spot.webcamStreamSource, spot.webcamUrl]);

  // Fetch current conditions and tides
  useEffect(() => {
    async function fetchConditions() {
      try {
        let targetSpotId = null;

        // First, check if this spot itself has forecast data (if it's not webcam-only)
        if (!spot.webcamOnly) {
          // This spot is being scraped, use its own data
          targetSpotId = spot._id;
        } else {
          // This is a webcam-only spot, find a nearby spot with forecast data
          if (!spot.latitude || !spot.longitude) {
            setLoading(false);
            return;
          }

          const allSpots = await client.query(api.spots.list, {});
          
          let nearbySpot = null;
          let minDistance = Infinity;
          
          for (const s of allSpots) {
            if (s.webcamOnly || !s.latitude || !s.longitude) continue;
            
            const latDiff = Math.abs(s.latitude - spot.latitude);
            const lngDiff = Math.abs(s.longitude - spot.longitude);
            const distance = Math.sqrt(latDiff * latDiff + lngDiff * lngDiff);
            
            if (distance < minDistance) {
              minDistance = distance;
              nearbySpot = s;
            }
          }

          if (nearbySpot) {
            targetSpotId = nearbySpot._id;
          }
        }

        if (targetSpotId) {
          // Get current forecast slot
          const slots = await client.query(api.spots.getForecastSlots, {
            spotId: targetSpotId,
          });

          if (slots && slots.length > 0) {
            const now = Date.now();
            const currentSlot = slots.reduce((closest, slot) => {
              const closestDiff = Math.abs(closest.timestamp - now);
              const slotDiff = Math.abs(slot.timestamp - now);
              return slotDiff < closestDiff ? slot : closest;
            });

            setCurrentConditions({
              speed: currentSlot.speed,
              gust: currentSlot.gust,
              direction: currentSlot.direction,
              waveHeight: currentSlot.waveHeight,
              wavePeriod: currentSlot.wavePeriod,
              waveDirection: currentSlot.waveDirection,
            });
          }

          // Get tides
          const tidesData = await client.query(api.spots.getTides, {
            spotId: targetSpotId,
          });

          if (tidesData && tidesData.length > 0) {
            const now = Date.now();
            const futureTides = tidesData
              .filter(t => t.time >= now)
              .slice(0, 2);
            setTides(futureTides.map(tide => ({
              type: tide.type,
              time: tide.time,
              height: tide.height,
              timeStr: formatTideTime(new Date(tide.time)),
              isExactTime: true,
            })));
          }
        }
      } catch (error) {
        console.error("Error fetching conditions:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchConditions();
  }, [spot._id, spot.webcamOnly, spot.latitude, spot.longitude]);

  const index = allWebcams.findIndex((w) => w._id === spot._id);

  /** Move `delta` cams, wrapping. No-op when there is nowhere to go. */
  const step = (delta) => {
    if (!onNavigate || allWebcams.length < 2 || index === -1) return;
    const next = (index + delta + allWebcams.length) % allWebcams.length;
    onNavigate(allWebcams[next]);
  };

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Escape key to close
      if (e.key === "Escape") {
        onClose();
        return;
      }
      
      // F key to toggle fullscreen
      if (e.key === "f" || e.key === "F") {
        e.preventDefault();
        if (videoRef.current) {
          if (!document.fullscreenElement) {
            videoRef.current.requestFullscreen?.();
          } else {
            document.exitFullscreen?.();
          }
        }
        return;
      }
      
      // Arrow keys to navigate between cams. Shares `step` with the on-screen
      // buttons so the two can never disagree about wrap-around.
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        step(-1);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        step(1);
      }
    };
    
    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "unset";
    };
  }, [onClose, allWebcams, onNavigate, spot._id, index]);

  // `touchAction: none` on the shell stops most pinch-zoom, but iOS Safari's
  // page-scale pinch is a system gesture that can win over touch-action once
  // a second finger lands on a <video>. Pin the viewport's scale for as long
  // as this modal is open so the system gesture has nothing to do — the
  // pinch handler below then owns zooming, and only the video zooms.
  useEffect(() => {
    const meta = document.querySelector('meta[name="viewport"]');
    const original = meta?.getAttribute("content") ?? null;
    if (meta) {
      meta.setAttribute(
        "content",
        "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no"
      );
    }
    return () => {
      if (meta && original !== null) meta.setAttribute("content", original);
    };
  }, []);

  // Belt-and-braces: block stray multi-touch moves and WebKit's non-standard
  // gesture* events anywhere in the shell (e.g. a pinch that starts over the
  // overlay controls rather than the video).
  useEffect(() => {
    const shell = shellRef.current;
    if (!shell) return;

    const blockMultiTouch = (e) => {
      if (e.touches && e.touches.length > 1) e.preventDefault();
    };
    const blockGesture = (e) => e.preventDefault();

    shell.addEventListener("touchmove", blockMultiTouch, { passive: false });
    shell.addEventListener("gesturestart", blockGesture);
    shell.addEventListener("gesturechange", blockGesture);

    return () => {
      shell.removeEventListener("touchmove", blockMultiTouch);
      shell.removeEventListener("gesturestart", blockGesture);
      shell.removeEventListener("gesturechange", blockGesture);
    };
  }, []);

  // Pinch-to-zoom and drag-to-pan on the video itself, so the cam image can
  // actually be magnified without dragging the overlay controls along with
  // it. Scale/pan live in a ref (not state) and are written straight to the
  // video's transform so drag frames never wait on a React re-render.
  useEffect(() => {
    const container = zoomContainerRef.current;
    const video = videoRef.current;
    if (!container || !video) return;

    const MAX_SCALE = 4;
    const zoom = { scale: 1, tx: 0, ty: 0 };
    let gesture = null; // { mode: "pinch" | "pan", ... }
    let tapStart = null; // { time, x, y }
    let lastTap = null; // { time, x, y }

    const applyTransform = (animate = false) => {
      video.style.transition = animate ? "transform 200ms ease-out" : "none";
      video.style.transform = `translate(${zoom.tx}px, ${zoom.ty}px) scale(${zoom.scale})`;
    };

    const clampTranslate = (tx, ty, scale, rect) => {
      if (scale <= 1) return { tx: 0, ty: 0 };
      const minTx = rect.width * (1 - scale);
      const minTy = rect.height * (1 - scale);
      return {
        tx: Math.min(0, Math.max(minTx, tx)),
        ty: Math.min(0, Math.max(minTy, ty)),
      };
    };

    const dist = (t0, t1) => Math.hypot(t1.clientX - t0.clientX, t1.clientY - t0.clientY);
    const midpoint = (t0, t1, rect) => ({
      x: (t0.clientX + t1.clientX) / 2 - rect.left,
      y: (t0.clientY + t1.clientY) / 2 - rect.top,
    });

    const reset = (animate) => {
      zoom.scale = 1;
      zoom.tx = 0;
      zoom.ty = 0;
      applyTransform(animate);
    };

    const onTouchStart = (e) => {
      const rect = container.getBoundingClientRect();

      if (e.touches.length === 2) {
        const [t0, t1] = e.touches;
        const mid = midpoint(t0, t1, rect);
        gesture = {
          mode: "pinch",
          startDist: dist(t0, t1),
          startScale: zoom.scale,
          anchor: {
            x: (mid.x - zoom.tx) / zoom.scale,
            y: (mid.y - zoom.ty) / zoom.scale,
          },
        };
        tapStart = null;
        e.preventDefault();
        return;
      }

      if (e.touches.length === 1) {
        const t = e.touches[0];
        tapStart = { time: Date.now(), x: t.clientX, y: t.clientY };
        if (zoom.scale > 1) {
          gesture = { mode: "pan", lastX: t.clientX, lastY: t.clientY };
          e.preventDefault();
        }
      }
    };

    const onTouchMove = (e) => {
      if (!gesture) return;
      const rect = container.getBoundingClientRect();

      if (gesture.mode === "pinch" && e.touches.length === 2) {
        e.preventDefault();
        const [t0, t1] = e.touches;
        const newScale = Math.min(
          MAX_SCALE,
          Math.max(1, gesture.startScale * (dist(t0, t1) / gesture.startDist))
        );
        const mid = midpoint(t0, t1, rect);
        const { tx, ty } = clampTranslate(
          mid.x - gesture.anchor.x * newScale,
          mid.y - gesture.anchor.y * newScale,
          newScale,
          rect
        );
        zoom.scale = newScale;
        zoom.tx = tx;
        zoom.ty = ty;
        applyTransform(false);
      } else if (gesture.mode === "pan" && e.touches.length === 1) {
        e.preventDefault();
        const t = e.touches[0];
        const dx = t.clientX - gesture.lastX;
        const dy = t.clientY - gesture.lastY;
        gesture.lastX = t.clientX;
        gesture.lastY = t.clientY;
        const { tx, ty } = clampTranslate(zoom.tx + dx, zoom.ty + dy, zoom.scale, rect);
        zoom.tx = tx;
        zoom.ty = ty;
        applyTransform(false);
      }
    };

    const onTouchEnd = (e) => {
      // Hand a pinch off to a pan if one finger is still down and zoomed in.
      if (e.touches.length === 1 && zoom.scale > 1) {
        const t = e.touches[0];
        gesture = { mode: "pan", lastX: t.clientX, lastY: t.clientY };
      } else if (e.touches.length === 0) {
        gesture = null;
        // A stray pinch that lands back under 1x snaps cleanly to identity.
        if (zoom.scale < 1.02) reset(true);

        if (tapStart) {
          const t = e.changedTouches[0];
          const moved = Math.hypot(t.clientX - tapStart.x, t.clientY - tapStart.y);
          const quick = Date.now() - tapStart.time < 300 && moved < 10;
          if (quick) {
            const isDoubleTap =
              lastTap &&
              Date.now() - lastTap.time < 350 &&
              Math.hypot(t.clientX - lastTap.x, t.clientY - lastTap.y) < 30;
            if (isDoubleTap && zoom.scale > 1) {
              reset(true);
              lastTap = null;
            } else {
              lastTap = { time: Date.now(), x: t.clientX, y: t.clientY };
            }
          }
        }
        tapStart = null;
      }
    };

    container.addEventListener("touchstart", onTouchStart, { passive: false });
    container.addEventListener("touchmove", onTouchMove, { passive: false });
    container.addEventListener("touchend", onTouchEnd, { passive: false });
    container.addEventListener("touchcancel", onTouchEnd, { passive: false });

    return () => {
      container.removeEventListener("touchstart", onTouchStart);
      container.removeEventListener("touchmove", onTouchMove);
      container.removeEventListener("touchend", onTouchEnd);
      container.removeEventListener("touchcancel", onTouchEnd);
      video.style.transition = "";
      video.style.transform = "";
    };
  }, [spot._id]);

  if (!spot) return null;

  return (
    <div
      ref={shellRef}
      className="fixed z-[9999] flex items-center justify-center cursor-pointer"
      style={{
        top: viewport.top,
        left: viewport.left,
        width: viewport.width ?? "100%",
        height: viewport.height ?? "100%",
        // Scope pinch-zoom block to this shell only (not site-wide user-scalable).
        touchAction: "none",
      }}
      onClick={onClose}
    >
      {/* Background layer */}
      <div className="absolute inset-0 bg-black/95" />
      <div
        className="relative w-full h-full flex flex-col"
        style={{
          paddingTop: "env(safe-area-inset-top, 0px)",
          paddingRight: "env(safe-area-inset-right, 0px)",
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
          paddingLeft: "env(safe-area-inset-left, 0px)",
        }}
      >
        {/* Paging affordance. Arrow keys already worked; nothing on screen
            said so, and with the conditions bar hidden there was no way to tell
            which beach you had paged to. */}
        {allWebcams.length > 1 && onNavigate && (
          <>
            <button
              onClick={(e) => { e.stopPropagation(); step(-1); }}
              aria-label="Previous cam"
              className="absolute top-1/2 -translate-y-1/2 z-20 p-2.5 rounded-full bg-black/50 text-white/70 hover:text-white hover:bg-black/70 transition-colors"
              style={{ left: "calc(env(safe-area-inset-left, 0px) + 0.75rem)" }}
            >
              <ChevronLeft size={22} />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); step(1); }}
              aria-label="Next cam"
              className="absolute top-1/2 -translate-y-1/2 z-20 p-2.5 rounded-full bg-black/50 text-white/70 hover:text-white hover:bg-black/70 transition-colors"
              style={{ right: "calc(env(safe-area-inset-right, 0px) + 0.75rem)" }}
            >
              <ChevronRight size={22} />
            </button>
          </>
        )}

        {/* Top controls: Windguru/Windy (LIVE) + record + close.
            Absolute kids ignore parent padding — bake safe-area into top/right. */}
        <div
          className="absolute z-20 flex items-center gap-2"
          style={{
            top: "calc(env(safe-area-inset-top, 0px) + 1rem)",
            right: "calc(env(safe-area-inset-right, 0px) + 1rem)",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {allWebcams.length > 1 && (
            <span className="font-data text-[11px] text-white/60 tabular-nums px-2">
              {index + 1} / {allWebcams.length}
            </span>
          )}
          {showExternalLinks && spot.liveReportUrl && (
            <a
              href={spot.liveReportUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="w-8 h-8 rounded-full flex items-center justify-center"
              style={OVER_VIDEO_SCRIM}
              aria-label="Open Windguru live report"
              title="Windguru"
            >
              <CircleGauge size={14} />
            </a>
          )}
          {showExternalLinks && spot.url && (
            <a
              href={spot.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="w-8 h-8 rounded-full flex items-center justify-center"
              style={OVER_VIDEO_SCRIM}
              aria-label="Open Windy forecast"
              title="Windy"
            >
              <ChartNoAxesCombined size={14} />
            </a>
          )}
          <button
            onClick={onClose}
            className="text-white hover:text-white/70 transition-colors bg-black/50 rounded-full p-2"
            aria-label="Close webcam"
          >
            <X size={24} />
          </button>
        </div>

        {/* LIVE station — same pack.station as CamFrame; no second fetch. */}
        {station && (
          <span
            className="absolute z-20 pointer-events-none"
            style={{
              top: "calc(env(safe-area-inset-top, 0px) + 1rem)",
              left: "calc(env(safe-area-inset-left, 0px) + 1rem)",
            }}
          >
            <LiveStationBadge station={station} />
          </span>
        )}

        {/* Video container - fills viewport with letterboxing (no cropping). Click letterbox bars to close.
            overflow-hidden also clips the video once pinch-zoomed, so a magnified image never spills onto
            the overlay controls above/below it. */}
        <div ref={zoomContainerRef} className="flex-1 flex items-center justify-center relative z-0 overflow-hidden min-h-0">
          <video
            ref={videoRef}
            className="w-full h-full object-contain"
            style={{ transformOrigin: "0 0", touchAction: "none" }}
            playsInline
            muted
            autoPlay
            onClick={(e) => e.stopPropagation()}
          />
        </div>

        {/* Conditions bar.
            Landscape (any width) and md+ share one thin row — phones in
            landscape stay under `md` but still need a single bottom strip, not
            the tall stack. Do NOT use `landscape:hidden` on the whole bar:
            that is an orientation query and wiped the data on every desktop.
            Portrait phones keep a compact stack that must not eat the cam. */}
        <div
          className="absolute bottom-0 left-0 right-0 z-20 bg-black/80 backdrop-blur-sm border-t border-white/10 px-3 py-2 landscape:py-1.5 md:px-6 md:py-4"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="max-w-6xl mx-auto">
            {/* Single thin row: landscape (any width) or desktop */}
            <div className="hidden landscape:flex md:flex items-center w-full gap-3 md:gap-8 min-w-0">
              <div className="flex-shrink-0 flex items-center gap-2 md:gap-3 min-w-0 md:min-w-[200px]">
                {score != null && <ScoreDial score={score} size="sm" showAll />}
                <div className="min-w-0">
                  <h2 className="font-headline text-sm md:text-xl font-bold text-white truncate md:mb-1">
                    {spot.name}
                  </h2>
                  {spot.town && (
                    <p className="hidden md:block text-white/60 text-sm">{spot.town}</p>
                  )}
                </div>
              </div>

              {loading ? (
                <div className="text-white/60 text-xs md:text-sm">Loading conditions...</div>
              ) : currentConditions ? (
                <div className="flex items-center gap-2 md:gap-8 flex-1 min-w-0 overflow-x-auto scrollbar-hide">
                  <div className="bg-white/5 rounded-lg px-2.5 py-1 md:px-6 md:py-3 flex-shrink-0 md:flex-1">
                    <div className="text-white">
                      <WindGroup
                        speed={currentConditions.speed}
                        gust={currentConditions.gust}
                        direction={currentConditions.direction}
                      />
                    </div>
                  </div>

                  {currentConditions.waveHeight !== undefined && (
                    <div className="bg-white/5 rounded-lg px-2.5 py-1 md:px-6 md:py-3 flex-shrink-0 md:flex-1">
                      <div className="text-white">
                        <WaveGroup
                          waveHeight={currentConditions.waveHeight}
                          wavePeriod={currentConditions.wavePeriod}
                          waveDirection={currentConditions.waveDirection}
                        />
                      </div>
                    </div>
                  )}

                  {tides.length > 0 && (
                    <div className="bg-white/5 rounded-lg px-2.5 py-1 md:px-6 md:py-3 flex-shrink-0 md:flex-1">
                      <div className="flex items-center justify-center gap-2 md:gap-4">
                        {tides.map((tide, idx) => {
                          const type = tide.type?.toLowerCase();
                          const timeStr = tide.timeStr || formatTideTime(new Date(tide.time));
                          return (
                            <div key={idx} className="flex items-center gap-1.5 md:gap-2 text-white text-xs md:text-base">
                              {type === 'high' ? (
                                <WavesArrowUp size={14} className="text-white flex-shrink-0" strokeWidth={2} />
                              ) : type === 'low' ? (
                                <WavesArrowDown size={14} className="text-white flex-shrink-0" strokeWidth={2} />
                              ) : (
                                <span className="text-white">•</span>
                              )}
                              <span className="font-data tabular-nums">{timeStr}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-white/60 text-xs md:text-sm">No condition data available</div>
              )}
            </div>

            {/* Portrait phone only: compact stack (hidden in landscape and on md+) */}
            <div className="flex flex-col landscape:hidden md:hidden">
              <div className="mb-2 flex items-center gap-2">
                {score != null && <ScoreDial score={score} size="sm" showAll />}
                <div className="min-w-0">
                  <h2 className="font-headline text-base font-bold text-white truncate">
                    {spot.name}
                  </h2>
                </div>
              </div>

              {loading ? (
                <div className="text-white/60 text-sm">Loading conditions...</div>
              ) : currentConditions ? (
                <div className="flex flex-col gap-1.5">
                  <div className="bg-white/5 rounded-lg px-2.5 py-1.5">
                    <div className="text-white">
                      <WindGroup
                        speed={currentConditions.speed}
                        gust={currentConditions.gust}
                        direction={currentConditions.direction}
                      />
                    </div>
                  </div>

                  {currentConditions.waveHeight !== undefined && (
                    <div className="bg-white/5 rounded-lg px-2.5 py-1.5">
                      <div className="text-white">
                        <WaveGroup
                          waveHeight={currentConditions.waveHeight}
                          wavePeriod={currentConditions.wavePeriod}
                          waveDirection={currentConditions.waveDirection}
                        />
                      </div>
                    </div>
                  )}

                  {tides.length > 0 && (
                    <div className="bg-white/5 rounded-lg px-2.5 py-1.5">
                      <div className="flex items-center gap-3">
                        {tides.map((tide, idx) => {
                          const type = tide.type?.toLowerCase();
                          const timeStr = tide.timeStr || formatTideTime(new Date(tide.time));
                          return (
                            <div key={idx} className="flex items-center gap-2 text-white text-sm">
                              {type === 'high' ? (
                                <WavesArrowUp size={14} className="text-white flex-shrink-0" strokeWidth={2} />
                              ) : type === 'low' ? (
                                <WavesArrowDown size={14} className="text-white flex-shrink-0" strokeWidth={2} />
                              ) : (
                                <span className="text-white">•</span>
                              )}
                              <span className="font-data tabular-nums">{timeStr}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-white/60 text-sm">No condition data available</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

