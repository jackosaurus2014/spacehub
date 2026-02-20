'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import AnimatedPageHeader from '@/components/ui/AnimatedPageHeader';
import ScrollReveal, { StaggerContainer, StaggerItem } from '@/components/ui/ScrollReveal';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

// ────────────────────────────────────────
// Types
// ────────────────────────────────────────

interface Investor {
  id: string;
  name: string;
  type: string;
  description: string | null;
  website: string | null;
  headquarters: string | null;
  foundedYear: number | null;
  aum: number | null;
  fundSize: number | null;
  investmentStage: string[];
  sectorFocus: string[];
  portfolioCount: number | null;
  notableDeals: string[];
  status: string;
  // Computed fields from API
  totalInvested: number;
  dealCount: number;
}

// ────────────────────────────────────────
// Constants
// ────────────────────────────────────────

const TYPE_OPTIONS = [
  { value: '', label: 'All Types' },
  { value: 'vc', label: 'Venture Capital' },
  { value: 'pe', label: 'Private Equity' },
  { value: 'corporate', label: 'Corporate VC' },
  { value: 'government', label: 'Government' },
  { value: 'accelerator', label: 'Accelerator' },
  { value: 'angel', label: 'Angel' },
  { value: 'family_office', label: 'Family Office' },
];

const TYPE_BADGE_COLORS: Record<string, string> = {
  vc: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  pe: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  corporate: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  government: 'bg-red-500/20 text-red-400 border-red-500/30',
  accelerator: 'bg-green-500/20 text-green-400 border-green-500/30',
  angel: 'bg-pink-500/20 text-pink-400 border-pink-500/30',
  family_office: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30',
};

const TYPE_LABELS: Record<string, string> = {
  vc: 'Venture Capital',
  pe: 'Private Equity',
  corporate: 'Corporate VC',
  government: 'Government',
  accelerator: 'Accelerator',
  angel: 'Angel',
  family_office: 'Family Office',
};

const STAGE_LABELS: Record<string, string> = {
  pre_seed: 'Pre-Seed',
  seed: 'Seed',
  series_a: 'Series A',
  series_b: 'Series B',
  growth: 'Growth',
  late_stage: 'Late Stage',
};

const SECTOR_LABELS: Record<string, string> = {
  launch: 'Launch',
  satellite: 'Satellite',
  earth_observation: 'Earth Observation',
  defense: 'Defense',
  in_space: 'In-Space',
  ground_segment: 'Ground Segment',
};

// ────────────────────────────────────────
// Helpers
// ────────────────────────────────────────

function formatAUM(value: number): string {
  if (value >= 1000000000000) return `$${(value / 1000000000000).toFixed(1)}T`;
  if (value >= 1000000000) return `$${(value / 1000000000).toFixed(1)}B`;
  if (value >= 1000000) return `$${(value / 1000000).toFixed(0)}M`;
  return `$${value.toLocaleString()}`;
}

// ────────────────────────────────────────
// Main Page Component
// ────────────────────────────────────────

