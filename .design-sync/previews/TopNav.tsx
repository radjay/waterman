import { TopNav } from 'waterman';

// Sticky, blurred, `hidden md:block` — the desktop counterpart to BottomNav,
// built from the same navTabs source so the two can never disagree about what
// the primary destinations are. Its inner container is max-w-[1200px] px-8,
// which is the width every page body matches.
//
// Wrapped in a stage with its own min-height because the bar is sticky and
// contributes no in-flow height to a bare preview cell.
export const Bar = () => (
  <div className="w-full min-h-[120px] bg-page">
    <TopNav />
    <div className="max-w-[1200px] mx-auto px-8 pt-6">
      <span className="font-data text-[10px] tracking-label text-dim">
        PAGE BODY — SAME 1200px CONTAINER AS THE BAR ABOVE
      </span>
    </div>
  </div>
);
