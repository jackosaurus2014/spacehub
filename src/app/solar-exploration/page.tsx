'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import {
  PlanetaryBody,
  SurfaceLander,
  LANDER_STATUS_INFO,
  LANDER_MISSION_TYPES,
  SPACE_AGENCIES,
} from '@/types';
import PageHeader from '@/components/ui/PageHeader';
import AnimatedPageHeader from '@/components/ui/AnimatedPageHeader';
import ScrollReveal, { StaggerContainer, StaggerItem } from '@/components/ui/ScrollReveal';
import ExportButton from '@/components/ui/ExportButton';

// Dynamic import for 3D scene (client-side only)
const PlanetaryScene = dynamic(
  () => import('@/components/modules/solar-exploration/PlanetaryScene'),
  {
    ssr: false,
    loading: () => (
      <div className="h-[500px] flex items-center justify-center bg-slate-50 rounded-lg">
        <div className="text-center">
          <div
            className="w-10 h-10 border-3 border-nebula-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"
            style={{ borderWidth: '3px' }}
          />
          <p className="text-slate-400 text-sm">Loading 3D visualization...</p>
        </div>
      </div>
    ),
  }
);

interface Stats {
  totalBodies: number;
  totalLanders: number;
  activeLanders: number;
  completedLanders: number;
  landersByBody: { bodyId: string; bodyName: string; bodySlug: string; count: number }[];
  landersByStatus: { status: string; count: number }[];
}

interface Exoplanet {
  pl_name: string;
  hostname: string;
  disc_year: number;
  disc_facility: string;
  disc_method: string;
  pl_orbper: number | null;
  pl_rade: number | null;
  pl_bmasse: number | null;
  pl_eqt: number | null;
  sy_dist: number | null;
  pl_orbsmax: number | null;
  st_spectype: string | null;
  habitable_zone: boolean;
}

function SolarExplorationContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const bodyParam = searchParams.get('body');
  const initialStatus = searchParams.get('status');
  const initialType = searchParams.get('type');

  const [bodies, setBodies] = useState<PlanetaryBody[]>([]);
  const [selectedBodySlug, setSelectedBodySlug] = useState<string>(bodyParam || 'mars');
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string | null>(initialStatus);
  const [typeFilter, setTypeFilter] = useState<string | null>(initialType);
  const [exoplanets, setExoplanets] = useState<Exoplanet[]>([]);
  const [exoplanetsLoading, setExoplanetsLoading] = useState(true);

  // Fetch exoplanet data from DynamicContent system
  useEffect(() => {
    async function fetchExoplanets() {
      try {
        const res = await fetch('/api/content/solar-exploration?section=exoplanets');
        if (!res.ok) throw new Error('Failed to fetch exoplanets');
        const json = await res.json();
        setExoplanets(json.data || []);
      } catch (err) {
        console.error('Failed to fetch exoplanets:', err);
      } finally {
        setExoplanetsLoading(false);
      }
    }
    fetchExoplanets();
  }, []);

  // Sync filters to URL
  useEffect(() => {
    const params = new URLSearchParams();
    if (selectedBodySlug && selectedBodySlug !== 'mars') params.set('body', selectedBodySlug);
    if (statusFilter) params.set('status', statusFilter);
    if (typeFilter) params.set('type', typeFilter);
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [selectedBodySlug, statusFilter, typeFilter, router, pathname]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Initialize data first
        await fetch('/api/solar-exploration/init', { method: 'POST' });

        // Fetch bodies and stats in parallel
        const [bodiesRes, statsRes] = await Promise.all([
          fetch('/api/solar-exploration'),
          fetch('/api/solar-exploration/stats'),
        ]);

        const bodiesData = await bodiesRes.json();
        const statsData = await statsRes.json();

        if (bodiesData.bodies) {
          setBodies(bodiesData.bodies);
          if (!bodyParam && bodiesData.bodies.length > 0) {
            setSelectedBodySlug(bodiesData.bodies[0].slug);
          }
        }

        if (statsData.stats) {
          setStats(statsData.stats);
        }
      } catch (err) {
        console.error('Failed to fetch data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [bodyParam]);

  const selectedBody = bodies.find((b) => b.slug === selectedBodySlug);

  // Filter landers
  const filteredLanders =
    selectedBody?.landers?.filter((lander) => {
      if (statusFilter && lander.status !== statusFilter) return false;
      if (typeFilter && lander.missionType !== typeFilter) return false;
      return true;
    }) || [];

  const formatDate = (date: Date | null) => {
    if (!date) return 'Unknown';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-center py-20">
            <div
              className="w-12 h-12 border-3 border-nebula-500 border-t-transparent rounded-full animate-spin"
              style={{ borderWidth: '3px' }}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4">
        <AnimatedPageHeader title="Solar System Exploration" subtitle="Interactive 3D visualization of planetary bodies with rover and lander locations" icon="🌌" accentColor="purple" />

        {/* Stats Overview */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="card-elevated p-6 text-center">
              <div className="text-4xl font-bold font-display tracking-tight text-slate-900">{stats.totalBodies}</div>
              <div className="text-slate-400 text-xs uppercase tracking-widest font-medium">Bodies Explored</div>
            </div>
            <div className="card-elevated p-6 text-center">
              <div className="text-4xl font-bold font-display tracking-tight text-slate-900">{stats.totalLanders}</div>
              <div className="text-slate-400 text-xs uppercase tracking-widest font-medium">Total Missions</div>
            </div>
            <div className="card-elevated p-6 text-center">
              <div className="text-4xl font-bold font-display tracking-tight text-green-400">{stats.activeLanders}</div>
              <div className="text-slate-400 text-xs uppercase tracking-widest font-medium">Active Missions</div>
            </div>
            <div className="card-elevated p-6 text-center">
              <div className="text-4xl font-bold font-display tracking-tight text-blue-400">{stats.completedLanders}</div>
              <div className="text-slate-400 text-xs uppercase tracking-widest font-medium">Completed</div>
            </div>
          </div>
        )}

        {/* Body Selector */}
        <div className="flex flex-wrap gap-3 mb-6">
          {bodies.map((body) => (
            <button
              key={body.slug}
              onClick={() => setSelectedBodySlug(body.slug)}
              className={`px-5 py-3 rounded-lg font-medium transition-all ${
                selectedBodySlug === body.slug
                  ? 'bg-slate-100 text-slate-900 border-slate-200 shadow-glow-sm'
                  : 'bg-transparent text-slate-400 border border-slate-200 hover:border-slate-300'
              }`}
            >
              {body.name}
              <span className="ml-2 text-sm opacity-70">({body.landers?.length || 0})</span>
            </button>
          ))}
        </div>

        {/* Main Content */}
        {selectedBody && (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {/* 3D Viewer */}
            <div className="xl:col-span-2">
              <div className="card overflow-visible">
                <PlanetaryScene body={selectedBody} height="500px" />
              </div>

              {/* Body Info */}
              <div className="card p-6 mt-6">
                <h2 className="text-2xl font-semibold text-slate-900 mb-2">{selectedBody.name}</h2>
                <div className="flex flex-wrap gap-4 text-slate-400 text-sm mb-4">
                  <span className="capitalize">{selectedBody.type}</span>
                  <span>Diameter: {selectedBody.diameter.toLocaleString()} km</span>
                  {selectedBody.landers && (
                    <span>{selectedBody.landers.length} landing sites</span>
                  )}
                </div>
                {selectedBody.description && (
                  <p className="text-slate-400">{selectedBody.description}</p>
                )}
              </div>
            </div>

            {/* Landers List */}
            <div className="xl:col-span-1">
              <div className="card p-4 sticky top-20">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-slate-900">
                    Surface Missions ({filteredLanders.length})
                  </h3>
                  <ExportButton
                    data={filteredLanders.map((l) => ({
                      name: l.name,
                      status: l.status,
                      missionType: l.missionType,
                      agency: l.agency || '',
                      country: l.country || '',
                      landingSite: l.landingSite || '',
                      latitude: l.latitude,
                      longitude: l.longitude,
                      landingDate: l.landingDate ? new Date(l.landingDate).toISOString() : '',
                      description: l.description || '',
                    }))}
                    filename={`${selectedBodySlug}-missions`}
                    columns={[
                      { key: 'name', label: 'Name' },
                      { key: 'status', label: 'Status' },
                      { key: 'missionType', label: 'Mission Type' },
                      { key: 'agency', label: 'Agency' },
                      { key: 'landingSite', label: 'Landing Site' },
                      { key: 'landingDate', label: 'Landing Date' },
                      { key: 'description', label: 'Description' },
                    ]}
                  />
                </div>

                {/* Filters */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {/* Status Filter */}
                  <select
                    value={statusFilter || ''}
                    onChange={(e) => setStatusFilter(e.target.value || null)}
                    className="bg-slate-100 text-slate-600 text-sm rounded px-3 py-1.5 border border-slate-200"
                  >
                    <option value="">All Status</option>
                    {Object.entries(LANDER_STATUS_INFO).map(([value, info]) => (
                      <option key={value} value={value}>
                        {info.label}
                      </option>
                    ))}
                  </select>

                  {/* Type Filter */}
                  <select
                    value={typeFilter || ''}
                    onChange={(e) => setTypeFilter(e.target.value || null)}
                    className="bg-slate-100 text-slate-600 text-sm rounded px-3 py-1.5 border border-slate-200"
                  >
                    <option value="">All Types</option>
                    {LANDER_MISSION_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.icon} {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Landers List */}
                <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
                  {filteredLanders.length === 0 ? (
                    <p className="text-slate-400 text-center py-4">No missions match filters</p>
                  ) : (
                    filteredLanders.map((lander) => (
                      <LanderCard key={lander.id} lander={lander} formatDate={formatDate} />
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Confirmed Exoplanets */}
        <ScrollReveal>
          <div className="card p-6 mt-8">
            <h3 className="text-xl font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <span>🪐</span> Confirmed Exoplanets
            </h3>

            {exoplanetsLoading ? (
              <div className="flex items-center justify-center py-8">
                <div
                  className="w-8 h-8 border-3 border-nebula-500 border-t-transparent rounded-full animate-spin"
                  style={{ borderWidth: '3px' }}
                />
              </div>
            ) : exoplanets.length === 0 ? (
              <p className="text-slate-400 text-center py-8">No exoplanet data available yet.</p>
            ) : (
              <>
                {/* Summary Stats */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                  <div className="card-elevated p-4 text-center">
                    <div className="text-3xl font-bold font-display tracking-tight text-slate-900">
                      {exoplanets.length.toLocaleString()}
                    </div>
                    <div className="text-slate-400 text-xs uppercase tracking-widest font-medium">Total Exoplanets</div>
                  </div>
                  <div className="card-elevated p-4 text-center">
                    <div className="text-3xl font-bold font-display tracking-tight text-green-500">
                      {exoplanets.filter((p) => p.habitable_zone).length}
                    </div>
                    <div className="text-slate-400 text-xs uppercase tracking-widest font-medium">Habitable Zone</div>
                  </div>
                  <div className="card-elevated p-4 text-center col-span-2 md:col-span-1">
                    <div className="text-lg font-bold font-display tracking-tight text-slate-900">
                      {(() => {
                        const methods = exoplanets.reduce<Record<string, number>>((acc, p) => {
                          if (p.disc_method) acc[p.disc_method] = (acc[p.disc_method] || 0) + 1;
                          return acc;
                        }, {});
                        const top = Object.entries(methods).sort((a, b) => b[1] - a[1])[0];
                        return top ? top[0] : 'N/A';
                      })()}
                    </div>
                    <div className="text-slate-400 text-xs uppercase tracking-widest font-medium">Top Discovery Method</div>
                  </div>
                </div>

                {/* Exoplanets Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-600/40">
                        <th className="text-left py-2 px-3 text-slate-400 text-xs uppercase tracking-widest font-medium">Planet</th>
                        <th className="text-left py-2 px-3 text-slate-400 text-xs uppercase tracking-widest font-medium">Host Star</th>
                        <th className="text-left py-2 px-3 text-slate-400 text-xs uppercase tracking-widest font-medium">Year</th>
                        <th className="text-left py-2 px-3 text-slate-400 text-xs uppercase tracking-widest font-medium">Method</th>
                        <th className="text-right py-2 px-3 text-slate-400 text-xs uppercase tracking-widest font-medium">Radius (R&#8853;)</th>
                        <th className="text-right py-2 px-3 text-slate-400 text-xs uppercase tracking-widest font-medium">Mass (M&#8853;)</th>
                        <th className="text-right py-2 px-3 text-slate-400 text-xs uppercase tracking-widest font-medium">Temp (K)</th>
                        <th className="text-right py-2 px-3 text-slate-400 text-xs uppercase tracking-widest font-medium">Dist (pc)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {exoplanets.map((planet) => (
                        <tr
                          key={planet.pl_name}
                          className={`border-b border-slate-700/30 hover:bg-slate-700/30 transition-colors ${
                            planet.habitable_zone ? 'bg-green-500/10' : ''
                          }`}
                        >
                          <td className="py-2 px-3 font-medium text-slate-900">
                            <span className="flex items-center gap-2">
                              {planet.pl_name}
                              {planet.habitable_zone && (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-semibold bg-green-500/20 text-green-300">
                                  HZ
                                </span>
                              )}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-slate-600">{planet.hostname}</td>
                          <td className="py-2 px-3 text-slate-600">{planet.disc_year}</td>
                          <td className="py-2 px-3 text-slate-600">{planet.disc_method}</td>
                          <td className="py-2 px-3 text-right text-slate-600">
                            {planet.pl_rade != null ? planet.pl_rade.toFixed(2) : '—'}
                          </td>
                          <td className="py-2 px-3 text-right text-slate-600">
                            {planet.pl_bmasse != null ? planet.pl_bmasse.toFixed(2) : '—'}
                          </td>
                          <td className="py-2 px-3 text-right text-slate-600">
                            {planet.pl_eqt != null ? planet.pl_eqt.toLocaleString() : '—'}
                          </td>
                          <td className="py-2 px-3 text-right text-slate-600">
                            {planet.sy_dist != null ? planet.sy_dist.toFixed(1) : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </ScrollReveal>

        {/* Related Modules */}
        <ScrollReveal><div className="card p-6 mt-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <span>🔗</span> Related Modules
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <Link href="/mission-control?type=moon_mission" className="p-3 rounded-lg bg-slate-100/30 hover:bg-slate-100/50 transition-colors group">
              <div className="text-sm font-medium text-slate-900 group-hover:text-nebula-200">🌙 Moon Missions</div>
              <p className="text-xs text-slate-400 mt-1">Upcoming lunar launch schedule</p>
            </Link>
            <Link href="/mission-control?type=mars_mission" className="p-3 rounded-lg bg-slate-100/30 hover:bg-slate-100/50 transition-colors group">
              <div className="text-sm font-medium text-slate-900 group-hover:text-nebula-200">🔴 Mars Missions</div>
              <p className="text-xs text-slate-400 mt-1">Upcoming Mars launch windows</p>
            </Link>
            <Link href="/resource-exchange" className="p-3 rounded-lg bg-slate-100/30 hover:bg-slate-100/50 transition-colors group">
              <div className="text-sm font-medium text-slate-900 group-hover:text-nebula-200">🚀 Launch Providers</div>
              <p className="text-xs text-slate-400 mt-1">Vehicles and launch services</p>
            </Link>
            <Link href="/space-insurance?tab=policies" className="p-3 rounded-lg bg-slate-100/30 hover:bg-slate-100/50 transition-colors group">
              <div className="text-sm font-medium text-slate-900 group-hover:text-nebula-200">🛡️ Mission Insurance</div>
              <p className="text-xs text-slate-400 mt-1">Coverage for exploration missions</p>
            </Link>
          </div>
        </div></ScrollReveal>
      </div>
    </div>
  );
}

function LanderCard({
  lander,
  formatDate,
}: {
  lander: SurfaceLander;
  formatDate: (date: Date | null) => string;
}) {
  const statusInfo = LANDER_STATUS_INFO[lander.status];
  const agencyInfo = lander.agency ? SPACE_AGENCIES[lander.agency] : null;
  const missionTypeInfo = LANDER_MISSION_TYPES.find((t) => t.value === lander.missionType);

  return (
    <div className="bg-slate-100/30 rounded-lg p-3 border border-slate-200/50 hover:border-space-500 transition-colors">
      <div className="flex items-start justify-between mb-2">
        <div>
          <h4 className="text-slate-900 font-medium">{lander.name}</h4>
          <div className="flex items-center gap-2 text-slate-400 text-xs mt-0.5">
            {agencyInfo && <span>{agencyInfo.flag}</span>}
            <span>{lander.agency || lander.country}</span>
            {missionTypeInfo && <span>• {missionTypeInfo.icon}</span>}
          </div>
        </div>
        <span
          className={`px-2 py-0.5 rounded text-xs font-medium ${statusInfo.color}`}
          style={{ backgroundColor: `${statusInfo.bgColor}20` }}
        >
          {statusInfo.label}
        </span>
      </div>

      {lander.landingSite && (
        <p className="text-slate-400 text-xs mb-1">
          <span className="text-slate-400">Site:</span> {lander.landingSite}
        </p>
      )}

      <div className="flex justify-between text-xs text-slate-400">
        <span>
          {lander.latitude.toFixed(2)}°{lander.latitude >= 0 ? 'N' : 'S'},{' '}
          {Math.abs(lander.longitude).toFixed(2)}°{lander.longitude >= 0 ? 'E' : 'W'}
        </span>
        <span>{formatDate(lander.landingDate)}</span>
      </div>

      {lander.description && (
        <p className="text-slate-400 text-xs mt-2 line-clamp-2">{lander.description}</p>
      )}
    </div>
  );
}

function LoadingFallback() {
  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-center py-20">
          <div
            className="w-12 h-12 border-3 border-nebula-500 border-t-transparent rounded-full animate-spin"
            style={{ borderWidth: '3px' }}
          />
        </div>
      </div>
    </div>
  );
}

export default function SolarExplorationPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <SolarExplorationContent />
    </Suspense>
  );
}
