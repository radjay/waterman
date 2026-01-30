# Product Requirements Document (PRD)

## Personalized Scoring & User Context

**Version:** 1.0  
**Date:** 2026-01-29  
**Status:** Draft

---

## Overview

Enable users to provide personal context about their skill level, physical characteristics, and spot-specific preferences to generate personalized condition scores. This creates a tailored experience where scores reflect what conditions actually work for each individual user, not just objectively "good" conditions.

Additionally, capture expert watermen input to improve our default scoring prompts and build better spot-specific knowledge.

---

## Goals

1. **Personalized Scoring**: Generate scores tailored to each user's skill level, equipment, and preferences
2. **Sport Context**: Capture user skill levels and physical factors that affect what conditions work for them
3. **Spot Context**: Allow users to document what makes specific spots work (or not work) for them personally
4. **Improve Default Prompts**: Leverage expert input to build better spot-scoring prompts for all users
5. **Progressive Disclosure**: Start simple (skill level), allow advanced users to add detailed context
6. **Non-Destructive**: Keep system/default scores available; personalized scores are additive

---

## Non-Goals (V1)

- Real-time condition alerts based on personalized scores
- Social features (sharing context with other users)
- AI-generated recommendations for new spots to try
- Equipment tracking or recommendations
- Session logging or history tracking
- Comparison between user scores and system scores in UI

---

## Key Concepts

### User Sport Context

Per-sport profile with:
- **Skill Level** (structured): Beginner, Intermediate, Advanced, Expert
- **Context** (free-form text): Everything else - physical factors, preferences, equipment, constraints

**Example context**: "I'm a beginner surfer (learning for 6 months). I weigh 85kg. I'm not comfortable in waves over 1.5m and prefer gentle, peeling waves. I ride a 7'6" foamie."

### User Spot Context

Per-spot notes (free-form text) describing what works and doesn't work for the user at that specific location.

**Example context**: "Marina de Cascais is my go-to spot for learning wingfoiling. It's sheltered from most swells which I like as a beginner. Wind needs to be at least 15 knots for me (I'm heavy). If the swell is over 3m even with good wind, I'd rather go to Guincho because the chop here becomes too messy."

### Personalized Scores

Scores generated using:
1. Default system sport prompt
2. Default spot-specific prompt  
3. **User's skill level + context** (appended)
4. **User's spot context** (appended, if exists)

These are stored separately from system scores (`userId` field on `condition_scores`).

---

## Requirements

### 1. User Sport Context

#### 1.1 Data Model

**Update to `users` table** - Add setting:

```typescript
// Add to existing users table
showPersonalizedScores: v.optional(v.boolean()), // Default: true. When false, show system scores.
```

**New Table: `user_sport_profiles`**

```typescript
user_sport_profiles: defineTable({
  userId: v.id("users"),
  sport: v.string(), // "wingfoil" or "surfing"
  
  // Skill level (structured - only structured field)
  skillLevel: v.string(), // "beginner" | "intermediate" | "advanced" | "expert"
  
  // Free-form context (user describes everything else in natural language)
  context: v.optional(v.string()), // Free-form text about their level, preferences, equipment, etc.
  
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_user", ["userId"])
  .index("by_user_sport", ["userId", "sport"]);
```

**Design Philosophy**: Keep it simple. The LLM can interpret free-form text naturally. Users can express nuance that structured fields would miss.

**Example context values**:
- "I'm a beginner surfer (learning for 6 months). I weigh 85kg. I'm not comfortable in waves over 1.5m and prefer gentle, peeling waves. I ride a 7'6" foamie."
- "Heavy guy (95kg), need at least 15 knots to get on foil. Intermediate level, can jibe in flat water but not in chop yet."
- "Advanced surfer, comfortable in most conditions but avoid heavy shore break. Prefer point breaks."

#### 1.2 Skill Levels

The only structured field. Helps set baseline expectations before the LLM reads the free-form context.

| Level | Description |
|-------|-------------|
| Beginner | Learning fundamentals, needs forgiving conditions |
| Intermediate | Consistent in moderate conditions, building skills |
| Advanced | Comfortable in challenging conditions, refining technique |
| Expert | Handles any conditions, seeks challenge |

