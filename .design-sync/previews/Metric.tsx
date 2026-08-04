import { Metric, Arrow } from 'waterman';
import { Wind, Waves, Thermometer } from 'lucide-react';

export const Basic = () => (
  <div className="flex flex-wrap items-center gap-6">
    <Metric>19 kt</Metric>
    <Metric>0.8 m</Metric>
    <Metric>17°C</Metric>
  </div>
);

export const WithIcons = () => (
  <div className="flex flex-wrap items-center gap-6">
    <Metric icon={<Wind size={14} className="mr-1.5 text-ink/50" />}>19 kt</Metric>
    <Metric icon={<Waves size={14} className="mr-1.5 text-ink/50" />}>0.8 m</Metric>
    <Metric icon={<Thermometer size={14} className="mr-1.5 text-ink/50" />}>17°C</Metric>
  </div>
);

export const WithDirection = () => (
  <div className="flex flex-wrap items-center gap-6">
    <Metric icon={<Arrow direction={315} className="mr-1.5 text-ink/60" />}>19 kt</Metric>
    <Metric icon={<Arrow direction={270} className="mr-1.5 text-ink/60" />}>24 kt</Metric>
  </div>
);
