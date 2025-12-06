const puppeteer = require('puppeteer');

(async () => {
    console.log("Starting scraper...");
    const browser = await puppeteer.launch({
        headless: "new"
    });
    const page = await browser.newPage();

    // Set a reasonable viewport and user agent
    await page.setViewport({ width: 1280, height: 800 });
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.88 Safari/537.36');

    try {
        console.log("Navigating to URL...");
        await page.goto('https://windy.app/forecast2/spot/8512151/Marina+de+Cascais', {
            waitUntil: 'domcontentloaded',
            timeout: 60000
        });

        console.log("Waiting for table...");
        await page.waitForSelector('#windywidgettable', { timeout: 30000 });

        // Extract data
        console.log("Extracting data...");
        const forecast = await page.evaluate(() => {
            const daysRow = document.querySelector('#windywidgettable .windywidgetdays');
            const hoursRow = document.querySelector('#windywidgettable .windywidgethours');
            const speedRow = document.querySelector('#windywidgettable .windywidgetwindSpeed');
            const gustRow = document.querySelector('#windywidgettable .windywidgetwindGust');

            if (!daysRow || !hoursRow || !speedRow || !gustRow) {
                return {
                    error: "One or more rows not found", details: {
                        hasDays: !!daysRow,
                        hasHours: !!hoursRow,
                        hasSpeed: !!speedRow,
                        hasGust: !!gustRow
                    }
                };
            }

            // Debugging structure
            const hoursTDs = Array.from(hoursRow.querySelectorAll('td'));
            const speedTDs = Array.from(speedRow.querySelectorAll('td'));

            // Helper to expand colspans for days
            const days = [];
            daysRow.querySelectorAll('td').forEach(td => {
                const colspan = parseInt(td.getAttribute('colspan') || '1', 10);
                const text = td.innerText.trim();
                for (let i = 0; i < colspan; i++) {
                    days.push(text);
                }
            });

            const hours = hoursTDs.map(td => td.innerText.trim());

            // Values are in m/s in the data-value attribute
            const speeds = speedTDs.map(td => {
                const val = parseFloat(td.getAttribute('data-value'));
                return isNaN(val) ? 0 : val;
            });

            const gusts = Array.from(gustRow.querySelectorAll('td')).map(td => {
                const val = parseFloat(td.getAttribute('data-value'));
                return isNaN(val) ? 0 : val;
            });

            return {
                days,
                hours,
                speeds,
                gusts,
                debug: {
                    daysCount: days.length,
                    hoursCount: hours.length,
                    speedsCount: speeds.length,
                    gustsCount: gusts.length,
                    firstHourHTML: hoursTDs[0] ? hoursTDs[0].outerHTML : 'none'
                }
            };
        });

        if (!forecast || forecast.error) {
            console.error("Scraping error:", forecast);
        } else {
            console.log("Debug stats:", forecast.debug);

            const { days, hours, speeds, gusts } = forecast;

            // Ensure arrays are same length (using hours as base)
            const count = hours.length;
            console.log(`Found ${count} forecast slots.`);

            console.log("\n--- Suitable Wingfoiling Slots (Wind >= 15kn, Gust > 18kn) ---\n");

            let found = false;
            for (let i = 0; i < count; i++) {
                const speedMs = speeds[i];
                const gustMs = gusts[i];

                // Convert m/s to knots
                const speedKnots = speedMs * 1.94384;
                const gustKnots = gustMs * 1.94384;

                if (speedKnots >= 15 && gustKnots > 18) {
                    found = true;
                    const day = days[i] || "Unknown Day";
                    const hour = hours[i];
                    console.log(`${day} @ ${hour}: Wind ${speedKnots.toFixed(1)} kn / Gust ${gustKnots.toFixed(1)} kn`);
                }
            }

            if (!found) {
                console.log("No suitable conditions found in the current forecast.");
            }
        }

    } catch (error) {
        console.error("Error scraping data:", error);
    } finally {
        await browser.close();
    }
})();
