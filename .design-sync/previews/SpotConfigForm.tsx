import { SpotConfigForm, Heading, Text } from 'waterman';

const noop = () => {};

// Realistic saved thresholds, matching the shape the admin panel reads back
// from Convex (`config` is null when a sport has never been configured).
const wingfoilConfig = {
  _id: 'cfg_scheveningen_wingfoil',
  minSpeed: 14,
  minGust: 18,
  directionFrom: 180,
  directionTo: 360,
};

const surfingConfig = {
  _id: 'cfg_wijkaanzee_surfing',
  minSwellHeight: 0.8,
  maxSwellHeight: 2.5,
  swellDirectionFrom: 270,
  swellDirectionTo: 30,
  minPeriod: 7,
  optimalTide: 'low',
};

export const WingfoilThresholds = () => (
  <div className="max-w-[640px]">
    <SpotConfigForm
      spotId="spot_scheveningen_noord"
      sport="wingfoil"
      config={wingfoilConfig}
      onSave={noop}
    />
  </div>
);

export const SurfingThresholds = () => (
  <div className="max-w-[640px]">
    <SpotConfigForm
      spotId="spot_wijk_aan_zee"
      sport="surfing"
      config={surfingConfig}
      onSave={noop}
    />
  </div>
);

export const NotConfigured = () => (
  <div className="max-w-[640px]">
    <SpotConfigForm
      spotId="spot_brouwersdam"
      sport="surfing"
      config={null}
      onSave={noop}
    />
  </div>
);

export const SpotAdminPanel = () => (
  <div className="max-w-[640px] flex flex-col gap-2">
    <Heading level={3}>Scheveningen Noord</Heading>
    <Text variant="muted" className="mb-4">
      Netherlands · 52.108° N, 4.275° E · Windguru station 48291
    </Text>
    <SpotConfigForm
      spotId="spot_scheveningen_noord"
      sport="wingfoil"
      config={wingfoilConfig}
      onSave={noop}
    />
    <SpotConfigForm
      spotId="spot_scheveningen_noord"
      sport="surfing"
      config={null}
      onSave={noop}
    />
  </div>
);
