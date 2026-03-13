'use client';

import { useState, useMemo, useCallback } from 'react';
import AnimatedPageHeader from '@/components/ui/AnimatedPageHeader';
import ScrollReveal, { StaggerContainer, StaggerItem } from '@/components/ui/ScrollReveal';

// ────────────────────────────────────────
// Types
// ────────────────────────────────────────

interface ProviderCard {
  id: string;
  name: string;
  locations: number | string;
  bands: string[];
  pricingModel: string;
  coverageFocus: string;
  apiAccess: boolean;
  minContactTime: string;
  description: string;
  highlights: string[];
  website: string;
  icon: string;
  accentColor: string;
}

type SortField = 'name' | 'locations' | 'bands' | 'pricingModel' | 'minContactTime' | 'coverageFocus' | 'apiAccess';
type SortDirection = 'asc' | 'desc';

interface RegionGroup {
  name: string;
  locations: { name: string; providers: string[] }[];
}

// ────────────────────────────────────────
// Data
// ────────────────────────────────────────

const PROVIDERS: ProviderCard[] = [
  {
    id: 'aws-ground-station',
    name: 'AWS Ground Station',
    locations: 12,
    bands: ['S', 'X', 'UHF'],
    pricingModel: 'Pay-per-minute',
    coverageFocus: 'Global (co-located with AWS regions)',
    apiAccess: true,
    minContactTime: '1 min',
    description: 'Fully managed Ground Station as a Service from Amazon Web Services. Satellite data is delivered directly into AWS cloud services (S3, EC2, Lambda) within seconds of downlink, eliminating the traditional ground segment data distribution bottleneck. Operators schedule contacts through the AWS console or API.',
    highlights: [
      'Cloud-native integration with AWS ecosystem',
      'Data delivered directly to S3/EC2 with zero ground infrastructure',
      'Sub-second data availability after antenna contact ends',
      'FedRAMP authorized for US Government workloads',
    ],
    website: 'https://aws.amazon.com/ground-station/',
    icon: String.fromCodePoint(0x2601),
    accentColor: 'amber',
  },
  {
    id: 'azure-orbital',
    name: 'Azure Orbital',
    locations: 5,
    bands: ['S', 'X', 'Ka'],
    pricingModel: 'Pay-per-minute',
    coverageFocus: 'Global (expanding via partnerships)',
    apiAccess: true,
    minContactTime: '1 min',
    description: 'Microsoft Azure Orbital Ground Station extends Azure into space, providing satellite communication capabilities as a managed cloud service. Includes virtual modem capability that reduces ground hardware needs. Tightly integrated with the Azure ecosystem including Synapse, Power BI, and AI/ML tools.',
    highlights: [
      'Azure integration with native processing pipelines',
      'NASA partnership for space data management',
      'Virtual modem capability reduces ground hardware',
      'Government cloud (Azure Gov) for classified workloads',
    ],
    website: 'https://azure.microsoft.com/en-us/products/orbital/',
    icon: String.fromCodePoint(0x1F4BB),
    accentColor: 'blue',
  },
  {
    id: 'ksat',
    name: 'KSAT (Kongsberg Satellite Services)',
    locations: '25+',
    bands: ['S', 'X', 'Ka', 'UHF'],
    pricingModel: 'Per-pass / subscription',
    coverageFocus: 'Pole-to-pole (Svalbard, Antarctica)',
    apiAccess: true,
    minContactTime: '1 pass',
    description: 'The largest commercial ground station network with unique pole-to-pole coverage. Their Svalbard station at 78 degrees North provides contact on every single orbit for polar and sun-synchronous satellites. Also operates TrollSat in Antarctica for southern polar coverage.',
    highlights: [
      'Leader in polar ground segments',
      'Svalbard location enables every-orbit polar contact',
      'KSATlite dedicated SmallSat/NewSpace network',
      'Supports over 100 satellite missions simultaneously',
    ],
    website: 'https://www.ksat.no/',
    icon: String.fromCodePoint(0x1F30D),
    accentColor: 'cyan',
  },
  {
    id: 'ssc',
    name: 'SSC (Swedish Space Corporation)',
    locations: 15,
    bands: ['S', 'X', 'Ka'],
    pricingModel: 'Contract / per-pass',
    coverageFocus: 'Global (6 continents incl. polar)',
    apiAccess: true,
    minContactTime: '1 pass',
    description: 'One of the world\'s most established ground station networks with heritage since the 1970s. The flagship Esrange facility in northern Sweden offers unique Arctic coverage. Supports both LEO and GEO missions across stations from Sweden to Chile and Australia.',
    highlights: [
      'Complete S/X/Ka coverage across all stations',
      'Esrange facility for Arctic polar coverage',
      'Heritage dating back to 1972 with proven reliability',
      'Launch and early orbit phase (LEOP) expertise',
    ],
    website: 'https://www.sscspace.com/',
    icon: String.fromCodePoint(0x1F1F8, 0x1F1EA),
    accentColor: 'emerald',
  },
  {
    id: 'viasat-rte',
    name: 'Viasat RTE (Real-Time Earth)',
    locations: '7+',
    bands: ['S', 'X', 'Ka'],
    pricingModel: 'Contract / per-pass',
    coverageFocus: 'Strategic LEO coverage',
    apiAccess: true,
    minContactTime: '1 pass',
    description: 'A global ground station network designed for high-throughput LEO satellite data downlink. Features large-aperture antennas optimized for maximum data throughput during short LEO passes. Near-real-time data delivery with direct fiber connections.',
    highlights: [
      'Ka-band support with 25 Gbps throughput',
      'LEO focus with large-aperture antennas',
      'Direct fiber to processing for near-real-time delivery',
      'Heritage from Viasat broadband satellite expertise',
    ],
    website: 'https://www.viasat.com/products/satellite-networks-real-time-earth/',
    icon: String.fromCodePoint(0x26A1),
    accentColor: 'purple',
  },
  {
    id: 'atlas-space',
    name: 'Atlas Space Operations',
    locations: '35+',
    bands: ['S', 'X', 'Ka', 'UHF'],
    pricingModel: 'Per-pass / monthly plans',
    coverageFocus: 'Global federated network',
    apiAccess: true,
    minContactTime: '1 pass',
    description: 'Provides ground station services through the Freedom platform, a cloud-based software suite that automates satellite communication scheduling, execution, and data delivery. 35+ antennas globally with strong US government credentials including FedRAMP authorization.',
    highlights: [
      'Freedom platform for automated scheduling',
      '35+ antennas in federated network',
      'FedRAMP High authorized for DoD/IC missions',
      'Rapid onboarding in weeks rather than months',
    ],
    website: 'https://www.atlasground.com/',
    icon: String.fromCodePoint(0x1F680),
    accentColor: 'red',
  },
  {
    id: 'leaf-space',
    name: 'Leaf Space',
    locations: '10+',
    bands: ['S', 'X'],
    pricingModel: 'Per-pass ($50-500)',
    coverageFocus: 'European network, LEO-focused',
    apiAccess: true,
    minContactTime: '1 pass',
    description: 'A European GaaS provider focused on making ground station access simple and affordable for the NewSpace ecosystem. Purpose-built for LEO SmallSat operators with standardized antenna configurations and a self-service scheduling portal.',
    highlights: [
      'LEO-focused with affordable pricing',
      'Self-service portal for pass scheduling',
      'Purpose-built for SmallSat/CubeSat missions',
      'Cloud-native data delivery (S3, Azure Blob)',
    ],
    website: 'https://leaf.space/',
    icon: String.fromCodePoint(0x1F343),
    accentColor: 'emerald',
  },
  {
    id: 'rbc-signals',
    name: 'RBC Signals',
    locations: '45+',
    bands: ['S', 'X', 'Ka', 'UHF', 'L'],
    pricingModel: 'Per-pass / custom',
    coverageFocus: 'Global aggregated network',
    apiAccess: true,
    minContactTime: '1 pass',
    description: 'Operates a globally distributed antenna network by aggregating capacity from partner ground station owners. Their marketplace model allows access to 45+ antennas across multiple continents. Antenna owners can monetize idle capacity through the RBC platform.',
    highlights: [
      '45+ stations in aggregated network',
      'Multi-protocol support across all bands',
      'Marketplace connecting operators with antenna owners',
      'Maximum scheduling flexibility with diverse partners',
    ],
    website: 'https://rbcsignals.com/',
    icon: String.fromCodePoint(0x1F4E1),
    accentColor: 'amber',
  },
];

