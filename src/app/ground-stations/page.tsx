'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import AnimatedPageHeader from '@/components/ui/AnimatedPageHeader';
import ScrollReveal, { StaggerContainer, StaggerItem } from '@/components/ui/ScrollReveal';
import DataFreshness from '@/components/ui/DataFreshness';

// ────────────────────────────────────────
// Types
// ────────────────────────────────────────

type TabId = 'networks' | 'comparison' | 'frequencies' | 'guide';

interface GroundStationNetwork {
  id: string;
  name: string;
  stations: string;
  bands: string[];
  coverage: string;
  model: 'Owned' | 'GaaS' | 'Aggregator' | 'Government' | 'Cloud-integrated';
  pricingModel: string;
  targetCustomers: string;
  description: string;
  website: string;
  highlights: string[];
  latencyInfo: string;
  uptimeGuarantee: string;
}

interface FrequencyBand {
  name: string;
  range: string;
  color: string;
  borderColor: string;
  useCases: string[];
  advantages: string[];
  limitations: string[];
  typicalDataRate: string;
  commonUsers: string[];
}

interface HeroStat {
  label: string;
  value: string;
  color: string;
}

interface DecisionFactor {
  title: string;
  icon: string;
  description: string;
  details: string[];
}

// ────────────────────────────────────────
// Components
// ────────────────────────────────────────

