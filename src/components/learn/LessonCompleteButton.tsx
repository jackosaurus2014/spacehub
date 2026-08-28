'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { clientLogger } from '@/lib/client-logger';
import { isLessonComplete, mergeServerProgress, readProgress, setLessonComplete, touchLesson, writeProgress } from '@/lib/learn-progress';

interface Props {
  track: string;
  moduleSlug: string;
  lessonSlug: string;
  lessonTitle: string;
  nextHref: string | null;
  nextTitle: string | null;
  moduleHref: string;
  isLast: boolean;
}

export default function LessonCompleteButton({ track, moduleSlug, lessonSlug, lessonTitle, nextHref, nextTitle, moduleHref, isLast }: Props) {
  const { status } = useSession();
  const signedIn = status === 'authenticated';
  const [done, setDone] = useState(false);
  const [saving, setSaving] = useState(false);

  // Mount: record "last opened", merge server progress if signed in.
  useEffect(() => {
    let store = touchLesson(readProgress(), { track, moduleSlug, lessonSlug, title: lessonTitle, at: new Date().toISOString() });
    writeProgress(store);
    setDone(isLessonComplete(store, moduleSlug, lessonSlug));
    if (!signedIn) return;
    fetch('/api/learn/progress')
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (!j?.completed) return;
        store = mergeServerProgress(readProgress(), j.completed);
        writeProgress(store);
        setDone(isLessonComplete(store, moduleSlug, lessonSlug));
      })
      .catch(() => {});
  }, [track, moduleSlug, lessonSlug, lessonTitle, signedIn]);

  const toggle = async () => {
    const next = !done;
    setDone(next);
    writeProgress(setLessonComplete(readProgress(), moduleSlug, lessonSlug, next));
    if (!signedIn) return;
    setSaving(true);
    try {
      await fetch('/api/learn/progress', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ moduleSlug, lessonSlug, completed: next }) });
    } catch (e) {
      clientLogger.warn('lesson progress sync failed', { error: e instanceof Error ? e.message : String(e) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={`rounded-xl border p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${done ? 'border-emerald-500/30 bg-emerald-500/[0.06]' : 'border-white/10 bg-white/[0.03]'}`}>
      <div>
        <div className="text-sm font-semibold text-white">{done ? 'Lesson complete' : 'Finished this lesson?'}</div>
        <div className="text-xs text-slate-400 mt-0.5">
          {done
            ? (isLast ? 'That was the last lesson in this course.' : nextTitle ? `Up next: ${nextTitle}` : 'Progress saved.')
            : signedIn ? 'Progress syncs to your account.' : 'Progress is saved in this browser; sign in to keep it across devices.'}
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <button type="button" onClick={toggle} disabled={saving} aria-pressed={done}
          className={`text-sm font-medium px-4 py-2 rounded-lg border transition-colors ${done ? 'border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/10' : 'border-white/15 text-white hover:bg-white/[0.06]'}`}>
          {done ? '✓ Completed' : 'Mark complete'}
        </button>
        {done && (nextHref ? (
          <Link href={nextHref} className="btn-primary text-sm py-2 px-4">Next lesson &rarr;</Link>
        ) : (
          <Link href={moduleHref} className="btn-primary text-sm py-2 px-4">Back to course</Link>
        ))}
      </div>
    </div>
  );
}
