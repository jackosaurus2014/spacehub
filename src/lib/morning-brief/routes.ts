// SpaceNexus AM — internal link candidates and validation (2026-09-12).
//
// The model is handed a closed list of SpaceNexus routes it may attach to a
// story and every href it returns is checked against that same list before
// the email is rendered. A route it invents is dropped (the story keeps its
// original-article link); an issue never ships a dead internal URL.
//
// Candidate sources, all registries that already drive the sitemap/nav:
//   - SITE_DIRECTORY (every live surface, with a name and description),
//   - GUIDE_LIST (/guide/<slug>),
//   - the rocket registry (/rockets/<slug>) and launch sites (/launches/<slug>),
//   - CompanyProfile slugs tagged on the pool's articles (passed in by the
//     data layer — the only DB-backed part).

import { SITE_DIRECTORY } from '@/lib/site-directory';
import { GUIDE_LIST } from '@/lib/guide-navigation';
import { allRocketSlugs, getRocketSpec } from '@/lib/rocket-registry';
import { LAUNCH_SITES } from '@/lib/launch-sites';

export interface RouteCandidate {
  href: string;
  label: string;
  hint: string;
}

/** "/guide/x/" → "/guide/x"; strips query/hash; rejects anything not site-relative. */
export function normalizeInternalHref(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  let s = raw.trim();
  if (!s) return null;
  // Accept absolute spacenexus.us URLs the model may echo back.
  s = s.replace(/^https?:\/\/(www\.)?spacenexus\.us/i, '');
  if (!s.startsWith('/')) return null;
  if (s.startsWith('//')) return null;
  s = s.split(/[?#]/)[0];
  if (s.length > 1 && s.endsWith('/')) s = s.slice(0, -1);
  return s;
}

/** Static candidates (no DB): directory, guides, rockets, launch sites. */
export function staticRouteCandidates(): RouteCandidate[] {
  const out: RouteCandidate[] = [];
  const seen = new Set<string>();
  const add = (href: string, label: string, hint: string) => {
    const norm = normalizeInternalHref(href);
    if (!norm || seen.has(norm)) return;
    seen.add(norm);
    out.push({ href: norm, label, hint });
  };
  for (const group of SITE_DIRECTORY) {
    for (const e of group.entries) {
      if (e.pro) continue; // never send a free reader into a paywall from the brief
      add(e.href, e.name, e.description);
    }
  }
  for (const g of GUIDE_LIST) add(`/guide/${g.slug}`, g.title, `guide (${g.shortTitle})`);
  for (const slug of allRocketSlugs()) {
    const spec = getRocketSpec(slug);
    add(`/rockets/${slug}`, spec ? `${spec.name} (rocket)` : slug, 'rocket page: cost, next launch, record');
  }
  for (const site of LAUNCH_SITES) add(`/launches/${site.slug}`, `${site.name} launches`, 'launches by site, month by month');
  return out;
}

/** Build the allow-set the gates check against. */
export function routeAllowSet(candidates: RouteCandidate[]): Set<string> {
  return new Set(candidates.map((c) => c.href));
}

/**
 * Validate a model-supplied internal href against the allow-set. Returns the
 * normalised href when it is a known route, else null.
 */
export function validateInternalHref(raw: unknown, allow: Set<string>): string | null {
  const norm = normalizeInternalHref(raw);
  if (!norm) return null;
  return allow.has(norm) ? norm : null;
}

/** External story links must be plain http(s) URLs from the article row. */
export function isHttpUrl(raw: unknown): raw is string {
  return typeof raw === 'string' && /^https?:\/\/[^\s]+$/i.test(raw);
}
