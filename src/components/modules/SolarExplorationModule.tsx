'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { PlanetaryBody, LANDER_STATUS_INFO } from '@/types';

// Dynamic import for 3D scene (client-side only)
const PlanetaryScene = dynamic(
  () => import('./solar-exploration/PlanetaryScene'),
  { ssr: false, loading: () => <SceneLoading /> }
);

function SceneLoading() {
  return (
    <div className="h-[300px] flex items-center justify-center bg-slate-50 rounded-lg">
      <div className="text-center">
        <div className="w-10 h-10 border-3 border-nebula-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" style={{ borderWidth: '3px' }} />
        <p className="text-slate-500 text-sm">Loading 3D visualization...</p>
      </div>
    </div>
  );
}

export default function SolarExplorationModule() {
  const [bodies, setBodies] = useState<PlanetaryBody[]>([]);
  const [selectedBodySlug, setSelectedBodySlug] = useState<string>('mars');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBodies = async () => {
      try {
        // First try to initialize data
        await fetch('/api/solar-exploration/init', { method: 'POST' });

        // Then fetch bodies
        const res = await fetch('/api/solar-exploration');
        const data = await res.json();

        if (data.bodies && data.bodies.length > 0) {
          setBodies(data.bodies);
          setSelectedBodySlug(data.bodies[0].slug);
        }
      } catch (err) {
        console.error('Failed to fetch planetary bodies:', err);
        setError('Failed to load exploration data');
      } finally {
        setLoading(false);
      }
    };

    fetchBodies();
  }, []);

  const selectedBody = bodies.find(b => b.slug === selectedBodySlug);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-display font-bold text-slate-800 flex items-center">
            <span className="text-3xl mr-3">🌍</span>
            Solar Exploration
          </h2>
        </div>
        <div className="card p-8 text-center">
          <div className="w-10 h-10 border-3 border-nebula-500 border-t-transparent rounded-full animate-spin mx-auto" style={{ borderWidth: '3px' }} />
        </div>
      </div>
    );
  }

  if (error || bodies.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-display font-bold text-slate-800 flex items-center">
            <span className="text-3xl mr-3">🌍</span>
            Solar Exploration
          </h2>
        </div>
        <div className="card p-8 text-center">
          <span className="text-4xl block mb-4">🛸</span>
          <p className="text-slate-500">{error || 'No exploration data available'}</p>
        </div>
      </div>
    );
  }

  // Count landers by status
  const landerStats = selectedBody?.landers?.reduce(
    (acc, lander) => {
      acc[lander.status] = (acc[lander.status] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  ) || {};

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-display font-bold text-white flex items-center">
          <span className="text-3xl mr-3">🌍</span>
          Solar Exploration
        </h2>
        <Link
          href="/solar-exploration"
          className="text-nebula-300 hover:text-nebula-200 transition-colors text-sm"
        >
          Explore All →
        </Link>
      </div>

      {/* Body Selector */}
      <div className="flex flex-wrap gap-2">
        {bodies.map((body) => (
          <button
            key={body.slug}
            onClick={() => setSelectedBodySlug(body.slug)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              selectedBodySlug === body.slug
                ? 'bg-nebula-500 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200'
            }`}
          >
            {body.name}
            <span className="ml-2 text-xs opacity-70">
              ({body.landers?.length || 0})
            </span>
          </button>
        ))}
      </div>

      {/* Main Content */}
      {selectedBody && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 3D Viewer */}
          <div className="lg:col-span-2 card overflow-hidden">
            <PlanetaryScene body={selectedBody} height="350px" />
          </div>

          {/* Info Panel */}
          <div className="card p-4 space-y-4">
            <div>
              <h3 className="text-xl font-semibold text-slate-800 mb-1">{selectedBody.name}</h3>
              <p className="text-slate-500 text-sm capitalize">{selectedBody.type}</p>
            </div>

            {selectedBody.description && (
              <p className="text-slate-500 text-sm">{selectedBody.description}</p>
            )}

            <div className="border-t border-slate-200 pt-4">
              <h4 className="text-slate-600 text-sm font-medium mb-3">Landing Statistics</h4>
              <div className="grid grid-cols-2 gap-3">
                {Object.entries(LANDER_STATUS_INFO).map(([status, info]) => {
                  const count = landerStats[status] || 0;
                  if (count === 0) return null;
                  return (
                    <div key={status} className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${info.bgColor}`} />
                      <span className="text-slate-500 text-sm">
                        {info.label}: {count}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Recent Landers */}
            {selectedBody.landers && selectedBody.landers.length > 0 && (
              <div className="border-t border-slate-200 pt-4">
                <h4 className="text-slate-600 text-sm font-medium mb-3">Recent Missions</h4>
                <div className="space-y-2">
                  {selectedBody.landers.slice(0, 3).map((lander) => {
                    const statusInfo = LANDER_STATUS_INFO[lander.status];
                    return (
                      <div key={lander.id} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${statusInfo.bgColor}`} />
                          <span className="text-slate-600 text-sm">{lander.name}</span>
                        </div>
                        <span className="text-slate-500 text-xs">
                          {lander.agency || lander.country}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* View All Link */}
            <Link
              href={`/solar-exploration?body=${selectedBody.slug}`}
              className="block w-full text-center py-2 bg-slate-100 hover:bg-slate-200 text-nebula-300 rounded-lg text-sm transition-colors"
            >
              View All {selectedBody.name} Missions
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
