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
import { RecordButton } from "./RecordButton";

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
 * @param {boolean} [showExternalLinks] Windguru + Windy (LIVE) left of close.
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
  const hlsRef = useRef(null);
  const [currentConditions, setCurrentConditions] = useState(null);
  const [tides, setTides] = useState([]);
  const [loading, setLoading] = useState(true);

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

  if (!spot) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center cursor-pointer"
      onClick={onClose}
    >
      {/* Background layer */}
      <div
        className="absolute inset-0 bg-black/95"
        style={{
          top: 'calc(-1 * env(safe-area-inset-top, 0px))',
          right: 'calc(-1 * env(safe-area-inset-right, 0px))',
          bottom: 'calc(-1 * env(safe-area-inset-bottom, 0px))',
          left: 'calc(-1 * env(safe-area-inset-left, 0px))',
        }}
      />
      <div
        className="relative w-full h-full flex flex-col"
        style={{
          paddingTop: 'env(safe-area-inset-top, 0px)',
          paddingRight: 'env(safe-area-inset-right, 0px)',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
          paddingLeft: 'env(safe-area-inset-left, 0px)',
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
              className="absolute left-3 top-1/2 -translate-y-1/2 z-20 p-2.5 rounded-full bg-black/50 text-white/70 hover:text-white hover:bg-black/70 transition-colors"
            >
              <ChevronLeft size={22} />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); step(1); }}
              aria-label="Next cam"
              className="absolute right-3 top-1/2 -translate-y-1/2 z-20 p-2.5 rounded-full bg-black/50 text-white/70 hover:text-white hover:bg-black/70 transition-colors"
            >
              <ChevronRight size={22} />
            </button>
          </>
        )}

        {/* Top controls: Windguru/Windy (LIVE) + record + close */}
        <div className="absolute top-4 right-4 z-20 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
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
          <RecordButton spotId={spot._id} />
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
          <span className="absolute top-4 left-4 z-20 pointer-events-none">
            <LiveStationBadge station={station} />
          </span>
        )}

        {/* Video container - fills viewport with letterboxing (no cropping). Click letterbox bars to close. */}
        <div className="flex-1 flex items-center justify-center relative z-0 overflow-hidden min-h-0">
          <video
            ref={videoRef}
            className="w-full h-full object-contain"
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
                    <div className="text-white scale-90 origin-left md:scale-100">
                      <WindGroup
                        speed={currentConditions.speed}
                        gust={currentConditions.gust}
                        direction={currentConditions.direction}
                      />
                    </div>
                  </div>

                  {currentConditions.waveHeight !== undefined && (
                    <div className="bg-white/5 rounded-lg px-2.5 py-1 md:px-6 md:py-3 flex-shrink-0 md:flex-1">
                      <div className="text-white scale-90 origin-left md:scale-100">
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

