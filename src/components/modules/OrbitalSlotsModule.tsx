'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  OrbitalSlot,
  SatelliteOperator,
  OrbitalEvent,
  ORBIT_TYPES,
  CONGESTION_LEVEL_INFO,
  COUNTRY_INFO,
} from '@/types';

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

export default function OrbitalSlotsModule() {
  const [data, setData] = useState<OrbitalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        await fetch('/api/orbital-slots/init', { method: 'POST' });
        const res = await fetch('/api/orbital-slots');
        const result = await res.json();

        if (result.error) {
          throw new Error(result.error);
        }

        setData(result);
      } catch (err) {
        console.error('Failed to fetch orbital data:', err);
        setError('Failed to load orbital data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-display font-bold text-slate-800 flex items-center">
            <span className="text-3xl mr-3">🛰️</span>
            Orbital Slots
          </h2>
        </div>
        <div className="card p-8 text-center">
          <div className="w-10 h-10 border-3 border-nebula-500 border-t-transparent rounded-full animate-spin mx-auto" style={{ borderWidth: '3px' }} />
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
            Orbital Slots
          </h2>
        </div>
        <div className="card p-8 text-center">
          <span className="text-4xl block mb-4">⚠️</span>
          <p className="text-slate-500">{error || 'No data available'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-display font-bold text-white flex items-center">
          <span className="text-3xl mr-3">🛰️</span>
          Orbital Slots
        </h2>
        <Link
          href="/orbital-slots"
          className="text-nebula-300 hover:text-nebula-200 transition-colors text-sm"
        >
          Full Dashboard →
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card p-4 text-center">
          <div className="text-3xl font-bold text-slate-800">
            {data.stats.totalActive.toLocaleString()}
          </div>
          <div className="text-slate-500 text-sm">Active Satellites</div>
        </div>
        <div className="card p-4 text-center">
          <div className="text-3xl font-bold text-yellow-400">
            {data.stats.totalInactive.toLocaleString()}
          </div>
          <div className="text-slate-500 text-sm">Inactive</div>
        </div>
        <div className="card p-4 text-center">
          <div className="text-3xl font-bold text-red-400">
            {data.stats.totalDebris.toLocaleString()}
          </div>
          <div className="text-slate-500 text-sm">Debris Objects</div>
        </div>
        <div className="card p-4 text-center">
          <div className="text-3xl font-bold text-green-400">
            +{data.stats.growth1Year.toLocaleString()}
          </div>
          <div className="text-slate-500 text-sm">1-Year Growth</div>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Orbit Breakdown */}
        <div className="lg:col-span-2 card p-4">
          <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <span>🌐</span> Satellites by Orbit
          </h3>
          <div className="space-y-3">
            {data.slots.slice(0, 5).map((slot) => {
              const orbitInfo = ORBIT_TYPES.find(o => o.value === slot.orbitType);
              const congestion = slot.congestionLevel ? CONGESTION_LEVEL_INFO[slot.congestionLevel] : null;
              const total = slot.activeSatellites + slot.inactiveSatellites;
              const activePercent = total > 0 ? (slot.activeSatellites / total) * 100 : 0;

              return (
                <div key={slot.id} className="p-3 bg-slate-50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{orbitInfo?.icon || '🛰️'}</span>
                      <div>
                        <span className="text-slate-800 font-medium">{slot.orbitName}</span>
                        <span className="text-slate-500 text-sm ml-2">({orbitInfo?.altitude})</span>
                      </div>
                    </div>
                    {congestion && (
                      <span className={`text-xs px-2 py-0.5 rounded ${congestion.color}`}
                            style={{ backgroundColor: `${congestion.bgColor}20` }}>
                        {congestion.label}
                      </span>
                    )}
                  </div>

                  {/* Bar visualization */}
                  <div className="h-4 bg-slate-200 rounded-full overflow-hidden mb-2">
                    <div
                      className="h-full bg-gradient-to-r from-green-500 to-green-400"
                      style={{ width: `${Math.min(activePercent, 100)}%` }}
                    />
                  </div>

                  <div className="flex justify-between text-xs text-slate-500">
                    <span>Active: {slot.activeSatellites.toLocaleString()}</span>
                    <span>Inactive: {slot.inactiveSatellites.toLocaleString()}</span>
                    <span>Debris: {slot.debrisCount.toLocaleString()}</span>
                  </div>

                  {/* Projections */}
                  <div className="flex gap-4 mt-2 pt-2 border-t border-slate-200 text-xs">
                    <span className="text-slate-500">
                      1Y: <span className="text-green-400">+{(slot.projected1Year - slot.activeSatellites).toLocaleString()}</span>
                    </span>
                    <span className="text-slate-500">
                      5Y: <span className="text-blue-400">+{(slot.projected5Year - slot.activeSatellites).toLocaleString()}</span>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top Operators & Upcoming Events */}
        <div className="space-y-6">
          {/* Top Operators */}
          <div className="card p-4">
            <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <span>🏆</span> Top Operators
            </h3>
            <div className="space-y-3">
              {data.operators.slice(0, 5).map((operator, idx) => {
                const countryInfo = COUNTRY_INFO[operator.country as keyof typeof COUNTRY_INFO];

                return (
                  <div key={operator.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-slate-400 text-sm w-4">{idx + 1}.</span>
                      <span className="text-lg">{countryInfo?.flag || '🌍'}</span>
                      <div>
                        <div className="text-slate-800 text-sm">{operator.name}</div>
                        {operator.constellationName && (
                          <div className="text-slate-500 text-xs">{operator.constellationName}</div>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-slate-800 font-medium">{operator.totalActive.toLocaleString()}</div>
                      <div className="text-slate-500 text-xs">satellites</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Upcoming Events */}
          <div className="card p-4">
            <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <span>📅</span> Upcoming Launches
            </h3>
            <div className="space-y-3">
              {data.events
                .filter(e => e.eventType === 'launch')
                .slice(0, 3)
                .map((event) => {
                  const date = new Date(event.expectedDate);

                  return (
                    <div key={event.id} className="p-3 bg-slate-50 rounded-lg">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="text-slate-800 text-sm font-medium">
                            {event.missionName || 'Unknown Mission'}
                          </div>
                          <div className="text-slate-500 text-xs">
                            {event.operatorName} • {event.satelliteCount} sat{event.satelliteCount !== 1 ? 's' : ''}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-slate-600 text-sm">
                            {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </div>
                          <div className="text-slate-500 text-xs">{event.orbitType}</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      </div>

      {/* 5-Year Projection Summary */}
      <div className="card p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
              <span>📈</span> 5-Year Projection
            </h3>
            <p className="text-slate-500 text-sm mt-1">
              Expected satellite population growth from {data.stats.totalActive.toLocaleString()} to {data.stats.projected5Year.toLocaleString()}
            </p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-blue-400">
              +{(data.stats.totalActive > 0 ? (data.stats.growth5Year / data.stats.totalActive) * 100 : 0).toFixed(0)}%
            </div>
            <div className="text-slate-500 text-sm">Growth</div>
          </div>
        </div>
      </div>
    </div>
  );
}
