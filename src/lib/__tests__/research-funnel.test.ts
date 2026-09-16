/**
 * The SpaceNexus Research SALES FUNNEL, guarded.
 *
 * On 2026-09-16, the day after the tier went on sale at $399/yr, a review found
 * a cold buyer could neither find /research nor buy from it:
 *
 *   1. Signed out, the Subscribe button showed a toast reading "Sign in first"
 *      and did nothing else — no redirect, no return path, the URL unchanged.
 *   2. Nothing linked to it. The homepage had no link, the footer's 47 links
 *      had none, /tools listed 149 entries and not this one, and /releases and
 *      every series archive linked only sideways.
 *   3. It was absent from sitemap.ts entirely, so Google could not reach it.
 *   4. /pricing said "2 tiers · One paid plan" above a third paid tier, and the
 *      Research block had no buy button at all.
 *
 * Each `it` below pins one of those fixes, plus the rule that every one of them
 * disappears again when RESEARCH_TIER_ENABLED is off. They are source-level
 * assertions on purpose: these are wiring bugs, and wiring is what regresses.
 */

import fs from 'fs';
import path from 'path';

const read = (p: string) => fs.readFileSync(path.join(process.cwd(), p), 'utf-8');

describe('the signed-out buy flow', () => {
  const button = () => read('src/app/research/ResearchCheckoutButton.tsx');

  it('sends a signed-out buyer to sign-in with the buy intent attached', () => {
    const src = button();
    // /login?returnTo=<encoded /research?checkout=research>
    expect(src).toContain('/login?returnTo=');
    expect(src).toContain('RESEARCH_CHECKOUT_PARAM');
    expect(src).toContain('encodeURIComponent');
    expect(src).toMatch(/window\.location\.href = RESEARCH_SIGN_IN_HREF/);
  });

  it('does not stop at a toast', () => {
    // The exact bug: a toast and a bare `return`, with the URL unchanged.
    expect(button()).not.toContain("toast.info('Sign in first");
  });

  it('resumes checkout after the round trip, and only on one button', () => {
    const src = button();
    expect(src).toContain('resumeAfterSignIn');
    // The parameter is consumed before checkout opens, so a refresh or a back
    // button cannot fire a second Stripe session.
    expect(src).toContain('window.history.replaceState');
    // /research passes resumeAfterSignIn to exactly one of its two buttons.
    const page = read('src/app/research/page.tsx');
    expect(page.match(/resumeAfterSignIn/g)?.length).toBe(1);
  });

  it('treats a 401 from checkout as the same round trip, not an error toast', () => {
    expect(button()).toMatch(/res\.status === 401/);
  });

  it('leaves the server gate alone — checkout still refuses an anonymous POST', () => {
    const route = read('src/app/api/stripe/checkout/route.ts');
    expect(route).toContain('getServerSession(authOptions)');
    expect(route).toMatch(/if \(!session\?\.user\?\.email\) \{\s*return unauthorizedError/);
    // unauthorizedError is a 401 (src/lib/errors.ts), which is what the client
    // round trip above is written against.
    expect(read('src/lib/errors.ts')).toMatch(
      /export function unauthorizedError[\s\S]{0,240}ErrorCodes\.UNAUTHORIZED[^)]*, 401\)/
    );
  });
});

