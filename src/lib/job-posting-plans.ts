/**
 * Employer job-posting plans (2026-09-10).
 *
 * Priced at half the space job boards that charge (Space-Careers €720 per
 * standard post; FindASpaceJob €249 standard / €399 featured) — Jay's call,
 * 2026-09-10: $125 / $199. We aggregate 8,600+ roles for free; what an
 * employer pays for here is placement, not presence. USD, one-time, via Stripe Checkout with inline
 * price data (no dashboard products to keep in sync).
 */
/** Stripe checkout metadata kind for employer job postings (the webhook switches on it). */
export const JOB_POSTING_PAYMENT_KIND = 'job_posting';

export interface JobPostingPlan {
  id: 'standard' | 'featured';
  name: string;
  priceUsd: number;
  days: number;
  featured: boolean;
  blurb: string;
  includes: string[];
}

export const JOB_POSTING_PLANS: JobPostingPlan[] = [
  {
    id: 'standard',
    name: 'Standard listing',
    priceUsd: 125,
    days: 30,
    featured: false,
    blurb: 'Your role on the SpaceNexus board for 30 days, linked to your company profile.',
    includes: [
      '30 days on the board, searchable by title, category, level, location and remote',
      'Salary band shown (yours, or our estimate if you leave it blank)',
      'Linked to your company profile and its hiring page',
      'Send applicants to your site, or collect them on SpaceNexus with CSV export',
      'Included in job alerts and the jobs RSS feed',
    ],
  },
  {
    id: 'featured',
    name: 'Featured listing',
    priceUsd: 199,
    days: 45,
    featured: true,
    blurb: 'Pinned to the top of the board for 45 days and sent to the Who’s Hiring email.',
    includes: [
      'Everything in Standard, for 45 days',
      'Pinned above the 8,600+ synced roles on the board and on category pages',
      'Featured in the Wednesday Who’s Hiring email to job-alert subscribers',
      'Highlighted on your company profile',
      'View and apply-click counts in your employer dashboard',
    ],
  },
];

export function getJobPostingPlan(id: string | null | undefined): JobPostingPlan | null {
  return JOB_POSTING_PLANS.find((p) => p.id === id) ?? null;
}

export type PostingStatus = 'unpaid' | 'expired' | 'paused' | 'featured' | 'live';

/** Status an employer sees for one of their postings (portal + API). */
export function postingStatus(
  r: { paidAt: Date | null; isActive: boolean; expiresAt: Date | null; featured: boolean; featuredUntil: Date | null },
  now = Date.now()
): PostingStatus {
  if (!r.paidAt) return 'unpaid';
  if (r.expiresAt && r.expiresAt.getTime() < now) return 'expired';
  if (!r.isActive) return 'paused';
  return r.featured && r.featuredUntil && r.featuredUntil.getTime() > now ? 'featured' : 'live';
}
