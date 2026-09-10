'use client';

import { useEffect, useState } from 'react';
import { trackGA4Event } from '@/lib/analytics';
import SaveJobButton from '@/components/jobs/SaveJobButton';

/** Save / share / apply-tracking row for a job page (2026-09-10). */
export default function JobActions({ job, applyUrl, onSite = false }: { job: { id: string; title: string; company: string; location: string }; applyUrl: string | null; /** Employer collects applications on SpaceNexus: the button scrolls to the form. */ onSite?: boolean }) {
  const [copied, setCopied] = useState(false);
  // Employer dashboard counters (direct postings only; the API ignores synced rows).
  useEffect(() => {
    fetch(`/api/jobs/${job.id}/track`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ event: 'view' }), keepalive: true }).catch(() => {});
  }, [job.id]);
  const share = async () => {
    const url = typeof window !== 'undefined' ? window.location.href.split('#')[0] : '';
    const text = `${job.title} at ${job.company} — ${job.location}`;
    try {
      if (navigator.share) { await navigator.share({ title: text, url }); }
      else { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2000); }
      trackGA4Event('job_shared', { job_id: job.id });
    } catch { /* user cancelled */ }
  };
  return (
    <div className="flex flex-wrap items-center gap-2">
      {onSite && (
        <a href="#apply" onClick={() => trackGA4Event('job_apply_click', { job_id: job.id, company: job.company, onsite: 1 })} className="btn-primary inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold min-h-[44px]">Apply on SpaceNexus ↓</a>
      )}
      {!onSite && applyUrl && (
        <a
          href={applyUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => {
            trackGA4Event('job_apply_click', { job_id: job.id, company: job.company });
            fetch(`/api/jobs/${job.id}/track`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ event: 'apply' }), keepalive: true }).catch(() => {});
          }}
          className="btn-primary inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold min-h-[44px]"
        >
          Apply on company site ↗
        </a>
      )}
      <SaveJobButton job={job} size="md" />
      <button type="button" onClick={share} className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-2 text-sm text-slate-300 hover:text-white hover:border-white/25 min-h-[44px]">
        {copied ? 'Link copied' : 'Share'}
      </button>
    </div>
  );
}
