'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import {
  DebrisStats,
  ConjunctionEvent,
  DebrisObject,
  ConjunctionRisk,
} from '@/types';

interface DebrisMonitorData {
  overview: DebrisStats | null;
  conjunctions: ConjunctionEvent[];
  notableDebris: DebrisObject[];
}

const RISK_COLORS: Record<ConjunctionRisk, { bg: string; text: string; border: string; label: string }> = {
  critical: { bg: 'bg-red-900/30', text: 'text-red-400', border: 'border-red-500', label: 'Critical' },
  high: { bg: 'bg-orange-900/30', text: 'text-orange-400', border: 'border-orange-500', label: 'High' },
  moderate: { bg: 'bg-yellow-900/30', text: 'text-yellow-400', border: 'border-yellow-500', label: 'Moderate' },
  low: { bg: 'bg-green-900/30', text: 'text-green-400', border: 'border-green-500', label: 'Low' },
};

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

export default function DebrisMonitorModule() {
  const [data, setData] = useState<DebrisMonitorData | null>(null);
  const [loading, setLoading] = useState(true);
  const [initializing, setInitializing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsInit, setNeedsInit] = useState(false);

  const fetchData = async () => {
    try {
      const res = await fetch('/api/debris-monitor');
      const result = await res.json();

      if (result.error) {
        throw new Error(result.error);
      }

      if (!result.overview && result.conjunctions?.length === 0 && result.notableDebris?.length === 0) {
        setNeedsInit(true);
      } else {
        setNeedsInit(false);
        setData(result);
      }
    } catch (err) {
      console.error('Failed to fetch debris monitor data:', err);
      setError('Failed to load debris monitor data');
    } finally {
      setLoading(false);
    }
  };

  const handleInitialize = async () => {
    setInitializing(true);
    try {
      const res = await fetch('/api/debris-monitor/init', { method: 'POST' });
      const result = await res.json();

      if (result.error) {
        throw new Error(result.error);
      }

      setNeedsInit(false);
      setLoading(true);
      await fetchData();
    } catch (err) {
      console.error('Failed to initialize debris data:', err);
      setError('Failed to initialize debris data');
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
          <h2 className="text-2xl font-display font-bold text-white flex items-center">
            <span className="text-3xl mr-3">&#9888;&#65039;</span>
            Space Debris & Collision Risk Monitor
          </h2>
        </div>
        <div className="card p-8 text-center">
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  if (needsInit) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-display font-bold text-white flex items-center">
            <span className="text-3xl mr-3">&#9888;&#65039;</span>
            Space Debris & Collision Risk Monitor
          </h2>
        </div>
        <div className="card p-8 text-center">
          <span className="text-4xl block mb-4">&#128752;</span>
          <p className="text-star-300 mb-4">No debris tracking data available yet.</p>
          <button
            onClick={handleInitialize}
            disabled={initializing}
            className="px-6 py-3 bg-nebula-500 hover:bg-nebula-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {initializing ? 'Loading Data...' : 'Load Data'}
          </button>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-display font-bold text-white flex items-center">
            <span className="text-3xl mr-3">&#9888;&#65039;</span>
            Space Debris & Collision Risk Monitor
          </h2>
        </div>
        <div className="card p-8 text-center">
          <span className="text-4xl block mb-4">&#9888;&#65039;</span>
          <p className="text-star-300">{error || 'No data available'}</p>
        </div>
      </div>
    );
  }

  const { overview, conjunctions, notableDebris } = data;

  // Compute orbit distribution percentages
  const totalTracked = overview?.totalTracked || 0;
  const leoPercent = totalTracked > 0 ? ((overview?.leoCount || 0) / totalTracked) * 100 : 0;
  const meoPercent = totalTracked > 0 ? ((overview?.meoCount || 0) / totalTracked) * 100 : 0;
  const geoPercent = totalTracked > 0 ? ((overview?.geoCount || 0) / totalTracked) * 100 : 0;

  // Type distribution
  const totalPayloads = overview?.totalPayloads || 0;
  const totalRocketBodies = overview?.totalRocketBodies || 0;
  const totalDebris = overview?.totalDebris || 0;
  const totalUnknown = overview?.totalUnknown || 0;
  const typeTotal = totalPayloads + totalRocketBodies + totalDebris + totalUnknown;

  // 25-year compliance
  const compliant = overview?.compliant25Year || 0;
  const nonCompliant = overview?.nonCompliant || 0;
  const complianceTotal = compliant + nonCompliant;
  const complianceRate = complianceTotal > 0 ? (compliant / complianceTotal) * 100 : 0;

  // Critical events count
  const criticalEvents = conjunctions.filter(c => c.riskLevel === 'critical').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-display font-bold text-white flex items-center">
          <span className="text-3xl mr-3">&#9888;&#65039;</span>
          Space Debris & Collision Risk Monitor
        </h2>
        <Link
          href="/debris-monitor"
          className="text-nebula-300 hover:text-nebula-200 transition-colors text-sm"
        >
          Full Dashboard &rarr;
        </Link>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card p-4 text-center">
          <div className="text-3xl font-bold text-white">
            {totalTracked.toLocaleString()}
          </div>
          <div className="text-star-400 text-sm">Total Tracked Objects</div>
        </div>
        <div className="card p-4 text-center">
          <div className={`text-3xl font-bold ${getKesslerColor(overview?.kesslerRiskIndex || 0)}`}>
            {(overview?.kesslerRiskIndex || 0).toFixed(1)}
          </div>
          <div className="text-star-400 text-sm">Kessler Risk Index</div>
          <div className={`text-xs mt-1 ${getKesslerColor(overview?.kesslerRiskIndex || 0)}`}>
            {getKesslerLabel(overview?.kesslerRiskIndex || 0)}
          </div>
        </div>
        <div className="card p-4 text-center">
          <div className="text-3xl font-bold text-white">
            {(overview?.conjunctionsPerDay || 0).toFixed(1)}
          </div>
          <div className="text-star-400 text-sm">Conjunctions/Day</div>
        </div>
        <div className="card p-4 text-center">
          <div className={`text-3xl font-bold ${criticalEvents > 0 ? 'text-red-400' : 'text-green-400'}`}>
            {criticalEvents}
          </div>
          <div className="text-star-400 text-sm">Critical Events</div>
        </div>
      </div>

      {/* Distribution Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Orbit Distribution */}
        <div className="card p-4">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <span>&#127760;</span> Distribution by Orbit
          </h3>
          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-star-200 text-sm">LEO (Low Earth Orbit)</span>
                <span className="text-star-300 text-sm">{(overview?.leoCount || 0).toLocaleString()} ({leoPercent.toFixed(1)}%)</span>
              </div>
              <div className="h-3 bg-space-600 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-blue-400 rounded-full"
                  style={{ width: `${Math.min(leoPercent, 100)}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-star-200 text-sm">MEO (Medium Earth Orbit)</span>
                <span className="text-star-300 text-sm">{(overview?.meoCount || 0).toLocaleString()} ({meoPercent.toFixed(1)}%)</span>
              </div>
              <div className="h-3 bg-space-600 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-purple-500 to-purple-400 rounded-full"
                  style={{ width: `${Math.min(meoPercent, 100)}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-star-200 text-sm">GEO (Geostationary Orbit)</span>
                <span className="text-star-300 text-sm">{(overview?.geoCount || 0).toLocaleString()} ({geoPercent.toFixed(1)}%)</span>
              </div>
              <div className="h-3 bg-space-600 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-full"
                  style={{ width: `${Math.min(geoPercent, 100)}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Type Distribution */}
        <div className="card p-4">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <span>&#128640;</span> Distribution by Type
          </h3>
          <div className="space-y-3">
            {[
              { label: 'Payloads', count: totalPayloads, color: 'from-green-500 to-green-400' },
              { label: 'Rocket Bodies', count: totalRocketBodies, color: 'from-orange-500 to-orange-400' },
              { label: 'Debris', count: totalDebris, color: 'from-red-500 to-red-400' },
              { label: 'Unknown', count: totalUnknown, color: 'from-gray-500 to-gray-400' },
            ].map((item) => {
              const pct = typeTotal > 0 ? (item.count / typeTotal) * 100 : 0;
              return (
                <div key={item.label}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-star-200 text-sm">{item.label}</span>
                    <span className="text-star-300 text-sm">{item.count.toLocaleString()} ({pct.toFixed(1)}%)</span>
                  </div>
                  <div className="h-3 bg-space-600 rounded-full overflow-hidden">
                    <div
                      className={`h-full bg-gradient-to-r ${item.color} rounded-full`}
                      style={{ width: `${Math.min(pct, 100)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Active Conjunction Events */}
      <div className="card p-4">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <span>&#128680;</span> Active Conjunction Events
        </h3>
        {conjunctions.length === 0 ? (
          <div className="text-center py-6">
            <span className="text-4xl block mb-2">&#10003;</span>
            <p className="text-green-400">No active conjunction events</p>
          </div>
        ) : (
          <div className="space-y-3">
            {conjunctions.map((event) => {
              const riskStyle = RISK_COLORS[event.riskLevel as ConjunctionRisk] || RISK_COLORS.low;
              return (
                <div
                  key={event.id}
                  className={`p-4 rounded-lg border ${riskStyle.bg} ${riskStyle.border}`}
                >
                  <div className="flex items-start justify-between flex-wrap gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded ${riskStyle.bg} ${riskStyle.text} border ${riskStyle.border}`}>
                          {riskStyle.label}
                        </span>
                        <span className="text-star-400 text-xs">
                          {new Date(event.eventTime).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm mt-2">
                        <div className="bg-space-700/30 rounded px-2 py-1">
                          <span className="text-star-400 text-xs">Primary: </span>
                          <span className="text-white">{event.primaryObject}</span>
                          <span className="text-star-500 text-xs ml-1">({event.primaryType})</span>
                        </div>
                        <span className="text-star-500">vs</span>
                        <div className="bg-space-700/30 rounded px-2 py-1">
                          <span className="text-star-400 text-xs">Secondary: </span>
                          <span className="text-white">{event.secondaryObject}</span>
                          <span className="text-star-500 text-xs ml-1">({event.secondaryType})</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-star-200 text-sm">
                        Miss: <span className="text-white font-medium">{event.missDistance.toFixed(1)} m</span>
                      </div>
                      <div className="text-star-200 text-sm">
                        Prob: <span className={`font-medium ${event.probability > 0.001 ? 'text-red-400' : event.probability > 0.0001 ? 'text-yellow-400' : 'text-star-200'}`}>
                          {event.probability < 0.0001
                            ? event.probability.toExponential(2)
                            : (event.probability * 100).toFixed(4) + '%'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 mt-3 pt-3 border-t border-space-600 text-xs">
                    <span className="text-star-400">
                      Alt: <span className="text-star-200">{event.altitude.toFixed(0)} km</span>
                    </span>
                    <span className="text-star-400">
                      Orbit: <span className="text-star-200">{event.orbitType}</span>
                    </span>
                    <span className="text-star-400">
                      Maneuver: {event.maneuverRequired ? (
                        event.maneuverExecuted ? (
                          <span className="text-green-400">Executed</span>
                        ) : (
                          <span className="text-red-400 animate-pulse">Required</span>
                        )
                      ) : (
                        <span className="text-star-300">Not Required</span>
                      )}
                    </span>
                    {event.description && (
                      <span className="text-star-400 truncate flex-1">{event.description}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 25-Year Compliance */}
      <div className="card p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <span>&#9989;</span> 25-Year Deorbit Compliance
            </h3>
            <p className="text-star-400 text-sm mt-1">
              {compliant.toLocaleString()} compliant / {complianceTotal.toLocaleString()} total objects
            </p>
          </div>
          <div className="text-right">
            <div className={`text-3xl font-bold ${
              complianceRate >= 80 ? 'text-green-400' :
              complianceRate >= 50 ? 'text-yellow-400' :
              'text-red-400'
            }`}>
              {complianceRate.toFixed(1)}%
            </div>
            <div className="text-star-400 text-sm">Compliance Rate</div>
          </div>
        </div>
        <div className="mt-3 h-3 bg-space-600 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full ${
              complianceRate >= 80 ? 'bg-gradient-to-r from-green-500 to-green-400' :
              complianceRate >= 50 ? 'bg-gradient-to-r from-yellow-500 to-yellow-400' :
              'bg-gradient-to-r from-red-500 to-red-400'
            }`}
            style={{ width: `${Math.min(complianceRate, 100)}%` }}
          />
        </div>
      </div>
    </div>
  );
}
