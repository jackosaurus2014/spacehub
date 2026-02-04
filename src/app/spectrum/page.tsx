'use client';

import { useState, useEffect, Suspense, useCallback } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import PageHeader from '@/components/ui/PageHeader';
import ExportButton from '@/components/ui/ExportButton';
import {
  SpectrumAllocation,
  SpectrumFiling,
  SPECTRUM_BANDS,
} from '@/types';

// ────────────────────────────────────────
// Types
// ────────────────────────────────────────

interface SpectrumStats {
  totalBands: number;
  congestedBands: number;
  totalFilings: number;
  pendingFilings: number;
  topBand: {
    bandName: string;
    filingStatus: string;
    numberOfFilings: number;
  } | null;
}

interface SpectrumData {
  allocations: SpectrumAllocation[];
  filings: SpectrumFiling[];
  stats: SpectrumStats;
}

// ────────────────────────────────────────
// Constants
// ────────────────────────────────────────

const FILING_STATUS_INFO: Record<string, { label: string; color: string; bgColor: string }> = {
  available: { label: 'Available', color: 'text-green-400', bgColor: 'bg-green-500' },
  filed: { label: 'Filed', color: 'text-blue-400', bgColor: 'bg-blue-500' },
  coordinating: { label: 'Coordinating', color: 'text-yellow-400', bgColor: 'bg-yellow-500' },
  assigned: { label: 'Assigned', color: 'text-purple-400', bgColor: 'bg-purple-500' },
  congested: { label: 'Congested', color: 'text-red-400', bgColor: 'bg-red-500' },
};

const OPERATOR_FILING_STATUSES: { value: string; label: string; color: string }[] = [
  { value: 'approved', label: 'Approved', color: 'bg-green-500/20 text-green-400' },
  { value: 'pending', label: 'Pending', color: 'bg-yellow-500/20 text-yellow-400' },
  { value: 'coordinating', label: 'Coordinating', color: 'bg-blue-500/20 text-blue-400' },
  { value: 'denied', label: 'Denied', color: 'bg-red-500/20 text-red-400' },
  { value: 'expired', label: 'Expired', color: 'bg-gray-500/20 text-gray-400' },
];

const SERVICE_LABELS: Record<string, string> = {
  fixed_satellite: 'Fixed Satellite',
  mobile_satellite: 'Mobile Satellite',
  earth_exploration: 'Earth Exploration',
  radio_astronomy: 'Radio Astronomy',
  inter_satellite: 'Inter-Satellite',
};

// ── Export column definitions ──

const FILING_EXPORT_COLUMNS = [
  { key: 'operator', label: 'Operator' },
  { key: 'system', label: 'System Name' },
  { key: 'bandName', label: 'Band' },
  { key: 'frequencyRange', label: 'Frequency Range' },
  { key: 'orbitType', label: 'Orbit Type' },
  { key: 'status', label: 'Status' },
  { key: 'filingDate', label: 'Filed Date' },
  { key: 'grantDate', label: 'Approval Date' },
  { key: 'expiryDate', label: 'Expiry Date' },
  { key: 'agency', label: 'Agency' },
  { key: 'filingId', label: 'Filing ID' },
  { key: 'numberOfSatellites', label: 'Satellites' },
  { key: 'description', label: 'Description' },
];

const ALLOCATION_EXPORT_COLUMNS = [
  { key: 'bandName', label: 'Band Name' },
  { key: 'frequencyRange', label: 'Frequency Range' },
  { key: 'allocationType', label: 'Allocation Type' },
  { key: 'service', label: 'Primary Service' },
  { key: 'region', label: 'Region' },
  { key: 'filingStatus', label: 'Status' },
  { key: 'assignedTo', label: 'Assigned Operator' },
  { key: 'ituReference', label: 'ITU Reference' },
  { key: 'fccReference', label: 'FCC Reference' },
];

// ── Known satellite operators for cross-module linking ──

const KNOWN_SATELLITE_OPERATORS = [
  'SpaceX', 'Starlink', 'OneWeb', 'Amazon', 'Kuiper', 'Telesat',
  'SES', 'Intelsat', 'Eutelsat', 'Viasat', 'Hughes', 'Iridium',
  'Globalstar', 'O3b', 'Boeing', 'Inmarsat', 'EchoStar',
];

