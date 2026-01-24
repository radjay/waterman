# Product Requirements Document (PRD)

## Email-Based Magic Link Authentication

**Version:** 1.0  
**Date:** 2026-01-24  
**Status:** Draft

---

## Overview

Implement a passwordless email authentication system using magic links to enable user accounts in Waterman. This will allow users to personalize their experience by saving sport preferences, favorite spots, and eventually custom scoring criteria. Authentication will be optional—the app will continue to work for anonymous users.

---

## Goals

1. **Enable User Accounts**: Allow users to create accounts using only their email (no passwords)
2. **Personalization**: Save user preferences (favorite sports, spots) server-side
3. **Optional Authentication**: Keep the app fully functional for anonymous users
4. **Simple UX**: Magic link flow is frictionless (no password management)
5. **Foundation for Future Features**: Enable user-specific scoring prompts, notifications, etc.

---

## Non-Goals (V1)

- OAuth providers (Google, Apple, etc.)
- Password-based authentication
- Two-factor authentication (2FA)
- Email verification beyond magic link click
- User profile pictures/avatars
- Social features (sharing, following)

---

## Requirements

### 1. Authentication System

#### 1.1 Magic Link Flow

**Sign Up / Sign In Process:**

1. User enters email address on `/auth/login`
2. System checks if user exists:
   - If new: Create user account
   - If existing: Proceed with login
3. Generate secure magic link token (32 bytes, URL-safe)
4. Send email with magic link (expires in 15 minutes)
5. User clicks link in email
6. Link redirects to `/auth/verify?token=xxx`
7. System validates token:
   - Check expiry
   - Check if already used
   - Mark as used
8. Create session (expires in 30 days)
9. Redirect to home with authenticated session
10. For new users: Show onboarding flow

**Security Requirements:**

- Magic link tokens must be:
  - Cryptographically secure (32 bytes random)
  - URL-safe encoded
  - Single-use only
  - Expire after 15 minutes
- Sessions must:
  - Use secure random tokens
  - Expire after 30 days of inactivity
  - Be invalidated on logout
- Rate limiting:
  - Max 3 magic link requests per email per hour
  - Prevent brute force attacks on token verification

#### 1.2 Session Management

**Session Requirements:**

- Store session token in localStorage (client-side)
- Include session token in all authenticated requests
- Auto-refresh user data on app load
- Handle session expiry gracefully (redirect to login)
- Clear session on logout

**Session Data:**

- `sessionToken`: Unique identifier
- `userId`: Reference to user
- `expiresAt`: Expiry timestamp (30 days)
- `lastActivityAt`: Last activity timestamp
- `createdAt`: Creation timestamp

### 2. Database Schema

#### 2.1 New Tables

**`users` Table:**

```typescript
users: defineTable({
  email: v.string(),
  name: v.optional(v.string()),
  emailVerified: v.boolean(), // True after first magic link use
  onboardingCompleted: v.boolean(), // True after completing onboarding
  favoriteSpots: v.optional(v.array(v.id("spots"))),
  favoriteSports: v.optional(v.array(v.string())),
  createdAt: v.number(),
  lastLoginAt: v.optional(v.number()),
})
  .index("by_email", ["email"]);
```

**`magic_links` Table:**

```typescript
magic_links: defineTable({
  userId: v.id("users"),
  email: v.string(),
  token: v.string(), // Secure random token
  expiresAt: v.number(), // Timestamp (15 min from creation)
  used: v.boolean(),
  usedAt: v.optional(v.number()),
  createdAt: v.number(),
})
  .index("by_token", ["token"])
  .index("by_email", ["email"]);
```

**`sessions` Table:**

```typescript
sessions: defineTable({
  userId: v.id("users"),
  token: v.string(), // Secure random session token
  expiresAt: v.number(), // Timestamp (30 days from creation)
  lastActivityAt: v.number(),
  createdAt: v.number(),
})
  .index("by_token", ["token"])
  .index("by_user", ["userId"]);
```

#### 2.2 Schema Modifications

**Existing Tables:**

