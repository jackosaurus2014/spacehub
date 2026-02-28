'use client';

import { useState, useMemo, Suspense } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import AnimatedPageHeader from '@/components/ui/AnimatedPageHeader';
import ScrollReveal, { StaggerContainer, StaggerItem } from '@/components/ui/ScrollReveal';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import ExportButton from '@/components/ui/ExportButton';
import BreadcrumbSchema from '@/components/seo/BreadcrumbSchema';
import FAQSchema from '@/components/seo/FAQSchema';
import AdSlot from '@/components/ads/AdSlot';
import EmptyState from '@/components/ui/EmptyState';
import RelatedModules from '@/components/ui/RelatedModules';
import { PAGE_RELATIONS } from '@/lib/module-relationships';

// ────────────────────────────────────────
// Types
// ────────────────────────────────────────

type Stage = 'Early' | 'Series A' | 'Series B' | 'Late' | 'Public' | 'Restructuring';
type Status = 'Active' | 'Restructuring' | 'Public';
type Sector =
  | 'Launch'
  | 'Earth Observation'
  | 'Data/Analytics'
  | 'In-Space Transport'
  | 'Space Stations'
  | 'Manufacturing'
  | 'Debris Removal'
  | 'Space Domain Awareness'
  | 'Weather/Climate'
  | 'Propulsion'
  | 'Defense'
  | 'Communications'
  | 'Space Tourism'
  | 'Software & Data'
  | 'Energy'
  | 'Space Mining'
  | 'Satellites';

interface SpaceStartup {
  name: string;
  founded: number;
  hq: string;
  funding: string;
  stage: Stage;
  sector: Sector;
  description: string;
  employees: string;
  status: Status;
}

// ────────────────────────────────────────
// Startup Data
// ────────────────────────────────────────