describe('discovery', () => {
  it('sitemap lists /research, and only while it is genuinely for sale', () => {
    const src = read('src/app/sitemap.ts');
    expect(src).toContain('getResearchAvailability');
    expect(src).toMatch(/getResearchAvailability\(\)\.available[\s\S]{0,200}\$\{BASE_URL\}\/research/);
  });

  it('the footer carries a Research link behind the server flag', () => {
    const footer = read('src/components/Footer.tsx');
    expect(footer).toContain('ResearchFooterLink');
    const link = read('src/components/research/ResearchFooterLink.tsx');
    expect(link).toContain('useResearchAvailability');
    expect(link).toContain('if (!availability) return null;');
  });

  it('the homepage links the releases, and Research only when available', () => {
    const home = read('src/app/page.tsx');
    expect(home).toContain('ResearchBand');
    const band = read('src/components/home/ResearchBand.tsx');
    expect(band).toContain("href=\"/releases\"");
    expect(band).toContain('getResearchAvailability');
    expect(band).toMatch(/\{available && \(/);
  });

  it('the /tools directory row is flag-gated rather than baked into SITE_DIRECTORY', () => {
    const dir = read('src/lib/site-directory.ts');
    expect(dir).toContain('RESEARCH_DIRECTORY_ENTRY');
    expect(dir).toContain('export function directoryGroups(');
    // Not in the static array: the navigation and both command palettes read
    // that array and cannot check a flag.
    const staticArray = dir.slice(
      dir.indexOf('export const SITE_DIRECTORY'),
      dir.indexOf('export const RESEARCH_DIRECTORY_ENTRY')
    );
    expect(staticArray).not.toContain("href: '/research'");
    const browser = read('src/components/directory/DirectoryBrowser.tsx');
    expect(browser).toContain('directoryGroups(!!research, input)');
  });

  it('the release hub and every series archive link into /research when it is for sale', () => {
    for (const p of ['src/app/releases/page.tsx', 'src/app/releases/[series]/page.tsx']) {
      expect(read(p)).toContain('ResearchSeatCallout');
    }
    const callout = read('src/components/research/ResearchSeatCallout.tsx');
    expect(callout).toContain('getResearchAvailability');
    expect(callout).toContain('if (!available) return null;');
    expect(callout).toContain('href="/research"');
    // Price and seat count come from the server's plan object, never typed in.
    expect(callout).toContain('plan.priceYearly');
    expect(callout).toContain('plan.totalSeats');
    expect(callout).not.toMatch(/\$399|five seats/i);
  });
});

describe('/pricing no longer contradicts itself', () => {
  const page = () => read('src/app/pricing/page.tsx');

  it('counts the tiers it actually renders', () => {
    const src = page();
    expect(src).toContain("{research ? '3 tiers' : '2 tiers'}");
    // The old unconditional sentence survives only as the flag-off branch.
    expect(src).not.toMatch(/section-header__desc">One paid plan/);
    expect(src).toContain("'One paid plan. The entire platform.'");
  });

  it('puts Research in the comparison grid, from the capability registry', () => {
    const src = page();
    expect(src).toContain('<FeatureComparisonTable research={research} />');
    expect(src).toContain('research.capabilities.map');
    // No hand-written Research feature copy in the table.
    expect(src).not.toMatch(/research:\s*(true|false|')/);
  });

  it('lets someone buy from the Research block', () => {
    const band = read('src/components/pricing/ResearchTierBand.tsx');
    expect(band).toContain('ResearchCheckoutButton');
    expect(band).toContain('plan.priceYearly');
    // Still renders nothing at all when the server says it is not for sale.
    expect(band).toContain('if (!availability) return null;');
    expect(band).toContain('/api/research/availability');
  });
});

describe('the sample evidence is real or absent', () => {
  const sample = () => read('src/app/research/ResearchSample.tsx');

  it('is computed from a live edition, never from a fixture', () => {
    const src = sample();
    expect(src).toContain('buildReleaseEdition');
    expect(src).toContain('toResearchCsv');
    // No literal rows anywhere: the only data in this file is the release ids
    // it may sample from.
    expect(src).not.toMatch(/SAMPLE_ROWS_DATA|const FIXTURE|rows: \[\{/);
  });

  it('renders nothing rather than inventing a sample', () => {
    expect(sample()).toContain('if (!sample) return null;');
  });

  it('builds its CSV over the same column set the paid export uses', () => {
    const src = sample();
    const route = read('src/app/api/research/reports/[report]/[period]/route.ts');
    for (const fragment of [
      '...table.columns.map((c) => c.key)',
      '...table.rows.flatMap((r) => Object.keys(r))',
    ]) {
      expect(route).toContain(fragment);
      expect(src).toContain(fragment);
    }
  });

  it('says where the extract came from and how to cite it', () => {
    const src = sample();
    expect(src).toContain('citationFor');
    expect(src).toContain('This is not a mock-up');
    expect(src).toContain('Cite it as');
  });
});

describe('the tier copy matches what the code grants', () => {
  it('no longer tells a Research buyer they also need Professional', () => {
    const research = read('src/lib/research.ts');
    const page = read('src/app/research/page.tsx');
    expect(research).not.toContain('A seat is not a Professional subscription');
    expect(page).not.toContain('a seat is <strong>not</strong> a Professional');
    // What replaced it, in both places: the payer's account carries Pro too.
    expect(research).toContain('carries every Professional capability as well');
    expect(page).toContain('everything\n              Professional has');
  });

  it('is true: TIER_ACCESS.research carries every Professional capability', () => {
    // Read from the module rather than the source, so this fails if a flag is
    // ever granted to pro and not to research. Research is a strict SUPERSET:
    // it may add (the six Research-only flags are false for pro and true here)
    // but it may never carry less than Professional does.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { TIER_ACCESS } = require('../subscription') as typeof import('../subscription');
    const shortfalls: string[] = [];
    for (const [key, proValue] of Object.entries(TIER_ACCESS.pro)) {
      const researchValue = TIER_ACCESS.research[key as keyof typeof TIER_ACCESS.pro];
      if (proValue === false) continue; // research may add it; that is the point
      if (researchValue !== proValue) shortfalls.push(key);
    }
    expect(shortfalls).toEqual([]);
  });

  it('has no doubled plus in the career-pages figure', () => {
    // SITE_STATS.companies already ends in "+"; the page appended another.
    const page = read('src/app/research/page.tsx');
    expect(page).not.toContain('SITE_STATS.companies}+ company career pages');
  });
});