- `scoring_prompts`: Already has `userId` field ✓
- `condition_scores`: Already has `userId` field ✓
- No changes needed for V1

**Future Considerations:**

- Add `userId` to `spots` table for user-created spots (V2)
- Add user preferences table for additional settings (V2)

### 3. Backend Functions (Convex)

#### 3.1 Authentication Functions

**New File: `convex/auth.ts`**

**Public Mutations:**

1. **`requestMagicLink`**
   - Args: `{ email: v.string() }`
   - Returns: `{ success: boolean, message: string }`
   - Logic:
     - Validate email format
     - Rate limit check (max 3 per hour per email)
     - Check if user exists, create if not
     - Generate secure token
     - Create magic_link record
     - Schedule email action
     - Return success message

2. **`verifyMagicLink`**
   - Args: `{ token: v.string() }`
   - Returns: `{ success: boolean, sessionToken?: string, userId?: Id<"users">, needsOnboarding?: boolean, error?: string }`
   - Logic:
     - Look up magic link by token
     - Validate expiry and usage
     - Mark link as used
     - Create session (30 days)
     - Update user lastLoginAt
     - Check if user needs onboarding
     - Return session token

3. **`logout`**
   - Args: `{ sessionToken: v.string() }`
   - Returns: `{ success: boolean }`
   - Logic:
     - Delete session record
     - Return success

4. **`completeOnboarding`**
   - Args: `{ sessionToken: v.string(), favoriteSpots: v.array(v.id("spots")), favoriteSports: v.array(v.string()), name: v.optional(v.string()) }`
   - Returns: `{ success: boolean }`
   - Logic:
     - Verify session
     - Update user preferences
     - Mark onboarding as completed
     - Return success

**Public Queries:**

1. **`verifySession`**
   - Args: `{ sessionToken: v.string() }`
   - Returns: `{ valid: boolean, userId?: Id<"users"> }`
   - Logic:
     - Look up session by token
     - Check expiry
     - Update lastActivityAt
     - Return validation result

2. **`getCurrentUser`**
   - Args: `{ sessionToken: v.string() }`
   - Returns: User object or null
   - Logic:
     - Verify session
     - Return user data (excluding sensitive fields)

**Internal Actions:**

1. **`sendMagicLinkEmail`**
   - Args: `{ email: v.string(), token: v.string(), userId: v.id("users") }`
   - Returns: `{ success: boolean }`
   - Logic:
     - Call Resend API
     - Send email with magic link
     - Handle errors gracefully
     - Log delivery status

**Helper Functions:**

- `generateToken()`: Generate secure random token (32 bytes)
- `isValidEmail(email: string)`: Validate email format
- `cleanupExpiredLinks()`: Scheduled cron to delete expired magic links (runs daily)
- `cleanupExpiredSessions()`: Scheduled cron to delete expired sessions (runs daily)

### 4. Email Integration (Resend)

#### 4.1 Email Service

**Provider**: Resend.com (already have account)

**Configuration:**

- API Key: `RESEND_API_KEY` environment variable (in Convex)
- From Address: `noreply@waterman.app` (or configured domain)
- Package: `resend` npm package

**Email Template:**

```
Subject: Sign in to Waterman

Hi there,

Click the link below to sign in to Waterman:

[Sign In to Waterman]
{APP_URL}/auth/verify?token={TOKEN}

This link will expire in 15 minutes and can only be used once.

If you didn't request this email, you can safely ignore it.

---
Waterman - Your Watersports Forecast Companion
```

#### 4.2 Error Handling

- Retry failed sends (3 attempts with exponential backoff)
- Log all email delivery failures
- Handle rate limiting from Resend
- Graceful degradation (show error to user if email fails)

### 5. Frontend Implementation

#### 5.1 New Components

**`components/auth/EmailLoginForm.js`:**

- Email input with validation
- Submit button with loading state
- Error/success messages
- Responsive design
- Accessibility (ARIA labels, keyboard navigation)

**`components/auth/MagicLinkSent.js`:**

- Confirmation screen
- Instructions to check email
- Resend link option (with rate limiting feedback)
- Email support link

