/**
 * Static content for the wingfoil destination guide (`/destinations`),
 * sourced from the "Lisbon-origin wingfoiling destination decision tool"
 * dataset (v1-research-synthesis, 2026-08-24). Bundled at build time, not
 * fetched — this is fixed reference data, not a forecast, so it does not go
 * through useCoastData/Convex.
 *
 * The source's 27 rows are edited down to 21: Gran Canaria (Pozo) and Dakar
 * are dropped (weakest/most marginal on the list); Cabo Verde's 3 islands,
 * Italy's Sicily/Sardinia pair, and Greece's Prasonisi/Paros-Naxos pair are
 * each merged into one row. A merged row's rating is the *best* of its
 * islands/spots that month (a traveller picks whichever is on that month),
 * wind/waves are the average, and shoulder is the union. Names are
 * simplified to their essence, except
 * where a differently-named spot in the cluster carries distinctly bigger
 * waves than the primary zone (e.g. "El Médano / Cabezo", "Langebaan / Cape
 * Town") — that distinction stays in the name; the full spot list is always
 * in `primarySpots`, on the name tooltip regardless.
 *
 * The source's per-month cells are `score|typical_wind_kt|primary_zone_waves_m`
 * on a 1 (poor) – 5 (prime) scale; `ratings` below maps that onto this page's
 * 4-tier scale: 5→prime, 4→solid, 3→marginal, 2 and 1→skip (the source's own
 * wording for 2 — "not worth travelling solely for winging" — reads as this
 * page's Skip, not a milder Marginal). `wind`/`waves` keep the source's raw
 * per-month kt/m estimates for the cell tooltip. Per the source's own
 * caveat, these are editorial research-synthesis estimates, not a measured
 * climatology or forecast.
 *
 * `shoulder` months are the source's own `shoulder_months` (trade winds
 * starting/fading/more variable) transcribed as-is — unlike the prior
 * report-derived dataset, this source flags shoulder independent of score,
 * so a shoulder month here can land on any rating, not only "prime".
 *
 * `environment` is the destination's riding zone/wave character, straight
 * from the source's `environment` field, reused across every month's
 * tooltip (the source gives a rating per month, not a description per
 * month, so the tooltip does not invent one).
 *
 * The remaining source fields don't vary by month, so they surface once, on
 * the destination-name tooltip rather than repeating in all 12 cells:
 * `primarySpots` (the named launches behind the cluster name), `travelFlight`
 * / `travelGround` (the source's route detail — `travelFlight` is the string
 * "none" for the zero-flight local cluster), `notes` (caveats), `bestFor`
 * (source's tag list, snake_case), and `confidence` (the source's own
 * confidence label for the record).
 */

export const MONTHS = [
  { key: "jan", label: "Jan" },
  { key: "feb", label: "Feb" },
  { key: "mar", label: "Mar" },
  { key: "apr", label: "Apr" },
  { key: "may", label: "May" },
  { key: "jun", label: "Jun" },
  { key: "jul", label: "Jul" },
  { key: "aug", label: "Aug" },
  { key: "sep", label: "Sep" },
  { key: "oct", label: "Oct" },
  { key: "nov", label: "Nov" },
  { key: "dec", label: "Dec" },
];

export const RATING_RANK = { prime: 4, solid: 3, marginal: 2, skip: 1 };

export const RATING_LABEL = {
  prime: "Prime",
  solid: "Solid",
  marginal: "Marginal",
  skip: "Skip",
};

export const RATING_DETAIL = {
  prime: "Reliable strong wind, comfortable conditions.",
  solid: "Good wind, some day-to-day variability.",
  marginal: "Works, but unreliable or cold.",
  skip: "Not worth planning a trip around.",
};

