'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import AnimatedPageHeader from '@/components/ui/AnimatedPageHeader';
import ScrollReveal from '@/components/ui/ScrollReveal';
import ExportButton from '@/components/ui/ExportButton';
import EmptyState from '@/components/ui/EmptyState';
import RelatedModules from '@/components/ui/RelatedModules';
import { PAGE_RELATIONS } from '@/lib/module-relationships';
import { formatCurrency as formatCurrencyShared } from '@/lib/format-number';

// ────────────────────────────────────────
// Types
// ────────────────────────────────────────

interface ContractAward {
  title: string;
  agency: string;
  contractor: string;
  value: number;
  date: string;
  type: string;
  description: string;
  category: string;
}

// ────────────────────────────────────────
// Contract Awards Data
// ────────────────────────────────────────

const CONTRACT_AWARDS: ContractAward[] = [
  {
    title: 'Artemis V SLS Core Stage Production',
    agency: 'NASA',
    contractor: 'Boeing',
    value: 3_400_000_000,
    date: '2026-01-15',
    type: 'Cost-Plus',
    description: 'Production and integration of the Space Launch System core stage for the Artemis V lunar mission, including RS-25 engine integration and avionics upgrades.',
    category: 'Launch Systems',
  },
  {
    title: 'Commercial Crew Transportation Services — Mission 12',
    agency: 'NASA',
    contractor: 'SpaceX',
    value: 348_000_000,
    date: '2026-02-01',
    type: 'Firm Fixed-Price',
    description: 'Crew Dragon mission to the International Space Station under the Commercial Crew Program for the CCtCap contract extension.',
    category: 'Crew Transportation',
  },
  {
    title: 'CLPS Task Order 19DE — South Pole Delivery',
    agency: 'NASA',
    contractor: 'Intuitive Machines',
    value: 118_000_000,
    date: '2025-12-10',
    type: 'Firm Fixed-Price',
    description: 'Commercial Lunar Payload Services delivery of five science instruments to the lunar south pole Shackleton Crater region.',
    category: 'Lunar Exploration',
  },
  {
    title: 'Next-Generation Spacesuit (xEVAS) Production Contract',
    agency: 'NASA',
    contractor: 'Axiom Space',
    value: 228_500_000,
    date: '2025-11-20',
    type: 'Firm Fixed-Price',
    description: 'Design, development, and production of next-generation extravehicular activity spacesuits for ISS and Artemis lunar surface operations.',
    category: 'Crew Systems',
  },
  {
    title: 'Mars Sample Return Earth Entry System',
    agency: 'NASA',
    contractor: 'Lockheed Martin',
    value: 812_000_000,
    date: '2025-10-05',
    type: 'Cost-Plus',
    description: 'Development of the Earth Entry System and sample containment vessel for the Mars Sample Return campaign.',
    category: 'Planetary Science',
  },
  {
    title: 'Tranche 2 Transport Layer — 72 Satellites',
    agency: 'USSF',
    contractor: 'Northrop Grumman',
    value: 1_250_000_000,
    date: '2026-01-28',
    type: 'Firm Fixed-Price',
    description: 'Space Development Agency Tranche 2 Transport Layer constellation of 72 low-Earth orbit satellites for mesh networking and data relay.',
    category: 'Defense Constellation',
  },
  {
    title: 'Tranche 2 Tracking Layer — Missile Warning',
    agency: 'USSF',
    contractor: 'L3Harris Technologies',
    value: 980_000_000,
    date: '2025-12-20',
    type: 'Firm Fixed-Price',
    description: 'Development and launch of 18 satellites for the Tracking Layer to detect and track advanced missile threats from LEO.',
    category: 'Missile Defense',
  },
  {
    title: 'Protected Tactical SATCOM (PTS) Block 2',
    agency: 'DoD',
    contractor: 'Raytheon Technologies',
    value: 640_000_000,
    date: '2026-02-10',
    type: 'Cost-Plus-Incentive-Fee',
    description: 'Advanced anti-jam, nuclear-hardened tactical communications satellites for resilient military communications in contested environments.',
    category: 'SATCOM',
  },
  {
    title: 'Evolved Strategic SATCOM Pathfinder',
    agency: 'USSF',
    contractor: 'Lockheed Martin',
    value: 1_780_000_000,
    date: '2025-09-15',
    type: 'Cost-Plus',
    description: 'Next-generation strategic SATCOM system to replace the Advanced Extremely High Frequency satellite constellation.',
    category: 'SATCOM',
  },
  {
    title: 'GAMBIT Electro-Optical Reconnaissance Satellite',
    agency: 'NRO',
    contractor: 'Ball Aerospace',
    value: 2_100_000_000,
    date: '2025-08-22',
    type: 'Classified',
    description: 'Next-generation electro-optical imagery satellite system for national intelligence purposes with enhanced resolution capabilities.',
    category: 'Reconnaissance',
  },
  {
    title: 'Proliferated LEO Surveillance Constellation',
    agency: 'NRO',
    contractor: 'BlackJack Consortium',
    value: 870_000_000,
    date: '2026-01-05',
    type: 'Firm Fixed-Price',
    description: 'Constellation of small surveillance satellites in low-Earth orbit for persistent wide-area intelligence coverage.',
    category: 'Reconnaissance',
  },
  {
    title: 'NRO Launch Services — Heavy Lift GEO',
    agency: 'NRO',
    contractor: 'United Launch Alliance',
    value: 410_000_000,
    date: '2025-11-30',
    type: 'Firm Fixed-Price',
    description: 'Vulcan Centaur heavy-lift launch services for delivery of classified payloads to geostationary orbit.',
    category: 'Launch Services',
  },
  {
    title: 'Copernicus Sentinel Expansion — SAR Satellites',
    agency: 'ESA',
    contractor: 'Thales Alenia Space',
    value: 520_000_000,
    date: '2025-10-18',
    type: 'Firm Fixed-Price',
    description: 'Development and build of two additional Sentinel-1 C-band synthetic aperture radar satellites for the Copernicus Earth observation program.',
    category: 'Earth Observation',
  },
  {
    title: 'Lunar Gateway ESPRIT Refueling Module',
    agency: 'ESA',
    contractor: 'Airbus Defence & Space',
    value: 395_000_000,
    date: '2025-12-05',
    type: 'Cost-Plus',
    description: 'European System Providing Refueling Infrastructure and Telecommunications module for the Lunar Gateway station.',
    category: 'Lunar Exploration',
  },
  {
    title: 'Ariane 6 Block 2 Upper Stage Enhancement',
    agency: 'ESA',
    contractor: 'ArianeGroup',
    value: 285_000_000,
    date: '2026-02-18',
    type: 'Firm Fixed-Price',
    description: 'Upgraded Vinci engine upper stage with re-ignition capability for complex multi-orbit deployment missions.',
    category: 'Launch Systems',
  },
  {
    title: 'Starlink Aviation — Global Airline Fleet',
    agency: 'Commercial',
    contractor: 'SpaceX',
    value: 1_200_000_000,
    date: '2026-01-22',
    type: 'Commercial Agreement',
    description: 'Multi-year contract to provide Starlink broadband connectivity across a fleet of 1,200+ aircraft for a major airline alliance.',
    category: 'Broadband Services',
  },
  {
    title: 'OneWeb Maritime Connectivity Services',
    agency: 'Commercial',
    contractor: 'Eutelsat OneWeb',
    value: 340_000_000,
    date: '2025-11-08',
    type: 'Commercial Agreement',
    description: 'LEO broadband service agreement for 2,400 merchant marine vessels with Ku-band maritime terminals and global coverage.',
    category: 'Broadband Services',
  },
  {
    title: 'GeoXO Weather Satellite — Imager Instrument',
    agency: 'NOAA',
    contractor: 'Ball Aerospace',
    value: 680_000_000,
    date: '2025-09-28',
    type: 'Cost-Plus',
    description: 'Advanced Baseline Imager successor instrument for the Geostationary Extended Observations satellite system.',
    category: 'Weather & Climate',
  },
  {
    title: 'JPSS-3 Polar-Orbiting Weather Satellite',
    agency: 'NOAA',
    contractor: 'Northrop Grumman',
    value: 920_000_000,
    date: '2025-07-14',
    type: 'Cost-Plus',
    description: 'Third Joint Polar Satellite System spacecraft for continuous global weather observation and climate monitoring from sun-synchronous orbit.',
    category: 'Weather & Climate',
  },
  {
    title: 'H3 Launch Vehicle — Lunar Probe Mission',
    agency: 'JAXA',
    contractor: 'Mitsubishi Heavy Industries',
    value: 195_000_000,
    date: '2025-10-30',
    type: 'Firm Fixed-Price',
    description: 'H3 launch vehicle procurement for JAXA lunar polar exploration mission in collaboration with ISRO.',
    category: 'Launch Systems',
  },
  {
    title: 'ISRO-NASA NISAR Satellite Data Distribution',
    agency: 'ISRO',
    contractor: 'Indian Space Research Organisation',
    value: 85_000_000,
    date: '2025-08-10',
    type: 'Interagency Agreement',
    description: 'Joint agreement for ground segment and data distribution of the NASA-ISRO Synthetic Aperture Radar Earth observation mission.',
    category: 'Earth Observation',
  },
  {
    title: 'KSLV-III Development Support — Cryogenic Upper Stage',
    agency: 'KARI',
    contractor: 'Korea Aerospace Industries',
    value: 145_000_000,
    date: '2026-01-10',
    type: 'Government Contract',
    description: 'Development of a cryogenic upper stage for the next-generation Korean Space Launch Vehicle-III program.',
    category: 'Launch Systems',
  },
  {
    title: 'Gateway Power & Propulsion Element (PPE) Solar Arrays',
    agency: 'NASA',
    contractor: 'Maxar Technologies',
    value: 375_000_000,
    date: '2025-06-25',
    type: 'Firm Fixed-Price',
    description: 'Advanced solar electric propulsion and power generation arrays for the Lunar Gateway Power and Propulsion Element.',
    category: 'Lunar Exploration',
  },
  {
    title: 'Space Fence Radar Enhancement — 2nd Site',
    agency: 'USSF',
    contractor: 'Lockheed Martin',
    value: 530_000_000,
    date: '2025-07-20',
    type: 'Cost-Plus',
    description: 'Construction and activation of a second Space Fence S-band radar site for improved space domain awareness coverage.',
    category: 'Space Domain Awareness',
  },
  {
    title: 'Commercial LEO Destination — Orbital Reef',
    agency: 'NASA',
    contractor: 'Blue Origin',
    value: 430_000_000,
    date: '2025-12-18',
    type: 'Space Act Agreement',
    description: 'Continued development of the Orbital Reef commercial space station as a post-ISS commercial LEO destination.',
    category: 'Space Stations',
  },
  {
    title: 'Hypersonic & Ballistic Tracking Space Sensor (HBTSS)',
    agency: 'DoD',
    contractor: 'L3Harris Technologies',
    value: 750_000_000,
    date: '2025-11-12',
    type: 'Firm Fixed-Price',
    description: 'Overhead persistent infrared satellites for tracking hypersonic glide vehicles and advanced ballistic missile threats.',
    category: 'Missile Defense',
  },
  {
    title: 'Starship Lunar Lander — Artemis IV HLS',
    agency: 'NASA',
    contractor: 'SpaceX',
    value: 2_890_000_000,
    date: '2025-06-10',
    type: 'Firm Fixed-Price',
    description: 'Option exercise for SpaceX Starship Human Landing System to support Artemis IV crewed lunar surface mission.',
    category: 'Lunar Exploration',
  },
  {
    title: 'GPS IIIF Follow-On Satellite Production — SV 15-18',
    agency: 'USSF',
    contractor: 'Lockheed Martin',
    value: 1_100_000_000,
    date: '2026-02-05',
    type: 'Firm Fixed-Price',
    description: 'Production of four GPS III Follow-On satellites featuring enhanced M-code signal, increased anti-jam capability, and laser retroreflectors.',
    category: 'Navigation',
  },
  {
    title: 'Europa Clipper Mission Operations & Science',
    agency: 'NASA',
    contractor: 'Johns Hopkins APL',
    value: 215_000_000,
    date: '2025-07-30',
    type: 'Cost-Plus',
    description: 'Mission operations and science data processing for the Europa Clipper spacecraft during its 4-year science phase in Jupiter orbit.',
    category: 'Planetary Science',
  },
  {
    title: 'Amazon Kuiper Satellite Launch Campaign — Phase 2',
    agency: 'Commercial',
    contractor: 'Amazon / Project Kuiper',
    value: 2_000_000_000,
    date: '2025-10-22',
    type: 'Commercial Agreement',
    description: 'Launch procurement for 1,600 Kuiper broadband satellites across multiple providers including ULA Vulcan and Arianespace.',
    category: 'Broadband Services',
  },
  {
    title: 'Tactically Responsive Space — Rapid Launch',
    agency: 'USSF',
    contractor: 'Rocket Lab',
    value: 87_000_000,
    date: '2026-01-30',
    type: 'Firm Fixed-Price',
    description: 'Tactically responsive space launch capability using Electron and Neutron vehicles for rapid satellite replenishment within 24 hours.',
    category: 'Launch Services',
  },
  {
    title: 'Commercial Smallsat Data Purchase — SAR Imagery',
    agency: 'NRO',
    contractor: 'Capella Space',
    value: 165_000_000,
    date: '2025-09-20',
    type: 'IDIQ',
    description: 'Indefinite-delivery/indefinite-quantity contract for commercial synthetic aperture radar satellite imagery for intelligence analysis.',
    category: 'Reconnaissance',
  },
  {
    title: 'Space Station Cargo Resupply — CRS-2 Extension',
    agency: 'NASA',
    contractor: 'Northrop Grumman',
    value: 490_000_000,
    date: '2025-08-28',
    type: 'Firm Fixed-Price',
    description: 'Extension of the Commercial Resupply Services 2 contract for six additional Cygnus cargo missions to the ISS through 2028.',
    category: 'Cargo Transportation',
  },
  {
    title: 'Dragonfly Titan Rotorcraft Final Assembly',
    agency: 'NASA',
    contractor: 'Johns Hopkins APL',
    value: 320_000_000,
    date: '2025-11-01',
    type: 'Cost-Plus',
    description: 'Final assembly, test, and launch preparation for the Dragonfly rotorcraft lander mission to Saturn\'s moon Titan.',
    category: 'Planetary Science',
  },
  {
    title: 'GEO-XO Lightning Mapper Instrument',
    agency: 'NOAA',
    contractor: 'Lockheed Martin',
    value: 290_000_000,
    date: '2026-02-20',
    type: 'Cost-Plus',
    description: 'Geostationary Lightning Mapper successor instrument for the GEO-XO next-generation weather satellite system.',
    category: 'Weather & Climate',
  },
];

