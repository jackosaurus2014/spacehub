'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import AnimatedPageHeader from '@/components/ui/AnimatedPageHeader';
import ScrollReveal, { StaggerContainer, StaggerItem } from '@/components/ui/ScrollReveal';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import PullToRefresh from '@/components/ui/PullToRefresh';
import EmptyState from '@/components/ui/EmptyState';
import RelatedModules from '@/components/ui/RelatedModules';
import NewsletterSignup from '@/components/NewsletterSignup';
import { clientLogger } from '@/lib/client-logger';
import { extractApiError } from '@/lib/errors';
import { formatMoney, formatRelativeTime } from '@/lib/format-number';
import { getRelatedModules } from '@/lib/module-relationships';
import {
  RECENT_IPOS,
  IPO_PIPELINE,
  FOUNDER_TOOLKIT,
  STARTUP_HUB_ASOF,
  type IPOPipelineConfidence,
} from '@/lib/startup-hub-data';

// ────────────────────────────────────────
// Types
// ────────────────────────────────────────

interface WatchlistCompany {
  slug: string;
  name: string;
  sector: string | null;
  valuation: number | null;
  totalFunding: number | null;
  lastFundingRound: string | null;
  lastFundingDate: string | null;
  employeeRange: string | null;
  headquarters: string | null;
  country: string | null;
  logoUrl: string | null;
  _count: { jobPostings: number };
}

interface RecentRound {
  id: string;
  date: string;
  amount: number | null;
  seriesLabel: string | null;
  roundType: string | null;
  leadInvestor: string | null;
  investors: string[];
  postValuation: number | null;
  sourceUrl: string | null;
  company: { slug: string; name: string; sector: string | null };
}

interface HiringEntry {
  slug: string;
  name: string;
  count: number;
}

interface Stats {
  privateCompanies: number;
  trackedFundingUSD: number;
  roundsLast18mo: number;
  openRolesAtPrivate: number;
}

interface StartupHubData {
  watchlist: WatchlistCompany[];
  recentRounds: RecentRound[];
  hiring: HiringEntry[];
  stats: Stats;
}

type SortField = 'valuation' | 'totalFunding' | 'openRoles';

// ────────────────────────────────────────
// Helpers
// ────────────────────────────────────────

function fmtMoney(value: number | null | undefined): string {
  const formatted = formatMoney(value ?? undefined);
  return formatted || '—';
}

function fmtDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

