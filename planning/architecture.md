# Waterman Architecture

**Version**: 1.0  
**Last Updated**: 2024

## Overview

Waterman is a watersports monitoring system that aggregates weather forecast data from Windy.app and presents it to users filtered by sport-specific criteria. The application is built as a modern full-stack web application with a serverless backend.

## High-Level Architecture

```
┌─────────────────┐
│   Next.js App   │  (Frontend - React)
│   (Client)      │
└────────┬────────┘
         │
         │ HTTP/WebSocket
         │
┌────────▼────────┐
│  Convex Backend │  (Serverless Database + Functions)
│  (Backend)      │
└────────┬────────┘
         │
         │ Store/Query
         │
┌────────▼────────┐
│  Convex DB      │  (Serverless Database)
└─────────────────┘

┌─────────────────┐
│  Scraper Script  │  (Puppeteer/API)
│  (External)     │
└────────┬────────┘
         │
         │ Scrape
         │
┌────────▼────────┐
│   Windy.app     │  (Data Source)
└─────────────────┘
```

### Architecture Principles

1. **Serverless-First**: Uses Convex for backend, eliminating server management
2. **Real-Time Ready**: Convex provides real-time subscriptions (currently using polling)
3. **Type-Safe**: TypeScript for backend, type-safe Convex queries
4. **Component-Based**: React components organized by feature
5. **Data-Driven**: Sport-specific filtering logic driven by database configs

---

## Tech Stack

### Frontend
- **Next.js 16**: React framework with App Router
- **React 19**: UI library
- **Tailwind CSS**: Utility-first CSS framework
- **Lucide React**: Icon library
- **HLS.js**: Video streaming for webcams

### Backend
- **Convex**: Serverless backend and database
  - Real-time database
  - Serverless functions (queries, mutations, actions)
  - Type-safe API generation
  - Automatic API generation

### Data Collection
- **Puppeteer**: Web scraping (fallback)
- **Direct API**: Windy.app widget API (primary method)

### Deployment
- **Render.com**: Hosting for Next.js app
- **Convex Cloud**: Hosted Convex backend

---

## Database Architecture

### Schema Design

The database uses a normalized schema with four main tables:

#### 1. `spots` Table
Stores water sports locations (beaches, spots).

**Fields:**
- `name` (string): Spot name
- `url` (string): Windy.app URL
- `country` (optional string): Country location
- `windySpotId` (optional string): Windy.app spot ID for API access
- `sports` (optional array<string>): Sports supported by this spot (e.g., ["wingfoil", "surfing"])
- `webcamUrl` (optional string): Webcam stream URL
- `webcamStreamSource` (optional string): Webcam provider ("iol" or "quanteec")
- `liveReportUrl` (optional string): Live wind report URL

**Design Decisions:**
- `sports` is an array to support multi-sport spots
- Optional fields allow gradual data enrichment
- No indexes needed (small dataset, full table scans acceptable)

#### 2. `spotConfigs` Table
Stores sport-specific condition criteria for each spot.

**Fields:**
- `spotId` (Id<"spots">): Reference to spot
- `sport` (string): Sport name (e.g., "wingfoil", "surfing")
- **Wingfoiling criteria:**
  - `minSpeed` (optional number): Minimum wind speed in knots
  - `minGust` (optional number): Minimum gust speed in knots
  - `directionFrom` (optional number): Wind direction range start (0-360°)
  - `directionTo` (optional number): Wind direction range end (0-360°)
- **Surfing criteria:**
  - `minSwellHeight` (optional number): Minimum swell height in meters
  - `maxSwellHeight` (optional number): Maximum swell height in meters
  - `swellDirectionFrom` (optional number): Swell direction range start
  - `swellDirectionTo` (optional number): Swell direction range end
  - `minPeriod` (optional number): Minimum wave period in seconds
  - `optimalTide` (optional string): "high", "low", or "both"

**Design Decisions:**
- Separate table allows multiple configs per spot (one per sport)
- Optional fields support different criteria per sport
- Flexible schema accommodates future sports with different criteria

#### 3. `forecast_slots` Table
Time-series forecast data for each spot.

