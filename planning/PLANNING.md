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

### Bugs

- [ ] **Personalized Scores Switch Mobile Rendering**
  - The toggle switch looks like a radio button on mobile
  - Creates confusing UX where users may not understand it's a toggle
  - Location: Forecast/settings components where personalized scoring toggle lives

- [ ] **Personalized Scoring Toggle Doesn't Update Without Refresh**
  - When toggling personalized scoring on/off and navigating back to reports page, scores don't update
  - User must fully refresh the page to see updated scores
  - Likely a caching/reactivity issue with score fetching

### Near Term (This Week)

- [ ] **Show Score ID on Score Cards**
  - Display the score ID in very faint grey text on score displays
  - Helps with debugging specific scoring issues
  - Should be subtle/unobtrusive

- [ ] **Update Score Reasoning Tone to Surf Speak**
  - Current reasoning text sounds too formal/boring
  - Should sound more like natural surf speak (not over the top though)
  - Update prompts to guide LLM toward more casual, surf-appropriate language

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