const SPACE_STARTUPS: SpaceStartup[] = [
  { name: 'Relativity Space', founded: 2015, hq: 'Long Beach, CA', funding: '$1.34B', stage: 'Late', sector: 'Launch', description: '3D-printed rockets, Terran R medium-lift vehicle', employees: '1,000+', status: 'Active' },
  { name: 'Rocket Lab', founded: 2006, hq: 'Long Beach, CA', funding: '$790M', stage: 'Public', sector: 'Launch', description: 'Small-lift Electron, medium-lift Neutron in development', employees: '1,800+', status: 'Active' },
  { name: 'Astra Space', founded: 2016, hq: 'Alameda, CA', funding: '$400M', stage: 'Public', sector: 'Launch', description: 'Small satellite launch vehicles and spacecraft engines', employees: '200+', status: 'Restructuring' },
  { name: 'Planet Labs', founded: 2010, hq: 'San Francisco, CA', funding: '$600M', stage: 'Public', sector: 'Earth Observation', description: 'Largest fleet of Earth-imaging satellites, 200+ Doves', employees: '800+', status: 'Active' },
  { name: 'Spire Global', founded: 2012, hq: 'Vienna, VA', funding: '$370M', stage: 'Public', sector: 'Data/Analytics', description: 'Space-based data analytics using 100+ nanosatellites', employees: '600+', status: 'Active' },
  { name: 'Momentus', founded: 2017, hq: 'San Jose, CA', funding: '$148M', stage: 'Public', sector: 'In-Space Transport', description: 'In-space transportation using water plasma propulsion', employees: '100+', status: 'Active' },
  { name: 'Axiom Space', founded: 2016, hq: 'Houston, TX', funding: '$505M', stage: 'Late', sector: 'Space Stations', description: 'Commercial space station modules, private astronaut missions', employees: '800+', status: 'Active' },
  { name: 'Vast', founded: 2021, hq: 'Long Beach, CA', funding: '$400M', stage: 'Early', sector: 'Space Stations', description: 'Haven-1 commercial space station, artificial gravity research', employees: '400+', status: 'Active' },
  { name: 'Varda Space', founded: 2020, hq: 'El Segundo, CA', funding: '$150M', stage: 'Series B', sector: 'Manufacturing', description: 'In-space pharmaceutical and materials manufacturing', employees: '150+', status: 'Active' },
  { name: 'Astroscale', founded: 2013, hq: 'Tokyo, Japan', funding: '$376M', stage: 'Late', sector: 'Debris Removal', description: 'Active debris removal and on-orbit servicing', employees: '500+', status: 'Active' },
  { name: 'Impulse Space', founded: 2021, hq: 'Redondo Beach, CA', funding: '$225M', stage: 'Series B', sector: 'In-Space Transport', description: 'Orbital transfer vehicles and Mars lander', employees: '200+', status: 'Active' },
  { name: 'Stoke Space', founded: 2019, hq: 'Kent, WA', funding: '$175M', stage: 'Series B', sector: 'Launch', description: '100% reusable rocket with novel upper stage recovery', employees: '300+', status: 'Active' },
  { name: 'Phantom Space', founded: 2019, hq: 'Tucson, AZ', funding: '$24M', stage: 'Series A', sector: 'Launch', description: 'Small satellite launch vehicles using COTS components', employees: '100+', status: 'Active' },
  { name: 'True Anomaly', founded: 2022, hq: 'Denver, CO', funding: '$155M', stage: 'Series B', sector: 'Space Domain Awareness', description: 'AI-powered spacecraft for space domain awareness', employees: '150+', status: 'Active' },
  { name: 'Muon Space', founded: 2021, hq: 'Mountain View, CA', funding: '$82M', stage: 'Series B', sector: 'Weather/Climate', description: 'Weather and climate monitoring satellite constellation', employees: '100+', status: 'Active' },
  { name: 'Isar Aerospace', founded: 2018, hq: 'Ottobrunn, Germany', funding: '$310M', stage: 'Late', sector: 'Launch', description: 'European small/medium launch with Spectrum rocket', employees: '300+', status: 'Active' },
  { name: 'Skyroot Aerospace', founded: 2018, hq: 'Hyderabad, India', funding: '$80M', stage: 'Late', sector: 'Launch', description: "India's first private rocket company, Vikram launch series", employees: '250+', status: 'Active' },
  { name: 'PLD Space', founded: 2011, hq: 'Elche, Spain', funding: '$120M', stage: 'Late', sector: 'Launch', description: "Europe's first private rocket (MIURA 1), reusable Miura 5", employees: '120+', status: 'Active' },
  { name: 'Albedo Space', founded: 2020, hq: 'Denver, CO', funding: '$170M', stage: 'Series B', sector: 'Earth Observation', description: 'Very-low-Earth-orbit 10cm resolution optical and thermal imagery', employees: '80+', status: 'Active' },
  { name: 'K2 Space', founded: 2022, hq: 'Los Angeles, CA', funding: '$70M', stage: 'Series A', sector: 'Satellites', description: 'Very large, low-cost satellites with simplified architecture', employees: '60+', status: 'Active' },
  { name: 'AstroForge', founded: 2022, hq: 'Huntington Beach, CA', funding: '$55M', stage: 'Series A', sector: 'Space Mining', description: 'Asteroid mining for platinum-group metals', employees: '40+', status: 'Active' },
  { name: 'Astranis', founded: 2015, hq: 'San Francisco, CA', funding: '$500M', stage: 'Late', sector: 'Satellites', description: 'Small GEO broadband satellites for individual countries/regions', employees: '350+', status: 'Active' },
  { name: 'ICEYE', founded: 2014, hq: 'Espoo, Finland', funding: '$380M', stage: 'Late', sector: 'Earth Observation', description: "World's largest commercial SAR satellite constellation", employees: '500+', status: 'Active' },
  { name: 'Capella Space', founded: 2016, hq: 'San Francisco, CA', funding: '$230M', stage: 'Late', sector: 'Earth Observation', description: 'Sub-meter SAR imagery, all-weather day-and-night observation', employees: '150+', status: 'Active' },
  { name: 'Aalyria Technologies', founded: 2022, hq: 'Livermore, CA', funding: '$100M', stage: 'Series A', sector: 'Communications', description: 'Google spinoff, laser comms and AI network orchestration', employees: '80+', status: 'Active' },
  { name: 'HawkEye 360', founded: 2015, hq: 'Herndon, VA', funding: '$300M', stage: 'Late', sector: 'Defense', description: 'RF geospatial analytics using satellite clusters', employees: '180+', status: 'Active' },
  { name: 'Space Perspective', founded: 2019, hq: 'Titusville, FL', funding: '$115M', stage: 'Series B', sector: 'Space Tourism', description: 'Stratospheric balloon flights to edge of space', employees: '80+', status: 'Active' },
  { name: 'Epsilon3', founded: 2021, hq: 'Los Angeles, CA', funding: '$50M', stage: 'Series B', sector: 'Software & Data', description: 'Operating system for spacecraft and launch vehicle operations', employees: '40+', status: 'Active' },
  { name: 'Pulsar Fusion', founded: 2011, hq: 'Bletchley, UK', funding: '$20M', stage: 'Series A', sector: 'Propulsion', description: 'Nuclear fusion rocket engines for 30-day Mars trips', employees: '40+', status: 'Active' },
  { name: 'Aetherflux', founded: 2023, hq: 'Silicon Valley, CA', funding: '$50M', stage: 'Early', sector: 'Energy', description: 'Space-based solar power and orbital data centers', employees: '25+', status: 'Active' },
  { name: 'Orbit Fab', founded: 2018, hq: 'San Francisco, CA', funding: '$35M', stage: 'Series A', sector: 'In-Space Transport', description: 'In-orbit refueling infrastructure, gas stations in space', employees: '40+', status: 'Active' },
  { name: 'Apex', founded: 2022, hq: 'Los Angeles, CA', funding: '$120M', stage: 'Series B', sector: 'Satellites', description: 'Standardized Aries satellite bus platforms for rapid delivery', employees: '100+', status: 'Active' },
  { name: 'Pixxel', founded: 2019, hq: 'Bangalore, India', funding: '$70M', stage: 'Series B', sector: 'Earth Observation', description: 'Hyperspectral imaging constellation for environmental monitoring', employees: '120+', status: 'Active' },
  { name: 'Umbra', founded: 2015, hq: 'Santa Barbara, CA', funding: '$160M', stage: 'Late', sector: 'Earth Observation', description: 'Highest-resolution commercial SAR imagery on-demand', employees: '100+', status: 'Active' },
  { name: 'CesiumAstro', founded: 2017, hq: 'Austin, TX', funding: '$130M', stage: 'Late', sector: 'Communications', description: 'Active phased array antennas for satellites, aircraft, and UAVs', employees: '150+', status: 'Active' },
  { name: 'Morpheus Space', founded: 2018, hq: 'Dresden, Germany', funding: '$50M', stage: 'Series B', sector: 'Propulsion', description: 'Scalable ion thruster systems for satellite constellations', employees: '70+', status: 'Active' },
];

