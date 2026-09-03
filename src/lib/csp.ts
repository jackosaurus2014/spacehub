/**
 * Content-Security-Policy builder — the single source of truth for the
 * site's CSP. Consumed by src/middleware.ts (edge runtime) and the root
 * layouts, so this module MUST stay edge-safe: no Node imports, Web Crypto
 * only.
 *
 * Two policies come out of here (docs/SECURITY_AUDIT_2026-09.md, "CSP"):
 *
 *   1. The ENFORCED policy — today's `'self' 'unsafe-inline' + hosts`
 *      shape with the connect-src / frame-src / frame-ancestors fixes. No
 *      nonce, no strict-dynamic. Always sent, so nothing regresses.
 *   2. The NONCE policy — `'nonce-…' 'strict-dynamic'` plus a CSP2 fallback
 *      ladder. Sent as Content-Security-Policy-Report-Only on nonce-eligible
 *      routes. CSP_MODE=enforce-nonce would make it the enforced header
 *      there — DO NOT FLIP THIS (see below); it is not yet safe.
 *
 * ⚠ THE REPORT-ONLY NONCE EXPERIMENT CANNOT VALIDATE ITSELF (found
 * 2026-09-03, docs/SECURITY_AUDIT_2026-09.md "CSP: nonce diagnosis"). Empirically
 * verified against the actual installed Next 15.5.25 (prod curl + a local
 * `next start` A/B on the same build, CSP_MODE=report-only vs enforce-nonce):
 * Next.js only stamps its own <script> tags with the nonce when the nonce
 * arrives on the ENFORCED `Content-Security-Policy` request header. When it
 * arrives only on `Content-Security-Policy-Report-Only` (today's default),
 * Next stamps ZERO script tags with any nonce — not its own bootstrap/chunk
 * scripts, not our three hash-listed inline scripts (they don't need one,
 * but this proves the mechanism is dark, not selective). This holds despite
 * `parseRequestHeaders` in Next's own source reading
 * `headers['content-security-policy'] || headers['content-security-policy-report-only']`
 * — the fallback exists in the source but does not reach script-stamping in
 * practice, and Next's official CSP docs only ever document the enforced
 * header for this. Consequence: every `script-src-elem` violation reported
 * against our own origin under report-only mode is an artifact of this dead
 * mechanism, not evidence about real nonce coverage — the report-only
 * telemetry proves nothing about enforce-nonce readiness. A second,
 * independent blocker was found in the same investigation: our root layout
 * renders ~15 SEO JSON-LD `<script type="application/ld+json">` components
 * (`src/components/StructuredData.tsx`, `src/components/seo/*Schema.tsx`,
 * used across ~100 pages) with neither a nonce nor a hash — most carry
 * per-page dynamic content so they can't be hash-listed like the three
 * static inline scripts. In a local enforce-nonce A/B these were the only
 * script tags left unstamped (8 of 58 on /embed/space-weather: 5 JSON-LD +
 * our 3 hash-covered ones — the JSON-LD ones, unlike ours, have no hash
 * fallback). A CSP3 browser under strict-dynamic + nonce ignores the
 * `'unsafe-inline' https:` fallback, so these would be blocked outright if
 * CSP_MODE=enforce-nonce were flipped today. Recommendation: do not flip
 * CSP_MODE for the ~2026-09-08 decision; the enforced-policy hardening
 * above is the safe path. Resume the nonce ambition only after (a) threading
 * the nonce through every JSON-LD schema component, and (b) re-testing with
 * the nonce actually carried on the enforced header (a narrow experiment on
 * 2-3 already-dynamic routes), since report-only can't tell us anything.
 *
 * Why the nonce policy is gated by route (isNonceEligible) regardless: Next 14+
 * reads the nonce from the request's *enforced* CSP header and stamps it on
 * its own scripts, but it does NOT force dynamic rendering. A nonce sent to
 * a prerendered / ISR route would either be absent from the cached HTML
 * (every Next script reports a violation; in enforce mode the page would not
 * hydrate) or — worse — be baked into the ISR cache by a revalidation and
 * served to every later visitor. So nonces go only to routes Next renders
 * per request.
 */

// ── Host allowlists ───────────────────────────────────────────────────────

/** gtag.js loader + GA4 script hosts. */
export const GA_SCRIPT_HOSTS = [
  'https://www.googletagmanager.com',
  'https://www.google-analytics.com',
] as const;

