import { Divider, Text } from 'waterman';

export const Weights = () => (
  <div className="flex flex-col gap-4 max-w-md">
    <div>
      <Text variant="caption">light</Text>
      <Divider weight="light" />
    </div>
    <div>
      <Text variant="caption">medium</Text>
      <Divider weight="medium" />
    </div>
    <div>
      <Text variant="caption">heavy</Text>
      <Divider weight="heavy" />
    </div>
  </div>
);

export const BetweenContent = () => (
  <div className="flex flex-col gap-3 max-w-md">
    <Text variant="body">Morning session — 18 kt, clean.</Text>
    <Divider />
    <Text variant="body">Afternoon session — 24 kt, building chop.</Text>
  </div>
);
