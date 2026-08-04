import { LiveWindIndicator, Badge } from 'waterman';

// What the spot reads RIGHT NOW, against what was forecast. It fetches its own
// reading from the station proxy, which never resolves inside a preview — and
// that is most of what there is to document: with no usable reading it renders
// NOTHING, so it can sit unconditionally in a layout without leaving a gap.
//
// A reading older than an hour is treated the same way. Hiding a stale number
// is less confusing than showing one, and the forecast underneath is still true.
export const RendersNothingWithoutAReading = () => (
  <div className="flex items-center gap-3">
    <span className="font-data text-[13px] text-ink">18 kn NNW</span>
    <LiveWindIndicator stationId={null} label="LIVE" />
    <span className="font-body text-[12px] text-faded-ink">
      ← the indicator is here, and contributes no layout at all
    </span>
  </div>
);

// `fallback` is for slots that must not collapse — the cam overlay wants the
// real numbers when they exist and a plain LIVE chip when they do not, and the
// caller cannot know which until the fetch resolves.
export const WithAFallback = () => (
  <div className="relative w-[320px] h-[180px] rounded-card-sm overflow-hidden bg-offline-bg">
    <span className="absolute top-[9px] left-[9px] flex items-center gap-[7px]">
      <LiveWindIndicator
        stationId={null}
        compact
        fallback={
          <Badge variant="live">
            <span className="w-1.5 h-1.5 rounded-full bg-page" />
            LIVE
          </Badge>
        }
      />
    </span>
  </div>
);

// The two shapes it renders when a station does answer: the labelled pill for a
// card, and the compact overlay variant for sitting on video, where theme text
// tokens are wrong by definition.
export const TheTwoShapes = () => (
  <div className="flex flex-col gap-3">
    <div className="flex items-center gap-3">
      <Badge variant="accent">
        <span className="opacity-70">LIVE</span>
        <span className="font-bold tabular-nums">19</span>
        <span className="opacity-70 tabular-nums">(25)</span>
      </Badge>
      <span className="font-body text-[12px] text-faded-ink">on a card — label + accent</span>
    </div>
    <div className="flex items-center gap-3">
      <span className="bg-offline-bg rounded-card-sm p-2 inline-flex">
        <Badge variant="overlay">
          <span className="font-bold tabular-nums">19</span>
          <span className="opacity-70 tabular-nums">(25)</span>
        </Badge>
      </span>
      <span className="font-body text-[12px] text-faded-ink">over video — compact, no label</span>
    </div>
  </div>
);
