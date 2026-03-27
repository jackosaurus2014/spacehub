'use client';

import { useState } from 'react';

// ────────────────────────────────────────
// Types (duplicated from parent for isolation)
// ────────────────────────────────────────

interface Spaceport {
  id: string;
  name: string;
  location: string;
  country: string;
  operator: string;
  latitude: number;
  longitude: number;
  yearEstablished: number;
  status: 'operational' | 'under-construction' | 'planned' | 'limited';
  launchCapability: 'orbital' | 'suborbital' | 'both' | 'horizontal';
  inclinationRange: string;
  primaryVehicles: string[];
  launchPads: number;
  padDetails: string;
  recentLaunches2025: number;
  recentLaunches2024: number;
  recentLaunches2023: number;
  maxPayloadClass: string;
  fuelingTypes: string[];
  rangeSafety: string;
  reuseLanding: string;
  description: string;
  highlights: string[];
}

interface TrafficRecord {
  siteId: string;
  siteName: string;
  country: string;
  launches2020: number;
  launches2021: number;
  launches2022: number;
  launches2023: number;
  launches2024: number;
  launches2025: number;
  trend: 'up' | 'down' | 'stable';
  successRate: number;
}

type LaunchCapability = 'orbital' | 'suborbital' | 'both' | 'horizontal';

const DEFAULT_CAPABILITY_STYLE = { label: 'Unknown', color: 'text-slate-400' };

const CAPABILITY_CONFIG: Record<LaunchCapability, { label: string; color: string }> = {
  orbital: { label: 'Orbital', color: 'text-slate-300' },
  suborbital: { label: 'Suborbital', color: 'text-blue-400' },
  both: { label: 'Orbital + Suborbital', color: 'text-emerald-400' },
  horizontal: { label: 'Horizontal Launch', color: 'text-purple-400' },
};

function getTrendIndicator(trend: 'up' | 'down' | 'stable'): { symbol: string; color: string } {
  switch (trend) {
    case 'up': return { symbol: String.fromCharCode(9650), color: 'text-green-400' };
    case 'down': return { symbol: String.fromCharCode(9660), color: 'text-red-400' };
    case 'stable': return { symbol: String.fromCharCode(9644), color: 'text-yellow-400' };
  }
}

function getSuccessRateColor(rate: number): string {
  if (rate >= 97) return 'text-green-400';
  if (rate >= 93) return 'text-emerald-400';
  if (rate >= 85) return 'text-yellow-400';
  return 'text-red-400';
}

// ────────────────────────────────────────
// SiteComparisonTable
// ────────────────────────────────────────

