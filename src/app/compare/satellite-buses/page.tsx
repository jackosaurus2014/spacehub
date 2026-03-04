'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import AnimatedPageHeader from '@/components/ui/AnimatedPageHeader';
import ScrollReveal from '@/components/ui/ScrollReveal';

// ────────────────────────────────────────
// Types
// ────────────────────────────────────────

type BusClass = 'Small' | 'Medium' | 'Large' | 'Rideshare';

interface SatelliteBus {
  id: string;
  name: string;
  manufacturer: string;
  busClass: BusClass;
  massKg: number;
  powerW: number;
  lifetimeYears: number;
  heritage: number;
  costMillions: number | null;
  payloadCapacityKg: number;
  propulsion: string;
  applications: string[];
}

// ────────────────────────────────────────
// Satellite Bus Data (22 buses)
// ────────────────────────────────────────

const SATELLITE_BUSES: SatelliteBus[] = [
  // Small / Micro
  {
    id: 'dove',
    name: 'Dove (SuperDove)',
    manufacturer: 'Planet Labs',
    busClass: 'Small',
    massKg: 5,
    powerW: 15,
    lifetimeYears: 3,
    heritage: 500,
    costMillions: 0.3,
    payloadCapacityKg: 2,
    propulsion: 'None (drag-based deorbit)',
    applications: ['Earth Observation', 'Remote Sensing'],
  },
  {
    id: 'm700',
    name: 'M700',
    manufacturer: 'AAC Clyde Space',
    busClass: 'Small',
    massKg: 50,
    powerW: 80,
    lifetimeYears: 5,
    heritage: 18,
    costMillions: 2,
    payloadCapacityKg: 20,
    propulsion: 'Cold gas / Electric',
    applications: ['Earth Observation', 'IoT', 'Technology Demonstration'],
  },
  {
    id: 'sstl-150',
    name: 'SSTL-150',
    manufacturer: 'SSTL (Airbus)',
    busClass: 'Small',
    massKg: 150,
    powerW: 250,
    lifetimeYears: 7,
    heritage: 30,
    costMillions: 8,
    payloadCapacityKg: 50,
    propulsion: 'Hydrazine monopropellant',
    applications: ['Earth Observation', 'Communications', 'Science'],
  },
  {
    id: 'xb1',
    name: 'XB1',
    manufacturer: 'Blue Canyon Technologies',
    busClass: 'Small',
    massKg: 12,
    powerW: 40,
    lifetimeYears: 5,
    heritage: 45,
    costMillions: 1,
    payloadCapacityKg: 6,
    propulsion: 'Cold gas',
    applications: ['Technology Demonstration', 'Science', 'Earth Observation'],
  },
  {
    id: 'xb12',
    name: 'XB12',
    manufacturer: 'Blue Canyon Technologies',
    busClass: 'Small',
    massKg: 60,
    powerW: 120,
    lifetimeYears: 7,
    heritage: 25,
    costMillions: 3,
    payloadCapacityKg: 25,
    propulsion: 'Green monopropellant',
    applications: ['Earth Observation', 'Communications', 'ISR'],
  },
  {
    id: 'espa-class',
    name: 'ESPA-Class Microsatellite',
    manufacturer: 'Northrop Grumman',
    busClass: 'Small',
    massKg: 180,
    powerW: 300,
    lifetimeYears: 5,
    heritage: 15,
    costMillions: 10,
    payloadCapacityKg: 80,
    propulsion: 'Hydrazine / Electric',
    applications: ['ISR', 'Technology Demonstration', 'Science'],
  },
  // Medium
  {
    id: 'bcp-2000',
    name: 'BCP-2000',
    manufacturer: 'Ball Aerospace',
    busClass: 'Medium',
    massKg: 350,
    powerW: 1000,
    lifetimeYears: 10,
    heritage: 20,
    costMillions: 40,
    payloadCapacityKg: 150,
    propulsion: 'Hydrazine bipropellant',
    applications: ['Earth Observation', 'Science', 'Weather'],
  },
  {
    id: 'eurostar-neo',
    name: 'Eurostar Neo',
    manufacturer: 'Airbus Defence & Space',
    busClass: 'Medium',
    massKg: 4500,
    powerW: 25000,
    lifetimeYears: 15,
    heritage: 12,
    costMillions: 150,
    payloadCapacityKg: 2000,
    propulsion: 'Electric (Hall-effect thrusters)',
    applications: ['GEO Communications', 'Broadcasting', 'Government'],
  },
  {
    id: 'ssl-1300',
    name: 'SSL 1300',
    manufacturer: 'Maxar Technologies',
    busClass: 'Medium',
    massKg: 3500,
    powerW: 20000,
    lifetimeYears: 15,
    heritage: 120,
    costMillions: 130,
    payloadCapacityKg: 1800,
    propulsion: 'Bipropellant / Electric hybrid',
    applications: ['GEO Communications', 'Broadcasting', 'Military'],
  },
  {
    id: 'spacebus-neo',
    name: 'Spacebus Neo',
    manufacturer: 'Thales Alenia Space',
    busClass: 'Medium',
    massKg: 3800,
    powerW: 20000,
    lifetimeYears: 15,
    heritage: 8,
    costMillions: 140,
    payloadCapacityKg: 1600,
    propulsion: 'Electric (PPS-5000 thrusters)',
    applications: ['GEO Communications', 'Broadcasting', 'HTS'],
  },
  {
    id: 'geostar-3',
    name: 'GEOStar-3',
    manufacturer: 'Northrop Grumman',
    busClass: 'Medium',
    massKg: 2800,
    powerW: 12000,
    lifetimeYears: 15,
    heritage: 30,
    costMillions: 100,
    payloadCapacityKg: 800,
    propulsion: 'Bipropellant / Electric',
    applications: ['GEO Communications', 'Government', 'Military'],
  },
  {
    id: 'leo-vantage',
    name: 'LEO Vantage',
    manufacturer: 'MDA (now Terran Orbital)',
    busClass: 'Medium',
    massKg: 500,
    powerW: 1800,
    lifetimeYears: 7,
    heritage: 5,
    costMillions: 20,
    payloadCapacityKg: 200,
    propulsion: 'Green monopropellant',
    applications: ['LEO Constellation', 'Earth Observation', 'Communications'],
  },
  // Large
  {
    id: 'boeing-702',
    name: 'Boeing 702',
    manufacturer: 'Boeing Defense & Space',
    busClass: 'Large',
    massKg: 6000,
    powerW: 18000,
    lifetimeYears: 15,
    heritage: 55,
    costMillions: 200,
    payloadCapacityKg: 2500,
    propulsion: 'XIPS ion thrusters / Bipropellant',
    applications: ['GEO Communications', 'Broadcasting', 'Military'],
  },
  {
    id: 'a2100',
    name: 'A2100',
    manufacturer: 'Lockheed Martin',
    busClass: 'Large',
    massKg: 4200,
    powerW: 15000,
    lifetimeYears: 15,
    heritage: 45,
    costMillions: 180,
    payloadCapacityKg: 1500,
    propulsion: 'Bipropellant / Electric hybrid',
    applications: ['GEO Communications', 'Military', 'GPS'],
  },
  {
    id: 'maxar-1300',
    name: '1300-Class',
    manufacturer: 'Maxar Technologies',
    busClass: 'Large',
    massKg: 5500,
    powerW: 25000,
    lifetimeYears: 15,
    heritage: 95,
    costMillions: 170,
    payloadCapacityKg: 2200,
    propulsion: 'Bipropellant / Electric hybrid',
    applications: ['GEO Communications', 'HTS', 'Broadcasting', 'Government'],
  },
  {
    id: 'onesat',
    name: 'OneSat',
    manufacturer: 'Airbus Defence & Space',
    busClass: 'Large',
    massKg: 4000,
    powerW: 20000,
    lifetimeYears: 15,
    heritage: 6,
    costMillions: 160,
    payloadCapacityKg: 1800,
    propulsion: 'Electric (Hall-effect thrusters)',
    applications: ['GEO Communications', 'HTS', 'Government', 'In-orbit Reconfigurable'],
  },
  {
    id: 'spacebus-4000',
    name: 'Spacebus 4000',
    manufacturer: 'Thales Alenia Space',
    busClass: 'Large',
    massKg: 5200,
    powerW: 16000,
    lifetimeYears: 15,
    heritage: 60,
    costMillions: 155,
    payloadCapacityKg: 1500,
    propulsion: 'Bipropellant (Apogee motor + thrusters)',
    applications: ['GEO Communications', 'Broadcasting', 'Military'],
  },
  // Rideshare / Hosted Payload
  {
    id: 'photon',
    name: 'Photon',
    manufacturer: 'Rocket Lab',
    busClass: 'Rideshare',
    massKg: 170,
    powerW: 200,
    lifetimeYears: 5,
    heritage: 8,
    costMillions: 7,
    payloadCapacityKg: 40,
    propulsion: 'HyperCurie (bipropellant)',
    applications: ['LEO/Lunar Missions', 'Science', 'Technology Demonstration'],
  },
  {
    id: 's-class',
    name: 'S-CLASS',
    manufacturer: 'York Space Systems',
    busClass: 'Rideshare',
    massKg: 85,
    powerW: 200,
    lifetimeYears: 5,
    heritage: 30,
    costMillions: 3,
    payloadCapacityKg: 35,
    propulsion: 'Green monopropellant',
    applications: ['Earth Observation', 'ISR', 'Communications'],
  },
  {
    id: 'loft-payload',
    name: 'YAM Series',
    manufacturer: 'Loft Orbital',
    busClass: 'Rideshare',
    massKg: 130,
    powerW: 350,
    lifetimeYears: 5,
    heritage: 6,
    costMillions: 5,
    payloadCapacityKg: 50,
    propulsion: 'Green monopropellant',
    applications: ['Hosted Payload', 'Earth Observation', 'IoT', 'ISR'],
  },
  {
    id: 'starling',
    name: 'Starlink Bus (v2 Mini)',
    manufacturer: 'SpaceX',
    busClass: 'Rideshare',
    massKg: 800,
    powerW: 4500,
    lifetimeYears: 5,
    heritage: 7000,
    costMillions: 0.5,
    payloadCapacityKg: 0,
    propulsion: 'Krypton Hall-effect thruster',
    applications: ['LEO Constellation', 'Broadband Internet'],
  },
  {
    id: 'oneweb-bus',
    name: 'OneWeb Satellite Bus',
    manufacturer: 'Airbus Defence & Space',
    busClass: 'Rideshare',
    massKg: 150,
    powerW: 1500,
    lifetimeYears: 5,
    heritage: 650,
    costMillions: 1,
    payloadCapacityKg: 0,
    propulsion: 'Xenon Hall-effect thruster',
    applications: ['LEO Constellation', 'Broadband Internet'],
  },
];