**Fields:**
- `spotId` (Id<"spots">): Reference to spot
- `timestamp` (number): Forecast time (epoch ms)
- `scrapeTimestamp` (optional number): When data was scraped (epoch ms)
- `speed` (number): Wind speed in knots
- `gust` (number): Wind gust speed in knots
- `direction` (number): Wind direction (0-360°)
- `waveHeight` (optional number): Wave height in meters
- `wavePeriod` (optional number): Wave period in seconds
- `waveDirection` (optional number): Wave direction (0-360°)
- `tideHeight` (optional number): Tide height in meters
- `tideType` (optional string): "high" or "low"
- `tideTime` (optional number): Tide event timestamp

**Indexes:**
- `by_spot`: On `spotId` - Fast lookups by spot
- `by_spot_and_scrape_timestamp`: On `[spotId, scrapeTimestamp]` - Efficient scrape-based queries

**Design Decisions:**
- `scrapeTimestamp` enables historical data retention
- Optional wave/tide fields support different sports
- Indexes optimized for common query patterns

#### 4. `scrapes` Table
Tracks scrape execution metadata.

**Fields:**
- `spotId` (Id<"spots">): Reference to spot
- `scrapeTimestamp` (number): When scrape ran (epoch ms)
- `isSuccessful` (boolean): Whether scrape succeeded
- `slotsCount` (number): Number of slots collected
- `errorMessage` (optional string): Error if scrape failed

**Indexes:**
- `by_spot_and_timestamp`: On `[spotId, scrapeTimestamp]` - Efficient scrape history queries

**Design Decisions:**
- Separate table enables scrape monitoring and debugging
- Tracks success/failure for reliability monitoring
- Enables data freshness checks

### Data Relationships

```
spots (1) ──< (many) spotConfigs
spots (1) ──< (many) forecast_slots
spots (1) ──< (many) scrapes
```

- One spot can have multiple configs (one per sport)
- One spot has many forecast slots (time-series data)
- One spot has many scrape records (execution history)

---

## Component Architecture

### Organization Strategy

Components are organized by **feature** rather than by size/complexity (Atomic Design). This makes it easier to find related components and understand feature boundaries.

### Component Structure

```
components/
├── ui/              # Reusable UI primitives
│   ├── Arrow.js    # Direction arrow indicator
│   ├── Badge.js     # Badge component (e.g., "EPIC")
│   ├── Icon.js      # Icon wrapper
│   └── Metric.js    # Metric display (icon + value)
│
├── forecast/        # Forecast display components
│   ├── DaySection.js      # Groups slots by day and spot
│   ├── ForecastSlot.js     # Individual time slot display
│   ├── WindGroup.js        # Wind data display
│   ├── WaveGroup.js        # Wave data display
│   └── DirectionIndicator.js # Wind/wave direction
│
├── tide/            # Tide-related components
│   ├── TideChart.js    # Visual tide chart
│   ├── TideTable.js    # Tabular tide data
│   ├── TideSection.js  # Tide list display
│   └── TideIndicator.js # Simple tide indicator
│
├── layout/          # Layout and navigation
│   ├── Header.js        # Page header
│   ├── Footer.js        # Page footer
│   ├── MainLayout.js    # Main page wrapper
│   ├── SportSelector.js  # Sport selection UI
│   └── ShowFilter.js    # Filter toggle (best/all)
│
└── common/          # Shared components
    ├── EmptyState.js    # Empty state display
    └── WebcamModal.js   # Webcam video modal
```

### Component Patterns

1. **Presentational Components**: Most components are presentational, receiving data via props
2. **Client Components**: Components using hooks/interactivity marked with `"use client"`
3. **Responsive Design**: Components adapt layout for mobile (card) vs desktop (row)
4. **Composition**: Complex components composed of simpler ones (e.g., `ForecastSlot` uses `WindGroup`, `WaveGroup`)

---

## Data Flow

### 1. Initial Page Load

