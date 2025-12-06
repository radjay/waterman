import { WindGroup } from "../molecules/WindGroup";
import { WaveGroup } from "../molecules/WaveGroup";
import { Badge } from "../atoms/Badge";

export function ForecastSlot({ slot, className = "" }) {
  return (
    <div
      className={`grid grid-cols-[80px_240px_1fr_1fr_60px] items-stretch p-0 border-b border-ink font-body text-[0.95rem] ${
        slot.isIdeal ? "is-ideal" : "bg-transparent"
      } ${slot.isEpic ? "is-epic" : ""} ${className}`}
    >
      <div className="font-bold text-ink pl-3 flex items-center h-full">
        {slot.hour}
      </div>
      <div className="slot-spot font-headline font-bold text-[1.1rem] text-ink">
        {slot.spotName}
      </div>

      <WindGroup speed={slot.speed} gust={slot.gust} direction={slot.direction} />

      <WaveGroup
        waveHeight={slot.waveHeight}
        wavePeriod={slot.wavePeriod}
        waveDirection={slot.waveDirection}
      />

      <div className="flex items-center">
        {slot.isEpic && <Badge variant="epic">EPIC</Badge>}
      </div>
    </div>
  );
}

