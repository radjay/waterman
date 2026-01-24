# Product Requirements Document (PRD)

## Calendar Subscription Feature

**Version:** 1.0  
**Date:** 2026-01-24  
**Status:** Draft

---

## Overview

Enable users to subscribe to personalized calendar feeds that automatically sync the best watersports conditions to their calendar apps (Google Calendar, Apple Calendar, Outlook, etc.). Each calendar feed displays upcoming slots with ideal conditions for their preferred sports and spots, updating automatically as new forecasts are scraped.

---

## Goals

1. **Calendar Integration**: Allow users to subscribe to iCal feeds directly in their calendar apps
2. **Personalized Content**: Show only the best conditions based on user preferences (favorite sports/spots)
3. **Automatic Updates**: Calendar feeds refresh automatically when new forecast data is available
4. **Multi-Platform Support**: Work with all major calendar applications (Google Calendar, Apple Calendar, Outlook, etc.)
5. **Zero Friction**: No authentication required for calendar subscriptions (public URLs)
6. **Discovery**: Make it easy for users to find and subscribe to their personalized feeds

---

## Non-Goals (V1)

- Private/authenticated calendar feeds (all feeds are public)
- Email notifications (separate feature)
- Event reminders via email/SMS
- RSVP or attendance tracking
- Multi-user calendar sharing features
- Custom event descriptions beyond condition details

---

## Requirements

### 1. Calendar Feed Format

#### 1.1 iCalendar (ICS) Format

**Standard**: RFC 5545 (iCalendar specification)

**Why iCalendar?**
- Universal standard supported by all major calendar apps
- Automatic updates via subscription
- No user account needed
- Native calendar app integration

**Required Fields**:
- `VCALENDAR`: Top-level container
- `VERSION`: 2.0
- `PRODID`: Waterman identifier
- `CALSCALE`: GREGORIAN
- `METHOD`: PUBLISH
- `X-WR-CALNAME`: Calendar name (e.g., "Waterman - Best Wingfoiling at Costa da Caparica")
- `X-WR-CALDESC`: Calendar description
- `X-WR-TIMEZONE`: UTC (or spot timezone if available)
- `REFRESH-INTERVAL`: PT1H (refresh every 1 hour)
- `X-PUBLISHED-TTL`: PT1H (same as refresh interval)

