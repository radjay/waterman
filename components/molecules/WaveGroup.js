import { Waves } from "lucide-react";
import { Metric } from "./Metric";
import { DirectionIndicator } from "./DirectionIndicator";

export function WaveGroup({ waveHeight, wavePeriod, waveDirection, className = "" }) {
  return (
    <div className={`flex items-center justify-start gap-6 ${className}`}>
      <Metric icon={<Waves size={14} />}>
        {waveHeight ? waveHeight.toFixed(1) : "-"} m{" "}
        <span>({wavePeriod || 0}s)</span>
      </Metric>
      {waveDirection ? (
        <DirectionIndicator direction={waveDirection} />
      ) : (
        <div className="text-gray-300">-</div>
      )}
    </div>
  );
}

