'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { JOB_CATEGORIES } from '@/types';
import { JOB_POSTING_PLANS, type PostingStatus } from '@/lib/job-posting-plans';
import { trackGA4Event } from '@/lib/analytics';
import JobDescription from '@/components/jobs/JobDescription';

/**
 * Employer portal (2026-09-10): every posting this account created or that
 * belongs to a company profile it has claimed, with edit / pause / resume /
 * remove / pay-now / renew / upgrade-to-featured / duplicate, plus the
 * applicants collected on SpaceNexus for each role. Data from
 * /api/jobs/mine; edits go through PATCH /api/jobs/[id]; payments through
 * /api/jobs/[id]/checkout; applicants through /api/jobs/[id]/applicants.
 * Deliberately one page: employers want the numbers and the controls, not a
 * product tour.
 */
interface Posting {
  id: string; title: string; company: string; location: string; remoteOk: boolean; category: string; seniorityLevel: string; employmentType: string | null;
  description: string | null; sourceUrl: string | null; contactEmail: string | null; salaryMin: number | null; salaryMax: number | null; clearanceRequired: boolean;
  applyMode: 'link' | 'spacenexus'; planId: string | null; isActive: boolean; paidAt: string | null; expiresAt: string | null; featured: boolean; featuredUntil: string | null;
  viewCount: number; applyClicks: number; applicantCount: number; newApplicantCount: number; createdAt: string; status: PostingStatus;
  plan: { id: string; name: string; priceUsd: number; days: number } | null; companyProfile: { slug: string; name: string } | null;
}
interface Applicant {
  id: string; name: string; email: string; phone: string | null; linkedinUrl: string | null; resumeUrl: string | null; message: string | null;
  status: 'new' | 'reviewed' | 'contacted' | 'rejected'; employerNote: string | null; createdAt: string;
}

const LEVELS = [['entry', 'Entry'], ['mid', 'Mid'], ['senior', 'Senior'], ['lead', 'Lead'], ['director', 'Director'], ['vp', 'VP'], ['c_suite', 'C-suite']] as const;
const STATUS: Record<PostingStatus, { label: string; tone: string }> = {
  unpaid: { label: 'Draft · awaiting payment', tone: 'text-amber-300' },
  expired: { label: 'Expired', tone: 'text-slate-400' },
  paused: { label: 'Paused', tone: 'text-slate-300' },
  live: { label: 'Live', tone: 'text-emerald-300' },
  featured: { label: 'Live · Featured', tone: 'text-emerald-300' },
};
const APPLICANT_STATUS: Array<[Applicant['status'], string]> = [['new', 'New'], ['reviewed', 'Reviewed'], ['contacted', 'Contacted'], ['rejected', 'Not a fit']];
const fmt = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—');
const daysLeft = (iso: string | null) => (iso ? Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000) : null);
const input = 'w-full rounded-lg bg-white/[0.04] border border-white/10 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-cyan-500/50 focus:outline-none';
const label = 'block text-xs text-slate-400 mb-1';
const btn = 'min-h-[40px] px-3 rounded-lg border border-white/15 text-sm text-white hover:border-white/30 disabled:opacity-50';
const FEATURED = JOB_POSTING_PLANS.find((p) => p.featured)!;

