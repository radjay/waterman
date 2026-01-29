"use client";

import { useEffect, useRef } from "react";
import Hls from "hls.js";
import { CircleGauge, ChartNoAxesCombined, Heart } from "lucide-react";

/**
 * WebcamCard component that displays a webcam video stream with current conditions.
 * 
 * @param {Object} spot - Webcam spot object
 * @param {boolean} isFocused - Whether this webcam is in focus/fullscreen
 * @param {boolean} showHoverButtons - Whether to show live/forecast buttons on hover
 * @param {boolean} isFavorite - Whether this spot is favorited by the user
 * @param {Function} onToggleFavorite - Callback when favorite button is clicked
 */
export function WebcamCard({ spot, isFocused = false, showHoverButtons = false, isFavorite = false, onToggleFavorite }) {
  const videoRef = useRef(null);
  const hlsRef = useRef(null);

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
          className="w-full h-full object-cover"
          playsInline
          muted
          autoPlay
        />
        
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
        <div>
          <h3 className="font-headline text-lg font-bold text-ink">{spot.name}</h3>
          {spot.town && (
            <p className="text-sm text-ink/60">{spot.town}</p>
          )}
        </div>
      </div>
    </div>
  );
}

