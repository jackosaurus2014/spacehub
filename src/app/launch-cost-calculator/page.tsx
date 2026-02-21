'use client';

import { useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import {
  LAUNCH_COST_DATA,
  INSURANCE_RATE_DATA,
  MISC_COST_DATA,
  type LaunchCostData,
} from '@/lib/mission-cost-data';

// Dynamically import chart to avoid SSR issues with SVG measurement
const BarChart = dynamic(() => import('@/components/charts/BarChart'), {
  ssr: false,
  loading: () => (
    <div className="h-80 bg-slate-800/30 rounded-xl animate-pulse flex items-center justify-center text-slate-500">
      Loading chart...
    </div>
  ),
});

// ────────────────────────────────────────
// Types & Constants
// ────────────────────────────────────────

type OrbitType = 'LEO' | 'SSO' | 'GTO' | 'GEO' | 'TLI' | 'Mars' | 'Heliocentric';
type SortMode = 'cost' | 'costPerKg' | 'margin';
type MissionType = 'dedicated' | 'rideshare';

interface CompatibleVehicle {
  data: LaunchCostData;
  payloadCapacity: number;
  estimatedCost: number;
  costPerKg: number;
  payloadMargin: number; // percentage of spare capacity
  isBestValue: boolean;
}

const ORBIT_INFO: Record<OrbitType, { label: string; description: string; altitudeKm: string }> = {
  LEO: { label: 'Low Earth Orbit', description: '160-2,000 km', altitudeKm: '~400 km typical' },
  SSO: { label: 'Sun-Synchronous', description: '600-800 km polar', altitudeKm: '~700 km typical' },
  GTO: { label: 'Geostationary Transfer', description: 'Elliptical to ~35,786 km', altitudeKm: '~200 x 35,786 km' },
  GEO: { label: 'Geostationary', description: '35,786 km circular', altitudeKm: '35,786 km' },
  TLI: { label: 'Trans-Lunar Injection', description: 'Earth-to-Moon trajectory', altitudeKm: '~384,400 km' },
  Mars: { label: 'Mars Transfer', description: 'Hohmann transfer to Mars', altitudeKm: '~225M km' },
  Heliocentric: { label: 'Heliocentric', description: 'Sun-orbiting trajectory', altitudeKm: 'Varies' },
};

// Mars / Heliocentric multipliers relative to TLI capacity
const MARS_CAPACITY_FACTOR = 0.55; // Roughly 55% of TLI capacity
const HELIO_CAPACITY_FACTOR = 0.65; // Roughly 65% of TLI capacity
const MARS_COST_MULTIPLIER = 1.8; // ~1.8x TLI cost
const HELIO_COST_MULTIPLIER = 1.5; // ~1.5x TLI cost

// ────────────────────────────────────────
// Utility functions
// ────────────────────────────────────────

function formatCurrency(value: number): string {
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(1)}B`;
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return `$${value.toFixed(0)}`;
}

function formatMass(kg: number): string {
  if (kg >= 1000) return `${(kg / 1000).toFixed(1)} t`;
  return `${kg.toLocaleString()} kg`;
}

function getPayloadCapacity(vehicle: LaunchCostData, orbit: OrbitType): number | null {
  switch (orbit) {
    case 'LEO':
      return vehicle.payloadLEO;
    case 'SSO':
      return vehicle.payloadSSO;
    case 'GTO':
      return vehicle.payloadGTO;
    case 'GEO':
      return vehicle.payloadGEO;
    case 'TLI':
      return vehicle.payloadTLI;
    case 'Mars':
      return vehicle.payloadTLI ? Math.round(vehicle.payloadTLI * MARS_CAPACITY_FACTOR) : null;
    case 'Heliocentric':
      return vehicle.payloadTLI ? Math.round(vehicle.payloadTLI * HELIO_CAPACITY_FACTOR) : null;
    default:
      return null;
  }
}

function getCostPerKg(
  vehicle: LaunchCostData,
  orbit: OrbitType
): { min: number; max: number; typical: number } | null {
  switch (orbit) {
    case 'LEO':
      return vehicle.costPerKgLEO;
    case 'SSO':
      return vehicle.costPerKgSSO;
    case 'GTO':
      return vehicle.costPerKgGTO;
    case 'GEO':
      return vehicle.costPerKgGEO;
    case 'TLI':
      return vehicle.costPerKgTLI;
    case 'Mars':
      if (vehicle.costPerKgTLI) {
        return {
          min: Math.round(vehicle.costPerKgTLI.min * MARS_COST_MULTIPLIER),
          max: Math.round(vehicle.costPerKgTLI.max * MARS_COST_MULTIPLIER),
          typical: Math.round(vehicle.costPerKgTLI.typical * MARS_COST_MULTIPLIER),
        };
      }
      return null;
    case 'Heliocentric':
      if (vehicle.costPerKgTLI) {
        return {
          min: Math.round(vehicle.costPerKgTLI.min * HELIO_COST_MULTIPLIER),
          max: Math.round(vehicle.costPerKgTLI.max * HELIO_COST_MULTIPLIER),
          typical: Math.round(vehicle.costPerKgTLI.typical * HELIO_COST_MULTIPLIER),
        };
      }
      return null;
    default:
      return null;
  }
}

function getEstimatedLaunchCost(
  vehicle: LaunchCostData,
  payloadMass: number,
  orbit: OrbitType,
  missionType: MissionType
): number {
  // Try rideshare first if applicable
  if (missionType === 'rideshare' && vehicle.ridesharePrice) {
    const rs = vehicle.ridesharePrice;
    if (payloadMass >= rs.minMass) {
      return Math.max(rs.perKg * payloadMass, rs.minMass * rs.perKg);
    }
  }

  // Dedicated: use cost/kg * payload or dedicated price (whichever makes more sense)
  const costData = getCostPerKg(vehicle, orbit);
  if (costData) {
    const costByKg = costData.typical * payloadMass;
    // If there is a dedicated launch price and payload fills a meaningful portion, use that
    if (vehicle.dedicatedLaunchPrice) {
      const capacity = getPayloadCapacity(vehicle, orbit);
      if (capacity) {
        const fillRatio = payloadMass / capacity;
        // If payload uses more than 40% of capacity, likely a dedicated mission
        if (fillRatio > 0.4 || missionType === 'dedicated') {
          return vehicle.dedicatedLaunchPrice.typical;
        }
      }
      // For lighter payloads, min of cost-by-kg and dedicated price
      return Math.min(costByKg, vehicle.dedicatedLaunchPrice.typical);
    }
    return costByKg;
  }

  // Fallback: dedicated launch price
  if (vehicle.dedicatedLaunchPrice) {
    return vehicle.dedicatedLaunchPrice.typical;
  }

  return 0;
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'operational':
      return 'text-emerald-400 bg-emerald-400/10 border-emerald-400/30';
    case 'development':
      return 'text-amber-400 bg-amber-400/10 border-amber-400/30';
    case 'retired':
      return 'text-slate-400 bg-slate-400/10 border-slate-400/30';
    default:
      return 'text-slate-400 bg-slate-400/10 border-slate-400/30';
  }
}

function getCountryFlag(country: string): string {
  const flags: Record<string, string> = {
    USA: 'US',
    FRA: 'FR',
    ITA: 'IT',
    IND: 'IN',
    JPN: 'JP',
    CHN: 'CN',
    RUS: 'RU',
    INT: 'UN',
  };
  return flags[country] || country;
}

// ────────────────────────────────────────
// Insurance & Cost Breakdown Helpers
// ────────────────────────────────────────

function getInsuranceEstimate(launchCost: number): {
  rate: number;
  estimate: number;
  label: string;
} {
  const launchInsurance = INSURANCE_RATE_DATA.find((r) => r.category === 'launch');
  const rate = launchInsurance?.rateRange.typical ?? 4;
  return {
    rate,
    estimate: Math.round(launchCost * (rate / 100)),
    label: `${rate}% of launch cost`,
  };
}

function getIntegrationCost(payloadMass: number, missionType: MissionType): number {
  const integrationSmall = MISC_COST_DATA.find(
    (c) => c.category === 'integration' && c.item.includes('Small Satellite')
  );
  const integrationLarge = MISC_COST_DATA.find(
    (c) => c.category === 'integration' && c.item.includes('Large GEO')
  );

  if (missionType === 'rideshare' || payloadMass < 1000) {
    return integrationSmall?.costRange.typical ?? 200000;
  }
  if (payloadMass > 5000) {
    return integrationLarge?.costRange.typical ?? 5000000;
  }
  // Scale between small and large
  const ratio = (payloadMass - 1000) / 4000;
  const smallCost = integrationSmall?.costRange.typical ?? 200000;
  const largeCost = integrationLarge?.costRange.typical ?? 5000000;
  return Math.round(smallCost + ratio * (largeCost - smallCost));
}

function getRangeFees(missionType: MissionType): number {
  if (missionType === 'rideshare') return 0;
  const rangeFee = MISC_COST_DATA.find(
    (c) => c.category === 'launch_site' && c.item.includes('Federal Range Direct')
  );
  return rangeFee?.costRange.typical ?? 2000000;
}

function getLicensingFees(): number {
  const permit = MISC_COST_DATA.find(
    (c) => c.category === 'permits' && c.item.includes('Total Permit')
  );
  return permit?.costRange.typical ?? 250000;
}

// ────────────────────────────────────────
// Components
// ────────────────────────────────────────

function StatCard({
  label,
  value,
  subtext,
  accent = 'cyan',
}: {
  label: string;
  value: string;
  subtext?: string;
  accent?: 'cyan' | 'purple' | 'emerald' | 'amber';
}) {
  const accentColors = {
    cyan: 'text-cyan-400',
    purple: 'text-purple-400',
    emerald: 'text-emerald-400',
    amber: 'text-amber-400',
  };

  return (
    <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 text-center">
      <div className="text-xs text-slate-400 uppercase tracking-wider mb-1">
        {label}
      </div>
      <div className={`text-xl font-bold ${accentColors[accent]}`}>{value}</div>
      {subtext && (
        <div className="text-xs text-slate-500 mt-1">{subtext}</div>
      )}
    </div>
  );
}

function CostBreakdownCard({
  vehicle,
  payloadMass,
  orbit,
  missionType,
  launchCost,
}: {
  vehicle: CompatibleVehicle;
  payloadMass: number;
  orbit: OrbitType;
  missionType: MissionType;
  launchCost: number;
}) {
  const insurance = getInsuranceEstimate(launchCost);
  const integration = getIntegrationCost(payloadMass, missionType);
  const rangeFees = getRangeFees(missionType);
  const licensingFees = getLicensingFees();
  const totalEstimate = launchCost + insurance.estimate + integration + rangeFees + licensingFees;

  const items = [
    {
      label: 'Launch Service',
      value: launchCost,
      detail: `${vehicle.data.provider} ${vehicle.data.vehicle}`,
      pct: (launchCost / totalEstimate) * 100,
    },
    {
      label: 'Launch Insurance',
      value: insurance.estimate,
      detail: insurance.label,
      pct: (insurance.estimate / totalEstimate) * 100,
    },
    {
      label: 'Integration & Testing',
      value: integration,
      detail: missionType === 'rideshare' ? 'Rideshare integration' : 'Dedicated integration',
      pct: (integration / totalEstimate) * 100,
    },
    {
      label: 'Range / Spaceport Fees',
      value: rangeFees,
      detail: missionType === 'rideshare' ? 'Included in rideshare' : 'Federal range costs',
      pct: (rangeFees / totalEstimate) * 100,
    },
    {
      label: 'Licensing & Permits',
      value: licensingFees,
      detail: 'FAA, FCC, environmental',
      pct: (licensingFees / totalEstimate) * 100,
    },
  ];

  return (
    <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6">
      <h3 className="text-lg font-semibold text-slate-100 mb-1">
        Cost Breakdown
      </h3>
      <p className="text-xs text-slate-500 mb-4">
        {formatMass(payloadMass)} to {ORBIT_INFO[orbit].label} via{' '}
        {vehicle.data.vehicle}
      </p>

      <div className="space-y-3 mb-4">
        {items.map((item) => (
          <div key={item.label}>
            <div className="flex justify-between items-baseline mb-1">
              <div>
                <span className="text-sm text-slate-300">{item.label}</span>
                <span className="text-xs text-slate-500 ml-2">
                  ({item.pct.toFixed(0)}%)
                </span>
              </div>
              <span className="text-sm font-medium text-slate-200">
                {formatCurrency(item.value)}
              </span>
            </div>
            <div className="text-xs text-slate-500">{item.detail}</div>
            <div className="mt-1 h-1.5 bg-slate-700/50 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-all duration-500"
                style={{ width: `${Math.max(item.pct, 1)}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="border-t border-slate-700/50 pt-3 flex justify-between items-baseline">
        <span className="text-sm font-semibold text-slate-200">
          Total Estimated Cost
        </span>
        <span className="text-lg font-bold text-cyan-400">
          {formatCurrency(totalEstimate)}
        </span>
      </div>
      <div className="text-xs text-slate-500 mt-1 text-right">
        {formatCurrency(totalEstimate / payloadMass)}/kg all-in
      </div>

      <p className="text-xs text-slate-600 mt-4 leading-relaxed">
        Estimates are indicative and based on publicly available data. Actual
        costs vary by mission specifics, contract terms, and market conditions.
      </p>
    </div>
  );
}

