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
      {Number.isFinite(speed) ? Math.round(speed) : "—"} kn {showGust && Number.isFinite(gust) && <span>({Math.round(gust)}*)</span>}
    </DataGroup>
  );
}

