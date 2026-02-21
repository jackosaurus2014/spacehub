import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { generateWeeklyBrief, sendWeeklyBrief } from '@/lib/newsletter/intelligence-brief';
import { generateIntelligenceBriefEmail } from '@/lib/newsletter/intelligence-brief-template';
import type { BriefSection } from '@/lib/newsletter/intelligence-brief';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  // Verify CRON_SECRET for protected access
  const { requireCronSecret } = await import('@/lib/errors');
  const authError = requireCronSecret(request);
  if (authError) return authError;

  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action') || 'generate';

  try {
    // ── Generate ──────────────────────────────────────────────
    if (action === 'generate') {
      logger.info('Starting weekly intelligence brief generation');

      const result = await generateWeeklyBrief();

      return NextResponse.json({
        success: true,
        message: 'Weekly intelligence brief generated successfully',
        briefId: result.briefId,
        sectionCount: result.sections.length,
        totalItems: result.sections.reduce((sum, s) => sum + s.items.length, 0),
        timestamp: new Date().toISOString(),
      });
    }

    // ── Send ──────────────────────────────────────────────────
    if (action === 'send') {
      const briefId = searchParams.get('briefId');
      if (!briefId) {
        return NextResponse.json(
          { success: false, error: 'briefId query parameter is required' },
          { status: 400 }
        );
      }

      logger.info('Starting weekly intelligence brief send', { briefId });

      const result = await sendWeeklyBrief(briefId);

      return NextResponse.json({
        success: result.sent > 0,
        message: result.sent > 0
          ? 'Weekly intelligence brief sent successfully'
          : 'No emails were sent',
        sent: result.sent,
        failed: result.failed,
        timestamp: new Date().toISOString(),
      });
    }

    // ── Preview ───────────────────────────────────────────────
    if (action === 'preview') {
      logger.info('Generating weekly intelligence brief preview');

      const result = await generateWeeklyBrief();
      const sections = result.sections as BriefSection[];

      // Calculate the week label
      const now = new Date();
      const weekEnd = new Date(now);
      const weekStart = new Date(now);
      weekStart.setDate(weekStart.getDate() - 7);

      const weekLabel = `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} - ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;

      // Generate both pro and free versions
      const proHtml = generateIntelligenceBriefEmail(sections, true, weekLabel);
      const freeHtml = generateIntelligenceBriefEmail(sections, false, weekLabel);

      return NextResponse.json({
        success: true,
        briefId: result.briefId,
        sections,
        proHtml,
        freeHtml,
        timestamp: new Date().toISOString(),
      });
    }

    return NextResponse.json(
      { success: false, error: `Unknown action: ${action}. Use generate, send, or preview.` },
      { status: 400 }
    );
  } catch (error) {
    logger.error('Intelligence brief error', {
      action,
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { success: false, error: 'Intelligence brief operation failed' },
      { status: 500 }
    );
  }
}
