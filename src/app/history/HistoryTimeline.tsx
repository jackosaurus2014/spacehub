'use client';

import { useMemo, useState, useTransition, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
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
  relatedCompanyIds: string[];
};

const CATEGORY_COLORS: Record<string, string> = {
  launch: 'bg-cyan-500 border-cyan-500/50',
  landing: 'bg-amber-500 border-amber-500/50',
  mission: 'bg-purple-500 border-purple-500/50',
  discovery: 'bg-green-500 border-green-500/50',
  policy: 'bg-blue-500 border-blue-500/50',
  milestone: 'bg-pink-500 border-pink-500/50',
};

const CATEGORY_TEXT: Record<string, string> = {
  launch: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
  landing: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  mission: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
  discovery: 'text-green-400 bg-green-500/10 border-green-500/20',
  policy: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  milestone: 'text-pink-400 bg-pink-500/10 border-pink-500/20',
};

function formatFullDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return iso;
  }
}

export interface HistoryTimelineProps {
  events: HistoryEvent[];
  decades: Array<{ decade: number; count: number }>;
  categories: Array<{ category: string; count: number }>;
  initial: {
    decade: string;
    category: string;
    company: string;
    q: string;
    sort: 'asc' | 'desc';
  };
}

export default function HistoryTimeline({
  events,
  decades,
  categories,
  initial,
}: HistoryTimelineProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const [decade, setDecade] = useState(initial.decade);
  const [category, setCategory] = useState(initial.category);
  const [company, setCompany] = useState(initial.company);
  const [q, setQ] = useState(initial.q);
  const [sort, setSort] = useState<'asc' | 'desc'>(initial.sort);

  // Debounced query update
  useEffect(() => {
    const h = setTimeout(() => pushParams({ q }), 300);
    return () => clearTimeout(h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  function pushParams(patch: Record<string, string>) {
    const params = new URLSearchParams(searchParams?.toString() || '');
    const merged = { decade, category, company, q, sort, ...patch };
    for (const [k, v] of Object.entries(merged)) {
      if (v) params.set(k, v);
      else params.delete(k);
    }
    startTransition(() => {
      router.replace(`/history?${params.toString()}`, { scroll: false });
    });
  }

  const grouped = useMemo(() => {
    const byYear = new Map<number, HistoryEvent[]>();
    for (const evt of events) {
      const arr = byYear.get(evt.year) || [];
      arr.push(evt);
      byYear.set(evt.year, arr);
    }
    const years = Array.from(byYear.keys()).sort((a, b) =>
      sort === 'asc' ? a - b : b - a,
    );
    return years.map((year) => ({ year, events: byYear.get(year)! }));
  }, [events, sort]);

  const totalMatching = events.length;

  return (
    <div>
      {/* Filters */}
      <div className="card p-4 mb-6 border border-white/[0.06]">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <label className="block text-[11px] uppercase tracking-wider text-slate-500 mb-1.5">
              Decade
            </label>
            <select
              value={decade}
              onChange={(e) => {
                setDecade(e.target.value);
                pushParams({ decade: e.target.value });
              }}
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500/40"
            >
              <option value="">All decades</option>
              {decades.map((d) => (
                <option key={d.decade} value={d.decade}>
                  {d.decade}s ({d.count})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] uppercase tracking-wider text-slate-500 mb-1.5">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
                pushParams({ category: e.target.value });
              }}
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500/40"
            >
              <option value="">All categories</option>
              {categories.map((c) => (
                <option key={c.category} value={c.category}>
                  {c.category} ({c.count})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] uppercase tracking-wider text-slate-500 mb-1.5">
              Company ID
            </label>
            <input
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              onBlur={() => pushParams({ company })}
              placeholder="e.g. cm123…"
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/40"
            />
          </div>

          <div>
            <label className="block text-[11px] uppercase tracking-wider text-slate-500 mb-1.5">
              Search
            </label>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search title or description"
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/40"
            />
          </div>
        </div>

        <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/[0.05]">
          <p className="text-xs text-slate-500">
            Showing <span className="text-slate-300 font-medium">{totalMatching}</span>{' '}
            event{totalMatching === 1 ? '' : 's'}
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                const next = sort === 'asc' ? 'desc' : 'asc';
                setSort(next);
                pushParams({ sort: next });
              }}
              className="text-xs text-cyan-400 hover:text-cyan-300"
            >
              Sort: {sort === 'asc' ? 'Oldest first' : 'Newest first'}
            </button>
            {(decade || category || company || q) && (
              <button
                onClick={() => {
                  setDecade('');
                  setCategory('');
                  setCompany('');
                  setQ('');
                  pushParams({ decade: '', category: '', company: '', q: '' });
                }}
                className="text-xs text-slate-400 hover:text-slate-200"
              >
                Clear filters
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Timeline */}
      {grouped.length === 0 ? (
        <div className="card p-10 text-center">
          <p className="text-slate-400 text-sm">
            No events match your filters. Try broadening the decade or category.
          </p>
        </div>
      ) : (
        <div className="relative pl-6 md:pl-10">
          <div
            aria-hidden="true"
            className="absolute top-0 bottom-0 left-2 md:left-4 w-px bg-gradient-to-b from-purple-500/30 via-cyan-500/30 to-transparent"
          />

          {grouped.map(({ year, events: yearEvents }) => (
            <section key={year} className="mb-10">
              <div className="flex items-center gap-3 mb-4">
                <div className="absolute left-0 md:left-2 flex items-center justify-center w-4 h-4 rounded-full bg-slate-900 border-2 border-purple-500 -translate-x-1/2" />
                <h3 className="text-2xl font-bold text-white font-mono">{year}</h3>
                <span className="text-xs text-slate-500">
                  {yearEvents.length} event{yearEvents.length === 1 ? '' : 's'}
                </span>
              </div>

              <div className="space-y-3">
                {yearEvents.map((evt) => (
                  <Link
                    key={evt.id}
                    href={`/history/${evt.slug}`}
                    className="block card p-4 border border-white/[0.06] hover:border-cyan-500/30 transition-colors group"
                  >
                    <div className="flex items-start gap-3">
                      <span
                        className={`mt-1.5 w-2.5 h-2.5 rounded-full shrink-0 ${
                          CATEGORY_COLORS[evt.category] || 'bg-slate-400'
                        }`}
                        aria-hidden="true"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="text-xs text-slate-500 font-mono">
                            {formatFullDate(evt.eventDate)}
                          </span>
                          <span
                            className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full border ${
                              CATEGORY_TEXT[evt.category] ||
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
                        <h4 className="text-white font-medium group-hover:text-cyan-300 transition-colors">
                          {evt.title}
                        </h4>
                        <p className="text-slate-400 text-sm mt-1 line-clamp-2">
                          {evt.description}
                        </p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
