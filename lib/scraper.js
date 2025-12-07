
import puppeteer from 'puppeteer';

export async function getForecast(spotUrl, spotId = null) {
    console.log(`Starting scraper for ${spotUrl}...`);

    // Detect if we're running on Render
    const isRender = process.env.RENDER || process.env.PUPPETEER_EXECUTABLE_PATH;
    
    // Launch browser - key change: headless: "new"
    // Additional args for server environments like Render
    const launchOptions = {
        headless: "new",
    };

    // Only set server-specific options on Render
    if (isRender) {
        launchOptions.args = [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage', // Overcome limited resource problems
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--single-process', // This can help in some environments
            '--disable-gpu',
            '--disable-software-rasterizer'
        ];
        // Only set executable path if explicitly provided (for Render)
        if (process.env.PUPPETEER_EXECUTABLE_PATH) {
            launchOptions.executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
        }
    }

    const browser = await puppeteer.launch(launchOptions);

    try {
        const page = await browser.newPage();

        // Set a reasonable viewport and user agent
        await page.setViewport({ width: 1280, height: 800 });
        await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.88 Safari/537.36');

        console.log("Navigating to URL...");
        // Go to URL
        await page.goto(spotUrl, {
            waitUntil: 'domcontentloaded',
            timeout: 60000
        });

        console.log("Waiting for table...");
        await page.waitForSelector('#windywidgettable', { timeout: 30000 });

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

            // Wait for toggle
            await page.waitForSelector('li[data-type-name="swell"]', { timeout: 5000 });

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
            
            // Parse hour and minute from hourStr (format: "2" or "2:50" or "14:30")
            let hour = 0;
            let minute = 0;
            if (hourStr.includes(':')) {
                const [h, m] = hourStr.split(':').map(Number);
                hour = isNaN(h) ? 0 : h;
                minute = isNaN(m) ? 0 : m;
            } else {
                hour = parseInt(hourStr, 10) || 0;
                minute = 0;
            }
            
            date.setHours(hour, minute, 0, 0);

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

        // 4. Click Tide Toggle and Scrape Tide Data
        console.log("Switching to Tide view...");
        let tideData = { tides: [] };
        try {
            // Try multiple possible selectors for tide toggle
            const tideSelectors = [
                'li[data-type-name="tide"]',
                'li[data-type="tide"]',
                'a[data-type-name="tide"]',
                'button[data-type-name="tide"]',
                'li:has-text("Tide")',
                'a:has-text("Tide")',
            ];

            let tideToggleFound = false;
            for (const selector of tideSelectors) {
                try {
                    await page.waitForSelector(selector, { timeout: 2000 });
                    await page.evaluate((sel) => {
                        const el = document.querySelector(sel);
                        if (el) el.click();
                    }, selector);
                    tideToggleFound = true;
                    break;
                } catch (e) {
                    // Try next selector
                }
            }

            // If no toggle found, try to find it by text content
            if (!tideToggleFound) {
                await page.evaluate(() => {
                    const allLis = Array.from(document.querySelectorAll('li, a, button'));
                    const tideEl = allLis.find(el => {
                        const text = el.textContent?.toLowerCase() || '';
                        return text.includes('tide') && !text.includes('tidal');
                    });
                    if (tideEl) {
                        tideEl.click();
                    }
                });
            }

            await new Promise(r => setTimeout(r, 3000));

            // Scrape tide data - look for tide information in the widget
            tideData = await page.evaluate(() => {
                const table = document.querySelector('#windywidgettable');
                if (!table) return { tides: [] };

                const tides = [];

                // Get the days row to understand day structure
                const daysRow = table.querySelector('.windywidgetdays');
                const hoursRow = table.querySelector('.windywidgethours');
                if (!daysRow || !hoursRow) return { tides: [] };

                // Parse days
                const dayCells = Array.from(daysRow.querySelectorAll('td'));
                const days = [];
                dayCells.forEach(td => {
                    const colspan = parseInt(td.getAttribute('colspan') || '1', 10);
                    const text = td.innerText.trim();
                    for (let i = 0; i < colspan; i++) {
                        days.push(text);
                    }
                });

                // Get hours
                const hourCells = Array.from(hoursRow.querySelectorAll('td'));
                const columnPositions = hourCells.map((cell, index) => {
                    const hour = parseInt(cell.innerText.trim(), 10);
                    return { index, hour, cell, day: days[index] || days[0] };
                });

                // Find tide info divs with class 'windywidgettideInfo' or 'id-tides'
                const tideElements = document.querySelectorAll('.windywidgettideInfo, .id-tides, [class*="tideInfo"]');
                
                tideElements.forEach((el) => {
                    const timeStr = el.getAttribute('data-time');
                    const heightStr = el.getAttribute('data-height');
                    
                    if (timeStr && heightStr) {
                        // Parse time (format: "2:50" or "14:30")
                        const timeParts = timeStr.split(':');
                        const tideHour = parseInt(timeParts[0], 10);
                        const tideMinute = timeParts.length > 1 ? parseInt(timeParts[1], 10) : 0;
                        const height = parseFloat(heightStr);
                        
                        if (!isNaN(tideHour) && !isNaN(height) && !isNaN(tideMinute)) {
                            // Find which column this tide belongs to by matching hour
                            // The tide element's position (left style) should correspond to a column
                            const style = el.getAttribute('style') || '';
                            const leftMatch = style.match(/left:\s*(\d+)px/);
                            const leftPx = leftMatch ? parseInt(leftMatch[1], 10) : null;
                            
                            // Try to find the closest matching column
                            let bestMatch = null;
                            let bestDistance = Infinity;
                            
                            columnPositions.forEach((col) => {
                                // Get the column's position
                                const colRect = col.cell.getBoundingClientRect();
                                const tableRect = table.getBoundingClientRect();
                                const colLeft = colRect.left - tableRect.left;
                                
                                // Calculate distance from tide element to column
                                const distance = leftPx !== null ? Math.abs(leftPx - colLeft) : 
                                               Math.abs(tideHour - col.hour);
                                
                                if (distance < bestDistance) {
                                    bestDistance = distance;
                                    bestMatch = col.index;
                                }
                            });
                            
                            // Alternative: match by hour if position matching fails
                            if (bestMatch === null || bestDistance > 50) {
                                const hourMatch = columnPositions.find(col => col.hour === tideHour);
                                if (hourMatch) {
                                    bestMatch = hourMatch.index;
                                }
                            }
                            
                            if (bestMatch !== null) {
                                tides.push({
                                    index: bestMatch,
                                    hour: tideHour,
                                    minute: tideMinute || 0,
                                    height,
                                    timeStr,
                                    day: columnPositions[bestMatch]?.day || days[0],
                                });
                            }
                        }
                    }
                });

                // Determine if each tide is high or low by comparing heights
                // Sort by index to maintain column order
                tides.sort((a, b) => a.index - b.index);

                // Classify as high or low based on relative height
                const classifiedTides = tides.map((tide, index) => {
                    const prevHeight = index > 0 ? tides[index - 1].height : null;
                    const nextHeight = index < tides.length - 1 ? tides[index + 1].height : null;
                    
                    let type = null;
                    if (prevHeight !== null && nextHeight !== null) {
                        // Compare with both neighbors
                        if (tide.height > prevHeight && tide.height > nextHeight) {
                            type = 'high';
                        } else if (tide.height < prevHeight && tide.height < nextHeight) {
                            type = 'low';
                        }
                    } else if (prevHeight !== null) {
                        // Only previous neighbor
                        type = tide.height > prevHeight ? 'high' : 'low';
                    } else if (nextHeight !== null) {
                        // Only next neighbor
                        type = tide.height > nextHeight ? 'high' : 'low';
                    } else {
                        // Only one tide point, can't determine
                        // Default to high if height is above average, low otherwise
                        const avgHeight = tides.reduce((sum, t) => sum + t.height, 0) / tides.length;
                        type = tide.height > avgHeight ? 'high' : 'low';
                    }
                    
                    return {
                        ...tide,
                        type: type || 'high', // Default to high if can't determine
                    };
                });

                return { tides: classifiedTides };
            });

            console.log(`Tide data scraped: ${tideData.tides.length} tide events.`);
        } catch (e) {
            console.error("Failed to scrape tide data. Continuing without tide info.", e);
        }

        // Process forecast slots (wind/wave data)
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
                    waveDirection: waveDirs[i] || 0,
                });
            }
        }
        
        // Add ALL tides as separate entries with their exact timestamps
        // Tides are independent of forecast slots
        tideData.tides.forEach((tide) => {
            // Create exact timestamp for this tide based on its day and hour/minute
            const tideDay = tide.day || days[tide.index] || days[0];
            const tideTimestamp = parseWindyDate(tideDay, `${tide.hour}:${tide.minute || 0}`);
            
            if (tideTimestamp) {
                suitableSlots.push({
                    timestamp: tideTimestamp, // Exact tide time
                    dayLabel: tideDay,
                    hour: `${tide.hour}:${(tide.minute || 0).toString().padStart(2, '0')}`,
                    speed: 0,
                    gust: 0,
                    direction: 0,
                    waveHeight: 0,
                    wavePeriod: 0,
                    waveDirection: 0,
                    tideHeight: tide.height,
                    tideType: tide.type,
                    tideTime: tideTimestamp,
                    isTideOnly: true, // Flag to indicate this is a tide-only entry
                    spotId: spotId // Store spotId for tide entries too
                });
            }
        });
        
        return suitableSlots;

    } catch (error) {
        console.error("Error in getForecast:", error);
        return [];
    } finally {
        await browser.close();
    }
}
