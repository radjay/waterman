"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import Hls from "hls.js";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../convex/_generated/api";
import { WindGroup } from "../forecast/WindGroup";
import { WaveGroup } from "../forecast/WaveGroup";
import { WavesArrowDown, WavesArrowUp } from "lucide-react";
import { formatTideTime } from "../../lib/utils";

const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);

/**
 * Fullscreen webcam modal component with video and metadata.
 * 
 * @param {Object} spot - Webcam spot object
 * @param {Function} onClose - Callback to close the modal
 * @param {Array} allWebcams - Array of all available webcams for navigation
 * @param {Function} onNavigate - Callback to navigate to a different webcam
 */
export function WebcamFullscreen({ spot, onClose, allWebcams = [], onNavigate }) {
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
      
      // Arrow keys to navigate between cams
      if (allWebcams.length > 1 && onNavigate) {
        const currentIndex = allWebcams.findIndex(w => w._id === spot._id);
        if (currentIndex === -1) return;
        
        if (e.key === "ArrowLeft") {
          e.preventDefault();
          const prevIndex = currentIndex === 0 ? allWebcams.length - 1 : currentIndex - 1;
          onNavigate(allWebcams[prevIndex]);
        } else if (e.key === "ArrowRight") {
          e.preventDefault();
          const nextIndex = (currentIndex + 1) % allWebcams.length;
          onNavigate(allWebcams[nextIndex]);
        }
      }
    };
    
    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";
    
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "unset";
    };
  }, [onClose, allWebcams, onNavigate, spot._id]);

  if (!spot) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      onClick={onClose}
    >
      {/* Background layer that extends into safe areas */}
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
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 text-white hover:text-gray-300 transition-colors bg-black/50 rounded-full p-2"
          aria-label="Close webcam"
        >
          <X size={24} />
        </button>

        {/* Video container */}
        <div className="flex-1 flex items-center justify-center p-4 relative z-0 overflow-hidden min-h-0">
          <video
            ref={videoRef}
            className="max-w-full max-h-full object-contain"
            playsInline
            muted
            autoPlay
          />
        </div>

        {/* Metadata overlay at bottom - responsive layout */}
        <div className="absolute bottom-0 left-0 right-0 z-20 bg-black/80 backdrop-blur-sm border-t border-white/10 p-4 md:p-6 landscape:hidden">
          <div className="max-w-6xl mx-auto">
            {/* Large screens: single row with spot name and metadata side by side */}
            <div className="hidden md:flex items-center w-full gap-8">
              {/* Spot name */}
              <div className="flex-shrink-0 min-w-[200px]">
                <h2 className="font-headline text-xl font-bold text-white mb-1">
                  {spot.name}
                </h2>
                {spot.town && (
                  <p className="text-white/60 text-sm">{spot.town}</p>
                )}
              </div>

              {/* Metadata in a row - evenly spaced */}
              {loading ? (
                <div className="text-white/60 text-sm">Loading conditions...</div>
              ) : currentConditions ? (
                <div className="flex items-center justify-between gap-8 flex-1">
                  {/* Wind */}
                  <div className="bg-white/5 rounded-lg px-6 py-3 flex-1">
                    <div className="text-white">
                      <WindGroup
                        speed={currentConditions.speed}
                        gust={currentConditions.gust}
                        direction={currentConditions.direction}
                      />
                    </div>
                  </div>

                  {/* Waves */}
                  {currentConditions.waveHeight !== undefined && (
                    <div className="bg-white/5 rounded-lg px-6 py-3 flex-1">
                      <div className="text-white">
                        <WaveGroup
                          waveHeight={currentConditions.waveHeight}
                          wavePeriod={currentConditions.wavePeriod}
                          waveDirection={currentConditions.waveDirection}
                        />
                      </div>
                    </div>
                  )}

                  {/* Tides */}
                  {tides.length > 0 && (
                    <div className="bg-white/5 rounded-lg px-6 py-3 flex-1">
                      <div className="flex items-center justify-center gap-4">
                        {tides.map((tide, idx) => {
                          const type = tide.type?.toLowerCase();
                          const timeStr = tide.timeStr || formatTideTime(new Date(tide.time));
                          return (
                            <div key={idx} className="flex items-center gap-2 text-white">
                              {type === 'high' ? (
                                <WavesArrowUp size={14} className="text-white flex-shrink-0" strokeWidth={2} />
                              ) : type === 'low' ? (
                                <WavesArrowDown size={14} className="text-white flex-shrink-0" strokeWidth={2} />
                              ) : (
                                <span className="text-white">•</span>
                              )}
                              <span>{timeStr}</span>
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

            {/* Mobile portrait: stacked layout */}
            <div className="md:hidden">
              {/* Spot name */}
              <div className="mb-4">
                <h2 className="font-headline text-lg font-bold text-white mb-1">
                  {spot.name}
                </h2>
                {spot.town && (
                  <p className="text-white/60 text-sm">{spot.town}</p>
                )}
              </div>

              {/* Metadata stacked in three rows */}
              {loading ? (
                <div className="text-white/60 text-sm">Loading conditions...</div>
              ) : currentConditions ? (
                <div className="flex flex-col gap-3">
                  {/* Wind */}
                  <div className="bg-white/5 rounded-lg p-3">
                    <div className="text-white">
                      <WindGroup
                        speed={currentConditions.speed}
                        gust={currentConditions.gust}
                        direction={currentConditions.direction}
                      />
                    </div>
                  </div>

                  {/* Waves */}
                  {currentConditions.waveHeight !== undefined && (
                    <div className="bg-white/5 rounded-lg p-3">
                      <div className="text-white">
                        <WaveGroup
                          waveHeight={currentConditions.waveHeight}
                          wavePeriod={currentConditions.wavePeriod}
                          waveDirection={currentConditions.waveDirection}
                        />
                      </div>
                    </div>
                  )}

                  {/* Tides */}
                  {tides.length > 0 && (
                    <div className="bg-white/5 rounded-lg p-3">
                      <div className="flex items-center gap-3">
                        {tides.map((tide, idx) => {
                          const type = tide.type?.toLowerCase();
                          const timeStr = tide.timeStr || formatTideTime(new Date(tide.time));
                          return (
                            <div key={idx} className="flex items-center gap-2 text-white">
                              {type === 'high' ? (
                                <WavesArrowUp size={14} className="text-white flex-shrink-0" strokeWidth={2} />
                              ) : type === 'low' ? (
                                <WavesArrowDown size={14} className="text-white flex-shrink-0" strokeWidth={2} />
                              ) : (
                                <span className="text-white">•</span>
                              )}
                              <span>{timeStr}</span>
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