/** GA4 beacon / measurement endpoints (regional collectors included). */
export const GA_CONNECT_HOSTS = [
  'https://*.google-analytics.com',
  'https://*.analytics.google.com',
  'https://stats.g.doubleclick.net',
  'https://www.googletagmanager.com',
] as const;

/** AdSense runtime script hosts (adsbygoogle.js and what it pulls in). */
export const ADSENSE_SCRIPT_HOSTS = [
  'https://pagead2.googlesyndication.com',
  'https://adservice.google.com',
  'https://www.googletagservices.com',
  'https://tpc.googlesyndication.com',
  'https://googleads.g.doubleclick.net',
  'https://fundingchoicesmessages.google.com',
  'https://ep2.adtrafficquality.google',
] as const;

/** AdSense XHR/beacon hosts. */
export const ADSENSE_CONNECT_HOSTS = [
  'https://pagead2.googlesyndication.com',
  'https://adservice.google.com',
  'https://googleads.g.doubleclick.net',
  'https://tpc.googlesyndication.com',
  'https://ep1.adtrafficquality.google',
  'https://ep2.adtrafficquality.google',
  'https://csi.gstatic.com',
  'https://fundingchoicesmessages.google.com',
] as const;

/** Hosts browser code fetches directly (client components). */
export const CLIENT_CONNECT_HOSTS = [
  'https://api.nasa.gov',
  'https://www.youtube-nocookie.com',
] as const;

/**
 * Hosts that are (as far as recon can tell) only ever fetched server-side
 * but were in the old connect-src. Kept for now so nothing regresses; prune
 * once report-only telemetry has run clean for a fortnight (see the audit
 * doc). Removing an entry here removes it from the policy — nothing else.
 */
export const LEGACY_CONNECT_HOSTS = [
  'https://api.spaceflightnewsapi.net',
  'https://ll.thespacedevs.com',
  'https://services.swpc.noaa.gov',
  'https://celestrak.org',
  'https://ssd-api.jpl.nasa.gov',
  'https://epic.gsfc.nasa.gov',
  'https://eonet.gsfc.nasa.gov',
  'https://api.helioviewer.org',
  'https://eyes.jpl.nasa.gov',
  'https://api.wheretheiss.at',
  'https://www.sbir.gov',
  'https://images-api.nasa.gov',
  'https://exoplanetarchive.ipac.caltech.edu',
  'https://www.asterank.com',
  'https://api.spacexdata.com',
  'https://www.googleapis.com',
] as const;

/**
 * Iframe destinations: YouTube players, Vimeo (AMA replays), AdSense creative
 * frames, plus the AdSense auxiliary frames confirmed live-blocking in prod
 * CSP reports on 2026-09-03 (docs/SECURITY_AUDIT_2026-09.md, "CSP"):
 *   - pagead2.googlesyndication.com — ad creative rendering; seen blocked in
 *     the production report log (intermittent in manual repro, kept because
 *     the report log shows it recurring).
 *   - ep1./ep2.adtrafficquality.google — Google's invalid-traffic detection
 *     frames. A real-browser repro against two live ad-bearing pages
 *     (space-launch-cost-comparison, space-stocks) showed the AdSense tag
 *     itself unaffected (window.adsbygoogle defined, slot gets an iframe)
 *     but these two frames reproducibly blocked — degrades Google's
 *     invalid-traffic/serving-quality signal without stopping ad delivery.
 *   - www.google.com — same auxiliary-frame family, reproducibly blocked
 *     alongside ep2 in the same repro.
 *   - fundingchoicesmessages.google.com — consent-message iframe (EU/UK
 *     consent mode); not reproduced blocked but ships from the same origin
 *     family as the script-src entry below it, kept for parity.
 */
export const FRAME_SRC_HOSTS = [
  'https://www.youtube-nocookie.com',
  'https://www.youtube.com',
  'https://player.vimeo.com',
  'https://googleads.g.doubleclick.net',
  'https://tpc.googlesyndication.com',
  'https://pagead2.googlesyndication.com',
  'https://ep1.adtrafficquality.google',
  'https://ep2.adtrafficquality.google',
  'https://www.google.com',
  'https://fundingchoicesmessages.google.com',
] as const;

