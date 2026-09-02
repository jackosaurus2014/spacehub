import { Metadata } from 'next';
import Link from 'next/link';
import AnimatedPageHeader from '@/components/ui/AnimatedPageHeader';
import RelatedModules from '@/components/ui/RelatedModules';
import { PAGE_RELATIONS } from '@/lib/module-relationships';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import HistoryTimeline from './HistoryTimeline';
import TodayInSpace, { loadTodayInSpace } from './TodayInSpace';

export const metadata: Metadata = {
  title: 'Space History Timeline',
  description:
    'Interactive space history timeline. Filter by decade, category, and company. Explore launches, landings, missions, discoveries, and policy milestones.',
  alternates: { canonical: 'https://spacenexus.us/history' },
};

export const dynamic = 'force-dynamic';

interface HistoryPageProps {
  searchParams?: Promise<{
    decade?: string;
    category?: string;
    company?: string;
    q?: string;
    sort?: string;
  }>;
}

async function loadEvents(params: Awaited<HistoryPageProps['searchParams']>) {
  const decade = params?.decade ? parseInt(params.decade, 10) : null;
  const category = params?.category || '';
  const companyId = params?.company || '';
  const q = (params?.q || '').trim();
  const sort = (params?.sort || 'desc').toLowerCase() === 'asc' ? 'asc' : 'desc';

  const where: Record<string, unknown> = {};
  if (decade && decade >= 1800 && decade <= 2100) {
    where.year = { gte: decade, lt: decade + 10 };
  }
  if (
    category &&
    ['launch', 'landing', 'mission', 'discovery', 'policy', 'milestone'].includes(category)
  ) {
    where.category = category;
  }
  if (companyId) {
    where.relatedCompanyIds = { has: companyId };
  }
  if (q) {
    where.OR = [
      { title: { contains: q, mode: 'insensitive' } },
      { description: { contains: q, mode: 'insensitive' } },
    ];
  }

  try {
    const [events, decadeAgg, categoryAgg, totalAll] = await Promise.all([
      prisma.spaceHistoryEvent.findMany({
        where,
        orderBy: [{ eventDate: sort as 'asc' | 'desc' }],
        take: 300,
      }),
      prisma.spaceHistoryEvent.findMany({
        select: { year: true },
      }),
      prisma.spaceHistoryEvent.groupBy({
        by: ['category'],
        _count: { _all: true },
      }),
      prisma.spaceHistoryEvent.count(),
    ]);

    const decadeCounts = new Map<number, number>();
    for (const row of decadeAgg) {
      const dk = Math.floor(row.year / 10) * 10;
      decadeCounts.set(dk, (decadeCounts.get(dk) || 0) + 1);
    }
    const decades = Array.from(decadeCounts.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([decade, count]) => ({ decade, count }));

    const categories = categoryAgg.map((c) => ({
      category: c.category,
      count: c._count._all,
    }));

    return { events, decades, categories, totalAll };
  } catch (error) {
    logger.error('Failed to load history timeline', {
      error: error instanceof Error ? error.message : String(error),
    });
    return {
      events: [],
      decades: [] as Array<{ decade: number; count: number }>,
      categories: [] as Array<{ category: string; count: number }>,
      totalAll: 0,
    };
  }
}

export default async function HistoryPage(props: HistoryPageProps) {
  const searchParams = await props.searchParams;
  const [{ events, decades, categories, totalAll }, today] = await Promise.all([loadEvents(searchParams), loadTodayInSpace()]);

  return (
    <div className="min-h-screen bg-space-900">
      <div className="container mx-auto px-4 pb-16">
        <AnimatedPageHeader
          title="Space History Timeline"
          subtitle={`${totalAll.toLocaleString()} events spanning launches, landings, missions, discoveries, and milestones`}
          icon="🛰️"
          accentColor="cyan"
        >
          <Link href="#today" className="btn-secondary text-sm py-2 px-4">
            Today in space history
          </Link>
        </AnimatedPageHeader>

        <div className="max-w-5xl mx-auto">
          <TodayInSpace events={today.events} monthDay={today.monthDay} />
          <HistoryTimeline
            events={JSON.parse(JSON.stringify(events))}
            decades={decades}
            categories={categories}
            initial={{
              decade: searchParams?.decade || '',
              category: searchParams?.category || '',
              company: searchParams?.company || '',
              q: searchParams?.q || '',
              sort: (searchParams?.sort === 'asc' ? 'asc' : 'desc') as 'asc' | 'desc',
            }}
          />
        </div>

        <RelatedModules modules={PAGE_RELATIONS['history']} />
      </div>
    </div>
  );
}
