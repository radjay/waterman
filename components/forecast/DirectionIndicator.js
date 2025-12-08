import { Arrow } from "../ui/Arrow";
import { getDisplayWindDirection } from "../../lib/utils";

export function DirectionIndicator({ direction, className = "" }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Arrow direction={direction} />
      <span>{getDisplayWindDirection(direction)}</span>
    </div>
  );
}

