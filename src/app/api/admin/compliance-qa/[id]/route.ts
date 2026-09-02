export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import {
  unauthorizedError,
  forbiddenError,
  internalError,
  validationError,
  notFoundError,
} from '@/lib/errors';
import {
  applyAnswerAction,
  isComplianceQaAdminAction,
  sendAskerAnsweredEmail,
  COMPLIANCE_QUESTION_MAX_LENGTH,
} from '@/lib/compliance-qa';

/**
 * PATCH /api/admin/compliance-qa/[id] — the founder's answer flow.
 * Body: { action: 'publish' | 'draft' | 'archive', answer?: string }.
 *
 *  - publish: sets answer + answeredAt, status 'answered', published true.
 *    On FIRST publish, if the asker left an email, sends a best-effort
 *    courtesy "your question was answered" email (Resend-guarded).
 *    Re-publishing just updates the answer text.
 *  - draft:   saves the answer text without publishing.
 *  - archive: status 'archived', published false (e.g. spam).
 *
 * Admin-only — same auth as every other /api/admin route.
 */
export async function PATCH(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return unauthorizedError();
    }
    if (!session.user.isAdmin) {
      return forbiddenError('Admin access required');
    }

    const body = await request.json().catch(() => null);
    const action = body?.action;
    if (!isComplianceQaAdminAction(action)) {
      return validationError('action must be one of: publish, draft, archive');
    }
    const answer: string | undefined = typeof body?.answer === 'string' ? body.answer.trim() : undefined;
    if (answer !== undefined && answer.length > COMPLIANCE_QUESTION_MAX_LENGTH * 5) {
      return validationError('Answer is too long');
    }
    if (action === 'publish' && !answer) {
      return validationError('An answer is required to publish');
    }

    let existing: { id: string; question: string; askerName: string | null; askerEmail: string | null; published: boolean } | null =
      null;
    try {
      existing = await prisma.complianceQuestion.findUnique({
        where: { id: params.id },
        select: { id: true, question: true, askerName: true, askerEmail: true, published: true },
      });
    } catch {
      // Table missing lands here — treat like not found
      return notFoundError('Compliance question not found');
    }
    if (!existing) {
      return notFoundError('Compliance question not found');
    }

    const { data, shouldNotifyAsker } = applyAnswerAction(action, answer, existing);

    let updated;
    try {
      updated = await prisma.complianceQuestion.update({ where: { id: params.id }, data });
    } catch {
      return notFoundError('Compliance question not found');
    }

    if (shouldNotifyAsker) {
      // Best-effort — never blocks or fails the publish itself.
      await sendAskerAnsweredEmail({
        id: existing.id,
        question: existing.question,
        askerName: existing.askerName,
        askerEmail: existing.askerEmail,
      });
    }

    logger.info('Compliance question updated', { id: params.id, action, notifiedAsker: shouldNotifyAsker });
    return NextResponse.json({ success: true, data: updated });
  } catch (err) {
    logger.error('Admin compliance Q&A PATCH failed', {
      id: params.id,
      error: err instanceof Error ? err.message : String(err),
    });
    return internalError('Failed to update compliance question');
  }
}