```
User visits page
    ↓
app/page.js mounts
    ↓
useEffect triggers
    ↓
Fetch spots (filtered by selected sports)
    ↓
For each spot:
  - Fetch forecast slots
  - Fetch spot configs (one per sport)
    ↓
Enrich slots with:
  - Format time/date
  - Check criteria match
  - Mark as "ideal" or "matches"
  - Detect "epic" conditions
    ↓
Group slots by day
    ↓
Group slots by spot within each day
    ↓
Render DaySection components
```

### 2. Sport Selection

```
User selects/deselects sport
    ↓
SportSelector updates state
    ↓
Persists to localStorage
    ↓
Triggers useEffect in page.js
    ↓
Re-fetches spots (filtered by new sports)
    ↓
Re-fetches forecasts and configs
    ↓
Re-enriches and re-renders
```

### 3. Filter Toggle (Best/All)

```
User toggles filter
    ↓
ShowFilter updates state
    ↓
Persists to localStorage
    ↓
Re-renders with new filter
    ↓
ForecastSlot components show/hide based on:
  - showFilter === "best": Only show isIdeal slots
  - showFilter === "all": Show all matchingCriteria slots
```

### 4. Scraping Flow

```
Cron job / Manual trigger
    ↓
scripts/scrape.mjs runs
    ↓
Fetch all spots from Convex
    ↓
For each spot:
  - Extract Windy.app spot ID
  - Call Windy.app API
  - Parse forecast data
  - Parse tide data
  - Transform to our format
    ↓
Call saveForecastSlots mutation
    ↓
Validate scrape data
    ↓
Insert scrape record
    ↓
Insert forecast slots (with scrapeTimestamp)
    ↓
Return success/failure
```

---

## API Design

### Convex Functions

All backend logic is implemented as Convex functions (queries, mutations, actions).

#### Queries (Read-Only)

**`spots.list`**
- **Purpose**: List all spots, optionally filtered by sports
- **Args**: `{ sports?: string[] }`
- **Returns**: `Spot[]`
- **Usage**: Get spots for selected sports

**`spots.getSpotConfig`**
- **Purpose**: Get configuration for a spot-sport combination
- **Args**: `{ spotId: Id<"spots">, sport: string }`
- **Returns**: `SpotConfig | null`
- **Usage**: Get criteria for filtering

**`spots.getForecastSlots`**
- **Purpose**: Get forecast slots for a spot (from most recent scrape)
- **Args**: `{ spotId: Id<"spots"> }`
- **Returns**: `ForecastSlot[]`
- **Usage**: Get forecast data for display

**`spots.getMostRecentScrapeTimestamp`**
- **Purpose**: Get most recent successful scrape timestamp
- **Args**: `{}`
- **Returns**: `number | null`
- **Usage**: Display data freshness in footer

#### Mutations (Write)

**`spots.saveForecastSlots`**
- **Purpose**: Save forecast data from a scrape
- **Args**: `{ spotId, scrapeTimestamp, slots }`
- **Returns**: `{ scrapeId, isSuccessful }`
- **Usage**: Scraper saves data after collection

**`spots.addSpot`**
- **Purpose**: Add a new spot with configurations
- **Args**: `{ name, url, configs }`
- **Returns**: `Id<"spots">`
- **Usage**: Admin/manual spot addition

**`spots.updateWindySpotId`**
- **Purpose**: Update a spot's Windy.app ID
- **Args**: `{ spotId, windySpotId }`
- **Returns**: `void`
- **Usage**: Fix/update spot IDs

**`spots.removeTodayScrapes`**
- **Purpose**: Remove all scrapes and slots from today
- **Args**: `{}`
- **Returns**: `{ deletedScrapesCount, deletedSlotsCount, message }`
- **Usage**: Debugging/cleanup utility

### Next.js API Routes

**`/api/scrape`** (POST)
- **Purpose**: Trigger scraping via HTTP
- **Auth**: Optional `SCRAPE_SECRET_TOKEN` header
- **Returns**: JSON with scrape results
- **Usage**: Manual scraping, cron job integration

**`/api/calendar/[sport]`** (GET)
- **Purpose**: Generate iCal calendar feed for ideal conditions
- **Params**: `sport` (wingfoil or surfing)
- **Returns**: iCal format text
- **Usage**: Calendar subscription for ideal conditions

---

## Scraping Architecture

### Data Source

