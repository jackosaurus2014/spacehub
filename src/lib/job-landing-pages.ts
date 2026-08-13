// ─── Programmatic SEO landing pages for the Space Talent jobs board ────────
// Fixed allowlist of /space-talent/browse/[slug] pages. Each entry maps a
// human search intent ("space engineering jobs", "remote space jobs",
// "space jobs in Colorado") to a Prisma where-clause over SpaceJobPosting.
//
// Deliberately NOT a catch-all dynamic slug — every page here is reviewed,
// has a verified live sample size, and is listed in the sitemap. Add new
// entries only after checking the match count is meaningful (see the
// verification notes below each group).
//
// ─── Category values ────────────────────────────────────────────────────
// SpaceJobPosting.category is NOT free text — it's assigned by
// classifyCategory() in src/lib/fetchers/ats-jobs-fetcher.ts and matches the
// canonical `JobCategory` union in src/types/index.ts:
//   'engineering' | 'operations' | 'business' | 'research' | 'legal' | 'manufacturing'
// There is no 'software' category — 'software' is only ever assigned as a
// `specialization` value, and only in the hand-authored seed data in
// src/lib/workforce-data.ts. The 6,400+ live ATS-synced rows (the vast
// majority of the table) never populate `specialization` at all — as of the
// last verification only 62 of 6,416 active rows had a non-null
// specialization. Filtering the "software" landing page on
// `specialization: 'software'` would therefore return almost nothing.
// Instead, the 'software' entry below matches engineering-category rows
// whose *title* contains "software" — a title-text filter, verified against
// live data (799 matches out of 4,251 active engineering rows).
//
// Live counts at verification time (2026-08-12, 6,416 active rows):
//   engineering    4,251   manufacturing  1,158   operations       497
//   business         380   research          72   legal              58 (not in allowlist)
//   remoteOk=true    113   software (title)  799
//   California     3,465   Texas             852   Colorado         350
//   Washington       560   Florida           128   DC               205
//
// ─── Location matching rule ─────────────────────────────────────────────
// SpaceJobPosting.location is free text from ATS providers in formats like
// "Hawthorne, CA", "Cape Canaveral, Florida, United States", or composite
// multi-site strings ("Costa Mesa, CA; Seattle, WA"). Each location entry
// below matches on `contains` against the substrings that reliably appear
// in both the abbreviated and spelled-out forms actually seen in the data
// (verified via direct query, not assumed). Notes:
//   - California/Colorado/Florida: state abbreviation is a case-insensitive
//     prefix of the spelled-out name ("CA" ⊂ "California" etc.), so a single
//     ", CA"-style contains clause already covers both forms; the full name
//     is kept as a redundant OR term for clarity/robustness.
//   - Texas: "TX" is NOT a prefix of "Texas", so both terms are required.
//   - Washington: intentionally matches only ", WA" (which also covers
//     "..., Washington, ..." via the same prefix coincidence as CA/CO/FL).
//     Matching on the bare word "Washington" would incorrectly pull in
//     "Washington, DC" rows — confirmed against live data before excluding it.
//   - DC: matches the handful of literal "Washington, DC" / "Washington,
//     District of Columbia" / "Washington D.C[.]" spellings seen in the data.

import type { Prisma } from '@prisma/client';

export type JobLandingKind = 'category' | 'remote' | 'location';

export interface JobLandingPageEntry {
  /** URL segment under /space-talent/browse/[slug] */
  slug: string;
  kind: JobLandingKind;
  /** <title> / metadata title (without the " | SpaceNexus" suffix) */
  title: string;
  /** Page <h1> — usually identical to title */
  h1: string;
  /** One honest, data-driven sentence. Never bakes in a specific count — the live count is fetched and rendered separately. */
  intro: string;
  /** Prisma where-clause fragment; the page always ANDs `isActive: true` on top of this. */
  where: Prisma.SpaceJobPostingWhereInput;
  /** Query string appended to /space-talent for the "see these in the full board" CTA. */
  boardQuery: string;
}

const ci = (contains: string): Prisma.StringFilter => ({ contains, mode: 'insensitive' });

