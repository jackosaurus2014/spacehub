'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

// Types
type OrbitType = 'LEO' | 'MEO' | 'GEO' | 'HEO' | 'SSO' | 'Polar';
type SatelliteStatus = 'active' | 'inactive' | 'deorbited';

interface Satellite {
  id: string;
  name: string;
  noradId: string;
  orbitType: OrbitType;
  altitude: number;
  velocity: number;
  operator: string;
  country: string;
  launchDate: string;
  status: SatelliteStatus;
  purpose: string;
  mass: number | null;
  period: number | null;
  inclination: number | null;
  apogee: number | null;
  perigee: number | null;
  description: string | null;
}

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

// Status styling
const STATUS_STYLES: Record<SatelliteStatus, { bg: string; text: string; label: string }> = {
  active: { bg: 'bg-green-900/30', text: 'text-green-400', label: 'Active' },
  inactive: { bg: 'bg-yellow-900/30', text: 'text-yellow-400', label: 'Inactive' },
  deorbited: { bg: 'bg-red-900/30', text: 'text-red-400', label: 'Deorbited' },
};

// Purpose icons
const PURPOSE_ICONS: Record<string, string> = {
  'Space Station': '🏠',
  'Communications': '📶',
  'Navigation': '🧭',
  'Weather': '🌤️',
  'Earth Observation': '🌍',
  'Research': '🔬',
  'Reconnaissance': '🛡️',
};

