'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { moduleCompletion, readProgress, type ProgressStore } from '@/lib/learn-progress';

export interface ContinueModule {
  slug: string;
  track: string;
  title: string;
  lessons: Array<{ slug: string; title: string }>;
}

// "Continue where you left off" for the Learn hub. Client-only: reads the
// browser store, finds the last-opened course and its first unfinished
// lesson. Renders nothing for a first-time visitor, so the hub is unchanged
// for them.
export default function ContinueLearning({ modules }: { modules: ContinueModule[] }) {
  const [store, setStore] = useState<ProgressStore | null>(null);
  useEffect(() => {
    const refresh = () => setStore(readProgress());
    refresh();
    window.addEventListener('sn:learn:progress', refresh);
    return () => window.removeEventListener('sn:learn:progress', refresh);
  }, []);
  if (!store?.last) return null;
  const mod = modules.find((m) => m.slug === store.last!.moduleSlug);
  if (!mod) return null;
  const { done, total, pct } = moduleCompletion(store, mod.slug, mod.lessons.map((l) => l.slug));
  const nextLesson = mod.lessons.find((l) => !store.modules[mod.slug]?.[l.slug]);
  const href = nextLesson ? `/learn/${mod.track}/${mod.slug}/${nextLesson.slug}` : `/learn/${mod.track}/${mod.slug}`;

  // Suggest another course once this one is done.
  const another = pct === 100 ? modules.find((m) => m.slug !== mod.slug && moduleCompletion(store, m.slug, m.lessons.map((l) => l.slug)).pct < 100) : null;

  return (
    <section className="mb-12 rounded-xl border border-cyan-500/25 bg-cyan-500/[0.05] p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div className="min-w-0">
        <div className="text-[10px] uppercase tracking-wider text-cyan-300 mb-1">{pct === 100 ? 'Course complete' : 'Continue where you left off'}</div>
        <h2 className="text-lg font-semibold text-white truncate">{mod.title}</h2>
        <div className="text-xs text-slate-400 mt-1">
          {done}/{total} lessons · {pct}%{nextLesson && pct < 100 ? ` · next: ${nextLesson.title}` : ''}
        </div>
        <div className="h-1 rounded-full bg-white/[0.08] overflow-hidden mt-2 max-w-xs">
          <div className={`h-full ${pct === 100 ? 'bg-emerald-400' : 'bg-cyan-400'}`} style={{ width: `${pct}%` }} />
        </div>
      </div>
      <div className="flex gap-2 flex-shrink-0">
        {pct < 100 ? (
          <Link href={href} className="btn-primary text-sm py-2 px-4">Resume &rarr;</Link>
        ) : another ? (
          <Link href={`/learn/${another.track}/${another.slug}`} className="btn-primary text-sm py-2 px-4">Start {another.title} &rarr;</Link>
        ) : (
          <Link href="/learn" className="btn-primary text-sm py-2 px-4">All courses</Link>
        )}
      </div>
    </section>
  );
}