// ────────────────────────────────────────
// Filter & Sort Options
// ────────────────────────────────────────

const AGENCIES = ['All', 'NASA', 'DoD', 'USSF', 'NRO', 'ESA', 'Commercial', 'NOAA', 'JAXA', 'ISRO', 'KARI'];
const CATEGORIES = [
  'All',
  ...Array.from(new Set(CONTRACT_AWARDS.map((c) => c.category))).sort(),
];
const YEARS = ['All', '2026', '2025'];
const SORT_OPTIONS = [
  { label: 'Date (Newest)', value: 'date-desc' },
  { label: 'Date (Oldest)', value: 'date-asc' },
  { label: 'Value (Highest)', value: 'value-desc' },
  { label: 'Value (Lowest)', value: 'value-asc' },
  { label: 'Agency (A-Z)', value: 'agency-asc' },
];

// ────────────────────────────────────────
// Helpers
// ────────────────────────────────────────

function formatCurrency(value: number): string {
  return formatCurrencyShared(value, true);
}

function formatFullCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

const AGENCY_COLORS: Record<string, string> = {
  NASA: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
  DoD: 'bg-red-500/20 text-red-300 border-red-500/40',
  USSF: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
  NRO: 'bg-slate-500/20 text-slate-300 border-slate-500/40',
  ESA: 'bg-teal-500/20 text-teal-300 border-teal-500/40',
  Commercial: 'bg-green-500/20 text-green-300 border-green-500/40',
  NOAA: 'bg-white/10 text-slate-200 border-white/15',
  JAXA: 'bg-orange-500/20 text-orange-300 border-orange-500/40',
  ISRO: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
  KARI: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40',
};

