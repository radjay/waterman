import { Heading } from 'waterman';

export const Levels = () => (
  <div className="flex flex-col gap-3">
    <Heading level={1}>Today at Scheveningen</Heading>
    <Heading level={2}>Coming up</Heading>
    <Heading level={3}>Afternoon session</Heading>
    <Heading level={4}>Wind and swell</Heading>
  </div>
);

export const PageTitle = () => (
  <div className="flex flex-col gap-1">
    <Heading level={1}>Conditions report</Heading>
    <Heading level={4}>Wingfoiling · next 48 hours</Heading>
  </div>
);

export const SectionTitle = () => (
  <div className="flex flex-col gap-2">
    <Heading level={2}>Session journal</Heading>
    <Heading level={3}>March 2026</Heading>
  </div>
);
