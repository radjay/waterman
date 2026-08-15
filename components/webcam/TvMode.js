"use client";

import { useEffect, useRef, useState } from "react";
import { X, Maximize2 } from "lucide-react";
import Hls from "hls.js";
import { LiveStationBadge } from "../ui/LiveStationBadge";

/**
 * TvMode — fullscreen dark grid of cams for a club-wall screen.
 *
 * Each cell overlays LiveStationBadge (same pack.station as LIVE cards) when
 * that spot has a live reading. No second wind fetch — callers pass station.
 *
 * @param {Array<{spot: object, station?: object|null}>} packs
 * @param {Function} onClose
 */
const TV_COLUMNS_KEY = "waterman_tv_columns";
const GRID_CLASSES = { 2: "grid-cols-2", 3: "grid-cols-3", 4: "grid-cols-4" };

export function TvMode({ packs = [], webcams, onClose }) {
  // Prefer packs (spot + station). Legacy `webcams` still works without badges.
  const cells = packs.length
    ? packs
    : (webcams ?? []).map((spot) => ({ spot, station: null }));

  const [focused, setFocused] = useState(null);
  const [columns, setColumns] = useState(3);

  useEffect(() => {
    const stored = localStorage.getItem(TV_COLUMNS_KEY);
    if (stored && GRID_CLASSES[stored]) setColumns(parseInt(stored));
  }, []);

  const getStreamUrl = (spot) => {
    if (spot.webcamStreamId) {
      if (spot.webcamStreamSource === "quanteec") {
        return `https://deliverys5.quanteec.com/contents/encodings/live/${spot.webcamStreamId}/media_0.m3u8`;
      } else if (spot.webcamStreamSource === "iol") {
        return spot.webcamStreamId;
      }
    }
    if (spot.webcamUrl && spot.webcamUrl.trim() !== "") {
      return spot.webcamUrl;
    }
    return null;
  };

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === "Escape") {
        if (focused) {
          setFocused(null);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [focused, onClose]);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, []);

  if (focused) {
    return (
      <div className="fixed inset-0 z-[200] bg-black">
        <button
          onClick={() => setFocused(null)}
          className="absolute top-4 right-4 z-[201] p-2 rounded-md bg-white/10 hover:bg-white/20 transition-colors"
          aria-label="Back to grid"
        >
          <X className="w-6 h-6 text-white" />
        </button>
        <div className="w-full h-full">
          <TvWebcamCell
            spot={focused.spot}
            station={focused.station}
            getStreamUrl={getStreamUrl}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[200] bg-black">
      <div className="absolute top-4 right-4 z-[201] flex items-center gap-2">
        <div className="flex items-center gap-1 bg-white/10 rounded-md p-1">
          {[2, 3, 4].map((n) => (
            <button
              key={n}
              onClick={() => {
                setColumns(n);
                localStorage.setItem(TV_COLUMNS_KEY, String(n));
              }}
              className={`px-2.5 py-1 rounded text-sm font-medium transition-colors ${
                columns === n ? "bg-white/30 text-white" : "text-white/50 hover:text-white/80"
              }`}
              aria-label={`${n} columns`}
            >
              {n}
            </button>
          ))}
        </div>
        <button
          onClick={onClose}
          className="p-2 rounded-md bg-white/10 hover:bg-white/20 transition-colors"
          aria-label="Exit TV mode"
        >
          <X className="w-6 h-6 text-white" />
        </button>
      </div>

      <div className={`grid ${GRID_CLASSES[columns]} auto-rows-min gap-0 overflow-y-auto h-full`}>
        {cells.map((cell) => (
          <TvWebcamCell
            key={cell.spot._id}
            spot={cell.spot}
            station={cell.station}
            getStreamUrl={getStreamUrl}
            onClick={() => setFocused(cell)}
          />
        ))}
      </div>
    </div>
  );
}

function TvWebcamCell({ spot, station = null, getStreamUrl, onClick }) {
  const videoRef = useRef(null);
  const hlsRef = useRef(null);

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
          if (video && videoRef.current === video) {
            const playPromise = video.play();
            if (playPromise !== undefined) {
              playPromise.catch((error) => {
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
      <video
        ref={videoRef}
        className="w-full h-full object-contain"
        playsInline
        muted
        controls={false}
      />

      {station && (
        <span className="absolute top-2 left-2 z-10 pointer-events-none">
          <LiveStationBadge station={station} />
        </span>
      )}

      {onClick && (
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
          <Maximize2 className="w-12 h-12 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      )}

      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-3">
        <h3 className="text-white/90 font-medium text-sm">{spot.name}</h3>
        {spot.town && <p className="text-white/60 text-xs">{spot.town}</p>}
      </div>
    </div>
  );
}
