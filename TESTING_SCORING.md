# Testing LLM-Based Scoring System

This guide explains how to test the new LLM-based condition scoring system.

## Quick Test

### Step 1: Run a Scrape

This will:
1. Fetch forecast data for all spots
2. Save slots to database
3. **Automatically trigger scoring** (via scheduler, non-blocking)

```bash
node scripts/scrape.mjs
```

**Expected output:**
```
🌊 Waterman Scraper Starting...
Fetching spots from Convex...
Found 3 spots.

Surfing to Marina de Cascais...
   -> Found 45 slots.
   -> Saved 45 slots to DB (Granular).

...
✅ Done!
```

**Note**: Scoring happens asynchronously after the scrape completes. It may take a few minutes depending on:
- Number of slots
- Number of sports per spot
- Groq API response time

### Step 2: Check Scores

Wait a minute or two for scoring to complete, then check:

```bash
node scripts/check-scores.mjs
```

**Expected output:**
```
📊 Checking condition scores...

Found 3 spots

📍 Marina de Cascais
   Sport: wingfoil
      Found 45 scores

      2024-12-28 10:00:00:
         Score: 75/100
         Reasoning: Good wind conditions with steady 18kt winds from NW direction...
         Factors: { windQuality: 80, overallConditions: 75 }
         Scored at: 2024-12-28 09:15:23
         Model: openai/gpt-oss-120b
```

### Step 3: View in Convex Dashboard

1. Go to https://dashboard.convex.dev
2. Navigate to **Data** → **condition_scores** table
3. Browse scores with:
   - `score`: 0-100 rating
   - `reasoning`: LLM explanation
   - `factors`: Breakdown (windQuality, waveQuality, etc.)
   - `scoredAt`: When it was scored
   - `model`: LLM model used

## What to Look For

### ✅ Success Indicators

- Scores are in 0-100 range
- Reasoning is meaningful and relevant
- Factors breakdown is present (if LLM provided it)
- Scores vary based on conditions (not all the same)
- Higher scores for better conditions

### ⚠️ Things to Check

1. **Score Quality**: Do scores make sense for the conditions?
   - High wind + good direction = high score?
   - Low wind = low score?

2. **Reasoning Quality**: Is the reasoning accurate?
   - Does it mention relevant factors (wind speed, direction, etc.)?
   - Does it consider spot-specific characteristics?

3. **Time Series Context**: Does scoring consider trends?
   - Improving conditions score higher?
   - Deteriorating conditions score lower?

4. **Spot-Specific**: Does scoring consider spot characteristics?
   - Does it mention spot-specific wind directions?
   - Does it consider spot requirements (min speed, etc.)?

## Troubleshooting

### No Scores Appearing

**Possible causes:**
1. Scoring still in progress (wait 2-3 minutes)
2. Scoring failed (check Convex logs)
3. No forecast slots exist (run scrape first)

**Check:**
```bash
# Check if slots exist
node scripts/inspect_db.mjs

# Check Convex logs for scoring errors
# (in Convex Dashboard → Logs)
```

### Scores All the Same

**Possible causes:**
1. Prompt not specific enough
2. LLM not considering all factors
3. Conditions are actually similar

**Fix:**
- Review and improve prompts in Convex Dashboard
- Check if time series context is being included

### Scoring Errors

**Check Convex logs for:**
- Groq API errors (rate limits, authentication)
- Invalid response format
- Missing prompts

**Common issues:**
- `GROQ_API_KEY` not set in Convex environment
- Groq API rate limits (429 errors)
- Invalid JSON response from LLM

## Manual Testing

### Test a Single Slot

You can manually trigger scoring for a specific slot:

```javascript
// In Convex Dashboard → Functions → Run Action
api.spots.scoreSingleSlot
{
  "slotId": "YOUR_SLOT_ID",
  "sport": "wingfoil",
  "spotId": "YOUR_SPOT_ID"
}
```

### Test Scoring Flow

1. **Scrape one spot** (modify scrape script to only do one spot)
2. **Wait for scoring** (check logs)
3. **Verify scores** (check-scores script)
4. **Review reasoning** (does it make sense?)

## Performance Testing

### Expected Timing

- **Per slot-sport**: ~2-3 seconds (Groq API call)
- **100 slots × 2 sports**: ~4-6 minutes total
- **Scraping**: ~30 seconds (not blocked by scoring)

### Monitoring

Check Convex Dashboard → **Logs** for:
- Scoring start/completion times
- API call durations
- Error rates
- Retry attempts

## Next Steps After Testing

1. **Review Scores**: Do they make sense?
2. **Adjust Prompts**: If scores are off, edit prompts in Convex Dashboard
3. **Iterate**: Run scrape → check scores → adjust prompts → repeat

## Files

- **Scrape script**: `scripts/scrape.mjs`
- **Check scores**: `scripts/check-scores.mjs`
- **Scoring logic**: `convex/spots.ts` → `scoreForecastSlots`, `scoreSingleSlot`
- **Prompts**: `convex/prompts.ts` (system prompts), Database (spot prompts)


