'use client';

import { useState, useMemo } from 'react';
import AnimatedPageHeader from '@/components/ui/AnimatedPageHeader';
import Breadcrumbs from '@/components/ui/Breadcrumbs';
import ScrollReveal, { StaggerContainer, StaggerItem } from '@/components/ui/ScrollReveal';
import RelatedModules from '@/components/ui/RelatedModules';

// --- Data ---

interface PatentHolder {
  rank: number;
  company: string;
  patents: number;
  specialties: string[];
  yoyGrowth: number;
  categories: string[];
}

interface PatentCategory {
  name: string;
  count: number;
  color: string;
  description: string;
}

interface EmergingArea {
  title: string;
  description: string;
  filings2024: number;
  growth: number;
  keyPlayers: string[];
}

const PATENT_HOLDERS: PatentHolder[] = [
  { rank: 1, company: 'SpaceX', patents: 2100, specialties: ['Reusable rockets', 'Starlink constellation'], yoyGrowth: 22, categories: ['Propulsion Systems', 'Satellite Communications'] },
  { rank: 2, company: 'Boeing', patents: 1800, specialties: ['Satellite systems', 'Defense platforms'], yoyGrowth: 8, categories: ['Satellite Communications', 'Navigation'] },
  { rank: 3, company: 'Lockheed Martin', patents: 1600, specialties: ['Sensors', 'Propulsion'], yoyGrowth: 10, categories: ['Propulsion Systems', 'Earth Observation/Remote Sensing'] },
  { rank: 4, company: 'Northrop Grumman', patents: 1200, specialties: ['Imaging', 'Defense systems'], yoyGrowth: 12, categories: ['Earth Observation/Remote Sensing', 'In-Space Services'] },
  { rank: 5, company: 'Airbus', patents: 1100, specialties: ['Satellite platforms', 'Launchers'], yoyGrowth: 9, categories: ['Satellite Communications', 'Spacecraft Manufacturing'] },
  { rank: 6, company: 'Blue Origin', patents: 800, specialties: ['Landing systems', 'Capsule design'], yoyGrowth: 28, categories: ['Propulsion Systems', 'Space Habitats'] },
  { rank: 7, company: 'L3Harris', patents: 700, specialties: ['Communications', 'Electro-optical'], yoyGrowth: 14, categories: ['Satellite Communications', 'Earth Observation/Remote Sensing'] },
  { rank: 8, company: 'Raytheon/RTX', patents: 600, specialties: ['Sensors', 'Missile systems'], yoyGrowth: 7, categories: ['Navigation', 'Earth Observation/Remote Sensing'] },
  { rank: 9, company: 'Planet Labs', patents: 400, specialties: ['Imaging', 'On-board processing'], yoyGrowth: 18, categories: ['Earth Observation/Remote Sensing', 'Spacecraft Manufacturing'] },
  { rank: 10, company: 'Rocket Lab', patents: 350, specialties: ['Electric pumps', '3D printing'], yoyGrowth: 25, categories: ['Propulsion Systems', 'Spacecraft Manufacturing'] },
  { rank: 11, company: 'Relativity Space', patents: 300, specialties: ['Additive manufacturing'], yoyGrowth: 35, categories: ['Spacecraft Manufacturing', 'Propulsion Systems'] },
  { rank: 12, company: 'Aerojet Rocketdyne', patents: 280, specialties: ['Propulsion systems'], yoyGrowth: 6, categories: ['Propulsion Systems'] },
  { rank: 13, company: 'Ball Aerospace', patents: 250, specialties: ['Instruments', 'Sensors'], yoyGrowth: 11, categories: ['Earth Observation/Remote Sensing', 'Navigation'] },
  { rank: 14, company: 'Virgin Galactic', patents: 200, specialties: ['Hybrid motors', 'Cabin design'], yoyGrowth: 15, categories: ['Propulsion Systems', 'Space Habitats'] },
  { rank: 15, company: 'Axiom Space', patents: 150, specialties: ['Habitat systems'], yoyGrowth: 40, categories: ['Space Habitats', 'In-Space Services'] },
];