**`components/auth/VerifyingMagicLink.js`:**

- Loading spinner while verifying token
- Error handling (expired, invalid, already used)
- Redirect on success

**`components/auth/UserMenu.js`:**

- Display user email/name
- Dropdown menu with:
  - Profile link (future)
  - Logout button
- Avatar placeholder (initials)
- Accessible dropdown (keyboard navigation)

**`components/auth/AuthProvider.js`:**

- React Context for auth state
- Provides: `useAuth()` hook
- Manages session token
- Auto-loads user on mount
- Handles session expiry

**`components/auth/OnboardingFlow.js`:**

- Multi-step wizard:
  1. Welcome screen
  2. Select favorite sports (multi-select)
  3. Select favorite spots (searchable, multi-select)
  4. Optional: Enter name
  5. Complete
- Progress indicator
- Skip option (can complete later)
- Responsive design

#### 5.2 New Pages

**`app/auth/login/page.js`:**

- Login form
- Clean, minimal design
- Redirect authenticated users to home

**`app/auth/verify/page.js`:**

- Handles magic link verification
- Reads token from URL query param
- Shows loading state
- Redirects on success
- Shows errors with retry option

**`app/profile/page.js`** (V2):

- User profile management
- Update name, email
- Manage favorite sports/spots
- Custom scoring prompts (future)
- Account deletion (future)

#### 5.3 Layout Updates

**`app/layout.js`:**

- Wrap app with `<AuthProvider>`
- Make auth state available globally

**`components/layout/Header.js`:**

- Add UserMenu for authenticated users
- Add "Sign In" button for anonymous users
- Responsive placement

### 6. User Experience Flows

#### 6.1 Anonymous User Experience

- Full app functionality (no restrictions)
- Sport preferences saved to localStorage
- Banner: "Sign in to save your preferences across devices"
- Sign in button visible in header

#### 6.2 Authenticated User Experience

**First-Time User (New Account):**

1. Enter email on login page
2. Receive magic link email
3. Click magic link
4. Complete onboarding flow:
   - Select favorite sports
   - Select favorite spots
   - Optionally add name
5. Redirected to home with personalized view

**Returning User:**

1. Enter email on login page
2. Receive magic link email
3. Click magic link
4. Redirected to home
5. Previous preferences loaded from server

**Personalized Features:**

- Favorite spots shown first in feed
- Favorite sports pre-selected
- User menu in header shows email/name
- Preferences synced across devices

#### 6.3 Onboarding Flow Details

**Step 1: Welcome**

- Title: "Welcome to Waterman!"
- Description: "Let's personalize your experience to show you the best conditions"
- Button: "Get Started"

**Step 2: Favorite Sports**

- Title: "What sports do you love?"
- Multi-select checkboxes: Wingfoiling, Surfing
- Minimum 1 selection required
- Button: "Continue"

**Step 3: Favorite Spots**

- Title: "Select your favorite spots"
- Searchable list grouped by region
- Multi-select checkboxes
- Optional (can skip)
- Button: "Continue"

**Step 4: Name (Optional)**

- Title: "What should we call you?"
- Text input for name
- Optional (can skip)
- Button: "Complete Setup"

**Step 5: Complete**

- Title: "You're all set!"
- Description: "Start exploring the best conditions for your favorite spots"
- Button: "Start Exploring" (redirects to home)

### 7. Integration with Existing Features

#### 7.1 Sport Selection

**Anonymous Users:**

- Sport selection saved to localStorage (current behavior)
- Works as before

**Authenticated Users:**

- Sport selection saved to user profile (server-side)
- Synced across devices
- Falls back to localStorage if not authenticated

**Implementation:**

- Update `SportSelector` component to:
  - Check if user is authenticated
  - If yes: Save to server via mutation
  - If no: Save to localStorage
  - Load from server on mount if authenticated

#### 7.2 Favorite Spots

**Display Priority:**

- Authenticated users see favorite spots first
- Remaining spots shown after favorites
- Clear visual separator

**Implementation:**