// ────────────────────────────────────────
// Constants
// ────────────────────────────────────────

const ALL_SECTORS: Sector[] = [
  'Launch', 'Earth Observation', 'Satellites', 'In-Space Transport',
  'Space Stations', 'Manufacturing', 'Debris Removal', 'Space Domain Awareness',
  'Weather/Climate', 'Data/Analytics', 'Defense', 'Communications',
  'Space Tourism', 'Software & Data', 'Energy', 'Propulsion', 'Space Mining',
];

const ALL_STAGES: Stage[] = ['Early', 'Series A', 'Series B', 'Late', 'Public', 'Restructuring'];

const ALL_STATUSES: Status[] = ['Active', 'Restructuring', 'Public'];

const SECTOR_COLORS: Record<string, string> = {
  'Launch': 'bg-red-500/20 text-red-400',
  'Earth Observation': 'bg-emerald-500/20 text-emerald-400',
  'Satellites': 'bg-cyan-500/20 text-cyan-400',
  'In-Space Transport': 'bg-violet-500/20 text-violet-400',
  'Space Stations': 'bg-amber-500/20 text-amber-400',
  'Manufacturing': 'bg-pink-500/20 text-pink-400',
  'Debris Removal': 'bg-lime-500/20 text-lime-400',
  'Space Domain Awareness': 'bg-orange-500/20 text-orange-400',
  'Weather/Climate': 'bg-sky-500/20 text-sky-400',
  'Data/Analytics': 'bg-indigo-500/20 text-indigo-400',
  'Defense': 'bg-rose-500/20 text-rose-400',
  'Communications': 'bg-teal-500/20 text-teal-400',
  'Space Tourism': 'bg-fuchsia-500/20 text-fuchsia-400',
  'Software & Data': 'bg-blue-500/20 text-blue-400',
  'Energy': 'bg-yellow-500/20 text-yellow-400',
  'Propulsion': 'bg-purple-500/20 text-purple-400',
  'Space Mining': 'bg-stone-500/20 text-stone-400',
};

