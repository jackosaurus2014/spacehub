'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  OrbitalSlot,
  SatelliteOperator,
  OrbitalEvent,
  OrbitType,
  CongestionLevel,
  OrbitalEventType,
  SatellitePurpose,
  ORBIT_TYPES,
  CONGESTION_LEVEL_INFO,
  SATELLITE_PURPOSE_INFO,
  COUNTRY_INFO,
} from '@/types';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import PageHeader from '@/components/ui/PageHeader';
import ExportButton from '@/components/ui/ExportButton';

// ────────────────────────────────────────
// Types
// ────────────────────────────────────────

interface OrbitalData {
  slots: OrbitalSlot[];
  operators: SatelliteOperator[];
  events: OrbitalEvent[];
  stats: {
    totalActive: number;
    totalInactive: number;
    totalDebris: number;
    totalObjects: number;
    projected1Year: number;
    projected5Year: number;
    growth1Year: number;
    growth5Year: number;
    topOperators: { name: string; count: number; constellation: string | null }[];
    upcomingLaunches: number;
  };
}

type TabId = 'overview' | 'operators' | 'events';

// ────────────────────────────────────────
// Constants
// ────────────────────────────────────────

const CONGESTION_STYLES: Record<CongestionLevel, { bg: string; text: string; border: string; barColor: string }> = {
  low: { bg: 'bg-green-900/20', text: 'text-green-400', border: 'border-green-500/30', barColor: 'from-green-500 to-green-400' },
  moderate: { bg: 'bg-yellow-900/20', text: 'text-yellow-400', border: 'border-yellow-500/30', barColor: 'from-yellow-500 to-yellow-400' },
  high: { bg: 'bg-orange-900/20', text: 'text-orange-400', border: 'border-orange-500/30', barColor: 'from-orange-500 to-orange-400' },
  critical: { bg: 'bg-red-900/20', text: 'text-red-400', border: 'border-red-500/30', barColor: 'from-red-500 to-red-400' },
};

const AVAILABILITY_LABELS: Record<string, { label: string; color: string }> = {
  available: { label: 'Available', color: 'text-green-400' },
  limited: { label: 'Limited', color: 'text-yellow-400' },
  scarce: { label: 'Scarce', color: 'text-orange-400' },
  full: { label: 'Full', color: 'text-red-400' },
};

const EVENT_TYPE_STYLES: Record<OrbitalEventType, { label: string; icon: string; color: string; bg: string }> = {
  launch: { label: 'Launch', icon: '\u{1F680}', color: 'text-green-400', bg: 'bg-green-900/20' },
  reentry: { label: 'Re-entry', icon: '\u{2604}\u{FE0F}', color: 'text-orange-400', bg: 'bg-orange-900/20' },
  conjunction: { label: 'Conjunction', icon: '\u{26A0}\u{FE0F}', color: 'text-red-400', bg: 'bg-red-900/20' },
  debris_event: { label: 'Debris Event', icon: '\u{1F4A5}', color: 'text-yellow-400', bg: 'bg-yellow-900/20' },
  maneuver: { label: 'Maneuver', icon: '\u{1F504}', color: 'text-blue-400', bg: 'bg-blue-900/20' },
};

const CONFIDENCE_STYLES: Record<string, { label: string; color: string }> = {
  confirmed: { label: 'Confirmed', color: 'text-green-400' },
  tentative: { label: 'Tentative', color: 'text-yellow-400' },
  estimated: { label: 'Estimated', color: 'text-orange-400' },
};

const COUNTRY_FLAGS: Record<string, string> = {
  USA: '\u{1F1FA}\u{1F1F8}',
  UK: '\u{1F1EC}\u{1F1E7}',
  China: '\u{1F1E8}\u{1F1F3}',
  France: '\u{1F1EB}\u{1F1F7}',
  Luxembourg: '\u{1F1F1}\u{1F1FA}',
  Germany: '\u{1F1E9}\u{1F1EA}',
  Japan: '\u{1F1EF}\u{1F1F5}',
  India: '\u{1F1EE}\u{1F1F3}',
  Russia: '\u{1F1F7}\u{1F1FA}',
  Canada: '\u{1F1E8}\u{1F1E6}',
};

