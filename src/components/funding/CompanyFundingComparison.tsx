'use client';

import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import Link from 'next/link';

// ────────────────────────────────────────
// Types
// ────────────────────────────────────────

interface FundingRound {
  id: string;
  date: string;
  amount: number | null;
  seriesLabel: string | null;
  roundType: string | null;
  leadInvestor: string | null;
  investors: string[];
  postValuation: number | null;
  company: {
    id: string;
    name: string;
    slug: string;
    sector: string | null;
    tier: number;
    logoUrl: string | null;
    headquarters: string | null;
    isPublic: boolean;
  };
}

interface CompanyFundingSummary {
  slug: string;
  name: string;
  sector: string | null;
  totalRaised: number;
  roundCount: number;
  lastRound: FundingRound | null;
  highestValuation: number | null;
  rounds: FundingRound[];
}

interface CompanyFundingComparisonProps {
  /** All funding rounds already loaded on the parent page */
  allRounds: FundingRound[];
}

// ────────────────────────────────────────
// Constants
// ────────────────────────────────────────

const COMPANY_COLORS = [
  { bg: 'bg-cyan-500/20', text: 'text-cyan-400', border: 'border-cyan-500/40', bar: 'bg-cyan-500' },
  { bg: 'bg-emerald-500/20', text: 'text-emerald-400', border: 'border-emerald-500/40', bar: 'bg-emerald-500' },
  { bg: 'bg-purple-500/20', text: 'text-purple-400', border: 'border-purple-500/40', bar: 'bg-purple-500' },
  { bg: 'bg-amber-500/20', text: 'text-amber-400', border: 'border-amber-500/40', bar: 'bg-amber-500' },
  { bg: 'bg-pink-500/20', text: 'text-pink-400', border: 'border-pink-500/40', bar: 'bg-pink-500' },
];

// ────────────────────────────────────────
// Helpers
// ────────────────────────────────────────

function formatAmount(value: number): string {
  if (value >= 1e9) return `$${(value / 1e9).toFixed(1)}B`;
  if (value >= 1e6) return `$${(value / 1e6).toFixed(0)}M`;
  if (value >= 1e3) return `$${(value / 1e3).toFixed(0)}K`;
  return `$${value.toFixed(0)}`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
  });
}

// ────────────────────────────────────────
// Main Component
// ────────────────────────────────────────

