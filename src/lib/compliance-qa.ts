/**
 * Export Compliance Q&A — shared logic for the public "ask an
 * export-compliance question" funnel and the founder-answered FAQ list.
 *
 * Surfaces:
 *  - Ask form + published FAQ: /compliance (Export Controls tab) and the
 *    public /export-compliance-qa page (SEO, FAQPage JSON-LD).
 *  - Founder notification: each new question emails
 *    COMPLIANCE_QA_NOTIFY_EMAIL (Resend-guarded — no key means log + skip,
 *    the question is always stored first).
 *  - Answer flow: /admin (Compliance Q&A tab) — publish / save draft /
 *    archive via PATCH /api/admin/compliance-qa/[id].
 *
 * Deployment safety: the ComplianceQuestion table may not exist yet when
 * this code first deploys (the Railway build container has no DB access;
 * `prisma db push` runs at coordinator gate time). All reads fail soft to
 * [] / null and writes are gated behind a cached availability probe — the
 * same pattern as src/lib/regulatory-radar.ts.
 *
 * Notification retry: there is no dedicated cron. notifyPendingQuestions()
 * sends for EVERY stored 'new' question with notifiedAt=null, so a question
 * whose email failed (or was skipped for a missing key) is retried on the
 * next question submission. Documented trade-off: a lone failed
 * notification waits for the next submission, but the question itself is
 * never lost — it is stored and visible in /admin regardless.
 */

import { z } from 'zod';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { APP_URL } from '@/lib/constants';
import { escapeHtml } from '@/lib/newsletter/email-templates';

// ---------------------------------------------------------------------------
// Constants & statuses
// ---------------------------------------------------------------------------

/**
 * Founder notification address for new export-compliance questions.
 * Deliberately NOT FOUNDER_EMAIL (missionproofcomms@gmail.com) — the founder
 * asked for compliance questions at this personal address specifically.
 */
export const COMPLIANCE_QA_NOTIFY_EMAIL = 'jgriffiths74@gmail.com';

export const COMPLIANCE_QUESTION_STATUSES = ['new', 'answered', 'archived'] as const;
export type ComplianceQuestionStatus = (typeof COMPLIANCE_QUESTION_STATUSES)[number];

export const COMPLIANCE_QA_ADMIN_ACTIONS = ['publish', 'draft', 'archive'] as const;
export type ComplianceQaAdminAction = (typeof COMPLIANCE_QA_ADMIN_ACTIONS)[number];

export function isComplianceQaAdminAction(value: unknown): value is ComplianceQaAdminAction {
  return typeof value === 'string' && (COMPLIANCE_QA_ADMIN_ACTIONS as readonly string[]).includes(value);
}

/** Max question length — long enough for context, short enough to read in one email. */
export const COMPLIANCE_QUESTION_MAX_LENGTH = 2000;

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

/**
 * Public ask-form payload. `website` is a honeypot — humans never see the
 * field; a filled value marks the submission as a bot (the API accepts and
 * silently drops it, so bots get no signal).
 */
export const complianceQuestionSchema = z.object({
  question: z
    .string()
    .trim()
    .min(10, 'Please write a little more detail (at least 10 characters)')
    .max(COMPLIANCE_QUESTION_MAX_LENGTH, `Questions are capped at ${COMPLIANCE_QUESTION_MAX_LENGTH} characters`)
    .transform((v) => v.replace(/<[^>]*>/g, '')),
  askerName: z
    .union([z.string().trim().max(100, 'Name is too long'), z.literal('')])
    .optional()
    .transform((v) => (v ? v : undefined)),
  askerEmail: z
    .union([z.string().trim().email('Please provide a valid email address').max(200), z.literal('')])
    .optional()
    .transform((v) => (v ? v.toLowerCase() : undefined)),
  /** Honeypot — must be empty for human submissions. */
  website: z.string().max(200).optional(),
});

export type ComplianceQuestionInput = z.infer<typeof complianceQuestionSchema>;

// ---------------------------------------------------------------------------
// Availability probe (fail-soft — table may not be migrated yet)
// ---------------------------------------------------------------------------

const PROBE_TTL_MS = 5 * 60 * 1000;
let qaTableAvailable: boolean | null = null;
let lastProbeAt = 0;