**Windy.app Widget API**
- Endpoint: `https://windy.app/widget/data.php?id=wfwindyapp&spotID={spotId}&timelineRange=future`
- Returns: JSON wrapped in `window.wfwindyapp = {...}`
- Contains: Forecast data and tide data

### Scraping Strategy

1. **Primary Method**: Direct API calls (fast, reliable)
2. **Fallback**: Puppeteer scraping (if API changes)

### Data Transformation

**Input** (Windy.app format):
- Timestamps in seconds
- Wind speed in m/s
- All data in single array

**Output** (Our format):
- Timestamps in milliseconds (epoch ms)
- Wind speed in knots
- Separate tide entries
- Daylight hours only (9 AM - 6 PM)
- Future data only

### Validation

Before saving, scrapes are validated:
- Minimum 10 slots
- Contains future data
- At least 24 hours of future coverage

### Historical Data

- All forecast slots retain `scrapeTimestamp`
- Enables historical data retention
- Queries return most recent scrape's data
- Old data preserved for analysis

---

## State Management

### Client-Side State

**React State** (in `app/page.js`):
- `selectedSports`: Currently selected sports
- `showFilter`: "best" or "all"
- `spots`: Array of spot objects
- `allSlots`: All forecast slots (before grouping)
- `spotsMap`: Map of spotId → spot data
- `loading`: Loading state
- `mostRecentScrapeTimestamp`: Data freshness

**LocalStorage**:
- `waterman_selected_sport`: Selected sports (persisted)
- `waterman_show_filter`: Filter preference (persisted)

### Server-Side State

All persistent state stored in Convex database:
- Spots, configs, forecast slots, scrapes

### Data Fetching

- **Pattern**: Fetch-on-mount with `useEffect`
- **Client**: `ConvexHttpClient` for queries/mutations
- **Real-time**: Currently polling-based (can upgrade to subscriptions)

---

## Filtering Logic

### Sport-Specific Criteria

**Wingfoiling:**
- Wind speed ≥ `minSpeed`
- Wind gust ≥ `minGust`
- Wind direction within `directionFrom` → `directionTo` range
- Handles wrap-around (e.g., 315° → 135° crosses 0°)

**Surfing:**
- Wave height within `minSwellHeight` → `maxSwellHeight`
- Wave period ≥ `minPeriod`
- Wave direction within `swellDirectionFrom` → `swellDirectionTo`
- Tide matches `optimalTide` ("high", "low", or "both")

### Filter Modes

**"best"** (default):
- Shows only slots where `isIdeal === true`
- Ideal = matches all criteria + direction matches (for surfing)

**"all"**:
- Shows all slots where `matchesCriteria === true`
- Includes slots that match basic criteria but may not be ideal

### Epic Conditions

Slots marked as "epic" when:
- Wind speed ≥ 20 knots
- Gust - speed ≤ 10 knots (steady wind)

---

## Deployment Architecture

### Frontend (Next.js)

**Hosting**: Render.com
- Static site generation where possible
- Server-side rendering for dynamic content
- Environment variables for Convex URL

### Backend (Convex)

**Hosting**: Convex Cloud
- Serverless functions
- Managed database
- Automatic scaling
- Real-time subscriptions available

### Scraping

**Options**:
1. **Render Cron Jobs**: Scheduled scraping
2. **API Endpoint**: Manual/HTTP-triggered scraping
3. **Local Scripts**: Development/debugging

### Environment Variables

**Required**:
- `NEXT_PUBLIC_CONVEX_URL`: Convex deployment URL

**Optional**:
- `SCRAPE_SECRET_TOKEN`: API endpoint authentication

---

## Design Patterns

### 1. Feature-Based Organization
Components organized by feature, not size/complexity.

**Rationale**: Easier to find related code, better scalability.

### 2. Configuration-Driven Filtering
Filtering logic driven by database configs, not hardcoded.

**Rationale**: Easy to add new spots/sports without code changes.

### 3. Historical Data Retention
Forecast slots retain `scrapeTimestamp` for history.

**Rationale**: Enables data analysis, debugging, and rollback.

### 4. Multi-Sport Support
Spots can support multiple sports with separate configs.

