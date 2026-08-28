'use client';

import { useState, useEffect, useMemo } from 'react';
import PageHeader from '@/components/ui/PageHeader';
import AnimatedPageHeader from '@/components/ui/AnimatedPageHeader';
import ScrollReveal, { StaggerContainer, StaggerItem } from '@/components/ui/ScrollReveal';
import RelatedModules from '@/components/ui/RelatedModules';
import SubscribeCTA from '@/components/marketing/SubscribeCTA';
import DataFreshness from '@/components/ui/DataFreshness';
import DataAsOf, { formatAsOfDate } from '@/components/ui/DataAsOf';
import ExportButton from '@/components/ui/ExportButton';
import Link from 'next/link';
import Image from 'next/image';
import { clientLogger } from '@/lib/client-logger';
import MobileValueProp from '@/components/marketing/MobileValueProp';
import { getCompanyProfileUrl } from '@/lib/company-links';

// ────────────────────────────────────────
// Types
// ────────────────────────────────────────

type TabId = 'database' | 'compare' | 'reliability' | 'cost';

import { LAUNCH_VEHICLES } from '@/lib/launch-vehicles-data';
import type { LaunchVehicle, VehicleStatus } from '@/lib/launch-vehicles-data';

const VEHICLES: LaunchVehicle[] = LAUNCH_VEHICLES;

// ────────────────────────────────────────
// Helper Functions
// ────────────────────────────────────────

function formatNumber(n: number | null): string {
  if (n === null) return '--';
  return n.toLocaleString();
}

function formatCost(millions: number | null): string {
  if (millions === null) return 'TBD';
  if (millions >= 1000) return `$${(millions / 1000).toFixed(1)}B`;
  return `$${millions}M`;
}

function formatCostPerKg(val: number | null): string {
  if (val === null) return 'TBD';
  return `$${val.toLocaleString()}/kg`;
}

function getStatusColor(status: VehicleStatus): { bg: string; text: string; border: string } {
  switch (status) {
    case 'Operational':
      return { bg: 'bg-green-900/30', text: 'text-green-400', border: 'border-green-500/30' };
    case 'In Development':
      return { bg: 'bg-white/[0.04]', text: 'text-slate-300', border: 'border-white/10' };
    case 'Retired':
      return { bg: 'bg-white/[0.04]', text: 'text-slate-400', border: 'border-white/[0.08]' };
  }
}

function getReliabilityColor(rate: number): string {
  if (rate >= 97) return 'text-green-400';
  if (rate >= 90) return 'text-yellow-400';
  if (rate >= 75) return 'text-orange-400';
  return 'text-red-400';
}

function getCountryFlag(country: string): string {
  const flags: Record<string, string> = {
    'United States': 'US',
    'France / ESA': 'EU',
    'Italy / ESA': 'EU',
    'Japan': 'JP',
    'India': 'IN',
    'China': 'CN',
    'Russia': 'RU',
  };
  return flags[country] || country.slice(0, 2).toUpperCase();
}

// ────────────────────────────────────────
// Vehicle Card Component
// ────────────────────────────────────────