// ────────────────────────────────────────
// Derived filter values
// ────────────────────────────────────────

const ALL_CLASSES: BusClass[] = ['Small', 'Medium', 'Large', 'Rideshare'];

const ALL_MANUFACTURERS = Array.from(
  new Set(SATELLITE_BUSES.map((b) => b.manufacturer))
).sort();

const ALL_APPLICATIONS = Array.from(
  new Set(SATELLITE_BUSES.flatMap((b) => b.applications))
).sort();

// ────────────────────────────────────────
// Helper Functions
// ────────────────────────────────────────

type SortField = 'mass' | 'power' | 'lifetime' | 'cost';
type SortDir = 'asc' | 'desc';

function formatPower(watts: number): string {
  if (watts >= 1000) return `${(watts / 1000).toFixed(1)} kW`;
  return `${watts} W`;
}

function formatCost(millions: number | null): string {
  if (millions === null) return 'TBD';
  if (millions < 1) return `$${(millions * 1000).toFixed(0)}K`;
  return `$${millions}M`;
}

function formatMass(kg: number): string {
  if (kg >= 1000) return `${(kg / 1000).toFixed(1)} t`;
  return `${kg} kg`;
}

function getClassColor(busClass: BusClass): { bg: string; text: string; border: string } {
  switch (busClass) {
    case 'Small':
      return { bg: 'bg-emerald-900/30', text: 'text-emerald-400', border: 'border-emerald-500/30' };
    case 'Medium':
      return { bg: 'bg-blue-900/30', text: 'text-blue-400', border: 'border-blue-500/30' };
    case 'Large':
      return { bg: 'bg-amber-900/30', text: 'text-amber-400', border: 'border-amber-500/30' };
    case 'Rideshare':
      return { bg: 'bg-purple-900/30', text: 'text-purple-400', border: 'border-purple-500/30' };
  }
}

