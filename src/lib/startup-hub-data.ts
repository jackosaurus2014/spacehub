/**
 * Curated IPO-pipeline intelligence for the Startup & Pre-IPO Hub.
 *
 * This is hand-verified editorial data (not sourced from Prisma) — recent
 * space-sector IPOs and companies reported to be preparing for, or explicitly
 * avoiding, a public listing. Every entry carries a sourceUrl so claims are
 * auditable. Update the `asOf` stamp whenever this file is revised.
 *
 * Live/dynamic data (private-company watchlist, funding rounds, hiring
 * rankings, aggregate stats) is served by /api/startups from the database —
 * this file is the static, editorially-curated companion to that feed.
 */

export const STARTUP_HUB_ASOF = '2026-08-12';

export interface RecentIPO {
  company: string;
  ticker: string;
  exchange: string;
  ipoDate: string; // YYYY-MM-DD
  raised: string;
  notes: string;
  /** Slug into /company-profiles/{slug} — omitted if no matching profile was found. */
  profileSlug?: string;
  sourceUrl: string;
}

export type IPOPipelineConfidence = 'reported' | 'company-stated' | 'speculative';

export interface IPOPipelineEntry {
  company: string;
  status: string;
  detail: string;
  confidence: IPOPipelineConfidence;
  /** Slug into /company-profiles/{slug} — omitted if no matching profile was found. */
  profileSlug?: string;
  sourceUrl: string;
}

export interface FounderToolkitLink {
  title: string;
  href: string;
  description: string;
}

export const RECENT_IPOS: RecentIPO[] = [
  {
    company: 'SpaceX',
    ticker: 'SPCX',
    exchange: 'Nasdaq',
    ipoDate: '2026-06-12',
    raised: '$75B',
    notes: 'Priced $135/share at ~$1.78T; debut-day market cap ~$2.1T — the largest IPO in history',
    profileSlug: 'spacex',
    sourceUrl: 'https://www.cnbc.com/2026/06/12/spacex-ipo-spcx-live-updates.html',
  },
  {
    company: 'Firefly Aerospace',
    ticker: 'FLY',
    exchange: 'Nasdaq',
    ipoDate: '2025-08-07',
    raised: '$998.6M',
    notes: 'Priced $45/share, ~$8.5B debut valuation',
    profileSlug: 'firefly-aerospace',
    sourceUrl: 'https://www.cnbc.com/2025/08/07/rocket-maker-firefly-aerospace-fly-stock-ipo.html',
  },
  {
    company: 'Voyager Technologies',
    ticker: 'VOYG',
    exchange: 'NYSE',
    ipoDate: '2025-06-11',
    raised: '$402.3M',
    notes: 'Priced $31/share, ~$3.8B day-one valuation',
    profileSlug: 'voyager-space',
    sourceUrl: 'https://www.businesswire.com/news/home/20250612596347/en/',
  },
];

export const IPO_PIPELINE: IPOPipelineEntry[] = [
  {
    company: 'Sierra Space',
    status: 'Reported IPO preparation',
    detail:
      'The Information reported Sierra Space is "plotting an IPO" (June 2026, sources-say); $8B valuation after its $550M Series C; Dream Chaser ISS demo flight planned late 2026',
    confidence: 'reported',
    profileSlug: 'sierra-space',
    sourceUrl: 'https://www.theinformation.com/newsletters/dealmaker/sierra-space-axiom-plot-ipos-spacex-feeds-frenzy',
  },
  {
    company: 'Axiom Space',
    status: 'Reported IPO preparation',
    detail:
      "Grouped with Sierra Space in The Information's June 2026 report; no S-1 filed; closed an oversubscribed $525M round June 2026",
    confidence: 'reported',
    profileSlug: 'axiom-space',
    sourceUrl: 'https://www.axiomspace.com/release/axiom-space-closes-oversubscribed-financing-at-525m',
  },
  {
    company: 'Blue Origin',
    status: 'IPO groundwork (analyst read)',
    detail:
      'First-ever outside funding round July 2026 — up to $10B at ~$130B pre-money led by Coatue — widely read as pre-IPO positioning; no filing',
    confidence: 'speculative',
    profileSlug: 'blue-origin',
    sourceUrl: 'https://www.cnbc.com/2026/07/08/blue-origin-bezos-fundraising.html',
  },
  {
    company: 'Anduril Industries',
    status: 'IPO delayed by choice',
    detail:
      'CEO Palmer Luckey said (July 2026) it\'s "bad to IPO in the middle of a hype cycle"; $61B valuation after $5B Series H',
    confidence: 'company-stated',
    profileSlug: 'anduril-industries',
    sourceUrl: 'https://techcrunch.com/2026/05/13/anduril-raises-5b-doubles-valuation-to-61b/',
  },
  {
    company: 'ICEYE',
    status: 'Explicitly not pursuing IPO',
    detail:
      'CEO Rafal Modrzewski: "no immediate needs for funding"; raised €1B+ Series F at >€10B instead (June 2026)',
    confidence: 'company-stated',
    profileSlug: 'iceye',
    sourceUrl:
      'https://www.spaceintelreport.com/iceye-no-ipo-for-now-300m-rev-in-2025-a-3b-valuation-with-expanding-production-co-asks-eu-commission-to-move-faster/',
  },
];

export const FOUNDER_TOOLKIT: FounderToolkitLink[] = [
  { title: 'Business Model Canvas', href: '/business-models', description: 'Map revenue streams, cost structure, and value propositions.' },
  { title: 'Customer Discovery', href: '/customer-discovery', description: 'Frameworks for validating demand before you build.' },
  { title: 'Unit Economics', href: '/unit-economics', description: 'Model CAC, LTV, and margins for space business plans.' },
  { title: 'Cap Table Builder', href: '/cap-tables', description: 'Model dilution across seed through Series rounds.' },
  { title: 'Grants & SBIR Finder', href: '/funding-opportunities', description: 'Non-dilutive government funding programs.' },
  { title: 'Deal Rooms', href: '/deal-rooms', description: 'Secure data rooms for fundraising and diligence.' },
  { title: 'Find a Mentor', href: '/mentors', description: 'Connect with experienced space industry operators.' },
  { title: 'Investor Directory', href: '/investors', description: 'Browse active space-focused VCs and funds.' },
];
