'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  MiningBody,
  MiningResource,
  CommodityPrice,
  MiningBodyType,
  SpectralType,
  TrajectoryStatus,
  ValueConfidence,
  MINING_BODY_TYPES,
  SPECTRAL_TYPES,
  formatLargeValue,
  formatDistance,
  formatMass,
} from '@/types';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import AnimatedPageHeader from '@/components/ui/AnimatedPageHeader';
import ScrollReveal, { StaggerContainer, StaggerItem } from '@/components/ui/ScrollReveal';
import ExportButton from '@/components/ui/ExportButton';

// ────────────────────────────────────────
// Types
// ────────────────────────────────────────

interface MiningStats {
  totalBodies: number;
  totalResources: number;
  totalCommodities: number;
  accessibleBodies: number;
  totalEstimatedValue: number;
  bodiesByType: Record<string, number>;
  bodiesBySpectralType: Record<string, number>;
}

interface SpaceMiningData {
  bodies: MiningBody[];
  total: number;
}

interface MiningTarget {
  full_name: string;
  spec_B: string | null;
  spec_T: string | null;
  profit: number | null;
  price: number | null;
  closeness: number | null;
  accessibility: number | null;
  score: number | null;
  moid: number | null;
  a: number | null;
  e: number | null;
  i: number | null;
  diameter: number | null;
}

type TabId = 'overview' | 'asteroids' | 'moons' | 'planets' | 'commodities';

// ────────────────────────────────────────
// Constants
// ────────────────────────────────────────

const TRAJECTORY_STYLES: Record<TrajectoryStatus, { label: string; color: string; bg: string }> = {
  accessible: { label: 'Accessible', color: 'text-green-400', bg: 'bg-green-900/20' },
  challenging: { label: 'Challenging', color: 'text-yellow-400', bg: 'bg-yellow-900/20' },
  difficult: { label: 'Difficult', color: 'text-orange-400', bg: 'bg-orange-900/20' },
  not_feasible: { label: 'Not Feasible', color: 'text-red-400', bg: 'bg-red-900/20' },
};

const CONFIDENCE_STYLES: Record<ValueConfidence, { label: string; color: string }> = {
  high: { label: 'High Confidence', color: 'text-green-400' },
  medium: { label: 'Medium Confidence', color: 'text-yellow-400' },
  low: { label: 'Low Confidence', color: 'text-orange-400' },
  speculative: { label: 'Speculative', color: 'text-red-400' },
};

const SPECTRAL_TYPE_INFO: Record<string, { label: string; description: string; color: string }> = {
  C: { label: 'C-type (Carbonaceous)', description: 'Water-rich, organic compounds', color: 'text-blue-400' },
  S: { label: 'S-type (Silicaceous)', description: 'Stony, silicate minerals', color: 'text-yellow-400' },
  M: { label: 'M-type (Metallic)', description: 'Metal-rich, iron-nickel', color: 'text-gray-300' },
  V: { label: 'V-type (Vestoid)', description: 'Basaltic, pyroxene-rich', color: 'text-purple-400' },
  X: { label: 'X-type', description: 'Metallic or enstatite', color: 'text-gray-400' },
  D: { label: 'D-type', description: 'Dark, organic-rich', color: 'text-amber-600' },
  P: { label: 'P-type', description: 'Primitive, low albedo', color: 'text-amber-700' },
  E: { label: 'E-type (Enstatite)', description: 'Enstatite achondrite', color: 'text-cyan-400' },
  B: { label: 'B-type', description: 'Blue, volatile-rich', color: 'text-blue-300' },
  Q: { label: 'Q-type', description: 'Ordinary chondrite', color: 'text-orange-400' },
};

