'use client';

import { useEffect, useState } from 'react';
import { moduleCompletion, readProgress } from '@/lib/learn-progress';

// Progress bar for a course page. Reads the client store (which the lesson
// button keeps merged with server progress), so it works signed-out too.
export default function ModuleProgress({ moduleSlug, lessonSlugs }: { moduleSlug: string; lessonSlugs: string[] }) {
  const [state, setState] = useState<{ done: number; total: number; pct: number } | null>(null);
  useEffect(() => {
    const refresh = () => setState(moduleCompletion(readProgress(), moduleSlug, lessonSlugs));
    refresh();
    window.addEventListener('sn:learn:progress', refresh);
    return () => window.removeEventListener('sn:learn:progress', refresh);
  }, [moduleSlug, lessonSlugs]);
  if (!state || state.done === 0) return null;
  return (
    <div className="mb-6" aria-label={`${state.done} of ${state.total} lessons complete`}>
      <div className="flex items-center justify-between text-xs mb-1.5">
        <span className="text-slate-400">Your progress</span>
        <span className={state.pct === 100 ? 'text-emerald-300 font-semibold' : 'text-white'}>{state.done}/{state.total} · {state.pct}%{state.pct === 100 ? ' · Course complete' : ''}</span>
      </div>
      <div className="h-1.5 rounded-full bg-white/[0.08] overflow-hidden">
        <div className={`h-full rounded-full transition-all ${state.pct === 100 ? 'bg-emerald-400' : 'bg-cyan-400'}`} style={{ width: `${state.pct}%` }} />
      </div>
    </div>
  );
}
