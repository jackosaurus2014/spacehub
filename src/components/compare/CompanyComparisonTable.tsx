'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Score {
  id: string;
  scoreType: string;
  score: number;
  breakdown: Record<string, unknown> | null;
}

interface Satellite {
  id: string;
  orbitType: string | null;
  status: string;
}

interface Product {
  id: string;
  name: string;
  category: string | null;
}

interface Contract {
  id: string;
  value: number | null;
}

interface Partnership {
  id: string;
  partnerName: string;
}

interface Competitor {
  id: string;
  name: string;
  slug: string;
}

interface CompanyData {
  id: string;
  slug: string;
  name: string;
  logoUrl: string | null;
  sector: string | null;
  description: string | null;
  foundedYear: number | null;
  headquarters: string | null;
  country: string | null;
  employeeCount: number | null;
  employeeRange: string | null;
  tier: number;
  website: string | null;
  isPublic: boolean;
  valuation: number | null;
  revenueEstimate: number | null;
  totalFunding: number | null;
  lastFundingRound: string | null;
  marketCap: number | null;
  ownershipType: string | null;
  cageCode: string | null;
  samUei: string | null;
  tags: string[];
  scores: Score[];
  satelliteAssets: Satellite[];
  products: Product[];
  contracts: Contract[];
  partnerships: Partnership[];
  summary: {
    totalContractValue: number;
    activeSatellites: number;
    totalSatellites: number;
    competitors: Competitor[];
  };
}

