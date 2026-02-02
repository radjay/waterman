# Waterman Planning

**Last Updated**: 2026-02-02

## Upcoming PRDs

### In Progress

| PRD | Title | Status | Priority |
|-----|-------|--------|----------|
| [09](prds/09-session-journal.md) | Session Journal - Watersports Logbook | Draft | Medium |

### Planned

| PRD | Title | Status | Priority |
|-----|-------|--------|----------|
| - | Email Notifications for Ideal Conditions | Not started | Medium |
| - | Performance Monitoring & Analytics | Not started | Medium |

### Completed

| PRD | Title | Completed |
|-----|-------|-----------|
| [08](prds/08-scoring-debug-provenance.md) | Scoring Debug Page & LLM Provenance Tracking | 2026-01-31 |
| [07](prds/07-personalized-scoring.md) | Personalized Scoring & User Context | 2026-01-30 |
| [06](prds/06-sunrise-sunset-filtering.md) | Sunrise/Sunset Filtering | 2026-01-28 |
| [05](prds/05-calendar-subscriptions.md) | Calendar Subscription Feature | 2026-01-27 |
| [03](prds/03-email-authentication.md) | Email-Based Magic Link Authentication | 2026-01-24 |
| [02](prds/02.md) | LLM-Based Condition Scoring System | 2026-01-20 |
| [01](prds/01.md) | Core Features & MVP | 2026-01-15 |

---

## TODOs

### Bugs

(none)

### Near Term (This Week)

- [ ] **Deep Links for PWA Authentication**: Investigate iOS Universal Links
  - Requires dedicated domain (e.g., `waterman.app`)
  - Would allow magic links to open directly in PWA instead of Safari
  - Requirements:
    - Apple App Site Association file (`.well-known/apple-app-site-association`)
    - Android Digital Asset Links file (`.well-known/assetlinks.json`)
    - Configure domain with proper certificates
  - Blocked: Need dedicated domain (currently using waterman.radx.dev subdomain)
  - Related: Auth PRD, session token transfer is current workaround

### Later (Backlog)



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
