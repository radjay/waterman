# Durable forecast eval logging (going-forward)

## Status

Spec only. Approved 2026-09-02 by Jeroen. Do not change live GO/NO. Do not rebuild the Guincho session-F1 / model-skill retrospective. Do not call Stormglass unless `STORMGLASS_API_KEY` is present (it is not in production today).

## Goal

Start logging issued forecasts vs Windguru observations now. Learn from observed/forecast ratios as soon as they stabilize (weeks, not next summer), then pin or calibrate the live forecast. A trained prediction model for summer 2027 is the later prize, not the first use of this data.

## Metric (locked)

- ratio = observed_kts / forecast_kts (12/10 = 1.2 over, 6/10 = 0.6 under).
- Extra wind is recorded, not a miss. No rideable-threshold / session-F1 ranking.
- Aggregate with geometric mean (or mean of log-ratios).
- Skip hours where forecast_kts < ~3 so the ratio does not explode.
- Slice later by season × wind direction.
- Ground truth: Windguru only.
- Forecasts stored as issued: Windy.app per-model (ecmwf, gfs27_long, iconeuro, iconglobal, lew) and Open-Meteo (including Previous Runs where non-null at the point). Stormglass only if a key exists.

## Sampling rule

Sample Windy/Open-Meteo at the **riding beach/lagoon** lat/lon (Windy spot ID). Score against the **Windguru station**, which may be a nearby cape/harbour/school mast. Distances below are haversine km, probed live 2026-09-02 (LIVE = `station_data_current` contains `unixtime`).

This is the same rule the Guincho study used: beach sample point vs Cape Raso station truth — do not sample models at the station coordinates. See [forecast-experiment-guincho-model-skill-handover.md](./forecast-experiment-guincho-model-skill-handover.md) (beach `38.7333°N, 9.4733°W` / Windy `20914`, truth Cabo Raso `3294`). Stormglass was never in that study.

## Storage

Dedicated eval store. Do NOT reuse `forecast_model_slots`, the 3-scrape ring buffer, 30-day `station_readings`, or `fx_*` tables that `historyRetention` wipes.

Preference: Cloudflare D1 on the same account as `waterman-web` if cheaper at this volume (Paid D1 includes 5 GB + 50M writes/month; this corpus is well under that). Convex-only eval tables are OK for v1 if faster to ship, but they must be excluded from 30-day `historyRetention` and from `RETAINED_SCRAPES` deletion.

Store:

- issued forecast rows (spot, model, issue time, valid hour, wind_kts, gust_kts, dir)
- observation rows (station id, time, wind_kts, gust_kts, dir)
- derived hourly ratio rows (spot, model, hour, ratio, season, dir_bin)

## Phases (implement in order; stop after the phase requested)

1. Stop throwing the corpus away: persist issued forecasts + station readings beyond the 3-scrape buffer and 30-day hot window. This is the only phase to build first if data is the bottleneck.
2. Going-forward ingest for the approved spots: Windguru obs + Windy per-model + Open-Meteo at the forecast lat/lon.
3. Hourly observed/forecast ratio rows with season × direction fields. Skip near-zero forecast hours.
4. Once ratios stabilize (weeks of daytime hours), pin a stably over/under model or apply the geometric-mean as a per-spot multiplier. Live GO/NO stays untouched until a human looks at the first stretch.
5. Train a summer 2027 prediction model on the full corpus. Out of scope until 4 has data.

## Out of scope

- Changing live GO/NO, default model, or Cascais/Guincho product forecasts.
- Session-F1 / rideable gates.
- Stormglass unless keyed.
- Logging spots listed under "Do not log".
- Cloning Guincho experiment archives as a substitute for going-forward ingest.

## Approved spots (log these)

Format: Spot | forecast lat, lon | Windy ID | Windguru station | dist | caveat

### Portugal