const REGION_MAP: RegionGroup[] = [
  {
    name: 'Americas',
    locations: [
      { name: 'Fairbanks, AK', providers: ['AWS', 'KSAT', 'SSC', 'Atlas'] },
      { name: 'Wallops, VA', providers: ['AWS', 'SSC'] },
      { name: 'Miami, FL', providers: ['AWS', 'RBC Signals'] },
      { name: 'Chile (Santiago/Punta Arenas)', providers: ['SSC', 'KSAT', 'Leaf Space'] },
      { name: 'Brazil (Cuiaba)', providers: ['KSAT', 'RBC Signals'] },
    ],
  },
  {
    name: 'Europe',
    locations: [
      { name: 'Sweden (Esrange)', providers: ['SSC', 'KSAT'] },
      { name: 'Norway (Svalbard 78\u00B0N)', providers: ['KSAT', 'SSC'] },
      { name: 'United Kingdom', providers: ['AWS', 'Leaf Space', 'RBC Signals'] },
      { name: 'Germany', providers: ['Atlas', 'Leaf Space', 'Azure Orbital'] },
    ],
  },
  {
    name: 'Asia-Pacific',
    locations: [
      { name: 'Australia (Perth/Alice Springs)', providers: ['AWS', 'SSC', 'KSAT', 'Viasat RTE'] },
      { name: 'Singapore', providers: ['AWS', 'KSAT', 'RBC Signals'] },
      { name: 'Japan', providers: ['AWS', 'RBC Signals', 'Atlas'] },
      { name: 'South Korea', providers: ['AWS', 'KSAT'] },
    ],
  },
  {
    name: 'Africa',
    locations: [
      { name: 'South Africa (Hartebeesthoek)', providers: ['KSAT', 'SSC', 'RBC Signals'] },
      { name: 'Kenya (Malindi)', providers: ['KSAT', 'RBC Signals'] },
    ],
  },
  {
    name: 'Polar',
    locations: [
      { name: 'Svalbard (78\u00B0N)', providers: ['KSAT', 'SSC'] },
      { name: 'McMurdo, Antarctica', providers: ['KSAT (TrollSat)', 'SSC'] },
    ],
  },
];

