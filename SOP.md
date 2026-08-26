# Standard Operating Procedures (SOPs)

This document outlines the standard procedures for maintaining and deploying the Waterman application.

## SOP-001: Running Database Migrations

**When:** Whenever you need to update the database schema or data.

**Procedure:**

1. **Create Manual Backup**
   - Go to https://dashboard.convex.dev/
   - Select your project → Settings → Backups
   - Click "Create Backup" to snapshot the current state
   - Wait for backup to complete

2. **Run Migration Script**
   ```bash
   node scripts/runMigration.mjs <migration:function>
   ```
   Example:
   ```bash
   node scripts/runMigration.mjs addKitesurfing:addKitesurfingToSpots
   ```

3. **Verify Migration Success**
   - Check terminal output for success message
   - Review any logged changes
   - Spot-check the database in Convex dashboard

4. **Post-Migration Tasks** (if applicable)
   - Seed prompts: `npx convex run seedScoringPrompts:seedSystemSportPrompts`
   - Update spot prompts: `npx convex run seedScoringPrompts:seedScoringPrompts`
   - Run scraper: `node scripts/scrape.mjs`

5. **Recovery** (if migration fails)
   - Go to Convex dashboard → Settings → Backups
   - Find the backup created in step 1
   - Click "Restore" to revert changes

**Critical Notes:**
- Never run migrations without a backup
- Test migrations in development first if possible
- Keep backup files until verified stable

---

## SOP-002: Deploying Code Changes

**When:** After committing code changes that need to be deployed to production.

**Procedure:**

1. **Commit Changes**
   ```bash
   git add -A
   git commit -m "Description of changes"
   ```

2. **Push Convex functions**
   ```bash
   npx convex deploy            # live (prod)
   npx convex dev --once        # lab (dev)
   ```

3. **Deploy the Worker**
   ```bash
   npm run deploy
   ```
   This builds OpenNext and uploads `waterman-web`.

4. **Verify**
   - Visit https://watermanreport.com
   - Check Convex logs on the live deployment
   - Confirm the latest scrape timestamp is recent

5. **Rollback**
   - Worker: Cloudflare dashboard → `waterman-web` → prior version
   - Convex: dashboard → Backups → Restore

**Critical Notes:**
- Git push does not deploy the Worker by itself unless you run the deploy workflow
- Live data is Convex prod. Lab data is Convex dev with a small spot roster.

---

## SOP-003: Running the Forecast Scraper

**When:**
- After adding new spots or sports
- When forecast data is stale
- On a scheduled basis (every 6 hours in production)

**Procedure:**

1. **Run Scraper**
   ```bash
   npx convex run ingest:scrapeAllSpots
   ```
   Or `npm run scrape` for the manual Node path.

2. **Monitor Progress**
   - Watch terminal output for each spot being scraped
   - Check for any error messages
   - Note the number of slots collected per spot

3. **Verify Data**
   - Check Convex dashboard → Data → forecast_slots
   - Verify new entries with recent `scrapeTimestamp`
   - Confirm slot counts match expected values

4. **Troubleshooting**
   - If scraper fails: Check Windy.app URLs are valid
   - If no data: Verify `CONVEX_URL` environment variable
   - If partial data: Check specific spot configurations

---

## SOP-004: Scoring Forecast Slots

**When:**
- After scraping new forecast data
- When scoring prompts are updated
- When adding new sports or spots

**Procedure:**

1. **Trigger Scoring** (automatic after scrape, or manual)
   ```bash
   # Via admin panel: Admin → Trigger Scoring
   # Or programmatically via Convex function
   ```

2. **Monitor Scoring Progress**
   - Check Convex logs for LLM API calls
   - Watch for score generation completion
   - Note any rate limit warnings

3. **Verify Scores**
   - Check Convex dashboard → Data → condition_scores
   - Spot-check score values (0-100 range)
   - Review reasoning text for quality

4. **Review Scoring Logs** (if issues)
   - Admin panel → Scoring Logs
   - Check for failed API calls
   - Review prompt/response pairs

---

## SOP-005: Adding a New Sport

**When:** Adding support for a new watersport type.

**Procedure:**

1. **Update Frontend**
   - Add sport to `components/layout/SportSelector.js`
   - Add URL mapping in `app/[sport]/[filter]/page.js`
   - Update all sport validation arrays

2. **Update Backend**
   - Add system prompt to `convex/prompts.ts`
   - Update `convex/seedScoringPrompts.ts` to handle sport configs
   - Add sport to all API route validations

3. **Create Migration**
   - Write migration function in `convex/` directory
   - Deploy Convex functions: `npx convex deploy`
   - Follow SOP-001 to run migration

4. **Seed Prompts**
   ```bash
   npx convex run seedScoringPrompts:seedSystemSportPrompts
   npx convex run seedScoringPrompts:seedScoringPrompts
   ```

5. **Scrape and Score**
   - Run scraper: `node scripts/scrape.mjs`
   - Trigger scoring via admin panel

6. **Test**
   - Select new sport in UI
   - Verify spots appear
   - Check scores are generated
   - Test calendar integration

---

## SOP-006: Emergency Rollback

**When:** Production is broken and needs immediate rollback.

**Procedure:**

1. **Identify Last Good Deployment**
   - Cloudflare dashboard → `waterman-web` → Versions
   - Convex dashboard → Deployments

2. **Rollback Code**
   - Worker: restore the previous Worker version
   - Convex: redeploy the last good commit with `npx convex deploy`

3. **Rollback Database** (if needed)
   - Convex dashboard → Settings → Backups
   - Select backup from before the issue
   - Click "Restore"
   - Confirm restoration

4. **Verify Recovery**
   - Test production site functionality
   - Check critical features work
   - Review logs for errors

5. **Post-Mortem**
   - Document what went wrong
   - Fix issue in development
   - Test thoroughly before redeploying

---

## Quick Reference

| Task | Command |
|------|---------|
| Run migration | `node scripts/runMigration.mjs <migration:function>` |
| Deploy live Convex | `npx convex deploy` |
| Deploy lab Convex | `npx convex dev --once` |
| Deploy Worker | `npm run deploy` |
| Seed system prompts | `npx convex run seedScoringPrompts:seedSystemSportPrompts` |
| Seed spot prompts | `npx convex run seedScoringPrompts:seedScoringPrompts` |
| Run scraper | `npx convex run ingest:scrapeAllSpots` |
| Trim lab roster | `npx convex run spots:setLabRoster` (lab only) |
| Check Convex logs | https://dashboard.convex.dev/ → Logs |
| Create backup | Convex dashboard → Settings → Backups → Create Backup |

---

## Important Links

- **Convex Dashboard**: https://dashboard.convex.dev/
- **Cloudflare Workers**: https://dash.cloudflare.com/
- **Production Site**: https://watermanreport.com
- **GitHub Repo**: https://github.com/radjay/waterman

---

## Notes

- Live Convex is `keen-reindeer-909`. Lab is `adorable-anteater-323` with five forecast spots (Guincho, Lagoa, Marina, Carcavelos, Bico).
- `www.watermanreport.com` is the Worker. Apex `watermanreport.com` still hits Render until you remove that custom domain in Render.
- SOPs should be followed in order and completely
- Don't skip verification steps
- Document any deviations or issues
- Update SOPs when procedures change