**Rationale**: Many spots work for multiple sports (e.g., wingfoiling + surfing).

### 5. Client-Side Enrichment
Forecast slots enriched on client with criteria matching.

**Rationale**: Keeps backend simple, allows flexible filtering.

### 6. Validation Before Save
Scrapes validated before saving to database.

**Rationale**: Prevents bad data, ensures data quality.

---

## Performance Considerations

### Database Queries

- **Indexes**: Optimized for common query patterns
- **Batch Queries**: Multiple spots fetched in parallel
- **Selective Loading**: Only fetch data for selected sports

### Frontend

- **Client-Side Filtering**: Fast filtering without server round-trips
- **Component Memoization**: Can be added if needed
- **Lazy Loading**: Webcam modal loads on demand

### Scraping

- **API Over Puppeteer**: Faster, more reliable
- **Parallel Scraping**: Can scrape multiple spots concurrently
- **Validation**: Prevents saving incomplete data

---

## Security Considerations

### API Endpoints

- **Scrape Endpoint**: Optional token authentication
- **Calendar Endpoint**: Public (read-only data)

### Data Access

- **Convex**: Public queries/mutations (can be restricted if needed)
- **No User Auth**: Currently anonymous (can add auth later)

### Input Validation

- **Convex Validators**: All function args validated
- **Type Safety**: TypeScript for backend functions

---

## Scalability

### Current Limitations

- **Spots**: Designed for tens of spots (not thousands)
- **Forecast Slots**: Time-series data grows over time (can archive old data)
- **Scraping**: Sequential scraping (can parallelize)

### Future Optimizations

1. **Real-Time Subscriptions**: Replace polling with Convex subscriptions
2. **Data Archiving**: Archive old forecast slots periodically
3. **Caching**: Add caching layer if needed
4. **Parallel Scraping**: Scrape multiple spots concurrently
5. **User Authentication**: Add user accounts for preferences

---

## Testing Strategy

### Current State

- Manual testing
- Debug scripts in `scripts/` directory
- Scrape validation prevents bad data

### Recommended Additions

1. **Unit Tests**: Component logic, filtering functions
2. **Integration Tests**: Scrape → save → query flow
3. **E2E Tests**: User flows (sport selection, filtering)
4. **Data Validation**: Automated scrape validation

---

## Future Architecture Considerations

### Potential Enhancements

1. **Real-Time Updates**: Use Convex subscriptions instead of polling
2. **User Accounts**: Add authentication for personalized preferences
3. **Notifications**: Alert users when conditions match criteria
4. **Mobile App**: React Native app using same Convex backend
5. **Analytics**: Track which spots/conditions are most popular
6. **Multi-Source Data**: Aggregate data from multiple weather sources
7. **Machine Learning**: Predict conditions based on historical patterns

### Technical Debt

1. **Component Organization**: Current structure is good, monitor as it grows
2. **State Management**: Consider state management library if complexity grows
3. **Type Safety**: Add TypeScript to frontend components
4. **Error Handling**: More comprehensive error boundaries
5. **Loading States**: More granular loading states

---

## Key Architectural Decisions

### Why Convex?

- **Serverless**: No server management
- **Real-Time**: Built-in real-time capabilities
- **Type-Safe**: Automatic type generation
- **Simple**: Less boilerplate than traditional backends

### Why Feature-Based Components?

- **Findability**: Easier to locate related components
- **Scalability**: Better organization as app grows
- **Maintainability**: Clear feature boundaries

### Why Client-Side Filtering?

- **Flexibility**: Easy to change filter logic
- **Performance**: No server round-trips for filtering
- **Simplicity**: Keeps backend focused on data storage

### Why Historical Data?

- **Debugging**: Can see what data was scraped when
- **Analysis**: Historical trends
- **Rollback**: Can revert to previous scrape if needed

---

## References

- **Convex Documentation**: https://docs.convex.dev
- **Next.js Documentation**: https://nextjs.org/docs
- **Refactoring Summary**: `/planning/refactor/01.md`
- **PRD**: `/planning/prds/01.md`

---

**Document Maintained By**: Engineering Team  
**Last Review**: 2024

