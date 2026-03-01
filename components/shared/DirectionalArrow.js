"use client";

/**
 * DirectionalArrow Component
 *
 * Displays a rotatable arrow SVG for wind/swell direction
 * Degrees: 0 = N, 90 = E, 180 = S, 270 = W
 */

export function DirectionalArrow({ degrees, size = 16, className = "" }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ transform: `rotate(${degrees}deg)` }}
      className={`transition-transform ${className}`}
    >
      <path
        d="M12 2L12 22M12 2L8 6M12 2L16 6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * CompassLabel Component
 *
 * Converts degrees to compass direction (N, NE, E, SE, S, SW, W, NW)
 */
export function CompassLabel({ degrees }) {
  const directions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  const index = Math.round(((degrees % 360) / 45)) % 8;
  return <span className="font-mono text-xs">{directions[index]}</span>;
}
