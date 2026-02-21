'use client';

import React, { useState, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import AnimatedPageHeader from '@/components/ui/AnimatedPageHeader';
import SpaceScoreBadge, { SpaceScoreInlineBadge, SpaceScoreMiniBar } from '@/components/company/SpaceScoreBadge';
import {
  getLeaderboard,
  SPACE_SCORE_TIERS,
  DIMENSION_ICONS,
  DIMENSION_COLORS,
  DIMENSION_BG_COLORS,
  type CompanyScoreEntry,
} from '@/lib/space-score';
import ItemListSchema from '@/components/seo/ItemListSchema';
import FAQSchema from '@/components/seo/FAQSchema';

// ─── Tab Definitions ──────────────────────────────────────────────────────────

const TABS = [
  { id: 'leaderboard', label: 'Leaderboard', icon: '🏆' },
  { id: 'methodology', label: 'Methodology', icon: '📐' },
] as const;

type TabId = typeof TABS[number]['id'];

const SORT_OPTIONS = [
  { value: 'total', label: 'Overall Score' },
  { value: 'innovation', label: 'Innovation' },
  { value: 'financial', label: 'Financial Health' },
  { value: 'market', label: 'Market Position' },
  { value: 'operations', label: 'Operations' },
  { value: 'growth', label: 'Growth' },
] as const;

const TIER_FILTER_OPTIONS = [
  { value: '', label: 'All Tiers' },
  { value: 'Elite', label: 'Elite (900+)' },
  { value: 'Leader', label: 'Leader (750-899)' },
  { value: 'Contender', label: 'Contender (600-749)' },
  { value: 'Emerging', label: 'Emerging (400-599)' },
  { value: 'Early Stage', label: 'Early Stage (200-399)' },
  { value: 'Pre-Revenue', label: 'Pre-Revenue (<200)' },
];

const SECTOR_FILTER_OPTIONS = [
  { value: '', label: 'All Sectors' },
  { value: 'launch', label: 'Launch' },
  { value: 'satellite', label: 'Satellite' },
  { value: 'defense', label: 'Defense' },
  { value: 'manufacturing', label: 'Manufacturing' },
  { value: 'infrastructure', label: 'Infrastructure' },
  { value: 'analytics', label: 'Analytics' },
  { value: 'exploration', label: 'Exploration' },
  { value: 'on-orbit-servicing', label: 'On-Orbit Servicing' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getSectorIcon(sector: string | null): string {
  const m: Record<string, string> = {
    launch: '🚀', satellite: '🛰️', defense: '🛡️', infrastructure: '🏗️',
    'ground-segment': '📡', manufacturing: '⚙️', analytics: '📊',
    agency: '🏛️', exploration: '🔭', 'on-orbit-servicing': '🔧',
  };
  return m[sector || ''] || '🏢';
}

function getRankBadge(rank: number) {
  if (rank === 1) return <span className="text-lg">🥇</span>;
  if (rank === 2) return <span className="text-lg">🥈</span>;
  if (rank === 3) return <span className="text-lg">🥉</span>;
  return <span className="text-sm font-bold text-slate-400 w-6 text-center">#{rank}</span>;
}

function getDimensionScore(entry: CompanyScoreEntry, key: string): number {
  const dim = entry.score.breakdown.find(d => d.key === key);
  return dim?.score ?? 0;
}

// ─── Stats Card ───────────────────────────────────────────────────────────────

function StatCard({ label, value, icon, color }: { label: string; value: string; icon: string; color: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="card p-4"
    >
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-lg ${color} flex items-center justify-center text-xl`}>
          {icon}
        </div>
        <div>
          <div className="text-xl font-bold text-white">{value}</div>
          <div className="text-xs text-slate-400">{label}</div>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Leaderboard Row ──────────────────────────────────────────────────────────

function LeaderboardRow({
  entry,
  rank,
  index,
  sortBy,
}: {
  entry: CompanyScoreEntry;
  rank: number;
  index: number;
  sortBy: string;
}) {
  const highlightDim = sortBy !== 'total' ? sortBy : null;

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.02, duration: 0.3 }}
    >
      <Link href={`/company-profiles/${entry.slug}`}>
        <motion.div
          whileHover={{ x: 4, backgroundColor: 'rgba(6, 182, 212, 0.05)' }}
          className="card p-3 md:p-4 flex items-center gap-3 md:gap-4 group cursor-pointer"
        >
          {/* Rank */}
          <div className="w-8 md:w-10 flex-shrink-0 flex justify-center">
            {getRankBadge(rank)}
          </div>

          {/* Score Badge */}
          <div className="flex-shrink-0">
            <SpaceScoreBadge score={entry.score.total} size="sm" animated={false} />
          </div>

          {/* Company Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-white group-hover:text-cyan-400 transition-colors truncate">
                {entry.name}
              </span>
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${entry.score.tier.bgColor} ${entry.score.tier.color}`}>
                {entry.score.tier.label}
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
              <span>{getSectorIcon(entry.sector)} {entry.sector || 'Space'}</span>
              <span className="text-slate-600">|</span>
              <span>P{entry.score.percentile}</span>
            </div>
          </div>

          {/* Dimension Score (if sorted by dimension) */}
          {highlightDim && (
            <div className="hidden sm:flex flex-col items-end mr-2">
              <span className={`text-sm font-bold ${DIMENSION_COLORS[highlightDim] || 'text-white'}`}>
                {getDimensionScore(entry, highlightDim)}/200
              </span>
              <span className="text-[10px] text-slate-500 capitalize">{highlightDim}</span>
            </div>
          )}

          {/* Mini dimension bar */}
          <div className="hidden lg:block flex-shrink-0">
            <SpaceScoreMiniBar
              breakdown={entry.score.breakdown}
              width={140}
              height={10}
            />
          </div>

          {/* Arrow */}
          <svg className="w-4 h-4 text-slate-600 group-hover:text-cyan-400 transition-colors flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </motion.div>
      </Link>
    </motion.div>
  );
}

// ─── Methodology Section ──────────────────────────────────────────────────────

function MethodologyTab() {
  const dimensions = [
    {
      key: 'innovation',
      name: 'Innovation',
      points: 200,
      description: 'Measures the company\'s technological edge and R&D output. This includes patent and intellectual property activity, SBIR and government R&D awards, proprietary technology indicators, open-source contributions, and product portfolio diversity.',
      factors: [
        'Patent & IP Activity (0-40 pts)',
        'SBIR/Government R&D Awards (0-35 pts)',
        'R&D Technology Indicators (0-45 pts)',
        'Open Source & Software Activity (0-35 pts)',
        'Product Diversity Bonus (0-45 pts)',
      ],
    },
    {
      key: 'financial',
      name: 'Financial Health',
      points: 200,
      description: 'Evaluates the company\'s financial stability and capitalization. Considers annual revenue, total venture funding raised, current valuation or public market capitalization, profitability signals, and depth of funding history.',
      factors: [
        'Annual Revenue (0-60 pts)',
        'Total Funding Raised (0-50 pts)',
        'Valuation / Market Cap (0-50 pts)',
        'Profitability Indicators (0-25 pts)',
        'Funding Round History (0-15 pts)',
      ],
    },
    {
      key: 'market',
      name: 'Market Position',
      points: 200,
      description: 'Assesses the company\'s standing within the competitive landscape. Factors include government contract portfolio size, strategic partnerships and event activity, overall market share position based on company tier, media and industry presence, and public listing status.',
      factors: [
        'Government Contract Portfolio (0-55 pts)',
        'Partnerships & Event Activity (0-40 pts)',
        'Market Share Position (0-55 pts)',
        'Media & Industry Presence (0-30 pts)',
        'Public Listing Bonus (0-15 pts)',
      ],
    },
    {
      key: 'operations',
      name: 'Operational Capacity',
      points: 200,
      description: 'Measures the company\'s ability to execute at scale. Considers active satellite fleet size, global facility network, total workforce size, and launch or operational cadence for service delivery.',
      factors: [
        'Satellite Fleet Size (0-55 pts)',
        'Facility Network (0-45 pts)',
        'Workforce Size (0-50 pts)',
        'Launch / Ops Cadence (0-40 pts)',
      ],
    },
    {
      key: 'growth',
      name: 'Growth Trajectory',
      points: 200,
      description: 'Tracks the company\'s forward momentum and expansion velocity. Evaluates hiring velocity relative to company age, recency of funding rounds, deal flow activity, international expansion indicators, and growth-stage momentum bonuses for younger companies.',
      factors: [
        'Hiring Velocity (0-45 pts)',
        'Recent Funding Activity (0-40 pts)',
        'Deal Flow & Activity (0-45 pts)',
        'Expansion Indicators (0-38 pts)',
        'Young Company Bonus (0-30 pts)',
      ],
    },
  ];

  return (
    <div className="space-y-8">
      {/* Overview */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card p-6"
      >
        <h2 className="text-xl font-bold text-white mb-4">How Space Score Works</h2>
        <p className="text-slate-300 leading-relaxed mb-4">
          Space Score is a composite rating system that evaluates space industry companies on a scale of 0 to 1000.
          The score is derived from five equally weighted dimensions, each contributing up to 200 points.
          Scores are calculated using publicly available data including company financials, product portfolios,
          contract awards, workforce data, satellite assets, and growth indicators.
        </p>
        <p className="text-slate-400 text-sm leading-relaxed">
          Unlike purely financial metrics, Space Score captures the full picture of a space company&apos;s capabilities,
          from innovation and R&D to operational execution and growth momentum. This makes it useful for investors,
          analysts, partners, and procurement teams evaluating potential counterparties in the space industry.
        </p>
      </motion.div>

      {/* Scoring Dimensions */}
      <div>
        <h2 className="text-lg font-bold text-white mb-4">5 Scoring Dimensions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {dimensions.map((dim, i) => (
            <motion.div
              key={dim.key}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="card p-5 relative overflow-hidden"
            >
              {/* Color accent */}
              <div className={`absolute top-0 left-0 right-0 h-1 ${DIMENSION_BG_COLORS[dim.key]}`} />

              <div className="flex items-center gap-3 mb-3">
                <span className="text-2xl">{DIMENSION_ICONS[dim.key]}</span>
                <div>
                  <h3 className={`font-bold ${DIMENSION_COLORS[dim.key]}`}>{dim.name}</h3>
                  <span className="text-xs text-slate-500">Up to {dim.points} points</span>
                </div>
              </div>

              <p className="text-sm text-slate-400 leading-relaxed mb-4">{dim.description}</p>

              <div className="space-y-1.5">
                <h4 className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Scoring Factors</h4>
                {dim.factors.map((factor, fi) => (
                  <div key={fi} className="text-xs text-slate-400 flex items-start gap-1.5">
                    <span className={`mt-1 w-1 h-1 rounded-full flex-shrink-0 ${DIMENSION_BG_COLORS[dim.key]}`} />
                    <span>{factor}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Tier Definitions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="card p-6"
      >
        <h2 className="text-xl font-bold text-white mb-4">Score Tiers</h2>
        <div className="space-y-3">
          {SPACE_SCORE_TIERS.map((tier, i) => (
            <motion.div
              key={tier.label}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 + i * 0.05 }}
              className={`flex items-center gap-4 p-3 rounded-lg border ${tier.borderColor} bg-slate-800/20`}
            >
              <div className={`px-3 py-1.5 rounded-lg font-bold text-sm ${tier.bgColor} ${tier.color} min-w-[80px] text-center`}>
                {tier.label}
              </div>
              <div className="text-xs text-slate-500 font-mono min-w-[80px]">
                {tier.minScore}-{tier.maxScore}
              </div>
              <p className="text-sm text-slate-400 flex-1">{tier.description}</p>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Comparison */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="card p-6"
      >
        <h2 className="text-xl font-bold text-white mb-4">Comparison to Other Rating Systems</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-500 border-b border-slate-700/50">
                <th className="pb-3 font-medium">Rating System</th>
                <th className="pb-3 font-medium">Focus</th>
                <th className="pb-3 font-medium">Scale</th>
                <th className="pb-3 font-medium">Methodology</th>
              </tr>
            </thead>
            <tbody className="text-slate-400">
              <tr className="border-b border-slate-800/50">
                <td className="py-3 font-semibold text-cyan-400">SpaceNexus Space Score</td>
                <td className="py-3">Holistic space company assessment</td>
                <td className="py-3">0-1000 (5 dimensions x 200)</td>
                <td className="py-3">Algorithmic, multi-dimensional, transparent, updated in real-time</td>
              </tr>
              <tr className="border-b border-slate-800/50">
                <td className="py-3 font-semibold text-slate-300">CB Insights Mosaic Score</td>
                <td className="py-3">Private company health across industries</td>
                <td className="py-3">0-1000</td>
                <td className="py-3">ML-based; momentum, market, money, and management signals</td>
              </tr>
              <tr className="border-b border-slate-800/50">
                <td className="py-3 font-semibold text-slate-300">SpaceFund Reality Rating</td>
                <td className="py-3">Space startup technology readiness</td>
                <td className="py-3">1-9 (TRL-based)</td>
                <td className="py-3">Expert-assessed technology readiness and business viability</td>
              </tr>
              <tr>
                <td className="py-3 font-semibold text-slate-300">Euroconsult Profiles</td>
                <td className="py-3">Satellite/space market revenue</td>
                <td className="py-3">Revenue-based</td>
                <td className="py-3">Analyst estimates from industry conferences and filings</td>
              </tr>
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* Feedback */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="card p-6 text-center border border-dashed border-slate-700"
      >
        <h3 className="text-lg font-bold text-white mb-2">Suggest a Factor</h3>
        <p className="text-slate-400 text-sm mb-4">
          Think we should incorporate additional data points into the Space Score algorithm?
          We are always looking to refine our methodology with industry feedback.
        </p>
        <Link
          href="/contact?subject=Space+Score+Factor+Suggestion"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-lg text-sm font-medium transition-all"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
          Submit Suggestion
        </Link>
      </motion.div>
    </div>
  );
}

// ─── Main Content (inside Suspense) ───────────────────────────────────────────

function SpaceScoreContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tabParam = (searchParams.get('tab') as TabId) || 'leaderboard';

  const [activeTab, setActiveTab] = useState<TabId>(tabParam);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<string>('total');
  const [tierFilter, setTierFilter] = useState('');
  const [sectorFilter, setSectorFilter] = useState('');

  const allEntries = useMemo(() => getLeaderboard(), []);

  const filteredAndSorted = useMemo(() => {
    let results = [...allEntries];

    // Filter by search
    if (search) {
      const q = search.toLowerCase();
      results = results.filter(e =>
        e.name.toLowerCase().includes(q) ||
        (e.sector || '').toLowerCase().includes(q)
      );
    }

    // Filter by tier
    if (tierFilter) {
      results = results.filter(e => e.score.tier.label === tierFilter);
    }

    // Filter by sector
    if (sectorFilter) {
      results = results.filter(e => e.sector === sectorFilter);
    }

    // Sort
    if (sortBy === 'total') {
      results.sort((a, b) => b.score.total - a.score.total);
    } else {
      results.sort((a, b) => getDimensionScore(b, sortBy) - getDimensionScore(a, sortBy));
    }

    return results;
  }, [allEntries, search, sortBy, tierFilter, sectorFilter]);

  const handleTabChange = (tab: TabId) => {
    setActiveTab(tab);
    router.replace(`/space-score?tab=${tab}`, { scroll: false });
  };

  // Stats
  const avgScore = allEntries.length > 0
    ? Math.round(allEntries.reduce((sum, e) => sum + e.score.total, 0) / allEntries.length)
    : 0;
  const eliteCount = allEntries.filter(e => e.score.tier.label === 'Elite').length;
  const topScore = allEntries[0]?.score.total || 0;

  return (
    <div className="min-h-screen p-4 lg:p-8 max-w-[1400px] mx-auto">
      <ItemListSchema
        name="Space Score Leaderboard"
        description="Top-ranked space companies by composite Space Score rating across Innovation, Financial Health, Market Position, Operational Capacity, and Growth Trajectory."
        url="/space-score"
        items={filteredAndSorted.slice(0, 30).map(e => ({
          name: `${e.name} - Space Score ${e.score.total}`,
          url: `/company-profiles/${e.slug}`,
          description: `${e.name} has a Space Score of ${e.score.total}/1000 (${e.score.tier.label} tier). Sector: ${e.sector || 'Space'}`,
        }))}
      />
      <FAQSchema items={[
        { question: 'What is the Space Score?', answer: 'Space Score is a composite 0-1000 rating for space industry companies, measuring Innovation (200 pts), Financial Health (200 pts), Market Position (200 pts), Operational Capacity (200 pts), and Growth Trajectory (200 pts).' },
        { question: 'How is the Space Score calculated?', answer: 'Space Score uses publicly available data including financials, patent activity, government contracts, satellite fleet size, workforce data, and growth indicators. Each of 5 dimensions contributes up to 200 points for a total of 1000.' },
        { question: 'What company has the highest Space Score?', answer: 'SpaceX leads the Space Score leaderboard in the Elite tier with a score of 953/1000, reflecting its dominant position in innovation, market share, and operational capacity.' },
        { question: 'How often are Space Scores updated?', answer: 'Space Scores are recalculated periodically as new data becomes available from financial filings, contract awards, launch events, and other public sources.' },
      ]} />

      <AnimatedPageHeader
        title="Space Score"
        subtitle="Composite 0-1000 rating system for 100+ space industry companies across Innovation, Financial Health, Market Position, Operations, and Growth"
        icon="🏆"
      />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatCard label="Companies Rated" value={allEntries.length.toString()} icon="🏢" color="bg-cyan-500/20" />
        <StatCard label="Highest Score" value={topScore.toString()} icon="🏆" color="bg-blue-500/20" />
        <StatCard label="Average Score" value={avgScore.toString()} icon="📊" color="bg-emerald-500/20" />
        <StatCard label="Elite Companies" value={eliteCount.toString()} icon="⭐" color="bg-amber-500/20" />
      </div>

      {/* Tab Navigation */}
      <div className="card mb-6 overflow-hidden">
        <div className="flex">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`relative px-6 py-3 text-sm font-medium whitespace-nowrap transition-colors flex items-center gap-2 ${
                activeTab === tab.id ? 'text-cyan-400' : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
              {activeTab === tab.id && (
                <motion.div
                  layoutId="tab-indicator-score"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyan-400"
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === 'leaderboard' && (
            <div>
              {/* Filters */}
              <div className="card p-4 mb-4">
                <div className="flex flex-col lg:flex-row gap-3">
                  {/* Search */}
                  <div className="flex-1 relative">
                    <input
                      type="text"
                      aria-label="Search companies by name or sector"
                      placeholder="Search companies by name or sector..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-800/50 border border-slate-700/50 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50"
                    />
                    <svg className="absolute left-3 top-3 w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>

                  {/* Tier filter */}
                  <select
                    aria-label="Filter by score tier"
                    value={tierFilter}
                    onChange={(e) => setTierFilter(e.target.value)}
                    className="px-3 py-2.5 bg-slate-800/50 border border-slate-700/50 rounded-lg text-slate-300 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                  >
                    {TIER_FILTER_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>

                  {/* Sector filter */}
                  <select
                    aria-label="Filter by sector"
                    value={sectorFilter}
                    onChange={(e) => setSectorFilter(e.target.value)}
                    className="px-3 py-2.5 bg-slate-800/50 border border-slate-700/50 rounded-lg text-slate-300 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                  >
                    {SECTOR_FILTER_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>

                  {/* Sort */}
                  <select
                    aria-label="Sort by dimension"
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="px-3 py-2.5 bg-slate-800/50 border border-slate-700/50 rounded-lg text-slate-300 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                  >
                    {SORT_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>Sort: {opt.label}</option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center justify-between mt-3 text-xs text-slate-500">
                  <span>{filteredAndSorted.length} companies</span>
                  {/* Dimension legend */}
                  <div className="hidden md:flex items-center gap-3">
                    {Object.entries(DIMENSION_ICONS).map(([key, icon]) => (
                      <span key={key} className="flex items-center gap-1">
                        <span className={`w-2 h-2 rounded-full ${DIMENSION_BG_COLORS[key]}`} />
                        <span className="capitalize">{key}</span>
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Leaderboard */}
              {filteredAndSorted.length === 0 ? (
                <div className="text-center py-20">
                  <div className="text-6xl mb-4">🔍</div>
                  <h3 className="text-xl font-semibold text-white mb-2">No companies match</h3>
                  <p className="text-slate-400">Try adjusting your search or filters</p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {filteredAndSorted.map((entry, i) => (
                    <LeaderboardRow
                      key={entry.slug}
                      entry={entry}
                      rank={i + 1}
                      index={i}
                      sortBy={sortBy}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'methodology' && <MethodologyTab />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// ─── Page Export (Suspense boundary for useSearchParams) ──────────────────────

export default function SpaceScorePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen p-4 lg:p-8 max-w-[1400px] mx-auto">
        <div className="h-10 w-64 bg-slate-800 rounded animate-pulse mb-3" />
        <div className="h-4 w-96 bg-slate-800/60 rounded animate-pulse" />
      </div>
    }>
      <SpaceScoreContent />
    </Suspense>
  );
}