export default function CompanyFundingComparison({ allRounds }: CompanyFundingComparisonProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedSlugs, setSelectedSlugs] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Build unique company list from all rounds
  const availableCompanies = useMemo(() => {
    const map = new Map<string, { slug: string; name: string; sector: string | null }>();
    for (const round of allRounds) {
      if (!map.has(round.company.slug)) {
        map.set(round.company.slug, {
          slug: round.company.slug,
          name: round.company.name,
          sector: round.company.sector,
        });
      }
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [allRounds]);

  // Filter dropdown results
  const filteredCompanies = useMemo(() => {
    if (!searchQuery.trim()) return availableCompanies.slice(0, 20);
    const q = searchQuery.toLowerCase();
    return availableCompanies
      .filter((c) => c.name.toLowerCase().includes(q))
      .slice(0, 20);
  }, [availableCompanies, searchQuery]);

  // Build comparison data
  const comparisonData = useMemo((): CompanyFundingSummary[] => {
    return selectedSlugs.map((slug) => {
      const rounds = allRounds
        .filter((r) => r.company.slug === slug)
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      const totalRaised = rounds.reduce((sum, r) => sum + (r.amount || 0), 0);
      const lastRound = rounds.length > 0 ? rounds[rounds.length - 1] : null;
      const highestValuation = rounds.reduce(
        (max, r) => (r.postValuation && r.postValuation > (max || 0) ? r.postValuation : max),
        null as number | null
      );

      return {
        slug,
        name: rounds[0]?.company.name || slug,
        sector: rounds[0]?.company.sector || null,
        totalRaised,
        roundCount: rounds.length,
        lastRound,
        highestValuation,
        rounds,
      };
    });
  }, [selectedSlugs, allRounds]);

  // Max total for bar scaling
  const maxTotal = useMemo(() => {
    return Math.max(...comparisonData.map((c) => c.totalRaised), 1);
  }, [comparisonData]);

  const toggleCompany = useCallback(
    (slug: string) => {
      setSelectedSlugs((prev) => {
        if (prev.includes(slug)) {
          return prev.filter((s) => s !== slug);
        }
        if (prev.length >= 5) return prev; // Max 5
        return [...prev, slug];
      });
      setSearchQuery('');
      setShowDropdown(false);
    },
    []
  );

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="mb-8">
      {/* Collapsible Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-3 mb-4 group cursor-pointer w-full text-left"
      >
        <span className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center text-sm flex-shrink-0">
          {'$'}
        </span>
        <h3 className="text-lg font-semibold text-white group-hover:text-green-400 transition-colors">
          Compare Company Funding
        </h3>
        <svg
          className={`w-5 h-5 text-slate-400 transition-transform duration-200 ${
            isExpanded ? 'rotate-180' : ''
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {isExpanded && (
        <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6 animate-in fade-in duration-300">
          {/* Company Selector */}
          <div className="mb-6">
            <label className="block text-slate-400 text-xs mb-2">
              Select 2-5 companies to compare ({selectedSlugs.length}/5 selected)
            </label>

            {/* Selected chips */}
            <div className="flex flex-wrap gap-2 mb-3">
              {selectedSlugs.map((slug, i) => {
                const company = availableCompanies.find((c) => c.slug === slug);
                const colorSet = COMPANY_COLORS[i % COMPANY_COLORS.length];
                return (
                  <span
                    key={slug}
                    className={`text-xs px-3 py-1.5 rounded-lg border flex items-center gap-2 ${colorSet.bg} ${colorSet.text} ${colorSet.border}`}
                  >
                    {company?.name || slug}
                    <button
                      onClick={() => toggleCompany(slug)}
                      className="hover:opacity-70 transition-opacity"
                    >
                      x
                    </button>
                  </span>
                );
              })}
            </div>

            {/* Search/Add dropdown */}
            {selectedSlugs.length < 5 && (
              <div className="relative" ref={dropdownRef}>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setShowDropdown(true);
                  }}
                  onFocus={() => setShowDropdown(true)}
                  placeholder="Search and add a company..."
                  className="bg-slate-900 border border-slate-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-green-500 w-full max-w-md"
                />
                {showDropdown && filteredCompanies.length > 0 && (
                  <div className="absolute top-full left-0 mt-1 w-full max-w-md bg-slate-900 border border-slate-700 rounded-lg shadow-xl z-30 max-h-60 overflow-y-auto">
                    {filteredCompanies
                      .filter((c) => !selectedSlugs.includes(c.slug))
                      .map((company) => (
                        <button
                          key={company.slug}
                          onClick={() => toggleCompany(company.slug)}
                          className="w-full text-left px-3 py-2 text-sm text-slate-300 hover:bg-slate-800 hover:text-white transition-colors flex items-center justify-between"
                        >
                          <span>{company.name}</span>
                          {company.sector && (
                            <span className="text-xs text-slate-500 capitalize">
                              {company.sector}
                            </span>
                          )}
                        </button>
                      ))}
                    {filteredCompanies.filter((c) => !selectedSlugs.includes(c.slug)).length === 0 && (
                      <div className="px-3 py-2 text-sm text-slate-500">
                        No matching companies
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Comparison Content */}
          {comparisonData.length >= 2 ? (
            <div className="space-y-6">
              {/* Summary Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-slate-500 border-b border-slate-700/50">
                      <th className="pb-2 font-medium">Company</th>
                      <th className="pb-2 font-medium text-right">Total Raised</th>
                      <th className="pb-2 font-medium text-right">Rounds</th>
                      <th className="pb-2 font-medium">Last Round</th>
                      <th className="pb-2 font-medium text-right">Valuation</th>
                    </tr>
                  </thead>
                  <tbody>
                    {comparisonData.map((company, i) => {
                      const colorSet = COMPANY_COLORS[i % COMPANY_COLORS.length];
                      return (
                        <tr key={company.slug} className="border-b border-slate-800/50">
                          <td className="py-3">
                            <div className="flex items-center gap-2">
                              <div className={`w-3 h-3 rounded-full ${colorSet.bar}`} />
                              <Link
                                href={`/company-profiles/${company.slug}`}
                                className={`font-medium hover:text-cyan-400 transition-colors ${colorSet.text}`}
                              >
                                {company.name}
                              </Link>
                              {company.sector && (
                                <span className="text-xs text-slate-500 capitalize">
                                  {company.sector}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 text-right font-mono font-semibold text-green-400">
                            {company.totalRaised > 0
                              ? formatAmount(company.totalRaised)
                              : '--'}
                          </td>
                          <td className="py-3 text-right text-slate-300">
                            {company.roundCount}
                          </td>
                          <td className="py-3 text-slate-300">
                            {company.lastRound ? (
                              <span>
                                {company.lastRound.seriesLabel || company.lastRound.roundType || 'Unknown'}{' '}
                                <span className="text-slate-500 text-xs">
                                  ({formatDate(company.lastRound.date)})
                                </span>
                              </span>
                            ) : (
                              '--'
                            )}
                          </td>
                          <td className="py-3 text-right text-purple-400 font-mono">
                            {company.highestValuation
                              ? formatAmount(company.highestValuation)
                              : '--'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Visual funding bar comparison */}
              <div>
                <h4 className="text-sm font-semibold text-slate-400 mb-3">
                  Total Funding Comparison
                </h4>
                <div className="space-y-2">
                  {comparisonData.map((company, i) => {
                    const colorSet = COMPANY_COLORS[i % COMPANY_COLORS.length];
                    const widthPct =
                      maxTotal > 0 ? (company.totalRaised / maxTotal) * 100 : 0;
                    return (
                      <div key={company.slug} className="flex items-center gap-3">
                        <span className={`text-xs font-medium w-32 truncate ${colorSet.text}`}>
                          {company.name}
                        </span>
                        <div className="flex-1 bg-slate-700/30 rounded-full h-4">
                          <div
                            className={`${colorSet.bar} h-4 rounded-full transition-all duration-500 flex items-center justify-end pr-2`}
                            style={{ width: `${Math.max(widthPct, 3)}%` }}
                          >
                            {widthPct > 15 && (
                              <span className="text-[10px] text-white font-semibold">
                                {formatAmount(company.totalRaised)}
                              </span>
                            )}
                          </div>
                        </div>
                        {widthPct <= 15 && (
                          <span className="text-xs text-slate-400 font-mono">
                            {company.totalRaised > 0
                              ? formatAmount(company.totalRaised)
                              : '--'}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Side-by-side round history */}
              <div>
                <h4 className="text-sm font-semibold text-slate-400 mb-3">
                  Round History Comparison
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {comparisonData.map((company, i) => {
                    const colorSet = COMPANY_COLORS[i % COMPANY_COLORS.length];
                    return (
                      <div
                        key={company.slug}
                        className={`bg-slate-900/50 rounded-lg border p-4 ${colorSet.border}`}
                      >
                        <h5 className={`font-semibold text-sm mb-3 ${colorSet.text}`}>
                          {company.name}
                        </h5>
                        {company.rounds.length === 0 ? (
                          <p className="text-slate-500 text-xs">No rounds recorded</p>
                        ) : (
                          <div className="space-y-2">
                            {company.rounds.map((round) => (
                              <div
                                key={round.id}
                                className="flex items-center justify-between text-xs"
                              >
                                <div>
                                  <span className="text-slate-300">
                                    {round.seriesLabel || round.roundType || 'Round'}
                                  </span>
                                  <span className="text-slate-500 ml-1.5">
                                    {formatDate(round.date)}
                                  </span>
                                </div>
                                <span className="text-green-400 font-mono font-semibold">
                                  {round.amount ? formatAmount(round.amount) : '--'}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-slate-400 text-sm">
                {selectedSlugs.length === 0
                  ? 'Select at least 2 companies above to start comparing.'
                  : 'Select at least 1 more company to compare.'}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