const BODY_EXPORT_COLUMNS = [
  { key: 'name', label: 'Name' },
  { key: 'designation', label: 'Designation' },
  { key: 'bodyType', label: 'Type' },
  { key: 'spectralType', label: 'Spectral Type' },
  { key: 'diameter', label: 'Diameter (km)' },
  { key: 'mass', label: 'Mass (kg)' },
  { key: 'deltaV', label: 'Delta-V (km/s)' },
  { key: 'trajectoryStatus', label: 'Accessibility' },
  { key: 'estimatedValue', label: 'Est. Value ($)' },
  { key: 'valueConfidence', label: 'Confidence' },
];

const COMMODITY_EXPORT_COLUMNS = [
  { key: 'name', label: 'Name' },
  { key: 'symbol', label: 'Symbol' },
  { key: 'category', label: 'Category' },
  { key: 'pricePerKg', label: 'Price ($/kg)' },
  { key: 'pricePerTonne', label: 'Price ($/tonne)' },
  { key: 'annualProduction', label: 'Annual Production (tonnes)' },
  { key: 'inSpaceValue', label: 'In-Space Value ($/kg)' },
];

// ────────────────────────────────────────
// Helper Functions
// ────────────────────────────────────────

function formatNumber(n: number | null | undefined): string {
  if (n === null || n === undefined) return '0';
  return n.toLocaleString();
}

