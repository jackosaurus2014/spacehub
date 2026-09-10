'use client';

import { useEffect, useState } from 'react';
import { isJobSaved, toggleSavedJob, SAVED_JOBS_EVENT } from '@/lib/saved-jobs';
import { trackGA4Event } from '@/lib/analytics';

export default function SaveJobButton({ job, size = 'sm', className = '' }: { job: { id: string; title: string; company: string; location: string }; size?: 'sm' | 'md'; className?: string }) {
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    const sync = () => setSaved(isJobSaved(job.id));
    sync();
    window.addEventListener(SAVED_JOBS_EVENT, sync);
    return () => window.removeEventListener(SAVED_JOBS_EVENT, sync);
  }, [job.id]);
  const onClick = (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    const now = toggleSavedJob(job);
    setSaved(now);
    trackGA4Event(now ? 'job_saved' : 'job_unsaved', { job_id: job.id, company: job.company });
  };
  const pad = size === 'md' ? 'px-3 py-2 text-sm' : 'px-2 py-1 text-xs';
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={saved}
      aria-label={saved ? `Remove ${job.title} from saved jobs` : `Save ${job.title}`}
      className={`inline-flex items-center gap-1.5 rounded-lg border transition-colors min-h-[36px] ${pad} ${saved ? 'border-amber-400/50 bg-amber-400/10 text-amber-300' : 'border-white/10 text-slate-300 hover:border-white/25 hover:text-white'} ${className}`}
    >
      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill={saved ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={2} aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-4-7 4V5z" /></svg>
      {saved ? 'Saved' : 'Save'}
    </button>
  );
}
