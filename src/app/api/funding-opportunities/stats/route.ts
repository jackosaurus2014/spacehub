import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET() {
  try {
    const [total, open, byAgency, byType, totalFunding] = await Promise.all([
      prisma.fundingOpportunity.count(),
      prisma.fundingOpportunity.count({ where: { status: 'open' } }),
      prisma.fundingOpportunity.groupBy({ by: ['agency'], _count: true, orderBy: { _count: { agency: 'desc' } }, take: 10 }),
      prisma.fundingOpportunity.groupBy({ by: ['fundingType'], _count: true }),
      prisma.fundingOpportunity.aggregate({ _sum: { amountMax: true }, where: { status: 'open' } }),
    ]);

    return NextResponse.json({
      total,
      open,
      byAgency: byAgency.map(a => ({ agency: a.agency, count: a._count })),
      byType: byType.map(t => ({ type: t.fundingType, count: t._count })),
      totalAvailableFunding: totalFunding._sum.amountMax || 0,
    });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}
