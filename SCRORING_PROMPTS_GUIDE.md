# Scoring Prompts Management Guide

This guide explains how to seed, view, and edit scoring prompts for LLM-based condition scoring.

## Overview

Scoring prompts are stored in the `scoring_prompts` table in Convex. Each prompt consists of three parts:

1. **System Prompt**: General evaluation guidelines for the sport (e.g., "Evaluate wingfoiling conditions considering wind speed, gust consistency...")
2. **Spot Prompt**: Spot-specific characteristics (e.g., "This spot works best with NW winds (315-45°), requires minimum 12 knots...")
3. **Temporal Prompt**: Instructions for using time series data (e.g., "Consider trends in conditions 72 hours before and 12 hours after...")

Each spot-sport combination has its own prompt entry. For V1, all prompts are system prompts (`userId: null`).

---

## Step 1: Seed Initial Prompts

Run the seed script to create initial prompts for all spots and their supported sports:

```bash
node scripts/seed-prompts.mjs
```

This will:
- Create prompts for all spots in your database
- Use spotConfigs data to generate spot-specific prompts
- Use default system prompts from `convex/prompts.ts`
- Set `isActive: true` for all prompts

**Output example:**
```
🌊 Seeding scoring prompts...

✅ Success!
   Seeded scoring prompts: 3 created, 0 updated
   Created: 3
   Updated: 0
   Total: 3
```

---

## Step 2: View Existing Prompts

### Option A: Using Convex Dashboard

1. Go to your Convex dashboard: https://dashboard.convex.dev
2. Navigate to **Data** → **scoring_prompts** table
3. Browse all prompts with their fields:
   - `spotId`: Reference to the spot
   - `sport`: Sport name (e.g., "wingfoil", "surfing")
   - `userId`: `null` for system prompts
   - `systemPrompt`: Sport evaluation guidelines
   - `spotPrompt`: Spot-specific characteristics
   - `temporalPrompt`: Temporal context instructions
   - `isActive`: Whether the prompt is enabled

### Option B: Using a Query Script

Create a script to list prompts:

```javascript
// scripts/list-prompts.mjs
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api.js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);

const prompts = await client.query(api.spots.listScoringPrompts, {});
console.log(JSON.stringify(prompts, null, 2));
```

---

## Step 3: Edit Prompts

### Method 1: Direct Database Edit (Convex Dashboard)

**Best for**: Quick edits, testing changes

1. Go to Convex Dashboard → **Data** → **scoring_prompts**
2. Find the prompt you want to edit (filter by spot or sport)
3. Click on the prompt row to edit
4. Modify the fields:
   - `systemPrompt`: Edit sport evaluation guidelines
   - `spotPrompt`: Edit spot-specific characteristics
   - `temporalPrompt`: Edit temporal context instructions
5. Click **Save**

**Note**: Changes take effect immediately for new scoring operations.

### Method 2: Create a Mutation Script

**Best for**: Bulk updates, version control, programmatic changes

Create a mutation in `convex/spots.ts`:

```typescript
export const updateScoringPrompt = mutation({
    args: {
        promptId: v.id("scoring_prompts"),
        systemPrompt: v.optional(v.string()),
        spotPrompt: v.optional(v.string()),
        temporalPrompt: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const updates: any = {
            updatedAt: Date.now(),
        };
        
        if (args.systemPrompt !== undefined) {
            updates.systemPrompt = args.systemPrompt;
        }
        if (args.spotPrompt !== undefined) {
            updates.spotPrompt = args.spotPrompt;
        }
        if (args.temporalPrompt !== undefined) {
            updates.temporalPrompt = args.temporalPrompt;
        }
        
        await ctx.db.patch(args.promptId, updates);
        return { success: true };
    },
});
```

Then call it from a script:

```javascript
// scripts/update-prompt.mjs
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api.js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);

// Get prompt ID from dashboard or list query
const promptId = "YOUR_PROMPT_ID_HERE";

await client.mutation(api.spots.updateScoringPrompt, {
    promptId,
    spotPrompt: "Your updated spot prompt here...",
});
```

### Method 3: Edit Source Code (For System Prompts)

**Best for**: Updating default system prompts that apply to all spots

Edit `convex/prompts.ts`:

```typescript
export const SYSTEM_SPORT_PROMPTS = {
    wingfoil: `Your updated wingfoiling prompt here...`,
    surfing: `Your updated surfing prompt here...`,
};
```

Then re-run the seed script to update all prompts:

```bash
node scripts/seed-prompts.mjs
```

This will update existing prompts with the new system prompts.

---

## Prompt Structure Guidelines

### System Prompt (Sport Evaluation Guidelines)

Should include:
- What factors to consider for the sport
- How to interpret different condition values
- Score interpretation (what 0-100 means)
- General best practices

