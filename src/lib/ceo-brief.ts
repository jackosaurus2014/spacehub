// Weekly CEO Brief — the no-CLI weekly cadence email for the founder.
// Backs POST /api/cron/ceo-brief (Mondays 13:37 UTC — see src/lib/cron-scheduler.ts).
//
// One email per week to FOUNDER_EMAIL containing:
//  (a) GROWTH vs GOAL   — getGrowthSnapshot() (GA4 MAU/WAU + Search Console)
//                         vs the interpolated 10k-MAU curve, plus
//                         week-over-week deltas diffed against the previous
//                         week's snapshot persisted in DynamicContent
//                         (key `ceo-brief:snapshot:<mondayISODate>` — the same
//                         KV-marker pattern as src/lib/launch-week-email.ts).
//  (b) SENTINEL         — the content-accuracy checklist, run inline via
//                         runContentAccuracyChecks() (NOT runContentAccuracySentinel(),
//                         which would fire a second, duplicate admin alert
//                         email every Monday — the brief itself is the alert).
//  (c) PIPELINE HEALTH  — getCronJobStatus() from src/lib/cron-scheduler.ts
//                         (the same lib function /api/health?detailed=true
//                         uses — no HTTP self-call), listing stale/failing jobs.
//  (d) BUSINESS SIGNALS — jobs synced, funding rounds added, newsletter
//                         subscribers (+ weekly delta), pending ad campaigns,
//                         new feedback submissions.
//  (e) GATED ON YOU     — standing founder to-dos plus dynamic items
//                         (pending_review ad campaigns, unreviewed feedback).
//
// Idempotent per calendar week via a DynamicContent marker
// (`ceo-brief:sent:<mondayISODate>`), mirroring processLaunchWeekEmail().
// RESEND-guarded: with no RESEND_API_KEY the run still computes + persists
// the weekly snapshot (so deltas stay correct) and records the marker.

import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { APP_URL, FOUNDER_EMAIL } from '@/lib/constants';
import { getWeekStart } from '@/lib/launch-week-email';
import { getGrowthSnapshot, type GrowthSnapshot } from '@/lib/growth-metrics';
import { runContentAccuracyChecks, type AccuracyCheckResult } from '@/lib/content-accuracy';
import {
  escapeHtml,
  wrapInEmailTemplate,
  getHeader,
  styles,
} from '@/lib/newsletter/email-templates';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** The per-week metric snapshot persisted for week-over-week diffing. */
export interface CeoBriefWeeklySnapshot {
  weekKey: string; // Monday ISO date, e.g. "2026-08-10"
  generatedAt: string;
  mau: number | null;
  wau: number | null;
  searchClicks: number | null;
  searchImpressions: number | null;
  newsletterSubscribers: number | null;
}

export interface CeoBriefDeltas {
  mau: number | null;
  wau: number | null;
  searchClicks: number | null;
  searchImpressions: number | null;
  newsletterSubscribers: number | null;
}

export interface CeoBriefBusinessSignals {
  jobsSyncedThisWeek: number | null;
  fundingRoundsThisWeek: number | null;
  newsletterSubscribers: number | null;
  newsletterNewThisWeek: number | null;
  pendingAdCampaigns: number | null;
  feedbackNewThisWeek: number | null;
  feedbackUnreviewed: number | null;
}

export interface CeoBriefPipelineHealth {
  summary: { total: number; healthy: number; stale: number; failing: number };
  staleJobs: Array<{ label: string; lastSuccessAt: string | null }>;
  failingJobs: Array<{ label: string; lastError: string | null; consecutiveFailures: number }>;
  schedulerUpSince: string | null;
}

export interface CeoBriefData {
  weekKey: string;
  weekOfLabel: string; // "August 10, 2026"
  growth: GrowthSnapshot;
  priorSnapshot: CeoBriefWeeklySnapshot | null;
  deltas: CeoBriefDeltas;
  sentinel: AccuracyCheckResult[];
  pipeline: CeoBriefPipelineHealth | null;
  business: CeoBriefBusinessSignals;
  errors: string[];
}

export interface CeoBriefEmail {
  subject: string;
  html: string;
  text: string;
}

