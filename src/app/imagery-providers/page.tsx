'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import AnimatedPageHeader from '@/components/ui/AnimatedPageHeader';
import ScrollReveal from '@/components/ui/ScrollReveal';
import RelatedModules from '@/components/ui/RelatedModules';
import { PAGE_RELATIONS } from '@/lib/module-relationships';

// ────────────────────────────────────────
// Types
// ────────────────────────────────────────

interface ImageryProvider {
  name: string;
  type: ProviderType;
  resolution: string;
  constellation: string;
  revisitRate: string;
  spectralBands: string;
  coverage: string;
  pricing: string;
  applications: string[];
  website: string;
  founded: number;
}

type ProviderType = 'Optical' | 'SAR' | 'Hyperspectral' | 'RF/Signals' | 'Analytics';
type SortField = 'resolution' | 'revisit' | 'founded';
type SortDir = 'asc' | 'desc';

// ────────────────────────────────────────
// Type metadata
// ────────────────────────────────────────

const PROVIDER_TYPES: { id: ProviderType; icon: string; color: string; description: string }[] = [
  { id: 'Optical', icon: '🔭', color: 'text-blue-400', description: 'Visible & near-infrared electro-optical sensors' },
  { id: 'SAR', icon: '📡', color: 'text-orange-400', description: 'Synthetic aperture radar — all-weather, day/night' },
  { id: 'Hyperspectral', icon: '🌈', color: 'text-purple-400', description: 'Hundreds of narrow spectral bands for material ID' },
  { id: 'RF/Signals', icon: '📻', color: 'text-red-400', description: 'Radio-frequency signal detection & geolocation' },
  { id: 'Analytics', icon: '🧠', color: 'text-slate-300', description: 'AI-powered geospatial analytics platforms' },
];

function getTypeColor(type: ProviderType): string {
  const colors: Record<ProviderType, string> = {
    Optical: 'bg-blue-600',
    SAR: 'bg-orange-600',
    Hyperspectral: 'bg-purple-600',
    'RF/Signals': 'bg-red-600',
    Analytics: 'bg-white',
  };
  return colors[type] || 'bg-slate-600';
}

function getTypeBorderColor(type: ProviderType): string {
  const colors: Record<ProviderType, string> = {
    Optical: 'border-blue-500/40',
    SAR: 'border-orange-500/40',
    Hyperspectral: 'border-purple-500/40',
    'RF/Signals': 'border-red-500/40',
    Analytics: 'border-white/15/40',
  };
  return colors[type] || 'border-slate-500/40';
}

function getTypeTextColor(type: ProviderType): string {
  const colors: Record<ProviderType, string> = {
    Optical: 'text-blue-400',
    SAR: 'text-orange-400',
    Hyperspectral: 'text-purple-400',
    'RF/Signals': 'text-red-400',
    Analytics: 'text-slate-300',
  };
  return colors[type] || 'text-slate-400';
}

// ────────────────────────────────────────
// Resolution parser (extract numeric cm/m value for sorting)
// ────────────────────────────────────────

function parseResolutionCm(resolution: string): number {
  const lower = resolution.toLowerCase();
  // Try cm first
  const cmMatch = lower.match(/([\d.]+)\s*cm/);
  if (cmMatch) return parseFloat(cmMatch[1]);
  // Try m
  const mMatch = lower.match(/([\d.]+)\s*m/);
  if (mMatch) return parseFloat(mMatch[1]) * 100;
  // Try km
  const kmMatch = lower.match(/([\d.]+)\s*km/);
  if (kmMatch) return parseFloat(kmMatch[1]) * 100000;
  return 999999; // N/A or analytics
}

function parseRevisitHours(revisit: string): number {
  const lower = revisit.toLowerCase();
  const minMatch = lower.match(/([\d.]+)\s*min/);
  if (minMatch) return parseFloat(minMatch[1]) / 60;
  const hrMatch = lower.match(/([\d.]+)\s*h/);
  if (hrMatch) return parseFloat(hrMatch[1]);
  const dayMatch = lower.match(/([\d.]+)\s*day/);
  if (dayMatch) return parseFloat(dayMatch[1]) * 24;
  // "Sub-daily" or "Near real-time"
  if (lower.includes('real-time') || lower.includes('continuous')) return 0.1;
  if (lower.includes('sub-daily') || lower.includes('sub-hour')) return 12;
  if (lower.includes('daily')) return 24;
  return 9999;
}

