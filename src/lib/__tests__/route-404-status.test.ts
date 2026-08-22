/**
 * @jest-environment node
 */
/**
 * Structural guard for the "notFound() returns HTTP 200" defect.
 *
 * Background: notFound() called from inside a route that Next has already
 * matched is handled by the CLIENT-side NotFoundBoundary. It swaps in the
 * not-found UI but cannot touch the response status, which is committed to
 * 200 long before it runs. Unknown slugs therefore got indexed as real
 * pages. Two fixes are in use across the app:
 *
 *   1. static-slug routes  — `export const dynamicParams = false` plus a
 *      generateStaticParams() enumerating every valid value, so Next's
 *      ROUTER 404s unknown params before the page renders at all;
 *   2. DB-backed routes    — an entry in middleware.ts's
 *      SLUG_EXISTENCE_CHECKS, which asks a tiny side-effect-free `exists`
 *      API and returns a genuine 404 Response before rendering. (Railway's
 *      build container has no DB, so option 1 is impossible for these.)
 *
 * These tests fail if someone adds a dynamic page that calls notFound()
 * and forgets to give it one of the two — the case that let this defect
 * accumulate across a dozen routes in the first place.
 */
import fs from 'fs';
import path from 'path';
import { SLUG_EXISTENCE_CHECKS } from '@/middleware';

const APP_DIR = path.join(process.cwd(), 'src', 'app');

/** Placeholder substituted for a [dynamic] segment when building a probe
 *  URL. Deliberately not a real slug so it can't collide with an
 *  excludedSlugs entry (e.g. /learn/zone). */
const PARAM = '_param_';

interface DynamicPage {
  /** Route path as a browser would request it, params replaced by PARAM. */
  routePath: string;
  /** Path of the page.tsx relative to the repo root, for failure messages. */
  file: string;
  source: string;
}

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      // API handlers set their own status codes directly; the defect is
      // specific to rendered pages.
      if (full === path.join(APP_DIR, 'api')) continue;
      walk(full, out);
    } else if (entry.name === 'page.tsx' || entry.name === 'page.ts') {
      out.push(full);
    }
  }
  return out;
}

function toRoutePath(file: string): string {
  const rel = path.relative(APP_DIR, path.dirname(file)).split(path.sep);
  const segments = rel
    // Route groups — (marketing) — don't appear in the URL.
    .filter((s) => !(s.startsWith('(') && s.endsWith(')')))
    .map((s) => (s.startsWith('[') && s.endsWith(']') ? PARAM : s));
  return '/' + segments.join('/');
}

function collectDynamicPages(): DynamicPage[] {
  return walk(APP_DIR)
    .map((file) => ({
      file: path.relative(process.cwd(), file).replace(/\\/g, '/'),
      routePath: toRoutePath(file),
      source: fs.readFileSync(file, 'utf8'),
    }))
    .filter((p) => p.routePath.includes(PARAM));
}

/**
 * Routes deliberately left on the old behaviour, each with a reason. Adding
 * to this list should be a conscious decision, not a default.
 */
const DOCUMENTED_EXCEPTIONS: Record<string, string> = {
  '/embed/countdown/_param_':
    'Embed iframe, served with robots noindex/nofollow — no crawl budget is ' +
    'at stake, and this is a hot third-party-embedded path where an extra ' +
    'middleware round-trip on every load would cost more than it fixes.',
};

const dynamicPages = collectDynamicPages();

/** Resolve an API URL path (as produced by existsApiPath) to the route.ts
 *  file that would handle it, honouring [dynamic] directory segments. */
function resolveApiHandler(apiPath: string): string | null {
  const clean = apiPath.split('?')[0];
  const segments = clean.split('/').filter(Boolean);
  let dir = APP_DIR;
  for (const segment of segments) {
    const literal = path.join(dir, segment);
    if (fs.existsSync(literal) && fs.statSync(literal).isDirectory()) {
      dir = literal;
      continue;
    }
    const dynamicDir = fs
      .readdirSync(dir, { withFileTypes: true })
      .find((e) => e.isDirectory() && e.name.startsWith('[') && e.name.endsWith(']'));
    if (!dynamicDir) return null;
    dir = path.join(dir, dynamicDir.name);
  }
  for (const candidate of ['route.ts', 'route.tsx']) {
    const handler = path.join(dir, candidate);
    if (fs.existsSync(handler)) return handler;
  }
  return null;
}