function VehicleCard({ vehicle, onSelect, isSelected }: { vehicle: LaunchVehicle; onSelect?: (v: LaunchVehicle) => void; isSelected?: boolean }) {
  const statusStyle = getStatusColor(vehicle.status);

  return (
    <div
      className={`card p-5 transition-all cursor-default ${
        isSelected ? 'ring-2 ring-white/15 border-white/15' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-base font-bold text-white truncate">{vehicle.name}</h3>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-star-300">
              {getCompanyProfileUrl(vehicle.manufacturer) ? (
                <Link href={getCompanyProfileUrl(vehicle.manufacturer)!} className="hover:underline">{vehicle.manufacturer}</Link>
              ) : vehicle.manufacturer}
            </span>
            <span className="text-star-300/30">|</span>
            <span className="text-star-300 text-xs font-mono">{getCountryFlag(vehicle.country)}</span>
          </div>
        </div>
        <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusStyle.bg} ${statusStyle.text} border ${statusStyle.border} whitespace-nowrap`}>
          {vehicle.status}
        </span>
      </div>

      {/* Key Specs Grid */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm mb-3">
        <div>
          <span className="text-star-300 text-xs block">Payload LEO</span>
          <span className="text-white font-semibold">{formatNumber(vehicle.payloadLeoKg)} kg</span>
        </div>
        <div>
          <span className="text-star-300 text-xs block">Payload GTO</span>
          <span className="text-white font-semibold">{vehicle.payloadGtoKg ? `${formatNumber(vehicle.payloadGtoKg)} kg` : '--'}</span>
        </div>
        <div>
          <span className="text-star-300 text-xs block">Height</span>
          <span className="text-white font-semibold">{vehicle.heightM} m</span>
        </div>
        <div>
          <span className="text-star-300 text-xs block">Cost</span>
          <span className="text-white font-semibold">{formatCost(vehicle.costMillions)}</span>
        </div>
      </div>

      {/* Reliability Bar */}
      {vehicle.totalLaunches > 0 && (
        <div className="mb-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-star-300 text-xs">Reliability</span>
            <span className={`text-xs font-bold ${getReliabilityColor(vehicle.successRate)}`}>
              {vehicle.successRate.toFixed(1)}% ({vehicle.successes}/{vehicle.totalLaunches})
            </span>
          </div>
          <div className="h-1.5 bg-white/[0.08] rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                vehicle.successRate >= 97 ? 'bg-green-500' :
                vehicle.successRate >= 90 ? 'bg-yellow-500' :
                vehicle.successRate >= 75 ? 'bg-orange-500' : 'bg-red-500'
              }`}
              style={{ width: `${vehicle.successRate}%` }}
            />
          </div>
        </div>
      )}

      {/* Tags */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {vehicle.reusable && (
          <span className="px-2 py-0.5 rounded text-xs bg-white/[0.04] text-slate-300 border border-white/10">
            Reusable
          </span>
        )}
        <span className="px-2 py-0.5 rounded text-xs bg-white/[0.06] text-star-300 border border-white/[0.08]">
          {vehicle.stages}-Stage
        </span>
        <span className="px-2 py-0.5 rounded text-xs bg-white/[0.06] text-star-300 border border-white/[0.08]">
          {vehicle.propellant.split(' / ')[0].split(' ')[0]}
        </span>
      </div>

      <p className="text-star-300 text-xs leading-relaxed line-clamp-2 mb-3">{vehicle.description}</p>

      {onSelect && (
        <button
          onClick={() => onSelect(vehicle)}
          className={`w-full py-1.5 rounded text-xs font-medium transition-all ${
            isSelected
              ? 'bg-white text-slate-900'
              : 'bg-white/[0.08] text-star-300 hover:bg-white/[0.12] hover:text-white'
          }`}
        >
          {isSelected ? 'Selected for Comparison' : 'Add to Comparison'}
        </button>
      )}
    </div>
  );
}

// ────────────────────────────────────────
// Main Page Content
// ────────────────────────────────────────

export default function LaunchVehiclesPage() {
  const [activeTab, setActiveTab] = useState<TabId>('database');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<VehicleStatus | ''>('');
  const [countryFilter, setCountryFilter] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('payloadLeo');
  const [compareSelection, setCompareSelection] = useState<string[]>([]);

  // API-fetched data (initialized with hardcoded fallback)
  const [vehicles, setVehicles] = useState<LaunchVehicle[]>(VEHICLES);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshedAt, setRefreshedAt] = useState<string | null>(null);
  const [dataAsOf, setDataAsOf] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      setError(null);
      try {
        const res = await fetch('/api/content/launch-vehicles?section=vehicles');
        const data = await res.json();
        if (data.data && data.data.length > 0) {
          // API returns [{ vehicles: [...] }] — unwrap nested structure
          const first = data.data[0];
          if (first?.vehicles && Array.isArray(first.vehicles)) {
            setVehicles(first.vehicles);
          } else if (first?.name) {
            // Already flat vehicle objects
            setVehicles(data.data);
          } else {
            setVehicles(VEHICLES);
          }
        } else {
          setVehicles(VEHICLES);
        }
        setRefreshedAt(data.meta?.lastRefreshed || null);
        // meta.lastRefreshed is module-wide-newest and can mask stale
        // AI-researched vehicle entries (e.g. rarely-updated vehicles like
        // Soyuz-5) behind another fresher key in the same module.
        setDataAsOf(formatAsOfDate(data.meta?.oldestRefreshed));
      } catch (error) {
        clientLogger.error('Failed to load launch vehicles data', { error: error instanceof Error ? error.message : String(error) });
        setError('Failed to load data.');
        setVehicles(VEHICLES);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Use fetched data or fallback to hardcoded
  const ACTIVE_VEHICLES = vehicles.length > 0 ? vehicles : VEHICLES;

  // Derived data
  const countries = useMemo(() => Array.from(new Set(ACTIVE_VEHICLES.map(v => v.country))).sort(), [ACTIVE_VEHICLES]);
  const manufacturers = useMemo(() => Array.from(new Set(ACTIVE_VEHICLES.map(v => v.manufacturer))).sort(), [ACTIVE_VEHICLES]);

  const filteredVehicles = useMemo(() => {
    let result = [...ACTIVE_VEHICLES];

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(v =>
        v.name.toLowerCase().includes(q) ||
        v.manufacturer.toLowerCase().includes(q) ||
        v.country.toLowerCase().includes(q) ||
        v.propellant.toLowerCase().includes(q)
      );
    }

    if (statusFilter) {
      result = result.filter(v => v.status === statusFilter);
    }

    if (countryFilter) {
      result = result.filter(v => v.country === countryFilter);
    }

    // Sort
    switch (sortBy) {
      case 'payloadLeo':
        result.sort((a, b) => b.payloadLeoKg - a.payloadLeoKg);
        break;
      case 'payloadGto':
        result.sort((a, b) => (b.payloadGtoKg ?? 0) - (a.payloadGtoKg ?? 0));
        break;
      case 'cost':
        result.sort((a, b) => (a.costMillions ?? Infinity) - (b.costMillions ?? Infinity));
        break;
      case 'costPerKg':
        result.sort((a, b) => (a.costPerKgLeo ?? Infinity) - (b.costPerKgLeo ?? Infinity));
        break;
      case 'reliability':
        result.sort((a, b) => b.successRate - a.successRate);
        break;
      case 'launches':
        result.sort((a, b) => b.totalLaunches - a.totalLaunches);
        break;
      case 'name':
        result.sort((a, b) => a.name.localeCompare(b.name));
        break;
    }

    return result;
  }, [searchQuery, statusFilter, countryFilter, sortBy, ACTIVE_VEHICLES]);

  const selectedVehicles = useMemo(
    () => ACTIVE_VEHICLES.filter(v => compareSelection.includes(v.id)),
    [compareSelection, ACTIVE_VEHICLES]
  );

  // Reliability-sorted vehicles
  const reliabilityRanked = useMemo(() => {
    return [...ACTIVE_VEHICLES]
      .filter(v => v.totalLaunches > 0)
      .sort((a, b) => {
        if (b.successRate !== a.successRate) return b.successRate - a.successRate;
        return b.totalLaunches - a.totalLaunches;
      });
  }, [ACTIVE_VEHICLES]);

  // Cost-sorted vehicles
  const costRanked = useMemo(() => {
    return [...ACTIVE_VEHICLES]
      .filter(v => v.costPerKgLeo !== null)
      .sort((a, b) => (a.costPerKgLeo ?? Infinity) - (b.costPerKgLeo ?? Infinity));
  }, [ACTIVE_VEHICLES]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-white/[0.06] rounded w-1/3"></div>
            <div className="h-4 bg-white/[0.06] rounded w-2/3"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
              {[1,2,3,4].map(i => <div key={i} className="h-48 bg-white/[0.06] rounded-lg"></div>)}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const toggleCompare = (vehicle: LaunchVehicle) => {
    setCompareSelection(prev => {
      if (prev.includes(vehicle.id)) {
        return prev.filter(id => id !== vehicle.id);
      }
      if (prev.length >= 4) return prev;
      return [...prev, vehicle.id];
    });
  };

  // Stats
  const totalOperational = ACTIVE_VEHICLES.filter(v => v.status === 'Operational').length;
  const totalInDev = ACTIVE_VEHICLES.filter(v => v.status === 'In Development').length;
  const totalLaunchesAll = ACTIVE_VEHICLES.reduce((sum, v) => sum + v.totalLaunches, 0);
  const avgSuccessRate = ACTIVE_VEHICLES.filter(v => v.totalLaunches > 0).reduce((sum, v) => sum + v.successRate, 0) / (ACTIVE_VEHICLES.filter(v => v.totalLaunches > 0).length || 1);

  const VEHICLE_EXPORT_COLUMNS = [
    { key: 'name', label: 'Name' },
    { key: 'manufacturer', label: 'Manufacturer' },
    { key: 'country', label: 'Country' },
    { key: 'status', label: 'Status' },
    { key: 'heightM', label: 'Height (m)' },
    { key: 'diameterM', label: 'Diameter (m)' },
    { key: 'massKg', label: 'Mass (kg)' },
    { key: 'payloadLeoKg', label: 'Payload LEO (kg)' },
    { key: 'payloadGtoKg', label: 'Payload GTO (kg)' },
    { key: 'costMillions', label: 'Cost ($M)' },
    { key: 'costPerKgLeo', label: 'Cost/kg LEO ($)' },
    { key: 'totalLaunches', label: 'Total Launches' },
    { key: 'successes', label: 'Successes' },
    { key: 'failures', label: 'Failures' },
    { key: 'successRate', label: 'Success Rate (%)' },
    { key: 'reusable', label: 'Reusable' },
    { key: 'stages', label: 'Stages' },
    { key: 'engines', label: 'Engines' },
    { key: 'propellant', label: 'Propellant' },
    { key: 'firstFlight', label: 'First Flight' },
  ];

  const TABS: { id: TabId; label: string }[] = [
    { id: 'database', label: 'Vehicle Database' },
    { id: 'compare', label: 'Compare' },
    { id: 'reliability', label: 'Reliability' },
    { id: 'cost', label: 'Cost Analysis' },
  ];

  return (
    <div className="min-h-screen">
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <Image
            src="/art/hero-launch-vehicles.png"
            alt=""
            fill
            sizes="100vw"
            className="object-cover opacity-20"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#09090b]/80 to-[#09090b]" />
        </div>
        <div className="container mx-auto px-4 pt-6">
          <AnimatedPageHeader
            title="Launch Vehicle Comparison"
            subtitle="Comprehensive database of active, in-development, and retired orbital launch vehicles worldwide with real specifications, reliability data, and cost analysis"
            icon="🚀"
            accentColor="red"
          />
        </div>
      </div>
      <div className="container mx-auto px-4">

        <DataFreshness refreshedAt={refreshedAt} source="DynamicContent" className="mb-4" />
        {dataAsOf && <DataAsOf date={dataAsOf} note="oldest of this page's AI-researched vehicle entries" className="mb-4" />}

        <MobileValueProp feature="launch vehicle specs and cost data" />

        {error && (
          <div className="card p-5 border border-red-500/20 bg-red-500/5 text-center mb-6">
            <div className="text-red-400 text-sm font-medium">{error}</div>
          </div>
        )}

        {/* Quick Stats Banner */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="card-elevated p-4 text-center">
            <div className="text-2xl font-bold font-display text-white">{ACTIVE_VEHICLES.length}</div>
            <div className="text-star-300 text-xs uppercase tracking-widest font-medium">Vehicles Tracked</div>
          </div>
          <div className="card-elevated p-4 text-center">
            <div className="text-2xl font-bold font-display text-green-400">{totalOperational}</div>
            <div className="text-star-300 text-xs uppercase tracking-widest font-medium">Operational</div>
          </div>
          <div className="card-elevated p-4 text-center">
            <div className="text-2xl font-bold font-display text-slate-300">{totalInDev}</div>
            <div className="text-star-300 text-xs uppercase tracking-widest font-medium">In Development</div>
          </div>
          <div className="card-elevated p-4 text-center">
            <div className="text-2xl font-bold font-display text-white">{totalLaunchesAll.toLocaleString()}</div>
            <div className="text-star-300 text-xs uppercase tracking-widest font-medium">Total Launches</div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-white text-slate-900'
                  : 'bg-white/[0.04] text-star-300 hover:bg-white/[0.06] hover:text-white'
              }`}
            >
              {tab.label}
              {tab.id === 'compare' && compareSelection.length > 0 && (
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                  activeTab === tab.id ? 'bg-slate-200 text-slate-900' : 'bg-white/30 text-slate-300'
                }`}>
                  {compareSelection.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ──────────────── VEHICLE DATABASE TAB ──────────────── */}
        {activeTab === 'database' && (
          <div>
            {/* Filters */}
            <div className="card p-4 mb-6">
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex-1 min-w-[200px]">
                  <input
                    type="search"
                    placeholder="Search by name, manufacturer, country, or propellant..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg bg-white/[0.06] border border-white/[0.06] text-white placeholder-star-300 focus:outline-none focus:border-white/15 focus:ring-1 focus:ring-white/30 text-sm"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-star-300 text-sm">Status:</span>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as VehicleStatus | '')}
                    className="bg-white/[0.06] border border-white/[0.06] text-white rounded-lg px-3 py-2 h-11 text-sm focus:ring-2 focus:ring-white/30 focus:border-white/15 outline-none"
                  >
                    <option value="">All</option>
                    <option value="Operational">Operational</option>
                    <option value="In Development">In Development</option>
                    <option value="Retired">Retired</option>
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-star-300 text-sm">Country:</span>
                  <select
                    value={countryFilter}
                    onChange={(e) => setCountryFilter(e.target.value)}
                    className="bg-white/[0.06] border border-white/[0.06] text-white rounded-lg px-3 py-2 h-11 text-sm focus:ring-2 focus:ring-white/30 focus:border-white/15 outline-none"
                  >
                    <option value="">All</option>
                    {countries.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-star-300 text-sm">Sort:</span>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="bg-white/[0.06] border border-white/[0.06] text-white rounded-lg px-3 py-2 h-11 text-sm focus:ring-2 focus:ring-white/30 focus:border-white/15 outline-none"
                  >
                    <option value="payloadLeo">Payload LEO</option>
                    <option value="payloadGto">Payload GTO</option>
                    <option value="cost">Cost (Low to High)</option>
                    <option value="costPerKg">Cost/kg (Low to High)</option>
                    <option value="reliability">Reliability</option>
                    <option value="launches">Total Launches</option>
                    <option value="name">Name (A-Z)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Results Count */}
            <div className="mb-4 flex items-center justify-between">
              <div className="text-star-300 text-sm">
                Showing {filteredVehicles.length} of {ACTIVE_VEHICLES.length} launch vehicles
                {(searchQuery || statusFilter || countryFilter) && (
                  <button
                    onClick={() => { setSearchQuery(''); setStatusFilter(''); setCountryFilter(''); }}
                    className="ml-2 text-slate-300 hover:text-white"
                  >
                    Clear filters
                  </button>
                )}
              </div>
              <ExportButton
                data={filteredVehicles}
                filename="spacenexus-launch-vehicles"
                columns={VEHICLE_EXPORT_COLUMNS}
                label="Export Vehicles"
              />
            </div>

            {/* Vehicle Grid */}
            {filteredVehicles.length === 0 ? (
              <div className="text-center py-16">
                <h3 className="text-xl font-semibold text-white mb-2">No Vehicles Found</h3>
                <p className="text-star-300">Try adjusting your search or filters.</p>
              </div>
            ) : (
              <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {filteredVehicles.map(v => (
                  <StaggerItem key={v.id}>
                    <VehicleCard
                      vehicle={v}
                      onSelect={toggleCompare}
                      isSelected={compareSelection.includes(v.id)}
                    />
                  </StaggerItem>
                ))}
              </StaggerContainer>
            )}
          </div>
        )}

        {/* ──────────────── COMPARE TAB ──────────────── */}
        {activeTab === 'compare' && (
          <div>
            {/* Link to dedicated compare page */}
            <div className="mb-4 flex items-center gap-3">
              <Link
                href="/compare/launch-vehicles"
                className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-slate-300 hover:bg-white/[0.1] hover:border-white/15 transition-all"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                Open Dedicated Comparison Tool
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
              </Link>
              <span className="text-xs text-star-300">Advanced comparison with preset groups and search</span>
            </div>

            {/* Vehicle Selection */}
            <div className="card p-5 mb-6">
              <h3 className="text-lg font-semibold text-white mb-3">Select Vehicles to Compare (2-4)</h3>
              <div className="flex flex-wrap gap-2 mb-4">
                {ACTIVE_VEHICLES.map(v => (
                  <button
                    key={v.id}
                    onClick={() => toggleCompare(v)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                      compareSelection.includes(v.id)
                        ? 'bg-white/10 text-slate-300 border-white/15'
                        : 'bg-white/[0.06] text-star-300 border-white/[0.06] hover:border-white/[0.1]'
                    } ${compareSelection.length >= 4 && !compareSelection.includes(v.id) ? 'opacity-40 cursor-not-allowed' : ''}`}
                    disabled={compareSelection.length >= 4 && !compareSelection.includes(v.id)}
                  >
                    {v.name}
                  </button>
                ))}
              </div>
              {compareSelection.length > 0 && (
                <button
                  onClick={() => setCompareSelection([])}
                  className="text-xs text-star-300 hover:text-white transition-colors"
                >
                  Clear selection
                </button>
              )}
            </div>

            {selectedVehicles.length < 2 ? (
              <div className="text-center py-16 card">
                <div className="text-5xl mb-4">&#128640;</div>
                <h3 className="text-xl font-semibold text-white mb-2">Select at Least 2 Vehicles</h3>
                <p className="text-star-300">
                  Choose 2 to 4 vehicles above to compare them side by side.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/[0.06]">
                      <th className="text-left py-3 px-4 text-star-300 font-medium text-xs uppercase tracking-widest sticky left-0 bg-black z-10 min-w-[160px]">Specification</th>
                      {selectedVehicles.map(v => (
                        <th key={v.id} className="text-center py-3 px-4 min-w-[180px]">
                          <div className="text-white font-bold">{v.name}</div>
                          <div className="text-star-300 text-xs">
                            {getCompanyProfileUrl(v.manufacturer) ? (
                              <Link href={getCompanyProfileUrl(v.manufacturer)!} className="hover:underline">{v.manufacturer}</Link>
                            ) : v.manufacturer}
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.06]">
                    {/* General */}
                    <tr className="bg-white/[0.04]">
                      <td colSpan={selectedVehicles.length + 1} className="py-2 px-4 text-xs font-bold text-slate-300 uppercase tracking-widest">General</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-4 text-star-300 sticky left-0 bg-black">Status</td>
                      {selectedVehicles.map(v => {
                        const s = getStatusColor(v.status);
                        return <td key={v.id} className="py-2 px-4 text-center"><span className={`px-2 py-0.5 rounded text-xs font-medium ${s.bg} ${s.text}`}>{v.status}</span></td>;
                      })}
                    </tr>
                    <tr>
                      <td className="py-2 px-4 text-star-300 sticky left-0 bg-black">Country</td>
                      {selectedVehicles.map(v => <td key={v.id} className="py-2 px-4 text-center text-white">{v.country}</td>)}
                    </tr>
                    <tr>
                      <td className="py-2 px-4 text-star-300 sticky left-0 bg-black">First Flight</td>
                      {selectedVehicles.map(v => <td key={v.id} className="py-2 px-4 text-center text-white">{v.firstFlight}</td>)}
                    </tr>
                    <tr>
                      <td className="py-2 px-4 text-star-300 sticky left-0 bg-black">Reusable</td>
                      {selectedVehicles.map(v => <td key={v.id} className={`py-2 px-4 text-center font-medium ${v.reusable ? 'text-green-400' : 'text-star-300'}`}>{v.reusable ? 'Yes' : 'No'}</td>)}
                    </tr>
                    <tr>
                      <td className="py-2 px-4 text-star-300 sticky left-0 bg-black">Stages</td>
                      {selectedVehicles.map(v => <td key={v.id} className="py-2 px-4 text-center text-white">{v.stages}</td>)}
                    </tr>

                    {/* Dimensions */}
                    <tr className="bg-white/[0.04]">
                      <td colSpan={selectedVehicles.length + 1} className="py-2 px-4 text-xs font-bold text-slate-300 uppercase tracking-widest">Dimensions</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-4 text-star-300 sticky left-0 bg-black">Height</td>
                      {selectedVehicles.map(v => <td key={v.id} className="py-2 px-4 text-center text-white">{v.heightM} m</td>)}
                    </tr>
                    <tr>
                      <td className="py-2 px-4 text-star-300 sticky left-0 bg-black">Diameter</td>
                      {selectedVehicles.map(v => <td key={v.id} className="py-2 px-4 text-center text-white">{v.diameterM} m</td>)}
                    </tr>
                    <tr>
                      <td className="py-2 px-4 text-star-300 sticky left-0 bg-black">Launch Mass</td>
                      {selectedVehicles.map(v => <td key={v.id} className="py-2 px-4 text-center text-white">{(v.massKg / 1000).toLocaleString()} t</td>)}
                    </tr>
                    <tr>
                      <td className="py-2 px-4 text-star-300 sticky left-0 bg-black">Fairing Diameter</td>
                      {selectedVehicles.map(v => <td key={v.id} className="py-2 px-4 text-center text-white">{v.fairingDiameterM} m</td>)}
                    </tr>

                    {/* Payload */}
                    <tr className="bg-white/[0.04]">
                      <td colSpan={selectedVehicles.length + 1} className="py-2 px-4 text-xs font-bold text-slate-300 uppercase tracking-widest">Payload Capacity</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-4 text-star-300 sticky left-0 bg-black">LEO</td>
                      {selectedVehicles.map(v => {
                        const max = Math.max(...selectedVehicles.map(sv => sv.payloadLeoKg));
                        return <td key={v.id} className={`py-2 px-4 text-center font-semibold ${v.payloadLeoKg === max ? 'text-slate-300' : 'text-white'}`}>{formatNumber(v.payloadLeoKg)} kg</td>;
                      })}
                    </tr>
                    <tr>
                      <td className="py-2 px-4 text-star-300 sticky left-0 bg-black">GTO</td>
                      {selectedVehicles.map(v => {
                        const max = Math.max(...selectedVehicles.map(sv => sv.payloadGtoKg ?? 0));
                        return <td key={v.id} className={`py-2 px-4 text-center font-semibold ${v.payloadGtoKg === max && max > 0 ? 'text-slate-300' : 'text-white'}`}>{v.payloadGtoKg ? `${formatNumber(v.payloadGtoKg)} kg` : '--'}</td>;
                      })}
                    </tr>
                    <tr>
                      <td className="py-2 px-4 text-star-300 sticky left-0 bg-black">SSO</td>
                      {selectedVehicles.map(v => <td key={v.id} className="py-2 px-4 text-center text-white">{v.payloadSsoKg ? `${formatNumber(v.payloadSsoKg)} kg` : '--'}</td>)}
                    </tr>
                    <tr>
                      <td className="py-2 px-4 text-star-300 sticky left-0 bg-black">TLI</td>
                      {selectedVehicles.map(v => <td key={v.id} className="py-2 px-4 text-center text-white">{v.payloadTliKg ? `${formatNumber(v.payloadTliKg)} kg` : '--'}</td>)}
                    </tr>

                    {/* Propulsion */}
                    <tr className="bg-white/[0.04]">
                      <td colSpan={selectedVehicles.length + 1} className="py-2 px-4 text-xs font-bold text-slate-300 uppercase tracking-widest">Propulsion</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-4 text-star-300 sticky left-0 bg-black">Engines</td>
                      {selectedVehicles.map(v => <td key={v.id} className="py-2 px-4 text-center text-white text-xs">{v.engines}</td>)}
                    </tr>
                    <tr>
                      <td className="py-2 px-4 text-star-300 sticky left-0 bg-black">Propellant</td>
                      {selectedVehicles.map(v => <td key={v.id} className="py-2 px-4 text-center text-white text-xs">{v.propellant}</td>)}
                    </tr>

                    {/* Cost */}
                    <tr className="bg-white/[0.04]">
                      <td colSpan={selectedVehicles.length + 1} className="py-2 px-4 text-xs font-bold text-slate-300 uppercase tracking-widest">Cost</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-4 text-star-300 sticky left-0 bg-black">Launch Price</td>
                      {selectedVehicles.map(v => {
                        const min = Math.min(...selectedVehicles.filter(sv => sv.costMillions !== null).map(sv => sv.costMillions!));
                        return <td key={v.id} className={`py-2 px-4 text-center font-semibold ${v.costMillions === min ? 'text-green-400' : 'text-white'}`}>{formatCost(v.costMillions)}</td>;
                      })}
                    </tr>
                    <tr>
                      <td className="py-2 px-4 text-star-300 sticky left-0 bg-black">Cost per kg LEO</td>
                      {selectedVehicles.map(v => {
                        const costs = selectedVehicles.filter(sv => sv.costPerKgLeo !== null).map(sv => sv.costPerKgLeo!);
                        const min = costs.length > 0 ? Math.min(...costs) : 0;
                        return <td key={v.id} className={`py-2 px-4 text-center font-semibold ${v.costPerKgLeo === min && min > 0 ? 'text-green-400' : 'text-white'}`}>{formatCostPerKg(v.costPerKgLeo)}</td>;
                      })}
                    </tr>

                    {/* Reliability */}
                    <tr className="bg-white/[0.04]">
                      <td colSpan={selectedVehicles.length + 1} className="py-2 px-4 text-xs font-bold text-slate-300 uppercase tracking-widest">Reliability</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-4 text-star-300 sticky left-0 bg-black">Total Launches</td>
                      {selectedVehicles.map(v => <td key={v.id} className="py-2 px-4 text-center text-white font-semibold">{v.totalLaunches}</td>)}
                    </tr>
                    <tr>
                      <td className="py-2 px-4 text-star-300 sticky left-0 bg-black">Success Rate</td>
                      {selectedVehicles.map(v => <td key={v.id} className={`py-2 px-4 text-center font-bold ${v.totalLaunches > 0 ? getReliabilityColor(v.successRate) : 'text-star-300'}`}>{v.totalLaunches > 0 ? `${v.successRate.toFixed(1)}%` : 'N/A'}</td>)}
                    </tr>
                    <tr>
                      <td className="py-2 px-4 text-star-300 sticky left-0 bg-black">Consecutive Successes</td>
                      {selectedVehicles.map(v => <td key={v.id} className="py-2 px-4 text-center text-white">{v.consecutiveSuccesses}</td>)}
                    </tr>
                    <tr>
                      <td className="py-2 px-4 text-star-300 sticky left-0 bg-black">Cadence (launches)</td>
                      {selectedVehicles.map(v => <td key={v.id} className="py-2 px-4 text-center text-white">{v.totalLaunches > 0 ? v.totalLaunches : '--'}</td>)}
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ──────────────── RELIABILITY TAB ──────────────── */}
        {activeTab === 'reliability' && (
          <div className="space-y-6">
            {/* Overall Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="card p-4 text-center">
                <div className={`text-2xl font-bold font-display ${getReliabilityColor(avgSuccessRate)}`}>
                  {avgSuccessRate.toFixed(1)}%
                </div>
                <div className="text-star-300 text-xs uppercase tracking-widest font-medium">Avg Success Rate</div>
              </div>
              <div className="card p-4 text-center">
                <div className="text-2xl font-bold font-display text-white">
                  {totalLaunchesAll.toLocaleString()}
                </div>
                <div className="text-star-300 text-xs uppercase tracking-widest font-medium">Total Launches</div>
              </div>
              <div className="card p-4 text-center">
                <div className="text-2xl font-bold font-display text-green-400">
                  {ACTIVE_VEHICLES.reduce((sum, v) => sum + v.successes, 0).toLocaleString()}
                </div>
                <div className="text-star-300 text-xs uppercase tracking-widest font-medium">Total Successes</div>
              </div>
              <div className="card p-4 text-center">
                <div className="text-2xl font-bold font-display text-red-400">
                  {ACTIVE_VEHICLES.reduce((sum, v) => sum + v.failures, 0)}
                </div>
                <div className="text-star-300 text-xs uppercase tracking-widest font-medium">Total Failures</div>
              </div>
            </div>

            {/* Reliability Ranking */}
            <div className="card p-5">
              <h3 className="text-lg font-semibold text-white mb-4">Reliability Ranking</h3>
              <p className="text-star-300 text-sm mb-6">Ranked by success rate, then total launches. Only vehicles with flight history are shown.</p>

              <div className="space-y-3">
                {reliabilityRanked.map((v, idx) => (
                  <div key={v.id} className="flex items-center gap-4">
                    <div className="flex-shrink-0 w-8 text-center">
                      <span className={`text-sm font-bold ${idx === 0 ? 'text-yellow-400' : idx === 1 ? 'text-slate-300' : idx === 2 ? 'text-amber-600' : 'text-star-300'}`}>
                        #{idx + 1}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-white font-medium text-sm truncate">{v.name}</span>
                          <span className="text-star-300 text-xs hidden sm:inline">({getCompanyProfileUrl(v.manufacturer) ? (
                            <Link href={getCompanyProfileUrl(v.manufacturer)!} className="hover:underline">{v.manufacturer}</Link>
                          ) : v.manufacturer})</span>
                          {v.reusable && (
                            <span className="px-1.5 py-0.5 rounded text-xs bg-white/[0.04] text-slate-300 border border-white/10 hidden md:inline">
                              Reusable
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0 ml-3">
                          <span className={`text-sm font-bold ${getReliabilityColor(v.successRate)}`}>
                            {v.successRate.toFixed(1)}%
                          </span>
                          <span className="text-star-300 text-xs whitespace-nowrap">
                            {v.successes}/{v.totalLaunches}
                          </span>
                        </div>
                      </div>
                      <div className="h-2 bg-white/[0.08] rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            v.successRate >= 97 ? 'bg-gradient-to-r from-green-600 to-green-400' :
                            v.successRate >= 90 ? 'bg-gradient-to-r from-yellow-600 to-yellow-400' :
                            v.successRate >= 75 ? 'bg-gradient-to-r from-orange-600 to-orange-400' :
                            'bg-gradient-to-r from-red-600 to-red-400'
                          }`}
                          style={{ width: `${v.successRate}%` }}
                        />
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-xs text-star-300">
                        <span>Failures: {v.failures}</span>
                        <span>Partial: {v.partialFailures}</span>
                        <span>Streak: {v.consecutiveSuccesses} consecutive</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Consecutive Successes Chart */}
            <div className="card p-5">
              <h3 className="text-lg font-semibold text-white mb-4">Consecutive Success Streaks</h3>
              <p className="text-star-300 text-sm mb-6">Current consecutive successful missions without a failure.</p>
              <div className="space-y-3">
                {[...reliabilityRanked]
                  .sort((a, b) => b.consecutiveSuccesses - a.consecutiveSuccesses)
                  .filter(v => v.consecutiveSuccesses > 0)
                  .map(v => {
                    const maxStreak = Math.max(...reliabilityRanked.map(rv => rv.consecutiveSuccesses));
                    const pct = maxStreak > 0 ? (v.consecutiveSuccesses / maxStreak) * 100 : 0;
                    return (
                      <div key={v.id}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-white text-sm font-medium">{v.name}</span>
                          <span className="text-slate-300 text-sm font-bold">{v.consecutiveSuccesses}</span>
                        </div>
                        <div className="h-2 bg-white/[0.08] rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-slate-200 to-slate-400 rounded-full transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* Data Sources */}
            <div className="card p-5 border-dashed border-white/[0.06]">
              <h3 className="text-lg font-semibold text-white mb-3">Data Sources</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-star-300">
                <div>
                  <h4 className="text-white font-medium mb-2">Launch Records</h4>
                  <ul className="space-y-1">
                    <li>Jonathan McDowell&apos;s Launch Log</li>
                    <li>Space Launch Report</li>
                    <li>Gunter&apos;s Space Page</li>
                    <li>Next Spaceflight</li>
                  </ul>
                </div>
                <div>
                  <h4 className="text-white font-medium mb-2">Manufacturer Data</h4>
                  <ul className="space-y-1">
                    <li>SpaceX Capabilities & Services</li>
                    <li>ULA Payload Planner&apos;s Guide</li>
                    <li>Arianespace User&apos;s Manual</li>
                    <li>ISRO Official Launch Records</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ──────────────── COST ANALYSIS TAB ──────────────── */}
        {activeTab === 'cost' && (
          <div className="space-y-6">
            {/* Cost Overview Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="card p-4 text-center">
                <div className="text-2xl font-bold font-display text-green-400">
                  {formatCostPerKg(costRanked[0]?.costPerKgLeo ?? null)}
                </div>
                <div className="text-star-300 text-xs uppercase tracking-widest font-medium">Lowest $/kg LEO</div>
                <div className="text-star-300 text-xs mt-0.5">{costRanked[0]?.name}</div>
              </div>
              <div className="card p-4 text-center">
                <div className="text-2xl font-bold font-display text-white">
                  {formatCost(costRanked.find(v => v.id === 'falcon-9')?.costMillions ?? null)}
                </div>
                <div className="text-star-300 text-xs uppercase tracking-widest font-medium">Market Leader</div>
                <div className="text-star-300 text-xs mt-0.5">Falcon 9</div>
              </div>
              <div className="card p-4 text-center">
                <div className="text-2xl font-bold font-display text-slate-300">
                  {ACTIVE_VEHICLES.filter(v => v.reusable).length}
                </div>
                <div className="text-star-300 text-xs uppercase tracking-widest font-medium">Reusable Vehicles</div>
              </div>
              <div className="card p-4 text-center">
                <div className="text-2xl font-bold font-display text-white">
                  {formatCost(costRanked.length > 0 ? costRanked[costRanked.length - 1].costMillions : null)}
                </div>
                <div className="text-star-300 text-xs uppercase tracking-widest font-medium">Most Expensive</div>
                <div className="text-star-300 text-xs mt-0.5">{costRanked.length > 0 ? costRanked[costRanked.length - 1].name : '--'}</div>
              </div>
            </div>

            {/* Cost per kg to LEO Ranking */}
            <div className="card p-5">
              <h3 className="text-lg font-semibold text-white mb-2">Cost per Kilogram to LEO</h3>
              <p className="text-star-300 text-sm mb-6">Published or estimated launch cost divided by maximum LEO payload capacity. Lower is better. Reusable vehicles shown highlighted.</p>
              <div className="space-y-4">
                {costRanked.map((v, idx) => {
                  const maxCost = costRanked[costRanked.length - 1]?.costPerKgLeo ?? 1;
                  const pct = maxCost > 0 ? ((v.costPerKgLeo ?? 0) / maxCost) * 100 : 0;
                  return (
                    <div key={v.id}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-bold w-6 ${idx === 0 ? 'text-green-400' : 'text-star-300'}`}>#{idx + 1}</span>
                          <span className="text-white font-medium text-sm">{v.name}</span>
                          <span className="text-star-300 text-xs">({getCompanyProfileUrl(v.manufacturer) ? (
                            <Link href={getCompanyProfileUrl(v.manufacturer)!} className="hover:underline">{v.manufacturer}</Link>
                          ) : v.manufacturer})</span>
                          {v.reusable && (
                            <span className="px-1.5 py-0.5 rounded text-xs bg-white/[0.04] text-slate-300 border border-white/10">
                              Reusable
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0 ml-3">
                          <span className={`text-sm font-bold ${idx === 0 ? 'text-green-400' : idx < 3 ? 'text-slate-300' : 'text-white'}`}>
                            {formatCostPerKg(v.costPerKgLeo)}
                          </span>
                        </div>
                      </div>
                      <div className="h-2 bg-white/[0.08] rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            v.reusable ? 'bg-gradient-to-r from-slate-200 to-slate-400' : 'bg-gradient-to-r from-slate-500 to-slate-400'
                          }`}
                          style={{ width: `${Math.max(pct, 2)}%` }}
                        />
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-xs text-star-300">
                        <span>Launch price: {formatCost(v.costMillions)}</span>
                        <span>Payload LEO: {formatNumber(v.payloadLeoKg)} kg</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Published Launch Prices */}
            <div className="card p-5">
              <h3 className="text-lg font-semibold text-white mb-2">Published Launch Prices</h3>
              <p className="text-star-300 text-sm mb-6">Advertised or estimated per-launch pricing. Actual prices vary by mission profile, orbit, and contract terms.</p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/[0.06]">
                      <th className="text-left py-2 px-3 text-star-300 text-xs uppercase tracking-widest">Vehicle</th>
                      <th className="text-left py-2 px-3 text-star-300 text-xs uppercase tracking-widest">Manufacturer</th>
                      <th className="text-right py-2 px-3 text-star-300 text-xs uppercase tracking-widest">Price</th>
                      <th className="text-right py-2 px-3 text-star-300 text-xs uppercase tracking-widest">$/kg LEO</th>
                      <th className="text-right py-2 px-3 text-star-300 text-xs uppercase tracking-widest">LEO Capacity</th>
                      <th className="text-center py-2 px-3 text-star-300 text-xs uppercase tracking-widest">Reusable</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.06]">
                    {[...ACTIVE_VEHICLES]
                      .filter(v => v.costMillions !== null)
                      .sort((a, b) => (a.costMillions ?? 0) - (b.costMillions ?? 0))
                      .map(v => (
                        <tr key={v.id} className="hover:bg-white/[0.04] transition-colors">
                          <td className="py-2.5 px-3 text-white font-medium">{v.name}</td>
                          <td className="py-2.5 px-3 text-star-300">
                            {getCompanyProfileUrl(v.manufacturer) ? (
                              <Link href={getCompanyProfileUrl(v.manufacturer)!} className="hover:underline">{v.manufacturer}</Link>
                            ) : v.manufacturer}
                          </td>
                          <td className="py-2.5 px-3 text-right text-white font-semibold">{formatCost(v.costMillions)}</td>
                          <td className="py-2.5 px-3 text-right text-slate-300 font-semibold">{formatCostPerKg(v.costPerKgLeo)}</td>
                          <td className="py-2.5 px-3 text-right text-white">{formatNumber(v.payloadLeoKg)} kg</td>
                          <td className="py-2.5 px-3 text-center">
                            {v.reusable ? (
                              <span className="text-green-400 font-medium">Yes</span>
                            ) : (
                              <span className="text-star-300">No</span>
                            )}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Reusability Impact */}
            <div className="card p-5 border border-white/10 bg-gradient-to-br from-slate-800/10 to-transparent">
              <h3 className="text-lg font-semibold text-white mb-3">Reusability Impact on Pricing</h3>
              <p className="text-star-300 text-sm mb-4">Reusable vehicles demonstrate significantly lower cost per kilogram compared to expendable counterparts.</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-slate-300 font-medium text-sm mb-3 uppercase tracking-widest">Reusable Vehicles</h4>
                  <div className="space-y-3">
                    {ACTIVE_VEHICLES.filter(v => v.reusable && v.costPerKgLeo !== null).sort((a, b) => (a.costPerKgLeo ?? 0) - (b.costPerKgLeo ?? 0)).map(v => (
                      <div key={v.id} className="flex items-center justify-between">
                        <div>
                          <span className="text-white text-sm font-medium">{v.name}</span>
                          <span className="text-star-300 text-xs ml-2">
                            {getCompanyProfileUrl(v.manufacturer) ? (
                              <Link href={getCompanyProfileUrl(v.manufacturer)!} className="hover:underline">{v.manufacturer}</Link>
                            ) : v.manufacturer}
                          </span>
                        </div>
                        <span className="text-slate-300 font-bold text-sm">{formatCostPerKg(v.costPerKgLeo)}</span>
                      </div>
                    ))}
                    <div className="pt-2 border-t border-white/[0.06]">
                      <div className="flex items-center justify-between">
                        <span className="text-star-300 text-sm">Average $/kg</span>
                        <span className="text-slate-300 font-bold text-sm">
                          ${Math.round(
                            ACTIVE_VEHICLES.filter(v => v.reusable && v.costPerKgLeo !== null).reduce((sum, v) => sum + (v.costPerKgLeo ?? 0), 0)
                            / ACTIVE_VEHICLES.filter(v => v.reusable && v.costPerKgLeo !== null).length
                          ).toLocaleString()}/kg
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                <div>
                  <h4 className="text-star-300 font-medium text-sm mb-3 uppercase tracking-widest">Expendable Vehicles</h4>
                  <div className="space-y-3">
                    {ACTIVE_VEHICLES.filter(v => !v.reusable && v.costPerKgLeo !== null).sort((a, b) => (a.costPerKgLeo ?? 0) - (b.costPerKgLeo ?? 0)).map(v => (
                      <div key={v.id} className="flex items-center justify-between">
                        <div>
                          <span className="text-white text-sm font-medium">{v.name}</span>
                          <span className="text-star-300 text-xs ml-2">
                            {getCompanyProfileUrl(v.manufacturer) ? (
                              <Link href={getCompanyProfileUrl(v.manufacturer)!} className="hover:underline">{v.manufacturer}</Link>
                            ) : v.manufacturer}
                          </span>
                        </div>
                        <span className="text-white font-bold text-sm">{formatCostPerKg(v.costPerKgLeo)}</span>
                      </div>
                    ))}
                    <div className="pt-2 border-t border-white/[0.06]">
                      <div className="flex items-center justify-between">
                        <span className="text-star-300 text-sm">Average $/kg</span>
                        <span className="text-white font-bold text-sm">
                          ${Math.round(
                            ACTIVE_VEHICLES.filter(v => !v.reusable && v.costPerKgLeo !== null).reduce((sum, v) => sum + (v.costPerKgLeo ?? 0), 0)
                            / ACTIVE_VEHICLES.filter(v => !v.reusable && v.costPerKgLeo !== null).length
                          ).toLocaleString()}/kg
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Cost Trends Note */}
            <div className="card p-5 border-dashed border-white/[0.06]">
              <h3 className="text-lg font-semibold text-white mb-3">Notes on Pricing</h3>
              <div className="text-sm text-star-300 space-y-2">
                <p>Published prices are approximate and may not reflect actual contract values. Government, military, and rideshare pricing differs significantly from commercial list prices.</p>
                <p>SpaceX Starship targets a cost per launch under $10M with full reusability, which would represent a 10-100x reduction in cost per kilogram compared to all other vehicles. This target has not yet been demonstrated commercially.</p>
                <p>Rideshare services (e.g., SpaceX Transporter missions) can reduce effective cost per kg by 50-80% for small payloads willing to share a launch with other customers.</p>
                <p>Chinese commercial launchers like Ceres-1 offer competitive pricing but are subject to export control restrictions that limit their addressable market.</p>
              </div>
            </div>
          </div>
        )}
      </div>

            {/* Related Reading */}
            <ScrollReveal>
              <div className="mt-12 mb-8 p-6 rounded-xl border border-white/[0.06] bg-white/[0.03]">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-4">Related Reading</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Link
                    href="/blog/falcon-9-workhorse-rocket-changed-spaceflight"
                    className="group flex items-start gap-3 p-3 rounded-lg hover:bg-white/[0.04] transition-colors"
                  >
                    <span className="text-slate-500 mt-0.5 shrink-0">📰</span>
                    <div>
                      <p className="text-sm font-medium text-white/80 group-hover:text-white transition-colors">Falcon 9: The Workhorse Rocket That Changed Spaceflight</p>
                      <p className="text-xs text-slate-500 mt-0.5">Blog article</p>
                    </div>
                  </Link>
                  <Link
                    href="/blog/spacex-starship-v3-whats-new-most-powerful-rocket"
                    className="group flex items-start gap-3 p-3 rounded-lg hover:bg-white/[0.04] transition-colors"
                  >
                    <span className="text-slate-500 mt-0.5 shrink-0">📰</span>
                    <div>
                      <p className="text-sm font-medium text-white/80 group-hover:text-white transition-colors">SpaceX Starship V3: What&apos;s New in the Most Powerful Rocket</p>
                      <p className="text-xs text-slate-500 mt-0.5">Blog article</p>
                    </div>
                  </Link>
                </div>
              </div>
            </ScrollReveal>

            <SubscribeCTA />

            <ScrollReveal>
              <RelatedModules
                modules={[
              { name: 'Mission Planning', description: 'Cost estimation and mission design', href: '/mission-cost', icon: '📊' },
              { name: 'Space Manufacturing', description: 'Rocket and satellite manufacturing', href: '/space-manufacturing', icon: '🏭' },
              { name: 'Spaceports', description: 'Global launch site directory', href: '/spaceports', icon: '🏗️' },
              { name: 'Launch Sites', description: 'Worldwide launch facility profiles', href: '/launch-sites', icon: '📍' },
                ]}
              />
            </ScrollReveal>
    </div>
  );
}
