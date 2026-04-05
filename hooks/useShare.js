"use client";

import { useState, useCallback } from "react";

/**
 * useShare — handles share/copy-link behaviour.
 *
 * Priority:
 *   1. navigator.share (Web Share API — native sheet on mobile)
 *   2. navigator.clipboard.writeText (desktop fallback)
 *
 * On success the hook returns `{ copied: true }` for 2 seconds so
 * callers can show a confirmation state. AbortError (user dismissed the
 * native sheet) is treated as a silent no-op. Clipboard failure is also
 * silently ignored.
 *
 * @param {string} url - The URL to share (defaults to window.location.href)
 * @param {string} [title] - Optional title for the Web Share API
 * @returns {{ share: Function, isSharing: boolean, copied: boolean }}
 */
export function useShare({ url, title } = {}) {
  const [isSharing, setIsSharing] = useState(false);
  const [copied, setCopied] = useState(false);

  const share = useCallback(async () => {
    // Prevent concurrent share invocations
    if (isSharing) return;

    const shareUrl =
      url ?? (typeof window !== "undefined" ? window.location.href : "");

    setIsSharing(true);

    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({ url: shareUrl, title });
        // Web Share API succeeded — show "Copied" feedback on desktop-like
        // browsers that resolve the promise without showing a native sheet
        // (rare, but handle it gracefully by not showing copied state since
        // the user saw the native UI)
      } else if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch (error) {
      // AbortError: user dismissed the native share sheet — silent no-op
      // Other errors: clipboard permission denied, etc — also silent
      if (error?.name !== "AbortError") {
        // Only log unexpected errors (not user cancellation)
        // Clipboard failure should be a silent no-op
      }
    } finally {
      setIsSharing(false);
    }
  }, [url, title, isSharing]);

  return { share, isSharing, copied };
}