**Event Fields** (VEVENT):
- `UID`: Unique identifier (spotId-timestamp-sport@waterman.app)
- `DTSTAMP`: When event was created
- `DTSTART`: Event start time
- `DTEND`: Event end time (start + 1 hour)
- `SUMMARY`: Event title (e.g., "EPIC Wingfoiling at Costa da Caparica - 18kt NW")
- `DESCRIPTION`: Detailed condition information
- `LOCATION`: Spot name and country
- `STATUS`: CONFIRMED
- `TRANSP`: TRANSPARENT (doesn't block calendar)
- `CATEGORIES`: Sport name (e.g., "Wingfoiling")

**Example Event**:
```
BEGIN:VEVENT
UID:spot123-1706112000000-wingfoil@waterman.app
DTSTAMP:20240124T120000Z
DTSTART:20240125T140000Z
DTEND:20240125T150000Z
SUMMARY:EPIC Wingfoiling at Costa da Caparica - 18kt NW
DESCRIPTION:Score: 92/100\n\nConditions:\n• Wind: 18 knots\n• Gusts: 22 knots\n• Direction: 330° (NW)\n• Waves: 0.5m\n\nReasoning: Perfect wind speed and direction with consistent gusts. Excellent conditions for progression.\n\nView forecast: https://waterman.app/wing/best
LOCATION:Costa da Caparica, Portugal
STATUS:CONFIRMED
TRANSP:TRANSPARENT
CATEGORIES:Wingfoiling
END:VEVENT
```

#### 1.2 Event Selection Criteria

**Which Slots to Include**:

**Option A - Score-Based (Recommended for V1)**:
- Include slots with LLM score ≥ 75 ("ideal" threshold)
- This ensures only high-quality conditions appear in calendar
- Aligns with existing "best" filter behavior

**Option B - Top N Per Day**:
- Include top 3 slots per day per spot
- Ensures at least some events even if no "ideal" conditions

**Option C - User-Configurable Threshold**:
- Let users choose minimum score (e.g., 60, 75, 90)
- Requires UI for configuration (V2)

**Decision for V1**: Use Option A (score ≥ 75) as default

**Time Range**:
- Include slots from now to 7 days ahead
- Don't show past events
- Update as new scrapes come in

**Deduplication**:
- One event per slot-sport combination
- If slot meets criteria for multiple sports, create separate events

### 2. Calendar Feed URLs

#### 2.1 URL Structure

**User-Specific Feeds** (Recommended):

```
GET /api/calendar/user/{userId}/feed.ics
```

**Query Parameters**:
- `token`: Subscription token (unique per user, used for public access)
- Optional: `minScore`: Minimum score threshold (default: 75)

**Example**:
```
https://waterman.app/api/calendar/user/abc123/feed.ics?token=xyz789
```

**Sport-Specific Feeds** (Simpler Alternative):

```
GET /api/calendar/{sport}/feed.ics
```

**Query Parameters**:
- `spots`: Comma-separated spot IDs (optional, defaults to all spots for sport)
- `minScore`: Minimum score threshold (default: 75)

**Example**:
```
https://waterman.app/api/calendar/wingfoil/feed.ics?spots=spot1,spot2
```

**Decision for V1**: Implement **both** approaches:
- User-specific feeds for authenticated users (personalized to favorite spots)
- Sport-specific feeds for anonymous users (all spots for a sport)

#### 2.2 Security Considerations

**Public URLs**:
- Calendar feeds are publicly accessible (no session auth required)
- Users cannot modify feeds (read-only)
- No sensitive information in feed (only public forecast data)

**Token-Based Access** (for user feeds):
- Each user gets a unique subscription token
- Token is long, random, unguessable (32 bytes, URL-safe)
- Token stored in database, associated with user account
- Token can be regenerated if compromised
- No API rate limiting needed (calendar apps poll infrequently)

**Rate Limiting**:
- Apply conservative rate limits to prevent abuse
- Max 100 requests per hour per IP for anonymous feeds
- Max 200 requests per hour per token for user feeds
- Calendar apps typically poll every 1-24 hours

### 3. Database Schema Changes

#### 3.1 New Table: `calendar_subscriptions`

**Purpose**: Track user calendar subscriptions and tokens

```typescript
calendar_subscriptions: defineTable({
  userId: v.id("users"),
  token: v.string(), // Unique subscription token (32 bytes, URL-safe)
  feedType: v.string(), // "user" or "sport"
  sport: v.optional(v.string()), // For sport-specific feeds
  minScore: v.optional(v.number()), // User preference (default: 75)
  isActive: v.boolean(), // Enable/disable subscription
  createdAt: v.number(),
  lastAccessedAt: v.optional(v.number()), // Track feed usage
  accessCount: v.optional(v.number()), // Track popularity
})
  .index("by_user", ["userId"])
  .index("by_token", ["token"]);
```

**Design Decisions**:
- One subscription record per user (not per sport)
- User can have one universal feed with all their favorite sports/spots
- Token allows public access without session authentication
- `lastAccessedAt` helps track if subscriptions are actively used

**Alternative Approach** (Multiple Subscriptions per User):
- Allow users to create multiple subscriptions (one per sport, one per spot group, etc.)
- More flexible but adds UI complexity
- Defer to V2 if needed

#### 3.2 Migration Strategy

**No Breaking Changes**:
- New table doesn't affect existing functionality
- Existing users won't have subscriptions until they opt in
- Anonymous users can still use sport-specific feeds without accounts

### 4. Backend Implementation

#### 4.1 New Convex Functions

**Query**: `calendar.getUserFeed`

```typescript
export const getUserFeed = query({
  args: {
    token: v.string(),
    minScore: v.optional(v.number()),
  },
  returns: v.object({
    events: v.array(v.object({
      slotId: v.id("forecast_slots"),
      spotId: v.id("spots"),
      spotName: v.string(),
      country: v.optional(v.string()),
      sport: v.string(),
      timestamp: v.number(),
      score: v.number(),
      reasoning: v.string(),
      conditions: v.object({
        speed: v.number(),
        gust: v.number(),
        direction: v.number(),
        waveHeight: v.optional(v.number()),
        wavePeriod: v.optional(v.number()),
      }),
    })),
    metadata: v.object({
      userId: v.id("users"),
      userName: v.optional(v.string()),
      sports: v.array(v.string()),
      spotCount: v.number(),
    }),
  }),
  handler: async (ctx, args) => {
    // 1. Look up subscription by token
    // 2. Get user's favorite sports and spots
    // 3. Query condition_scores for slots with score >= minScore (default: 75)
    // 4. Filter to user's favorite spots/sports
    // 5. Filter to next 7 days
    // 6. Join with forecast_slots to get condition data
    // 7. Sort by timestamp
    // 8. Return event data
  },
});
```

**Query**: `calendar.getSportFeed`

```typescript
export const getSportFeed = query({
  args: {
    sport: v.string(),
    spotIds: v.optional(v.array(v.id("spots"))),
    minScore: v.optional(v.number()),
  },
  returns: v.object({
    events: v.array(v.object({
      // Same structure as getUserFeed
    })),
    metadata: v.object({
      sport: v.string(),
      spotCount: v.number(),
    }),
  }),
  handler: async (ctx, args) => {
    // 1. Query condition_scores for sport with score >= minScore (default: 75)
    // 2. Filter to specified spots (or all spots for sport)
    // 3. Filter to next 7 days
    // 4. Join with forecast_slots to get condition data
    // 5. Sort by timestamp
    // 6. Return event data
  },
});
```

**Mutation**: `calendar.createSubscription`

```typescript
export const createSubscription = mutation({
  args: {
    sessionToken: v.string(),
    sport: v.optional(v.string()), // For sport-specific subscriptions
    minScore: v.optional(v.number()),
  },
  returns: v.object({
    subscriptionId: v.id("calendar_subscriptions"),
    token: v.string(),
    feedUrl: v.string(),
  }),
  handler: async (ctx, args) => {
    // 1. Verify session token
    // 2. Generate unique subscription token (32 bytes, URL-safe)
    // 3. Check if user already has subscription
    //    - If yes: return existing token
    //    - If no: create new subscription
    // 4. Build feed URL with token
    // 5. Return subscription details
  },
});
```

**Mutation**: `calendar.regenerateToken`

```typescript
export const regenerateToken = mutation({
  args: {
    sessionToken: v.string(),
    subscriptionId: v.id("calendar_subscriptions"),
  },
  returns: v.object({
    token: v.string(),
    feedUrl: v.string(),
  }),
  handler: async (ctx, args) => {
    // 1. Verify session token
    // 2. Verify user owns subscription
    // 3. Generate new token
    // 4. Update subscription record
    // 5. Return new token and URL
  },
});
```

**Mutation**: `calendar.deleteSubscription`

```typescript
export const deleteSubscription = mutation({
  args: {
    sessionToken: v.string(),
    subscriptionId: v.id("calendar_subscriptions"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // 1. Verify session token
    // 2. Verify user owns subscription
    // 3. Delete subscription record
    // 4. Return success
  },
});
```

**Query**: `calendar.getUserSubscriptions`

```typescript
export const getUserSubscriptions = query({
  args: {
    sessionToken: v.string(),
  },
  returns: v.array(v.object({
    subscriptionId: v.id("calendar_subscriptions"),
    feedType: v.string(),
    sport: v.optional(v.string()),
    minScore: v.number(),
    feedUrl: v.string(),
    isActive: v.boolean(),
    createdAt: v.number(),
    lastAccessedAt: v.optional(v.number()),
  })),
  handler: async (ctx, args) => {
    // 1. Verify session token
    // 2. Get user ID
    // 3. Query calendar_subscriptions by userId
    // 4. Build feed URLs with tokens
    // 5. Return subscription list
  },
});
```

#### 4.2 Next.js API Route

**File**: `app/api/calendar/user/[userId]/feed.ics/route.js`

```javascript
export async function GET(request, { params }) {
  // 1. Extract token from query params
  // 2. Extract userId from params
  // 3. Call calendar.getUserFeed query with token
  // 4. Generate ICS file from event data
  // 5. Set appropriate headers:
  //    - Content-Type: text/calendar; charset=utf-8
  //    - Content-Disposition: inline; filename="waterman.ics"
  //    - Cache-Control: max-age=3600 (1 hour cache)
  // 6. Return ICS text response
}
```

**File**: `app/api/calendar/[sport]/feed.ics/route.js`

```javascript
export async function GET(request, { params }) {
  // 1. Extract sport from params
  // 2. Extract spotIds and minScore from query params
  // 3. Call calendar.getSportFeed query
  // 4. Generate ICS file from event data
  // 5. Set appropriate headers (same as above)
  // 6. Return ICS text response
}
```

#### 4.3 ICS Generation Helper

**File**: `lib/ics.js` (new file)

```javascript
/**
 * Generate ICS (iCalendar) content from event data
 * 
 * @param {Object} params
 * @param {Array} params.events - Array of event objects
 * @param {string} params.calendarName - Calendar display name
 * @param {string} params.calendarDescription - Calendar description
 * @returns {string} ICS file content
 */
export function generateICS({ events, calendarName, calendarDescription }) {
  // 1. Build VCALENDAR header
  // 2. For each event:
  //    - Generate VEVENT block
  //    - Format dates in ISO format (YYYYMMDDTHHMMSSZ)
  //    - Escape special characters (\n, \, ;, ,)
  //    - Build SUMMARY, DESCRIPTION, LOCATION
  // 3. Close VCALENDAR
  // 4. Return ICS string
}

/**
 * Format event summary (title)
 * Examples:
 * - "EPIC Wingfoiling at Costa da Caparica - 18kt NW"
 * - "Ideal Surfing at Carcavelos - 1.2m 12s SW"
 */
export function formatEventSummary(event) {
  // Score >= 90: "EPIC"
  // Score >= 75: "Ideal"
  // Format: "{Quality} {Sport} at {Spot} - {Conditions}"
}

/**
 * Format event description (detailed conditions)
 */
export function formatEventDescription(event) {
  // Include:
  // - Score with reasoning
  // - Detailed conditions (wind/waves/tide)
  // - Link to forecast page
}

/**
 * Format location (spot name + country)
 */
export function formatLocation(event) {
  // Format: "{Spot Name}, {Country}"
  // Example: "Costa da Caparica, Portugal"
}
```

### 5. Frontend Implementation

#### 5.1 New Page: Calendar Subscriptions

**File**: `app/calendar/page.js`

**Purpose**: Let users manage their calendar subscriptions

**Content**:
1. **Hero Section**:
   - Title: "Subscribe to Your Forecast Calendar"
   - Description: "Get the best conditions automatically synced to your calendar"
   - Icon: Calendar with waves

2. **How It Works**:
   - Step 1: "Subscribe to your personalized feed"
   - Step 2: "We add events for ideal conditions (score ≥ 75)"
   - Step 3: "Your calendar updates automatically as new forecasts arrive"
   - Supported apps: Google Calendar, Apple Calendar, Outlook

3. **Authenticated Users**:
   - Show personalized feed URL
   - Copy button with success feedback
   - Instructions for each calendar app
   - Settings: Adjust minimum score threshold
   - Regenerate token option (if compromised)
   - Delete subscription option

4. **Anonymous Users**:
   - Prompt to sign in for personalized feed
   - Show sport-specific feeds as alternative:
     - "Wingfoiling - All Spots"
     - "Surfing - All Spots"
   - Copy URLs for each sport

5. **Instructions Per Platform**:
   - **Google Calendar**:
     - "Click + next to 'Other calendars'"
     - "Select 'From URL'"
     - "Paste your feed URL"
   - **Apple Calendar**:
     - "File → New Calendar Subscription"
     - "Paste your feed URL"
     - "Set auto-refresh to 1 hour"
   - **Outlook**:
     - "Add calendar → Subscribe from web"
     - "Paste your feed URL"

#### 5.2 Component: `CalendarSubscriptionCard.js`

**Purpose**: Display a calendar subscription with copy/manage options

**Props**:
- `subscription`: Subscription object
- `onRegenerate`: Callback to regenerate token
- `onDelete`: Callback to delete subscription

**UI Elements**:
- Calendar icon
- Feed type/sport label
- Feed URL (truncated, with copy button)
- Stats: Created date, last accessed
- Actions: Copy URL, Regenerate, Delete

#### 5.3 Component: `CalendarInstructions.js`

**Purpose**: Show platform-specific instructions for subscribing

**Props**:
- `feedUrl`: The calendar feed URL to subscribe to

**Content**:
- Tabs for each platform (Google, Apple, Outlook)
- Step-by-step instructions with screenshots (optional)
- Copy URL button

#### 5.4 Navigation Updates

**Header**:
- Add "Calendar" link to main navigation
- Show badge if user doesn't have subscription yet

**Profile Menu** (for authenticated users):
- Add "Calendar Subscriptions" link

### 6. User Experience Flows

#### 6.1 Authenticated User - First Time

1. User navigates to `/calendar`
2. Sees "Subscribe to Your Forecast Calendar" page
3. Reads how it works
4. Clicks "Create My Calendar Feed"
5. System generates subscription token
6. User sees feed URL with copy button
7. User selects their calendar app (Google/Apple/Outlook)
8. User follows platform-specific instructions
9. User subscribes in their calendar app
10. Events appear automatically

#### 6.2 Authenticated User - Existing Subscription

1. User navigates to `/calendar`
2. Sees existing subscription
3. Can copy URL again
4. Can adjust settings (min score)
5. Can regenerate token if needed
6. Can delete subscription

#### 6.3 Anonymous User

1. User navigates to `/calendar`
2. Sees prompt to sign in for personalized feed
3. Can use sport-specific feeds without signing in:
   - Copies wingfoil feed URL
   - Subscribes in calendar app
   - Gets all wingfoil spots
4. Optional: Signs in to get personalized feed

### 7. Event Content Strategy

#### 7.1 Event Titles (SUMMARY)

**Format**: `{Quality Badge} {Sport} at {Spot} - {Key Conditions}`

**Examples**:
- ✅ "EPIC Wingfoiling at Costa da Caparica - 18kt NW"
- ✅ "Ideal Surfing at Carcavelos - 1.2m 12s SW"
- ✅ "Ideal Wingfoiling at Guincho - 22kt N"

**Rules**:
- Keep under 60 characters if possible
- Include quality badge (EPIC/Ideal) for quick scanning
- Include key metric (wind speed + direction OR wave height + period + direction)
- Sport and spot name for context

#### 7.2 Event Descriptions (DESCRIPTION)

**Format**:
```
Score: {score}/100

Conditions:
• Wind: {speed}kt {direction}° ({cardinal})
• Gusts: {gust}kt
• Waves: {height}m {period}s {direction}° ({cardinal})

{LLM Reasoning}

View full forecast: {url}
```

**Example**:
```
Score: 92/100

Conditions:
• Wind: 18 knots 330° (NW)
• Gusts: 22 knots
• Waves: 0.5m

Perfect wind speed and direction with consistent gusts. Excellent conditions for progression.

View full forecast: https://waterman.app/wing/best
```

#### 7.3 Event Timing

**Duration**: 1 hour per event
- Most calendar apps work better with fixed durations
- Users can see multiple 1-hour blocks for extended conditions
- Easier to spot patterns visually in calendar

**Start/End Times**:
- `DTSTART`: Slot timestamp
- `DTEND`: Slot timestamp + 1 hour

**All-Day Events**: Not recommended
- Loses time-specific information
- Less useful for planning sessions

### 8. Technical Considerations

#### 8.1 Performance & Caching

**Feed Generation**:
- Query is moderately expensive (joins, filtering, sorting)
- Cache feed responses for 1 hour (matches refresh interval)
- Use Next.js response caching
- Invalidate cache when new scrapes complete

**Caching Strategy**:
```javascript
export async function GET(request, { params }) {
  // Set cache headers
  return new Response(icsContent, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Cache-Control': 'public, max-age=3600', // 1 hour
      'Content-Disposition': 'inline; filename="waterman.ics"',
    },
  });
}
```

**Database Indexes**:
- Existing indexes on `condition_scores` are sufficient
- `by_spot_timestamp_sport` index optimizes feed queries
- No new indexes needed

#### 8.2 Feed Refresh Behavior

**Calendar App Polling**:
- Google Calendar: Every 24 hours (not configurable)
- Apple Calendar: 1 hour to 1 week (user configurable)
- Outlook: Varies by client

**Our Recommendation**:
- Set `REFRESH-INTERVAL: PT1H` (1 hour) in ICS
- Set `X-PUBLISHED-TTL: PT1H` for compatibility
- Most apps will honor this for frequent updates

**Update Propagation**:
1. New scrape completes → Slots saved
2. Scoring completes → Scores saved
3. Next calendar app poll (1-24 hours later)
4. Calendar app fetches feed
5. Our API generates fresh ICS with new scores
6. Calendar app updates events

**Note**: Updates are not instant. Depends on calendar app refresh schedule.

#### 8.3 Scalability

**Feed Generation Cost**:
- Each feed generation: 1 database query + ICS formatting
- Query cost: O(n) where n = number of slots in 7-day window
- Typical: 100-200 slots per user
- Acceptable performance even without caching

**Caching Benefits**:
- Reduces database load by 99%+
- Most requests served from cache (1 hour TTL)
- Cache per (userId/token) or (sport/spots)

**Expected Load**:
- User feeds: 1 request per user per hour (if actively used)
- Sport feeds: Higher traffic but also cached
- Total: < 1000 requests/hour even with 500 active users
- Well within Next.js/Convex limits

### 9. Migration & Rollout Strategy

#### 9.1 Phased Rollout

**Phase 1: Backend & API** (Week 1)
1. Add `calendar_subscriptions` table to schema
2. Implement Convex queries/mutations
3. Implement Next.js API routes
4. Test ICS generation with sample data
5. Verify feeds work in Google/Apple Calendar

**Phase 2: Frontend** (Week 2)
1. Create `/calendar` page
2. Implement subscription creation flow
3. Add instructions for each platform
4. Update navigation
5. Test end-to-end user flow

**Phase 3: Launch** (Week 3)
1. Announce feature to existing users (if applicable)
2. Add to onboarding for new users
3. Monitor feed access patterns
4. Gather feedback

#### 9.2 Testing Strategy

**Unit Tests**:
- ICS generation with sample events
- Event title/description formatting
- Date/time formatting in UTC
- Special character escaping

**Integration Tests**:
- Feed query performance
- Token generation and validation
- Subscription CRUD operations
- Cache behavior

**Manual Tests**:
- Subscribe in Google Calendar
- Subscribe in Apple Calendar
- Subscribe in Outlook
- Verify events display correctly
- Verify automatic updates work
- Test token regeneration
- Test subscription deletion

### 10. Monitoring & Observability

#### 10.1 Metrics to Track

**Usage Metrics**:
- Calendar subscription creation rate
- Active subscriptions (accessed in last 7 days)
- Feed access frequency per subscription
- Most popular sports/spots in feeds

**Performance Metrics**:
- Feed generation time (p50, p95, p99)
- Database query time for feed generation
- Cache hit rate
- API response time

**Quality Metrics**:
- Event count per feed (average)
- Score distribution of included events
- User retention (subscriptions still active after 30 days)

#### 10.2 Logging

**Access Logs**:
- Log each feed access with:
  - Subscription token (or anonymous)
  - User agent (calendar app)
  - Response time
  - Event count
  - Cache hit/miss

**Error Logs**:
- Invalid tokens
- Query failures
- ICS generation errors

#### 10.3 Alerts

- Alert if feed generation time > 5 seconds (p95)
- Alert if error rate > 5%
- Alert if cache hit rate < 90%

### 11. Future Enhancements (V2)

#### 11.1 Enhanced Personalization

**Custom Event Criteria**:
- Let users set custom score thresholds (not just 75)
- Filter by specific spots (not just favorites)
- Filter by time of day (e.g., only afternoon sessions)

**Multiple Subscriptions**:
- One feed per sport
- One feed per spot
- Separate feeds for different score thresholds

#### 11.2 Event Enhancements

**Richer Event Descriptions**:
- Include tide information (for surfing)
- Include swell direction visual (arrow)
- Include weather conditions (clouds, rain)
- Include webcam link

**Event Timing Options**:
- Variable duration based on condition window
- All-day events option
- Reminders (1 hour before, 1 day before)

**Event Categories**:
- Color-code by quality (EPIC, Ideal)
- Separate calendars by sport
- Tags for filtering in calendar app

#### 11.3 Social Features

**Shared Calendars**:
- Generate shareable feed for a group
- "Subscribe to João's calendar" (public profiles)

**Calendar Integrations**:
- Google Calendar API (write access for reminders)
- Outlook API integration
- Apple Calendar push notifications

#### 11.4 Advanced Features

**Private Feeds**:
- Require authentication for calendar access
- Useful if we add private spots or user-specific data
- More complex but more secure

**Webhook Notifications**:
- Notify users when new ideal conditions are added
- Push notification to phone (separate from calendar)
- Email digest option

**Historical Accuracy Tracking**:
- Track which forecasted events actually happened
- Show accuracy metrics on calendar page
- "We were right 87% of the time"

---

## Success Criteria

### V1 Success Metrics

- ✅ Calendar subscriptions can be created by authenticated users
- ✅ Feed URLs generate valid ICS files
- ✅ Feeds work in Google Calendar, Apple Calendar, and Outlook
- ✅ Events show correct condition information
- ✅ Feeds update automatically (within calendar app refresh window)
- ✅ 95% of feed requests served from cache
- ✅ Feed generation time < 3 seconds (p95)

### User Adoption Metrics

- 30% of authenticated users create calendar subscriptions (within 30 days of launch)
- 60% of subscriptions still active after 30 days
- Average 5+ events per week per feed
- < 5% token regeneration rate (indicates low compromise rate)

---

## Open Questions & Decisions

### 1. Should feeds be user-specific or sport-specific?

**Decision**: Support **both**
- User-specific for authenticated users (personalized to favorites)
- Sport-specific for anonymous users (all spots for sport)
- This provides the best UX for both audiences

### 2. What score threshold should we use for including events?

**Decision**: Score ≥ 75 (Ideal and above)
- Aligns with existing "ideal" designation
- Ensures only quality conditions in calendar
- Can be made configurable in V2

### 3. How far ahead should calendar show?

**Decision**: 7 days
- Matches typical forecast accuracy window
- Not too cluttered
- Updated frequently enough to stay accurate

### 4. Should events be 1-hour blocks or variable duration?

**Decision**: 1-hour fixed blocks
- Simpler to implement
- Works better with calendar app UX
- Users can see multiple blocks for extended conditions
- Variable duration can be added in V2 if needed

### 5. Should we support private/authenticated feeds?

**Decision**: No for V1
- Public feeds are sufficient
- No sensitive data in forecast conditions
- Simpler implementation
- Can add authentication in V2 if needed

### 6. How should we handle token regeneration?

**Decision**: Allow manual regeneration
- User can regenerate if token is compromised
- Old token is invalidated immediately
- New token is generated and displayed
- Simple security model

---

## Dependencies

### External Dependencies
- iCalendar/ICS standard (RFC 5545)
- Calendar app support for subscription URLs
- No new external services required

### Internal Dependencies
- Existing LLM scoring system (condition_scores table)
- User authentication system (for personalized feeds)
- Forecast data (forecast_slots table)
- Spots and sports data

### Technical Dependencies
- Next.js API routes
- Convex queries
- No new npm packages required (ICS generation is simple string building)

---

## Cost Estimates

### Infrastructure
- **Database**: Negligible (small table, infrequent writes)
- **Bandwidth**: ~5KB per feed request × 1000 requests/day = 5MB/day = negligible
- **Compute**: Feed generation is simple, no significant cost

### Total Additional Cost
- **Initial**: $0/month
- **At Scale** (1000 active subscriptions): ~$1-2/month (bandwidth + compute)

---

## Risks & Mitigations

### Risk 1: Calendar Apps Don't Refresh Frequently

**Impact**: Medium - Users see stale events
**Mitigation**: 
- Set `REFRESH-INTERVAL` and `X-PUBLISHED-TTL` to 1 hour
- Document refresh behavior per app
- Educate users on how to force refresh

### Risk 2: Token Leakage

**Impact**: Low - Feeds are public data anyway
**Mitigation**:
- Tokens are long and unguessable
- Allow token regeneration
- Monitor for suspicious access patterns
- No sensitive data in feeds

### Risk 3: Feed Generation Performance

**Impact**: Low - Could slow down API
**Mitigation**:
- Implement response caching (1 hour)
- Optimize database queries
- Monitor performance metrics

### Risk 4: Calendar App Compatibility Issues

**Impact**: Medium - Users can't subscribe
**Mitigation**:
- Follow RFC 5545 strictly
- Test with all major calendar apps
- Provide troubleshooting guide
- Support fallback options (manual import)

### Risk 5: Too Many/Too Few Events

**Impact**: Medium - User frustration
**Mitigation**:
- Default score threshold of 75 (proven to work)
- Allow customization in V2
- Monitor event counts per feed
- Adjust threshold if needed

---

## Documentation Requirements

### User-Facing Documentation

**Calendar Subscriptions Guide**:
- What is a calendar subscription?
- How to subscribe in each calendar app
- How often do calendars update?
- What events appear in my calendar?
- How to change settings
- How to unsubscribe

**FAQ**:
- Why don't I see events immediately?
- Can I share my calendar feed?
- How do I regenerate my token?
- What if my calendar app doesn't support subscriptions?

### Developer Documentation

**API Documentation**:
- Calendar feed endpoints
- ICS format specification
- Token generation/validation
- Feed caching strategy

**Maintenance Guide**:
- How to debug feed issues
- How to update ICS format
- How to monitor feed health

---

## References

- [RFC 5545 - iCalendar Specification](https://datatracker.ietf.org/doc/html/rfc5545)
- [Google Calendar - Subscribe to calendars](https://support.google.com/calendar/answer/37100)
- [Apple Calendar - Subscribe to calendars](https://support.apple.com/guide/calendar/subscribe-to-calendars-icl1022/mac)
- [Outlook - Subscribe to a calendar](https://support.microsoft.com/en-us/office/import-or-subscribe-to-a-calendar-in-outlook-com-cff1429c-5af6-41ec-a5b4-74f2c278e98c)

---

**Document Maintained By**: Engineering Team  
**Last Updated**: 2026-01-24  
**Status**: Draft - Ready for Review