### 2. User Spot Context

#### 2.1 Data Model

**New Table: `user_spot_context`**

```typescript
user_spot_context: defineTable({
  userId: v.id("users"),
  spotId: v.id("spots"),
  sport: v.string(), // "wingfoil" or "surfing"
  
  // Free-form context (user describes what works/doesn't work for them at this spot)
  context: v.string(), // Free-form text about their experience with this spot
  
  // Is this user an "expert" for this spot (for prompt improvement)
  isExpertInput: v.optional(v.boolean()), // If true, this can be used to improve default prompts
  
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_user", ["userId"])
  .index("by_user_spot", ["userId", "spotId"])
  .index("by_user_spot_sport", ["userId", "spotId", "sport"])
  .index("by_spot_sport_expert", ["spotId", "sport", "isExpertInput"]);
```

**Design Philosophy**: One free-form text field. The user describes what works and doesn't work for them at this specific spot. The LLM interprets it naturally.

**Example context values**:
- "Marina de Cascais is my go-to spot for learning wingfoiling. It's sheltered from most swells which I like as a beginner. Wind needs to be at least 15 knots for me (I'm heavy). If the swell is over 3m even with good wind, I'd rather go elsewhere because the chop here becomes too messy."
- "I know this spot well. Works great with NW wind, but anything with south in it creates a weird side-shore chop that makes it hard to get out. Low tide exposes rocks near the launch."
- "Perfect beginner spot for me. The waves are gentle and the sand bottom is forgiving. Avoid at high tide though - the shore break gets dumpy."

### 3. Personalized Scoring

#### 3.1 Score Generation Flow

**On Context Change (sport profile or spot context):**
```
User saves context
    ↓
Show "Generating your personalized scores..." indicator
    ↓
Trigger scoring for all affected spots (favorite spots for this sport)
    ↓
Log: { userId, contextType, timestamp } for abuse monitoring
    ↓
When complete: Show notification "Your personalized scores are ready!"
    ↓
User can refresh/view updated scores
```

**On Viewing Forecast:**
```
User views forecast
    ↓
Check user's "show personalized scores" setting
    ↓
If disabled: Show system scores
    ↓
If enabled: Check if user has sport profile for selected sport
    ↓
If yes: Load personalized scores for user's favorite spots
    ↓
If personalized scores don't exist yet:
    - Show system scores with "Personalizing..." indicator
    - Trigger background scoring
    - Update UI when ready
    ↓
Display personalized scores to user
```

#### 3.2 Prompt Assembly for Personalized Scoring

The personalized prompt combines:

1. **System Sport Prompt** (from `system_sport_prompts`)
2. **Spot Prompt** (from `scoring_prompts`)
3. **User Sport Context** (from `user_sport_profiles`)
4. **User Spot Context** (from `user_spot_context`)
5. **Temporal Prompt** (from `scoring_prompts`)

**Example Combined Prompt for Personalized Scoring:**

```
[System Sport Prompt for Wingfoiling]
You are an expert wingfoiling condition evaluator...

[Spot Prompt]
This is Marina de Cascais. For wingfoiling at this spot...
Optimal wind directions are 315-45°...

[User Sport Context]
IMPORTANT USER CONTEXT - Score for this specific user:
- Skill level: Beginner (learning for 4 months)
- Body weight: 90kg (requires higher minimum wind, around 15-16 knots minimum)
- General preferences: "Not comfortable in choppy conditions. Prefer flat water or small swell. Still learning to waterstart consistently."
- Equipment: "90L board, 5.5m wing"

[User Spot Context]
USER'S EXPERIENCE WITH THIS SPOT:
- Familiarity: Regular (goes 2-3 times per week)
- What works for them: "Wind from NW is perfect, the water stays flat. Anything over 18 knots and I can get up easily."
- What doesn't work: "When swell is over 2m, the harbor gets messy chop and I struggle. Offshore wind (E/SE) makes it hard for me because the launch area gets gusty."
- Their thresholds: Min wind 15 knots, max comfortable swell 2m

[Temporal Prompt]
Consider trends in conditions 72 hours before...

Score these conditions FOR THIS SPECIFIC USER, considering their skill level, weight, and preferences.
```