// ── Export column definitions ──

const OPERATOR_EXPORT_COLUMNS = [
  { key: 'name', label: 'Name' },
  { key: 'country', label: 'Country' },
  { key: 'constellationName', label: 'Constellation' },
  { key: 'primaryPurpose', label: 'Orbit Type' },
  { key: 'totalActive', label: 'Total Active' },
  { key: 'leoCount', label: 'LEO Count' },
  { key: 'meoCount', label: 'MEO Count' },
  { key: 'geoCount', label: 'GEO Count' },
  { key: 'planned1Year', label: 'Planned 1 Year' },
  { key: 'planned5Year', label: 'Planned 5 Year' },
];

const EVENT_EXPORT_COLUMNS = [
  { key: 'missionName', label: 'Name' },
  { key: 'eventType', label: 'Type' },
  { key: 'orbitType', label: 'Orbit Type' },
  { key: 'expectedDate', label: 'Date' },
  { key: 'operatorName', label: 'Operator' },
  { key: 'satelliteCount', label: 'Satellites' },
  { key: 'dateConfidence', label: 'Confidence' },
  { key: 'description', label: 'Description' },
];

// ────────────────────────────────────────
// Helper Functions
// ────────────────────────────────────────

function formatNumber(n: number): string {
  return n.toLocaleString();
}

function getOperatorOrbitBreakdown(op: SatelliteOperator): { type: string; count: number }[] {
  const orbits: { type: string; count: number }[] = [];
  if (op.leoCount > 0) orbits.push({ type: 'LEO', count: op.leoCount });
  if (op.meoCount > 0) orbits.push({ type: 'MEO', count: op.meoCount });
  if (op.geoCount > 0) orbits.push({ type: 'GEO', count: op.geoCount });
  if (op.otherCount > 0) orbits.push({ type: 'Other', count: op.otherCount });
  return orbits;
}

function getGrowthPercent(current: number, planned: number): number {
  if (current === 0) return planned > 0 ? 100 : 0;
  return (planned / current) * 100;
}

