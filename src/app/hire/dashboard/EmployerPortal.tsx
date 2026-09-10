'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { JOB_CATEGORIES } from '@/types';
import { JOB_POSTING_PLANS, type PostingStatus } from '@/lib/job-posting-plans';
import { trackGA4Event } from '@/lib/analytics';

/**
 * Employer portal (2026-09-10): every posting this account created, with
 * edit / pause / resume / remove / pay-now / renew. Data from
 * /api/jobs/mine; edits go through PATCH /api/jobs/[id]; payments through
 * /api/jobs/[id]/checkout. Deliberately one page: employers want to see the
 * numbers and change the listing, not tour a product.
 */
interface Posting {
  id: string; title: string; company: string; location: string; remoteOk: boolean; category: string; seniorityLevel: string; employmentType: string | null;
  description: string | null; sourceUrl: string | null; contactEmail: string | null; salaryMin: number | null; salaryMax: number | null; clearanceRequired: boolean;
  planId: string | null; isActive: boolean; paidAt: string | null; expiresAt: string | null; featured: boolean; featuredUntil: string | null;
  viewCount: number; applyClicks: number; createdAt: string; status: PostingStatus; plan: { id: string; name: string; priceUsd: number; days: number } | null;
  companyProfile: { slug: string; name: string } | null;
}

const LEVELS = [['entry', 'Entry'], ['mid', 'Mid'], ['senior', 'Senior'], ['lead', 'Lead'], ['director', 'Director'], ['vp', 'VP'], ['c_suite', 'C-suite']] as const;
const STATUS: Record<PostingStatus, { label: string; tone: string }> = {
  unpaid: { label: 'Awaiting payment', tone: 'text-amber-300' },
  expired: { label: 'Expired', tone: 'text-slate-400' },
  paused: { label: 'Paused', tone: 'text-slate-300' },
  live: { label: 'Live', tone: 'text-emerald-300' },
  featured: { label: 'Live · Featured', tone: 'text-emerald-300' },
};
const fmt = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—');
const input = 'w-full rounded-lg bg-white/[0.04] border border-white/10 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-cyan-500/50 focus:outline-none';
const label = 'block text-xs text-slate-400 mb-1';