#### 3.3 Scoring Priority

When displaying scores to a user:

1. **If user has personalized scores**: Show personalized scores
2. **If user is authenticated but no personalized scores yet**: Trigger scoring, show system scores with "Personalizing..." indicator
3. **If user is anonymous**: Show system scores

#### 3.4 When to Re-Score

Personalized scores should be regenerated when:

1. User updates their sport profile → Re-score all favorite spots for that sport
2. User updates their spot context → Re-score that specific spot
3. New forecast data is scraped → Re-score user's favorite spots (background, scheduled)
4. User marks a new spot as favorite → Re-score that spot

#### 3.5 User Settings

Add to user profile/settings:

- **Show personalized scores**: Toggle (default: ON)
  - When ON: Show personalized scores for favorite spots
  - When OFF: Show system scores (even if user has a profile)
  - Useful for seeing "objective" conditions or comparing

#### 3.6 Abuse Monitoring

Log all personalized scoring events to detect abuse:

**New Table: `personalization_logs`**

```typescript
personalization_logs: defineTable({
  userId: v.id("users"),
  eventType: v.string(), // "sport_profile_update" | "spot_context_update" | "manual_rescore"
  sport: v.optional(v.string()),
  spotId: v.optional(v.id("spots")),
  slotsScored: v.number(), // How many slots were scored
  timestamp: v.number(),
})
  .index("by_user", ["userId"])
  .index("by_user_date", ["userId", "timestamp"]);
```

**Monitoring queries:**
- Context updates per user per day
- Total scoring runs per user per week
- Alert if user exceeds threshold (e.g., >20 context updates/day)

### 4. Backend Implementation

#### 4.1 New Convex Functions

**File: `convex/personalization.ts`**

**Mutations:**

```typescript
// Create or update user's sport profile
export const upsertSportProfile = mutation({
  args: {
    sessionToken: v.string(),
    sport: v.string(),
    skillLevel: v.string(), // "beginner" | "intermediate" | "advanced" | "expert"
    context: v.optional(v.string()), // Free-form text
  },
  returns: v.object({
    profileId: v.id("user_sport_profiles"),
    isNew: v.boolean(),
  }),
  handler: async (ctx, args) => {
    // 1. Verify session
    // 2. Check if profile exists for user+sport
    // 3. Create or update profile
    // 4. Invalidate existing personalized scores for this sport
    // 5. Return profile ID
  },
});

// Create or update user's spot context
export const upsertSpotContext = mutation({
  args: {
    sessionToken: v.string(),
    spotId: v.id("spots"),
    sport: v.string(),
    context: v.string(), // Free-form text
    isExpertInput: v.optional(v.boolean()),
  },
  returns: v.object({
    contextId: v.id("user_spot_context"),
    isNew: v.boolean(),
  }),
  handler: async (ctx, args) => {
    // 1. Verify session
    // 2. Check if context exists for user+spot+sport
    // 3. Create or update context
    // 4. Invalidate existing personalized scores for this spot+sport
    // 5. Return context ID
  },
});

// Delete user's spot context
export const deleteSpotContext = mutation({
  args: {
    sessionToken: v.string(),
    contextId: v.id("user_spot_context"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // 1. Verify session
    // 2. Verify user owns this context
    // 3. Delete context
    // 4. Optionally delete personalized scores for this spot
  },
});
```

**Queries:**

