// SpaceNexus AM — shared issue types (2026-09-12). The issue JSON is what the
// MorningBrief ledger row stores and what /brief/am/[date] renders, so keep
// it serialisable (ISO strings, no Dates).

export interface MorningBriefStory {
  /** Our own headline, ≤ 90 chars. */
  headline: string;
  /** One line, ≤ 160 chars: why a reader should care today. */
  whyItMatters: string;
  source: string;
  /** The ORIGINAL article URL from the NewsArticle row. */
  url: string;
  /** NewsArticle.category of the underlying row. */
  category: string;
  publishedAt: string;
  /** Validated SpaceNexus route (guide / tracker / company profile) or null. */
  internalHref: string | null;
  internalLabel: string | null;
}

export interface MorningBriefNextLaunch {
  id: string;
  name: string;
  rocket: string | null;
  mission: string | null;
  site: string | null;
  agency: string | null;
  netUtc: string; // ISO
  precision: string | null;
  href: string; // /launch/<id>
}

export interface MorningBriefNumber {
  /** Which rotation slot produced it. */
  kind: 'cadence' | 'slips' | 'stock' | 'jobs' | 'hiring';
  label: string;
  value: string;
  context: string;
  source: string;
  asOf: string; // ISO or YYYY-MM-DD
  href: string | null;
  notInvestmentAdvice: boolean;
}

export interface MorningBriefIssue {
  date: string; // YYYY-MM-DD (UTC send day)
  subject: string;
  preheader: string;
  stories: MorningBriefStory[];
  nextLaunch: MorningBriefNextLaunch | null;
  oneNumber: MorningBriefNumber | null;
  model: string;
  windowHours: number;
  generatedAt: string;
}

export const HEADLINE_MAX = 90;
export const WHY_MAX = 160;
export const SUBJECT_MAX = 70;
export const MIN_STORIES = 3;
