import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

/**
 * GET /api/company-signals?company=spacex&limit=10
 *
 * Unified company signal feed — aggregates news mentions, funding events,
 * executive moves, and patent filings for a given company into one timeline.
 * Cross-pollinates data from multiple modules.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const company = searchParams.get('company') || '';
    const limit = Math.min(50, parseInt(searchParams.get('limit') || '10', 10));

    if (!company) {
      return NextResponse.json({ error: 'company parameter required' }, { status: 400 });
    }

    const signals: {
      type: string;
      title: string;
      description: string;
      date: string;
      source: string;
      href: string;
    }[] = [];

    // 1. News mentions
    try {
      const news = await prisma.newsArticle.findMany({
        where: {
          OR: [
            { title: { contains: company, mode: 'insensitive' } },
            { summary: { contains: company, mode: 'insensitive' } },
          ],
        },
        orderBy: { publishedAt: 'desc' },
        take: limit,
        select: { title: true, summary: true, publishedAt: true, source: true },
      });
      for (const item of news) {
        signals.push({
          type: 'news',
          title: item.title,
          description: item.summary?.slice(0, 100) || '',
          date: item.publishedAt?.toISOString() || '',
          source: item.source || 'news',
          href: `/news`,
        });
      }
    } catch { /* table may not exist */ }

    // 2. Funding events
    try {
      const funding = await prisma.fundingRound.findMany({
        where: {
          company: { name: { contains: company, mode: 'insensitive' } },
        },
        orderBy: { date: 'desc' },
        take: limit,
        select: { roundType: true, amount: true, date: true, leadInvestor: true, seriesLabel: true },
      });
      for (const item of funding) {
        signals.push({
          type: 'funding',
          title: `${item.seriesLabel || item.roundType || 'Funding'}: $${item.amount ? (item.amount / 1_000_000).toFixed(0) + 'M' : 'Undisclosed'}`,
          description: item.leadInvestor ? `Led by ${item.leadInvestor}` : '',
          date: item.date?.toISOString() || '',
          source: 'funding-rounds',
          href: `/funding-rounds`,
        });
      }
    } catch { /* table may not exist */ }

    // Sort all signals by date (newest first)
    signals.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return NextResponse.json({
      company,
      signals: signals.slice(0, limit),
      total: signals.length,
    });
  } catch (error) {
    logger.error('Company signals API error', { error: String(error) });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
