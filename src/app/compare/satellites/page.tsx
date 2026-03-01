'use client';

import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import Link from 'next/link';
import AnimatedPageHeader from '@/components/ui/AnimatedPageHeader';
import ScrollReveal from '@/components/ui/ScrollReveal';

// ────────────────────────────────────────
// Types
// ────────────────────────────────────────

type OrbitType = 'LEO' | 'MEO' | 'GEO' | 'SSO' | 'IGSO' | 'Mixed';
type ConstellationStatus = 'Operational' | 'Deploying' | 'Planned' | 'Partial';
type Purpose = 'Broadband' | 'Navigation' | 'Earth Observation' | 'Voice/Data' | 'Voice/IoT' | 'Military Comms';
type SortDirection = 'asc' | 'desc';
type ViewMode = 'table' | 'cards';

interface SatelliteConstellation {
  id: string;
  name: string;
  operator: string;
  orbitType: OrbitType;
  altitudeKm: string;
  satellitesPlanned: number;
  satellitesDeployed: number;
  purpose: Purpose;
  frequencyBands: string;
  latency: string;
  dataRate: string;
  coverage: string;
  launchProvider: string;
  firstLaunchYear: number;
  status: ConstellationStatus;
  country: string;
}

// ────────────────────────────────────────
// Constellation Data (12 constellations)
// ────────────────────────────────────────

const CONSTELLATIONS: SatelliteConstellation[] = [
  {
    id: 'starlink',
    name: 'Starlink',
    operator: 'SpaceX',
    orbitType: 'LEO',
    altitudeKm: '550',
    satellitesPlanned: 12000,
    satellitesDeployed: 6800,
    purpose: 'Broadband',
    frequencyBands: 'Ka/Ku-band',
    latency: '20-40 ms',
    dataRate: '100-300 Mbps',
    coverage: 'Global (exc. poles)',
    launchProvider: 'SpaceX Falcon 9',
    firstLaunchYear: 2019,
    status: 'Deploying',
    country: 'United States',
  },
  {
    id: 'oneweb',
    name: 'OneWeb',
    operator: 'Eutelsat OneWeb',
    orbitType: 'LEO',
    altitudeKm: '1,200',
    satellitesPlanned: 648,
    satellitesDeployed: 634,
    purpose: 'Broadband',
    frequencyBands: 'Ku-band',
    latency: '30-50 ms',
    dataRate: '50-195 Mbps',
    coverage: 'Global',
    launchProvider: 'SpaceX / Arianespace / ISRO',
    firstLaunchYear: 2019,
    status: 'Operational',
    country: 'United Kingdom',
  },
  {
    id: 'kuiper',
    name: 'Project Kuiper',
    operator: 'Amazon',
    orbitType: 'LEO',
    altitudeKm: '590-630',
    satellitesPlanned: 3236,
    satellitesDeployed: 2,
    purpose: 'Broadband',
    frequencyBands: 'Ka-band',
    latency: '20-40 ms',
    dataRate: 'Up to 400 Mbps',
    coverage: '56\u00b0N to 56\u00b0S',
    launchProvider: 'ULA Vulcan / Blue Origin / Arianespace',
    firstLaunchYear: 2024,
    status: 'Deploying',
    country: 'United States',
  },
  {
    id: 'iridium-next',
    name: 'Iridium NEXT',
    operator: 'Iridium Communications',
    orbitType: 'LEO',
    altitudeKm: '780',
    satellitesPlanned: 75,
    satellitesDeployed: 75,
    purpose: 'Voice/Data',
    frequencyBands: 'L-band',
    latency: '30-60 ms',
    dataRate: '0.7-1.4 Mbps',
    coverage: 'True Global (inc. poles)',
    launchProvider: 'SpaceX Falcon 9',
    firstLaunchYear: 2017,
    status: 'Operational',
    country: 'United States',
  },
  {
    id: 'globalstar',
    name: 'Globalstar',
    operator: 'Globalstar Inc.',
    orbitType: 'LEO',
    altitudeKm: '1,414',
    satellitesPlanned: 48,
    satellitesDeployed: 48,
    purpose: 'Voice/IoT',
    frequencyBands: 'L/S-band',
    latency: '40-60 ms',
    dataRate: '9.6 kbps - 256 kbps',
    coverage: '70\u00b0N to 70\u00b0S',
    launchProvider: 'SpaceX Falcon 9',
    firstLaunchYear: 1998,
    status: 'Operational',
    country: 'United States',
  },
  {
    id: 'o3b-mpower',
    name: 'O3b mPOWER',
    operator: 'SES',
    orbitType: 'MEO',
    altitudeKm: '8,062',
    satellitesPlanned: 11,
    satellitesDeployed: 11,
    purpose: 'Broadband',
    frequencyBands: 'Ka-band',
    latency: '~150 ms',
    dataRate: 'Up to 10 Gbps per beam',
    coverage: '50\u00b0N to 50\u00b0S',
    launchProvider: 'SpaceX Falcon 9',
    firstLaunchYear: 2022,
    status: 'Operational',
    country: 'Luxembourg',
  },
  {
    id: 'telesat-lightspeed',
    name: 'Telesat Lightspeed',
    operator: 'Telesat',
    orbitType: 'LEO',
    altitudeKm: '1,015',
    satellitesPlanned: 198,
    satellitesDeployed: 0,
    purpose: 'Broadband',
    frequencyBands: 'Ka-band',
    latency: '30-50 ms',
    dataRate: 'Up to 7.5 Gbps',
    coverage: 'Global',
    launchProvider: 'TBD',
    firstLaunchYear: 2026,
    status: 'Planned',
    country: 'Canada',
  },
  {
    id: 'sda-transport',
    name: 'SDA Transport Layer',
    operator: 'US DoD / SDA',
    orbitType: 'LEO',
    altitudeKm: '~750',
    satellitesPlanned: 300,
    satellitesDeployed: 28,
    purpose: 'Military Comms',
    frequencyBands: 'Various (Ka/optical)',
    latency: '<50 ms',
    dataRate: 'Classified',
    coverage: 'Global military',
    launchProvider: 'SpaceX / ULA',
    firstLaunchYear: 2023,
    status: 'Deploying',
    country: 'United States',
  },
  {
    id: 'gps-iii',
    name: 'GPS III',
    operator: 'US Space Force',
    orbitType: 'MEO',
    altitudeKm: '20,180',
    satellitesPlanned: 32,
    satellitesDeployed: 32,
    purpose: 'Navigation',
    frequencyBands: 'L-band (L1/L2/L5)',
    latency: 'N/A (one-way)',
    dataRate: 'N/A (nav signal)',
    coverage: 'Global',
    launchProvider: 'SpaceX Falcon 9 / ULA',
    firstLaunchYear: 2018,
    status: 'Operational',
    country: 'United States',
  },
  {
    id: 'galileo',
    name: 'Galileo',
    operator: 'European Union / ESA',
    orbitType: 'MEO',
    altitudeKm: '23,222',
    satellitesPlanned: 30,
    satellitesDeployed: 28,
    purpose: 'Navigation',
    frequencyBands: 'L/E-band (E1/E5/E6)',
    latency: 'N/A (one-way)',
    dataRate: 'N/A (nav signal)',
    coverage: 'Global',
    launchProvider: 'Arianespace / SpaceX',
    firstLaunchYear: 2011,
    status: 'Operational',
    country: 'EU',
  },
  {
    id: 'beidou-3',
    name: 'BeiDou-3',
    operator: 'China National Space Admin.',
    orbitType: 'Mixed',
    altitudeKm: 'MEO 21,528 / GEO 35,786 / IGSO 35,786',
    satellitesPlanned: 44,
    satellitesDeployed: 44,
    purpose: 'Navigation',
    frequencyBands: 'B-band (B1I/B2a/B3I)',
    latency: 'N/A (one-way)',
    dataRate: 'N/A (nav signal)',
    coverage: 'Global (enhanced Asia-Pacific)',
    launchProvider: 'Long March 3B',
    firstLaunchYear: 2015,
    status: 'Operational',
    country: 'China',
  },
  {
    id: 'planet',
    name: 'Planet',
    operator: 'Planet Labs',
    orbitType: 'SSO',
    altitudeKm: '475',
    satellitesPlanned: 200,
    satellitesDeployed: 200,
    purpose: 'Earth Observation',
    frequencyBands: 'Optical imaging',
    latency: 'N/A (imaging)',
    dataRate: 'N/A (downlink ~1.6 Gbps)',
    coverage: 'Global daily imaging',
    launchProvider: 'SpaceX / Rocket Lab / ISRO',
    firstLaunchYear: 2013,
    status: 'Operational',
    country: 'United States',
  },
];

