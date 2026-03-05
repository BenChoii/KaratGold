const express = require('express');
const cors = require('cors');
const { chromium } = require('playwright');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3333;

// Keep a browser instance alive for reuse
let browser = null;

async function getBrowser() {
    if (!browser || !browser.isConnected()) {
        browser = await chromium.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
        });
    }
    return browser;
}

/**
 * POST /scan
 * Body: { url: string, waitMs?: number }
 * Returns: { screenshot: string (base64), width: number, height: number }
 *
 * Takes a full-page screenshot of the given URL.
 * Designed to screenshot our own /scan/:businessId pages
 * where the Elfsight tagged-posts widget renders.
 */
app.post('/scan', async (req, res) => {
    const { url, waitMs = 8000 } = req.body;

    if (!url) {
        return res.status(400).json({ error: 'url is required' });
    }

    console.log(`[scan] Screenshotting: ${url}`);
    const startTime = Date.now();

    try {
        const browser = await getBrowser();
        const context = await browser.newContext({
            viewport: { width: 1280, height: 900 },
            userAgent: 'KaratScanner/1.0',
        });

        const page = await context.newPage();
        await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });

        // Wait for Elfsight widget to load (it loads async via script)
        await page.waitForTimeout(waitMs);

        // Try to wait for Elfsight content to appear
        try {
            await page.waitForSelector('[class*="elfsight"]', { timeout: 10000 });
            // Give extra time for images to load inside the widget
            await page.waitForTimeout(3000);
        } catch {
            console.log('[scan] Elfsight selector not found, proceeding with screenshot anyway');
        }

        const screenshot = await page.screenshot({
            fullPage: true,
            type: 'png',
        });

        await context.close();

        const elapsed = Date.now() - startTime;
        console.log(`[scan] Done in ${elapsed}ms`);

        res.json({
            screenshot: screenshot.toString('base64'),
            width: 1280,
            height: 900,
            elapsed,
        });
    } catch (err) {
        console.error('[scan] Error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

/**
 * GET /health
 * Simple health check
 */
app.get('/health', (req, res) => {
    res.json({ status: 'ok', uptime: process.uptime() });
});

app.listen(PORT, () => {
    console.log(`Playwright service running on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
    if (browser) await browser.close();
    process.exit(0);
});
process.on('SIGINT', async () => {
    if (browser) await browser.close();
    process.exit(0);
});
