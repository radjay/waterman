import { InTheWaterCard } from 'waterman';

// Rider counts are a computer-vision ESTIMATE, never a measurement, and the
// card says so in its own caption. It lives behind a Labs disclosure on Now
// rather than in "why we think so", where it outranked the station reading.
export const RidersOut = () => (
  <div className="max-w-md">
    <InTheWaterCard reading={{ count: 7, previous: 4, trend: 'up' }} sportNoun="wingers" />
  </div>
);

export const Thinning = () => (
  <div className="max-w-md">
    <InTheWaterCard reading={{ count: 3, previous: 9, trend: 'down' }} sportNoun="kiters" />
  </div>
);

// Zero is information, not an empty state.
export const NobodyOut = () => (
  <div className="max-w-md">
    <InTheWaterCard reading={{ count: 0, previous: 0, trend: 'steady' }} sportNoun="surfers" />
  </div>
);

// `bare` drops the card chrome when it is already inside one — the Labs
// disclosure on Now supplies the border.
export const Bare = () => (
  <div className="max-w-md rounded-[15px] border border-card bg-surface px-[14px] py-[13px]">
    <InTheWaterCard reading={{ count: 12, previous: 8, trend: 'up' }} sportNoun="wingers" bare />
  </div>
);
