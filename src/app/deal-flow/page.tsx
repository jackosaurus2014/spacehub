'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import AnimatedPageHeader from '@/components/ui/AnimatedPageHeader';
import ScrollReveal from '@/components/ui/ScrollReveal';
import BreadcrumbSchema from '@/components/seo/BreadcrumbSchema';
import EmptyState from '@/components/ui/EmptyState';
import RelatedModules from '@/components/ui/RelatedModules';
import { PAGE_RELATIONS } from '@/lib/module-relationships';

// ── Types ────────────────────────────────────────────────────────────

interface Deal {
  id: number;
  company: string;
  type: 'Funding' | 'M&A' | 'Contract' | 'Partnership' | 'SPAC' | 'IPO';
  amount: number | null;
  date: string;
  investors: string[];
  description: string;
  stage: string;
  sector: string;
}

// ── Filter & Sort Options ────────────────────────────────────────────

const DEAL_TYPES = [
  { value: '', label: 'All Types' },
  { value: 'Funding', label: 'Funding Rounds' },
  { value: 'M&A', label: 'Mergers & Acquisitions' },
  { value: 'Contract', label: 'Government Contracts' },
  { value: 'Partnership', label: 'Strategic Partnerships' },
  { value: 'SPAC', label: 'SPACs' },
  { value: 'IPO', label: 'IPOs' },
];

const SECTORS = [
  { value: '', label: 'All Sectors' },
  { value: 'Launch', label: 'Launch Services' },
  { value: 'Satellite', label: 'Satellite & Comms' },
  { value: 'Defense', label: 'Defense & National Security' },
  { value: 'Earth Observation', label: 'Earth Observation' },
  { value: 'Infrastructure', label: 'Space Infrastructure' },
  { value: 'Propulsion', label: 'Propulsion' },
  { value: 'Manufacturing', label: 'In-Space Manufacturing' },
  { value: 'Exploration', label: 'Exploration & Science' },
  { value: 'Ground Segment', label: 'Ground Segment' },
];

const YEARS = [
  { value: '', label: 'All Years' },
  { value: '2026', label: '2026' },
  { value: '2025', label: '2025' },
  { value: '2024', label: '2024' },
];

const SORT_OPTIONS = [
  { value: 'date', label: 'Date (Newest)' },
  { value: 'amount', label: 'Amount (Largest)' },
  { value: 'company', label: 'Company (A-Z)' },
];

// ── Deal Data ────────────────────────────────────────────────────────