export const CSP_REPORT_PATH = '/api/csp-report';
export const CSP_REPORT_GROUP = 'csp-endpoint';

// ── Inline scripts we ship, with their hashes ────────────────────────────
//
// The root layouts render exactly three executable inline scripts. They are
// static strings, so they are allow-listed by hash rather than by nonce —
// which is what lets the root layout stay free of headers() (calling
// headers() in the root layout would opt all ~600 prerendered routes out
// of static rendering). CSP3 honours hashes alongside 'strict-dynamic'.
//
// The hashes are literals so buildCsp() can stay synchronous on the edge;
// src/lib/__tests__/csp.test.ts recomputes them and fails with the correct
// value if a script string changes.
export const INLINE_SCRIPTS = {
  /** Applies the OLED theme class before first paint (localStorage flag). */
  oledTheme:
    "try{if(localStorage.getItem('spacenexus-oled')==='true')document.documentElement.classList.add('oled')}catch(e){}",
  /** Service-worker registration for PWA crawlers (prod only, see layout). */
  swRegister:
    "if('serviceWorker' in navigator){navigator.serviceWorker.register('/sw.js',{scope:'/'})}",
  /** Marks the body so the /embed/* chrome-hiding CSS activates. */
  embedMark: "document.body.setAttribute('data-embed','true');",
} as const;

export const INLINE_SCRIPT_HASHES: Record<keyof typeof INLINE_SCRIPTS, string> = {
  oledTheme: 'sha256-K5DWs+C/jfkbtoun/nxQTsNa4y2QZW55JIEJD2n3gGQ=',
  swRegister: 'sha256-LNRWiZ4I08gdF7Uy2WO/ddhq7pVUadnsR/R2uOOx4Qs=',
  embedMark: 'sha256-QhpnDipOKZo4bySE7BVFUR9AFX3MzGD5NtuIX8y+5E8=',
};

