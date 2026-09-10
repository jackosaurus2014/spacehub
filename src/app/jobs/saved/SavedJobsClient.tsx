'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { readSavedJobs, removeSavedJob, SAVED_JOBS_EVENT, type SavedJob } from '@/lib/saved-jobs';

export default function SavedJobsClient() {
  const [jobs, setJobs] = useState<SavedJob[] | null>(null);
  const { status } = useSession();
  useEffect(() => {
    const sync = () => setJobs(readSavedJobs());
    sync(); window.addEventListener(SAVED_JOBS_EVENT, sync); return () => window.removeEventListener(SAVED_JOBS_EVENT, sync);
  }, []);
  if (jobs === null) return <div className="card p-6 animate-pulse h-24" />;
  if (jobs.length === 0) {
    return (
      <div className="card p-8 text-center">
        <p className="text-white font-medium">Nothing saved yet</p>
        <p className="text-slate-400 text-sm mt-1">Tap <span className="text-slate-200">Save</span> on any role on the board and it shows up here.</p>
        <Link href="/jobs#board" className="btn-primary inline-flex mt-4 px-4 py-2 rounded-lg text-sm">Browse open roles</Link>
      </div>
    );
  }
  return (
    <div className="space-y-3">
      {status === 'unauthenticated' && (
        <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/[0.05] p-4 text-sm text-slate-200">
          These {jobs.length} saved roles live only in this browser. <Link href="/login?callbackUrl=%2Fjobs%2Fsaved" className="text-cyan-300 underline underline-offset-2">Sign in</Link> or <Link href="/register?callbackUrl=%2Fjobs%2Fsaved" className="text-cyan-300 underline underline-offset-2">create a free account</Link> to keep them and get email alerts for saved searches.
        </div>
      )}
      <ul className="space-y-2">
        {jobs.map((j) => (
          <li key={j.id} className="card p-4 flex items-start gap-3">
            <div className="flex-1 min-w-0">
              <Link href={`/space-talent/job/${j.id}`} className="text-white font-medium hover:text-cyan-300">{j.title}</Link>
              <div className="text-sm text-slate-400 mt-0.5">{j.company} · {j.location}</div>
              <div className="text-xs text-slate-500 mt-1">Saved {new Date(j.savedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
            </div>
            <button type="button" onClick={() => removeSavedJob(j.id)} className="text-xs text-slate-400 hover:text-white min-h-[36px] px-2" aria-label={`Remove ${j.title} from saved jobs`}>Remove</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
