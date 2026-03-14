'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import AnimatedPageHeader from '@/components/ui/AnimatedPageHeader';
import ScrollReveal, { StaggerContainer, StaggerItem } from '@/components/ui/ScrollReveal';
import RelatedModules from '@/components/ui/RelatedModules';
import { PAGE_RELATIONS } from '@/lib/module-relationships';

// ────────────────────────────────────────
// Types
// ────────────────────────────────────────

interface FundingRound {
  id: number;
  company: string;
  companySlug: string;
  amount: number; // millions USD
  roundType: string;
  category: Category;
  leadInvestor: string;
  date: string;
  region: Region;
}

interface QuarterlyData {
  quarter: string;
  year: number;
  totalBillions: number;
  dealCount: number;
}

interface TopInvestor {
  name: string;
  dealCount: number;
  totalInvestedBillions: number;
  notableDeals: string[];
}

interface CategoryBreakdown {
  name: Category;
  totalBillions: number;
  deals: number;
  description: string;
  color: string;
  barColor: string;
}

interface GeoDistribution {
  region: Region;
  percentage: number;
  totalBillions: number;
  deals: number;
  color: string;
}

type Category = 'Infrastructure' | 'Distribution' | 'Applications' | 'Emerging';
type Region = 'US' | 'Europe' | 'Asia' | 'Other';
type RoundTypeFilter = '' | 'Seed' | 'Series A' | 'Series B' | 'Series C' | 'SPAC' | 'IPO';
type YearFilter = '' | '2020' | '2021' | '2022' | '2023' | '2024' | '2025';

// ────────────────────────────────────────
// Hardcoded Data
// ────────────────────────────────────────

const QUARTERLY_DATA: QuarterlyData[] = [
  // 2020 ~$7.6B, 120 deals
  { quarter: 'Q1', year: 2020, totalBillions: 1.4, dealCount: 28 },
  { quarter: 'Q2', year: 2020, totalBillions: 1.6, dealCount: 27 },
  { quarter: 'Q3', year: 2020, totalBillions: 2.1, dealCount: 33 },
  { quarter: 'Q4', year: 2020, totalBillions: 2.5, dealCount: 32 },
  // 2021 ~$15.4B, 160 deals (peak)
  { quarter: 'Q1', year: 2021, totalBillions: 3.2, dealCount: 38 },
  { quarter: 'Q2', year: 2021, totalBillions: 4.1, dealCount: 42 },
  { quarter: 'Q3', year: 2021, totalBillions: 4.6, dealCount: 44 },
  { quarter: 'Q4', year: 2021, totalBillions: 3.5, dealCount: 36 },
  // 2022 ~$8.1B, 140 deals
  { quarter: 'Q1', year: 2022, totalBillions: 2.3, dealCount: 38 },
  { quarter: 'Q2', year: 2022, totalBillions: 2.2, dealCount: 37 },
  { quarter: 'Q3', year: 2022, totalBillions: 1.9, dealCount: 34 },
  { quarter: 'Q4', year: 2022, totalBillions: 1.7, dealCount: 31 },
  // 2023 ~$8.9B, 130 deals
  { quarter: 'Q1', year: 2023, totalBillions: 1.8, dealCount: 30 },
  { quarter: 'Q2', year: 2023, totalBillions: 2.4, dealCount: 34 },
  { quarter: 'Q3', year: 2023, totalBillions: 2.5, dealCount: 35 },
  { quarter: 'Q4', year: 2023, totalBillions: 2.2, dealCount: 31 },
  // 2024 ~$7.5B, 125 deals
  { quarter: 'Q1', year: 2024, totalBillions: 1.9, dealCount: 32 },
  { quarter: 'Q2', year: 2024, totalBillions: 2.0, dealCount: 33 },
  { quarter: 'Q3', year: 2024, totalBillions: 1.9, dealCount: 31 },
  { quarter: 'Q4', year: 2024, totalBillions: 1.7, dealCount: 29 },
  // 2025 ~$5.8B, 115 deals (YTD through Q3)
  { quarter: 'Q1', year: 2025, totalBillions: 1.8, dealCount: 37 },
  { quarter: 'Q2', year: 2025, totalBillions: 2.1, dealCount: 40 },
  { quarter: 'Q3', year: 2025, totalBillions: 1.9, dealCount: 38 },
];