// ────────────────────────────────────────
// Helpers
// ────────────────────────────────────────

function formatFrequency(mhz: number): string {
  if (mhz >= 1000) {
    return `${(mhz / 1000).toFixed(1)} GHz`;
  }
  return `${mhz.toFixed(0)} MHz`;
}

function formatDate(date: Date | string | null): string {
  if (!date) return '--';
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function getCongestionLevel(filingStatus: string, numberOfFilings: number): { label: string; percent: number; color: string } {
  if (filingStatus === 'congested') {
    return { label: 'High', percent: 90, color: 'bg-red-500' };
  }
  if (filingStatus === 'assigned' || filingStatus === 'coordinating') {
    const percent = Math.min(Math.max((numberOfFilings / 120) * 100, 30), 80);
    return { label: numberOfFilings > 50 ? 'Medium-High' : 'Medium', percent, color: 'bg-yellow-500' };
  }
  if (filingStatus === 'filed') {
    return { label: 'Low-Medium', percent: 35, color: 'bg-blue-500' };
  }
  return { label: 'Low', percent: 15, color: 'bg-green-500' };
}

function isKnownSatelliteOperator(operator: string): boolean {
  return KNOWN_SATELLITE_OPERATORS.some(
    (known) => operator.toLowerCase().includes(known.toLowerCase())
  );
}

/**
 * Enrich filing/allocation data with a computed frequencyRange field for export.
 */
function enrichWithFrequencyRange<T extends { frequencyMin: number; frequencyMax: number }>(
  items: T[]
): (T & { frequencyRange: string })[] {
  return items.map((item) => ({
    ...item,
    frequencyRange: `${formatFrequency(item.frequencyMin)} - ${formatFrequency(item.frequencyMax)}`,
  }));
}

// ────────────────────────────────────────
// Band Allocation Row
// ────────────────────────────────────────

function BandAllocationRow({ allocation }: { allocation: SpectrumAllocation }) {
  const statusInfo = FILING_STATUS_INFO[allocation.filingStatus] || FILING_STATUS_INFO.available;
  const bandInfo = SPECTRUM_BANDS.find((b) => b.value === allocation.bandName);
  const congestion = getCongestionLevel(allocation.filingStatus, allocation.numberOfFilings);

  return (
    <div className="card p-5 hover:border-nebula-500/50 transition-all">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-space-700 flex items-center justify-center text-lg shrink-0">
            {allocation.filingStatus === 'congested' ? '!' : '~'}
          </div>
          <div>
            <h4 className="font-semibold text-white text-base">
              {bandInfo?.label || allocation.bandName}
            </h4>
            <span className="text-star-400 text-sm">
              {formatFrequency(allocation.frequencyMin)} - {formatFrequency(allocation.frequencyMax)}
            </span>
          </div>
        </div>
        <span
          className={`text-xs font-medium px-2.5 py-1 rounded flex items-center gap-1.5 ${statusInfo.color}`}
          style={{ backgroundColor: `color-mix(in srgb, currentColor 15%, transparent)` }}
        >
          <span className={`inline-block w-2 h-2 rounded-full ${statusInfo.bgColor}`} />
          {statusInfo.label}
        </span>
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <div>
          <span className="text-star-400 text-xs block mb-1">Allocation</span>
          <span className="text-white text-sm font-medium capitalize">{allocation.allocationType}</span>
        </div>
        <div>
          <span className="text-star-400 text-xs block mb-1">Primary Service</span>
          <span className="text-white text-sm font-medium">{SERVICE_LABELS[allocation.service] || allocation.service}</span>
        </div>
        <div>
          <span className="text-star-400 text-xs block mb-1">Region</span>
          <span className="text-white text-sm font-medium">{allocation.region}</span>
        </div>
        <div>
          <span className="text-star-400 text-xs block mb-1">Active Filings</span>
          <span className="text-white text-sm font-medium">{allocation.numberOfFilings}</span>
        </div>
      </div>

      {/* Utilization Bar */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-star-400 text-xs">Congestion Level</span>
          <span className={`text-xs font-medium ${
            congestion.percent > 70 ? 'text-red-400' : congestion.percent > 40 ? 'text-yellow-400' : 'text-green-400'
          }`}>{congestion.label}</span>
        </div>
        <div className="h-2 bg-space-700 rounded-full overflow-hidden">
          <div
            className={`h-full ${congestion.color} rounded-full transition-all duration-500`}
            style={{ width: `${congestion.percent}%`, opacity: 0.8 }}
          />
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between flex-wrap gap-2 pt-3 border-t border-white/[0.06]">
        <div className="flex items-center gap-3 text-xs text-star-400">
          {allocation.assignedTo && (
            <span>Assigned: <span className="text-star-200">{allocation.assignedTo}</span></span>
          )}
        </div>
        <div className="flex items-center gap-3 text-xs">
          {allocation.ituReference && (
            <span className="text-star-400">ITU: <span className="text-nebula-300 font-mono">{allocation.ituReference}</span></span>
          )}
          {allocation.fccReference && (
            <span className="text-star-400">FCC: <span className="text-nebula-300 font-mono">{allocation.fccReference}</span></span>
          )}
          {allocation.coordinationRequired && (
            <span className="text-yellow-400 flex items-center gap-1">Coordination Required</span>
          )}
        </div>
      </div>

      {/* Cross-module link: View regulatory framework */}
      <div className="flex items-center gap-3 mt-3 pt-3 border-t border-white/[0.06]">
        <Link
          href="/compliance"
          className="text-xs text-nebula-300 hover:text-nebula-200 underline underline-offset-2 transition-colors"
        >
          View regulatory framework
        </Link>
      </div>

      {/* Description */}
      {allocation.description && (
        <p className="text-star-300 text-xs mt-3 leading-relaxed">{allocation.description}</p>
      )}
    </div>
  );
}

// ────────────────────────────────────────
// Filing Card
// ────────────────────────────────────────

function FilingCard({ filing }: { filing: SpectrumFiling }) {
  const statusEntry = OPERATOR_FILING_STATUSES.find((s) => s.value === filing.status);
  const statusClass = statusEntry?.color || 'bg-space-600 text-star-300';
  const statusLabel = statusEntry?.label || filing.status;

  return (
    <div className="card p-5 hover:border-nebula-500/50 transition-all">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-white text-base">{filing.operator}</h4>
          <p className="text-star-400 text-sm mt-0.5">{filing.system}</p>
        </div>
        <span className={`text-xs font-medium px-2.5 py-1 rounded whitespace-nowrap ${statusClass}`}>
          {statusLabel}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div>
          <span className="text-star-400 text-xs block mb-0.5">Band</span>
          <span className="text-white text-sm font-medium">{filing.bandName}</span>
        </div>
        <div>
          <span className="text-star-400 text-xs block mb-0.5">Frequency Range</span>
          <span className="text-white text-sm font-medium">
            {formatFrequency(filing.frequencyMin)} - {formatFrequency(filing.frequencyMax)}
          </span>
        </div>
        <div>
          <span className="text-star-400 text-xs block mb-0.5">Orbit Type</span>
          <span className="text-white text-sm font-medium">{filing.orbitType}</span>
        </div>
        <div>
          <span className="text-star-400 text-xs block mb-0.5">Satellites</span>
          <span className="text-white text-sm font-medium">
            {filing.numberOfSatellites?.toLocaleString() || '--'}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-4 text-xs text-star-400 mb-3 flex-wrap">
        <span>Filed: <span className="text-star-200">{formatDate(filing.filingDate)}</span></span>
        {filing.grantDate && (
          <span>Approved: <span className="text-green-400">{formatDate(filing.grantDate)}</span></span>
        )}
        {filing.expiryDate && (
          <span>Expires: <span className="text-yellow-400">{formatDate(filing.expiryDate)}</span></span>
        )}
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-white/[0.06]">
        <span className="text-xs text-star-400">
          Agency: <span className="text-nebula-300 font-medium">{filing.agency}</span>
        </span>
        <span className="text-xs font-mono text-star-400">{filing.filingId}</span>
      </div>

      {/* Cross-module link: operator -> orbital slots */}
      {isKnownSatelliteOperator(filing.operator) && (
        <div className="mt-3 pt-3 border-t border-white/[0.06]">
          <Link
            href="/orbital-slots?tab=operators"
            className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-md bg-nebula-500/10 text-nebula-300 hover:bg-nebula-500/20 transition-colors"
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
            View {filing.operator} orbital slots
          </Link>
        </div>
      )}

      {filing.description && (
        <p className="text-star-300 text-xs mt-3 leading-relaxed">{filing.description}</p>
      )}
    </div>
  );
}

// ────────────────────────────────────────
// Inner Content (uses useSearchParams)
// ────────────────────────────────────────

function SpectrumContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // Read initial values from URL
  const initialTab = (searchParams.get('tab') as 'bands' | 'filings' | 'coordination') || 'bands';
  const initialStatus = searchParams.get('status') || '';
  const initialBand = searchParams.get('band') || '';

  const [activeTab, setActiveTab] = useState<'bands' | 'filings' | 'coordination'>(
    ['bands', 'filings', 'coordination'].includes(initialTab) ? initialTab : 'bands'
  );
  const [data, setData] = useState<SpectrumData | null>(null);
  const [loading, setLoading] = useState(true);
  const [initializing, setInitializing] = useState(false);

  // Filing filters (initialized from URL)
  const [statusFilter, setStatusFilter] = useState<string>(initialStatus);
  const [bandFilter, setBandFilter] = useState<string>(initialBand);

  // ── URL sync helper ──

  const updateUrl = useCallback(
    (params: Record<string, string>) => {
      const newParams = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(params)) {
        if (
          !value ||
          (key === 'tab' && value === 'bands') ||
          (key === 'status' && value === '') ||
          (key === 'band' && value === '')
        ) {
          newParams.delete(key);
        } else {
          newParams.set(key, value);
        }
      }
      const qs = newParams.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [searchParams, router, pathname]
  );

  const handleTabChange = useCallback(
    (tab: 'bands' | 'filings' | 'coordination') => {
      setActiveTab(tab);
      // When switching away from filings, remove filter params
      if (tab !== 'filings') {
        updateUrl({ tab, status: '', band: '' });
      } else {
        updateUrl({ tab, status: statusFilter, band: bandFilter });
      }
    },
    [updateUrl, statusFilter, bandFilter]
  );

  const handleStatusFilterChange = useCallback(
    (status: string) => {
      setStatusFilter(status);
      updateUrl({ status });
    },
    [updateUrl]
  );

  const handleBandFilterChange = useCallback(
    (band: string) => {
      setBandFilter(band);
      updateUrl({ band });
    },
    [updateUrl]
  );

  const handleClearFilters = useCallback(() => {
    setStatusFilter('');
    setBandFilter('');
    updateUrl({ status: '', band: '' });
  }, [updateUrl]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/spectrum');
      const result = await res.json();
      if (result.error) {
        throw new Error(result.error);
      }
      setData(result);
    } catch (err) {
      console.error('Failed to fetch spectrum data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleInitialize = async () => {
    setInitializing(true);
    try {
      await fetch('/api/spectrum/init', { method: 'POST' });
      await fetchData();
    } catch (error) {
      console.error('Failed to initialize spectrum data:', error);
    } finally {
      setInitializing(false);
    }
  };

  // Compute derived stats
  const approvedFilings = data?.filings.filter((f) => f.status === 'approved').length || 0;
  const pendingFilings = data?.stats.pendingFilings || 0;

  // Filtered filings
  const filteredFilings = (data?.filings || []).filter((f) => {
    if (statusFilter && f.status !== statusFilter) return false;
    if (bandFilter && f.bandName !== bandFilter) return false;
    return true;
  });

  // Get unique bands from filings for the band filter
  const filingBands = Array.from(new Set((data?.filings || []).map((f) => f.bandName))).sort();

  // Enriched data for export (with computed frequencyRange)
  const enrichedFilings = enrichWithFrequencyRange(filteredFilings);
  const enrichedAllocations = data ? enrichWithFrequencyRange(data.allocations) : [];

  if (loading) {
    return (
      <div className="min-h-screen">
        <div className="container mx-auto px-4">
          <PageHeader
            title="Spectrum Tracker"
            subtitle="Satellite frequency allocations, filings, and spectrum coordination"
            breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Spectrum Tracker' }]}
          />
          <div className="flex justify-center py-20">
            <LoadingSpinner size="lg" />
          </div>
        </div>
      </div>
    );
  }

  if (!data || (!data.allocations.length && !data.filings.length)) {
    return (
      <div className="min-h-screen">
        <div className="container mx-auto px-4">
          <PageHeader
            title="Spectrum Tracker"
            subtitle="Satellite frequency allocations, filings, and spectrum coordination"
            breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Spectrum Tracker' }]}
          />
          <div className="card p-12 text-center max-w-lg mx-auto">
            <div className="text-5xl mb-4">~</div>
            <h3 className="text-xl font-semibold text-white mb-2">No Spectrum Data Available</h3>
            <p className="text-star-300 mb-6">
              Load satellite frequency allocations, spectrum filings, and coordination data to get started.
            </p>
            <button
              onClick={handleInitialize}
              disabled={initializing}
              className="btn-primary"
            >
              {initializing ? (
                <span className="flex items-center gap-2">
                  <LoadingSpinner size="sm" />
                  Loading Data...
                </span>
              ) : (
                'Load Spectrum Data'
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4">
        <PageHeader
          title="Spectrum Tracker"
          subtitle="Satellite frequency allocations, filings, and spectrum coordination"
          breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Spectrum Tracker' }]}
        >
          <Link href="/" className="btn-secondary text-sm py-2 px-4">
            Back to Dashboard
          </Link>
        </PageHeader>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="card-elevated p-6 text-center">
            <div className="text-4xl font-bold font-display tracking-tight text-white">
              {data.stats.totalBands}
            </div>
            <div className="text-star-400 text-xs uppercase tracking-widest font-medium">
              Bands Tracked
            </div>
          </div>
          <div className="card-elevated p-6 text-center">
            <div className="text-4xl font-bold font-display tracking-tight text-blue-400">
              {data.stats.totalFilings}
            </div>
            <div className="text-star-400 text-xs uppercase tracking-widest font-medium">
              Total Filings
            </div>
          </div>
          <div className="card-elevated p-6 text-center">
            <div className="text-4xl font-bold font-display tracking-tight text-green-400">
              {approvedFilings}
            </div>
            <div className="text-star-400 text-xs uppercase tracking-widest font-medium">
              Approved Filings
            </div>
          </div>
          <div className="card-elevated p-6 text-center">
            <div className="text-4xl font-bold font-display tracking-tight text-yellow-400">
              {pendingFilings}
            </div>
            <div className="text-star-400 text-xs uppercase tracking-widest font-medium">
              Pending Filings
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
          {[
            { id: 'bands' as const, label: 'Band Allocations', count: data.allocations.length },
            { id: 'filings' as const, label: 'Active Filings', count: data.filings.length },
            { id: 'coordination' as const, label: 'Coordination' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-nebula-500 text-white shadow-glow-sm'
                  : 'bg-space-700/50 text-star-300 hover:bg-space-600/50'
              }`}
            >
              {tab.label}
              {'count' in tab && tab.count !== undefined && tab.count > 0 && (
                <span
                  className={`text-xs px-1.5 py-0.5 rounded-full ${
                    activeTab === tab.id
                      ? 'bg-white/20 text-white'
                      : 'bg-space-600 text-star-400'
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ──────────────── BAND ALLOCATIONS TAB ──────────────── */}
        {activeTab === 'bands' && (
          <div>
            {/* Spectrum Overview Bar */}
            <div className="card p-5 mb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white font-semibold">Spectrum Overview</h3>
                <ExportButton
                  data={enrichedAllocations}
                  filename="spectrum-band-allocations"
                  columns={ALLOCATION_EXPORT_COLUMNS}
                  label="Export Allocations"
                />
              </div>
              <div className="flex rounded-lg overflow-hidden h-8 mb-4">
                {data.allocations.map((alloc) => {
                  const statusInfo = FILING_STATUS_INFO[alloc.filingStatus] || FILING_STATUS_INFO.available;
                  const widthPercent = (alloc.bandwidth / data.allocations.reduce((sum, a) => sum + a.bandwidth, 0)) * 100;
                  return (
                    <div
                      key={alloc.id}
                      className={`${statusInfo.bgColor} relative group cursor-default`}
                      style={{ width: `${Math.max(widthPercent, 3)}%`, opacity: 0.7 }}
                      title={`${alloc.bandName}: ${formatFrequency(alloc.frequencyMin)} - ${formatFrequency(alloc.frequencyMax)}`}
                    >
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-[10px] font-bold text-white/80 truncate px-1">
                          {widthPercent > 8 ? alloc.bandName : ''}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="flex flex-wrap gap-4">
                {Object.entries(FILING_STATUS_INFO).map(([key, info]) => (
                  <div key={key} className="flex items-center gap-2 text-xs">
                    <span className={`inline-block w-2.5 h-2.5 rounded-full ${info.bgColor}`} style={{ opacity: 0.7 }} />
                    <span className="text-star-300">{info.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Band Cards */}
            <div className="space-y-4">
              {data.allocations.map((allocation) => (
                <BandAllocationRow key={allocation.id} allocation={allocation} />
              ))}
            </div>
          </div>
        )}

        {/* ──────────────── ACTIVE FILINGS TAB ──────────────── */}
        {activeTab === 'filings' && (
          <div>
            {/* Filters */}
            <div className="card p-4 mb-6">
              <div className="flex flex-wrap items-center gap-3">
                <select
                  value={statusFilter}
                  onChange={(e) => handleStatusFilterChange(e.target.value)}
                  className="bg-space-800 border border-white/[0.06] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-nebula-500/50"
                >
                  <option value="">All Statuses</option>
                  {OPERATOR_FILING_STATUSES.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>

                <select
                  value={bandFilter}
                  onChange={(e) => handleBandFilterChange(e.target.value)}
                  className="bg-space-800 border border-white/[0.06] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-nebula-500/50"
                >
                  <option value="">All Bands</option>
                  {filingBands.map((band) => {
                    const bandInfo = SPECTRUM_BANDS.find((b) => b.value === band);
                    return (
                      <option key={band} value={band}>{bandInfo?.label || band}</option>
                    );
                  })}
                </select>

                {(statusFilter || bandFilter) && (
                  <button
                    onClick={handleClearFilters}
                    className="px-3 py-2 rounded-lg text-sm text-star-400 hover:text-white transition-colors"
                  >
                    Clear Filters
                  </button>
                )}

                <span className="text-xs text-star-400 ml-auto mr-3">
                  {filteredFilings.length} {filteredFilings.length === 1 ? 'filing' : 'filings'} found
                </span>

                <ExportButton
                  data={enrichedFilings}
                  filename="spectrum-filings"
                  columns={FILING_EXPORT_COLUMNS}
                  label="Export Filings"
                />
              </div>
            </div>

            {/* Filing Cards */}
            {filteredFilings.length === 0 ? (
              <div className="text-center py-20">
                <div className="text-5xl mb-4">~</div>
                <h3 className="text-xl font-semibold text-white mb-2">No filings found</h3>
                <p className="text-star-300 mb-4">
                  {(statusFilter || bandFilter)
                    ? 'Try adjusting your filters to see more results.'
                    : 'No spectrum filings are currently available.'}
                </p>
                {(statusFilter || bandFilter) && (
                  <button
                    onClick={handleClearFilters}
                    className="btn-secondary"
                  >
                    Clear Filters
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {filteredFilings.map((filing) => (
                  <FilingCard key={filing.id} filing={filing} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ──────────────── COORDINATION TAB ──────────────── */}
        {activeTab === 'coordination' && (
          <div className="space-y-6">
            {/* Coordination Overview */}
            <div className="card p-6">
              <h3 className="text-lg font-semibold text-white mb-3">Spectrum Coordination Process</h3>
              <p className="text-star-300 text-sm leading-relaxed mb-4">
                Satellite spectrum coordination is the process by which operators negotiate with existing
                spectrum users to minimize interference. This is required before any new satellite system
                can begin operations in a shared frequency band. The process involves regulatory filings,
                technical analyses, and bilateral agreements between operators.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {[
                  { step: '1', title: 'Filing', desc: 'Operator submits spectrum request to national regulator (e.g., FCC) and ITU.' },
                  { step: '2', title: 'Publication', desc: 'ITU publishes the filing in the International Frequency Information Circular (BR IFIC).' },
                  { step: '3', title: 'Coordination', desc: 'Affected administrations and operators review and negotiate interference mitigation.' },
                  { step: '4', title: 'Registration', desc: 'Once coordinated, the assignment is recorded in the Master International Frequency Register.' },
                ].map((item) => (
                  <div key={item.step} className="card p-4 text-center">
                    <div className="w-8 h-8 rounded-full bg-nebula-500/20 text-nebula-400 font-bold text-sm flex items-center justify-center mx-auto mb-3">
                      {item.step}
                    </div>
                    <h4 className="text-white font-semibold text-sm mb-1">{item.title}</h4>
                    <p className="text-star-400 text-xs leading-relaxed">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Regulatory Bodies */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* ITU */}
              <div className="card-elevated p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center text-blue-400 font-bold text-sm">
                    ITU
                  </div>
                  <div>
                    <h4 className="text-white font-semibold">International Telecommunication Union</h4>
                    <p className="text-star-400 text-sm">United Nations specialized agency</p>
                  </div>
                </div>
                <p className="text-star-300 text-sm leading-relaxed mb-4">
                  The ITU is the global body responsible for coordinating the shared use of radio spectrum.
                  The Radiocommunication Sector (ITU-R) manages the Radio Regulations, which govern
                  international spectrum use for all satellite and terrestrial services.
                </p>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-star-400">Coordination Framework</span>
                    <span className="text-white">Radio Regulations (RR)</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-star-400">Filing Database</span>
                    <span className="text-white">Space Network Systems (SNS)</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-star-400">Key Conference</span>
                    <span className="text-white">World Radiocommunication Conference (WRC)</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-star-400">Regions</span>
                    <span className="text-white">Region 1, 2, 3 (Global)</span>
                  </div>
                </div>
                {/* Cross-module link to compliance */}
                <div className="mt-4 pt-3 border-t border-white/[0.06]">
                  <Link
                    href="/compliance?tab=regulations"
                    className="inline-flex items-center gap-1.5 text-xs text-nebula-300 hover:text-nebula-200 transition-colors"
                  >
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                    View ITU regulations in Compliance module
                  </Link>
                </div>
              </div>

              {/* FCC */}
              <div className="card-elevated p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center text-purple-400 font-bold text-sm">
                    FCC
                  </div>
                  <div>
                    <h4 className="text-white font-semibold">Federal Communications Commission</h4>
                    <p className="text-star-400 text-sm">United States regulator</p>
                  </div>
                </div>
                <p className="text-star-300 text-sm leading-relaxed mb-4">
                  The FCC regulates satellite communications in the United States through its
                  International Bureau and Space Bureau. It processes satellite applications,
                  manages spectrum auctions, and enforces compliance with license conditions.
                </p>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-star-400">Satellite Bureau</span>
                    <span className="text-white">Space Bureau (est. 2023)</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-star-400">Filing System</span>
                    <span className="text-white">IBFS / MyIBFS</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-star-400">Key Dockets</span>
                    <span className="text-white">NGSO FSS, MSS, C-band transition</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-star-400">Jurisdiction</span>
                    <span className="text-white">United States (ITU Region 2)</span>
                  </div>
                </div>
                {/* Cross-module link to compliance */}
                <div className="mt-4 pt-3 border-t border-white/[0.06]">
                  <Link
                    href="/compliance?tab=regulations"
                    className="inline-flex items-center gap-1.5 text-xs text-nebula-300 hover:text-nebula-200 transition-colors"
                  >
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                    View FCC regulations in Compliance module
                  </Link>
                </div>
              </div>
            </div>

            {/* Coordination Requirements Table */}
            <div className="card p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Bands Requiring Coordination</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/[0.06]">
                      <th className="text-left text-star-400 text-xs uppercase tracking-widest font-medium py-3 pr-4">Band</th>
                      <th className="text-left text-star-400 text-xs uppercase tracking-widest font-medium py-3 pr-4">Range</th>
                      <th className="text-left text-star-400 text-xs uppercase tracking-widest font-medium py-3 pr-4">Service</th>
                      <th className="text-left text-star-400 text-xs uppercase tracking-widest font-medium py-3 pr-4">Status</th>
                      <th className="text-left text-star-400 text-xs uppercase tracking-widest font-medium py-3 pr-4">Filings</th>
                      <th className="text-left text-star-400 text-xs uppercase tracking-widest font-medium py-3">References</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.allocations
                      .filter((a) => a.coordinationRequired)
                      .map((alloc) => {
                        const statusInfo = FILING_STATUS_INFO[alloc.filingStatus] || FILING_STATUS_INFO.available;
                        return (
                          <tr key={alloc.id} className="border-b border-white/[0.04] last:border-0">
                            <td className="py-3 pr-4 text-white font-medium">{alloc.bandName}</td>
                            <td className="py-3 pr-4 text-star-300">
                              {formatFrequency(alloc.frequencyMin)} - {formatFrequency(alloc.frequencyMax)}
                            </td>
                            <td className="py-3 pr-4 text-star-300">{SERVICE_LABELS[alloc.service] || alloc.service}</td>
                            <td className="py-3 pr-4">
                              <span className={`text-xs font-medium ${statusInfo.color}`}>{statusInfo.label}</span>
                            </td>
                            <td className="py-3 pr-4 text-star-300">{alloc.numberOfFilings}</td>
                            <td className="py-3 text-star-400 font-mono text-xs">
                              {[alloc.ituReference, alloc.fccReference].filter(Boolean).join(', ') || '--'}
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Additional Context */}
            <div className="card p-6 border-dashed">
              <h3 className="text-white font-semibold mb-3">Key Considerations</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <h4 className="text-nebula-300 text-sm font-medium mb-2">NGSO/GSO Sharing</h4>
                  <p className="text-star-400 text-xs leading-relaxed">
                    Non-geostationary (NGSO) constellations like Starlink and Kuiper must demonstrate
                    that they will not cause harmful interference to existing geostationary (GSO) satellite
                    operators through equivalent power flux density (EPFD) limits set by ITU Article 22.
                  </p>
                </div>
                <div>
                  <h4 className="text-nebula-300 text-sm font-medium mb-2">Milestone Requirements</h4>
                  <p className="text-star-400 text-xs leading-relaxed">
                    The FCC requires NGSO licensees to deploy a portion of their constellation within specific
                    timeframes. Failure to meet deployment milestones can result in license modification or
                    revocation. The ITU also has bring-into-use deadlines for filed satellite networks.
                  </p>
                </div>
                <div>
                  <h4 className="text-nebula-300 text-sm font-medium mb-2">Spectrum Auctions</h4>
                  <p className="text-star-400 text-xs leading-relaxed">
                    Some bands, particularly C-band (3.7-3.98 GHz), have undergone spectrum auctions
                    to reallocate frequencies from satellite to terrestrial 5G use. This process involves
                    clearing incumbent satellite operators and providing relocation compensation.
                  </p>
                </div>
              </div>
            </div>

            {/* Cross-module links for coordination resources */}
            <div className="card p-5 border border-nebula-500/20">
              <h3 className="text-white font-semibold mb-3">Related Resources</h3>
              <div className="flex flex-wrap gap-3">
                <Link
                  href="/compliance?tab=regulations"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-nebula-500/10 text-nebula-300 hover:bg-nebula-500/20 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  FCC/ITU Regulations
                </Link>
                <Link
                  href="/orbital-slots?tab=operators"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-nebula-500/10 text-nebula-300 hover:bg-nebula-500/20 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064" />
                  </svg>
                  Orbital Slot Operators
                </Link>
                <Link
                  href="/compliance"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-nebula-500/10 text-nebula-300 hover:bg-nebula-500/20 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  Compliance Dashboard
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Status Legend Footer */}
        <div className="card p-4 mt-8 mb-8">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex flex-wrap gap-4">
              {Object.entries(FILING_STATUS_INFO).map(([key, info]) => (
                <div key={key} className="flex items-center gap-2 text-xs">
                  <span className={`inline-block w-2.5 h-2.5 rounded-full ${info.bgColor}`} />
                  <span className="text-star-300">{info.label}</span>
                </div>
              ))}
            </div>
            <span className="text-xs text-star-400">
              {data.stats.totalBands} bands | {data.stats.totalFilings} total filings | {data.stats.congestedBands} congested
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ────────────────────────────────────────
// Main Page (with Suspense boundary)
// ────────────────────────────────────────

export default function SpectrumPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen">
          <div className="container mx-auto px-4">
            <PageHeader
              title="Spectrum Tracker"
              subtitle="Satellite frequency allocations, filings, and spectrum coordination"
              breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Spectrum Tracker' }]}
            />
            <div className="flex justify-center py-20">
              <LoadingSpinner size="lg" />
            </div>
          </div>
        </div>
      }
    >
      <SpectrumContent />
    </Suspense>
  );
}