```typescript
// Get user's sport profile
export const getSportProfile = query({
  args: {
    sessionToken: v.string(),
    sport: v.string(),
  },
  returns: v.union(v.object({
    _id: v.id("user_sport_profiles"),
    skillLevel: v.string(),
    context: v.optional(v.string()),
  }), v.null()),
  handler: async (ctx, args) => {
    // 1. Verify session
    // 2. Query user_sport_profiles by user+sport
    // 3. Return profile or null
  },
});

// Get all user's sport profiles
export const getAllSportProfiles = query({
  args: {
    sessionToken: v.string(),
  },
  returns: v.array(v.object({
    _id: v.id("user_sport_profiles"),
    sport: v.string(),
    skillLevel: v.string(),
    context: v.optional(v.string()),
  })),
  handler: async (ctx, args) => {
    // 1. Verify session
    // 2. Query all profiles for user
    // 3. Return profiles
  },
});

// Get user's spot context for a spot+sport
export const getSpotContext = query({
  args: {
    sessionToken: v.string(),
    spotId: v.id("spots"),
    sport: v.string(),
  },
  returns: v.union(v.object({
    _id: v.id("user_spot_context"),
    context: v.string(),
    isExpertInput: v.optional(v.boolean()),
  }), v.null()),
  handler: async (ctx, args) => {
    // 1. Verify session
    // 2. Query user_spot_context by user+spot+sport
    // 3. Return context or null
  },
});

// Get all user's spot contexts
export const getAllSpotContexts = query({
  args: {
    sessionToken: v.string(),
  },
  returns: v.array(v.object({
    _id: v.id("user_spot_context"),
    spotId: v.id("spots"),
    spotName: v.string(),
    sport: v.string(),
    context: v.string(),
    isExpertInput: v.optional(v.boolean()),
  })),
  handler: async (ctx, args) => {
    // 1. Verify session
    // 2. Query all contexts for user
    // 3. Join with spots table for spot names
    // 4. Return contexts
  },
});

// Get personalized scores for user
export const getPersonalizedScores = query({
  args: {
    sessionToken: v.string(),
    spotId: v.id("spots"),
    sport: v.string(),
  },
  returns: v.array(v.object({
    // ... score fields
  })),
  handler: async (ctx, args) => {
    // 1. Verify session
    // 2. Query condition_scores with userId set to user's ID
    // 3. Filter by spot+sport
    // 4. Return scores
  },
});
```

**Actions:**

```typescript
// Generate personalized scores for a user's favorite spots
export const generatePersonalizedScores = internalAction({
  args: {
    userId: v.id("users"),
    spotId: v.id("spots"),
    sport: v.string(),
  },
  returns: v.object({
    scoresGenerated: v.number(),
    success: v.boolean(),
  }),
  handler: async (ctx, args) => {
    // 1. Load user's sport profile (skill level + context)
    // 2. Load user's spot context
    // 3. Load system prompts and spot prompts
    // 4. Build personalized prompt (append user context)
    // 5. Score all slots for this spot
    // 6. Save scores with userId
    // 7. Return count
  },
});
```

#### 4.2 Updates to Existing Functions

**`prompts.ts`** - Add function to build personalized prompt:

```typescript
export function buildPersonalizedPrompt(
  systemPrompt: string,
  spotPrompt: string,
  temporalPrompt: string,
  userSportProfile: { skillLevel: string; context?: string } | null,
  userSpotContext: { context: string } | null,
): string {
  let prompt = systemPrompt + "\n\n" + spotPrompt;
  
  if (userSportProfile) {
    prompt += `\n\nIMPORTANT USER CONTEXT - Score for this specific user:
- Skill level: ${userSportProfile.skillLevel}`;
    
    if (userSportProfile.context) {
      prompt += `\n- About this user: "${userSportProfile.context}"`;
    }
  }
  
  if (userSpotContext) {
    prompt += `\n\nUSER'S NOTES ABOUT THIS SPOT:
"${userSpotContext.context}"`;
  }
  
  prompt += `\n\n${temporalPrompt}`;
  prompt += `\n\nScore these conditions FOR THIS SPECIFIC USER, considering their skill level and personal preferences/constraints described above.`;
  
  return prompt;
}
```

**Example assembled prompt:**

