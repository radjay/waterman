import { Wind } from "lucide-react";
import { DataGroup } from "../ui/DataGroup";

export function WindGroup({ speed, gust, direction, showGust = true, className = "" }) {
  return (
    <DataGroup
      icon={<Wind size={14} className="mr-2" />}
      direction={direction}
      gap="gap-3"
      className={className}
    >
      {Math.round(speed)} kn {showGust && <span>({Math.round(gust)}*)</span>}
    </DataGroup>
  );
}

