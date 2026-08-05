import { RatingInput } from 'waterman';

const noop = () => {};

export const Default = () => (
  <div className="max-w-md">
    <div className="text-sm font-medium text-ink/70 mb-2 font-body">
      How was the session?
    </div>
    <RatingInput value={4} onChange={noop} />
  </div>
);

export const RatingScale = () => (
  <div className="flex flex-col gap-3">
    <RatingInput value={0} onChange={noop} />
    <RatingInput value={1} onChange={noop} />
    <RatingInput value={2} onChange={noop} />
    <RatingInput value={3} onChange={noop} />
    <RatingInput value={4} onChange={noop} />
    <RatingInput value={5} onChange={noop} />
  </div>
);

export const Disabled = () => (
  <div className="flex flex-col gap-3">
    <RatingInput value={5} onChange={noop} disabled />
    <RatingInput value={2} onChange={noop} disabled />
  </div>
);

export const InSessionForm = () => (
  <div className="max-w-md rounded-card border border-ink/15 bg-newsprint p-5 shadow-card">
    <div className="font-headline text-lg text-ink mb-1">Brouwersdam</div>
    <div className="font-body text-sm text-ink/60 mb-4">
      Wingfoil &middot; 24 kt WSW &middot; 0.8 m swell &middot; water 17&deg;C
    </div>
    <div className="text-sm font-medium text-ink/70 mb-2 font-body">Rating</div>
    <RatingInput value={5} onChange={noop} />
  </div>
);
