# Render.com Setup for Automated Scraping

This guide explains how to set up automated weather forecast scraping on Render.com.

## Option 1: Using Render Cron Jobs (Recommended)

Render supports cron jobs that can run on a schedule. Here's how to set it up:

### Steps:

1. **Create a Cron Job Service in Render Dashboard:**
   - Go to your Render dashboard
   - Click "New +" → "Cron Job"
   - Name it: `waterman-scraper`
   - Environment: `Node`
   - Build Command: `npm install`
   - Start Command: `node scripts/scrape.mjs`
   - Schedule: `0 6,18 * * *` (runs at 6 AM and 6 PM UTC daily)

2. **Set Environment Variables:**
   - Add `NEXT_PUBLIC_CONVEX_URL` environment variable
   - Value should be your Convex deployment URL

3. **Deploy:**
   - Connect to your GitHub repository
   - Render will automatically deploy and run the cron job

### Schedule Format:
- `0 6,18 * * *` = 6 AM and 6 PM UTC daily
- `0 */12 * * *` = Every 12 hours
- `0 0,12 * * *` = Midnight and noon UTC

## Option 2: Using render.yaml (Alternative)

If you prefer infrastructure-as-code, you can use the `render.yaml` file included in this repo. However, Render's cron job feature might require manual setup in the dashboard.

## Notes:

- The scraper uses Puppeteer which requires Chrome/Chromium. Render's environment should have this available.
- Make sure your Convex deployment URL is set correctly in the environment variables.
- Check the logs in Render dashboard to verify the scraper is running successfully.
- The scraper will automatically fetch all spots from Convex and scrape their forecast data.

## Testing the Scraper on Render

Before setting up the cron job, you can test the scraper using the API endpoint:

### Option 1: Using the API Endpoint (Recommended)

1. **Deploy your app to Render** (if not already deployed)
2. **Set environment variable** (optional but recommended for security):
   - Add `SCRAPE_SECRET_TOKEN` to your Render environment variables
   - Set it to a random secret string (e.g., `openssl rand -hex 32`)
3. **Test the scraper** by making a POST request:
   ```bash
   curl -X POST https://your-app.onrender.com/api/scrape \
     -H "Authorization: Bearer YOUR_SECRET_TOKEN"
   ```
   Or if you didn't set a token, just:
   ```bash
   curl -X POST https://your-app.onrender.com/api/scrape
   ```
4. **Check the response** - it will return JSON with results for each spot
5. **Check your Convex dashboard** to verify the data was saved

### Option 2: Using Render's Shell/SSH

1. Go to your Render service dashboard
2. Click on "Shell" or "SSH" (if available)
3. Run: `node scripts/scrape.mjs`
4. Check the output and verify data in Convex

### Option 3: Manual Cron Job Test

1. Create the cron job in Render dashboard
2. Set the schedule to run immediately: `* * * * *` (every minute - for testing only!)
3. Watch the logs to see if it runs successfully
4. Change back to the proper schedule once confirmed

## Troubleshooting:

- If Puppeteer fails, you may need to add Chrome dependencies. Render should handle this automatically, but if issues occur, you might need to use `puppeteer-core` with a custom Chrome installation.
- Check that `NEXT_PUBLIC_CONVEX_URL` is set correctly in your Render environment variables.
- Monitor the cron job logs in Render dashboard to see if scraping is working.
- If the API endpoint returns errors, check the Render service logs for detailed error messages.

