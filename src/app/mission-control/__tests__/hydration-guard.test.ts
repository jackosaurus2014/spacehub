/**
 * Guard: /mission-control must hydrate against the HTML it served.
 *
 * Background (2026-09-12). MissionControlClient is a client island that
 * page.tsx server-renders WITH seeded events, so every date-derived branch
 * and every locale-formatted date in it ran twice — on the server (UTC, at
 * request time) and in the browser (visitor's zone, a second or more later).
 * Event cards printed "02:30 PM" on the server and "10:30 AM" for an EDT
 * visitor; "Live Now" and "Next 48 Hours" membership was decided by two
 * different `Date.now()` readings. React reported minified error #418 (text
 * mismatch) on 3 of 4 headless loads of the site's second most-visited page.
 *
 * The fix (see the "Hydration-safe clock" block at the top of the component):
 *   - page.tsx passes its own `now` as `initialNow`; `useHydratedClock` uses
 *     it for the server render and the hydration render, then switches to the
 *     wall clock after mount.
 *   - every locale date goes through `fmtDate` / `fmtTime`, which format in
 *     UTC until mounted and in the visitor's zone afterwards.
 *
 * This test keeps both halves in place. It is static (the component imports
 * next/navigation and friends, which jest cannot render cheaply); it reads
 * the source with comments stripped, the way
 * src/lib/__tests__/hydration-clock-guard.test.ts does.
 */
import { readFileSync } from 'fs';
import path from 'path';

const DIR = path.join(process.cwd(), 'src', 'app', 'mission-control');

function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
}

const client = stripComments(readFileSync(path.join(DIR, 'MissionControlClient.tsx'), 'utf8'));
const page = stripComments(readFileSync(path.join(DIR, 'page.tsx'), 'utf8'));

/** Bare wall-clock reads: `Date.now()` or `new Date()` with no argument. */
const WALL_CLOCK = /\bDate\.now\(\)|new Date\(\)/;

/**
 * Every wall-clock read the component is allowed to contain, keyed by the
 * trimmed source line, each with the reason it cannot mismatch. A new
 * `Date.now()` in a render path fails this test until it is either routed
 * through the hydrated clock or listed here with a reason.
 */
const ALLOWED_WALL_CLOCK_LINES: Record<string, string> = {
  'return { now: Number.isFinite(parsed) ? parsed : Date.now(), local: false };':
    'useHydratedClock fallback for a caller that omits initialNow; page.tsx always passes it.',
  'const tick = () => setClock({ now: Date.now(), local: true });':
    'Inside the useHydratedClock mount effect — runs only in the browser after hydration.',
  'const now = new Date();':
    'CountdownCard.updateCountdown and LiveNowSection.updateCountdowns — both live inside a setInterval useEffect, so they run only in the browser after hydration.',
  'const [now, setNow] = useState(Date.now());':
    'LiveCountdown: ticks every second and every digit span carries suppressHydrationWarning, the house pattern for live clocks.',
  'const timer = setInterval(() => setNow(Date.now()), 1000);':
    'LiveCountdown mount effect — browser only.',
  'const startDate = new Date().toISOString();':
    'fetchEvents callback — builds a request URL, never rendered.',
  'const endDate = new Date(Date.now() + 5 * 365 * 24 * 60 * 60 * 1000).toISOString();':
    'fetchEvents callback — builds a request URL, never rendered.',
  'setLastUpdated(new Date());':
    'Inside fetchEvents; lastUpdated feeds DataFreshnessBadge, which renders null until mounted.',
  'if (seeded) setLastUpdated(new Date());':
    'Mount effect; lastUpdated feeds DataFreshnessBadge, which renders null until mounted.',
};

describe('hydration guard: /mission-control', () => {
  it('page.tsx threads its request-time clock into the client island as initialNow', () => {
    expect(page).toMatch(/<MissionControlClient[^>]*initialNow=\{now\.toISOString\(\)\}/);
    expect(client).toContain('useHydratedClock(initialNow)');
  });

  it('every locale date/time format goes through the hydration-aware helpers', () => {
    // Exactly one call each: the one inside fmtDate / fmtTime.
    expect((client.match(/toLocaleDateString\(/g) || []).length).toBe(1);
    expect((client.match(/toLocaleTimeString\(/g) || []).length).toBe(1);
    // ...and no other locale formatter sneaks in.
    expect(client).not.toMatch(/\.toLocaleString\(/);
    expect(client).not.toMatch(/Intl\.DateTimeFormat\(/);
    // The helpers pin UTC until mounted.
    expect(client).toMatch(/local \|\| naive \? opts : \{ \.\.\.opts, timeZone: 'UTC' \}/);
  });

  it('every bare wall-clock read is on the allowlist with a reason', () => {
    const found = Array.from(
      new Set(
        client
          .split('\n')
          .map((l) => l.trim())
          .filter((l) => WALL_CLOCK.test(l)),
      ),
    ).sort();
    const unexplained = found.filter((l) => !(l in ALLOWED_WALL_CLOCK_LINES));
    expect(unexplained).toEqual([]);
  });

  it('the allowlist cannot rot: every entry still exists and carries a reason', () => {
    const lines = new Set(client.split('\n').map((l) => l.trim()));
    for (const [line, reason] of Object.entries(ALLOWED_WALL_CLOCK_LINES)) {
      expect(lines.has(line)).toBe(true);
      expect(reason.length).toBeGreaterThan(40);
    }
  });

  it('the live countdown still suppresses its per-second digit mismatch', () => {
    const start = client.indexOf('function LiveCountdown(');
    const end = client.indexOf('function FeaturedMissionCard(');
    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    expect(client.slice(start, end)).toContain('suppressHydrationWarning');
  });
});