// ────────────────────────────────────────
// Helper Functions
// ────────────────────────────────────────

function getOrbitColor(orbit: OrbitType): { bg: string; text: string; border: string } {
  switch (orbit) {
    case 'LEO':
      return { bg: 'bg-cyan-900/30', text: 'text-cyan-400', border: 'border-cyan-500/30' };
    case 'MEO':
      return { bg: 'bg-purple-900/30', text: 'text-purple-400', border: 'border-purple-500/30' };
    case 'GEO':
      return { bg: 'bg-amber-900/30', text: 'text-amber-400', border: 'border-amber-500/30' };
    case 'SSO':
      return { bg: 'bg-emerald-900/30', text: 'text-emerald-400', border: 'border-emerald-500/30' };
    case 'IGSO':
      return { bg: 'bg-orange-900/30', text: 'text-orange-400', border: 'border-orange-500/30' };
    case 'Mixed':
      return { bg: 'bg-pink-900/30', text: 'text-pink-400', border: 'border-pink-500/30' };
  }
}

function getStatusColor(status: ConstellationStatus): { bg: string; text: string; border: string } {
  switch (status) {
    case 'Operational':
      return { bg: 'bg-green-900/30', text: 'text-green-400', border: 'border-green-500/30' };
    case 'Deploying':
      return { bg: 'bg-yellow-900/30', text: 'text-yellow-400', border: 'border-yellow-500/30' };
    case 'Planned':
      return { bg: 'bg-blue-900/30', text: 'text-blue-400', border: 'border-blue-500/30' };
    case 'Partial':
      return { bg: 'bg-orange-900/30', text: 'text-orange-400', border: 'border-orange-500/30' };
  }
}

