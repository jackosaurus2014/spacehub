/**
 * @jest-environment node
 *
 * Content-Security-Policy builder + middleware wiring (2026-09 audit, "CSP").
 *
 *   - INLINE_SCRIPT_HASHES match the scripts the layouts actually ship
 *   - policy shape: hosts fixed (GA regional beacons, AdSense runtime,
 *     Vimeo), dead hosts gone, nonce ladder, report-only has no
 *     upgrade-insecure-requests
 *   - NONCE_ELIGIBLE_ROUTES re-derived from src/app (drift fails the test)
 *     and, when a build exists, proven not prerendered
 *   - documentCspHeaders decision matrix
 *   - middleware: exactly one CSP header, XFO only with frame-ancestors 'none'
 */

import { createHash } from 'crypto';
import fs from 'fs';
import path from 'path';
import { NextRequest } from 'next/server';
import {
  buildCsp,
  documentCspHeaders,
  generateNonce,
  getCspMode,
  isEmbeddablePath,
  isNonceEligible,
  routePatternToRegExp,
  INLINE_SCRIPTS,
  INLINE_SCRIPT_HASHES,
  NONCE_ELIGIBLE_ROUTES,
  FRAME_SRC_HOSTS,
  REPORTING_ENDPOINTS_HEADER,
} from '@/lib/csp';

const ROOT = path.resolve(__dirname, '../../..');
const APP_DIR = path.join(ROOT, 'src', 'app');

// ── Inline script hashes ─────────────────────────────────────────────────

