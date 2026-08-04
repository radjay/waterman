import { DurationInput } from 'waterman';

const noop = () => {};

export const Default = () => (
  <div className="max-w-md">
    <div className="text-xs uppercase tracking-wide text-ink/50 mb-2 font-body">
      Session length
    </div>
    <DurationInput value={120} onChange={noop} />
  </div>
);

export const PresetSelected = () => (
  <div className="flex flex-col gap-6 max-w-md">
    <DurationInput value={30} onChange={noop} />
    <DurationInput value={90} onChange={noop} />
    <DurationInput value={180} onChange={noop} />
  </div>
);

export const CustomDuration = () => (
  <div className="flex flex-col gap-6 max-w-md">
    <DurationInput value={75} onChange={noop} />
    <DurationInput value={45} onChange={noop} />
  </div>
);

export const InSessionForm = () => (
  <div className="max-w-md rounded-card border border-ink/15 bg-newsprint p-5 shadow-card">
    <div className="font-headline text-lg text-ink mb-1">Log a session</div>
    <div className="font-body text-sm text-ink/60 mb-4">
      Scheveningen Noord &middot; Wingfoil &middot; 19 kt NW
    </div>
    <div className="text-sm font-medium text-ink/70 mb-2 font-body">
      How long were you on the water?
    </div>
    <DurationInput value={150} onChange={noop} />
  </div>
);
