/**
 * Reachout sentinel — one watchdog over every inbound channel on the site.
 *
 * The site has thirteen separate ways a human can reach us, each writing to its
 * own table with its own status vocabulary. Before this, only FeedbackSubmission
 * was watched (via the weekly CEO brief), which is why eight ContactSubmission
 * messages — including a live partnership enquiry — sat at status "new" for
 * twelve days with nothing pointing at them.
 *
 * This module is deliberately registry-driven: adding a channel means adding a
 * row to REACHOUT_CHANNELS, not writing new query or rendering code. Anything
 * that reaches a person belongs in that table.
 *
 * Two tiers, because they need different treatment:
 *   - REACHOUT_CHANNELS have a status field, so "open" and "handled" are real
 *     states. These drive the alert.
 *   - SIGNAL_CHANNELS (NPS score + comment) have no status and can never be
 *     closed, so alerting on them would nag forever. They are counted and
 *     reported, never escalated.
 */

import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { APP_URL, FOUNDER_EMAIL } from '@/lib/constants';
import { escapeHtml } from '@/lib/newsletter/email-templates';

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

export interface ReachoutChannel {
  /** Stable id used in the admin API and the alert email. */
  key: string;
  /** Prisma delegate key (camelCase model name). */
  model: string;
  label: string;
  /** Column holding the arrival time — not always createdAt. */
  dateField: string;
  /** Statuses that still need a human. Everything else counts as handled. */
  openStatuses: string[];
  /**
   * Where to action it, or null when no triage surface exists yet. Null
   * channels get their full message inlined in the alert so the founder can
   * reply straight from the inbox instead of being sent to a dead end.
   */
  adminUrl: string | null;
  /** Who sent it — first non-empty field wins. */
  identityFields: string[];
  /** What they said — first non-empty field wins. */
  gistFields: string[];
}

export const REACHOUT_CHANNELS: ReachoutChannel[] = [
  {
    key: 'contact',
    model: 'contactSubmission',
    label: 'Contact form',
    dateField: 'createdAt',
    openStatuses: ['new', 'in_progress'],
    adminUrl: `${APP_URL}/admin?tab=reachouts`,
    identityFields: ['name', 'email'],
    gistFields: ['subject', 'message'],
  },
  {
    key: 'feedback',
    model: 'feedbackSubmission',
    label: 'Feedback questionnaire',
    dateField: 'createdAt',
    openStatuses: ['new'],
    adminUrl: `${APP_URL}/admin?tab=feedback`,
    identityFields: ['email', 'category'],
    gistFields: ['message'],
  },
  {
    key: 'help',
    model: 'helpRequest',
    label: 'Help request',
    dateField: 'createdAt',
    openStatuses: ['new', 'in_progress'],
    adminUrl: `${APP_URL}/admin?tab=help`,
    identityFields: ['email'],
    gistFields: ['subject', 'details'],
  },
  {
    key: 'feature',
    model: 'featureRequest',
    label: 'Feature request',
    dateField: 'createdAt',
    openStatuses: ['new', 'under_review'],
    adminUrl: `${APP_URL}/admin?tab=feature`,
    identityFields: ['email'],
    gistFields: ['title', 'details'],
  },
  {
    key: 'company-add',
    model: 'companyAddRequest',
    label: 'Company listing request',
    dateField: 'createdAt',
    openStatuses: ['pending'],
    adminUrl: `${APP_URL}/admin?tab=reachouts`,
    identityFields: ['submitterEmail', 'companyName'],
    gistFields: ['companyName', 'description'],
  },
  {
    key: 'service-provider',
    model: 'serviceProviderSubmission',
    label: 'Service provider submission',
    dateField: 'createdAt',
    openStatuses: ['pending'],
    adminUrl: `${APP_URL}/admin?tab=reachouts`,
    identityFields: ['contactName', 'email', 'businessName'],
    gistFields: ['businessName', 'description'],
  },
  {
    key: 'introduction',
    model: 'introductionRequest',
    label: 'Introduction request',
    dateField: 'requestedAt',
    openStatuses: ['pending'],
    adminUrl: null,
    identityFields: ['fromUserId'],
    gistFields: ['message'],
  },
  {
    key: 'meeting',
    model: 'meetingRequest',
    label: 'Meeting request',
    dateField: 'createdAt',
    openStatuses: ['pending'],
    adminUrl: null,
    identityFields: ['visitorName', 'visitorEmail', 'visitorCompany'],
    gistFields: ['message'],
  },
  {
    key: 'partnership',
    model: 'partnershipRequest',
    label: 'Partnership request',
    dateField: 'createdAt',
    openStatuses: ['pending'],
    adminUrl: null,
    identityFields: ['senderCompanyId'],
    gistFields: ['message'],
  },
  {
    key: 'interest',
    model: 'interestExpression',
    label: 'Marketplace interest',
    dateField: 'createdAt',
    openStatuses: ['expressed'],
    adminUrl: null,
    identityFields: ['contactEmail'],
    gistFields: ['message'],
  },
  {
    key: 'content-report',
    model: 'contentReport',
    label: 'Content report (moderation)',
    dateField: 'createdAt',
    openStatuses: ['pending'],
    adminUrl: `${APP_URL}/admin?tab=reachouts`,
    identityFields: ['reporterId', 'contentType'],
    gistFields: ['reason', 'description'],
  },
];