describe('INLINE_SCRIPT_HASHES', () => {
  it('match a fresh SHA-256 of each inline script string', () => {
    for (const [key, script] of Object.entries(INLINE_SCRIPTS)) {
      const expected = `sha256-${createHash('sha256').update(script).digest('base64')}`;
      expect({ key, hash: INLINE_SCRIPT_HASHES[key as keyof typeof INLINE_SCRIPTS] }).toEqual({
        key,
        hash: expected,
      });
    }
  });

  it('the layouts render the scripts from INLINE_SCRIPTS (never a literal)', () => {
    const root = fs.readFileSync(path.join(APP_DIR, 'layout.tsx'), 'utf8');
    const embed = fs.readFileSync(path.join(APP_DIR, 'embed', 'layout.tsx'), 'utf8');
    expect(root).toContain('INLINE_SCRIPTS.oledTheme');
    expect(root).toContain('INLINE_SCRIPTS.swRegister');
    expect(embed).toContain('INLINE_SCRIPTS.embedMark');
    // The literal bodies must not have crept back in beside the constant.
    expect(root).not.toContain("navigator.serviceWorker.register('/sw.js'");
    expect(embed).not.toContain("setAttribute('data-embed'");
    // And the root layout must not import next/headers: calling headers()
    // there would force every prerendered/ISR route dynamic.
    expect(root).not.toMatch(/from\s+['"]next\/headers['"]/);
  });
});

// ── Policy shape ─────────────────────────────────────────────────────────

function directive(policy: string, name: string): string {
  const d = policy.split(';').map((s) => s.trim()).find((s) => s.startsWith(`${name} `) || s === name);
  if (!d) throw new Error(`directive ${name} missing in: ${policy}`);
  return d;
}

describe('buildCsp — enforced (nonce-free) policy', () => {
  const prod = buildCsp({ frameAncestors: "'none'" });

  it("keeps today's script-src shape with no nonce and no hashes", () => {
    const s = directive(prod, 'script-src');
    expect(s).toContain("'self'");
    expect(s).toContain("'unsafe-inline'");
    expect(s).not.toContain('nonce-');
    expect(s).not.toContain('strict-dynamic');
    expect(s).not.toContain('sha256-');
    expect(s).not.toContain("'unsafe-eval'");
    expect(s).toContain('https://www.googletagmanager.com');
    expect(s).toContain('https://pagead2.googlesyndication.com');
  });

  it('connect-src covers GA4 regional beacons and the AdSense runtime', () => {
    const c = directive(prod, 'connect-src');
    for (const h of [
      'https://*.google-analytics.com',
      'https://*.analytics.google.com',
      'https://stats.g.doubleclick.net',
      'https://googleads.g.doubleclick.net',
      'https://ep1.adtrafficquality.google',
      'https://ep2.adtrafficquality.google',
      'https://csi.gstatic.com',
      'https://fundingchoicesmessages.google.com',
      'https://pagead2.googlesyndication.com',
      'https://api.nasa.gov',
      'https://www.youtube-nocookie.com',
    ]) {
      expect(c).toContain(h);
    }
  });

  it('frame-src keeps YouTube/Vimeo/AdSense and drops Twitter + google.com', () => {
    const f = directive(prod, 'frame-src');
    expect(f).toContain('https://player.vimeo.com');
    expect(f).toContain('https://www.youtube-nocookie.com');
    expect(f).toContain('https://www.youtube.com');
    expect(f).toContain('https://googleads.g.doubleclick.net');
    expect(f).toContain('https://tpc.googlesyndication.com');
    expect(f).not.toContain('platform.twitter.com');
    expect(f).not.toContain('https://www.google.com');
    expect(FRAME_SRC_HOSTS).toContain('https://player.vimeo.com');
  });

  it('drops the dead Google Fonts hosts (next/font self-hosts)', () => {
    expect(prod).not.toContain('fonts.googleapis.com');
    expect(prod).not.toContain('fonts.gstatic.com');
    expect(directive(prod, 'style-src')).toBe("style-src 'self' 'unsafe-inline'");
    expect(directive(prod, 'font-src')).toBe("font-src 'self' data:");
  });

  it('carries the hardening directives + reporting', () => {
    expect(directive(prod, "object-src")).toBe("object-src 'none'");
    expect(directive(prod, 'worker-src')).toBe("worker-src 'self' blob:");
    expect(directive(prod, 'manifest-src')).toBe("manifest-src 'self'");
    expect(directive(prod, 'base-uri')).toBe("base-uri 'self'");
    expect(directive(prod, 'form-action')).toBe("form-action 'self'");
    expect(directive(prod, 'img-src')).toBe('img-src \'self\' data: blob: https:');
    expect(prod).toContain('upgrade-insecure-requests');
    expect(directive(prod, 'report-uri')).toBe('report-uri /api/csp-report');
    expect(directive(prod, 'report-to')).toBe('report-to csp-endpoint');
    expect(REPORTING_ENDPOINTS_HEADER).toBe('csp-endpoint="/api/csp-report"');
  });

  it('frame-ancestors follows the option', () => {
    expect(directive(prod, 'frame-ancestors')).toBe("frame-ancestors 'none'");
    expect(directive(buildCsp({ frameAncestors: '*' }), 'frame-ancestors')).toBe('frame-ancestors *');
  });

  it('dev adds unsafe-eval, blob: and websocket sources, and no upgrade', () => {
    const dev = buildCsp({ frameAncestors: "'none'", dev: true });
    expect(directive(dev, 'script-src')).toContain("'unsafe-eval'");
    expect(directive(dev, 'script-src')).toContain('blob:');
    expect(directive(dev, 'connect-src')).toContain('ws:');
    expect(directive(dev, 'connect-src')).toContain('wss:');
    expect(dev).not.toContain('upgrade-insecure-requests');
  });
});

describe('buildCsp — nonce policy', () => {
  const nonce = 'dGVzdG5vbmNldGVzdG5vbmNl';

  it('script-src is nonce + strict-dynamic + hashes + CSP2/CSP1 fallbacks', () => {
    const s = directive(buildCsp({ nonce, frameAncestors: "'none'" }), 'script-src');
    expect(s).toContain(`'nonce-${nonce}'`);
    expect(s).toContain("'strict-dynamic'");
    for (const h of Object.values(INLINE_SCRIPT_HASHES)) expect(s).toContain(`'${h}'`);
    expect(s).toContain('https:');
    expect(s).toContain("'unsafe-inline'");
    expect(s).not.toContain("'unsafe-eval'");
  });

  it('report-only variant omits upgrade-insecure-requests', () => {
    const ro = buildCsp({ nonce, frameAncestors: "'none'", reportOnly: true });
    expect(ro).not.toContain('upgrade-insecure-requests');
    expect(ro).toContain('report-uri /api/csp-report');
  });
});

describe('generateNonce', () => {
  it('is base64 of 16 random bytes and unique per call', () => {
    const a = generateNonce();
    const b = generateNonce();
    expect(a).toMatch(/^[A-Za-z0-9+/]{22}==$/);
    expect(Buffer.from(a, 'base64')).toHaveLength(16);
    expect(a).not.toBe(b);
  });
});

describe('getCspMode', () => {
  it('defaults to report-only and only recognises enforce-nonce', () => {
    expect(getCspMode(undefined)).toBe('report-only');
    expect(getCspMode('')).toBe('report-only');
    expect(getCspMode('enforce')).toBe('report-only');
    expect(getCspMode('enforce-nonce')).toBe('enforce-nonce');
  });
});

// ── Nonce eligibility ────────────────────────────────────────────────────

/**
 * Re-derive the nonce-eligible route list from the filesystem with the rule
 * documented in src/lib/csp.ts:
 *   (a) page.tsx (server component only — Next ignores segment config in a
 *       'use client' page) or an ancestor layout.tsx below root declares
 *       `export const dynamic = 'force-dynamic'`, OR
 *   (b) a [param] segment, no generateStaticParams(), and no positive
 *       `export const revalidate`.
 */
function deriveFromFilesystem(): { eligible: string[]; isr: string[] } {
  const eligible: string[] = [];
  const isr: string[] = [];
  const forceDynamic = (file: string) =>
    /export\s+const\s+dynamic\s*=\s*['"]force-dynamic['"]/.test(fs.readFileSync(file, 'utf8'));
  const isClientComponent = (src: string) =>
    /^\s*(?:\/\/[^\n]*\n|\/\*[\s\S]*?\*\/\s*)*['"]use client['"]/.test(src);

  const walk = (dir: string, segs: string[], ancestorForced: boolean) => {
    const layout = path.join(dir, 'layout.tsx');
    const forced = ancestorForced || (segs.length > 0 && fs.existsSync(layout) && forceDynamic(layout));
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        if (entry.name === 'api') continue;
        walk(path.join(dir, entry.name), [...segs, entry.name], forced);
        continue;
      }
      if (entry.name !== 'page.tsx') continue;
      const src = fs.readFileSync(path.join(dir, entry.name), 'utf8');
      const urlSegs = segs.filter((s) => !/^\(.*\)$/.test(s) && !s.startsWith('@'));
      const route = '/' + urlSegs.join('/');
      const rev = src.match(/export\s+const\s+revalidate\s*=\s*(\d+)/);
      const positiveRevalidate = !!rev && Number(rev[1]) > 0;
      if (positiveRevalidate) isr.push(route);
      const hasParam = urlSegs.some((s) => /^\[.*\]$/.test(s));
      const hasGsp = /generateStaticParams/.test(src);
      const ownForceDynamic = !isClientComponent(src) && forceDynamic(path.join(dir, entry.name));
      if (forced || ownForceDynamic || (hasParam && !hasGsp && !positiveRevalidate)) {
        eligible.push(route);
      }
    }
  };
  walk(APP_DIR, [], false);
  return { eligible: eligible.sort(), isr: isr.sort() };
}

describe('NONCE_ELIGIBLE_ROUTES', () => {
  const derived = deriveFromFilesystem();

  it('equals the list derived from src/app (update csp.ts when routes change)', () => {
    expect([...NONCE_ELIGIBLE_ROUTES].sort()).toEqual(derived.eligible);
  });

  it('contains no ISR route and no /api path', () => {
    for (const r of derived.isr) expect(NONCE_ELIGIBLE_ROUTES).not.toContain(r);
    for (const r of NONCE_ELIGIBLE_ROUTES) expect(r.startsWith('/api')).toBe(false);
  });

  it('every ISR page is nonce-ineligible when matched as a concrete path', () => {
    expect(derived.isr.length).toBeGreaterThan(20);
    for (const r of derived.isr) {
      const concrete = r.replace(/\[[^\]]+\]/g, 'x');
      expect({ route: r, eligible: isNonceEligible(concrete) }).toEqual({ route: r, eligible: false });
    }
  });

  it('is not contradicted by the last build (prerender-manifest), when one exists', () => {
    const manifestPath = path.join(ROOT, '.next', 'prerender-manifest.json');
    if (!fs.existsSync(manifestPath)) return;
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8')) as {
      routes: Record<string, unknown>;
      dynamicRoutes: Record<string, unknown>;
    };
    const prerendered = new Set([...Object.keys(manifest.routes), ...Object.keys(manifest.dynamicRoutes)]);
    const collisions = NONCE_ELIGIBLE_ROUTES.filter((r) => prerendered.has(r));
    expect(collisions).toEqual([]);
  });
});