function VehicleCard({
  vehicle,
  rank,
  isSelected,
  onSelect,
  orbit,
}: {
  vehicle: CompatibleVehicle;
  rank: number;
  isSelected: boolean;
  onSelect: () => void;
  orbit: OrbitType;
}) {
  const statusColor = getStatusColor(vehicle.data.status);
  const costData = getCostPerKg(vehicle.data, orbit);
  const countryCode = getCountryFlag(vehicle.data.country);

  return (
    <button
      onClick={onSelect}
      className={`w-full text-left rounded-xl p-5 transition-all duration-200 border ${
        isSelected
          ? 'bg-slate-800/80 border-cyan-500/50 ring-1 ring-cyan-500/20'
          : 'bg-slate-800/40 border-slate-700/50 hover:border-slate-600/50 hover:bg-slate-800/60'
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-4">
        <div className="flex items-start gap-3">
          {/* Rank badge */}
          <div
            className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
              vehicle.isBestValue
                ? 'bg-cyan-500/20 text-cyan-400 ring-1 ring-cyan-500/40'
                : 'bg-slate-700/50 text-slate-400'
            }`}
          >
            {rank}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-semibold text-slate-100">
                {vehicle.data.vehicle}
              </h3>
              {vehicle.isBestValue && (
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
                  Best Value
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-0.5 text-sm text-slate-400">
              <span>{countryCode}</span>
              <span>{vehicle.data.provider}</span>
              {vehicle.data.reusable && (
                <span className="text-emerald-500 text-xs">[Reusable]</span>
              )}
            </div>
          </div>
        </div>

        <span
          className={`text-xs px-2.5 py-1 rounded-full border font-medium ${statusColor} self-start`}
        >
          {vehicle.data.status === 'operational'
            ? 'Operational'
            : vehicle.data.status === 'development'
            ? 'In Development'
            : 'Retired'}
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div>
          <div className="text-xs text-slate-500 uppercase tracking-wider">
            Capacity
          </div>
          <div className="text-sm font-semibold text-slate-200 mt-0.5">
            {formatMass(vehicle.payloadCapacity)}
          </div>
        </div>
        <div>
          <div className="text-xs text-slate-500 uppercase tracking-wider">
            Est. Cost
          </div>
          <div className="text-sm font-semibold text-slate-200 mt-0.5">
            {formatCurrency(vehicle.estimatedCost)}
          </div>
        </div>
        <div>
          <div className="text-xs text-slate-500 uppercase tracking-wider">
            $/kg
          </div>
          <div className="text-sm font-semibold text-cyan-400 mt-0.5">
            {formatCurrency(vehicle.costPerKg)}
          </div>
          {costData && (
            <div className="text-[10px] text-slate-500">
              Range: {formatCurrency(costData.min)}-{formatCurrency(costData.max)}
            </div>
          )}
        </div>
        <div>
          <div className="text-xs text-slate-500 uppercase tracking-wider">
            Margin
          </div>
          <div
            className={`text-sm font-semibold mt-0.5 ${
              vehicle.payloadMargin > 50
                ? 'text-emerald-400'
                : vehicle.payloadMargin > 20
                ? 'text-amber-400'
                : 'text-rose-400'
            }`}
          >
            +{vehicle.payloadMargin.toFixed(0)}%
          </div>
        </div>
      </div>
    </button>
  );
}

// ────────────────────────────────────────
// Main Page
// ────────────────────────────────────────

export default function LaunchCostCalculatorPage() {
  // Input state
  const [payloadMass, setPayloadMass] = useState(1000);
  const [orbit, setOrbit] = useState<OrbitType>('LEO');
  const [missionType, setMissionType] = useState<MissionType>('dedicated');
  const [payloadVolume, setPayloadVolume] = useState<string>('');
  const [sortMode, setSortMode] = useState<SortMode>('cost');
  const [selectedVehicleSlug, setSelectedVehicleSlug] = useState<string | null>(null);
  const [showDevVehicles, setShowDevVehicles] = useState(true);

  // Calculate compatible vehicles
  const compatibleVehicles = useMemo(() => {
    const vehicles = LAUNCH_COST_DATA.filter((v) => {
      if (!showDevVehicles && v.status !== 'operational') return false;
      if (v.status === 'retired') return false;

      const capacity = getPayloadCapacity(v, orbit);
      if (!capacity || capacity < payloadMass) return false;

      // Must have cost data for this orbit (or be derivable)
      const cost = getCostPerKg(v, orbit);
      if (!cost && !v.dedicatedLaunchPrice) return false;

      return true;
    });

    const results: CompatibleVehicle[] = vehicles.map((v) => {
      const capacity = getPayloadCapacity(v, orbit)!;
      const estimatedCost = getEstimatedLaunchCost(v, payloadMass, orbit, missionType);
      const costPerKg = payloadMass > 0 ? estimatedCost / payloadMass : 0;
      const margin = ((capacity - payloadMass) / capacity) * 100;

      return {
        data: v,
        payloadCapacity: capacity,
        estimatedCost,
        costPerKg,
        payloadMargin: margin,
        isBestValue: false,
      };
    });

    // Sort
    results.sort((a, b) => {
      switch (sortMode) {
        case 'cost':
          return a.estimatedCost - b.estimatedCost;
        case 'costPerKg':
          return a.costPerKg - b.costPerKg;
        case 'margin':
          return b.payloadMargin - a.payloadMargin;
        default:
          return a.estimatedCost - b.estimatedCost;
      }
    });

    // Mark best value (lowest $/kg among operational vehicles)
    const operationalResults = results.filter((r) => r.data.status === 'operational');
    if (operationalResults.length > 0) {
      const bestIdx = operationalResults.reduce(
        (best, curr, idx) => (curr.costPerKg < operationalResults[best].costPerKg ? idx : best),
        0
      );
      // Find the same vehicle in the full results array and mark it
      const bestSlug = operationalResults[bestIdx].data.slug;
      const fullIdx = results.findIndex((r) => r.data.slug === bestSlug);
      if (fullIdx >= 0) {
        results[fullIdx].isBestValue = true;
      }
    }

    return results;
  }, [payloadMass, orbit, missionType, sortMode, showDevVehicles]);

  // Selected vehicle for cost breakdown
  const selectedVehicle = useMemo(() => {
    if (selectedVehicleSlug) {
      return compatibleVehicles.find((v) => v.data.slug === selectedVehicleSlug) ?? null;
    }
    // Auto-select best value
    return compatibleVehicles.find((v) => v.isBestValue) ?? compatibleVehicles[0] ?? null;
  }, [compatibleVehicles, selectedVehicleSlug]);

  // Bar chart data (top 10 for readability)
  const chartData = useMemo(() => {
    const top = compatibleVehicles.slice(0, 12);
    return top.map((v) => ({
      label: v.data.vehicle.replace('Block 5', 'B5').replace('(GSLV Mk III)', 'Mk3'),
      value: v.costPerKg,
      color: v.isBestValue ? ('cyan' as const) : undefined,
    }));
  }, [compatibleVehicles]);

  // Summary stats
  const stats = useMemo(() => {
    if (compatibleVehicles.length === 0) return null;
    const costs = compatibleVehicles.map((v) => v.estimatedCost);
    const perKgs = compatibleVehicles.map((v) => v.costPerKg);
    return {
      vehicleCount: compatibleVehicles.length,
      cheapest: formatCurrency(Math.min(...costs)),
      lowestPerKg: formatCurrency(Math.min(...perKgs)),
      highestCapacity: formatMass(
        Math.max(...compatibleVehicles.map((v) => v.payloadCapacity))
      ),
    };
  }, [compatibleVehicles]);

  const handlePayloadSlider = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    // Logarithmic slider for better control across the range
    const sliderVal = parseFloat(e.target.value);
    const mass = Math.round(Math.pow(10, sliderVal));
    setPayloadMass(mass);
  }, []);

  const handlePayloadInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    if (!isNaN(val) && val >= 1 && val <= 100000) {
      setPayloadMass(val);
    }
  }, []);

  // Convert mass to log scale for slider position
  const sliderValue = Math.log10(Math.max(payloadMass, 1));

  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <nav className="text-sm text-slate-500 mb-4">
            <Link href="/" className="hover:text-slate-300 transition-colors">
              Home
            </Link>
            <span className="mx-2">/</span>
            <Link
              href="/mission-cost"
              className="hover:text-slate-300 transition-colors"
            >
              Mission Cost
            </Link>
            <span className="mx-2">/</span>
            <span className="text-slate-400">Launch Cost Calculator</span>
          </nav>

          <h1 className="text-3xl md:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 mb-3">
            Launch Cost Calculator
          </h1>
          <p className="text-slate-400 max-w-2xl text-base">
            Estimate satellite launch costs across {LAUNCH_COST_DATA.length}+
            vehicles. Compare pricing by orbit, payload mass, and mission type
            with real industry data.
          </p>
        </div>

        {/* Stats Row */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
            <StatCard
              label="Compatible Vehicles"
              value={String(stats.vehicleCount)}
              accent="cyan"
            />
            <StatCard
              label="Lowest Total Cost"
              value={stats.cheapest}
              accent="emerald"
            />
            <StatCard
              label="Best $/kg"
              value={stats.lowestPerKg}
              accent="purple"
            />
            <StatCard
              label="Max Capacity"
              value={stats.highestCapacity}
              subtext={`to ${orbit}`}
              accent="amber"
            />
          </div>
        )}

        {/* Main Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* ─── Input Panel ─── */}
          <div className="lg:col-span-1">
            <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6 sticky top-8 space-y-5">
              <h2 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
                <svg
                  className="w-5 h-5 text-cyan-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                  />
                </svg>
                Mission Parameters
              </h2>

              {/* Payload Mass */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Payload Mass
                </label>
                <div className="flex items-center gap-3 mb-2">
                  <input
                    type="number"
                    min={1}
                    max={100000}
                    value={payloadMass}
                    onChange={handlePayloadInput}
                    className="w-28 bg-slate-900/70 border border-slate-700/50 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20"
                  />
                  <span className="text-sm text-slate-400">kg</span>
                  <span className="text-xs text-slate-500 ml-auto">
                    ({formatMass(payloadMass)})
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={5}
                  step={0.01}
                  value={sliderValue}
                  onChange={handlePayloadSlider}
                  className="w-full h-2 bg-slate-700/50 rounded-full appearance-none cursor-pointer accent-cyan-500 [&::-webkit-slider-thumb]:bg-cyan-400 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:cursor-pointer"
                />
                <div className="flex justify-between text-xs text-slate-600 mt-1">
                  <span>1 kg</span>
                  <span>100 kg</span>
                  <span>10 t</span>
                  <span>100 t</span>
                </div>
              </div>

              {/* Orbit Selection */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Target Orbit
                </label>
                <select
                  value={orbit}
                  onChange={(e) => setOrbit(e.target.value as OrbitType)}
                  className="w-full bg-slate-900/70 border border-slate-700/50 rounded-lg px-3 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 appearance-none cursor-pointer"
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                    backgroundPosition: 'right 0.5rem center',
                    backgroundRepeat: 'no-repeat',
                    backgroundSize: '1.5em 1.5em',
                    paddingRight: '2.5rem',
                  }}
                >
                  {(Object.keys(ORBIT_INFO) as OrbitType[]).map((key) => (
                    <option key={key} value={key}>
                      {key} - {ORBIT_INFO[key].label}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-slate-500 mt-1.5">
                  {ORBIT_INFO[orbit].description} ({ORBIT_INFO[orbit].altitudeKm})
                </p>
              </div>

              {/* Payload Volume (optional) */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Payload Volume{' '}
                  <span className="text-slate-500 font-normal">(optional)</span>
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min={0}
                    max={1000}
                    step={0.1}
                    value={payloadVolume}
                    onChange={(e) => setPayloadVolume(e.target.value)}
                    placeholder="--"
                    className="w-28 bg-slate-900/70 border border-slate-700/50 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20"
                  />
                  <span className="text-sm text-slate-400">m&sup3;</span>
                </div>
              </div>

              {/* Mission Type */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Mission Type
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(['dedicated', 'rideshare'] as MissionType[]).map((type) => (
                    <button
                      key={type}
                      onClick={() => setMissionType(type)}
                      className={`py-2.5 px-3 rounded-lg text-sm font-medium transition-all border ${
                        missionType === type
                          ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-400'
                          : 'bg-slate-900/50 border-slate-700/50 text-slate-400 hover:border-slate-600/50'
                      }`}
                    >
                      {type === 'dedicated' ? 'Dedicated' : 'Rideshare'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sort By */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Sort By
                </label>
                <select
                  value={sortMode}
                  onChange={(e) => setSortMode(e.target.value as SortMode)}
                  className="w-full bg-slate-900/70 border border-slate-700/50 rounded-lg px-3 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 appearance-none cursor-pointer"
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                    backgroundPosition: 'right 0.5rem center',
                    backgroundRepeat: 'no-repeat',
                    backgroundSize: '1.5em 1.5em',
                    paddingRight: '2.5rem',
                  }}
                >
                  <option value="cost">Total Cost (lowest first)</option>
                  <option value="costPerKg">$/kg (lowest first)</option>
                  <option value="margin">Payload Margin (most first)</option>
                </select>
              </div>

              {/* Show development vehicles toggle */}
              <label className="flex items-center gap-3 cursor-pointer group">
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={showDevVehicles}
                    onChange={(e) => setShowDevVehicles(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-700/50 rounded-full peer-checked:bg-cyan-500/30 transition-colors" />
                  <div className="absolute top-0.5 left-0.5 w-4 h-4 bg-slate-400 rounded-full peer-checked:translate-x-4 peer-checked:bg-cyan-400 transition-all" />
                </div>
                <span className="text-sm text-slate-400 group-hover:text-slate-300 transition-colors">
                  Include vehicles in development
                </span>
              </label>

              {/* Request Quote CTA */}
              <Link
                href="/marketplace/rfq/new"
                className="block w-full text-center py-3 px-4 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold rounded-lg transition-all shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/30 mt-2"
              >
                Request Launch Quote
              </Link>
              <p className="text-xs text-slate-600 text-center -mt-2">
                Get real pricing from verified providers
              </p>
            </div>
          </div>

          {/* ─── Results Panel ─── */}
          <div className="lg:col-span-2 space-y-6">
            {compatibleVehicles.length === 0 ? (
              /* Empty state */
              <div className="bg-slate-800/30 border border-slate-700/30 rounded-xl p-12 text-center">
                <div className="text-5xl mb-4">
                  <svg
                    className="w-16 h-16 mx-auto text-slate-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
                    />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-slate-300 mb-2">
                  No Compatible Vehicles Found
                </h3>
                <p className="text-slate-500 max-w-md mx-auto mb-4">
                  No launch vehicles in our database can deliver{' '}
                  <strong className="text-slate-400">
                    {formatMass(payloadMass)}
                  </strong>{' '}
                  to{' '}
                  <strong className="text-slate-400">
                    {ORBIT_INFO[orbit].label}
                  </strong>
                  .
                </p>
                <div className="text-sm text-slate-500">
                  Try reducing the payload mass, choosing a lower orbit, or
                  enabling vehicles in development.
                </div>
              </div>
            ) : (
              <>
                {/* Bar Chart - $/kg comparison */}
                {chartData.length > 0 && (
                  <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6">
                    <BarChart
                      data={chartData}
                      title={`Cost per kg to ${orbit} (${compatibleVehicles.length} vehicles)`}
                      height={320}
                      orientation="vertical"
                      valueFormatter={(v) => `$${v.toLocaleString()}`}
                    />
                  </div>
                )}

                {/* Vehicle Cards */}
                <div>
                  <h2 className="text-lg font-semibold text-slate-200 mb-4">
                    Compatible Launch Vehicles
                    <span className="text-sm font-normal text-slate-500 ml-2">
                      ({compatibleVehicles.length} results)
                    </span>
                  </h2>
                  <div className="space-y-3">
                    {compatibleVehicles.map((vehicle, i) => (
                      <VehicleCard
                        key={vehicle.data.slug}
                        vehicle={vehicle}
                        rank={i + 1}
                        isSelected={
                          selectedVehicle?.data.slug === vehicle.data.slug
                        }
                        onSelect={() =>
                          setSelectedVehicleSlug(vehicle.data.slug)
                        }
                        orbit={orbit}
                      />
                    ))}
                  </div>
                </div>

                {/* Cost Breakdown for selected vehicle */}
                {selectedVehicle && (
                  <CostBreakdownCard
                    vehicle={selectedVehicle}
                    payloadMass={payloadMass}
                    orbit={orbit}
                    missionType={missionType}
                    launchCost={selectedVehicle.estimatedCost}
                  />
                )}

                {/* Methodology note */}
                <div className="bg-slate-800/30 border border-slate-700/30 rounded-xl p-5">
                  <h3 className="text-sm font-semibold text-slate-300 mb-2">
                    Data Sources & Methodology
                  </h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Launch pricing data sourced from official provider
                    publications, FAA filings, NASA contract awards, and industry
                    reporting (SpaceNews, Payload Space, Via Satellite). Insurance
                    estimates use typical market rates from Lloyd&apos;s, AXA XL, and
                    Swiss Re. Mars and heliocentric costs are estimated from TLI
                    data using standard delta-v multipliers. All figures are
                    indicative -- actual mission costs depend on contract terms,
                    payload complexity, and market conditions. Data current as of
                    January 2025.
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
