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

2. **Push to GitHub**
   ```bash
   git push
   ```
   This triggers automatic deployment on Render.

3. **Monitor Render Deployment** (⏱️ ~2 minutes)
   - Go to https://dashboard.render.com/
   - Navigate to your Waterman service
   - Watch the deployment logs in real-time
   - Wait for "Deploy live" status (~2 minutes)

4. **Verify Deployment Success**
   - Check that status shows "Deploy live" with green indicator
   - Note the deployment time and commit hash
   - Review deployment logs for any warnings or errors

5. **Test Production** (if significant changes)
   - Visit the production URL
   - Test the changed functionality
   - Check browser console for errors
   - Verify data loads correctly

6. **Rollback** (if deployment fails)
   - In Render dashboard, find the previous successful deployment
   - Click "Redeploy" on that version
   - Wait for rollback to complete

**Critical Notes:**
- Always verify Render deployment completes successfully
- Don't assume "push = deployed" - check Render dashboard
- Deployment typically takes 2 minutes - wait for completion
- Keep an eye on deployment logs for build errors

---

## SOP-003: Running the Forecast Scraper

**When:**
- After adding new spots or sports
- When forecast data is stale
- On a scheduled basis (every 6 hours in production)

**Procedure:**

1. **Run Scraper Script**
   ```bash
   node scripts/scrape.mjs
   ```

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
   - Check Render dashboard deployment history
   - Find most recent "Deploy live" before the issue
   - Note the commit hash

2. **Rollback Code**
   - Render dashboard → Select service → Find good deployment
   - Click "Redeploy" button
   - Wait for deployment (~2 minutes)

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
| Deploy Convex | `npx convex deploy` |
| Seed system prompts | `npx convex run seedScoringPrompts:seedSystemSportPrompts` |
| Seed spot prompts | `npx convex run seedScoringPrompts:seedScoringPrompts` |
| Run scraper | `node scripts/scrape.mjs` |
| Check Convex logs | https://dashboard.convex.dev/ → Logs |
| Check Render logs | https://dashboard.render.com/ → Service → Logs |
| Create backup | Convex dashboard → Settings → Backups → Create Backup |

---

## Important Links

- **Convex Dashboard**: https://dashboard.convex.dev/
- **Render Dashboard**: https://dashboard.render.com/
- **Production Site**: (Add your production URL here)
- **GitHub Repo**: https://github.com/radjay/waterman

---

## Notes

- SOPs should be followed in order and completely
- Don't skip verification steps
- Document any deviations or issues
- Update SOPs when procedures change
