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

// Block unnecessary requests that might timeout
const blockedDomains = [
  "google-analytics.com",
  "googletagmanager.com",
  "google.com/analytics",
  "facebook.com",
  "facebook.net",
  "doubleclick.net",
  "googleadservices.com",
  "googlesyndication.com",
  "clarity.ms",
  "t.windyapp.co", // Windy's tracking
  "cloudflareinsights.com",
  "connect.facebook.net",
];

page.setRequestInterception(true);
page.on("request", (request) => {
  const url = request.url();
  
  // Block if it matches any blocked domain
  const shouldBlock = blockedDomains.some((domain) => url.includes(domain));
  
  if (shouldBlock) {
    blockedUrls.add(url);
    blockedCount++;
    request.abort();
  } else {
    request.continue();
  }
});

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

console.log("Navigating with request blocking enabled...");
console.log(`Blocking: ${blockedDomains.join(", ")}`);

let blockedCount = 0;
// Track blocked requests separately
const blockedUrls = new Set();

try {
  const response = await page.goto(url, {
    waitUntil: "domcontentloaded",
    timeout: 30000,
  });
  console.log(`✅ Navigation completed! Status: ${response?.status()}`);
  console.log(`Blocked ${blockedCount} unnecessary requests`);
} catch (error) {
  console.log(`Navigation error: ${error.message}`);
  console.log(`But blocked ${blockedCount} requests - checking if widget loaded anyway...`);
}

// Wait a bit for widget to load
await new Promise((resolve) => setTimeout(resolve, 5000));

// Check for widget
const pageInfo = await page.evaluate(() => {
  return {
    title: document.title,
    url: window.location.href,
    hasWidget: !!document.querySelector("#windywidgettable"),
    hasWidgetContainer: !!document.querySelector('[id*="windy"], [class*="windy"]'),
  };
});

console.log("\n=== Results ===");
console.log(JSON.stringify(pageInfo, null, 2));

if (pageInfo.hasWidget) {
  console.log("\n✅ SUCCESS: Widget found!");
} else {
  console.log("\n❌ Widget not found");
  
  // Try waiting longer
  console.log("Waiting 10 more seconds...");
  await new Promise((resolve) => setTimeout(resolve, 10000));
  
  const hasWidget = await page.evaluate(() => !!document.querySelector("#windywidgettable"));
  if (hasWidget) {
    console.log("✅ Widget found after longer wait!");
  } else {
    console.log("❌ Still no widget");
  }
}

await browser.close();