- Update spot query to:
  - Accept optional `userId` parameter
  - Return favorite spots first if user authenticated
  - Use existing ordering for anonymous users

#### 7.3 Admin System

**Separation:**

- Keep existing admin auth completely separate
- Admin login stays at `/admin/login`
- User login at `/auth/login`
- No overlap between systems
- Different session management

### 8. Environment Variables

**New Variables:**

```bash
# Resend API (for sending magic link emails)
RESEND_API_KEY=re_xxxxx

# App URL (for magic link generation)
NEXT_PUBLIC_APP_URL=https://waterman.app

# Magic link expiry (minutes)
MAGIC_LINK_EXPIRY_MINUTES=15

# Session expiry (days)
SESSION_EXPIRY_DAYS=30
```

**Storage Locations:**

- Convex: `RESEND_API_KEY` (used in actions)
- Next.js: `NEXT_PUBLIC_APP_URL` (public variable)
- Other config can be hardcoded or in Convex

---

## Technical Implementation Plan

### Phase 1: Core Authentication (MVP)

**Week 1: Backend Infrastructure**

1. Database schema updates:
   - Add `users`, `magic_links`, `sessions` tables
   - Add indexes
   - Test schema in development

2. Auth functions implementation:
   - Create `convex/auth.ts`
   - Implement `requestMagicLink` mutation
   - Implement `verifyMagicLink` mutation
   - Implement session queries
   - Add helper functions

3. Email integration:
   - Set up Resend account/API key
   - Implement `sendMagicLinkEmail` action
   - Create email template
   - Test email delivery

**Week 2: Frontend Components**

1. Auth components:
   - Create `AuthProvider` with context
   - Create `EmailLoginForm` component
   - Create `MagicLinkSent` component
   - Create `VerifyingMagicLink` component
   - Create `UserMenu` component

2. Auth pages:
   - Create `/auth/login` page
   - Create `/auth/verify` page
   - Add routing

3. Onboarding flow:
   - Create `OnboardingFlow` component
   - Implement multi-step wizard
   - Add sport/spot selection
   - Test complete flow

**Week 3: Integration & Testing**

1. Layout integration:
   - Update `app/layout.js` with AuthProvider
   - Update `Header.js` with UserMenu/Sign In button
   - Test responsive design

2. Preference persistence:
   - Update `SportSelector` to save to server
   - Implement favorite spots ordering
   - Test sync across devices

3. Testing:
   - End-to-end auth flow
   - Magic link expiry
   - Session management
   - Onboarding completion
   - Anonymous → authenticated transition
   - Error handling

4. Documentation:
   - Update README with auth setup
   - Document API functions
   - Add troubleshooting guide

### Phase 2: Polish & Optimization (Post-MVP)

1. Rate limiting improvements ✅
2. Better error messages ✅
3. Profile page (basic) ✅

### Phase 3: Advanced Features (Future)

1. User preferences expansion (advanced settings, custom thresholds, etc.)
2. Performance monitoring and analytics
3. Email notifications for ideal conditions
4. Custom scoring prompts per user
5. User-created spots (private/public)
6. Social features (share conditions)
7. Account settings (email change, deletion)

---

## Success Criteria

### MVP Success Metrics

- ✅ Users can sign up with email
- ✅ Magic links delivered within 5 seconds
- ✅ Magic link success rate > 95%
- ✅ Sessions persist across page reloads
- ✅ Onboarding completion rate > 60%
- ✅ Zero security vulnerabilities
- ✅ App works for both authenticated and anonymous users
- ✅ Sport preferences sync across devices for authenticated users

### Post-MVP Metrics

- User signup rate: Track daily signups
- Retention rate: % of users who return within 7 days
- Onboarding completion: % of users who finish onboarding
- Favorite spots usage: % of users with >0 favorite spots
- Session duration: Average time per session
- Email delivery rate: % of magic links successfully delivered

---

## Testing Strategy

### Unit Tests

- Token generation (secure, unique)
- Email validation
- Session expiry logic
- Onboarding state management

### Integration Tests

