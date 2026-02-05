'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { LaunchWindow, CelestialDestination, TransferType } from '@/types';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

interface LaunchWindowsData {
  destinations: CelestialDestination[];
  windows: LaunchWindow[];
  stats: {
    totalDestinations: number;
    upcomingWindows: number;
    nextWindow: {
      destination: string;
      daysUntilOpen: number;
    } | null;
  };
}

const TRANSFER_TYPE_COLORS: Record<TransferType, { bg: string; text: string; label: string }> = {
  hohmann: { bg: 'bg-blue-500/20', text: 'text-blue-400', label: 'Hohmann' },
  direct: { bg: 'bg-green-500/20', text: 'text-green-400', label: 'Direct' },
  gravity_assist: { bg: 'bg-purple-500/20', text: 'text-purple-400', label: 'Gravity Assist' },
  low_energy: { bg: 'bg-cyan-500/20', text: 'text-cyan-400', label: 'Low Energy' },
};

function formatTravelTime(days: number): string {
  if (days < 1) {
    return `${Math.round(days * 24)}h`;
  }
  if (days < 365) {
    return `${Math.round(days)}d`;
  }
  const years = Math.floor(days / 365);
  const remaining = Math.round(days % 365);
  if (remaining === 0) return `${years}y`;
  return `${years}y ${remaining}d`;
}