interface CompanyComparisonTableProps {
  companies: CompanyData[];
  onRemove: (slug: string) => void;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatMoney(value: number | null | undefined): string {
  if (value == null || value === 0) return '--';
  if (value >= 1e12) return `$${(value / 1e12).toFixed(1)}T`;
  if (value >= 1e9) return `$${(value / 1e9).toFixed(1)}B`;
  if (value >= 1e6) return `$${(value / 1e6).toFixed(0)}M`;
  if (value >= 1e3) return `$${(value / 1e3).toFixed(0)}K`;
  return `$${value.toLocaleString()}`;
}

function formatNumber(value: number | null | undefined): string {
  if (value == null) return '--';
  return new Intl.NumberFormat('en-US').format(value);
}

function getTierLabel(tier: number): string {
  if (tier === 1) return 'Tier 1 - Industry Leader';
  if (tier === 2) return 'Tier 2 - High Growth';
  return 'Tier 3 - Emerging';
}

function getTierBadge(tier: number) {
  const styles: Record<number, { bg: string; text: string; label: string }> = {
    1: { bg: 'bg-amber-500/20', text: 'text-amber-400', label: 'TIER 1' },
    2: { bg: 'bg-white/10', text: 'text-white/70', label: 'TIER 2' },
    3: { bg: 'bg-purple-500/20', text: 'text-purple-400', label: 'TIER 3' },
  };
  const style = styles[tier] || styles[3];
  return (
    <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${style.bg} ${style.text}`}>
      {style.label}
    </span>
  );
}

function getSectorIcon(sector: string | null): string {
  const map: Record<string, string> = {
    launch: '🚀', satellite: '🛰️', defense: '🛡️', infrastructure: '🏗️',
    'ground-segment': '📡', manufacturing: '⚙️', analytics: '📊',
    agency: '🏛️', exploration: '🔭',
  };
  return map[sector || ''] || '🏢';
}

function getScoreByType(scores: Score[], type: string): number | null {
  const s = scores.find((sc) => sc.scoreType === type);
  return s ? s.score : null;
}

function getScoreColor(score: number | null): string {
  if (score == null) return 'text-slate-500';
  if (score >= 80) return 'text-emerald-400';
  if (score >= 60) return 'text-white/70';
  if (score >= 40) return 'text-amber-400';
  return 'text-red-400';
}

/** Returns the index(es) of companies with the highest numeric value */
function findWinners(companies: CompanyData[], getValue: (c: CompanyData) => number | null): Set<number> {
  let maxVal = -Infinity;
  const winners = new Set<number>();
  companies.forEach((c, i) => {
    const v = getValue(c);
    if (v != null && v > maxVal) {
      maxVal = v;
      winners.clear();
      winners.add(i);
    } else if (v != null && v === maxVal) {
      winners.add(i);
    }
  });
  // Only highlight if there's a clear winner (not all tied, and max > 0)
  if (winners.size === companies.length || maxVal <= 0) return new Set();
  return winners;
}

// ─── Row Definition Types ────────────────────────────────────────────────────

interface ComparisonRow {
  label: string;
  getValue: (c: CompanyData) => string | React.ReactNode;
  getNumericValue?: (c: CompanyData) => number | null;
  highlight?: boolean;
}

interface ComparisonSection {
  title: string;
  icon: string;
  rows: ComparisonRow[];
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function CompanyComparisonTable({ companies, onRemove }: CompanyComparisonTableProps) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    function check() {
      setIsMobile(window.innerWidth < 768);
    }
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const sections: ComparisonSection[] = [
    {
      title: 'Overview',
      icon: '📋',
      rows: [
        { label: 'Name', getValue: (c) => c.name },
        { label: 'Founded', getValue: (c) => c.foundedYear?.toString() || '--' },
        { label: 'Headquarters', getValue: (c) => c.headquarters || '--' },
        {
          label: 'Employees',
          getValue: (c) => c.employeeRange || (c.employeeCount ? formatNumber(c.employeeCount) : '--'),
          getNumericValue: (c) => c.employeeCount,
          highlight: true,
        },
        { label: 'Tier', getValue: (c) => getTierBadge(c.tier) },
        {
          label: 'Website',
          getValue: (c) =>
            c.website ? (
              <a
                href={c.website}
                target="_blank"
                rel="noopener noreferrer"
                className="text-white/70 hover:text-white text-xs truncate block max-w-[180px]"
              >
                {c.website.replace(/^https?:\/\/(www\.)?/, '')}
              </a>
            ) : (
              '--'
            ),
        },
        {
          label: 'Description',
          getValue: (c) => (
            <span className="text-xs text-slate-400 line-clamp-3">{c.description || '--'}</span>
          ),
        },
      ],
    },
    {
      title: 'Financial',
      icon: '💰',
      rows: [
        {
          label: 'Valuation',
          getValue: (c) => formatMoney(c.valuation),
          getNumericValue: (c) => c.valuation,
          highlight: true,
        },
        {
          label: 'Revenue (Est.)',
          getValue: (c) => formatMoney(c.revenueEstimate),
          getNumericValue: (c) => c.revenueEstimate,
          highlight: true,
        },
        {
          label: 'Total Funding',
          getValue: (c) => formatMoney(c.totalFunding),
          getNumericValue: (c) => c.totalFunding,
          highlight: true,
        },
        { label: 'Latest Round', getValue: (c) => c.lastFundingRound || '--' },
        {
          label: 'IPO Status',
          getValue: (c) => {
            if (c.isPublic) return <span className="text-emerald-400 font-medium">Public</span>;
            if (c.ownershipType === 'government') return <span className="text-blue-400">Government</span>;
            return <span className="text-slate-400">Private</span>;
          },
        },
      ],
    },
    {
      title: 'Government',
      icon: '🏛️',
      rows: [
        {
          label: 'SAM Registered',
          getValue: (c) =>
            c.samUei ? (
              <span className="text-emerald-400 font-medium">Yes</span>
            ) : (
              <span className="text-slate-500">No</span>
            ),
        },
        { label: 'CAGE Code', getValue: (c) => c.cageCode || '--' },
        {
          label: 'Contract Count',
          getValue: (c) => (c.contracts.length > 0 ? c.contracts.length.toString() : '--'),
          getNumericValue: (c) => (c.contracts.length > 0 ? c.contracts.length : null),
          highlight: true,
        },
        {
          label: 'Total Contract Value',
          getValue: (c) => formatMoney(c.summary.totalContractValue || null),
          getNumericValue: (c) => c.summary.totalContractValue || null,
          highlight: true,
        },
      ],
    },
    {
      title: 'Space Assets',
      icon: '🛰️',
      rows: [
        {
          label: 'Satellite Count',
          getValue: (c) => (c.summary.totalSatellites > 0 ? formatNumber(c.summary.totalSatellites) : '--'),
          getNumericValue: (c) => (c.summary.totalSatellites > 0 ? c.summary.totalSatellites : null),
          highlight: true,
        },
        {
          label: 'Active Satellites',
          getValue: (c) => (c.summary.activeSatellites > 0 ? formatNumber(c.summary.activeSatellites) : '--'),
          getNumericValue: (c) => (c.summary.activeSatellites > 0 ? c.summary.activeSatellites : null),
          highlight: true,
        },
        {
          label: 'Orbital Types',
          getValue: (c) => {
            const orbitTypes = Array.from(new Set(c.satelliteAssets.map((s) => s.orbitType).filter(Boolean)));
            if (orbitTypes.length === 0) return '--';
            return (
              <div className="flex flex-wrap gap-1">
                {orbitTypes.map((o) => (
                  <span
                    key={o}
                    className="text-xs px-1.5 py-0.5 rounded bg-white/[0.05] text-white/70"
                  >
                    {o}
                  </span>
                ))}
              </div>
            );
          },
        },
      ],
    },
    {
      title: 'Products & Services',
      icon: '🎯',
      rows: [
        {
          label: 'Key Products',
          getValue: (c) => {
            if (c.products.length === 0) return '--';
            return (
              <div className="flex flex-wrap gap-1">
                {c.products.slice(0, 5).map((p) => (
                  <span
                    key={p.id}
                    className="text-xs px-1.5 py-0.5 rounded bg-white/5 text-white/70 border border-white/10"
                  >
                    {p.name}
                  </span>
                ))}
                {c.products.length > 5 && (
                  <span className="text-xs text-slate-500">+{c.products.length - 5} more</span>
                )}
              </div>
            );
          },
        },
        {
          label: 'Categories',
          getValue: (c) => {
            const cats = Array.from(new Set(c.products.map((p) => p.category).filter(Boolean)));
            if (cats.length === 0) return '--';
            return (
              <div className="flex flex-wrap gap-1">
                {cats.map((cat) => (
                  <span
                    key={cat}
                    className="text-xs px-1.5 py-0.5 rounded bg-white/[0.05] text-slate-400 capitalize"
                  >
                    {(cat as string).replace(/_/g, ' ')}
                  </span>
                ))}
              </div>
            );
          },
        },
        {
          label: 'Tags / Certifications',
          getValue: (c) => {
            if (!c.tags || c.tags.length === 0) return '--';
            return (
              <div className="flex flex-wrap gap-1">
                {c.tags.slice(0, 5).map((tag) => (
                  <span
                    key={tag}
                    className="text-xs px-1.5 py-0.5 rounded bg-white/[0.05] text-slate-400"
                  >
                    {tag}
                  </span>
                ))}
                {c.tags.length > 5 && (
                  <span className="text-xs text-slate-500">+{c.tags.length - 5} more</span>
                )}
              </div>
            );
          },
        },
      ],
    },
    {
      title: 'Scores',
      icon: '📊',
      rows: [
        {
          label: 'Innovation',
          getValue: (c) => {
            const s = getScoreByType(c.scores, 'technology');
            return s != null ? (
              <span className={`font-bold ${getScoreColor(s)}`}>{s}/100</span>
            ) : (
              '--'
            );
          },
          getNumericValue: (c) => getScoreByType(c.scores, 'technology'),
          highlight: true,
        },
        {
          label: 'Market Position',
          getValue: (c) => {
            const s = getScoreByType(c.scores, 'market_position');
            return s != null ? (
              <span className={`font-bold ${getScoreColor(s)}`}>{s}/100</span>
            ) : (
              '--'
            );
          },
          getNumericValue: (c) => getScoreByType(c.scores, 'market_position'),
          highlight: true,
        },
        {
          label: 'Financial Health',
          getValue: (c) => {
            const s = getScoreByType(c.scores, 'funding');
            return s != null ? (
              <span className={`font-bold ${getScoreColor(s)}`}>{s}/100</span>
            ) : (
              '--'
            );
          },
          getNumericValue: (c) => getScoreByType(c.scores, 'funding'),
          highlight: true,
        },
        {
          label: 'Growth Trajectory',
          getValue: (c) => {
            const s = getScoreByType(c.scores, 'growth');
            return s != null ? (
              <span className={`font-bold ${getScoreColor(s)}`}>{s}/100</span>
            ) : (
              '--'
            );
          },
          getNumericValue: (c) => getScoreByType(c.scores, 'growth'),
          highlight: true,
        },
      ],
    },
    {
      title: 'Relationships',
      icon: '🔗',
      rows: [
        {
          label: 'Key Partners',
          getValue: (c) => {
            if (c.partnerships.length === 0) return '--';
            return (
              <div className="flex flex-wrap gap-1">
                {c.partnerships.slice(0, 4).map((p) => (
                  <span
                    key={p.id}
                    className="text-xs px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20"
                  >
                    {p.partnerName}
                  </span>
                ))}
                {c.partnerships.length > 4 && (
                  <span className="text-xs text-slate-500">+{c.partnerships.length - 4} more</span>
                )}
              </div>
            );
          },
        },
        {
          label: 'Competitors',
          getValue: (c) => {
            if (c.summary.competitors.length === 0) return '--';
            return (
              <div className="flex flex-wrap gap-1">
                {c.summary.competitors.slice(0, 4).map((comp) => (
                  <a
                    key={comp.id}
                    href={`/company-profiles/${comp.slug}`}
                    className="text-xs px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-colors"
                  >
                    {comp.name}
                  </a>
                ))}
                {c.summary.competitors.length > 4 && (
                  <span className="text-xs text-slate-500">
                    +{c.summary.competitors.length - 4} more
                  </span>
                )}
              </div>
            );
          },
        },
      ],
    },
  ];

  // ─── Mobile Card Layout ──────────────────────────────────────────────────

  if (isMobile) {
    return (
      <div className="space-y-6">
        {sections.map((section) => (
          <div key={section.title}>
            <h3 className="text-sm font-semibold text-white flex items-center gap-2 mb-3 px-1">
              <span>{section.icon}</span>
              {section.title}
            </h3>
            <div className="space-y-3">
              {companies.map((company) => (
                <div
                  key={company.slug}
                  className="bg-white/[0.04] border border-white/[0.06] rounded-xl p-4"
                >
                  <div className="flex items-center gap-3 mb-3 pb-2 border-b border-white/[0.04]">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-white/[0.08] to-white/[0.08] flex items-center justify-center text-sm flex-shrink-0 border border-white/[0.08]">
                      {company.logoUrl ? (
                        <Image
                          src={company.logoUrl}
                          alt={company.name}
                          width={20}
                          height={20}
                          className="w-5 h-5 rounded object-contain"
                          unoptimized
                        />
                      ) : (
                        getSectorIcon(company.sector)
                      )}
                    </div>
                    <span className="font-semibold text-white text-sm">{company.name}</span>
                    <button
                      onClick={() => onRemove(company.slug)}
                      className="ml-auto text-slate-500 hover:text-red-400 transition-colors"
                      aria-label={`Remove ${company.name}`}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  </div>
                  <div className="space-y-2">
                    {section.rows.map((row) => {
                      const val = row.getValue(company);
                      return (
                        <div key={row.label} className="flex items-start justify-between gap-2">
                          <span className="text-xs text-slate-500 shrink-0">{row.label}</span>
                          <div className="text-sm text-white text-right">{val}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  // ─── Desktop Table Layout ────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {sections.map((section) => (
        <div
          key={section.title}
          className="bg-black/50 border border-white/[0.06] rounded-xl overflow-hidden"
        >
          {/* Section header */}
          <div className="px-5 py-3 bg-white/[0.03] border-b border-white/[0.06]">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <span>{section.icon}</span>
              {section.title}
            </h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              {/* Company headers */}
              <thead>
                <tr className="border-b border-white/[0.04]">
                  <th className="text-left p-4 text-slate-400 text-xs font-medium min-w-[160px] w-[160px]">
                    Feature
                  </th>
                  {companies.map((company) => (
                    <th key={company.slug} className="p-4 text-center min-w-[200px]">
                      <div className="relative">
                        <button
                          onClick={() => onRemove(company.slug)}
                          className="absolute -top-1 right-0 text-slate-500 hover:text-red-400 transition-colors p-1"
                          aria-label={`Remove ${company.name}`}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M6 18L18 6M6 6l12 12"
                            />
                          </svg>
                        </button>
                        <div className="w-10 h-10 mx-auto rounded-lg bg-gradient-to-br from-white/[0.08] to-white/[0.06] flex items-center justify-center text-lg font-bold border border-white/[0.08] mb-1.5">
                          {company.logoUrl ? (
                            <Image
                              src={company.logoUrl}
                              alt={company.name}
                              width={28}
                              height={28}
                              className="w-7 h-7 rounded object-contain"
                              unoptimized
                            />
                          ) : (
                            getSectorIcon(company.sector)
                          )}
                        </div>
                        <a
                          href={`/company-profiles/${company.slug}`}
                          className="text-sm font-semibold text-white hover:text-white transition-colors"
                        >
                          {company.name}
                        </a>
                        <div className="mt-1">{getTierBadge(company.tier)}</div>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {section.rows.map((row, idx) => {
                  const winners =
                    row.highlight && row.getNumericValue
                      ? findWinners(companies, row.getNumericValue)
                      : new Set<number>();

                  return (
                    <tr
                      key={row.label}
                      className={idx % 2 === 0 ? 'bg-white/[0.02]' : 'bg-transparent'}
                    >
                      <td className="p-4 text-slate-400 text-sm font-medium border-r border-white/[0.04]">
                        {row.label}
                      </td>
                      {companies.map((company, compIdx) => {
                        const isWinner = winners.has(compIdx);
                        return (
                          <td
                            key={company.slug}
                            className={`p-4 text-center text-sm ${
                              isWinner
                                ? 'bg-emerald-500/5 text-emerald-400 font-semibold'
                                : 'text-white'
                            }`}
                          >
                            <div className="flex items-center justify-center">
                              {isWinner && (
                                <svg
                                  className="w-3.5 h-3.5 text-emerald-400 mr-1.5 flex-shrink-0"
                                  fill="currentColor"
                                  viewBox="0 0 20 20"
                                >
                                  <path
                                    fillRule="evenodd"
                                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                    clipRule="evenodd"
                                  />
                                </svg>
                              )}
                              <span>{row.getValue(company)}</span>
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}
