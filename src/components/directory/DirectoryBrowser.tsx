'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import type { DirectoryGroup } from '@/lib/site-directory';

// The searchable half of /tools. Groups collapse to matching rows as you
// type; with no query, "Most used" leads (data-proven pages) and every group
// follows with an anchor so nav menus can deep-link to it (#launches…).

export default function DirectoryBrowser({ groups }: { groups: readonly DirectoryGroup[] }) {
  const [q, setQ] = useState('');
  const query = q.trim().toLowerCase();

  const filtered = useMemo(() => {
    if (!query) return groups;
    return groups
      .map((g) => ({ ...g, entries: g.entries.filter((e) => `${e.name} ${e.description} ${g.label}`.toLowerCase().includes(query)) }))
      .filter((g) => g.entries.length > 0);
  }, [groups, query]);

  // A page can be listed (and flagged hot) under more than one group — e.g. the
  // Launch Cost Calculator lives in both Learn and Engineering & Operations.
  // Dedupe by href so "Most used" shows each page once.
  const hot = useMemo(() => {
    const seen = new Set<string>();
    return groups
      .flatMap((g) => g.entries.filter((e) => e.hot))
      .filter((e) => (seen.has(e.href) ? false : (seen.add(e.href), true)));
  }, [groups]);
  const total = groups.reduce((n, g) => n + g.entries.length, 0);
  const shown = filtered.reduce((n, g) => n + g.entries.length, 0);

  return (
    <div>
      <div className="sticky top-16 z-10 -mx-4 px-4 py-3 bg-black/90 backdrop-blur-sm border-b border-white/[0.06] mb-8">
        <label className="relative block max-w-xl">
          <span className="sr-only">Search the directory</span>
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={`Search ${total} pages — try "link budget", "Starship", "ITAR"`}
            className="w-full bg-white/[0.06] border border-white/[0.08] rounded-lg pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
            autoComplete="off"
          />
          <svg className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" /></svg>
        </label>
        {query && <p className="text-xs text-slate-500 mt-2">{shown} of {total} pages match</p>}
      </div>

      {!query && (
        <section className="mb-12" aria-labelledby="dir-hot">
          <h2 id="dir-hot" className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-3">Most used</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {hot.map((e) => (
              <Link key={e.href} href={e.href} className="card p-3 flex items-center gap-2.5 hover:border-cyan-500/30 transition-colors group">
                <span className="text-lg" aria-hidden="true">{e.icon}</span>
                <span className="text-xs font-semibold text-white group-hover:text-cyan-300 truncate">{e.name}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {filtered.map((g) => (
        <section key={g.key} id={g.key} className="mb-12 scroll-mt-32" aria-labelledby={`dir-${g.key}`}>
          <div className="flex items-baseline gap-3 mb-3">
            <h2 id={`dir-${g.key}`} className="text-xl font-bold text-white">{g.label}</h2>
            <span className="text-xs text-slate-500">{g.entries.length}</span>
          </div>
          {!query && <p className="text-sm text-slate-400 mb-4">{g.blurb}</p>}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {g.entries.map((e) => (
              <Link key={e.href} href={e.href} className="card p-3.5 flex items-start gap-3 hover:border-cyan-500/30 transition-colors group">
                <span className="text-xl leading-none mt-0.5" aria-hidden="true">{e.icon}</span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-white group-hover:text-cyan-300 transition-colors">
                    {e.name}{e.pro && <span className="ml-2 text-[9px] uppercase tracking-wider text-amber-300 border border-amber-500/30 rounded px-1 py-0.5 align-middle">Pro</span>}
                  </span>
                  <span className="block text-xs text-slate-500 leading-snug">{e.description}</span>
                </span>
              </Link>
            ))}
          </div>
        </section>
      ))}

      {query && filtered.length === 0 && (
        <p className="text-slate-400 text-sm">Nothing matches &ldquo;{q}&rdquo;. Try a broader word, or <Link href="/search" className="text-cyan-400 hover:text-cyan-300">search the whole site</Link>.</p>
      )}
    </div>
  );
}
