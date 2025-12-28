import { Waves } from "lucide-react";
import { DataGroup } from "../ui/DataGroup";

export function WaveGroup({ waveHeight, wavePeriod, waveDirection, className = "" }) {
  // Invert wave direction for display (Windy gives direction waves are going TO,
  // but we need to show direction waves are coming FROM)
  const displayWaveDirection = waveDirection !== undefined && waveDirection !== null
    ? (waveDirection + 180) % 360
    : waveDirection;

  return (
    <DataGroup
      icon={<Waves size={14} className="mr-2" />}
      direction={displayWaveDirection}
      showDirection={!!waveDirection}
      className={className}
    >
      {waveHeight ? waveHeight.toFixed(1) : "-"} m{" "}
      <span>({wavePeriod || 0}s)</span>
    </DataGroup>
  );
}

