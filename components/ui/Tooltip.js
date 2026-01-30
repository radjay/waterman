"use client";

import { useState } from "react";

/**
 * Tooltip component that shows a message on hover.
 *
 * @param {React.ReactNode} children - The element to wrap with tooltip
 * @param {string} content - The tooltip text content
 * @param {string} position - Position of tooltip: "top" | "bottom" | "left" | "right"
 * @param {string} className - Additional CSS classes for the wrapper
 */
export function Tooltip({
  children,
  content,
  position = "top",
  className = "",
}) {
  const [isVisible, setIsVisible] = useState(false);

  const positionClasses = {
    top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
    bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
    left: "right-full top-1/2 -translate-y-1/2 mr-2",
    right: "left-full top-1/2 -translate-y-1/2 ml-2",
  };

  return (
    <div
      className={`relative inline-flex ${className}`}
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      {children}
      {isVisible && content && (
        <div
          className={`absolute ${positionClasses[position]} z-50 px-2 py-1 text-xs font-medium text-newsprint bg-ink rounded whitespace-nowrap pointer-events-none`}
          role="tooltip"
        >
          {content}
        </div>
      )}
    </div>
  );
}