function formatProfit(value: number | null | undefined): string {
  if (value == null) return '—';
  const abs = Math.abs(value);
  if (abs >= 1e12) return `$${(value / 1e12).toFixed(1)}T`;
  if (abs >= 1e9) return `$${(value / 1e9).toFixed(1)}B`;
  if (abs >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
  if (abs >= 1e3) return `$${(value / 1e3).toFixed(1)}K`;
  return `$${value.toFixed(0)}`;
}

function formatPricePerKgShort(value: number | null | undefined): string {
  if (value == null) return '—';
  if (value >= 1e6) return `$${(value / 1e6).toFixed(1)}M/kg`;
  if (value >= 1e3) return `$${(value / 1e3).toFixed(1)}K/kg`;
  return `$${value.toFixed(2)}/kg`;
}

function getBodyIcon(bodyType: MiningBodyType): string {
  const icon = MINING_BODY_TYPES.find(t => t.value === bodyType)?.icon;
  return icon || '🪨';
}

function getSpectralColor(spectralType: SpectralType | null | undefined): string {
  if (!spectralType) return 'text-slate-400';
  return SPECTRAL_TYPE_INFO[spectralType]?.color || 'text-slate-400';
}

function getDeltaVColor(deltaV: number | null | undefined): string {
  if (!deltaV) return 'text-slate-400';
  if (deltaV <= 5) return 'text-green-400';
  if (deltaV <= 8) return 'text-yellow-400';
  if (deltaV <= 12) return 'text-orange-400';
  return 'text-red-400';
}

function formatDeltaV(deltaV: number | null | undefined): string {
  if (!deltaV) return 'Unknown';
  return `${deltaV.toFixed(1)} km/s`;
}

function parseComposition(composition: string | Record<string, number> | null): Record<string, number> {
  if (!composition) return {};
  if (typeof composition === 'string') {
    try {
      return JSON.parse(composition);
    } catch {
      return {};
    }
  }
  return composition;
}

function parseMissionHistory(missionHistory: string | string[] | null): string[] {
  if (!missionHistory) return [];
  if (typeof missionHistory === 'string') {
    try {
      return JSON.parse(missionHistory);
    } catch {
      return [];
    }
  }
  return missionHistory;
}

// ────────────────────────────────────────
// Mining Body Card
// ────────────────────────────────────────

function MiningBodyCard({ body }: { body: MiningBody }) {
  const trajectory = body.trajectoryStatus ? TRAJECTORY_STYLES[body.trajectoryStatus] : null;
  const confidence = body.valueConfidence ? CONFIDENCE_STYLES[body.valueConfidence] : null;
  const composition = parseComposition(body.composition as Record<string, number> | string | null);
  const missionHistory = parseMissionHistory(body.missionHistory as string[] | string | null);
  const topResources = Object.entries(composition)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  return (
    <div className="card p-5 border border-slate-200 hover:border-nebula-500/50 transition-all">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <span className="text-3xl">{getBodyIcon(body.bodyType)}</span>
          <div>
            <h3 className="text-slate-900 font-semibold text-lg">{body.name}</h3>
            {body.designation && (
              <span className="text-slate-400 text-sm">{body.designation}</span>
            )}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          {trajectory && (
            <span className={`text-xs font-bold px-2.5 py-1 rounded ${trajectory.bg} ${trajectory.color}`}>
              {trajectory.label}
            </span>
          )}
          {body.spectralType && (
            <span className={`text-xs ${getSpectralColor(body.spectralType)}`}>
              {body.spectralType}-type
            </span>
          )}
        </div>
      </div>

      {/* Description */}
      {body.description && (
        <p className="text-slate-400 text-sm mb-4 leading-relaxed line-clamp-2">{body.description}</p>
      )}

      {/* Key Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <div className="bg-slate-50 rounded-lg p-2.5 text-center">
          <div className="text-slate-400 text-xs uppercase tracking-widest mb-1">Value</div>
          <div className="text-slate-900 font-bold text-sm">
            {body.estimatedValue ? formatLargeValue(body.estimatedValue) : 'Unknown'}
          </div>
          {confidence && (
            <div className={`text-xs ${confidence.color}`}>{confidence.label}</div>
          )}
        </div>
        <div className="bg-slate-50 rounded-lg p-2.5 text-center">
          <div className="text-slate-400 text-xs uppercase tracking-widest mb-1">Delta-V</div>
          <div className={`font-bold text-sm ${getDeltaVColor(body.deltaV)}`}>
            {formatDeltaV(body.deltaV)}
          </div>
        </div>
        <div className="bg-slate-50 rounded-lg p-2.5 text-center">
          <div className="text-slate-400 text-xs uppercase tracking-widest mb-1">Diameter</div>
          <div className="text-slate-900 font-bold text-sm">
            {body.diameter ? formatDistance(body.diameter) : 'Unknown'}
          </div>
        </div>
        <div className="bg-slate-50 rounded-lg p-2.5 text-center">
          <div className="text-slate-400 text-xs uppercase tracking-widest mb-1">Mass</div>
          <div className="text-slate-900 font-bold text-sm">
            {body.mass ? formatMass(body.mass) : 'Unknown'}
          </div>
        </div>
      </div>

      {/* Composition */}
      {topResources.length > 0 && (
        <div className="mb-4">
          <div className="text-slate-400 text-xs uppercase tracking-widest mb-2">Composition</div>
          <div className="flex flex-wrap gap-1.5">
            {topResources.map(([resource, percent]) => (
              <span
                key={resource}
                className="px-2 py-0.5 bg-nebula-500/10 text-nebula-600 rounded text-xs font-medium"
              >
                {resource}: {percent}%
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Orbital Info */}
      <div className="flex flex-wrap gap-3 text-xs text-slate-400 border-t border-slate-100 pt-3">
        {body.orbitalFamily && (
          <span className="flex items-center gap-1">
            <span className="text-slate-400">Family:</span> {body.orbitalFamily}
          </span>
        )}
        {body.semiMajorAxis && (
          <span className="flex items-center gap-1">
            <span className="text-slate-400">SMA:</span> {body.semiMajorAxis.toFixed(3)} AU
          </span>
        )}
        {body.orbitalPeriod && (
          <span className="flex items-center gap-1">
            <span className="text-slate-400">Period:</span> {body.orbitalPeriod.toFixed(2)} years
          </span>
        )}
      </div>

      {/* Mission History */}
      {missionHistory.length > 0 && (
        <div className="mt-3 pt-3 border-t border-slate-100">
          <div className="text-slate-400 text-xs uppercase tracking-widest mb-1">Missions</div>
          <div className="text-slate-400 text-xs">{missionHistory.join(', ')}</div>
        </div>
      )}
    </div>
  );
}

// ────────────────────────────────────────
// Commodity Card
// ────────────────────────────────────────

function CommodityCard({ commodity }: { commodity: CommodityPrice }) {
  const categoryLabels: Record<string, { label: string; color: string }> = {
    precious_metal: { label: 'Precious Metal', color: 'text-yellow-400' },
    industrial_metal: { label: 'Industrial Metal', color: 'text-gray-400' },
    rare_earth: { label: 'Rare Earth', color: 'text-purple-400' },
    volatile: { label: 'Volatile', color: 'text-blue-400' },
    mineral: { label: 'Mineral', color: 'text-amber-400' },
  };

  const categoryInfo = categoryLabels[commodity.category] || { label: commodity.category, color: 'text-slate-400' };
  let spaceApplications: string[] = [];
  try {
    spaceApplications = typeof commodity.spaceApplications === 'string'
      ? JSON.parse(commodity.spaceApplications)
      : commodity.spaceApplications || [];
  } catch { /* ignore malformed JSON */ }

  return (
    <div className="card p-4 border border-slate-200 hover:border-nebula-500/50 transition-all">
      <div className="flex items-start justify-between mb-2">
        <div>
          <h4 className="text-slate-900 font-semibold">{commodity.name}</h4>
          {commodity.symbol && (
            <span className="text-slate-400 text-sm">{commodity.symbol}</span>
          )}
        </div>
        <span className={`text-xs font-medium px-2 py-0.5 rounded ${categoryInfo.color} bg-slate-100`}>
          {categoryInfo.label}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="bg-slate-50 rounded p-2">
          <div className="text-slate-400 text-xs">Earth Price</div>
          <div className="text-slate-900 font-bold text-sm">
            ${commodity.pricePerKg != null
              ? (commodity.pricePerKg >= 1000
                  ? formatNumber(commodity.pricePerKg)
                  : commodity.pricePerKg.toFixed(2))
              : '0'}/kg
          </div>
        </div>
        {commodity.inSpaceValue && (
          <div className="bg-nebula-500/10 rounded p-2">
            <div className="text-nebula-600 text-xs">In-Space Value</div>
            <div className="text-nebula-700 font-bold text-sm">
              ${formatNumber(commodity.inSpaceValue)}/kg
            </div>
          </div>
        )}
      </div>

      {commodity.annualProduction && (
        <div className="text-slate-400 text-xs mb-2">
          Annual Production: {formatNumber(commodity.annualProduction)} tonnes
        </div>
      )}

      {spaceApplications.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {spaceApplications.slice(0, 3).map((app: string) => (
            <span key={app} className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded text-xs">
              {app}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// ────────────────────────────────────────
// Stats Card
// ────────────────────────────────────────

function StatsCard({ label, value, subValue, icon }: { label: string; value: string; subValue?: string; icon: string }) {
  return (
    <div className="card p-4 border border-slate-200">
      <div className="flex items-center gap-3">
        <span className="text-2xl">{icon}</span>
        <div>
          <div className="text-slate-400 text-xs uppercase tracking-widest">{label}</div>
          <div className="text-slate-900 font-bold text-xl">{value}</div>
          {subValue && <div className="text-slate-400 text-xs">{subValue}</div>}
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────
// Filter Bar
// ────────────────────────────────────────

function FilterBar({
  bodyType,
  setBodyType,
  spectralType,
  setSpectralType,
  trajectoryStatus,
  setTrajectoryStatus,
  sortBy,
  setSortBy,
}: {
  bodyType: MiningBodyType | '';
  setBodyType: (v: MiningBodyType | '') => void;
  spectralType: SpectralType | '';
  setSpectralType: (v: SpectralType | '') => void;
  trajectoryStatus: TrajectoryStatus | '';
  setTrajectoryStatus: (v: TrajectoryStatus | '') => void;
  sortBy: 'value' | 'deltaV' | 'diameter' | 'name';
  setSortBy: (v: 'value' | 'deltaV' | 'diameter' | 'name') => void;
}) {
  return (
    <div className="flex flex-wrap gap-3 mb-6">
      <select
        value={bodyType}
        onChange={(e) => setBodyType(e.target.value as MiningBodyType | '')}
        className="input-primary text-sm min-w-[140px]"
      >
        <option value="">All Body Types</option>
        {MINING_BODY_TYPES.map((t) => (
          <option key={t.value} value={t.value}>{t.icon} {t.label}</option>
        ))}
      </select>

      <select
        value={spectralType}
        onChange={(e) => setSpectralType(e.target.value as SpectralType | '')}
        className="input-primary text-sm min-w-[140px]"
      >
        <option value="">All Spectral Types</option>
        {SPECTRAL_TYPES.map((t) => (
          <option key={t.value} value={t.value}>{t.value}-type: {t.label}</option>
        ))}
      </select>

      <select
        value={trajectoryStatus}
        onChange={(e) => setTrajectoryStatus(e.target.value as TrajectoryStatus | '')}
        className="input-primary text-sm min-w-[140px]"
      >
        <option value="">All Accessibility</option>
        {Object.entries(TRAJECTORY_STYLES).map(([key, { label }]) => (
          <option key={key} value={key}>{label}</option>
        ))}
      </select>

      <select
        value={sortBy}
        onChange={(e) => setSortBy(e.target.value as 'value' | 'deltaV' | 'diameter' | 'name')}
        className="input-primary text-sm min-w-[140px]"
      >
        <option value="value">Sort by Value</option>
        <option value="deltaV">Sort by Delta-V</option>
        <option value="diameter">Sort by Size</option>
        <option value="name">Sort by Name</option>
      </select>
    </div>
  );
}

// ────────────────────────────────────────
// Main Content Component
// ────────────────────────────────────────

function SpaceMiningContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [stats, setStats] = useState<MiningStats | null>(null);
  const [bodies, setBodies] = useState<MiningBody[]>([]);
  const [commodities, setCommodities] = useState<CommodityPrice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Mining targets from DynamicContent system
  const [miningTargets, setMiningTargets] = useState<MiningTarget[]>([]);
  const [miningTargetsLoading, setMiningTargetsLoading] = useState(true);

  // Filters
  const [bodyType, setBodyType] = useState<MiningBodyType | ''>('');
  const [spectralType, setSpectralType] = useState<SpectralType | ''>('');
  const [trajectoryStatus, setTrajectoryStatus] = useState<TrajectoryStatus | ''>('');
  const [sortBy, setSortBy] = useState<'value' | 'deltaV' | 'diameter' | 'name'>('value');

  // Load tab from URL
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && ['overview', 'asteroids', 'moons', 'planets', 'commodities'].includes(tab)) {
      setActiveTab(tab as TabId);
    }
  }, [searchParams]);

  // Update URL when tab changes
  const handleTabChange = (tab: TabId) => {
    setActiveTab(tab);
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', tab);
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  // Fetch stats
  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch('/api/space-mining/stats');
        if (!res.ok) throw new Error('Failed to fetch stats');
        const data = await res.json();
        setStats(data);
      } catch (err) {
        console.error('Failed to fetch stats:', err);
      }
    }
    fetchStats();
  }, []);

  // Fetch bodies
  useEffect(() => {
    async function fetchBodies() {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (bodyType) params.set('bodyType', bodyType);
        if (spectralType) params.set('spectralType', spectralType);
        if (trajectoryStatus) params.set('trajectoryStatus', trajectoryStatus);
        params.set('sortBy', sortBy);
        params.set('limit', '100');

        const res = await fetch(`/api/space-mining?${params.toString()}`);
        if (!res.ok) throw new Error('Failed to fetch mining bodies');
        const data = await res.json();
        setBodies(data.bodies || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }
    fetchBodies();
  }, [bodyType, spectralType, trajectoryStatus, sortBy]);

  // Fetch commodities
  useEffect(() => {
    async function fetchCommodities() {
      try {
        const res = await fetch('/api/space-mining/commodities');
        if (!res.ok) throw new Error('Failed to fetch commodities');
        const data = await res.json();
        setCommodities(data.commodities || []);
      } catch (err) {
        console.error('Failed to fetch commodities:', err);
      }
    }
    fetchCommodities();
  }, []);

  // Fetch mining targets from DynamicContent system
  useEffect(() => {
    async function fetchMiningTargets() {
      try {
        const res = await fetch('/api/content/space-mining?section=mining-targets');
        if (!res.ok) throw new Error('Failed to fetch mining targets');
        const json = await res.json();
        const targets: MiningTarget[] = json.data || [];
        // Sort by score descending, then by profit descending
        targets.sort((a, b) => {
          const scoreA = a.score ?? 0;
          const scoreB = b.score ?? 0;
          if (scoreB !== scoreA) return scoreB - scoreA;
          return (b.profit ?? 0) - (a.profit ?? 0);
        });
        setMiningTargets(targets);
      } catch (err) {
        console.error('Failed to fetch mining targets:', err);
      } finally {
        setMiningTargetsLoading(false);
      }
    }
    fetchMiningTargets();
  }, []);

  // Filter bodies by tab
  const filteredBodies = bodies.filter((body) => {
    if (activeTab === 'asteroids') return body.bodyType === 'asteroid';
    if (activeTab === 'moons') return body.bodyType === 'moon';
    if (activeTab === 'planets') return body.bodyType === 'planet' || body.bodyType === 'dwarf_planet';
    return true;
  });

  const tabs: { id: TabId; label: string; icon: string }[] = [
    { id: 'overview', label: 'Overview', icon: '🎯' },
    { id: 'asteroids', label: 'Asteroids', icon: '☄️' },
    { id: 'moons', label: 'Moons', icon: '🌙' },
    { id: 'planets', label: 'Planets', icon: '🪐' },
    { id: 'commodities', label: 'Commodities', icon: '💰' },
  ];

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatsCard
            icon="🪨"
            label="Total Bodies"
            value={formatNumber(stats.totalBodies)}
            subValue={`${stats.accessibleBodies} accessible`}
          />
          <StatsCard
            icon="💎"
            label="Total Value"
            value={formatLargeValue(stats.totalEstimatedValue)}
            subValue="Combined estimate"
          />
          <StatsCard
            icon="☄️"
            label="Asteroids"
            value={formatNumber(stats.bodiesByType?.asteroid || 0)}
            subValue="Catalogued"
          />
          <StatsCard
            icon="🌙"
            label="Moons & Planets"
            value={formatNumber((stats.bodiesByType?.moon || 0) + (stats.bodiesByType?.planet || 0) + (stats.bodiesByType?.dwarf_planet || 0))}
            subValue="Major bodies"
          />
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-slate-500/30">
        <div className="flex gap-1 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-nebula-500 text-nebula-300 drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]'
                  : 'border-transparent text-slate-200 hover:text-white hover:border-slate-400 drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]'
              }`}
            >
              <span className="mr-1.5">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {activeTab !== 'commodities' && (
        <FilterBar
          bodyType={bodyType}
          setBodyType={setBodyType}
          spectralType={spectralType}
          setSpectralType={setSpectralType}
          trajectoryStatus={trajectoryStatus}
          setTrajectoryStatus={setTrajectoryStatus}
          sortBy={sortBy}
          setSortBy={setSortBy}
        />
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner />
        </div>
      ) : error ? (
        <div className="text-red-500 text-center py-12">
          <p>{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 btn-secondary"
          >
            Retry
          </button>
        </div>
      ) : activeTab === 'commodities' ? (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
              Commodity Prices ({commodities.length})
            </h2>
            <ExportButton
              data={commodities}
              columns={COMMODITY_EXPORT_COLUMNS}
              filename="space-mining-commodities"
            />
          </div>
          <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {commodities.map((commodity) => (
              <StaggerItem key={commodity.id}>
                <CommodityCard commodity={commodity} />
              </StaggerItem>
            ))}
          </StaggerContainer>
        </div>
      ) : (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
              {activeTab === 'overview' ? 'All Mining Targets' : activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} ({filteredBodies.length})
            </h2>
            <ExportButton
              data={filteredBodies}
              columns={BODY_EXPORT_COLUMNS}
              filename={`space-mining-${activeTab}`}
            />
          </div>

          {filteredBodies.length === 0 ? (
            <div className="text-center py-12 text-slate-200 drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]">
              <p className="text-4xl mb-4">🪨</p>
              <p>No mining bodies found matching your filters.</p>
              <p className="text-sm mt-2">Try adjusting your filter criteria.</p>
            </div>
          ) : (
            <StaggerContainer className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {filteredBodies.map((body) => (
                <StaggerItem key={body.id}>
                  <MiningBodyCard body={body} />
                </StaggerItem>
              ))}
            </StaggerContainer>
          )}
        </div>
      )}

      {/* Spectral Type Legend */}
      {activeTab !== 'commodities' && (
        <div className="card p-4 border border-slate-200">
          <h3 className="text-sm font-semibold text-slate-900 mb-3">Spectral Type Guide</h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {Object.entries(SPECTRAL_TYPE_INFO).slice(0, 5).map(([type, info]) => (
              <div key={type} className="flex items-start gap-2">
                <span className={`font-bold ${info.color}`}>{type}</span>
                <div>
                  <div className="text-slate-700 text-xs font-medium">{info.label.split('(')[1]?.replace(')', '') || info.label}</div>
                  <div className="text-slate-400 text-xs">{info.description}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top Mining Targets (DynamicContent) */}
      <ScrollReveal>
        <div className="card p-6 border border-slate-200 bg-gradient-to-br from-amber-50/50 to-slate-50">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
              <span className="text-2xl">💎</span> Top Mining Targets
              <span className="text-xs font-normal text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full ml-2">Trillion-Dollar Opportunities</span>
            </h3>
            {miningTargets.length > 0 && (
              <ExportButton
                data={miningTargets}
                columns={[
                  { key: 'full_name', label: 'Asteroid' },
                  { key: 'spec_B', label: 'Spectral (SMASS)' },
                  { key: 'spec_T', label: 'Spectral (Tholen)' },
                  { key: 'profit', label: 'Est. Profit ($)' },
                  { key: 'price', label: 'Price ($/kg)' },
                  { key: 'score', label: 'Mining Score' },
                  { key: 'accessibility', label: 'Accessibility' },
                  { key: 'diameter', label: 'Diameter (km)' },
                  { key: 'moid', label: 'MOID (AU)' },
                ]}
                filename="top-mining-targets"
              />
            )}
          </div>

          {miningTargetsLoading ? (
            <div className="flex items-center justify-center py-8">
              <LoadingSpinner />
            </div>
          ) : miningTargets.length === 0 ? (
            <p className="text-slate-400 text-center py-8">No mining target data available yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-2 border-amber-200">
                    <th className="text-left py-2.5 px-3 text-slate-500 text-xs uppercase tracking-widest font-semibold">#</th>
                    <th className="text-left py-2.5 px-3 text-slate-500 text-xs uppercase tracking-widest font-semibold">Asteroid</th>
                    <th className="text-left py-2.5 px-3 text-slate-500 text-xs uppercase tracking-widest font-semibold">Spectral</th>
                    <th className="text-right py-2.5 px-3 text-slate-500 text-xs uppercase tracking-widest font-semibold">Est. Profit</th>
                    <th className="text-right py-2.5 px-3 text-slate-500 text-xs uppercase tracking-widest font-semibold">Price/kg</th>
                    <th className="text-right py-2.5 px-3 text-slate-500 text-xs uppercase tracking-widest font-semibold">Diameter</th>
                    <th className="text-right py-2.5 px-3 text-slate-500 text-xs uppercase tracking-widest font-semibold">Accessibility</th>
                    <th className="text-right py-2.5 px-3 text-slate-500 text-xs uppercase tracking-widest font-semibold">MOID (AU)</th>
                  </tr>
                </thead>
                <tbody>
                  {miningTargets.map((target, idx) => {
                    const isTop3 = idx < 3;
                    return (
                      <tr
                        key={target.full_name}
                        className={`border-b border-slate-100 hover:bg-amber-50/50 transition-colors ${
                          isTop3 ? 'bg-amber-50/30' : ''
                        }`}
                      >
                        <td className="py-2.5 px-3">
                          {isTop3 ? (
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-400 text-white text-xs font-bold">
                              {idx + 1}
                            </span>
                          ) : (
                            <span className="text-slate-400 text-xs">{idx + 1}</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className={`font-semibold ${isTop3 ? 'text-slate-900' : 'text-slate-700'}`}>
                            {target.full_name}
                          </span>
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="flex gap-1">
                            {target.spec_T && (
                              <span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded text-xs">{target.spec_T}</span>
                            )}
                            {target.spec_B && (
                              <span className="px-1.5 py-0.5 bg-nebula-500/10 text-nebula-600 rounded text-xs">{target.spec_B}</span>
                            )}
                            {!target.spec_T && !target.spec_B && (
                              <span className="text-slate-400 text-xs">—</span>
                            )}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <span className={`font-bold ${
                            (target.profit ?? 0) >= 1e12 ? 'text-green-600' :
                            (target.profit ?? 0) >= 1e9 ? 'text-emerald-600' :
                            'text-slate-700'
                          }`}>
                            {formatProfit(target.profit)}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right text-slate-600">
                          {formatPricePerKgShort(target.price)}
                        </td>
                        <td className="py-2.5 px-3 text-right text-slate-600">
                          {target.diameter != null ? `${target.diameter.toFixed(target.diameter < 1 ? 3 : 1)} km` : '—'}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          {target.accessibility != null ? (
                            <span className={`font-medium ${
                              target.accessibility >= 1.5 ? 'text-green-600' :
                              target.accessibility >= 1.0 ? 'text-yellow-600' :
                              'text-orange-600'
                            }`}>
                              {target.accessibility.toFixed(2)}
                            </span>
                          ) : '—'}
                        </td>
                        <td className="py-2.5 px-3 text-right text-slate-600">
                          {target.moid != null ? target.moid.toFixed(4) : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </ScrollReveal>

      {/* Cross-links */}
      <ScrollReveal>
      <div className="card p-4 border border-slate-200">
        <h3 className="text-sm font-semibold text-slate-900 mb-3">Related Modules</h3>
        <div className="flex flex-wrap gap-3">
          <Link href="/solar-exploration" className="btn-secondary text-sm">
            🌍 Solar Exploration
          </Link>
          <Link href="/resource-exchange" className="btn-secondary text-sm">
            💰 Resource Exchange
          </Link>
          <Link href="/launch-windows" className="btn-secondary text-sm">
            🪟 Launch Windows
          </Link>
          <Link href="/debris-monitor" className="btn-secondary text-sm">
            ⚠️ Debris Monitor
          </Link>
        </div>
      </div>
      </ScrollReveal>
    </div>
  );
}

// ────────────────────────────────────────
// Main Page Component
// ────────────────────────────────────────

export default function SpaceMiningPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AnimatedPageHeader
          title="Space Mining Intelligence"
          subtitle="Comprehensive database of asteroids, moons, and planetary bodies with resource valuations, accessibility metrics, and mining feasibility analysis"
          icon="⛏️"
          accentColor="amber"
        />

        <Suspense fallback={
          <div className="flex items-center justify-center py-12">
            <LoadingSpinner />
          </div>
        }>
          <SpaceMiningContent />
        </Suspense>
      </div>
    </div>
  );
}
