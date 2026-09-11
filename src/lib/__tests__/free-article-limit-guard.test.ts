/**
 * Free-tier daily article limit has ONE source (2026-09-10): TIER_ACCESS.free.
 * The usage banner hard-coded 25 and the news page 10 while the tier (and
 * /pricing) said 15, so the meter read "15/25 free articles today".
 */
import fs from 'fs';
import path from 'path';
import { TIER_ACCESS } from '../subscription';

const read = (rel: string) => fs.readFileSync(path.join(process.cwd(), rel), 'utf-8');

describe('free-tier daily article limit', () => {
  it('is 15 and matches the pricing copy', () => {
    expect(TIER_ACCESS.free.maxDailyArticles).toBe(15);
    expect(read('src/types/index.ts')).toContain('Up to 15 articles per day');
  });
  it('the banner and the news page read the tier, not a literal', () => {
    for (const rel of ['src/components/marketing/UsageLimitBanner.tsx', 'src/app/news/NewsPageClient.tsx']) {
      const src = read(rel);
      expect(src).toContain('TIER_ACCESS.free.maxDailyArticles');
      expect(src).not.toMatch(/const maxDaily(Articles)? = \d+;/);
    }
  });
});