/** Untriaged signal: a score and maybe a comment, with no state to close. */
export interface SignalChannel {
  key: string;
  model: string;
  label: string;
  dateField: string;
  commentField: string;
}

export const SIGNAL_CHANNELS: SignalChannel[] = [
  { key: 'nps-widget', model: 'userFeedback', label: 'NPS widget comments', dateField: 'createdAt', commentField: 'comment' },
  { key: 'nps-survey', model: 'npsResponse', label: 'NPS survey comments', dateField: 'createdAt', commentField: 'feedback' },
];

/** How long an open reachout may sit before it counts as stale. */
export const STALE_AFTER_HOURS = 24;

/** Window used for the "arrived recently" counts in the report. */
export const SIGNAL_WINDOW_DAYS = 7;

// ---------------------------------------------------------------------------
// Shapes
// ---------------------------------------------------------------------------

export interface OpenReachout {
  channelKey: string;
  channelLabel: string;
  id: string;
  who: string;
  gist: string;
  status: string;
  ageHours: number;
  adminUrl: string | null;
}

export interface ChannelSummary {
  key: string;
  label: string;
  openCount: number;
  staleCount: number;
  oldestAgeHours: number | null;
  adminUrl: string | null;
  /** Set when the table could not be read (e.g. not migrated yet). */
  error?: string;
}

export interface SignalSummary {
  key: string;
  label: string;
  withCommentThisWeek: number;
  error?: string;
}

export interface ReachoutSentinelResult {
  generatedAt: string;
  channels: ChannelSummary[];
  signals: SignalSummary[];
  /** Open items past STALE_AFTER_HOURS, oldest first. */
  stale: OpenReachout[];
  totalOpen: number;
  totalStale: number;
  errors: string[];
}

// ---------------------------------------------------------------------------
// Pure helpers (unit-tested)
// ---------------------------------------------------------------------------

