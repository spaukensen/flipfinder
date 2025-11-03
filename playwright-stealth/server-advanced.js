const express = require('express');
const { chromium } = require('playwright-extra');
const stealth = require('puppeteer-extra-plugin-stealth')();

// Apply stealth plugin
chromium.use(stealth);

const app = express();
app.use(express.json());

// Store browser instance
let browser = null;

// Realistic User Agents (updated 2025)
const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:133.0) Gecko/20100101 Firefox/133.0'
];

function getRandomUserAgent() {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

function randomDelay(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

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
        '--window-size=1920,1080',
        // Anti-fingerprinting
        '--disable-canvas-aa',
        '--disable-2d-canvas-clip-aa',
        '--disable-gl-drawing-for-tests',
        '--disable-gpu',
        // Timezone
        '--lang=fr-FR'
      ]
    });
  }
  return browser;
}

// Simulate realistic mouse movements
async function humanMouseMovement(page) {
  const movements = [
    { x: 100, y: 100 },
    { x: 250, y: 180 },
    { x: 400, y: 300 },
    { x: 600, y: 450 },
    { x: 300, y: 200 }
  ];

  for (const pos of movements) {
    await page.mouse.move(pos.x, pos.y, { steps: randomDelay(5, 15) });
    await page.waitForTimeout(randomDelay(50, 150));
  }
}

