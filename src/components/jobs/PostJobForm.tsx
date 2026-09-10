'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { JOB_CATEGORIES } from '@/types';
import { JOB_POSTING_PLANS } from '@/lib/job-posting-plans';
import { trackGA4Event } from '@/lib/analytics';

const LEVELS = [['entry', 'Entry'], ['mid', 'Mid'], ['senior', 'Senior'], ['lead', 'Lead'], ['director', 'Director'], ['vp', 'VP'], ['c_suite', 'C-suite']] as const;
const TYPES = ['full-time', 'part-time', 'contract', 'internship'];

/**
 * Employer "Post a job" form (2026-09-10). Creates the posting through
 * POST /api/jobs/post and hands off to Stripe Checkout; the posting goes live
 * when the payment webhook lands. Signed-in only, so the employer dashboard
 * can find it afterwards.
 */
export default function PostJobForm({ defaultPlan = 'featured' }: { defaultPlan?: 'standard' | 'featured' }) {
  const { status } = useSession();
  const [planId, setPlanId] = useState<'standard' | 'featured'>(defaultPlan);
  const [f, setF] = useState({ title: '', company: '', location: '', remoteOk: false, category: 'engineering', seniorityLevel: 'mid', employmentType: 'full-time', description: '', applyUrl: '', contactEmail: '', salaryMin: '', salaryMax: '', clearanceRequired: false });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (k: keyof typeof f, v: string | boolean) => setF((p) => ({ ...p, [k]: v }));
  const plan = JOB_POSTING_PLANS.find((p) => p.id === planId)!;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setError(null); setBusy(true);
    try {
      const body = {
        planId, title: f.title, company: f.company, location: f.location, remoteOk: f.remoteOk, category: f.category, seniorityLevel: f.seniorityLevel,
        employmentType: f.employmentType, description: f.description, applyUrl: f.applyUrl, contactEmail: f.contactEmail, clearanceRequired: f.clearanceRequired,
        salaryMin: f.salaryMin ? Number(f.salaryMin) : undefined, salaryMax: f.salaryMax ? Number(f.salaryMax) : undefined,
      };
      const res = await fetch('/api/jobs/post', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || !j?.data?.url) { setError(typeof j?.error === 'string' ? j.error : j?.error?.message || 'Could not start checkout'); setBusy(false); return; }
      trackGA4Event('job_post_checkout', { plan: planId });
      window.location.href = j.data.url;
    } catch { setError('Something went wrong. Please try again.'); setBusy(false); }
  };

  const input = 'w-full rounded-lg bg-white/[0.04] border border-white/10 px-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-cyan-500/50 focus:outline-none';
  const label = 'block text-xs text-slate-400 mb-1';

  return (
    <form onSubmit={submit} id="post-a-job" className="card p-6 space-y-5 scroll-mt-24" aria-labelledby="post-job-heading">
      <div>
        <h2 id="post-job-heading" className="text-xl font-semibold text-white">Post a job</h2>
        <p className="text-sm text-slate-400 mt-1">Live on the board the moment payment clears. Applicants go to your own application link — we never hold candidates.</p>
      </div>

      <fieldset>
        <legend className={label}>Plan</legend>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {JOB_POSTING_PLANS.map((p) => (
            <label key={p.id} className={`rounded-xl border p-4 cursor-pointer ${planId === p.id ? 'border-cyan-500/60 bg-cyan-500/[0.06]' : 'border-white/10 hover:border-white/25'}`}>
              <input type="radio" name="plan" value={p.id} checked={planId === p.id} onChange={() => setPlanId(p.id)} className="sr-only" />
              <div className="flex items-baseline justify-between"><span className="text-white font-semibold">{p.name}</span><span className="text-white font-bold">${p.priceUsd}</span></div>
              <div className="text-xs text-slate-400 mt-1">{p.days} days · {p.blurb}</div>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2"><label className={label} htmlFor="pj-title">Job title</label><input id="pj-title" required minLength={3} maxLength={120} value={f.title} onChange={(e) => set('title', e.target.value)} className={input} placeholder="Senior Propulsion Engineer" /></div>
        <div><label className={label} htmlFor="pj-company">Company</label><input id="pj-company" required minLength={2} maxLength={120} value={f.company} onChange={(e) => set('company', e.target.value)} className={input} placeholder="As it appears on your company profile" /></div>
        <div><label className={label} htmlFor="pj-location">Location</label><input id="pj-location" required minLength={2} maxLength={120} value={f.location} onChange={(e) => set('location', e.target.value)} className={input} placeholder="Hawthorne, CA" /></div>
        <div><label className={label} htmlFor="pj-category">Category</label><select id="pj-category" value={f.category} onChange={(e) => set('category', e.target.value)} className={input}>{JOB_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}</select></div>
        <div><label className={label} htmlFor="pj-level">Seniority</label><select id="pj-level" value={f.seniorityLevel} onChange={(e) => set('seniorityLevel', e.target.value)} className={input}>{LEVELS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div>
        <div><label className={label} htmlFor="pj-type">Employment type</label><select id="pj-type" value={f.employmentType} onChange={(e) => set('employmentType', e.target.value)} className={input}>{TYPES.map((t) => <option key={t} value={t}>{t}</option>)}</select></div>
        <div className="flex items-end gap-4 pb-2">
          <label className="inline-flex items-center gap-2 text-sm text-slate-300"><input type="checkbox" checked={f.remoteOk} onChange={(e) => set('remoteOk', e.target.checked)} className="accent-cyan-500" /> Remote OK</label>
          <label className="inline-flex items-center gap-2 text-sm text-slate-300"><input type="checkbox" checked={f.clearanceRequired} onChange={(e) => set('clearanceRequired', e.target.checked)} className="accent-cyan-500" /> Clearance required</label>
        </div>
        <div><label className={label} htmlFor="pj-smin">Salary min (USD/yr, optional)</label><input id="pj-smin" type="number" min={10000} max={2000000} step={1000} value={f.salaryMin} onChange={(e) => set('salaryMin', e.target.value)} className={input} placeholder="120000" /></div>
        <div><label className={label} htmlFor="pj-smax">Salary max (USD/yr, optional)</label><input id="pj-smax" type="number" min={10000} max={2000000} step={1000} value={f.salaryMax} onChange={(e) => set('salaryMax', e.target.value)} className={input} placeholder="165000" /></div>
        <div className="md:col-span-2"><label className={label} htmlFor="pj-desc">Description (80+ characters; plain text or simple paragraphs)</label><textarea id="pj-desc" required minLength={80} maxLength={12000} rows={8} value={f.description} onChange={(e) => set('description', e.target.value)} className={input} placeholder="What the role does, what you're looking for, what you offer." /></div>
        <div><label className={label} htmlFor="pj-apply">Application link</label><input id="pj-apply" type="url" required value={f.applyUrl} onChange={(e) => set('applyUrl', e.target.value)} className={input} placeholder="https://jobs.yourcompany.com/…" /></div>
        <div><label className={label} htmlFor="pj-email">Contact email (receipt and dashboard notices)</label><input id="pj-email" type="email" required value={f.contactEmail} onChange={(e) => set('contactEmail', e.target.value)} className={input} placeholder="hiring@yourcompany.com" /></div>
      </div>

      <p className="text-xs text-slate-500">Leave salary blank and the listing shows a SpaceNexus estimate labelled as such. Postings that are not space-industry roles are refunded and removed.</p>
      {error && <p className="text-sm text-red-400" role="alert">{error}</p>}

      {status === 'authenticated' ? (
        <button type="submit" disabled={busy} className="btn-primary px-5 py-2.5 rounded-lg text-sm font-semibold min-h-[44px] disabled:opacity-50">
          {busy ? 'Starting checkout…' : `Continue to payment — $${plan.priceUsd}`}
        </button>
      ) : (
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <Link href="/login?callbackUrl=%2Fhire%23post-a-job" className="btn-primary px-5 py-2.5 rounded-lg font-semibold min-h-[44px] inline-flex items-center">Sign in to post</Link>
          <Link href="/register?callbackUrl=%2Fhire%23post-a-job" className="text-cyan-300 hover:underline">Create a free account</Link>
          <span className="text-slate-500">— the account is where you manage the listing and see its numbers.</span>
        </div>
      )}
    </form>
  );
}
