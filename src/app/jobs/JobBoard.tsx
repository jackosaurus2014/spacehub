'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { JOB_CATEGORIES } from '@/types';
import { formatBand, type SalaryBand } from '@/lib/salary-estimate';
import { readSavedJobs, SAVED_JOBS_EVENT } from '@/lib/saved-jobs';
import { trackGA4Event } from '@/lib/analytics';
import SaveJobButton from '@/components/jobs/SaveJobButton';

/**
 * The job board on /jobs (2026-09-10). Search, filters, sort and paging are
 * URL-addressable so every combination is a shareable, indexable page; the
 * data comes from /api/jobs/search with a salary band on every row.
 */
interface Row {
  id: string; title: string; company: string; location: string; remoteOk: boolean; category: string;
  specialization: string | null; seniorityLevel: string; employmentType: string | null;
  clearanceRequired: boolean; postedDate: string; source: string | null;
  companyProfile: { slug: string; logoUrl: string | null } | null;
  salaryBand: SalaryBand | null;
  featured?: boolean;
}
interface SearchResponse {
  total: number; offset: number; limit: number; jobs: Row[];
  facets: { categories: { value: string; count: number }[]; levels: { value: string; count: number }[]; companies: { value: string; count: number }[]; remote: number };
}

const LEVEL_LABELS: Record<string, string> = { entry: 'Entry', mid: 'Mid', senior: 'Senior', lead: 'Lead', director: 'Director', vp: 'VP', c_suite: 'C-suite' };
const POSTED = [{ v: '', l: 'Any time' }, { v: '1', l: 'Today' }, { v: '7', l: 'Last 7 days' }, { v: '30', l: 'Last 30 days' }];
const LIMIT = 20;

function ago(iso: string): string {
  const d = Math.floor((Date.now() - Date.parse(iso)) / 86_400_000);
  return d <= 0 ? 'today' : d === 1 ? 'yesterday' : d < 30 ? `${d}d ago` : d < 365 ? `${Math.floor(d / 30)}mo ago` : 'over a year ago';
}

