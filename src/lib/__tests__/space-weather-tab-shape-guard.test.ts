/**
 * Space-environment tab ↔ content-store shape guard (2026-09-10).
 *
 * The refresh cron stores ONE row per section: `earth-events` wraps the
 * EONET events in a flattened shape, `solar-imagery` wraps Helioviewer
 * metadata. The tab used to compare row counts against 3 and 2 and never
 * left "Sample data" mode, even with NASA_API_KEY set. Pin the mapping.
 */
import fs from 'fs';
import path from 'path';

const read = (rel: string) => fs.readFileSync(path.join(process.cwd(), rel), 'utf-8');

describe('space-environment tab reads the stored shapes', () => {
  it('fetcher stores flattened events and Helioviewer images under one row each', () => {
    const f = read('src/lib/module-api-fetchers.ts');
    expect(f).toMatch(/'earth-events',\s*\{\s*events: data\.events\.slice\(0, 30\)/);
    expect(f).toMatch(/'solar-imagery',\s*\{\s*solarImages,/);
  });
  it('the tab maps the stored row instead of counting rows', () => {
    const tab = read('src/app/space-environment/_components/SpaceWeatherTab.tsx');
    expect(tab).toMatch(/const liveEvents = liveEarthEvents\(eventsData\.data\)/);
    expect(tab).toMatch(/const captureTime = liveImageryTime\(imageryData\.data\)/);
    expect(tab).not.toMatch(/eventsData\.data\?\.length >= 3/);
    expect(tab).not.toMatch(/imageryData\.data\?\.length >= 2/);
    // the mapped fields are exactly what the fetcher writes
    for (const k of ['isClosed', 'sourceUrl', 'magnitudeUnit', 'latestImageDate', 'solarImages']) expect(tab).toContain(k);
    // SDO "latest" frames are live pictures; the badge must not call them sample data
    expect(tab.match(/Sample data &mdash; live feed unavailable/g)?.length).toBe(1);
    expect(tab).toContain('Latest SDO frames &mdash; capture time unavailable');
  });
});