```
[System Sport Prompt for Wingfoiling]
You are an expert wingfoiling condition evaluator...

[Spot Prompt]
This is Marina de Cascais. For wingfoiling at this spot...

IMPORTANT USER CONTEXT - Score for this specific user:
- Skill level: beginner
- About this user: "I'm a beginner wingfoiler (4 months). I weigh 90kg so need at least 15 knots. Not comfortable in choppy conditions yet. Still learning to waterstart consistently. Using a 90L board and 5.5m wing."

USER'S NOTES ABOUT THIS SPOT:
"Marina de Cascais is my go-to spot for learning. It's sheltered from most swells which I like. If swell is over 2m even with good wind, I struggle because the harbor gets messy chop. Offshore wind (E/SE) makes it hard for me because the launch area gets gusty."

[Temporal Prompt]
Consider trends in conditions...

Score these conditions FOR THIS SPECIFIC USER, considering their skill level and personal preferences/constraints described above.
```

### 5. Frontend Implementation

#### 5.1 New Pages

**`app/profile/sport/[sport]/page.js`** - Sport Profile Editor

Simple form with two inputs:
- Skill level selector (dropdown or radio buttons)
- Free-form textarea for context (with placeholder examples)
- Save button

**`app/profile/spots/page.js`** - Spot Context List

- List all spots user has added context for
- Shows spot name and preview of context
- Link to edit each spot's context
- Button to add context for a new spot

**`app/profile/spots/[spotId]/page.js`** - Spot Context Editor

Simple form:
- Spot info header (name, location)
- Sport selector (if spot supports multiple sports)
- Free-form textarea for context (with placeholder examples showing what to include)
- "I'm a local expert at this spot" checkbox (optional, for contributing to default prompts)
- Save button

#### 5.2 Updates to Existing Pages

**`app/profile/page.js`**

Add new section: "Personalization"

- Cards for each sport with profile status
  - "Set up your Wingfoiling profile" or "Edit Wingfoiling profile"
  - Shows skill level badge if set
- Link to "Add spot notes" page
- Summary of spots with context added
- **Settings toggle**: "Show personalized scores" (on/off)
  - When on: Forecast shows personalized scores
  - When off: Forecast shows system scores

**Forecast Display (DaySection/ForecastSlot)**

- If user has personalized scores enabled, display those
- Visual indicator that scores are personalized (small icon or badge)
- Tooltip: "Score personalized for your skill level and preferences"
- Loading state: "Personalizing..." while scores generate

#### 5.3 New Components

**`components/profile/SportProfileCard.js`**

- Displays sport profile summary
- Skill level badge
- Context preview (truncated)
- Edit button

**`components/profile/SpotContextCard.js`**

- Displays spot context summary
- Spot name
- Context preview (truncated)
- Edit/delete buttons

**`components/profile/SkillLevelSelector.js`**

- Simple dropdown or radio buttons
- Four options: Beginner, Intermediate, Advanced, Expert
- Brief description for each

**`components/common/PersonalizedBadge.js`**

- Small badge/icon indicating personalized score
- Tooltip explaining what it means

#### 5.4 Placeholder Text for Context Fields

Use helpful placeholder text to guide users on what to write. These appear in the textarea when empty.

**Sport Profile Context - Wingfoiling:**
```
e.g., I weigh 85kg so I need at least 14-15 knots to get on foil consistently. I'm still learning to jibe, so I prefer flat water or small chop. I ride a 95L board with a 5m wing. Strong gusts make me nervous - I prefer steady wind even if it's a bit lighter.
```

**Sport Profile Context - Surfing:**
```
e.g., I've been surfing for about a year. I'm comfortable on a 7'6" funboard but still learning on a shortboard. Waves over 1.5m intimidate me. I prefer mellow, peeling waves where I have time to pop up. Crowded lineups stress me out.
```

**Spot Context - Wingfoiling:**
```
e.g., This is my go-to spot. The bay is sheltered so it stays flat even when there's swell elsewhere. NW wind is perfect here - cross-shore and consistent. When wind is from the south it gets gusty near the launch. If swell is over 2m the chop becomes uncomfortable for me. Low tide exposes some rocks on the north side.
```

**Spot Context - Surfing:**
```
e.g., Great beginner spot for me. The inside section has gentle whitewash perfect for practicing. Mid-tide works best - low tide is too shallow and high tide has a dumpy shore break. When swell is overhead it closes out and I go elsewhere. Works well on most wind directions since it's sheltered.
```

