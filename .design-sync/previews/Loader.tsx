import { Loader, Card, Heading, Text, Divider } from 'waterman';

// Loader takes no props. It fills its parent (`flex-1 min-h-[50vh]`) and centres
// a `.loader` equaliser glyph whose bars animate to zero height — a screenshot
// can otherwise catch it mid-collapse and look empty, so the stories pin the
// animation to its first frame and give it a sized container to sit in.
const FreezeGlyph = () => (
  <style>{`.loader { animation-play-state: paused; }`}</style>
);

export const Default = () => (
  <div className="flex w-full max-w-xl flex-col rounded-card border border-ink/15 bg-newsprint">
    <FreezeGlyph />
    <Loader />
  </div>
);

export const InCard = () => (
  <div className="w-full max-w-md">
    <FreezeGlyph />
    <Card variant="default">
      <div className="flex flex-col">
        <div className="flex items-baseline justify-between">
          <Heading level={3}>Scheveningen Noord</Heading>
          <span className="font-data text-xs text-faded-ink">wingfoil</span>
        </div>
        <Text variant="caption">Fetching the latest forecast run…</Text>
        <Loader />
      </div>
    </Card>
  </div>
);

export const PageLoading = () => (
  <div className="flex min-h-[560px] w-full max-w-2xl flex-col gap-4">
    <FreezeGlyph />
    <div className="flex items-baseline justify-between">
      <Heading level={1}>Conditions</Heading>
      <span className="font-data text-xs text-faded-ink">Updated 06:40 · water 17°C</span>
    </div>
    <Divider weight="medium" />
    <div className="flex flex-wrap gap-2">
      <span className="rounded-ui border border-ink/15 px-2.5 py-1 font-body text-xs text-faded-ink">Wingfoil</span>
      <span className="rounded-ui border border-ink/15 px-2.5 py-1 font-body text-xs text-faded-ink">Kitesurfing</span>
      <span className="rounded-ui border border-ink/15 px-2.5 py-1 font-body text-xs text-faded-ink">Surfing</span>
    </div>
    <Loader />
  </div>
);