// ────────────────────────────────────────
// Provider data (22 providers)
// ────────────────────────────────────────

const PROVIDERS: ImageryProvider[] = [
  // --- Optical ---
  {
    name: 'Maxar Technologies',
    type: 'Optical',
    resolution: '30 cm',
    constellation: 'WorldView Legion (6 satellites), WorldView-3, GeoEye-1',
    revisitRate: '20-30 min (revisit with Legion)',
    spectralBands: '8 multispectral + SWIR, panchromatic',
    coverage: 'Global',
    pricing: 'Per km2; archive from $14/km2, tasking from $22/km2',
    applications: ['Defense & intelligence', 'Infrastructure monitoring', 'Disaster response', 'Mapping & GIS'],
    website: 'https://www.maxar.com',
    founded: 2017,
  },
  {
    name: 'Planet Labs',
    type: 'Optical',
    resolution: '3 m (Dove), 50 cm (SkySat)',
    constellation: '200+ Dove (SuperDove), 21 SkySat',
    revisitRate: 'Daily global (Dove), sub-daily (SkySat)',
    spectralBands: '8 bands (SuperDove), 4 bands (SkySat)',
    coverage: 'Global daily scan (Dove), tasking (SkySat)',
    pricing: 'Subscription-based; PlanetScope from $4,700/mo area plans',
    applications: ['Agriculture & forestry', 'Environmental monitoring', 'Supply chain analytics', 'Urban planning'],
    website: 'https://www.planet.com',
    founded: 2010,
  },
  {
    name: 'Airbus Defence & Space',
    type: 'Optical',
    resolution: '30 cm (Pleiades Neo)',
    constellation: 'Pleiades Neo (4 satellites), SPOT 6/7',
    revisitRate: 'Daily revisit capability',
    spectralBands: '4 multispectral + panchromatic, Deep Blue band',
    coverage: 'Global',
    pricing: 'Per km2; archive from $8/km2, fresh tasking from $17/km2',
    applications: ['Urban mapping', 'Defense & security', 'Agriculture', 'Maritime surveillance'],
    website: 'https://www.intelligence-airbusds.com',
    founded: 2000,
  },
  {
    name: 'BlackSky',
    type: 'Optical',
    resolution: '50 cm',
    constellation: '18 Gen-2 satellites in LEO',
    revisitRate: 'Hourly revisit over key areas',
    spectralBands: 'Panchromatic + multispectral',
    coverage: 'Global with priority tasking',
    pricing: 'Per image; subscription plans available from $4,500/mo',
    applications: ['Real-time intelligence', 'Economic monitoring', 'Defense & security', 'Event detection'],
    website: 'https://www.blacksky.com',
    founded: 2014,
  },
  {
    name: 'Satellogic',
    type: 'Optical',
    resolution: '70 cm (multispectral), hyperspectral available',
    constellation: '34+ NewSat satellites',
    revisitRate: 'Daily revisit',
    spectralBands: '4-band multispectral + hyperspectral option',
    coverage: 'Global',
    pricing: 'Constellation-as-a-service; dedicated capacity from $1M/yr',
    applications: ['Precision agriculture', 'Oil & gas monitoring', 'Government surveillance', 'Environmental'],
    website: 'https://www.satellogic.com',
    founded: 2010,
  },
  {
    name: 'Albedo',
    type: 'Optical',
    resolution: '10 cm (VLEO)',
    constellation: 'Planned 24-satellite constellation at ~300 km altitude',
    revisitRate: '2 hour revisit at full constellation',
    spectralBands: 'Panchromatic + 6-band multispectral, thermal IR',
    coverage: 'Global (phased rollout)',
    pricing: 'Premium per km2; estimated $30+/km2 for 10cm imagery',
    applications: ['Intelligence & defense', 'Insurance underwriting', 'Urban analytics', 'Precision mapping'],
    website: 'https://albedo.com',
    founded: 2020,
  },

  // --- SAR ---
  {
    name: 'Capella Space',
    type: 'SAR',
    resolution: '25 cm (spotlight)',
    constellation: '10 SAR satellites (Acadia-class)',
    revisitRate: 'Sub-hourly over priority areas',
    spectralBands: 'X-band SAR',
    coverage: 'Global, all weather, day and night',
    pricing: 'Per collect; archive from $900, tasking from $6,500',
    applications: ['Defense & intelligence', 'Maritime domain awareness', 'Infrastructure monitoring', 'Disaster response'],
    website: 'https://www.capellaspace.com',
    founded: 2016,
  },
  {
    name: 'ICEYE',
    type: 'SAR',
    resolution: '25 cm (spotlight)',
    constellation: '36+ SAR microsatellites',
    revisitRate: 'Average revisit under 20 hours, surge to sub-daily',
    spectralBands: 'X-band SAR, multiple imaging modes',
    coverage: 'Global',
    pricing: 'Subscription plans; persistent monitoring from $50K/yr per AOI',
    applications: ['Flood & catastrophe monitoring', 'Insurance analytics', 'Maritime surveillance', 'Ground subsidence'],
    website: 'https://www.iceye.com',
    founded: 2014,
  },
  {
    name: 'Umbra',
    type: 'SAR',
    resolution: '16 cm (ultra-high-res spotlight)',
    constellation: '6 SAR satellites (growing to 12+)',
    revisitRate: 'Multiple daily passes',
    spectralBands: 'X-band SAR, open data format',
    coverage: 'Global',
    pricing: 'Open data marketplace; images from $1,500 per collect',
    applications: ['Defense intelligence', 'Change detection', 'Environmental monitoring', 'Academic research'],
    website: 'https://umbra.space',
    founded: 2015,
  },
  {
    name: 'Synspective',
    type: 'SAR',
    resolution: '1 m (StriX)',
    constellation: '6 StriX satellites (target: 30+ by 2026)',
    revisitRate: 'Daily at full constellation',
    spectralBands: 'X-band SAR',
    coverage: 'Asia-Pacific focus, expanding globally',
    pricing: 'Analytics subscription; Land Displacement Monitoring from $30K/yr',
    applications: ['Infrastructure deformation', 'Disaster prediction', 'Urban development', 'Land displacement'],
    website: 'https://www.synspective.com',
    founded: 2018,
  },
  {
    name: 'XpressSAR',
    type: 'SAR',
    resolution: '50 cm (planned)',
    constellation: '4 X-band SAR satellites (launching 2025-2026)',
    revisitRate: 'Sub-daily at full constellation',
    spectralBands: 'X-band SAR',
    coverage: 'Global',
    pricing: 'Government and commercial contracts',
    applications: ['National security', 'Maritime awareness', 'Border monitoring', 'Disaster management'],
    website: 'https://xpressar.com',
    founded: 2018,
  },

  // --- Hyperspectral ---
  {
    name: 'Pixxel',
    type: 'Hyperspectral',
    resolution: '5 m',
    constellation: '6 Firefly satellites (scaling to 24)',
    revisitRate: '24-48 hours',
    spectralBands: '150+ contiguous bands (400-2500 nm)',
    coverage: 'Global',
    pricing: 'API access; analytics subscriptions from $25K/yr',
    applications: ['Crop health & agriculture', 'Mineral exploration', 'Water quality', 'Methane detection'],
    website: 'https://www.pixxel.space',
    founded: 2019,
  },
  {
    name: 'Orbital Sidekick',
    type: 'Hyperspectral',
    resolution: '8 m (GHOSt constellation)',
    constellation: 'GHOSt satellites (6 planned)',
    revisitRate: '24 hours at full constellation',
    spectralBands: 'VNIR + SWIR (400-2500 nm), 100+ bands',
    coverage: 'Global',
    pricing: 'Monitoring-as-a-service; pipeline monitoring from $15/km/yr',
    applications: ['Oil & gas pipeline monitoring', 'Methane leak detection', 'Mining operations', 'Environmental compliance'],
    website: 'https://www.orbitalsidekick.com',
    founded: 2016,
  },
  {
    name: 'HyperSat',
    type: 'Hyperspectral',
    resolution: '1 m (planned)',
    constellation: 'Planned high-resolution hyperspectral constellation',
    revisitRate: '48 hours target',
    spectralBands: '300+ bands across VNIR-SWIR-MWIR',
    coverage: 'Global (phased deployment)',
    pricing: 'Government-focused pricing; tasking contracts',
    applications: ['Intelligence & defense', 'Environmental monitoring', 'Agriculture analytics', 'Mineral mapping'],
    website: 'https://www.hypersat.com',
    founded: 2018,
  },

  // --- RF / Signals Intelligence ---
  {
    name: 'HawkEye 360',
    type: 'RF/Signals',
    resolution: '500 m geolocation accuracy',
    constellation: '21 Clusters (63 satellites)',
    revisitRate: 'Average revisit under 30 min',
    spectralBands: 'VHF/UHF/L/S/X-band RF signals',
    coverage: 'Global RF signal monitoring',
    pricing: 'Subscription analytics; government contracts from $500K/yr',
    applications: ['Maritime domain awareness', 'Spectrum mapping', 'GPS interference detection', 'Border security'],
    website: 'https://www.he360.com',
    founded: 2015,
  },
  {
    name: 'Kleos Space',
    type: 'RF/Signals',
    resolution: 'RF geolocation (cluster-based triangulation)',
    constellation: '20 satellites in 5 clusters',
    revisitRate: '2-3 hours per location',
    spectralBands: 'VHF/UHF/S-band',
    coverage: 'Global',
    pricing: 'Data-as-a-service; government subscription licenses',
    applications: ['Defense intelligence', 'Maritime surveillance', 'Illegal activity detection', 'RF spectrum mapping'],
    website: 'https://www.kleos.space',
    founded: 2017,
  },
  {
    name: 'Unseenlabs',
    type: 'RF/Signals',
    resolution: 'Sub-kilometer RF geolocation',
    constellation: '12+ BRO nanosatellites',
    revisitRate: 'Multiple daily passes',
    spectralBands: 'Passive RF detection across wide spectrum',
    coverage: 'Global maritime focus',
    pricing: 'Government and commercial subscription',
    applications: ['Maritime surveillance', 'Dark vessel detection', 'Fisheries enforcement', 'Sanctions monitoring'],
    website: 'https://unseenlabs.space',
    founded: 2017,
  },

  // --- Analytics Platforms ---
  {
    name: 'Orbital Insight',
    type: 'Analytics',
    resolution: 'Multi-source (optical + SAR + AIS fusion)',
    constellation: 'Platform ingests data from multiple providers',
    revisitRate: 'Near real-time analytics',
    spectralBands: 'N/A (multi-source data fusion)',
    coverage: 'Global geospatial analytics',
    pricing: 'SaaS platform; enterprise from $100K/yr',
    applications: ['Supply chain monitoring', 'Economic intelligence', 'Energy market analytics', 'Government intelligence'],
    website: 'https://orbitalinsight.com',
    founded: 2013,
  },
  {
    name: 'SpaceKnow',
    type: 'Analytics',
    resolution: 'Multi-source satellite imagery analysis',
    constellation: 'Processes imagery from 50+ satellite sources',
    revisitRate: 'Continuous monitoring',
    spectralBands: 'N/A (imagery-agnostic analytics)',
    coverage: 'Global',
    pricing: 'API & dashboard subscriptions; from $50K/yr',
    applications: ['Manufacturing activity indices', 'Financial market signals', 'Military activity monitoring', 'ESG compliance'],
    website: 'https://spaceknow.com',
    founded: 2013,
  },
  {
    name: 'Descartes Labs',
    type: 'Analytics',
    resolution: 'Multi-source (petabyte-scale data platform)',
    constellation: 'Aggregates 100+ PB of geospatial data',
    revisitRate: 'Near real-time processing',
    spectralBands: 'N/A (all modalities)',
    coverage: 'Global geospatial data cloud',
    pricing: 'Enterprise platform; custom pricing',
    applications: ['Agricultural forecasting', 'Climate analytics', 'Natural resource management', 'Wildfire prediction'],
    website: 'https://descarteslabs.com',
    founded: 2014,
  },
  {
    name: 'SkyWatch',
    type: 'Analytics',
    resolution: 'Multi-source aggregation (50 cm - 10 m)',
    constellation: 'Aggregator: Planet, Maxar, Airbus, Capella, and more',
    revisitRate: 'Depends on source; daily possible',
    spectralBands: 'Optical + SAR across partners',
    coverage: 'Global via 40+ satellite data sources',
    pricing: 'Pay-per-use API; images from $0.40/km2',
    applications: ['Agriculture analytics', 'Environmental monitoring', 'Asset tracking', 'Developer integrations'],
    website: 'https://www.skywatch.com',
    founded: 2014,
  },
  {
    name: 'UP42',
    type: 'Analytics',
    resolution: 'Multi-source (30 cm - 30 m via marketplace)',
    constellation: 'Marketplace: 14+ data providers, 100+ algorithms',
    revisitRate: 'Source-dependent; daily to weekly',
    spectralBands: 'Optical, SAR, elevation data',
    coverage: 'Global via partner network',
    pricing: 'Credits system; starter packs from $500',
    applications: ['Insurance risk assessment', 'Urban change detection', 'Infrastructure mapping', 'Research & development'],
    website: 'https://up42.com',
    founded: 2018,
  },
];

