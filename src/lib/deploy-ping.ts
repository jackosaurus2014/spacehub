import { submitAllToIndexNow } from './indexnow';
import { logger } from './logger';

/**
 * Ping search engines after deployment.
 * Called from the cron scheduler on startup or a deploy webhook.
 */
export async function pingSearchEnginesOnDeploy(): Promise<void> {
  try {
    // 1. Ping Google sitemap
    await fetch('https://www.google.com/ping?sitemap=https://spacenexus.us/sitemap/0.xml');

    // 2. Ping Bing sitemap
    await fetch('https://www.bing.com/ping?sitemap=https://spacenexus.us/sitemap/0.xml');

    // 3. Submit critical URLs via IndexNow
    await submitAllToIndexNow();

    logger.info('Deploy ping: search engines notified');
  } catch (error) {
    logger.error('Deploy ping failed', { error: String(error) });
  }
}
