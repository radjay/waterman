import { Footer, Section, Text, Heading, Card, ScoreDial } from 'waterman';

// The capture clock is pinned to 2024-05-15T12:00:00Z, so the relative label
// is derived from that instant rather than a live `Date.now()`.
const NOW = Date.UTC(2024, 4, 15, 12, 0, 0);
const minutesAgo = (m: number) => NOW - m * 60_000;
const hoursAgo = (h: number) => NOW - h * 3_600_000;

export const PageFooter = () => (
  <div className="w-full max-w-2xl">
    <Section title="Scheveningen Noord">
      <div className="flex flex-col gap-3">
        <Card>
          <div className="flex items-start justify-between gap-4">
            <div className="flex flex-col gap-1">
              <Text variant="label">Saturday 07:00 – 09:15</Text>
              <Text variant="caption">19 kt NW gusting 26 kt · 0.8 m @ 6 s · water 17°C</Text>
            </div>
            <ScoreDial score={87} sport="wingfoil" size="md" />
          </div>
        </Card>
      </div>
    </Section>
    <Footer mostRecentScrapeTimestamp={minutesAgo(12)} />
  </div>
);

export const JustUpdated = () => (
  <div className="w-full max-w-2xl">
    <div className="flex flex-col gap-1">
      <Heading level={3}>Live wind</Heading>
      <Text variant="muted">Wijk aan Zee · 24 kt WSW gusting 31 kt</Text>
    </div>
    <Footer mostRecentScrapeTimestamp={minutesAgo(0.4)} />
  </div>
);

export const StaleForecast = () => (
  <div className="w-full max-w-2xl">
    <div className="flex flex-col gap-1">
      <Heading level={3}>Brouwersdam</Heading>
      <Text variant="muted">Last scrape ran before the morning model update.</Text>
    </div>
    <Footer mostRecentScrapeTimestamp={hoursAgo(5)} />
  </div>
);

export const WithoutTimestamp = () => (
  <div className="w-full max-w-2xl">
    <div className="flex flex-col gap-1">
      <Heading level={3}>Ijmuiden</Heading>
      <Text variant="muted">No scrape recorded yet — the footer keeps the page rule only.</Text>
    </div>
    <Footer />
  </div>
);
