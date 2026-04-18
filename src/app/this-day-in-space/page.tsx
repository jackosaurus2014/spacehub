import { Metadata } from 'next';
import Link from 'next/link';
import AnimatedPageHeader from '@/components/ui/AnimatedPageHeader';
import ScrollReveal from '@/components/ui/ScrollReveal';
import RelatedModules from '@/components/ui/RelatedModules';
import { PAGE_RELATIONS } from '@/lib/module-relationships';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import ThisDayTabs from './ThisDayTabs';

export const metadata: Metadata = {
  title: 'This Day in Space History',
  description:
    'Discover what happened in space history on this day. Major launches, discoveries, milestones, and achievements throughout the history of spaceflight.',
  alternates: { canonical: 'https://spacenexus.us/this-day-in-space' },
};

export const dynamic = 'force-dynamic';

type HistoryEventLite = {
  id: string;
  slug: string;
  title: string;
  description: string;
  eventDate: Date;
  monthDay: string;
  year: number;
  category: string;
  imageUrl: string | null;
  featured: boolean;
};

function getTodayMonthDay(): string {
  const now = new Date();
  const m = String(now.getUTCMonth() + 1).padStart(2, '0');
  const d = String(now.getUTCDate()).padStart(2, '0');
  return `${m}-${d}`;
}

function getWeekMonthDays(): string[] {
  const out: string[] = [];
  const today = new Date();
  for (let i = 0; i < 7; i++) {
    const d = new Date(today);
    d.setUTCDate(d.getUTCDate() + i);
    const m = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    out.push(`${m}-${day}`);
  }
  return out;
}

function formatMonthDay(monthDay: string): string {
  const [m, d] = monthDay.split('-').map((p) => parseInt(p, 10));
  if (!m || !d) return monthDay;
  const date = new Date(2000, m - 1, d);
  return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
}

async function loadData() {
  const todayMonthDay = getTodayMonthDay();
  const weekMonthDays = getWeekMonthDays();

  try {
    const [today, featured, week, archive] = await Promise.all([
      prisma.spaceHistoryEvent.findMany({
        where: { monthDay: todayMonthDay },
        orderBy: [{ featured: 'desc' }, { year: 'asc' }],
      }),
      prisma.spaceHistoryEvent.findMany({
        where: { featured: true, NOT: { monthDay: todayMonthDay } },
        orderBy: { eventDate: 'desc' },
        take: 8,
      }),
      prisma.spaceHistoryEvent.findMany({
        where: { monthDay: { in: weekMonthDays } },
        orderBy: [{ monthDay: 'asc' }, { year: 'asc' }],
      }),
      prisma.spaceHistoryEvent.findMany({
        orderBy: [{ eventDate: 'desc' }],
        take: 50,
      }),
    ]);

    return { today, featured, week, archive, todayMonthDay, weekMonthDays };
  } catch (error) {
    logger.error('Failed to load this-day-in-space page data', {
      error: error instanceof Error ? error.message : String(error),
    });
    return {
      today: [] as HistoryEventLite[],
      featured: [] as HistoryEventLite[],
      week: [] as HistoryEventLite[],
      archive: [] as HistoryEventLite[],
      todayMonthDay,
      weekMonthDays,
    };
  }
}

export default async function ThisDayInSpacePage() {
  const data = await loadData();

  // Group week events by monthDay for display
  const weekGrouped: Record<string, HistoryEventLite[]> = {};
  for (const e of data.week) {
    (weekGrouped[e.monthDay] ||= []).push(e as unknown as HistoryEventLite);
  }

  return (
    <div className="min-h-screen bg-space-900">
      <div className="container mx-auto px-4 pb-16">
        <AnimatedPageHeader
          title="This Day in Space"
          subtitle={`Historical milestones from the history of spaceflight — ${formatMonthDay(data.todayMonthDay)}`}
          icon="📅"
          accentColor="purple"
        >
          <Link href="/history" className="btn-secondary text-sm py-2 px-4">
            Full Timeline
          </Link>
        </AnimatedPageHeader>

        <div className="max-w-4xl mx-auto">
          <ScrollReveal>
            <ThisDayTabs
              today={JSON.parse(JSON.stringify(data.today))}
              featured={JSON.parse(JSON.stringify(data.featured))}
              weekGrouped={JSON.parse(JSON.stringify(weekGrouped))}
              archive={JSON.parse(JSON.stringify(data.archive))}
              todayMonthDay={data.todayMonthDay}
              weekMonthDays={data.weekMonthDays}
              formatMonthDayLabel={null}
            />
          </ScrollReveal>

          <div className="mt-10">
            <RelatedModules modules={PAGE_RELATIONS['this-day-in-space'] ?? []} />
          </div>

          <ScrollReveal>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 text-sm mt-10">
              <Link
                href="/history"
                className="text-cyan-400 hover:text-cyan-300 underline underline-offset-2"
              >
                Full Space Timeline
              </Link>
              <span className="hidden sm:inline text-white/10">|</span>
              <Link
                href="/glossary"
                className="text-slate-400 hover:text-slate-300 underline underline-offset-2"
              >
                Space Glossary
              </Link>
              <span className="hidden sm:inline text-white/10">|</span>
              <Link
                href="/blog"
                className="text-slate-400 hover:text-slate-300 underline underline-offset-2"
              >
                Articles
              </Link>
            </div>
          </ScrollReveal>
        </div>
      </div>
    </div>
  );
}
