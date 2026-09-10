'use client';

import { useState } from 'react';
import { trackGA4Event } from '@/lib/analytics';

/**
 * On-site application form (2026-09-10) for direct postings whose employer
 * collects applications on SpaceNexus (applyMode 'spacenexus'). No account
 * needed; résumé is a link (Drive, Dropbox, personal site) rather than an
 * upload, so nothing is stored on our side that a candidate can't revoke.
 */
export default function ApplyForm({ jobId, company }: { jobId: string; company: string }) {
  const [f, setF] = useState({ name: '', email: '', phone: '', linkedinUrl: '', resumeUrl: '', message: '', website: '' });
  const [state, setState] = useState<'idle' | 'busy' | 'done'>('idle');
  const [error, setError] = useState<string | null>(null);
  const set = (k: keyof typeof f, v: string) => setF((p) => ({ ...p, [k]: v }));
  const input = 'w-full rounded-lg bg-white/[0.04] border border-white/10 px-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-cyan-500/50 focus:outline-none';
  const label = 'block text-xs text-slate-400 mb-1';

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setError(null); setState('busy');
    try {
      const res = await fetch(`/api/jobs/${jobId}/apply`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(f) });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) { setError(typeof j?.error === 'string' ? j.error : j?.error?.message || 'Could not send your application'); setState('idle'); return; }
      trackGA4Event('job_apply_onsite', { job_id: jobId });
      setState('done');
    } catch { setError('Something went wrong. Please try again.'); setState('idle'); }
  };

  if (state === 'done') {
    return (
      <div id="apply" className="card p-6 border-emerald-500/30 scroll-mt-24" role="status">
        <h2 className="text-lg font-semibold text-white">Application sent</h2>
        <p className="text-sm text-slate-300 mt-1">{company} has your details and will contact you at {f.email} if they want to talk. Good luck.</p>
      </div>
    );
  }
  return (
    <form id="apply" onSubmit={submit} className="card p-6 space-y-4 scroll-mt-24" aria-labelledby="apply-heading">
      <div>
        <h2 id="apply-heading" className="text-lg font-semibold text-white">Apply for this role</h2>
        <p className="text-sm text-slate-400 mt-1">Goes straight to {company}&apos;s hiring contact. No account needed.</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div><label className={label} htmlFor="ap-name">Full name</label><input id="ap-name" required minLength={2} maxLength={120} value={f.name} onChange={(e) => set('name', e.target.value)} className={input} autoComplete="name" /></div>
        <div><label className={label} htmlFor="ap-email">Email</label><input id="ap-email" type="email" required value={f.email} onChange={(e) => set('email', e.target.value)} className={input} autoComplete="email" /></div>
        <div><label className={label} htmlFor="ap-phone">Phone (optional)</label><input id="ap-phone" maxLength={40} value={f.phone} onChange={(e) => set('phone', e.target.value)} className={input} autoComplete="tel" /></div>
        <div><label className={label} htmlFor="ap-li">LinkedIn or portfolio (optional)</label><input id="ap-li" type="url" value={f.linkedinUrl} onChange={(e) => set('linkedinUrl', e.target.value)} className={input} placeholder="https://linkedin.com/in/…" /></div>
        <div className="sm:col-span-2"><label className={label} htmlFor="ap-resume">Résumé link (Google Drive, Dropbox, your site)</label><input id="ap-resume" type="url" value={f.resumeUrl} onChange={(e) => set('resumeUrl', e.target.value)} className={input} placeholder="https://…" /></div>
        <div className="sm:col-span-2"><label className={label} htmlFor="ap-msg">Short note (optional)</label><textarea id="ap-msg" rows={4} maxLength={4000} value={f.message} onChange={(e) => set('message', e.target.value)} className={input} placeholder="Why this role, what you've built, when you can start." /></div>
        <div className="hidden" aria-hidden="true"><label htmlFor="ap-website">Website</label><input id="ap-website" tabIndex={-1} autoComplete="off" value={f.website} onChange={(e) => set('website', e.target.value)} /></div>
      </div>
      {error && <p className="text-sm text-red-400" role="alert">{error}</p>}
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={state === 'busy'} className="btn-primary px-5 py-2.5 rounded-lg text-sm font-semibold min-h-[44px] disabled:opacity-50">{state === 'busy' ? 'Sending…' : 'Send application'}</button>
        <span className="text-xs text-slate-500">Your details go to the employer only. SpaceNexus keeps them so the employer can review them in their portal.</span>
      </div>
    </form>
  );
}