/**
 * Whether the ComplianceQuestion table exists. Cached; re-probed every 5
 * minutes while unavailable, never re-probed once available.
 */
export async function isComplianceQaAvailable(): Promise<boolean> {
  if (qaTableAvailable === true) return true;
  const now = Date.now();
  if (qaTableAvailable === false && now - lastProbeAt < PROBE_TTL_MS) return false;
  lastProbeAt = now;
  try {
    await prisma.complianceQuestion.count({ take: 1 });
    qaTableAvailable = true;
  } catch {
    qaTableAvailable = false;
    logger.warn('ComplianceQuestion table unavailable — Q&A writes skipped (run prisma db push)');
  }
  return qaTableAvailable;
}

/** Test helper — reset the cached probe. */
export function __resetComplianceQaAvailability(): void {
  qaTableAvailable = null;
  lastProbeAt = 0;
}

// ---------------------------------------------------------------------------
// Writes
// ---------------------------------------------------------------------------

export interface StoredComplianceQuestion {
  id: string;
  question: string;
  askerName: string | null;
  askerEmail: string | null;
  status: string;
  createdAt: Date;
}

/**
 * Stores a new question. Returns null (never throws) when the table is not
 * available yet or the insert fails — callers surface an honest
 * "temporarily unavailable" to the asker instead of a false confirmation.
 */