export default function SatelliteTrackerModule() {
  const [data, setData] = useState<SatelliteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      const res = await fetch('/api/satellites?limit=5');
      const result = await res.json();

      if (result.error) {
        throw new Error(result.error);
      }

      setData(result);
    } catch (err) {
      console.error('Failed to fetch satellite data:', err);
      setError('Failed to load satellite data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-display font-bold text-slate-800 flex items-center">
            <span className="text-3xl mr-3">🛰️</span>
            Satellite Tracker
          </h2>
        </div>
        <div className="card p-8 text-center">
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-display font-bold text-slate-800 flex items-center">
            <span className="text-3xl mr-3">🛰️</span>
            Satellite Tracker
          </h2>
        </div>
        <div className="card p-8 text-center">
          <span className="text-4xl block mb-4">⚠️</span>
          <p className="text-slate-500">{error || 'No data available'}</p>
        </div>
      </div>
    );
  }

  const { stats, iss, notableSatellites } = data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-display font-bold text-white flex items-center">
          <span className="text-3xl mr-3">🛰️</span>
          Satellite Tracker
        </h2>
        <Link
          href="/satellites"
          className="text-nebula-300 hover:text-nebula-200 transition-colors text-sm"
        >
          Full Tracker &rarr;
        </Link>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4" role="region" aria-label="Satellite statistics">
        <span className="sr-only">
          {`Satellite statistics: ${stats.total.toLocaleString()} total satellites, ${stats.byStatus.active.toLocaleString()} active, ${stats.byOrbitType.LEO.toLocaleString()} in low Earth orbit, ${stats.byOrbitType.GEO.toLocaleString()} in geostationary orbit`}
        </span>
        <div className="card p-4 text-center">
          <div className="text-3xl font-bold text-slate-800">
            {stats.total.toLocaleString()}
          </div>
          <div className="text-slate-500 text-sm">Total Satellites</div>
        </div>
        <div className="card p-4 text-center">
          <div className="text-3xl font-bold text-green-500">
            {stats.byStatus.active.toLocaleString()}
          </div>
          <div className="text-slate-500 text-sm">Active</div>
        </div>
        <div className="card p-4 text-center">
          <div className="text-3xl font-bold text-blue-500">
            {stats.byOrbitType.LEO.toLocaleString()}
          </div>
          <div className="text-slate-500 text-sm">LEO</div>
        </div>
        <div className="card p-4 text-center">
          <div className="text-3xl font-bold text-amber-500">
            {stats.byOrbitType.GEO.toLocaleString()}
          </div>
          <div className="text-slate-500 text-sm">GEO</div>
        </div>
      </div>

      {/* ISS Highlight */}
      {iss && (
        <div className="card p-5 border border-nebula-500/50 bg-gradient-to-br from-nebula-900/20 to-transparent">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-nebula-500/20 flex items-center justify-center text-2xl border border-nebula-500/30">
                🏠
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-white">{iss.name}</h3>
                  <span className="px-2 py-0.5 rounded text-xs font-medium bg-green-900/30 text-green-400 border border-green-500/30">
                    Live
                  </span>
                </div>
                <p className="text-slate-400 text-sm">{iss.operator}</p>
              </div>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <div className="text-center">
                <div className="text-lg font-bold text-white">{iss.altitude.toLocaleString()} km</div>
                <div className="text-slate-500 text-xs">Altitude</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-nebula-300">{iss.velocity.toFixed(2)} km/s</div>
                <div className="text-slate-500 text-xs">Velocity</div>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 mt-4 pt-3 border-t border-slate-700">
            <a
              href={`https://www.n2yo.com/satellite/?s=${iss.noradId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 transition-colors border border-blue-500/30"
            >
              Track Live
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
            <a
              href="https://spotthestation.nasa.gov/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium bg-green-500/20 text-green-300 hover:bg-green-500/30 transition-colors border border-green-500/30"
            >
              Spot the Station
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </div>
        </div>
      )}

      {/* Notable Satellites */}
      <div className="card p-4">
        <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
          <span>⭐</span> Notable Satellites
        </h3>
        <div className="space-y-3">
          {notableSatellites.slice(0, 5).map((sat) => {
            const statusStyle = STATUS_STYLES[sat.status];
            const purposeIcon = PURPOSE_ICONS[sat.purpose] || '🛰️';
            return (
              <div
                key={sat.id}
                className="p-3 rounded-lg border border-slate-200 bg-slate-50/50 hover:bg-slate-100/50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xl flex-shrink-0">{purposeIcon}</span>
                    <div className="min-w-0">
                      <h4 className="font-medium text-slate-800 text-sm truncate">{sat.name}</h4>
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <span>{sat.operator}</span>
                        <span className="text-slate-300">|</span>
                        <span>{sat.orbitType}</span>
                      </div>
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded flex-shrink-0 ${statusStyle.bg} ${statusStyle.text}`}>
                    {statusStyle.label}
                  </span>
                </div>
                <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                  <span>Alt: <span className="text-slate-700 font-medium">{sat.altitude.toLocaleString()} km</span></span>
                  <span>Vel: <span className="text-slate-700 font-medium">{sat.velocity.toFixed(2)} km/s</span></span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Top Operators */}
      <div className="card p-4">
        <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
          <span>🏢</span> Top Operators
        </h3>
        <span className="sr-only">
          {`Top satellite operators: ${stats.topOperators.slice(0, 5).map((op, i) => `${i + 1}. ${op.name} with ${op.count} satellites (${((op.count / stats.total) * 100).toFixed(1)}%)`).join(', ')}`}
        </span>
        <div className="space-y-2" aria-hidden="true">
          {stats.topOperators.slice(0, 5).map((operator, idx) => {
            const pct = (operator.count / stats.total) * 100;
            return (
              <div key={operator.name} className="flex items-center gap-3">
                <span className="text-slate-400 text-xs font-mono w-5">#{idx + 1}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-slate-700 text-sm font-medium truncate">{operator.name}</span>
                    <span className="text-slate-500 text-xs">{operator.count}</span>
                  </div>
                  <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-nebula-500 to-plasma-400 rounded-full"
                      style={{ width: `${Math.min(pct * 4, 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Cross-module links */}
      <div className="flex flex-wrap gap-2">
        <Link
          href="/orbital-slots"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium bg-nebula-500/20 text-nebula-300 hover:bg-nebula-500/30 transition-colors border border-nebula-500/30"
        >
          View Orbital Slots &rarr;
        </Link>
        <Link
          href="/debris-monitor"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium bg-orange-500/20 text-orange-300 hover:bg-orange-500/30 transition-colors border border-orange-500/30"
        >
          Debris Monitor &rarr;
        </Link>
      </div>
    </div>
  );
}
