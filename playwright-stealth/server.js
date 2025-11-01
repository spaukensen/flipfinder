const express = require('express');
const { chromium } = require('playwright-extra');
const stealth = require('puppeteer-extra-plugin-stealth')();

// Apply stealth plugin
chromium.use(stealth);

const app = express();
app.use(express.json());

// Store browser instance
let browser = null;

async function getBrowser() {
  if (!browser || !browser.isConnected()) {
    browser = await chromium.launch({
      headless: true,
      args: [
        '--disable-blink-features=AutomationControlled',
        '--disable-dev-shm-usage',
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-web-security',
        '--disable-features=IsolateOrigins,site-per-process',
        '--disable-blink-features=AutomationControlled'
      ]
    });
  }
  return browser;
}

app.post('/scrape', async (req, res) => {
  const { url, waitFor = 3000 } = req.body;

  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }

  let page = null;

  try {
    const browser = await getBrowser();
    const context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      locale: 'fr-FR',
      timezoneId: 'Europe/Paris',
      permissions: [],
      extraHTTPHeaders: {
        'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1'
      }
    });

    page = await context.newPage();

    // Add extra stealth measures
    await page.addInitScript(() => {
      // Override navigator.webdriver
      Object.defineProperty(navigator, 'webdriver', {
        get: () => undefined
      });

      // Mock chrome runtime
      window.chrome = {
        runtime: {}
      };

      // Mock permissions
      const originalQuery = window.navigator.permissions.query;
      window.navigator.permissions.query = (parameters) => (
        parameters.name === 'notifications' ?
          Promise.resolve({ state: Notification.permission }) :
          originalQuery(parameters)
      );

      // Mock plugins
      Object.defineProperty(navigator, 'plugins', {
        get: () => [1, 2, 3, 4, 5]
      });

      // Mock languages
      Object.defineProperty(navigator, 'languages', {
        get: () => ['fr-FR', 'fr', 'en-US', 'en']
      });
    });

    console.log(`Fetching: ${url}`);

    // Navigate with realistic timing
    await page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    });

    // Wait for Cloudflare challenge to complete
    await page.waitForTimeout(waitFor);

    // Check if Cloudflare challenge is still present
    const cloudflarePresent = await page.evaluate(() => {
      return document.body.innerHTML.includes('cloudflare') ||
             document.body.innerHTML.includes('cf-browser-verification') ||
             document.body.innerHTML.includes('challenge-platform');
    });

    if (cloudflarePresent) {
      console.log('Cloudflare detected, waiting longer...');
      await page.waitForTimeout(5000);
    }

    // Simulate human behavior
    await page.mouse.move(100, 100);
    await page.mouse.move(200, 200);
    await page.waitForTimeout(500);

    // INTERENCHERES SPECIFIC: Wait for Vue.js to hydrate and load lots
    console.log('Waiting for Vue.js to load lots...');

    try {
      // Strategy 1: Wait for network idle (all XHR/Fetch completed)
      await page.waitForLoadState('networkidle', { timeout: 15000 });
      console.log('Network idle reached');

      // Strategy 2: Wait for specific Vue.js elements to appear
      // Try multiple possible selectors for lot items
      const selectors = [
        '[data-lot]',
        '.v-card[href*="/lot"]',
        'a[href*="/lot/"]',
        '.autoqa-lot',
        '[class*="lot-item"]',
        '[class*="search-result"]'
      ];

      for (const selector of selectors) {
        try {
          await page.waitForSelector(selector, { timeout: 5000 });
          console.log(`Found lots with selector: ${selector}`);
          break;
        } catch (e) {
          console.log(`Selector ${selector} not found, trying next...`);
        }
      }

      // Additional wait for Vue.js to finish rendering
      await page.waitForTimeout(2000);

    } catch (error) {
      console.log('Timeout waiting for lots, continuing anyway:', error.message);
      // Continue even if timeout - maybe lots are already loaded
    }

    // Get final HTML after Vue.js hydration
    const html = await page.content();
    const url_final = page.url();

    await context.close();

    res.json({
      success: true,
      html,
      url: url_final,
      cloudflareDetected: cloudflarePresent
    });

  } catch (error) {
    console.error('Scraping error:', error);

    if (page) {
      try {
        await page.close();
      } catch (e) {
        console.error('Error closing page:', e);
      }
    }

    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', browserConnected: browser?.isConnected() || false });
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Playwright Stealth API running on port ${PORT}`);
});

// Cleanup on exit
process.on('SIGINT', async () => {
  if (browser) {
    await browser.close();
  }
  process.exit(0);
});

process.on('SIGTERM', async () => {
  if (browser) {
    await browser.close();
  }
  process.exit(0);
});
