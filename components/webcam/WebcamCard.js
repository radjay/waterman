"use client";

import { useEffect, useRef } from "react";
import Hls from "hls.js";

/**
 * WebcamCard component that displays a webcam video stream with current conditions.
 * 
 * @param {Object} spot - Webcam spot object
 * @param {boolean} isFocused - Whether this webcam is in focus/fullscreen
 */
export function WebcamCard({ spot, isFocused = false }) {
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


  return (
    <div
      className={`relative bg-ink/5 rounded-lg overflow-hidden border border-ink/10 ${
        isFocused ? "ring-2 ring-ink/20" : ""
      }`}
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
      </div>

      {/* Spot info overlay */}
      <div className="p-4">
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

