/**
 * User-feedback system shared logic — backs POST /api/feedback (questionnaire
 * shape), the /admin Feedback tab, and the founder notification email.
 *
 * Two feedback mechanisms coexist deliberately:
 *  - UserFeedback: the lightweight NPS widget (score 0-10 + comment), kept
 *    as-is — see src/components/FeedbackWidget.tsx.
 *  - FeedbackSubmission (this module): the structured /feedback questionnaire
 *    (category + free text + optional contact email), triaged in /admin.
 *
 * Notification policy: each submission emails the founder individually, but
 * only up to FEEDBACK_DAILY_NOTIFICATION_CAP sends per UTC day. Beyond the
 * cap, submissions are stored silently and surface in the weekly CEO brief
 * (src/lib/ceo-brief.ts) and the /admin Feedback tab — so a spam burst can
 * never flood the founder inbox.
 */

import { z } from 'zod';
import { logger } from '@/lib/logger';
import { APP_URL, FOUNDER_EMAIL } from '@/lib/constants';
import { escapeHtml } from '@/lib/newsletter/email-templates';

// ---------------------------------------------------------------------------
// Categories & statuses
// ---------------------------------------------------------------------------

export const FEEDBACK_CATEGORIES = ['bug', 'idea', 'content', 'general', 'praise'] as const;
export type FeedbackCategory = (typeof FEEDBACK_CATEGORIES)[number];

export const FEEDBACK_STATUSES = ['new', 'reviewed', 'actioned'] as const;
export type FeedbackStatus = (typeof FEEDBACK_STATUSES)[number];

export function isFeedbackStatus(value: unknown): value is FeedbackStatus {
  return typeof value === 'string' && (FEEDBACK_STATUSES as readonly string[]).includes(value);
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

/**
 * Questionnaire submission payload. `message` is the combined free text the
 * /feedback page assembles from its "what were you trying to do" + "what
 * happened / what do you want" fields. HTML tags are stripped (same policy
 * as the legacy NPS comment field).
 */
export const feedbackSubmissionSchema = z.object({
  category: z.enum(FEEDBACK_CATEGORIES),
  message: z
    .string()
    .trim()
    .min(5, 'Please tell us a little more')
    .max(5000)
    .transform((v) => v.replace(/<[^>]*>/g, '')),
  page: z.string().max(500).optional(),
  email: z
    .union([z.string().trim().email().max(200), z.literal('')])
    .optional()
    .transform((v) => (v ? v : undefined)),
});

export type FeedbackSubmissionInput = z.infer<typeof feedbackSubmissionSchema>;

// ---------------------------------------------------------------------------
// Founder notification (Resend, capped per day)
// ---------------------------------------------------------------------------

export const FEEDBACK_DAILY_NOTIFICATION_CAP = 5;

/**
 * Whether the Nth submission of the UTC day (1-based, including the current
 * one) should trigger an individual founder email. Submissions past the cap
 * roll into the weekly CEO brief instead of spamming the inbox.
 */
export function shouldSendIndividualNotification(submissionNumberToday: number): boolean {
  return submissionNumberToday <= FEEDBACK_DAILY_NOTIFICATION_CAP;
}

export interface FeedbackNotificationPayload {
  id: string;
  category: string;
  message: string;
  page?: string | null;
  email?: string | null;
  userId?: string | null;
  submissionNumberToday: number;
}

/**
 * Best-effort founder notification for one feedback submission. Never throws;
 * silently no-ops when RESEND_API_KEY is not configured. Uses a plain
 * utilitarian layout (ops email, not a marketing template).
 */
export async function sendFeedbackNotificationEmail(
  payload: FeedbackNotificationPayload
): Promise<{ sent: boolean; reason?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    logger.info('Feedback notification skipped — RESEND_API_KEY not configured', { id: payload.id });
    return { sent: false, reason: 'RESEND_API_KEY not configured' };
  }

  if (!shouldSendIndividualNotification(payload.submissionNumberToday)) {
    logger.info('Feedback notification skipped — daily cap reached, will roll into CEO brief', {
      id: payload.id,
      submissionNumberToday: payload.submissionNumberToday,
      cap: FEEDBACK_DAILY_NOTIFICATION_CAP,
    });
    return { sent: false, reason: 'daily cap reached' };
  }

  try {
    const { Resend } = await import('resend');
    const resend = new Resend(apiKey);
    const fromEmail = process.env.NEWSLETTER_FROM_EMAIL || 'SpaceNexus <alerts@spacenexus.us>';

    const pageLine = payload.page
      ? `<p style="margin:4px 0;"><strong>Page:</strong> ${escapeHtml(payload.page)}</p>`
      : '';
    const contactLine = payload.email
      ? `<p style="margin:4px 0;"><strong>Contact:</strong> ${escapeHtml(payload.email)}</p>`
      : '<p style="margin:4px 0;"><strong>Contact:</strong> none provided</p>';

    const { error } = await resend.emails.send({
      from: fromEmail,
      to: FOUNDER_EMAIL,
      subject: `[SpaceNexus feedback] ${payload.category}: ${payload.message.slice(0, 60)}${payload.message.length > 60 ? '…' : ''}`,
      html: `
        <h2 style="margin:0 0 8px 0;">New feedback submission</h2>
        <p style="margin:4px 0;"><strong>Category:</strong> ${escapeHtml(payload.category)}</p>
        ${pageLine}
        ${contactLine}
        <p style="margin:4px 0;"><strong>Signed in:</strong> ${payload.userId ? 'yes' : 'no'}</p>
        <hr style="border:none;border-top:1px solid #ccc;margin:12px 0;"/>
        <p style="white-space:pre-wrap;margin:0 0 16px 0;">${escapeHtml(payload.message)}</p>
        <p style="margin:0;"><a href="${APP_URL}/admin?tab=feedback">Review in admin</a>
          &nbsp;(#${payload.submissionNumberToday} today; individual emails cap at ${FEEDBACK_DAILY_NOTIFICATION_CAP}/day)</p>
      `,
      text: [
        'New feedback submission',
        `Category: ${payload.category}`,
        payload.page ? `Page: ${payload.page}` : null,
        `Contact: ${payload.email || 'none provided'}`,
        `Signed in: ${payload.userId ? 'yes' : 'no'}`,
        '',
        payload.message,
        '',
        `Review: ${APP_URL}/admin?tab=feedback`,
      ]
        .filter((l): l is string => l !== null)
        .join('\n'),
    });

    if (error) {
      logger.warn('Feedback notification email failed', { id: payload.id, error: error.message });
      return { sent: false, reason: error.message };
    }

    logger.info('Feedback notification email sent', { id: payload.id, to: FOUNDER_EMAIL });
    return { sent: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.warn('Feedback notification email errored', { id: payload.id, error: message });
    return { sent: false, reason: message };
  }
}
