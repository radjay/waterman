import { Waves } from "lucide-react";
import { DataGroup } from "../ui/DataGroup";

export function WaveGroup({ waveHeight, wavePeriod, waveDirection, className = "" }) {
  return (
    <DataGroup
      icon={<Waves size={14} className="mr-2" />}
      direction={waveDirection}
      showDirection={!!waveDirection}
      className={className}
    >
      {waveHeight ? waveHeight.toFixed(1) : "-"} m{" "}
      <span>({wavePeriod || 0}s)</span>
    </DataGroup>
  );
}