function getSortValue(bus: SatelliteBus, field: SortField): number {
  switch (field) {
    case 'mass': return bus.massKg;
    case 'power': return bus.powerW;
    case 'lifetime': return bus.lifetimeYears;
    case 'cost': return bus.costMillions ?? 999999;
  }
}

// ────────────────────────────────────────
// Comparison Panel Component
// ────────────────────────────────────────

function ComparisonPanel({
  buses,
  onRemove,
  onClear,
}: {
  buses: SatelliteBus[];
  onRemove: (id: string) => void;
  onClear: () => void;
}) {
  if (buses.length < 2) {
    return (
      <div className="text-center py-16 card">
        <div className="text-6xl mb-4">&#128752;</div>
        <h3 className="text-xl font-semibold text-white mb-2">Select at Least 2 Buses</h3>
        <p className="text-slate-400 text-sm max-w-md mx-auto">
          Click the &quot;Compare&quot; checkbox on 2 to 3 satellite buses above to see a detailed
          side-by-side comparison of their specifications.
        </p>
      </div>
    );
  }

  const rows: {
    label: string;
    getValue: (b: SatelliteBus) => string;
    getRawValue?: (b: SatelliteBus) => number | null;
    highlight?: 'max' | 'min';
    section?: boolean;
  }[] = [
    { label: 'Overview', section: true, getValue: () => '' },
    { label: 'Manufacturer', getValue: (b) => b.manufacturer },
    { label: 'Class', getValue: (b) => b.busClass },
    { label: 'Heritage (units flown)', getValue: (b) => b.heritage.toLocaleString(), getRawValue: (b) => b.heritage, highlight: 'max' },
    { label: 'Specifications', section: true, getValue: () => '' },
    { label: 'Bus Mass', getValue: (b) => formatMass(b.massKg), getRawValue: (b) => b.massKg },
    { label: 'Power', getValue: (b) => formatPower(b.powerW), getRawValue: (b) => b.powerW, highlight: 'max' },
    { label: 'Design Lifetime', getValue: (b) => `${b.lifetimeYears} years`, getRawValue: (b) => b.lifetimeYears, highlight: 'max' },
    { label: 'Payload Capacity', getValue: (b) => b.payloadCapacityKg > 0 ? `${b.payloadCapacityKg} kg` : 'Integrated', getRawValue: (b) => b.payloadCapacityKg > 0 ? b.payloadCapacityKg : null, highlight: 'max' },
    { label: 'Cost & Propulsion', section: true, getValue: () => '' },
    { label: 'Estimated Cost', getValue: (b) => formatCost(b.costMillions), getRawValue: (b) => b.costMillions, highlight: 'min' },
    { label: 'Propulsion', getValue: (b) => b.propulsion },
    { label: 'Applications', section: true, getValue: () => '' },
    { label: 'Use Cases', getValue: (b) => b.applications.join(', ') },
  ];

  return (
    <div className="card overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
        <h3 className="text-sm font-semibold text-white">Side-by-Side Comparison</h3>
        <button
          onClick={onClear}
          className="text-xs text-slate-400 hover:text-white transition-colors"
        >
          Clear selection
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700">
              <th className="text-left py-3 px-4 text-slate-400 font-medium text-xs uppercase tracking-widest sticky left-0 bg-slate-900/95 backdrop-blur z-10 min-w-[150px]">
                Specification
              </th>
              {buses.map((b) => {
                const cc = getClassColor(b.busClass);
                return (
                  <th key={b.id} className="text-center py-3 px-4 min-w-[200px]">
                    <div className="flex items-center justify-center gap-2">
                      <div>
                        <div className="text-white font-bold text-sm">{b.name}</div>
                        <div className="text-slate-400 text-xs mt-0.5">{b.manufacturer}</div>
                      </div>
                      <button
                        onClick={() => onRemove(b.id)}
                        className="text-slate-500 hover:text-red-400 transition-colors ml-1"
                        aria-label={`Remove ${b.name}`}
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                    <span className={`inline-block mt-1 text-xs px-2 py-0.5 rounded font-medium ${cc.bg} ${cc.text} border ${cc.border}`}>
                      {b.busClass}
                    </span>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50">
            {rows.map((row, idx) => {
              if (row.section) {
                return (
                  <tr key={`section-${idx}`} className="bg-slate-800/40">
                    <td
                      colSpan={buses.length + 1}
                      className="py-2 px-4 text-xs font-bold text-purple-400 uppercase tracking-widest"
                    >
                      {row.label}
                    </td>
                  </tr>
                );
              }

              // Calculate best value
              const bestIndices = new Set<number>();
              if (row.getRawValue && row.highlight) {
                const values = buses.map((b) => row.getRawValue!(b));
                const valid = values.filter((v): v is number => v !== null && v > 0);
                if (valid.length > 0) {
                  const best = row.highlight === 'max' ? Math.max(...valid) : Math.min(...valid);
                  values.forEach((val, i) => {
                    if (val === best) bestIndices.add(i);
                  });
                }
              }

              return (
                <tr key={`row-${idx}`} className="hover:bg-slate-800/20 transition-colors">
                  <td className="py-2.5 px-4 text-slate-400 text-xs font-medium sticky left-0 bg-slate-900/95 backdrop-blur z-10">
                    {row.label}
                  </td>
                  {buses.map((b, bIdx) => {
                    const isBest = bestIndices.has(bIdx);
                    return (
                      <td
                        key={b.id}
                        className={`py-2.5 px-4 text-center text-sm ${
                          isBest ? 'bg-green-400/5 text-green-400 font-semibold' : 'text-white'
                        }`}
                      >
                        {row.getValue(b)}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="px-4 py-3 border-t border-slate-700/50 flex items-center gap-4 text-xs text-slate-400">
        <span className="inline-flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-green-400/10 border border-green-400/30" />
          Best value in category
        </span>
      </div>
    </div>
  );
}

// ────────────────────────────────────────
// Bus Card Component
// ────────────────────────────────────────

function BusCard({
  bus,
  isSelected,
  onToggle,
}: {
  bus: SatelliteBus;
  isSelected: boolean;
  onToggle: () => void;
}) {
  const cc = getClassColor(bus.busClass);

  return (
    <div
      className={`card p-4 transition-all ${
        isSelected
          ? 'ring-2 ring-purple-500/60 border-purple-500/40'
          : 'hover:border-slate-600'
      }`}
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="text-sm font-bold text-white">{bus.name}</h3>
          <p className="text-xs text-slate-400 mt-0.5">{bus.manufacturer}</p>
        </div>
        <span className={`text-xs px-2 py-0.5 rounded font-medium ${cc.bg} ${cc.text} border ${cc.border}`}>
          {bus.busClass}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="bg-slate-800/50 rounded-lg p-2">
          <div className="text-xs text-slate-500 uppercase tracking-wide">Mass</div>
          <div className="text-sm font-semibold text-white">{formatMass(bus.massKg)}</div>
        </div>
        <div className="bg-slate-800/50 rounded-lg p-2">
          <div className="text-xs text-slate-500 uppercase tracking-wide">Power</div>
          <div className="text-sm font-semibold text-white">{formatPower(bus.powerW)}</div>
        </div>
        <div className="bg-slate-800/50 rounded-lg p-2">
          <div className="text-xs text-slate-500 uppercase tracking-wide">Lifetime</div>
          <div className="text-sm font-semibold text-white">{bus.lifetimeYears} yrs</div>
        </div>
        <div className="bg-slate-800/50 rounded-lg p-2">
          <div className="text-xs text-slate-500 uppercase tracking-wide">Cost</div>
          <div className="text-sm font-semibold text-white">{formatCost(bus.costMillions)}</div>
        </div>
      </div>

      <div className="mb-3">
        <div className="text-xs text-slate-500 uppercase tracking-wide mb-1">Heritage</div>
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"
              style={{ width: `${Math.min((bus.heritage / 200) * 100, 100)}%` }}
            />
          </div>
          <span className="text-xs text-slate-300 font-medium min-w-[50px] text-right">
            {bus.heritage.toLocaleString()} units
          </span>
        </div>
      </div>

      <div className="mb-3">
        <div className="text-xs text-slate-500 uppercase tracking-wide mb-1">Propulsion</div>
        <p className="text-xs text-slate-300">{bus.propulsion}</p>
      </div>

      <div className="mb-3">
        <div className="text-xs text-slate-500 uppercase tracking-wide mb-1">Applications</div>
        <div className="flex flex-wrap gap-1">
          {bus.applications.map((app) => (
            <span
              key={app}
              className="px-1.5 py-0.5 text-xs bg-slate-800 text-slate-400 rounded border border-slate-700"
            >
              {app}
            </span>
          ))}
        </div>
      </div>

      <button
        onClick={onToggle}
        className={`w-full mt-1 py-2 rounded-lg text-xs font-medium transition-all ${
          isSelected
            ? 'bg-purple-500/20 text-purple-400 border border-purple-500/40 hover:bg-purple-500/30'
            : 'bg-slate-800 text-slate-300 border border-slate-700 hover:border-purple-500/40 hover:text-purple-400'
        }`}
      >
        {isSelected ? 'Remove from Comparison' : 'Add to Comparison'}
      </button>
    </div>
  );
}

// ────────────────────────────────────────
// Main Page Component
// ────────────────────────────────────────

export default function SatelliteBusComparisonPage() {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [classFilter, setClassFilter] = useState<BusClass | 'All'>('All');
  const [manufacturerFilter, setManufacturerFilter] = useState<string>('All');
  const [applicationFilter, setApplicationFilter] = useState<string>('All');
  const [sortField, setSortField] = useState<SortField>('mass');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [showComparison, setShowComparison] = useState(false);

  const filteredBuses = useMemo(() => {
    let result = SATELLITE_BUSES;

    if (classFilter !== 'All') {
      result = result.filter((b) => b.busClass === classFilter);
    }
    if (manufacturerFilter !== 'All') {
      result = result.filter((b) => b.manufacturer === manufacturerFilter);
    }
    if (applicationFilter !== 'All') {
      result = result.filter((b) => b.applications.includes(applicationFilter));
    }

    result = [...result].sort((a, b) => {
      const aVal = getSortValue(a, sortField);
      const bVal = getSortValue(b, sortField);
      return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
    });

    return result;
  }, [classFilter, manufacturerFilter, applicationFilter, sortField, sortDir]);

  const selectedBuses = useMemo(
    () => SATELLITE_BUSES.filter((b) => selectedIds.has(b.id)),
    [selectedIds]
  );

  function toggleBus(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        if (next.size >= 3) return prev;
        next.add(id);
      }
      return next;
    });
  }

  function clearSelection() {
    setSelectedIds(new Set());
    setShowComparison(false);
  }

  return (
    <div className="min-h-screen p-4 lg:p-8 max-w-[1600px] mx-auto">

      <AnimatedPageHeader
        title="Satellite Bus Comparison"
        subtitle="Compare commercial satellite bus platforms side-by-side. Evaluate mass, power, lifetime, heritage, cost, and propulsion systems to find the right bus for your mission."
        icon={<span>&#128752;</span>}
        accentColor="purple"
      />

      {/* Comparison toggle bar */}
      {selectedIds.size > 0 && (
        <ScrollReveal>
          <div className="card p-4 mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="text-sm text-white font-medium">
                {selectedIds.size} bus{selectedIds.size !== 1 ? 'es' : ''} selected
              </span>
              <div className="flex flex-wrap gap-1.5">
                {selectedBuses.map((b) => (
                  <span
                    key={b.id}
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-purple-500/15 text-purple-400 border border-purple-500/30 rounded-lg text-xs font-medium"
                  >
                    {b.name}
                    <button
                      onClick={() => toggleBus(b.id)}
                      className="ml-0.5 hover:text-white transition-colors"
                      aria-label={`Remove ${b.name}`}
                    >
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </span>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={clearSelection}
                className="text-xs text-slate-400 hover:text-white transition-colors px-3 py-1.5"
              >
                Clear
              </button>
              <button
                onClick={() => setShowComparison(!showComparison)}
                disabled={selectedIds.size < 2}
                className={`px-4 py-2 rounded-lg text-xs font-medium transition-all ${
                  selectedIds.size >= 2
                    ? 'bg-purple-600 text-white hover:bg-purple-500'
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                }`}
              >
                {showComparison ? 'Hide Comparison' : 'Compare Side-by-Side'}
              </button>
            </div>
          </div>
        </ScrollReveal>
      )}

      {/* Comparison Table */}
      {showComparison && selectedBuses.length >= 2 && (
        <ScrollReveal>
          <div className="mb-8">
            <ComparisonPanel
              buses={selectedBuses}
              onRemove={(id) => toggleBus(id)}
              onClear={clearSelection}
            />
          </div>
        </ScrollReveal>
      )}

      {/* Filters */}
      <ScrollReveal>
        <div className="card p-4 mb-6">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Class Filter */}
            <div className="flex-1">
              <label className="text-xs uppercase tracking-widest text-slate-400 font-medium block mb-1.5">
                Class
              </label>
              <div className="flex flex-wrap gap-1.5">
                {(['All', ...ALL_CLASSES] as const).map((cls) => (
                  <button
                    key={cls}
                    onClick={() => setClassFilter(cls)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                      classFilter === cls
                        ? 'bg-purple-600/20 text-purple-400 border-purple-500/40'
                        : 'bg-slate-800 text-slate-400 border-slate-700 hover:border-purple-500/30'
                    }`}
                  >
                    {cls}
                  </button>
                ))}
              </div>
            </div>

            {/* Manufacturer Filter */}
            <div className="flex-1">
              <label className="text-xs uppercase tracking-widest text-slate-400 font-medium block mb-1.5">
                Manufacturer
              </label>
              <select
                value={manufacturerFilter}
                onChange={(e) => setManufacturerFilter(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
              >
                <option value="All">All Manufacturers</option>
                {ALL_MANUFACTURERS.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>

            {/* Application Filter */}
            <div className="flex-1">
              <label className="text-xs uppercase tracking-widest text-slate-400 font-medium block mb-1.5">
                Application
              </label>
              <select
                value={applicationFilter}
                onChange={(e) => setApplicationFilter(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
              >
                <option value="All">All Applications</option>
                {ALL_APPLICATIONS.map((a) => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
            </div>

            {/* Sort */}
            <div className="flex-1">
              <label className="text-xs uppercase tracking-widest text-slate-400 font-medium block mb-1.5">
                Sort By
              </label>
              <div className="flex gap-2">
                <select
                  value={sortField}
                  onChange={(e) => setSortField(e.target.value as SortField)}
                  className="flex-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                >
                  <option value="mass">Mass</option>
                  <option value="power">Power</option>
                  <option value="lifetime">Lifetime</option>
                  <option value="cost">Cost</option>
                </select>
                <button
                  onClick={() => setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))}
                  className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-slate-400 hover:text-white transition-colors"
                  aria-label={sortDir === 'asc' ? 'Sort descending' : 'Sort ascending'}
                >
                  {sortDir === 'asc' ? (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </ScrollReveal>

      {/* Results count */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-slate-400">
          Showing <span className="text-white font-medium">{filteredBuses.length}</span> of {SATELLITE_BUSES.length} satellite buses
        </p>
        {selectedIds.size > 0 && selectedIds.size < 3 && (
          <p className="text-xs text-slate-500">
            Select up to {3 - selectedIds.size} more to compare
          </p>
        )}
      </div>

      {/* Bus Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-8">
        {filteredBuses.map((bus, idx) => (
          <ScrollReveal key={bus.id} delay={Math.min(idx * 0.05, 0.3)}>
            <BusCard
              bus={bus}
              isSelected={selectedIds.has(bus.id)}
              onToggle={() => toggleBus(bus.id)}
            />
          </ScrollReveal>
        ))}
      </div>

      {filteredBuses.length === 0 && (
        <div className="text-center py-16 card mb-8">
          <div className="text-4xl mb-3">&#128269;</div>
          <h3 className="text-lg font-semibold text-white mb-1">No buses match your filters</h3>
          <p className="text-sm text-slate-400">Try adjusting your class, manufacturer, or application filters.</p>
        </div>
      )}

      {/* Quick Stats */}
      <ScrollReveal>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          <div className="card p-4 text-center">
            <div className="text-2xl font-bold text-purple-400">{SATELLITE_BUSES.length}</div>
            <div className="text-xs text-slate-400 mt-1">Bus Platforms</div>
          </div>
          <div className="card p-4 text-center">
            <div className="text-2xl font-bold text-emerald-400">{ALL_MANUFACTURERS.length}</div>
            <div className="text-xs text-slate-400 mt-1">Manufacturers</div>
          </div>
          <div className="card p-4 text-center">
            <div className="text-2xl font-bold text-amber-400">
              {SATELLITE_BUSES.reduce((acc, b) => acc + b.heritage, 0).toLocaleString()}+
            </div>
            <div className="text-xs text-slate-400 mt-1">Total Heritage Units</div>
          </div>
          <div className="card p-4 text-center">
            <div className="text-2xl font-bold text-cyan-400">{ALL_CLASSES.length}</div>
            <div className="text-xs text-slate-400 mt-1">Bus Classes</div>
          </div>
        </div>
      </ScrollReveal>

      {/* Related Links */}
      <ScrollReveal>
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-white mb-3">Related Pages</h3>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/compare/satellites"
              className="px-4 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-xs text-slate-400 hover:border-purple-500/40 hover:text-purple-400 transition-all"
            >
              Compare Satellites
            </Link>
            <Link
              href="/blueprints"
              className="px-4 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-xs text-slate-400 hover:border-purple-500/40 hover:text-purple-400 transition-all"
            >
              Satellite Blueprints
            </Link>
            <Link
              href="/constellation-designer"
              className="px-4 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-xs text-slate-400 hover:border-purple-500/40 hover:text-purple-400 transition-all"
            >
              Constellation Designer
            </Link>
            <Link
              href="/mission-cost"
              className="px-4 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-xs text-slate-400 hover:border-purple-500/40 hover:text-purple-400 transition-all"
            >
              Mission Cost Calculator
            </Link>
          </div>
        </div>
      </ScrollReveal>
    </div>
  );
}