export async function createComplianceQuestion(input: {
  question: string;
  askerName?: string | null;
  askerEmail?: string | null;
}): Promise<StoredComplianceQuestion | null> {
  if (!(await isComplianceQaAvailable())) return null;
  try {
    const row = await prisma.complianceQuestion.create({
      data: {
        question: input.question,
        askerName: input.askerName ?? null,
        askerEmail: input.askerEmail ?? null,
        status: 'new',
      },
      select: { id: true, question: true, askerName: true, askerEmail: true, status: true, createdAt: true },
    });
    return row;
  } catch (error) {
    logger.error('createComplianceQuestion: insert failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

// ---------------------------------------------------------------------------
// Founder notification email
// ---------------------------------------------------------------------------

export interface ComposedEmail {
  subject: string;
  html: string;
  text: string;
}

/** Pure composition — unit-testable without Resend. */
export function composeNewQuestionEmail(q: {
  id: string;
  question: string;
  askerName?: string | null;
  askerEmail?: string | null;
  createdAt?: Date;
}): ComposedEmail {
  const adminUrl = `${APP_URL}/admin?tab=compliance-qa`;
  const askerLine =
    q.askerName || q.askerEmail
      ? `${q.askerName || 'Anonymous'}${q.askerEmail ? ` <${q.askerEmail}>` : ' (no email left)'}`
      : 'Anonymous (no contact left)';

  return {
    subject: 'New export-compliance question',
    html: `
      <h2 style="margin:0 0 8px 0;">New export-compliance question</h2>
      <p style="margin:4px 0;"><strong>From:</strong> ${escapeHtml(askerLine)}</p>
      ${q.createdAt ? `<p style="margin:4px 0;"><strong>Received:</strong> ${q.createdAt.toISOString()}</p>` : ''}
      <hr style="border:none;border-top:1px solid #ccc;margin:12px 0;"/>
      <p style="white-space:pre-wrap;margin:0 0 16px 0;">${escapeHtml(q.question)}</p>
      <p style="margin:0;"><a href="${adminUrl}">Answer it in the admin Compliance Q&amp;A tab</a></p>
      <p style="margin:8px 0 0 0;color:#888;font-size:12px;">Published answers appear on the public Export Compliance Q&amp;A list as general information (not legal advice).</p>
    `,
    text: [
      'New export-compliance question',
      `From: ${askerLine}`,
      q.createdAt ? `Received: ${q.createdAt.toISOString()}` : null,
      '',
      q.question,
      '',
      `Answer it: ${adminUrl}`,
    ]
      .filter((l): l is string => l !== null)
      .join('\n'),
  };
}

export interface NotifyPendingResult {
  attempted: number;
  sent: number;
  skippedReason?: string;
}

/**
 * Best-effort founder notification pass: emails COMPLIANCE_QA_NOTIFY_EMAIL
 * for every 'new' question that has never been notified (notifiedAt null),
 * stamping notifiedAt only on confirmed sends. Called after each question
 * submission — which is also the retry mechanism for earlier failed sends.
 * Never throws; a send failure can never lose a stored question.
 */
export async function notifyPendingQuestions(): Promise<NotifyPendingResult> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    logger.info('Compliance Q&A notification skipped — RESEND_API_KEY not configured');
    return { attempted: 0, sent: 0, skippedReason: 'RESEND_API_KEY not configured' };
  }
  if (!(await isComplianceQaAvailable())) {
    return { attempted: 0, sent: 0, skippedReason: 'table unavailable' };
  }

  let pending: Array<{ id: string; question: string; askerName: string | null; askerEmail: string | null; createdAt: Date }> = [];
  try {
    pending = await prisma.complianceQuestion.findMany({
      where: { status: 'new', notifiedAt: null },
      orderBy: { createdAt: 'asc' },
      take: 10, // safety cap — a spam burst can't flood the founder inbox in one pass
      select: { id: true, question: true, askerName: true, askerEmail: true, createdAt: true },
    });
  } catch (error) {
    logger.warn('Compliance Q&A notification: pending query failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    return { attempted: 0, sent: 0, skippedReason: 'query failed' };
  }

  let sent = 0;
  for (const q of pending) {
    try {
      const { Resend } = await import('resend');
      const resend = new Resend(apiKey);
      const fromEmail = process.env.NEWSLETTER_FROM_EMAIL || 'SpaceNexus <alerts@spacenexus.us>';
      const email = composeNewQuestionEmail(q);
      const { error } = await resend.emails.send({
        from: fromEmail,
        to: COMPLIANCE_QA_NOTIFY_EMAIL,
        subject: email.subject,
        html: email.html,
        text: email.text,
      });
      if (error) {
        logger.warn('Compliance Q&A notification failed', { id: q.id, error: error.message });
        continue; // notifiedAt stays null — retried on the next submission
      }
      sent++;
      try {
        await prisma.complianceQuestion.update({ where: { id: q.id }, data: { notifiedAt: new Date() } });
      } catch (stampError) {
        // Worst case: a duplicate email next pass. Never fail the send loop.
        logger.warn('Compliance Q&A notification: notifiedAt stamp failed', {
          id: q.id,
          error: stampError instanceof Error ? stampError.message : String(stampError),
        });
      }
      logger.info('Compliance Q&A notification sent', { id: q.id, to: COMPLIANCE_QA_NOTIFY_EMAIL });
    } catch (err) {
      logger.warn('Compliance Q&A notification errored', {
        id: q.id,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }
  return { attempted: pending.length, sent };
}

// ---------------------------------------------------------------------------
// Published FAQ reads (public surfaces)
// ---------------------------------------------------------------------------

export interface PublishedQAItem {
  id: string;
  question: string;
  answer: string;
  answeredAt: Date;
}

/**
 * Answered + published questions, newest answer first. Fails soft to [] —
 * the public FAQ list renders its honest empty state instead of erroring.
 */
export async function getPublishedComplianceQA(limit = 100): Promise<PublishedQAItem[]> {
  try {
    const rows = await prisma.complianceQuestion.findMany({
      where: { published: true, status: 'answered', answer: { not: null }, answeredAt: { not: null } },
      orderBy: { answeredAt: 'desc' },
      take: Math.min(Math.max(limit, 1), 200),
      select: { id: true, question: true, answer: true, answeredAt: true },
    });
    return rows.filter((r): r is PublishedQAItem & { answer: string; answeredAt: Date } => !!r.answer && !!r.answeredAt);
  } catch {
    return [];
  }
}

/** FAQPage JSON-LD for the published list (SEO). Pure — unit-testable. */
export function buildFaqJsonLd(items: Array<{ question: string; answer: string }>): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: { '@type': 'Answer', text: item.answer },
    })),
  };
}

// ---------------------------------------------------------------------------
// Admin answer flow (publish / draft / archive)
// ---------------------------------------------------------------------------

export interface AnswerActionResult {
  data: {
    answer?: string | null;
    answeredAt?: Date;
    status?: ComplianceQuestionStatus;
    published?: boolean;
  };
  /** Courtesy "your question was answered" email — only on FIRST publish, only if the asker left an email. */
  shouldNotifyAsker: boolean;
}

