"use client";

import { useEffect, useRef, useState } from "react";
import { X, Maximize2 } from "lucide-react";
import Hls from "hls.js";
import { LiveWindIndicator, extractWindguruStationId } from "../wind/LiveWindIndicator";

/**
 * TvMode component - Fullscreen dark theme view with 3-column grid and no spacing.
 * Designed for displaying all webcams simultaneously on a TV or large display.
 * Clicking a webcam focuses on it in fullscreen.
 *
 * @param {Array} webcams - Array of webcam spot objects
 * @param {Function} onClose - Callback when TV mode is exited
 */
export function TvMode({ webcams, onClose }) {
  const [focusedSpot, setFocusedSpot] = useState(null);
  // Get stream URL for a spot
  const getStreamUrl = (spot) => {
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

  // Handle ESC key - close focused cam or exit TV mode
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === "Escape") {
        if (focusedSpot) {
          // If focused on a cam, just unfocus it (back to grid)
          setFocusedSpot(null);
        } else {
          // If in grid view, exit TV mode completely
          onClose();
        }
      }
    };

    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [focusedSpot, onClose]);

  // Lock body scroll when TV mode is active
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, []);

  // If a spot is focused, show it fullscreen
  if (focusedSpot) {
    return (
      <div className="fixed inset-0 z-[200] bg-black">
        {/* Close button - unfocuses cam and returns to grid */}
        <button
          onClick={() => setFocusedSpot(null)}
          className="absolute top-4 right-4 z-[201] p-2 rounded-md bg-white/10 hover:bg-white/20 transition-colors"
          aria-label="Back to grid"
        >
          <X className="w-6 h-6 text-white" />
        </button>

        {/* Fullscreen single webcam */}
        <div className="w-full h-full">
          <TvWebcamCell spot={focusedSpot} getStreamUrl={getStreamUrl} />
        </div>
      </div>
    );
  }

  // Grid view
  return (
    <div className="fixed inset-0 z-[200] bg-black">
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-[201] p-2 rounded-md bg-white/10 hover:bg-white/20 transition-colors"
        aria-label="Exit TV mode"
      >
        <X className="w-6 h-6 text-white" />
      </button>

      {/* 3-column grid with auto rows based on content, scrollable */}
      <div className="grid grid-cols-3 auto-rows-min gap-0 overflow-y-auto h-full">
        {webcams.map((webcam) => (
          <TvWebcamCell
            key={webcam._id}
            spot={webcam}
            getStreamUrl={getStreamUrl}
            onClick={() => setFocusedSpot(webcam)}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * Individual webcam cell for TV mode grid.
 * Each cell contains a video player and spot name overlay.
 * Clicking the cell focuses on it in fullscreen.
 */
function TvWebcamCell({ spot, getStreamUrl, onClick }) {
  const videoRef = useRef(null);
  const hlsRef = useRef(null);

  // Initialize HLS player
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const streamUrl = getStreamUrl(spot);
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
        // Native HLS support (Safari)
        video.src = streamUrl;
        const playPromise = video.play();
        if (playPromise !== undefined) {
          playPromise.catch((error) => {
            if (error.name !== "AbortError" && error.name !== "NotAllowedError") {
              console.error("Error playing video:", error);
            }
          });
        }
      }
    };

    initializePlayer();

    // Cleanup
    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [spot, getStreamUrl]);

  return (
    <div
      className="relative w-full aspect-video bg-black overflow-hidden group cursor-pointer"
      onClick={onClick}
    >
      {/* Video player */}
      <video
        ref={videoRef}
        className="w-full h-full object-contain"
        playsInline
        muted
        controls={false}
      />

      {/* Live wind indicator overlay - top left corner */}
      {spot.liveReportUrl && extractWindguruStationId(spot.liveReportUrl) && (
        <div className="absolute top-2 left-2 z-10">
          <LiveWindIndicator
            stationId={extractWindguruStationId(spot.liveReportUrl)}
            compact={true}
          />
        </div>
      )}

      {/* Hover overlay with expand icon */}
      {onClick && (
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
          <Maximize2 className="w-12 h-12 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      )}

      {/* Spot name overlay (bottom-left) - subtle */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-3">
        <h3 className="text-white/90 font-medium text-sm">{spot.name}</h3>
        {spot.town && (
          <p className="text-white/60 text-xs">{spot.town}</p>
        )}
      </div>
    </div>
  );
}
