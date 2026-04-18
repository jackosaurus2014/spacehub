'use client';

import { useState } from 'react';
import Link from 'next/link';

type HistoryEvent = {
  id: string;
  slug: string;
  title: string;
  description: string;
  eventDate: string;
  monthDay: string;
  year: number;
  category: string;
  imageUrl: string | null;
  featured: boolean;
};

const CATEGORY_COLORS: Record<string, string> = {
  launch: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
  landing: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  mission: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
  discovery: 'text-green-400 bg-green-500/10 border-green-500/20',
  policy: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  milestone: 'text-pink-400 bg-pink-500/10 border-pink-500/20',
};

function formatMonthDayLabel(md: string): string {
  const [m, d] = md.split('-').map((p) => parseInt(p, 10));
  if (!m || !d) return md;
  const date = new Date(2000, m - 1, d);
  return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
}

function EventRow({ evt, compact = false }: { evt: HistoryEvent; compact?: boolean }) {
  return (
    <Link
      href={`/history/${evt.slug}`}
      className="flex items-start gap-3 py-2 px-2 -mx-2 rounded-lg hover:bg-white/[0.03] transition-colors group"
    >
      <span className="text-cyan-400 font-mono text-sm shrink-0 w-12 pt-0.5">
        {evt.year}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full border ${
              CATEGORY_COLORS[evt.category] ||
              'text-slate-400 bg-white/5 border-white/10'
            }`}
          >
            {evt.category}
          </span>
          {evt.featured && (
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full border border-purple-500/30 bg-purple-500/10 text-purple-300">
              featured
            </span>
          )}
        </div>
        <h4
          className={`text-white group-hover:text-cyan-300 transition-colors mt-1 ${
            compact ? 'text-sm' : 'text-base font-medium'
          }`}
        >
          {evt.title}
        </h4>
        {!compact && (
          <p className="text-slate-400 text-xs mt-1 line-clamp-2">{evt.description}</p>
        )}
      </div>
    </Link>
  );
}

export interface ThisDayTabsProps {
  today: HistoryEvent[];
  featured: HistoryEvent[];
  weekGrouped: Record<string, HistoryEvent[]>;
  archive: HistoryEvent[];
  todayMonthDay: string;
  weekMonthDays: string[];
  // Placeholder to silence unused prop warnings if passed from server.
  formatMonthDayLabel?: unknown;
}

type TabKey = 'today' | 'week' | 'archive';

export default function ThisDayTabs(props: ThisDayTabsProps) {
  const { today, featured, weekGrouped, archive, todayMonthDay, weekMonthDays } = props;
  const [active, setActive] = useState<TabKey>('today');

  const tabs: Array<{ key: TabKey; label: string; count: number }> = [
    { key: 'today', label: 'Today', count: today.length },
    {
      key: 'week',
      label: 'This Week',
      count: Object.values(weekGrouped).reduce((a, arr) => a + arr.length, 0),
    },
    { key: 'archive', label: 'Archive', count: archive.length },
  ];

  return (
    <div>
      <div className="flex gap-1 p-1 bg-white/[0.03] rounded-lg border border-white/[0.06] mb-6">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setActive(t.key)}
            className={`flex-1 text-sm font-medium py-2 px-3 rounded-md transition-colors ${
              active === t.key
                ? 'bg-purple-500/20 text-purple-200 border border-purple-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {t.label}
            <span className="ml-1.5 text-xs text-slate-500">{t.count}</span>
          </button>
        ))}
      </div>

      {active === 'today' && (
        <div className="space-y-6">
          <div className="card p-5 border border-purple-500/20">
            <h2 className="text-lg font-semibold text-white mb-1">
              {formatMonthDayLabel(todayMonthDay)}
            </h2>
            <p className="text-xs text-slate-500 mb-4">
              Events that happened on this day in history
            </p>
            {today.length > 0 ? (
              <div className="space-y-1">
                {today.map((evt) => (
                  <EventRow key={evt.id} evt={evt} />
                ))}
              </div>
            ) : (
              <p className="text-slate-500 text-sm">
                No major events recorded for today. Check back tomorrow or browse the
                archive.
              </p>
            )}
          </div>

          {featured.length > 0 && (
            <div className="card p-5">
              <h3 className="text-sm font-semibold text-white mb-3">
                Featured Moments
              </h3>
              <div className="space-y-1">
                {featured.map((evt) => (
                  <EventRow key={evt.id} evt={evt} compact />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {active === 'week' && (
        <div className="card p-5">
          <h2 className="text-lg font-semibold text-white mb-1">Next Seven Days</h2>
          <p className="text-xs text-slate-500 mb-4">
            Historical events spanning the upcoming week
          </p>
          <div className="space-y-5">
            {weekMonthDays.map((md) => {
              const entries = weekGrouped[md] || [];
              return (
                <div key={md} className="border-b border-white/[0.04] pb-4 last:border-0 last:pb-0">
                  <h3 className="text-slate-300 text-xs font-medium uppercase tracking-wider mb-2">
                    {formatMonthDayLabel(md)}
                    {md === todayMonthDay && (
                      <span className="ml-2 text-[10px] text-purple-300 normal-case">
                        today
                      </span>
                    )}
                  </h3>
                  {entries.length > 0 ? (
                    <div className="space-y-1">
                      {entries.map((evt) => (
                        <EventRow key={evt.id} evt={evt} compact />
                      ))}
                    </div>
                  ) : (
                    <p className="text-slate-600 text-xs">No events recorded.</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {active === 'archive' && (
        <div className="card p-5">
          <h2 className="text-lg font-semibold text-white mb-1">Archive</h2>
          <p className="text-xs text-slate-500 mb-4">
            Most recent historical events by event date
          </p>
          {archive.length > 0 ? (
            <div className="space-y-1">
              {archive.map((evt) => (
                <EventRow key={evt.id} evt={evt} compact />
              ))}
            </div>
          ) : (
            <p className="text-slate-500 text-sm">No events yet.</p>
          )}
          <div className="mt-4 text-center">
            <Link
              href="/history"
              className="inline-block text-cyan-400 hover:text-cyan-300 text-sm underline underline-offset-2"
            >
              Browse full timeline →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