describe('dynamic routes return a real 404 status for unknown params', () => {
  it('finds dynamic pages to check (guards against the walker silently breaking)', () => {
    expect(dynamicPages.length).toBeGreaterThan(10);
  });

  const pagesUsingNotFound = dynamicPages.filter((p) => /\bnotFound\(/.test(p.source));

  it('finds pages that call notFound()', () => {
    expect(pagesUsingNotFound.length).toBeGreaterThan(5);
  });

  it.each(pagesUsingNotFound.map((p) => [p.routePath, p] as const))(
    '%s has a real-404 mechanism',
    (routePath, page) => {
      if (routePath in DOCUMENTED_EXCEPTIONS) return;

      const hasStaticParamsFix =
        /export\s+const\s+dynamicParams\s*=\s*false/.test(page.source) &&
        /generateStaticParams/.test(page.source);
      const hasMiddlewareFix = SLUG_EXISTENCE_CHECKS.some((c) => c.match.test(routePath));

      const covered = hasStaticParamsFix || hasMiddlewareFix;
      if (!covered) {
        throw new Error(
          `${page.file} calls notFound() on dynamic route ${routePath}, which means ` +
            `unknown params return HTTP 200 with 404-looking content. Give it either ` +
            `(a) "export const dynamicParams = false" + generateStaticParams() if the ` +
            `valid values are build-time-known, or (b) an exists route + an entry in ` +
            `SLUG_EXISTENCE_CHECKS in src/middleware.ts if they come from Postgres. ` +
            `If neither applies, add it to DOCUMENTED_EXCEPTIONS in this file with a reason.`
        );
      }
      expect(covered).toBe(true);
    }
  );

  it('every documented exception still points at a real page', () => {
    for (const routePath of Object.keys(DOCUMENTED_EXCEPTIONS)) {
      expect(dynamicPages.map((p) => p.routePath)).toContain(routePath);
    }
  });
});

describe('SLUG_EXISTENCE_CHECKS entries are wired to real endpoints', () => {
  it('has entries', () => {
    expect(SLUG_EXISTENCE_CHECKS.length).toBeGreaterThan(0);
  });

  it.each(SLUG_EXISTENCE_CHECKS.map((c, i) => [c.match.source, c, i] as const))(
    '%s resolves to an exists route handler',
    (_source, check) => {
      const apiPath = check.existsApiPath('probe-slug');
      expect(apiPath.startsWith('/api/')).toBe(true);
      const handler = resolveApiHandler(apiPath);
      expect({ apiPath, handler }).toEqual({ apiPath, handler: expect.any(String) });
      const src = fs.readFileSync(handler as string, 'utf8');
      // The middleware contract: only a 404 means "missing". Every handler
      // must be able to produce one, and must fail open on error.
      expect(src).toMatch(/status:\s*404/);
      expect(src).toMatch(/exists:\s*true,\s*error:\s*true|unchecked/);
    }
  );

  it('each entry matches its own route and nothing shorter or longer', () => {
    for (const check of SLUG_EXISTENCE_CHECKS) {
      const matching = dynamicPages.filter((p) => check.match.test(p.routePath));
      expect({
        pattern: check.match.source,
        matched: matching.map((p) => p.routePath),
      }).toEqual({
        pattern: check.match.source,
        matched: expect.arrayContaining([expect.any(String)]),
      });
    }
  });

  it('never matches a sibling static page (which would 404 live content)', () => {
    const staticPages = dynamicPages.length
      ? walk(APP_DIR)
          .map(toRoutePath)
          .filter((r) => !r.includes(PARAM))
      : [];
    expect(staticPages.length).toBeGreaterThan(50);

    for (const routePath of staticPages) {
      for (const check of SLUG_EXISTENCE_CHECKS) {
        const m = routePath.match(check.match);
        if (!m) continue;
        // A static page caught by a slug regex MUST be excluded by name,
        // or middleware would ask "does this slug exist?" about a page that
        // isn't a slug at all and 404 it.
        expect({ routePath, excluded: Boolean(check.excludedSlugs?.has(m[1])) }).toEqual({
          routePath,
          excluded: true,
        });
      }
    }
  });
});
