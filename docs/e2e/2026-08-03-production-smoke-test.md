# Production smoke test — 2026-08-03

## Scope and environment

- **Target:** `https://watermanreport.com`
- **Browser:** ChatGPT in-app Browser, anonymous profile
- **Observed frontend title:** `Waterman`
- **Observed Convex deployment:** `https://adorable-anteater-323.convex.cloud`
- **Test account:** `jay@seghers.com`
- **Intent:** exercise anonymous onboarding and begin the email magic-link/six-digit-code authentication flow. Authenticated routes remain blocked until email delivery is restored.
- **Production changes caused by the test:** anonymous preferences were saved in the test browser; the auth mutation created or reused the test user and inserted unused magic-link records. No session was created.

Do not treat this as full application sign-off. It is the first production smoke-test checkpoint and ended at a confirmed email-provider failure.

## Executive result

The public dashboard and anonymous onboarding flow worked through completion. The login UI accepted the test email and displayed “Check your email,” but no email arrived.

Production Convex logs establish the direct cause: `auth:sendMagicLinkEmail` called Resend and received HTTP `401` with `validation_error: API key is invalid`. The same failure was recorded for requests at `2026-08-03T17:52:13Z` and `2026-08-03T17:53:29Z`.

The browser reports success because `auth.requestMagicLink` only inserts the database record and schedules `internal.auth.sendMagicLinkEmail`. It returns `{ success: true }` before the scheduled action runs, so a missing, revoked, or invalid Resend key is invisible to the user.

**Status:** blocked at authentication until `RESEND_API_KEY` is rotated or corrected in the live Convex deployment.

## Steps exercised

| Step | Expected | Observed | Result |
| --- | --- | --- | --- |
| Open `/dashboard` anonymously | Public dashboard renders | Dashboard rendered with navigation, current conditions, upcoming forecasts, sign-in control, and onboarding overlay | Pass |
| Select a sport | Selection becomes active and enables Continue | Selected `Wingfoiling`; Continue changed from disabled to enabled | Pass |
| Select a country | Country selection enables Continue | Selected `Portugal`; Continue became enabled | Pass |
| Select a favorite spot | Selection is reflected and onboarding can continue | Selected `Praia do CDS`; UI reported “1 selected” and exposed Continue | Pass |
| Complete anonymous onboarding | Preferences saved locally; account prompt appears | “You're all set” displayed with “Preferences saved locally” and Create account/Maybe later choices | Pass |
| Open account creation | Email login route renders | Navigated to `/auth/login`; email form rendered | Pass |
| Submit `jay@seghers.com` | Email request is accepted and a sign-in email is delivered | UI transitioned through `Sending...` to “Check your email” | Partial: request accepted, delivery failed |
| Open fallback code entry | Six-digit form appears | “Enter Code” screen rendered with numeric input and disabled Sign In until six digits | Pass |
| Receive magic link/code | Resend accepts message and recipient receives it | No message arrived; live backend logged Resend 401 invalid API key | Fail / blocker |

## Browser and backend evidence

### Browser state

No client-side error or warning was captured. After submission, the browser showed:

- “Check your email”;
- the exact submitted address;
- “Enter code instead”;
- “Try again.”

The fallback screen correctly showed a six-digit code field. This confirms the frontend considers the request successful and cannot currently observe delivery outcome.

### Convex execution

The relevant production sequence was:

1. `auth:requestMagicLink` completed successfully as a mutation.
2. The scheduler invoked `auth:sendMagicLinkEmail`.
3. The action called `https://api.resend.com/emails`.
4. Resend returned HTTP `401` with `API key is invalid`.
5. The action caught the provider failure and returned `{ success: false }`.
6. Nothing propagated that failure back to the already-completed browser mutation.

This exactly matches the control flow in `convex/auth.ts`: the mutation writes a `magic_links` row, schedules delivery with `ctx.scheduler.runAfter(0, ...)`, and immediately returns a success message. The internal action logs provider failure but does not update a durable delivery status.

## Operational repair

Do not use “Try again” until the credential is fixed. Each failed request still writes a magic-link record and counts toward the per-email limit of three requests per hour.

1. Sign in to the Resend account that owns Waterman's sending configuration.
2. Create a new sending API key or identify the intended active key. Do not send the key through chat or commit it to this repository.
3. In the Convex dashboard, open deployment `adorable-anteater-323` and replace the `RESEND_API_KEY` environment variable.
4. Confirm the sender used by the deployed function—`Waterman <waterman@radx.dev>`—belongs to a verified Resend domain. Credential repair is the confirmed blocker; sender verification is a separate validation before declaring deliverability healthy.
5. Re-run one login request after the current rate-limit window if necessary.
6. Verify the Convex action log contains `Magic link email sent` and a Resend email ID rather than a 401.
7. Verify Resend marks the message delivered, then complete both paths:
   - click the magic link;
   - request a fresh email and enter its six-digit code.
8. Continue the authenticated E2E matrix: synced preferences, profile, personalized report, calendar, journal create/edit/delete, logout, and session restoration.

## Product defect: false delivery success

Credential rotation restores service but does not fix the misleading behavior. A future invalid, expired, revoked, rate-limited, or rejected provider request will produce the same false success state.

Recommended design:

1. Split issuance into explicit states such as `queued`, `sent`, and `failed`.
2. Persist delivery status and a safe error category on the magic-link request; never store the API key or raw provider secrets.
3. Either send synchronously from an action and return the actual provider outcome, or let the browser observe the queued job until it reaches `sent`/`failed`.
4. Only display “We sent a sign-in link” after Resend accepts the message. While queued, use “Preparing your sign-in email.”
5. Surface a retryable error when delivery fails and do not consume the normal user rate-limit budget for infrastructure failures.
6. Alert on provider authentication failures and on sustained delivery failure rate.
7. Add verification-attempt rate limiting for the six-digit code path.

## Regression coverage needed

- Unit test: missing `RESEND_API_KEY` produces a user-visible delivery failure.
- Unit test: provider 401/429/5xx responses map to safe, distinct failure categories.
- Backend test: failed delivery does not claim `sent` and does not permanently consume a normal request slot.
- Component test: queued, sent, failed, retry, and rate-limited states render accurately.
- Browser test with a mail sink: request email, retrieve code/link, verify code, verify link, and establish a session.
- Production smoke check: observe a real Resend message ID and delivery event before declaring auth healthy.

## Additional observations from this run

- The anonymous onboarding controls had coherent disabled/enabled behavior for the tested happy path.
- The application creates or reuses the user and creates a magic-link row before delivery succeeds. Failed delivery can therefore leave an unverified account and multiple unused tokens.
- “Create account” and “Sign In” converge on the same passwordless email flow; this is functionally acceptable but should be made explicit in product copy and tests.
- The live dashboard's Convex logs also emitted near-limit warnings for `spots:getDashboardData` (approximately 30,344 documents and 15.8 MB read in one execution). This was not the auth blocker, but it independently corroborates the repository audit's scale/read-risk findings.

## Resume point

The live browser is parked on `/auth/login` at the six-digit code entry screen. The current code cannot arrive because its corresponding email action failed. After rotating the Resend key, return to the email-request step and generate a fresh code; do not attempt to use one of the failed-delivery records.