- Praia do Guincho | 38.7339, -9.4725 | 20914 (also 508544 exists; prefer 20914, higher favs) | 3294 Cabo Raso | 3.0 km | cape proxy, same as Guincho study
- Cascais / CNC | 38.6979, -9.4215 | Waterman default coords (resolve Windy ID if one exists; Open-Meteo at these coords is fine) | 2329 CNCFOIL | 0.6 km | at-spot; more prone than open-ocean wing
- Praia da Barra, Aveiro | 40.6389, -8.7629 | 102491 | 16181 Barra doca (alt 16158 MyWay 2.7 km) | 2.1 km | live school/dock
- Figueira / Cova Gala | 40.1255, -8.8638 | 1850759 | 1916 AKFM-Cova-Gala | at-spot |
- Peniche / Baleal | 39.3596, -9.3661 | 422339 | 3968 Cabo Carvoeiro | 3.6 km | cape, not the beach
- Fonte da Telha | 38.5976, -9.2099 | 144053 | 14874 Praia da Rainha | 2.2 km | on-beach 464 is dead; Rainha is Costa da Caparica proxy
- Alvor lagoon | 37.1156, -8.5789 | 20068 | 448 Portimão Cais | 4.6 km | harbour, not the lagoon
- Praia de Faro | 37.0039, -7.9881 | Centro Náutico / beach (resolve Windy ID; Open-Meteo at station coords OK) | 3324 Centro Náutico | at-spot | skip Faro Cais 449 (6 km quay)
- Fuseta / Ria Formosa | 37.0503, -7.7419 | 334148 | 2755 CN Fuzeta | at-spot |

### Spain + Canaries

- Valdevaqueros | 36.0662, -5.6852 | 395499 | 269 Spin Out | 0.1 km | at-spot; Arte y Vida 599 dead; ignore 15014 (unixtime but 0 wind)
- Los Lances | 36.0364, -5.6306 | 395498 | 2667 Campo de Fútbol | 2.0 km | football-field mast, not mid-beach or Hurricane reef. Town/Hurricane Windy 23140 is generic.
- El Médano | 28.0411, -16.5415 | 514707 | 14924 Kite Club | 0.7 km | AZUL 60 is dead; 3209 ElVallito is inland ~8 km, do not use as beach truth
- Sotavento | 28.1306, -14.2442 | 24099 | 373 René Egli | 1.0 km | lagoon
- Matas Blancas | 28.1731, -14.1970 | 775061 | 3428 Matasbay | 0.7 km | 2026-09-02 reading looked stuck-high (~28.7 kt flat); still live
- La Pared | 28.2146, -14.2248 | 4016111 | 4238 Fly and Surf | 0.9 km | west-coast, different exposure than Sotavento
- Flag Beach / Corralejo | 28.7196, -13.8409 | 60207 | 5880 Waikiki | 2.8 km | town vs dunes; 2052 and 809 dead
- Pollensa / Sa Marina | 39.8644, 3.0913 | 11968 | 4048 KiteandYoga | 1.1 km | not town Pollensa 25282
- Oliva Nova | 38.9049, -0.0632 | 357941 | 51 Piles | 6.3 km | Piles beach itself is Windy 310616 at 0 km from the mast
- Somo | 43.4586, -3.7342 | 595762 | 4278 Loredo | 0.9 km | harbour 1669 is 5.1 km if Loredo is too sheltered
- Zarautz | 43.2890, -2.1636 | 354619 | 5350 Mendizorrotz | 7.9 km | cape proxy; no beach mast
- Las Cucharas / Costa Teguise | (resolve from Windy 452364) | 452364 | 517 Villa La Morena | 0.07 km | included as Canaries volume; NOT a Famara proxy

### France

