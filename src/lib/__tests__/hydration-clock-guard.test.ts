/**
 * Guard: a client component that reads the wall clock DURING RENDER must
 * suppress its hydration warning.
 *
 * Background (2026-09-03). `LiveRailClock` held `now` in state initialised to
 * null and rendered `target - (now ?? Date.now())`. The server render and the
 * hydration render therefore each substituted their OWN `Date.now()`, and on
 * the prerendered/ISR routes the rail appears on those two instants are
 * minutes to hours apart. The text could never match, so React reported
 * minified error #418 ("text content does not match server-rendered HTML") on
 * every page load site-wide. It was misfiled for days as a /space-tycoon
 * problem and as a headless-browser artifact; it was neither.
 *
 * The divergence itself is correct — a clock has to show the viewer's time —
 * so the fix is React's sanctioned escape hatch, `suppressHydrationWarning`,
 * which `src/components/ui/Countdown.tsx` already used. This test stops the
 * pattern coming back anywhere else: if a client component falls back to the
 * wall clock inside render, it must either suppress the warning or be listed
 * below with a reason.
 */
import { readFileSync, readdirSync, statSync } from 'fs';
import path from 'path';

const COMPONENTS = path.join(process.cwd(), 'src', 'components');

/** Render-path wall-clock fallbacks: `?? Date.now()` / `?? new Date()`. */
const CLOCK_FALLBACK = /\?\?\s*(Date\.now\(\)|new Date\(\))/;

/**
 * Components that read the clock in render but cannot mismatch. Each needs a
 * reason, not just an entry.
 */
const ALLOWED: Record<string, string> = {
  'launches/LaunchRow.tsx':
    'Uses the clock only to pick future-vs-past status wording, takes `now` as a prop so list callers pass one stable value, and can only differ in the single second a launch crosses T-0.',
};

/**
 * Strip comments before looking for the attribute. Without this the guard
 * passes on a file whose *comment* merely mentions `suppressHydrationWarning`
 * — which is exactly what happened on the first cut of this test, since the
 * explanatory header in `LiveRailClock.tsx` names the attribute twice. A guard
 * that its own documentation satisfies is not a guard.
 */
function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
}

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.tsx$/.test(entry)) out.push(full);
  }
  return out;
}

describe('hydration guard: render-path clock reads', () => {
  const offenders: Array<{ rel: string; line: string }> = [];

  beforeAll(() => {
    for (const file of walk(COMPONENTS)) {
      const src = stripComments(readFileSync(file, 'utf8'));
      if (!src.includes("'use client'") && !src.includes('"use client"')) continue;
      if (!CLOCK_FALLBACK.test(src)) continue;
      if (src.includes('suppressHydrationWarning')) continue;
      const rel = path.relative(COMPONENTS, file).split(path.sep).join('/');
      if (rel in ALLOWED) continue;
      const line = (src.split('\n').find((l) => CLOCK_FALLBACK.test(l)) || '').trim();
      offenders.push({ rel, line });
    }
  });

  it('every client component with a wall-clock render fallback suppresses hydration warnings', () => {
    expect(offenders).toEqual([]);
  });

  it('the LiveRail clock in particular still suppresses it', () => {
    const src = stripComments(readFileSync(path.join(COMPONENTS, 'LiveRailClock.tsx'), 'utf8'));
    expect(CLOCK_FALLBACK.test(src)).toBe(true);
    expect(src).toContain('suppressHydrationWarning');
  });

  it('every allowlist entry names a real file, so the list cannot rot', () => {
    for (const rel of Object.keys(ALLOWED)) {
      expect(() => statSync(path.join(COMPONENTS, rel))).not.toThrow();
      expect(ALLOWED[rel].length).toBeGreaterThan(40);
    }
  });
});