const DEALS: Deal[] = [
  {
    id: 1,
    company: 'SpaceX',
    type: 'Funding',
    amount: 750_000_000,
    date: '2024-12-15',
    investors: ['Andreessen Horowitz', 'Sequoia Capital', 'Founders Fund'],
    description: 'Series N funding round at a $350B valuation, further cementing SpaceX as the most valuable private company in the world.',
    stage: 'Late Stage',
    sector: 'Launch',
  },
  {
    id: 2,
    company: 'L3Harris Technologies',
    type: 'M&A',
    amount: 4_700_000_000,
    date: '2024-07-28',
    investors: [],
    description: 'Completed acquisition of Aerojet Rocketdyne, consolidating propulsion technology and defense capabilities under one roof.',
    stage: 'Completed',
    sector: 'Defense',
  },
  {
    id: 3,
    company: 'Rocket Lab',
    type: 'Funding',
    amount: 515_000_000,
    date: '2025-03-12',
    investors: ['Bessemer Venture Partners', 'DCVC', 'Blackrock'],
    description: 'Capital raise to fund Neutron medium-lift vehicle development and expand spacecraft manufacturing capacity.',
    stage: 'Growth',
    sector: 'Launch',
  },
  {
    id: 4,
    company: 'Relativity Space',
    type: 'Funding',
    amount: 250_000_000,
    date: '2025-01-20',
    investors: ['Tiger Global', 'Fidelity Investments', 'Baillie Gifford'],
    description: 'Series E round to fund Terran R development, the fully reusable 3D-printed rocket targeting 2026 debut flight.',
    stage: 'Late Stage',
    sector: 'Launch',
  },
  {
    id: 5,
    company: 'Viasat',
    type: 'M&A',
    amount: 7_300_000_000,
    date: '2024-05-30',
    investors: [],
    description: 'Completed the acquisition of Inmarsat, creating a combined broadband satellite fleet serving aviation, maritime, and government sectors.',
    stage: 'Completed',
    sector: 'Satellite',
  },
  {
    id: 6,
    company: 'Impulse Space',
    type: 'Funding',
    amount: 150_000_000,
    date: '2025-06-08',
    investors: ['Founders Fund', 'a16z', 'Khosla Ventures'],
    description: 'Series C round to develop orbital transfer vehicles and expand last-mile delivery capabilities in space logistics.',
    stage: 'Growth',
    sector: 'Infrastructure',
  },
  {
    id: 7,
    company: 'Stoke Space',
    type: 'Funding',
    amount: 100_000_000,
    date: '2025-04-15',
    investors: ['Breakthrough Energy Ventures', 'Type One Ventures', 'Industrious Ventures'],
    description: 'Series B funding for fully reusable rocket development including the novel differential throttling upper stage.',
    stage: 'Early Growth',
    sector: 'Launch',
  },
  {
    id: 8,
    company: 'Anduril Industries',
    type: 'Funding',
    amount: 1_500_000_000,
    date: '2024-08-07',
    investors: ['Founders Fund', 'Andreessen Horowitz', '8VC'],
    description: 'Series F at $14B valuation for defense technology expansion including autonomous systems and space domain awareness.',
    stage: 'Late Stage',
    sector: 'Defense',
  },
  {
    id: 9,
    company: 'Sierra Space',
    type: 'Funding',
    amount: 290_000_000,
    date: '2024-11-05',
    investors: ['Coatue Management', 'Moore Strategic Ventures', 'General Atlantic'],
    description: 'Late-stage funding to advance the Dream Chaser spaceplane and LIFE orbital habitat module for commercial LEO destinations.',
    stage: 'Late Stage',
    sector: 'Infrastructure',
  },
  {
    id: 10,
    company: 'Vast',
    type: 'Funding',
    amount: 100_000_000,
    date: '2025-02-14',
    investors: ['Jared Isaacman', 'Framework Ventures'],
    description: 'Series B round to build Haven-1, the first commercial space station, targeting a 2026 launch aboard a SpaceX Falcon 9.',
    stage: 'Early Growth',
    sector: 'Infrastructure',
  },
  {
    id: 11,
    company: 'Planet Labs',
    type: 'Contract',
    amount: 230_000_000,
    date: '2025-05-22',
    investors: ['NRO'],
    description: 'Multi-year contract with the National Reconnaissance Office for daily global Earth observation imagery and analytics.',
    stage: 'Operational',
    sector: 'Earth Observation',
  },
  {
    id: 12,
    company: 'Firefly Aerospace',
    type: 'Funding',
    amount: 175_000_000,
    date: '2024-09-18',
    investors: ['AE Industrial Partners', 'Northrop Grumman'],
    description: 'Growth equity round to scale Alpha launch vehicle production and develop the MLV medium-lift rocket with Northrop.',
    stage: 'Growth',
    sector: 'Launch',
  },
  {
    id: 13,
    company: 'Axiom Space',
    type: 'Funding',
    amount: 350_000_000,
    date: '2025-07-10',
    investors: ['Boryung', 'C5 Capital', 'Aljazira Capital'],
    description: 'Series C to fund commercial ISS modules and development of the standalone Axiom Station in low Earth orbit.',
    stage: 'Growth',
    sector: 'Infrastructure',
  },
  {
    id: 14,
    company: 'SpaceX',
    type: 'Contract',
    amount: 2_900_000_000,
    date: '2024-04-10',
    investors: ['NASA'],
    description: 'Starship HLS contract modification for sustained lunar lander operations supporting Artemis V and subsequent missions.',
    stage: 'Operational',
    sector: 'Launch',
  },
  {
    id: 15,
    company: 'Terran Orbital',
    type: 'M&A',
    amount: 450_000_000,
    date: '2024-08-16',
    investors: ['Lockheed Martin'],
    description: 'Lockheed Martin acquired Terran Orbital to strengthen its position in small satellite manufacturing and rapid constellation deployment.',
    stage: 'Completed',
    sector: 'Satellite',
  },
  {
    id: 16,
    company: 'BlackSky Technology',
    type: 'Contract',
    amount: 320_000_000,
    date: '2025-09-01',
    investors: ['NGA', 'DoD'],
    description: 'Multi-year IDIQ contract with National Geospatial-Intelligence Agency for real-time monitoring and AI-driven analytics.',
    stage: 'Operational',
    sector: 'Earth Observation',
  },
  {
    id: 17,
    company: 'Astra Space',
    type: 'SPAC',
    amount: 500_000_000,
    date: '2024-02-14',
    investors: ['Holicity'],
    description: 'Completed SPAC merger with Holicity, raising $500M for small satellite launch operations and spacecraft engine development.',
    stage: 'Public',
    sector: 'Launch',
  },
  {
    id: 18,
    company: 'Muon Space',
    type: 'Funding',
    amount: 56_000_000,
    date: '2025-03-28',
    investors: ['Costanoa Ventures', 'Decisive Point', 'T. Rowe Price'],
    description: 'Series B funding to build climate-monitoring satellite constellation providing high-resolution environmental data.',
    stage: 'Early Growth',
    sector: 'Earth Observation',
  },
  {
    id: 19,
    company: 'True Anomaly',
    type: 'Funding',
    amount: 100_000_000,
    date: '2024-10-22',
    investors: ['Riot Ventures', 'Eclipse', 'Spark Capital'],
    description: 'Series B for space domain awareness and rendezvous proximity operations satellite platform for national security applications.',
    stage: 'Early Growth',
    sector: 'Defense',
  },
  {
    id: 20,
    company: 'Starfish Space',
    type: 'Funding',
    amount: 29_000_000,
    date: '2025-05-05',
    investors: ['Munich Re Ventures', 'NSI-MI Capital', 'PSL Ventures'],
    description: 'Series A to develop Otter satellite servicing vehicle for debris removal and life extension missions in orbit.',
    stage: 'Early',
    sector: 'Infrastructure',
  },
  {
    id: 21,
    company: 'K2 Space',
    type: 'Funding',
    amount: 50_000_000,
    date: '2025-08-17',
    investors: ['a16z', 'Khosla Ventures'],
    description: 'Series A for development of large, low-cost satellite buses aimed at disrupting the traditional satellite manufacturing market.',
    stage: 'Early',
    sector: 'Satellite',
  },
  {
    id: 22,
    company: 'York Space Systems',
    type: 'M&A',
    amount: 200_000_000,
    date: '2024-06-03',
    investors: ['Northrop Grumman'],
    description: 'Acquisition by Northrop Grumman to integrate York\'s standardized satellite bus production into their space systems division.',
    stage: 'Completed',
    sector: 'Satellite',
  },
  {
    id: 23,
    company: 'Telesat',
    type: 'Partnership',
    amount: 2_400_000_000,
    date: '2024-03-21',
    investors: ['MDA', 'Government of Canada'],
    description: 'Strategic partnership with MDA and Canadian government funding to deploy Lightspeed LEO broadband constellation.',
    stage: 'In Progress',
    sector: 'Satellite',
  },
  {
    id: 24,
    company: 'Ursa Major',
    type: 'Funding',
    amount: 138_000_000,
    date: '2024-12-01',
    investors: ['XN', 'Baillie Gifford', 'Abercross Holdings'],
    description: 'Series D round to scale modular rocket engine production and deliver propulsion systems for multiple launch providers.',
    stage: 'Growth',
    sector: 'Propulsion',
  },
  {
    id: 25,
    company: 'SpaceX',
    type: 'Contract',
    amount: 843_000_000,
    date: '2025-11-18',
    investors: ['U.S. Space Force'],
    description: 'National Security Space Launch Phase 3 Lane 1 contract for heavy-lift launches supporting national defense missions.',
    stage: 'Operational',
    sector: 'Defense',
  },
  {
    id: 26,
    company: 'Redwire Corporation',
    type: 'IPO',
    amount: 130_000_000,
    date: '2024-04-25',
    investors: [],
    description: 'Secondary offering raising additional public capital to fund in-space manufacturing capabilities and 3D bioprinting payloads.',
    stage: 'Public',
    sector: 'Manufacturing',
  },
  {
    id: 27,
    company: 'Apex Space',
    type: 'Funding',
    amount: 20_000_000,
    date: '2026-01-15',
    investors: ['Shield Capital', 'XYZ Ventures', 'Andreessen Horowitz'],
    description: 'Series A for standardized satellite bus platform offering rapid deployment timelines to government and commercial customers.',
    stage: 'Early',
    sector: 'Satellite',
  },
  {
    id: 28,
    company: 'Phantom Space',
    type: 'Funding',
    amount: 33_000_000,
    date: '2024-07-12',
    investors: ['Prime Movers Lab', 'Seraphim Space'],
    description: 'Series B funding for Daytona small launch vehicle and vertically integrated satellite manufacturing facility.',
    stage: 'Early Growth',
    sector: 'Launch',
  },
  {
    id: 29,
    company: 'Astroscale',
    type: 'Funding',
    amount: 76_000_000,
    date: '2025-10-05',
    investors: ['Mitsubishi Electric', 'Seraphim Space', 'SMBC Group'],
    description: 'Series G funding to scale orbital debris removal services and satellite life extension operations globally.',
    stage: 'Growth',
    sector: 'Infrastructure',
  },
  {
    id: 30,
    company: 'Isar Aerospace',
    type: 'Funding',
    amount: 165_000_000,
    date: '2025-02-20',
    investors: ['HV Capital', 'Lombard Odier', 'Earlybird'],
    description: 'Series C for Spectrum launch vehicle, competing in the European small-to-medium lift market with 2026 maiden flight planned.',
    stage: 'Growth',
    sector: 'Launch',
  },
  {
    id: 31,
    company: 'Amazon / Project Kuiper',
    type: 'Partnership',
    amount: 10_000_000_000,
    date: '2024-01-08',
    investors: ['Amazon', 'ULA', 'Arianespace', 'Blue Origin'],
    description: 'Secured launch agreements with ULA, Arianespace, and Blue Origin for deploying the 3,236-satellite Kuiper broadband constellation.',
    stage: 'In Progress',
    sector: 'Satellite',
  },
  {
    id: 32,
    company: 'Spire Global',
    type: 'Contract',
    amount: 94_000_000,
    date: '2026-02-10',
    investors: ['European Space Agency', 'NOAA'],
    description: 'Multi-year data contracts with ESA and NOAA for space-based radio occultation weather data and maritime tracking.',
    stage: 'Operational',
    sector: 'Earth Observation',
  },
  {
    id: 33,
    company: 'Momentus',
    type: 'SPAC',
    amount: 310_000_000,
    date: '2024-03-05',
    investors: ['Stable Road Capital'],
    description: 'Post-SPAC capital infusion supporting Vigoride orbital transfer vehicle deployment and in-space transportation services.',
    stage: 'Public',
    sector: 'Infrastructure',
  },
  {
    id: 34,
    company: 'Northrop Grumman',
    type: 'Contract',
    amount: 3_200_000_000,
    date: '2025-12-04',
    investors: ['U.S. Space Force', 'SDA'],
    description: 'Space Development Agency Tranche 2 Transport Layer contract for proliferated LEO missile tracking and data relay satellites.',
    stage: 'Operational',
    sector: 'Defense',
  },
  {
    id: 35,
    company: 'Quilty Space',
    type: 'Partnership',
    amount: null,
    date: '2025-06-30',
    investors: ['Space Capital', 'Seraphim Space'],
    description: 'Strategic advisory partnership to provide space industry M&A advisory and market intelligence to institutional investors.',
    stage: 'Active',
    sector: 'Ground Segment',
  },
  {
    id: 36,
    company: 'Orbit Fab',
    type: 'Funding',
    amount: 28_500_000,
    date: '2026-01-28',
    investors: ['U.S. Innovative Technology Fund', 'Munich Re Ventures'],
    description: 'Series A extension for in-orbit refueling depot development and RAFTI fueling port standard adoption across satellite primes.',
    stage: 'Early',
    sector: 'Infrastructure',
  },
  {
    id: 37,
    company: 'Sidus Space',
    type: 'IPO',
    amount: 25_000_000,
    date: '2024-10-09',
    investors: [],
    description: 'Nasdaq IPO raising capital for LizzieSat multi-mission satellite platform manufacturing and deployment for commercial customers.',
    stage: 'Public',
    sector: 'Satellite',
  },
  {
    id: 38,
    company: 'ABL Space Systems',
    type: 'Contract',
    amount: 87_000_000,
    date: '2025-04-02',
    investors: ['U.S. Space Force'],
    description: 'Responsive launch contract under the Rocket Systems Launch Program for rapid-deployment RS1 rocket missions from austere sites.',
    stage: 'Operational',
    sector: 'Launch',
  },
];