**Design Notes:**
- Placeholder text should be realistic examples, not instructions
- Start with "e.g.," to make it clear these are examples
- Cover the most useful things to mention (physical factors, preferences, constraints, local knowledge)
- Keep under 500 characters so it's scannable
- Use casual, conversational tone

### 6. User Experience Flows

#### 6.1 First-Time Sport Profile Setup

1. User goes to Profile page
2. Sees "Set up your Wingfoiling profile" card
3. Clicks to start setup
4. Selects skill level from dropdown
5. Writes context in textarea (with placeholder showing examples)
6. Saves profile
7. Shows "Generating your personalized scores..." loading state
8. When complete: "Your personalized scores are ready!" notification
9. Returns to Profile with confirmation
10. Forecast now shows personalized scores for favorite spots

**Time to complete: ~1 minute**

#### 6.2 Adding Spot Context

1. User is on forecast page, sees spot they know well
2. Clicks spot menu → "Add my notes for this spot"
3. OR goes to Profile → Spots → "Add spot notes"
4. Selects spot (if not pre-selected)
5. Selects sport (if spot supports multiple)
6. Writes context in textarea explaining what works/doesn't work for them
7. Optionally checks "I'm a local expert" if they want to contribute
8. Saves context
9. Shows "Updating scores for [Spot Name]..." loading state
10. When complete: "Scores updated!" notification
11. Forecast now shows refined personalized scores for that spot

**Time to complete: ~2 minutes**

#### 6.3 Expert Input Flow

For users who want to help improve default prompts:

1. User is adding spot context for a spot they know very well
2. Checks "I'm a local expert at this spot"
3. System flags this input for admin review
4. Admin can review expert inputs in admin panel
5. Admin can incorporate insights into default spot prompts
6. Benefits all users of that spot

### 7. Admin Features

#### 7.1 Expert Input Review (V2)

**`app/admin/expert-inputs/page.js`**

- List all user spot contexts marked as expert input
- Filter by spot, sport, or user
- View full context details
- Actions:
  - Approve (mark as reviewed)
  - Incorporate into default prompt
  - Dismiss (not useful)
  - Contact user for more details

#### 7.2 Prompt Improvement Workflow

1. Admin reviews expert inputs
2. Identifies common themes or insights
3. Updates default spot prompt to incorporate learnings
4. Example: If multiple experts say "this spot doesn't work with SE wind despite good speed", add that to the spot prompt

### 8. Data Privacy & Permissions

#### 8.1 User Data Ownership

- Users own their sport profiles and spot contexts
- Can delete at any time
- Data is not shared with other users (except expert input for prompts)

#### 8.2 Expert Input Consent

- "Expert input" checkbox is opt-in
- Clear explanation: "Help improve scores for everyone by sharing your local knowledge"
- Admin review before use
- User can revoke at any time

#### 8.3 Data Retention

- Sport profiles: Retained until user deletes or account deletion
- Spot contexts: Retained until user deletes or account deletion
- Personalized scores: Can be regenerated, kept for performance (30 days)

### 9. Technical Considerations

#### 9.1 Scoring Performance

**Challenge**: Personalized scoring for each user multiplies LLM calls.

**Mitigations**:
1. **Score on demand**: Only score when user views forecast, not proactively
2. **Cache scores**: Keep personalized scores for 24 hours (until next scrape)
3. **Limit scope**: Only score user's favorite spots (not all spots)
4. **Background processing**: Queue scoring jobs, show system scores while waiting
5. **Batch optimization**: Score multiple slots in single LLM call when possible

**Estimated additional cost**:
- Average user: 3 favorite spots × 2 sports × 50 slots/week = 300 LLM calls/week
- At $0.001/call = $0.30/user/week = $1.20/user/month
- Acceptable for value provided; can optimize later

#### 9.2 Prompt Length Management

**Challenge**: Personalized prompts are longer than system prompts due to free-form text.

