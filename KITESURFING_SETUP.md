# Kitesurfing Sport Setup

This document explains how to enable kitesurfing as a third sport in the Waterman app.

## Changes Made

1. **Frontend Updates**
   - Added "Kite" option to sport selector
   - Updated URL routing to support `/kite/` routes
   - Added kitesurfing validation across all pages
   - Updated calendar to include kitesurfing data

2. **Backend Updates**
   - Added kitesurfing system prompt for LLM scoring
   - Updated spot prompt generation to handle kitesurfing
   - Created migration script to add kitesurfing spots

3. **Spots for Kitesurfing**
   - Guincho
   - Lagoa da Albufeira (already exists, just adding kitesurfing)
   - Fonte da Telha

## Running the Migration

To add the kitesurfing spots and configs to your database:

```bash
npx convex run addKitesurfing:addKitesurfingToSpots
```

This will:
- Create Guincho and Fonte da Telha spots if they don't exist
- Add kitesurfing to Lagoa da Albufeira (which already exists)
- Create kitesurfing configs for all three spots
- Create wingfoil configs for any new spots

## After Migration

1. **Seed System Prompts**: Run the system prompts seeder to add the kitesurfing prompt:
   ```bash
   npx convex run seedScoringPrompts:seedSystemSportPrompts
   ```

2. **Seed Spot Prompts**: Update spot-specific prompts:
   ```bash
   npx convex run seedScoringPrompts:seedScoringPrompts
   ```

3. **Scrape Forecast Data**: The new spots will need forecast data scraped:
   ```bash
   node scripts/scrape.mjs
   ```

4. **Generate Scores**: Score the new forecast slots:
   ```bash
   # This will happen automatically on next scrape, or run manually via admin panel
   ```

## Wind Requirements

Kitesurfing has lower wind requirements than wingfoiling:
- **Kitesurfing**: 12-25 knots (min speed: 12kts, min gust: 15kts)
- **Wingfoiling**: 15-25 knots (min speed: 15kts, min gust: 18kts)

This reflects kitesurfing's ability to ride in lighter winds due to larger kite sizes.
