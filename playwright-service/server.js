const express = require('express');
const cors = require('cors');
const { chromium } = require('playwright');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3333;

// ─── Persistent browser with Instagram session ───
let browser = null;
let igContext = null;

/**
 * Parse IG_SESSION_COOKIES env var into Playwright cookie format.
 * 
 * Accepts two formats:
 * 1. JSON array: [{"name": "sessionid", "value": "...", "domain": ".instagram.com", ...}]
 * 2. Cookie string: "sessionid=abc; csrftoken=xyz; ds_user_id=123"
 */
function parseSessionCookies() {
    const raw = process.env.IG_SESSION_COOKIES;
    if (!raw) return null;

    try {
        // Try JSON format first
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
    } catch {
        // Fall back to cookie string format
    }

    // Parse "key=value; key2=value2" format
    const pairs = raw.split(';').map(s => s.trim()).filter(Boolean);
    return pairs.map(pair => {
        const [name, ...rest] = pair.split('=');
        return {
            name: name.trim(),
            value: rest.join('=').trim(),
            domain: '.instagram.com',
            path: '/',
            httpOnly: true,
            secure: true,
            sameSite: 'None',
        };
    });
}

async function getInstagramContext() {
    if (!browser || !browser.isConnected()) {
        browser = await chromium.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
        });
    }

    // Reuse the IG context (keeps cookies/session alive)
    if (igContext) {
        try {
            // Check if context is still valid
            await igContext.pages();
            return igContext;
        } catch {
            igContext = null;
        }
    }

    // Create new context with realistic browser fingerprint
    igContext = await browser.newContext({
        viewport: { width: 1280, height: 900 },
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        locale: 'en-US',
        timezoneId: 'America/Vancouver',
    });

    // Load session cookies
    const cookies = parseSessionCookies();
    if (cookies && cookies.length > 0) {
        await igContext.addCookies(cookies);
        console.log(`[ig] Loaded ${cookies.length} session cookies`);
    } else {
        console.warn('[ig] WARNING: No IG_SESSION_COOKIES set — Instagram will require login');
    }

    return igContext;
}

/**
 * POST /scan-tagged
 * Body: { businessHandle: string, lookForUser?: string }
 * Returns: {
 *   screenshots: string[] (base64 PNG),
 *   postDetails: Array<{ screenshot: string, caption?: string }>,
 *   gridScreenshot: string (base64),
 *   foundHandles: string[]
 * }
 *
 * Navigates to instagram.com/{handle}/tagged/ and:
 * 1. Screenshots the tagged posts grid
 * 2. Clicks first 3 posts and screenshots each with captions visible
 */
