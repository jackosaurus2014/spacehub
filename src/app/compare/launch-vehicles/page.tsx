'use client';

import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import Link from 'next/link';
import AnimatedPageHeader from '@/components/ui/AnimatedPageHeader';
import ScrollReveal from '@/components/ui/ScrollReveal';
import BreadcrumbSchema from '@/components/seo/BreadcrumbSchema';
import RelatedModules from '@/components/ui/RelatedModules';
import { PAGE_RELATIONS } from '@/lib/module-relationships';
import { LAUNCH_VEHICLES, VEHICLE_RECORDS_AS_OF, type LaunchVehicle as CatalogVehicle, type VehicleStatus } from '@/lib/launch-vehicles-data';

// ────────────────────────────────────────
// Vehicle Data — from the shared catalogue
// ────────────────────────────────────────
// 2026-09-01 audit: this page used to carry its own hardcoded copy of the
// vehicle stats, which had drifted from src/lib/launch-vehicles-data.ts
// (it listed Starship at 11 launches, New Glenn at 2, Atlas V at 99).
// The catalogue is now the single source of truth. Only two things stay
// local: certified re-flight counts (not tracked in the catalogue) and the
// suborbital New Shepard, which the orbital catalogue deliberately omits.

type LaunchVehicle = CatalogVehicle & { maxReflights: number | null };

const MAX_REFLIGHTS: Record<string, number> = {
  'falcon-9': 40,
  'falcon-heavy': 40,
  'starship': 1000,
  'new-glenn': 25,
  'neutron': 20,
};

// Carried over from this page's previous local data (suborbital, so it has no
// catalogue entry); massKg is a published estimate and is not rendered here.
const NEW_SHEPARD: LaunchVehicle = {
  id: 'new-shepard',
  name: 'New Shepard',
  manufacturer: 'Blue Origin',
  country: 'United States',
  status: 'Operational',
  heightM: 18,
  diameterM: 3.7,
  massKg: 34000,
  payloadLeoKg: 0,
  payloadGtoKg: null,
  payloadSsoKg: null,
  payloadTliKg: null,
  costMillions: 2,
  costPerKgLeo: null,
  totalLaunches: 32,
  successes: 30,
  failures: 2,
  partialFailures: 0,
  successRate: 93.8,
  consecutiveSuccesses: 0,
  reusable: true,
  stages: 1,
  engines: '1x BE-3',
  propellant: 'LH2 / LOX',
  fairingDiameterM: 0,
  firstFlight: '2015-04-29',
  lastFlight: null,
  description: "Blue Origin's reusable suborbital vehicle for crewed tourism and research payloads (not an orbital launcher).",
  maxReflights: 25,
};

const VEHICLES: LaunchVehicle[] = [
  ...LAUNCH_VEHICLES.map((v) => ({ ...v, maxReflights: MAX_REFLIGHTS[v.id] ?? null })),
  NEW_SHEPARD,
];

// ────────────────────────────────────────
// Helper Functions
// ────────────────────────────────────────

function formatNumber(n: number | null): string {
  if (n === null || n === 0) return '--';
  return n.toLocaleString();
}

function formatCost(millions: number | null): string {
  if (millions === null) return 'TBD';
  if (millions >= 1000) return `$${(millions / 1000).toFixed(1)}B`;
  if (millions < 1) return `<$1M`;
  return `$${millions}M`;
}

function formatCostPerKg(val: number | null): string {
  if (val === null) return 'TBD';
  return `$${val.toLocaleString()}/kg`;
}

function getStatusStyle(status: VehicleStatus): { bg: string; text: string } {
  switch (status) {
    case 'Operational':
      return { bg: 'bg-green-900/30 border border-green-500/30', text: 'text-green-400' };
    case 'In Development':
      return { bg: 'bg-white/[0.04] border border-white/10', text: 'text-white/70' };
    case 'Retired':
      return { bg: 'bg-white/[0.03] border border-slate-500/30', text: 'text-slate-400' };
  }
}

function getReliabilityColor(rate: number): string {
  if (rate >= 97) return 'text-green-400';
  if (rate >= 90) return 'text-yellow-400';
  if (rate >= 75) return 'text-orange-400';
  return 'text-red-400';
}

// ────────────────────────────────────────
// Comparison Row Definitions
// ────────────────────────────────────────

type RowHighlight = 'max' | 'min' | 'none';