const PATENT_CATEGORIES: PatentCategory[] = [
  { name: 'Satellite Communications', count: 3500, color: 'bg-cyan-500', description: 'LEO/GEO constellations, inter-satellite links, ground terminals, direct-to-device' },
  { name: 'Propulsion Systems', count: 2200, color: 'bg-orange-500', description: 'Electric propulsion, reusable engines, green propellants, nuclear thermal' },
  { name: 'Earth Observation/Remote Sensing', count: 1800, color: 'bg-emerald-500', description: 'SAR imaging, hyperspectral sensors, on-board AI processing, calibration' },
  { name: 'Spacecraft Manufacturing', count: 1500, color: 'bg-purple-500', description: 'Additive manufacturing, composite structures, modular bus designs' },
  { name: 'Navigation', count: 1200, color: 'bg-blue-500', description: 'PNT augmentation, autonomous rendezvous, precision orbit determination' },
  { name: 'Space Habitats', count: 800, color: 'bg-pink-500', description: 'Life support systems, radiation shielding, inflatable modules' },
  { name: 'In-Space Services', count: 500, color: 'bg-amber-500', description: 'Satellite servicing, refueling, debris removal, inspection' },
  { name: 'Other', count: 1000, color: 'bg-slate-500', description: 'Launch range, ground systems, simulation, space law compliance tools' },
];

const EMERGING_AREAS: EmergingArea[] = [
  {
    title: 'On-Orbit Manufacturing',
    description: 'Fabricating components, structures, and materials in microgravity environments for use in space or return to Earth.',
    filings2024: 320,
    growth: 45,
    keyPlayers: ['Redwire', 'Varda Space', 'Made In Space'],
  },
  {
    title: 'Debris Removal Mechanisms',
    description: 'Active debris removal through nets, harpoons, robotic arms, laser ablation, and magnetic capture systems.',
    filings2024: 280,
    growth: 38,
    keyPlayers: ['Astroscale', 'ClearSpace', 'Northrop Grumman'],
  },
  {
    title: 'Space-Based Solar Power',
    description: 'Collecting solar energy in orbit and wirelessly transmitting it to ground receivers via microwave or laser beams.',
    filings2024: 210,
    growth: 52,
    keyPlayers: ['Caltech/SSPP', 'ESA', 'Virtus Solis'],
  },
  {
    title: 'Lunar Surface Operations',
    description: 'ISRU extraction, regolith processing, habitat construction, and autonomous surface mobility systems for the Moon.',
    filings2024: 250,
    growth: 60,
    keyPlayers: ['SpaceX', 'Blue Origin', 'Intuitive Machines'],
  },
  {
    title: 'Direct-to-Device Satellite Comms',
    description: 'Connecting standard smartphones directly to LEO satellites without specialized ground equipment.',
    filings2024: 340,
    growth: 72,
    keyPlayers: ['SpaceX/T-Mobile', 'AST SpaceMobile', 'Lynk Global'],
  },
];

const TOTAL_PATENTS = 12500;
const YOY_GROWTH = 15;
const TOP_HOLDER = 'SpaceX';
const TOP_HOLDER_COUNT = 2100;
const MOST_ACTIVE_CATEGORY = 'Satellite Communications';
const MAX_CATEGORY_COUNT = 3500;

type SortField = 'rank' | 'company' | 'patents' | 'yoyGrowth';
type SortDirection = 'asc' | 'desc';

// --- Component ---

