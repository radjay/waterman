# PRD 04: Future Features & Enhancements

**Status**: Planning  
**Priority**: Low  
**Created**: 2026-01-24  
**Owner**: Engineering Team

---

## Overview

This PRD outlines potential future enhancements for the Waterman app beyond the core MVP. These features would expand user personalization, engagement, and functionality based on user feedback and product evolution.

**Note**: These are aspirational features to be prioritized based on user demand, resource availability, and strategic goals.

---

## Features

### 1. User Preferences Expansion

**Description**: Advanced user settings for deeper personalization

**Potential Features**:
- Custom condition thresholds (e.g., "Show me only when waves > 3ft")
- Preferred time windows (e.g., "I only surf in the morning")
- Wind direction preferences per spot
- Swell direction preferences
- Tide preferences (high, mid, low)
- Custom alerts based on preferences

**User Value**: More precise personalization = less noise, more relevant conditions

**Technical Complexity**: Medium - requires flexible preference schema and filtering logic

---

### 2. Performance Monitoring & Analytics

**Description**: Observability and insights into user behavior and system health

**Metrics to Track**:

**Auth Metrics:**
- Magic link open rate
- Magic link click-through rate
- Session duration
- Logout rate

**User Metrics:**
- New signups per day
- Returning users (7-day, 30-day retention)
- Onboarding completion rate
- Favorite spots/sports per user (avg)
- Feature usage patterns

**Technical Metrics:**
- Email delivery latency & success rate
- Token generation time
- Session validation time
- Error rates

**Tools to Consider**:
- Convex Analytics
- PostHog or Mixpanel for product analytics
- Sentry for error tracking

**User Value**: Better product decisions, faster bug detection, improved reliability

**Technical Complexity**: Low-Medium - mostly instrumentation and dashboard setup

---

### 3. Email Notifications for Ideal Conditions

**Description**: Proactive alerts when conditions match user preferences

**Features**:
- Daily digest of ideal conditions
- Real-time alerts when a favorite spot becomes "epic"
- Configurable notification frequency (immediate, daily, weekly)
- Unsubscribe/preference management

**User Value**: Never miss perfect conditions at your favorite spots

**Technical Complexity**: Medium - requires notification system, scheduling, preference management

**Technical Considerations**:
- Use Convex scheduled functions for daily digests
- Consider push notifications (requires service worker setup)
- Email delivery via Resend
- Rate limiting to prevent spam

---

### 4. Custom Scoring Prompts Per User

**Description**: Allow users to customize AI scoring based on their skill level and preferences

**Features**:
- Skill level selection (beginner, intermediate, advanced, expert)
- Sport-specific preferences (e.g., longboard vs shortboard for surfing)
- Custom scoring criteria (safety-focused, performance-focused, etc.)
- Save multiple "profiles" (e.g., "teaching mode" vs "personal session")

**User Value**: More relevant AI scores tailored to individual needs

**Technical Complexity**: High - requires dynamic prompt generation, testing, and validation

**Technical Considerations**:
- Store user prompt templates in database
- Inject user preferences into AI scoring prompts
- A/B test different prompt structures
- Cache scores to avoid re-generation

---

### 5. User-Created Spots (Private/Public)

**Description**: Allow users to add their own secret spots or local knowledge

**Features**:
- Add custom spots with lat/lon
- Mark spots as private (only visible to user) or public
- Attach webcams, tide stations, and weather sources
- Rate and review spots
- Community moderation for public spots

**User Value**: Complete coverage including local/secret spots

**Technical Complexity**: High - requires spot creation UI, moderation, data sourcing

**Technical Considerations**:
- New database tables: `user_spots`, `spot_ratings`
- Data sourcing challenges (webcams, tides, forecasts for arbitrary locations)
- Moderation system to prevent spam/abuse
- Privacy controls

---

### 6. Social Features (Share Conditions)

**Description**: Share ideal conditions with friends or on social media

**Features**:
- Generate shareable links for specific spot conditions
- "Send to a friend" via email
- Social media share cards with preview
- Session tracking (e.g., "I went out at X spot today")
- Follow other users' activity
- Leaderboard (most sessions logged)

**User Value**: Community building, social proof, session tracking

**Technical Complexity**: Medium-High - requires public routes, social cards, activity tracking

**Technical Considerations**:
- Public condition routes (non-authenticated access)
- Open Graph meta tags for rich social previews
- Activity feed database schema
- Privacy controls (public vs private sessions)

---

### 7. Account Settings (Email Change, Deletion)

**Description**: Complete account management capabilities

**Features**:
- Change email address (with verification)
- Delete account (GDPR compliance)
- Export user data (GDPR compliance)
- Session management (view active sessions, revoke sessions)
- Two-factor authentication (optional)

**User Value**: Full control over account and data

**Technical Complexity**: Medium - account management flows, data deletion logic

**Technical Considerations**:
- Email change requires re-verification
- Account deletion must cascade (delete user data, sessions, preferences)
- Data export in JSON format
- GDPR compliance for EU users

---

## Prioritization Framework

When deciding which features to build, consider:

1. **User Impact**: How many users will benefit?
2. **Differentiation**: Does this make Waterman unique?
3. **Complexity**: How much effort is required?
4. **Dependencies**: What must exist first?
5. **Revenue Potential**: Could this be monetized?

**Suggested Order** (if building all features):
1. Email notifications (high impact, medium complexity)
2. Performance monitoring (low complexity, enables better decisions)
3. Custom scoring prompts (high differentiation, high complexity)
4. User preferences expansion (extends existing system)
5. Social features (requires user base first)
6. User-created spots (requires moderation system)
7. Account settings (compliance & polish)

---

## Out of Scope

Features explicitly **not** planned:

- Native iOS/Android apps (PWA is sufficient for MVP)
- Paid subscriptions (app is free)
- Third-party API access (keep data proprietary)
- Forums/discussion boards (too much moderation overhead)
- Messaging between users (privacy/safety concerns)

---

## References

- PRD 03: Email Authentication (completed)
- User feedback (to be collected)
- Competitor analysis (Surfline, Magicseaweed, Windy, etc.)

---

**Document Maintained By**: Engineering Team  
**Last Updated**: 2026-01-24  
**Status**: Living document - to be refined based on user feedback