/** First non-empty string among `fields`, trimmed; '' when none present. */
export function pickFirst(row: Record<string, unknown>, fields: string[]): string {
  for (const f of fields) {
    const v = row[f];
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  return '';
}

/** Compact age for an ops email: "3h", "2d 4h", "11d". */
export function formatAge(hours: number): string {
  if (!Number.isFinite(hours) || hours < 0) return 'unknown';
  if (hours < 1) return '<1h';
  if (hours < 24) return `${Math.floor(hours)}h`;
  const days = Math.floor(hours / 24);
  const rem = Math.floor(hours % 24);
  return rem > 0 ? `${days}d ${rem}h` : `${days}d`;
}

/** Collapse whitespace and cap length so one rambling message can't dominate. */
export function condense(text: string, max = 180): string {
  const flat = text.replace(/\s+/g, ' ').trim();
  return flat.length > max ? `${flat.slice(0, max - 1)}…` : flat;
}

/** True when the sentinel should email. Quiet when nothing has gone stale. */
export function shouldAlert(result: Pick<ReachoutSentinelResult, 'totalStale'>): boolean {
  return result.totalStale > 0;
}

// ---------------------------------------------------------------------------
// Collection
// ---------------------------------------------------------------------------

type Delegate = {
  findMany?: (args: unknown) => Promise<Record<string, unknown>[]>;
  count?: (args?: unknown) => Promise<number>;
};

function delegateFor(model: string): Delegate | null {
  const d = (prisma as unknown as Record<string, Delegate>)[model];
  return d && typeof d.findMany === 'function' ? d : null;
}

/**
 * Read every channel. A channel that throws (table not migrated, renamed
 * column) is reported as an error rather than taking the whole run down —
 * a sentinel that dies on one bad table is worse than no sentinel.
 */
export async function collectReachouts(now: Date = new Date()): Promise<ReachoutSentinelResult> {
  const channels: ChannelSummary[] = [];
  const signals: SignalSummary[] = [];
  const stale: OpenReachout[] = [];
  const errors: string[] = [];

  for (const ch of REACHOUT_CHANNELS) {
    const delegate = delegateFor(ch.model);
    if (!delegate?.findMany) {
      const msg = `${ch.key}: prisma.${ch.model} unavailable`;
      errors.push(msg);
      channels.push({ key: ch.key, label: ch.label, openCount: 0, staleCount: 0, oldestAgeHours: null, adminUrl: ch.adminUrl, error: msg });
      continue;
    }

    try {
      const rows = await delegate.findMany({
        where: { status: { in: ch.openStatuses } },
        orderBy: { [ch.dateField]: 'asc' },
        take: 200,
      });

      let staleCount = 0;
      let oldest: number | null = null;

      for (const row of rows) {
        const raw = row[ch.dateField];
        const at = raw instanceof Date ? raw : new Date(String(raw));
        const ageHours = (now.getTime() - at.getTime()) / 3_600_000;
        if (oldest === null || ageHours > oldest) oldest = ageHours;
        if (ageHours < STALE_AFTER_HOURS) continue;

        staleCount++;
        stale.push({
          channelKey: ch.key,
          channelLabel: ch.label,
          id: String(row.id ?? ''),
          who: pickFirst(row, ch.identityFields) || 'unknown sender',
          gist: condense(pickFirst(row, ch.gistFields)) || '(no message body)',
          status: String(row.status ?? ''),
          ageHours,
          adminUrl: ch.adminUrl,
        });
      }

      channels.push({
        key: ch.key,
        label: ch.label,
        openCount: rows.length,
        staleCount,
        oldestAgeHours: oldest,
        adminUrl: ch.adminUrl,
      });
    } catch (err) {
      const msg = `${ch.key}: ${err instanceof Error ? err.message.split('\n')[0] : String(err)}`;
      errors.push(msg);
      channels.push({ key: ch.key, label: ch.label, openCount: 0, staleCount: 0, oldestAgeHours: null, adminUrl: ch.adminUrl, error: msg });
    }
  }

  const since = new Date(now.getTime() - SIGNAL_WINDOW_DAYS * 86_400_000);
  for (const sig of SIGNAL_CHANNELS) {
    const delegate = delegateFor(sig.model);
    if (!delegate?.count) {
      signals.push({ key: sig.key, label: sig.label, withCommentThisWeek: 0, error: `prisma.${sig.model} unavailable` });
      continue;
    }
    try {
      const count = await delegate.count({
        where: { [sig.dateField]: { gte: since }, NOT: { [sig.commentField]: null } },
      });
      signals.push({ key: sig.key, label: sig.label, withCommentThisWeek: count });
    } catch (err) {
      const msg = `${sig.key}: ${err instanceof Error ? err.message.split('\n')[0] : String(err)}`;
      errors.push(msg);
      signals.push({ key: sig.key, label: sig.label, withCommentThisWeek: 0, error: msg });
    }
  }

  stale.sort((a, b) => b.ageHours - a.ageHours);

  return {
    generatedAt: now.toISOString(),
    channels,
    signals,
    stale,
    totalOpen: channels.reduce((s, c) => s + c.openCount, 0),
    totalStale: stale.length,
    errors,
  };
}

// ---------------------------------------------------------------------------
// Alert email
// ---------------------------------------------------------------------------

export function renderReachoutAlert(result: ReachoutSentinelResult): {
  subject: string;
  html: string;
  text: string;
} {
  const oldest = result.stale[0];
  const subject =
    `[SpaceNexus] ${result.totalStale} unanswered reachout${result.totalStale === 1 ? '' : 's'}` +
    (oldest ? ` — oldest ${formatAge(oldest.ageHours)} (${oldest.channelLabel})` : '');

  const rows = result.stale
    .map((r) => {
      const link = r.adminUrl
        ? `<a href="${r.adminUrl}">triage</a>`
        : '<span style="color:#999;">no admin surface — reply by email</span>';
      return `
        <tr>
          <td style="padding:6px 10px;border-bottom:1px solid #eee;white-space:nowrap;"><strong>${escapeHtml(formatAge(r.ageHours))}</strong></td>
          <td style="padding:6px 10px;border-bottom:1px solid #eee;">${escapeHtml(r.channelLabel)}</td>
          <td style="padding:6px 10px;border-bottom:1px solid #eee;">${escapeHtml(r.who)}</td>
          <td style="padding:6px 10px;border-bottom:1px solid #eee;">${escapeHtml(r.gist)}</td>
          <td style="padding:6px 10px;border-bottom:1px solid #eee;">${link}</td>
        </tr>`;
    })
    .join('');

  const perChannel = result.channels
    .filter((c) => c.openCount > 0 || c.error)
    .map((c) => `<li>${escapeHtml(c.label)}: ${c.openCount} open${c.staleCount ? `, ${c.staleCount} stale` : ''}${c.error ? ` <em>(${escapeHtml(c.error)})</em>` : ''}</li>`)
    .join('');

  const signalLine = result.signals
    .map((s) => `${escapeHtml(s.label)}: ${s.withCommentThisWeek}`)
    .join(' &middot; ');

  const html = `
    <h2 style="margin:0 0 4px 0;">${result.totalStale} unanswered reachout${result.totalStale === 1 ? '' : 's'}</h2>
    <p style="margin:0 0 16px 0;color:#555;">Open longer than ${STALE_AFTER_HOURS}h. ${result.totalOpen} open in total across all channels.</p>
    <table style="border-collapse:collapse;font-size:14px;width:100%;">
      <tr style="text-align:left;background:#f5f5f5;">
        <th style="padding:6px 10px;">Age</th><th style="padding:6px 10px;">Channel</th>
        <th style="padding:6px 10px;">From</th><th style="padding:6px 10px;">Message</th><th style="padding:6px 10px;"></th>
      </tr>
      ${rows}
    </table>
    ${perChannel ? `<h3 style="margin:20px 0 6px 0;font-size:15px;">Open by channel</h3><ul style="margin:0;padding-left:20px;font-size:14px;">${perChannel}</ul>` : ''}
    <p style="margin:16px 0 0 0;font-size:13px;color:#666;">
      Untriaged signal, last ${SIGNAL_WINDOW_DAYS}d — ${signalLine || 'none'}. These have no status to close and are never escalated.
    </p>
    ${result.errors.length ? `<p style="margin:12px 0 0 0;font-size:12px;color:#b45309;">Sentinel errors: ${escapeHtml(result.errors.join('; '))}</p>` : ''}
    <p style="margin:16px 0 0 0;"><a href="${APP_URL}/admin?tab=reachouts">Open the reachouts queue</a></p>
  `;

  const text = [
    `${result.totalStale} unanswered reachout(s) — open longer than ${STALE_AFTER_HOURS}h`,
    `${result.totalOpen} open in total across all channels.`,
    '',
    ...result.stale.map((r) => `[${formatAge(r.ageHours)}] ${r.channelLabel} — ${r.who}: ${r.gist}${r.adminUrl ? '' : '  (no admin surface — reply by email)'}`),
    '',
    'Open by channel:',
    ...result.channels.filter((c) => c.openCount > 0 || c.error).map((c) => `  ${c.label}: ${c.openCount} open${c.staleCount ? `, ${c.staleCount} stale` : ''}${c.error ? ` (${c.error})` : ''}`),
    '',
    `Untriaged signal (last ${SIGNAL_WINDOW_DAYS}d): ${result.signals.map((s) => `${s.label}=${s.withCommentThisWeek}`).join(', ') || 'none'}`,
    result.errors.length ? `Sentinel errors: ${result.errors.join('; ')}` : '',
    '',
    `Triage: ${APP_URL}/admin?tab=reachouts`,
  ]
    .filter((l) => l !== '')
    .join('\n');

  return { subject, html, text };
}

// ---------------------------------------------------------------------------
// Runner
// ---------------------------------------------------------------------------

export interface ReachoutSentinelRun extends ReachoutSentinelResult {
  emailed: boolean;
  emailSkippedReason?: string;
}

/**
 * Collect, then email the founder only when something has actually gone stale.
 * Never throws — a failed send is reported, not raised, so the cron records a
 * result either way.
 */
export async function runReachoutSentinel(now: Date = new Date()): Promise<ReachoutSentinelRun> {
  const result = await collectReachouts(now);

  if (!shouldAlert(result)) {
    logger.info('Reachout sentinel: nothing stale', { totalOpen: result.totalOpen });
    return { ...result, emailed: false, emailSkippedReason: 'nothing stale' };
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    logger.warn('Reachout sentinel: stale reachouts but RESEND_API_KEY not configured', {
      totalStale: result.totalStale,
    });
    return { ...result, emailed: false, emailSkippedReason: 'RESEND_API_KEY not configured' };
  }

  const { subject, html, text } = renderReachoutAlert(result);

  try {
    const { Resend } = await import('resend');
    const resend = new Resend(apiKey);
    const fromEmail = process.env.NEWSLETTER_FROM_EMAIL || 'SpaceNexus <alerts@spacenexus.us>';
    const { error } = await resend.emails.send({ from: fromEmail, to: FOUNDER_EMAIL, subject, html, text });

    if (error) {
      logger.warn('Reachout sentinel email failed', { error: error.message });
      return { ...result, emailed: false, emailSkippedReason: error.message };
    }

    logger.info('Reachout sentinel email sent', { totalStale: result.totalStale, to: FOUNDER_EMAIL });
    return { ...result, emailed: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.warn('Reachout sentinel email errored', { error: message });
    return { ...result, emailed: false, emailSkippedReason: message };
  }
}
