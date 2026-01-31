# Waterman Planning

**Last Updated**: 2026-01-31

## Upcoming PRDs

### In Progress

| PRD | Title | Status | Priority |
|-----|-------|--------|----------|
| [08](prds/08-scoring-debug-provenance.md) | Scoring Debug Page & LLM Provenance Tracking | Ready to implement | High |

### Planned

| PRD | Title | Status | Priority |
|-----|-------|--------|----------|
| - | Email Notifications for Ideal Conditions | Not started | Medium |
| - | Performance Monitoring & Analytics | Not started | Medium |

### Completed

| PRD | Title | Completed |
|-----|-------|-----------|
| [07](prds/07-personalized-scoring.md) | Personalized Scoring & User Context | 2026-01-30 |
| [06](prds/06-sunrise-sunset-filtering.md) | Sunrise/Sunset Filtering | 2026-01-28 |
| [05](prds/05-calendar-subscriptions.md) | Calendar Subscription Feature | 2026-01-27 |
| [03](prds/03-email-authentication.md) | Email-Based Magic Link Authentication | 2026-01-24 |
| [02](prds/02.md) | LLM-Based Condition Scoring System | 2026-01-20 |
| [01](prds/01.md) | Core Features & MVP | 2026-01-15 |

---

## TODOs

### Near Term (This Week)

- [ ] **Scoring Debug Page**: Implement PRD-08 to debug strange LLM scores
  - Add `scoring_logs` table for full prompt/response provenance
  - Build admin UI at `/admin/scoring-debug`
  - Integrate provenance tracking into `scoreSingleSlot` action

- [ ] **Deep Links for PWA Authentication**: Investigate iOS Universal Links
  - Requires dedicated domain (e.g., `waterman.app`)
  - Would allow magic links to open directly in PWA instead of Safari
  - See [TODO.md](TODO.md) for details

### Later (Backlog)

- [ ] **Email Notifications**: Alert users when conditions match preferences
  - Daily digest of ideal conditions
  - Real-time alerts for "epic" conditions
  - Configurable frequency

- [ ] **Performance Monitoring**: Add observability
  - Auth metrics (magic link open rate, session duration)
  - User metrics (retention, onboarding completion)
  - Technical metrics (error rates, latency)

- [ ] **Custom Scoring Profiles**: Multiple scoring profiles per user
  - "Teaching mode" vs "personal session"
  - Safety-focused vs performance-focused

- [ ] **User-Created Spots**: Allow adding private/public spots
  - Custom lat/lon
  - Attach webcams and tide stations
  - Community moderation

- [ ] **Account Settings**: Full account management
  - Change email address
  - Delete account (GDPR)
  - Export user data

- [ ] **Social Features**: Share conditions with friends
  - Shareable links
  - Session tracking
  - Activity feed

---

## Architecture Notes

See [architecture.md](architecture.md) for full system documentation.

### Key Files

- **Schema**: `convex/schema.ts`
- **Scoring**: `convex/spots.ts` (scoreSingleSlot, saveForecastSlots)
- **Prompts**: `convex/prompts.ts` (buildPrompt)
- **Admin**: `app/admin/` (admin pages)

---

## References

- [Architecture](architecture.md) - Full system documentation
- [Future Features PRD](prds/04-future-features.md) - Aspirational features list
- [TODO.md](TODO.md) - Legacy TODO list (to be merged here)
