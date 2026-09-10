import { SALARY_ROLES, LOCATION_MODIFIERS, type SalaryRole } from '@/lib/salary-data';
import type { SeniorityLevel } from '@/types';

/**
 * Salary band for a job listing (2026-09-10).
 *
 * Competitors that people talk about (Space Talent, SpaceCrew) lead with
 * "salary on every role". Most ATS postings we aggregate carry no range, so
 * every card and job page gets one of two bands:
 *   - `posting`  — the range the employer published (used verbatim);
 *   - `estimate` — matched from our curated SALARY_ROLES dataset by title
 *                  keywords, adjusted for seniority and metro, and labelled
 *                  "SpaceNexus estimate" wherever it is shown.
 * Nothing here is authoritative; the label carries that.
 */
export interface SalaryBand {
  min: number;
  max: number;
  median: number | null;
  source: 'posting' | 'estimate';
  /** Which curated role the estimate came from (estimate only). */
  basis?: string;
  /** 'high' when the title matched a specific role, 'low' when only the category did. */
  confidence?: 'high' | 'low';
}

const STOP = new Set(['senior', 'sr', 'staff', 'principal', 'lead', 'junior', 'jr', 'associate', 'ii', 'iii', 'iv', 'i', 'the', 'of', 'and', 'for', 'a', 'an', 'in', 'to', '-', '–', '/', '&']);

function tokens(s: string): string[] {
  return s.toLowerCase().replace(/[()/,&+]/g, ' ').split(/\s+/).filter((t) => t && !STOP.has(t));
}

/** Best curated role for a listing title, or null when nothing overlaps. */
export function matchSalaryRole(title: string, category?: string | null): { role: SalaryRole; score: number } | null {
  const tt = new Set(tokens(title));
  if (tt.size === 0) return null;
  let best: { role: SalaryRole; score: number } | null = null;
  for (const role of SALARY_ROLES) {
    const rt = tokens(role.title);
    let score = 0;
    for (const t of rt) if (tt.has(t)) score += t.length > 4 ? 2 : 1;
    // the generic word "engineer" alone should not pick a role
    if (score > 0 && rt.length && rt.every((t) => t === 'engineer' || tt.has(t))) score += 1;
    if (category && role.category === category) score += 0.5;
    if (score > (best?.score ?? 0)) best = { role, score };
  }
  return best && best.score >= 2 ? best : null;
}

function seniorityKey(level?: string | null, title?: string): 'junior' | 'mid' | 'senior' {
  const t = (title || '').toLowerCase();
  if (/\b(senior|sr\.?|staff|principal|lead|director|vp|chief|head)\b/.test(t)) return 'senior';
  if (/\b(junior|jr\.?|associate|entry|intern|graduate|\bi\b)\b/.test(t)) return 'junior';
  switch (level as SeniorityLevel) {
    case 'entry': return 'junior';
    case 'senior': case 'lead': case 'director': case 'vp': case 'c_suite': return 'senior';
    default: return 'mid';
  }
}

function locationMultiplier(location?: string | null): number {
  if (!location) return 1;
  const l = location.toLowerCase();
  for (const m of LOCATION_MODIFIERS) {
    const needle = (m as unknown as { name?: string; id?: string }).name || (m as unknown as { id?: string }).id || '';
    const key = needle.toLowerCase().split(/[,(]/)[0].trim();
    if (key && l.includes(key)) {
      const mult = (m as unknown as { multiplier?: number; modifier?: number }).multiplier ?? (m as unknown as { modifier?: number }).modifier;
      if (typeof mult === 'number' && mult > 0.5 && mult < 2) return mult;
    }
  }
  return 1;
}

const round5k = (n: number) => Math.round(n / 5000) * 5000;

/** The band to show for a listing: the posting's own range when present, else an estimate (or null). */
export function salaryBandFor(job: {
  title: string;
  category?: string | null;
  seniorityLevel?: string | null;
  location?: string | null;
  salaryMin?: number | null;
  salaryMax?: number | null;
  salaryMedian?: number | null;
}): SalaryBand | null {
  if (job.salaryMin != null && job.salaryMax != null && job.salaryMax >= job.salaryMin && job.salaryMax > 1000) {
    return { min: job.salaryMin, max: job.salaryMax, median: job.salaryMedian ?? null, source: 'posting' };
  }
  const match = matchSalaryRole(job.title, job.category);
  if (!match) return null;
  const { role } = match;
  const level = seniorityKey(job.seniorityLevel, job.title);
  const levels = role.experienceLevels as unknown as Record<string, { min?: number; max?: number; median?: number } | number | undefined>;
  const band = levels?.[level];
  let min: number, max: number, median: number | null;
  if (band && typeof band === 'object' && typeof band.min === 'number' && typeof band.max === 'number') {
    min = band.min; max = band.max; median = typeof band.median === 'number' ? band.median : null;
  } else if (typeof band === 'number') {
    min = band * 0.85; max = band * 1.15; median = band;
  } else {
    min = role.salaryRange.min; max = role.salaryRange.max; median = role.salaryRange.median ?? null;
  }
  const mult = locationMultiplier(job.location);
  return {
    min: round5k(min * mult),
    max: round5k(max * mult),
    median: median != null ? round5k(median * mult) : null,
    source: 'estimate',
    basis: role.title,
    confidence: match.score >= 4 ? 'high' : 'low',
  };
}

export function formatBand(b: SalaryBand): string {
  const k = (n: number) => `$${Math.round(n / 1000)}k`;
  return `${k(b.min)}–${k(b.max)}`;
}