function daysUntil(date: Date | string): number {
  const target = new Date(date);
  const now = new Date();
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

// ────────────────────────────────────────
// Orbit Type Card (Overview Tab)
// ────────────────────────────────────────

function OrbitTypeCard({ slot }: { slot: OrbitalSlot }) {
  const orbitInfo = ORBIT_TYPES.find(o => o.value === slot.orbitType);
  const congestion = slot.congestionLevel ? CONGESTION_STYLES[slot.congestionLevel] : null;
  const congestionInfo = slot.congestionLevel ? CONGESTION_LEVEL_INFO[slot.congestionLevel] : null;
  const availability = slot.slotAvailability ? AVAILABILITY_LABELS[slot.slotAvailability] : null;
  const totalSatellites = slot.activeSatellites + slot.inactiveSatellites;
  const utilization = totalSatellites > 0 ? (slot.activeSatellites / totalSatellites) * 100 : 0;
  const totalObjects = totalSatellites + slot.debrisCount;

  return (
    <div className={`card p-5 border ${congestion?.border || 'border-white/[0.06]'}`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="text-3xl">{orbitInfo?.icon || '\u{1F6F0}\u{FE0F}'}</span>
          <div>
            <h3 className="text-white font-semibold text-lg">{slot.orbitName}</h3>
            <span className="text-star-400 text-sm">{orbitInfo?.altitude || 'N/A'}</span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          {congestionInfo && (
            <span className={`text-xs font-bold px-2.5 py-1 rounded ${congestion?.bg} ${congestion?.text} border ${congestion?.border}`}>
              {congestionInfo.label} Congestion
            </span>
          )}
          {availability && (
            <span className={`text-xs ${availability.color}`}>
              Slots: {availability.label}
            </span>
          )}
        </div>
      </div>

      {/* Description */}
      {slot.description && (
        <p className="text-star-400 text-sm mb-4 leading-relaxed">{slot.description}</p>
      )}

      {/* Utilization Bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-star-300 text-xs font-medium uppercase tracking-widest">Active Utilization</span>
          <span className="text-white text-sm font-bold">{utilization.toFixed(1)}%</span>
        </div>
        <div className="h-3 bg-space-600 rounded-full overflow-hidden">
          <div
            className={`h-full bg-gradient-to-r ${congestion?.barColor || 'from-nebula-500 to-nebula-400'} rounded-full transition-all`}
            style={{ width: `${Math.min(utilization, 100)}%` }}
          />
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-space-700/50 rounded-lg p-3 text-center">
          <div className="text-white font-bold text-lg">{formatNumber(slot.activeSatellites)}</div>
          <div className="text-star-400 text-xs">Active</div>
        </div>
        <div className="bg-space-700/50 rounded-lg p-3 text-center">
          <div className="text-yellow-400 font-bold text-lg">{formatNumber(slot.inactiveSatellites)}</div>
          <div className="text-star-400 text-xs">Inactive</div>
        </div>
        <div className="bg-space-700/50 rounded-lg p-3 text-center">
          <div className="text-red-400 font-bold text-lg">{formatNumber(slot.debrisCount)}</div>
          <div className="text-star-400 text-xs">Debris</div>
        </div>
      </div>

      {/* Projections */}
      <div className="flex items-center gap-4 pt-3 border-t border-white/[0.06] text-sm">
        <div className="flex-1">
          <span className="text-star-400 text-xs">1-Year Forecast</span>
          <div className="flex items-center gap-1.5">
            <span className="text-green-400 font-semibold">{formatNumber(slot.projected1Year)}</span>
            <span className="text-green-400/60 text-xs">
              (+{formatNumber(slot.projected1Year - slot.activeSatellites)})
            </span>
          </div>
        </div>
        <div className="w-px h-8 bg-white/[0.06]" />
        <div className="flex-1">
          <span className="text-star-400 text-xs">5-Year Forecast</span>
          <div className="flex items-center gap-1.5">
            <span className="text-blue-400 font-semibold">{formatNumber(slot.projected5Year)}</span>
            <span className="text-blue-400/60 text-xs">
              (+{formatNumber(slot.projected5Year - slot.activeSatellites)})
            </span>
          </div>
        </div>
        <div className="w-px h-8 bg-white/[0.06]" />
        <div className="flex-1">
          <span className="text-star-400 text-xs">Total Objects</span>
          <div className="text-white font-semibold">{formatNumber(totalObjects)}</div>
        </div>
      </div>

      {/* Cross-module link */}
      <div className="mt-3 pt-3 border-t border-white/[0.06]">
        <Link
          href="/debris-monitor?tab=overview"
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[10px] font-medium bg-nebula-500/20 text-nebula-300 hover:bg-nebula-500/30 transition-colors border border-nebula-500/30"
        >
          View debris in this orbit &rarr;
        </Link>
      </div>
    </div>
  );
}

// ────────────────────────────────────────
// Operator Card (Operators Tab)
// ────────────────────────────────────────

function OperatorCard({ operator, rank }: { operator: SatelliteOperator; rank: number }) {
  const purposeInfo = operator.primaryPurpose ? SATELLITE_PURPOSE_INFO[operator.primaryPurpose] : null;
  const orbitBreakdown = getOperatorOrbitBreakdown(operator);
  const flag = COUNTRY_FLAGS[operator.country] || '\u{1F30D}';
  const growth1Y = getGrowthPercent(operator.totalActive, operator.planned1Year);

  return (
    <div className="card p-5">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-space-700/50 flex items-center justify-center text-2xl border border-white/[0.06]">
            {flag}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-white font-semibold">{operator.name}</h3>
              <span className="text-star-500 text-xs">#{rank}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-star-400">{operator.country}</span>
              {operator.constellationName && (
                <>
                  <span className="text-star-500">|</span>
                  <span className="text-nebula-300 text-xs">{operator.constellationName}</span>
                </>
              )}
            </div>
          </div>
        </div>
        {purposeInfo && (
          <span className="text-xs px-2.5 py-1 rounded bg-space-700/50 text-star-300 border border-white/[0.06] flex items-center gap-1">
            <span>{purposeInfo.icon}</span>
            {purposeInfo.label}
          </span>
        )}
      </div>

      {/* Fleet Size */}
      <div className="bg-space-700/50 rounded-lg p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-star-300 text-xs font-medium uppercase tracking-widest">Active Fleet</span>
          <span className="text-white text-2xl font-bold font-display">{formatNumber(operator.totalActive)}</span>
        </div>

        {/* Orbit Breakdown */}
        {orbitBreakdown.length > 0 && (
          <div className="space-y-2">
            {orbitBreakdown.map((orbit) => {
              const pct = operator.totalActive > 0 ? (orbit.count / operator.totalActive) * 100 : 0;
              return (
                <div key={orbit.type}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-star-400 text-xs">{orbit.type}</span>
                    <span className="text-star-300 text-xs">{formatNumber(orbit.count)} ({pct.toFixed(1)}%)</span>
                  </div>
                  <div className="h-2 bg-space-600 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-nebula-500 to-nebula-400 rounded-full transition-all"
                      style={{ width: `${Math.min(pct, 100)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Growth Projections */}
      <div className="flex items-center gap-4 pt-3 border-t border-white/[0.06] text-sm">
        <div className="flex-1">
          <span className="text-star-400 text-xs">1-Year Planned</span>
          <div className="flex items-center gap-1.5">
            <span className="text-green-400 font-semibold">+{formatNumber(operator.planned1Year)}</span>
            {operator.totalActive > 0 && (
              <span className="text-green-400/60 text-xs">
                ({growth1Y.toFixed(0)}%)
              </span>
            )}
          </div>
        </div>
        <div className="w-px h-8 bg-white/[0.06]" />
        <div className="flex-1">
          <span className="text-star-400 text-xs">5-Year Planned</span>
          <div className="text-blue-400 font-semibold">+{formatNumber(operator.planned5Year)}</div>
        </div>
      </div>

      {/* Cross-module links */}
      <div className="mt-3 pt-3 border-t border-white/[0.06] flex flex-wrap gap-2">
        <Link
          href="/debris-monitor?tab=objects"
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[10px] font-medium bg-nebula-500/20 text-nebula-300 hover:bg-nebula-500/30 transition-colors border border-nebula-500/30"
        >
          View Debris &rarr;
        </Link>
        <Link
          href={`/market-intel?search=${encodeURIComponent(operator.name)}`}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[10px] font-medium bg-green-500/20 text-green-300 hover:bg-green-500/30 transition-colors border border-green-500/30"
        >
          Company Intel &rarr;
        </Link>
        {operator.primaryPurpose === 'internet' && (
          <Link
            href="/spectrum"
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[10px] font-medium bg-rocket-500/20 text-rocket-300 hover:bg-rocket-500/30 transition-colors border border-rocket-500/30"
          >
            Spectrum Filings &rarr;
          </Link>
        )}
      </div>
    </div>
  );
}

// ────────────────────────────────────────
// Event Card (Events Tab)
// ────────────────────────────────────────

function EventCard({ event }: { event: OrbitalEvent }) {
  const eventStyle = EVENT_TYPE_STYLES[event.eventType] || EVENT_TYPE_STYLES.launch;
  const confidence = event.dateConfidence ? CONFIDENCE_STYLES[event.dateConfidence] : null;
  const eventDate = new Date(event.expectedDate);
  const days = daysUntil(event.expectedDate);
  const isPast = days < 0;
  const isConjunction = event.eventType === 'conjunction';

  return (
    <div className={`card p-5 border ${isPast ? 'border-white/[0.06] opacity-60' : 'border-white/[0.06]'}`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg ${eventStyle.bg} flex items-center justify-center text-xl border border-white/[0.06]`}>
            {eventStyle.icon}
          </div>
          <div>
            <h4 className="text-white font-semibold">{event.missionName || 'Unknown Mission'}</h4>
            <div className="flex items-center gap-2 text-sm">
              <span className={`${eventStyle.color} text-xs font-medium`}>{eventStyle.label}</span>
              <span className="text-star-500">|</span>
              <span className="text-star-400 text-xs">{event.orbitType}</span>
            </div>
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <div className="text-white font-medium text-sm">
            {eventDate.toLocaleDateString('en-US', {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
            })}
          </div>
          <div className={`text-xs ${isPast ? 'text-star-500' : days <= 3 ? 'text-green-400' : 'text-star-400'}`}>
            {isPast ? 'Completed' : days === 0 ? 'Today' : days === 1 ? 'Tomorrow' : `In ${days} days`}
          </div>
        </div>
      </div>

      {/* Details */}
      <div className="flex flex-wrap items-center gap-3 mb-3">
        {event.operatorName && (
          <div className="bg-space-700/50 rounded px-3 py-1.5 text-sm">
            <span className="text-star-400 text-xs block">Operator</span>
            <span className="text-white font-medium">{event.operatorName}</span>
          </div>
        )}
        <div className="bg-space-700/50 rounded px-3 py-1.5 text-sm">
          <span className="text-star-400 text-xs block">Satellites</span>
          <span className="text-white font-medium">{event.satelliteCount}</span>
        </div>
        {confidence && (
          <div className="bg-space-700/50 rounded px-3 py-1.5 text-sm">
            <span className="text-star-400 text-xs block">Confidence</span>
            <span className={`font-medium ${confidence.color}`}>{confidence.label}</span>
          </div>
        )}
      </div>

      {/* Description */}
      {event.description && (
        <p className="text-star-400 text-xs leading-relaxed">{event.description}</p>
      )}

      {/* Cross-module link for conjunction events */}
      {isConjunction && (
        <div className="mt-3 pt-3 border-t border-white/[0.06]">
          <Link
            href="/debris-monitor?tab=conjunctions"
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[10px] font-medium bg-nebula-500/20 text-nebula-300 hover:bg-nebula-500/30 transition-colors border border-nebula-500/30"
          >
            View in Debris Monitor &rarr;
          </Link>
        </div>
      )}
    </div>
  );
}

// ────────────────────────────────────────
// Inner Content (needs useSearchParams)
// ────────────────────────────────────────

function OrbitalSlotsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // Read initial values from URL
  const initialTab = (searchParams.get('tab') as TabId) || 'overview';
  const initialOrbit = (searchParams.get('orbit') as OrbitType | '') || '';

  const [data, setData] = useState<OrbitalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [initializing, setInitializing] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>(initialTab);
  const [orbitFilter, setOrbitFilter] = useState<OrbitType | ''>(initialOrbit);

  // Sync state changes to URL
  const updateUrl = (updates: Record<string, string>) => {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (!value || (key === 'tab' && value === 'overview')) {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    }
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  const handleTabChange = (tab: TabId) => {
    setActiveTab(tab);
    updateUrl({ tab, orbit: '' });
    setOrbitFilter('');
  };

  const handleOrbitFilterChange = (orbit: OrbitType | '') => {
    setOrbitFilter(orbit);
    updateUrl({ orbit });
  };

  const fetchData = async () => {
    try {
      const res = await fetch('/api/orbital-slots');
      const result = await res.json();

      if (!result.error) {
        setData(result);
      }
    } catch (error) {
      console.error('Failed to fetch orbital data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInitialize = async () => {
    setInitializing(true);
    try {
      await fetch('/api/orbital-slots/init', { method: 'POST' });
      setLoading(true);
      await fetchData();
    } catch (error) {
      console.error('Failed to initialize orbital data:', error);
    } finally {
      setInitializing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const slots = data?.slots || [];
  const operators = data?.operators || [];
  const events = data?.events || [];
  const stats = data?.stats;
  const needsInit = !loading && !stats && slots.length === 0 && operators.length === 0;

  // Filtered operators by orbit type
  const filteredOperators = orbitFilter
    ? operators.filter((op) => {
        if (orbitFilter === 'LEO') return op.leoCount > 0;
        if (orbitFilter === 'MEO') return op.meoCount > 0;
        if (orbitFilter === 'GEO') return op.geoCount > 0;
        return op.otherCount > 0;
      })
    : operators;

  // Find most congested orbit
  const mostCongestedSlot = slots.reduce<OrbitalSlot | null>((worst, slot) => {
    if (!worst) return slot;
    const order: Record<string, number> = { critical: 3, high: 2, moderate: 1, low: 0 };
    const worstLevel = worst.congestionLevel ? order[worst.congestionLevel] ?? -1 : -1;
    const currentLevel = slot.congestionLevel ? order[slot.congestionLevel] ?? -1 : -1;
    return currentLevel > worstLevel ? slot : worst;
  }, null);

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4">
        <PageHeader
          title="Orbital Slots & Satellite Registry"
          subtitle="Track orbital congestion, satellite operators, fleet compositions, and upcoming orbital events across all regimes"
          breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Orbital Slots' }]}
        />

        {loading ? (
          <div className="flex justify-center py-20">
            <LoadingSpinner size="lg" />
          </div>
        ) : needsInit ? (
          <div className="card p-12 text-center">
            <span className="text-6xl block mb-4">&#128752;</span>
            <h2 className="text-2xl font-semibold text-white mb-2">
              No Orbital Data Available
            </h2>
            <p className="text-star-300 mb-6 max-w-lg mx-auto">
              Load orbital slot data including satellite registries, operator fleets,
              and upcoming orbital events.
            </p>
            <button
              onClick={handleInitialize}
              disabled={initializing}
              className="btn-primary py-3 px-8"
            >
              {initializing ? (
                <span className="flex items-center gap-2">
                  <LoadingSpinner size="sm" />
                  Loading Data...
                </span>
              ) : (
                'Load Data'
              )}
            </button>
          </div>
        ) : (
          <>
            {/* ──────────────── Quick Stats Banner ──────────────── */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <div className="card-elevated p-4 text-center">
                <div className="text-2xl font-bold font-display text-white">
                  {formatNumber(stats?.totalActive || 0)}
                </div>
                <div className="text-star-400 text-xs uppercase tracking-widest font-medium">
                  Active Satellites
                </div>
              </div>
              <div className="card-elevated p-4 text-center">
                <div className="text-2xl font-bold font-display text-red-400">
                  {formatNumber(stats?.totalDebris || 0)}
                </div>
                <div className="text-star-400 text-xs uppercase tracking-widest font-medium">
                  Debris Objects
                </div>
              </div>
              <div className="card-elevated p-4 text-center">
                <div className={`text-2xl font-bold font-display ${
                  mostCongestedSlot?.congestionLevel === 'critical' ? 'text-red-400' :
                  mostCongestedSlot?.congestionLevel === 'high' ? 'text-orange-400' :
                  'text-yellow-400'
                }`}>
                  {mostCongestedSlot?.orbitType || 'N/A'}
                </div>
                <div className="text-star-400 text-xs uppercase tracking-widest font-medium">
                  Most Congested
                </div>
                {mostCongestedSlot?.congestionLevel && (
                  <div className={`text-[10px] mt-0.5 ${
                    CONGESTION_STYLES[mostCongestedSlot.congestionLevel]?.text || 'text-star-400'
                  }`}>
                    {CONGESTION_LEVEL_INFO[mostCongestedSlot.congestionLevel]?.label}
                  </div>
                )}
              </div>
              <div className="card-elevated p-4 text-center">
                <div className="text-2xl font-bold font-display text-nebula-400">
                  {operators.length}
                </div>
                <div className="text-star-400 text-xs uppercase tracking-widest font-medium">
                  Operators
                </div>
              </div>
            </div>

            {/* ──────────────── Tab Navigation ──────────────── */}
            <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
              {([
                { id: 'overview' as const, label: 'Overview', count: slots.length },
                { id: 'operators' as const, label: 'Operators', count: operators.length },
                { id: 'events' as const, label: 'Events', count: events.length },
              ]).map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'bg-nebula-500 text-white shadow-glow-sm'
                      : 'bg-space-700/50 text-star-300 hover:bg-space-600/50'
                  }`}
                >
                  {tab.label}
                  {tab.count > 0 && (
                    <span
                      className={`text-xs px-1.5 py-0.5 rounded-full ${
                        activeTab === tab.id ? 'bg-white/20 text-white' : 'bg-space-600 text-star-400'
                      }`}
                    >
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* ──────────────── OVERVIEW TAB ──────────────── */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* Summary Bar */}
                <div className="card p-5">
                  <div className="flex items-center justify-between flex-wrap gap-4">
                    <div>
                      <h3 className="text-lg font-semibold text-white">Orbital Environment Summary</h3>
                      <p className="text-star-400 text-sm mt-1">
                        {formatNumber(stats?.totalObjects || 0)} total objects tracked across {slots.length} orbital regimes
                      </p>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <div className="text-2xl font-bold font-display text-green-400">
                          +{formatNumber(stats?.growth1Year || 0)}
                        </div>
                        <div className="text-star-400 text-xs">1-Year Growth</div>
                      </div>
                      <div className="w-px h-10 bg-white/[0.06]" />
                      <div className="text-right">
                        <div className="text-2xl font-bold font-display text-blue-400">
                          +{formatNumber(stats?.growth5Year || 0)}
                        </div>
                        <div className="text-star-400 text-xs">5-Year Growth</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Orbit Type Cards */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {slots.map((slot) => (
                    <OrbitTypeCard key={slot.id} slot={slot} />
                  ))}
                </div>

                {/* Congestion Legend */}
                <div className="card p-5 border-dashed">
                  <h3 className="text-lg font-semibold text-white mb-3">Congestion Level Guide</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {(['low', 'moderate', 'high', 'critical'] as CongestionLevel[]).map((level) => {
                      const style = CONGESTION_STYLES[level];
                      const info = CONGESTION_LEVEL_INFO[level];
                      return (
                        <div key={level} className={`rounded-lg p-3 ${style.bg} border ${style.border}`}>
                          <span className={`text-sm font-semibold ${style.text}`}>{info.label}</span>
                          <p className="text-star-400 text-xs mt-1">
                            {level === 'low' && 'Minimal traffic, ample slot availability.'}
                            {level === 'moderate' && 'Growing traffic, coordination recommended.'}
                            {level === 'high' && 'Significant congestion, limited slots remaining.'}
                            {level === 'critical' && 'Maximum congestion, collision avoidance active.'}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* ──────────────── OPERATORS TAB ──────────────── */}
            {activeTab === 'operators' && (
              <div>
                {/* Orbit Type Filter */}
                <div className="card p-4 mb-6">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-star-300 text-sm mr-2">Filter by orbit:</span>
                    <button
                      onClick={() => handleOrbitFilterChange('')}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                        orbitFilter === ''
                          ? 'bg-white/[0.1] text-white border border-white/[0.15] shadow-glow-sm'
                          : 'bg-transparent text-star-300 border border-white/[0.06] hover:border-white/[0.1]'
                      }`}
                    >
                      All ({operators.length})
                    </button>
                    {(['LEO', 'MEO', 'GEO'] as OrbitType[]).map((orbit) => {
                      const count = operators.filter((op) => {
                        if (orbit === 'LEO') return op.leoCount > 0;
                        if (orbit === 'MEO') return op.meoCount > 0;
                        if (orbit === 'GEO') return op.geoCount > 0;
                        return false;
                      }).length;
                      const orbitInfo = ORBIT_TYPES.find(o => o.value === orbit);
                      return (
                        <button
                          key={orbit}
                          onClick={() => handleOrbitFilterChange(orbit)}
                          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-1 ${
                            orbitFilter === orbit
                              ? 'bg-white/[0.1] text-white border border-white/[0.15] shadow-glow-sm'
                              : 'bg-transparent text-star-300 border border-white/[0.06] hover:border-white/[0.1]'
                          }`}
                        >
                          <span>{orbitInfo?.icon}</span>
                          {orbit} ({count})
                        </button>
                      );
                    })}
                    <div className="ml-auto">
                      <ExportButton
                        data={filteredOperators}
                        filename="satellite-operators"
                        columns={OPERATOR_EXPORT_COLUMNS}
                        label="Export"
                      />
                    </div>
                  </div>
                </div>

                {/* Total Fleet Summary */}
                <div className="card p-5 mb-6">
                  <div className="flex items-center justify-between flex-wrap gap-4">
                    <div>
                      <h3 className="text-lg font-semibold text-white">
                        {orbitFilter ? `${orbitFilter} Operators` : 'All Operators'}
                      </h3>
                      <p className="text-star-400 text-sm mt-1">
                        {filteredOperators.length} operator{filteredOperators.length !== 1 ? 's' : ''} with a combined fleet of{' '}
                        {formatNumber(filteredOperators.reduce((sum, op) => sum + op.totalActive, 0))} active satellites
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold font-display text-nebula-400">
                        +{formatNumber(filteredOperators.reduce((sum, op) => sum + op.planned1Year, 0))}
                      </div>
                      <div className="text-star-400 text-xs">Planned (1Y)</div>
                    </div>
                  </div>
                </div>

                {/* Operator Cards */}
                {filteredOperators.length === 0 ? (
                  <div className="text-center py-16">
                    <h3 className="text-xl font-semibold text-white mb-2">No Operators Found</h3>
                    <p className="text-star-300">
                      No operators with active satellites in {orbitFilter} orbit.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {filteredOperators.map((operator, idx) => (
                      <OperatorCard key={operator.id} operator={operator} rank={idx + 1} />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ──────────────── EVENTS TAB ──────────────── */}
            {activeTab === 'events' && (
              <div className="space-y-6">
                {/* Event Type Summary */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  {(['launch', 'reentry', 'conjunction', 'debris_event', 'maneuver'] as OrbitalEventType[]).map((type) => {
                    const style = EVENT_TYPE_STYLES[type];
                    const count = events.filter(e => e.eventType === type).length;
                    return (
                      <div key={type} className={`card p-4 text-center ${style.bg} border border-white/[0.06]`}>
                        <span className="text-2xl block mb-1">{style.icon}</span>
                        <div className={`text-xl font-bold font-display ${style.color}`}>{count}</div>
                        <div className="text-star-400 text-xs uppercase tracking-widest">{style.label}</div>
                      </div>
                    );
                  })}
                </div>

                {/* Timeline */}
                <div className="card p-5">
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-1">Upcoming Orbital Events</h3>
                      <p className="text-star-400 text-sm">Next 30 days of scheduled and predicted events</p>
                    </div>
                    <ExportButton
                      data={events}
                      filename="orbital-events"
                      columns={EVENT_EXPORT_COLUMNS}
                      label="Export"
                    />
                  </div>
                </div>

                {/* Event Cards */}
                {events.length === 0 ? (
                  <div className="text-center py-16">
                    <h3 className="text-xl font-semibold text-white mb-2">No Upcoming Events</h3>
                    <p className="text-star-300">No orbital events scheduled in the next 30 days.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {events.map((event) => (
                      <EventCard key={event.id} event={event} />
                    ))}
                  </div>
                )}

                {/* Data Note */}
                <div className="card p-5 border-dashed">
                  <h3 className="text-lg font-semibold text-white mb-3">Event Tracking Sources</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-star-300">
                    <div>
                      <h4 className="text-white font-medium mb-2">Launch Schedules</h4>
                      <ul className="space-y-1">
                        <li>SpaceX manifest & FCC filings</li>
                        <li>Arianespace launch calendar</li>
                        <li>ISRO / CNSA official announcements</li>
                        <li>FAA & FCC orbital authorization filings</li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="text-white font-medium mb-2">Conjunction & Re-entry</h4>
                      <ul className="space-y-1">
                        <li>USSPACECOM conjunction data messages</li>
                        <li>ESA Space Debris Office predictions</li>
                        <li>The Aerospace Corporation re-entry tracking</li>
                        <li>CelesTrak SOCRATES close-approach data</li>
                      </ul>
                    </div>
                  </div>
                  <p className="text-star-400 text-xs mt-4">
                    Event dates and confidence levels are based on publicly available scheduling data.
                    Tentative and estimated dates may shift as launch windows are confirmed.
                  </p>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ────────────────────────────────────────
// Main Page (Suspense boundary)
// ────────────────────────────────────────

export default function OrbitalSlotsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex justify-center py-20">
          <LoadingSpinner size="lg" />
        </div>
      }
    >
      <OrbitalSlotsContent />
    </Suspense>
  );
}