const SECTOR_BAR_COLORS: Record<string, string> = {
  'Launch': 'bg-red-500',
  'Earth Observation': 'bg-emerald-500',
  'Satellites': 'bg-cyan-500',
  'In-Space Transport': 'bg-violet-500',
  'Space Stations': 'bg-amber-500',
  'Manufacturing': 'bg-pink-500',
  'Debris Removal': 'bg-lime-500',
  'Space Domain Awareness': 'bg-orange-500',
  'Weather/Climate': 'bg-sky-500',
  'Data/Analytics': 'bg-indigo-500',
  'Defense': 'bg-rose-500',
  'Communications': 'bg-teal-500',
  'Space Tourism': 'bg-fuchsia-500',
  'Software & Data': 'bg-blue-500',
  'Energy': 'bg-yellow-500',
  'Propulsion': 'bg-purple-500',
  'Space Mining': 'bg-stone-500',
};

const STAGE_COLORS: Record<Stage, string> = {
  'Early': 'bg-slate-500/20 text-slate-400',
  'Series A': 'bg-blue-500/20 text-blue-400',
  'Series B': 'bg-purple-500/20 text-purple-400',
  'Late': 'bg-green-500/20 text-green-400',
  'Public': 'bg-cyan-500/20 text-cyan-400',
  'Restructuring': 'bg-rose-500/20 text-rose-400',
};

const STATUS_COLORS: Record<Status, string> = {
  'Active': 'text-green-400',
  'Restructuring': 'text-amber-400',
  'Public': 'text-cyan-400',
};

// ────────────────────────────────────────
// Utility
// ────────────────────────────────────────

function parseFundingToNumber(f: string): number {
  const cleaned = f.replace(/[^0-9.BbMm]/g, '');
  const num = parseFloat(cleaned.replace(/[BbMm]/g, ''));
  if (isNaN(num)) return 0;
  if (/B/i.test(f)) return num * 1000;
  return num; // Already in millions
}

function formatTotalFunding(totalMillions: number): string {
  if (totalMillions >= 1000) {
    return `$${(totalMillions / 1000).toFixed(1)}B`;
  }
  return `$${totalMillions.toFixed(0)}M`;
}

// ────────────────────────────────────────
// Sector Distribution Chart (div-based)
// ────────────────────────────────────────