describe('isNonceEligible', () => {
  it('is true for per-request routes', () => {
    expect(isNonceEligible('/')).toBe(true);
    expect(isNonceEligible('/news')).toBe(true);
    expect(isNonceEligible('/company-profiles/spacex')).toBe(true);
    expect(isNonceEligible('/embed/space-weather')).toBe(true);
    expect(isNonceEligible('/launches/vandenberg/2026-09')).toBe(true);
  });

  it('is false for static, ISR, api and unknown paths', () => {
    expect(isNonceEligible('/about')).toBe(false);
    expect(isNonceEligible('/pricing')).toBe(false);
    expect(isNonceEligible('/blog/some-post')).toBe(false); // revalidate = 3600
    expect(isNonceEligible('/guide/space-industry')).toBe(false);
    expect(isNonceEligible('/api/news')).toBe(false);
    expect(isNonceEligible('/definitely/not/a/route')).toBe(false);
    expect(isNonceEligible('relative')).toBe(false);
  });

  it('routePatternToRegExp anchors and escapes', () => {
    const re = routePatternToRegExp('/a.b/[slug]');
    expect(re.test('/a.b/x')).toBe(true);
    expect(re.test('/axb/x')).toBe(false);
    expect(re.test('/a.b/x/y')).toBe(false);
    expect(routePatternToRegExp('/docs/[...rest]').test('/docs/a/b/c')).toBe(true);
  });
});