// Simulate human scrolling
async function humanScroll(page) {
  await page.evaluate(async () => {
    const scrollHeight = document.documentElement.scrollHeight;
    const viewportHeight = window.innerHeight;
    const scrollSteps = 5;
    const stepSize = (scrollHeight - viewportHeight) / scrollSteps;

    for (let i = 0; i < scrollSteps; i++) {
      window.scrollBy({
        top: stepSize,
        behavior: 'smooth'
      });
      await new Promise(resolve => setTimeout(resolve, Math.random() * 500 + 300));
    }

    // Scroll back to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

app.post('/scrape', async (req, res) => {
  const { url, waitFor = 8000, simulateHuman = true } = req.body;

  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }

  let page = null;
  let context = null;

  try {
    const browser = await getBrowser();
    const userAgent = getRandomUserAgent();

    // AUGMENTATION: Délai initial aléatoire (simuler utilisateur réel)
    await new Promise(resolve => setTimeout(resolve, randomDelay(500, 2000)));

    context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
      userAgent: userAgent,
      locale: 'fr-FR',
      timezoneId: 'Europe/Paris',
      permissions: ['geolocation'],
      geolocation: { latitude: 48.8566, longitude: 2.3522 }, // Paris
      colorScheme: 'light',
      deviceScaleFactor: 1,
      hasTouch: false,
      isMobile: false,
      extraHTTPHeaders: {
        'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
        'Accept-Encoding': 'gzip, deflate, br, zstd',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Sec-Ch-Ua': '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
        'Sec-Ch-Ua-Mobile': '?0',
        'Sec-Ch-Ua-Platform': '"Windows"',
        'Cache-Control': 'max-age=0'
      }
    });

    page = await context.newPage();

    // CRITICAL: Advanced anti-detection for DataDome
    await page.addInitScript(() => {
      // 1. Override navigator.webdriver
      Object.defineProperty(navigator, 'webdriver', {
        get: () => undefined
      });

      // 2. Mock chrome runtime
      window.chrome = {
        runtime: {},
        loadTimes: function() {},
        csi: function() {},
        app: {}
      };

      // 3. Override permissions API
      const originalQuery = window.navigator.permissions.query;
      window.navigator.permissions.query = (parameters) => (
        parameters.name === 'notifications' ?
          Promise.resolve({ state: Notification.permission }) :
          originalQuery(parameters)
      );

      // 4. Mock plugins (realistic Chrome plugins)
      Object.defineProperty(navigator, 'plugins', {
        get: () => {
          return [
            { name: 'Chrome PDF Plugin', description: 'Portable Document Format', filename: 'internal-pdf-viewer' },
            { name: 'Chrome PDF Viewer', description: '', filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai' },
            { name: 'Native Client', description: '', filename: 'internal-nacl-plugin' }
          ];
        }
      });

      // 5. Mock languages
      Object.defineProperty(navigator, 'languages', {
        get: () => ['fr-FR', 'fr', 'en-US', 'en']
      });

      // 6. Mock platform
      Object.defineProperty(navigator, 'platform', {
        get: () => 'Win32'
      });

      // 7. Mock hardware concurrency
      Object.defineProperty(navigator, 'hardwareConcurrency', {
        get: () => 8
      });

      // 8. Mock device memory
      Object.defineProperty(navigator, 'deviceMemory', {
        get: () => 8
      });

      // 9. Override toString methods (anti-detection)
      const originalToString = Function.prototype.toString;
      Function.prototype.toString = function() {
        if (this === navigator.permissions.query) {
          return 'function query() { [native code] }';
        }
        return originalToString.call(this);
      };

      // 10. Mock screen properties (realistic values)
      Object.defineProperty(screen, 'width', { get: () => 1920 });
      Object.defineProperty(screen, 'height', { get: () => 1080 });
      Object.defineProperty(screen, 'availWidth', { get: () => 1920 });
      Object.defineProperty(screen, 'availHeight', { get: () => 1040 });
      Object.defineProperty(screen, 'colorDepth', { get: () => 24 });
      Object.defineProperty(screen, 'pixelDepth', { get: () => 24 });

      // 11. Mock WebGL fingerprint (basic)
      const getParameter = WebGLRenderingContext.prototype.getParameter;
      WebGLRenderingContext.prototype.getParameter = function(parameter) {
        if (parameter === 37445) {
          return 'Intel Inc.';
        }
        if (parameter === 37446) {
          return 'Intel(R) UHD Graphics 630';
        }
        return getParameter.call(this, parameter);
      };

      // 12. Remove automation traces
      delete navigator.__proto__.webdriver;

      // 13. Mock battery API (if exists)
      if (navigator.getBattery) {
        navigator.getBattery = () => Promise.resolve({
          charging: true,
          chargingTime: 0,
          dischargingTime: Infinity,
          level: 1
        });
      }

      // 14. Console logs anti-detection
      console.log('DataDome bypass initialized');
    });

    console.log(`[${new Date().toISOString()}] Fetching: ${url}`);
    console.log(`User-Agent: ${userAgent}`);

    // AUGMENTATION: Simuler visite page d'accueil d'abord (anti-bot)
    console.log('🏠 Visiting homepage first...');
    await page.goto('https://www.leboncoin.fr', {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    });
    await page.waitForTimeout(randomDelay(3000, 5000));

    // Mouvements souris sur homepage
    await humanMouseMovement(page);
    await page.waitForTimeout(randomDelay(1000, 2000));

    // PUIS navigation vers URL cible
    console.log(`🎯 Navigating to target: ${url}`);
    await page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    });

    console.log('Page loaded, waiting for content...');

    // AUGMENTATION: Attente initiale plus longue
    await page.waitForTimeout(randomDelay(4000, 7000));

    // Check for DataDome challenge
    const dataDomePresent = await page.evaluate(() => {
      return document.body.innerHTML.includes('datadome') ||
             document.body.innerHTML.includes('captcha-delivery') ||
             document.body.innerHTML.includes('DataDome') ||
             document.querySelector('iframe[title*="DataDome"]') !== null;
    });

    if (dataDomePresent) {
      console.log('⚠️ DataDome detected! Attempting bypass...');

      // AUGMENTATION: Comportement humain très agressif
      if (simulateHuman) {
        // Mouvement souris multiple
        await humanMouseMovement(page);
        await page.waitForTimeout(randomDelay(2000, 4000));

        // Multiple clics aléatoires
        await page.mouse.click(randomDelay(300, 700), randomDelay(200, 400));
        await page.waitForTimeout(randomDelay(1500, 2500));

        await page.mouse.click(randomDelay(800, 1200), randomDelay(300, 500));
        await page.waitForTimeout(randomDelay(1000, 2000));

        // Scrolling multiple
        await humanScroll(page);
        await page.waitForTimeout(randomDelay(3000, 5000));

        // Encore des mouvements
        await humanMouseMovement(page);
        await page.waitForTimeout(randomDelay(2000, 3000));

        // Keyboard events (simuler recherche)
        await page.keyboard.press('Tab');
        await page.waitForTimeout(randomDelay(500, 1000));
        await page.keyboard.press('Tab');
        await page.waitForTimeout(randomDelay(500, 1000));
      }

      // AUGMENTATION: Attente beaucoup plus longue (20-30 secondes)
      console.log('⏳ Waiting 20-30 seconds for DataDome challenge...');
      await page.waitForTimeout(randomDelay(20000, 30000));

      // Check again
      const stillBlocked = await page.evaluate(() => {
        return document.body.innerHTML.includes('datadome') ||
               document.body.innerHTML.includes('captcha-delivery');
      });

      if (stillBlocked) {
        console.log('❌ DataDome bypass failed');
        // Get HTML BEFORE closing context
        const failedHtml = await page.content();
        const failedUrl = page.url();
        await context.close();
        return res.json({
          success: false,
          html: failedHtml,
          url: failedUrl,
          dataDomeDetected: true,
          error: 'DataDome challenge could not be bypassed'
        });
      } else {
        console.log('✅ DataDome bypass successful!');
      }
    }

    // AUGMENTATION: Comportement humain systématique (même sans DataDome détecté)
    if (simulateHuman) {
      console.log('🤖 Simulating human behavior...');
      await humanMouseMovement(page);
      await page.waitForTimeout(randomDelay(2000, 4000));

      // Scrolling réaliste
      await humanScroll(page);
      await page.waitForTimeout(randomDelay(2000, 3000));

      // Encore des mouvements
      await humanMouseMovement(page);
      await page.waitForTimeout(randomDelay(1500, 2500));
    }

    // Check if Cloudflare challenge is present
    const cloudflarePresent = await page.evaluate(() => {
      return document.body.innerHTML.includes('cloudflare') ||
             document.body.innerHTML.includes('cf-browser-verification') ||
             document.body.innerHTML.includes('challenge-platform');
    });

    if (cloudflarePresent) {
      console.log('Cloudflare detected, waiting longer...');
      await page.waitForTimeout(randomDelay(8000, 12000));
    }

    // Wait for network idle (dynamic content loaded)
    try {
      await page.waitForLoadState('networkidle', { timeout: 20000 });
      console.log('✅ Network idle reached');
    } catch (e) {
      console.log('⚠️ Network idle timeout, continuing...');
    }

    // AUGMENTATION: Attente finale plus longue
    console.log(`⏳ Final wait: ${waitFor}ms`);
    await page.waitForTimeout(waitFor);

    // Get final HTML
    const html = await page.content();
    const url_final = page.url();

    await context.close();

    console.log(`✅ Scraping completed: ${url_final.substring(0, 100)}...`);
    console.log(`HTML size: ${html.length} bytes`);

    res.json({
      success: true,
      html,
      url: url_final,
      cloudflareDetected: cloudflarePresent,
      dataDomeDetected: false
    });

  } catch (error) {
    console.error('❌ Scraping error:', error);

    if (context) {
      try {
        await context.close();
      } catch (e) {
        console.error('Error closing context:', e);
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

// PORT 3002 for LeBonCoin (different from Interencheres on 3001)
const PORT = process.env.PORT || 3002;
app.listen(PORT, () => {
  console.log(`🚀 Playwright Stealth API (LeBonCoin) running on port ${PORT}`);
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