- Almanarre / Hyères | 43.0568, 6.1336 | 29892 | 16243 La Capte | 1.6 km | harbour on the east side of the tombolo, not the kite zone. Alt airport 16416 at 5.0 km
- Leucate / La Franqui | 42.9413, 3.0405 | 344598 | 16422 Leucate | 3.1 km | MF plage/cliff; Chinook 95 is dead
- Gruissan | 43.0951, 3.1122 | 584380 | 14601 Vieille Nouvelle | 2.0 km | at-spot; Pôle Nautique 930 dead. Lagoon alt 16128 Akila 2.6 km
- Canet | 42.7006, 3.0372 | 396092 | 4015 CN Canet | 0.4 km | at-spot; 789 YC Canet dead
- Seignosse / Les Estagnots | 43.6897, -1.4406 | 296166 | 3405 Seignosse | 0.9 km | at-spot; Hossegor Windy 8196 is inland; twin 1964 Bourdaines dead
- Lacanau Océan | 45.0016, -1.2016 | 35865 | 408 Tedey YC | 5.9 km | lake, not the ocean beach
- La Torche | 47.8430, -4.3463 | 323754 | 16430 Plovan | 8.4 km | inland/cape; legendary PWA 187 is dead
- Le Touquet | 50.5069, 1.5769 | 63627 | 16432 | 3.4 km | MF town/airport
- Oléron Vert Bois | 45.8691, -1.2611 | 319185 | 2920 Grand Village | 1.9 km | at-spot
- Piantarella (Corsica) | 41.3731, 9.2249 | 77113 | 16424 Cap-Pertusato | 3.9 km | cape proxy, over-reads vs lagoon

If implementing incrementally, start with at-spot / ≤3 km live pairs: Guincho, Cascais, Barra, Figueira, Fuseta, Faro, Valdevaqueros, El Médano, Sotavento, Matas, La Pared, Pollensa, Las Cucharas, Seignosse, Gruissan, Canet, Oléron. Then add cape/harbour proxies.

## Do not log (famous, no usable live Windguru)

Portugal: Cabedelo Viana (Windy 48263, station 3297 dead, next live ~49 km); Foz do Arelho / Óbidos (425918, 1750 dead); Lagoa da Albufeira (~38.51, -9.18, nearest live ~12 km); Sagres / Meia Praia (3426 dead).

Spain: Pozo Izquierdo (17926; 549/69/2764 dead; zero live Gran Canaria stations); Famara (604369, 214 dead; 517 is the other coast); Ebro / Riumar / Trabucador (live 14427 is 29–35 km inland); Empuriabrava (329 and 3822 dead).

France: Beauduc (nearest live 14 km inland; Fos 657 and Port-St-Louis 5528 dead); Quiberon (Carnac 355 dead); Loctudy/Lesconil; La Tranche; Île de Ré; Wissant; Barcarès; Dunkerque 15287 dead; Grande Motte 985 dead.

Do not invent replacement station IDs. Re-probe `station_data_current` before adding any new station; `unixtime` is required.

## Ingest notes for implementers

- Windguru station_list: GET `https://www.windguru.cz/int/iapi.php?q=station_list` (Chrome UA + Referer `https://www.windguru.cz/`). Current: GET `.../iapi.php?q=station_data_current&id_station=ID` with Referer `.../station/ID`. `seconds_alive` is NOT a live test.
- Windy widget already used in-repo: `https://windy.app/widget/data.php?id=wfwindyapp&spotID={id}&timelineRange=future`
- Store forecasts at issue time (do not overwrite with later runs of the same model). Keep `issue_time` + `valid_time`.
- Open-Meteo: verify non-null at the actual lat/lon. ICON-D2 / AROME HD / HARMONIE / ICON 2I do not cover Portugal.
- Production does not currently call Stormglass (Windy.app scrape + Windguru stations; lab uses Open-Meteo/IPMA/Windguru).
- Confirm which Convex URL the live worker actually calls before wiring anything to Convex (`wrangler.jsonc` vs GitHub Action `NEXT_PUBLIC_CONVEX_URL` have disagreed in the past).

