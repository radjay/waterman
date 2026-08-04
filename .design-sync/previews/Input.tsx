import { Input, Text } from 'waterman';
import { MapPin, Search, Mail } from 'lucide-react';

const noop = () => {};

export const Default = () => (
  <div className="flex flex-col gap-2 max-w-sm">
    <Text variant="label">Spot</Text>
    <Input value="Scheveningen Noord" onChange={noop} placeholder="Where did you sail?" />
  </div>
);

export const WithIcon = () => (
  <div className="flex flex-col gap-4 max-w-sm">
    <Input icon={Search} value="" onChange={noop} placeholder="Search spots" />
    <Input icon={MapPin} value="Brouwersdam" onChange={noop} placeholder="Spot" />
    <Input icon={Mail} type="email" value="jeroen@seghers.com" onChange={noop} placeholder="you@example.com" />
  </div>
);

export const States = () => (
  <div className="flex flex-col gap-4 max-w-sm">
    <div className="flex flex-col gap-1.5">
      <Text variant="caption">Editable</Text>
      <Input value="Wijk aan Zee" onChange={noop} />
    </div>
    <div className="flex flex-col gap-1.5">
      <Text variant="caption">Read only</Text>
      <Input value="19 kt NW · gusts 26 kt" onChange={noop} readOnly />
    </div>
    <div className="flex flex-col gap-1.5">
      <Text variant="caption">Disabled</Text>
      <Input value="Zandvoort" onChange={noop} disabled />
    </div>
  </div>
);

export const Multiline = () => (
  <div className="flex flex-col gap-2 max-w-md">
    <Text variant="label">Session notes</Text>
    <Input
      multiline
      rows={4}
      value={
        "2h 15m on the 5m wing at Scheveningen Noord. Cross-shore NW built to 24 kt by high tide, chop cleaned up after the sandbar covered."
      }
      onChange={noop}
      placeholder="How was it out there?"
    />
  </div>
);