const RECENT_ROUNDS: FundingRound[] = [
  {
    id: 1,
    company: 'SpaceX',
    companySlug: 'spacex',
    amount: 750,
    roundType: 'Series N',
    category: 'Infrastructure',
    leadInvestor: 'Andreessen Horowitz',
    date: '2025-07-15',
    region: 'US',
  },
  {
    id: 2,
    company: 'Relativity Space',
    companySlug: 'relativity-space',
    amount: 650,
    roundType: 'Series E',
    category: 'Infrastructure',
    leadInvestor: 'Fidelity Investments',
    date: '2025-05-22',
    region: 'US',
  },
  {
    id: 3,
    company: 'Planet Labs',
    companySlug: 'planet-labs',
    amount: 280,
    roundType: 'IPO',
    category: 'Applications',
    leadInvestor: 'Public Market',
    date: '2025-03-10',
    region: 'US',
  },
  {
    id: 4,
    company: 'Rocket Lab',
    companySlug: 'rocket-lab',
    amount: 320,
    roundType: 'SPAC',
    category: 'Infrastructure',
    leadInvestor: 'Vector Capital',
    date: '2025-01-18',
    region: 'US',
  },
  {
    id: 5,
    company: 'OneWeb',
    companySlug: 'oneweb',
    amount: 500,
    roundType: 'Series C',
    category: 'Distribution',
    leadInvestor: 'SoftBank Group',
    date: '2024-11-05',
    region: 'Europe',
  },
  {
    id: 6,
    company: 'Astra',
    companySlug: 'astra',
    amount: 200,
    roundType: 'Series C',
    category: 'Infrastructure',
    leadInvestor: 'BlackRock',
    date: '2024-09-28',
    region: 'US',
  },
  {
    id: 7,
    company: 'Spire Global',
    companySlug: 'spire-global',
    amount: 245,
    roundType: 'SPAC',
    category: 'Applications',
    leadInvestor: 'NavSight Holdings',
    date: '2024-08-14',
    region: 'US',
  },
  {
    id: 8,
    company: 'ispace',
    companySlug: 'ispace',
    amount: 180,
    roundType: 'Series B',
    category: 'Emerging',
    leadInvestor: 'Japan Investment Corp',
    date: '2024-07-02',
    region: 'Asia',
  },
  {
    id: 9,
    company: 'Telesat',
    companySlug: 'telesat',
    amount: 400,
    roundType: 'Series B',
    category: 'Distribution',
    leadInvestor: 'Canada Pension Plan',
    date: '2024-05-19',
    region: 'Other',
  },
  {
    id: 10,
    company: 'Pixxel',
    companySlug: 'pixxel',
    amount: 36,
    roundType: 'Series A',
    category: 'Applications',
    leadInvestor: 'Google',
    date: '2024-04-11',
    region: 'Asia',
  },
  {
    id: 11,
    company: 'Astroscale',
    companySlug: 'astroscale',
    amount: 110,
    roundType: 'Series B',
    category: 'Emerging',
    leadInvestor: 'Mitsubishi UFJ Capital',
    date: '2024-02-20',
    region: 'Asia',
  },
  {
    id: 12,
    company: 'Sierra Space',
    companySlug: 'sierra-space',
    amount: 290,
    roundType: 'Series B',
    category: 'Infrastructure',
    leadInvestor: 'Coatue Management',
    date: '2024-01-08',
    region: 'US',
  },
  {
    id: 13,
    company: 'Impulse Space',
    companySlug: 'impulse-space',
    amount: 150,
    roundType: 'Series B',
    category: 'Infrastructure',
    leadInvestor: 'Founders Fund',
    date: '2023-11-15',
    region: 'US',
  },
  {
    id: 14,
    company: 'Satellogic',
    companySlug: 'satellogic',
    amount: 160,
    roundType: 'SPAC',
    category: 'Applications',
    leadInvestor: 'CF Acquisition Corp',
    date: '2023-09-22',
    region: 'Other',
  },
  {
    id: 15,
    company: 'Vast',
    companySlug: 'vast',
    amount: 100,
    roundType: 'Series A',
    category: 'Emerging',
    leadInvestor: 'Jed McCaleb',
    date: '2023-08-05',
    region: 'US',
  },
  {
    id: 16,
    company: 'Varda Space Industries',
    companySlug: 'varda-space',
    amount: 90,
    roundType: 'Series B',
    category: 'Emerging',
    leadInvestor: 'Khosla Ventures',
    date: '2023-06-12',
    region: 'US',
  },
  {
    id: 17,
    company: 'Arianespace',
    companySlug: 'arianespace',
    amount: 230,
    roundType: 'Series C',
    category: 'Infrastructure',
    leadInvestor: 'ESA / EU Investment',
    date: '2023-04-20',
    region: 'Europe',
  },
  {
    id: 18,
    company: 'Umbra',
    companySlug: 'umbra',
    amount: 72,
    roundType: 'Series B',
    category: 'Applications',
    leadInvestor: 'Tribe Capital',
    date: '2023-03-08',
    region: 'US',
  },
  {
    id: 19,
    company: 'Axiom Space',
    companySlug: 'axiom-space',
    amount: 350,
    roundType: 'Series C',
    category: 'Infrastructure',
    leadInvestor: 'Ares Management',
    date: '2022-12-10',
    region: 'US',
  },
  {
    id: 20,
    company: 'LeoLabs',
    companySlug: 'leolabs',
    amount: 65,
    roundType: 'Series B',
    category: 'Applications',
    leadInvestor: 'Insight Partners',
    date: '2022-10-18',
    region: 'US',
  },
  {
    id: 21,
    company: 'Momentus',
    companySlug: 'momentus',
    amount: 140,
    roundType: 'SPAC',
    category: 'Infrastructure',
    leadInvestor: 'Stable Road Capital',
    date: '2022-08-25',
    region: 'US',
  },
  {
    id: 22,
    company: 'AST SpaceMobile',
    companySlug: 'ast-spacemobile',
    amount: 462,
    roundType: 'SPAC',
    category: 'Distribution',
    leadInvestor: 'New Providence Acquisition',
    date: '2022-06-15',
    region: 'US',
  },
  {
    id: 23,
    company: 'D-Orbit',
    companySlug: 'd-orbit',
    amount: 110,
    roundType: 'Series B',
    category: 'Infrastructure',
    leadInvestor: 'Seraphim Space',
    date: '2022-04-03',
    region: 'Europe',
  },
  {
    id: 24,
    company: 'Muon Space',
    companySlug: 'muon-space',
    amount: 25,
    roundType: 'Seed',
    category: 'Applications',
    leadInvestor: 'Costanoa Ventures',
    date: '2022-02-14',
    region: 'US',
  },
  {
    id: 25,
    company: 'Stoke Space',
    companySlug: 'stoke-space',
    amount: 100,
    roundType: 'Series B',
    category: 'Infrastructure',
    leadInvestor: 'Industrious Ventures',
    date: '2021-11-30',
    region: 'US',
  },
  {
    id: 26,
    company: 'Firefly Aerospace',
    companySlug: 'firefly-aerospace',
    amount: 75,
    roundType: 'Series A',
    category: 'Infrastructure',
    leadInvestor: 'DADA Holdings',
    date: '2021-10-02',
    region: 'US',
  },
  {
    id: 27,
    company: 'BlackSky',
    companySlug: 'blacksky',
    amount: 450,
    roundType: 'SPAC',
    category: 'Applications',
    leadInvestor: 'Osprey Technology',
    date: '2021-09-15',
    region: 'US',
  },
  {
    id: 28,
    company: 'Virgin Orbit',
    companySlug: 'virgin-orbit',
    amount: 383,
    roundType: 'SPAC',
    category: 'Infrastructure',
    leadInvestor: 'NextGen Acquisition',
    date: '2021-07-20',
    region: 'US',
  },
  {
    id: 29,
    company: 'Skyroot Aerospace',
    companySlug: 'skyroot-aerospace',
    amount: 51,
    roundType: 'Series B',
    category: 'Infrastructure',
    leadInvestor: 'GIC Singapore',
    date: '2021-05-10',
    region: 'Asia',
  },
  {
    id: 30,
    company: 'Rivada Space Networks',
    companySlug: 'rivada-space',
    amount: 310,
    roundType: 'Series A',
    category: 'Distribution',
    leadInvestor: 'Rivada Networks',
    date: '2021-03-22',
    region: 'Europe',
  },
  {
    id: 31,
    company: 'SpinLaunch',
    companySlug: 'spinlaunch',
    amount: 71,
    roundType: 'Series A',
    category: 'Emerging',
    leadInvestor: 'Google Ventures',
    date: '2020-11-18',
    region: 'US',
  },
  {
    id: 32,
    company: 'Capella Space',
    companySlug: 'capella-space',
    amount: 97,
    roundType: 'Series C',
    category: 'Applications',
    leadInvestor: 'NVP',
    date: '2020-09-05',
    region: 'US',
  },
  {
    id: 33,
    company: 'Terran Orbital',
    companySlug: 'terran-orbital',
    amount: 230,
    roundType: 'SPAC',
    category: 'Infrastructure',
    leadInvestor: 'Tailwind Two Acquisition',
    date: '2020-07-12',
    region: 'US',
  },
  {
    id: 34,
    company: 'ClearSpace',
    companySlug: 'clearspace',
    amount: 29,
    roundType: 'Series A',
    category: 'Emerging',
    leadInvestor: 'Lux Capital',
    date: '2020-05-20',
    region: 'Europe',
  },
  {
    id: 35,
    company: 'True Anomaly',
    companySlug: 'true-anomaly',
    amount: 32,
    roundType: 'Seed',
    category: 'Emerging',
    leadInvestor: 'Eclipse Ventures',
    date: '2020-03-15',
    region: 'US',
  },
];