## Acceptance for phase 1

After deploy, a scrape cycle must leave issued per-model slots and station readings queryable for longer than 18 hours and longer than 30 days (or exported out of the wiped tables). Live site GO/NO unchanged. No Stormglass calls. Only approved spots.

## Code pointers

Inspect these before implementing. Paths are current as of this spec; do not invent alternatives.

| Area | Path | Notes |
|------|------|--------|
| Frontend Worker | `wrangler.jsonc` | Worker name `waterman-web` (OpenNext). `vars.NEXT_PUBLIC_CONVEX_URL` is currently `https://keen-reindeer-909.convex.cloud`. |
| Deploy bake | `.github/workflows/deploy-web.yml` | Build/deploy sets `NEXT_PUBLIC_CONVEX_URL` to `https://adorable-anteater-323.convex.cloud`. Reconcile with `wrangler.jsonc` before eval writes. |
| Default map origin | `lib/theme.js` | `DEFAULT_COORDS` Cascais `{ lat: 38.6979, lon: -9.4215 }`. |
| Windy scrape | `lib/scraper.js` | Widget URL, `DEFAULT_MODEL = "gfs27_long"`, `WIND_MODEL_ALLOWLIST` / `getModelForecasts`. |
| Model labels | `lib/agreement.js` | Same five models: ecmwf, gfs27_long, iconeuro (ICON7), iconglobal (ICON13), lew. |
| Ingest plan | `lib/ingest/scrapePlan.js` | `scrapeOneSpot` saves default forecast then per-model via `getModelForecasts` → `saveModelSlots`. |
| Scrape entry | `scripts/scrape.mjs`, `convex/ingest.ts` | Wire scrape → Convex mutations. |
| 3-scrape ring | `convex/models.ts` | `RETAINED_SCRAPES = 3` (~18 h at 4 scrapes/day). Prunes `forecast_model_slots` in `saveModelSlots`. |
| Schema | `convex/schema.ts` | `forecast_model_slots`, `station_readings`, `forecast_slots_archive`, `fx_*` experiment tables. |
| Windguru live | `lib/windguru.js` | `fetchCurrentStationPayload` / `parseCurrentReading`; live iff payload has `unixtime`. Dead stations often return `datetime` only. |
| Station map | `lib/stations.js` | Known station lat/lon (e.g. CNC `2329`). |
| 30-day wipe | `lib/convex/historyRetention.js`, `convex/historyRetention.ts`, `convex/crons.ts` | `HISTORY_KEEP_DAYS = 30` deletes `station_readings`, `forecast_slots_archive`, `fx_*` (and related) via `retainHistory`. |
| Open-Meteo (lab/experiment) | `lib/forecast-experiment/openMeteoClient.js`, `lib/forecast-experiment/locations.js` | Previous Runs / domain notes (Portugal outside ICON-D2 / AROME HD / HARMONIE / ICON 2I). |
| R2 one-off | `archive/README.md` | `waterman-archive` holds the 2026-08-26 Convex snapshot parts — not a continuous pipe. |
| Guincho retrospective (do not rebuild) | `docs/forecast-experiment-guincho-model-skill-handover.md`, `docs/forecast-experiment-model-analysis-learnings.md` | Beach sample vs Cabo Raso; Cascais Model skill notes. No Stormglass in those studies. |

## Prior art (do not rebuild)

- [Guincho model skill handover](./forecast-experiment-guincho-model-skill-handover.md) — session-F1 / model-skill retrospective on local archive; beach `38.7333°N, 9.4733°W` / Windy `20914` scored against Cabo Raso `3294`, not the sand.
- [Model analysis learnings](./forecast-experiment-model-analysis-learnings.md) — Cascais Model skill / Open-Meteo coverage lessons.

## PR note

This file is the implementation contract. Spec-only PRs should not change ingest, schema, scrapers, or product UI.