// ────────────────────────────────────────
// Resolution comparison data for chart
// ────────────────────────────────────────

const RESOLUTION_TIERS = [
  { label: '< 25 cm', range: 'Very High', color: 'bg-emerald-500', textColor: 'text-emerald-400' },
  { label: '25 - 50 cm', range: 'High', color: 'bg-blue-500', textColor: 'text-blue-400' },
  { label: '50 cm - 3 m', range: 'Medium-High', color: 'bg-amber-500', textColor: 'text-amber-400' },
  { label: '3 - 10 m', range: 'Medium', color: 'bg-orange-500', textColor: 'text-orange-400' },
  { label: '> 10 m / N/A', range: 'Low / Analytics', color: 'bg-slate-500', textColor: 'text-slate-400' },
];

function getResolutionTierIndex(resolutionCm: number): number {
  if (resolutionCm < 25) return 0;
  if (resolutionCm <= 50) return 1;
  if (resolutionCm <= 300) return 2;
  if (resolutionCm <= 1000) return 3;
  return 4;
}

// ────────────────────────────────────────
// Component
// ────────────────────────────────────────

export default function ImageryProvidersPage() {
  const [typeFilter, setTypeFilter] = useState<string>('All');
  const [resolutionFilter, setResolutionFilter] = useState<string>('All');
  const [sortField, setSortField] = useState<SortField>('resolution');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [expandedProvider, setExpandedProvider] = useState<string | null>(null);

  // Filtered and sorted providers
  const filteredProviders = useMemo(() => {
    const result = PROVIDERS.filter((p) => {
      if (typeFilter !== 'All' && p.type !== typeFilter) return false;
      if (resolutionFilter !== 'All') {
        const resCm = parseResolutionCm(p.resolution);
        const tierIdx = getResolutionTierIndex(resCm);
        if (String(tierIdx) !== resolutionFilter) return false;
      }
      return true;
    });

    result.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'resolution':
          cmp = parseResolutionCm(a.resolution) - parseResolutionCm(b.resolution);
          break;
        case 'revisit':
          cmp = parseRevisitHours(a.revisitRate) - parseRevisitHours(b.revisitRate);
          break;
        case 'founded':
          cmp = a.founded - b.founded;
          break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return result;
  }, [typeFilter, resolutionFilter, sortField, sortDir]);

  // Type summary stats
  const typeSummary = useMemo(() => {
    return PROVIDER_TYPES.map((pt) => {
      const providers = PROVIDERS.filter((p) => p.type === pt.id);
      const bestRes = providers.length > 0
        ? Math.min(...providers.map((p) => parseResolutionCm(p.resolution)))
        : Infinity;
      return {
        ...pt,
        count: providers.length,
        bestResCm: bestRes,
      };
    });
  }, []);

  // Resolution distribution for chart
  const resolutionDistribution = useMemo(() => {
    const counts = [0, 0, 0, 0, 0];
    PROVIDERS.forEach((p) => {
      const cm = parseResolutionCm(p.resolution);
      counts[getResolutionTierIndex(cm)]++;
    });
    return counts;
  }, []);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir(field === 'founded' ? 'asc' : 'asc');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <AnimatedPageHeader
          title="Satellite Imagery Providers"
          subtitle="Commercial satellite imagery and Earth observation data providers for procurement, analytics, and intelligence applications"
          icon={<span>📸</span>}
          accentColor="emerald"
        />

        {/* Type Summary Cards */}
        <ScrollReveal delay={0.1}>
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-slate-100 mb-4">
              Provider Categories
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {typeSummary.map((ts) => (
                <button
                  key={ts.id}
                  onClick={() => setTypeFilter(typeFilter === ts.id ? 'All' : ts.id)}
                  className={`p-4 rounded-lg border text-left transition-all ${
                    typeFilter === ts.id
                      ? 'bg-emerald-900/30 border-emerald-500/60 ring-1 ring-emerald-500/30'
                      : 'bg-slate-900/60 border-slate-700/50 hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xl">{ts.icon}</span>
                    <span className={`text-sm font-medium ${ts.color}`}>{ts.id}</span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-tight mb-2">{ts.description}</p>
                  <div className="flex items-end gap-2">
                    <span className="text-xl font-bold text-slate-100">{ts.count}</span>
                    <span className="text-[10px] text-slate-500 mb-0.5">provider{ts.count !== 1 ? 's' : ''}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </ScrollReveal>

        {/* Resolution Comparison Chart */}
        <ScrollReveal delay={0.15}>
          <div className="mb-8 bg-slate-900/80 border border-slate-700/50 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-slate-100 mb-4">
              Resolution Distribution
            </h2>
            <div className="space-y-3">
              {RESOLUTION_TIERS.map((tier, idx) => {
                const count = resolutionDistribution[idx];
                const maxCount = Math.max(...resolutionDistribution);
                const pct = maxCount > 0 ? (count / maxCount) * 100 : 0;
                return (
                  <div key={tier.label} className="flex items-center gap-3">
                    <div className="w-32 sm:w-40 text-right">
                      <span className={`text-xs font-medium ${tier.textColor}`}>{tier.label}</span>
                      <span className="text-[10px] text-slate-500 ml-2">({tier.range})</span>
                    </div>
                    <div className="flex-1 bg-slate-800 rounded-full h-6 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${tier.color} transition-all duration-700 flex items-center justify-end pr-2`}
                        style={{ width: `${Math.max(pct, 8)}%` }}
                      >
                        <span className="text-xs font-bold text-white">{count}</span>
                      </div>

        <RelatedModules modules={PAGE_RELATIONS['imagery-providers']} />
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-slate-700/50">
              <div className="text-center">
                <div className="text-xl font-bold text-emerald-400">{PROVIDERS.length}</div>
                <div className="text-[11px] text-slate-400">Total Providers</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold text-blue-400">
                  {PROVIDERS.filter((p) => parseResolutionCm(p.resolution) <= 50).length}
                </div>
                <div className="text-[11px] text-slate-400">Sub-50cm Capable</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold text-amber-400">
                  {PROVIDERS.filter((p) => p.type === 'SAR').length}
                </div>
                <div className="text-[11px] text-slate-400">All-Weather (SAR)</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold text-purple-400">
                  {PROVIDERS.filter((p) => p.type === 'Hyperspectral').length}
                </div>
                <div className="text-[11px] text-slate-400">Hyperspectral</div>
              </div>
            </div>
          </div>
        </ScrollReveal>

        {/* Filters & Sort */}
        <ScrollReveal delay={0.2}>
          <div className="mb-6 bg-slate-900/60 border border-slate-700/50 rounded-xl p-4">
            <div className="flex flex-col md:flex-row md:items-center gap-4">
              {/* Type Filter */}
              <div className="flex-1">
                <label className="block text-xs text-slate-400 mb-1">Sensor Type</label>
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                >
                  <option value="All">All Types</option>
                  {PROVIDER_TYPES.map((pt) => (
                    <option key={pt.id} value={pt.id}>
                      {pt.icon} {pt.id}
                    </option>
                  ))}
                </select>
              </div>

              {/* Resolution Range Filter */}
              <div className="flex-1">
                <label className="block text-xs text-slate-400 mb-1">Resolution Range</label>
                <select
                  value={resolutionFilter}
                  onChange={(e) => setResolutionFilter(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                >
                  <option value="All">All Resolutions</option>
                  {RESOLUTION_TIERS.map((tier, idx) => (
                    <option key={idx} value={String(idx)}>
                      {tier.label} ({tier.range})
                    </option>
                  ))}
                </select>
              </div>

              {/* Sort Buttons */}
              <div>
                <label className="block text-xs text-slate-400 mb-1">Sort By</label>
                <div className="flex gap-1">
                  {([
                    { field: 'resolution' as SortField, label: 'Resolution' },
                    { field: 'revisit' as SortField, label: 'Revisit' },
                    { field: 'founded' as SortField, label: 'Founded' },
                  ]).map(({ field, label }) => (
                    <button
                      key={field}
                      onClick={() => toggleSort(field)}
                      className={`px-3 py-2 text-xs font-medium rounded-lg transition-colors ${
                        sortField === field
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      {label}
                      {sortField === field && (
                        <span className="ml-1">{sortDir === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-3 text-xs text-slate-400">
              Showing {filteredProviders.length} of {PROVIDERS.length} providers
            </div>
          </div>
        </ScrollReveal>

        {/* Provider Cards */}
        <div className="space-y-4 mb-10">
          {filteredProviders.map((provider, idx) => {
            const isExpanded = expandedProvider === provider.name;
            return (
              <ScrollReveal key={provider.name} delay={Math.min(idx * 0.04, 0.4)}>
                <div
                  className={`bg-slate-900/70 border rounded-xl overflow-hidden transition-all ${getTypeBorderColor(provider.type)} ${
                    isExpanded ? 'ring-1 ring-emerald-500/20' : ''
                  }`}
                >
                  {/* Card Header */}
                  <button
                    onClick={() => setExpandedProvider(isExpanded ? null : provider.name)}
                    className="w-full text-left p-4 sm:p-5 flex items-start gap-4 hover:bg-slate-800/30 transition-colors"
                  >
                    {/* Type Badge */}
                    <div className="flex-shrink-0 flex flex-col items-center">
                      <div
                        className={`w-12 h-12 rounded-lg flex items-center justify-center text-lg font-bold text-white ${getTypeColor(provider.type)}`}
                      >
                        {PROVIDER_TYPES.find((t) => t.id === provider.type)?.icon || '🛰️'}
                      </div>
                      <span className={`text-[10px] mt-1 ${getTypeTextColor(provider.type)}`}>
                        {provider.type}
                      </span>
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm sm:text-base font-semibold text-slate-100">
                          {provider.name}
                        </h3>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                          Est. {provider.founded}
                        </span>
                      </div>
                      <p className="text-xs sm:text-sm text-slate-400 mt-1 line-clamp-1">
                        {provider.constellation}
                      </p>
                      <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                          </svg>
                          {provider.resolution}
                        </span>
                        <span className="flex items-center gap-1">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {provider.revisitRate}
                        </span>
                        <span className="flex items-center gap-1">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {provider.coverage}
                        </span>
                      </div>
                    </div>

                    {/* Expand indicator */}
                    <div className="flex-shrink-0 text-slate-500">
                      <svg
                        className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </button>

                  {/* Expanded Content */}
                  {isExpanded && (
                    <div className="px-4 sm:px-5 pb-5 border-t border-slate-700/50">
                      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-5">
                        {/* Constellation Details */}
                        <div>
                          <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                            Constellation
                          </h4>
                          <p className="text-sm text-slate-400 leading-relaxed">
                            {provider.constellation}
                          </p>
                        </div>

                        {/* Spectral Bands */}
                        <div>
                          <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                            Spectral Bands
                          </h4>
                          <p className="text-sm text-emerald-300/90 leading-relaxed">
                            {provider.spectralBands}
                          </p>
                        </div>

                        {/* Pricing */}
                        <div>
                          <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                            Pricing
                          </h4>
                          <p className="text-sm text-slate-400 leading-relaxed">
                            {provider.pricing}
                          </p>
                        </div>

                        {/* Resolution & Revisit */}
                        <div>
                          <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                            Performance
                          </h4>
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-slate-500">Resolution</span>
                              <span className="text-slate-200 font-medium">{provider.resolution}</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-slate-500">Revisit Rate</span>
                              <span className="text-slate-200 font-medium">{provider.revisitRate}</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-slate-500">Coverage</span>
                              <span className="text-slate-200 font-medium">{provider.coverage}</span>
                            </div>
                          </div>
                        </div>

                        {/* Applications */}
                        <div className="md:col-span-2">
                          <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                            Key Applications
                          </h4>
                          <div className="flex flex-wrap gap-1.5">
                            {provider.applications.map((app) => (
                              <span
                                key={app}
                                className="px-2.5 py-1 text-xs rounded-md bg-slate-800/80 text-slate-300 border border-slate-700/50"
                              >
                                {app}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Website Link */}
                      <div className="mt-4 pt-4 border-t border-slate-700/50">
                        <a
                          href={provider.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-emerald-400 hover:text-emerald-300 bg-emerald-900/20 hover:bg-emerald-900/40 border border-emerald-500/30 rounded-lg transition-all"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                          Visit {provider.name}
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              </ScrollReveal>
            );
          })}

          {filteredProviders.length === 0 && (
            <div className="text-center py-16 text-slate-500">
              <p className="text-lg">No providers match your filters</p>
              <p className="text-sm mt-1">Try adjusting the type or resolution range</p>
            </div>
          )}
        </div>

        {/* Overall Stats */}
        <ScrollReveal delay={0.1}>
          <div className="mb-8 grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-slate-900/70 border border-slate-700/50 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-emerald-400">{PROVIDERS.length}</div>
              <div className="text-xs text-slate-400 mt-1">Providers Cataloged</div>
            </div>
            <div className="bg-slate-900/70 border border-slate-700/50 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-blue-400">5</div>
              <div className="text-xs text-slate-400 mt-1">Sensor Categories</div>
            </div>
            <div className="bg-slate-900/70 border border-slate-700/50 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-amber-400">10 cm</div>
              <div className="text-xs text-slate-400 mt-1">Best Resolution (Albedo)</div>
            </div>
            <div className="bg-slate-900/70 border border-slate-700/50 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-purple-400">200+</div>
              <div className="text-xs text-slate-400 mt-1">Combined Satellites</div>
            </div>
          </div>
        </ScrollReveal>

        {/* Related Pages */}
        <ScrollReveal delay={0.15}>
          <div className="bg-slate-900/60 border border-slate-700/50 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-slate-100 mb-4">Related Resources</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { href: '/space-manufacturing', label: 'Space Manufacturing', icon: '🏭', desc: 'In-space manufacturing and imagery' },
                { href: '/company-profiles', label: 'Company Profiles', icon: '🏢', desc: 'Detailed space company intelligence' },
                { href: '/marketplace', label: 'Marketplace', icon: '🛒', desc: 'Space services and procurement' },
                { href: '/tech-readiness', label: 'Tech Readiness', icon: '🔬', desc: 'Technology readiness tracker' },
              ].map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="group p-4 rounded-lg bg-slate-800/50 border border-slate-700/50 hover:border-emerald-500/40 hover:bg-slate-800/80 transition-all"
                >
                  <span className="text-2xl">{link.icon}</span>
                  <h3 className="text-sm font-medium text-slate-200 mt-2 group-hover:text-emerald-300 transition-colors">
                    {link.label}
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">{link.desc}</p>
                </Link>
              ))}
            </div>
          </div>
        </ScrollReveal>

        {/* Footer spacing */}
        <div className="h-8" />
      </div>
    </div>
  );
}
