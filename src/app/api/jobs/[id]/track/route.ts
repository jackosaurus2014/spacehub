import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';

/**
 * POST /api/jobs/[id]/track { event: 'view' | 'apply' } (2026-09-10)
 *
 * Counters for the employer dashboard. Fire-and-forget from the job page;
 * unknown ids and bad bodies are ignored (204 either way) so nothing here can
 * ever break a job page. Only direct (employer-posted) rows are counted —
 * synced ATS rows have no dashboard to show the numbers on.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json().catch(() => null);
  const event = body && typeof body.event === 'string' ? body.event : '';
  if (!id || (event !== 'view' && event !== 'apply')) return new NextResponse(null, { status: 204 });
  try {
    await prisma.spaceJobPosting.updateMany({
      where: { id, source: 'direct' },
      data: event === 'view' ? { viewCount: { increment: 1 } } : { applyClicks: { increment: 1 } },
    });
  } catch { /* counters are best-effort */ }
  return new NextResponse(null, { status: 204 });
}
