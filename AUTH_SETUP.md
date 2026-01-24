# Email Authentication Setup Guide

This guide explains how to set up email-based magic link authentication for Waterman.

## Prerequisites

- Convex account and project
- Resend account (already have one)
- Next.js environment configured

## Environment Variables

### Required Environment Variables

#### 1. Convex Environment Variables

Set these in your Convex dashboard (https://dashboard.convex.dev):

```bash
# Resend API Key for sending magic link emails
RESEND_API_KEY=re_xxxxx

# App URL for generating magic links (production)
NEXT_PUBLIC_APP_URL=https://waterman.app
```

**How to set in Convex:**
1. Go to your Convex dashboard
2. Select your project
3. Navigate to Settings → Environment Variables
4. Add `RESEND_API_KEY` with your Resend API key
5. The `NEXT_PUBLIC_APP_URL` should be set in your Next.js environment (see below)

#### 2. Next.js Environment Variables

Create a `.env.local` file (for local development):

```bash
# Convex deployment URL (already configured)
NEXT_PUBLIC_CONVEX_URL=https://your-deployment.convex.cloud

# App URL for magic links (local development)
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

For production (Render.com), set these in your Render dashboard:

```bash
NEXT_PUBLIC_CONVEX_URL=https://your-deployment.convex.cloud
NEXT_PUBLIC_APP_URL=https://waterman.app
```

### Optional Configuration

These are hardcoded in `convex/auth.ts` but can be moved to environment variables if needed:

- `MAGIC_LINK_EXPIRY_MINUTES=15` (magic link expiry time)
- `SESSION_EXPIRY_DAYS=30` (session expiry time)
- `MAX_MAGIC_LINKS_PER_HOUR=3` (rate limiting)

## Resend Setup

### 1. Get Your Resend API Key

1. Log in to Resend: https://resend.com
2. Navigate to API Keys
3. Create a new API key (or use existing)
4. Copy the key (starts with `re_`)

### 2. Configure Sending Domain (Optional but Recommended)

For better email deliverability:

1. Add your domain in Resend dashboard
2. Configure DNS records (SPF, DKIM)
3. Verify domain
4. Update the `from` field in `convex/auth.ts`:

```typescript
from: "Waterman <noreply@yourdomain.com>",
```

Currently using:
```typescript
from: "Waterman <noreply@waterman.app>",
```

## Database Schema

The authentication system uses these Convex tables:

- `users` - User accounts
- `magic_links` - Temporary magic links (auto-cleaned up)
- `sessions` - Active user sessions (auto-cleaned up)

These are automatically created when you deploy your Convex schema.

## Deployment Steps

### 1. Deploy Convex Schema and Functions

```bash
# Deploy to Convex
npx convex deploy

# This will:
# - Create/update database tables (users, magic_links, sessions)
# - Deploy auth functions (convex/auth.ts)
# - Set up cron jobs for cleanup
```

### 2. Set Environment Variables

**In Convex Dashboard:**
- Add `RESEND_API_KEY`

**In Render Dashboard** (or your deployment platform):
- Add `NEXT_PUBLIC_APP_URL`
- Ensure `NEXT_PUBLIC_CONVEX_URL` is set

### 3. Deploy Next.js App

```bash
# Build and deploy your Next.js app
npm run build

# Or deploy via Render (automatic if using Render)
```

### 4. Test the Flow

1. Visit `/auth/login`
2. Enter your email
3. Check your email for the magic link
4. Click the magic link
5. Complete onboarding (if new user)
6. You should be signed in!

## Cron Jobs

The system automatically schedules cleanup jobs:

- **Expired Magic Links**: Cleaned daily at 3:00 AM UTC
- **Expired Sessions**: Cleaned daily at 3:30 AM UTC

These are configured in `convex/crons.ts` and run automatically.

## Security Notes

### Magic Link Tokens

- Generated using `crypto.randomBytes(32)` (256 bits of entropy)
- URL-safe base64 encoded
- Single-use only
- Expire after 15 minutes
- Cannot be reused or guessed

### Session Tokens

- Same security as magic links
- Expire after 30 days of inactivity
- Stored in localStorage (client-side)
- Can be invalidated via logout

### Rate Limiting

- Max 3 magic link requests per email per hour
- Prevents email flooding/spam

### Future Improvements

For production, consider:

1. **HTTP-only cookies** instead of localStorage for session tokens
2. **CAPTCHA** for magic link requests if abuse occurs
3. **IP-based rate limiting** for additional security
4. **Email domain blocklist** to prevent disposable email services

## Troubleshooting

### Emails Not Arriving

1. Check Resend dashboard for delivery logs
2. Verify `RESEND_API_KEY` is set correctly in Convex
3. Check spam folder
4. Verify domain is configured (if using custom domain)
5. Check Convex logs for errors:
   ```bash
   npx convex logs
   ```

### Magic Link Expired

- Links expire after 15 minutes
- User needs to request a new link
- Check system time is synced correctly

### Session Not Persisting

- Check localStorage is enabled in browser
- Verify `NEXT_PUBLIC_CONVEX_URL` is correct
- Check browser console for errors
- Try clearing localStorage and signing in again

### Onboarding Not Showing

- Check user's `onboardingCompleted` field in database
- Verify `completeOnboarding` mutation is working
- Check browser console for errors

## API Reference

### Public Mutations

- `auth.requestMagicLink` - Request a magic link
- `auth.verifyMagicLink` - Verify token and create session
- `auth.completeOnboarding` - Save user preferences
- `auth.logout` - Invalidate session

### Public Queries

- `auth.verifySession` - Check if session is valid
- `auth.getCurrentUser` - Get current user data

### Internal Actions

- `auth.sendMagicLinkEmail` - Send email via Resend
- `auth.cleanupExpiredMagicLinks` - Cleanup job (cron)
- `auth.cleanupExpiredSessions` - Cleanup job (cron)

## Support

For issues or questions:

1. Check Convex logs: `npx convex logs`
2. Check browser console for client-side errors
3. Review Resend delivery logs
4. Check this documentation

## Next Steps (Post-MVP)

- [ ] Add profile page for user settings
- [ ] Implement email notifications for ideal conditions
- [ ] Add user-specific scoring prompts
- [ ] Support custom preferences beyond favorites
- [ ] Add social features (share conditions)
- [ ] Implement account deletion
- [ ] Add email preferences/unsubscribe
