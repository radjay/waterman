"use client";

import { Share, Check } from "lucide-react";
import { Button } from "./Button";
import { useShare } from "../../hooks/useShare";

/**
 * ShareButton — triggers the Web Share API or copies the URL to clipboard.
 *
 * Pass `url` to override what is shared (default: window.location.href).
 * User-specific pages (dashboard, journal, settings) should pass
 * `url={window.location.origin}` so the share link points to the app
 * homepage rather than exposing a personal URL.
 *
 * @param {string} [url] - URL to share (default: current page URL)
 * @param {string} [title] - Optional title for the Web Share API
 * @param {string} [className] - Additional CSS classes
 */
export function ShareButton({ url, title, className = "" }) {
  const { share, isSharing, copied } = useShare({ url, title });

  return (
    <Button
      variant="icon"
      onClick={share}
      disabled={isSharing}
      aria-label={copied ? "Link copied" : "Share"}
      className={className}
    >
      {copied ? <Check size={16} /> : <Share size={16} />}
    </Button>
  );
}
