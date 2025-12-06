import { Arrow } from "../atoms/Arrow";
import { getCardinalDirection } from "../../lib/utils";

export function DirectionIndicator({ direction, className = "" }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Arrow direction={direction} />
      <span>{getCardinalDirection(direction + 180)}</span>
    </div>
  );
}