export const JOB_LANDING_PAGES: JobLandingPageEntry[] = [
  // ─── Categories ──────────────────────────────────────────────────────
  {
    slug: 'engineering',
    kind: 'category',
    title: 'Space Engineering Jobs',
    h1: 'Space Engineering Jobs',
    intro:
      'Propulsion, avionics, GNC, structures, thermal, and systems engineering roles at space companies, synced daily from live ATS boards.',
    where: { category: 'engineering' },
    boardQuery: 'tab=workforce&wfTab=jobs&category=engineering',
  },
  {
    slug: 'software',
    kind: 'category',
    title: 'Space Software Engineering Jobs',
    h1: 'Space Software Engineering Jobs',
    intro:
      'Flight software, ground systems, autonomy, and data-pipeline engineering roles across the space industry — matched by title within the engineering category.',
    where: { category: 'engineering', title: ci('software') },
    boardQuery: 'tab=workforce&wfTab=jobs&category=engineering&search=software',
  },
  {
    slug: 'manufacturing',
    kind: 'category',
    title: 'Space Manufacturing Jobs',
    h1: 'Space Manufacturing Jobs',
    intro:
      'Machinists, technicians, welders, and production roles building rockets, satellites, and spacecraft hardware — the largest single job category on the board.',
    where: { category: 'manufacturing' },
    boardQuery: 'tab=workforce&wfTab=jobs&category=manufacturing',
  },
  {
    slug: 'operations',
    kind: 'category',
    title: 'Space Operations Jobs',
    h1: 'Space Operations Jobs',
    intro:
      'Mission control, launch site, logistics, facilities, and safety roles keeping space companies running day to day.',
    where: { category: 'operations' },
    boardQuery: 'tab=workforce&wfTab=jobs&category=operations',
  },
  {
    slug: 'business',
    kind: 'category',
    title: 'Space Industry Business Jobs',
    h1: 'Space Industry Business Jobs',
    intro:
      'Sales, marketing, finance, business development, and people-ops roles at space companies — the commercial side of the industry.',
    where: { category: 'business' },
    boardQuery: 'tab=workforce&wfTab=jobs&category=business',
  },
  {
    slug: 'research',
    kind: 'category',
    title: 'Space Research & Science Jobs',
    h1: 'Space Research & Science Jobs',
    intro:
      'Scientist and R&D roles across the space industry. The smallest category on the board — most companies route research work through engineering titles.',
    where: { category: 'research' },
    boardQuery: 'tab=workforce&wfTab=jobs&category=research',
  },

  // ─── Remote ──────────────────────────────────────────────────────────
  {
    slug: 'remote',
    kind: 'remote',
    title: 'Remote Space Jobs',
    h1: 'Remote Space Jobs',
    intro:
      'Space industry roles marked remote-friendly by the hiring company. A small slice of the board — most space-hardware work requires being on-site at a factory, launch site, or lab.',
    where: { remoteOk: true },
    boardQuery: 'tab=workforce&wfTab=jobs&remote=true',
  },

  // ─── Top locations ───────────────────────────────────────────────────
  {
    slug: 'california',
    kind: 'location',
    title: 'Space Jobs in California',
    h1: 'Space Jobs in California',
    intro:
      'The single largest state for space industry hiring — SpaceX, Rocket Lab, Vast, and dozens of other companies are headquartered or have major sites here.',
    where: { OR: [{ location: ci('California') }, { location: ci(', CA') }] },
    boardQuery: 'tab=workforce&wfTab=jobs&search=California',
  },
  {
    slug: 'texas',
    kind: 'location',
    title: 'Space Jobs in Texas',
    h1: 'Space Jobs in Texas',
    intro:
      'Starbase, Houston, and a growing Texas launch and manufacturing footprint drive one of the fastest-growing state job markets in the industry.',
    where: { OR: [{ location: ci('Texas') }, { location: ci(', TX') }] },
    boardQuery: 'tab=workforce&wfTab=jobs&search=Texas',
  },
  {
    slug: 'colorado',
    kind: 'location',
    title: 'Space Jobs in Colorado',
    h1: 'Space Jobs in Colorado',
    intro:
      'Colorado Springs and Denver-area defense and space companies make Colorado one of the top states for space industry employment.',
    where: { OR: [{ location: ci('Colorado') }, { location: ci(', CO') }] },
    boardQuery: 'tab=workforce&wfTab=jobs&search=Colorado',
  },
  {
    slug: 'washington',
    kind: 'location',
    title: 'Space Jobs in Washington State',
    h1: 'Space Jobs in Washington State',
    intro:
      'Blue Origin, Redmond-area satellite manufacturing, and a cluster of aerospace suppliers make the Seattle metro a major Pacific Northwest space hub.',
    // Deliberately does NOT match the bare word "Washington" — that would
    // also pull in "Washington, DC" postings. See file header notes.
    where: { location: ci(', WA') },
    boardQuery: 'tab=workforce&wfTab=jobs&search=Washington',
  },
  {
    slug: 'florida',
    kind: 'location',
    title: 'Space Jobs in Florida',
    h1: 'Space Jobs in Florida',
    intro:
      'Cape Canaveral and the Space Coast remain one of the highest-launch-cadence regions in the world, with steady hiring across launch and range operations.',
    where: { OR: [{ location: ci('Florida') }, { location: ci(', FL') }] },
    boardQuery: 'tab=workforce&wfTab=jobs&search=Florida',
  },
  {
    slug: 'dc',
    kind: 'location',
    title: 'Space Jobs in Washington, D.C.',
    h1: 'Space Jobs in Washington, D.C.',
    intro:
      'Policy, government affairs, contracts, and business-development roles cluster in the D.C. area, where space companies maintain a presence near regulators and federal customers.',
    where: {
      OR: [
        { location: ci('Washington, DC') },
        { location: ci('Washington, District of Columbia') },
        { location: ci('Washington D.C') },
        { location: ci('Washington DC') },
      ],
    },
    boardQuery: 'tab=workforce&wfTab=jobs&search=Washington%2C%20DC',
  },
];

export function getJobLandingPage(slug: string): JobLandingPageEntry | undefined {
  return JOB_LANDING_PAGES.find((e) => e.slug === slug);
}
