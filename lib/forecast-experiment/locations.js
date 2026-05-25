export const FX_LOCATIONS = [
  {
    slug: "cascais-bay",
    name: "Cascais Bay",
    role: "target",
    latitude: 38.6919,
    longitude: -9.4203,
    timezone: "Europe/Lisbon",
    defaultRideableWindKnots: 12,
  },
  {
    slug: "cabo-raso",
    name: "Cabo Raso",
    role: "lead-indicator",
    latitude: 38.7089,
    longitude: -9.4859,
    timezone: "Europe/Lisbon",
    defaultRideableWindKnots: 12,
  },
  {
    slug: "guincho",
    name: "Praia do Guincho",
    role: "lead-indicator",
    latitude: 38.7333,
    longitude: -9.4733,
    timezone: "Europe/Lisbon",
    defaultRideableWindKnots: 12,
  },
];

export const FX_MODELS = [
  {
    provider: "open-meteo",
    model: "ecmwf-ifs-hres-9km",
    openMeteoModel: "ecmwf_ifs",
    runHoursUtc: [0, 6, 12, 18],
    expectedAvailabilityLagHours: 6,
    enabled: true,
  },
  {
    provider: "open-meteo",
    model: "gfs-global",
    openMeteoModel: "gfs_global",
    runHoursUtc: [0, 6, 12, 18],
    expectedAvailabilityLagHours: 6,
    enabled: true,
  },
  {
    provider: "open-meteo",
    model: "icon-global",
    openMeteoModel: "icon_global",
    runHoursUtc: [0, 6, 12, 18],
    expectedAvailabilityLagHours: 6,
    enabled: true,
  },
  {
    provider: "open-meteo",
    model: "icon-eu",
    openMeteoModel: "icon_eu",
    runHoursUtc: [0, 3, 6, 9, 12, 15, 18, 21],
    expectedAvailabilityLagHours: 3,
    enabled: true,
  },
  {
    provider: "open-meteo",
    model: "meteofrance-arpege-europe",
    openMeteoModel: "meteofrance_arpege_europe",
    runHoursUtc: [0, 6, 12, 18],
    expectedAvailabilityLagHours: 4,
    enabled: true,
  },
];

export const FX_OBSERVATION_SOURCES = [
  {
    slug: "windguru-3294",
    provider: "windguru",
    providerStationId: "3294",
    locationSlug: "cabo-raso",
    name: "Windguru Cabo Raso 3294",
    cadenceMinutes: 5,
    enabled: true,
  },
  {
    slug: "windguru-2329",
    provider: "windguru",
    providerStationId: "2329",
    locationSlug: "cascais-bay",
    name: "Windguru Marina CNC 2329",
    cadenceMinutes: 5,
    enabled: false,
    metadata: {
      status: "sensor_offline",
      note: "Replace hardware; same Windguru ID expected",
    },
  },
  {
    slug: "ipma-surface",
    provider: "ipma",
    providerStationId: "all",
    locationSlug: "cascais-region",
    name: "IPMA Surface Station Feed",
    cadenceMinutes: 60,
    enabled: true,
  },
  {
    slug: "marina-cascais-future",
    provider: "custom",
    providerStationId: "marina-cascais-replacement",
    locationSlug: "cascais-bay",
    name: "Future Marina de Cascais Station",
    cadenceMinutes: 5,
    enabled: false,
  },
];

export const FX_WINDGURU_BACKFILL = [
  {
    sourceSlug: "windguru-3294",
    stationId: "3294",
    locationSlug: "cabo-raso",
    startDate: "2022-01-01",
  },
  {
    sourceSlug: "windguru-2329",
    stationId: "2329",
    locationSlug: "cascais-bay",
    startDate: "2020-01-01",
    endDate: null,
  },
];