function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function LaunchWindowsModule() {
  const [data, setData] = useState<LaunchWindowsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [initializing, setInitializing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      const res = await fetch('/api/launch-windows');
      const result = await res.json();

      if (result.error) {
        throw new Error(result.error);
      }

      setData(result);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch launch window data:', err);
      setError('Failed to load launch window data');
    } finally {
      setLoading(false);
    }
  };

  const handleLoadData = async () => {
    setInitializing(true);
    try {
      const res = await fetch('/api/launch-windows/init', { method: 'POST' });
      const result = await res.json();

      if (result.error) {
        throw new Error(result.error);
      }

      await fetchData();
    } catch (err) {
      console.error('Failed to initialize launch window data:', err);
      setError('Failed to initialize data');
    } finally {
      setInitializing(false);
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
            <span className="text-3xl mr-3">🚀</span>
            Launch Windows & Mission Planner
          </h2>
        </div>
        <div className="card p-8 text-center">
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-display font-bold text-slate-800 flex items-center">
            <span className="text-3xl mr-3">🚀</span>
            Launch Windows & Mission Planner
          </h2>
        </div>
        <div className="card p-8 text-center">
          <span className="text-4xl block mb-4">⚠️</span>
          <p className="text-slate-500">{error}</p>
        </div>
      </div>
    );
  }

  const hasData = data && (data.destinations.length > 0 || data.windows.length > 0);

  if (!hasData) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-display font-bold text-slate-800 flex items-center">
            <span className="text-3xl mr-3">🚀</span>
            Launch Windows & Mission Planner
          </h2>
        </div>
        <div className="card p-8 text-center">
          <span className="text-4xl block mb-4">🪐</span>
          <p className="text-slate-500 mb-4">No launch window data available yet</p>
          <button
            onClick={handleLoadData}
            disabled={initializing}
            className="px-6 py-3 bg-nebula-600 hover:bg-nebula-500 disabled:bg-nebula-800 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
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
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-display font-bold text-white flex items-center">
          <span className="text-3xl mr-3">🚀</span>
          Launch Windows & Mission Planner
        </h2>
        <Link
          href="/launch-windows"
          className="text-nebula-300 hover:text-nebula-200 transition-colors text-sm"
        >
          Full Planner →
        </Link>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="card p-4 text-center">
          <div className="text-3xl font-bold text-slate-800">
            {data.stats.totalDestinations}
          </div>
          <div className="text-slate-500 text-sm">Total Destinations</div>
        </div>
        <div className="card p-4 text-center">
          <div className="text-3xl font-bold text-nebula-400">
            {data.stats.upcomingWindows}
          </div>
          <div className="text-slate-500 text-sm">Upcoming Windows</div>
        </div>
        <div className="card p-4 text-center col-span-2 md:col-span-1">
          {data.stats.nextWindow ? (
            <>
              <div className="text-2xl font-bold text-rocket-400">
                {data.stats.nextWindow.daysUntilOpen}d
              </div>
              <div className="text-slate-500 text-sm">
                Next: {data.stats.nextWindow.destination}
              </div>
            </>
          ) : (
            <>
              <div className="text-2xl font-bold text-slate-400">--</div>
              <div className="text-slate-500 text-sm">Next Window</div>
            </>
          )}
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Launch Windows Timeline */}
        <div className="card p-4">
          <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <span>🗓️</span> Upcoming Launch Windows
          </h3>
          <div className="space-y-3">
            {data.windows.length === 0 ? (
              <p className="text-slate-500 text-center py-4">No upcoming windows</p>
            ) : (
              data.windows.slice(0, 6).map((window) => {
                const transferStyle = TRANSFER_TYPE_COLORS[window.transferType] || TRANSFER_TYPE_COLORS.hohmann;
                const windowOpen = new Date(window.windowOpen);
                const now = new Date();
                const daysUntil = Math.ceil((windowOpen.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                const isOpen = daysUntil <= 0;

                return (
                  <div key={window.id} className="p-3 bg-slate-50 rounded-lg">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="text-slate-800 font-medium">{window.destination}</div>
                        <div className="text-slate-500 text-xs mt-0.5">
                          {formatDate(window.windowOpen)} - {formatDate(window.windowClose)}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className={`text-xs px-2 py-0.5 rounded ${transferStyle.bg} ${transferStyle.text}`}>
                          {transferStyle.label}
                        </span>
                        {isOpen ? (
                          <span className="text-xs px-2 py-0.5 rounded bg-green-500/20 text-green-400 animate-pulse">
                            OPEN NOW
                          </span>
                        ) : (
                          <span className="text-xs text-slate-500">
                            in {daysUntil}d
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-4 text-xs text-slate-500">
                      <span>Delta-V: <span className="text-slate-800">{window.deltaV.toFixed(2)} km/s</span></span>
                      <span>Travel: <span className="text-slate-800">{formatTravelTime(window.travelTime)}</span></span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Celestial Destinations Grid */}
        <div className="card p-4">
          <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <span>🪐</span> Celestial Destinations
          </h3>
          <div className="space-y-3">
            {data.destinations.length === 0 ? (
              <p className="text-slate-500 text-center py-4">No destinations available</p>
            ) : (
              data.destinations.slice(0, 6).map((dest) => {
                const successRate = dest.totalMissions > 0
                  ? ((dest.successfulMissions / dest.totalMissions) * 100).toFixed(0)
                  : '--';

                return (
                  <div key={dest.id} className="p-3 bg-slate-50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <span className="text-slate-800 font-medium">{dest.name}</span>
                        <span className="text-slate-400 text-xs ml-2 capitalize">({dest.type})</span>
                      </div>
                      <div className="text-right">
                        <div className="text-slate-600 text-sm">
                          {dest.distanceFromEarth !== null && dest.distanceFromEarth !== undefined
                            ? `${dest.distanceFromEarth} AU`
                            : 'N/A'
                          }
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-4 text-xs text-slate-500">
                      <span>
                        Delta-V to orbit:{' '}
                        <span className="text-slate-800">
                          {dest.deltaVToOrbit !== null && dest.deltaVToOrbit !== undefined
                            ? `${dest.deltaVToOrbit.toFixed(1)} km/s`
                            : 'N/A'
                          }
                        </span>
                      </span>
                      <span>
                        Missions:{' '}
                        <span className="text-slate-800">{dest.totalMissions}</span>
                      </span>
                      <span>
                        Success:{' '}
                        <span className={`${
                          dest.totalMissions === 0 ? 'text-slate-400' :
                          Number(successRate) >= 70 ? 'text-green-400' :
                          Number(successRate) >= 40 ? 'text-yellow-400' :
                          'text-red-400'
                        }`}>
                          {successRate}%
                        </span>
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