function NetworkCard({ network }: { network: GroundStationNetwork }) {
  const [expanded, setExpanded] = useState(false);

  const modelColors: Record<string, string> = {
    'Owned': 'text-blue-400 bg-blue-500/10 border-blue-500/30',
    'GaaS': 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30',
    'Aggregator': 'text-purple-400 bg-purple-500/10 border-purple-500/30',
    'Government': 'text-amber-400 bg-amber-500/10 border-amber-500/30',
    'Cloud-integrated': 'text-green-400 bg-green-500/10 border-green-500/30',
  };

  return (
    <div className="card-elevated p-6 border border-space-700 hover:border-cyan-500/30 transition-all group">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-white font-semibold text-lg group-hover:text-cyan-300 transition-colors">
            {network.name}
          </h3>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-cyan-400 text-sm font-medium">{network.stations}</span>
            <span className="text-slate-500">|</span>
            <span className="text-slate-400 text-sm">{network.coverage}</span>
          </div>
        </div>
        <span className={`text-xs font-bold px-2.5 py-1 rounded border ${modelColors[network.model] || 'text-slate-400 bg-slate-500/10 border-slate-500/30'}`}>
          {network.model}
        </span>
      </div>

      {/* Frequency Bands */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        {network.bands.map((band) => (
          <span
            key={band}
            className="px-2 py-0.5 bg-space-700 text-cyan-300 border border-space-600 rounded text-xs font-medium"
          >
            {band}
          </span>
        ))}
      </div>

      {/* Description */}
      <p className="text-slate-400 text-sm leading-relaxed mb-4">
        {expanded ? network.description : network.description.slice(0, 150) + '...'}
      </p>

      {/* Key Stats */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-space-800/50 rounded-lg p-3">
          <div className="text-slate-500 text-xs uppercase tracking-widest mb-1">Pricing</div>
          <div className="text-white text-sm font-medium">{network.pricingModel}</div>
        </div>
        <div className="bg-space-800/50 rounded-lg p-3">
          <div className="text-slate-500 text-xs uppercase tracking-widest mb-1">Latency</div>
          <div className="text-white text-sm font-medium">{network.latencyInfo}</div>
        </div>
      </div>

      {/* Expanded Content */}
      {expanded && (
        <div className="space-y-4 mb-4">
          <div>
            <div className="text-slate-500 text-xs uppercase tracking-widest mb-2">Target Customers</div>
            <p className="text-slate-300 text-sm">{network.targetCustomers}</p>
          </div>
          <div>
            <div className="text-slate-500 text-xs uppercase tracking-widest mb-2">Uptime</div>
            <p className="text-slate-300 text-sm">{network.uptimeGuarantee}</p>
          </div>
          <div>
            <div className="text-slate-500 text-xs uppercase tracking-widest mb-2">Key Highlights</div>
            <ul className="space-y-1">
              {network.highlights.map((h, i) => (
                <li key={i} className="text-slate-300 text-sm flex items-start gap-2">
                  <span className="text-cyan-400 mt-0.5 flex-shrink-0">-</span>
                  {h}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Toggle */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="text-sm text-cyan-400 hover:text-cyan-300 transition-colors"
      >
        {expanded ? 'Show less' : 'Show details'} {expanded ? String.fromCharCode(8593) : String.fromCharCode(8595)}
      </button>
    </div>
  );
}

function ComparisonTable({ networks }: { networks: GroundStationNetwork[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-space-700">
            <th className="text-left py-3 px-4 text-slate-400 font-medium uppercase tracking-widest text-xs">Network</th>
            <th className="text-left py-3 px-4 text-slate-400 font-medium uppercase tracking-widest text-xs">Stations</th>
            <th className="text-left py-3 px-4 text-slate-400 font-medium uppercase tracking-widest text-xs">Bands</th>
            <th className="text-left py-3 px-4 text-slate-400 font-medium uppercase tracking-widest text-xs">Coverage</th>
            <th className="text-left py-3 px-4 text-slate-400 font-medium uppercase tracking-widest text-xs">Model</th>
            <th className="text-left py-3 px-4 text-slate-400 font-medium uppercase tracking-widest text-xs">Target Customers</th>
            <th className="text-left py-3 px-4 text-slate-400 font-medium uppercase tracking-widest text-xs">Pricing</th>
          </tr>
        </thead>
        <tbody>
          {networks.map((network, idx) => (
            <tr
              key={network.id}
              className={`border-b border-space-800 hover:bg-space-800/50 transition-colors ${
                idx % 2 === 0 ? 'bg-space-900/50' : ''
              }`}
            >
              <td className="py-3 px-4 text-white font-medium whitespace-nowrap">{network.name}</td>
              <td className="py-3 px-4 text-cyan-400 whitespace-nowrap">{network.stations}</td>
              <td className="py-3 px-4">
                <div className="flex flex-wrap gap-1">
                  {network.bands.map((band) => (
                    <span key={band} className="px-1.5 py-0.5 bg-space-700 text-cyan-300 rounded text-xs">
                      {band}
                    </span>
                  ))}
                </div>
              </td>
              <td className="py-3 px-4 text-slate-300 whitespace-nowrap">{network.coverage}</td>
              <td className="py-3 px-4">
                <span className={`text-xs font-medium px-2 py-0.5 rounded ${
                  network.model === 'GaaS' ? 'text-cyan-400 bg-cyan-500/10' :
                  network.model === 'Owned' ? 'text-blue-400 bg-blue-500/10' :
                  network.model === 'Cloud-integrated' ? 'text-green-400 bg-green-500/10' :
                  network.model === 'Aggregator' ? 'text-purple-400 bg-purple-500/10' :
                  'text-amber-400 bg-amber-500/10'
                }`}>
                  {network.model}
                </span>
              </td>
              <td className="py-3 px-4 text-slate-400 max-w-[200px] truncate">{network.targetCustomers}</td>
              <td className="py-3 px-4 text-slate-300 whitespace-nowrap">{network.pricingModel}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function FrequencyBandCard({ band }: { band: FrequencyBand }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={`card-elevated p-6 border ${band.borderColor} transition-all`}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className={`text-xl font-bold ${band.color}`}>{band.name}</h3>
          <p className="text-slate-400 text-sm mt-1">{band.range}</p>
        </div>
        <div className="text-right">
          <div className="text-slate-500 text-xs uppercase tracking-widest">Data Rate</div>
          <div className="text-white text-sm font-medium">{band.typicalDataRate}</div>
        </div>
      </div>

      {/* Use Cases */}
      <div className="mb-4">
        <div className="text-slate-500 text-xs uppercase tracking-widest mb-2">Primary Use Cases</div>
        <div className="space-y-1">
          {band.useCases.map((uc, i) => (
            <div key={i} className="text-slate-300 text-sm flex items-start gap-2">
              <span className={`mt-0.5 flex-shrink-0 ${band.color}`}>-</span>
              {uc}
            </div>
          ))}
        </div>
      </div>

      {/* Common Users */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        {band.commonUsers.map((user) => (
          <span key={user} className="px-2 py-0.5 bg-space-700 text-slate-300 border border-space-600 rounded text-xs">
            {user}
          </span>
        ))}
      </div>

      {expanded && (
        <div className="space-y-4 mb-4">
          <div>
            <div className="text-green-400 text-xs uppercase tracking-widest mb-2">Advantages</div>
            <ul className="space-y-1">
              {band.advantages.map((adv, i) => (
                <li key={i} className="text-slate-300 text-sm flex items-start gap-2">
                  <span className="text-green-400 mt-0.5 flex-shrink-0">+</span>
                  {adv}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <div className="text-red-400 text-xs uppercase tracking-widest mb-2">Limitations</div>
            <ul className="space-y-1">
              {band.limitations.map((lim, i) => (
                <li key={i} className="text-slate-300 text-sm flex items-start gap-2">
                  <span className="text-red-400 mt-0.5 flex-shrink-0">-</span>
                  {lim}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <button
        onClick={() => setExpanded(!expanded)}
        className={`text-sm ${band.color} hover:opacity-80 transition-colors`}
      >
        {expanded ? 'Show less' : 'Advantages & limitations'} {expanded ? String.fromCharCode(8593) : String.fromCharCode(8595)}
      </button>
    </div>
  );
}

// ────────────────────────────────────────
// Main Page
// ────────────────────────────────────────

export default function GroundStationsPage() {
  const [activeTab, setActiveTab] = useState<TabId>('networks');
  const [modelFilter, setModelFilter] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshedAt, setRefreshedAt] = useState<string | null>(null);
  const [GROUND_STATION_NETWORKS, setNetworks] = useState<GroundStationNetwork[]>([]);
  const [FREQUENCY_BANDS, setFrequencyBands] = useState<FrequencyBand[]>([]);
  const [HERO_STATS, setHeroStats] = useState<HeroStat[]>([]);
  const [DECISION_FACTORS, setDecisionFactors] = useState<DecisionFactor[]>([]);

  useEffect(() => {
    async function fetchData() {
      setError(null);
      try {
        const [networksRes, bandsRes, statsRes, factorsRes] = await Promise.all([
          fetch('/api/content/ground-stations?section=networks'),
          fetch('/api/content/ground-stations?section=frequency-bands'),
          fetch('/api/content/ground-stations?section=hero-stats'),
          fetch('/api/content/ground-stations?section=decision-factors'),
        ]);

        const [networksJson, bandsJson, statsJson, factorsJson] = await Promise.all([
          networksRes.json(),
          bandsRes.json(),
          statsRes.json(),
          factorsRes.json(),
        ]);

        if (networksJson.data?.length) setNetworks(networksJson.data);
        if (bandsJson.data?.length) setFrequencyBands(bandsJson.data);
        if (statsJson.data?.length) setHeroStats(statsJson.data);
        if (factorsJson.data?.length) setDecisionFactors(factorsJson.data);

        // Use the most recent refreshedAt from all sections
        const allMeta = [networksJson, bandsJson, statsJson, factorsJson];
        const latestRefresh = allMeta
          .map((m) => m.meta?.lastRefreshed)
          .filter(Boolean)
          .sort()
          .pop();
        if (latestRefresh) setRefreshedAt(latestRefresh);
      } catch (error) {
        console.error('Failed to fetch ground station data:', error);
        setError('Failed to load data.');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B0F1A] text-white p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-slate-800 rounded w-1/3"></div>
            <div className="h-4 bg-slate-800 rounded w-2/3"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
              {[1,2,3,4].map(i => <div key={i} className="h-48 bg-slate-800 rounded-lg"></div>)}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const filteredNetworks = modelFilter
    ? GROUND_STATION_NETWORKS.filter((n) => n.model === modelFilter)
    : GROUND_STATION_NETWORKS;

  const tabs: { id: TabId; label: string; icon: string }[] = [
    { id: 'networks', label: 'Station Networks', icon: String.fromCodePoint(0x1F4E1) },
    { id: 'comparison', label: 'Comparison Table', icon: String.fromCodePoint(0x1F4CA) },
    { id: 'frequencies', label: 'Frequency Bands', icon: String.fromCodePoint(0x1F4F6) },
    { id: 'guide', label: 'Choosing a Station', icon: String.fromCodePoint(0x1F9ED) },
  ];

  return (
    <div className="min-h-screen bg-space-900">
      <div className="container mx-auto px-4">
        <AnimatedPageHeader
          title="Ground Station Map"
          subtitle="Global ground station networks for satellite communications - locations, capabilities, and service comparison"
          icon="📡"
          accentColor="emerald"
        >
          <Link href="/" className="btn-secondary text-sm py-2 px-4">
            {String.fromCharCode(8592)} Back to Dashboard
          </Link>
        </AnimatedPageHeader>

        <DataFreshness refreshedAt={refreshedAt} source="DynamicContent" />

        {error && (
          <div className="card p-5 border border-red-500/20 bg-red-500/5 text-center mb-6">
            <div className="text-red-400 text-sm font-medium">{error}</div>
          </div>
        )}

        {/* Hero Stats */}
        <ScrollReveal>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {HERO_STATS.map((stat) => (
            <div key={stat.label} className="card-elevated p-5 text-center">
              <div className={`text-3xl font-bold font-display tracking-tight ${stat.color}`}>
                {stat.value}
              </div>
              <div className="text-slate-400 text-xs uppercase tracking-widest font-medium mt-1">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
        </ScrollReveal>

        {/* Industry Overview Banner */}
        <div className="bg-gradient-to-r from-cyan-500/10 via-blue-500/10 to-purple-500/10 border border-cyan-500/30 rounded-xl p-5 mb-8">
          <div className="flex items-start gap-4">
            <span className="text-3xl flex-shrink-0">{String.fromCodePoint(0x1F30D)}</span>
            <div>
              <h3 className="font-semibold text-white mb-1">Ground Segment as a Service (GSaaS) Market</h3>
              <p className="text-sm text-slate-300 leading-relaxed">
                The ground station services market is projected to exceed $5B by 2030, driven by the explosion
                of LEO constellations. Traditional owned-and-operated models are giving way to cloud-integrated
                Ground-as-a-Service platforms from AWS, Microsoft Azure, and specialized providers like Leaf Space
                and Atlas. This shift mirrors the cloud computing revolution -- satellite operators now have
                flexible, pay-per-use access to global antenna networks without capital-intensive infrastructure investments.
              </p>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-space-700 mb-6">
          <div className="flex gap-1 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-cyan-500 text-cyan-300'
                    : 'border-transparent text-slate-400 hover:text-white hover:border-slate-600'
                }`}
              >
                <span className="mr-1.5">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="pb-12">
          {/* Networks Tab */}
          {activeTab === 'networks' && (
            <div>
              {/* Filter */}
              <div className="flex flex-wrap items-center gap-3 mb-6">
                <span className="text-slate-400 text-sm">Filter by model:</span>
                {['', 'Owned', 'GaaS', 'Cloud-integrated', 'Aggregator', 'Government'].map((model) => (
                  <button
                    key={model}
                    onClick={() => setModelFilter(model)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                      modelFilter === model
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50'
                        : 'bg-space-800 text-slate-400 border border-space-700 hover:border-space-600 hover:text-white'
                    }`}
                  >
                    {model || 'All'}
                  </button>
                ))}
              </div>

              {/* Network Cards Grid */}
              <StaggerContainer className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {filteredNetworks.map((network) => (
                  <StaggerItem key={network.id}>
                    <NetworkCard network={network} />
                  </StaggerItem>
                ))}
              </StaggerContainer>

              {filteredNetworks.length === 0 && (
                <div className="text-center py-12">
                  <span className="text-5xl block mb-4">{String.fromCodePoint(0x1F4E1)}</span>
                  <p className="text-slate-400">No networks match the selected filter.</p>
                </div>
              )}

              {/* Network Stats Summary */}
              <div className="mt-8 card-elevated p-6 border border-space-700">
                <h3 className="font-semibold text-white mb-4">Network Coverage Summary</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-space-800/50 rounded-xl p-4">
                    <div className="text-cyan-400 text-2xl font-bold mb-1">
                      {GROUND_STATION_NETWORKS.filter((n) => n.model === 'GaaS').length}
                    </div>
                    <div className="text-slate-400 text-sm">GaaS Providers</div>
                    <p className="text-slate-500 text-xs mt-2">
                      Cloud-native, pay-per-use ground station services. Ideal for startups and
                      operators without capital for owned infrastructure.
                    </p>
                  </div>
                  <div className="bg-space-800/50 rounded-xl p-4">
                    <div className="text-blue-400 text-2xl font-bold mb-1">
                      {GROUND_STATION_NETWORKS.filter((n) => n.model === 'Owned').length}
                    </div>
                    <div className="text-slate-400 text-sm">Owned Networks</div>
                    <p className="text-slate-500 text-xs mt-2">
                      Traditional owned-and-operated infrastructure. Best reliability and
                      performance for established mission operators.
                    </p>
                  </div>
                  <div className="bg-space-800/50 rounded-xl p-4">
                    <div className="text-purple-400 text-2xl font-bold mb-1">
                      {GROUND_STATION_NETWORKS.filter((n) => n.model === 'Aggregator' || n.model === 'Cloud-integrated').length}
                    </div>
                    <div className="text-slate-400 text-sm">Marketplace / Cloud</div>
                    <p className="text-slate-500 text-xs mt-2">
                      Aggregated antenna networks and cloud-integrated platforms providing
                      global coverage through partnerships.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Comparison Tab */}
          {activeTab === 'comparison' && (
            <div>
              <div className="card-elevated border border-space-700 overflow-hidden">
                <div className="p-4 border-b border-space-700">
                  <h3 className="text-white font-semibold">Ground Station Network Comparison</h3>
                  <p className="text-slate-400 text-sm mt-1">
                    Side-by-side comparison of major commercial and institutional ground station networks
                  </p>
                </div>
                <ComparisonTable networks={GROUND_STATION_NETWORKS} />
              </div>

              {/* Model Explanation */}
              <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="card-elevated p-5 border border-cyan-500/20">
                  <h4 className="text-cyan-400 font-semibold mb-2">GaaS (Ground as a Service)</h4>
                  <p className="text-slate-400 text-sm leading-relaxed">
                    Cloud-like model where operators pay per contact or per minute. No antenna ownership required.
                    Provider manages all hardware, maintenance, and operations. Fastest time-to-first-contact.
                  </p>
                </div>
                <div className="card-elevated p-5 border border-blue-500/20">
                  <h4 className="text-blue-400 font-semibold mb-2">Owned Infrastructure</h4>
                  <p className="text-slate-400 text-sm leading-relaxed">
                    Traditional model where the operator owns and maintains ground stations. Higher upfront cost
                    but better long-term economics for high-volume operations. Maximum control and customization.
                  </p>
                </div>
                <div className="card-elevated p-5 border border-purple-500/20">
                  <h4 className="text-purple-400 font-semibold mb-2">Marketplace / Aggregator</h4>
                  <p className="text-slate-400 text-sm leading-relaxed">
                    Platforms that aggregate capacity from multiple ground station owners. Operators access a shared
                    network with flexible scheduling. Antenna owners can monetize idle capacity.
                  </p>
                </div>
              </div>

              {/* Key Insights */}
              <div className="mt-6 card-elevated p-6 border border-space-700">
                <h3 className="text-white font-semibold mb-4">Key Selection Insights</h3>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <span className="text-cyan-400 font-bold text-sm mt-0.5 flex-shrink-0">01</span>
                    <p className="text-slate-300 text-sm">
                      <strong className="text-white">Polar coverage is a bottleneck.</strong> Only KSAT and SSC offer
                      true pole-to-pole coverage. For Sun-synchronous orbit satellites, Svalbard ground station access
                      is near-essential for every-orbit data downlink.
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-cyan-400 font-bold text-sm mt-0.5 flex-shrink-0">02</span>
                    <p className="text-slate-300 text-sm">
                      <strong className="text-white">Cloud integration is the differentiator.</strong> AWS Ground Station
                      and Azure Orbital convert antenna contacts into cloud-native data pipelines, eliminating the
                      traditional ground segment data distribution challenge.
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-cyan-400 font-bold text-sm mt-0.5 flex-shrink-0">03</span>
                    <p className="text-slate-300 text-sm">
                      <strong className="text-white">Aggregator networks maximize scheduling flexibility.</strong> RBC Signals
                      and Infostellar StellarStation combine capacity from 20-40+ partner antennas, making them ideal
                      for operators needing maximum pass opportunities.
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-cyan-400 font-bold text-sm mt-0.5 flex-shrink-0">04</span>
                    <p className="text-slate-300 text-sm">
                      <strong className="text-white">SmallSat operators should start with GaaS.</strong> Leaf Space and
                      Atlas Space Operations offer rapid onboarding (weeks) with no capital expenditure. Scale to
                      owned infrastructure only when contact volume justifies the investment.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Frequencies Tab */}
          {activeTab === 'frequencies' && (
            <div>
              {/* Spectrum Overview */}
              <div className="card-elevated p-6 border border-space-700 mb-6">
                <h3 className="text-white font-semibold mb-3">Satellite Frequency Spectrum Overview</h3>
                <p className="text-slate-400 text-sm leading-relaxed mb-4">
                  Satellite communications use specific frequency bands allocated by the International Telecommunication
                  Union (ITU). Each band has distinct propagation characteristics that determine its suitability for
                  different mission types. Lower frequencies offer better weather resilience but less bandwidth; higher
                  frequencies enable greater data throughput but suffer from rain fade and atmospheric attenuation.
                </p>

                {/* Visual Spectrum Bar */}
                <div className="relative">
                  <div className="text-slate-500 text-xs mb-2">Frequency Spectrum (Low {String.fromCharCode(8594)} High)</div>
                  <div className="flex rounded-lg overflow-hidden h-8">
                    <div className="bg-green-500/30 flex-[3] flex items-center justify-center text-xs text-green-300 font-medium border-r border-space-900">
                      UHF
                    </div>
                    <div className="bg-cyan-500/30 flex-[2] flex items-center justify-center text-xs text-cyan-300 font-medium border-r border-space-900">
                      S
                    </div>
                    <div className="bg-blue-500/30 flex-[4] flex items-center justify-center text-xs text-blue-300 font-medium border-r border-space-900">
                      X
                    </div>
                    <div className="bg-purple-500/30 flex-[6] flex items-center justify-center text-xs text-purple-300 font-medium border-r border-space-900">
                      Ku
                    </div>
                    <div className="bg-amber-500/30 flex-[14] flex items-center justify-center text-xs text-amber-300 font-medium">
                      Ka
                    </div>
                  </div>
                  <div className="flex justify-between mt-1 text-xs text-slate-500">
                    <span>300 MHz</span>
                    <span>4 GHz</span>
                    <span>12 GHz</span>
                    <span>18 GHz</span>
                    <span>40 GHz</span>
                  </div>
                </div>
              </div>

              {/* Band Cards */}
              <StaggerContainer className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {FREQUENCY_BANDS.map((band) => (
                  <StaggerItem key={band.name}>
                    <FrequencyBandCard band={band} />
                  </StaggerItem>
                ))}
              </StaggerContainer>

              {/* Band Selection Quick Guide */}
              <div className="mt-6 card-elevated p-6 border border-space-700">
                <h3 className="text-white font-semibold mb-4">Quick Band Selection Guide</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-space-700">
                        <th className="text-left py-2 px-3 text-slate-400 font-medium text-xs uppercase tracking-widest">Mission Type</th>
                        <th className="text-left py-2 px-3 text-slate-400 font-medium text-xs uppercase tracking-widest">Recommended Band</th>
                        <th className="text-left py-2 px-3 text-slate-400 font-medium text-xs uppercase tracking-widest">Reason</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { mission: 'IoT / M2M', band: 'UHF', reason: 'Low power, simple antenna, sufficient for small data packets' },
                        { mission: 'CubeSat TT&C', band: 'S-band', reason: 'Standard TT&C allocation, reliable, well-supported' },
                        { mission: 'Earth Observation', band: 'X-band', reason: 'High throughput for imagery, dedicated EO allocations' },
                        { mission: 'Broadband Internet', band: 'Ka-band', reason: 'Maximum bandwidth for consumer/enterprise services' },
                        { mission: 'DTH Television', band: 'Ku-band', reason: 'Established broadcast infrastructure, good coverage' },
                        { mission: 'SAR Imagery', band: 'X-band', reason: 'High data rates for radar data, proven SAR heritage' },
                        { mission: 'LEO Constellation', band: 'Ka-band + S-band', reason: 'Ka for payload data, S for TT&C housekeeping' },
                        { mission: 'Deep Space', band: 'X-band / Ka-band', reason: 'Maximum gain, proven for interplanetary missions' },
                      ].map((row, idx) => (
                        <tr key={idx} className={`border-b border-space-800 ${idx % 2 === 0 ? 'bg-space-900/50' : ''}`}>
                          <td className="py-2 px-3 text-white">{row.mission}</td>
                          <td className="py-2 px-3 text-cyan-400 font-medium">{row.band}</td>
                          <td className="py-2 px-3 text-slate-400">{row.reason}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Guide Tab */}
          {activeTab === 'guide' && (
            <div>
              {/* Introduction */}
              <div className="card-elevated p-6 border border-space-700 mb-6">
                <h3 className="text-white font-semibold text-lg mb-2">Choosing a Ground Station Network</h3>
                <p className="text-slate-400 text-sm leading-relaxed">
                  Selecting the right ground station strategy is one of the most critical decisions for satellite
                  operators. The ground segment typically represents 10-30% of total mission cost and directly
                  impacts data timeliness, reliability, and operational flexibility. Consider these six key
                  decision factors when evaluating your ground station architecture.
                </p>
              </div>

              {/* Decision Factor Cards */}
              <StaggerContainer className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
                {DECISION_FACTORS.map((factor, idx) => (
                  <StaggerItem key={idx}>
                  <div className="card-elevated p-6 border border-space-700">
                    <div className="flex items-center gap-3 mb-3">
                      <span
                        className="text-2xl"
                        dangerouslySetInnerHTML={{ __html: factor.icon }}
                      />
                      <h4 className="text-white font-semibold text-lg">{factor.title}</h4>
                    </div>
                    <p className="text-slate-400 text-sm mb-4">{factor.description}</p>
                    <div className="space-y-2">
                      {factor.details.map((detail, i) => (
                        <div key={i} className="text-slate-300 text-sm flex items-start gap-2 bg-space-800/50 rounded-lg p-3">
                          <span className="text-cyan-400 font-bold text-xs mt-0.5 flex-shrink-0">
                            {String(i + 1).padStart(2, '0')}
                          </span>
                          <span>{detail}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  </StaggerItem>
                ))}
              </StaggerContainer>

              {/* Decision Matrix */}
              <div className="card-elevated p-6 border border-space-700 mb-6">
                <h3 className="text-white font-semibold mb-4">Quick Decision Matrix</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-space-700">
                        <th className="text-left py-2 px-3 text-slate-400 font-medium text-xs uppercase tracking-widest">Scenario</th>
                        <th className="text-left py-2 px-3 text-slate-400 font-medium text-xs uppercase tracking-widest">Recommended Approach</th>
                        <th className="text-left py-2 px-3 text-slate-400 font-medium text-xs uppercase tracking-widest">Top Providers</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { scenario: 'CubeSat / Demo Mission', approach: 'GaaS, pay-per-pass', providers: 'Leaf Space, AWS Ground Station' },
                        { scenario: 'LEO EO Constellation', approach: 'GaaS + polar stations', providers: 'KSAT, SSC, Azure Orbital' },
                        { scenario: 'IoT / M2M Satellite', approach: 'UHF GaaS network', providers: 'RBC Signals, Atlas Space' },
                        { scenario: 'GEO Communications', approach: 'Owned + managed backup', providers: 'SSC, Viasat RTE' },
                        { scenario: 'Government / Defense', approach: 'FedRAMP GaaS or dedicated', providers: 'Atlas Space, KSAT' },
                        { scenario: 'Multi-satellite Fleet', approach: 'Aggregator marketplace', providers: 'Infostellar, RBC Signals' },
                        { scenario: 'Cloud-first Operator', approach: 'Cloud-integrated GaaS', providers: 'AWS Ground Station, Azure Orbital' },
                        { scenario: 'ESA / European Institutional', approach: 'Government network', providers: 'DLR ATLAS, SSC, KSAT' },
                      ].map((row, idx) => (
                        <tr key={idx} className={`border-b border-space-800 ${idx % 2 === 0 ? 'bg-space-900/50' : ''}`}>
                          <td className="py-2 px-3 text-white">{row.scenario}</td>
                          <td className="py-2 px-3 text-slate-300">{row.approach}</td>
                          <td className="py-2 px-3 text-cyan-400">{row.providers}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Pro Tips */}
              <div className="card-elevated p-6 border border-cyan-500/20">
                <h3 className="text-cyan-400 font-semibold mb-4">Operator Best Practices</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-3">
                    <div className="flex items-start gap-2">
                      <span className="text-cyan-400 font-bold text-sm flex-shrink-0">01</span>
                      <p className="text-slate-300 text-sm">
                        <strong className="text-white">Start with GaaS, scale to owned.</strong> Use pay-per-pass services
                        during development and early operations. Transition to owned or hybrid infrastructure only when
                        contact volume justifies the capital expenditure.
                      </p>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-cyan-400 font-bold text-sm flex-shrink-0">02</span>
                      <p className="text-slate-300 text-sm">
                        <strong className="text-white">Always have multi-provider backup.</strong> No single ground station
                        provider offers 100% availability. Contract with at least two providers for mission-critical contacts.
                      </p>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-cyan-400 font-bold text-sm flex-shrink-0">03</span>
                      <p className="text-slate-300 text-sm">
                        <strong className="text-white">Test your RF chain early.</strong> Schedule test contacts with your
                        ground station provider before launch. Verify modulation schemes, data rates, and commanding
                        protocols in the loop.
                      </p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-start gap-2">
                      <span className="text-cyan-400 font-bold text-sm flex-shrink-0">04</span>
                      <p className="text-slate-300 text-sm">
                        <strong className="text-white">Plan for data pipeline, not just antenna.</strong> The antenna contact
                        is just the first step. Ensure your ground station provider integrates with your data processing,
                        storage, and distribution infrastructure.
                      </p>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-cyan-400 font-bold text-sm flex-shrink-0">05</span>
                      <p className="text-slate-300 text-sm">
                        <strong className="text-white">Consider geographic diversity.</strong> Stations in different weather
                        zones reduce simultaneous rain fade. Stations in different geopolitical regions reduce regulatory risk.
                      </p>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-cyan-400 font-bold text-sm flex-shrink-0">06</span>
                      <p className="text-slate-300 text-sm">
                        <strong className="text-white">Negotiate based on volume commitments.</strong> Most providers offer
                        significant discounts for annual commitments or guaranteed minimum contacts per month.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Related Modules */}
        <div className="card-elevated p-5 border border-space-700 mb-12">
          <h3 className="text-white font-semibold text-sm mb-3">Related Modules</h3>
          <div className="flex flex-wrap gap-3">
            <Link href="/satellites" className="btn-secondary text-sm">
              {String.fromCodePoint(0x1F6F0)} Satellite Tracker
            </Link>
            <Link href="/spectrum" className="btn-secondary text-sm">
              {String.fromCodePoint(0x1F4E1)} Spectrum Tracker
            </Link>
            <Link href="/orbital-services" className="btn-secondary text-sm">
              {String.fromCodePoint(0x1F310)} Orbital Services
            </Link>
            <Link href="/debris-monitor" className="btn-secondary text-sm">
              {String.fromCodePoint(0x26A0)} Debris Monitor
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
