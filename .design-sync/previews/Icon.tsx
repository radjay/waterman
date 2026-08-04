import { Icon } from 'waterman';
import { Wind, Waves, Thermometer, Clock, MapPin, TrendingUp } from 'lucide-react';

export const Basic = () => (
  <div className="flex flex-wrap items-center gap-6">
    <Icon className="text-ink">
      <Wind size={20} />
    </Icon>
    <Icon className="text-ink">
      <Waves size={20} />
    </Icon>
    <Icon className="text-ink">
      <Thermometer size={20} />
    </Icon>
    <Icon className="text-ink">
      <Clock size={20} />
    </Icon>
  </div>
);

export const WithLabels = () => (
  <div className="flex flex-wrap items-center gap-8">
    <span className="flex items-center gap-2">
      <Icon className="text-ink/50">
        <Wind size={16} />
      </Icon>
      <span className="font-data text-sm text-ink">19 kt NW</span>
    </span>
    <span className="flex items-center gap-2">
      <Icon className="text-ink/50">
        <Waves size={16} />
      </Icon>
      <span className="font-data text-sm text-ink">0.8 m</span>
    </span>
    <span className="flex items-center gap-2">
      <Icon className="text-ink/50">
        <Thermometer size={16} />
      </Icon>
      <span className="font-data text-sm text-ink">17°C</span>
    </span>
  </div>
);

export const Tones = () => (
  <div className="flex flex-wrap items-center gap-6">
    <Icon className="text-ink">
      <TrendingUp size={20} />
    </Icon>
    <Icon className="text-faded-ink">
      <TrendingUp size={20} />
    </Icon>
    <Icon className="text-ink/30">
      <TrendingUp size={20} />
    </Icon>
    <Icon className="text-red-accent">
      <TrendingUp size={20} />
    </Icon>
  </div>
);

export const InSpotRow = () => (
  <div className="flex max-w-sm flex-col gap-2">
    <div className="flex items-center justify-between border-b border-ink/15 pb-2">
      <span className="flex items-center gap-2">
        <Icon className="text-ink/40">
          <MapPin size={14} />
        </Icon>
        <span className="font-body text-sm text-ink">Scheveningen Noord</span>
      </span>
      <span className="font-data text-sm text-ink">19 kt NW</span>
    </div>
    <div className="flex items-center justify-between border-b border-ink/15 pb-2">
      <span className="flex items-center gap-2">
        <Icon className="text-ink/40">
          <MapPin size={14} />
        </Icon>
        <span className="font-body text-sm text-ink">Zandvoort</span>
      </span>
      <span className="font-data text-sm text-ink">16 kt WNW</span>
    </div>
    <div className="flex items-center justify-between">
      <span className="flex items-center gap-2">
        <Icon className="text-ink/40">
          <MapPin size={14} />
        </Icon>
        <span className="font-body text-sm text-ink">Brouwersdam</span>
      </span>
      <span className="font-data text-sm text-ink">24 kt WSW</span>
    </div>
  </div>
);