export interface ProcessCeoBriefResult {
  skipped: boolean;
  skipReason?: string;
  sent: boolean;
  weekKey: string;
  sentinelFailures: number;
  errors: string[];
}

// ---------------------------------------------------------------------------
// Keys & labels
// ---------------------------------------------------------------------------

export function getCeoBriefWeekISODate(now: Date = new Date()): string {
  return getWeekStart(now).toISOString().slice(0, 10);
}

/** Idempotency marker key, e.g. "ceo-brief:sent:2026-08-10". */
export function getCeoBriefMarkerKey(now: Date = new Date()): string {
  return `ceo-brief:sent:${getCeoBriefWeekISODate(now)}`;
}

/** Weekly snapshot key, e.g. "ceo-brief:snapshot:2026-08-10". */
export function getCeoBriefSnapshotKey(now: Date = new Date()): string {
  return `ceo-brief:snapshot:${getCeoBriefWeekISODate(now)}`;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/** "August 10, 2026" for the Monday starting the brief's week. */
export function formatWeekOfLabel(now: Date = new Date()): string {
  const monday = getWeekStart(now);
  return `${MONTH_NAMES[monday.getUTCMonth()]} ${monday.getUTCDate()}, ${monday.getUTCFullYear()}`;
}

// ---------------------------------------------------------------------------
// Data collection
// ---------------------------------------------------------------------------

function delta(current: number | null, prior: number | null | undefined): number | null {
  if (current === null || prior === null || prior === undefined) return null;
  return current - prior;
}

/**
 * Read the most recent prior weekly snapshot (any week strictly before this
 * one). ISO-dated keys under a fixed prefix sort lexicographically, so
 * contentKey ordering is chronological ordering.
 */
async function readPriorSnapshot(snapshotKey: string): Promise<CeoBriefWeeklySnapshot | null> {
  const rows = await prisma.dynamicContent.findMany({
    where: {
      module: 'ceo-brief',
      section: 'snapshot',
      contentKey: { lt: snapshotKey },
    },
    orderBy: { contentKey: 'desc' },
    take: 1,
  });
  if (rows.length === 0) return null;
  try {
    return JSON.parse(rows[0].data) as CeoBriefWeeklySnapshot;
  } catch {
    return null;
  }
}

/**
 * Gather everything the brief needs. Every sub-source is independently
 * guarded — a failing source lands in `errors` and its fields go null; the
 * brief always composes.
 */
export async function collectCeoBriefData(now: Date = new Date()): Promise<CeoBriefData> {
  const errors: string[] = [];
  const weekKey = getCeoBriefWeekISODate(now);
  const snapshotKey = getCeoBriefSnapshotKey(now);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  // (a) Growth vs goal — getGrowthSnapshot never throws (errors array inside)
  let growth: GrowthSnapshot;
  try {
    growth = await getGrowthSnapshot();
    errors.push(...growth.errors.map((e) => `growth: ${e}`));
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    errors.push(`growth: ${message}`);
    growth = {
      generatedAt: now.toISOString(),
      mau: null,
      wau: null,
      searchClicks: null,
      searchImpressions: null,
      goal: { target: 10_000, milestones: [], currentTarget: 0, onTrack: null },
      errors: [message],
    };
  }

  // (b) Content-accuracy sentinel — checks run inline; per-check errors are
  // already converted into failing results by the runner
  let sentinel: AccuracyCheckResult[] = [];
  try {
    sentinel = await runContentAccuracyChecks();
  } catch (err) {
    errors.push(`sentinel: ${err instanceof Error ? err.message : String(err)}`);
  }

  // (c) Pipeline health — same lib function /api/health?detailed=true uses
  let pipeline: CeoBriefPipelineHealth | null = null;
  try {
    const { getCronJobStatus } = await import('@/lib/cron-scheduler');
    const status = getCronJobStatus();
    pipeline = {
      summary: status.summary,
      schedulerUpSince: status.schedulerUpSince,
      staleJobs: status.jobs
        .filter((j) => j.isStale)
        .map((j) => ({ label: j.label, lastSuccessAt: j.lastSuccessAt })),
      failingJobs: status.jobs
        .filter((j) => !j.isStale && j.consecutiveFailures > 0)
        .map((j) => ({
          label: j.label,
          lastError: j.lastError,
          consecutiveFailures: j.consecutiveFailures,
        })),
    };
  } catch (err) {
    errors.push(`pipeline: ${err instanceof Error ? err.message : String(err)}`);
  }

  // (d) Business signals — each count independently guarded
  const business: CeoBriefBusinessSignals = {
    jobsSyncedThisWeek: null,
    fundingRoundsThisWeek: null,
    newsletterSubscribers: null,
    newsletterNewThisWeek: null,
    pendingAdCampaigns: null,
    feedbackNewThisWeek: null,
    feedbackUnreviewed: null,
  };

  try {
    business.jobsSyncedThisWeek = await prisma.spaceJobPosting.count({
      where: { createdAt: { gte: sevenDaysAgo } },
    });
  } catch (err) {
    errors.push(`jobs: ${err instanceof Error ? err.message : String(err)}`);
  }

  try {
    business.fundingRoundsThisWeek = await prisma.fundingRound.count({
      where: { createdAt: { gte: sevenDaysAgo } },
    });
  } catch (err) {
    errors.push(`funding: ${err instanceof Error ? err.message : String(err)}`);
  }

  try {
    business.newsletterSubscribers = await prisma.newsletterSubscriber.count({
      where: { verified: true, unsubscribedAt: null },
    });
    business.newsletterNewThisWeek = await prisma.newsletterSubscriber.count({
      where: { verified: true, unsubscribedAt: null, createdAt: { gte: sevenDaysAgo } },
    });
  } catch (err) {
    errors.push(`newsletter: ${err instanceof Error ? err.message : String(err)}`);
  }

  try {
    business.pendingAdCampaigns = await prisma.adCampaign.count({
      where: { status: 'pending_review' },
    });
  } catch (err) {
    errors.push(`ads: ${err instanceof Error ? err.message : String(err)}`);
  }

  // Feedback — table may not be migrated yet (deploy precedes db push);
  // treated as a soft miss, not an error worth surfacing
  try {
    business.feedbackNewThisWeek = await prisma.feedbackSubmission.count({
      where: { createdAt: { gte: sevenDaysAgo } },
    });
    business.feedbackUnreviewed = await prisma.feedbackSubmission.count({
      where: { status: 'new' },
    });
  } catch {
    logger.info('CEO brief: FeedbackSubmission table unavailable (not migrated yet?)');
  }

  // Prior snapshot for week-over-week deltas
  let priorSnapshot: CeoBriefWeeklySnapshot | null = null;
  try {
    priorSnapshot = await readPriorSnapshot(snapshotKey);
  } catch (err) {
    errors.push(`prior-snapshot: ${err instanceof Error ? err.message : String(err)}`);
  }

  const deltas: CeoBriefDeltas = {
    mau: delta(growth.mau, priorSnapshot?.mau ?? null),
    wau: delta(growth.wau, priorSnapshot?.wau ?? null),
    searchClicks: delta(growth.searchClicks, priorSnapshot?.searchClicks ?? null),
    searchImpressions: delta(growth.searchImpressions, priorSnapshot?.searchImpressions ?? null),
    newsletterSubscribers: delta(
      business.newsletterSubscribers,
      priorSnapshot?.newsletterSubscribers ?? null
    ),
  };

  return {
    weekKey,
    weekOfLabel: formatWeekOfLabel(now),
    growth,
    priorSnapshot,
    deltas,
    sentinel,
    pipeline,
    business,
    errors,
  };
}

// ---------------------------------------------------------------------------
// Compose (pure — unit-testable without DB or network)
// ---------------------------------------------------------------------------

function fmt(n: number | null): string {
  return n === null ? 'n/a' : n.toLocaleString('en-US');
}

function fmtDelta(d: number | null): string {
  if (d === null) return '—';
  if (d > 0) return `+${d.toLocaleString('en-US')}`;
  return d.toLocaleString('en-US');
}

function sectionHeading(title: string): string {
  return `
    <tr>
      <td style="padding: 22px 30px 6px 30px; background-color: ${styles.bgCard};">
        <p style="margin: 0; font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: ${styles.accentNebulaLight};">
          ${escapeHtml(title)}
        </p>
      </td>
    </tr>`;
}

function bodyRow(innerHtml: string): string {
  return `
    <tr>
      <td style="padding: 4px 30px 8px 30px; background-color: ${styles.bgCard};">
        ${innerHtml}
      </td>
    </tr>`;
}

function metricTableRow(label: string, value: string, deltaStr: string): string {
  return `
    <tr>
      <td style="padding: 6px 0; font-size: 13px; color: ${styles.textLight}; border-bottom: 1px solid ${styles.borderColor};">${escapeHtml(label)}</td>
      <td align="right" style="padding: 6px 0; font-size: 13px; font-weight: 600; color: ${styles.textWhite}; border-bottom: 1px solid ${styles.borderColor};">${escapeHtml(value)}</td>
      <td align="right" style="padding: 6px 0 6px 14px; font-size: 12px; color: ${styles.textMuted}; border-bottom: 1px solid ${styles.borderColor};">${escapeHtml(deltaStr)} WoW</td>
    </tr>`;
}

export function composeCeoBriefEmail(data: CeoBriefData): CeoBriefEmail {
  const subject = `SpaceNexus CEO Brief — Week of ${data.weekOfLabel}`;
  const { growth, deltas, business, pipeline } = data;
  const failedChecks = data.sentinel.filter((c) => !c.ok);

  const textLines: string[] = [
    `SPACENEXUS CEO BRIEF — Week of ${data.weekOfLabel}`,
    '',
  ];

  // ---------- (a) Growth vs goal ----------
  const onTrackLabel =
    growth.goal.onTrack === null ? 'UNKNOWN' : growth.goal.onTrack ? 'ON TRACK' : 'BEHIND';
  const onTrackColor =
    growth.goal.onTrack === null ? styles.textMuted : growth.goal.onTrack ? '#34d399' : '#f87171';

  const growthHtml = `
    <p style="margin: 0 0 10px 0; font-size: 14px; color: ${styles.textWhite};">
      MAU <strong>${fmt(growth.mau)}</strong> vs curve target <strong>${fmt(growth.goal.currentTarget)}</strong>
      (goal: ${fmt(growth.goal.target)} by Nov 12) —
      <span style="color: ${onTrackColor}; font-weight: 700;">${onTrackLabel}</span>
    </p>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
      ${metricTableRow('MAU (30d active users)', fmt(growth.mau), fmtDelta(deltas.mau))}
      ${metricTableRow('WAU (7d active users)', fmt(growth.wau), fmtDelta(deltas.wau))}
      ${metricTableRow('Search clicks (28d)', fmt(growth.searchClicks), fmtDelta(deltas.searchClicks))}
      ${metricTableRow('Search impressions (28d)', fmt(growth.searchImpressions), fmtDelta(deltas.searchImpressions))}
      ${metricTableRow('Newsletter subscribers', fmt(business.newsletterSubscribers), fmtDelta(deltas.newsletterSubscribers))}
    </table>
    ${data.priorSnapshot
      ? `<p style="margin: 8px 0 0 0; font-size: 11px; color: ${styles.textMuted};">WoW deltas vs snapshot of ${escapeHtml(data.priorSnapshot.weekKey)}.</p>`
      : `<p style="margin: 8px 0 0 0; font-size: 11px; color: ${styles.textMuted};">First recorded week — WoW deltas start next Monday.</p>`}`;

  textLines.push(
    'GROWTH VS GOAL',
    `  MAU ${fmt(growth.mau)} (${fmtDelta(deltas.mau)} WoW) vs target ${fmt(growth.goal.currentTarget)} (goal ${fmt(growth.goal.target)}) — ${onTrackLabel}`,
    `  WAU ${fmt(growth.wau)} (${fmtDelta(deltas.wau)} WoW)`,
    `  Search clicks ${fmt(growth.searchClicks)} (${fmtDelta(deltas.searchClicks)} WoW) · impressions ${fmt(growth.searchImpressions)} (${fmtDelta(deltas.searchImpressions)} WoW)`,
    `  Newsletter subscribers ${fmt(business.newsletterSubscribers)} (${fmtDelta(deltas.newsletterSubscribers)} WoW)`,
    ''
  );

  // ---------- (b) Sentinel ----------
  let sentinelHtml: string;
  if (data.sentinel.length === 0) {
    sentinelHtml = `<p style="margin: 0; font-size: 13px; color: ${styles.textMuted};">Sentinel did not run (see errors below).</p>`;
    textLines.push('SENTINEL', '  Did not run (see errors)', '');
  } else if (failedChecks.length === 0) {
    sentinelHtml = `<p style="margin: 0; font-size: 13px; color: #34d399;">All ${data.sentinel.length} content-accuracy checks passing.</p>`;
    textLines.push('SENTINEL', `  All ${data.sentinel.length} checks passing`, '');
  } else {
    sentinelHtml = `
      <p style="margin: 0 0 8px 0; font-size: 13px; color: #f87171; font-weight: 600;">${failedChecks.length} of ${data.sentinel.length} checks failing:</p>
      ${failedChecks
        .map(
          (c) => `
        <p style="margin: 0 0 6px 0; font-size: 13px; color: ${styles.textLight};">
          <span style="color: #f87171;">✗</span> <strong style="color: ${styles.textWhite};">${escapeHtml(c.id)}</strong><br/>
          <span style="font-size: 12px; color: ${styles.textMuted};">${escapeHtml(c.detail)}</span>
        </p>`
        )
        .join('')}`;
    textLines.push('SENTINEL', `  ${failedChecks.length}/${data.sentinel.length} checks FAILING:`);
    for (const c of failedChecks) textLines.push(`  ✗ ${c.id}: ${c.detail}`);
    textLines.push('');
  }

  // ---------- (c) Pipeline health ----------
  let pipelineHtml: string;
  if (!pipeline) {
    pipelineHtml = `<p style="margin: 0; font-size: 13px; color: ${styles.textMuted};">Cron status unavailable.</p>`;
    textLines.push('PIPELINE HEALTH', '  Cron status unavailable', '');
  } else {
    const problems = [
      ...pipeline.staleJobs.map(
        (j) => `<strong style="color: ${styles.textWhite};">${escapeHtml(j.label)}</strong> — stale (last success: ${escapeHtml(j.lastSuccessAt || 'never')})`
      ),
      ...pipeline.failingJobs.map(
        (j) => `<strong style="color: ${styles.textWhite};">${escapeHtml(j.label)}</strong> — ${j.consecutiveFailures} consecutive failure(s)${j.lastError ? `: ${escapeHtml(j.lastError.slice(0, 120))}` : ''}`
      ),
    ];
    pipelineHtml = `
      <p style="margin: 0 0 8px 0; font-size: 13px; color: ${styles.textLight};">
        ${pipeline.summary.total} jobs — <span style="color: #34d399;">${pipeline.summary.healthy} healthy</span>,
        <span style="color: #fbbf24;">${pipeline.summary.stale} stale</span>,
        <span style="color: #f87171;">${pipeline.summary.failing} failing</span>
      </p>
      ${problems.length > 0
        ? problems.map((p) => `<p style="margin: 0 0 5px 0; font-size: 12px; color: ${styles.textLight};">• ${p}</p>`).join('')
        : `<p style="margin: 0; font-size: 13px; color: #34d399;">Entire cron fleet healthy.</p>`}`;
    textLines.push(
      'PIPELINE HEALTH',
      `  ${pipeline.summary.total} jobs: ${pipeline.summary.healthy} healthy / ${pipeline.summary.stale} stale / ${pipeline.summary.failing} failing`
    );
    for (const j of pipeline.staleJobs) textLines.push(`  STALE ${j.label} (last success ${j.lastSuccessAt || 'never'})`);
    for (const j of pipeline.failingJobs) textLines.push(`  FAILING ${j.label} (${j.consecutiveFailures}x)${j.lastError ? `: ${j.lastError.slice(0, 120)}` : ''}`);
    textLines.push('');
  }

  // ---------- (d) Business signals ----------
  const businessHtml = `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
      ${metricTableRow('Jobs synced (last 7 days)', fmt(business.jobsSyncedThisWeek), '—')}
      ${metricTableRow('Funding rounds added (7d)', fmt(business.fundingRoundsThisWeek), '—')}
      ${metricTableRow('New newsletter subscribers (7d)', fmt(business.newsletterNewThisWeek), '—')}
      ${metricTableRow('Ad campaigns pending review', fmt(business.pendingAdCampaigns), '—')}
      ${metricTableRow('New feedback submissions (7d)', fmt(business.feedbackNewThisWeek), '—')}
    </table>`;
  textLines.push(
    'BUSINESS SIGNALS',
    `  Jobs synced (7d): ${fmt(business.jobsSyncedThisWeek)}`,
    `  Funding rounds added (7d): ${fmt(business.fundingRoundsThisWeek)}`,
    `  New newsletter subscribers (7d): ${fmt(business.newsletterNewThisWeek)}`,
    `  Ad campaigns pending review: ${fmt(business.pendingAdCampaigns)}`,
    `  New feedback submissions (7d): ${fmt(business.feedbackNewThisWeek)}`,
    ''
  );

  // ---------- (e) Gated on you ----------
  const gatedItems: string[] = [
    'Check Search Console job-postings report (Google-for-Jobs indexing pickup)',
    'HN / Reddit jobs-board posts — publish if still unposted (drafts already delivered)',
  ];
  if (business.pendingAdCampaigns !== null && business.pendingAdCampaigns > 0) {
    gatedItems.push(
      `${business.pendingAdCampaigns} ad campaign(s) awaiting review → ${APP_URL}/advertise/dashboard`
    );
  }
  if (business.feedbackUnreviewed !== null && business.feedbackUnreviewed > 0) {
    gatedItems.push(
      `${business.feedbackUnreviewed} feedback submission(s) unreviewed → ${APP_URL}/admin?tab=feedback`
    );
  }
  const gatedHtml = gatedItems
    .map((item) => `<p style="margin: 0 0 6px 0; font-size: 13px; color: ${styles.textLight};">☐ ${escapeHtml(item)}</p>`)
    .join('');
  textLines.push('GATED ON YOU');
  for (const item of gatedItems) textLines.push(`  [ ] ${item}`);
  textLines.push('');

  // ---------- Collection errors (honest footer) ----------
  const errorsHtml =
    data.errors.length > 0
      ? `${sectionHeading('Data-collection notes')}${bodyRow(
          data.errors
            .map((e) => `<p style="margin: 0 0 4px 0; font-size: 11px; color: ${styles.textMuted};">${escapeHtml(e)}</p>`)
            .join('')
        )}`
      : '';
  if (data.errors.length > 0) {
    textLines.push('DATA-COLLECTION NOTES');
    for (const e of data.errors) textLines.push(`  ${e}`);
    textLines.push('');
  }

  const html = wrapInEmailTemplate(
    `
    ${getHeader('CEO Brief')}
    <tr>
      <td style="padding: 16px 30px 0 30px; background-color: ${styles.bgCard}; text-align: center;">
        <p style="margin: 0; font-size: 13px; color: ${styles.textMuted}; text-transform: uppercase; letter-spacing: 1px;">
          Week of ${escapeHtml(data.weekOfLabel)}
        </p>
      </td>
    </tr>
    ${sectionHeading('Growth vs goal')}${bodyRow(growthHtml)}
    ${sectionHeading('Content-accuracy sentinel')}${bodyRow(sentinelHtml)}
    ${sectionHeading('Pipeline health')}${bodyRow(pipelineHtml)}
    ${sectionHeading('Business signals')}${bodyRow(businessHtml)}
    ${sectionHeading('Gated on you')}${bodyRow(gatedHtml)}
    ${errorsHtml}
    <tr>
      <td style="padding: 20px 30px 26px 30px; background-color: ${styles.bgCard}; border-radius: 0 0 12px 12px; border-top: 1px solid ${styles.borderColor};">
        <p style="margin: 0; font-size: 11px; color: ${styles.textMuted}; text-align: center;">
          Internal founder brief — generated automatically every Monday.<br/>
          Admin: ${APP_URL}/admin &middot; Status: ${APP_URL}/status
        </p>
      </td>
    </tr>
  `,
    `MAU ${fmt(growth.mau)} vs target ${fmt(growth.goal.currentTarget)} — ${onTrackLabel}; ${failedChecks.length} sentinel failure(s)`
  );

  textLines.push('---', `Internal founder brief. Admin: ${APP_URL}/admin`);

  return { subject, html, text: textLines.join('\n') };
}

// ---------------------------------------------------------------------------
// Orchestration
// ---------------------------------------------------------------------------

const SNAPSHOT_RETENTION_DAYS = 400; // keep ~a year of weekly snapshots readable
const MARKER_RETENTION_DAYS = 8;

async function upsertKV(
  contentKey: string,
  section: 'snapshot' | 'marker',
  data: unknown,
  now: Date,
  retentionDays: number
): Promise<void> {
  const json = JSON.stringify(data);
  const expiresAt = new Date(now.getTime() + retentionDays * 24 * 60 * 60 * 1000);
  await prisma.dynamicContent.upsert({
    where: { contentKey },
    create: {
      contentKey,
      module: 'ceo-brief',
      section,
      data: json,
      sourceType: 'system',
      lastVerified: now,
      refreshedAt: now,
      expiresAt,
    },
    update: {
      data: json,
      refreshedAt: now,
    },
  });
}

/**
 * One weekly run: idempotency check, collect, compose, send, persist
 * snapshot + marker. Called by POST /api/cron/ceo-brief. Mirrors
 * processLaunchWeekEmail(): the marker always advances even when Resend is
 * unconfigured, so a scheduler retry later the same Monday never double-sends.
 */
export async function processCeoBrief(now: Date = new Date()): Promise<ProcessCeoBriefResult> {
  const weekKey = getCeoBriefWeekISODate(now);
  const markerKey = getCeoBriefMarkerKey(now);
  const snapshotKey = getCeoBriefSnapshotKey(now);

  const existing = await prisma.dynamicContent.findUnique({ where: { contentKey: markerKey } });
  if (existing) {
    logger.info('CEO brief: already sent for this week, skipping', { weekKey });
    return {
      skipped: true,
      skipReason: 'already sent this week',
      sent: false,
      weekKey,
      sentinelFailures: 0,
      errors: [],
    };
  }

  const data = await collectCeoBriefData(now);
  const email = composeCeoBriefEmail(data);
  const sentinelFailures = data.sentinel.filter((c) => !c.ok).length;

  let sent = false;
  const apiKey = process.env.RESEND_API_KEY;
  if (apiKey) {
    try {
      const { Resend } = await import('resend');
      const resend = new Resend(apiKey);
      const fromEmail = process.env.NEWSLETTER_FROM_EMAIL || 'SpaceNexus <alerts@spacenexus.us>';
      const { error } = await resend.emails.send({
        from: fromEmail,
        to: FOUNDER_EMAIL,
        subject: email.subject,
        html: email.html,
        text: email.text,
      });
      if (error) {
        data.errors.push(`resend: ${error.message}`);
        logger.error('CEO brief: Resend send failed', { weekKey, error: error.message });
      } else {
        sent = true;
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      data.errors.push(`resend: ${message}`);
      logger.error('CEO brief: send errored', { weekKey, error: message });
    }
  } else {
    logger.warn('CEO brief: RESEND_API_KEY not configured, skipping send', { weekKey });
  }

  // Persist this week's snapshot (feeds next week's WoW deltas) + the marker.
  // Both best-effort: a persistence failure must not crash the cron response.
  const snapshot: CeoBriefWeeklySnapshot = {
    weekKey,
    generatedAt: now.toISOString(),
    mau: data.growth.mau,
    wau: data.growth.wau,
    searchClicks: data.growth.searchClicks,
    searchImpressions: data.growth.searchImpressions,
    newsletterSubscribers: data.business.newsletterSubscribers,
  };
  try {
    await upsertKV(snapshotKey, 'snapshot', snapshot, now, SNAPSHOT_RETENTION_DAYS);
    await upsertKV(
      markerKey,
      'marker',
      { weekKey, sent, sentinelFailures, sentAt: now.toISOString() },
      now,
      MARKER_RETENTION_DAYS
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    data.errors.push(`persist: ${message}`);
    logger.error('CEO brief: failed to persist snapshot/marker', { weekKey, error: message });
  }

  logger.info('CEO brief: run complete', {
    weekKey,
    sent,
    sentinelFailures,
    errors: data.errors.length,
  });

  return { skipped: false, sent, weekKey, sentinelFailures, errors: data.errors };
}