// ── Helpers ──────────────────────────────────────────────────────────

function formatCurrency(value: number): string {
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(1)}B`;
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(0)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return `$${value.toFixed(0)}`;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function getDealTypeBadgeClasses(type: Deal['type']): string {
  switch (type) {
    case 'Funding':
      return 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30';
    case 'M&A':
      return 'bg-purple-500/20 text-purple-400 border border-purple-500/30';
    case 'Contract':
      return 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30';
    case 'Partnership':
      return 'bg-amber-500/20 text-amber-400 border border-amber-500/30';
    case 'SPAC':
      return 'bg-rose-500/20 text-rose-400 border border-rose-500/30';
    case 'IPO':
      return 'bg-blue-500/20 text-blue-400 border border-blue-500/30';
    default:
      return 'bg-slate-500/20 text-slate-400 border border-slate-500/30';
  }
}

function getStageBadgeClasses(stage: string): string {
  if (stage === 'Early' || stage === 'Seed') return 'text-lime-400';
  if (stage === 'Early Growth') return 'text-emerald-400';
  if (stage === 'Growth') return 'text-teal-400';
  if (stage === 'Late Stage') return 'text-cyan-400';
  if (stage === 'Operational') return 'text-sky-400';
  if (stage === 'Public') return 'text-blue-400';
  if (stage === 'Completed') return 'text-purple-400';
  if (stage === 'In Progress' || stage === 'Active') return 'text-amber-400';
  return 'text-slate-400';
}

// ── Component ────────────────────────────────────────────────────────

export default function DealFlowPage() {
  const [typeFilter, setTypeFilter] = useState('');
  const [sectorFilter, setSectorFilter] = useState('');
  const [yearFilter, setYearFilter] = useState('');
  const [sortBy, setSortBy] = useState('date');
  const [searchQuery, setSearchQuery] = useState('');

  // ── Filtered & Sorted Deals ──────────────────────────────────────

  const filteredDeals = useMemo(() => {
    let result = [...DEALS];

    // Type filter
    if (typeFilter) {
      result = result.filter((d) => d.type === typeFilter);
    }

    // Sector filter
    if (sectorFilter) {
      result = result.filter((d) => d.sector === sectorFilter);
    }

    // Year filter
    if (yearFilter) {
      result = result.filter((d) => d.date.startsWith(yearFilter));
    }

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (d) =>
          d.company.toLowerCase().includes(q) ||
          d.description.toLowerCase().includes(q) ||
          d.investors.some((inv) => inv.toLowerCase().includes(q))
      );
    }

    // Sort
    if (sortBy === 'date') {
      result.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    } else if (sortBy === 'amount') {
      result.sort((a, b) => (b.amount ?? 0) - (a.amount ?? 0));
    } else if (sortBy === 'company') {
      result.sort((a, b) => a.company.localeCompare(b.company));
    }

    return result;
  }, [typeFilter, sectorFilter, yearFilter, sortBy, searchQuery]);

  // ── Summary Stats ────────────────────────────────────────────────

  const stats = useMemo(() => {
    const withAmount = filteredDeals.filter((d) => d.amount !== null);
    const totalValue = withAmount.reduce((sum, d) => sum + (d.amount ?? 0), 0);
    const avgSize = withAmount.length > 0 ? totalValue / withAmount.length : 0;
    const largest = withAmount.length > 0 ? Math.max(...withAmount.map((d) => d.amount ?? 0)) : 0;

    return {
      totalValue,
      dealCount: filteredDeals.length,
      avgSize,
      largest,
    };
  }, [filteredDeals]);

  // ── Render ───────────────────────────────────────────────────────

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white">
      <BreadcrumbSchema items={[
        { name: 'Home', href: '/' },
        { name: 'Deal Flow' },
      ]} />
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* ── Header ─────────────────────────────────────────────── */}
        <AnimatedPageHeader
          title="Deal Flow Database"
          subtitle="Track funding rounds, M&A activity, government contracts, and strategic partnerships across the global space industry."
          icon="💼"
          accentColor="emerald"
        />

        {/* ── Summary Stats ──────────────────────────────────────── */}
        <ScrollReveal>
          <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
            <div className="card p-5">
              <p className="text-sm font-medium text-slate-400">Total Deal Value</p>
              <p className="mt-1 text-2xl font-bold text-emerald-400">
                {formatCurrency(stats.totalValue)}
              </p>
            </div>
            <div className="card p-5">
              <p className="text-sm font-medium text-slate-400">Deal Count</p>
              <p className="mt-1 text-2xl font-bold text-cyan-400">{stats.dealCount}</p>
            </div>
            <div className="card p-5">
              <p className="text-sm font-medium text-slate-400">Average Size</p>
              <p className="mt-1 text-2xl font-bold text-amber-400">
                {formatCurrency(stats.avgSize)}
              </p>
            </div>
            <div className="card p-5">
              <p className="text-sm font-medium text-slate-400">Largest Deal</p>
              <p className="mt-1 text-2xl font-bold text-purple-400">
                {formatCurrency(stats.largest)}
              </p>
            </div>
          </div>
        </ScrollReveal>

        {/* ── Filters & Search ───────────────────────────────────── */}
        <ScrollReveal delay={0.1}>
          <div className="mt-8 card p-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-6">
              {/* Search */}
              <div className="lg:col-span-2">
                <label htmlFor="deal-search" className="mb-1 block text-xs font-medium text-slate-400">
                  Search
                </label>
                <input
                  id="deal-search"
                  type="text"
                  placeholder="Company, investor, or keyword..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-lg border border-slate-600/50 bg-slate-900/50 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
                />
              </div>

              {/* Deal Type */}
              <div>
                <label htmlFor="deal-type" className="mb-1 block text-xs font-medium text-slate-400">
                  Deal Type
                </label>
                <select
                  id="deal-type"
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="w-full rounded-lg border border-slate-600/50 bg-slate-900/50 px-3 py-2 text-sm text-white focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
                >
                  {DEAL_TYPES.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Sector */}
              <div>
                <label htmlFor="deal-sector" className="mb-1 block text-xs font-medium text-slate-400">
                  Sector
                </label>
                <select
                  id="deal-sector"
                  value={sectorFilter}
                  onChange={(e) => setSectorFilter(e.target.value)}
                  className="w-full rounded-lg border border-slate-600/50 bg-slate-900/50 px-3 py-2 text-sm text-white focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
                >
                  {SECTORS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Year */}
              <div>
                <label htmlFor="deal-year" className="mb-1 block text-xs font-medium text-slate-400">
                  Year
                </label>
                <select
                  id="deal-year"
                  value={yearFilter}
                  onChange={(e) => setYearFilter(e.target.value)}
                  className="w-full rounded-lg border border-slate-600/50 bg-slate-900/50 px-3 py-2 text-sm text-white focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
                >
                  {YEARS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Sort */}
              <div>
                <label htmlFor="deal-sort" className="mb-1 block text-xs font-medium text-slate-400">
                  Sort By
                </label>
                <select
                  id="deal-sort"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full rounded-lg border border-slate-600/50 bg-slate-900/50 px-3 py-2 text-sm text-white focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
                >
                  {SORT_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </ScrollReveal>

        {/* ── Deal List ──────────────────────────────────────────── */}
        <ScrollReveal delay={0.2}>
          <div className="mt-8 space-y-4">
            {filteredDeals.length === 0 && (
              <EmptyState
                icon={<svg className="w-10 h-10 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" /></svg>}
                title="No deals found"
                description="No deals match your current filters. Try adjusting your criteria."
                action={
                  <button
                    onClick={() => {
                      setTypeFilter('');
                      setSectorFilter('');
                      setYearFilter('');
                      setSearchQuery('');
                    }}
                    className="text-sm font-medium text-emerald-400 hover:text-emerald-300 transition-colors"
                  >
                    Clear all filters
                  </button>
                }
              />
            )}

            {filteredDeals.map((deal) => (
              <div
                key={deal.id}
                className="group card p-5 hover:border-slate-600/50 hover:bg-slate-800/70"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  {/* Left: Company & Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-semibold text-white group-hover:text-emerald-400 transition-colors">
                        {deal.company}
                      </h3>
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getDealTypeBadgeClasses(deal.type)}`}
                      >
                        {deal.type}
                      </span>
                      {deal.stage && (
                        <span className={`text-xs font-medium ${getStageBadgeClasses(deal.stage)}`}>
                          {deal.stage}
                        </span>
                      )}
                    </div>

                    <p className="mt-2 text-sm leading-relaxed text-slate-300">{deal.description}</p>

                    {/* Investors / Counterparties */}
                    {deal.investors.length > 0 && (
                      <div className="mt-3 flex flex-wrap items-center gap-1.5">
                        <span className="text-xs font-medium text-slate-500">
                          {deal.type === 'Contract'
                            ? 'Agencies:'
                            : deal.type === 'M&A'
                            ? 'Acquirer:'
                            : deal.type === 'Partnership'
                            ? 'Partners:'
                            : 'Investors:'}
                        </span>
                        {deal.investors.map((inv) => (
                          <span
                            key={inv}
                            className="inline-flex rounded-md border border-slate-600/30 bg-slate-700/30 px-2 py-0.5 text-xs text-slate-300"
                          >
                            {inv}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Meta row */}
                    <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                      <span className="inline-flex items-center gap-1">
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        {formatDate(deal.date)}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                        {deal.sector}
                      </span>
                    </div>
                  </div>

                  {/* Right: Amount */}
                  <div className="flex-shrink-0 text-right sm:min-w-[120px]">
                    {deal.amount !== null ? (
                      <p className="text-xl font-bold text-white">{formatCurrency(deal.amount)}</p>
                    ) : (
                      <p className="text-sm italic text-slate-500">Undisclosed</p>
                    )}
                  </div>

        <RelatedModules modules={PAGE_RELATIONS['deal-flow']} />
                </div>
              </div>
            ))}
          </div>
        </ScrollReveal>

        {/* ── Deal Type Breakdown ────────────────────────────────── */}
        <ScrollReveal delay={0.15}>
          <div className="mt-12 card p-6">
            <h2 className="text-lg font-semibold text-white">Deal Type Breakdown</h2>
            <p className="mt-1 text-sm text-slate-400">
              Distribution of deals by type across the current filtered view.
            </p>
            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {DEAL_TYPES.filter((t) => t.value !== '').map((t) => {
                const count = filteredDeals.filter((d) => d.type === t.value).length;
                const value = filteredDeals
                  .filter((d) => d.type === t.value && d.amount !== null)
                  .reduce((sum, d) => sum + (d.amount ?? 0), 0);
                return (
                  <button
                    key={t.value}
                    onClick={() => setTypeFilter(typeFilter === t.value ? '' : t.value)}
                    className={`rounded-lg border p-3 text-left transition-all duration-200 ${
                      typeFilter === t.value
                        ? 'border-emerald-500/50 bg-emerald-500/10'
                        : 'border-slate-700/50 bg-slate-900/30 hover:border-slate-600/50'
                    }`}
                  >
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${getDealTypeBadgeClasses(t.value as Deal['type'])}`}
                    >
                      {t.value}
                    </span>
                    <p className="mt-2 text-lg font-bold text-white">{count}</p>
                    <p className="text-xs text-slate-500">
                      {value > 0 ? formatCurrency(value) : 'N/A'}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        </ScrollReveal>

        {/* ── Sector Heatmap ─────────────────────────────────────── */}
        <ScrollReveal delay={0.2}>
          <div className="mt-8 card p-6">
            <h2 className="text-lg font-semibold text-white">Sector Activity</h2>
            <p className="mt-1 text-sm text-slate-400">
              Deal volume and total capital by sector.
            </p>
            <div className="mt-5 space-y-3">
              {SECTORS.filter((s) => s.value !== '')
                .map((s) => {
                  const sectorDeals = filteredDeals.filter((d) => d.sector === s.value);
                  const totalVal = sectorDeals
                    .filter((d) => d.amount !== null)
                    .reduce((sum, d) => sum + (d.amount ?? 0), 0);
                  return { ...s, count: sectorDeals.length, totalVal };
                })
                .sort((a, b) => b.totalVal - a.totalVal)
                .map((s) => {
                  const maxVal = Math.max(
                    ...SECTORS.filter((sec) => sec.value !== '').map((sec) =>
                      filteredDeals
                        .filter((d) => d.sector === sec.value && d.amount !== null)
                        .reduce((sum, d) => sum + (d.amount ?? 0), 0)
                    )
                  );
                  const pct = maxVal > 0 ? (s.totalVal / maxVal) * 100 : 0;

                  return (
                    <button
                      key={s.value}
                      onClick={() => setSectorFilter(sectorFilter === s.value ? '' : s.value)}
                      className={`flex w-full items-center gap-4 rounded-lg border p-3 text-left transition-all duration-200 ${
                        sectorFilter === s.value
                          ? 'border-emerald-500/50 bg-emerald-500/10'
                          : 'border-slate-700/30 bg-slate-900/20 hover:border-slate-600/50'
                      }`}
                    >
                      <div className="w-36 flex-shrink-0">
                        <p className="text-sm font-medium text-white">{s.label}</p>
                        <p className="text-xs text-slate-500">{s.count} deals</p>
                      </div>
                      <div className="flex-1">
                        <div className="h-2 overflow-hidden rounded-full bg-slate-700/50">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-cyan-500 transition-all duration-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                      <div className="w-24 flex-shrink-0 text-right">
                        <p className="text-sm font-semibold text-white">
                          {s.totalVal > 0 ? formatCurrency(s.totalVal) : '--'}
                        </p>
                      </div>
                    </button>
                  );
                })}
            </div>
          </div>
        </ScrollReveal>

        {/* ── Related Links ──────────────────────────────────────── */}
        <ScrollReveal delay={0.25}>
          <div className="mt-12 card p-6">
            <h2 className="text-lg font-semibold text-white">Related Resources</h2>
            <p className="mt-1 text-sm text-slate-400">
              Explore more space industry financial intelligence and opportunity tracking.
            </p>
            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[
                {
                  href: '/investment-tracker',
                  title: 'Investment Tracker',
                  desc: 'Monitor space industry investment trends and portfolio analytics.',
                  accent: 'emerald',
                },
                {
                  href: '/funding-tracker',
                  title: 'Funding Tracker',
                  desc: 'Real-time funding round data across 100+ space companies.',
                  accent: 'cyan',
                },
                {
                  href: '/space-capital',
                  title: 'Space Capital',
                  desc: 'VC landscape, LP commitments, and fund performance metrics.',
                  accent: 'amber',
                },
                {
                  href: '/marketplace',
                  title: 'Marketplace',
                  desc: 'Browse service listings, RFQs, and partnership opportunities.',
                  accent: 'purple',
                },
              ].map((link) => {
                const accentMap: Record<string, string> = {
                  emerald: 'group-hover:border-emerald-500/40 group-hover:text-emerald-400',
                  cyan: 'group-hover:border-cyan-500/40 group-hover:text-cyan-400',
                  amber: 'group-hover:border-amber-500/40 group-hover:text-amber-400',
                  purple: 'group-hover:border-purple-500/40 group-hover:text-purple-400',
                };
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`group rounded-lg border border-slate-700/50 bg-slate-900/30 p-4 transition-all duration-200 hover:bg-slate-800/70 ${accentMap[link.accent]}`}
                  >
                    <h3 className={`text-sm font-semibold text-white transition-colors ${accentMap[link.accent]}`}>
                      {link.title}
                    </h3>
                    <p className="mt-1 text-xs text-slate-500">{link.desc}</p>
                  </Link>
                );
              })}
            </div>
          </div>
        </ScrollReveal>

        {/* ── Footer Note ────────────────────────────────────────── */}
        <div className="mt-8 pb-8 text-center">
          <p className="text-xs text-slate-600">
            Data sourced from public filings, press releases, and industry reporting. Last updated Feb 2026.
          </p>
        </div>
      </div>
    </main>
  );
}
