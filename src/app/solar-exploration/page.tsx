'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import {
  PlanetaryBody,
  SurfaceLander,
  LANDER_STATUS_INFO,
  LANDER_MISSION_TYPES,
  SPACE_AGENCIES,
} from '@/types';
import PageHeader from '@/components/ui/PageHeader';

// Dynamic import for 3D scene (client-side only)
const PlanetaryScene = dynamic(
  () => import('@/components/modules/solar-exploration/PlanetaryScene'),
  {
    ssr: false,
    loading: () => (
      <div className="h-[500px] flex items-center justify-center bg-space-800/50 rounded-lg">
        <div className="text-center">
          <div
            className="w-10 h-10 border-3 border-nebula-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"
            style={{ borderWidth: '3px' }}
          />
          <p className="text-star-400 text-sm">Loading 3D visualization...</p>
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

function SolarExplorationContent() {
  const searchParams = useSearchParams();
  const bodyParam = searchParams.get('body');

  const [bodies, setBodies] = useState<PlanetaryBody[]>([]);
  const [selectedBodySlug, setSelectedBodySlug] = useState<string>(bodyParam || 'mars');
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<string | null>(null);

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
        <PageHeader title="Solar System Exploration" subtitle="Interactive 3D visualization of planetary bodies with rover and lander locations" breadcrumbs={[{label: 'Home', href: '/'}, {label: 'Solar Exploration'}]} />

        {/* Stats Overview */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="card-elevated p-6 text-center">
              <div className="text-4xl font-bold font-display tracking-tight text-white">{stats.totalBodies}</div>
              <div className="text-star-400 text-xs uppercase tracking-widest font-medium">Bodies Explored</div>
            </div>
            <div className="card-elevated p-6 text-center">
              <div className="text-4xl font-bold font-display tracking-tight text-white">{stats.totalLanders}</div>
              <div className="text-star-400 text-xs uppercase tracking-widest font-medium">Total Missions</div>
            </div>
            <div className="card-elevated p-6 text-center">
              <div className="text-4xl font-bold font-display tracking-tight text-green-400">{stats.activeLanders}</div>
              <div className="text-star-400 text-xs uppercase tracking-widest font-medium">Active Missions</div>
            </div>
            <div className="card-elevated p-6 text-center">
              <div className="text-4xl font-bold font-display tracking-tight text-blue-400">{stats.completedLanders}</div>
              <div className="text-star-400 text-xs uppercase tracking-widest font-medium">Completed</div>
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
                  ? 'bg-white/[0.1] text-white border-white/[0.15] shadow-glow-sm'
                  : 'bg-transparent text-star-300 border border-white/[0.06] hover:border-white/[0.1]'
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
              <div className="card overflow-hidden">
                <PlanetaryScene body={selectedBody} height="500px" />
              </div>

              {/* Body Info */}
              <div className="card p-6 mt-6">
                <h2 className="text-2xl font-semibold text-white mb-2">{selectedBody.name}</h2>
                <div className="flex flex-wrap gap-4 text-star-400 text-sm mb-4">
                  <span className="capitalize">{selectedBody.type}</span>
                  <span>Diameter: {selectedBody.diameter.toLocaleString()} km</span>
                  {selectedBody.landers && (
                    <span>{selectedBody.landers.length} landing sites</span>
                  )}
                </div>
                {selectedBody.description && (
                  <p className="text-star-300">{selectedBody.description}</p>
                )}
              </div>
            </div>

            {/* Landers List */}
            <div className="xl:col-span-1">
              <div className="card p-4 sticky top-20">
                <h3 className="text-lg font-semibold text-white mb-4">
                  Surface Missions ({filteredLanders.length})
                </h3>

                {/* Filters */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {/* Status Filter */}
                  <select
                    value={statusFilter || ''}
                    onChange={(e) => setStatusFilter(e.target.value || null)}
                    className="bg-space-700 text-star-200 text-sm rounded px-3 py-1.5 border border-space-600"
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
                    className="bg-space-700 text-star-200 text-sm rounded px-3 py-1.5 border border-space-600"
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
                    <p className="text-star-400 text-center py-4">No missions match filters</p>
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
    <div className="bg-space-700/30 rounded-lg p-3 border border-space-600/50 hover:border-space-500 transition-colors">
      <div className="flex items-start justify-between mb-2">
        <div>
          <h4 className="text-white font-medium">{lander.name}</h4>
          <div className="flex items-center gap-2 text-star-400 text-xs mt-0.5">
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
        <p className="text-star-300 text-xs mb-1">
          <span className="text-star-400">Site:</span> {lander.landingSite}
        </p>
      )}

      <div className="flex justify-between text-xs text-star-400">
        <span>
          {lander.latitude.toFixed(2)}°{lander.latitude >= 0 ? 'N' : 'S'},{' '}
          {Math.abs(lander.longitude).toFixed(2)}°{lander.longitude >= 0 ? 'E' : 'W'}
        </span>
        <span>{formatDate(lander.landingDate)}</span>
      </div>

      {lander.description && (
        <p className="text-star-400 text-xs mt-2 line-clamp-2">{lander.description}</p>
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