**Mitigations**:
1. Character limit on text fields (e.g., 1000 chars for sport context, 1500 chars for spot context)
2. Truncate if necessary with "[truncated]" marker
3. Monitor token usage and adjust limits if needed
4. Free-form text is typically more concise than we'd expect - users write naturally

#### 9.3 Score Consistency

**Challenge**: Ensuring personalized scores are consistent with user expectations.

**Mitigations**:
1. Clear guidelines for each skill level
2. Test prompts with sample users
3. Show reasoning in tooltip
4. Allow user feedback (thumbs up/down) for future improvement

### 10. Success Criteria

#### V1 Success Metrics

- ✅ Users can create sport profiles (skill level + free-form context)
- ✅ Users can add spot context for their favorite spots
- ✅ Personalized scores generated for users with profiles
- ✅ Scores reflect user's skill level and context appropriately
- ✅ UI clearly indicates when scores are personalized
- ✅ Average time to set up sport profile < 1 minute
- ✅ Average time to add spot context < 2 minutes

#### V2 Success Metrics

- 50%+ of authenticated users create at least one sport profile
- 30%+ of users with profiles add spot context for at least one spot
- Expert input collected for 50%+ of spots
- Admin workflow for reviewing and incorporating expert input

---

## Implementation Plan

### Phase 1: Sport Profiles (Week 1)

1. **Database changes**:
   - Add `user_sport_profiles` table (skillLevel + context fields)
   - Add `personalization_logs` table (abuse monitoring)
   - Add `showPersonalizedScores` field to users table
   - Update schema

2. **Backend**:
   - Create `personalization.ts` with sport profile CRUD
   - Add `buildPersonalizedPrompt` function
   - Add logging for context changes

3. **Frontend**:
   - Create sport profile setup page (skill dropdown + textarea)
   - Add profile cards to Profile page
   - Add "Show personalized scores" toggle to settings

4. **Testing**:
   - Profile creation and editing
   - Prompt generation with user context
   - Logging verification

### Phase 2: Personalized Scoring (Week 2)

1. **Backend**:
   - Implement personalized score generation action
   - Trigger scoring on context save (not just on view)
   - Update scoring flow to check for user profiles + setting
   - Store personalized scores with userId

2. **Frontend**:
   - Show personalized scores when setting is enabled
   - Loading state: "Generating your personalized scores..."
   - Notification: "Your personalized scores are ready!"
   - Personalized badge/indicator on scores

3. **Testing**:
   - End-to-end personalized scoring
   - Loading states and notifications
   - Toggle between personalized and system scores
   - Performance testing

### Phase 3: Spot Context (Week 3)

1. **Database changes**:
   - Add `user_spot_context` table (context + isExpertInput fields)
   - Update schema

2. **Backend**:
   - Add spot context CRUD functions
   - Update prompt building to include spot context
   - Regenerate scores when context changes

3. **Frontend**:
   - Create spot context editor page (textarea + expert checkbox)
   - Create spot context list page
   - Add "Add my notes" option to spot menus

4. **Testing**:
   - Context creation and editing
   - Score updates when context changes
   - Integration with forecast display

### Phase 4: Expert Input & Polish (Week 4)

1. **Expert input**:
   - Add admin page to view expert inputs
   - Document workflow for incorporating feedback into default prompts

2. **Polish**:
   - Placeholder text with examples in textareas
   - Empty states
   - Error handling

3. **Documentation**:
   - Brief user guide for personalization features

---

## Open Questions & Decisions

### 1. When should personalized scoring happen?

**Decision**: Score immediately when user changes their context. Don't limit scoring frequency - the magic is in seeing personalized scores quickly.

**Implementation**:
- Show loading indicator while scores are generating
- Notify user when personalized scores are ready to view
- Log context changes and manual score runs per user for abuse monitoring
- Scoring is cheap; prioritize user experience

**Rationale**: Fast feedback loop encourages users to refine their context until scores feel right.

### 2. Should we show both system and personalized scores?

**Decision**: Show personalized by default, but add a setting to toggle back to system scores.

