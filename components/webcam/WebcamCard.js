"use client";

import { useEffect, useRef, useState } from "react";
import Hls from "hls.js";
import { CircleGauge, ChartNoAxesCombined, Heart, RefreshCw } from "lucide-react";
import { LiveWindIndicator, extractWindguruStationId } from "../wind/LiveWindIndicator";
import { ScorePill } from "../ui/ScorePill";
import { ConditionLine } from "../ui/ConditionLine";
import { formatTime } from "../../lib/utils";

/**
 * WebcamCard component that displays a webcam video stream with current conditions.
 * 
 * @param {Object} spot - Webcam spot object
 * @param {boolean} isFocused - Whether this webcam is in focus/fullscreen
 * @param {boolean} showHoverButtons - Whether to show live/forecast buttons on hover
 * @param {boolean} isFavorite - Whether this spot is favorited by the user
 * @param {Function} onToggleFavorite - Callback when favorite button is clicked
 */
export function WebcamCard({ spot, isFocused = false, showHoverButtons = false, isFavorite = false, onToggleFavorite, forecastData, onScoreClick }) {
  const videoRef = useRef(null);
  const hlsRef = useRef(null);
  const [streamStatus, setStreamStatus] = useState("loading"); // "loading" | "playing" | "error"

  // Get stream URL based on source
  // Handles both new format (webcamStreamId + webcamStreamSource) and old format (webcamUrl)
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
      setStreamStatus("error");
      return;
    }
    setStreamStatus("loading");

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
            setStreamStatus("playing");
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
                setStreamStatus("error");
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

  // Handle visibility changes
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
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
          } else {
            if (video && videoRef.current === video) {
              video.pause();
            }
          }
        });
      },
      {
        threshold: 0.1,
      }
    );

    observer.observe(video);

    return () => {
      observer.disconnect();
    };
  }, []);


  // Check if this is a wind sport spot (for live report button)
  const isWindSport = spot.sports && spot.sports.some((s) => s === "wingfoil");

  return (
    <div
      className={`relative bg-ink/5 rounded-lg overflow-hidden border border-ink/10 transition-[border-color] duration-200 ease-out ${
        isFocused ? "ring-2 ring-ink/20" : ""
      } ${showHoverButtons ? "group-hover:border-ink/30" : ""}`}
    >
      {/* Video player */}
      <div className="relative aspect-video bg-ink/10">
        <video
          ref={videoRef}
          className={`w-full h-full object-cover ${streamStatus === "error" ? "hidden" : ""}`}
          playsInline
          muted
          autoPlay
        />

        {/* Loading state */}
        {streamStatus === "loading" && (
          <div className="absolute inset-0 flex items-center justify-center bg-ink/5">
            <RefreshCw size={24} className="text-ink/30 animate-spin" />
          </div>
        )}

        {/* Error fallback */}
        {streamStatus === "error" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-ink/5 gap-2">
            <span className="text-sm text-ink/40">Stream unavailable</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setStreamStatus("loading");
                // Re-trigger the effect by forcing a state change
                const video = videoRef.current;
                if (video && hlsRef.current) {
                  hlsRef.current.startLoad();
                }
              }}
              className="text-xs text-ink/60 underline hover:text-ink transition-colors"
            >
              Retry
            </button>
          </div>
        )}

        {/* Live wind indicator overlay - top left corner */}
        {spot.liveReportUrl && extractWindguruStationId(spot.liveReportUrl) && (
          <div className="absolute top-2 left-2">
            <LiveWindIndicator
              stationId={extractWindguruStationId(spot.liveReportUrl)}
              compact={true}
            />
          </div>
        )}

        {/* Hover buttons overlay - top right corner */}
        {showHoverButtons && (
          <div className="absolute top-2 right-2 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            {onToggleFavorite && (
              <button
                onClick={onToggleFavorite}
                className="border border-ink/30 rounded p-1.5 bg-newsprint/90 hover:bg-newsprint transition-colors flex items-center justify-center backdrop-blur-sm"
                aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
                title={isFavorite ? "Remove from favorites" : "Add to favorites"}
              >
                <Heart
                  size={14}
                  className={isFavorite ? "text-black fill-black" : "text-black"}
                />
              </button>
            )}
            {spot.liveReportUrl && isWindSport && (
              <a
                href={spot.liveReportUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="border border-ink/30 rounded p-1.5 bg-newsprint/90 hover:bg-newsprint transition-colors flex items-center justify-center backdrop-blur-sm"
                aria-label="View live wind report"
                title="Live wind report"
              >
                <CircleGauge size={14} className="text-black" />
              </a>
            )}
            {spot.url && (
              <a
                href={spot.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="border border-ink/30 rounded p-1.5 bg-newsprint/90 hover:bg-newsprint transition-colors flex items-center justify-center backdrop-blur-sm"
                aria-label="View forecast"
                title="Forecast"
              >
                <ChartNoAxesCombined size={14} className="text-black" />
              </a>
            )}
          </div>
        )}
      </div>

      {/* Spot info */}
      <div className="px-4 py-2">
        {forecastData ? (
          <div className="flex items-center justify-between gap-3">
            <div className="flex-1 min-w-0">
              <span className="font-bold text-ink truncate block">{spot.name}</span>
              <div className="flex items-center gap-1.5 font-data text-xs text-faded-ink whitespace-nowrap overflow-hidden">
                <span className="font-bold text-ink/80">{formatTime(new Date(forecastData.timestamp))}</span>
                <span className="text-ink/30">&middot;</span>
                <ConditionLine
                  speed={forecastData.speed}
                  gust={forecastData.gust}
                  direction={forecastData.direction}
                  waveHeight={forecastData.waveHeight}
                  wavePeriod={forecastData.wavePeriod}
                  sport={forecastData.sport}
                />
              </div>
            </div>
            <ScorePill score={forecastData.score} sport={forecastData.sport} size="lg" onClick={onScoreClick ? (e) => { e.stopPropagation(); onScoreClick(); } : undefined} />
          </div>
        ) : (
          <div>
            <h3 className="font-headline text-lg font-bold text-ink" title={spot.town || undefined}>{spot.name}</h3>
          </div>
        )}
      </div>
    </div>
  );
}