const CONFIDENCE_STYLES: Record<IPOPipelineConfidence, { chip: string; label: string }> = {
  reported: { chip: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30', label: 'Reported' },
  'company-stated': { chip: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30', label: 'Company-stated' },
  speculative: { chip: 'bg-amber-500/15 text-amber-300 border-amber-500/30', label: 'Speculative' },
};

const SORT_OPTIONS: { value: SortField; label: string }[] = [
  { value: 'valuation', label: 'Sort: Valuation' },
  { value: 'totalFunding', label: 'Sort: Total Raised' },
  { value: 'openRoles', label: 'Sort: Open Roles' },
];

const RELATED_MODULES = getRelatedModules('startups');

// ────────────────────────────────────────
// Page
// ────────────────────────────────────────

export default function StartupHubPage() {
  const [data, setData] = useState<StartupHubData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortField, setSortField] = useState<SortField>('valuation');

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const res = await fetch('/api/startups');
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(extractApiError(json, 'Failed to load startup hub data'));
      }
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load startup hub data');
      clientLogger.error('Operation failed', { error: err instanceof Error ? err.message : String(err) });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const sortedWatchlist = useMemo(() => {
    const list = data?.watchlist ? [...data.watchlist] : [];
    return list.sort((a, b) => {
      if (sortField === 'valuation') return (b.valuation || 0) - (a.valuation || 0);
      if (sortField === 'totalFunding') return (b.totalFunding || 0) - (a.totalFunding || 0);
      return (b._count?.jobPostings || 0) - (a._count?.jobPostings || 0);
    });
  }, [data, sortField]);

  if (loading && !data) {
    return (
      <div className="min-h-screen bg-black text-white p-6">
        <div className="max-w-7xl mx-auto">
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  const stats = data?.stats;

  return (
    <PullToRefresh onRefresh={async () => { await fetchData(); }}>
      <div className="min-h-screen bg-black">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* ── Hero ── */}
          <AnimatedPageHeader
            title="Startup & Pre-IPO Intelligence"
            subtitle="The private space company watchlist, funding activity, and IPO pipeline — built for investors tracking the next public listing and job seekers targeting a private-market winner."
            accentColor="cyan"
          />

          {error && (
            <div className="card p-5 border border-red-500/20 bg-red-500/5 text-center mb-6">
              <div className="text-red-400 text-sm font-medium">{error}</div>
            </div>
          )}

          {stats && (
            <ScrollReveal>
              <StaggerContainer className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
                <StaggerItem>
                  <div className="bg-white/[0.04] rounded-xl border border-white/[0.06] p-5 text-center">
                    <div className="text-2xl md:text-3xl font-bold text-cyan-400">
                      {stats.privateCompanies.toLocaleString()}
                    </div>
                    <div className="text-slate-400 text-xs uppercase tracking-widest mt-1">
                      Private Companies Tracked
                    </div>
                  </div>
                </StaggerItem>
                <StaggerItem>
                  <div className="bg-white/[0.04] rounded-xl border border-white/[0.06] p-5 text-center">
                    <div className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
                      {fmtMoney(stats.trackedFundingUSD)}
                    </div>
                    <div className="text-slate-400 text-xs uppercase tracking-widest mt-1">
                      Tracked Funding
                    </div>
                  </div>
                </StaggerItem>
                <StaggerItem>
                  <div className="bg-white/[0.04] rounded-xl border border-white/[0.06] p-5 text-center">
                    <div className="text-2xl md:text-3xl font-bold text-purple-400">
                      {stats.roundsLast18mo.toLocaleString()}
                    </div>
                    <div className="text-slate-400 text-xs uppercase tracking-widest mt-1">
                      Rounds — Last 18 Months
                    </div>
                  </div>
                </StaggerItem>
                <StaggerItem>
                  <div className="bg-white/[0.04] rounded-xl border border-white/[0.06] p-5 text-center">
                    <div className="text-2xl md:text-3xl font-bold text-amber-400">
                      {stats.openRolesAtPrivate.toLocaleString()}
                    </div>
                    <div className="text-slate-400 text-xs uppercase tracking-widest mt-1">
                      Open Roles at Private Cos.
                    </div>
                  </div>
                </StaggerItem>
              </StaggerContainer>
            </ScrollReveal>
          )}

          {/* ── Pre-IPO Watchlist ── */}
          <section className="mb-12" aria-labelledby="watchlist-heading">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <h1 id="watchlist-heading" className="text-lg font-semibold text-white">
                Pre-IPO Watchlist
              </h1>
              <label className="flex items-center gap-2 text-xs text-slate-400">
                <span className="sr-only">Sort watchlist</span>
                <select
                  aria-label="Sort pre-IPO watchlist"
                  value={sortField}
                  onChange={(e) => setSortField(e.target.value as SortField)}
                  className="bg-white/[0.06] border border-white/[0.08] text-white rounded-lg px-3 py-2 h-10 text-sm focus:ring-2 focus:ring-cyan-400/40 focus:border-cyan-400/30 outline-none"
                >
                  {SORT_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </label>
            </div>

            {sortedWatchlist.length === 0 ? (
              <EmptyState
                icon={<span className="text-4xl">🚀</span>}
                title="No private companies on the watchlist yet"
                description="Check back soon as new pre-IPO profiles are added to the tracker."
              />
            ) : (
              <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {sortedWatchlist.map((company) => (
                  <StaggerItem key={company.slug}>
                    <Link
                      href={`/company-profiles/${company.slug}`}
                      className="card p-5 h-full flex flex-col gap-3 hover:border-cyan-500/30 transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-400/40 block"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-semibold text-white truncate">{company.name}</h3>
                        {company._count.jobPostings > 0 && (
                          <span className="flex-shrink-0 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            {company._count.jobPostings} open role{company._count.jobPostings === 1 ? '' : 's'}
                          </span>
                        )}
                      </div>

                      {company.sector && (
                        <span className="w-fit text-xs px-2 py-0.5 rounded-full bg-white/[0.04] text-slate-300 border border-white/[0.06] capitalize">
                          {company.sector}
                        </span>
                      )}

                      <div className="grid grid-cols-2 gap-2">
                        <div className="bg-white/[0.04] rounded-lg p-2">
                          <div className="text-[10px] text-slate-500 uppercase tracking-wider">Valuation</div>
                          <div className="text-sm font-semibold text-purple-400">{fmtMoney(company.valuation)}</div>
                        </div>
                        <div className="bg-white/[0.04] rounded-lg p-2">
                          <div className="text-[10px] text-slate-500 uppercase tracking-wider">Total Raised</div>
                          <div className="text-sm font-semibold text-emerald-400">{fmtMoney(company.totalFunding)}</div>
                        </div>
                      </div>

                      <div className="text-xs text-slate-500">
                        {company.lastFundingRound ? (
                          <span>
                            Last round: <span className="text-slate-300">{company.lastFundingRound}</span>
                            {company.lastFundingDate ? ` · ${formatRelativeTime(company.lastFundingDate)}` : ''}
                          </span>
                        ) : (
                          <span>No funding rounds on record</span>
                        )}
                      </div>

                      <div className="mt-auto pt-2 border-t border-white/[0.06] flex items-center justify-between text-xs text-slate-500">
                        <span className="truncate">{company.headquarters || company.country || '—'}</span>
                        {company.employeeRange && <span className="flex-shrink-0">{company.employeeRange} employees</span>}
                      </div>
                    </Link>
                  </StaggerItem>
                ))}
              </StaggerContainer>
            )}
          </section>

          {/* ── Recent Funding Rounds ── */}
          <section className="mb-12" aria-labelledby="rounds-heading">
            <h2 id="rounds-heading" className="text-lg font-semibold text-white mb-4">
              Recent Funding Rounds
            </h2>
            {(data?.recentRounds?.length ?? 0) === 0 ? (
              <EmptyState
                icon={<span className="text-4xl">💰</span>}
                title="No funding rounds in the last 18 months"
                description="Check the full Funding Tracker for historical deal activity."
                suggestions={[{ label: 'Open Funding Tracker', href: '/funding-tracker' }]}
              />
            ) : (
              <div className="space-y-2">
                {data!.recentRounds.map((round) => (
                  <div
                    key={round.id}
                    className="card p-4 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4"
                  >
                    <div className="text-xs text-slate-500 sm:w-28 flex-shrink-0">{fmtDate(round.date)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Link
                          href={`/company-profiles/${round.company.slug}`}
                          className="text-white font-semibold hover:text-cyan-300 transition-colors"
                        >
                          {round.company.name}
                        </Link>
                        {round.seriesLabel && (
                          <span className="text-xs px-2 py-0.5 rounded border bg-white/[0.04] text-slate-300 border-white/[0.1]">
                            {round.seriesLabel}
                          </span>
                        )}
                        {round.sourceUrl && (
                          <a
                            href={round.sourceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label={`Source for ${round.company.name} funding round`}
                            className="text-slate-500 hover:text-cyan-300 transition-colors"
                          >
                            <svg className="w-3.5 h-3.5 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                          </a>
                        )}
                      </div>
                      {round.leadInvestor && (
                        <div className="text-slate-500 text-xs mt-0.5">
                          Led by{' '}
                          <Link
                            href={`/investors?search=${encodeURIComponent(round.leadInvestor)}`}
                            className="text-cyan-400 hover:text-cyan-300 transition-colors"
                          >
                            {round.leadInvestor}
                          </Link>
                        </div>
                      )}
                    </div>
                    <div className="text-right sm:w-32 flex-shrink-0">
                      <div className="text-emerald-400 font-mono font-bold text-sm">
                        {round.amount ? fmtMoney(round.amount) : 'Undisclosed'}
                      </div>
                      {round.postValuation && (
                        <div className="text-slate-500 text-xs">@ {fmtMoney(round.postValuation)} val</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="mt-4 text-center">
              <Link
                href="/funding-tracker"
                className="inline-flex items-center gap-1 text-sm text-cyan-400 hover:text-cyan-300 transition-colors"
              >
                View full Funding Tracker →
              </Link>
            </div>
          </section>

          {/* ── IPO Watch ── */}
          <section className="mb-12" aria-labelledby="ipo-watch-heading">
            <h2 id="ipo-watch-heading" className="text-lg font-semibold text-white mb-1">
              IPO Watch
            </h2>
            <p className="text-slate-500 text-xs mb-4">
              Status reflects public reporting as of {STARTUP_HUB_ASOF}; not investment advice. Once a company lists,
              track its live price on the{' '}
              <Link href="/space-stocks" className="text-cyan-400 hover:text-cyan-300">Space Stocks hub</Link>.
            </p>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Recent IPOs */}
              <ScrollReveal>
                <div className="card p-6">
                  <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4">Recent IPOs</h3>
                  <ul className="space-y-4">
                    {RECENT_IPOS.map((ipo) => (
                      <li key={ipo.ticker} className="border-b border-white/[0.06] last:border-0 pb-4 last:pb-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          {ipo.profileSlug ? (
                            <Link href={`/company-profiles/${ipo.profileSlug}`} className="text-white font-semibold hover:text-cyan-300 transition-colors">
                              {ipo.company}
                            </Link>
                          ) : (
                            <span className="text-white font-semibold">{ipo.company}</span>
                          )}
                          <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                            {ipo.ticker} · {ipo.exchange}
                          </span>
                        </div>
                        <div className="text-xs text-slate-400">
                          {fmtDate(ipo.ipoDate)} · Raised {ipo.raised}
                        </div>
                        <p className="text-xs text-slate-500 mt-1">{ipo.notes}</p>
                        <a
                          href={ipo.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[11px] text-slate-500 hover:text-cyan-300 transition-colors inline-flex items-center gap-1 mt-1"
                        >
                          Source
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              </ScrollReveal>

              {/* IPO Pipeline */}
              <ScrollReveal>
                <div className="card p-6">
                  <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4">IPO Pipeline</h3>
                  <ul className="space-y-4">
                    {IPO_PIPELINE.map((entry) => {
                      const style = CONFIDENCE_STYLES[entry.confidence];
                      return (
                        <li key={entry.company} className="border-b border-white/[0.06] last:border-0 pb-4 last:pb-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            {entry.profileSlug ? (
                              <Link href={`/company-profiles/${entry.profileSlug}`} className="text-white font-semibold hover:text-cyan-300 transition-colors">
                                {entry.company}
                              </Link>
                            ) : (
                              <span className="text-white font-semibold">{entry.company}</span>
                            )}
                            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded border ${style.chip}`}>
                              {style.label}
                            </span>
                          </div>
                          <div className="text-xs text-slate-400">{entry.status}</div>
                          <p className="text-xs text-slate-500 mt-1">{entry.detail}</p>
                          <a
                            href={entry.sourceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[11px] text-slate-500 hover:text-cyan-300 transition-colors inline-flex items-center gap-1 mt-1"
                          >
                            Source
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                          </a>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </ScrollReveal>
            </div>
          </section>

          {/* ── Who's Hiring ── */}
          <section className="mb-12" aria-labelledby="hiring-heading">
            <h2 id="hiring-heading" className="text-lg font-semibold text-white mb-4">
              Who&apos;s Hiring
            </h2>
            {(data?.hiring?.length ?? 0) === 0 ? (
              <EmptyState
                icon={<span className="text-4xl">👥</span>}
                title="No active job postings from private companies right now"
                description="Check the full jobs board for all open roles across the industry."
                suggestions={[{ label: 'Open Jobs Board', href: '/space-talent?tab=jobs' }]}
              />
            ) : (
              <div className="card p-4 sm:p-6">
                <ul className="space-y-3">
                  {data!.hiring.map((h, i) => {
                    const maxCount = data!.hiring[0]?.count || 1;
                    const widthPct = maxCount > 0 ? (h.count / maxCount) * 100 : 0;
                    return (
                      <li key={h.slug} className="flex items-center gap-3">
                        <span className="text-xs font-bold text-slate-500 w-5 text-right flex-shrink-0">{i + 1}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <Link href={`/company-profiles/${h.slug}`} className="text-white text-sm font-medium hover:text-cyan-300 transition-colors truncate">
                              {h.name}
                            </Link>
                            <span className="text-xs text-slate-400 flex-shrink-0">{h.count} open role{h.count === 1 ? '' : 's'}</span>
                          </div>
                          <div className="w-full bg-white/[0.03] rounded-full h-2">
                            <div
                              className="bg-gradient-to-r from-cyan-500 to-emerald-400 h-2 rounded-full transition-all duration-500"
                              style={{ width: `${Math.max(widthPct, 3)}%` }}
                            />
                          </div>
                        </div>
                        <Link
                          href={`/company-profiles/${h.slug}`}
                          className="text-xs text-cyan-300 hover:text-cyan-200 transition-colors flex-shrink-0"
                        >
                          View roles &rarr;
                        </Link>
                      </li>
                    );
                  })}
                </ul>
                <p className="text-[11px] text-slate-500 mt-4">
                  Counts mirror each company&apos;s own careers page (Greenhouse/Lever/Ashby), synced daily. Large employers often list the same role in multiple locations.
                </p>
              </div>
            )}
          </section>

          {/* ── Founder Toolkit ── */}
          <section className="mb-12" aria-labelledby="toolkit-heading">
            <h2 id="toolkit-heading" className="text-lg font-semibold text-white mb-4">
              Founder Toolkit
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {FOUNDER_TOOLKIT.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="card p-4 hover:border-cyan-500/30 transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-400/40 block"
                >
                  <h3 className="text-sm font-semibold text-white mb-1">{link.title}</h3>
                  <p className="text-xs text-slate-500">{link.description}</p>
                </Link>
              ))}
            </div>
          </section>

          {RELATED_MODULES.length > 0 && <RelatedModules modules={RELATED_MODULES} />}

          <ScrollReveal>
            <div className="mt-10">
              <NewsletterSignup variant="cta" source="startups-hub" />
            </div>
          </ScrollReveal>
        </div>
      </div>
    </PullToRefresh>
  );
}
