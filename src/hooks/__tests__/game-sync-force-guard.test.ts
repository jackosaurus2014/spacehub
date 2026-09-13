/**
 * Guard (2026-09-12): the funds-refusal retry in asset-client relies on
 * useGameSync registering a FORCED sync. The hook rate-limits routine syncs
 * to one per 30 s; if the registered function were the plain doSync, the
 * retry would fire without a sync whenever the routine sync had just run —
 * exactly what the live Space Tycoon probe caught on the first deploy.
 */
import * as fs from 'fs';
import * as path from 'path';

const src = fs.readFileSync(path.join(__dirname, '..', 'useGameSync.ts'), 'utf8');

describe('useGameSync forced sync for the funds retry', () => {
  it('registers a forced sync with the sync bridge', () => {
    expect(src).toMatch(/registerSyncNow\(\(\) => doSync\(\{ force: true \}\)\)/);
  });
  it('reports a throttled sync with the server retryAfterMs so the bridge can wait it out', () => {
    expect(src).toMatch(/return { outcome: 'throttled', retryAfterMs };/);
  });
  it('lets a forced sync bypass the 30 s rate limit', () => {
    expect(src).toMatch(/if \(!opts\?\.force && Date\.now\(\) - lastSyncRef\.current < 30_000\) return \{ outcome: 'skipped' \};/);
  });
});