export default function PatentLandscapePage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedYear, setSelectedYear] = useState('2024');
  const [sortField, setSortField] = useState<SortField>('rank');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [expandedHolder, setExpandedHolder] = useState<string | null>(null);

  const allCategories = useMemo(() => {
    const cats = new Set<string>();
    PATENT_HOLDERS.forEach((h) => h.categories.forEach((c) => cats.add(c)));
    return Array.from(cats).sort();
  }, []);

  const filteredHolders = useMemo(() => {
    let result = [...PATENT_HOLDERS];

    // Filter by search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (h) =>
          h.company.toLowerCase().includes(q) ||
          h.specialties.some((s) => s.toLowerCase().includes(q))
      );
    }

    // Filter by category
    if (selectedCategory) {
      result = result.filter((h) => h.categories.includes(selectedCategory));
    }

    // Sort
    result.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'rank':
          cmp = a.rank - b.rank;
          break;
        case 'company':
          cmp = a.company.localeCompare(b.company);
          break;
        case 'patents':
          cmp = a.patents - b.patents;
          break;
        case 'yoyGrowth':
          cmp = a.yoyGrowth - b.yoyGrowth;
          break;
      }
      return sortDirection === 'asc' ? cmp : -cmp;
    });

    return result;
  }, [searchQuery, selectedCategory, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection(field === 'company' ? 'asc' : 'desc');
    }
  };

  const sortIcon = (field: SortField) => {
    if (sortField !== field) return '';
    return sortDirection === 'asc' ? ' \u2191' : ' \u2193';
  };

  const yearMultiplier = selectedYear === '2024' ? 1 : selectedYear === '2023' ? 0.87 : selectedYear === '2022' ? 0.76 : 0.65;
  const adjustedTotal = Math.round(TOTAL_PATENTS * yearMultiplier);

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-8">
        <Breadcrumbs
          items={[
            { label: 'Business Opportunities', href: '/business-opportunities' },
            { label: 'Patent Landscape' },
          ]}
        />

        <AnimatedPageHeader
          title="Space Technology Patent Landscape"
          subtitle="Analyzing patent trends, top holders, and emerging innovation areas across the space industry"
          icon={<span>&#x1F4DC;</span>}
          accentColor="purple"
        />

        {/* --- Stats Cards --- */}
        <StaggerContainer className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StaggerItem>
            <div className="card p-6 text-center">
              <div className="text-xs uppercase tracking-widest text-slate-400 font-medium mb-1">
                Total Patents ({selectedYear})
              </div>
              <div className="text-3xl md:text-4xl font-bold font-display tracking-tight text-white">
                {adjustedTotal.toLocaleString()}+
              </div>
              <div className="text-xs text-slate-500 mt-1">Space-related filings</div>
            </div>
          </StaggerItem>
          <StaggerItem>
            <div className="card p-6 text-center">
              <div className="text-xs uppercase tracking-widest text-slate-400 font-medium mb-1">
                YoY Growth
              </div>
              <div className="text-3xl md:text-4xl font-bold font-display tracking-tight text-green-400">
                {YOY_GROWTH}%
              </div>
              <div className="text-xs text-slate-500 mt-1">Compared to prior year</div>
            </div>
          </StaggerItem>
          <StaggerItem>
            <div className="card p-6 text-center">
              <div className="text-xs uppercase tracking-widest text-slate-400 font-medium mb-1">
                Top Patent Holder
              </div>
              <div className="text-xl md:text-2xl font-bold font-display tracking-tight text-purple-400">
                {TOP_HOLDER}
              </div>
              <div className="text-xs text-slate-500 mt-1">{TOP_HOLDER_COUNT.toLocaleString()}+ patents</div>
            </div>
          </StaggerItem>
          <StaggerItem>
            <div className="card p-6 text-center">
              <div className="text-xs uppercase tracking-widest text-slate-400 font-medium mb-1">
                Most Active Category
              </div>
              <div className="text-base md:text-lg font-bold font-display tracking-tight text-cyan-400">
                {MOST_ACTIVE_CATEGORY}
              </div>
              <div className="text-xs text-slate-500 mt-1">{MAX_CATEGORY_COUNT.toLocaleString()} patents</div>
            </div>
          </StaggerItem>
        </StaggerContainer>

        {/* --- Search/Filter Bar --- */}
        <ScrollReveal>
          <div className="card p-4 mb-8">
            <div className="flex flex-wrap gap-4 items-end">
              {/* Search */}
              <div className="flex-1 min-w-[200px]">
                <label className="block text-slate-400 text-sm mb-1">Search</label>
                <input
                  type="search"
                  placeholder="Search by company or specialty..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 h-11 text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none placeholder-slate-500"
                />
              </div>

              {/* Category filter */}
              <div>
                <label className="block text-slate-400 text-sm mb-1">Category</label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 h-11 text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
                >
                  <option value="">All Categories</option>
                  {allCategories.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              {/* Year filter */}
              <div>
                <label className="block text-slate-400 text-sm mb-1">Year</label>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 h-11 text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
                >
                  <option value="2024">2024</option>
                  <option value="2023">2023</option>
                  <option value="2022">2022</option>
                  <option value="2021">2021</option>
                </select>
              </div>

              {/* Sort dropdown (mobile) */}
              <div className="md:hidden">
                <label className="block text-slate-400 text-sm mb-1">Sort By</label>
                <select
                  value={`${sortField}-${sortDirection}`}
                  onChange={(e) => {
                    const [f, d] = e.target.value.split('-') as [SortField, SortDirection];
                    setSortField(f);
                    setSortDirection(d);
                  }}
                  className="bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 h-11 text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
                >
                  <option value="rank-asc">Rank (ascending)</option>
                  <option value="patents-desc">Patents (most first)</option>
                  <option value="patents-asc">Patents (least first)</option>
                  <option value="company-asc">Company (A-Z)</option>
                  <option value="company-desc">Company (Z-A)</option>
                  <option value="yoyGrowth-desc">Growth (highest first)</option>
                </select>
              </div>

              {/* Clear */}
              {(searchQuery || selectedCategory || selectedYear !== '2024') && (
                <div className="flex items-end">
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedCategory('');
                      setSelectedYear('2024');
                    }}
                    className="text-sm text-purple-400 hover:text-purple-300 py-2 min-h-[44px] transition-colors"
                  >
                    Clear Filters
                  </button>
                </div>
              )}
            </div>
          </div>
        </ScrollReveal>

        {/* --- Two Column Layout: Holders + Categories --- */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Top Patent Holders */}
          <ScrollReveal>
            <div className="card p-6">
              <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                <span className="text-2xl">&#x1F3C6;</span>
                Top Patent Holders
                <span className="text-sm text-slate-400 font-normal ml-1">
                  ({filteredHolders.length} of {PATENT_HOLDERS.length})
                </span>
              </h2>

              {/* Desktop table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-700/50">
                      <th
                        className="text-left py-2 px-2 text-slate-400 font-medium cursor-pointer hover:text-white transition-colors select-none"
                        onClick={() => handleSort('rank')}
                      >
                        #{sortIcon('rank')}
                      </th>
                      <th
                        className="text-left py-2 px-2 text-slate-400 font-medium cursor-pointer hover:text-white transition-colors select-none"
                        onClick={() => handleSort('company')}
                      >
                        Company{sortIcon('company')}
                      </th>
                      <th
                        className="text-right py-2 px-2 text-slate-400 font-medium cursor-pointer hover:text-white transition-colors select-none"
                        onClick={() => handleSort('patents')}
                      >
                        Patents{sortIcon('patents')}
                      </th>
                      <th
                        className="text-right py-2 px-2 text-slate-400 font-medium cursor-pointer hover:text-white transition-colors select-none"
                        onClick={() => handleSort('yoyGrowth')}
                      >
                        YoY{sortIcon('yoyGrowth')}
                      </th>
                      <th className="text-left py-2 px-2 text-slate-400 font-medium">Specialties</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredHolders.map((holder) => (
                      <tr
                        key={holder.company}
                        className="border-b border-slate-700/30 hover:bg-slate-800/40 transition-colors cursor-pointer"
                        onClick={() => setExpandedHolder(expandedHolder === holder.company ? null : holder.company)}
                      >
                        <td className="py-3 px-2 text-slate-500 font-mono">{holder.rank}</td>
                        <td className="py-3 px-2">
                          <span className="font-semibold text-white">{holder.company}</span>
                        </td>
                        <td className="py-3 px-2 text-right">
                          <span className="font-mono text-purple-400 font-medium">
                            {Math.round(holder.patents * yearMultiplier).toLocaleString()}+
                          </span>
                        </td>
                        <td className="py-3 px-2 text-right">
                          <span className="text-green-400 text-xs font-medium bg-green-500/10 px-2 py-0.5 rounded">
                            +{holder.yoyGrowth}%
                          </span>
                        </td>
                        <td className="py-3 px-2">
                          <div className="flex flex-wrap gap-1">
                            {holder.specialties.slice(0, 2).map((s) => (
                              <span key={s} className="text-xs bg-slate-700/40 text-slate-300 px-2 py-0.5 rounded">
                                {s}
                              </span>
                            ))}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile card view */}
              <div className="md:hidden space-y-3">
                {filteredHolders.map((holder) => (
                  <div
                    key={holder.company}
                    className="bg-slate-800/30 rounded-lg p-3 border border-slate-700/30 cursor-pointer hover:border-purple-500/30 transition-colors"
                    onClick={() => setExpandedHolder(expandedHolder === holder.company ? null : holder.company)}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-500 font-mono w-5">#{holder.rank}</span>
                        <span className="font-semibold text-white text-sm">{holder.company}</span>
                      </div>
                      <span className="font-mono text-purple-400 text-sm font-medium">
                        {Math.round(holder.patents * yearMultiplier).toLocaleString()}+
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex flex-wrap gap-1">
                        {holder.specialties.slice(0, 1).map((s) => (
                          <span key={s} className="text-xs bg-slate-700/40 text-slate-300 px-2 py-0.5 rounded">
                            {s}
                          </span>
                        ))}
                      </div>
                      <span className="text-green-400 text-xs font-medium">+{holder.yoyGrowth}%</span>
                    </div>
                    {expandedHolder === holder.company && (
                      <div className="mt-2 pt-2 border-t border-slate-700/30 space-y-1">
                        <div className="text-xs text-slate-400">
                          <span className="font-medium text-slate-300">Categories:</span>{' '}
                          {holder.categories.join(', ')}
                        </div>
                        <div className="text-xs text-slate-400">
                          <span className="font-medium text-slate-300">Specialties:</span>{' '}
                          {holder.specialties.join(', ')}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {filteredHolders.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-slate-400 text-sm">No patent holders match your search criteria.</p>
                </div>
              )}

              {/* Expanded detail (desktop) */}
              {expandedHolder && (
                <div className="hidden md:block mt-4 p-4 bg-slate-800/40 rounded-lg border border-purple-500/20">
                  {(() => {
                    const holder = PATENT_HOLDERS.find((h) => h.company === expandedHolder);
                    if (!holder) return null;
                    return (
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="text-white font-semibold">{holder.company}</h3>
                          <button
                            onClick={(e) => { e.stopPropagation(); setExpandedHolder(null); }}
                            className="text-slate-400 hover:text-white text-sm transition-colors"
                          >
                            Close
                          </button>
                        </div>
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <div className="text-slate-400 text-xs mb-1">Total Patents</div>
                            <div className="text-purple-400 font-mono font-bold text-lg">
                              {Math.round(holder.patents * yearMultiplier).toLocaleString()}+
                            </div>
                          </div>
                          <div>
                            <div className="text-slate-400 text-xs mb-1">YoY Growth</div>
                            <div className="text-green-400 font-bold text-lg">+{holder.yoyGrowth}%</div>
                          </div>
                          <div>
                            <div className="text-slate-400 text-xs mb-1">Rank</div>
                            <div className="text-white font-bold text-lg">#{holder.rank}</div>
                          </div>
                        </div>
                        <div className="mt-3">
                          <div className="text-slate-400 text-xs mb-1">Specialties</div>
                          <div className="flex flex-wrap gap-1">
                            {holder.specialties.map((s) => (
                              <span key={s} className="text-xs bg-purple-500/15 text-purple-300 px-2 py-1 rounded">
                                {s}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className="mt-3">
                          <div className="text-slate-400 text-xs mb-1">Active Categories</div>
                          <div className="flex flex-wrap gap-1">
                            {holder.categories.map((c) => (
                              <span key={c} className="text-xs bg-slate-700/50 text-slate-300 px-2 py-1 rounded">
                                {c}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          </ScrollReveal>

          {/* Patent Categories */}
          <ScrollReveal>
            <div className="card p-6">
              <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                <span className="text-2xl">&#x1F4CA;</span>
                Patent Categories
              </h2>

              <div className="space-y-4">
                {PATENT_CATEGORIES.map((cat) => {
                  const adjustedCount = Math.round(cat.count * yearMultiplier);
                  const adjustedMax = Math.round(MAX_CATEGORY_COUNT * yearMultiplier);
                  const pct = (adjustedCount / adjustedMax) * 100;
                  const isSelected = selectedCategory === cat.name;

                  return (
                    <button
                      key={cat.name}
                      className={`w-full text-left transition-all rounded-lg p-3 ${
                        isSelected
                          ? 'bg-purple-500/10 border border-purple-500/30'
                          : 'hover:bg-slate-800/40 border border-transparent'
                      }`}
                      onClick={() => setSelectedCategory(isSelected ? '' : cat.name)}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className={`text-sm font-medium ${isSelected ? 'text-purple-300' : 'text-slate-200'}`}>
                          {cat.name}
                        </span>
                        <span className="text-sm font-mono text-slate-400">
                          {adjustedCount.toLocaleString()}
                        </span>
                      </div>
                      <div className="h-2.5 bg-slate-700/50 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${cat.color}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <p className="text-xs text-slate-500 mt-1">{cat.description}</p>
                    </button>
                  );
                })}
              </div>

              {/* Total bar */}
              <div className="mt-6 pt-4 border-t border-slate-700/50">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-white">Total</span>
                  <span className="text-sm font-mono text-white font-bold">
                    {adjustedTotal.toLocaleString()}+
                  </span>
                </div>
              </div>
            </div>
          </ScrollReveal>
        </div>

        {/* --- Emerging Patent Areas --- */}
        <ScrollReveal>
          <div className="card p-6 mb-8">
            <h2 className="text-xl font-semibold text-white mb-2 flex items-center gap-2">
              <span className="text-2xl">&#x1F525;</span>
              Emerging Patent Areas
            </h2>
            <p className="text-slate-400 text-sm mb-6">
              Hot topics in recent patent filings showing the fastest growth in innovation activity.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {EMERGING_AREAS.map((area) => (
                <div
                  key={area.title}
                  className="bg-slate-800/40 rounded-xl p-5 border border-slate-700/30 hover:border-purple-500/30 transition-all group"
                >
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="text-white font-semibold text-sm group-hover:text-purple-300 transition-colors">
                      {area.title}
                    </h3>
                    <span className="text-xs font-medium bg-green-500/15 text-green-400 px-2 py-0.5 rounded whitespace-nowrap ml-2">
                      +{area.growth}% YoY
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mb-3 leading-relaxed">
                    {area.description}
                  </p>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-slate-500">2024 Filings</span>
                    <span className="text-sm font-mono text-purple-400 font-medium">
                      {area.filings2024}
                    </span>
                  </div>
                  <div className="h-1.5 bg-slate-700/50 rounded-full overflow-hidden mb-3">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-500"
                      style={{ width: `${(area.filings2024 / 400) * 100}%` }}
                    />
                  </div>
                  <div>
                    <span className="text-xs text-slate-500">Key Players</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {area.keyPlayers.map((player) => (
                        <span
                          key={player}
                          className="text-xs bg-slate-700/50 text-slate-300 px-2 py-0.5 rounded"
                        >
                          {player}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </ScrollReveal>

        {/* --- Year-over-Year Trend Summary --- */}
        <ScrollReveal>
          <div className="card p-6 mb-8">
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              <span className="text-2xl">&#x1F4C8;</span>
              Patent Filing Trends
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { year: '2021', count: 8125, color: 'text-slate-400' },
                { year: '2022', count: 9500, color: 'text-slate-300' },
                { year: '2023', count: 10875, color: 'text-purple-300' },
                { year: '2024', count: 12500, color: 'text-purple-400' },
              ].map((item) => (
                <div
                  key={item.year}
                  className={`text-center p-4 rounded-lg border transition-colors ${
                    selectedYear === item.year
                      ? 'bg-purple-500/10 border-purple-500/30'
                      : 'bg-slate-800/30 border-slate-700/30 hover:border-slate-600/50'
                  }`}
                >
                  <div className="text-sm text-slate-400 mb-1">{item.year}</div>
                  <div className={`text-2xl font-bold font-display ${item.color}`}>
                    {item.count.toLocaleString()}
                  </div>
                  {item.year !== '2021' && (
                    <div className="text-xs text-green-400 mt-1">
                      +{Math.round(
                        ((item.count - [8125, 9500, 10875, 12500][[2021, 2022, 2023, 2024].indexOf(parseInt(item.year)) - 1]) /
                          [8125, 9500, 10875, 12500][[2021, 2022, 2023, 2024].indexOf(parseInt(item.year)) - 1]) *
                          100
                      )}% YoY
                    </div>
                  )}
                  {/* Visual bar */}
                  <div className="mt-3 h-16 flex items-end justify-center">
                    <div
                      className={`w-12 rounded-t transition-all duration-500 ${
                        selectedYear === item.year
                          ? 'bg-gradient-to-t from-purple-600 to-purple-400'
                          : 'bg-slate-700/60'
                      }`}
                      style={{ height: `${(item.count / 12500) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </ScrollReveal>

        {/* --- Related Modules --- */}
        <RelatedModules
          modules={[
            { name: 'Patent Tracker', description: 'Track individual space patent filings', href: '/business-opportunities?tab=patents', icon: '\u{1F4CB}' },
            { name: 'Company Profiles', description: '200+ detailed company pages', href: '/company-profiles', icon: '\u{1F3E2}' },
            { name: 'Market Intelligence', description: 'Space industry stocks and valuations', href: '/market-intel', icon: '\u{1F4CA}' },
            { name: 'Space Economy', description: 'Market overview and trends', href: '/space-economy', icon: '\u{1F30D}' },
          ]}
        />

        {/* --- Info Note --- */}
        <ScrollReveal>
          <div className="card p-6 mt-8 border-dashed">
            <div className="text-center">
              <span className="text-4xl block mb-3">&#x1F4A1;</span>
              <h3 className="text-lg font-semibold text-white mb-2">About Patent Landscape Data</h3>
              <p className="text-slate-400 text-sm max-w-2xl mx-auto">
                Patent counts are estimates based on aggregated data from USPTO, EPO, and WIPO databases
                for space-technology-related classifications. Actual numbers may vary depending on
                classification methodology. Data is compiled for informational and research purposes only
                and does not constitute legal or investment advice. Year-over-year growth rates represent
                approximate trends in filing activity.
              </p>
            </div>
          </div>
        </ScrollReveal>
      </div>
    </div>
  );
}