**Example:**
```
You are an expert wingfoiling condition evaluator. Evaluate conditions considering:
- Wind speed: Higher speeds (15-25 knots) are ideal, but consistency matters more than peak speed
- Wind gusts: Steady wind (small difference between speed and gust) is preferred over gusty conditions
- Wind direction: Consistency and onshore/cross-onshore directions are best
- Overall conditions: Consider safety, ride quality, and session enjoyment

Provide a score from 0-100 where:
- 90-100: Exceptional conditions (epic day)
- 75-89: Excellent conditions (ideal)
- 60-74: Good conditions (meets criteria)
- 40-59: Marginal conditions (usable but not ideal)
- 0-39: Poor conditions (doesn't meet criteria)
```

### Spot Prompt (Spot-Specific Characteristics)

Should include:
- Spot name and location context
- Optimal wind/wave directions for this spot
- Minimum requirements (from spotConfigs)
- Spot-specific quirks or considerations

**Example:**
```
This is Marina de Cascais. For wingfoiling at this spot: 
Minimum wind speed required is 15 knots. 
Minimum gust speed required is 18 knots. 
Optimal wind directions are from 315° to 135° (wrapping through 0° if needed). 
Consider wind consistency - steady wind is preferred over gusty conditions. 
Higher wind speeds (15-25 knots) are ideal, but consistency and direction matter more than peak speed.
```

### Temporal Prompt (Time Series Context)

Should include:
- How to use historical data (72h before)
- How to use future data (12h after)
- What trends to look for
- How trends affect scoring

**Example:**
```
Consider trends in conditions 72 hours before and 12 hours after the current time slot. 
- Improving conditions (getting better) should score higher
- Deteriorating conditions (getting worse) should score lower
- Consistent conditions indicate stability and reliability
- Rapid changes may indicate unstable weather patterns
```

---

## Testing Prompts

After editing a prompt:

1. **Trigger a new scrape** to generate new forecast slots
2. **Scoring will run automatically** after the scrape completes
3. **Check scores** in the `condition_scores` table
4. **Review reasoning** to see if the prompt is working as expected

To manually trigger scoring for existing slots:

```typescript
// Create a mutation or action to re-score specific slots
// This is useful for testing prompt changes
```

---

## Common Edits

### Update Minimum Wind Speed for a Spot

1. Find the prompt in Convex Dashboard
2. Edit `spotPrompt`:
   ```
   This is Marina de Cascais. For wingfoiling at this spot: 
   Minimum wind speed required is 18 knots. [Changed from 15]
   ...
   ```

### Add Spot-Specific Notes

1. Edit `spotPrompt` to add context:
   ```
   This is Marina de Cascais. For wingfoiling at this spot: 
   ...
   Note: This spot is protected from S winds, so S winds score lower even if speed is good.
   ```

### Adjust Score Interpretation

1. Edit `systemPrompt` for the sport
2. Re-run seed script to update all spots for that sport

### Customize Temporal Analysis

1. Edit `temporalPrompt` for a specific spot:
   ```
   Consider trends in conditions 72 hours before and 12 hours after. 
   For this spot, rapid improvements in the last 6 hours are particularly favorable.
   ```

---

## Best Practices

1. **Keep prompts concise**: LLM tokens cost money, shorter prompts are cheaper
2. **Be specific**: Include actual numbers and ranges (e.g., "15-25 knots" not "good wind")
3. **Test changes**: After editing, trigger a scrape and review the scores/reasoning
4. **Version control**: Consider documenting prompt changes in git commits
5. **One prompt per spot-sport**: Don't create duplicates, update existing ones

---

## Troubleshooting

### Prompt not being used

- Check `isActive: true` in the prompt record
- Verify `spotId` and `sport` match exactly
- Check that `userId` is `null` for system prompts

### Scores seem wrong

- Review the `reasoning` field in `condition_scores` to see what the LLM considered
- Check if prompt is too vague or missing key information
- Verify time series context is being included (check `getTimeSeriesContext` query)

### Prompt not found

- Run seed script again: `node scripts/seed-prompts.mjs`
- Check that spot has `sports` array set correctly
- Verify spot exists in database

---

## File Locations

- **Prompt building logic**: `convex/prompts.ts`
- **Seed script**: `convex/seedScoringPrompts.ts`
- **Run seed**: `scripts/seed-prompts.mjs`
- **Query prompts**: `convex/spots.ts` → `listScoringPrompts` query
- **Database table**: `scoring_prompts` in Convex

---

## Next Steps

1. ✅ Run seed script: `node scripts/seed-prompts.mjs`
2. ✅ View prompts in Convex Dashboard
3. ✅ Edit prompts as needed for your spots
4. ✅ Test by running a scrape and checking scores
5. ✅ Iterate on prompts based on score quality

For questions or issues, check the PRD: `/planning/prds/02.md`