// ── documentCspHeaders decision matrix ───────────────────────────────────

describe('documentCspHeaders', () => {
  const nonce = 'ZmFrZW5vbmNlZmFrZW5vbmNl';

  it('static / ISR route: enforced nonce-free policy, XFO DENY, nothing else', () => {
    const h = documentCspHeaders({ pathname: '/about', mode: 'report-only', dev: false, nonce });
    expect(h.nonce).toBeUndefined();
    expect(h.reportOnly).toBeUndefined();
    expect(h.enforced).not.toContain('nonce-');
    expect(h.xFrameOptions).toBe('DENY');
    expect(directive(h.enforced, 'frame-ancestors')).toBe("frame-ancestors 'none'");
  });

  it('eligible route, report-only: enforced stays nonce-free, report-only carries the nonce', () => {
    const h = documentCspHeaders({ pathname: '/news', mode: 'report-only', dev: false, nonce });
    expect(h.nonce).toBe(nonce);
    expect(h.enforced).not.toContain('nonce-');
    expect(h.enforced).toContain('upgrade-insecure-requests');
    expect(h.reportOnly).toContain(`'nonce-${nonce}'`);
    expect(h.reportOnly).toContain("'strict-dynamic'");
    expect(h.reportOnly).not.toContain('upgrade-insecure-requests');
  });

  it('eligible route, enforce-nonce: the nonce policy is the enforced header', () => {
    const h = documentCspHeaders({ pathname: '/news', mode: 'enforce-nonce', dev: false, nonce });
    expect(h.nonce).toBe(nonce);
    expect(h.reportOnly).toBeUndefined();
    expect(h.enforced).toContain(`'nonce-${nonce}'`);
    expect(h.enforced).toContain("'strict-dynamic'");
    expect(h.enforced).toContain('upgrade-insecure-requests');
  });

  it('embeddable paths get frame-ancestors * and no X-Frame-Options', () => {
    for (const p of ['/embed/space-weather', '/embed/countdown/starship-flight-12', '/widgets/launch-cadence']) {
      const h = documentCspHeaders({ pathname: p, mode: 'report-only', dev: false, nonce });
      expect(isEmbeddablePath(p)).toBe(true);
      expect(h.xFrameOptions).toBeUndefined();
      expect(directive(h.enforced, 'frame-ancestors')).toBe('frame-ancestors *');
      if (h.reportOnly) expect(directive(h.reportOnly, 'frame-ancestors')).toBe('frame-ancestors *');
    }
    expect(isEmbeddablePath('/embeds')).toBe(false);
  });

  it('generates a fresh nonce when none is injected', () => {
    const a = documentCspHeaders({ pathname: '/news', mode: 'report-only', dev: false });
    const b = documentCspHeaders({ pathname: '/news', mode: 'report-only', dev: false });
    expect(a.nonce).toBeDefined();
    expect(a.nonce).not.toBe(b.nonce);
  });
});

// ── Middleware wiring ────────────────────────────────────────────────────

