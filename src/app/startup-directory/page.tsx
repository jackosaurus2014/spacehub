'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import AnimatedPageHeader from '@/components/ui/AnimatedPageHeader';
import ScrollReveal, { StaggerContainer, StaggerItem } from '@/components/ui/ScrollReveal';
import ItemListSchema from '@/components/seo/ItemListSchema';
import RelatedModules from '@/components/ui/RelatedModules';
import { PAGE_RELATIONS } from '@/lib/module-relationships';

// ────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────

type FundingStage = 'Pre-seed' | 'Seed' | 'Series A' | 'Series B' | 'Series C+';
type Sector = 'Launch' | 'Satellites' | 'Data' | 'In-Space' | 'Ground';

interface Startup {
  name: string;
  slug: string;
  description: string;
  fundingRaised: string;
  founded: number;
  hq: string;
  stage: FundingStage;
  sector: Sector;
}

// ────────────────────────────────────────────────────────────────
// Data — 35 real space startups
// ────────────────────────────────────────────────────────────────

const STARTUPS: Startup[] = [
  // Launch
  { name: 'Relativity Space', slug: 'relativity-space', description: '3D-printed rockets with Terran R medium-lift reusable vehicle', fundingRaised: '$1.3B', founded: 2015, hq: 'Long Beach, CA', stage: 'Series C+', sector: 'Launch' },
  { name: 'Firefly Aerospace', slug: 'firefly-aerospace', description: 'Alpha small-sat launcher and lunar lander programs', fundingRaised: '$235M', founded: 2014, hq: 'Cedar Park, TX', stage: 'Series B', sector: 'Launch' },
  { name: 'Astra Space', slug: 'astra', description: 'Small satellite launch services and spacecraft engines', fundingRaised: '$400M', founded: 2016, hq: 'Alameda, CA', stage: 'Series C+', sector: 'Launch' },
  { name: 'Stoke Space', slug: 'stoke-space', description: 'Fully reusable rocket with novel second-stage recovery', fundingRaised: '$175M', founded: 2019, hq: 'Kent, WA', stage: 'Series B', sector: 'Launch' },
  { name: 'Impulse Space', slug: 'impulse-space', description: 'In-space transportation with orbital transfer vehicles', fundingRaised: '$150M', founded: 2021, hq: 'Redondo Beach, CA', stage: 'Series B', sector: 'Launch' },
  { name: 'Phantom Space', slug: 'phantom-space', description: 'Low-cost small satellite launch vehicles and satellite buses', fundingRaised: '$26M', founded: 2019, hq: 'Tucson, AZ', stage: 'Series A', sector: 'Launch' },
  { name: 'ABL Space Systems', slug: 'abl-space', description: 'RS1 responsive small-sat launcher with deployable launch system', fundingRaised: '$200M', founded: 2017, hq: 'El Segundo, CA', stage: 'Series B', sector: 'Launch' },

  // Satellites
  { name: 'Muon Space', slug: 'muon-space', description: 'Full-stack climate observation satellite constellation', fundingRaised: '$87M', founded: 2021, hq: 'Mountain View, CA', stage: 'Series A', sector: 'Satellites' },
  { name: 'Albedo', slug: 'albedo', description: 'Very low Earth orbit satellites for 10cm optical and 2m thermal imagery', fundingRaised: '$132M', founded: 2020, hq: 'Broomfield, CO', stage: 'Series B', sector: 'Satellites' },
  { name: 'Astranis', slug: 'astranis', description: 'Small GEO broadband satellites for underserved markets', fundingRaised: '$638M', founded: 2015, hq: 'San Francisco, CA', stage: 'Series C+', sector: 'Satellites' },
  { name: 'Swarm Technologies', slug: 'swarm-technologies', description: 'Ultra-small satellite constellation for IoT connectivity (acq. by SpaceX)', fundingRaised: '$35M', founded: 2016, hq: 'Mountain View, CA', stage: 'Series A', sector: 'Satellites' },
  { name: 'Lynk Global', slug: 'lynk-global', description: 'Direct satellite-to-phone connectivity for standard cell phones', fundingRaised: '$150M', founded: 2017, hq: 'Falls Church, VA', stage: 'Series B', sector: 'Satellites' },
  { name: 'Apex', slug: 'apex-space', description: 'Standardized satellite bus manufacturer for rapid spacecraft production', fundingRaised: '$95M', founded: 2022, hq: 'Los Angeles, CA', stage: 'Series B', sector: 'Satellites' },
  { name: 'Sidus Space', slug: 'sidus-space', description: 'Multi-sensor satellite platform for commercial and defense applications', fundingRaised: '$45M', founded: 2012, hq: 'Cape Canaveral, FL', stage: 'Series A', sector: 'Satellites' },

  // Data
  { name: 'Spire Global', slug: 'spire-global', description: 'Weather, maritime, and aviation data from multi-sensor nanosatellites', fundingRaised: '$310M', founded: 2012, hq: 'Vienna, VA', stage: 'Series C+', sector: 'Data' },
  { name: 'Planet Labs', slug: 'planet-labs', description: 'Daily whole-Earth imaging with 200+ Dove satellites', fundingRaised: '$600M', founded: 2010, hq: 'San Francisco, CA', stage: 'Series C+', sector: 'Data' },
  { name: 'BlackSky Technology', slug: 'blacksky-technology', description: 'Real-time geospatial intelligence platform with frequent-revisit imagery', fundingRaised: '$250M', founded: 2014, hq: 'Herndon, VA', stage: 'Series C+', sector: 'Data' },
  { name: 'ICEYE', slug: 'iceye', description: 'SAR microsatellite constellation for persistent all-weather monitoring', fundingRaised: '$304M', founded: 2014, hq: 'Espoo, Finland', stage: 'Series C+', sector: 'Data' },
  { name: 'Capella Space', slug: 'capella-space', description: 'SAR satellite constellation for day/night all-weather imaging', fundingRaised: '$220M', founded: 2016, hq: 'San Francisco, CA', stage: 'Series C+', sector: 'Data' },
  { name: 'HawkEye 360', slug: 'hawkeye-360', description: 'RF geolocation and analytics from space-based signals intelligence', fundingRaised: '$368M', founded: 2015, hq: 'Herndon, VA', stage: 'Series C+', sector: 'Data' },
  { name: 'Umbra', slug: 'umbra', description: 'High-resolution SAR satellite imagery with on-demand tasking', fundingRaised: '$115M', founded: 2015, hq: 'Santa Barbara, CA', stage: 'Series B', sector: 'Data' },
  { name: 'Tomorrow.io', slug: 'tomorrow-io', description: 'Weather intelligence platform with proprietary radar satellite constellation', fundingRaised: '$220M', founded: 2016, hq: 'Boston, MA', stage: 'Series C+', sector: 'Data' },

  // In-Space
  { name: 'Astroscale', slug: 'astroscale', description: 'Active debris removal and satellite life extension on-orbit services', fundingRaised: '$376M', founded: 2013, hq: 'Tokyo, Japan', stage: 'Series C+', sector: 'In-Space' },
  { name: 'Momentus', slug: 'momentus', description: 'Vigoride orbital transfer vehicle for last-mile satellite deployment', fundingRaised: '$180M', founded: 2017, hq: 'San Jose, CA', stage: 'Series C+', sector: 'In-Space' },
  { name: 'Varda Space Industries', slug: 'varda-space', description: 'In-space manufacturing of pharmaceuticals and high-value materials', fundingRaised: '$200M', founded: 2020, hq: 'El Segundo, CA', stage: 'Series B', sector: 'In-Space' },
  { name: 'True Anomaly', slug: 'true-anomaly', description: 'Space domain awareness and orbital security for defense applications', fundingRaised: '$158M', founded: 2022, hq: 'Colorado Springs, CO', stage: 'Series B', sector: 'In-Space' },
  { name: 'Orbit Fab', slug: 'orbit-fab', description: 'In-space refueling depots and satellite servicing interfaces', fundingRaised: '$32M', founded: 2018, hq: 'San Francisco, CA', stage: 'Series A', sector: 'In-Space' },
  { name: 'Starfish Space', slug: 'starfish-space', description: 'Satellite servicing with autonomous rendezvous and docking technology', fundingRaised: '$21M', founded: 2019, hq: 'Kent, WA', stage: 'Seed', sector: 'In-Space' },
  { name: 'CisLunar Industries', slug: 'cislunar-industries', description: 'In-space metal manufacturing from recycled orbital debris', fundingRaised: '$3M', founded: 2021, hq: 'Denver, CO', stage: 'Pre-seed', sector: 'In-Space' },
  { name: 'Axiom Space', slug: 'axiom-space', description: 'Building first commercial space station and manages ISS commercial missions', fundingRaised: '$505M', founded: 2016, hq: 'Houston, TX', stage: 'Series C+', sector: 'In-Space' },
  { name: 'Vast', slug: 'vast', description: 'Haven-1 commercial space station and artificial gravity technology', fundingRaised: '$400M', founded: 2021, hq: 'Long Beach, CA', stage: 'Series B', sector: 'In-Space' },

  // Ground
  { name: 'Leaf Space', slug: 'leaf-space', description: 'Ground station as a service for LEO satellite operators', fundingRaised: '$37M', founded: 2014, hq: 'Lomazzo, Italy', stage: 'Series A', sector: 'Ground' },
  { name: 'Atlas Space Operations', slug: 'atlas-space', description: 'Cloud-based ground station network and satellite operations platform', fundingRaised: '$35M', founded: 2015, hq: 'Traverse City, MI', stage: 'Series A', sector: 'Ground' },
  { name: 'Cognitive Space', slug: 'cognitive-space', description: 'AI-driven satellite operations optimization and scheduling', fundingRaised: '$9M', founded: 2018, hq: 'Houston, TX', stage: 'Seed', sector: 'Ground' },
  { name: 'Slingshot Aerospace', slug: 'slingshot-aerospace', description: 'Space domain awareness and collision avoidance platform', fundingRaised: '$78M', founded: 2017, hq: 'Austin, TX', stage: 'Series B', sector: 'Ground' },
  { name: 'LeoLabs', slug: 'leolabs', description: 'Commercial space tracking radar network for LEO object monitoring', fundingRaised: '$82M', founded: 2016, hq: 'Menlo Park, CA', stage: 'Series B', sector: 'Ground' },
];