**Implementation**:
- Add toggle in user settings: "Show personalized scores" (default: on)
- When off, show system scores even if user has a profile
- Useful for users who want to see "objective" conditions or compare

**Rationale**: Personalized is the default experience, but some users may want to see what everyone else sees.

### 3. How to handle spots the user hasn't added context for?

**Decision**: Use sport profile only (no spot-specific context). Still better than system default.

**Rationale**: Progressive enhancement. Users can add context later for better results.

### 4. Should beginners see "epic" conditions they can't handle?

**Decision**: Yes! "Epic" means something different for each user. A beginner can have an epic day in small, long-period waves.

**Implementation**:
- Personalized scoring adjusts what conditions score highly
- A 90+ score for a beginner = conditions perfect for THEIR level
- A 20-knot gusty day might score 40 for a beginner (challenging) but 95 for an expert (epic)
- The word "epic" on a personalized score means "epic FOR YOU"

**Rationale**: Everyone deserves to see when conditions are perfect for them, regardless of skill level.

### 5. How much structure vs free-form text?

**Decision**: Minimal structure. Only skill level is a structured field. Everything else is free-form text.

**Rationale**: LLMs excel at interpreting natural language. Users can express nuance that structured fields would miss. Simpler UI, faster to fill out.

---

## Risks & Mitigations

### Risk 1: Increased LLM Costs

**Impact**: High - Personalized scoring multiplies API calls

**Mitigation**:
- Score only favorite spots
- Cache scores for 24 hours
- Batch scoring where possible
- Monitor costs and adjust if needed

### Risk 2: User Frustration with "Wrong" Scores

**Impact**: Medium - Personalized scores might not match expectations

**Mitigation**:
- Clear explanation of how scores work
- Show reasoning for each score
- Allow users to update their context
- Add feedback mechanism (thumbs up/down)

### Risk 3: Low Adoption of Personalization

**Impact**: Medium - Feature unused if too complex

**Mitigation**:
- Progressive disclosure (start simple)
- Prominent prompts after onboarding
- Clear value proposition ("see conditions that work for YOU")
- Quick setup (< 2 minutes)

### Risk 4: Poor Quality Expert Input

**Impact**: Low - Bad expert input could hurt default prompts

**Mitigation**:
- Admin review before incorporating
- Require "local" familiarity level for expert flag
- Cross-reference with other experts
- Can revert prompt changes

---

## Dependencies

### External Dependencies
- OpenRouter API for LLM scoring (existing)
- No new external services

### Internal Dependencies
- User authentication system (existing)
- Scoring prompts system (existing)
- Favorite spots feature (existing)

### Technical Dependencies
- Convex database
- React/Next.js frontend
- Existing component library

---

## Cost Estimates

### Additional Infrastructure Costs

**LLM API (OpenRouter)**:
- Per personalized scoring batch: ~$0.01
- Per active user/month: ~$1-2 (assuming 3 favorite spots, daily usage)
- At 100 active users: $100-200/month additional

**Database (Convex)**:
- Additional tables: Negligible (within existing plan)
- Additional queries: Negligible

### Total Additional Cost

- **Initial**: ~$50/month (low usage)
- **At scale** (500 active users): ~$500-1000/month

---

## Future Enhancements (V2+)

1. **Session Feedback**: After a session, user can rate if score was accurate
2. **Score Comparison**: Show system vs personalized score difference
3. **Equipment Profiles**: Detailed equipment tracking for better recommendations
4. **Condition Alerts**: Notify when personalized "epic" conditions are forecasted
5. **Community Insights**: Aggregate anonymized data for spot improvement
6. **AI Suggestions**: "Based on your profile, you might also like [spot]"

---

## References

- [PRD 02: LLM-Based Condition Scoring](/planning/prds/02.md)
- [PRD 03: Email Authentication](/planning/prds/03-email-authentication.md)
- [Scoring Prompts Guide](/SCORING_PROMPTS_GUIDE.md)
- [Architecture](/planning/architecture.md)

---

**Document Maintained By**: Engineering Team  
**Last Updated**: 2026-01-29  
**Status**: Draft - Ready for Review
