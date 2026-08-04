import { RatingDisplay } from 'waterman';

export const Default = () => <RatingDisplay value={4} />;

export const RatingScale = () => (
  <div className="flex flex-col gap-2">
    <RatingDisplay value={0} />
    <RatingDisplay value={1} />
    <RatingDisplay value={2} />
    <RatingDisplay value={3} />
    <RatingDisplay value={4} />
    <RatingDisplay value={5} />
  </div>
);

export const InSessionList = () => (
  <div className="max-w-md rounded-card border border-ink/15 bg-newsprint shadow-card divide-y divide-ink/10 font-body">
    {[
      { spot: 'Scheveningen Noord', sport: 'Wingfoil', when: 'Aug 1 · 2h 15m', rating: 5 },
      { spot: 'Wijk aan Zee', sport: 'Kitesurfing', when: 'Jul 28 · 1h 30m', rating: 3 },
      { spot: 'Zandvoort', sport: 'Surfing', when: 'Jul 24 · 55m', rating: 2 },
    ].map((s) => (
      <div key={s.spot} className="flex items-center justify-between gap-4 p-4">
        <div>
          <div className="text-ink font-medium">{s.spot}</div>
          <div className="text-xs text-ink/50 font-data">
            {s.sport} &middot; {s.when}
          </div>
        </div>
        <RatingDisplay value={s.rating} />
      </div>
    ))}
  </div>
);