/**
 * Pure state-transition rules for the admin actions:
 *  - publish: sets answer + answeredAt, status 'answered', published true.
 *    Re-publishing an already-published answer just updates the text (no
 *    second courtesy email).
 *  - draft:   saves the answer text without changing status/published — the
 *    public list is untouched until "Publish answer".
 *  - archive: status 'archived', published false (drops off the public
 *    list); the answer text, if any, is kept.
 */
export function applyAnswerAction(
  action: ComplianceQaAdminAction,
  answer: string | undefined,
  existing: { published: boolean; askerEmail: string | null },
  now: Date = new Date()
): AnswerActionResult {
  if (action === 'publish') {
    return {
      data: { answer: answer ?? '', answeredAt: now, status: 'answered', published: true },
      shouldNotifyAsker: !existing.published && !!existing.askerEmail,
    };
  }
  if (action === 'draft') {
    return { data: { answer: answer ?? '' }, shouldNotifyAsker: false };
  }
  // archive
  return {
    data: { status: 'archived', published: false, ...(answer !== undefined ? { answer } : {}) },
    shouldNotifyAsker: false,
  };
}

/** Pure composition of the asker courtesy email. */
export function composeAskerAnsweredEmail(q: { question: string; askerName?: string | null }): ComposedEmail {
  const faqUrl = `${APP_URL}/export-compliance-qa`;
  const greeting = q.askerName ? `Hi ${q.askerName},` : 'Hello,';
  const preview = q.question.length > 160 ? `${q.question.slice(0, 160)}…` : q.question;
  return {
    subject: 'Your export-compliance question has been answered',
    html: `
      <p style="margin:0 0 12px 0;">${escapeHtml(greeting)}</p>
      <p style="margin:0 0 12px 0;">Your question to the SpaceNexus Export Compliance Q&amp;A has been answered:</p>
      <blockquote style="margin:0 0 12px 0;padding:8px 12px;border-left:3px solid #8b5cf6;color:#555;white-space:pre-wrap;">${escapeHtml(preview)}</blockquote>
      <p style="margin:0 0 12px 0;"><a href="${faqUrl}">Read the answer on the Q&amp;A page</a></p>
      <p style="margin:0;color:#888;font-size:12px;">Answers are general information from the SpaceNexus team, not legal advice. Consult qualified export-control counsel for specific matters.</p>
    `,
    text: [
      greeting,
      '',
      'Your question to the SpaceNexus Export Compliance Q&A has been answered:',
      '',
      `> ${preview}`,
      '',
      `Read the answer: ${faqUrl}`,
      '',
      'Answers are general information from the SpaceNexus team, not legal advice. Consult qualified export-control counsel for specific matters.',
    ].join('\n'),
  };
}

/**
 * Best-effort courtesy email to the asker on first publish. Never throws;
 * silently no-ops without RESEND_API_KEY.
 */
export async function sendAskerAnsweredEmail(q: {
  id: string;
  question: string;
  askerName?: string | null;
  askerEmail?: string | null;
}): Promise<{ sent: boolean; reason?: string }> {
  if (!q.askerEmail) return { sent: false, reason: 'no asker email' };
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    logger.info('Compliance Q&A asker notification skipped — RESEND_API_KEY not configured', { id: q.id });
    return { sent: false, reason: 'RESEND_API_KEY not configured' };
  }
  try {
    const { Resend } = await import('resend');
    const resend = new Resend(apiKey);
    const fromEmail = process.env.NEWSLETTER_FROM_EMAIL || 'SpaceNexus <alerts@spacenexus.us>';
    const email = composeAskerAnsweredEmail(q);
    const { error } = await resend.emails.send({
      from: fromEmail,
      to: q.askerEmail,
      subject: email.subject,
      html: email.html,
      text: email.text,
    });
    if (error) {
      logger.warn('Compliance Q&A asker notification failed', { id: q.id, error: error.message });
      return { sent: false, reason: error.message };
    }
    logger.info('Compliance Q&A asker notification sent', { id: q.id });
    return { sent: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.warn('Compliance Q&A asker notification errored', { id: q.id, error: message });
    return { sent: false, reason: message };
  }
}
