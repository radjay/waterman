import { Text } from 'waterman';

export const Variants = () => (
  <div className="flex flex-col gap-3 max-w-xl">
    <Text variant="body">
      Steady 18–22 knot north-westerly through the afternoon, easing after 17:00. Best window is
      the incoming tide between 13:00 and 16:00.
    </Text>
    <Text variant="muted">
      Forecast updated 4 times daily from Windy.app, with live readings from the Windguru station.
    </Text>
    <Text variant="caption">Last scraped 06:12 · next run 12:00</Text>
    <Text variant="label">Session notes</Text>
  </div>
);

export const BodyAndMuted = () => (
  <div className="flex flex-col gap-2 max-w-xl">
    <Text variant="body">
      Cross-onshore and clean — a good first session on the 5m. Chop builds once the tide turns.
    </Text>
    <Text variant="muted">Recorded at Scheveningen Noord, 2h 15m on the water.</Text>
  </div>
);

export const LabelledBlock = () => (
  <div className="flex flex-col gap-1 max-w-xl">
    <Text variant="label">Conditions</Text>
    <Text variant="body">Wind 19 kt NW · Waves 0.8 m · Water 17°C</Text>
    <Text variant="caption">Scored 82 by the conditions model</Text>
  </div>
);

export const AsElement = () => (
  <div className="flex flex-col gap-2 max-w-xl">
    <Text variant="body" as="span">Rendered as a span</Text>
    <Text variant="muted" as="div">Rendered as a div</Text>
  </div>
);
