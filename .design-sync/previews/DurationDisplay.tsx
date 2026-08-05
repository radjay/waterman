import { DurationDisplay } from 'waterman';

export const Default = () => (
  <div className="font-body text-ink">
    <DurationDisplay minutes={135} />
  </div>
);

export const Scale = () => (
  <div className="flex flex-col gap-2 font-body">
    <DurationDisplay minutes={25} />
    <DurationDisplay minutes={45} />
    <DurationDisplay minutes={60} />
    <DurationDisplay minutes={90} />
    <DurationDisplay minutes={120} />
    <DurationDisplay minutes={195} />
  </div>
);

export const InSessionSummary = () => (
  <div className="max-w-sm rounded-card border border-ink/15 bg-newsprint p-4 shadow-card font-body">
    <div className="font-headline text-base text-ink mb-3">Zandvoort &middot; Kitesurfing</div>
    <dl className="space-y-2 text-sm">
      <div className="flex items-baseline justify-between gap-4">
        <dt className="text-ink/50">On the water</dt>
        <dd>
          <DurationDisplay minutes={155} />
        </dd>
      </div>
      <div className="flex items-baseline justify-between gap-4">
        <dt className="text-ink/50">Longest run</dt>
        <dd>
          <DurationDisplay minutes={18} />
        </dd>
      </div>
      <div className="flex items-baseline justify-between gap-4">
        <dt className="text-ink/50">Rigging &amp; packing</dt>
        <dd>
          <DurationDisplay minutes={40} />
        </dd>
      </div>
    </dl>
  </div>
);
