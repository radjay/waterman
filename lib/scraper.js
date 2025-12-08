
import puppeteer from 'puppeteer';

export async function getForecast(spotUrl) {
    console.log(`Starting scraper for ${spotUrl}...`);

    // Launch browser - key change: headless: "new"
    const browser = await puppeteer.launch({
        headless: "new",
        args: ['--no-sandbox', '--disable-setuid-sandbox'] // helpful for some environments
    });

    try {
        const page = await browser.newPage();

        // Set a reasonable viewport and user agent
        await page.setViewport({ width: 1280, height: 800 });
        await page.setUserAgent('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        
        // Set additional headers to look more like a real browser
        await page.setExtraHTTPHeaders({
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept-Encoding': 'gzip, deflate, br',
            'DNT': '1',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
            'Sec-Fetch-Dest': 'document',
            'Sec-Fetch-Mode': 'navigate',
            'Sec-Fetch-Site': 'none',
            'Sec-Fetch-User': '?1',
            'Cache-Control': 'max-age=0'
        });
        
        // Convert windy.app URLs to windy.com if needed (for Render compatibility)
        let targetUrl = spotUrl;
        if (targetUrl.includes('windy.app') && process.env.RENDER) {
            targetUrl = targetUrl.replace('windy.app', 'windy.com');
            console.log(`Converted URL to windy.com: ${targetUrl}`);
        }

        console.log("Navigating to URL...");
        // Go to URL - handle 410 responses (Windy may block but widget still loads)
        let navigationSuccess = false;
        try {
            const response = await page.goto(targetUrl, {
                waitUntil: 'networkidle2',
                timeout: 120000
            });
            if (response && response.status() < 400) {
                navigationSuccess = true;
                console.log(`Navigation successful, status: ${response.status()}`);
            } else {
                console.log(`Page returned status ${response?.status()}, but continuing...`);
            }
        } catch (error) {
            // Even if navigation fails (410, timeout, etc), try to continue - widget might still load
            console.log(`Navigation error: ${error.message}, but continuing to check for widget...`);
            try {
                // Try a simpler navigation approach
                await page.goto(targetUrl, {
                    waitUntil: 'domcontentloaded',
                    timeout: 60000
                });
            } catch (e2) {
                console.log("Second navigation attempt also failed, but page may still be loading...");
            }
        }
        
        // Give extra time for JavaScript to load the widget even if page returned 410
        if (!navigationSuccess) {
            console.log("Waiting for widget to load via JavaScript (may take 10-15 seconds)...");
            await new Promise(r => setTimeout(r, 10000)); // Wait 10 seconds for JS to execute
        }

        console.log("Waiting for table...");
        // Wait longer for the table to appear, with retries
        // The widget loads via JavaScript, so we need to wait even if page returned 410
        let tableFound = false;
        for (let attempt = 0; attempt < 5; attempt++) {
            try {
                // Check if page loaded properly first
                const pageTitle = await page.title();
                console.log(`Attempt ${attempt + 1}/5 - Page title: ${pageTitle}`);
                
                // Try to find the table
                const table = await page.waitForSelector('#windywidgettable', { timeout: 30000 });
                if (table) {
                    tableFound = true;
                    console.log("Table found!");
                    break;
                }
            } catch (error) {
                if (attempt < 4) {
                    console.log(`Table not found, attempt ${attempt + 1}/5, waiting and retrying...`);
                    // Try scrolling to trigger lazy loading
                    await page.evaluate(() => {
                        window.scrollTo(0, document.body.scrollHeight);
                        window.scrollTo(0, 0);
                    });
                    // Wait longer between attempts for JS to execute
                    await new Promise(r => setTimeout(r, 8000));
                } else {
                    // Log page content for debugging
                    const pageContent = await page.evaluate(() => {
                        const scripts = Array.from(document.querySelectorAll('script[src]')).map(s => s.src);
                        return {
                            title: document.title,
                            url: window.location.href,
                            hasWidget: !!document.querySelector('#windywidgettable'),
                            hasWidgetContainer: !!document.querySelector('[id*="windy"], [class*="windy"]'),
                            scriptsLoaded: scripts.length,
                            bodyText: document.body.innerText.substring(0, 500)
                        };
                    });
                    console.error("Page debug info:", JSON.stringify(pageContent, null, 2));
                    throw new Error(`Could not find windy widget table after 5 attempts. Has widget container: ${pageContent.hasWidgetContainer}`);
                }
            }
        }
        
        if (!tableFound) {
            throw new Error("Could not find windy widget table after multiple attempts");
        }

        // Extract data
        console.log("Extracting data...");
        const windData = await page.evaluate(() => {
            // 1. Scrape Wind Data (Default View)
            const getTableData = () => {
                const daysRow = document.querySelector('#windywidgettable .windywidgetdays');
                const hoursRow = document.querySelector('#windywidgettable .windywidgethours');
                // Wind uses these classes
                const speedRow = document.querySelector('#windywidgettable .windywidgetwindSpeed');
                const gustRow = document.querySelector('#windywidgettable .windywidgetwindGust'); // or similar
                const dirRow = document.querySelector('#windywidgettable .windywidgetwindDirection');

                // When in Swell mode, classes might be different, let's try generic or specific
                // Inspecting the behavior: usually classes reflect the data type in Windy widget
                // Try to find ANY row with data if specific class fails

                if (!daysRow || !hoursRow) return null;

                const days = [];
                daysRow.querySelectorAll('td').forEach(td => {
                    const colspan = parseInt(td.getAttribute('colspan') || '1', 10);
                    const text = td.innerText.trim();
                    for (let i = 0; i < colspan; i++) {
                        days.push(text);
                    }
                });

                const hours = Array.from(hoursRow.querySelectorAll('td')).map(td => td.innerText.trim());

                // Helper to extract values from a row
                const extractRowValues = (row) => {
                    if (!row) return new Array(hours.length).fill(0);
                    return Array.from(row.querySelectorAll('td')).map(td => {
                        const val = parseFloat(td.getAttribute('data-value') || td.innerText.trim()); // Fallback to text
                        return isNaN(val) ? 0 : val;
                    });
                };

                const extractRowDirs = (row) => {
                    if (!row) return new Array(hours.length).fill(0);
                    return Array.from(row.querySelectorAll('td')).map(td => {
                        const style = td.getAttribute('style') || '';
                        const match = style.match(/rotate\((\d+)deg\)/);
                        return match ? parseInt(match[1], 10) : null;
                    });
                };

                return {
                    days, hours,
                    speedRow, gustRow, dirRow,
                    extractRowValues, extractRowDirs
                };
            };

            const data = getTableData();
            if (!data) return { error: "No table found" };

            const speeds = data.extractRowValues(data.speedRow);
            const gusts = data.extractRowValues(data.gustRow);
            const directions = data.extractRowDirs(data.dirRow);

            return {
                days: data.days,
                hours: data.hours,
                speeds,
                gusts,
                directions
            };
        });

        // Store Wind Data
        if (!windData || windData.error) throw new Error("Wind data scrape failed: " + JSON.stringify(windData));

        console.log(`Wind data scraped: ${windData.hours.length} slots.`);

        // 2. Click Swell Toggle
        console.log("Switching to Swell view...");
        try {
            // Dismiss cookie banner if present (generic attempt)
            try {
                const cookieBtn = await page.evaluateHandle(() => {
                    const buttons = Array.from(document.querySelectorAll('button, a'));
                    return buttons.find(b =>
                        b.innerText.toLowerCase().includes('agree') ||
                        b.innerText.toLowerCase().includes('accept') ||
                        b.className.includes('cookie')
                    );
                });
                if (cookieBtn) {
                    await cookieBtn.click();
                    await new Promise(r => setTimeout(r, 1000));
                }
            } catch (ignore) { }

            // Wait for toggle with longer timeout
            await page.waitForSelector('li[data-type-name="swell"]', { timeout: 15000 });

            // Force Click using evaluate (bypass visibility checks)
            await page.evaluate(() => {
                const el = document.querySelector('li[data-type-name="swell"]');
                if (el) el.click();
            });

            // Wait for table update
            await new Promise(r => setTimeout(r, 3000));

        } catch (e) {
            console.error("Failed to click Swell toggle. Wave data will be empty.", e);
        }

        // 3. Scrape Swell Data
        console.log("Extracting Swell data...");
        const swellData = await page.evaluate(() => {
            // In Swell View, we expect the table rows to represent Swell Header, Period, etc.
            // We need to guess the selectors or look for specific text in headers?
            // Assuming Windy Widget naming convention changes?
            // Or maybe they use the SAME classes but different content?
            // Let's try to find rows based on content or position if classes are missing.
            // But let's check for specific swell classes first which we saw in DOM dump (maybe?)

            // Based on inspection:
            // Rows in Swell view use specific classes like 'windywidgetwavesheight' and 'id-waves-height'

            // User confirmed class: id-waves-height
            const table = document.querySelector('#windywidgettable');
            if (!table) {
                return null;
            }

            // Select by class part or ID part found in inspection
            // Priority: .id-waves-height (User specific request)
            const waveRow = table.querySelector('.id-waves-height') || table.querySelector('.windywidgetwavesheight');
            const periodRow = table.querySelector('.id-waves-period') || table.querySelector('.windywidgetwavesperiod');
            const dirRow = table.querySelector('.id-waves-direction') || table.querySelector('.windywidgetwaves');

            // Extract
            const extractVal = (row) => {
                if (!row) {
                    return [];
                }
                const tds = Array.from(row.querySelectorAll('td'));

                return tds.map(td => {
                    // Height has data-value, Period has text "11'"
                    const val = parseFloat(td.getAttribute('data-value') || td.innerText.replace("'", "").trim());
                    return isNaN(val) ? 0 : val;
                });
            };
            const extractDir = (row) => {
                if (!row) {
                    return [];
                }
                return Array.from(row.querySelectorAll('td')).map(td => {
                    // Rotation is on the inner DIV
                    const div = td.querySelector('div');
                    const target = div || td;
                    const style = target.getAttribute('style') || '';
                    const match = style.match(/rotate\((\d+)deg\)/);
                    return match ? parseInt(match[1], 10) : null;
                });
            };

            return {
                waves: extractVal(waveRow),
                periods: extractVal(periodRow),
                waveDirs: extractDir(dirRow)
            };
        });

        // Helper to parse Windy dates
        const parseWindyDate = (dayStr, hourStr) => {
            const now = new Date();
            const currentYear = now.getFullYear();
            let date = new Date();
            date.setHours(parseInt(hourStr, 10), 0, 0, 0);

            const upper = dayStr.toUpperCase().trim();

            if (upper === 'TODAY') {
                // date is already today
            } else if (upper === 'TOMORROW') {
                date.setDate(date.getDate() + 1);
            } else {
                // Format: "MON, DEC 8" or "DEC 8"
                // Extract "DEC 8"
                const parts = upper.split(',');
                const datePart = parts.length > 1 ? parts[1].trim() : parts[0].trim(); // "DEC 8"

                const [monthStr, dayNum] = datePart.split(' ');

                const months = {
                    'JAN': 0, 'FEB': 1, 'MAR': 2, 'APR': 3, 'MAY': 4, 'JUN': 5,
                    'JUL': 6, 'AUG': 7, 'SEP': 8, 'OCT': 9, 'NOV': 10, 'DEC': 11
                };

                const monthIndex = months[monthStr];

                if (monthIndex !== undefined) {
                    date.setMonth(monthIndex);
                    date.setDate(parseInt(dayNum, 10));

                    // Handle year rollover (e.g. Scraped "JAN" when currently "DEC")
                    if (monthIndex < now.getMonth() && now.getMonth() > 9) {
                        date.setFullYear(currentYear + 1);
                    } else {
                        date.setFullYear(currentYear);
                    }
                }
            }
            return date.getTime();
        };

        // Merge
        const { days, hours, speeds, gusts, directions } = windData;
        const { waves, periods, waveDirs } = swellData || { waves: [], periods: [], waveDirs: [] };

        console.log(`Swell data scraped: ${waves.length} slots.`);

        // Process data
        const suitableSlots = [];
        const count = hours.length; // Wind dictates the slots

        for (let i = 0; i < count; i++) {
            const speedMs = speeds[i];
            const gustMs = gusts[i];
            const dir = directions[i];

            // Convert m/s to knots
            const speedKnots = speedMs * 1.94384;
            const gustKnots = gustMs * 1.94384;

            const hourInt = parseInt(hours[i], 10);
            const isDaylight = hourInt >= 9 && hourInt <= 18;

            const timestamp = parseWindyDate(days[i], hours[i]);

            if (dir !== null && isDaylight) {
                suitableSlots.push({
                    timestamp: timestamp, // REAL DATE (epoch ms)
                    dayLabel: days[i], // Keep for reference if needed
                    hour: hours[i],
                    speed: Math.round(speedKnots * 10) / 10,
                    gust: Math.round(gustKnots * 10) / 10,
                    direction: dir,
                    // Wave Data (Optional)
                    waveHeight: waves[i] || 0,
                    wavePeriod: periods[i] || 0,
                    waveDirection: waveDirs[i] || 0
                });
            }
        }
        return suitableSlots;

    } catch (error) {
        console.error("Error in getForecast:", error);
        return [];
    } finally {
        await browser.close();
    }
}
