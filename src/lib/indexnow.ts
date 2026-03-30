import { logger } from './logger';

const INDEXNOW_KEY = '8f3a9b2c4d5e6f7a1b2c3d4e5f6a7b8c';
const HOST = 'spacenexus.us';
const BASE_URL = `https://${HOST}`;

/**
 * Submit URLs to IndexNow for immediate indexing by Bing, Yandex, etc.
 * Can be called after publishing new content, deploying, or updating pages.
 */
export async function submitToIndexNow(paths: string[]): Promise<boolean> {
  if (process.env.NODE_ENV !== 'production') return false;

  const urls = paths.map(p => p.startsWith('http') ? p : `${BASE_URL}${p}`);

  try {
    const res = await fetch('https://api.indexnow.org/indexnow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        host: HOST,
        key: INDEXNOW_KEY,
        keyLocation: `${BASE_URL}/${INDEXNOW_KEY}.txt`,
        urlList: urls.slice(0, 10000),
      }),
    });

    logger.info('IndexNow submitted', { urlCount: urls.length, status: res.status });
    return res.ok || res.status === 202;
  } catch (error) {
    logger.error('IndexNow failed', { error: String(error) });
    return false;
  }
}

/**
 * Submit all important site URLs — call on deploy or periodic refresh.
 */
export async function submitAllToIndexNow(): Promise<boolean> {
  const criticalPaths = [
    '/', '/ignition', '/live', '/satellites', '/news', '/market-intel',
    '/compare', '/space-talent', '/blog', '/pricing', '/company-profiles',
    '/mission-control', '/space-environment', '/compliance', '/solar-exploration',
    '/business-opportunities', '/mission-cost', '/marketplace',
  ];

  // Add top blog posts
  const blogPaths = [
    '/blog/how-to-watch-artemis-ii-launch-complete-guide',
    '/blog/nasa-ignition-rfi-guide-how-space-companies-should-respond',
    '/blog/top-5-things-space-ceos-need-to-know-nasa-ignition',
    '/blog/spacex-everything-you-need-to-know-2026',
    '/blog/nasa-artemis-program-complete-guide-2026',
    '/blog/spacex-falcon-9-most-launched-rocket-history',
    '/blog/spacex-falcon-heavy-complete-guide-2026',
    '/blog/nasa-moon-base-2026-complete-guide-project-ignition',
    '/blog/nasa-20-billion-moon-base-everything-you-need-to-know',
    '/blog/nasa-moon-base-commercial-space-implications',
  ];

  // Add comparison pages
  const comparePaths = [
    '/compare/spacex-vs-blue-origin', '/compare/starlink-vs-kuiper',
    '/compare/spacex-vs-rocket-lab', '/compare/axiom-vs-vast',
    '/compare/starlink-vs-ast-spacemobile', '/compare/iceye-vs-capella-space',
  ];

  return submitToIndexNow([...criticalPaths, ...blogPaths, ...comparePaths]);
}
