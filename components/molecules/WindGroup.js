import { Wind } from "lucide-react";
import { Metric } from "./Metric";
import { DirectionIndicator } from "./DirectionIndicator";

export function WindGroup({ speed, gust, direction, className = "" }) {
  return (
    <div className={`flex items-center justify-start gap-6 ${className}`}>
      <Metric icon={<Wind size={14} />}>
        {Math.round(speed)} kn <span>({Math.round(gust)}*)</span>
      </Metric>
      <DirectionIndicator direction={direction} />
    </div>
  );
}