const KEY_METRICS = [
  { label: 'Total Stations Globally', value: '200+', color: 'text-slate-300', bgColor: 'bg-white/5', borderColor: 'border-white/10' },
  { label: 'Average Contact Cost', value: '$3\u201315/min', color: 'text-amber-400', bgColor: 'bg-amber-500/10', borderColor: 'border-amber-500/30' },
  { label: 'Bands Available', value: 'S, X, Ka, UHF, L', color: 'text-purple-400', bgColor: 'bg-purple-500/10', borderColor: 'border-purple-500/30' },
  { label: 'LEO Orbit Coverage', value: '95%+', color: 'text-emerald-400', bgColor: 'bg-emerald-500/10', borderColor: 'border-emerald-500/30' },
];

const BAND_PRICING: Record<string, { min: number; max: number }> = {
  UHF: { min: 2, max: 6 },
  L: { min: 3, max: 8 },
  S: { min: 3, max: 10 },
  X: { min: 5, max: 12 },
  Ka: { min: 8, max: 15 },
};

const ALL_BANDS = ['S', 'X', 'Ka', 'UHF', 'L'];
const ALL_REGIONS = ['Americas', 'Europe', 'Asia-Pacific', 'Africa', 'Polar'];
const PRICING_MODELS = ['Pay-per-minute', 'Per-pass / subscription', 'Contract / per-pass', 'Per-pass / monthly plans', 'Per-pass / custom', 'Per-pass ($50-500)'];

// ────────────────────────────────────────
// Sub-Components
// ────────────────────────────────────────

