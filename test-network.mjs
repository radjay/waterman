import puppeteer from 'puppeteer';
import https from 'https';
import http from 'http';

const url = "https://windy.app/forecast2/spot/8512151/Marina+de+Cascais";

console.log("=== Network Diagnostics ===\n");

// Test 1: Basic HTTP request
console.log("1. Testing basic HTTP request...");
try {
    const response = await fetch(url, {
        method: 'GET',
        headers: {
            'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
        redirect: 'follow',
        signal: AbortSignal.timeout(10000) // 10 second timeout
    });
    console.log(`   Status: ${response.status} ${response.statusText}`);
    console.log(`   Final URL: ${response.url}`);
    const text = await response.text();
    console.log(`   Body length: ${text.length} bytes`);
    console.log(`   Has widget table: ${text.includes('windywidgettable')}`);
} catch (error) {
    console.log(`   ERROR: ${error.message}`);
}

// Test 2: DNS resolution
console.log("\n2. Testing DNS resolution...");
try {
    const dns = await import('dns/promises');
    const addresses = await dns.resolve4('windy.app');
    console.log(`   windy.app resolves to: ${addresses.join(', ')}`);
} catch (error) {
    console.log(`   ERROR: ${error.message}`);
}

// Test 3: Simple TCP connection test
console.log("\n3. Testing TCP connection to windy.app:443...");
try {
    const net = await import('net');
    const socket = new net.Socket();
    const connected = await new Promise((resolve, reject) => {
        socket.setTimeout(5000);
        socket.once('connect', () => {
            socket.destroy();
            resolve(true);
        });
        socket.once('timeout', () => {
            socket.destroy();
            reject(new Error('Connection timeout'));
        });
        socket.once('error', reject);
        socket.connect(443, 'windy.app');
    });
    console.log(`   ✅ Can connect to windy.app:443`);
} catch (error) {
    console.log(`   ❌ Cannot connect: ${error.message}`);
}

// Test 4: Puppeteer with minimal setup
console.log("\n4. Testing Puppeteer with minimal setup...");
const chromePath = '/opt/render/.cache/puppeteer/chrome/linux-143.0.7499.40/chrome-linux64/chrome';
const browser = await puppeteer.launch({
    headless: "new",
    executablePath: chromePath,
    args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
    ],
});

const page = await browser.newPage();

// Set basic user agent
await page.setUserAgent('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36');

// Monitor network requests
let requestCount = 0;
let responseCount = 0;
let failedCount = 0;

page.on('request', () => requestCount++);
page.on('response', (r) => {
    responseCount++;
    if (r.status() >= 400) {
        console.log(`   Response: ${r.status()} ${r.url().substring(0, 80)}`);
    }
});
page.on('requestfailed', (r) => {
    failedCount++;
    console.log(`   Failed: ${r.url().substring(0, 80)} - ${r.failure()?.errorText}`);
});

try {
    console.log("   Attempting navigation with 30s timeout...");
    const response = await page.goto(url, {
        waitUntil: 'domcontentloaded',
        timeout: 30000
    });
    console.log(`   Navigation status: ${response?.status()}`);
    console.log(`   Requests: ${requestCount}, Responses: ${responseCount}, Failed: ${failedCount}`);
    
    const title = await page.title();
    console.log(`   Page title: ${title}`);
    
} catch (error) {
    console.log(`   Navigation ERROR: ${error.message}`);
    console.log(`   Requests made: ${requestCount}, Responses: ${responseCount}, Failed: ${failedCount}`);
    
    // Check if page loaded at all
    try {
        const currentUrl = page.url();
        const title = await page.title();
        console.log(`   Current URL: ${currentUrl}`);
        console.log(`   Page title: ${title}`);
    } catch (e) {
        console.log(`   Cannot read page info: ${e.message}`);
    }
}

await browser.close();

// Test 5: Try alternative domain
console.log("\n5. Testing alternative domain (windy.com)...");
try {
    const altUrl = url.replace('windy.app', 'windy.com');
    const response = await fetch(altUrl, {
        method: 'GET',
        headers: {
            'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36',
        },
        redirect: 'follow',
        signal: AbortSignal.timeout(10000)
    });
    console.log(`   windy.com status: ${response.status} ${response.statusText}`);
} catch (error) {
    console.log(`   windy.com ERROR: ${error.message}`);
}

console.log("\n=== Diagnostics Complete ===");

