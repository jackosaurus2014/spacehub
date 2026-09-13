// SpaceNexus AM — quality gates (2026-09-12). Pure. The cron refuses to send
// when any gate fails, records the failure on the MorningBrief row, and
// emails the alerts inbox with the reasons. Each failure mode has a test.

import type { MorningBriefIssue } from './types';
import { HEADLINE_MAX, MIN_STORIES, SUBJECT_MAX, WHY_MAX } from './types';
import { isHttpUrl, normalizeInternalHref } from './routes';

export interface GateContext {
  now: Date;
  windowHours: number;
  /** Original article URLs from the pool — every story url must be one of them. */
  poolUrls: Set<string>;
  /** Validated internal routes — every internalHref must be one of them. */
  allowedRoutes: Set<string>;
}

export interface GateResult {
  ok: boolean;
  failures: string[];
}

export function runGates(issue: MorningBriefIssue | null, ctx: GateContext): GateResult {
  const failures: string[] = [];
  if (!issue) return { ok: false, failures: ['model output did not parse into an issue'] };

  const stories = Array.isArray(issue.stories) ? issue.stories : [];
  if (stories.length < MIN_STORIES) failures.push(`only ${stories.length} qualifying stories (need ${MIN_STORIES})`);

  const subject = (issue.subject ?? '').trim();
  if (!subject) failures.push('subject is empty');
  else if (subject.length > SUBJECT_MAX) failures.push(`subject is ${subject.length} chars (max ${SUBJECT_MAX})`);

  const cutoff = ctx.now.getTime() - ctx.windowHours * 3_600_000;
  stories.forEach((s, i) => {
    const n = i + 1;
    if (!s.headline || !s.headline.trim()) failures.push(`story ${n}: empty headline`);
    else if (s.headline.length > HEADLINE_MAX) failures.push(`story ${n}: headline ${s.headline.length} chars (max ${HEADLINE_MAX})`);
    if (!s.whyItMatters || !s.whyItMatters.trim()) failures.push(`story ${n}: empty why-it-matters`);
    else if (s.whyItMatters.length > WHY_MAX) failures.push(`story ${n}: why-it-matters ${s.whyItMatters.length} chars (max ${WHY_MAX})`);
    if (!isHttpUrl(s.url)) failures.push(`story ${n}: url is not http(s)`);
    else if (!ctx.poolUrls.has(s.url)) failures.push(`story ${n}: url is not from the article pool`);
    const published = new Date(s.publishedAt ?? '');
    if (Number.isNaN(published.getTime())) failures.push(`story ${n}: missing publishedAt`);
    else if (published.getTime() < cutoff) failures.push(`story ${n}: older than the ${ctx.windowHours}h window`);
    if (s.internalHref != null) {
      const norm = normalizeInternalHref(s.internalHref);
      if (!norm || !ctx.allowedRoutes.has(norm)) failures.push(`story ${n}: internal href ${String(s.internalHref)} is not a known route`);
    }
  });

  if (issue.nextLaunch) {
    const nl = issue.nextLaunch;
    if (!/^\/launch\/[A-Za-z0-9_-]+$/.test(nl.href ?? '')) failures.push('next launch href is not a /launch/<id> route');
    if (Number.isNaN(new Date(nl.netUtc ?? '').getTime())) failures.push('next launch has no valid NET');
  }
  // The one-number href is produced by our own data layer (never the model),
  // so it only has to be a site-relative path.
  if (issue.oneNumber?.href != null && !normalizeInternalHref(issue.oneNumber.href)) {
    failures.push(`one-number href ${issue.oneNumber.href} is not site-relative`);
  }

  return { ok: failures.length === 0, failures };
}
