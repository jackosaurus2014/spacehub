'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import AnimatedPageHeader from '@/components/ui/AnimatedPageHeader';
import ScrollReveal, { StaggerContainer, StaggerItem } from '@/components/ui/ScrollReveal';
import SatelliteCard, {
  Satellite,
  OrbitType,
  SatelliteStatus,
} from '@/components/satellites/SatelliteCard';
import AdSlot from '@/components/ads/AdSlot';

// Types
interface SatelliteData {
  satellites: Satellite[];
  stats: {
    total: number;
    byOrbitType: Record<OrbitType, number>;
    byStatus: Record<SatelliteStatus, number>;
    byPurpose: Record<string, number>;
    topOperators: { name: string; count: number }[];
  };
  iss: Satellite | null;
  notableSatellites: Satellite[];
  total: number;
}

type TabId = 'overview' | 'satellites' | 'operators';

// Constants
const ORBIT_TYPES: { value: OrbitType; label: string; icon: string; description: string }[] = [
  { value: 'LEO', label: 'Low Earth Orbit', icon: '🛰️', description: '160-2,000 km' },
  { value: 'MEO', label: 'Medium Earth Orbit', icon: '📡', description: '2,000-35,786 km' },
  { value: 'GEO', label: 'Geostationary', icon: '🌐', description: '~35,786 km' },
  { value: 'HEO', label: 'Highly Elliptical', icon: '🔭', description: 'Variable' },
  { value: 'SSO', label: 'Sun-Synchronous', icon: '☀️', description: '600-800 km' },
  { value: 'Polar', label: 'Polar', icon: '🧭', description: '~800 km' },
];

const STATUS_OPTIONS: { value: SatelliteStatus; label: string; color: string }[] = [
  { value: 'active', label: 'Active', color: 'text-green-400' },
  { value: 'inactive', label: 'Inactive', color: 'text-yellow-400' },
  { value: 'deorbited', label: 'Deorbited', color: 'text-red-400' },
];