function getPurposeColor(purpose: Purpose): string {
  switch (purpose) {
    case 'Broadband': return 'text-cyan-400';
    case 'Navigation': return 'text-purple-400';
    case 'Earth Observation': return 'text-emerald-400';
    case 'Voice/Data': return 'text-blue-400';
    case 'Voice/IoT': return 'text-teal-400';
    case 'Military Comms': return 'text-red-400';
  }
}

function getDeploymentPercentage(c: SatelliteConstellation): number {
  if (c.satellitesPlanned === 0) return 0;
  return Math.min(100, Math.round((c.satellitesDeployed / c.satellitesPlanned) * 100));
}

// Sortable columns
type SortKey =
  | 'name'
  | 'operator'
  | 'orbitType'
  | 'satellitesPlanned'
  | 'satellitesDeployed'
  | 'purpose'
  | 'firstLaunchYear'
  | 'status'
  | 'country'
  | 'deployment';

function getSortValue(c: SatelliteConstellation, key: SortKey): string | number {
  switch (key) {
    case 'name': return c.name.toLowerCase();
    case 'operator': return c.operator.toLowerCase();
    case 'orbitType': return c.orbitType;
    case 'satellitesPlanned': return c.satellitesPlanned;
    case 'satellitesDeployed': return c.satellitesDeployed;
    case 'purpose': return c.purpose;
    case 'firstLaunchYear': return c.firstLaunchYear;
    case 'status': return c.status;
    case 'country': return c.country.toLowerCase();
    case 'deployment': return getDeploymentPercentage(c);
  }
}

// ────────────────────────────────────────
// Orbit Type Badge
// ────────────────────────────────────────

function OrbitBadge({ orbit }: { orbit: OrbitType }) {
  const colors = getOrbitColor(orbit);
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border ${colors.bg} ${colors.text} ${colors.border}`}>
      {orbit}
    </span>
  );
}

// ────────────────────────────────────────
// Status Badge
// ────────────────────────────────────────

function StatusBadge({ status }: { status: ConstellationStatus }) {
  const colors = getStatusColor(status);
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border ${colors.bg} ${colors.text} ${colors.border}`}>
      {status}
    </span>
  );
}

// ────────────────────────────────────────
// Deployment Progress Bar
// ────────────────────────────────────────

