// Take Play Store screenshots for SpaceNexus
// Run with: npx tsx scripts/take-screenshots.ts

import puppeteer from 'puppeteer';
import path from 'path';

const BASE_URL = 'https://spacenexus.us';
const OUTPUT_DIR = path.join(process.cwd(), 'public', 'play-store');

interface ScreenshotConfig {
  name: string;
  url: string;
  width: number;
  height: number;
  waitMs?: number;
  scrollY?: number;
}

const PHONE_SCREENSHOTS: ScreenshotConfig[] = [
  { name: 'phone-screenshot-1-homepage', url: '/', width: 412, height: 915, waitMs: 3000 },
  { name: 'phone-screenshot-2-mission-control', url: '/mission-control', width: 412, height: 915, waitMs: 4000 },
  { name: 'phone-screenshot-3-space-tycoon', url: '/space-tycoon', width: 412, height: 915, waitMs: 3000 },
  { name: 'phone-screenshot-4-discover', url: '/discover', width: 412, height: 915, waitMs: 2000 },
  { name: 'phone-screenshot-5-blog', url: '/blog', width: 412, height: 915, waitMs: 3000 },
  { name: 'phone-screenshot-6-night-sky', url: '/night-sky-guide', width: 412, height: 915, waitMs: 2000 },
];

const TABLET_SCREENSHOTS: ScreenshotConfig[] = [
  { name: 'tablet-screenshot-1-homepage', url: '/', width: 800, height: 1280, waitMs: 3000 },
  { name: 'tablet-screenshot-2-mission-control', url: '/mission-control', width: 800, height: 1280, waitMs: 4000 },
  { name: 'tablet-screenshot-3-space-tycoon', url: '/space-tycoon', width: 800, height: 1280, waitMs: 3000 },
  { name: 'tablet-screenshot-4-discover', url: '/discover', width: 800, height: 1280, waitMs: 2000 },
];

async function takeScreenshots() {
  console.log('Launching browser...');
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const allScreenshots = [...PHONE_SCREENSHOTS, ...TABLET_SCREENSHOTS];

  for (const config of allScreenshots) {
    console.log(`📸 ${config.name} (${config.width}x${config.height})...`);

    const page = await browser.newPage();
    await page.setViewport({
      width: config.width,
      height: config.height,
      deviceScaleFactor: 2, // Retina quality
    });

    // Set dark color scheme preference
    await page.emulateMediaFeatures([
      { name: 'prefers-color-scheme', value: 'dark' },
    ]);

    try {
      await page.goto(`${BASE_URL}${config.url}`, {
        waitUntil: 'networkidle2',
        timeout: 30000,
      });

      // Wait for content to render
      await new Promise(resolve => setTimeout(resolve, config.waitMs || 2000));

      // Dismiss any banners/popups
      try {
        // Close cookie consent if visible
        await page.evaluate(() => {
          const buttons = document.querySelectorAll('button');
          buttons.forEach(btn => {
            if (btn.textContent?.includes('Accept') || btn.textContent?.includes('Got it') || btn.textContent?.includes('Dismiss')) {
              btn.click();
            }
          });
          // Close any offline banner
          const offlineBanner = document.querySelector('[class*="offline"]');
          if (offlineBanner) (offlineBanner as HTMLElement).style.display = 'none';
        });
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch { /* ignore */ }

      // Scroll if needed
      if (config.scrollY) {
        await page.evaluate((y) => window.scrollTo(0, y), config.scrollY);
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      const outputPath = path.join(OUTPUT_DIR, `${config.name}.png`);
      await page.screenshot({
        path: outputPath,
        type: 'png',
        clip: {
          x: 0,
          y: 0,
          width: config.width,
          height: config.height,
        },
      });

      console.log(`  ✓ Saved: ${config.name}.png`);
    } catch (err) {
      console.error(`  ✗ Failed: ${config.name} — ${err}`);
    }

    await page.close();
  }

  await browser.close();
  console.log(`\nDone! ${allScreenshots.length} screenshots saved to public/play-store/`);
}

takeScreenshots().catch(console.error);
