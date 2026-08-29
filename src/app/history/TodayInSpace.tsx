import Link from 'next/link';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';

// "Today in space history" — the strip that replaced /this-day-in-space
// (folded into /history, roadmap 2026-09). Same query the old page ran:
// every event sharing today's UTC month-day, featured first, oldest first.

export type TodayEvent = {
  id: string;
  slug: string;
  title: string;
  description: string;
  year: number;
  category: string;
  featured: boolean;
};

export function todayMonthDay(now: Date = new Date()): string {
  return `${String(now.getUTCMonth() + 1).padStart(2, '0')}-${String(now.getUTCDate()).padStart(2, '0')}`;
}

export async function loadTodayInSpace(now: Date = new Date()): Promise<{ monthDay: string; events: TodayEvent[] }> {
  const monthDay = todayMonthDay(now);
  try {
    const events = await prisma.spaceHistoryEvent.findMany({
      where: { monthDay },
      orderBy: [{ featured: 'desc' }, { year: 'asc' }],
      select: { id: true, slug: true, title: true, description: true, year: true, category: true, featured: true },
      take: 12,
    });
    return { monthDay, events };
  } catch (error) {
    logger.error('Failed to load today-in-space events', { error: error instanceof Error ? error.message : String(error) });
    return { monthDay, events: [] };
  }
}

function formatMonthDay(monthDay: string): string {
  const [m, d] = monthDay.split('-').map((p) => parseInt(p, 10));
  if (!m || !d) return monthDay;
  return new Date(Date.UTC(2000, m - 1, d)).toLocaleDateString('en-US', { month: 'long', day: 'numeric', timeZone: 'UTC' });
}

export default function TodayInSpace({ events, monthDay }: { events: TodayEvent[]; monthDay: string }) {
  if (events.length === 0) return null;
  return (
    <section id="today" className="mb-8 scroll-mt-24" aria-labelledby="today-heading">
      <div className="flex items-baseline justify-between gap-3 mb-3">
        <h2 id="today-heading" className="text-lg font-semibold text-white">Today in space history · {formatMonthDay(monthDay)}</h2>
        <span className="text-xs text-slate-500">{events.length} event{events.length === 1 ? '' : 's'}</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {events.map((e) => (
          <Link key={e.id} href={`/history/${e.slug}`} className="card p-4 hover:border-cyan-500/30 transition-colors group">
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="text-xs font-mono text-cyan-400">{e.year}</span>
              <span className="text-[10px] uppercase tracking-wider text-slate-500">{e.category}</span>
            </div>
            <div className="text-sm font-semibold text-white group-hover:text-cyan-300 transition-colors line-clamp-2">{e.title}</div>
            <p className="text-xs text-slate-400 mt-1 line-clamp-2">{e.description}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