describe('middleware document branch', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { middleware } = require('@/middleware') as typeof import('@/middleware');
  const originalMode = process.env.CSP_MODE;
  afterEach(() => {
    if (originalMode === undefined) delete process.env.CSP_MODE;
    else process.env.CSP_MODE = originalMode;
  });

  it('sends exactly one CSP header + XFO DENY on a normal page, plus report-only on eligible ones', async () => {
    delete process.env.CSP_MODE;
    const res = await middleware(new NextRequest('https://spacenexus.us/news'));
    const csp = res.headers.get('content-security-policy');
    expect(csp).toBeTruthy();
    expect(csp).not.toContain('nonce-');
    expect(directive(csp!, 'frame-ancestors')).toBe("frame-ancestors 'none'");
    expect(res.headers.get('x-frame-options')).toBe('DENY');
    expect(res.headers.get('reporting-endpoints')).toBe(REPORTING_ENDPOINTS_HEADER);
    const ro = res.headers.get('content-security-policy-report-only');
    expect(ro).toContain("'strict-dynamic'");
    // Next reads the nonce from the *request* CSP[-Report-Only] header.
    const fwd = res.headers.get('x-middleware-request-content-security-policy-report-only');
    const xNonce = res.headers.get('x-middleware-request-x-nonce');
    expect(xNonce).toMatch(/^[A-Za-z0-9+/]{22}==$/);
    expect(fwd).toContain(`'nonce-${xNonce}'`);
    expect(res.headers.get('x-middleware-request-content-security-policy')).toBeNull();
  });

  it('embeds: frame-ancestors *, no X-Frame-Options, single CSP header', async () => {
    const res = await middleware(new NextRequest('https://spacenexus.us/embed/space-weather'));
    expect(directive(res.headers.get('content-security-policy')!, 'frame-ancestors')).toBe('frame-ancestors *');
    expect(res.headers.get('x-frame-options')).toBeNull();
  });

  it('static pages get no report-only header and no forwarded nonce', async () => {
    const res = await middleware(new NextRequest('https://spacenexus.us/about'));
    expect(res.headers.get('content-security-policy')).toBeTruthy();
    expect(res.headers.get('content-security-policy-report-only')).toBeNull();
    expect(res.headers.get('x-middleware-request-x-nonce')).toBeNull();
    expect(res.headers.get('x-frame-options')).toBe('DENY');
  });

  it('CSP_MODE=enforce-nonce moves the nonce policy into the enforced header', async () => {
    process.env.CSP_MODE = 'enforce-nonce';
    const res = await middleware(new NextRequest('https://spacenexus.us/news'));
    const csp = res.headers.get('content-security-policy')!;
    const xNonce = res.headers.get('x-middleware-request-x-nonce');
    expect(csp).toContain(`'nonce-${xNonce}'`);
    expect(res.headers.get('content-security-policy-report-only')).toBeNull();
    expect(res.headers.get('x-middleware-request-content-security-policy')).toBe(csp);
  });

  it('the hand-rolled 404 carries the enforced policy and DENY', async () => {
    const res = await middleware(new NextRequest('https://spacenexus.us/rockets/not-a-real-rocket-xyz'));
    expect(res.status).toBe(404);
    expect(res.headers.get('content-security-policy')).toContain("frame-ancestors 'none'");
    expect(res.headers.get('x-frame-options')).toBe('DENY');
  });

  it('/api/csp-report: CSRF-exempt POST with no Origin, no-store, own rate bucket', async () => {
    const res = await middleware(
      new NextRequest('https://spacenexus.us/api/csp-report', {
        method: 'POST',
        headers: { 'content-type': 'application/csp-report' },
      }),
    );
    expect(res.status).not.toBe(403);
    expect(res.headers.get('cache-control')).toBe('no-store');
    expect(res.headers.get('x-ratelimit-remaining')).toBe('19');
  });
});

describe('next.config.js', () => {
  it('no longer sets CSP or X-Frame-Options (middleware owns both)', () => {
    const src = fs.readFileSync(path.join(ROOT, 'next.config.js'), 'utf8');
    expect(src).not.toMatch(/key:\s*'Content-Security-Policy'/);
    expect(src).not.toMatch(/key:\s*'X-Frame-Options'/);
    expect(src).toMatch(/key:\s*'Strict-Transport-Security'/);
  });
});