export default function InvestorsPage() {
  const [investors, setInvestors] = useState<Investor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState('');
  const [sectorFilter, setSectorFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    async function fetchInvestors() {
      try {
        const params = new URLSearchParams();
        if (typeFilter) params.set('type', typeFilter);
        if (sectorFilter) params.set('sectorFocus', sectorFilter);
        params.set('limit', '200');

        const res = await fetch(`/api/investors?${params.toString()}`);
        if (!res.ok) throw new Error('Failed to fetch investors');
        const data = await res.json();
        setInvestors(data.investors || []);
      } catch (err) {
        setError('Failed to load investor data');
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchInvestors();
  }, [typeFilter, sectorFilter]);

  // Client-side search filter
  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return investors;
    const q = searchQuery.toLowerCase();
    return investors.filter(
      (inv) =>
        inv.name.toLowerCase().includes(q) ||
        (inv.headquarters && inv.headquarters.toLowerCase().includes(q)) ||
        inv.notableDeals.some((d) => d.toLowerCase().includes(q))
    );
  }, [investors, searchQuery]);

  // Summary stats
  const totalAUM = useMemo(
    () => investors.reduce((sum, inv) => sum + (inv.aum || 0), 0),
    [investors]
  );
  const totalDeals = useMemo(
    () => investors.reduce((sum, inv) => sum + inv.dealCount, 0),
    [investors]
  );
  const vcCount = useMemo(
    () => investors.filter((inv) => inv.type === 'vc').length,
    [investors]
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B0F1A] text-white p-6">
        <div className="max-w-7xl mx-auto">
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AnimatedPageHeader
          title="Space Industry Investors"
          subtitle="Directory of venture capital, private equity, corporate, and government investors active in the space economy"
          icon="🏦"
          accentColor="cyan"
        />

        {error && (
          <div className="card p-5 border border-red-500/20 bg-red-500/5 text-center mb-6">
            <div className="text-red-400 text-sm font-medium">{error}</div>
          </div>
        )}

        {/* Stats Bar */}
        <StaggerContainer className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StaggerItem>
            <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-5 text-center">
              <div className="text-2xl md:text-3xl font-bold text-cyan-400">
                {investors.length}
              </div>
              <div className="text-slate-400 text-xs uppercase tracking-widest mt-1">
                Investors Tracked
              </div>
            </div>
          </StaggerItem>
          <StaggerItem>
            <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-5 text-center">
              <div className="text-2xl md:text-3xl font-bold text-green-400">
                {totalAUM > 0 ? formatAUM(totalAUM) : '--'}
              </div>
              <div className="text-slate-400 text-xs uppercase tracking-widest mt-1">
                Combined AUM
              </div>
            </div>
          </StaggerItem>
          <StaggerItem>
            <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-5 text-center">
              <div className="text-2xl md:text-3xl font-bold text-purple-400">
                {vcCount}
              </div>
              <div className="text-slate-400 text-xs uppercase tracking-widest mt-1">
                VC Firms
              </div>
            </div>
          </StaggerItem>
          <StaggerItem>
            <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-5 text-center">
              <div className="text-2xl md:text-3xl font-bold text-amber-400">
                {totalDeals}
              </div>
              <div className="text-slate-400 text-xs uppercase tracking-widest mt-1">
                Total Deals
              </div>
            </div>
          </StaggerItem>
        </StaggerContainer>

        {/* Filters */}
        <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-4 mb-6">
          <div className="flex flex-wrap gap-4 items-end">
            <div>
              <label className="block text-slate-400 text-xs mb-1">
                Investor Type
              </label>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="bg-slate-900 border border-slate-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-cyan-500"
              >
                {TYPE_OPTIONS.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-slate-400 text-xs mb-1">
                Sector Focus
              </label>
              <select
                value={sectorFilter}
                onChange={(e) => setSectorFilter(e.target.value)}
                className="bg-slate-900 border border-slate-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-cyan-500"
              >
                <option value="">All Sectors</option>
                <option value="launch">Launch</option>
                <option value="satellite">Satellite</option>
                <option value="earth_observation">Earth Observation</option>
                <option value="defense">Defense</option>
                <option value="in_space">In-Space</option>
                <option value="ground_segment">Ground Segment</option>
              </select>
            </div>
            <div>
              <label className="block text-slate-400 text-xs mb-1">
                Search
              </label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, location, portfolio..."
                className="bg-slate-900 border border-slate-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-cyan-500 w-64"
              />
            </div>
            <span className="text-slate-500 text-sm pb-2">
              Showing {filtered.length} of {investors.length} investors
            </span>
          </div>
        </div>

        {/* Investor Cards Grid */}
        {filtered.length === 0 ? (
          <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-8 text-center">
            <p className="text-slate-400">
              No investors match your filters.
            </p>
          </div>
        ) : (
          <StaggerContainer className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
            {filtered.map((inv) => {
              const isExpanded = expandedId === inv.id;
              return (
                <StaggerItem key={inv.id}>
                  <div
                    className={`bg-slate-800/50 rounded-xl border transition-colors p-5 ${
                      isExpanded
                        ? 'border-cyan-500/40'
                        : 'border-slate-700/50 hover:border-cyan-500/20'
                    }`}
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <h4 className="text-white font-semibold">
                            {inv.name}
                          </h4>
                          <span
                            className={`text-xs px-2 py-0.5 rounded border ${
                              TYPE_BADGE_COLORS[inv.type] ||
                              'bg-slate-700/50 text-slate-300 border-slate-600'
                            }`}
                          >
                            {TYPE_LABELS[inv.type] || inv.type}
                          </span>
                        </div>
                        {inv.headquarters && (
                          <div className="text-slate-500 text-xs">
                            {inv.headquarters}
                            {inv.foundedYear
                              ? ` -- Est. ${inv.foundedYear}`
                              : ''}
                          </div>
                        )}
                      </div>
                      <div className="text-right ml-3">
                        {inv.aum ? (
                          <>
                            <div className="text-cyan-400 font-mono font-bold text-sm">
                              {formatAUM(inv.aum)}
                            </div>
                            <div className="text-slate-500 text-xs">AUM</div>
                          </>
                        ) : inv.fundSize ? (
                          <>
                            <div className="text-cyan-400 font-mono font-bold text-sm">
                              {formatAUM(inv.fundSize)}
                            </div>
                            <div className="text-slate-500 text-xs">
                              Fund Size
                            </div>
                          </>
                        ) : null}
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div className="bg-slate-900/50 rounded-lg p-2">
                        <div className="text-slate-500 text-xs">
                          Space Deals
                        </div>
                        <div className="text-white font-semibold">
                          {inv.dealCount || inv.portfolioCount || 0}
                        </div>
                      </div>
                      <div className="bg-slate-900/50 rounded-lg p-2">
                        <div className="text-slate-500 text-xs">
                          Total Invested
                        </div>
                        <div className="text-green-400 font-semibold text-sm">
                          {inv.totalInvested > 0
                            ? formatAUM(inv.totalInvested)
                            : '--'}
                        </div>
                      </div>
                    </div>

                    {/* Sector Focus Tags */}
                    <div className="flex flex-wrap gap-1 mb-3">
                      {inv.sectorFocus.map((s) => (
                        <span
                          key={s}
                          className="text-xs bg-cyan-900/30 text-cyan-400 px-2 py-0.5 rounded"
                        >
                          {SECTOR_LABELS[s] || s}
                        </span>
                      ))}
                    </div>

                    {/* Investment Stage Tags */}
                    <div className="flex flex-wrap gap-1 mb-3">
                      {inv.investmentStage.map((s) => (
                        <span
                          key={s}
                          className="text-xs bg-slate-700/50 text-slate-300 px-2 py-0.5 rounded"
                        >
                          {STAGE_LABELS[s] || s}
                        </span>
                      ))}
                    </div>

                    {/* Expand/collapse button */}
                    <button
                      onClick={() =>
                        setExpandedId(isExpanded ? null : inv.id)
                      }
                      className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
                    >
                      {isExpanded
                        ? 'Show less'
                        : 'Show notable deals & details'}
                    </button>

                    {/* Expanded content */}
                    {isExpanded && (
                      <div className="mt-3 pt-3 border-t border-slate-700/50 space-y-3">
                        {inv.description && (
                          <p className="text-slate-400 text-sm">
                            {inv.description}
                          </p>
                        )}
                        {inv.notableDeals.length > 0 && (
                          <div>
                            <div className="text-slate-500 text-xs mb-1">
                              Notable Space Deals:
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {inv.notableDeals.map((deal) => (
                                <span
                                  key={deal}
                                  className="text-xs bg-green-900/30 text-green-400 px-2 py-0.5 rounded"
                                >
                                  {deal}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        <div className="flex gap-4 text-xs text-slate-500">
                          {inv.website && (
                            <a
                              href={inv.website}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-cyan-400 hover:text-cyan-300 transition-colors"
                            >
                              Website
                            </a>
                          )}
                          <Link
                            href={`/funding-tracker?investor=${encodeURIComponent(
                              inv.name
                            )}`}
                            className="text-cyan-400 hover:text-cyan-300 transition-colors"
                          >
                            View Deals
                          </Link>
                        </div>
                      </div>
                    )}
                  </div>
                </StaggerItem>
              );
            })}
          </StaggerContainer>
        )}

        {/* Navigation */}
        <ScrollReveal>
          <div className="flex justify-center gap-4 mb-8">
            <Link
              href="/funding-tracker"
              className="px-6 py-3 rounded-lg bg-green-500/20 text-green-400 border border-green-500/30 hover:bg-green-500/30 transition-colors text-sm font-medium"
            >
              View Funding Tracker
            </Link>
            <Link
              href="/space-capital"
              className="px-6 py-3 rounded-lg bg-slate-700/50 text-slate-300 border border-slate-600/50 hover:bg-slate-700 transition-colors text-sm font-medium"
            >
              Space Capital Overview
            </Link>
          </div>
        </ScrollReveal>

        {/* Data Sources Footer */}
        <ScrollReveal>
          <div className="bg-slate-800/30 rounded-xl border border-slate-700/30 p-6">
            <h4 className="text-slate-400 font-semibold text-sm mb-3">
              Data Sources
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-xs text-slate-500">
              <div>Space Capital -- Quarterly Investment Reports</div>
              <div>Crunchbase -- Investor Profiles</div>
              <div>PitchBook -- Private Market Intelligence</div>
              <div>SEC EDGAR -- Public Filings</div>
              <div>Investor Websites & Press Releases</div>
              <div>Bryce Tech -- Space Investment Quarterly</div>
            </div>
            <p className="text-slate-600 text-xs mt-3">
              Investor data is compiled from publicly available sources. AUM and
              fund sizes may not reflect current values. This is not investment
              advice.
            </p>
          </div>
        </ScrollReveal>
      </div>
    </div>
  );
}
