'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  DebrisStats,
  ConjunctionEvent,
  DebrisObject,
  ConjunctionRisk,
  DebrisObjectType,
  CONJUNCTION_RISK_INFO,
  DEBRIS_OBJECT_TYPES,
} from '@/types';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import PageHeader from '@/components/ui/PageHeader';
import ExportButton from '@/components/ui/ExportButton';

// ────────────────────────────────────────
// Types & Constants
// ────────────────────────────────────────

interface DebrisMonitorData {
  overview: {
    stats: DebrisStats | null;
    recentConjunctions: ConjunctionEvent[];
    criticalCount: number;
    debrisByOrbit: { leo: number; meo: number; geo: number };
    debrisByType: { payloads: number; rocketBodies: number; debris: number; unknown: number };
    complianceRate: number | null;
  } | null;
  conjunctions: ConjunctionEvent[];
  notableDebris: DebrisObject[];
}

const RISK_COLORS: Record<ConjunctionRisk, { bg: string; text: string; border: string; label: string }> = {
  critical: { bg: 'bg-red-900/30', text: 'text-red-400', border: 'border-red-500', label: 'Critical' },
  high: { bg: 'bg-orange-900/30', text: 'text-orange-400', border: 'border-orange-500', label: 'High' },
  moderate: { bg: 'bg-yellow-900/30', text: 'text-yellow-400', border: 'border-yellow-500', label: 'Moderate' },
  low: { bg: 'bg-green-900/30', text: 'text-green-400', border: 'border-green-500', label: 'Low' },
};

const OBJECT_TYPE_COLORS: Record<string, string> = {
  payload: 'text-green-400',
  rocket_body: 'text-orange-400',
  debris: 'text-red-400',
  unknown: 'text-gray-400',
};

/** Known satellite operator names that have entries in the orbital-slots page. */
const KNOWN_OPERATORS = [
  'Starlink', 'OneWeb', 'Iridium', 'SES', 'Intelsat', 'Eutelsat',
  'Telesat', 'SpaceX', 'Amazon', 'Planet Labs', 'Spire', 'Globalstar',
  'O3b', 'ViaSat', 'Hughes', 'ORBCOMM', 'BlackSky',
];

function matchesKnownOperator(name: string): boolean {
  const lower = name.toLowerCase();
  return KNOWN_OPERATORS.some((op) => lower.includes(op.toLowerCase()));
}

function getKesslerColor(index: number): string {
  if (index > 6) return 'text-red-400';
  if (index >= 3) return 'text-yellow-400';
  return 'text-green-400';
}

function getKesslerLabel(index: number): string {
  if (index > 6) return 'High Risk';
  if (index >= 3) return 'Elevated';
  return 'Stable';
}

function formatMass(mass: number | null): string {
  if (mass === null) return 'Unknown';
  if (mass >= 1000) return `${(mass / 1000).toFixed(1)} t`;
  return `${mass.toFixed(1)} kg`;
}

// ── Export column definitions ──

const CONJUNCTION_EXPORT_COLUMNS = [
  { key: 'primaryObject', label: 'Primary Object' },
  { key: 'primaryType', label: 'Primary Type' },
  { key: 'secondaryObject', label: 'Secondary Object' },
  { key: 'secondaryType', label: 'Secondary Type' },
  { key: 'riskLevel', label: 'Risk Level' },
  { key: 'probability', label: 'Probability' },
  { key: 'missDistance', label: 'Miss Distance (m)' },
  { key: 'altitude', label: 'Altitude (km)' },
  { key: 'orbitType', label: 'Orbit Type' },
  { key: 'eventTime', label: 'Event Time' },
  { key: 'maneuverRequired', label: 'Maneuver Required' },
  { key: 'maneuverExecuted', label: 'Maneuver Executed' },
];

const DEBRIS_EXPORT_COLUMNS = [
  { key: 'name', label: 'Name' },
  { key: 'noradId', label: 'NORAD ID' },
  { key: 'objectType', label: 'Object Type' },
  { key: 'altitude', label: 'Altitude (km)' },
  { key: 'orbitType', label: 'Orbit Type' },
  { key: 'mass', label: 'Mass (kg)' },
  { key: 'size', label: 'Size' },
  { key: 'originCountry', label: 'Origin Country' },
  { key: 'originYear', label: 'Origin Year' },
  { key: 'originMission', label: 'Origin Mission' },
  { key: 'isActive', label: 'Active' },
  { key: 'inclination', label: 'Inclination' },
  { key: 'eccentricity', label: 'Eccentricity' },
];