export default function JobBoard({ initialTotal }: { initialTotal?: number }) {
  const router = useRouter(); const pathname = usePathname(); const sp = useSearchParams();
  const { status: sessionStatus } = useSession();
  const q = sp.get('q') || ''; const category = sp.get('category') || ''; const level = sp.get('level') || '';
  const remote = sp.get('remote') === '1'; const company = sp.get('company') || ''; const location = sp.get('location') || '';
  const posted = sp.get('posted') || ''; const noClearance = sp.get('clearance') === '0'; const sort = sp.get('sort') || 'newest';
  const page = Math.max(1, parseInt(sp.get('page') || '1', 10) || 1);

  const [data, setData] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [qInput, setQInput] = useState(q); const [locInput, setLocInput] = useState(location);
  const [savedCount, setSavedCount] = useState(0);
  const [searchSaved, setSearchSaved] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const reqRef = useRef(0);

  useEffect(() => { setQInput(q); }, [q]);
  useEffect(() => { setLocInput(location); }, [location]);
  useEffect(() => {
    const sync = () => setSavedCount(readSavedJobs().length);
    sync(); window.addEventListener(SAVED_JOBS_EVENT, sync); return () => window.removeEventListener(SAVED_JOBS_EVENT, sync);
  }, []);

  const setParams = useCallback((patch: Record<string, string | null>, resetPage = true) => {
    const next = new URLSearchParams(sp.toString());
    for (const [k, v] of Object.entries(patch)) { if (v === null || v === '') next.delete(k); else next.set(k, v); }
    if (resetPage) next.delete('page');
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}#board` : `${pathname}#board`, { scroll: false });
  }, [router, pathname, sp]);

  const apiQuery = useMemo(() => {
    const p = new URLSearchParams();
    if (q) p.set('q', q); if (category) p.set('category', category); if (level) p.set('level', level);
    if (remote) p.set('remote', '1'); if (company) p.set('company', company); if (location) p.set('location', location);
    if (posted) p.set('posted', posted); if (noClearance) p.set('clearance', '0'); if (sort !== 'newest') p.set('sort', sort);
    p.set('limit', String(LIMIT)); p.set('offset', String((page - 1) * LIMIT));
    return p.toString();
  }, [q, category, level, remote, company, location, posted, noClearance, sort, page]);

  useEffect(() => {
    const id = ++reqRef.current;
    setLoading(true); setError(null);
    fetch(`/api/jobs/search?${apiQuery}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((j: SearchResponse) => { if (reqRef.current === id) { setData(j); setLoading(false); } })
      .catch((e) => { if (reqRef.current === id) { setError(e.message); setLoading(false); } });
    trackGA4Event('job_search', { q, category, level, remote: remote ? 1 : 0, page });
  }, [apiQuery]); // eslint-disable-line react-hooks/exhaustive-deps

  const activeFilters = [q && `“${q}”`, category && JOB_CATEGORIES.find((c) => c.value === category)?.label, level && level.split(',').map((l) => LEVEL_LABELS[l] || l).join('/'), remote && 'Remote', company, location, posted && POSTED.find((p) => p.v === posted)?.l, noClearance && 'No clearance'].filter(Boolean) as string[];
  const total = data?.total ?? initialTotal ?? 0;
  const pages = Math.max(1, Math.ceil(total / LIMIT));

  const saveSearch = async () => {
    if (sessionStatus !== 'authenticated') { router.push(`/login?callbackUrl=${encodeURIComponent(`${pathname}?${sp.toString()}`)}`); return; }
    setSearchSaved('saving');
    try {
      const name = activeFilters.length ? activeFilters.join(' · ') : 'All space jobs';
      const res = await fetch('/api/saved-searches', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: name.slice(0, 80), query: q, searchType: 'space_jobs', alertEnabled: true, filters: { category, seniorityLevel: level.split(',')[0] || '', remoteOk: remote, company, location, notifyVia: 'email' } }) });
      setSearchSaved(res.ok ? 'saved' : 'error');
      if (res.ok) trackGA4Event('job_search_saved', { filters: activeFilters.length });
    } catch { setSearchSaved('error'); }
  };

  return (
    <section id="board" aria-labelledby="board-heading" className="scroll-mt-24">
      <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
        <div>
          <h2 id="board-heading" className="text-xl font-semibold text-white">Search {total.toLocaleString()} open roles</h2>
          <p className="text-sm text-slate-400">Every listing carries a salary band — the employer&apos;s range when posted, otherwise a SpaceNexus estimate.</p>
        </div>
        <div className="flex flex-wrap items-center gap-x-4">
          <Link href="/jobs/companies" className="text-sm text-slate-300 hover:text-white min-h-[44px] inline-flex items-center whitespace-nowrap">Companies hiring</Link>
          <Link href="/hire#post-a-job" className="text-sm text-slate-300 hover:text-white min-h-[44px] inline-flex items-center whitespace-nowrap">Hiring? Post a job</Link>
          <Link href="/jobs/saved" className="text-sm text-cyan-300 hover:underline min-h-[44px] inline-flex items-center whitespace-nowrap">Saved jobs{savedCount ? ` (${savedCount})` : ''} →</Link>
        </div>
      </div>

      <form onSubmit={(e) => { e.preventDefault(); setParams({ q: qInput.trim(), location: locInput.trim() }); }} className="card p-4 mb-4" role="search" aria-label="Search jobs">
        <div className="grid grid-cols-1 md:grid-cols-[1fr_220px_auto] gap-3">
          <input value={qInput} onChange={(e) => setQInput(e.target.value)} placeholder="Title, company or skill — e.g. propulsion, SpaceX, GNC" aria-label="Search by title, company or skill" className="w-full rounded-lg bg-white/[0.04] border border-white/10 px-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-cyan-500/50 focus:outline-none" />
          <input value={locInput} onChange={(e) => setLocInput(e.target.value)} placeholder="Location — city, state, or Remote" aria-label="Location" className="w-full rounded-lg bg-white/[0.04] border border-white/10 px-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-cyan-500/50 focus:outline-none" />
          <button type="submit" className="btn-primary px-5 py-2.5 text-sm font-semibold rounded-lg min-h-[44px]">Search</button>
        </div>
        <div className="flex flex-wrap items-center gap-2 mt-3">
          <select value={category} onChange={(e) => setParams({ category: e.target.value })} aria-label="Category" className="rounded-lg bg-white/[0.04] border border-white/10 px-2.5 py-2 text-sm text-slate-200">
            <option value="">All categories</option>
            {JOB_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}{data ? ` (${data.facets.categories.find((f) => f.value === c.value)?.count ?? 0})` : ''}</option>)}
          </select>
          <select value={level} onChange={(e) => setParams({ level: e.target.value })} aria-label="Seniority" className="rounded-lg bg-white/[0.04] border border-white/10 px-2.5 py-2 text-sm text-slate-200">
            <option value="">Any level</option>
            {Object.entries(LEVEL_LABELS).map(([v, l]) => <option key={v} value={v}>{l}{data ? ` (${data.facets.levels.find((f) => f.value === v)?.count ?? 0})` : ''}</option>)}
          </select>
          <select value={company} onChange={(e) => setParams({ company: e.target.value })} aria-label="Company" className="rounded-lg bg-white/[0.04] border border-white/10 px-2.5 py-2 text-sm text-slate-200 max-w-[220px]">
            <option value="">All companies</option>
            {(data?.facets.companies ?? []).map((c) => <option key={c.value} value={c.value}>{c.value} ({c.count})</option>)}
            {company && !(data?.facets.companies ?? []).some((c) => c.value === company) && <option value={company}>{company}</option>}
          </select>
          <select value={posted} onChange={(e) => setParams({ posted: e.target.value })} aria-label="Posted within" className="rounded-lg bg-white/[0.04] border border-white/10 px-2.5 py-2 text-sm text-slate-200">
            {POSTED.map((p) => <option key={p.v} value={p.v}>{p.l}</option>)}
          </select>
          <label className="inline-flex items-center gap-2 text-sm text-slate-300 px-2 py-2 min-h-[44px]"><input type="checkbox" checked={remote} onChange={(e) => setParams({ remote: e.target.checked ? '1' : null })} className="accent-cyan-500" /> Remote OK{data ? ` (${data.facets.remote})` : ''}</label>
          <label className="inline-flex items-center gap-2 text-sm text-slate-300 px-2 py-2 min-h-[44px]"><input type="checkbox" checked={noClearance} onChange={(e) => setParams({ clearance: e.target.checked ? '0' : null })} className="accent-cyan-500" /> No clearance required</label>
          <select value={sort} onChange={(e) => setParams({ sort: e.target.value }, false)} aria-label="Sort" className="ml-auto rounded-lg bg-white/[0.04] border border-white/10 px-2.5 py-2 text-sm text-slate-200">
            <option value="newest">Newest first</option><option value="company">Company A–Z</option><option value="title">Title A–Z</option>
          </select>
        </div>
        {activeFilters.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 mt-3 text-xs">
            <span className="text-slate-500">Filters:</span>
            {activeFilters.map((f) => <span key={f} className="px-2 py-1 rounded-full bg-white/[0.06] text-slate-200">{f}</span>)}
            <button type="button" onClick={() => router.replace(`${pathname}#board`, { scroll: false })} className="text-slate-400 hover:text-white underline underline-offset-2 min-h-[36px] px-2">Clear all</button>
            <button type="button" onClick={saveSearch} disabled={searchSaved === 'saving'} className="ml-auto text-cyan-300 hover:text-cyan-200 min-h-[36px] px-2">
              {searchSaved === 'saved' ? 'Search saved — we’ll email new matches' : searchSaved === 'error' ? 'Could not save — try again' : sessionStatus === 'authenticated' ? 'Save this search & get new matches by email' : 'Sign in to save this search'}
            </button>
          </div>
        )}
      </form>

      {error && <p className="text-sm text-red-400 mb-3">Search is unavailable right now ({error}). The <Link href="/space-talent?tab=jobs" className="underline">Talent Hub board</Link> still works.</p>}

      <ul className="space-y-2" aria-busy={loading} aria-live="polite">
        {(data?.jobs ?? []).map((job) => (
          <li key={job.id} className={`card p-4 hover:border-white/20 transition-colors ${job.featured ? 'border-amber-400/40 bg-amber-400/[0.03]' : ''}`}>
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 shrink-0 rounded-lg bg-white/[0.06] flex items-center justify-center overflow-hidden">
                {job.companyProfile?.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={job.companyProfile.logoUrl} alt="" className="w-full h-full object-contain" loading="lazy" />
                ) : <span className="text-slate-400 text-sm font-semibold">{job.company.slice(0, 1)}</span>}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-baseline gap-x-2">
                  {job.featured && <span className="text-[10px] uppercase tracking-wide text-amber-300 font-semibold">Featured</span>}
                  <Link href={`/space-talent/job/${job.id}`} className="text-white font-medium hover:text-cyan-300">{job.title}</Link>
                </div>
                <div className="text-sm text-slate-400 mt-0.5">
                  {job.companyProfile ? <Link href={`/company-profiles/${job.companyProfile.slug}`} className="hover:text-white">{job.company}</Link> : job.company}
                  <span className="mx-1.5">·</span>{job.location}{job.remoteOk && <span className="ml-1.5 text-emerald-300">· Remote OK</span>}
                </div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-xs text-slate-400">
                  {job.salaryBand ? (
                    <span className={job.salaryBand.source === 'posting' ? 'text-emerald-300' : 'text-slate-300'} title={job.salaryBand.source === 'estimate' ? `SpaceNexus estimate based on ${job.salaryBand.basis} benchmarks, adjusted for level and location` : 'Range stated in the posting'}>
                      {formatBand(job.salaryBand)}{job.salaryBand.source === 'estimate' ? ' est.' : ''}
                    </span>
                  ) : <span className="text-slate-500">Salary not stated</span>}
                  <span>{LEVEL_LABELS[job.seniorityLevel] || job.seniorityLevel}</span>
                  {job.employmentType && <span>{job.employmentType}</span>}
                  {job.clearanceRequired && <span className="text-amber-300/80">Clearance</span>}
                  <span>{ago(job.postedDate)}</span>
                </div>
              </div>
              <SaveJobButton job={{ id: job.id, title: job.title, company: job.company, location: job.location }} />
            </div>
          </li>
        ))}
        {!loading && data && data.jobs.length === 0 && (
          <li className="card p-6 text-center text-slate-400 text-sm">No roles match. <button type="button" onClick={() => router.replace(`${pathname}#board`, { scroll: false })} className="text-cyan-300 underline underline-offset-2">Clear the filters</button> or save this search and we&apos;ll email you when one appears.</li>
        )}
        {loading && !data && Array.from({ length: 6 }).map((_, i) => <li key={i} className="card p-4 h-[88px] animate-pulse" />)}
      </ul>

      {pages > 1 && (
        <nav className="flex items-center justify-between mt-4 text-sm" aria-label="Pagination">
          <button type="button" disabled={page <= 1} onClick={() => setParams({ page: String(page - 1) }, false)} className="min-h-[44px] px-3 rounded-lg border border-white/10 text-slate-200 disabled:opacity-40">← Previous</button>
          <span className="text-slate-400">Page {page} of {pages}</span>
          <button type="button" disabled={page >= pages} onClick={() => setParams({ page: String(page + 1) }, false)} className="min-h-[44px] px-3 rounded-lg border border-white/10 text-slate-200 disabled:opacity-40">Next →</button>
        </nav>
      )}
      <p className="text-xs text-slate-500 mt-4">Listings are pulled daily from employers&apos; own applicant-tracking systems and link to the original posting. Salary estimates come from the SpaceNexus compensation dataset (65 roles, {new Date().getUTCFullYear()}) adjusted for seniority and metro; they are guidance, not an offer.</p>
    </section>
  );
}