function DeploymentBar({ planned, deployed }: { planned: number; deployed: number }) {
  const pct = planned > 0 ? Math.min(100, Math.round((deployed / planned) * 100)) : 0;
  const barColor = pct >= 90 ? 'bg-green-500' : pct >= 50 ? 'bg-yellow-500' : pct >= 10 ? 'bg-cyan-500' : 'bg-slate-600';

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden min-w-[60px]">
        <div className={`h-full rounded-full transition-all duration-500 ${barColor}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-slate-400 whitespace-nowrap">{pct}%</span>
    </div>
  );
}

// ────────────────────────────────────────
// Comparison Radar / Bar Chart
// ────────────────────────────────────────

function ComparisonChart({ selected }: { selected: SatelliteConstellation[] }) {
  // Metrics to compare as horizontal bar chart
  const metrics = [
    {
      label: 'Satellites Planned',
      getValue: (c: SatelliteConstellation) => c.satellitesPlanned,
    },
    {
      label: 'Satellites Deployed',
      getValue: (c: SatelliteConstellation) => c.satellitesDeployed,
    },
    {
      label: 'Deployment %',
      getValue: (c: SatelliteConstellation) => getDeploymentPercentage(c),
    },
    {
      label: 'First Launch Year',
      getValue: (c: SatelliteConstellation) => c.firstLaunchYear,
    },
  ];

  const chartColors = [
    { bar: 'bg-cyan-500', text: 'text-cyan-400', dot: 'bg-cyan-400' },
    { bar: 'bg-purple-500', text: 'text-purple-400', dot: 'bg-purple-400' },
    { bar: 'bg-amber-500', text: 'text-amber-400', dot: 'bg-amber-400' },
    { bar: 'bg-emerald-500', text: 'text-emerald-400', dot: 'bg-emerald-400' },
  ];

  return (
    <div className="card p-6 mb-6">
      <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
        <svg className="w-4 h-4 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
        Visual Comparison
      </h3>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 mb-5">
        {selected.map((c, i) => (
          <div key={c.id} className="flex items-center gap-2">
            <span className={`w-3 h-3 rounded-full ${chartColors[i % chartColors.length].dot}`} />
            <span className={`text-xs font-medium ${chartColors[i % chartColors.length].text}`}>{c.name}</span>
          </div>
        ))}
      </div>

      {/* Bar Charts */}
      <div className="space-y-6">
        {metrics.map((metric) => {
          const values = selected.map((c) => metric.getValue(c));
          const maxVal = Math.max(...values, 1);

          return (
            <div key={metric.label}>
              <div className="text-xs text-slate-400 font-medium mb-2">{metric.label}</div>
              <div className="space-y-2">
                {selected.map((c, i) => {
                  const val = metric.getValue(c);
                  const widthPct = (val / maxVal) * 100;
                  const color = chartColors[i % chartColors.length];

                  return (
                    <div key={c.id} className="flex items-center gap-3">
                      <span className="text-xs text-slate-500 w-24 truncate">{c.name}</span>
                      <div className="flex-1 h-5 bg-slate-800 rounded overflow-hidden">
                        <div
                          className={`h-full rounded transition-all duration-700 ${color.bar} flex items-center justify-end pr-2`}
                          style={{ width: `${Math.max(widthPct, 2)}%` }}
                        >
                          {widthPct > 15 && (
                            <span className="text-xs font-bold text-white">
                              {val.toLocaleString()}
                            </span>
                          )}
                        </div>
                      </div>
                      {widthPct <= 15 && (
                        <span className="text-xs text-slate-400">{val.toLocaleString()}</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ────────────────────────────────────────
// Comparison Detail Table
// ────────────────────────────────────────

function ComparisonDetailTable({ selected }: { selected: SatelliteConstellation[] }) {
  const rows: { label: string; section?: boolean; getValue?: (c: SatelliteConstellation) => React.ReactNode }[] = [
    { label: 'General', section: true },
    {
      label: 'Operator',
      getValue: (c) => <span className="text-white">{c.operator}</span>,
    },
    {
      label: 'Country',
      getValue: (c) => <span className="text-white">{c.country}</span>,
    },
    {
      label: 'Status',
      getValue: (c) => <StatusBadge status={c.status} />,
    },
    {
      label: 'Purpose',
      getValue: (c) => <span className={getPurposeColor(c.purpose)}>{c.purpose}</span>,
    },
    { label: 'Orbit & Coverage', section: true },
    {
      label: 'Orbit Type',
      getValue: (c) => <OrbitBadge orbit={c.orbitType} />,
    },
    {
      label: 'Altitude',
      getValue: (c) => <span className="text-white">{c.altitudeKm} km</span>,
    },
    {
      label: 'Coverage',
      getValue: (c) => <span className="text-white">{c.coverage}</span>,
    },
    { label: 'Constellation Size', section: true },
    {
      label: 'Planned Satellites',
      getValue: (c) => <span className="text-white font-semibold">{c.satellitesPlanned.toLocaleString()}</span>,
    },
    {
      label: 'Deployed Satellites',
      getValue: (c) => <span className="text-white font-semibold">{c.satellitesDeployed.toLocaleString()}</span>,
    },
    {
      label: 'Deployment Progress',
      getValue: (c) => <DeploymentBar planned={c.satellitesPlanned} deployed={c.satellitesDeployed} />,
    },
    { label: 'Performance', section: true },
    {
      label: 'Frequency Bands',
      getValue: (c) => <span className="text-white">{c.frequencyBands}</span>,
    },
    {
      label: 'Latency',
      getValue: (c) => <span className="text-white">{c.latency}</span>,
    },
    {
      label: 'Data Rate',
      getValue: (c) => <span className="text-white">{c.dataRate}</span>,
    },
    { label: 'Launch Info', section: true },
    {
      label: 'Launch Provider',
      getValue: (c) => <span className="text-white">{c.launchProvider}</span>,
    },
    {
      label: 'First Launch Year',
      getValue: (c) => <span className="text-white">{c.firstLaunchYear}</span>,
    },
  ];

  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700">
              <th className="text-left py-3 px-4 text-slate-400 font-medium text-xs uppercase tracking-widest sticky left-0 bg-slate-900/95 backdrop-blur z-10 min-w-[160px]">
                Specification
              </th>
              {selected.map((c) => (
                <th key={c.id} className="text-center py-3 px-4 min-w-[200px]">
                  <div className="text-white font-bold text-sm">{c.name}</div>
                  <div className="text-slate-400 text-xs mt-0.5">{c.operator}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50">
            {rows.map((row, idx) => {
              if (row.section) {
                return (
                  <tr key={`section-${idx}`} className="bg-slate-800/40">
                    <td
                      colSpan={selected.length + 1}
                      className="py-2 px-4 text-xs font-bold text-cyan-400 uppercase tracking-widest"
                    >
                      {row.label}
                    </td>
                  </tr>
                );
              }

              return (
                <tr key={`row-${idx}`} className="hover:bg-slate-800/20 transition-colors">
                  <td className="py-2.5 px-4 text-slate-400 text-xs font-medium sticky left-0 bg-slate-900/95 backdrop-blur z-10">
                    {row.label}
                  </td>
                  {selected.map((c) => (
                    <td key={c.id} className="py-2.5 px-4 text-center">
                      {row.getValue?.(c)}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ────────────────────────────────────────
// Mobile Card View
// ────────────────────────────────────────

function ConstellationCard({
  constellation,
  isSelected,
  onToggle,
}: {
  constellation: SatelliteConstellation;
  isSelected: boolean;
  onToggle: (id: string) => void;
}) {
  const orbitColors = getOrbitColor(constellation.orbitType);

  return (
    <div
      className={`card p-4 transition-all duration-200 ${
        isSelected ? 'ring-2 ring-cyan-500/60' : ''
      }`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-white font-bold text-sm truncate">{constellation.name}</h3>
          <p className="text-slate-400 text-xs truncate">{constellation.operator}</p>
        </div>
        <label className="flex items-center cursor-pointer ml-2 shrink-0">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onToggle(constellation.id)}
            className="sr-only"
          />
          <span
            className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
              isSelected
                ? 'bg-cyan-500 border-cyan-500'
                : 'border-slate-600 hover:border-slate-400'
            }`}
          >
            {isSelected && (
              <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            )}
          </span>
        </label>
      </div>

      <div className="flex flex-wrap gap-1.5 mb-3">
        <OrbitBadge orbit={constellation.orbitType} />
        <StatusBadge status={constellation.status} />
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <div>
          <span className="text-slate-500">Altitude</span>
          <p className="text-white">{constellation.altitudeKm} km</p>
        </div>
        <div>
          <span className="text-slate-500">Purpose</span>
          <p className={getPurposeColor(constellation.purpose)}>{constellation.purpose}</p>
        </div>
        <div>
          <span className="text-slate-500">Planned</span>
          <p className="text-white">{constellation.satellitesPlanned.toLocaleString()}</p>
        </div>
        <div>
          <span className="text-slate-500">Deployed</span>
          <p className="text-white">{constellation.satellitesDeployed.toLocaleString()}</p>
        </div>
      </div>

      <div className="mt-3">
        <DeploymentBar planned={constellation.satellitesPlanned} deployed={constellation.satellitesDeployed} />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
        <div>
          <span className="text-slate-500">Bands</span>
          <p className="text-white truncate">{constellation.frequencyBands}</p>
        </div>
        <div>
          <span className="text-slate-500">Country</span>
          <p className="text-white truncate">{constellation.country}</p>
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────
// Sort Header
// ────────────────────────────────────────

function SortableHeader({
  label,
  sortKey,
  currentSort,
  currentDir,
  onSort,
}: {
  label: string;
  sortKey: SortKey;
  currentSort: SortKey;
  currentDir: SortDirection;
  onSort: (key: SortKey) => void;
}) {
  const isActive = currentSort === sortKey;

  return (
    <th
      onClick={() => onSort(sortKey)}
      className="py-3 px-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider cursor-pointer hover:text-white transition-colors select-none whitespace-nowrap"
    >
      <div className="flex items-center gap-1">
        {label}
        <span className={`transition-colors ${isActive ? 'text-cyan-400' : 'text-slate-600'}`}>
          {isActive && currentDir === 'asc' ? (
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
            </svg>
          ) : isActive && currentDir === 'desc' ? (
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          ) : (
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 3a1 1 0 01.707.293l3 3a1 1 0 01-1.414 1.414L10 5.414 7.707 7.707a1 1 0 01-1.414-1.414l3-3A1 1 0 0110 3zm-3.707 9.293a1 1 0 011.414 0L10 14.586l2.293-2.293a1 1 0 011.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          )}
        </span>
      </div>
    </th>
  );
}

// ────────────────────────────────────────
// Main Page Component
// ────────────────────────────────────────

export default function SatelliteConstellationComparePage() {
  // State
  const [search, setSearch] = useState('');
  const [orbitFilter, setOrbitFilter] = useState<OrbitType | 'all'>('all');
  const [purposeFilter, setPurposeFilter] = useState<Purpose | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<ConstellationStatus | 'all'>('all');
  const [sortKey, setSortKey] = useState<SortKey>('satellitesPlanned');
  const [sortDir, setSortDir] = useState<SortDirection>('desc');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [showComparison, setShowComparison] = useState(false);

  // Filter and sort
  const filteredConstellations = useMemo(() => {
    const result = CONSTELLATIONS.filter((c) => {
      // Search filter
      if (search) {
        const q = search.toLowerCase().trim();
        if (
          !c.name.toLowerCase().includes(q) &&
          !c.operator.toLowerCase().includes(q) &&
          !c.country.toLowerCase().includes(q)
        ) {
          return false;
        }
      }
      // Orbit filter
      if (orbitFilter !== 'all' && c.orbitType !== orbitFilter) return false;
      // Purpose filter
      if (purposeFilter !== 'all' && c.purpose !== purposeFilter) return false;
      // Status filter
      if (statusFilter !== 'all' && c.status !== statusFilter) return false;
      return true;
    });

    // Sort
    result.sort((a, b) => {
      const aVal = getSortValue(a, sortKey);
      const bVal = getSortValue(b, sortKey);
      const cmp = typeof aVal === 'string' && typeof bVal === 'string'
        ? aVal.localeCompare(bVal)
        : (aVal as number) - (bVal as number);
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return result;
  }, [search, orbitFilter, purposeFilter, statusFilter, sortKey, sortDir]);

  // Selected constellations for comparison
  const selectedConstellations = useMemo(
    () => CONSTELLATIONS.filter((c) => selectedIds.has(c.id)),
    [selectedIds]
  );

  // Handlers
  const handleSort = useCallback((key: SortKey) => {
    setSortKey((prev) => {
      if (prev === key) {
        setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
        return prev;
      }
      setSortDir('desc');
      return key;
    });
  }, []);

  const toggleSelection = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else if (next.size < 4) {
        next.add(id);
      }
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
    setShowComparison(false);
  }, []);

  // Unique values for filters
  const orbitTypes: OrbitType[] = ['LEO', 'MEO', 'GEO', 'SSO', 'Mixed'];
  const purposes: Purpose[] = ['Broadband', 'Navigation', 'Earth Observation', 'Voice/Data', 'Voice/IoT', 'Military Comms'];
  const statuses: ConstellationStatus[] = ['Operational', 'Deploying', 'Planned'];

  return (
    <div className="min-h-screen p-4 lg:p-8 max-w-[1600px] mx-auto">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-slate-500 mb-6">
        <Link href="/" className="hover:text-slate-300 transition-colors">Home</Link>
        <span>/</span>
        <Link href="/compare" className="hover:text-slate-300 transition-colors">Compare</Link>
        <span>/</span>
        <span className="text-slate-400">Satellite Constellations</span>
      </nav>

      <AnimatedPageHeader
        title="Satellite Constellation Comparison"
        subtitle="Compare major satellite constellations side-by-side across orbit, capacity, performance, and deployment progress"
        icon="&#128752;"
        accentColor="cyan"
      />

      {/* ── Filters & Search ── */}
      <ScrollReveal>
        <div className="card p-5 mb-6">
          <div className="flex flex-col lg:flex-row lg:items-end gap-4">
            {/* Search */}
            <div className="flex-1">
              <label className="text-xs uppercase tracking-widest text-slate-400 font-medium mb-1.5 block">
                Search
              </label>
              <div className="relative">
                <svg
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="search"
                  placeholder="Search by name, operator, or country..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all"
                />
              </div>
            </div>

            {/* Orbit Filter */}
            <div>
              <label className="text-xs uppercase tracking-widest text-slate-400 font-medium mb-1.5 block">
                Orbit Type
              </label>
              <select
                value={orbitFilter}
                onChange={(e) => setOrbitFilter(e.target.value as OrbitType | 'all')}
                className="bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-white px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all"
              >
                <option value="all">All Orbits</option>
                {orbitTypes.map((o) => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
            </div>

            {/* Purpose Filter */}
            <div>
              <label className="text-xs uppercase tracking-widest text-slate-400 font-medium mb-1.5 block">
                Purpose
              </label>
              <select
                value={purposeFilter}
                onChange={(e) => setPurposeFilter(e.target.value as Purpose | 'all')}
                className="bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-white px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all"
              >
                <option value="all">All Purposes</option>
                {purposes.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div>
              <label className="text-xs uppercase tracking-widest text-slate-400 font-medium mb-1.5 block">
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as ConstellationStatus | 'all')}
                className="bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-white px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all"
              >
                <option value="all">All Statuses</option>
                {statuses.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-end gap-1">
              <button
                onClick={() => setViewMode('table')}
                className={`p-2.5 rounded-lg border transition-all ${
                  viewMode === 'table'
                    ? 'bg-cyan-500/15 border-cyan-500/30 text-cyan-400'
                    : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:text-white'
                }`}
                title="Table view"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18M3 6h18M3 18h18" />
                </svg>
              </button>
              <button
                onClick={() => setViewMode('cards')}
                className={`p-2.5 rounded-lg border transition-all ${
                  viewMode === 'cards'
                    ? 'bg-cyan-500/15 border-cyan-500/30 text-cyan-400'
                    : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:text-white'
                }`}
                title="Card view"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              </button>
            </div>
          </div>

          {/* Active Filters Summary */}
          {(search || orbitFilter !== 'all' || purposeFilter !== 'all' || statusFilter !== 'all') && (
            <div className="mt-3 flex items-center gap-2 flex-wrap">
              <span className="text-xs text-slate-500">Showing {filteredConstellations.length} of {CONSTELLATIONS.length}</span>
              <button
                onClick={() => {
                  setSearch('');
                  setOrbitFilter('all');
                  setPurposeFilter('all');
                  setStatusFilter('all');
                }}
                className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
              >
                Clear filters
              </button>
            </div>
          )}
        </div>
      </ScrollReveal>

      {/* ── Selection Bar ── */}
      {selectedIds.size > 0 && (
        <ScrollReveal>
          <div className="card p-4 mb-6 border-cyan-500/40">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-sm text-white font-medium">
                  {selectedIds.size} selected
                </span>
                {selectedConstellations.map((c) => (
                  <span
                    key={c.id}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 rounded-lg text-xs font-medium"
                  >
                    {c.name}
                    <button
                      onClick={() => toggleSelection(c.id)}
                      className="ml-0.5 hover:text-white transition-colors"
                      aria-label={`Remove ${c.name}`}
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={clearSelection}
                  className="text-xs text-slate-400 hover:text-white transition-colors px-2 py-1"
                >
                  Clear all
                </button>
                <button
                  onClick={() => setShowComparison(true)}
                  disabled={selectedIds.size < 2}
                  className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                    selectedIds.size >= 2
                      ? 'bg-cyan-500 text-white hover:bg-cyan-400 shadow-lg shadow-cyan-500/25'
                      : 'bg-slate-700 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  Compare {selectedIds.size >= 2 ? `(${selectedIds.size})` : '(select 2-4)'}
                </button>
              </div>
            </div>
          </div>
        </ScrollReveal>
      )}

      {/* ── Comparison View ── */}
      {showComparison && selectedConstellations.length >= 2 && (
        <ScrollReveal>
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <svg className="w-5 h-5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Side-by-Side Comparison
              </h2>
              <button
                onClick={() => setShowComparison(false)}
                className="text-xs text-slate-400 hover:text-white transition-colors flex items-center gap-1"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Close comparison
              </button>
            </div>
            <ComparisonChart selected={selectedConstellations} />
            <ComparisonDetailTable selected={selectedConstellations} />
          </div>
        </ScrollReveal>
      )}

      {/* ── Table View ── */}
      {viewMode === 'table' && !showComparison && (
        <ScrollReveal>
          <div className="card overflow-hidden mb-6">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700">
                    <th className="py-3 px-3 text-left text-xs font-medium text-slate-400 w-10">
                      <span className="sr-only">Select</span>
                    </th>
                    <SortableHeader label="Name" sortKey="name" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} />
                    <SortableHeader label="Operator" sortKey="operator" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} />
                    <SortableHeader label="Orbit" sortKey="orbitType" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} />
                    <th className="py-3 px-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider whitespace-nowrap">
                      Altitude
                    </th>
                    <SortableHeader label="Planned" sortKey="satellitesPlanned" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} />
                    <SortableHeader label="Deployed" sortKey="satellitesDeployed" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} />
                    <SortableHeader label="Deployment" sortKey="deployment" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} />
                    <SortableHeader label="Purpose" sortKey="purpose" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} />
                    <th className="py-3 px-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider whitespace-nowrap">
                      Bands
                    </th>
                    <th className="py-3 px-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider whitespace-nowrap">
                      Latency
                    </th>
                    <SortableHeader label="Status" sortKey="status" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} />
                    <SortableHeader label="Country" sortKey="country" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} />
                    <SortableHeader label="First Launch" sortKey="firstLaunchYear" currentSort={sortKey} currentDir={sortDir} onSort={handleSort} />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {filteredConstellations.map((c) => {
                    const isSelected = selectedIds.has(c.id);
                    return (
                      <tr
                        key={c.id}
                        className={`transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-cyan-500/5 hover:bg-cyan-500/10'
                            : 'hover:bg-slate-800/30'
                        }`}
                        onClick={() => toggleSelection(c.id)}
                      >
                        <td className="py-2.5 px-3">
                          <label className="flex items-center cursor-pointer" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSelection(c.id)}
                              className="sr-only"
                            />
                            <span
                              className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${
                                isSelected
                                  ? 'bg-cyan-500 border-cyan-500'
                                  : 'border-slate-600 hover:border-slate-400'
                              }`}
                            >
                              {isSelected && (
                                <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                </svg>
                              )}
                            </span>
                          </label>
                        </td>
                        <td className="py-2.5 px-3 text-white font-semibold whitespace-nowrap">{c.name}</td>
                        <td className="py-2.5 px-3 text-slate-300 whitespace-nowrap">{c.operator}</td>
                        <td className="py-2.5 px-3"><OrbitBadge orbit={c.orbitType} /></td>
                        <td className="py-2.5 px-3 text-slate-300 whitespace-nowrap">{c.altitudeKm} km</td>
                        <td className="py-2.5 px-3 text-white text-right">{c.satellitesPlanned.toLocaleString()}</td>
                        <td className="py-2.5 px-3 text-white text-right">{c.satellitesDeployed.toLocaleString()}</td>
                        <td className="py-2.5 px-3 min-w-[140px]">
                          <DeploymentBar planned={c.satellitesPlanned} deployed={c.satellitesDeployed} />
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <span className={getPurposeColor(c.purpose)}>{c.purpose}</span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-300 whitespace-nowrap text-xs">{c.frequencyBands}</td>
                        <td className="py-2.5 px-3 text-slate-300 whitespace-nowrap text-xs">{c.latency}</td>
                        <td className="py-2.5 px-3"><StatusBadge status={c.status} /></td>
                        <td className="py-2.5 px-3 text-slate-300 whitespace-nowrap">{c.country}</td>
                        <td className="py-2.5 px-3 text-slate-300 text-center">{c.firstLaunchYear}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {filteredConstellations.length === 0 && (
              <div className="text-center py-12">
                <div className="text-4xl mb-3">&#128752;</div>
                <h3 className="text-white font-semibold mb-1">No constellations match your filters</h3>
                <p className="text-slate-400 text-sm">Try adjusting your search or filter criteria</p>
              </div>
            )}

            {/* Table Legend */}
            <div className="px-4 py-3 border-t border-slate-700/50 flex flex-wrap items-center gap-4 text-xs text-slate-400">
              <span>Click row or checkbox to select for comparison</span>
              <span className="hidden sm:inline">|</span>
              <span className="flex items-center gap-1.5">
                <span className="px-1.5 py-0.5 rounded bg-cyan-900/30 text-cyan-400 border border-cyan-500/30 text-xs font-semibold">LEO</span>
                <span className="px-1.5 py-0.5 rounded bg-purple-900/30 text-purple-400 border border-purple-500/30 text-xs font-semibold">MEO</span>
                <span className="px-1.5 py-0.5 rounded bg-amber-900/30 text-amber-400 border border-amber-500/30 text-xs font-semibold">GEO</span>
                <span className="px-1.5 py-0.5 rounded bg-emerald-900/30 text-emerald-400 border border-emerald-500/30 text-xs font-semibold">SSO</span>
              </span>
            </div>
          </div>
        </ScrollReveal>
      )}

      {/* ── Card View ── */}
      {viewMode === 'cards' && !showComparison && (
        <ScrollReveal>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-6">
            {filteredConstellations.map((c) => (
              <ConstellationCard
                key={c.id}
                constellation={c}
                isSelected={selectedIds.has(c.id)}
                onToggle={toggleSelection}
              />
            ))}
          </div>
          {filteredConstellations.length === 0 && (
            <div className="card text-center py-12 mb-6">
              <div className="text-4xl mb-3">&#128752;</div>
              <h3 className="text-white font-semibold mb-1">No constellations match your filters</h3>
              <p className="text-slate-400 text-sm">Try adjusting your search or filter criteria</p>
            </div>
          )}
        </ScrollReveal>
      )}

      {/* ── Quick Stats ── */}
      <ScrollReveal delay={0.1}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <div className="card p-4 text-center">
            <div className="text-2xl font-bold text-cyan-400">{CONSTELLATIONS.length}</div>
            <div className="text-xs text-slate-400 mt-1">Constellations Tracked</div>
          </div>
          <div className="card p-4 text-center">
            <div className="text-2xl font-bold text-green-400">
              {CONSTELLATIONS.reduce((acc, c) => acc + c.satellitesDeployed, 0).toLocaleString()}
            </div>
            <div className="text-xs text-slate-400 mt-1">Satellites Deployed</div>
          </div>
          <div className="card p-4 text-center">
            <div className="text-2xl font-bold text-purple-400">
              {CONSTELLATIONS.reduce((acc, c) => acc + c.satellitesPlanned, 0).toLocaleString()}
            </div>
            <div className="text-xs text-slate-400 mt-1">Total Planned</div>
          </div>
          <div className="card p-4 text-center">
            <div className="text-2xl font-bold text-amber-400">
              {CONSTELLATIONS.filter((c) => c.status === 'Operational').length}
            </div>
            <div className="text-xs text-slate-400 mt-1">Fully Operational</div>
          </div>
        </div>
      </ScrollReveal>

      {/* ── Orbit Type Breakdown ── */}
      <ScrollReveal delay={0.15}>
        <div className="card p-5 mb-6">
          <h3 className="text-sm font-semibold text-white mb-4">Constellations by Orbit Type</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {orbitTypes.map((orbit) => {
              const count = CONSTELLATIONS.filter((c) => c.orbitType === orbit).length;
              const colors = getOrbitColor(orbit);
              return (
                <button
                  key={orbit}
                  onClick={() => setOrbitFilter(orbitFilter === orbit ? 'all' : orbit)}
                  className={`p-3 rounded-xl border transition-all text-center ${
                    orbitFilter === orbit
                      ? `${colors.bg} ${colors.border} ring-1 ring-offset-0`
                      : 'bg-slate-800/50 border-slate-700 hover:border-slate-600'
                  }`}
                >
                  <div className={`text-xl font-bold ${colors.text}`}>{count}</div>
                  <div className="text-xs text-slate-400 mt-0.5">{orbit}</div>
                </button>
              );
            })}
          </div>
        </div>
      </ScrollReveal>

      {/* ── Related Pages ── */}
      <ScrollReveal delay={0.2}>
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-white mb-3">Related Pages</h3>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/compare"
              className="px-4 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-xs text-slate-400 hover:border-cyan-500/40 hover:text-cyan-400 transition-all"
            >
              All Comparisons
            </Link>
            <Link
              href="/satellites"
              className="px-4 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-xs text-slate-400 hover:border-cyan-500/40 hover:text-cyan-400 transition-all"
            >
              Satellite Tracker
            </Link>
            <Link
              href="/compare/launch-vehicles"
              className="px-4 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-xs text-slate-400 hover:border-cyan-500/40 hover:text-cyan-400 transition-all"
            >
              Compare Launch Vehicles
            </Link>
            <Link
              href="/compare/companies"
              className="px-4 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-xs text-slate-400 hover:border-cyan-500/40 hover:text-cyan-400 transition-all"
            >
              Compare Companies
            </Link>
            <Link
              href="/constellations"
              className="px-4 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-xs text-slate-400 hover:border-cyan-500/40 hover:text-cyan-400 transition-all"
            >
              Constellation Tracker
            </Link>
          </div>
        </div>
      </ScrollReveal>
    </div>
  );
}