interface ComparisonRow {
  label: string;
  getValue: (v: LaunchVehicle) => string | number | null;
  getRawValue?: (v: LaunchVehicle) => number | null;
  highlight: RowHighlight;
  unit?: string;
  section?: string;
  renderCell?: (v: LaunchVehicle, isBest: boolean) => React.ReactNode;
}

const COMPARISON_ROWS: ComparisonRow[] = [
  // General
  { label: 'General', section: 'header', getValue: () => '', highlight: 'none' },
  {
    label: 'Status',
    getValue: (v) => v.status,
    highlight: 'none',
    renderCell: (v) => {
      const s = getStatusStyle(v.status);
      return <span className={`px-2.5 py-0.5 rounded text-xs font-medium ${s.bg} ${s.text}`}>{v.status}</span>;
    },
  },
  { label: 'Manufacturer', getValue: (v) => v.manufacturer, highlight: 'none' },
  { label: 'Country', getValue: (v) => v.country, highlight: 'none' },
  { label: 'First Flight', getValue: (v) => v.firstFlight, highlight: 'none' },
  {
    label: 'Reusable',
    getValue: (v) => v.reusable ? 'Yes' : 'No',
    highlight: 'none',
    renderCell: (v) => (
      <span className={v.reusable ? 'text-green-400 font-semibold' : 'text-star-300'}>
        {v.reusable ? (v.maxReflights ? `Yes (${v.maxReflights} flights)` : 'Yes') : 'No'}
      </span>
    ),
  },
  { label: 'Stages', getValue: (v) => v.stages, highlight: 'none' },

  // Dimensions
  { label: 'Dimensions', section: 'header', getValue: () => '', highlight: 'none' },
  {
    label: 'Height',
    getValue: (v) => `${v.heightM} m`,
    getRawValue: (v) => v.heightM,
    highlight: 'max',
    unit: 'm',
  },
  {
    label: 'Diameter',
    getValue: (v) => `${v.diameterM} m`,
    getRawValue: (v) => v.diameterM,
    highlight: 'max',
    unit: 'm',
  },

  // Payload Capacity
  { label: 'Payload Capacity', section: 'header', getValue: () => '', highlight: 'none' },
  {
    label: 'Payload to LEO',
    getValue: (v) => v.payloadLeoKg > 0 ? `${formatNumber(v.payloadLeoKg)} kg` : 'N/A',
    getRawValue: (v) => v.payloadLeoKg > 0 ? v.payloadLeoKg : null,
    highlight: 'max',
  },
  {
    label: 'Payload to GTO',
    getValue: (v) => v.payloadGtoKg ? `${formatNumber(v.payloadGtoKg)} kg` : '--',
    getRawValue: (v) => v.payloadGtoKg,
    highlight: 'max',
  },
  {
    label: 'Payload to SSO',
    getValue: (v) => v.payloadSsoKg ? `${formatNumber(v.payloadSsoKg)} kg` : '--',
    getRawValue: (v) => v.payloadSsoKg,
    highlight: 'max',
  },

  // Cost
  { label: 'Cost', section: 'header', getValue: () => '', highlight: 'none' },
  {
    label: 'Cost per Launch',
    getValue: (v) => formatCost(v.costMillions),
    getRawValue: (v) => v.costMillions,
    highlight: 'min',
  },
  {
    label: 'Cost per kg to LEO',
    getValue: (v) => formatCostPerKg(v.costPerKgLeo),
    getRawValue: (v) => v.costPerKgLeo,
    highlight: 'min',
  },

  // Propulsion
  { label: 'Propulsion', section: 'header', getValue: () => '', highlight: 'none' },
  { label: 'Engines', getValue: (v) => v.engines, highlight: 'none' },
  { label: 'Propellant', getValue: (v) => v.propellant, highlight: 'none' },

  // Reliability
  { label: 'Track Record', section: 'header', getValue: () => '', highlight: 'none' },
  {
    label: 'Total Launches',
    getValue: (v) => v.totalLaunches > 0 ? v.totalLaunches.toString() : '--',
    getRawValue: (v) => v.totalLaunches > 0 ? v.totalLaunches : null,
    highlight: 'max',
  },
  {
    label: 'Success Rate',
    getValue: (v) => v.totalLaunches > 0 ? `${v.successRate.toFixed(1)}%` : 'N/A',
    getRawValue: (v) => v.totalLaunches > 0 ? v.successRate : null,
    highlight: 'max',
    renderCell: (v, isBest) => {
      if (v.totalLaunches === 0) return <span className="text-star-300">N/A</span>;
      return (
        <span className={`font-bold ${isBest ? 'text-green-400' : getReliabilityColor(v.successRate)}`}>
          {v.successRate.toFixed(1)}%
        </span>
      );
    },
  },
];