1. **Magic Link Flow:**
   - Request magic link
   - Verify email sent
   - Click magic link
   - Verify session created
   - Test expiry handling

2. **Session Management:**
   - Session creation
   - Session validation
   - Session expiry
   - Logout flow

3. **Onboarding:**
   - Complete flow
   - Skip steps
   - Resume after interruption

### Manual Testing

- Test on multiple browsers (Chrome, Safari, Firefox)
- Test on mobile devices (iOS, Android)
- Test email delivery (Gmail, Outlook, etc.)
- Test rate limiting
- Test expired links
- Test concurrent sessions

---

## Security Considerations

### 1. Token Security

**Magic Link Tokens:**

- Cryptographically secure (crypto.randomBytes)
- 32 bytes minimum
- URL-safe encoding (base64url)
- Single-use only
- Short expiry (15 minutes)
- Cannot be guessed or enumerated

**Session Tokens:**

- Same security requirements as magic links
- Longer expiry (30 days)
- Invalidated on logout
- One token per session

### 2. Rate Limiting

**Magic Link Requests:**

- Max 3 requests per email per hour
- Prevents email flooding
- Clear error messages
- Consider CAPTCHA if abuse occurs

**Token Verification:**

- Max 5 attempts per token
- Prevents brute force
- Lock out after failed attempts

### 3. Data Privacy

**User Data Storage:**

- Store minimum required data
- No passwords stored (passwordless)
- Email is only sensitive data
- Clear data retention policy

**GDPR Compliance:**

- Privacy policy update required
- User data export (future)
- Account deletion (future)
- Cookie consent (sessions use localStorage for now)

### 4. Email Security

**Anti-Phishing:**

- Clear sender identity
- Consistent branding
- Link destination visible
- Warning about expiry

**SPF/DKIM:**

- Configure for custom domain
- Reduces spam classification
- Improves deliverability

---

## Risks & Mitigations

### Risk 1: Email Delivery Failures

**Impact**: High - Users cannot authenticate

**Mitigations:**

- Use reliable service (Resend)
- Implement retry logic
- Show clear error messages
- Provide support email
- Monitor delivery rate

### Risk 2: Magic Link Expiry UX

**Impact**: Medium - User frustration

**Mitigations:**

- Clear expiry message in email
- Easy resend flow
- 15-minute window (reasonable)
- Instructions on login page

### Risk 3: Session Token Security

**Impact**: High - Account takeover risk

**Mitigations:**

- Secure token generation
- Short expiry (30 days)
- HTTPS only (enforce in production)
- Consider HTTP-only cookies (V2)

### Risk 4: User Confusion (Anonymous vs Authenticated)

**Impact**: Low - May not understand benefits

**Mitigations:**

- Clear messaging about benefits
- Prominent sign-in button
- Banner for anonymous users
- Onboarding explains value

### Risk 5: Spam/Abuse

**Impact**: Medium - Magic link flooding

**Mitigations:**

- Rate limiting (3/hour)
- Monitor abuse patterns
- CAPTCHA if needed
- Block disposable emails (optional)

---

## Cost Estimates

### Email Service (Resend)

**Free Tier:**

- 100 emails/day = ~3,000 emails/month
- Sufficient for initial rollout
- $0/month

**Paid Tier (if needed):**

- $20/month for 50,000 emails
- Needed at ~100 signups/day

### Infrastructure

**Convex:**

- Additional tables/functions within existing plan
- Minimal additional cost
- ~$0/month increase

### Total Additional Cost

- **Initial**: $0/month
- **At scale**: $20/month (if >100 signups/day)

---

## Open Questions & Decisions

### 1. Should auth be required or optional?

**Decision**: Optional. App works fully for anonymous users.

**Rationale**: Lower barrier to entry, users can try before signing up.

### 2. Should we support "name" field during signup?

**Decision**: Yes, but optional. Can be added during onboarding or later in profile.

**Rationale**: Personalization improves UX, but don't block signup on it.

### 3. Should we show a different experience for authenticated users?

**Decision**: Yes, with onboarding flow for new users.

**Features**:

