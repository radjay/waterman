import { Metric } from "./Metric";
import { DirectionIndicator } from "../forecast/DirectionIndicator";

/**
 * Reusable data group component for displaying metrics with direction.
 * 
 * @param {ReactNode} icon - Icon component
 * @param {ReactNode} children - Metric value/content
 * @param {number} direction - Direction in degrees (optional)
 * @param {boolean} showDirection - Whether to show direction indicator
 * @param {string} className - Additional CSS classes
 */
export function DataGroup({ icon, children, direction, showDirection = true, className = "" }) {
  return (
    <div className={`flex items-center justify-start gap-6 ${className}`}>
      <Metric icon={icon}>
        {children}
      </Metric>
      {showDirection && direction !== undefined && direction !== null && (
        <DirectionIndicator direction={direction} />
      )}
      {showDirection && (direction === undefined || direction === null) && (
        <div className="text-gray-300">-</div>
      )}
    </div>
  );
}