// ISS Position Card
function ISSHighlight({ iss }: { iss: Satellite }) {
  return (
    <div className="card p-6 border border-nebula-500/50 bg-gradient-to-br from-nebula-900/20 to-transparent">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-xl bg-nebula-500/20 flex items-center justify-center text-4xl border border-nebula-500/30">
            🏠
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xl font-bold text-white">{iss.name}</h3>
              <span className="px-2 py-0.5 rounded text-xs font-medium bg-green-900/30 text-green-400 border border-green-500/30">
                Live
              </span>
            </div>
            <p className="text-slate-400 text-sm mt-1">{iss.operator}</p>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-white">{iss.altitude.toLocaleString()} km</div>
            <div className="text-slate-400 text-xs uppercase tracking-widest">Altitude</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-nebula-300">{iss.velocity.toFixed(2)} km/s</div>
            <div className="text-slate-400 text-xs uppercase tracking-widest">Velocity</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-amber-400">{iss.period?.toFixed(0) || '~93'} min</div>
            <div className="text-slate-400 text-xs uppercase tracking-widest">Orbital Period</div>
          </div>
        </div>
      </div>
      <p className="text-slate-400 text-sm mt-4">{iss.description}</p>
      <div className="flex items-center gap-3 mt-4 pt-4 border-t border-slate-700">
        <a
          href={`https://www.n2yo.com/satellite/?s=${iss.noradId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 transition-colors border border-blue-500/30"
        >
          Track Live on N2YO
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </a>
        <a
          href="https://spotthestation.nasa.gov/"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium bg-green-500/20 text-green-300 hover:bg-green-500/30 transition-colors border border-green-500/30"
        >
          Spot the Station
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </a>
      </div>
    </div>
  );
}

// Inner content component
function SatelliteTrackerContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // Read initial values from URL
  const initialTab = (searchParams.get('tab') as TabId) || 'overview';
  const initialOrbit = (searchParams.get('orbit') as OrbitType | '') || '';
  const initialStatus = (searchParams.get('status') as SatelliteStatus | '') || '';
  const initialSearch = searchParams.get('search') || '';

  const [data, setData] = useState<SatelliteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>(initialTab);
  const [orbitFilter, setOrbitFilter] = useState<OrbitType | ''>(initialOrbit);
  const [statusFilter, setStatusFilter] = useState<SatelliteStatus | ''>(initialStatus);
  const [searchQuery, setSearchQuery] = useState(initialSearch);

  // Sync state to URL
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
    updateUrl({ tab, orbit: '', status: '', search: '' });
    setOrbitFilter('');
    setStatusFilter('');
    setSearchQuery('');
  };

  const handleOrbitFilterChange = (orbit: OrbitType | '') => {
    setOrbitFilter(orbit);
    updateUrl({ orbit });
  };

  const handleStatusFilterChange = (status: SatelliteStatus | '') => {
    setStatusFilter(status);
    updateUrl({ status });
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    updateUrl({ search: query });
  };

  const fetchData = async () => {
    setError(null);
    try {
      const params = new URLSearchParams();
      if (orbitFilter) params.set('orbitType', orbitFilter);
      if (statusFilter) params.set('status', statusFilter);
      if (searchQuery) params.set('search', searchQuery);
      params.set('limit', '100');

      const res = await fetch(`/api/satellites?${params}`);
      const result = await res.json();

      if (!result.error) {
        setData(result);
      }
    } catch (error) {
      console.error('Failed to fetch satellite data:', error);
      setError('Failed to load data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [orbitFilter, statusFilter, searchQuery]); // eslint-disable-line react-hooks/exhaustive-deps

  const stats = data?.stats;
  const satellites = data?.satellites || [];
  const iss = data?.iss;

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4">
        <AnimatedPageHeader
          title="Satellite Tracker & Visualization"
          subtitle="Track active satellites across all orbital regimes - from ISS to GPS to Starlink"
          icon="🛰️"
          accentColor="cyan"
        />

        {error && !loading && (
          <div className="card p-5 border border-red-500/20 bg-red-500/5 text-center mb-6">
            <div className="text-red-400 text-sm font-medium">{error}</div>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-20">
            <LoadingSpinner size="lg" />
          </div>
        ) : (
          <>
            {/* Quick Stats Banner */}
            <ScrollReveal>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-8">
              <div className="card-elevated p-4 text-center">
                <div className="text-2xl font-bold font-display text-slate-900">
                  {stats?.total.toLocaleString() || 0}
                </div>
                <div className="text-slate-400 text-xs uppercase tracking-widest font-medium">
                  Total Tracked
                </div>
              </div>
              <div className="card-elevated p-4 text-center">
                <div className="text-2xl font-bold font-display text-green-500">
                  {stats?.byStatus?.active?.toLocaleString() || 0}
                </div>
                <div className="text-slate-400 text-xs uppercase tracking-widest font-medium">
                  Active
                </div>
              </div>
              <div className="card-elevated p-4 text-center">
                <div className="text-2xl font-bold font-display text-blue-500">
                  {stats?.byOrbitType?.LEO?.toLocaleString() || 0}
                </div>
                <div className="text-slate-400 text-xs uppercase tracking-widest font-medium">
                  LEO
                </div>
              </div>
              <div className="card-elevated p-4 text-center">
                <div className="text-2xl font-bold font-display text-purple-500">
                  {stats?.byOrbitType?.MEO?.toLocaleString() || 0}
                </div>
                <div className="text-slate-400 text-xs uppercase tracking-widest font-medium">
                  MEO
                </div>
              </div>
              <div className="card-elevated p-4 text-center">
                <div className="text-2xl font-bold font-display text-amber-500">
                  {stats?.byOrbitType?.GEO?.toLocaleString() || 0}
                </div>
                <div className="text-slate-400 text-xs uppercase tracking-widest font-medium">
                  GEO
                </div>
              </div>
              <div className="card-elevated p-4 text-center">
                <div className="text-2xl font-bold font-display text-nebula-300">
                  {stats?.topOperators?.length || 0}
                </div>
                <div className="text-slate-400 text-xs uppercase tracking-widest font-medium">
                  Operators
                </div>
              </div>
            </div>
            </ScrollReveal>

            {/* Tab Navigation */}
            <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
              {([
                { id: 'overview' as const, label: 'Overview' },
                { id: 'satellites' as const, label: 'All Satellites', count: data?.total },
                { id: 'operators' as const, label: 'By Operator', count: stats?.topOperators?.length },
              ]).map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'bg-nebula-500 text-slate-900 shadow-glow-sm'
                      : 'bg-slate-100/50 text-slate-500 hover:bg-slate-100'
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
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* ISS Highlight */}
                {iss && <ISSHighlight iss={iss} />}

                {/* Distribution Cards */}
                <ScrollReveal>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* By Orbit Type */}
                  <div className="card p-5">
                    <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                      <span>🛰️</span> Distribution by Orbit Type
                    </h3>
                    <div className="space-y-4">
                      {ORBIT_TYPES.map((orbit) => {
                        const count = stats?.byOrbitType[orbit.value] || 0;
                        const total = stats?.total || 1;
                        const pct = (count / total) * 100;
                        return (
                          <div key={orbit.value}>
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center gap-2">
                                <span>{orbit.icon}</span>
                                <span className="text-slate-400 text-sm">{orbit.label}</span>
                                <span className="text-slate-400 text-xs">({orbit.description})</span>
                              </div>
                              <span className="text-slate-400 text-sm font-medium">
                                {count} ({pct.toFixed(1)}%)
                              </span>
                            </div>
                            <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-nebula-500 to-nebula-400 rounded-full transition-all"
                                style={{ width: `${Math.min(pct, 100)}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* By Purpose */}
                  <div className="card p-5">
                    <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                      <span>🎯</span> Distribution by Purpose
                    </h3>
                    <div className="space-y-4">
                      {Object.entries(stats?.byPurpose || {})
                        .sort((a, b) => b[1] - a[1])
                        .map(([purpose, count]) => {
                          const total = stats?.total || 1;
                          const pct = (count / total) * 100;
                          const purposeColors: Record<string, string> = {
                            'Communications': 'from-blue-500 to-blue-400',
                            'Navigation': 'from-purple-500 to-purple-400',
                            'Weather': 'from-cyan-500 to-cyan-400',
                            'Earth Observation': 'from-green-500 to-green-400',
                            'Research': 'from-pink-500 to-pink-400',
                            'Space Station': 'from-amber-500 to-amber-400',
                            'Reconnaissance': 'from-red-500 to-red-400',
                          };
                          return (
                            <div key={purpose}>
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-slate-400 text-sm">{purpose}</span>
                                <span className="text-slate-400 text-sm font-medium">
                                  {count} ({pct.toFixed(1)}%)
                                </span>
                              </div>
                              <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                                <div
                                  className={`h-full bg-gradient-to-r ${purposeColors[purpose] || 'from-slate-500 to-slate-400'} rounded-full transition-all`}
                                  style={{ width: `${Math.min(pct, 100)}%` }}
                                />
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                </div>
                </ScrollReveal>

                {/* Ad between sections */}
                <div className="my-6">
                  <AdSlot position="in_feed" module="satellite-tracker" />
                </div>

                {/* Notable Satellites */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                      <span>⭐</span> Notable Satellites
                    </h3>
                    <button
                      onClick={() => handleTabChange('satellites')}
                      className="text-nebula-300 hover:text-nebula-200 text-sm transition-colors"
                    >
                      View All &rarr;
                    </button>
                  </div>
                  <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {data?.notableSatellites?.map((sat) => (
                      <StaggerItem key={sat.id}>
                        <SatelliteCard satellite={sat} />
                      </StaggerItem>
                    ))}
                  </StaggerContainer>
                </div>

                {/* Footer Ad */}
                <div className="my-6">
                  <AdSlot position="footer" module="satellite-tracker" />
                </div>

                {/* Data Sources */}
                <ScrollReveal>
                <div className="card p-5 border-dashed">
                  <h3 className="text-lg font-semibold text-slate-900 mb-3">Data Sources</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-slate-400">
                    <div>
                      <h4 className="text-slate-900 font-medium mb-2">Tracking Data</h4>
                      <ul className="space-y-1">
                        <li>CelesTrak TLE Catalog</li>
                        <li>Space-Track.org Conjunction Data</li>
                        <li>N2YO Real-time Tracking</li>
                        <li>NORAD Two-Line Element Sets</li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="text-slate-900 font-medium mb-2">Satellite Registries</h4>
                      <ul className="space-y-1">
                        <li>UCS Satellite Database</li>
                        <li>NASA NSSDCA Master Catalog</li>
                        <li>ESA DISCOS Database</li>
                        <li>ITU Space Network List</li>
                      </ul>
                    </div>
                  </div>
                </div>
                </ScrollReveal>
              </div>
            )}

            {/* ──────────────── SATELLITES TAB ──────────────── */}
            {activeTab === 'satellites' && (
              <div>
                {/* Filters */}
                <div className="card p-4 mb-6">
                  <div className="flex flex-wrap items-center gap-4">
                    {/* Search */}
                    <div className="flex-1 min-w-[200px]">
                      <input
                        type="text"
                        aria-label="Search by name, NORAD ID, or operator"
                        placeholder="Search by name, NORAD ID, or operator..."
                        value={searchQuery}
                        onChange={(e) => handleSearch(e.target.value)}
                        className="w-full px-4 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-nebula-500 focus:ring-1 focus:ring-nebula-500 text-sm"
                      />
                    </div>

                    {/* Orbit Filter */}
                    <div className="flex items-center gap-2">
                      <label htmlFor="satellite-orbit-filter" className="text-slate-400 text-sm">Orbit:</label>
                      <select
                        id="satellite-orbit-filter"
                        value={orbitFilter}
                        onChange={(e) => handleOrbitFilterChange(e.target.value as OrbitType | '')}
                        className="px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 text-sm focus:outline-none focus:border-nebula-500"
                      >
                        <option value="">All Orbits</option>
                        {ORBIT_TYPES.map((orbit) => (
                          <option key={orbit.value} value={orbit.value}>
                            {orbit.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Status Filter */}
                    <div className="flex items-center gap-2">
                      <label htmlFor="satellite-status-filter" className="text-slate-400 text-sm">Status:</label>
                      <select
                        id="satellite-status-filter"
                        value={statusFilter}
                        onChange={(e) => handleStatusFilterChange(e.target.value as SatelliteStatus | '')}
                        className="px-3 py-2 rounded-lg bg-slate-50 border border-slate-200 text-slate-900 text-sm focus:outline-none focus:border-nebula-500"
                      >
                        <option value="">All Status</option>
                        {STATUS_OPTIONS.map((status) => (
                          <option key={status.value} value={status.value}>
                            {status.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Results Count */}
                <div className="mb-4 text-slate-400 text-sm">
                  Showing {satellites.length} of {data?.total || 0} satellites
                  {(orbitFilter || statusFilter || searchQuery) && (
                    <button
                      onClick={() => {
                        setOrbitFilter('');
                        setStatusFilter('');
                        setSearchQuery('');
                        updateUrl({ orbit: '', status: '', search: '' });
                      }}
                      className="ml-2 text-nebula-300 hover:text-nebula-200"
                    >
                      Clear filters
                    </button>
                  )}
                </div>

                {/* Satellite Grid */}
                {satellites.length === 0 ? (
                  <div className="text-center py-16">
                    <span className="text-5xl block mb-3">🔍</span>
                    <h3 className="text-xl font-semibold text-slate-900 mb-2">No Satellites Found</h3>
                    <p className="text-slate-400">
                      Try adjusting your search or filters.
                    </p>
                  </div>
                ) : (
                  <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {satellites.map((sat) => (
                      <StaggerItem key={sat.id}>
                        <SatelliteCard satellite={sat} />
                      </StaggerItem>
                    ))}
                  </StaggerContainer>
                )}
              </div>
            )}

            {/* ──────────────── OPERATORS TAB ──────────────── */}
            {activeTab === 'operators' && (
              <div className="space-y-6">
                {/* Operator Summary */}
                <div className="card p-5">
                  <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                    <span>🏢</span> Top Satellite Operators
                  </h3>
                  <div className="space-y-4">
                    {stats?.topOperators.map((operator, idx) => {
                      const total = stats?.total || 1;
                      const pct = (operator.count / total) * 100;
                      return (
                        <div key={operator.name}>
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <span className="text-slate-400 text-sm font-mono">#{idx + 1}</span>
                              <span className="text-slate-900 font-medium">{operator.name}</span>
                            </div>
                            <span className="text-slate-400 text-sm font-medium">
                              {operator.count} satellites ({pct.toFixed(1)}%)
                            </span>
                          </div>
                          <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-nebula-500 to-plasma-400 rounded-full transition-all"
                              style={{ width: `${Math.min(pct * 3, 100)}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Link to Orbital Slots */}
                <div className="card p-5 border border-nebula-500/30 bg-gradient-to-br from-nebula-900/10 to-transparent">
                  <div className="flex items-center justify-between flex-wrap gap-4">
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900 mb-1">
                        Want more operator details?
                      </h3>
                      <p className="text-slate-400 text-sm">
                        Check out the Orbital Slots page for detailed operator fleet compositions, growth projections, and orbital distribution.
                      </p>
                    </div>
                    <Link
                      href="/orbital-slots?tab=operators"
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-nebula-500 text-white font-medium hover:bg-nebula-600 transition-colors"
                    >
                      View Orbital Slots
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                      </svg>
                    </Link>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// Main Page with Suspense
export default function SatellitesPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex justify-center py-20">
          <LoadingSpinner size="lg" />
        </div>
      }
    >
      <SatelliteTrackerContent />
    </Suspense>
  );
}