- Favorite sports pre-selected
- Favorite spots shown first
- User menu in header
- Onboarding wizard for new users

**Rationale**: Demonstrate value of authentication immediately.

### 4. Should we migrate existing admin auth to this system?

**Decision**: No, keep admin separate for now.

**Rationale**: Different security requirements, simpler to maintain separately.

### 5. Email delivery service preference?

**Decision**: Resend (already have account).

**Rationale**: Simple API, excellent DX, already set up.

### 6. Should we use HTTP-only cookies or localStorage for sessions?

**Decision**: localStorage for V1, consider HTTP-only cookies for V2.

**Rationale**: Simpler implementation for MVP, cookies more secure for production.

---

## Dependencies

### External Services

- Resend API (email delivery)
- Convex (database and backend)

### Technical Dependencies

- `resend` npm package (email)
- React Context (auth state)
- Next.js routing (auth pages)
- Convex mutations/queries/actions

### Internal Dependencies

- Existing user experience must not break
- Admin system remains independent
- Sport selection mechanism needs update

---

## Future Enhancements (Post-V1)

### User Features

1. **Profile Management**
   - Edit name, email
   - Delete account
   - Export data (GDPR)

2. **Email Notifications**
   - Notify when ideal conditions forecasted
   - Customize notification frequency
   - Email preferences

3. **Custom Scoring Prompts**
   - User-specific LLM prompts
   - Override default spot criteria
   - Test prompts on historical data

4. **Social Features**
   - Share conditions with friends
   - Public/private spot reviews
   - Session reports

5. **Advanced Preferences**
   - Units (knots vs m/s, feet vs meters)
   - Timezone preferences
   - Display preferences

### Technical Improvements

1. **HTTP-Only Cookies**
   - More secure than localStorage
   - Requires server-side session management

2. **Remember Me**
   - Longer sessions (90 days)
   - Optional during login

3. **Email Verification Badge**
   - Show verified status
   - Build trust

4. **OAuth Integration**
   - Google Sign-In
   - Apple Sign-In
   - Optional alternative to magic links

---

## Migration Strategy

### No Breaking Changes

- Existing app continues to work unchanged
- Anonymous users unaffected
- Admin system unaffected
- LocalStorage preferences still work

### Gradual Rollout

1. **Phase 1**: Deploy auth system (optional)
2. **Phase 2**: Monitor usage, fix issues
3. **Phase 3**: Add personalization features
4. **Phase 4**: Encourage signups with feature promotions

### Data Migration

**No migration needed:**

- New tables don't affect existing data
- Anonymous preferences stay in localStorage
- No data loss

---

## Documentation Requirements

### User-Facing

- How to sign up/sign in
- What are magic links?
- Privacy policy update
- Terms of service update

### Developer-Facing

- API documentation for auth functions
- Integration guide for new features
- Testing guide
- Troubleshooting guide

---

## Monitoring & Observability

### Metrics to Track

**Authentication Metrics:**

- Magic link requests per day
- Magic link success rate (clicked / sent)
- Session creation rate
- Average session duration
- Logout rate

**User Metrics:**

- New signups per day
- Returning users (7-day, 30-day)
- Onboarding completion rate
- Favorite spots per user (avg)
- Favorite sports per user (avg)

**Technical Metrics:**

- Email delivery latency
- Email delivery success rate
- Token generation time
- Session validation time
- Error rates

### Alerts

- Email delivery rate < 90%
- Magic link expiry rate > 30%
- Session errors spike
- Auth failures spike

### Logging

- Log all auth events (signup, login, logout)
- Log email delivery status
- Log failed authentication attempts
- Log rate limit triggers

---

## References

- [Resend API Documentation](https://resend.com/docs)
- [Convex Authentication Guide](https://docs.convex.dev/auth)
- [Magic Links Best Practices](https://workos.com/blog/a-guide-to-magic-links)
- Existing admin auth: `convex/admin.ts`, `app/admin/login/page.js`

---

**Document Maintained By**: Engineering Team  
**Last Updated**: 2026-01-24  
**Next Review**: After Phase 1 completion