// ────────────────────────────────────────
// Vehicle Selector Component
// ────────────────────────────────────────

function VehicleSelector({
  selected,
  onAdd,
  onRemove,
  maxVehicles = 4,
}: {
  selected: LaunchVehicle[];
  onAdd: (v: LaunchVehicle) => void;
  onRemove: (id: string) => void;
  maxVehicles?: number;
}) {
  const [search, setSearch] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedIds = useMemo(() => new Set(selected.map((v) => v.id)), [selected]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return VEHICLES.filter((v) => {
      if (selectedIds.has(v.id)) return false;
      if (!q) return true;
      return (
        v.name.toLowerCase().includes(q) ||
        v.manufacturer.toLowerCase().includes(q) ||
        v.country.toLowerCase().includes(q)
      );
    });
  }, [search, selectedIds]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleSelect = useCallback(
    (v: LaunchVehicle) => {
      onAdd(v);
      setSearch('');
      setDropdownOpen(false);
      inputRef.current?.blur();
    },
    [onAdd]
  );

  return (
    <div className="card p-5 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-semibold text-white">Select Launch Vehicles to Compare</h2>
          <p className="text-xs text-star-300 mt-0.5">
            Choose up to {maxVehicles} vehicles. Search by name, manufacturer, or country.
          </p>
        </div>
        <span className="text-xs text-star-300 bg-white/[0.06] px-2.5 py-1 rounded-full">
          {selected.length} / {maxVehicles}
        </span>
      </div>

      {/* Selected chips */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {selected.map((v) => (
            <span
              key={v.id}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/8 text-white/70 border border-white/10 rounded-lg text-xs font-medium"
            >
              {v.name}
              <button
                onClick={() => onRemove(v.id)}
                className="ml-0.5 hover:text-white transition-colors"
                aria-label={`Remove ${v.name}`}
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </span>
          ))}
          <button
            onClick={() => selected.forEach((v) => onRemove(v.id))}
            className="text-xs text-star-300 hover:text-white transition-colors px-2 py-1"
          >
            Clear all
          </button>
        </div>
      )}

      {/* Search input + dropdown */}
      {selected.length < maxVehicles && (
        <div className="relative" ref={dropdownRef}>
          <div className="relative">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-star-300 pointer-events-none"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              ref={inputRef}
              type="search"
              placeholder="Search vehicles... (e.g. Falcon 9, SpaceX, India)"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setDropdownOpen(true);
              }}
              onFocus={() => setDropdownOpen(true)}
              className="w-full pl-10 pr-4 py-2.5 bg-white/[0.06] border border-white/[0.08] rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-white/15 transition-all"
            />
          </div>

          {dropdownOpen && (
            <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white/[0.06] border border-white/[0.08] rounded-xl shadow-xl max-h-64 overflow-y-auto">
              {filtered.length === 0 ? (
                <div className="px-4 py-3 text-sm text-star-300">No matching vehicles found</div>
              ) : (
                filtered.map((v) => {
                  const s = getStatusStyle(v.status);
                  return (
                    <button
                      key={v.id}
                      onClick={() => handleSelect(v)}
                      className="w-full text-left px-4 py-2.5 hover:bg-white/[0.08] transition-colors flex items-center justify-between gap-3 border-b border-white/[0.06] last:border-b-0"
                    >
                      <div>
                        <span className="text-sm font-medium text-white">{v.name}</span>
                        <span className="text-xs text-star-300 ml-2">{v.manufacturer}</span>
                      </div>
                      <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${s.bg} ${s.text}`}>
                        {v.status}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          )}
        </div>
      )}

      {/* Quick-pick buttons */}
      <div className="mt-4">
        <p className="text-xs uppercase tracking-widest text-star-300 font-medium mb-2">Quick Pick</p>
        <div className="flex flex-wrap gap-1.5">
          {VEHICLES.filter((v) => !selectedIds.has(v.id))
            .slice(0, 10)
            .map((v) => (
              <button
                key={v.id}
                onClick={() => onAdd(v)}
                disabled={selected.length >= maxVehicles}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all border ${
                  selected.length >= maxVehicles
                    ? 'opacity-30 cursor-not-allowed bg-white/[0.06] text-star-300 border-white/[0.08]'
                    : 'bg-white/[0.06] text-star-300 border-white/[0.08] hover:border-white/15 hover:text-white'
                }`}
              >
                {v.name}
              </button>
            ))}
        </div>
      </div>

      {/* Preset comparisons */}
      <div className="mt-4 pt-4 border-t border-white/[0.06]">
        <p className="text-xs uppercase tracking-widest text-star-300 font-medium mb-2">Preset Comparisons</p>
        <div className="flex flex-wrap gap-2">
          {[
            { label: 'US Heavy Lift', ids: ['falcon-heavy', 'starship', 'new-glenn', 'vulcan-centaur'] },
            { label: 'Reusable Rockets', ids: ['falcon-9', 'starship', 'new-glenn', 'neutron'] },
            { label: 'Small Launch', ids: ['electron', 'pslv', 'new-shepard'] },
            { label: 'International', ids: ['falcon-9', 'ariane-6', 'h3', 'long-march-5'] },
            { label: 'ULA Transition', ids: ['atlas-v', 'vulcan-centaur', 'falcon-9'] },
            { label: 'Budget-Friendly', ids: ['electron', 'pslv', 'falcon-9', 'h3'] },
          ].map((preset) => (
            <button
              key={preset.label}
              onClick={() => {
                const vehicles = preset.ids
                  .map((id) => VEHICLES.find((v) => v.id === id))
                  .filter((v): v is LaunchVehicle => v !== undefined);
                // Clear existing and add preset
                selected.forEach((v) => onRemove(v.id));
                vehicles.forEach((v) => onAdd(v));
              }}
              className="px-3 py-1.5 bg-white/[0.04] border border-white/[0.08] rounded-lg text-xs text-star-300 hover:border-white/15 hover:text-white transition-all"
            >
              {preset.label}
            </button>
          ))}
        </div>

        <RelatedModules modules={PAGE_RELATIONS['compare/launch-vehicles']} />
      </div>
    </div>
  );
}

// ────────────────────────────────────────
// Visual Bar Chart Components
// ────────────────────────────────────────

const VEHICLE_COLORS = ['#06b6d4', '#a855f7', '#f59e0b', '#10b981'];

function PayloadChart({ vehicles }: { vehicles: LaunchVehicle[] }) {
  const allValues = vehicles.flatMap((v) => [v.payloadLeoKg, v.payloadGtoKg].filter((n): n is number => n !== null && n > 0));
  const maxVal = Math.max(...allValues, 1);
  const fmtPayload = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(1)}t` : `${n} kg`;
  const bars: [string, (v: LaunchVehicle) => number | null][] = [
    ['LEO', (v) => v.payloadLeoKg > 0 ? v.payloadLeoKg : null],
    ['GTO', (v) => v.payloadGtoKg],
  ];

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-sm font-semibold text-white">Payload Capacity Comparison</h3>
        <span className="text-xs text-star-300">Higher is better</span>
      </div>
      <div className="flex gap-3 text-xs text-star-300 mb-4">
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm opacity-90" style={{ backgroundColor: '#06b6d4' }} /> LEO</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm opacity-60" style={{ backgroundColor: '#06b6d4' }} /> GTO</span>
      </div>
      <div className="space-y-4">
        {vehicles.map((v, vi) => (
          <div key={v.id}>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-medium text-white truncate mr-2">{v.name}</span>
              <span className="text-xs text-star-300 shrink-0">{v.manufacturer}</span>
            </div>
            {bars.map(([label, getVal], bi) => {
              const val = getVal(v);
              const pct = val && val > 0 ? (val / maxVal) * 100 : 0;
              const color = VEHICLE_COLORS[vi % VEHICLE_COLORS.length];
              return (
                <div key={bi} className="flex items-center gap-2 mb-1">
                  <span className="w-7 text-xs text-star-300 text-right shrink-0">{label}</span>
                  <div className="flex-1 h-5 bg-white/[0.05] rounded overflow-hidden relative">
                    <div
                      className="h-full rounded transition-all duration-700 ease-out"
                      style={{ width: `${Math.max(pct, 0.5)}%`, backgroundColor: color, opacity: bi === 0 ? 1 : 0.55 }}
                    />
                    {val && val > 0 ? (
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-white font-medium">{fmtPayload(val)}</span>
                    ) : (
                      <span className="absolute left-10 top-1/2 -translate-y-1/2 text-xs text-star-300">N/A</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

function CostEfficiencyChart({ vehicles }: { vehicles: LaunchVehicle[] }) {
  const validVehicles = vehicles.filter((v) => v.costPerKgLeo !== null && v.costPerKgLeo > 0);
  const maxCpk = Math.max(...validVehicles.map((v) => v.costPerKgLeo!), 1);
  const minCpk = validVehicles.length > 0 ? Math.min(...validVehicles.map((v) => v.costPerKgLeo!)) : 0;

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-sm font-semibold text-white">Cost Efficiency ($/kg to LEO)</h3>
        <span className="text-xs text-star-300">Lower is better</span>
      </div>
      <p className="text-xs text-star-300 mb-4">Cost per kilogram delivered to Low Earth Orbit</p>
      <div className="space-y-3">
        {[...vehicles]
          .sort((a, b) => (a.costPerKgLeo ?? Infinity) - (b.costPerKgLeo ?? Infinity))
          .map((v) => {
            const cpk = v.costPerKgLeo;
            const cost = v.costMillions;
            const pct = cpk && cpk > 0 ? (cpk / maxCpk) * 100 : 0;
            const isBest = cpk === minCpk && minCpk > 0;
            const barColor = isBest ? '#10b981' : cpk && cpk <= 3000 ? '#06b6d4' : cpk && cpk <= 5000 ? '#f59e0b' : '#ef4444';
            return (
              <div key={v.id}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-white truncate mr-2">{v.name}</span>
                  <div className="flex items-center gap-2 shrink-0">
                    {cost !== null && <span className="text-xs text-star-300">{formatCost(cost)}/launch</span>}
                    {isBest && <span className="text-[9px] px-1.5 py-0.5 bg-green-900/40 text-green-400 border border-green-500/30 rounded font-medium">BEST</span>}
                  </div>
                </div>
                <div className="flex-1 h-6 bg-white/[0.05] rounded overflow-hidden relative">
                  {cpk && cpk > 0 ? (
                    <>
                      <div className="h-full rounded transition-all duration-700 ease-out" style={{ width: `${Math.max(pct, 2)}%`, backgroundColor: barColor }} />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-white font-bold">${cpk.toLocaleString()}/kg</span>
                    </>
                  ) : (
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-star-300">Cost data unavailable</span>
                  )}
                </div>
              </div>
            );
          })}
      </div>
      <div className="mt-4 pt-3 border-t border-white/[0.06] flex flex-wrap items-center gap-3 text-xs text-star-300">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-green-500" /> Under $1K/kg</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-white" /> $1K-$3K/kg</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-amber-500" /> $3K-$5K/kg</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-red-500" /> Over $5K/kg</span>
      </div>
    </div>
  );
}

function SuccessRateChart({ vehicles }: { vehicles: LaunchVehicle[] }) {
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-sm font-semibold text-white">Reliability & Track Record</h3>
        <span className="text-xs text-star-300">Higher is better</span>
      </div>
      <p className="text-xs text-star-300 mb-4">Success rate with total launch count</p>
      <div className="space-y-3">
        {vehicles.map((v) => {
          const rate = v.totalLaunches > 0 ? v.successRate : null;
          const barColor = rate !== null
            ? rate >= 97 ? '#10b981' : rate >= 90 ? '#f59e0b' : rate >= 75 ? '#f97316' : '#ef4444'
            : '#475569';
          return (
            <div key={v.id}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-white truncate mr-2">{v.name}</span>
                <span className="text-xs text-star-300 shrink-0">{v.totalLaunches > 0 ? `${v.totalLaunches} launches` : 'No launches yet'}</span>
              </div>
              <div className="flex-1 h-5 bg-white/[0.05] rounded overflow-hidden relative">
                {rate !== null ? (
                  <>
                    <div className="h-full rounded transition-all duration-700 ease-out" style={{ width: `${rate}%`, backgroundColor: barColor }} />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-white font-bold">{rate.toFixed(1)}%</span>
                  </>
                ) : (
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-star-300">No flight data</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ────────────────────────────────────────
// Comparison Table Component
// ────────────────────────────────────────

function ComparisonTable({ vehicles }: { vehicles: LaunchVehicle[] }) {
  // For each row, compute the best value
  const getBestIdx = useCallback(
    (row: ComparisonRow): Set<number> => {
      if (row.highlight === 'none' || !row.getRawValue) return new Set();
      const values = vehicles.map((v) => row.getRawValue!(v));
      const validValues = values.filter((v): v is number => v !== null && v > 0);
      if (validValues.length === 0) return new Set();

      const best = row.highlight === 'max' ? Math.max(...validValues) : Math.min(...validValues);
      const indices = new Set<number>();
      values.forEach((val, idx) => {
        if (val === best) indices.add(idx);
      });
      return indices;
    },
    [vehicles]
  );

  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/[0.08]">
              <th className="text-left py-3 px-4 text-star-300 font-medium text-xs uppercase tracking-widest sticky left-0 bg-black/95 backdrop-blur z-10 min-w-[160px]">
                Specification
              </th>
              {vehicles.map((v) => (
                <th key={v.id} className="text-center py-3 px-4 min-w-[180px]">
                  <div className="text-white font-bold text-sm">{v.name}</div>
                  <div className="text-star-300 text-xs mt-0.5">{v.manufacturer}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.06]">
            {COMPARISON_ROWS.map((row, rowIdx) => {
              // Section header
              if (row.section === 'header') {
                return (
                  <tr key={`section-${rowIdx}`} className="bg-white/[0.04]">
                    <td
                      colSpan={vehicles.length + 1}
                      className="py-2 px-4 text-xs font-bold text-white/70 uppercase tracking-widest"
                    >
                      {row.label}
                    </td>
                  </tr>
                );
              }

              const bestIndices = getBestIdx(row);

              return (
                <tr key={`row-${rowIdx}`} className="hover:bg-white/[0.02] transition-colors">
                  <td className="py-2.5 px-4 text-star-300 text-xs font-medium sticky left-0 bg-black/95 backdrop-blur z-10">
                    {row.label}
                  </td>
                  {vehicles.map((v, vIdx) => {
                    const isBest = bestIndices.has(vIdx);

                    if (row.renderCell) {
                      return (
                        <td
                          key={v.id}
                          className={`py-2.5 px-4 text-center ${isBest ? 'bg-green-400/5' : ''}`}
                        >
                          {row.renderCell(v, isBest)}
                        </td>
                      );
                    }

                    const displayValue = row.getValue(v);

                    return (
                      <td
                        key={v.id}
                        className={`py-2.5 px-4 text-center ${
                          isBest
                            ? 'bg-green-400/5 text-green-400 font-semibold'
                            : 'text-white'
                        }`}
                      >
                        <span className="text-sm">{displayValue ?? '--'}</span>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="px-4 py-3 border-t border-white/[0.06] flex items-center gap-4 text-xs text-star-300">
        <span className="inline-flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-green-400/10 border border-green-400/30" />
          Best value in category
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="text-star-300">--</span>
          Not applicable / unavailable
        </span>
      </div>
    </div>
  );
}

// ────────────────────────────────────────
// Main Page Component
// ────────────────────────────────────────

export default function LaunchVehicleComparePage() {
  const [selected, setSelected] = useState<LaunchVehicle[]>([]);
  const [viewMode, setViewMode] = useState<'table' | 'charts'>('table');

  const handleAdd = useCallback((v: LaunchVehicle) => {
    setSelected((prev) => {
      if (prev.length >= 4) return prev;
      if (prev.some((p) => p.id === v.id)) return prev;
      return [...prev, v];
    });
  }, []);

  const handleRemove = useCallback((id: string) => {
    setSelected((prev) => prev.filter((v) => v.id !== id));
  }, []);

  return (
    <div className="min-h-screen p-4 lg:p-8 max-w-[1600px] mx-auto">
      <BreadcrumbSchema items={[{ name: 'Home', href: '/' }, { name: 'Compare', href: '/compare' }, { name: 'Launch Vehicles Comparison' }]} />

      <AnimatedPageHeader
        title="Launch Vehicle Comparison"
        subtitle="Compare launch vehicles side-by-side across payload capacity, cost, dimensions, propulsion, and reliability"
        icon="&#128640;"
        accentColor="cyan"
      />

      <p className="text-xs text-star-300 mb-4">
        Specs and career records from the SpaceNexus launch-vehicle catalogue, as of {VEHICLE_RECORDS_AS_OF}. Prices are list or estimated figures.
      </p>

      {/* Vehicle Selector */}
      <ScrollReveal>
        <VehicleSelector selected={selected} onAdd={handleAdd} onRemove={handleRemove} />
      </ScrollReveal>

      {/* Comparison content or empty state */}
      {selected.length < 2 ? (
        <div className="text-center py-20 card">
          <div className="text-6xl mb-4">&#128640;</div>
          <h3 className="text-xl font-semibold text-white mb-2">Select at Least 2 Vehicles</h3>
          <p className="text-star-300 text-sm max-w-md mx-auto mb-6">
            Pick 2 to 4 launch vehicles above to see a detailed side-by-side comparison of their
            specifications, payload capacity, cost, and reliability track record.
          </p>
          <p className="text-star-300 text-xs">
            Or use one of the preset comparisons to get started quickly.
          </p>
        </div>
      ) : (
        <>
          {/* View mode toggle */}
          <div className="flex items-center gap-1 mb-4 bg-white/[0.04] border border-white/[0.08] rounded-lg p-1 w-fit">
            <button
              onClick={() => setViewMode('table')}
              className={`px-4 py-1.5 rounded-md text-xs font-medium transition-all ${
                viewMode === 'table'
                  ? 'bg-white/10 text-white/70 border border-white/10'
                  : 'text-star-300 hover:text-white border border-transparent'
              }`}
            >
              Table View
            </button>
            <button
              onClick={() => setViewMode('charts')}
              className={`px-4 py-1.5 rounded-md text-xs font-medium transition-all ${
                viewMode === 'charts'
                  ? 'bg-white/10 text-white/70 border border-white/10'
                  : 'text-star-300 hover:text-white border border-transparent'
              }`}
            >
              Visual Charts
            </button>
          </div>

          {viewMode === 'table' ? (
            <ComparisonTable vehicles={selected} />
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <PayloadChart vehicles={selected} />
              <CostEfficiencyChart vehicles={selected} />
              <div className="lg:col-span-2">
                <SuccessRateChart vehicles={selected} />
              </div>
            </div>
          )}
        </>
      )}

      {/* Quick Stats Footer */}
      <ScrollReveal delay={0.1}>
      <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="card p-4 text-center">
          <div className="text-2xl font-bold text-white/70">{VEHICLES.length}</div>
          <div className="text-xs text-star-300 mt-1">Vehicles in Database</div>
        </div>
        <div className="card p-4 text-center">
          <div className="text-2xl font-bold text-green-400">
            {VEHICLES.filter((v) => v.status === 'Operational').length}
          </div>
          <div className="text-xs text-star-300 mt-1">Operational</div>
        </div>
        <div className="card p-4 text-center">
          <div className="text-2xl font-bold text-amber-400">
            {VEHICLES.filter((v) => v.reusable).length}
          </div>
          <div className="text-xs text-star-300 mt-1">Reusable</div>
        </div>
        <div className="card p-4 text-center">
          <div className="text-2xl font-bold text-purple-400">
            {VEHICLES.reduce((acc, v) => acc + v.totalLaunches, 0).toLocaleString()}
          </div>
          <div className="text-xs text-star-300 mt-1">Combined Launches</div>
        </div>
      </div>
      </ScrollReveal>

      {/* Related Links */}
      <ScrollReveal delay={0.2}>
      <div className="mt-8 card p-5">
        <h3 className="text-sm font-semibold text-white mb-3">Related Pages</h3>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/launch-vehicles"
            className="px-4 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-xs text-star-300 hover:border-white/15 hover:text-white transition-all"
          >
            Launch Vehicle Database
          </Link>
          <Link
            href="/launch-cost-calculator"
            className="px-4 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-xs text-star-300 hover:border-white/15 hover:text-white transition-all"
          >
            Launch Cost Calculator
          </Link>
          <Link
            href="/compare/companies"
            className="px-4 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-xs text-star-300 hover:border-white/15 hover:text-white transition-all"
          >
            Compare Companies
          </Link>
          <Link
            href="/mission-cost"
            className="px-4 py-2 bg-white/[0.04] border border-white/[0.08] rounded-lg text-xs text-star-300 hover:border-white/15 hover:text-white transition-all"
          >
            Mission Planning
          </Link>
        </div>
      </div>
      </ScrollReveal>
    </div>
  );
}
