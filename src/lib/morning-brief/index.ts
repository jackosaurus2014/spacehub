// SpaceNexus AM — orchestrator (2026-09-12).
//
//   pool  → collectStoryPool (data.ts)
//   rank  → rankStories (select.ts, pure)
//   draft → draftWithSonnet (draft.ts) — injectable
//   gates → runGates (gates.ts, pure)
//   send  → the cron route (src/app/api/cron/morning-brief/route.ts) owns the
//           ledger claim, the batch send, and the failure alert
//   archive → /brief/am/[date] reads the MorningBrief row this run stored
//
// buildMorningBrief() is the shared "everything but send" step used by the
// cron, the admin preview endpoint, and scripts/morning-brief-preview.ts.

import { EDITORIAL_MODEL } from '@/lib/ai-models';
import { logger } from '@/lib/logger';
import { alertEmail } from '@/lib/notify-routing';
import { collectStoryPool, candidateInternalRoutes, getNextLaunch, pickOneNumber } from './data';
import { rankStories, storyWindowHours, issueDateKey } from './select';
import { draftWithSonnet, type DraftFn } from './draft';
import { runGates, type GateResult } from './gates';
import { renderMorningBriefEmail, subjectFor, type RenderedBrief } from './render';
import { routeAllowSet } from './routes';
import type { MorningBriefIssue } from './types';

export interface BuiltBrief {
  issue: MorningBriefIssue | null;
  rendered: RenderedBrief | null;
  gate: GateResult;
  poolSize: number;
  rankedSize: number;
  draftError: string | null;
}

export interface BuildOptions {
  draft?: DraftFn;
}

export async function buildMorningBrief(now: Date = new Date(), opts: BuildOptions = {}): Promise<BuiltBrief> {
  const windowHours = storyWindowHours(now);
  const pool = await collectStoryPool(now, windowHours);
  const ranked = rankStories(pool, { now, windowHours });
  const empty = (gate: GateResult, draftError: string | null = null): BuiltBrief => ({
    issue: null, rendered: null, gate, poolSize: pool.length, rankedSize: ranked.length, draftError,
  });

  if (ranked.length === 0) {
    return empty({ ok: false, failures: [`no qualifying stories in the last ${windowHours}h`] });
  }

  const [routes, nextLaunch, oneNumber] = await Promise.all([
    candidateInternalRoutes(ranked),
    getNextLaunch(now).catch(() => null),
    pickOneNumber(now),
  ]);

  let stories: MorningBriefIssue['stories'] = [];
  let draftError: string | null = null;
  try {
    const draft = await (opts.draft ?? draftWithSonnet)({ now, stories: ranked, routes });
    stories = draft.stories;
  } catch (err) {
    draftError = err instanceof Error ? err.message : String(err);
    logger.error('morning-brief: draft failed', { error: draftError });
  }

  if (draftError) {
    return empty({ ok: false, failures: [`draft failed: ${draftError}`] }, draftError);
  }

  const lead = stories[0];
  const issue: MorningBriefIssue = {
    date: issueDateKey(now),
    subject: lead ? subjectFor(lead.headline) : '',
    preheader: lead ? lead.whyItMatters : '',
    stories,
    nextLaunch,
    oneNumber,
    model: EDITORIAL_MODEL,
    windowHours,
    generatedAt: now.toISOString(),
  };

  const gate = runGates(issue, {
    now,
    windowHours,
    poolUrls: new Set(pool.map((a) => a.url)),
    allowedRoutes: routeAllowSet(routes),
  });
  if (!gate.ok) {
    return { issue, rendered: null, gate, poolSize: pool.length, rankedSize: ranked.length, draftError: null };
  }

  return { issue, rendered: renderMorningBriefEmail(issue), gate, poolSize: pool.length, rankedSize: ranked.length, draftError: null };
}

/**
 * Founder alert when an issue is withheld. Broken things go to alertEmail()
 * (notify-routing.ts). Best effort; never throws.
 */
export async function sendMorningBriefAlert(date: string, failures: string[]): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  if (!key) { logger.warn('morning-brief: alert skipped (no RESEND_API_KEY)', { date, failures }); return; }
  try {
    const { Resend } = await import('resend');
    const resend = new Resend(key);
    const from = process.env.NEWSLETTER_FROM_EMAIL || 'SpaceNexus <alerts@spacenexus.us>';
    const esc = (s: string) => s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c] as string));
    const items = failures.map((f) => `<li>${esc(f)}</li>`).join('');
    await resend.emails.send({
      from,
      to: alertEmail(),
      subject: `[SpaceNexus] AM brief NOT sent for ${date}`,
      html: `<h2>SpaceNexus AM withheld</h2><p>The ${esc(date)} issue failed its quality gates and was not sent.</p><ul>${items}</ul><p>Preview: <code>GET /api/cron/morning-brief/preview</code> (admin session or cron secret).</p>`,
      text: `SpaceNexus AM withheld for ${date}. Reasons:\n- ${failures.join('\n- ')}\n\nPreview: GET /api/cron/morning-brief/preview`,
    });
  } catch (err) {
    logger.warn('morning-brief: alert email failed', { date, error: err instanceof Error ? err.message : String(err) });
  }
}

export { rankStories, storyWindowHours, isWeekdayUtc, issueDateKey } from './select';
export { runGates } from './gates';
export { renderMorningBriefEmail, subjectFor } from './render';
export type { MorningBriefIssue } from './types';
