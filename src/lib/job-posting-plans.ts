/**
 * Employer job-posting plans (2026-09-10).
 *
 * Priced against the space job boards that charge: Space-Careers (€720 per
 * standard post, EU), FindASpaceJob (€249 standard / €399 featured). We
 * aggregate 8,600+ roles for free; what an employer pays for here is
 * placement, not presence. USD, one-time, via Stripe Checkout with inline
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
    priceUsd: 249,
    days: 30,
    featured: false,
    blurb: 'Your role on the SpaceNexus board for 30 days, linked to your company profile.',
    includes: [
      '30 days on the board, searchable by title, category, level, location and remote',
      'Salary band shown (yours, or our estimate if you leave it blank)',
      'Linked to your company profile and its hiring page',
      'Applicants go straight to your own application link',
      'Included in job alerts and the jobs RSS feed',
    ],
  },
  {
    id: 'featured',
    name: 'Featured listing',
    priceUsd: 399,
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