// ── Nonce eligibility ─────────────────────────────────────────────────────
//
// Route patterns Next 14 renders per request on this codebase, i.e. the only
// places a per-request nonce is correct. Derived from the filesystem by the
// rule below; src/lib/__tests__/csp.test.ts re-derives the list from src/app
// and fails on drift, and additionally checks the last build's
// .next/prerender-manifest.json (when present) to prove none of these is
// prerendered.
//
// Rule — a page route is nonce-eligible when EITHER
//   (a) its page.tsx (a SERVER component — Next ignores segment config
//       exported from a 'use client' page; the last build prerendered 17
//       such pages with a `dynamic = 'force-dynamic'` line in them), or an
//       ancestor layout.tsx below the root, declares
//       `export const dynamic = 'force-dynamic'`, OR
//   (b) it has a [param] segment, no generateStaticParams(), and no
//       positive `export const revalidate` (dynamic segments without
//       generateStaticParams are rendered on every request).
//
// Everything else — including every `export const revalidate = N` page
// (/guide/*, /blog/[slug], /chart, the legal pages, /space-tycoon/about|
// dev-log|corp/[id], /space-talent/browse/[slug]|job/[id],
// /space-industry/[city], /space-stocks, …) and every plain static page —
// gets the enforced policy only.
export const NONCE_ELIGIBLE_ROUTES: readonly string[] = [
  '/',
  '/advertise',
  '/ai-insights/[slug]',
  '/amas/[id]',
  '/briefs',
  '/build-guides',
  '/build-guides/[slug]',
  '/cap-tables/[companySlug]',
  '/chart/[slug]',
  '/community/forums/[slug]',
  '/community/forums/[slug]/[threadId]',
  '/company-profiles',
  '/company-profiles/[slug]',
  '/compare/anduril-vs-l3harris-space',
  '/compare/ast-spacemobile-vs-lynk',
  '/compare/astra-vs-virgin-orbit',
  '/compare/astrolab-vs-intuitive-machines',
  '/compare/axiom-vs-vast',
  '/compare/blacksky-vs-planet-labs',
  '/compare/clearspace-vs-astroscale',
  '/compare/firefly-vs-abl-space',
  '/compare/iceye-vs-capella-space',
  '/compare/intuitive-machines-vs-astrobotic',
  '/compare/iridium-vs-starlink',
  '/compare/leolabs-vs-slingshot',
  '/compare/loft-orbital-vs-york-space',
  '/compare/pulsar-fusion-vs-ad-astra',
  '/compare/relativity-space-vs-firefly',
  '/compare/rocket-lab-vs-astra',
  '/compare/rocket-lab-vs-relativity-space',
  '/compare/rocket-lab-vs-spacex',
  '/compare/satellogic-vs-planet-labs',
  '/compare/sierra-space-vs-axiom-space',
  '/compare/skylo-vs-ast-spacemobile',
  '/compare/space42-vs-planet-labs',
  '/compare/spacex-vs-blue-origin',
  '/compare/spcx-vs-rklb-stock',
  '/compare/spire-vs-hawkeye-360',
  '/compare/starlink-vs-ast-spacemobile',
  '/compare/starlink-vs-kuiper',
  '/compare/viasat-vs-ses',
  '/compare/vulcan-centaur-vs-falcon-9',
  '/conjunctions',
  '/countdown',
  '/countdown/[slug]',
  '/datasets',
  '/desk',
  '/embed/chart/[slug]',
  '/embed/countdown/[slug]',
  '/embed/launch-cadence',
  '/embed/space-weather',
  '/export-compliance-qa',
  '/gallery',
  '/gallery/[eventId]',
  '/gig-work',
  '/gig-work/[id]',
  '/gig-work/my-gigs',
  '/gig-work/post',
  '/guide/blue-origin-vs-spacex',
  '/guide/space-debris-and-traffic-management',
  '/guide/watch-a-launch/[city]',
  '/hire',
  '/hiring-index',
  '/hiring-index/[month]',
  '/hiring-trends',
  '/history',
  '/history/[slug]',
  '/how-many-satellites',
  '/industry-trends',
  '/investor-hub',
  '/investor-hub/deal-memos/[slug]',
  '/investor-hub/theses/[slug]',
  '/jobs',
  '/launch-cadence',
  '/launch-slips',
  '/launch/[eventId]',
  '/launches',
  '/launches/[site]',
  '/launches/[site]/[month]',
  '/learn',
  '/learn/[track]',
  '/learn/[track]/[moduleSlug]',
  '/learn/[track]/[moduleSlug]/[lessonSlug]',
  '/learn/zone',
  '/marketplace',
  '/marketplace/listings/[slug]',
  '/marketplace/rfq/[id]',
  '/markets-daily',
  '/mentors/[userId]',
  '/mission-control',
  '/mission-debriefs/[slug]',
  '/news',
  '/podcasts',
  '/podcasts/[slug]',
  '/podcasts/[slug]/[episodeSlug]',
  '/predictions',
  '/provider-dashboard/edit-listing/[slug]',
  '/regulation-explainers/[slug]',
  '/regulatory-radar',
  '/regulatory-radar/action/[id]',
  '/report-cards',
  '/reports',
  '/rockets',
  '/rockets/[slug]',
  '/satellites',
  '/space-budget',
  '/space-stats',
  '/space-talent',
  '/space-tycoon/chronicle',
  '/space-tycoon/epoch',
  '/space-tycoon/leaderboard',
  '/space-tycoon/registry',
  '/space-tycoon/seasons/[n]',
  '/space-weather',
  '/speaking/[id]',
  '/this-day-in-space',
  '/ticket-resale/[id]',
  '/tonight/[city]',
  '/videos',
];

/** Turns a Next route pattern ('/a/[b]/c') into an anchored matcher. */
export function routePatternToRegExp(pattern: string): RegExp {
  const src = pattern
    .split('/')
    .map((seg) => {
      if (/^\[\.\.\..+\]$/.test(seg)) return '.+';
      if (/^\[.+\]$/.test(seg)) return '[^/]+';
      return seg.replace(/[.*+?^${}()|\\]/g, '\\$&');
    })
    .join('/');
  return new RegExp(`^${src}/?$`);
}

const NONCE_ELIGIBLE_MATCHERS = NONCE_ELIGIBLE_ROUTES.map(routePatternToRegExp);

/**
 * True only for routes Next renders per request (see NONCE_ELIGIBLE_ROUTES).
 * Static / ISR routes, /api, and anything unknown return false.
 */
export function isNonceEligible(pathname: string): boolean {
  if (!pathname.startsWith('/') || pathname.startsWith('/api/')) return false;
  return NONCE_ELIGIBLE_MATCHERS.some((re) => re.test(pathname));
}

// ── Mode switch ───────────────────────────────────────────────────────────