const TOP_INVESTORS: TopInvestor[] = [
  {
    name: 'Andreessen Horowitz (a16z)',
    dealCount: 28,
    totalInvestedBillions: 3.8,
    notableDeals: ['SpaceX', 'Relativity Space', 'Rocket Lab'],
  },
  {
    name: 'Founders Fund',
    dealCount: 24,
    totalInvestedBillions: 3.2,
    notableDeals: ['SpaceX', 'Planet Labs', 'Impulse Space'],
  },
  {
    name: 'Space Capital',
    dealCount: 22,
    totalInvestedBillions: 1.4,
    notableDeals: ['Hawkeye 360', 'Pixxel', 'Muon Space'],
  },
  {
    name: 'Bessemer Venture Partners',
    dealCount: 19,
    totalInvestedBillions: 1.8,
    notableDeals: ['Rocket Lab', 'Spire Global', 'Planet Labs'],
  },
  {
    name: 'SoftBank Group',
    dealCount: 15,
    totalInvestedBillions: 4.1,
    notableDeals: ['OneWeb', 'Satellogic', 'BlackSky'],
  },
  {
    name: 'Seraphim Space',
    dealCount: 38,
    totalInvestedBillions: 0.9,
    notableDeals: ['D-Orbit', 'Astroscale', 'LeoLabs'],
  },
  {
    name: 'Khosla Ventures',
    dealCount: 14,
    totalInvestedBillions: 1.1,
    notableDeals: ['Varda Space', 'Astranis', 'Momentus'],
  },
  {
    name: 'Fidelity Investments',
    dealCount: 12,
    totalInvestedBillions: 2.6,
    notableDeals: ['SpaceX', 'Relativity Space', 'Sierra Space'],
  },
  {
    name: 'Google Ventures (GV)',
    dealCount: 11,
    totalInvestedBillions: 0.8,
    notableDeals: ['SpinLaunch', 'Planet Labs', 'CesiumAstro'],
  },
  {
    name: 'Lockheed Martin Ventures',
    dealCount: 16,
    totalInvestedBillions: 0.7,
    notableDeals: ['Terran Orbital', 'Rocket Lab', 'ABL Space'],
  },
];

const CATEGORY_BREAKDOWN: CategoryBreakdown[] = [
  {
    name: 'Infrastructure',
    totalBillions: 21.8,
    deals: 285,
    description: 'Launch vehicles, manufacturing, space stations, orbital logistics',
    color: 'text-blue-400',
    barColor: 'from-blue-500 to-blue-400',
  },
  {
    name: 'Distribution',
    totalBillions: 14.2,
    deals: 156,
    description: 'Satellite communications, broadband constellations, relay networks',
    color: 'text-purple-400',
    barColor: 'from-purple-500 to-purple-400',
  },
  {
    name: 'Applications',
    totalBillions: 12.6,
    deals: 210,
    description: 'Earth observation, geospatial analytics, weather, navigation',
    color: 'text-emerald-400',
    barColor: 'from-emerald-500 to-emerald-400',
  },
  {
    name: 'Emerging',
    totalBillions: 4.7,
    deals: 139,
    description: 'In-space manufacturing, debris removal, space mining, habitats',
    color: 'text-amber-400',
    barColor: 'from-amber-500 to-amber-400',
  },
];

