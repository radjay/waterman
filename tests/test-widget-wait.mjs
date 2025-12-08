import puppeteer from "puppeteer";

const url = "https://windy.app/forecast2/spot/8512151/Marina+de+Cascais";
const chromePath =
  "/opt/render/.cache/puppeteer/chrome/linux-143.0.7499.40/chrome-linux64/chrome";

const browser = await puppeteer.launch({
  headless: "new",
  executablePath: chromePath,
  args: [
    "--no-sandbox",
    "--disable-setuid-sandbox",
    "--disable-dev-shm-usage",
    "--disable-gpu",
  ],
});

const page = await browser.newPage();

// Apply stealth features
await page.setViewport({
  width: 1920,
  height: 1080,
  deviceScaleFactor: 1,
});

const userAgent =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";
await page.setUserAgent(userAgent);

await page.setExtraHTTPHeaders({
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
  "Accept-Encoding": "gzip, deflate, br",
});

await page.evaluateOnNewDocument(() => {
  Object.defineProperty(navigator, "webdriver", {
    get: () => false,
  });
  window.chrome = { runtime: {} };
});

console.log("Starting navigation (non-blocking)...");

// Start navigation but don't wait for it to complete
const navigationPromise = page.goto(url, {
  waitUntil: "domcontentloaded",
  timeout: 60000,
}).catch((e) => {
  console.log(`Navigation promise rejected: ${e.message}`);
  return null; // Continue anyway
});

// Immediately start waiting for the widget
console.log("Waiting for widget to appear...");

let widgetFound = false;
const maxWaitTime = 60000; // 60 seconds total
const checkInterval = 2000; // Check every 2 seconds
const startTime = Date.now();

while (Date.now() - startTime < maxWaitTime && !widgetFound) {
  try {
    const hasWidget = await page.evaluate(() => {
      return !!document.querySelector("#windywidgettable");
    });

    if (hasWidget) {
      widgetFound = true;
      console.log(`✅ Widget found after ${Math.round((Date.now() - startTime) / 1000)}s!`);
      break;
    }

    // Check if navigation completed (even if it failed)
    try {
      await Promise.race([
        navigationPromise,
        new Promise((resolve) => setTimeout(resolve, 100)),
      ]);
    } catch (e) {
      // Navigation failed, but that's OK
    }

    console.log(
      `Waiting... (${Math.round((Date.now() - startTime) / 1000)}s elapsed)`
    );
    await new Promise((resolve) => setTimeout(resolve, checkInterval));
  } catch (error) {
    console.log(`Error checking widget: ${error.message}`);
    await new Promise((resolve) => setTimeout(resolve, checkInterval));
  }
}

// Check final state
const pageInfo = await page.evaluate(() => {
  return {
    title: document.title,
    url: window.location.href,
    hasWidget: !!document.querySelector("#windywidgettable"),
    bodyLength: document.body?.innerText?.length || 0,
  };
});

console.log("\n=== Final State ===");
console.log(JSON.stringify(pageInfo, null, 2));

if (widgetFound) {
  console.log("\n✅ SUCCESS: Widget loaded!");
} else {
  console.log("\n❌ Widget not found after 60 seconds");
}

await browser.close();

