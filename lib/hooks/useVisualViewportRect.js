"use client";

import { useEffect, useState } from "react";

const FALLBACK = { top: 0, left: 0, width: undefined, height: undefined };

/**
 * Visible visual-viewport rect for a fixed fullscreen shell.
 *
 * On iOS Safari, orientation change can leave page scale > 1. `fixed inset-0`
 * then lays out against the layout viewport, so chrome sits above / beside the
 * visible area. Size the overlay to visualViewport instead (width/height +
 * offsetLeft/offsetTop). Also scrollTo(0,0) on mount and orientationchange so
 * scale settles back to 1 when possible.
 */
export function useVisualViewportRect() {
  const [rect, setRect] = useState(FALLBACK);

  useEffect(() => {
    const read = () => {
      const vv = window.visualViewport;
      if (vv) {
        setRect({
          top: vv.offsetTop,
          left: vv.offsetLeft,
          width: vv.width,
          height: vv.height,
        });
      } else {
        setRect({
          top: 0,
          left: 0,
          width: window.innerWidth,
          height: window.innerHeight,
        });
      }
    };

    const resetAndRead = () => {
      window.scrollTo(0, 0);
      read();
    };

    resetAndRead();

    const vv = window.visualViewport;
    vv?.addEventListener("resize", read);
    vv?.addEventListener("scroll", read);
    window.addEventListener("resize", read);

    const onOrientation = () => {
      window.scrollTo(0, 0);
      // iOS updates visualViewport after the orientation event fires.
      requestAnimationFrame(resetAndRead);
      setTimeout(resetAndRead, 100);
      setTimeout(resetAndRead, 300);
    };
    window.addEventListener("orientationchange", onOrientation);

    return () => {
      vv?.removeEventListener("resize", read);
      vv?.removeEventListener("scroll", read);
      window.removeEventListener("resize", read);
      window.removeEventListener("orientationchange", onOrientation);
    };
  }, []);

  return rect;
}
