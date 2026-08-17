import { NextRequest, NextResponse } from 'next/server';
import { validationError, internalError, serviceUnavailableError } from '@/lib/errors';
import { validateBody } from '@/lib/validations';
import { logger } from '@/lib/logger';
import {
  complianceQuestionSchema,
  createComplianceQuestion,
  getPublishedComplianceQA,
  notifyPendingQuestions,
} from '@/lib/compliance-qa';

export const dynamic = 'force-dynamic';

/**
 * POST /api/compliance/questions — public export-compliance question intake.
 *
 * CSRF origin checks + rate limiting are enforced for mutations in
 * src/middleware.ts; the `website` honeypot silently drops bots (they get a
 * success response and no row). Store-first, notify-second: the founder
 * email (src/lib/compliance-qa.ts) can never lose a stored question, and
 * the same pass retries earlier un-notified questions.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const validation = validateBody(complianceQuestionSchema, body);
    if (!validation.success) {
      const firstError = Object.values(validation.errors)[0]?.[0] || 'Validation failed';
      return validationError(firstError, validation.errors);
    }

    const { question, askerName, askerEmail, website } = validation.data;

    // Honeypot: humans never fill this field. Accept-and-drop so bots learn nothing.
    if (website) {
      logger.info('Compliance Q&A honeypot triggered — submission dropped');
      return NextResponse.json(
        { success: true, data: { message: 'Question received — answers are posted to the Q&A list.' } },
        { status: 201 }
      );
    }

    const stored = await createComplianceQuestion({ question, askerName, askerEmail });
    if (!stored) {
      // Table not migrated yet / insert failed — be honest, never fake a confirmation.
      return serviceUnavailableError('Question intake is temporarily unavailable. Please try again shortly.');
    }

    logger.info('Compliance question received', {
      id: stored.id,
      questionLength: question.length,
      hasEmail: !!askerEmail,
    });

    // Best-effort founder notification (also retries earlier un-notified rows).
    await notifyPendingQuestions();

    return NextResponse.json(
      {
        success: true,
        data: {
          message: 'Question received — answers are posted to the Q&A list.',
          questionId: stored.id,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    logger.error('Error processing compliance question', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to submit your question. Please try again later.');
  }
}

/**
 * GET /api/compliance/questions — the published (answered) Q&A list. Public;
 * backs the Export Controls tab in /compliance. Fails soft to an empty list.
 */
export async function GET() {
  try {
    const items = await getPublishedComplianceQA();
    return NextResponse.json({
      success: true,
      data: {
        items: items.map((item) => ({
          id: item.id,
          question: item.question,
          answer: item.answer,
          answeredAt: item.answeredAt.toISOString(),
        })),
      },
    });
  } catch (error) {
    logger.error('Error fetching published compliance Q&A', {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ success: true, data: { items: [] } });
  }
}
