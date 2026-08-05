"use client";

import { useEffect, useRef, useState } from "react";
import Hls from "hls.js";
import { CameraOff } from "lucide-react";

/**
 * Compact HLS player for the Now verdict card.
 *
 * WebcamCard is the full-featured player (favourites, hover controls, score
 * pill, fullscreen); this is just the picture. Stream URL construction is
 * duplicated from it deliberately for now — factoring that out touches the cams
 * grid and the fullscreen player, which is a wider change than this screen
 * warrants.
 *
 * Renders an explicit offline state rather than a black rectangle: a dead cam
 * is information, and the card around it still carries the station reading.
 */
export function streamUrlFor(spot) {
  if (!spot) return null;
  if (spot.webcamStreamId && spot.webcamStreamSource) {
    if (spot.webcamStreamSource === "quanteec") {
      return `https://deliverys5.quanteec.com/contents/encodings/live/${spot.webcamStreamId}/media_0.m3u8`;
    }
    if (spot.webcamStreamSource === "iol") {
      return spot.webcamStreamId;
    }
  }
  return spot.webcamUrl || null;
}

export function LiveCam({ spot }) {
  const videoRef = useRef(null);
  const [failed, setFailed] = useState(false);
  const streamUrl = streamUrlFor(spot);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !streamUrl) return;

    setFailed(false);
    let hls;

    if (Hls.isSupported()) {
      hls = new Hls({ enableWorker: true, lowLatencyMode: true });
      hls.loadSource(streamUrl);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => video.play().catch(() => {}));
      hls.on(Hls.Events.ERROR, (_e, data) => {
        if (data.fatal) setFailed(true);
      });
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      // Safari plays HLS natively.
      video.src = streamUrl;
      video.addEventListener("loadedmetadata", () => video.play().catch(() => {}));
      video.addEventListener("error", () => setFailed(true));
    } else {
      setFailed(true);
    }

    return () => hls?.destroy();
  }, [streamUrl]);

  if (!streamUrl || failed) {
    return (
      <span className="absolute inset-0 bg-offline-bg flex flex-col items-center justify-center gap-2">
        <CameraOff size={24} className="text-dim" />
        <span className="font-data text-[9px] tracking-label text-dim">CAM OFFLINE</span>
      </span>
    );
  }

  return (
    <video
      ref={videoRef}
      muted
      playsInline
      autoPlay
      loop
      className="absolute inset-0 w-full h-full object-cover"
    />
  );
}