// ────────────────────────────────────────
// Page Component
// ────────────────────────────────────────

export default function ContractAwardsPage() {
  const [agencyFilter, setAgencyFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [yearFilter, setYearFilter] = useState('All');
  const [sortBy, setSortBy] = useState('date-desc');
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  // Filtered and sorted awards
  const filteredAwards = useMemo(() => {
    const results = CONTRACT_AWARDS.filter((award) => {
      if (agencyFilter !== 'All' && award.agency !== agencyFilter) return false;
      if (categoryFilter !== 'All' && award.category !== categoryFilter) return false;
      if (yearFilter !== 'All' && !award.date.startsWith(yearFilter)) return false;
      return true;
    });

    results.sort((a, b) => {
      switch (sortBy) {
        case 'date-desc': return new Date(b.date).getTime() - new Date(a.date).getTime();
        case 'date-asc': return new Date(a.date).getTime() - new Date(b.date).getTime();
        case 'value-desc': return b.value - a.value;
        case 'value-asc': return a.value - b.value;
        case 'agency-asc': return a.agency.localeCompare(b.agency);
        default: return 0;
      }
    });

    return results;
  }, [agencyFilter, categoryFilter, yearFilter, sortBy]);

  // Summary statistics
  const stats = useMemo(() => {
    const totalValue = filteredAwards.reduce((sum, a) => sum + a.value, 0);
    const count = filteredAwards.length;
    const avgSize = count > 0 ? totalValue / count : 0;

    const agencyCounts: Record<string, { count: number; value: number }> = {};
    filteredAwards.forEach((a) => {
      if (!agencyCounts[a.agency]) agencyCounts[a.agency] = { count: 0, value: 0 };
      agencyCounts[a.agency].count += 1;
      agencyCounts[a.agency].value += a.value;
    });

    const topAgencies = Object.entries(agencyCounts)
      .sort((a, b) => b[1].value - a[1].value)
      .slice(0, 4);

    return { totalValue, count, avgSize, topAgencies };
  }, [filteredAwards]);

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <AnimatedPageHeader
          title="Contract Awards Feed"
          subtitle="Track government and commercial space contract awards from NASA, DoD, USSF, NRO, ESA, and commercial entities worldwide."
          icon={<span>&#x1F4DC;</span>}
          accentColor="amber"
          breadcrumb="Dashboard → Business"
        />

        {/* Summary Statistics */}
        <ScrollReveal>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="card p-4">
              <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Total Value</p>
              <p className="text-2xl font-bold text-amber-400">{formatCurrency(stats.totalValue)}</p>
              <p className="text-xs text-slate-500 mt-1">{formatFullCurrency(stats.totalValue)}</p>
            </div>
            <div className="card p-4">
              <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Contracts</p>
              <p className="text-2xl font-bold text-white">{stats.count}</p>
              <p className="text-xs text-slate-500 mt-1">{stats.count === CONTRACT_AWARDS.length ? 'All awards' : `of ${CONTRACT_AWARDS.length} total`}</p>
            </div>
            <div className="card p-4">
              <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Avg. Size</p>
              <p className="text-2xl font-bold text-slate-300">{formatCurrency(stats.avgSize)}</p>
              <p className="text-xs text-slate-500 mt-1">Per contract</p>
            </div>
            <div className="card p-4">
              <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Top Agency</p>
              <p className="text-2xl font-bold text-purple-400">{stats.topAgencies[0]?.[0] ?? '—'}</p>
              <p className="text-xs text-slate-500 mt-1">
                {stats.topAgencies[0] ? `${stats.topAgencies[0][1].count} awards, ${formatCurrency(stats.topAgencies[0][1].value)}` : 'No data'}
              </p>
            </div>
          </div>
        </ScrollReveal>

        {/* Top Agencies Breakdown */}
        <ScrollReveal delay={0.1}>
          <div className="card p-5 mb-8">
            <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-4">Agency Breakdown</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {stats.topAgencies.map(([agency, data]) => (
                <div key={agency} className="flex items-center gap-3">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${AGENCY_COLORS[agency] ?? 'bg-slate-600/20 text-slate-300 border-slate-500/40'}`}>
                    {agency}
                  </span>
                  <div className="text-sm">
                    <span className="text-white font-medium">{formatCurrency(data.value)}</span>
                    <span className="text-slate-500 ml-1">({data.count})</span>

        <RelatedModules modules={PAGE_RELATIONS['contract-awards']} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </ScrollReveal>

        {/* Filters & Sort */}
        <ScrollReveal delay={0.15}>
          <div className="card p-5 mb-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Agency Filter */}
              <div>
                <label htmlFor="agency-filter" className="block text-xs text-slate-400 uppercase tracking-wider mb-1.5">
                  Agency
                </label>
                <select
                  id="agency-filter"
                  value={agencyFilter}
                  onChange={(e) => setAgencyFilter(e.target.value)}
                  className="w-full bg-slate-900/60 border border-slate-600/50 text-white rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50 outline-none"
                >
                  {AGENCIES.map((a) => (
                    <option key={a} value={a}>{a}</option>
                  ))}
                </select>
              </div>

              {/* Category Filter */}
              <div>
                <label htmlFor="category-filter" className="block text-xs text-slate-400 uppercase tracking-wider mb-1.5">
                  Category
                </label>
                <select
                  id="category-filter"
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="w-full bg-slate-900/60 border border-slate-600/50 text-white rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50 outline-none"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              {/* Year Filter */}
              <div>
                <label htmlFor="year-filter" className="block text-xs text-slate-400 uppercase tracking-wider mb-1.5">
                  Year
                </label>
                <select
                  id="year-filter"
                  value={yearFilter}
                  onChange={(e) => setYearFilter(e.target.value)}
                  className="w-full bg-slate-900/60 border border-slate-600/50 text-white rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50 outline-none"
                >
                  {YEARS.map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>

              {/* Sort */}
              <div>
                <label htmlFor="sort-by" className="block text-xs text-slate-400 uppercase tracking-wider mb-1.5">
                  Sort By
                </label>
                <select
                  id="sort-by"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full bg-slate-900/60 border border-slate-600/50 text-white rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50 outline-none"
                >
                  {SORT_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Active filter count & export */}
            <div className="mt-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                {(agencyFilter !== 'All' || categoryFilter !== 'All' || yearFilter !== 'All') && (
                  <>
                    <span className="text-xs text-slate-400">
                      Showing {filteredAwards.length} of {CONTRACT_AWARDS.length} awards
                    </span>
                    <button
                      onClick={() => { setAgencyFilter('All'); setCategoryFilter('All'); setYearFilter('All'); }}
                      className="text-xs text-amber-400 hover:text-amber-300 underline underline-offset-2 transition-colors"
                    >
                      Clear filters
                    </button>
                  </>
                )}
              </div>
              <ExportButton
                data={filteredAwards.map(a => ({
                  title: a.title,
                  agency: a.agency,
                  contractor: a.contractor,
                  value: a.value,
                  date: a.date,
                  type: a.type,
                  category: a.category,
                  description: a.description,
                }))}
                filename="contract-awards"
                columns={[
                  { key: 'title', label: 'Title' },
                  { key: 'agency', label: 'Agency' },
                  { key: 'contractor', label: 'Contractor' },
                  { key: 'value', label: 'Value (USD)' },
                  { key: 'date', label: 'Date' },
                  { key: 'type', label: 'Contract Type' },
                  { key: 'category', label: 'Category' },
                  { key: 'description', label: 'Description' },
                ]}
              />
            </div>
          </div>
        </ScrollReveal>

        {/* Contract Awards List */}
        <ScrollReveal delay={0.2}>
          <div className="space-y-4 mb-12">
            {filteredAwards.length === 0 ? (
              <EmptyState
                icon={<svg className="w-10 h-10 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" /></svg>}
                title="No awards found"
                description="No contract awards match your current filters. Try adjusting your criteria."
                action={
                  <button
                    onClick={() => { setAgencyFilter('All'); setCategoryFilter('All'); setYearFilter('All'); }}
                    className="text-sm text-amber-400 hover:text-amber-300 underline underline-offset-2 transition-colors"
                  >
                    Reset all filters
                  </button>
                }
              />
            ) : (
              filteredAwards.map((award, idx) => {
                const isExpanded = expandedIndex === idx;
                return (
                  <div
                    key={`${award.title}-${award.date}`}
                    className="card overflow-hidden hover:border-slate-600/70 transition-colors"
                  >
                    <button
                      onClick={() => setExpandedIndex(isExpanded ? null : idx)}
                      className="w-full text-left p-5 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:ring-inset rounded-xl"
                      aria-expanded={isExpanded}
                    >
                      <div className="flex flex-col lg:flex-row lg:items-center gap-3">
                        {/* Title & Contractor */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${AGENCY_COLORS[award.agency] ?? 'bg-slate-600/20 text-slate-300 border-slate-500/40'}`}>
                              {award.agency}
                            </span>
                            <span className="text-xs text-slate-500 bg-slate-700/40 px-2 py-0.5 rounded-full">
                              {award.category}
                            </span>
                          </div>
                          <h3 className="text-white font-semibold text-base leading-snug truncate">
                            {award.title}
                          </h3>
                          <p className="text-sm text-slate-400 mt-0.5">
                            {award.contractor} &middot; {award.type}
                          </p>
                        </div>

                        {/* Value & Date */}
                        <div className="flex items-center gap-6 lg:flex-shrink-0">
                          <div className="text-right">
                            <p className="text-lg font-bold text-amber-400">{formatCurrency(award.value)}</p>
                            <p className="text-xs text-slate-500">{formatDate(award.date)}</p>
                          </div>
                          <svg
                            className={`w-5 h-5 text-slate-500 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </div>
                    </button>

                    {/* Expanded Details */}
                    {isExpanded && (
                      <div className="px-5 pb-5 border-t border-slate-700/50">
                        <div className="pt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="md:col-span-2">
                            <h4 className="text-xs text-slate-400 uppercase tracking-wider mb-1">Description</h4>
                            <p className="text-sm text-slate-300 leading-relaxed">{award.description}</p>
                          </div>
                          <div className="space-y-3">
                            <div>
                              <h4 className="text-xs text-slate-400 uppercase tracking-wider mb-1">Contract Value</h4>
                              <p className="text-sm text-white font-medium">{formatFullCurrency(award.value)}</p>
                            </div>
                            <div>
                              <h4 className="text-xs text-slate-400 uppercase tracking-wider mb-1">Contract Type</h4>
                              <p className="text-sm text-white">{award.type}</p>
                            </div>
                            <div>
                              <h4 className="text-xs text-slate-400 uppercase tracking-wider mb-1">Award Date</h4>
                              <p className="text-sm text-white">{formatDate(award.date)}</p>
                            </div>
                            <div>
                              <h4 className="text-xs text-slate-400 uppercase tracking-wider mb-1">Contractor</h4>
                              <p className="text-sm text-white">{award.contractor}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </ScrollReveal>

        {/* Related Links */}
        <ScrollReveal delay={0.25}>
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Related Resources</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Link
                href="/procurement"
                className="flex items-center gap-3 p-3 rounded-lg bg-slate-700/30 hover:bg-slate-700/50 border border-slate-600/30 hover:border-slate-500/50 transition-all group"
              >
                <span className="text-2xl">&#x1F4CB;</span>
                <div>
                  <p className="text-sm font-medium text-white group-hover:text-amber-400 transition-colors">Procurement</p>
                  <p className="text-xs text-slate-400">SAM.gov opportunities &amp; SBIR</p>
                </div>
              </Link>
              <Link
                href="/compliance"
                className="flex items-center gap-3 p-3 rounded-lg bg-slate-700/30 hover:bg-slate-700/50 border border-slate-600/30 hover:border-slate-500/50 transition-all group"
              >
                <span className="text-2xl">&#x2696;</span>
                <div>
                  <p className="text-sm font-medium text-white group-hover:text-amber-400 transition-colors">Regulatory &amp; Compliance</p>
                  <p className="text-xs text-slate-400">Space law &amp; filings</p>
                </div>
              </Link>
              <Link
                href="/supply-chain"
                className="flex items-center gap-3 p-3 rounded-lg bg-slate-700/30 hover:bg-slate-700/50 border border-slate-600/30 hover:border-slate-500/50 transition-all group"
              >
                <span className="text-2xl">&#x1F517;</span>
                <div>
                  <p className="text-sm font-medium text-white group-hover:text-amber-400 transition-colors">Supply Chain</p>
                  <p className="text-xs text-slate-400">Vendor network &amp; logistics</p>
                </div>
              </Link>
              <Link
                href="/business-opportunities"
                className="flex items-center gap-3 p-3 rounded-lg bg-slate-700/30 hover:bg-slate-700/50 border border-slate-600/30 hover:border-slate-500/50 transition-all group"
              >
                <span className="text-2xl">&#x1F4BC;</span>
                <div>
                  <p className="text-sm font-medium text-white group-hover:text-amber-400 transition-colors">Business Opportunities</p>
                  <p className="text-xs text-slate-400">Market intel &amp; partnerships</p>
                </div>
              </Link>
            </div>
          </div>
        </ScrollReveal>
      </div>
    </main>
  );
}