function BandBadge({ band }: { band: string }) {
  const colors: Record<string, string> = {
    S: 'bg-white/8 text-slate-200 border-white/10',
    X: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
    Ka: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    UHF: 'bg-green-500/15 text-green-300 border-green-500/30',
    L: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
  };

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${colors[band] || 'bg-slate-500/15 text-slate-300 border-slate-500/30'}`}>
      {band}-band
    </span>
  );
}

function StatCard({ label, value, color, bgColor, borderColor }: {
  label: string;
  value: string;
  color: string;
  bgColor: string;
  borderColor: string;
}) {
  return (
    <div className={`card p-5 text-center border ${borderColor} ${bgColor}`}>
      <div className={`text-2xl md:text-3xl font-bold ${color} mb-1`}>{value}</div>
      <div className="text-xs text-slate-400 uppercase tracking-wider">{label}</div>
    </div>
  );
}

function ProviderCardComponent({ provider, onToggle, isExpanded }: {
  provider: ProviderCard;
  onToggle: () => void;
  isExpanded: boolean;
}) {
  const accentBorders: Record<string, string> = {
    cyan: 'border-white/10 hover:border-white/15',
    blue: 'border-blue-500/30 hover:border-blue-500/50',
    amber: 'border-amber-500/30 hover:border-amber-500/50',
    emerald: 'border-emerald-500/30 hover:border-emerald-500/50',
    purple: 'border-purple-500/30 hover:border-purple-500/50',
    red: 'border-red-500/30 hover:border-red-500/50',
  };

  const accentTexts: Record<string, string> = {
    cyan: 'text-slate-300',
    blue: 'text-blue-400',
    amber: 'text-amber-400',
    emerald: 'text-emerald-400',
    purple: 'text-purple-400',
    red: 'text-red-400',
  };

  return (
    <div className={`card p-6 border transition-all duration-200 ${accentBorders[provider.accentColor] || accentBorders.cyan}`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <span className="text-3xl">{provider.icon}</span>
          <div>
            <h3 className="text-lg font-bold text-white">{provider.name}</h3>
            <div className="flex items-center gap-2 mt-0.5">
              <span className={`text-sm font-medium ${accentTexts[provider.accentColor] || 'text-slate-300'}`}>
                {provider.locations} locations
              </span>
              <span className="text-slate-600">|</span>
              <span className="text-xs text-slate-400">{provider.pricingModel}</span>
            </div>
          </div>
        </div>
        {provider.apiAccess && (
          <span className="px-2 py-0.5 rounded text-xs font-medium bg-emerald-900/30 text-emerald-400 border border-emerald-500/30">
            API
          </span>
        )}
      </div>

      <div className="flex flex-wrap gap-1.5 mb-3">
        {provider.bands.map((band) => (
          <BandBadge key={band} band={band} />
        ))}
      </div>

      <p className="text-sm text-slate-400 mb-3 line-clamp-2">{provider.description}</p>

      <div className="space-y-1.5 mb-4">
        {provider.highlights.slice(0, isExpanded ? provider.highlights.length : 2).map((h, i) => (
          <div key={i} className="flex items-start gap-2 text-sm">
            <span className="text-emerald-400 mt-0.5 flex-shrink-0">
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </span>
            <span className="text-slate-300">{h}</span>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-slate-700/50">
        <button
          onClick={onToggle}
          className="text-xs text-slate-400 hover:text-white transition-colors"
        >
          {isExpanded ? 'Show less' : 'Show more'}
        </button>
        <a
          href={provider.website}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs font-medium text-slate-300 hover:text-white transition-colors"
        >
          Visit website
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </a>
      </div>
    </div>
  );
}

function SortIcon({ active, direction }: { active: boolean; direction: SortDirection }) {
  if (!active) {
    return (
      <svg className="w-3 h-3 text-slate-600 ml-1 inline-block" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
      </svg>
    );
  }
  return direction === 'asc' ? (
    <svg className="w-3 h-3 text-slate-300 ml-1 inline-block" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
    </svg>
  ) : (
    <svg className="w-3 h-3 text-slate-300 ml-1 inline-block" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  );
}

// ────────────────────────────────────────
// Main Page
// ────────────────────────────────────────

export default function GroundStationDirectoryPage() {
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBands, setSelectedBands] = useState<string[]>([]);
  const [selectedRegion, setSelectedRegion] = useState('');
  const [selectedPricing, setSelectedPricing] = useState('');

  // Card expansion
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());

  // Comparison table sorting
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  // Pricing calculator
  const [contactsPerDay, setContactsPerDay] = useState(4);
  const [contactDuration, setContactDuration] = useState(10);
  const [calcBand, setCalcBand] = useState('X');

  // Active section tab
  const [activeSection, setActiveSection] = useState<'providers' | 'comparison' | 'locations' | 'calculator'>('providers');

  // ── Filter Logic ──
  const toggleBand = useCallback((band: string) => {
    setSelectedBands((prev) =>
      prev.includes(band) ? prev.filter((b) => b !== band) : [...prev, band]
    );
  }, []);

  const filteredProviders = useMemo(() => {
    return PROVIDERS.filter((p) => {
      // Text search
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchesText =
          p.name.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          p.coverageFocus.toLowerCase().includes(q) ||
          p.bands.some((b) => b.toLowerCase().includes(q));
        if (!matchesText) return false;
      }

      // Band filter
      if (selectedBands.length > 0) {
        const hasAllBands = selectedBands.every((b) => p.bands.includes(b));
        if (!hasAllBands) return false;
      }

      // Pricing model filter
      if (selectedPricing && !p.pricingModel.includes(selectedPricing.split(' ')[0])) {
        return false;
      }

      return true;
    });
  }, [searchQuery, selectedBands, selectedPricing]);

  // Region filter for providers (cross-reference with REGION_MAP)
  const regionFilteredProviders = useMemo(() => {
    if (!selectedRegion) return filteredProviders;
    const region = REGION_MAP.find((r) => r.name === selectedRegion);
    if (!region) return filteredProviders;
    const regionProviderNames = new Set(
      region.locations.flatMap((loc) => loc.providers)
    );
    return filteredProviders.filter((p) => {
      // Match provider name substrings from region data
      return Array.from(regionProviderNames).some(
        (rp) =>
          p.name.toLowerCase().includes(rp.toLowerCase()) ||
          rp.toLowerCase().includes(p.name.split(' ')[0].toLowerCase())
      );
    });
  }, [filteredProviders, selectedRegion]);

  // ── Sorted Providers for Table ──
  const sortedProviders = useMemo(() => {
    const sorted = [...regionFilteredProviders];
    sorted.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'locations': {
          const aLoc = typeof a.locations === 'number' ? a.locations : parseInt(String(a.locations));
          const bLoc = typeof b.locations === 'number' ? b.locations : parseInt(String(b.locations));
          comparison = aLoc - bLoc;
          break;
        }
        case 'bands':
          comparison = a.bands.length - b.bands.length;
          break;
        case 'pricingModel':
          comparison = a.pricingModel.localeCompare(b.pricingModel);
          break;
        case 'minContactTime':
          comparison = a.minContactTime.localeCompare(b.minContactTime);
          break;
        case 'coverageFocus':
          comparison = a.coverageFocus.localeCompare(b.coverageFocus);
          break;
        case 'apiAccess':
          comparison = (a.apiAccess ? 1 : 0) - (b.apiAccess ? 1 : 0);
          break;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });
    return sorted;
  }, [regionFilteredProviders, sortField, sortDirection]);

  const handleSort = useCallback((field: SortField) => {
    if (sortField === field) {
      setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  }, [sortField]);

  const toggleCardExpand = useCallback((id: string) => {
    setExpandedCards((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  // ── Pricing Calculator ──
  const estimatedMonthlyCost = useMemo(() => {
    const bandRate = BAND_PRICING[calcBand] || { min: 5, max: 12 };
    const dailyMin = contactsPerDay * contactDuration * bandRate.min;
    const dailyMax = contactsPerDay * contactDuration * bandRate.max;
    const monthlyMin = dailyMin * 30;
    const monthlyMax = dailyMax * 30;
    return { min: monthlyMin, max: monthlyMax };
  }, [contactsPerDay, contactDuration, calcBand]);

  const clearFilters = useCallback(() => {
    setSearchQuery('');
    setSelectedBands([]);
    setSelectedRegion('');
    setSelectedPricing('');
  }, []);

  const hasActiveFilters = searchQuery || selectedBands.length > 0 || selectedRegion || selectedPricing;

  const sectionTabs = [
    { id: 'providers' as const, label: 'Provider Cards', icon: String.fromCodePoint(0x1F4E1) },
    { id: 'comparison' as const, label: 'Comparison Table', icon: String.fromCodePoint(0x1F4CA) },
    { id: 'locations' as const, label: 'Location Map', icon: String.fromCodePoint(0x1F5FA) },
    { id: 'calculator' as const, label: 'Pricing Calculator', icon: String.fromCodePoint(0x1F4B0) },
  ];

  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4">

        {/* Header */}
        <AnimatedPageHeader
          title="Ground Station Network Directory"
          subtitle="Comprehensive directory of commercial ground station networks and providers. Compare capabilities, pricing, coverage, and find the right ground segment partner for your mission."
          icon={<span>{String.fromCodePoint(0x1F4E1)}</span>}
          accentColor="cyan"
        />

        {/* Key Metrics */}
        <StaggerContainer className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {KEY_METRICS.map((metric) => (
            <StaggerItem key={metric.label}><StatCard {...metric} /></StaggerItem>
          ))}
        </StaggerContainer>

        {/* Search & Filters */}
        <ScrollReveal delay={0.1}>
        <div className="card p-4 mb-6">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="search"
                placeholder="Search providers, bands, regions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-800/50 border border-slate-700/50 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-white/15 focus:ring-1 focus:ring-white/30 transition-colors"
              />
            </div>

            {/* Band Filter */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-slate-400 uppercase tracking-wider">Bands:</span>
              {ALL_BANDS.map((band) => (
                <button
                  key={band}
                  onClick={() => toggleBand(band)}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                    selectedBands.includes(band)
                      ? 'bg-white/10 text-slate-200 border-white/15'
                      : 'bg-slate-800/50 text-slate-400 border-slate-700/50 hover:border-slate-600'
                  }`}
                >
                  {band}
                </button>
              ))}
            </div>

            {/* Region Filter */}
            <select
              value={selectedRegion}
              onChange={(e) => setSelectedRegion(e.target.value)}
              className="px-3 py-2.5 bg-slate-800/50 border border-slate-700/50 rounded-lg text-sm text-white focus:outline-none focus:border-white/15 transition-colors"
            >
              <option value="">All Regions</option>
              {ALL_REGIONS.map((region) => (
                <option key={region} value={region}>{region}</option>
              ))}
            </select>

            {/* Pricing Model Filter */}
            <select
              value={selectedPricing}
              onChange={(e) => setSelectedPricing(e.target.value)}
              className="px-3 py-2.5 bg-slate-800/50 border border-slate-700/50 rounded-lg text-sm text-white focus:outline-none focus:border-white/15 transition-colors"
            >
              <option value="">All Pricing</option>
              {PRICING_MODELS.map((model) => (
                <option key={model} value={model}>{model}</option>
              ))}
            </select>
          </div>

          {hasActiveFilters && (
            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-700/50">
              <span className="text-xs text-slate-400">
                {regionFilteredProviders.length} of {PROVIDERS.length} providers
              </span>
              <button
                onClick={clearFilters}
                className="text-xs text-slate-300 hover:text-white transition-colors ml-auto"
              >
                Clear all filters
              </button>
            </div>
          )}
        </div>

        </ScrollReveal>

        {/* Section Tabs */}
        <ScrollReveal delay={0.2}>
        <div className="flex gap-1 mb-6 overflow-x-auto pb-1">
          {sectionTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveSection(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                activeSection === tab.id
                  ? 'bg-white/8 text-slate-200 border border-white/10'
                  : 'bg-slate-800/50 text-slate-400 border border-slate-700/30 hover:text-white hover:border-slate-600'
              }`}
            >
              <span>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>
        </ScrollReveal>

        {/* ── Provider Cards Section ── */}
        {activeSection === 'providers' && (
          <section>
            <h2 className="text-xl font-bold text-white mb-4">Major Ground Station Networks</h2>
            {regionFilteredProviders.length === 0 ? (
              <div className="card p-12 text-center">
                <div className="text-4xl mb-3">{String.fromCodePoint(0x1F50D)}</div>
                <p className="text-slate-400 mb-2">No providers match your filters.</p>
                <button onClick={clearFilters} className="text-sm text-slate-300 hover:text-white transition-colors">
                  Clear filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {regionFilteredProviders.map((provider) => (
                  <ProviderCardComponent
                    key={provider.id}
                    provider={provider}
                    isExpanded={expandedCards.has(provider.id)}
                    onToggle={() => toggleCardExpand(provider.id)}
                  />
                ))}
              </div>
            )}
          </section>
        )}

        {/* ── Comparison Table Section ── */}
        {activeSection === 'comparison' && (
          <section>
            <h2 className="text-xl font-bold text-white mb-4">Station Comparison Table</h2>
            <div className="card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-800/60 border-b border-slate-700/50">
                      {([
                        { field: 'name' as SortField, label: 'Provider' },
                        { field: 'locations' as SortField, label: '# Stations' },
                        { field: 'bands' as SortField, label: 'Bands Supported' },
                        { field: 'pricingModel' as SortField, label: 'Pricing Model' },
                        { field: 'minContactTime' as SortField, label: 'Min Contact' },
                        { field: 'coverageFocus' as SortField, label: 'Coverage Focus' },
                        { field: 'apiAccess' as SortField, label: 'API Access' },
                      ]).map((col) => (
                        <th
                          key={col.field}
                          onClick={() => handleSort(col.field)}
                          className="px-4 py-3 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider cursor-pointer hover:text-white transition-colors select-none whitespace-nowrap"
                        >
                          {col.label}
                          <SortIcon active={sortField === col.field} direction={sortDirection} />
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/30">
                    {sortedProviders.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{p.icon}</span>
                            <span className="font-medium text-white">{p.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-300 whitespace-nowrap">{p.locations}</td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {p.bands.map((b) => (
                              <BandBadge key={b} band={b} />
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-300 whitespace-nowrap">{p.pricingModel}</td>
                        <td className="px-4 py-3 text-slate-300 whitespace-nowrap">{p.minContactTime}</td>
                        <td className="px-4 py-3 text-slate-400 max-w-[200px] truncate">{p.coverageFocus}</td>
                        <td className="px-4 py-3">
                          {p.apiAccess ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-900/30 text-emerald-400 border border-emerald-500/30">
                              Yes
                            </span>
                          ) : (
                            <span className="text-slate-500">No</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {sortedProviders.length === 0 && (
                <div className="p-8 text-center text-slate-400">
                  No providers match your current filters.
                </div>
              )}
            </div>
          </section>
        )}

        {/* ── Location Map Section ── */}
        {activeSection === 'locations' && (
          <section>
            <h2 className="text-xl font-bold text-white mb-4">Global Station Locations by Region</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {REGION_MAP.map((region) => {
                const regionIcons: Record<string, string> = {
                  'Americas': String.fromCodePoint(0x1F30E),
                  'Europe': String.fromCodePoint(0x1F30D),
                  'Asia-Pacific': String.fromCodePoint(0x1F30F),
                  'Africa': String.fromCodePoint(0x1F30D),
                  'Polar': String.fromCodePoint(0x2744),
                };

                const regionAccents: Record<string, string> = {
                  'Americas': 'border-blue-500/30',
                  'Europe': 'border-emerald-500/30',
                  'Asia-Pacific': 'border-amber-500/30',
                  'Africa': 'border-purple-500/30',
                  'Polar': 'border-white/10',
                };

                return (
                  <div key={region.name} className={`card p-5 border ${regionAccents[region.name] || 'border-slate-700/50'}`}>
                    <div className="flex items-center gap-2 mb-4">
                      <span className="text-2xl">{regionIcons[region.name] || String.fromCodePoint(0x1F4CD)}</span>
                      <h3 className="text-lg font-bold text-white">{region.name}</h3>
                      <span className="text-xs text-slate-400 ml-auto">{region.locations.length} sites</span>
                    </div>
                    <div className="space-y-3">
                      {region.locations.map((loc) => (
                        <div key={loc.name} className="pb-3 border-b border-slate-700/30 last:border-0 last:pb-0">
                          <div className="flex items-center gap-2 mb-1.5">
                            <svg className="w-3.5 h-3.5 text-slate-300 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                            </svg>
                            <span className="text-sm font-medium text-white">{loc.name}</span>
                          </div>
                          <div className="flex flex-wrap gap-1 ml-5">
                            {loc.providers.map((prov) => (
                              <span
                                key={prov}
                                className="px-2 py-0.5 rounded text-xs bg-slate-800/80 text-slate-300 border border-slate-700/50"
                              >
                                {prov}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Summary Stats */}
            <div className="card p-5 mt-6 border border-slate-700/30">
              <h3 className="text-lg font-bold text-white mb-3">Coverage Summary</h3>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
                {REGION_MAP.map((region) => (
                  <div key={region.name}>
                    <div className="text-2xl font-bold text-slate-300">{region.locations.length}</div>
                    <div className="text-xs text-slate-400">{region.name} sites</div>
                  </div>
                ))}
              </div>
              <p className="text-sm text-slate-400 mt-4">
                Combined, these networks provide coverage for 95%+ of all LEO satellite orbits, with Svalbard (78{'\u00B0'}N) and McMurdo (Antarctica) ensuring polar orbit coverage on nearly every pass. Equatorial and mid-latitude stations provide broad coverage for inclined and sun-synchronous orbits.
              </p>
            </div>
          </section>
        )}

        {/* ── Pricing Calculator Section ── */}
        {activeSection === 'calculator' && (
          <section>
            <h2 className="text-xl font-bold text-white mb-4">Ground Station Pricing Calculator</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Input Panel */}
              <div className="card p-6 border border-slate-700/30">
                <h3 className="text-lg font-semibold text-white mb-5">Configure Your Usage</h3>

                <div className="space-y-6">
                  {/* Contacts per day */}
                  <div>
                    <label className="flex items-center justify-between text-sm text-slate-300 mb-2">
                      <span>Number of contacts per day</span>
                      <span className="text-slate-300 font-mono font-bold">{contactsPerDay}</span>
                    </label>
                    <input
                      type="range"
                      min={1}
                      max={50}
                      value={contactsPerDay}
                      onChange={(e) => setContactsPerDay(parseInt(e.target.value))}
                      className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-slate-400"
                    />
                    <div className="flex justify-between text-xs text-slate-500 mt-1">
                      <span>1</span>
                      <span>25</span>
                      <span>50</span>
                    </div>
                  </div>

                  {/* Contact duration */}
                  <div>
                    <label className="flex items-center justify-between text-sm text-slate-300 mb-2">
                      <span>Contact duration (minutes)</span>
                      <span className="text-slate-300 font-mono font-bold">{contactDuration} min</span>
                    </label>
                    <input
                      type="range"
                      min={1}
                      max={30}
                      value={contactDuration}
                      onChange={(e) => setContactDuration(parseInt(e.target.value))}
                      className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-slate-400"
                    />
                    <div className="flex justify-between text-xs text-slate-500 mt-1">
                      <span>1 min</span>
                      <span>15 min</span>
                      <span>30 min</span>
                    </div>
                  </div>

                  {/* Band selection */}
                  <div>
                    <label className="text-sm text-slate-300 mb-2 block">Frequency band</label>
                    <div className="flex flex-wrap gap-2">
                      {Object.keys(BAND_PRICING).map((band) => (
                        <button
                          key={band}
                          onClick={() => setCalcBand(band)}
                          className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                            calcBand === band
                              ? 'bg-white/10 text-slate-200 border-white/15'
                              : 'bg-slate-800/50 text-slate-400 border-slate-700/50 hover:border-slate-600'
                          }`}
                        >
                          {band}-band
                          <span className="text-xs text-slate-500 ml-1">
                            (${BAND_PRICING[band].min}-{BAND_PRICING[band].max}/min)
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Usage summary */}
                <div className="mt-6 p-4 bg-slate-800/50 rounded-lg border border-slate-700/30">
                  <div className="text-xs text-slate-400 uppercase tracking-wider mb-2">Usage Summary</div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="text-slate-400">Daily contacts:</span>
                      <span className="text-white font-medium ml-2">{contactsPerDay}</span>
                    </div>
                    <div>
                      <span className="text-slate-400">Per contact:</span>
                      <span className="text-white font-medium ml-2">{contactDuration} min</span>
                    </div>
                    <div>
                      <span className="text-slate-400">Daily minutes:</span>
                      <span className="text-white font-medium ml-2">{contactsPerDay * contactDuration} min</span>
                    </div>
                    <div>
                      <span className="text-slate-400">Monthly minutes:</span>
                      <span className="text-white font-medium ml-2">{(contactsPerDay * contactDuration * 30).toLocaleString()} min</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Result Panel */}
              <div className="card p-6 border border-white/10 bg-gradient-to-br from-slate-800/10 to-transparent">
                <h3 className="text-lg font-semibold text-white mb-5">Estimated Monthly Cost</h3>

                <div className="text-center mb-6">
                  <div className="text-4xl md:text-5xl font-bold text-slate-300 mb-1">
                    ${estimatedMonthlyCost.min.toLocaleString()} - ${estimatedMonthlyCost.max.toLocaleString()}
                  </div>
                  <div className="text-sm text-slate-400">per month ({calcBand}-band, pay-per-minute model)</div>
                </div>

                {/* Cost breakdown */}
                <div className="space-y-3 mb-6">
                  <div className="flex justify-between items-center p-3 bg-slate-800/40 rounded-lg">
                    <span className="text-sm text-slate-300">Cost per contact (low)</span>
                    <span className="text-sm font-medium text-emerald-400">
                      ${(contactDuration * BAND_PRICING[calcBand].min).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-slate-800/40 rounded-lg">
                    <span className="text-sm text-slate-300">Cost per contact (high)</span>
                    <span className="text-sm font-medium text-amber-400">
                      ${(contactDuration * BAND_PRICING[calcBand].max).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-slate-800/40 rounded-lg">
                    <span className="text-sm text-slate-300">Daily cost range</span>
                    <span className="text-sm font-medium text-white">
                      ${(contactsPerDay * contactDuration * BAND_PRICING[calcBand].min).toLocaleString()} - ${(contactsPerDay * contactDuration * BAND_PRICING[calcBand].max).toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Pricing tips */}
                <div className="p-4 bg-slate-800/30 rounded-lg border border-slate-700/30">
                  <h4 className="text-sm font-semibold text-white mb-2">Cost Optimization Tips</h4>
                  <ul className="space-y-1.5 text-xs text-slate-400">
                    <li className="flex items-start gap-2">
                      <span className="text-slate-300 mt-0.5 flex-shrink-0">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                      </span>
                      <span>Subscription plans become cost-effective at 200+ contacts/month</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-slate-300 mt-0.5 flex-shrink-0">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                      </span>
                      <span>Multi-year contracts can reduce rates by 20-40%</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-slate-300 mt-0.5 flex-shrink-0">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                      </span>
                      <span>Off-peak scheduling windows may offer lower rates</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-slate-300 mt-0.5 flex-shrink-0">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                      </span>
                      <span>Aggregator networks (RBC Signals) can offer competitive multi-station pricing</span>
                    </li>
                  </ul>
                </div>

                {/* Band comparison */}
                <div className="mt-4">
                  <h4 className="text-sm font-semibold text-white mb-2">Rate by Band ({contactDuration} min contact)</h4>
                  <div className="space-y-2">
                    {Object.entries(BAND_PRICING).map(([band, rates]) => {
                      const contactCostMin = contactDuration * rates.min;
                      const contactCostMax = contactDuration * rates.max;
                      const maxPossible = 30 * 15; // max duration * max rate for bar scaling
                      const barWidth = Math.min(100, (contactCostMax / maxPossible) * 100);
                      return (
                        <div key={band} className="flex items-center gap-3">
                          <span className={`text-xs font-medium w-8 ${band === calcBand ? 'text-slate-300' : 'text-slate-400'}`}>{band}</span>
                          <div className="flex-1 h-5 bg-slate-800/50 rounded-full overflow-hidden relative">
                            <div
                              className={`h-full rounded-full transition-all duration-300 ${band === calcBand ? 'bg-white/40' : 'bg-slate-700/50'}`}
                              style={{ width: `${barWidth}%` }}
                            />
                            <span className="absolute inset-0 flex items-center justify-center text-xs text-slate-300">
                              ${contactCostMin} - ${contactCostMax}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Disclaimer */}
            <div className="card p-4 mt-4 border border-slate-700/30">
              <p className="text-xs text-slate-500">
                <span className="font-medium text-slate-400">Disclaimer:</span> Pricing estimates are approximate and based on publicly available pay-per-minute rates. Actual costs vary by provider, contract terms, antenna size, band, data rate, and volume commitments. Contact providers directly for accurate quotes. Some providers offer per-pass pricing which may not directly translate to per-minute rates.
              </p>
            </div>
          </section>
        )}

        {/* Cross-link to existing ground stations page */}
        <div className="mt-10 card p-5 border border-slate-700/30">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-white">Looking for our interactive Ground Station Map?</h3>
              <p className="text-sm text-slate-400 mt-1">
                Explore detailed network profiles, frequency band guides, and decision-making frameworks on our Ground Station Network page.
              </p>
            </div>
            <a
              href="/ground-stations"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-white hover:bg-slate-100 text-slate-900 text-sm rounded-lg font-medium transition-colors whitespace-nowrap"
            >
              View Ground Station Map
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
