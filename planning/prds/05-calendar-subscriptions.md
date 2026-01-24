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
- `DTEND`: Event end time (start + 1.5 hours)
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
DTEND:20240125T153000Z
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

**V1 Approach - Best Slot Per Day Per Spot**:
- Include ONLY the best (highest scoring) slot per day per spot
- Limit to maximum 2 events per day total (across all spots)
- This keeps calendars clean and focused on the absolute best times
- Prevents calendar clutter with too many events

**Selection Logic**:
1. Filter slots with score ≥ 75 (ideal threshold)
2. Group by day
3. For each day: Pick the highest scoring slot per spot
4. If multiple spots have ideal slots on same day: Take top 2 spots (by score)
5. Result: Maximum 2 events per day

**V2 Enhancements**:
- Allow users to configure: "Show top N slots per day" (1-5)
- Option to see all ideal slots (not just best)
- Per-spot calendars (subscribe to individual spots)

**Time Range**:
- Include slots from now to 7 days ahead
- Don't show past events
- Update as new scrapes come in

### 2. Calendar Feed URLs

#### 2.1 URL Structure

**Sport-Specific Feeds** (V1 Approach):

```
GET /api/calendar/{sport}/feed.ics
```

**Query Parameters**:
- `token`: Optional subscription token (for tracking user-specific subscriptions)
- `spots`: Comma-separated spot IDs (optional, defaults to user's favorite spots if token provided, otherwise all spots)

**Examples**:
```
# Anonymous user - all spots for wingfoiling
https://waterman.app/api/calendar/wingfoil/feed.ics

# Authenticated user - their favorite wingfoil spots
https://waterman.app/api/calendar/wingfoil/feed.ics?token=xyz789

# Anonymous user - specific spots
https://waterman.app/api/calendar/surfing/feed.ics?spots=spot1,spot2
```

**Decision for V1**: One calendar per sport
- Authenticated users get one feed per sport (filtered to their favorite spots for that sport)
- Anonymous users get feeds for all spots of a sport
- Simpler UX: "Subscribe to Wingfoiling" + "Subscribe to Surfing"

#### 2.2 Security Considerations

**Public URLs**:
- Calendar feeds are publicly accessible (no session auth required)
- Users cannot modify feeds (read-only)
- No sensitive information in feed (only public forecast data)

**Optional Token-Based Access**:
- Tokens are optional but recommended for authenticated users
- Purpose: Track which users are using their subscriptions, personalize to favorite spots
- Token is long, random, unguessable (32 bytes, URL-safe)
- Token stored in database, associated with user account
- Token can be regenerated if compromised
- Feeds work without tokens (show all spots), but tokens enable personalization

**Rate Limiting**:
- Apply conservative rate limits to prevent abuse
- Max 100 requests per hour per IP for anonymous feeds
- Max 200 requests per hour per token for authenticated feeds
- Calendar apps typically poll every 1-24 hours

### 3. Database Schema Changes

#### 3.1 New Table: `calendar_subscriptions`

**Purpose**: Track user calendar subscriptions and tokens

```typescript
calendar_subscriptions: defineTable({
  userId: v.id("users"),
  sport: v.string(), // "wingfoil" or "surfing"
  token: v.string(), // Unique subscription token (32 bytes, URL-safe)
  isActive: v.boolean(), // Enable/disable subscription
  createdAt: v.number(),
  lastAccessedAt: v.optional(v.number()), // Track feed usage
  accessCount: v.optional(v.number()), // Track popularity
})
  .index("by_user", ["userId"])
  .index("by_user_sport", ["userId", "sport"])
  .index("by_token", ["token"]);
```

**Design Decisions**:
- One subscription per user per sport (e.g., one for wingfoil, one for surfing)
- Simpler UX: "Subscribe to Wingfoiling Calendar" and "Subscribe to Surfing Calendar"
- Token allows personalization (filters to user's favorite spots)
- Feeds work without tokens (show all spots for that sport)

#### 3.2 Migration Strategy

**No Breaking Changes**:
- New table doesn't affect existing functionality
- Existing users won't have subscriptions until they opt in
- Anonymous users can still use sport-specific feeds without accounts

### 4. Backend Implementation

#### 4.1 New Convex Functions

**Query**: `calendar.getSportFeed` (handles both authenticated and anonymous)

```typescript
export const getSportFeed = query({
  args: {
    sport: v.string(),
    token: v.optional(v.string()), // If provided, filter to user's favorite spots
    spotIds: v.optional(v.array(v.id("spots"))), // Explicit spot filter (overrides token)
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
      sport: v.string(),
      spotCount: v.number(),
      isPersonalized: v.boolean(),
    }),
  }),
  handler: async (ctx, args) => {
    // 1. If token provided: Look up subscription and get user's favorite spots for this sport
    // 2. If spotIds provided: Use those spots (overrides token)
    // 3. Otherwise: Use all spots for this sport
    // 4. Query condition_scores for sport with score >= 75
    // 5. Filter to next 7 days
    // 6. Group by day
    // 7. For each day: Select best slot per spot, limit to top 2 slots per day
    // 8. Join with forecast_slots to get condition data
    // 9. Sort by timestamp
    // 10. Update lastAccessedAt if token was used
    // 11. Return event data
  },
});
```

**Mutation**: `calendar.createSubscription`

```typescript
export const createSubscription = mutation({
  args: {
    sessionToken: v.string(),
    sport: v.string(), // "wingfoil" or "surfing"
  },
  returns: v.object({
    subscriptionId: v.id("calendar_subscriptions"),
    token: v.string(),
    feedUrl: v.string(),
  }),
  handler: async (ctx, args) => {
    // 1. Verify session token
    // 2. Generate unique subscription token (32 bytes, URL-safe)
    // 3. Check if user already has subscription for this sport
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
    sport: v.string(),
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
    // 5. Return subscription list (one per sport)
  },
});
```

#### 4.2 Next.js API Route

**File**: `app/api/calendar/[sport]/feed.ics/route.js`

```javascript
export async function GET(request, { params }) {
  // 1. Extract sport from params
  // 2. Extract token and spotIds from query params
  // 3. Call calendar.getSportFeed query with sport, token, spotIds
  // 4. Generate ICS file from event data
  // 5. Set appropriate headers:
  //    - Content-Type: text/calendar; charset=utf-8
  //    - Content-Disposition: inline; filename="waterman-{sport}.ics"
  //    - Cache-Control: max-age=3600 (1 hour cache)
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

#### 5.1 New Page: Subscribe to Calendars

**File**: `app/subscribe/page.js`

**Purpose**: Let users subscribe to calendar feeds for their sports

**Content**:
1. **Hero Section**:
   - Title: "Subscribe to Forecast Calendars"
   - Description: "Get ideal conditions synced to your calendar app"

2. **Calendar Cards** (one per sport):
   - **Wingfoiling Calendar**:
     - Description: "Best wingfoil session each day"
     - Feed URL (with copy button)
     - Status: Not subscribed / Subscribed
     
   - **Surfing Calendar**:
     - Description: "Best surf session each day"
     - Feed URL (with copy button)
     - Status: Not subscribed / Subscribed

3. **Authenticated Users**:
   - Show personalized feeds (filtered to their favorite spots)
   - Feed URLs include token for tracking
   - Can regenerate token if needed
   - Can delete subscription

4. **Anonymous Users**:
   - Show public feeds (all spots for each sport)
   - Prompt to sign in for personalized feeds
   - Can still subscribe to public feeds

5. **Instructions** (collapsible section):
   - Google Calendar: Add calendar from URL
   - Apple Calendar: New calendar subscription
   - Outlook: Subscribe from web

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
- Add "Subscribe" link to main navigation
- Icon: Calendar or RSS feed icon

**Profile Menu** (for authenticated users):
- Add "Calendar Feeds" link

### 6. User Experience Flows

#### 6.1 Authenticated User - First Time

1. User navigates to `/subscribe`
2. Sees two calendar cards: Wingfoiling and Surfing
3. Each card shows "Create subscription" button
4. Clicks on "Subscribe to Wingfoiling"
5. System generates subscription token
6. Feed URL appears with copy button
7. User copies URL and adds to their calendar app
8. Best wingfoil sessions appear in calendar (personalized to their favorite spots)
9. Repeat for surfing if desired

#### 6.2 Authenticated User - Existing Subscription

1. User navigates to `/subscribe`
2. Sees existing subscriptions with feed URLs
3. Can copy URLs again
4. Can regenerate token if needed
5. Can delete subscription

#### 6.3 Anonymous User

1. User navigates to `/subscribe`
2. Sees two calendar cards for wingfoil and surf
3. Each shows public feed URL (all spots)
4. Can copy and subscribe without account
5. Optional prompt: "Sign in for personalized feeds (your favorite spots only)"

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

**Duration**: 1.5 hours per event
- Average watersports session duration
- Fixed duration for V1
- Can be made user-configurable in V2

**Start/End Times**:
- `DTSTART`: Slot timestamp
- `DTEND`: Slot timestamp + 1.5 hours

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

**Decision**: **Sport-specific feeds only**, with optional personalization via token
- One feed per sport (wingfoil, surfing)
- Authenticated users get tokens that filter feeds to their favorite spots
- Anonymous users see all spots for that sport
- Simpler UX and implementation

### 2. What score threshold should we use for including events?

**Decision**: Score ≥ 75 (Ideal and above), plus best-per-day selection
- Filter to slots with score ≥ 75
- Then pick the best (highest scoring) slot per day per spot
- Maximum 2 events per day total
- Keeps calendars clean and focused

### 3. How far ahead should calendar show?

**Decision**: 7 days
- Matches typical forecast accuracy window
- Not too cluttered
- Updated frequently enough to stay accurate

### 4. Should events be 1-hour blocks or variable duration?

**Decision**: 1.5-hour fixed blocks
- Matches average watersports session duration
- Fixed duration for V1 simplicity
- Can be made user-configurable in V2
- Users can see the best window for each day

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
