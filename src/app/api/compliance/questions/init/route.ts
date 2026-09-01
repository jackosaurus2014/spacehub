import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { requireCronSecret } from '@/lib/errors';
import { COMPLIANCE_QA_SEED } from '@/lib/compliance-qa-seed';

export const dynamic = 'force-dynamic';

/**
 * POST /api/compliance/questions/init
 *
 * Seeds the curated Export Compliance Q&A starter FAQ (see
 * src/lib/compliance-qa-seed.ts for provenance and editorial rules) into the
 * ComplianceQuestion table as answered + published rows, so
 * /export-compliance-qa and the /compliance Export Controls tab show real,
 * sourced content instead of "No answered questions yet".
 *
 * Idempotent: rows are keyed on exact question text and NEVER updated once
 * present — a founder-edited answer (via /admin Compliance Q&A) always wins
 * over the seed. Safe to re-run after every deploy.
 *
 * Auth: CRON_SECRET bearer (standard /init pattern; CSRF-exempt via the
 * middleware's /init suffix rule).
 */
export async function POST(request: NextRequest) {
  const auth = requireCronSecret(request);
  if (auth) return auth;

  try {
    let created = 0;
    let skipped = 0;

    for (const item of COMPLIANCE_QA_SEED) {
      const existing = await prisma.complianceQuestion.findFirst({
        where: { question: item.question },
        select: { id: true },
      });

      if (existing) {
        skipped++;
        continue;
      }

      await prisma.complianceQuestion.create({
        data: {
          question: item.question,
          answer: item.answer,
          status: 'answered',
          published: true,
          answeredAt: new Date(item.answeredAt),
          // Seeded content needs no founder notification.
          notifiedAt: new Date(item.answeredAt),
        },
      });
      created++;
    }

    logger.info('[compliance/questions/init] Q&A seed complete', { created, skipped });

    return NextResponse.json({
      success: true,
      created,
      skipped,
      total: COMPLIANCE_QA_SEED.length,
    });
  } catch (error) {
    logger.error('[compliance/questions/init] Q&A seed failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { success: false, error: 'Failed to seed compliance Q&A' },
      { status: 500 }
    );
  }
}