export function SiteComparisonTable({ activeSpaceports }: { activeSpaceports: Spaceport[] }) {
  const allSites = activeSpaceports;

  return (
    <div className="card overflow-hidden">
      <div className="p-5 border-b border-white/5">
        <h2 className="text-lg font-bold text-white">Spaceport Capability Comparison</h2>
        <p className="text-star-300 text-sm mt-1">Side-by-side analysis of all active orbital launch sites</p>
      </div>
      {/* Mobile card layout */}
      <div className="md:hidden space-y-3 p-4">
        {allSites.map((s) => {
          const capStyle = CAPABILITY_CONFIG[s.launchCapability] || DEFAULT_CAPABILITY_STYLE;
          return (
            <div key={s.id} className="card p-4">
              <div className="flex items-start justify-between mb-2">
                <div className="min-w-0 flex-1 mr-2">
                  <h4 className="text-white font-semibold text-sm truncate">{s.name}</h4>
                  <p className="text-slate-400 text-xs">{s.country}</p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded bg-white/5 font-medium flex-shrink-0 ${capStyle.color}`}>{capStyle.label}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div><span className="text-slate-500">Pads:</span> <span className="text-slate-300">{s.launchPads}</span></div>
                <div><span className="text-slate-500">Payload:</span> <span className="text-slate-300 truncate">{s.maxPayloadClass}</span></div>
                <div><span className="text-slate-500">Inclination:</span> <span className="text-slate-300">{s.inclinationRange}</span></div>
                <div><span className="text-slate-500">Reuse:</span> <span className="text-slate-300">{s.reuseLanding.startsWith('None') ? 'None' : s.reuseLanding.length > 25 ? s.reuseLanding.substring(0, 25) + '...' : s.reuseLanding}</span></div>
                <div><span className="text-slate-500">2025:</span> <span className="text-slate-300 font-mono font-bold">{s.recentLaunches2025}</span></div>
                <div><span className="text-slate-500">2024:</span> <span className="text-slate-300 font-mono">{s.recentLaunches2024}</span></div>
              </div>
              {s.fuelingTypes.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {s.fuelingTypes.map((f) => (
                    <span key={f} className="px-1.5 py-0.5 bg-space-700 text-emerald-300 rounded text-xs">{f}</span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Desktop table layout */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-white/5">
              <th className="text-left px-4 py-3 text-star-300 font-semibold text-xs uppercase tracking-wider whitespace-nowrap">Site</th>
              <th className="text-left px-4 py-3 text-star-300 font-semibold text-xs uppercase tracking-wider whitespace-nowrap">Country</th>
              <th className="text-left px-4 py-3 text-star-300 font-semibold text-xs uppercase tracking-wider whitespace-nowrap">Capability</th>
              <th className="text-left px-4 py-3 text-star-300 font-semibold text-xs uppercase tracking-wider whitespace-nowrap">Inclination Range</th>
              <th className="text-right px-4 py-3 text-star-300 font-semibold text-xs uppercase tracking-wider whitespace-nowrap">Pads</th>
              <th className="text-left px-4 py-3 text-star-300 font-semibold text-xs uppercase tracking-wider whitespace-nowrap">Max Payload</th>
              <th className="text-left px-4 py-3 text-star-300 font-semibold text-xs uppercase tracking-wider whitespace-nowrap">Propellants</th>
              <th className="text-left px-4 py-3 text-star-300 font-semibold text-xs uppercase tracking-wider whitespace-nowrap">Reuse Landing</th>
              <th className="text-right px-4 py-3 text-star-300 font-semibold text-xs uppercase tracking-wider whitespace-nowrap">2025</th>
              <th className="text-right px-4 py-3 text-star-300 font-semibold text-xs uppercase tracking-wider whitespace-nowrap">2024</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {allSites.map((s) => {
              const capStyle = CAPABILITY_CONFIG[s.launchCapability] || DEFAULT_CAPABILITY_STYLE;
              return (
                <tr key={s.id} className="hover:bg-white/5 transition-colors">
                  <td className="px-4 py-3 font-semibold text-white whitespace-nowrap">{s.name}</td>
                  <td className="px-4 py-3 text-star-300 whitespace-nowrap">{s.country}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`text-xs font-medium ${capStyle.color}`}>{capStyle.label}</span>
                  </td>
                  <td className="px-4 py-3 text-star-300 whitespace-nowrap text-xs">{s.inclinationRange}</td>
                  <td className="px-4 py-3 text-right text-white font-mono">{s.launchPads}</td>
                  <td className="px-4 py-3 text-star-300 text-xs max-w-[180px]">{s.maxPayloadClass}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {s.fuelingTypes.map((f) => (
                        <span key={f} className="px-1.5 py-0.5 bg-space-700 text-emerald-300 rounded text-xs">{f}</span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-star-300 text-xs max-w-[150px] truncate">
                    {s.reuseLanding === 'None' || s.reuseLanding === 'None currently' || s.reuseLanding.startsWith('None')
                      ? <span className="text-star-300/40">None</span>
                      : s.reuseLanding.length > 40 ? s.reuseLanding.substring(0, 40) + '...' : s.reuseLanding}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-300 font-mono font-bold">{s.recentLaunches2025}</td>
                  <td className="px-4 py-3 text-right text-star-300 font-mono">{s.recentLaunches2024}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Summary Footer */}
      <div className="p-4 bg-white/[0.02] border-t border-white/5 flex flex-wrap items-center gap-6 text-xs text-star-300/60">
        <span>Total sites: <span className="text-white font-bold">{allSites.length}</span></span>
        <span>Total pads: <span className="text-white font-bold">{allSites.reduce((s, sp) => s + sp.launchPads, 0)}</span></span>
        <span>2025 launches (active sites): <span className="text-slate-300 font-bold">{allSites.reduce((s, sp) => s + sp.recentLaunches2025, 0)}</span></span>
        <span>With reuse capability: <span className="text-green-400 font-bold">{allSites.filter(s => !s.reuseLanding.startsWith('None')).length}</span></span>
      </div>
    </div>
  );
}

// ────────────────────────────────────────
// TrafficDataTab
// ────────────────────────────────────────

export function TrafficDataTab({ trafficData }: { trafficData: TrafficRecord[] }) {
  const [sortBy, setSortBy] = useState<'launches2025' | 'trend' | 'successRate'>('launches2025');
  const sortedData = [...trafficData].sort((a, b) => {
    if (sortBy === 'launches2025') return b.launches2025 - a.launches2025;
    if (sortBy === 'successRate') return b.successRate - a.successRate;
    const trendOrder = { up: 3, stable: 2, down: 1 };
    return trendOrder[b.trend] - trendOrder[a.trend];
  });

  const totalByYear = {
    y2021: trafficData.reduce((s, t) => s + t.launches2021, 0),
    y2022: trafficData.reduce((s, t) => s + t.launches2022, 0),
    y2023: trafficData.reduce((s, t) => s + t.launches2023, 0),
    y2024: trafficData.reduce((s, t) => s + t.launches2024, 0),
    y2025: trafficData.reduce((s, t) => s + t.launches2025, 0),
  };

  const maxLaunches = Math.max(...trafficData.map(t => t.launches2025));

  const countryData: Record<string, number> = {};
  trafficData.forEach(t => {
    countryData[t.country] = (countryData[t.country] || 0) + t.launches2025;
  });
  const countrySorted = Object.entries(countryData).sort((a, b) => b[1] - a[1]);

  return (
    <div className="space-y-6">
      {/* Global Traffic Trend */}
      <div className="card p-6">
        <h2 className="text-lg font-bold text-white mb-2">Global Orbital Launch Traffic</h2>
        <p className="text-star-300 text-sm mb-6">Total orbital launch attempts tracked across all active sites</p>

        <div className="grid grid-cols-5 gap-4 mb-6">
          {[
            { year: '2021', count: totalByYear.y2021 },
            { year: '2022', count: totalByYear.y2022 },
            { year: '2023', count: totalByYear.y2023 },
            { year: '2024', count: totalByYear.y2024 },
            { year: '2025', count: totalByYear.y2025 },
          ].map((d) => (
            <div key={d.year} className="text-center">
              <div className="text-2xl md:text-3xl font-bold font-display text-white">{d.count}</div>
              <div className="text-star-300/60 text-xs uppercase tracking-widest mt-1">{d.year}</div>
              <div className="mt-2 mx-auto w-full max-w-[60px] h-2 bg-white/5 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-white to-slate-400"
                  style={{ width: `${(d.count / totalByYear.y2025) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="bg-white/[0.03] rounded-lg p-4">
          <div className="text-star-300/60 text-xs uppercase tracking-widest mb-3">Growth</div>
          <div className="flex items-center gap-4 flex-wrap">
            <div>
              <span className="text-green-400 font-bold text-lg">+{((totalByYear.y2025 / totalByYear.y2021 - 1) * 100).toFixed(0)}%</span>
              <span className="text-star-300/60 text-xs ml-2">since 2021</span>
            </div>
            <span className="text-slate-600">|</span>
            <div>
              <span className="text-green-400 font-bold text-lg">+{((totalByYear.y2025 / totalByYear.y2024 - 1) * 100).toFixed(0)}%</span>
              <span className="text-star-300/60 text-xs ml-2">YoY (2024 to 2025)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Country Breakdown */}
      <div className="card p-6">
        <h2 className="text-lg font-bold text-white mb-4">2025 Launches by Country</h2>
        <div className="space-y-3">
          {countrySorted.map(([country, count]) => {
            const maxCountry = countrySorted[0][1];
            const pct = (count / maxCountry) * 100;
            return (
              <div key={country}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-star-300 text-sm">{country}</span>
                  <span className="text-white font-bold font-mono text-sm">{count}</span>
                </div>
                <div className="h-2.5 bg-white/5 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-white to-blue-400 transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Sort Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-star-300 text-sm">Sort by:</span>
        {[
          { key: 'launches2025' as const, label: '2025 Launches' },
          { key: 'successRate' as const, label: 'Success Rate' },
          { key: 'trend' as const, label: 'Trend' },
        ].map((opt) => (
          <button
            key={opt.key}
            onClick={() => setSortBy(opt.key)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              sortBy === opt.key
                ? 'bg-white/10 text-slate-200 border border-white/15'
                : 'bg-white/5 text-star-300 border border-white/10 hover:border-white/20'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Site-by-site Traffic Table */}
      <div className="card overflow-hidden">
        <div className="p-5 border-b border-white/5">
          <h2 className="text-lg font-bold text-white">Launch Traffic by Site</h2>
          <p className="text-star-300 text-sm mt-1">Historical launch counts and trends for each site</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-white/5">
                <th className="text-left px-4 py-3 text-star-300 font-semibold text-xs uppercase tracking-wider whitespace-nowrap">Site</th>
                <th className="text-left px-4 py-3 text-star-300 font-semibold text-xs uppercase tracking-wider whitespace-nowrap">Country</th>
                <th className="text-right px-4 py-3 text-star-300 font-semibold text-xs uppercase tracking-wider whitespace-nowrap">2021</th>
                <th className="text-right px-4 py-3 text-star-300 font-semibold text-xs uppercase tracking-wider whitespace-nowrap">2022</th>
                <th className="text-right px-4 py-3 text-star-300 font-semibold text-xs uppercase tracking-wider whitespace-nowrap">2023</th>
                <th className="text-right px-4 py-3 text-star-300 font-semibold text-xs uppercase tracking-wider whitespace-nowrap">2024</th>
                <th className="text-right px-4 py-3 text-star-300 font-semibold text-xs uppercase tracking-wider whitespace-nowrap">2025</th>
                <th className="text-center px-4 py-3 text-star-300 font-semibold text-xs uppercase tracking-wider whitespace-nowrap">Trend</th>
                <th className="text-right px-4 py-3 text-star-300 font-semibold text-xs uppercase tracking-wider whitespace-nowrap">Success</th>
                <th className="text-left px-4 py-3 text-star-300 font-semibold text-xs uppercase tracking-wider whitespace-nowrap">Activity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {sortedData.map((t) => {
                const trend = getTrendIndicator(t.trend);
                const barWidth = maxLaunches > 0 ? (t.launches2025 / maxLaunches) * 100 : 0;
                return (
                  <tr key={t.siteId} className="hover:bg-white/5 transition-colors">
                    <td className="px-4 py-3 font-semibold text-white whitespace-nowrap">{t.siteName}</td>
                    <td className="px-4 py-3 text-star-300 whitespace-nowrap">{t.country}</td>
                    <td className="px-4 py-3 text-right text-star-300/60 font-mono">{t.launches2021}</td>
                    <td className="px-4 py-3 text-right text-star-300/70 font-mono">{t.launches2022}</td>
                    <td className="px-4 py-3 text-right text-star-300/80 font-mono">{t.launches2023}</td>
                    <td className="px-4 py-3 text-right text-star-300 font-mono">{t.launches2024}</td>
                    <td className="px-4 py-3 text-right text-white font-mono font-bold">{t.launches2025}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`${trend.color} font-bold`}>{trend.symbol}</span>
                    </td>
                    <td className={`px-4 py-3 text-right font-mono font-bold ${getSuccessRateColor(t.successRate)}`}>
                      {t.successRate.toFixed(1)}%
                    </td>
                    <td className="px-4 py-3">
                      <div className="w-24 h-2 bg-white/5 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-white to-blue-400"
                          style={{ width: `${barWidth}%` }}
                        />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="p-4 bg-white/[0.02] border-t border-white/5 flex flex-wrap items-center gap-6 text-xs text-star-300/60">
          <span>Tracked sites: <span className="text-white font-bold">{trafficData.length}</span></span>
          <span>Total 2025 launches: <span className="text-slate-300 font-bold">{totalByYear.y2025}</span></span>
          <span>Growing sites: <span className="text-green-400 font-bold">{trafficData.filter(t => t.trend === 'up').length}</span></span>
          <span>Declining sites: <span className="text-red-400 font-bold">{trafficData.filter(t => t.trend === 'down').length}</span></span>
        </div>
      </div>

      {/* Industry Projections */}
      <div className="card p-6">
        <h2 className="text-lg font-bold text-white mb-2">Launch Industry Projections</h2>
        <p className="text-star-300 text-sm mb-4">Forward-looking analysis based on current trends and announced plans</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white/[0.03] rounded-lg p-4 border border-white/5">
            <div className="text-slate-300 text-2xl font-bold font-display mb-1">280+</div>
            <div className="text-white text-sm font-medium mb-2">Projected 2026 Global Launches</div>
            <p className="text-star-300/70 text-xs leading-relaxed">
              Continued growth driven by Starlink deployment cadence, increasing Starship flights, Chinese commercial launchers, and new vehicles ramping up (New Glenn, Ariane 6, Neutron).
            </p>
          </div>
          <div className="bg-white/[0.03] rounded-lg p-4 border border-white/5">
            <div className="text-amber-400 text-2xl font-bold font-display mb-1">4+</div>
            <div className="text-white text-sm font-medium mb-2">New Launch Sites by 2028</div>
            <p className="text-star-300/70 text-xs leading-relaxed">
              Sutherland (UK), Andoya (Norway), Esrange (Sweden), and commercial pads in China are targeting first orbital launches in the next 1-2 years. SaxaVord (UK) conducted its first attempt in 2025.
            </p>
          </div>
          <div className="bg-white/[0.03] rounded-lg p-4 border border-white/5">
            <div className="text-green-400 text-2xl font-bold font-display mb-1">62%</div>
            <div className="text-white text-sm font-medium mb-2">US Share of Global Launches</div>
            <p className="text-star-300/70 text-xs leading-relaxed">
              The United States dominates global launch traffic, primarily driven by SpaceX Falcon 9 operations from Cape Canaveral, KSC, and Vandenberg. Starship and New Glenn cadence will increase this further.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
