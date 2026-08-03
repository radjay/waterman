import { DataGroup } from 'waterman';
import { Wind, Waves, Thermometer } from 'lucide-react';

export const WindWithDirection = () => (
  <div className="flex flex-col gap-3 text-ink">
    <DataGroup icon={<Wind size={14} className="mr-2 text-ink/50" />} direction={315} gap="gap-3">
      19 kn <span>(26*)</span>
    </DataGroup>
    <DataGroup icon={<Wind size={14} className="mr-2 text-ink/50" />} direction={247} gap="gap-3">
      24 kn <span>(31*)</span>
    </DataGroup>
    <DataGroup icon={<Wind size={14} className="mr-2 text-ink/50" />} direction={20} gap="gap-3">
      11 kn <span>(15*)</span>
    </DataGroup>
  </div>
);

export const WaveAndWater = () => (
  <div className="flex flex-col gap-3 text-ink">
    <DataGroup icon={<Waves size={14} className="mr-2 text-ink/50" />} direction={290} gap="gap-3">
      0.8 m
    </DataGroup>
    <DataGroup icon={<Waves size={14} className="mr-2 text-ink/50" />} direction={110} gap="gap-3">
      1.4 m
    </DataGroup>
    <DataGroup icon={<Thermometer size={14} className="mr-2 text-ink/50" />} showDirection={false}>
      17°C
    </DataGroup>
  </div>
);

export const MissingDirection = () => (
  <div className="flex flex-col gap-3 text-ink">
    <DataGroup icon={<Wind size={14} className="mr-2 text-ink/50" />} direction={315} gap="gap-3">
      19 kn <span>(26*)</span>
    </DataGroup>
    <DataGroup icon={<Wind size={14} className="mr-2 text-ink/50" />} direction={null} gap="gap-3">
      — kn
    </DataGroup>
  </div>
);

export const Gaps = () => (
  <div className="flex flex-col gap-3 text-ink">
    <DataGroup icon={<Wind size={14} className="mr-2 text-ink/50" />} direction={315} gap="gap-1">
      19 kn
    </DataGroup>
    <DataGroup icon={<Wind size={14} className="mr-2 text-ink/50" />} direction={315} gap="gap-3">
      19 kn
    </DataGroup>
    <DataGroup icon={<Wind size={14} className="mr-2 text-ink/50" />} direction={315} gap="gap-8">
      19 kn
    </DataGroup>
  </div>
);