export default function EmployerPortal({ posted, canceled }: { posted?: string; canceled?: string }) {
  const [rows, setRows] = useState<Posting[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Posting | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/jobs/mine', { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setRows((await res.json()).postings);
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not load'); }
  }, []);
  useEffect(() => { load(); }, [load]);
  // A payment can land a few seconds after Stripe redirects back: re-read twice.
  useEffect(() => { if (!posted) return; const t1 = setTimeout(load, 4000); const t2 = setTimeout(load, 12000); return () => { clearTimeout(t1); clearTimeout(t2); }; }, [posted, load]);

  const act = async (id: string, fn: () => Promise<Response>, okMsg: string) => {
    setBusy(id); setNotice(null); setError(null);
    try {
      const res = await fn(); const j = await res.json().catch(() => ({}));
      if (!res.ok) { setError(typeof j?.error === 'string' ? j.error : j?.error?.message || `HTTP ${res.status}`); return null; }
      setNotice(okMsg); await load(); return j;
    } catch { setError('Something went wrong'); return null; }
    finally { setBusy(null); }
  };
  const toggle = (p: Posting) => act(p.id, () => fetch(`/api/jobs/${p.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ isActive: !p.isActive }) }), p.isActive ? 'Listing paused — it is off the board until you resume it.' : 'Listing resumed.');
  const remove = async (p: Posting) => {
    if (!window.confirm(p.paidAt ? `Take "${p.title}" off the board? It stays in your records; there is no refund for the remaining days.` : `Delete the unpaid draft "${p.title}"?`)) return;
    await act(p.id, () => fetch(`/api/jobs/${p.id}`, { method: 'DELETE' }), p.paidAt ? 'Listing removed from the board.' : 'Draft deleted.');
    trackGA4Event('job_posting_removed', { paid: p.paidAt ? 1 : 0 });
  };
  const pay = async (p: Posting, planId?: string) => {
    const j = await act(p.id, () => fetch(`/api/jobs/${p.id}/checkout`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ planId: planId || p.planId }) }), 'Opening checkout…');
    if (j?.data?.url) window.location.href = j.data.url;
  };
  const saveEdit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); if (!editing) return;
    const f = new FormData(e.currentTarget);
    const num = (k: string) => { const v = String(f.get(k) || '').trim(); return v ? Number(v) : null; };
    const body = {
      title: String(f.get('title') || ''), location: String(f.get('location') || ''), remoteOk: f.get('remoteOk') === 'on', category: String(f.get('category')), seniorityLevel: String(f.get('seniorityLevel')),
      employmentType: String(f.get('employmentType') || 'full-time'), description: String(f.get('description') || ''), applyUrl: String(f.get('applyUrl') || ''), contactEmail: String(f.get('contactEmail') || ''),
      salaryMin: num('salaryMin'), salaryMax: num('salaryMax'), clearanceRequired: f.get('clearanceRequired') === 'on',
    };
    const j = await act(editing.id, () => fetch(`/api/jobs/${editing.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }), 'Listing saved.');
    if (j) { setEditing(null); trackGA4Event('job_posting_edited', {}); }
  };

  return (
    <div className="space-y-4">
      {posted && <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/[0.06] p-4 text-sm text-emerald-200">Thanks — if the payment went through, the listing shows as Live below within a few seconds.</div>}
      {canceled && <div className="rounded-xl border border-amber-500/30 bg-amber-500/[0.06] p-4 text-sm text-amber-200">Checkout was cancelled. The draft is kept below — pay when you are ready.</div>}
      {notice && <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/[0.06] p-4 text-sm text-cyan-100" role="status">{notice}</div>}
      {error && <div className="rounded-xl border border-red-500/30 bg-red-500/[0.06] p-4 text-sm text-red-200" role="alert">{error}</div>}

      {rows === null && !error && <div className="card p-6 h-32 animate-pulse" />}
      {rows && rows.length === 0 && (
        <div className="card p-8 text-center">
          <p className="text-white font-medium">No postings yet</p>
          <p className="text-slate-400 text-sm mt-1">Post a role from the <Link href="/hire#post-a-job" className="text-cyan-300 underline underline-offset-2">Hire page</Link>; it appears here with its numbers, and you can edit, pause or remove it any time.</p>
        </div>
      )}
      {rows && rows.length > 0 && (
        <ul className="space-y-3">
          {rows.map((p) => {
            const st = STATUS[p.status]; const isBusy = busy === p.id;
            return (
              <li key={p.id} className="card p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-baseline gap-2">
                      <Link href={`/space-talent/job/${p.id}`} className="text-white font-semibold hover:text-cyan-300">{p.title}</Link>
                      <span className={`text-xs font-medium ${st.tone}`}>{st.label}</span>
                    </div>
                    <div className="text-sm text-slate-400 mt-0.5">{p.company} · {p.location}{p.remoteOk ? ' · Remote OK' : ''}</div>
                    <div className="text-xs text-slate-500 mt-1">{p.plan ? `${p.plan.name} · $${p.plan.priceUsd}` : '—'} · {p.status === 'unpaid' ? `created ${fmt(p.createdAt)}` : `expires ${fmt(p.expiresAt)}`}</div>
                  </div>
                  <div className="flex gap-6 text-right">
                    <div><div className="text-xl font-semibold text-white tabular-nums">{p.viewCount.toLocaleString()}</div><div className="text-[11px] text-slate-500">views</div></div>
                    <div><div className="text-xl font-semibold text-white tabular-nums">{p.applyClicks.toLocaleString()}</div><div className="text-[11px] text-slate-500">apply clicks</div></div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 mt-4">
                  <button type="button" disabled={isBusy} onClick={() => setEditing(editing?.id === p.id ? null : p)} className="min-h-[40px] px-3 rounded-lg border border-white/15 text-sm text-white hover:border-white/30 disabled:opacity-50">{editing?.id === p.id ? 'Close editor' : 'Edit'}</button>
                  {(p.status === 'live' || p.status === 'featured' || p.status === 'paused') && (
                    <button type="button" disabled={isBusy} onClick={() => toggle(p)} className="min-h-[40px] px-3 rounded-lg border border-white/15 text-sm text-white hover:border-white/30 disabled:opacity-50">{p.isActive ? 'Pause' : 'Resume'}</button>
                  )}
                  {p.status === 'unpaid' && (
                    <button type="button" disabled={isBusy} onClick={() => pay(p)} className="btn-primary min-h-[40px] px-4 rounded-lg text-sm font-semibold disabled:opacity-50">Pay now{p.plan ? ` — $${p.plan.priceUsd}` : ''}</button>
                  )}
                  {p.status === 'expired' && JOB_POSTING_PLANS.map((plan) => (
                    <button key={plan.id} type="button" disabled={isBusy} onClick={() => pay(p, plan.id)} className={`min-h-[40px] px-4 rounded-lg text-sm font-semibold disabled:opacity-50 ${plan.featured ? 'btn-primary' : 'border border-white/15 text-white hover:border-white/30'}`}>Renew as {plan.name.toLowerCase()} — ${plan.priceUsd}</button>
                  ))}
                  <button type="button" disabled={isBusy} onClick={() => remove(p)} className="ml-auto min-h-[40px] px-3 rounded-lg text-sm text-slate-400 hover:text-red-300 disabled:opacity-50">{p.paidAt ? 'Remove' : 'Delete draft'}</button>
                </div>

                {editing?.id === p.id && (
                  <form onSubmit={saveEdit} className="mt-5 border-t border-white/[0.06] pt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2"><label className={label}>Job title</label><input name="title" required minLength={3} maxLength={120} defaultValue={p.title} className={input} /></div>
                    <div><label className={label}>Location</label><input name="location" required minLength={2} maxLength={120} defaultValue={p.location} className={input} /></div>
                    <div><label className={label}>Category</label><select name="category" defaultValue={p.category} className={input}>{JOB_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}</select></div>
                    <div><label className={label}>Seniority</label><select name="seniorityLevel" defaultValue={p.seniorityLevel} className={input}>{LEVELS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div>
                    <div><label className={label}>Employment type</label><select name="employmentType" defaultValue={p.employmentType || 'full-time'} className={input}>{['full-time', 'part-time', 'contract', 'internship'].map((t) => <option key={t} value={t}>{t}</option>)}</select></div>
                    <div className="flex items-end gap-4 pb-2">
                      <label className="inline-flex items-center gap-2 text-sm text-slate-300"><input type="checkbox" name="remoteOk" defaultChecked={p.remoteOk} className="accent-cyan-500" /> Remote OK</label>
                      <label className="inline-flex items-center gap-2 text-sm text-slate-300"><input type="checkbox" name="clearanceRequired" defaultChecked={p.clearanceRequired} className="accent-cyan-500" /> Clearance required</label>
                    </div>
                    <div><label className={label}>Salary min (USD/yr)</label><input name="salaryMin" type="number" min={10000} max={2000000} step={1000} defaultValue={p.salaryMin ?? ''} className={input} /></div>
                    <div><label className={label}>Salary max (USD/yr)</label><input name="salaryMax" type="number" min={10000} max={2000000} step={1000} defaultValue={p.salaryMax ?? ''} className={input} /></div>
                    <div className="md:col-span-2"><label className={label}>Description</label><textarea name="description" required minLength={80} maxLength={12000} rows={8} defaultValue={p.description ?? ''} className={input} /></div>
                    <div><label className={label}>Application link</label><input name="applyUrl" type="url" required defaultValue={p.sourceUrl ?? ''} className={input} /></div>
                    <div><label className={label}>Contact email</label><input name="contactEmail" type="email" required defaultValue={p.contactEmail ?? ''} className={input} /></div>
                    <div className="md:col-span-2 flex items-center gap-3">
                      <button type="submit" disabled={isBusy} className="btn-primary min-h-[44px] px-5 rounded-lg text-sm font-semibold disabled:opacity-50">Save changes</button>
                      <button type="button" onClick={() => setEditing(null)} className="text-sm text-slate-400 hover:text-white">Cancel</button>
                      <span className="text-xs text-slate-500">Changes are live on the board immediately. Plan and featured window change through Renew.</span>
                    </div>
                  </form>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
