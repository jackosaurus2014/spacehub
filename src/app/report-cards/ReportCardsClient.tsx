'use client';

// Client island for /report-cards — filters, sorting and the expandable card
// grid. The h1, deck, provenance line and view switch are server-rendered by
// page.tsx (which also handles ?view=score, so useSearchParams is gone and
// the island server-renders instead of bailing to a Suspense skeleton).
// REPORT_CARDS itself lives in ./shared.ts so both halves read the same data
// — no fetch, no initial-props seeding needed.

import { useState, useMemo } from 'react';
import Link from 'next/link';
import ScrollReveal from '@/components/ui/ScrollReveal';
import {
  REPORT_CARDS,
  SECTORS,
  GRADE_RANGES,
  OUTLOOK_OPTIONS,
  SORT_OPTIONS,
  GRADE_NUMERIC,
  computeSummaryStats,
  parseRevenue,
  gradeLetterMatch,
  getGradeColor,
  getGradeBg,
  getGradeRingColor,
  getOutlookIcon,
  getOutlookColor,
  getOutlookBg,
  getSectorIcon,
  type GradeRange,
  type Sector,
  type Outlook,
  type SortKey,
} from './shared';

export default function ReportCardsClient() {
  const [gradeFilter, setGradeFilter] = useState<GradeRange>('');
  const [sectorFilter, setSectorFilter] = useState<Sector | ''>('');
  const [outlookFilter, setOutlookFilter] = useState<Outlook | ''>('');
  const [sortBy, setSortBy] = useState<SortKey>('grade');
  const [expandedCard, setExpandedCard] = useState<string | null>(null);

  const filteredAndSorted = useMemo(() => {
    let result = [...REPORT_CARDS];

    if (gradeFilter) {
      result = result.filter(c => gradeLetterMatch(c.grade, gradeFilter));
    }
    if (sectorFilter) {
      result = result.filter(c => c.sector === sectorFilter);
    }
    if (outlookFilter) {
      result = result.filter(c => c.outlook === outlookFilter);
    }

    switch (sortBy) {
      case 'grade':
        result.sort((a, b) => GRADE_NUMERIC[b.grade] - GRADE_NUMERIC[a.grade]);
        break;
      case 'revenue':
        result.sort((a, b) => parseRevenue(b.metrics.revenue) - parseRevenue(a.metrics.revenue));
        break;
      case 'company':
        result.sort((a, b) => a.company.localeCompare(b.company));
        break;
    }

    return result;
  }, [gradeFilter, sectorFilter, outlookFilter, sortBy]);

  const stats = useMemo(() => computeSummaryStats(REPORT_CARDS), []);

  const toggleCard = (company: string) => {
    setExpandedCard(prev => prev === company ? null : company);
  };

  return (
    <>

        {/* ── Summary Stats ────────────────────────────────────────────── */}
        <ScrollReveal>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="card p-4">
              <div className="text-xs text-slate-400 uppercase tracking-wider mb-1">Average Grade</div>
              <div className={`text-3xl font-bold ${getGradeColor(stats.averageGrade)}`}>
                {stats.averageGrade}
              </div>
              <div className="text-xs text-slate-500 mt-1">Across {REPORT_CARDS.length} companies</div>
            </div>

            <div className="card p-4">
              <div className="text-xs text-slate-400 uppercase tracking-wider mb-1">Grade Distribution</div>
              <div className="flex items-end gap-1 h-10 mt-1">
                {Object.entries(stats.distribution).map(([letter, count]) => (
                  <div key={letter} className="flex flex-col items-center flex-1">
                    <div
                      className={`w-full rounded-sm ${
                        letter === 'A' ? 'bg-emerald-500' :
                        letter === 'B' ? 'bg-white' :
                        letter === 'C' ? 'bg-amber-500' :
                        letter === 'D' ? 'bg-orange-500' :
                        'bg-red-500'
                      }`}
                      style={{ height: `${Math.max((count / REPORT_CARDS.length) * 40, 4)}px` }}
                    />
                    <span className="text-[10px] text-slate-500 mt-1">{letter}:{count}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="card p-4">
              <div className="text-xs text-slate-400 uppercase tracking-wider mb-1">Outlook Sentiment</div>
              <div className="flex items-center gap-3 mt-2">
                <div className="flex items-center gap-1">
                  <span className="text-emerald-400 text-sm">▲</span>
                  <span className="text-sm font-semibold text-white/90">{stats.outlookCounts.bullish}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-amber-400 text-sm">◆</span>
                  <span className="text-sm font-semibold text-white/90">{stats.outlookCounts.neutral}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-red-400 text-sm">▼</span>
                  <span className="text-sm font-semibold text-white/90">{stats.outlookCounts.bearish}</span>
                </div>
              </div>
              <div className="text-xs text-slate-500 mt-1">Bullish / Neutral / Bearish</div>
            </div>

            <div className="card p-4">
              <div className="text-xs text-slate-400 uppercase tracking-wider mb-1">Sector Leader</div>
              {stats.sectorLeaders[0] && (
                <>
                  <div className="text-lg font-bold text-white">{stats.sectorLeaders[0].company}</div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-sm font-bold ${getGradeColor(stats.sectorLeaders[0].grade)}`}>
                      {stats.sectorLeaders[0].grade}
                    </span>
                    <span className="text-xs text-slate-500">{stats.sectorLeaders[0].sector}</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </ScrollReveal>

        {/* ── Sector Leaders Strip ──────────────────────────────────────── */}
        <ScrollReveal delay={0.1}>
          <div className="card p-4 mb-8">
            <div className="text-xs text-slate-400 uppercase tracking-wider mb-3">Sector Leaders</div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
              {stats.sectorLeaders.map(leader => (
                <div key={leader.sector} className="flex items-center gap-2 p-2 rounded-lg bg-white/[0.04]">
                  <span className="text-lg">{getSectorIcon(leader.sector)}</span>
                  <div className="min-w-0">
                    <div className="text-xs text-slate-400 truncate">{leader.sector}</div>
                    <div className="text-sm font-semibold text-white truncate">{leader.company}</div>
                    <span className={`text-xs font-bold ${getGradeColor(leader.grade)}`}>{leader.grade}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </ScrollReveal>

        {/* ── Filters & Sort ───────────────────────────────────────────── */}
        <ScrollReveal delay={0.15}>
          <div className="flex flex-wrap items-center gap-3 mb-6">
            <select
              value={gradeFilter}
              onChange={e => setGradeFilter(e.target.value as GradeRange)}
              className="bg-white/[0.06] border border-white/[0.08] text-white/90 text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-white/20"
            >
              {GRADE_RANGES.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>

            <select
              value={sectorFilter}
              onChange={e => setSectorFilter(e.target.value as Sector | '')}
              className="bg-white/[0.06] border border-white/[0.08] text-white/90 text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-white/20"
            >
              <option value="">All Sectors</option>
              {SECTORS.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>

            <select
              value={outlookFilter}
              onChange={e => setOutlookFilter(e.target.value as Outlook | '')}
              className="bg-white/[0.06] border border-white/[0.08] text-white/90 text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-white/20"
            >
              {OUTLOOK_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>

            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as SortKey)}
              className="bg-white/[0.06] border border-white/[0.08] text-white/90 text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-white/20"
            >
              {SORT_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>

            <span className="text-sm text-slate-400 ml-auto">
              {filteredAndSorted.length} of {REPORT_CARDS.length} companies
            </span>
          </div>
        </ScrollReveal>

        {/* ── Report Cards Grid ────────────────────────────────────────── */}
        <div className="space-y-4">
          {filteredAndSorted.map((card, idx) => {
            const isExpanded = expandedCard === card.company;

            return (
              <ScrollReveal key={card.company} delay={Math.min(idx * 0.05, 0.4)}>
                <div className={`card overflow-hidden transition-all duration-300 ${
                  isExpanded ? 'ring-2 ' + getGradeRingColor(card.grade) : ''
                }`}>
                  {/* ── Collapsed Header Row ──────────────────────────────── */}
                  <button
                    onClick={() => toggleCard(card.company)}
                    className="w-full text-left p-4 sm:p-5 flex items-center gap-4 hover:bg-white/[0.03] transition-colors"
                    aria-expanded={isExpanded}
                    aria-controls={`card-${card.company.replace(/\s+/g, '-')}`}
                  >
                    {/* Grade Badge */}
                    <div className={`flex-shrink-0 w-14 h-14 sm:w-16 sm:h-16 rounded-xl border-2 flex items-center justify-center ${getGradeBg(card.grade)}`}>
                      <span className={`text-2xl sm:text-3xl font-black ${getGradeColor(card.grade)}`}>
                        {card.grade}
                      </span>
                    </div>

                    {/* Company Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {card.profileSlug ? (
                          <Link
                            href={`/company-profiles/${card.profileSlug}`}
                            onClick={(e) => e.stopPropagation()}
                            className="text-lg sm:text-xl font-bold text-white truncate hover:text-cyan-400 underline-offset-2 hover:underline transition-colors"
                          >
                            {card.company}
                          </Link>
                        ) : (
                          <h3 className="text-lg sm:text-xl font-bold text-white truncate">{card.company}</h3>
                        )}
                        <span className="text-xs text-slate-500 font-mono">{card.ticker}</span>
                        {card.profileSlug && (
                          <Link
                            href={`/company-profiles/${card.profileSlug}?tab=jobs`}
                            onClick={(e) => e.stopPropagation()}
                            className="text-xs text-slate-500 hover:text-cyan-400 underline-offset-2 hover:underline transition-colors"
                          >
                            View jobs
                          </Link>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1 flex-wrap">
                        <span className="text-xs text-slate-400 flex items-center gap-1">
                          {getSectorIcon(card.sector)} {card.sector}
                        </span>
                        <span className="text-xs text-slate-500">{card.quarterAssessed}</span>
                        <span className={`text-xs font-semibold flex items-center gap-1 ${getOutlookColor(card.outlook)}`}>
                          {getOutlookIcon(card.outlook)} {card.outlook.charAt(0).toUpperCase() + card.outlook.slice(1)}
                        </span>
                      </div>
                    </div>

                    {/* Quick Metrics (hidden on small screens) */}
                    <div className="hidden md:flex items-center gap-6">
                      <div className="text-right">
                        <div className="text-xs text-slate-500">Revenue</div>
                        <div className="text-sm font-semibold text-white/90">{card.metrics.revenue}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-slate-500">Backlog</div>
                        <div className="text-sm font-semibold text-white/90">{card.metrics.backlog}</div>
                      </div>
                    </div>

                    {/* Expand Arrow */}
                    <div className="flex-shrink-0 text-slate-500">
                      <svg
                        className={`w-5 h-5 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}
                        fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </button>

                  {/* ── Expanded Details ────────────────────────────────────── */}
                  {isExpanded && (
                    <div
                      id={`card-${card.company.replace(/\s+/g, '-')}`}
                      className="border-t border-white/[0.06] p-4 sm:p-5 space-y-5"
                    >
                      {/* Metrics Grid */}
                      <div>
                        <h4 className="text-xs text-slate-400 uppercase tracking-wider mb-3">Key Metrics</h4>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          <div className="bg-white/[0.04] rounded-lg p-3">
                            <div className="text-xs text-slate-500 mb-1">Revenue</div>
                            <div className="text-lg font-bold text-white">{card.metrics.revenue}</div>
                          </div>
                          <div className="bg-white/[0.04] rounded-lg p-3">
                            <div className="text-xs text-slate-500 mb-1">Order Backlog</div>
                            <div className="text-lg font-bold text-white">{card.metrics.backlog}</div>
                          </div>
                          <div className="bg-white/[0.04] rounded-lg p-3">
                            <div className="text-xs text-slate-500 mb-1">Launches (2025)</div>
                            <div className="text-lg font-bold text-white">{card.metrics.launches}</div>
                          </div>
                          <div className="bg-white/[0.04] rounded-lg p-3">
                            <div className="text-xs text-slate-500 mb-1">Employees</div>
                            <div className="text-lg font-bold text-white">{card.metrics.employees}</div>
                          </div>
                        </div>
                      </div>

                      {/* Strengths & Weaknesses */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <h4 className="text-xs text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                            <span className="text-emerald-400">+</span> Strengths
                          </h4>
                          <ul className="space-y-2">
                            {card.strengths.map((s, i) => (
                              <li key={i} className="flex items-start gap-2 text-sm text-white/70">
                                <span className="text-emerald-400 mt-0.5 flex-shrink-0">&#10003;</span>
                                <span>{s}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <h4 className="text-xs text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                            <span className="text-red-400">-</span> Weaknesses
                          </h4>
                          <ul className="space-y-2">
                            {card.weaknesses.map((w, i) => (
                              <li key={i} className="flex items-start gap-2 text-sm text-white/70">
                                <span className="text-red-400 mt-0.5 flex-shrink-0">&#10007;</span>
                                <span>{w}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      {/* Outlook Badge */}
                      <div>
                        <h4 className="text-xs text-slate-400 uppercase tracking-wider mb-2">Outlook</h4>
                        <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold ${getOutlookColor(card.outlook)} ${getOutlookBg(card.outlook)}`}>
                          {getOutlookIcon(card.outlook)} {card.outlook.charAt(0).toUpperCase() + card.outlook.slice(1)} Outlook
                        </span>
                      </div>

                      {/* Analyst Summary */}
                      <div>
                        <h4 className="text-xs text-slate-400 uppercase tracking-wider mb-2">Analyst Summary</h4>
                        <p className="text-sm text-white/70 leading-relaxed bg-white/[0.03] rounded-lg p-4 border-l-4 border-white/15">
                          {card.summary}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </ScrollReveal>
            );
          })}

          {filteredAndSorted.length === 0 && (
            <div className="card p-12 text-center">
              <div className="text-4xl mb-3">🔍</div>
              <div className="text-lg text-white/70">No companies match the selected filters.</div>
              <button
                onClick={() => { setGradeFilter(''); setSectorFilter(''); setOutlookFilter(''); }}
                className="mt-4 px-4 py-2 text-sm bg-white hover:bg-slate-100 text-slate-900 rounded-lg transition-colors"
              >
                Clear Filters
              </button>
            </div>
          )}
        </div>

        {/* ── Methodology Note ─────────────────────────────────────────── */}
        <ScrollReveal delay={0.2}>
          <div className="card p-5 mt-8">
            <h3 className="text-lg font-bold text-white mb-3">Methodology</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-slate-400">
              <div>
                <h4 className="text-white/70 font-semibold mb-1">Grading Criteria</h4>
                <ul className="space-y-1">
                  <li><span className="text-emerald-400 font-bold">A Range</span> &mdash; Industry leaders with strong execution, growth, and market position</li>
                  <li><span className="text-white/70 font-bold">B Range</span> &mdash; Solid performers with clear competitive advantages and growth trajectory</li>
                  <li><span className="text-amber-400 font-bold">C Range</span> &mdash; Mixed results with notable challenges alongside some strengths</li>
                  <li><span className="text-orange-400 font-bold">D Range</span> &mdash; Significant concerns around execution, viability, or market fit</li>
                  <li><span className="text-red-400 font-bold">F</span> &mdash; Fundamental business model or survival risk</li>
                </ul>
              </div>
              <div>
                <h4 className="text-white/70 font-semibold mb-1">Assessment Factors</h4>
                <ul className="space-y-1">
                  <li>Financial performance (revenue growth, margins, cash flow)</li>
                  <li>Technical execution (mission success, development milestones)</li>
                  <li>Competitive positioning and market share</li>
                  <li>Strategic clarity and management quality</li>
                  <li>Order backlog and revenue visibility</li>
                  <li>Risk factors (regulatory, financial, technical)</li>
                </ul>
                <p className="mt-2 text-xs text-slate-500">
                  Assessments are updated quarterly and reflect publicly available information.
                  Grades are editorial opinions and should not be construed as investment advice.
                </p>
              </div>
            </div>
          </div>
        </ScrollReveal>

        {/* ── Related Links ────────────────────────────────────────────── */}
        <ScrollReveal delay={0.25}>
          <div className="mt-8 mb-4">
            <h3 className="text-sm text-slate-400 uppercase tracking-wider mb-3">Related Pages</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              <Link
                href="/company-profiles"
                className="card p-4 hover:border-white/10 transition-colors group text-center"
              >
                <div className="text-2xl mb-1">🏢</div>
                <div className="text-sm font-semibold text-white/90 group-hover:text-white transition-colors">Company Profiles</div>
                <div className="text-xs text-slate-500">Detailed company intelligence</div>
              </Link>

              <Link
                href="/report-cards?view=score"
                className="card p-4 hover:border-white/10 transition-colors group text-center"
              >
                <div className="text-2xl mb-1">🏆</div>
                <div className="text-sm font-semibold text-white/90 group-hover:text-white transition-colors">Space Score</div>
                <div className="text-xs text-slate-500">Quantitative scoring system</div>
              </Link>

              <Link
                href="/space-stocks"
                className="card p-4 hover:border-white/10 transition-colors group text-center"
              >
                <div className="text-2xl mb-1">📈</div>
                <div className="text-sm font-semibold text-white/90 group-hover:text-white transition-colors">Space Stocks</div>
                <div className="text-xs text-slate-500">Live public-market prices</div>
              </Link>

              <Link
                href="/funding-tracker"
                className="card p-4 hover:border-white/10 transition-colors group text-center"
              >
                <div className="text-2xl mb-1">💰</div>
                <div className="text-sm font-semibold text-white/90 group-hover:text-white transition-colors">Funding Tracker</div>
                <div className="text-xs text-slate-500">Funding rounds and deals</div>
              </Link>

              <Link
                href="/reports"
                className="card p-4 hover:border-white/10 transition-colors group text-center"
              >
                <div className="text-2xl mb-1">📑</div>
                <div className="text-sm font-semibold text-white/90 group-hover:text-white transition-colors">Industry Reports</div>
                <div className="text-xs text-slate-500">In-depth quarterly &amp; annual reports</div>
              </Link>
            </div>
          </div>
        </ScrollReveal>

    </>
  );
}