export default function EmployerPortal({ posted, canceled, draft }: { posted?: string; canceled?: string; draft?: string }) {
  const [rows, setRows] = useState<Posting[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Posting | null>(null);
  const [editMode, setEditMode] = useState<'link' | 'spacenexus'>('link');
  const [openApplicants, setOpenApplicants] = useState<string | null>(null);
  const [applicants, setApplicants] = useState<Record<string, Applicant[] | undefined>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [previewText, setPreviewText] = useState<string | null>(null);

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

  const loadApplicants = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/jobs/${id}/applicants`, { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const list: Applicant[] = (await res.json()).applicants;
      setApplicants((a) => ({ ...a, [id]: list }));
    } catch { setError('Could not load applicants'); }
  }, []);
  const showApplicants = useCallback((id: string) => { setOpenApplicants(id); loadApplicants(id); }, [loadApplicants]);
  // The new-applicant email deep-links to #applicants-<jobId>.
  useEffect(() => {
    const m = typeof window !== 'undefined' ? window.location.hash.match(/^#applicants-(.+)$/) : null;
    if (m && rows?.some((r) => r.id === m[1])) showApplicants(m[1]);
  }, [rows, showApplicants]);

  const act = async (id: string, fn: () => Promise<Response>, okMsg: string | null) => {
    setBusy(id); setNotice(null); setError(null);
    try {
      const res = await fn(); const j = await res.json().catch(() => ({}));
      if (!res.ok) { setError(typeof j?.error === 'string' ? j.error : j?.error?.message || `HTTP ${res.status}`); return null; }
      if (okMsg) setNotice(okMsg);
      await load(); return j;
    } catch { setError('Something went wrong'); return null; }
    finally { setBusy(null); }
  };
  const patch = (id: string, body: Record<string, unknown>) => fetch(`/api/jobs/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const toggle = (p: Posting) => act(p.id, () => patch(p.id, { isActive: !p.isActive }), p.isActive ? 'Listing paused — it is off the board until you resume it.' : 'Listing resumed.');
  const remove = async (p: Posting) => {
    if (!window.confirm(p.paidAt ? `Take "${p.title}" off the board? It stays in your records; there is no refund for the remaining days.` : `Delete the unpaid draft "${p.title}"?`)) return;
    await act(p.id, () => fetch(`/api/jobs/${p.id}`, { method: 'DELETE' }), p.paidAt ? 'Listing removed from the board.' : 'Draft deleted.');
    trackGA4Event('job_posting_removed', { paid: p.paidAt ? 1 : 0 });
  };
  const pay = async (p: Posting, planId?: string) => {
    const j = await act(p.id, () => fetch(`/api/jobs/${p.id}/checkout`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ planId: planId || p.planId }) }), 'Opening checkout…');
    if (j?.data?.url) window.location.href = j.data.url;
  };
  const duplicate = async (p: Posting) => {
    const body = {
      planId: p.plan?.id || 'standard', draft: true, title: `${p.title} (copy)`, company: p.company, location: p.location, remoteOk: p.remoteOk, category: p.category, seniorityLevel: p.seniorityLevel,
      employmentType: p.employmentType || 'full-time', description: p.description || '', applyMode: p.applyMode, applyUrl: p.applyMode === 'link' ? p.sourceUrl || '' : '', contactEmail: p.contactEmail || '',
      clearanceRequired: p.clearanceRequired, salaryMin: p.salaryMin ?? undefined, salaryMax: p.salaryMax ?? undefined, companyProfileSlug: p.companyProfile?.slug,
    };
    const j = await act(p.id, () => fetch('/api/jobs/post', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }), 'Draft copy created below — edit it, then pay to publish.');
    if (j) trackGA4Event('job_posting_duplicated', {});
  };
  const startEdit = (p: Posting) => { if (editing?.id === p.id) { setEditing(null); return; } setEditing(p); setEditMode(p.applyMode); };
  const saveEdit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); if (!editing) return;
    const f = new FormData(e.currentTarget);
    const num = (k: string) => { const v = String(f.get(k) || '').trim(); return v ? Number(v) : null; };
    const body = {
      title: String(f.get('title') || ''), location: String(f.get('location') || ''), remoteOk: f.get('remoteOk') === 'on', category: String(f.get('category')), seniorityLevel: String(f.get('seniorityLevel')),
      employmentType: String(f.get('employmentType') || 'full-time'), description: String(f.get('description') || ''), applyMode: editMode,
      applyUrl: editMode === 'link' ? String(f.get('applyUrl') || '') : null, contactEmail: String(f.get('contactEmail') || ''),
      salaryMin: num('salaryMin'), salaryMax: num('salaryMax'), clearanceRequired: f.get('clearanceRequired') === 'on',
    };
    const j = await act(editing.id, () => patch(editing.id, body), 'Listing saved.');
    if (j) { setEditing(null); trackGA4Event('job_posting_edited', {}); }
  };
  const updateApplicant = async (jobId: string, a: Applicant, data: Partial<Pick<Applicant, 'status' | 'employerNote'>>) => {
    setApplicants((all) => ({ ...all, [jobId]: (all[jobId] || []).map((x) => (x.id === a.id ? { ...x, ...data } : x)) }));
    const res = await fetch(`/api/jobs/${jobId}/applicants`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ applicationId: a.id, ...data }) });
    if (!res.ok) setError('Could not save the applicant update'); else if (data.status) load();
  };

  const live = rows?.filter((r) => r.status === 'live' || r.status === 'featured') || [];
  const totals = rows ? rows.reduce((t, r) => ({ views: t.views + r.viewCount, clicks: t.clicks + r.applyClicks, applicants: t.applicants + r.applicantCount, fresh: t.fresh + r.newApplicantCount }), { views: 0, clicks: 0, applicants: 0, fresh: 0 }) : null;
  const expiringSoon = live.filter((r) => { const d = daysLeft(r.expiresAt); return d !== null && d <= 7; });

  return (
    <div className="space-y-4">
      {posted && <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/[0.06] p-4 text-sm text-emerald-200">Thanks — if the payment went through, the listing shows as Live below within a few seconds.</div>}
      {canceled && <div className="rounded-xl border border-amber-500/30 bg-amber-500/[0.06] p-4 text-sm text-amber-200">Checkout was cancelled. The draft is kept below — pay when you are ready.</div>}
      {draft && <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/[0.06] p-4 text-sm text-cyan-100">Draft saved. It is not on the board yet — edit it here and press Pay now when it is ready.</div>}
      {notice && <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/[0.06] p-4 text-sm text-cyan-100" role="status">{notice}</div>}
      {error && <div className="rounded-xl border border-red-500/30 bg-red-500/[0.06] p-4 text-sm text-red-200" role="alert">{error}</div>}

      {rows && rows.length > 0 && totals && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3" aria-label="Summary">
          {[[live.length, live.length === 1 ? 'live listing' : 'live listings'], [totals.views, 'views'], [totals.clicks, 'apply clicks'], [totals.applicants, totals.fresh ? `applicants · ${totals.fresh} new` : 'applicants']].map(([n, l]) => (
            <div key={String(l)} className="card p-4"><div className="text-2xl font-semibold text-white tabular-nums">{Number(n).toLocaleString()}</div><div className="text-xs text-slate-400">{l}</div></div>
          ))}
        </div>
      )}
      {expiringSoon.length > 0 && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/[0.06] p-4 text-sm text-amber-200">
          {expiringSoon.length === 1 ? `"${expiringSoon[0].title}" expires ${fmt(expiringSoon[0].expiresAt)}.` : `${expiringSoon.length} listings expire within a week.`} Renew from the listing once it expires, or upgrade a live listing to featured to add a fresh {FEATURED.days}-day window now.
        </div>
      )}

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
            const st = STATUS[p.status]; const isBusy = busy === p.id; const d = daysLeft(p.expiresAt);
            const canUpgrade = p.status === 'live';
            const list = applicants[p.id];
            return (
              <li key={p.id} id={`applicants-${p.id}`} className="card p-5 scroll-mt-24">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-baseline gap-2">
                      <Link href={`/space-talent/job/${p.id}`} className="text-white font-semibold hover:text-cyan-300">{p.title}</Link>
                      <span className={`text-xs font-medium ${st.tone}`}>{st.label}</span>
                    </div>
                    <div className="text-sm text-slate-400 mt-0.5">{p.company} · {p.location}{p.remoteOk ? ' · Remote OK' : ''}</div>
                    <div className="text-xs text-slate-500 mt-1">
                      {p.plan ? `${p.plan.name} · $${p.plan.priceUsd}` : '—'} · {p.status === 'unpaid' ? `created ${fmt(p.createdAt)}` : `expires ${fmt(p.expiresAt)}${d !== null && d >= 0 && p.status !== 'expired' ? ` (${d} day${d === 1 ? '' : 's'})` : ''}`}
                      {' · '}{p.applyMode === 'spacenexus' ? 'applications on SpaceNexus' : 'applications on your site'}
                    </div>
                  </div>
                  <div className="flex gap-5 text-right">
                    <div><div className="text-xl font-semibold text-white tabular-nums">{p.viewCount.toLocaleString()}</div><div className="text-[11px] text-slate-500">views</div></div>
                    <div><div className="text-xl font-semibold text-white tabular-nums">{p.applyClicks.toLocaleString()}</div><div className="text-[11px] text-slate-500">apply clicks</div></div>
                    {(p.applyMode === 'spacenexus' || p.applicantCount > 0) && (
                      <button type="button" onClick={() => (openApplicants === p.id ? setOpenApplicants(null) : showApplicants(p.id))} className="text-right hover:text-cyan-300" aria-expanded={openApplicants === p.id}>
                        <div className="text-xl font-semibold text-white tabular-nums">{p.applicantCount}{p.newApplicantCount > 0 && <span className="ml-1 align-middle rounded-full bg-cyan-500/20 text-cyan-200 text-[10px] px-1.5 py-0.5">{p.newApplicantCount} new</span>}</div>
                        <div className="text-[11px] text-slate-500 underline decoration-dotted">applicants</div>
                      </button>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 mt-4">
                  <button type="button" disabled={isBusy} onClick={() => startEdit(p)} className={btn}>{editing?.id === p.id ? 'Close editor' : 'Edit'}</button>
                  {(p.status === 'live' || p.status === 'featured' || p.status === 'paused') && (
                    <button type="button" disabled={isBusy} onClick={() => toggle(p)} className={btn}>{p.isActive ? 'Pause' : 'Resume'}</button>
                  )}
                  {p.status === 'unpaid' && (
                    <button type="button" disabled={isBusy} onClick={() => pay(p)} className="btn-primary min-h-[40px] px-4 rounded-lg text-sm font-semibold disabled:opacity-50">Pay now{p.plan ? ` — $${p.plan.priceUsd}` : ''}</button>
                  )}
                  {canUpgrade && (
                    <button type="button" disabled={isBusy} onClick={() => pay(p, FEATURED.id)} className="btn-primary min-h-[40px] px-4 rounded-lg text-sm font-semibold disabled:opacity-50" title={`Pin to the top of the board for ${FEATURED.days} days`}>Upgrade to featured — ${FEATURED.priceUsd}</button>
                  )}
                  {p.status === 'expired' && JOB_POSTING_PLANS.map((plan) => (
                    <button key={plan.id} type="button" disabled={isBusy} onClick={() => pay(p, plan.id)} className={`min-h-[40px] px-4 rounded-lg text-sm font-semibold disabled:opacity-50 ${plan.featured ? 'btn-primary' : 'border border-white/15 text-white hover:border-white/30'}`}>Renew as {plan.name.toLowerCase()} — ${plan.priceUsd}</button>
                  ))}
                  <button type="button" disabled={isBusy} onClick={() => duplicate(p)} className={btn}>Duplicate</button>
                  <button type="button" disabled={isBusy} onClick={() => remove(p)} className="ml-auto min-h-[40px] px-3 rounded-lg text-sm text-slate-400 hover:text-red-300 disabled:opacity-50">{p.paidAt ? 'Remove' : 'Delete draft'}</button>
                </div>

                {openApplicants === p.id && (
                  <div className="mt-5 border-t border-white/[0.06] pt-5">
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                      <h3 className="text-white font-semibold text-sm">Applicants{list ? ` (${list.length})` : ''}</h3>
                      {list && list.length > 0 && <a href={`/api/jobs/${p.id}/applicants?format=csv`} className="text-xs text-cyan-300 hover:underline">Download CSV</a>}
                    </div>
                    {!list && <div className="h-16 animate-pulse rounded-lg bg-white/[0.03]" />}
                    {list && list.length === 0 && <p className="text-sm text-slate-400">No applications yet. {p.applyMode === 'spacenexus' ? 'Candidates apply from the job page; each one lands here and in your inbox.' : 'This listing sends candidates to your own site — switch it to collect applications on SpaceNexus from Edit.'}</p>}
                    {list && list.length > 0 && (
                      <ul className="space-y-3">
                        {list.map((a) => (
                          <li key={a.id} className={`rounded-lg border p-4 ${a.status === 'new' ? 'border-cyan-500/30 bg-cyan-500/[0.03]' : 'border-white/[0.08]'}`}>
                            <div className="flex flex-wrap items-start justify-between gap-2">
                              <div className="min-w-0">
                                <div className="text-white font-medium">{a.name} <span className="text-xs text-slate-500 font-normal">· {fmt(a.createdAt)}</span></div>
                                <div className="text-sm text-slate-300 flex flex-wrap gap-x-3 gap-y-1 mt-0.5">
                                  <a href={`mailto:${a.email}`} className="text-cyan-300 hover:underline">{a.email}</a>
                                  {a.phone && <span>{a.phone}</span>}
                                  {a.linkedinUrl && <a href={a.linkedinUrl} target="_blank" rel="noopener noreferrer" className="hover:text-white underline decoration-dotted">LinkedIn / portfolio ↗</a>}
                                  {a.resumeUrl && <a href={a.resumeUrl} target="_blank" rel="noopener noreferrer" className="hover:text-white underline decoration-dotted">Résumé ↗</a>}
                                </div>
                              </div>
                              <select value={a.status} onChange={(e) => updateApplicant(p.id, a, { status: e.target.value as Applicant['status'] })} className="rounded-lg bg-white/[0.04] border border-white/10 px-2 py-1.5 text-xs text-white" aria-label={`Status for ${a.name}`}>
                                {APPLICANT_STATUS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                              </select>
                            </div>
                            {a.message && <p className="text-sm text-slate-300 whitespace-pre-wrap mt-2 border-l-2 border-white/10 pl-3">{a.message}</p>}
                            <textarea defaultValue={a.employerNote ?? ''} onBlur={(e) => { if (e.target.value !== (a.employerNote ?? '')) updateApplicant(p.id, a, { employerNote: e.target.value || null }); }} rows={1} maxLength={2000} placeholder="Private note (only your team sees this)" className={`${input} mt-2 text-xs`} aria-label={`Note about ${a.name}`} />
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}

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
                    <div className="md:col-span-2">
                      <div className="flex items-center justify-between"><label className={label}>Description — Markdown works: **bold**, - bullets, ## headings</label><button type="button" onClick={() => setPreviewText(previewText === null ? (document.querySelector<HTMLTextAreaElement>(`#desc-${p.id}`)?.value ?? '') : null)} className="text-xs text-cyan-300 hover:underline mb-1">{previewText === null ? 'Preview' : 'Hide preview'}</button></div>
                      <textarea id={`desc-${p.id}`} name="description" required minLength={80} maxLength={12000} rows={10} defaultValue={p.description ?? ''} className={`${input} font-mono text-[13px]`} onChange={(e) => { if (previewText !== null) setPreviewText(e.target.value); }} />
                      {previewText !== null && <div className="mt-3 rounded-lg border border-cyan-500/30 bg-black/40 p-4"><div className="text-[11px] uppercase tracking-wide text-cyan-300 mb-2">Preview</div><JobDescription markdown={previewText} compact /></div>}
                    </div>
                    <fieldset className="md:col-span-2">
                      <legend className={label}>How candidates apply</legend>
                      <div className="flex flex-wrap gap-4 text-sm text-slate-300">
                        <label className="inline-flex items-center gap-2"><input type="radio" name="applyModeRadio" checked={editMode === 'link'} onChange={() => setEditMode('link')} className="accent-cyan-500" /> On your careers page</label>
                        <label className="inline-flex items-center gap-2"><input type="radio" name="applyModeRadio" checked={editMode === 'spacenexus'} onChange={() => setEditMode('spacenexus')} className="accent-cyan-500" /> Collect applications on SpaceNexus</label>
                      </div>
                    </fieldset>
                    {editMode === 'link' && <div><label className={label}>Application link</label><input name="applyUrl" type="url" required defaultValue={p.sourceUrl ?? ''} className={input} /></div>}
                    <div><label className={label}>Hiring contact email{editMode === 'spacenexus' ? ' (applications go here)' : ''}</label><input name="contactEmail" type="email" required defaultValue={p.contactEmail ?? ''} className={input} /></div>
                    <div className="md:col-span-2 flex items-center gap-3">
                      <button type="submit" disabled={isBusy} className="btn-primary min-h-[44px] px-5 rounded-lg text-sm font-semibold disabled:opacity-50">Save changes</button>
                      <button type="button" onClick={() => setEditing(null)} className="text-sm text-slate-400 hover:text-white">Cancel</button>
                      <span className="text-xs text-slate-500">Changes are live on the board immediately. Plan and featured window change through Upgrade or Renew.</span>
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
