import { FlagProvider } from 'waterman';

// Gates unshipped work. Rider counts are the live example: they run on fixtures
// and are NEVER written to Convex, because production and development share one
// deployment — seeded dummies would be shown to real users.
export const GatesUnshippedWork = () => (
  <FlagProvider>
    <div className="rounded-card-lg border border-card bg-surface p-4 max-w-md">
      <div className="font-data text-[10px] tracking-label text-dim mb-2">FEATURE FLAGS</div>
      <p className="text-[13px] leading-[1.5] text-faded-ink">
        `useFlag(&quot;riderCounts&quot;)` is false in production, so the rider-count
        badges and the Labs card on Now do not render at all. Overrides are
        enabled only when NEXT_PUBLIC_FLAG_OVERRIDES_ENABLED is set.
      </p>
    </div>
  </FlagProvider>
);