// ────────────────────────────────────────────────────────────────
// Constants
// ────────────────────────────────────────────────────────────────

const ALL_STAGES: FundingStage[] = ['Pre-seed', 'Seed', 'Series A', 'Series B', 'Series C+'];
const ALL_SECTORS: Sector[] = ['Launch', 'Satellites', 'Data', 'In-Space', 'Ground'];

const STAGE_COLORS: Record<FundingStage, string> = {
  'Pre-seed': '#94a3b8',
  'Seed': '#f59e0b',
  'Series A': '#3b82f6',
  'Series B': '#a855f7',
  'Series C+': '#10b981',
};

const SECTOR_COLORS: Record<Sector, string> = {
  'Launch': '#f59e0b',
  'Satellites': '#3b82f6',
  'Data': '#10b981',
  'In-Space': '#a855f7',
  'Ground': '#f97316',
};

// ────────────────────────────────────────────────────────────────
// Startup Card
// ────────────────────────────────────────────────────────────────

function StartupCard({ startup }: { startup: Startup }) {
  const stageColor = STAGE_COLORS[startup.stage];
  const sectorColor = SECTOR_COLORS[startup.sector];

  return (
    <div className="bg-white/[0.04] border border-white/[0.06] rounded-xl p-4 hover:border-white/[0.12] transition-all group">
      {/* Header */}
      <div className="flex items-start justify-between mb-2">
        <Link
          href={`/company-profiles/${startup.slug}`}
          className="text-sm font-semibold text-white hover:underline decoration-slate-400/40 underline-offset-2 group-hover:text-blue-300 transition-colors"
        >
          {startup.name}
        </Link>
        <span
          className="text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0 ml-2"
          style={{ backgroundColor: `${stageColor}20`, color: stageColor }}
        >
          {startup.stage}
        </span>
      </div>

      {/* Description */}
      <p className="text-xs text-slate-400 leading-relaxed mb-3">{startup.description}</p>

      {/* Meta row */}
      <div className="flex items-center justify-between text-[10px]">
        <div className="flex items-center gap-3">
          <span className="text-emerald-400 font-semibold">{startup.fundingRaised}</span>
          <span className="text-slate-500">Est. {startup.founded}</span>
          <span className="text-slate-500">{startup.hq}</span>
        </div>
        <span
          className="px-1.5 py-0.5 rounded text-[9px] font-medium"
          style={{ backgroundColor: `${sectorColor}15`, color: sectorColor }}
        >
          {startup.sector}
        </span>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────
// Main Page
// ────────────────────────────────────────────────────────────────

export default function StartupDirectoryPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStage, setSelectedStage] = useState<FundingStage | null>(null);
  const [selectedSector, setSelectedSector] = useState<Sector | null>(null);
  const [sortBy, setSortBy] = useState<'name' | 'funding' | 'founded'>('name');

  const filteredStartups = useMemo(() => {
    let results = STARTUPS;

    if (selectedStage) {
      results = results.filter((s) => s.stage === selectedStage);
    }
    if (selectedSector) {
      results = results.filter((s) => s.sector === selectedSector);
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      results = results.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.description.toLowerCase().includes(q) ||
          s.hq.toLowerCase().includes(q)
      );
    }

    // Sort
    results = [...results].sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'founded') return b.founded - a.founded;
      // Sort by funding (parse numeric value)
      const parseFunding = (f: string) => {
        const num = parseFloat(f.replace(/[^0-9.]/g, ''));
        return f.includes('B') ? num * 1000 : num;
      };
      return parseFunding(b.fundingRaised) - parseFunding(a.fundingRaised);
    });

    return results;
  }, [searchQuery, selectedStage, selectedSector, sortBy]);

  // Stats
  const sectorCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    ALL_SECTORS.forEach((s) => {
      counts[s] = STARTUPS.filter((st) => st.sector === s).length;
    });
    return counts;
  }, []);

  const stageCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    ALL_STAGES.forEach((s) => {
      counts[s] = STARTUPS.filter((st) => st.stage === s).length;
    });
    return counts;
  }, []);

  return (
    <div className="min-h-screen bg-space-900 py-8">
      <ItemListSchema
        name="Space Startup Directory"
        description="Curated directory of notable space startups organized by funding stage and sector"
        url="/startup-directory"
        items={STARTUPS.slice(0, 20).map((s) => ({
          name: s.name,
          url: `/company-profiles/${s.slug}`,
          description: s.description,
        }))}
      />

      <div className="container mx-auto px-4">
        <AnimatedPageHeader
          title="Space Startup Directory"
          subtitle={`${STARTUPS.length} notable space startups across ${ALL_SECTORS.length} sectors and all funding stages`}
          icon="S"
          accentColor="green"
        />

        {/* Overview banner */}
        <ScrollReveal>
          <div className="bg-gradient-to-r from-emerald-500/10 to-blue-500/10 border border-emerald-500/20 rounded-xl p-5 mb-8">
            <p className="text-white/70 text-sm leading-relaxed">
              A curated list of the most notable space startups, from{' '}
              <strong className="text-amber-400">pre-seed</strong> through{' '}
              <strong className="text-emerald-400">Series C+</strong>. Each company includes funding
              raised, founding year, headquarters, and sector classification. Click any startup name to
              view their full company intelligence profile on SpaceNexus.
            </p>
          </div>
        </ScrollReveal>

        {/* Sector summary stats */}
        <ScrollReveal>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
            {ALL_SECTORS.map((sector) => (
              <button
                key={sector}
                onClick={() =>
                  setSelectedSector(selectedSector === sector ? null : sector)
                }
                className={`border rounded-xl p-3 text-center transition-all hover:scale-[1.02] ${
                  selectedSector === sector
                    ? 'border-white/30 ring-1 ring-white/20'
                    : 'border-white/[0.08]'
                }`}
                style={{
                  backgroundColor: `${SECTOR_COLORS[sector]}10`,
                }}
              >
                <div className="text-lg font-bold" style={{ color: SECTOR_COLORS[sector] }}>
                  {sectorCounts[sector]}
                </div>
                <div className="text-slate-400 text-xs mt-0.5">{sector}</div>
              </button>
            ))}
          </div>
        </ScrollReveal>

        {/* Stage summary stats */}
        <ScrollReveal>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 mb-8">
            {ALL_STAGES.map((stage) => (
              <button
                key={stage}
                onClick={() =>
                  setSelectedStage(selectedStage === stage ? null : stage)
                }
                className={`border rounded-xl p-3 text-center transition-all hover:scale-[1.02] ${
                  selectedStage === stage
                    ? 'border-white/30 ring-1 ring-white/20'
                    : 'border-white/[0.08]'
                }`}
                style={{
                  backgroundColor: `${STAGE_COLORS[stage]}10`,
                }}
              >
                <div className="text-lg font-bold" style={{ color: STAGE_COLORS[stage] }}>
                  {stageCounts[stage]}
                </div>
                <div className="text-slate-400 text-xs mt-0.5">{stage}</div>
              </button>
            ))}
          </div>
        </ScrollReveal>

        {/* Search and sort controls */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="flex-1">
            <input
              type="search"
              aria-label="Search startups"
              placeholder="Search startups by name, description, or location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white/[0.06] border border-white/[0.08] text-white rounded-lg px-4 py-2.5 h-11 text-sm placeholder-slate-400 focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/30 outline-none"
            />
          </div>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'name' | 'funding' | 'founded')}
            className="bg-white/[0.06] border border-white/[0.08] text-white rounded-lg px-4 py-2.5 h-11 text-sm outline-none focus:ring-2 focus:ring-emerald-500/30 shrink-0"
            aria-label="Sort startups"
          >
            <option value="name">Sort: A-Z</option>
            <option value="funding">Sort: Most Funded</option>
            <option value="founded">Sort: Newest First</option>
          </select>
          {(selectedStage || selectedSector || searchQuery) && (
            <button
              onClick={() => {
                setSelectedStage(null);
                setSelectedSector(null);
                setSearchQuery('');
              }}
              className="px-4 py-2.5 bg-white/[0.06] border border-white/[0.08] rounded-lg text-sm text-slate-400 hover:text-white transition-colors shrink-0"
            >
              Clear filters
            </button>
          )}
        </div>

        {/* Active filter pills */}
        <div className="flex flex-wrap gap-2 mb-6">
          {/* Sector filter pills */}
          <button
            onClick={() => setSelectedSector(null)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              !selectedSector
                ? 'bg-white text-slate-900'
                : 'bg-white/[0.04] text-slate-400 hover:text-white'
            }`}
          >
            All Sectors
          </button>
          {ALL_SECTORS.map((sector) => (
            <button
              key={sector}
              onClick={() =>
                setSelectedSector(selectedSector === sector ? null : sector)
              }
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                selectedSector === sector
                  ? 'text-white'
                  : 'bg-white/[0.04] text-slate-400 hover:text-white'
              }`}
              style={
                selectedSector === sector
                  ? { backgroundColor: SECTOR_COLORS[sector] }
                  : undefined
              }
            >
              {sector}
            </button>
          ))}
          <span className="text-slate-600 text-xs self-center px-1">|</span>
          {/* Stage filter pills */}
          <button
            onClick={() => setSelectedStage(null)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              !selectedStage
                ? 'bg-white text-slate-900'
                : 'bg-white/[0.04] text-slate-400 hover:text-white'
            }`}
          >
            All Stages
          </button>
          {ALL_STAGES.map((stage) => (
            <button
              key={stage}
              onClick={() =>
                setSelectedStage(selectedStage === stage ? null : stage)
              }
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                selectedStage === stage
                  ? 'text-white'
                  : 'bg-white/[0.04] text-slate-400 hover:text-white'
              }`}
              style={
                selectedStage === stage
                  ? { backgroundColor: STAGE_COLORS[stage] }
                  : undefined
              }
            >
              {stage}
            </button>
          ))}
        </div>

        {/* Results count */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-slate-400 text-sm">
            Showing <strong className="text-white">{filteredStartups.length}</strong> of{' '}
            {STARTUPS.length} startups
          </p>
        </div>

        {/* Startup grid */}
        {filteredStartups.length > 0 ? (
          <StaggerContainer>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredStartups.map((startup) => (
                <StaggerItem key={startup.slug}>
                  <StartupCard startup={startup} />
                </StaggerItem>
              ))}
            </div>
          </StaggerContainer>
        ) : (
          <div className="text-center py-16">
            <p className="text-slate-400 text-sm mb-3">No startups match your filters.</p>
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedStage(null);
                setSelectedSector(null);
              }}
              className="text-sm text-emerald-400 hover:text-emerald-300"
            >
              Clear all filters
            </button>
          </div>
        )}

        {/* CTA: Missing startup */}
        <ScrollReveal>
          <div className="mt-12 bg-gradient-to-r from-emerald-500/10 to-blue-500/10 border border-emerald-500/20 rounded-xl p-6 text-center">
            <h3 className="text-white font-semibold mb-2">Is your startup missing?</h3>
            <p className="text-slate-400 text-sm mb-4 max-w-lg mx-auto">
              We are continuously expanding our directory. If your space startup is not listed here,
              let us know and we will review it for inclusion.
            </p>
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded-lg transition-colors"
            >
              Contact Us
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
          </div>
        </ScrollReveal>

        {/* Summary stats */}
        <ScrollReveal>
          <div className="mt-8 bg-white/[0.03] border border-white/[0.06] rounded-xl p-6">
            <h3 className="text-white font-semibold mb-4">Directory at a Glance</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-emerald-400">{STARTUPS.length}</div>
                <div className="text-slate-400 text-xs mt-1">Startups Listed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-400">{ALL_SECTORS.length}</div>
                <div className="text-slate-400 text-xs mt-1">Sectors Covered</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-amber-400">{ALL_STAGES.length}</div>
                <div className="text-slate-400 text-xs mt-1">Funding Stages</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-400">
                  {STARTUPS.filter((s) => s.stage === 'Series C+').length}
                </div>
                <div className="text-slate-400 text-xs mt-1">Growth-Stage Companies</div>
              </div>
            </div>
          </div>
        </ScrollReveal>

        {/* Related modules */}
        <div className="mt-8 pt-8 border-t border-white/[0.06]">
          <RelatedModules modules={PAGE_RELATIONS['startup-directory']} />
        </div>

        {/* Related links fallback */}
        <div className="mt-6">
          <h3 className="text-slate-400 text-sm font-medium mb-4">Related Resources</h3>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/startup-tracker"
              className="px-4 py-2 bg-white/[0.04] border border-white/[0.06] rounded-lg text-sm text-white/70 hover:text-white hover:border-emerald-500/50 transition-all"
            >
              Startup Tracker
            </Link>
            <Link
              href="/space-map"
              className="px-4 py-2 bg-white/[0.04] border border-white/[0.06] rounded-lg text-sm text-white/70 hover:text-white hover:border-emerald-500/50 transition-all"
            >
              Space Industry Map
            </Link>
            <Link
              href="/funding-rounds"
              className="px-4 py-2 bg-white/[0.04] border border-white/[0.06] rounded-lg text-sm text-white/70 hover:text-white hover:border-emerald-500/50 transition-all"
            >
              Funding Rounds
            </Link>
            <Link
              href="/company-profiles"
              className="px-4 py-2 bg-white/[0.04] border border-white/[0.06] rounded-lg text-sm text-white/70 hover:text-white hover:border-emerald-500/50 transition-all"
            >
              Company Profiles
            </Link>
            <Link
              href="/space-capital"
              className="px-4 py-2 bg-white/[0.04] border border-white/[0.06] rounded-lg text-sm text-white/70 hover:text-white hover:border-emerald-500/50 transition-all"
            >
              Space Capital
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