// ────────────────────────────────────────
// Conjunction Event Card
// ────────────────────────────────────────

function ConjunctionCard({ event }: { event: ConjunctionEvent }) {
  const riskStyle = RISK_COLORS[event.riskLevel as ConjunctionRisk] || RISK_COLORS.low;
  const eventDate = new Date(event.eventTime);
  const isPast = eventDate < new Date();

  const primaryIsOperator = matchesKnownOperator(event.primaryObject);
  const secondaryIsOperator = matchesKnownOperator(event.secondaryObject);

  return (
    <div className={`card p-5 border ${riskStyle.border} ${riskStyle.bg}`}>
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span className={`text-xs font-bold px-2.5 py-1 rounded ${riskStyle.bg} ${riskStyle.text} border ${riskStyle.border}`}>
              {riskStyle.label}
            </span>
            <span className="text-slate-500 text-xs">
              {eventDate.toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
            {isPast && (
              <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded">Past</span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 text-sm mt-2">
            <div className="bg-slate-100/50 rounded px-3 py-1.5">
              <span className="text-slate-500 text-xs block">Primary</span>
              <span className="text-slate-900 font-medium">{event.primaryObject}</span>
              <span className="text-slate-400 text-xs ml-1">({event.primaryType})</span>
            </div>
            <span className="text-slate-400 font-bold">vs</span>
            <div className="bg-slate-100/50 rounded px-3 py-1.5">
              <span className="text-slate-500 text-xs block">Secondary</span>
              <span className="text-slate-900 font-medium">{event.secondaryObject}</span>
              <span className="text-slate-400 text-xs ml-1">({event.secondaryType})</span>
            </div>
          </div>

          {/* Cross-module link chips */}
          {(primaryIsOperator || secondaryIsOperator) && (
            <div className="flex flex-wrap gap-2 mt-2">
              {primaryIsOperator && (
                <Link
                  href="/orbital-slots?tab=operators"
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-nebula-500/20 text-nebula-300 hover:bg-nebula-500/30 transition-colors border border-nebula-500/30"
                >
                  View {event.primaryObject} operator &rarr;
                </Link>
              )}
              {secondaryIsOperator && (
                <Link
                  href="/orbital-slots?tab=operators"
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-nebula-500/20 text-nebula-300 hover:bg-nebula-500/30 transition-colors border border-nebula-500/30"
                >
                  View {event.secondaryObject} operator &rarr;
                </Link>
              )}
            </div>
          )}
        </div>

        <div className="text-right flex-shrink-0 space-y-1">
          <div className="text-slate-500 text-sm">
            Miss Distance: <span className="text-slate-900 font-bold">{event.missDistance.toFixed(1)} m</span>
          </div>
          <div className="text-slate-500 text-sm">
            Probability:{' '}
            <span className={`font-bold ${
              event.probability > 0.01 ? 'text-red-400' :
              event.probability > 0.001 ? 'text-orange-400' :
              event.probability > 0.0001 ? 'text-yellow-400' :
              'text-slate-600'
            }`}>
              {event.probability < 0.0001
                ? event.probability.toExponential(2)
                : (event.probability * 100).toFixed(3) + '%'}
            </span>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4 mt-4 pt-3 border-t border-slate-200 text-xs">
        <span className="text-slate-500">
          Altitude: <span className="text-slate-600 font-medium">{event.altitude.toFixed(0)} km</span>
        </span>
        <span className="text-slate-500">
          Orbit: <span className="text-slate-600 font-medium">{event.orbitType}</span>
        </span>
        <span className="text-slate-500">
          Maneuver:{' '}
          {event.maneuverRequired ? (
            event.maneuverExecuted ? (
              <span className="text-green-400 font-medium">Executed</span>
            ) : (
              <span className="text-red-400 font-medium animate-pulse">Required</span>
            )
          ) : (
            <span className="text-slate-500">Not Required</span>
          )}
        </span>
      </div>

      {event.description && (
        <p className="text-slate-500 text-xs mt-3 leading-relaxed">{event.description}</p>
      )}
    </div>
  );
}

// ────────────────────────────────────────
// Debris Object Card
// ────────────────────────────────────────

function DebrisObjectCard({ obj }: { obj: DebrisObject }) {
  const typeInfo = DEBRIS_OBJECT_TYPES.find((t) => t.value === obj.objectType);
  const typeColor = OBJECT_TYPE_COLORS[obj.objectType] || 'text-slate-500';
  const isActivePayload = obj.objectType === 'payload' && obj.isActive;

  return (
    <div className="card p-4">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">{typeInfo?.icon || '?'}</span>
            <h4 className="font-semibold text-slate-900 text-sm truncate">{obj.name}</h4>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className={`px-2 py-0.5 rounded bg-slate-100 ${typeColor}`}>
              {typeInfo?.label || obj.objectType}
            </span>
            {obj.noradId && (
              <span className="text-slate-500">NORAD: {obj.noradId}</span>
            )}
            {obj.isActive && (
              <span className="text-green-400 bg-green-500/20 px-2 py-0.5 rounded">Active</span>
            )}
          </div>
          {/* Cross-module link for active payloads */}
          {isActivePayload && (
            <Link
              href="/orbital-slots?tab=operators"
              className="inline-flex items-center gap-1 mt-2 px-2 py-0.5 rounded text-[10px] font-medium bg-nebula-500/20 text-nebula-300 hover:bg-nebula-500/30 transition-colors border border-nebula-500/30"
            >
              View in Operator Registry &rarr;
            </Link>
          )}
        </div>
        <div className="text-right flex-shrink-0 ml-3">
          <div className="text-slate-900 font-bold text-sm">{obj.altitude.toFixed(0)} km</div>
          <div className="text-slate-500 text-xs">{obj.orbitType}</div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
        <div>
          <span className="text-slate-500 block">Mass</span>
          <span className="text-slate-900 font-medium">{formatMass(obj.mass)}</span>
        </div>
        <div>
          <span className="text-slate-500 block">Size</span>
          <span className="text-slate-900 font-medium capitalize">{obj.size || 'Unknown'}</span>
        </div>
        <div>
          <span className="text-slate-500 block">Origin</span>
          <span className="text-slate-900 font-medium">{obj.originCountry || 'Unknown'}</span>
        </div>
        <div>
          <span className="text-slate-500 block">Year</span>
          <span className="text-slate-900 font-medium">{obj.originYear || 'Unknown'}</span>
        </div>
      </div>

      {obj.originMission && (
        <p className="text-slate-500 text-xs mt-2 truncate">Mission: {obj.originMission}</p>
      )}

      {obj.deorbitDate && (
        <div className="mt-2 text-xs">
          <span className="text-slate-500">Est. Deorbit: </span>
          <span className="text-nebula-300 font-medium">
            {new Date(obj.deorbitDate).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          </span>
        </div>
      )}

      {obj.inclination !== null && obj.eccentricity !== null && (
        <div className="flex gap-4 mt-2 text-xs text-slate-500">
          <span>Inc: {obj.inclination.toFixed(1)}&deg;</span>
          <span>Ecc: {obj.eccentricity.toFixed(4)}</span>
        </div>
      )}
    </div>
  );
}

// ────────────────────────────────────────
// Inner Content (needs useSearchParams)
// ────────────────────────────────────────

function DebrisContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // Read initial values from URL
  const initialTab = (searchParams.get('tab') as 'overview' | 'conjunctions' | 'objects') || 'overview';
  const initialRisk = (searchParams.get('risk') as ConjunctionRisk | '') || '';
  const initialObjectType = (searchParams.get('objectType') as DebrisObjectType | '') || '';

  const [data, setData] = useState<DebrisMonitorData | null>(null);
  const [loading, setLoading] = useState(true);
  const [initializing, setInitializing] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'conjunctions' | 'objects'>(initialTab);
  const [riskFilter, setRiskFilter] = useState<ConjunctionRisk | ''>(initialRisk);
  const [objectTypeFilter, setObjectTypeFilter] = useState<DebrisObjectType | ''>(initialObjectType);

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

  const handleTabChange = (tab: 'overview' | 'conjunctions' | 'objects') => {
    setActiveTab(tab);
    updateUrl({ tab, risk: '', objectType: '' });
    setRiskFilter('');
    setObjectTypeFilter('');
  };

  const handleRiskFilterChange = (risk: ConjunctionRisk | '') => {
    setRiskFilter(risk);
    updateUrl({ risk });
  };

  const handleObjectTypeFilterChange = (objectType: DebrisObjectType | '') => {
    setObjectTypeFilter(objectType);
    updateUrl({ objectType });
  };

  const fetchData = async () => {
    try {
      const params = new URLSearchParams();
      if (riskFilter) params.set('riskLevel', riskFilter);
      params.set('limit', '50');

      const res = await fetch(`/api/debris-monitor?${params}`);
      const result = await res.json();

      if (!result.error) {
        setData(result);
      }
    } catch (error) {
      console.error('Failed to fetch debris monitor data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInitialize = async () => {
    setInitializing(true);
    try {
      await fetch('/api/debris-monitor/init', { method: 'POST' });
      setLoading(true);
      await fetchData();
    } catch (error) {
      console.error('Failed to initialize debris data:', error);
    } finally {
      setInitializing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [riskFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  const overview = data?.overview;
  const stats = overview?.stats;
  const conjunctions = data?.conjunctions || [];
  const notableDebris = data?.notableDebris || [];
  const needsInit = !loading && (!stats && conjunctions.length === 0 && notableDebris.length === 0);

  // Filtered objects
  const filteredObjects = objectTypeFilter
    ? notableDebris.filter((o) => o.objectType === objectTypeFilter)
    : notableDebris;

  // Filtered conjunctions
  const filteredConjunctions = riskFilter
    ? conjunctions.filter((c) => c.riskLevel === riskFilter)
    : conjunctions;

  // Sort conjunctions: critical first, then by time
  const sortedConjunctions = [...filteredConjunctions].sort((a, b) => {
    const riskOrder: Record<string, number> = { critical: 0, high: 1, moderate: 2, low: 3 };
    const riskDiff = (riskOrder[a.riskLevel] ?? 4) - (riskOrder[b.riskLevel] ?? 4);
    if (riskDiff !== 0) return riskDiff;
    return new Date(a.eventTime).getTime() - new Date(b.eventTime).getTime();
  });

  // Stats
  const totalTracked = stats?.totalTracked || 0;
  const criticalCount = overview?.criticalCount || 0;

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4">
        <PageHeader
          title="Space Debris & Collision Risk Monitor"
          subtitle="Real-time tracking of orbital debris, conjunction events, and Kessler syndrome risk assessment"
          breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Debris Monitor' }]}
        />

        {loading ? (
          <div className="flex justify-center py-20">
            <LoadingSpinner size="lg" />
          </div>
        ) : needsInit ? (
          <div className="card p-12 text-center">
            <span className="text-6xl block mb-4">&#128752;</span>
            <h2 className="text-2xl font-semibold text-slate-900 mb-2">
              No Debris Tracking Data Available
            </h2>
            <p className="text-slate-500 mb-6 max-w-lg mx-auto">
              Load orbital debris data including tracked objects, conjunction events,
              and collision risk statistics.
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
            {/* Quick Stats Banner */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
              <div className="card-elevated p-4 text-center">
                <div className="text-2xl font-bold font-display text-slate-900">
                  {totalTracked.toLocaleString()}
                </div>
                <div className="text-slate-500 text-xs uppercase tracking-widest font-medium">
                  Tracked Objects
                </div>
              </div>
              <div className="card-elevated p-4 text-center">
                <div className={`text-2xl font-bold font-display ${getKesslerColor(stats?.kesslerRiskIndex || 0)}`}>
                  {(stats?.kesslerRiskIndex || 0).toFixed(1)}
                </div>
                <div className="text-slate-500 text-xs uppercase tracking-widest font-medium">
                  Kessler Index
                </div>
                <div className={`text-[10px] mt-0.5 ${getKesslerColor(stats?.kesslerRiskIndex || 0)}`}>
                  {getKesslerLabel(stats?.kesslerRiskIndex || 0)}
                </div>
              </div>
              <div className="card-elevated p-4 text-center">
                <div className="text-2xl font-bold font-display text-slate-900">
                  {(stats?.conjunctionsPerDay || 0).toFixed(1)}
                </div>
                <div className="text-slate-500 text-xs uppercase tracking-widest font-medium">
                  Conj./Day
                </div>
              </div>
              <div className="card-elevated p-4 text-center">
                <div className={`text-2xl font-bold font-display ${criticalCount > 0 ? 'text-red-400' : 'text-green-400'}`}>
                  {criticalCount}
                </div>
                <div className="text-slate-500 text-xs uppercase tracking-widest font-medium">
                  Critical Events
                </div>
              </div>
              <div className="card-elevated p-4 text-center">
                <div className="text-2xl font-bold font-display text-slate-900">
                  {conjunctions.length}
                </div>
                <div className="text-slate-500 text-xs uppercase tracking-widest font-medium">
                  Active Conj.
                </div>
              </div>
              <div className="card-elevated p-4 text-center">
                <div className={`text-2xl font-bold font-display ${
                  (overview?.complianceRate ?? 0) >= 0.8 ? 'text-green-400' :
                  (overview?.complianceRate ?? 0) >= 0.5 ? 'text-yellow-400' : 'text-red-400'
                }`}>
                  {((overview?.complianceRate ?? 0) * 100).toFixed(1)}%
                </div>
                <div className="text-slate-500 text-xs uppercase tracking-widest font-medium">
                  25-Yr Compliance
                </div>
              </div>
            </div>

            {/* Tab Navigation */}
            <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
              {[
                { id: 'overview' as const, label: 'Overview' },
                { id: 'conjunctions' as const, label: 'Conjunction Events', count: conjunctions.length },
                { id: 'objects' as const, label: 'Tracked Objects', count: notableDebris.length },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'bg-nebula-500 text-slate-900 shadow-glow-sm'
                      : 'bg-slate-100/50 text-slate-500 hover:bg-slate-100/50'
                  }`}
                >
                  {tab.label}
                  {tab.count !== undefined && tab.count > 0 && (
                    <span
                      className={`text-xs px-1.5 py-0.5 rounded-full ${
                        activeTab === tab.id ? 'bg-slate-200 text-slate-900' : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* ──────────────── OVERVIEW TAB ──────────────── */}
            {activeTab === 'overview' && stats && (
              <div className="space-y-6">
                {/* Distribution Cards */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Orbit Distribution */}
                  <div className="card p-5">
                    <h3 className="text-lg font-semibold text-slate-900 mb-4">Distribution by Orbit</h3>
                    <div className="space-y-4">
                      {[
                        { label: 'LEO (Low Earth Orbit)', count: stats.leoCount, color: 'from-blue-500 to-blue-400', desc: '< 2,000 km' },
                        { label: 'MEO (Medium Earth Orbit)', count: stats.meoCount, color: 'from-purple-500 to-purple-400', desc: '2,000 - 35,786 km' },
                        { label: 'GEO (Geostationary Orbit)', count: stats.geoCount, color: 'from-amber-500 to-amber-400', desc: '~35,786 km' },
                      ].map((orbit) => {
                        const pct = totalTracked > 0 ? (orbit.count / totalTracked) * 100 : 0;
                        return (
                          <div key={orbit.label}>
                            <div className="flex items-center justify-between mb-1">
                              <div>
                                <span className="text-slate-600 text-sm">{orbit.label}</span>
                                <span className="text-slate-500 text-xs ml-2">{orbit.desc}</span>
                              </div>
                              <span className="text-slate-500 text-sm font-medium">
                                {orbit.count.toLocaleString()} ({pct.toFixed(1)}%)
                              </span>
                            </div>
                            <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className={`h-full bg-gradient-to-r ${orbit.color} rounded-full transition-all`}
                                style={{ width: `${Math.min(pct, 100)}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Type Distribution */}
                  <div className="card p-5">
                    <h3 className="text-lg font-semibold text-slate-900 mb-4">Distribution by Type</h3>
                    <div className="space-y-4">
                      {[
                        { label: 'Payloads (Active & Inactive)', count: stats.totalPayloads, color: 'from-green-500 to-green-400' },
                        { label: 'Rocket Bodies', count: stats.totalRocketBodies, color: 'from-orange-500 to-orange-400' },
                        { label: 'Debris Fragments', count: stats.totalDebris, color: 'from-red-500 to-red-400' },
                        { label: 'Unidentified Objects', count: stats.totalUnknown, color: 'from-gray-500 to-gray-400' },
                      ].map((type) => {
                        const pct = totalTracked > 0 ? (type.count / totalTracked) * 100 : 0;
                        return (
                          <div key={type.label}>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-slate-600 text-sm">{type.label}</span>
                              <span className="text-slate-500 text-sm font-medium">
                                {type.count.toLocaleString()} ({pct.toFixed(1)}%)
                              </span>
                            </div>
                            <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className={`h-full bg-gradient-to-r ${type.color} rounded-full transition-all`}
                                style={{ width: `${Math.min(pct, 100)}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* 25-Year Compliance */}
                <div className="card p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900">25-Year Deorbit Compliance</h3>
                      <p className="text-slate-500 text-sm mt-1">
                        {(stats.compliant25Year || 0).toLocaleString()} compliant /{' '}
                        {((stats.compliant25Year || 0) + (stats.nonCompliant || 0)).toLocaleString()} total objects
                      </p>
                    </div>
                    <div className="text-right">
                      <div className={`text-3xl font-bold ${
                        (overview?.complianceRate ?? 0) >= 0.8 ? 'text-green-400' :
                        (overview?.complianceRate ?? 0) >= 0.5 ? 'text-yellow-400' : 'text-red-400'
                      }`}>
                        {((overview?.complianceRate ?? 0) * 100).toFixed(1)}%
                      </div>
                      <div className="text-slate-500 text-xs">Compliance Rate</div>
                    </div>
                  </div>
                  <div className="h-4 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        (overview?.complianceRate ?? 0) >= 0.8 ? 'bg-gradient-to-r from-green-500 to-green-400' :
                        (overview?.complianceRate ?? 0) >= 0.5 ? 'bg-gradient-to-r from-yellow-500 to-yellow-400' :
                        'bg-gradient-to-r from-red-500 to-red-400'
                      }`}
                      style={{ width: `${Math.min((overview?.complianceRate ?? 0) * 100, 100)}%` }}
                    />
                  </div>
                </div>

                {/* Recent Critical/High Conjunctions Preview */}
                {sortedConjunctions.filter((c) => c.riskLevel === 'critical' || c.riskLevel === 'high').length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-slate-900">Critical & High-Risk Events</h3>
                      <button
                        onClick={() => handleTabChange('conjunctions')}
                        className="text-nebula-300 hover:text-nebula-200 text-sm transition-colors"
                      >
                        View All &rarr;
                      </button>
                    </div>
                    <div className="space-y-4">
                      {sortedConjunctions
                        .filter((c) => c.riskLevel === 'critical' || c.riskLevel === 'high')
                        .slice(0, 4)
                        .map((event) => (
                          <ConjunctionCard key={event.id} event={event} />
                        ))}
                    </div>
                  </div>
                )}

                {/* Data Sources */}
                <div className="card p-5 border-dashed">
                  <h3 className="text-lg font-semibold text-slate-900 mb-3">Data Sources & Methodology</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-slate-500">
                    <div>
                      <h4 className="text-slate-900 font-medium mb-2">Tracking Data</h4>
                      <ul className="space-y-1">
                        <li>US Space Surveillance Network (18th SDS)</li>
                        <li>CelesTrak public TLE catalog</li>
                        <li>ESA DISCOS database</li>
                        <li>UNOOSA Index of Objects in Outer Space</li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="text-slate-900 font-medium mb-2">Conjunction Assessment</h4>
                      <ul className="space-y-1">
                        <li>Space-Track.org CDM data</li>
                        <li>SOCRATES (Satellite Orbital Conjunction Reports)</li>
                        <li>ESA Collision Avoidance Service</li>
                        <li>NASA Conjunction Assessment Reports</li>
                      </ul>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <p className="text-slate-500 text-xs flex-1">
                      Statistics are aggregated from publicly available sources. Conjunction data reflects representative
                      scenarios based on real-world debris events and orbital mechanics. Object counts align with
                      ESA Space Environment Report and USSPACECOM public catalog data.
                    </p>
                    <Link
                      href="/orbital-slots"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-nebula-500/20 text-nebula-300 hover:bg-nebula-500/30 transition-colors border border-nebula-500/30 whitespace-nowrap"
                    >
                      See tracked operators &rarr;
                    </Link>
                  </div>
                </div>
              </div>
            )}

            {/* ──────────────── CONJUNCTION EVENTS TAB ──────────────── */}
            {activeTab === 'conjunctions' && (
              <div>
                {/* Risk Level Filters */}
                <div className="card p-4 mb-6">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-slate-500 text-sm mr-2">Filter by risk:</span>
                    <button
                      onClick={() => handleRiskFilterChange('')}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                        riskFilter === ''
                          ? 'bg-slate-100 text-slate-900 border border-slate-200 shadow-glow-sm'
                          : 'bg-transparent text-slate-500 border border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      All ({conjunctions.length})
                    </button>
                    {(['critical', 'high', 'moderate', 'low'] as ConjunctionRisk[]).map((level) => {
                      const count = conjunctions.filter((c) => c.riskLevel === level).length;
                      const info = RISK_COLORS[level];
                      return (
                        <button
                          key={level}
                          onClick={() => handleRiskFilterChange(level)}
                          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                            riskFilter === level
                              ? `${info.bg} ${info.text} border ${info.border}`
                              : 'bg-transparent text-slate-500 border border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          {info.label} ({count})
                        </button>
                      );
                    })}
                    <div className="ml-auto">
                      <ExportButton
                        data={sortedConjunctions}
                        filename="conjunction-events"
                        columns={CONJUNCTION_EXPORT_COLUMNS}
                        label="Export"
                      />
                    </div>
                  </div>
                </div>

                {/* Conjunction List */}
                {sortedConjunctions.length === 0 ? (
                  <div className="text-center py-16">
                    <span className="text-5xl block mb-3">&#10003;</span>
                    <h3 className="text-xl font-semibold text-green-400 mb-2">No Events Found</h3>
                    <p className="text-slate-500">
                      {riskFilter
                        ? `No ${riskFilter} risk conjunction events at this time.`
                        : 'No active conjunction events.'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {sortedConjunctions.map((event) => (
                      <ConjunctionCard key={event.id} event={event} />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ──────────────── TRACKED OBJECTS TAB ──────────────── */}
            {activeTab === 'objects' && (
              <div>
                {/* Object Type Filter */}
                <div className="card p-4 mb-6">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-slate-500 text-sm mr-2">Filter by type:</span>
                    <button
                      onClick={() => handleObjectTypeFilterChange('')}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                        objectTypeFilter === ''
                          ? 'bg-slate-100 text-slate-900 border border-slate-200 shadow-glow-sm'
                          : 'bg-transparent text-slate-500 border border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      All ({notableDebris.length})
                    </button>
                    {DEBRIS_OBJECT_TYPES.map((type) => {
                      const count = notableDebris.filter((o) => o.objectType === type.value).length;
                      return (
                        <button
                          key={type.value}
                          onClick={() => handleObjectTypeFilterChange(type.value)}
                          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-1 ${
                            objectTypeFilter === type.value
                              ? 'bg-slate-100 text-slate-900 border border-slate-200 shadow-glow-sm'
                              : 'bg-transparent text-slate-500 border border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <span>{type.icon}</span>
                          {type.label} ({count})
                        </button>
                      );
                    })}
                    <div className="ml-auto">
                      <ExportButton
                        data={filteredObjects}
                        filename="debris-objects"
                        columns={DEBRIS_EXPORT_COLUMNS}
                        label="Export"
                      />
                    </div>
                  </div>
                </div>

                {/* Objects Grid */}
                {filteredObjects.length === 0 ? (
                  <div className="text-center py-16">
                    <h3 className="text-xl font-semibold text-slate-900 mb-2">No Objects Found</h3>
                    <p className="text-slate-500">
                      {objectTypeFilter
                        ? `No ${objectTypeFilter.replace('_', ' ')} objects in the database.`
                        : 'No tracked objects available.'}
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {filteredObjects.map((obj) => (
                      <DebrisObjectCard key={obj.id} obj={obj} />
                    ))}
                  </div>
                )}
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

export default function DebrisMonitorPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex justify-center py-20">
          <LoadingSpinner size="lg" />
        </div>
      }
    >
      <DebrisContent />
    </Suspense>
  );
}
