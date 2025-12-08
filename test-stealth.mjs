import puppeteer from 'puppeteer';

const url = "https://windy.app/forecast2/spot/8512151/Marina+de+Cascais";

// Find Chrome executable (same logic as scraper)
import fs from 'fs';

function findChromeExecutable() {
    const commonPaths = [
        '/opt/render/.cache/puppeteer/chrome/linux-143.0.7499.40/chrome-linux64/chrome',
        process.env.PUPPETEER_EXECUTABLE_PATH,
    ];
    
    for (const path of commonPaths) {
        if (path && fs.existsSync(path)) {
            return path;
        }
    }
    return null;
}

const chromePath = findChromeExecutable();
console.log(`Using Chrome at: ${chromePath || 'default'}`);

const launchOptions = {
    headless: "new",
    args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-software-rasterizer',
    ],
};

if (chromePath) {
    launchOptions.executablePath = chromePath;
}

const browser = await puppeteer.launch(launchOptions);
const page = await browser.newPage();

try {
    // Apply stealth features
    await page.setViewport({ 
        width: 1920, 
        height: 1080,
        deviceScaleFactor: 1
    });
    
    const userAgent = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
    await page.setUserAgent(userAgent);
    
    await page.setExtraHTTPHeaders({
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br, zstd',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Sec-Ch-Ua': '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
        'Sec-Ch-Ua-Mobile': '?0',
        'Sec-Ch-Ua-Platform': '"Linux"',
        'Cache-Control': 'max-age=0'
    });

    // Override navigator properties
    await page.evaluateOnNewDocument(() => {
        Object.defineProperty(navigator, 'webdriver', {
            get: () => false,
        });
        Object.defineProperty(navigator, 'plugins', {
            get: () => [1, 2, 3, 4, 5],
        });
        Object.defineProperty(navigator, 'languages', {
            get: () => ['en-US', 'en'],
        });
        window.chrome = { runtime: {} };
    });

    console.log("Navigating to URL...");
    let response;
    try {
        response = await page.goto(url, {
            waitUntil: 'networkidle2',
            timeout: 60000
        });
        console.log(`Navigation status: ${response?.status()}`);
    } catch (error) {
        console.log(`Navigation error: ${error.message}`);
        // Try fallback
        try {
            response = await page.goto(url, {
                waitUntil: 'domcontentloaded',
                timeout: 60000
            });
            console.log(`Fallback navigation status: ${response?.status()}`);
        } catch (e2) {
            console.log(`Fallback also failed: ${e2.message}`);
        }
    }

    // Wait a bit for JS to execute
    console.log("Waiting for widget to load...");
    await new Promise(r => setTimeout(r, 10000));

    // Check for widget
    const pageInfo = await page.evaluate(() => {
        return {
            title: document.title,
            url: window.location.href,
            hasWidget: !!document.querySelector('#windywidgettable'),
            hasWidgetContainer: !!document.querySelector('[id*="windy"], [class*="windy"]'),
            webdriver: navigator.webdriver,
            plugins: navigator.plugins.length,
            languages: navigator.languages,
            chrome: !!window.chrome,
            bodyText: document.body.innerText.substring(0, 200)
        };
    });

    console.log("\n=== Page Info ===");
    console.log(JSON.stringify(pageInfo, null, 2));

    if (pageInfo.hasWidget) {
        console.log("\n✅ SUCCESS: Widget found!");
    } else {
        console.log("\n❌ FAILED: Widget not found");
        console.log("Trying to wait longer...");
        
        // Try waiting for widget with retries
        for (let i = 0; i < 3; i++) {
            await new Promise(r => setTimeout(r, 5000));
            const hasWidget = await page.evaluate(() => !!document.querySelector('#windywidgettable'));
            if (hasWidget) {
                console.log(`✅ Widget found after ${(i+1)*5} seconds!`);
                break;
            }
            console.log(`Attempt ${i+1}/3: Still no widget...`);
        }
    }

} finally {
    await browser.close();
}

