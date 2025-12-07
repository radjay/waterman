"use client";

import { X } from "lucide-react";
import { useEffect, useState, useRef } from "react";
import Hls from "hls.js";

export function WebcamModal({ isOpen, onClose, webcamUrl, spotName, webcamStreamSource }) {
  const [imageError, setImageError] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const refreshIntervalRef = useRef(null);
  const videoRef = useRef(null);
  const hlsRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      // Auto-refresh webcam image every 30 seconds (only for images, not HLS streams)
      if (!isHlsStream) {
        refreshIntervalRef.current = setInterval(() => {
          setRefreshKey(prev => prev + 1);
        }, 30000);
      }
    } else {
      document.body.style.overflow = "unset";
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
      // Clean up HLS instance when closing
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    }
    return () => {
      document.body.style.overflow = "unset";
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [isOpen]);

  // Check if URL is an HLS stream (m3u8)
  const isHlsStream = webcamUrl && (webcamUrl.includes('.m3u8') || webcamUrl.includes('playlist.m3u8'));

  // Initialize HLS stream
  useEffect(() => {
    if (!isOpen || !isHlsStream || !videoRef.current) return;

    const video = videoRef.current;
    const streamUrl = webcamUrl;

    const initializeHLS = () => {
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
          video.play().catch((error) => {
            console.error("Error playing video:", error);
            setImageError(true);
          });
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
                setImageError(true);
                break;
            }
          }
        });
      } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
        // For Safari, which has native HLS support
        video.src = streamUrl;
        video.addEventListener("loadedmetadata", () => {
          video.play().catch((error) => {
            console.error("Error playing video:", error);
            setImageError(true);
          });
        });
      } else {
        setImageError(true);
      }
    };

    initializeHLS();

    // Cleanup function
    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [isOpen, isHlsStream, webcamUrl]);

  if (!isOpen || !webcamUrl) return null;

  // Add timestamp to URL to prevent caching and force refresh (only for images)
  const imageUrl = isHlsStream 
    ? webcamUrl 
    : `${webcamUrl}${webcamUrl.includes('?') ? '&' : '?'}t=${Date.now()}&refresh=${refreshKey}`;

  // Check if URL is an iframe/video source or image
  const isIframe = webcamUrl.includes('embed') || webcamUrl.includes('iframe');
  const isVideo = webcamUrl.match(/\.(mp4|webm|ogg)$/i);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
      onClick={onClose}
    >
      <div
        className="relative w-full h-full flex items-center justify-center p-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 text-white hover:text-gray-300 transition-colors bg-black/50 rounded-full p-2"
          aria-label="Close webcam"
        >
          <X size={24} />
        </button>

        {/* Webcam feed */}
        <div className="w-full h-full flex items-center justify-center">
          {imageError && !isIframe && !isVideo && !isHlsStream ? (
            <div className="text-white text-center">
              <p className="text-xl mb-2">Unable to load webcam feed</p>
              <p className="text-sm text-gray-400">{spotName}</p>
            </div>
          ) : isHlsStream ? (
            <video
              ref={videoRef}
              className="max-w-full max-h-full object-contain"
              playsInline
              muted
              autoPlay
              onError={() => setImageError(true)}
            />
          ) : isIframe ? (
            <iframe
              src={webcamUrl}
              className="w-full h-full border-0"
              allow="camera; microphone"
              title={`${spotName} webcam`}
            />
          ) : isVideo ? (
            <video
              src={webcamUrl}
              autoPlay
              loop
              muted
              playsInline
              className="max-w-full max-h-full object-contain"
              onError={() => setImageError(true)}
            />
          ) : (
            <img
              key={refreshKey}
              src={imageUrl}
              alt={`${spotName} webcam`}
              className="max-w-full max-h-full object-contain"
              onError={() => setImageError(true)}
              onLoad={() => setImageError(false)}
            />
          )}
        </div>

        {/* Spot name overlay */}
        <div className="absolute bottom-4 left-4 text-white font-headline text-xl bg-black/50 px-3 py-1 rounded">
          {spotName}
        </div>
      </div>
    </div>
  );
}