app.post('/scan-tagged', async (req, res) => {
    const { businessHandle, lookForUser } = req.body;

    if (!businessHandle) {
        return res.status(400).json({ error: 'businessHandle is required' });
    }

    const handle = businessHandle.replace(/^@/, '').toLowerCase();
    console.log(`[scan] Scanning tagged posts for @${handle}${lookForUser ? ` (looking for @${lookForUser})` : ''}`);
    const startTime = Date.now();

    let page;
    try {
        const context = await getInstagramContext();
        page = await context.newPage();

        // Navigate to the tagged tab
        const taggedUrl = `https://www.instagram.com/${handle}/tagged/`;
        await page.goto(taggedUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });

        // Wait for content to load
        await page.waitForTimeout(3000);

        // Check if we hit a login wall
        const isLoginPage = await page.evaluate(() => {
            const body = document.body.innerText || '';
            return body.includes('Log in') && body.includes('Sign up') && body.includes('from Facebook');
        });

        if (isLoginPage) {
            await page.close();
            return res.status(401).json({
                error: 'Instagram login required — update IG_SESSION_COOKIES',
                needsAuth: true,
            });
        }

        // Screenshot the tagged grid
        await page.waitForTimeout(2000); // Let images load
        const gridScreenshot = await page.screenshot({ type: 'png' });
        const gridBase64 = gridScreenshot.toString('base64');

        // Find tagged post thumbnails
        // Instagram's tagged grid uses article elements or specific class patterns
        const postLinks = await page.evaluate(() => {
            const links = [];
            // Instagram post links in the grid — format: /username/p/ID/ or /username/reel/ID/
            const anchors = document.querySelectorAll('a[href*="/p/"], a[href*="/reel/"]');
            anchors.forEach(a => {
                const href = a.getAttribute('href');
                if (href && !links.includes(href)) {
                    links.push(href);
                }
            });
            return links.slice(0, 6); // First 6 posts
        });

        // Extract usernames from post hrefs — /username/reel/ID/ → username
        function extractUsernameFromHref(href) {
            const match = href.match(/^\/([^\/]+)\/(p|reel)\//);
            return match ? match[1].toLowerCase() : null;
        }

        // Get unique usernames from the grid hrefs alone
        const gridUsernames = [...new Set(
            postLinks.map(extractUsernameFromHref).filter(Boolean)
        )];
        console.log(`[scan] Found ${postLinks.length} tagged posts, grid usernames: ${gridUsernames.join(', ')}`);

        // Click into each post and screenshot
        const postDetails = [];
        for (const postHref of postLinks.slice(0, 3)) {
            try {
                const hrefUsername = extractUsernameFromHref(postHref);
                const postUrl = `https://www.instagram.com${postHref}`;
                await page.goto(postUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
                await page.waitForTimeout(2000);

                // Extract visible text (username, caption, location)
                const postInfo = await page.evaluate(() => {
                    const text = document.body.innerText || '';
                    // Try multiple selectors to find the poster's username
                    const selectors = [
                        'header a[role="link"]',
                        'header a[href*="/"]',
                        'article header a',
                        'a[role="link"][tabindex="0"]',
                    ];
                    let username = null;
                    for (const sel of selectors) {
                        const el = document.querySelector(sel);
                        if (el && el.textContent?.trim()) {
                            username = el.textContent.trim();
                            break;
                        }
                    }
                    return { bodyText: text.substring(0, 2000), username };
                });

                // Use href-extracted username as primary, DOM as fallback
                const finalUsername = hrefUsername || postInfo.username?.toLowerCase() || null;

                const postScreenshot = await page.screenshot({ type: 'png' });
                postDetails.push({
                    screenshot: postScreenshot.toString('base64'),
                    href: postHref,
                    username: finalUsername,
                    bodyTextSnippet: postInfo.bodyText.substring(0, 500),
                });
            } catch (err) {
                console.error(`[scan] Error clicking post ${postHref}:`, err.message);
            }
        }

        // Combine usernames from all sources
        const foundHandles = [...new Set([
            ...gridUsernames,
            ...postDetails.map(p => p.username).filter(Boolean),
        ])];

        await page.close();

        const elapsed = Date.now() - startTime;
        console.log(`[scan] Done in ${elapsed}ms — found ${postDetails.length} post details`);

        res.json({
            gridScreenshot: gridBase64,
            postDetails,
            screenshots: [gridBase64, ...postDetails.map(p => p.screenshot)],
            foundHandles,
            postCount: postLinks.length,
            elapsed,
        });
    } catch (err) {
        console.error('[scan] Error:', err.message);
        if (page) {
            try { await page.close(); } catch { }
        }
        res.status(500).json({ error: err.message });
    }
});

/**
 * POST /scan (legacy — screenshots any URL)
 */
app.post('/scan', async (req, res) => {
    const { url, waitMs = 5000 } = req.body;

    if (!url) {
        return res.status(400).json({ error: 'url is required' });
    }

    console.log(`[scan] Screenshotting: ${url}`);
    try {
        const context = await getInstagramContext();
        const page = await context.newPage();
        await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
        await page.waitForTimeout(waitMs);

        const screenshot = await page.screenshot({ fullPage: true, type: 'png' });
        await page.close();

        res.json({
            screenshot: screenshot.toString('base64'),
            width: 1280,
            height: 900,
        });
    } catch (err) {
        console.error('[scan] Error:', err.message);
        res.status(500).json({ error: err.message });
    }
});

/**
 * GET /health
 */
app.get('/health', async (req, res) => {
    const hasCookies = !!process.env.IG_SESSION_COOKIES;
    const browserAlive = browser && browser.isConnected();
    res.json({
        status: 'ok',
        uptime: process.uptime(),
        hasCookies,
        browserAlive,
    });
});

app.listen(PORT, () => {
    console.log(`Playwright Instagram scanner running on port ${PORT}`);
    if (!process.env.IG_SESSION_COOKIES) {
        console.warn('⚠️  No IG_SESSION_COOKIES set — Instagram will block tagged page access');
        console.warn('   Export cookies from your browser and set as env var');
    }
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