export const WINGFOIL_DESTINATIONS = [
  {
    id: "portugal-guincho-caparica-obidos",
    name: "Guincho",
    location: "Portugal",
    travelLabel: "Home",
    travelHours: 0.75,
    waterTemp: "15–19°C",
    environment: "Guincho waves; Caparica chop/waves; Óbidos flatter water",
    primarySpots: ["Guincho", "Costa da Caparica", "Óbidos Lagoon"],
    travelFlight: "none",
    travelGround: "Drive from Lisbon/Estoril; exact spot depends on wind and tide.",
    notes: ["Highly exposed to Atlantic weather variability.", "Óbidos depth and access require local checking."],
    confidence: "medium",
    bestFor: ["local", "waves", "flat_water", "flexible_forecast"],
    ratings: {
      jan: "skip", feb: "skip", mar: "skip", apr: "marginal", may: "solid", jun: "prime",
      jul: "prime", aug: "prime", sep: "solid", oct: "marginal", nov: "skip", dec: "skip",
    },
    wind: {
      jan: 12, feb: 13, mar: 14, apr: 16, may: 18, jun: 22,
      jul: 23, aug: 23, sep: 20, oct: 16, nov: 13, dec: 12,
    },
    waves: {
      jan: 1.5, feb: 1.5, mar: 1.3, apr: 1.0, may: 0.8, jun: 0.7,
      jul: 0.6, aug: 0.7, sep: 0.9, oct: 1.1, nov: 1.4, dec: 1.5,
    },
    shoulder: ["mar", "apr", "oct", "nov"],
  },
  {
    id: "spain-tarifa",
    name: "Tarifa",
    location: "Spain",
    travelLabel: "~4h30–6h",
    travelHours: 5.25,
    waterTemp: "19–22°C",
    environment: "Chop/swell with nearby wave options; Levante can be powerful",
    primarySpots: ["Valdevaqueros", "Los Lances", "Balneario"],
    travelFlight: "LIS–AGP about 1h15 when available, then road transfer; driving is another option.",
    travelGround: "About 1h45–2h from Málaga to Tarifa, depending on traffic.",
    notes: ["Wind direction and strength can make progression conditions difficult."],
    confidence: "medium",
    bestFor: ["summer", "waves", "strong_wind", "short_haul"],
    ratings: {
      jan: "marginal", feb: "marginal", mar: "marginal", apr: "solid", may: "solid", jun: "prime",
      jul: "prime", aug: "prime", sep: "solid", oct: "solid", nov: "marginal", dec: "marginal",
    },
    wind: {
      jan: 17, feb: 18, mar: 19, apr: 20, may: 21, jun: 22,
      jul: 24, aug: 24, sep: 22, oct: 20, nov: 18, dec: 17,
    },
    waves: {
      jan: 1.0, feb: 1.0, mar: 0.9, apr: 0.8, may: 0.7, jun: 0.6,
      jul: 0.5, aug: 0.5, sep: 0.6, oct: 0.8, nov: 1.0, dec: 1.0,
    },
    shoulder: ["apr", "may", "oct", "nov"],
  },
  {
    id: "spain-tenerife-el-medano",
    name: "El Médano / Cabezo",
    location: "Tenerife, Canary Islands",
    travelLabel: "~4–5h",
    travelHours: 4.5,
    waterTemp: "21–23°C",
    environment: "El Médano chop; Cabezo wave option",
    primarySpots: ["El Médano", "Cabezo", "La Jaquita"],
    travelFlight: "LIS–TFS about 2h35 nonstop in the referenced timetable.",
    travelGround: "About 10–15 minutes to El Médano.",
    notes: ["Local wind acceleration and launch congestion vary by spot."],
    confidence: "medium-high",
    bestFor: ["summer", "short_haul", "waves", "warm_water"],
    ratings: {
      jan: "marginal", feb: "marginal", mar: "marginal", apr: "solid", may: "prime", jun: "prime",
      jul: "prime", aug: "prime", sep: "prime", oct: "solid", nov: "marginal", dec: "marginal",
    },
    wind: {
      jan: 14, feb: 14, mar: 16, apr: 19, may: 22, jun: 25,
      jul: 26, aug: 25, sep: 23, oct: 20, nov: 16, dec: 14,
    },
    waves: {
      jan: 0.8, feb: 0.8, mar: 0.7, apr: 0.6, may: 0.5, jun: 0.5,
      jul: 0.5, aug: 0.5, sep: 0.6, oct: 0.7, nov: 0.8, dec: 0.8,
    },
    shoulder: ["apr", "may", "oct", "nov"],
  },
  {
    id: "spain-fuerteventura-sotavento",
    name: "Sotavento",
    location: "Fuerteventura, Canary Islands",
    travelLabel: "~6–9h",
    travelHours: 7.5,
    waterTemp: "20–23°C",
    environment: "Matas flatter; Sotavento lagoon/chop with tidal effects",
    primarySpots: ["Matas Bay", "Sotavento", "Jandía"],
    travelFlight: "No Lisbon–FUE nonstop in the referenced 2026 check; connection required.",
    travelGround: "About 30–60 minutes from FUE depending on spot.",
    notes: ["Lagoon depth, tide, and current access should be verified."],
    confidence: "medium",
    bestFor: ["summer", "flat_water", "strong_wind", "warm_water"],
    ratings: {
      jan: "skip", feb: "marginal", mar: "marginal", apr: "solid", may: "prime", jun: "prime",
      jul: "prime", aug: "prime", sep: "prime", oct: "solid", nov: "marginal", dec: "skip",
    },
    wind: {
      jan: 16, feb: 18, mar: 20, apr: 22, may: 24, jun: 27,
      jul: 29, aug: 28, sep: 25, oct: 22, nov: 19, dec: 17,
    },
    waves: {
      jan: 0.5, feb: 0.5, mar: 0.5, apr: 0.4, may: 0.4, jun: 0.3,
      jul: 0.3, aug: 0.3, sep: 0.4, oct: 0.4, nov: 0.5, dec: 0.5,
    },
    shoulder: ["apr", "may", "oct", "nov"],
  },
  {
    id: "western-sahara-dakhla",
    name: "Dakhla / Lassarga",
    location: "Western Sahara, Moroccan-administered",
    travelLabel: "~8–12h",
    travelHours: 10.0,
    waterTemp: "19–23°C",
    environment: "Very flat lagoon; Lassarga/Foum Labouir wave options",
    primarySpots: ["Dakhla Lagoon", "Lassarga", "Foum Labouir"],
    travelFlight: "Usually LIS–CMN–VIL or via the Canaries; schedule-sensitive.",
    travelGround: "About 25–35 minutes to lagoon-area camps; longer to wave spots.",
    notes: ["April–October is the strongest blind-book window; November is more forecast-sensitive.", "Mast depth and rescue/launch logistics matter for wingfoiling."],
    confidence: "medium-high",
    bestFor: ["spring", "autumn", "flat_water", "progression", "waves"],
    ratings: {
      jan: "marginal", feb: "marginal", mar: "solid", apr: "prime", may: "prime", jun: "prime",
      jul: "prime", aug: "prime", sep: "prime", oct: "prime", nov: "marginal", dec: "marginal",
    },
    wind: {
      jan: 22, feb: 21, mar: 22, apr: 24, may: 25, jun: 27,
      jul: 27, aug: 26, sep: 24, oct: 23, nov: 19, dec: 18,
    },
    waves: {
      jan: 0.4, feb: 0.4, mar: 0.3, apr: 0.2, may: 0.2, jun: 0.3,
      jul: 0.3, aug: 0.3, sep: 0.3, oct: 0.3, nov: 0.4, dec: 0.4,
    },
    shoulder: ["mar", "nov"],
  },
  {
    id: "morocco-essaouira",
    name: "Essaouira / Moulay",
    location: "Morocco",
    travelLabel: "~5h30–7h",
    travelHours: 6.25,
    waterTemp: "18–20°C",
    environment: "Bay chop; Moulay proper wave riding",
    primarySpots: ["Essaouira Bay", "Moulay Bouzerktoun"],
    travelFlight: "Usually LIS–RAK, then road transfer.",
    travelGround: "About 2.5–3 hours from Marrakech to Essaouira.",
    notes: ["Wind and wave quality differ substantially between bay and Moulay."],
    confidence: "medium",
    bestFor: ["summer", "waves", "short_haul"],
    ratings: {
      jan: "skip", feb: "skip", mar: "marginal", apr: "solid", may: "prime", jun: "prime",
      jul: "prime", aug: "prime", sep: "solid", oct: "marginal", nov: "skip", dec: "skip",
    },
    wind: {
      jan: 12, feb: 14, mar: 16, apr: 18, may: 20, jun: 22,
      jul: 24, aug: 23, sep: 20, oct: 17, nov: 14, dec: 12,
    },
    waves: {
      jan: 1.3, feb: 1.3, mar: 1.1, apr: 0.9, may: 0.8, jun: 0.7,
      jul: 0.8, aug: 0.8, sep: 0.9, oct: 1.1, nov: 1.3, dec: 1.3,
    },
    shoulder: ["apr", "may", "oct", "nov"],
  },
  {
    id: "france-leucate",
    name: "Leucate",
    location: "France",
    travelLabel: "~5h30–7h30",
    travelHours: 6.5,
    waterTemp: "20–25°C",
    environment: "Flat/chop lagoon; Mediterranean wave option",
    primarySpots: ["La Franqui", "Le Goulet", "Étang de Leucate"],
    travelFlight: "Fly to BCN or TLS, then road transfer; routing varies.",
    travelGround: "About 2–2.5 hours from the nearest practical airport.",
    notes: ["Tramontana can be gusty; lagoon depth and launch access need checking."],
    confidence: "medium",
    bestFor: ["summer", "flat_water", "short_haul"],
    ratings: {
      jan: "skip", feb: "skip", mar: "marginal", apr: "solid", may: "solid", jun: "prime",
      jul: "prime", aug: "prime", sep: "solid", oct: "marginal", nov: "skip", dec: "skip",
    },
    wind: {
      jan: 17, feb: 19, mar: 21, apr: 23, may: 24, jun: 25,
      jul: 26, aug: 25, sep: 23, oct: 21, nov: 19, dec: 17,
    },
    waves: {
      jan: 0.3, feb: 0.3, mar: 0.3, apr: 0.3, may: 0.3, jun: 0.3,
      jul: 0.3, aug: 0.3, sep: 0.3, oct: 0.3, nov: 0.3, dec: 0.3,
    },
    shoulder: ["apr", "may", "sep", "oct"],
  },
  {
    id: "cape-verde",
    name: "Sal / Ponta Preta",
    location: "Cabo Verde",
    travelLabel: "~6–7h",
    travelHours: 6.5,
    waterTemp: "22–25°C",
    environment: "Santa Maria (Sal) chop/swell with the Ponta Preta wave option; Boa Vista flatter with Atlantic wave options; São Vicente a stronger-wind bay with a sheltered alternative",
    primarySpots: ["Kite Beach", "Santa Maria", "Ponta Preta", "Praia Carlota", "Sal Rei Bay", "Santa Mónica", "São Pedro", "Laginha", "Salamansa"],
    travelFlight: "Direct flights from Lisbon to Sal (~4h20), Boa Vista (~4h20), or São Vicente (~4h25).",
    travelGround: "About 10–20 minutes to the main beach areas on each island.",
    notes: ["Kite Beach is generally more progression-friendly than the expert wave spots.", "Prior research identifies November–April trades, with January–April particularly attractive.", "More exposed/strong-wind character than Boa Vista; local launch assessment is important."],
    confidence: "medium",
    bestFor: ["winter", "warm_water", "direct_flight", "waves", "progression", "quiet", "strong_wind"],
    ratings: {
      jan: "prime", feb: "prime", mar: "prime", apr: "prime", may: "solid", jun: "marginal",
      jul: "skip", aug: "skip", sep: "marginal", oct: "solid", nov: "prime", dec: "prime",
    },
    wind: {
      jan: 21, feb: 20, mar: 20, apr: 19, may: 17, jun: 15,
      jul: 14, aug: 15, sep: 16, oct: 18, nov: 20, dec: 21,
    },
    waves: {
      jan: 0.7, feb: 0.7, mar: 0.6, apr: 0.57, may: 0.5, jun: 0.5,
      jul: 0.5, aug: 0.5, sep: 0.57, oct: 0.67, nov: 0.7, dec: 0.7,
    },
    shoulder: ["may", "jun", "nov"],
  },
  {
    id: "egypt-el-gouna",
    name: "El Gouna",
    location: "Egypt",
    travelLabel: "~8–11h",
    travelHours: 9.5,
    waterTemp: "20–29°C",
    environment: "Protected lagoon and dedicated foil-friendly areas",
    primarySpots: ["El Gouna lagoons", "Mangroovy", "Abu Tig"],
    travelFlight: "One-stop routing to HRG in most Lisbon itineraries.",
    travelGround: "About 30–40 minutes from Hurghada airport.",
    notes: ["Water range spans winter and summer; station rideability thresholds are not the same as the display wind value."],
    confidence: "high",
    bestFor: ["spring", "summer", "flat_water", "progression", "warm_water"],
    ratings: {
      jan: "marginal", feb: "solid", mar: "marginal", apr: "solid", may: "solid", jun: "prime",
      jul: "solid", aug: "prime", sep: "prime", oct: "solid", nov: "solid", dec: "marginal",
    },
    wind: {
      jan: 17, feb: 19, mar: 18, apr: 19, may: 20, jun: 22,
      jul: 20, aug: 22, sep: 21, oct: 20, nov: 19, dec: 17,
    },
    waves: {
      jan: 0.2, feb: 0.2, mar: 0.2, apr: 0.2, may: 0.2, jun: 0.2,
      jul: 0.2, aug: 0.2, sep: 0.2, oct: 0.2, nov: 0.2, dec: 0.2,
    },
    shoulder: ["feb", "mar", "nov"],
  },
  {
    id: "egypt-soma-bay",
    name: "Soma Bay",
    location: "Egypt",
    travelLabel: "~8h30–11h30",
    travelHours: 10.0,
    waterTemp: "23–29°C",
    environment: "Flat/chop with a large riding area",
    primarySpots: ["Soma Bay", "Safaga", "7BFT lagoon"],
    travelFlight: "One-stop routing to HRG in most Lisbon itineraries.",
    travelGround: "About 45–60 minutes from Hurghada airport.",
    notes: ["Strong spring–summer candidate; verify launch/rescue and depth for foil equipment."],
    confidence: "medium",
    bestFor: ["spring", "summer", "flat_water", "progression", "warm_water"],
    ratings: {
      jan: "marginal", feb: "marginal", mar: "solid", apr: "prime", may: "prime", jun: "prime",
      jul: "prime", aug: "prime", sep: "prime", oct: "prime", nov: "solid", dec: "marginal",
    },
    wind: {
      jan: 16, feb: 17, mar: 18, apr: 20, may: 21, jun: 23,
      jul: 24, aug: 24, sep: 23, oct: 21, nov: 19, dec: 17,
    },
    waves: {
      jan: 0.3, feb: 0.3, mar: 0.3, apr: 0.3, may: 0.3, jun: 0.3,
      jul: 0.3, aug: 0.3, sep: 0.3, oct: 0.3, nov: 0.3, dec: 0.3,
    },
    shoulder: ["mar", "apr", "oct", "nov"],
  },
  {
    id: "egypt-dahab",
    name: "Dahab",
    location: "Egypt",
    travelLabel: "~8h30–12h",
    travelHours: 10.25,
    waterTemp: "23–28°C",
    environment: "Lagoon plus open-water swell",
    primarySpots: ["Lagoona", "Blue Lagoon", "Dahab bay"],
    travelFlight: "One-stop routing to SSH, schedule-dependent.",
    travelGround: "About 1 hour by road from Sharm El Sheikh airport.",
    notes: ["Wind is locally shaped; rideability can differ sharply between lagoon and bay."],
    confidence: "medium",
    bestFor: ["spring", "summer", "flat_water", "warm_water"],
    ratings: {
      jan: "skip", feb: "skip", mar: "marginal", apr: "solid", may: "prime", jun: "prime",
      jul: "prime", aug: "prime", sep: "prime", oct: "solid", nov: "marginal", dec: "skip",
    },
    wind: {
      jan: 13, feb: 14, mar: 16, apr: 19, may: 21, jun: 22,
      jul: 23, aug: 23, sep: 22, oct: 20, nov: 17, dec: 14,
    },
    waves: {
      jan: 0.3, feb: 0.3, mar: 0.3, apr: 0.3, may: 0.3, jun: 0.3,
      jul: 0.3, aug: 0.3, sep: 0.3, oct: 0.3, nov: 0.3, dec: 0.3,
    },
    shoulder: ["mar", "apr", "oct", "nov"],
  },
  {
    id: "greece-islands",
    name: "Greek Islands / Prasonisi",
    location: "Greece",
    travelLabel: "~7–10h",
    travelHours: 8.5,
    waterTemp: "22–27°C",
    environment: "Prasonisi (Rhodes) is flat one side, waves the other; Paros/Naxos are flat/chop channels with wave options",
    primarySpots: ["Prasonisi east side", "Prasonisi west side", "Pounda", "Mikri Vigla", "Paros channel"],
    travelFlight: "Usually via ATH, then a domestic hop or ferry to Rhodes (Prasonisi) or the Cyclades (Paros/Naxos).",
    travelGround: "Island transfer varies; allow substantial connection margin.",
    notes: ["Prior matrix rated early season low and June–September strongest.", "Inter-island logistics can dominate the door-to-water time."],
    confidence: "medium",
    bestFor: ["summer", "flat_water", "waves", "warm_water"],
    ratings: {
      jan: "skip", feb: "skip", mar: "skip", apr: "skip", may: "marginal", jun: "prime",
      jul: "prime", aug: "prime", sep: "solid", oct: "marginal", nov: "skip", dec: "skip",
    },
    wind: {
      jan: 11, feb: 11, mar: 12, apr: 14, may: 18, jun: 22,
      jul: 24, aug: 24, sep: 21, oct: 17, nov: 13, dec: 11,
    },
    waves: {
      jan: 0.3, feb: 0.3, mar: 0.3, apr: 0.3, may: 0.3, jun: 0.3,
      jul: 0.3, aug: 0.3, sep: 0.3, oct: 0.3, nov: 0.3, dec: 0.3,
    },
    shoulder: ["may", "jun", "sep", "oct"],
  },
  {
    id: "turkey-alacati",
    name: "Alaçatı",
    location: "Türkiye",
    travelLabel: "~7–10h",
    travelHours: 8.5,
    waterTemp: "20–25°C",
    environment: "Exceptionally flat, shallow bay",
    primarySpots: ["Alaçatı bay", "Urla area"],
    travelFlight: "Connect to ADB, then road transfer.",
    travelGround: "About 1 hour from İzmir airport.",
    notes: ["Shallow water is an advantage for learning but a foil/mast-depth constraint."],
    confidence: "medium",
    bestFor: ["summer", "flat_water", "progression", "warm_water"],
    ratings: {
      jan: "skip", feb: "skip", mar: "skip", apr: "skip", may: "solid", jun: "prime",
      jul: "prime", aug: "prime", sep: "solid", oct: "marginal", nov: "skip", dec: "skip",
    },
    wind: {
      jan: 11, feb: 11, mar: 13, apr: 15, may: 19, jun: 22,
      jul: 24, aug: 24, sep: 21, oct: 17, nov: 13, dec: 11,
    },
    waves: {
      jan: 0.2, feb: 0.2, mar: 0.2, apr: 0.2, may: 0.2, jun: 0.2,
      jul: 0.2, aug: 0.2, sep: 0.2, oct: 0.2, nov: 0.2, dec: 0.2,
    },
    shoulder: ["may", "jun", "sep", "oct"],
  },
  {
    id: "italy-sicily-sardinia",
    name: "Sicily / Sardinia",
    location: "Italy",
    travelLabel: "~6–9h",
    travelHours: 7.5,
    waterTemp: "20–27°C",
    environment: "Lo Stagnone (Sicily) is an ultra-flat lagoon; Porto Pollo (Sardinia) is flat/chop bays with some wave exposure",
    primarySpots: ["Lo Stagnone lagoon", "Marsala", "Porto Pollo", "Isola dei Gabbiani", "Palau"],
    travelFlight: "Route to PMO/TPS for Sicily (Lo Stagnone) or OLB for Sardinia (Porto Pollo), then road transfer.",
    travelGround: "Allow about 30–90 minutes after landing, depending on routing.",
    notes: ["Foil depth is a material constraint in parts of the lagoon.", "Wind funneling and launch choice vary across the bay complex."],
    confidence: "medium",
    bestFor: ["summer", "flat_water", "progression", "warm_water", "waves"],
    ratings: {
      jan: "skip", feb: "skip", mar: "marginal", apr: "solid", may: "prime", jun: "prime",
      jul: "prime", aug: "prime", sep: "solid", oct: "marginal", nov: "skip", dec: "skip",
    },
    wind: {
      jan: 13, feb: 14, mar: 15, apr: 18, may: 20, jun: 20,
      jul: 22, aug: 22, sep: 20, oct: 16, nov: 14, dec: 13,
    },
    waves: {
      jan: 0.28, feb: 0.28, mar: 0.28, apr: 0.28, may: 0.28, jun: 0.28,
      jul: 0.28, aug: 0.28, sep: 0.28, oct: 0.28, nov: 0.28, dec: 0.28,
    },
    shoulder: ["apr", "may", "sep", "oct"],
  },
  {
    id: "brazil-cumbuco-taiba",
    name: "Cumbuco / Taíba",
    location: "Brazil — Ceará",
    travelLabel: "~11–13h",
    travelHours: 12.0,
    waterTemp: "27–29°C",
    environment: "Ocean chop plus flat lagoons",
    primarySpots: ["Cumbuco", "Taíba", "Cauípe Lagoon"],
    travelFlight: "LIS–FOR about 9h30 nonstop in the referenced timetable.",
    travelGround: "About 45 minutes to Cumbuco; longer to Taíba.",
    notes: ["Cumbuco access is materially easier than Preá/Jeri and should remain a separate row."],
    confidence: "medium",
    bestFor: ["autumn", "warm_water", "flat_water", "long_haul"],
    ratings: {
      jan: "solid", feb: "skip", mar: "skip", apr: "skip", may: "skip", jun: "marginal",
      jul: "solid", aug: "prime", sep: "prime", oct: "prime", nov: "prime", dec: "solid",
    },
    wind: {
      jan: 17, feb: 12, mar: 11, apr: 10, may: 11, jun: 15,
      jul: 18, aug: 22, sep: 25, oct: 26, nov: 24, dec: 20,
    },
    waves: {
      jan: 0.8, feb: 0.8, mar: 0.8, apr: 0.7, may: 0.7, jun: 0.7,
      jul: 0.7, aug: 0.7, sep: 0.7, oct: 0.7, nov: 0.7, dec: 0.8,
    },
    shoulder: ["jan", "feb", "jul", "aug"],
  },
  {
    id: "brazil-prea-jeri",
    name: "Preá / Jericoacoara",
    location: "Brazil — Ceará",
    travelLabel: "~14–16h",
    travelHours: 15.0,
    waterTemp: "27–29°C",
    environment: "Open-ocean chop/waves with lagoon options",
    primarySpots: ["Preá", "Jericoacoara", "Guriú Lagoon"],
    travelFlight: "LIS–FOR nonstop, then substantial road transfer; JJD flights may change this.",
    travelGround: "About 4–5 hours from Fortaleza by road under normal conditions.",
    notes: ["Travel friction is high despite the good Lisbon–Fortaleza flight."],
    confidence: "medium",
    bestFor: ["autumn", "warm_water", "waves", "long_haul"],
    ratings: {
      jan: "solid", feb: "marginal", mar: "skip", apr: "skip", may: "skip", jun: "marginal",
      jul: "solid", aug: "prime", sep: "prime", oct: "prime", nov: "prime", dec: "solid",
    },
    wind: {
      jan: 16, feb: 14, mar: 13, apr: 14, may: 15, jun: 16,
      jul: 18, aug: 22, sep: 25, oct: 27, nov: 24, dec: 20,
    },
    waves: {
      jan: 0.9, feb: 0.9, mar: 0.8, apr: 0.7, may: 0.7, jun: 0.7,
      jul: 0.7, aug: 0.8, sep: 0.8, oct: 0.8, nov: 0.9, dec: 0.9,
    },
    shoulder: ["jan", "feb", "jul", "aug"],
  },
  {
    id: "brazil-sao-miguel-do-gostoso",
    name: "São Miguel do Gostoso",
    location: "Brazil — Rio Grande do Norte",
    travelLabel: "~13–16h",
    travelHours: 14.5,
    waterTemp: "26–29°C",
    environment: "Flat-water sections plus wave/sandbar options",
    primarySpots: ["São Miguel do Gostoso", "Tourinhos", "Cardeiro"],
    travelFlight: "Best approached via NAT in the prior review; FOR routing is less direct.",
    travelGround: "About 2 hours from Natal, with route variability.",
    notes: ["Seasonality and access require more verification than Cumbuco."],
    confidence: "medium-low",
    bestFor: ["autumn", "warm_water", "waves", "long_haul"],
    ratings: {
      jan: "prime", feb: "solid", mar: "skip", apr: "skip", may: "skip", jun: "skip",
      jul: "marginal", aug: "solid", sep: "prime", oct: "prime", nov: "solid", dec: "prime",
    },
    wind: {
      jan: 22, feb: 19, mar: 14, apr: 11, may: 10, jun: 14,
      jul: 17, aug: 20, sep: 23, oct: 25, nov: 22, dec: 22,
    },
    waves: {
      jan: 0.8, feb: 0.8, mar: 0.8, apr: 0.7, may: 0.7, jun: 0.7,
      jul: 0.7, aug: 0.8, sep: 0.8, oct: 0.8, nov: 0.8, dec: 0.8,
    },
    shoulder: ["feb", "mar", "jul", "aug"],
  },
  {
    id: "south-africa-langebaan-cape-town",
    name: "Langebaan / Cape Town",
    location: "South Africa",
    travelLabel: "~16–19h",
    travelHours: 17.5,
    waterTemp: "17–22°C",
    environment: "Langebaan flat lagoon; Cape Town proper waves; ocean water colder",
    primarySpots: ["Langebaan lagoon", "Big Bay", "Cape Town wave spots"],
    travelFlight: "No Lisbon nonstop in the referenced check; fastest itineraries are one-stop.",
    travelGround: "About 1h30–1h45 to Langebaan from Cape Town airport; Cape Town spots are nearer.",
    notes: ["Excellent waterman trip, but not the easiest progression-first choice."],
    confidence: "medium",
    bestFor: ["winter", "adventure", "waves", "strong_wind", "long_haul"],
    ratings: {
      jan: "prime", feb: "prime", mar: "solid", apr: "marginal", may: "skip", jun: "skip",
      jul: "skip", aug: "skip", sep: "skip", oct: "marginal", nov: "solid", dec: "prime",
    },
    wind: {
      jan: 28, feb: 27, mar: 22, apr: 19, may: 12, jun: 11,
      jul: 11, aug: 12, sep: 15, oct: 19, nov: 24, dec: 27,
    },
    waves: {
      jan: 0.2, feb: 0.2, mar: 0.2, apr: 0.2, may: 0.2, jun: 0.2,
      jul: 0.2, aug: 0.2, sep: 0.2, oct: 0.2, nov: 0.2, dec: 0.2,
    },
    shoulder: ["mar", "apr", "oct", "nov"],
  },
  {
    id: "tanzania-zanzibar",
    name: "Paje",
    location: "Zanzibar, Tanzania",
    travelLabel: "~17–20h",
    travelHours: 18.5,
    waterTemp: "26–29°C",
    environment: "Tidal flat lagoon plus reef waves",
    primarySpots: ["Paje", "Kiwengwa", "Jambiani"],
    travelFlight: "One-stop routing to ZNZ; fastest prior itinerary about 15h10 before ground transfer.",
    travelGround: "About 1 hour to Paje, traffic-dependent.",
    notes: ["Tides, reef, and shallow-water hazards are central to wingfoil suitability."],
    confidence: "medium-low",
    bestFor: ["winter", "summer", "warm_water", "waves", "long_haul"],
    ratings: {
      jan: "solid", feb: "solid", mar: "marginal", apr: "skip", may: "skip", jun: "solid",
      jul: "prime", aug: "prime", sep: "solid", oct: "marginal", nov: "skip", dec: "marginal",
    },
    wind: {
      jan: 14, feb: 13, mar: 11, apr: 8, may: 15, jun: 18,
      jul: 21, aug: 22, sep: 19, oct: 15, nov: 12, dec: 13,
    },
    waves: {
      jan: 0.2, feb: 0.2, mar: 0.2, apr: 0.2, may: 0.2, jun: 0.2,
      jul: 0.2, aug: 0.2, sep: 0.2, oct: 0.2, nov: 0.2, dec: 0.2,
    },
    shoulder: ["may", "jun", "oct", "nov"],
  },
  {
    id: "mauritius-le-morne",
    name: "Le Morne",
    location: "Mauritius",
    travelLabel: "~16–19h",
    travelHours: 17.5,
    waterTemp: "23–26°C",
    environment: "Lagoon with Manawa/One Eye wave options",
    primarySpots: ["Le Morne lagoon", "Manawa", "One Eye"],
    travelFlight: "One-stop routing to MRU.",
    travelGround: "About 1 hour to Le Morne.",
    notes: ["Expert wave zones should not be confused with the more accessible lagoon."],
    confidence: "medium",
    bestFor: ["winter", "waves", "warm_water", "adventure", "long_haul"],
    ratings: {
      jan: "skip", feb: "skip", mar: "skip", apr: "marginal", may: "solid", jun: "prime",
      jul: "prime", aug: "prime", sep: "solid", oct: "marginal", nov: "skip", dec: "skip",
    },
    wind: {
      jan: 16, feb: 15, mar: 16, apr: 21, may: 23, jun: 24,
      jul: 25, aug: 25, sep: 22, oct: 19, nov: 17, dec: 16,
    },
    waves: {
      jan: 0.3, feb: 0.3, mar: 0.3, apr: 0.3, may: 0.3, jun: 0.3,
      jul: 0.3, aug: 0.3, sep: 0.3, oct: 0.3, nov: 0.3, dec: 0.3,
    },
    shoulder: ["apr", "may", "oct", "nov"],
  },
  {
    id: "dominican-republic-cabarete",
    name: "Cabarete",
    location: "Dominican Republic",
    travelLabel: "~13–17h",
    travelHours: 15.0,
    waterTemp: "26–29°C",
    environment: "Inside reef manageable; outside waves",
    primarySpots: ["Kite Beach", "Cabarete Bay", "Encuentro"],
    travelFlight: "POP is operationally awkward; PUJ may be easier but adds a long road transfer.",
    travelGround: "About 4 hours from Punta Cana in the prior access estimate; much shorter via POP.",
    notes: ["Airport choice changes the product recommendation materially."],
    confidence: "medium-low",
    bestFor: ["winter", "summer", "warm_water", "waves", "long_haul"],
    ratings: {
      jan: "solid", feb: "solid", mar: "solid", apr: "solid", may: "marginal", jun: "prime",
      jul: "prime", aug: "prime", sep: "solid", oct: "solid", nov: "solid", dec: "solid",
    },
    wind: {
      jan: 15, feb: 16, mar: 15, apr: 16, may: 17, jun: 20,
      jul: 21, aug: 21, sep: 19, oct: 17, nov: 16, dec: 15,
    },
    waves: {
      jan: 0.6, feb: 0.6, mar: 0.5, apr: 0.5, may: 0.5, jun: 0.4,
      jul: 0.4, aug: 0.4, sep: 0.5, oct: 0.5, nov: 0.6, dec: 0.6,
    },
    shoulder: ["apr", "may", "oct", "nov"],
  },
];
