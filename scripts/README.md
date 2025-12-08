# Scripts Directory

Utility scripts for the Waterman application.

## Active Scripts

### `scrape.mjs`
**Purpose**: Main scraping script to collect forecast data from Windy.app for all spots.

**Usage**:
```bash
npm run scrape
# or
node scripts/scrape.mjs
```

**What it does**:
- Fetches all spots from Convex database
- Scrapes forecast data from Windy.app for each spot
- Saves forecast slots to Convex database
- Tracks scrape success/failure in `scrapes` table

**Requirements**:
- `NEXT_PUBLIC_CONVEX_URL` environment variable must be set
- Puppeteer and Chrome must be installed

---

### `remove-today-scrapes.mjs`
**Purpose**: Utility to remove all scrapes and forecast slots from today. Useful for debugging or re-scraping.

**Usage**:
```bash
node scripts/remove-today-scrapes.mjs
```

**What it does**:
- Removes all scrapes from today
- Removes all forecast slots associated with today's scrapes
- Useful when you need to force a fresh scrape

**Requirements**:
- `NEXT_PUBLIC_CONVEX_URL` environment variable must be set

---

## Debug/Utility Scripts

### `check-puppeteer.mjs`
**Purpose**: Debug script to check Puppeteer and Chrome installation/paths.

**Usage**:
```bash
node scripts/check-puppeteer.mjs
```

**What it does**:
- Checks Puppeteer executable path
- Verifies Chrome installation
- Lists common Chrome locations
- Useful for troubleshooting scraping issues on deployment platforms

---

### `debug_filter.mjs`
**Purpose**: Debug script to test and analyze forecast filtering logic.

**Usage**:
```bash
node scripts/debug_filter.mjs
```

**What it does**:
- Fetches all spots and their configs
- Analyzes forecast slots against filter criteria
- Reports how many slots pass/fail filters
- Useful for debugging why certain conditions aren't showing up

---

### `inspect_db.mjs`
**Purpose**: Utility to inspect database contents and verify data structure.

**Usage**:
```bash
node scripts/inspect_db.mjs
```

**What it does**:
- Lists all spots in database
- Shows forecast slot counts per spot
- Displays sample data to verify structure
- Useful for verifying data after scraping

---

## Notes

- All scripts require `NEXT_PUBLIC_CONVEX_URL` to be set in `.env.local`
- Scraping scripts require Puppeteer and Chrome to be installed
- Debug scripts are safe to run and don't modify data (except `remove-today-scrapes.mjs`)