const GEO_DISTRIBUTION: GeoDistribution[] = [
  { region: 'US', percentage: 62, totalBillions: 33.1, deals: 489, color: 'from-white to-blue-500' },
  { region: 'Europe', percentage: 18, totalBillions: 9.6, deals: 142, color: 'from-purple-500 to-pink-500' },
  { region: 'Asia', percentage: 14, totalBillions: 7.5, deals: 110, color: 'from-amber-500 to-orange-500' },
  { region: 'Other', percentage: 6, totalBillions: 3.1, deals: 49, color: 'from-emerald-500 to-teal-500' },
];

// ────────────────────────────────────────
// Annual summary derived from quarterly data
// ────────────────────────────────────────

const ANNUAL_SUMMARY: { year: number; totalBillions: number; deals: number }[] = [
  { year: 2020, totalBillions: 7.6, deals: 120 },
  { year: 2021, totalBillions: 15.4, deals: 160 },
  { year: 2022, totalBillions: 8.1, deals: 140 },
  { year: 2023, totalBillions: 8.9, deals: 130 },
  { year: 2024, totalBillions: 7.5, deals: 125 },
  { year: 2025, totalBillions: 5.8, deals: 115 },
];

// ────────────────────────────────────────
// Filter Options
// ────────────────────────────────────────

const YEAR_OPTIONS: { value: YearFilter; label: string }[] = [
  { value: '', label: 'All Years' },
  { value: '2025', label: '2025' },
  { value: '2024', label: '2024' },
  { value: '2023', label: '2023' },
  { value: '2022', label: '2022' },
  { value: '2021', label: '2021' },
  { value: '2020', label: '2020' },
];

const CATEGORY_OPTIONS: { value: Category | ''; label: string }[] = [
  { value: '', label: 'All Categories' },
  { value: 'Infrastructure', label: 'Infrastructure' },
  { value: 'Distribution', label: 'Distribution' },
  { value: 'Applications', label: 'Applications' },
  { value: 'Emerging', label: 'Emerging' },
];

const ROUND_TYPE_OPTIONS: { value: RoundTypeFilter; label: string }[] = [
  { value: '', label: 'All Round Types' },
  { value: 'Seed', label: 'Seed' },
  { value: 'Series A', label: 'Series A' },
  { value: 'Series B', label: 'Series B' },
  { value: 'Series C', label: 'Series C' },
  { value: 'SPAC', label: 'SPAC' },
  { value: 'IPO', label: 'IPO' },
];

// ────────────────────────────────────────
// Helpers
// ────────────────────────────────────────

function formatAmount(value: number): string {
  if (value >= 1000) return `$${(value / 1000).toFixed(1)}B`;
  return `$${value.toFixed(0)}M`;
}