function SectorDistributionChart({ startups }: { startups: SpaceStartup[] }) {
  const sectorCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    startups.forEach((s) => {
      counts[s.sector] = (counts[s.sector] || 0) + 1;
    });
    return Object.entries(counts)
      .sort(([, a], [, b]) => b - a)
      .map(([sector, count]) => ({ sector, count }));
  }, [startups]);

  const maxCount = Math.max(...sectorCounts.map((s) => s.count), 1);

  return (
    <div className="card p-5 mb-6">
      <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
        <svg className="w-5 h-5 text-nebula-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
        Sector Distribution
      </h3>
      <div className="space-y-2">
        {sectorCounts.map(({ sector, count }) => {
          const pct = Math.round((count / maxCount) * 100);
          return (
            <div key={sector} className="flex items-center gap-3">
              <div className="w-40 sm:w-48 text-sm text-slate-300 truncate flex-shrink-0" title={sector}>
                {sector}
              </div>
              <div className="flex-1 h-6 bg-slate-800 rounded-md overflow-hidden relative">
                <div
                  className={`h-full rounded-md transition-all duration-700 ${SECTOR_BAR_COLORS[sector] || 'bg-slate-500'}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <div className="w-8 text-right text-sm font-medium text-slate-400 flex-shrink-0">
                {count}

        <RelatedModules modules={PAGE_RELATIONS['startup-tracker']} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ────────────────────────────────────────
// Startup Card
// ────────────────────────────────────────

function StartupCard({ startup }: { startup: SpaceStartup }) {
  return (
    <div className="card p-5 transition-all hover:border-nebula-500/40 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-white text-lg leading-tight">{startup.name}</h3>
          <div className="flex items-center gap-2 mt-1 text-sm text-slate-400">
            <span>{startup.hq}</span>
            <span className="text-slate-600">|</span>
            <span>Est. {startup.founded}</span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
          <span className={`text-xs font-medium px-2 py-0.5 rounded ${SECTOR_COLORS[startup.sector] || 'bg-slate-700 text-slate-300'}`}>
            {startup.sector}
          </span>
          <span className={`text-xs font-medium px-2 py-0.5 rounded ${STAGE_COLORS[startup.stage]}`}>
            {startup.stage}
          </span>
        </div>
      </div>

      {/* Description */}
      <p className="text-slate-400 text-sm mb-4 leading-relaxed flex-1">{startup.description}</p>

      {/* Metrics Row */}
      <div className="grid grid-cols-3 gap-3 pt-3 border-t border-slate-700/50">
        <div>
          <div className="text-xs text-slate-500 uppercase tracking-wider">Funding</div>
          <div className="text-white font-semibold text-sm">{startup.funding}</div>
        </div>
        <div>
          <div className="text-xs text-slate-500 uppercase tracking-wider">Team</div>
          <div className="text-white font-medium text-sm">{startup.employees}</div>
        </div>
        <div>
          <div className="text-xs text-slate-500 uppercase tracking-wider">Status</div>
          <div className={`font-medium text-sm ${STATUS_COLORS[startup.status]}`}>
            {startup.status === 'Active' && (
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-400 mr-1.5 align-middle" />
            )}
            {startup.status === 'Restructuring' && (
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-400 mr-1.5 align-middle" />
            )}
            {startup.status}
          </div>
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────
// Main Content
// ────────────────────────────────────────

function StartupTrackerContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [selectedSector, setSelectedSector] = useState<Sector | ''>(
    (searchParams.get('sector') as Sector | '') || ''
  );
  const [selectedStage, setSelectedStage] = useState<Stage | ''>(
    (searchParams.get('stage') as Stage | '') || ''
  );
  const [selectedStatus, setSelectedStatus] = useState<Status | ''>(
    (searchParams.get('status') as Status | '') || ''
  );
  const [sortBy, setSortBy] = useState<'name' | 'founded' | 'funding'>(
    (searchParams.get('sort') as 'name' | 'founded' | 'funding') || 'funding'
  );

  // Compute active sectors/stages (that actually have data)
  const activeSectors = useMemo(() => {
    const set = new Set(SPACE_STARTUPS.map((s) => s.sector));
    return ALL_SECTORS.filter((s) => set.has(s));
  }, []);

  const activeStages = useMemo(() => {
    const set = new Set(SPACE_STARTUPS.map((s) => s.stage));
    return ALL_STAGES.filter((s) => set.has(s));
  }, []);

  const activeStatuses = useMemo(() => {
    const set = new Set(SPACE_STARTUPS.map((s) => s.status));
    return ALL_STATUSES.filter((s) => set.has(s));
  }, []);

  // Filter and sort
  const filteredStartups = useMemo(() => {
    let results = [...SPACE_STARTUPS];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      results = results.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.sector.toLowerCase().includes(q) ||
          s.hq.toLowerCase().includes(q) ||
          s.description.toLowerCase().includes(q) ||
          s.stage.toLowerCase().includes(q)
      );
    }
    if (selectedSector) {
      results = results.filter((s) => s.sector === selectedSector);
    }
    if (selectedStage) {
      results = results.filter((s) => s.stage === selectedStage);
    }
    if (selectedStatus) {
      results = results.filter((s) => s.status === selectedStatus);
    }

    results.sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'founded') return b.founded - a.founded;
      return parseFundingToNumber(b.funding) - parseFundingToNumber(a.funding);
    });

    return results;
  }, [searchQuery, selectedSector, selectedStage, selectedStatus, sortBy]);

  // Total funding
  const totalFundingMillions = useMemo(() => {
    return SPACE_STARTUPS.reduce((sum, s) => sum + parseFundingToNumber(s.funding), 0);
  }, []);

  const filteredTotalFundingMillions = useMemo(() => {
    return filteredStartups.reduce((sum, s) => sum + parseFundingToNumber(s.funding), 0);
  }, [filteredStartups]);

  const activeCount = SPACE_STARTUPS.filter((s) => s.status === 'Active').length;
  const publicCount = SPACE_STARTUPS.filter((s) => s.stage === 'Public').length;

  // URL param syncing
  const updateParams = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  const hasFilters = searchQuery || selectedSector || selectedStage || selectedStatus;

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4">
        <AnimatedPageHeader
          title="Space Startup Tracker"
          subtitle={`Tracking ${SPACE_STARTUPS.length} innovative space companies across ${activeSectors.length} sectors`}
          icon="\u{1F680}"
          accentColor="purple"
        />

        {/* Top Stats */}
        <StaggerContainer className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StaggerItem>
            <div className="card-elevated p-6 text-center">
              <div className="text-4xl font-bold font-display tracking-tight text-white">{SPACE_STARTUPS.length}</div>
              <div className="text-slate-400 text-xs uppercase tracking-widest font-medium mt-1">Startups Tracked</div>
            </div>
          </StaggerItem>
          <StaggerItem>
            <div className="card-elevated p-6 text-center">
              <div className="text-4xl font-bold font-display tracking-tight text-nebula-300">{formatTotalFunding(totalFundingMillions)}</div>
              <div className="text-slate-400 text-xs uppercase tracking-widest font-medium mt-1">Total Funding</div>
            </div>
          </StaggerItem>
          <StaggerItem>
            <div className="card-elevated p-6 text-center">
              <div className="text-4xl font-bold font-display tracking-tight text-green-400">{activeCount}</div>
              <div className="text-slate-400 text-xs uppercase tracking-widest font-medium mt-1">Active Startups</div>
            </div>
          </StaggerItem>
          <StaggerItem>
            <div className="card-elevated p-6 text-center">
              <div className="text-4xl font-bold font-display tracking-tight text-cyan-400">{publicCount}</div>
              <div className="text-slate-400 text-xs uppercase tracking-widest font-medium mt-1">Publicly Traded</div>
            </div>
          </StaggerItem>
        </StaggerContainer>

        {/* Sector Distribution Chart */}
        <ScrollReveal>
          <SectorDistributionChart startups={SPACE_STARTUPS} />
        </ScrollReveal>

        {/* Ad Slot */}
        <div className="mb-6">
          <AdSlot position="in_feed" module="startup-tracker" />
        </div>

        {/* Filters */}
        <div className="card p-4 mb-6">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <label htmlFor="startup-search" className="block text-slate-400 text-sm mb-1">Search</label>
              <input
                id="startup-search"
                type="text"
                placeholder="Search by name, sector, location, description..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  updateParams('q', e.target.value);
                }}
                className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 h-11 text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
              />
            </div>

            {/* Sector */}
            <div>
              <label htmlFor="sector-filter" className="block text-slate-400 text-sm mb-1">Sector</label>
              <select
                id="sector-filter"
                value={selectedSector}
                onChange={(e) => {
                  setSelectedSector(e.target.value as Sector | '');
                  updateParams('sector', e.target.value);
                }}
                className="bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 h-11 text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none min-w-[160px]"
              >
                <option value="">All Sectors</option>
                {activeSectors.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            {/* Stage */}
            <div>
              <label htmlFor="stage-filter" className="block text-slate-400 text-sm mb-1">Stage</label>
              <select
                id="stage-filter"
                value={selectedStage}
                onChange={(e) => {
                  setSelectedStage(e.target.value as Stage | '');
                  updateParams('stage', e.target.value);
                }}
                className="bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 h-11 text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none min-w-[140px]"
              >
                <option value="">All Stages</option>
                {activeStages.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            {/* Status */}
            <div>
              <label htmlFor="status-filter" className="block text-slate-400 text-sm mb-1">Status</label>
              <select
                id="status-filter"
                value={selectedStatus}
                onChange={(e) => {
                  setSelectedStatus(e.target.value as Status | '');
                  updateParams('status', e.target.value);
                }}
                className="bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 h-11 text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none min-w-[140px]"
              >
                <option value="">All Statuses</option>
                {activeStatuses.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            {/* Sort */}
            <div>
              <label htmlFor="sort-by" className="block text-slate-400 text-sm mb-1">Sort By</label>
              <select
                id="sort-by"
                value={sortBy}
                onChange={(e) => {
                  setSortBy(e.target.value as 'name' | 'founded' | 'funding');
                  updateParams('sort', e.target.value);
                }}
                className="bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-2 h-11 text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none min-w-[150px]"
              >
                <option value="funding">Most Funded</option>
                <option value="name">Name (A-Z)</option>
                <option value="founded">Newest First</option>
              </select>
            </div>
          </div>

          {/* Active Filters & Export */}
          <div className="flex flex-wrap items-center gap-3 mt-4 pt-3 border-t border-slate-700/50">
            {hasFilters && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedSector('');
                  setSelectedStage('');
                  setSelectedStatus('');
                  setSortBy('funding');
                  router.replace(pathname, { scroll: false });
                }}
                className="text-sm text-nebula-300 hover:text-nebula-200 transition-colors min-h-[44px]"
              >
                Clear All Filters
              </button>
            )}

            <div className="ml-auto flex items-center gap-4">
              {hasFilters && (
                <span className="text-sm text-slate-400">
                  {formatTotalFunding(filteredTotalFundingMillions)} combined funding
                </span>
              )}
              <ExportButton
                data={filteredStartups.map((s) => ({
                  name: s.name,
                  founded: s.founded,
                  hq: s.hq,
                  funding: s.funding,
                  stage: s.stage,
                  sector: s.sector,
                  description: s.description,
                  employees: s.employees,
                  status: s.status,
                }))}
                filename="space-startups"
                columns={[
                  { key: 'name', label: 'Company Name' },
                  { key: 'founded', label: 'Founded' },
                  { key: 'hq', label: 'Headquarters' },
                  { key: 'funding', label: 'Total Funding' },
                  { key: 'stage', label: 'Stage' },
                  { key: 'sector', label: 'Sector' },
                  { key: 'description', label: 'Description' },
                  { key: 'employees', label: 'Employees' },
                  { key: 'status', label: 'Status' },
                ]}
              />
            </div>
          </div>
        </div>

        {/* Results count */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-slate-400 text-sm">
            Showing <span className="text-white font-medium">{filteredStartups.length}</span> of {SPACE_STARTUPS.length} startups
          </p>
        </div>

        {/* Startup Cards Grid */}
        {filteredStartups.length === 0 ? (
          <EmptyState
            icon={
              <svg className="w-10 h-10 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            }
            title="No startups found"
            description="No startups match your current filters. Try adjusting your search criteria or clearing filters to browse all startups."
          />
        ) : (
          <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-8">
            {filteredStartups.map((startup) => (
              <StaggerItem key={startup.name}>
                <StartupCard startup={startup} />
              </StaggerItem>
            ))}
          </StaggerContainer>
        )}

        {/* Footer Ad */}
        <div className="mt-8">
          <AdSlot position="footer" module="startup-tracker" />
        </div>

        {/* Disclaimer */}
        <ScrollReveal>
          <div className="card p-6 mt-8 border-dashed">
            <div className="text-center">
              <span className="text-4xl block mb-3">{'\u{1F4A1}'}</span>
              <h3 className="text-lg font-semibold text-white mb-2">About This Data</h3>
              <p className="text-slate-400 text-sm max-w-2xl mx-auto">
                Startup data is compiled from public sources including press releases, Crunchbase, PitchBook summaries,
                and SEC filings. Funding amounts are estimates based on last reported rounds and may not reflect current
                market conditions. Employee counts are approximate. Always conduct your own due diligence before making
                investment decisions.
              </p>
            </div>
          </div>
        </ScrollReveal>
      </div>
    </div>
  );
}

// ────────────────────────────────────────
// Page Export
// ────────────────────────────────────────

export default function StartupTrackerPage() {
  return (
    <>
      <BreadcrumbSchema items={[
        { name: 'Home', href: '/' },
        { name: 'Market Intelligence', href: '/market-intel' },
        { name: 'Startup Tracker' },
      ]} />
      <FAQSchema items={[
        { question: 'How many space startups does SpaceNexus track?', answer: `SpaceNexus tracks ${SPACE_STARTUPS.length}+ innovative space startups across multiple sectors including launch, Earth observation, in-space transport, satellites, communications, defense, and more.` },
        { question: 'What funding information is available?', answer: 'Each startup profile includes total funding raised, current funding stage (Early, Series A/B, Late, Public), company status, employee estimates, and headquarters location.' },
        { question: 'Where does the startup data come from?', answer: 'Data is compiled from public sources including press releases, SEC filings, Crunchbase, PitchBook summaries, and verified industry reports. Amounts are estimates and may not include undisclosed rounds.' },
        { question: 'Can I export the startup data?', answer: 'Yes, you can export filtered or complete startup data as CSV or JSON using the Export button in the filters section.' },
      ]} />
      <Suspense
        fallback={
          <div className="min-h-screen flex justify-center py-20">
            <LoadingSpinner size="lg" />
          </div>
        }
      >
        <StartupTrackerContent />
      </Suspense>
    </>
  );
}
