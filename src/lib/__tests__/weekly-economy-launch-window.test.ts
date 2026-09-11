/**
 * Weekly economy brief — "Launches in the next 14 days" (2026-09-10).
 * The 2026-09-07 brief printed 0 while the tracker listed six, because the
 * query matched only status 'upcoming' and scheduled launches are stored
 * with LL2's 'go' / 'tbc' / 'tbd'. Pin the status set to the live endpoint's.
 */
import fs from 'fs';
import path from 'path';

const read = (rel: string) => fs.readFileSync(path.join(process.cwd(), rel), 'utf-8');

describe('weekly economy launch window', () => {
  it('counts every scheduled status the live launch endpoint counts', () => {
    const report = read('src/lib/weekly-economy-report.ts');
    expect(report).toMatch(/status: \{ in: \['upcoming', 'go', 'tbc', 'tbd'\] \},\s*type: 'launch',\s*launchDate: \{ gte: now, lte: twoWeeksAhead \}/);
    expect(read('src/app/api/live/route.ts')).toMatch(/status: \{ in: \['upcoming', 'go', 'tbc', 'tbd'\] \}/);
  });
});