function formatBillions(value: number): string {
  return `$${value.toFixed(1)}B`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

const ROUND_TYPE_COLORS: Record<string, string> = {
  'Seed': 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  'Series A': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  'Series B': 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  'Series C': 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  'Series N': 'bg-red-500/20 text-red-400 border-red-500/30',
  'Series E': 'bg-red-500/20 text-red-400 border-red-500/30',
  'SPAC': 'bg-white/10 text-white/70 border-white/10',
  'IPO': 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
};

function getRoundColor(roundType: string): string {
  return ROUND_TYPE_COLORS[roundType] || 'bg-slate-700/50 text-white/70 border-white/[0.1]';
}

// ────────────────────────────────────────
// Main Component
// ────────────────────────────────────────

export default function InvestmentTrackerPage() {
  const [yearFilter, setYearFilter] = useState<YearFilter>('');
  const [categoryFilter, setCategoryFilter] = useState<Category | ''>('');
  const [roundTypeFilter, setRoundTypeFilter] = useState<RoundTypeFilter>('');
  const [hoveredBar, setHoveredBar] = useState<string | null>(null);

  // Filtered rounds
  const filteredRounds = useMemo(() => {
    return RECENT_ROUNDS.filter((round) => {
      if (yearFilter && !round.date.startsWith(yearFilter)) return false;
      if (categoryFilter && round.category !== categoryFilter) return false;
      if (roundTypeFilter && round.roundType !== roundTypeFilter) return false;
      return true;
    });
  }, [yearFilter, categoryFilter, roundTypeFilter]);

  // Filtered quarterly data
  const filteredQuarterly = useMemo(() => {
    if (!yearFilter) return QUARTERLY_DATA;
    return QUARTERLY_DATA.filter((q) => q.year === parseInt(yearFilter));
  }, [yearFilter]);

  // Compute key metrics from filtered data
  const metrics = useMemo(() => {
    const totalInvestment = filteredRounds.reduce((sum, r) => sum + r.amount, 0);
    const dealCount = filteredRounds.length;
    const avgDealSize = dealCount > 0 ? totalInvestment / dealCount : 0;
    const largestRound = filteredRounds.length > 0
      ? Math.max(...filteredRounds.map((r) => r.amount))
      : 0;
    return { totalInvestment, dealCount, avgDealSize, largestRound };
  }, [filteredRounds]);

  // Max quarterly value for chart scaling
  const maxQuarterly = useMemo(() => {
    return Math.max(...QUARTERLY_DATA.map((q) => q.totalBillions), 1);
  }, []);

  // Max category value for horizontal bar scaling
  const maxCategory = useMemo(() => {
    return Math.max(...CATEGORY_BREAKDOWN.map((c) => c.totalBillions), 1);
  }, []);

  const hasFilters = yearFilter || categoryFilter || roundTypeFilter;

  return (
    <div className="min-h-screen bg-black">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AnimatedPageHeader
          title="Space Investment Tracker"
          subtitle="Interactive overview of global space industry investment activity, funding trends, and capital allocation from 2020 to 2025"
          icon={<span>📈</span>}
          breadcrumb="SpaceNexus / Investment Intelligence"
          accentColor="cyan"
        />

        {/* ── Key Metrics ── */}
        <ScrollReveal>
          <StaggerContainer className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <StaggerItem>
              <div className="bg-white/[0.04] rounded-xl border border-white/[0.06] p-5 text-center hover:border-white/10 transition-colors">
                <div className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-slate-300 to-blue-400 bg-clip-text text-transparent">
                  {formatAmount(metrics.totalInvestment)}
                </div>
                <div className="text-slate-400 text-xs uppercase tracking-widest mt-1">
                  {yearFilter ? `Total Investment ${yearFilter}` : 'Total Investment (Filtered)'}
                </div>
              </div>
            </StaggerItem>
            <StaggerItem>
              <div className="bg-white/[0.04] rounded-xl border border-white/[0.06] p-5 text-center hover:border-purple-500/30 transition-colors">
                <div className="text-2xl md:text-3xl font-bold text-purple-400">
                  {metrics.dealCount}
                </div>
                <div className="text-slate-400 text-xs uppercase tracking-widest mt-1">
                  Number of Deals
                </div>
              </div>
            </StaggerItem>
            <StaggerItem>
              <div className="bg-white/[0.04] rounded-xl border border-white/[0.06] p-5 text-center hover:border-emerald-500/30 transition-colors">
                <div className="text-2xl md:text-3xl font-bold text-emerald-400">
                  {metrics.avgDealSize >= 1000
                    ? `$${(metrics.avgDealSize / 1000).toFixed(2)}B`
                    : `$${metrics.avgDealSize.toFixed(0)}M`}
                </div>
                <div className="text-slate-400 text-xs uppercase tracking-widest mt-1">
                  Average Deal Size
                </div>
              </div>
            </StaggerItem>
            <StaggerItem>
              <div className="bg-white/[0.04] rounded-xl border border-white/[0.06] p-5 text-center hover:border-amber-500/30 transition-colors">
                <div className="text-2xl md:text-3xl font-bold text-amber-400">
                  {formatAmount(metrics.largestRound)}
                </div>
                <div className="text-slate-400 text-xs uppercase tracking-widest mt-1">
                  Largest Round
                </div>
              </div>
            </StaggerItem>
          </StaggerContainer>
        </ScrollReveal>

        {/* ── Filter Bar ── */}
        <ScrollReveal>
          <div className="bg-white/[0.04] rounded-xl border border-white/[0.06] p-4 mb-8">
            <div className="flex flex-wrap gap-4 items-end">
              <div>
                <label className="block text-slate-400 text-xs mb-1 uppercase tracking-wider">Year</label>
                <select
                  value={yearFilter}
                  onChange={(e) => setYearFilter(e.target.value as YearFilter)}
                  className="bg-black border border-white/[0.08] text-white rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-white/30 focus:border-white/15 outline-none"
                >
                  {YEAR_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-slate-400 text-xs mb-1 uppercase tracking-wider">Category</label>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value as Category | '')}
                  className="bg-black border border-white/[0.08] text-white rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-white/30 focus:border-white/15 outline-none"
                >
                  {CATEGORY_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-slate-400 text-xs mb-1 uppercase tracking-wider">Round Type</label>
                <select
                  value={roundTypeFilter}
                  onChange={(e) => setRoundTypeFilter(e.target.value as RoundTypeFilter)}
                  className="bg-black border border-white/[0.08] text-white rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-white/30 focus:border-white/15 outline-none"
                >
                  {ROUND_TYPE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              {hasFilters && (
                <button
                  onClick={() => {
                    setYearFilter('');
                    setCategoryFilter('');
                    setRoundTypeFilter('');
                  }}
                  className="text-sm text-slate-400 hover:text-white transition-colors pb-2 underline underline-offset-2"
                >
                  Clear All Filters
                </button>
              )}
            </div>
          </div>
        </ScrollReveal>

        {/* ── Investment by Category + Geographic Distribution ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Category Breakdown */}
          <ScrollReveal>
            <div className="bg-white/[0.04] rounded-xl border border-white/[0.06] p-6 h-full">
              <h2 className="text-lg font-semibold text-white mb-1 flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center text-sm">
                  <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
                  </svg>
                </span>
                Investment by Category
              </h2>
              <p className="text-slate-400 text-sm mb-5">Space Capital framework: cumulative 2020-2025</p>
              <div className="space-y-4">
                {CATEGORY_BREAKDOWN.map((cat) => {
                  const widthPct = (cat.totalBillions / maxCategory) * 100;
                  return (
                    <div key={cat.name}>
                      <div className="flex justify-between items-center mb-1.5">
                        <div>
                          <span className={`font-semibold text-sm ${cat.color}`}>{cat.name}</span>
                          <span className="text-slate-500 text-xs ml-2">({cat.deals} deals)</span>
                        </div>
                        <span className="text-white font-mono text-sm font-bold">{formatBillions(cat.totalBillions)}</span>
                      </div>
                      <div className="w-full bg-slate-700/30 rounded-full h-3">
                        <div
                          className={`bg-gradient-to-r ${cat.barColor} h-3 rounded-full transition-all duration-700`}
                          style={{ width: `${Math.max(widthPct, 3)}%` }}
                        />
                      </div>
                      <p className="text-slate-500 text-xs mt-1">{cat.description}</p>
                    </div>
                  );
                })}
              </div>
              <div className="mt-4 pt-3 border-t border-white/[0.04]">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Total Tracked</span>
                  <span className="text-white font-bold font-mono">
                    {formatBillions(CATEGORY_BREAKDOWN.reduce((s, c) => s + c.totalBillions, 0))}
                  </span>
                </div>
              </div>
            </div>
          </ScrollReveal>

          {/* Geographic Distribution */}
          <ScrollReveal>
            <div className="bg-white/[0.04] rounded-xl border border-white/[0.06] p-6 h-full">
              <h2 className="text-lg font-semibold text-white mb-1 flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center text-sm">
                  <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </span>
                Geographic Distribution
              </h2>
              <p className="text-slate-400 text-sm mb-5">Capital allocation by region, 2020-2025</p>
              <div className="space-y-5">
                {GEO_DISTRIBUTION.map((geo) => (
                  <div key={geo.region}>
                    <div className="flex justify-between items-center mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-white font-semibold text-sm">{geo.region}</span>
                        <span className="text-slate-500 text-xs">({geo.deals} deals)</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-slate-400 text-sm font-mono">{formatBillions(geo.totalBillions)}</span>
                        <span className="text-white font-bold text-sm w-10 text-right">{geo.percentage}%</span>
                      </div>
                    </div>
                    <div className="w-full bg-slate-700/30 rounded-full h-3">
                      <div
                        className={`bg-gradient-to-r ${geo.color} h-3 rounded-full transition-all duration-700`}
                        style={{ width: `${geo.percentage}%` }}
                      />

        <RelatedModules modules={PAGE_RELATIONS['investment-tracker']} />
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-6 p-3 bg-black/50 rounded-lg border border-white/[0.04]">
                <p className="text-slate-400 text-xs">
                  The US continues to dominate space venture investment, driven by SpaceX, launch startups, and defense-adjacent ventures.
                  Europe is growing through ESA-backed programs and UK-based companies.
                  Asia is accelerating with Japanese, Indian, and Singaporean space startups.
                </p>
              </div>
            </div>
          </ScrollReveal>
        </div>

        {/* ── Investment Trends by Quarter (CSS Bar Chart) ── */}
        <ScrollReveal>
          <div className="bg-white/[0.04] rounded-xl border border-white/[0.06] p-6 mb-8">
            <h2 className="text-lg font-semibold text-white mb-1 flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center text-sm">
                <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </span>
              Quarterly Investment Trends (2020-2025)
            </h2>
            <p className="text-slate-400 text-sm mb-6">
              Quarterly space industry venture capital and public market activity
            </p>

            {/* Annual summary pills */}
            <div className="flex flex-wrap gap-2 mb-6">
              {ANNUAL_SUMMARY.map((y) => (
                <button
                  key={y.year}
                  onClick={() => setYearFilter(yearFilter === String(y.year) ? '' : String(y.year) as YearFilter)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                    yearFilter === String(y.year)
                      ? 'bg-white/10 text-white/70 border-white/15'
                      : 'bg-white/[0.06] text-slate-400 border-white/[0.08] hover:border-white/[0.1]'
                  }`}
                >
                  {y.year}: {formatBillions(y.totalBillions)} / {y.deals} deals
                </button>
              ))}
            </div>

            {/* Bar Chart */}
            <div className="relative">
              {/* Y-axis labels */}
              <div className="flex items-end gap-1 sm:gap-1.5 overflow-x-auto pb-2" style={{ minHeight: '260px' }}>
                {filteredQuarterly.map((q) => {
                  const heightPct = (q.totalBillions / maxQuarterly) * 100;
                  const barKey = `${q.year}-${q.quarter}`;
                  const isHovered = hoveredBar === barKey;
                  const isPeakYear = q.year === 2021;
                  return (
                    <div
                      key={barKey}
                      className="flex-1 flex flex-col items-center justify-end gap-1 min-w-[32px] relative"
                      onMouseEnter={() => setHoveredBar(barKey)}
                      onMouseLeave={() => setHoveredBar(null)}
                    >
                      {/* Tooltip */}
                      {isHovered && (
                        <div className="absolute -top-16 left-1/2 -translate-x-1/2 bg-slate-700 border border-white/[0.1] rounded-lg px-3 py-2 shadow-xl z-10 whitespace-nowrap">
                          <div className="text-white text-xs font-bold">{formatBillions(q.totalBillions)}</div>
                          <div className="text-slate-400 text-xs">{q.dealCount} deals</div>
                          <div className="text-slate-500 text-xs">{q.quarter} {q.year}</div>
                        </div>
                      )}

                      {/* Value label */}
                      <div className={`text-xs font-medium transition-colors ${isHovered ? 'text-white' : 'text-slate-500'}`}>
                        {q.totalBillions >= 1 ? `$${q.totalBillions.toFixed(1)}B` : `$${(q.totalBillions * 1000).toFixed(0)}M`}
                      </div>

                      {/* Bar */}
                      <div
                        className={`w-full max-w-[36px] rounded-t-md transition-all duration-500 cursor-pointer ${
                          isPeakYear
                            ? 'bg-gradient-to-t from-slate-200 to-slate-400'
                            : 'bg-gradient-to-t from-slate-600 to-slate-400'
                        } ${isHovered ? 'opacity-100 scale-x-110' : 'opacity-80 hover:opacity-100'}`}
                        style={{
                          height: `${Math.max(heightPct * 1.8, 6)}px`,
                        }}
                      />

                      {/* Quarter label */}
                      <div className={`text-xs font-medium transition-colors ${isHovered ? 'text-white' : 'text-slate-500'}`}>
                        {q.quarter}
                      </div>

                      {/* Year label (only on Q1) */}
                      {q.quarter === 'Q1' && (
                        <div className="text-xs text-white/70 font-semibold">{q.year}</div>
                      )}
                      {q.quarter !== 'Q1' && (
                        <div className="text-xs text-transparent select-none">&nbsp;</div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Baseline */}
              <div className="border-t border-white/[0.06] mt-1" />
            </div>

            {/* Peak annotation */}
            <div className="mt-4 flex flex-wrap items-center gap-4 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-sm bg-gradient-to-t from-slate-200 to-slate-400" />
                <span className="text-slate-400">2021 peak (SPAC boom)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-sm bg-gradient-to-t from-slate-600 to-slate-400" />
                <span className="text-slate-400">Other quarters</span>
              </div>
              <span className="text-slate-600">|</span>
              <span className="text-slate-500">Hover bars for details</span>
            </div>
          </div>
        </ScrollReveal>

        {/* ── Recent Funding Rounds + Top Investors ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Top 10 Recent Funding Rounds */}
          <ScrollReveal>
            <div className="bg-white/[0.04] rounded-xl border border-white/[0.06] p-6 h-full">
              <h2 className="text-lg font-semibold text-white mb-1 flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center text-sm">
                  <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </span>
                {hasFilters ? 'Filtered' : 'Top 10 Recent'} Funding Rounds
              </h2>
              <p className="text-slate-400 text-sm mb-4">
                {hasFilters
                  ? `${filteredRounds.length} rounds matching filters`
                  : 'Largest and most notable recent rounds'}
              </p>
              <div className="space-y-2">
                {filteredRounds.slice(0, 10).map((round, i) => (
                  <div
                    key={round.id}
                    className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-white/[0.06] transition-colors group"
                  >
                    <span className="text-lg font-bold text-slate-600 w-6 text-right shrink-0">
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Link
                          href={`/company-profiles/${round.companySlug}`}
                          className="text-white font-medium text-sm hover:text-white transition-colors truncate"
                        >
                          {round.company}
                        </Link>
                        <span className={`text-xs px-2 py-0.5 rounded border ${getRoundColor(round.roundType)}`}>
                          {round.roundType}
                        </span>
                      </div>
                      <div className="text-slate-500 text-xs mt-0.5">
                        {formatDate(round.date)} -- Led by {round.leadInvestor}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-emerald-400 font-mono font-bold text-sm">
                        {formatAmount(round.amount)}
                      </div>
                      <div className="text-slate-600 text-xs">{round.category}</div>
                    </div>
                  </div>
                ))}
                {filteredRounds.length === 0 && (
                  <div className="text-center py-8 text-slate-500">
                    <p className="text-sm">No rounds match the current filters.</p>
                    <button
                      onClick={() => {
                        setYearFilter('');
                        setCategoryFilter('');
                        setRoundTypeFilter('');
                      }}
                      className="text-white/70 text-sm mt-2 hover:underline"
                    >
                      Clear filters
                    </button>
                  </div>
                )}
              </div>
              {filteredRounds.length > 10 && (
                <div className="mt-3 pt-3 border-t border-white/[0.04] text-center">
                  <span className="text-slate-500 text-xs">
                    Showing 10 of {filteredRounds.length} matching rounds
                  </span>
                </div>
              )}
            </div>
          </ScrollReveal>

          {/* Top 10 Space Investors */}
          <ScrollReveal>
            <div className="bg-white/[0.04] rounded-xl border border-white/[0.06] p-6 h-full">
              <h2 className="text-lg font-semibold text-white mb-1 flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-sm">
                  <svg className="w-4 h-4 text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </span>
                Top 10 Space Investors
              </h2>
              <p className="text-slate-400 text-sm mb-4">By deal count and total capital deployed</p>
              <div className="space-y-2">
                {TOP_INVESTORS.map((inv, i) => (
                  <div
                    key={inv.name}
                    className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-white/[0.06] transition-colors"
                  >
                    <span className="text-lg font-bold text-slate-600 w-6 text-right shrink-0">
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="text-white font-medium text-sm truncate">
                        {inv.name}
                      </div>
                      <div className="text-slate-500 text-xs mt-0.5 truncate">
                        {inv.notableDeals.join(', ')}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-white/70 font-mono text-sm font-bold">
                        {inv.dealCount} deals
                      </div>
                      <div className="text-slate-500 text-xs font-mono">
                        {formatBillions(inv.totalInvestedBillions)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </ScrollReveal>
        </div>

        {/* ── Year-over-Year Comparison Table ── */}
        <ScrollReveal>
          <div className="bg-white/[0.04] rounded-xl border border-white/[0.06] p-6 mb-8">
            <h2 className="text-lg font-semibold text-white mb-1 flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center text-sm">
                <svg className="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </span>
              Year-over-Year Summary
            </h2>
            <p className="text-slate-400 text-sm mb-4">Annual space investment overview</p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/[0.06]">
                    <th className="text-left text-slate-400 pb-3 font-medium">Year</th>
                    <th className="text-right text-slate-400 pb-3 font-medium">Total Investment</th>
                    <th className="text-right text-slate-400 pb-3 font-medium">Deals</th>
                    <th className="text-right text-slate-400 pb-3 font-medium">Avg Deal Size</th>
                    <th className="text-right text-slate-400 pb-3 font-medium hidden sm:table-cell">YoY Change</th>
                    <th className="text-left text-slate-400 pb-3 pl-4 font-medium hidden md:table-cell">Trend</th>
                  </tr>
                </thead>
                <tbody>
                  {ANNUAL_SUMMARY.map((y, i) => {
                    const prevYear = i > 0 ? ANNUAL_SUMMARY[i - 1] : null;
                    const yoyChange = prevYear
                      ? ((y.totalBillions - prevYear.totalBillions) / prevYear.totalBillions * 100)
                      : 0;
                    const avgDeal = y.totalBillions / y.deals * 1000; // in millions
                    const barWidth = (y.totalBillions / 15.4) * 100; // relative to peak
                    return (
                      <tr
                        key={y.year}
                        className={`border-b border-white/[0.04] hover:bg-slate-700/20 transition-colors cursor-pointer ${
                          yearFilter === String(y.year) ? 'bg-white/5' : ''
                        }`}
                        onClick={() => setYearFilter(yearFilter === String(y.year) ? '' : String(y.year) as YearFilter)}
                      >
                        <td className="py-3 text-white font-semibold">
                          {y.year}
                          {y.year === 2025 && (
                            <span className="ml-1.5 text-xs text-slate-500 font-normal">(YTD Q3)</span>
                          )}
                        </td>
                        <td className="py-3 text-right text-emerald-400 font-mono font-bold">
                          {formatBillions(y.totalBillions)}
                        </td>
                        <td className="py-3 text-right text-white/70 font-mono">{y.deals}</td>
                        <td className="py-3 text-right text-white/70 font-mono">${avgDeal.toFixed(0)}M</td>
                        <td className="py-3 text-right hidden sm:table-cell">
                          {i === 0 ? (
                            <span className="text-slate-600">--</span>
                          ) : (
                            <span className={yoyChange >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                              {yoyChange >= 0 ? '+' : ''}{yoyChange.toFixed(1)}%
                            </span>
                          )}
                        </td>
                        <td className="py-3 pl-4 hidden md:table-cell">
                          <div className="w-full max-w-[120px] bg-slate-700/30 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full transition-all duration-500 ${
                                y.year === 2021
                                  ? 'bg-gradient-to-r from-white to-slate-400'
                                  : 'bg-gradient-to-r from-slate-500 to-slate-400'
                              }`}
                              style={{ width: `${Math.max(barWidth, 4)}%` }}
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </ScrollReveal>

        {/* ── Related Pages ── */}
        <ScrollReveal>
          <div className="bg-white/[0.04] rounded-xl border border-white/[0.06] p-6 mb-8">
            <h2 className="text-lg font-semibold text-white mb-4">Explore Related Intelligence</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Link
                href="/space-capital"
                className="group p-4 rounded-lg bg-black/50 border border-white/[0.04] hover:border-white/15 transition-all"
              >
                <div className="text-white/70 text-xl mb-2">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="text-white font-semibold text-sm group-hover:text-white transition-colors">Space Capital</div>
                <div className="text-slate-500 text-xs mt-1">VC landscape and investor profiles</div>
              </Link>
              <Link
                href="/funding-tracker"
                className="group p-4 rounded-lg bg-black/50 border border-white/[0.04] hover:border-emerald-500/40 transition-all"
              >
                <div className="text-emerald-400 text-xl mb-2">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
                <div className="text-white font-semibold text-sm group-hover:text-emerald-400 transition-colors">Funding Tracker</div>
                <div className="text-slate-500 text-xs mt-1">Live deal feed and round details</div>
              </Link>
              <Link
                href="/space-economy"
                className="group p-4 rounded-lg bg-black/50 border border-white/[0.04] hover:border-purple-500/40 transition-all"
              >
                <div className="text-purple-400 text-xl mb-2">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="text-white font-semibold text-sm group-hover:text-purple-400 transition-colors">Space Economy</div>
                <div className="text-slate-500 text-xs mt-1">Global market size and projections</div>
              </Link>
              <Link
                href="/company-profiles"
                className="group p-4 rounded-lg bg-black/50 border border-white/[0.04] hover:border-amber-500/40 transition-all"
              >
                <div className="text-amber-400 text-xl mb-2">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <div className="text-white font-semibold text-sm group-hover:text-amber-400 transition-colors">Company Profiles</div>
                <div className="text-slate-500 text-xs mt-1">Detailed company intelligence</div>
              </Link>
            </div>
          </div>
        </ScrollReveal>

        {/* ── Data Sources Footer ── */}
        <ScrollReveal>
          <div className="bg-white/[0.03] rounded-xl border border-white/[0.04] p-6">
            <h4 className="text-slate-400 font-semibold text-sm mb-3">
              Data Sources & Methodology
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-xs text-slate-500">
              <div>Space Capital -- Quarterly Space IQ Reports</div>
              <div>Crunchbase -- Startup Funding Data</div>
              <div>PitchBook -- Private Market Intelligence</div>
              <div>SEC Filings (EDGAR) -- Public Disclosures</div>
              <div>Company Press Releases</div>
              <div>BryceTech -- State of the Space Industry</div>
            </div>
            <p className="text-slate-600 text-xs mt-3">
              Investment data is compiled from publicly available sources and reflects approximate totals.
              Categories follow the Space Capital infrastructure/distribution/applications framework.
              2025 figures are YTD through Q3. This is not investment advice.
              Always conduct your own due diligence before making investment decisions.
            </p>
          </div>
        </ScrollReveal>
      </div>
    </div>
  );
}