export type CspMode = 'report-only' | 'enforce-nonce';

/**
 * CSP_MODE=report-only (default): nonce policy goes out as
 * Content-Security-Policy-Report-Only on eligible routes. Note (2026-09-03):
 * in this mode Next does not stamp the nonce onto anything — see the
 * warning at the top of this file — so this mode's violation reports cannot
 * be used to judge enforce-nonce readiness.
 * CSP_MODE=enforce-nonce: the nonce policy becomes the enforced header
 * there, and Next *does* stamp it correctly there (verified) — but do not
 * flip this yet; the JSON-LD schema gap documented at the top of this file
 * would break under it. See docs/SECURITY_AUDIT_2026-09.md "CSP".
 */
export function getCspMode(raw: string | undefined = process.env.CSP_MODE): CspMode {
  return raw === 'enforce-nonce' ? 'enforce-nonce' : 'report-only';
}

// ── Nonce ─────────────────────────────────────────────────────────────────

/** 16 random bytes, base64 — Web Crypto only (edge + Node ≥ 19 + jsdom). */
export function generateNonce(): string {
  const bytes = new Uint8Array(16);
  globalThis.crypto.getRandomValues(bytes);
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

// ── Policy builder ────────────────────────────────────────────────────────

export interface BuildCspOptions {
  /** When set, script-src becomes nonce + 'strict-dynamic' with a CSP2 ladder. */
  nonce?: string;
  frameAncestors: "'none'" | '*';
  /** Report-only policies cannot carry upgrade-insecure-requests. */
  reportOnly?: boolean;
  /** Dev adds 'unsafe-eval' blob: (Fast Refresh) and ws:/wss: (HMR). */
  dev?: boolean;
}

function uniq(list: readonly string[]): string[] {
  return Array.from(new Set(list));
}

export function buildCsp({ nonce, frameAncestors, reportOnly = false, dev = false }: BuildCspOptions): string {
  const hostScripts = uniq([...GA_SCRIPT_HOSTS, ...ADSENSE_SCRIPT_HOSTS]);

  // script-src.
  //  - nonce mode: CSP3 browsers see nonce + strict-dynamic (+ hashes for
  //    our three static inline scripts) and ignore the rest; CSP2 browsers
  //    ignore strict-dynamic and fall back to https: + hosts; CSP1 browsers
  //    ignore nonces/hashes and fall back to 'unsafe-inline'.
  //  - enforced (no nonce): today's shape. No hashes here on purpose — a
  //    hash would make CSP2+ browsers ignore 'unsafe-inline', which Next's
  //    own bootstrap inline scripts still need without a nonce.
  //
  // eval decision (2026-09-03, docs/SECURITY_AUDIT_2026-09.md "CSP"): a full
  // day of prod csp_violation reports showed `script-src` blocking `eval` on
  // ad-bearing pages, and this predates the 2026-09-02 rewrite — the old
  // policy blocked it too, so this is not a regression. A real-browser repro
  // against two live ad-bearing pages (space-launch-cost-comparison,
  // space-stocks) confirmed the AdSense tag works WITHOUT 'unsafe-eval':
  // window.adsbygoogle is defined, the ad script loads, and the slot gets an
  // iframe. Nothing observed requires eval. Decision: leave it blocked
  // (option ii) rather than widen script-src for a capability we cannot show
  // is needed — 'self' + explicit hosts stays tighter. Revisit only if a
  // specific Google feature (e.g. a consent-mode or anti-fraud path) is shown
  // to depend on it; do not re-add 'unsafe-eval' speculatively.
  const scriptSrc = nonce
    ? [
        "'self'",
        `'nonce-${nonce}'`,
        "'strict-dynamic'",
        ...Object.values(INLINE_SCRIPT_HASHES).map((h) => `'${h}'`),
        'https:',
        "'unsafe-inline'",
        ...(dev ? ["'unsafe-eval'", 'blob:'] : []),
        ...hostScripts,
      ]
    : ["'self'", "'unsafe-inline'", ...(dev ? ["'unsafe-eval'", 'blob:'] : []), ...hostScripts];

  const connectSrc = [
    "'self'",
    ...(dev ? ['ws:', 'wss:'] : []),
    ...uniq([
      ...CLIENT_CONNECT_HOSTS,
      ...GA_CONNECT_HOSTS,
      ...ADSENSE_CONNECT_HOSTS,
      ...LEGACY_CONNECT_HOSTS,
    ]),
  ];

  const directives: string[] = [
    "default-src 'self'",
    `script-src ${scriptSrc.join(' ')}`,
    // fonts.googleapis.com: restored 2026-09-03 — prod csp_violation reports
    // showed style-src-elem blocking it on ad-bearing pages. A real-browser
    // repro found zero <link href*="fonts.googleapis"> tags in our own DOM
    // (next/font self-hosts, so this isn't our pages' own dependency — the
    // 2026-09-02 rewrite was right to call it unused from OUR code); the
    // request is a stylesheet injected at runtime by a third party (most
    // likely Google's ad/consent tooling). Kept in style-src so that
    // whichever third-party script injects it doesn't get silently blocked.
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "img-src 'self' data: blob: https:",
    // fonts.gstatic.com: the font files a fonts.googleapis.com stylesheet
    // (style-src, above) @imports — allowed here so a third-party-injected
    // Google Fonts stylesheet doesn't load with every glyph blocked.
    "font-src 'self' data: https://fonts.gstatic.com",
    `connect-src ${connectSrc.join(' ')}`,
    `frame-src ${FRAME_SRC_HOSTS.join(' ')}`,
    `frame-ancestors ${frameAncestors}`,
    "object-src 'none'",
    "worker-src 'self' blob:",
    "manifest-src 'self'",
    "base-uri 'self'",
    "form-action 'self'",
  ];
  if (!dev && !reportOnly) directives.push('upgrade-insecure-requests');
  directives.push(`report-uri ${CSP_REPORT_PATH}`);
  directives.push(`report-to ${CSP_REPORT_GROUP}`);
  return directives.join('; ');
}

/** Value for the Reporting-Endpoints header that backs `report-to`. */
export const REPORTING_ENDPOINTS_HEADER = `${CSP_REPORT_GROUP}="${CSP_REPORT_PATH}"`;

// ── Per-document header decision ──────────────────────────────────────────

/** /embed/* and /widgets/* are built to be framed by third-party sites. */
export function isEmbeddablePath(pathname: string): boolean {
  return pathname.startsWith('/embed/') || pathname.startsWith('/widgets/');
}

export interface DocumentCspHeaders {
  /** Always present: the Content-Security-Policy header value. */
  enforced: string;
  /** Present only on nonce-eligible routes in report-only mode. */
  reportOnly?: string;
  /** Present only on nonce-eligible routes (forwarded to Next as x-nonce). */
  nonce?: string;
  /** 'DENY' unless the page is embeddable (XFO has no ALLOWALL; CSP wins). */
  xFrameOptions?: 'DENY';
}

export interface DocumentCspInput {
  pathname: string;
  mode?: CspMode;
  dev?: boolean;
  /** Injected for tests; defaults to a fresh random nonce. */
  nonce?: string;
}

/**
 * The single decision the middleware's document branch makes. Pure, so
 * src/lib/__tests__/csp.test.ts can cover the whole matrix:
 *
 *   route            mode           CSP header            CSP-Report-Only header
 *   ─────────────────────────────────────────────────────────────────────────
 *   static / ISR     any            nonce-free            —
 *   nonce-eligible   report-only    nonce-free            nonce + strict-dynamic
 *   nonce-eligible   enforce-nonce  nonce + strict-dynamic —
 */
export function documentCspHeaders({
  pathname,
  mode = getCspMode(),
  dev = process.env.NODE_ENV !== 'production',
  nonce,
}: DocumentCspInput): DocumentCspHeaders {
  const embeddable = isEmbeddablePath(pathname);
  const frameAncestors = embeddable ? '*' : "'none'";
  const xFrameOptions = embeddable ? undefined : 'DENY';

  if (!isNonceEligible(pathname)) {
    return { enforced: buildCsp({ frameAncestors, dev }), xFrameOptions };
  }

  const n = nonce ?? generateNonce();
  if (mode === 'enforce-nonce') {
    return { enforced: buildCsp({ nonce: n, frameAncestors, dev }), nonce: n, xFrameOptions };
  }
  return {
    enforced: buildCsp({ frameAncestors, dev }),
    reportOnly: buildCsp({ nonce: n, frameAncestors, dev, reportOnly: true }),
    nonce: n,
    xFrameOptions,
  };
}
