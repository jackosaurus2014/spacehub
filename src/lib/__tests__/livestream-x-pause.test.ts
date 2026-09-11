/** X leg of livestream detection pauses for a day on 402/401/403 (2026-09-11). */
import { isXApiPaused, pauseXApi } from '../livestream-detector';
import fs from 'fs';
import path from 'path';

describe('X API pause', () => {
  it('is not paused by default, pauses for the given hours, then resumes', () => {
    const t0 = 1_000_000;
    expect(isXApiPaused(t0)).toBe(false);
    pauseXApi(24, t0);
    expect(isXApiPaused(t0 + 23 * 3_600_000)).toBe(true);
    expect(isXApiPaused(t0 + 24 * 3_600_000)).toBe(false);
  });
  it('the detector pauses on 402/401/403 and skips while paused', () => {
    const src = fs.readFileSync(path.join(process.cwd(), 'src/lib/livestream-detector.ts'), 'utf-8');
    expect(src).toMatch(/if \(res\.status === 402 \|\| res\.status === 401 \|\| res\.status === 403\) \{\s*pauseXApi\(24\);/);
    expect(src).toMatch(/if \(isXApiPaused\(\)\) return streams;/);
  });
});
