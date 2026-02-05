'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  SpectrumAllocation,
  SpectrumFiling,
  SPECTRUM_BANDS,
} from '@/types';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

interface SpectrumStats {
  totalBands: number;
  congestedBands: number;
  totalFilings: number;
  pendingFilings: number;
}

interface SpectrumData {
  allocations: SpectrumAllocation[];
  filings: SpectrumFiling[];
  stats: SpectrumStats;
}

const FILING_STATUS_INFO: Record<string, { label: string; color: string; bgColor: string }> = {
  available: { label: 'Available', color: 'text-green-400', bgColor: 'bg-green-500' },
  filed: { label: 'Filed', color: 'text-blue-400', bgColor: 'bg-blue-500' },
  coordinating: { label: 'Coordinating', color: 'text-yellow-400', bgColor: 'bg-yellow-500' },
  assigned: { label: 'Assigned', color: 'text-purple-400', bgColor: 'bg-purple-500' },
  congested: { label: 'Congested', color: 'text-red-400', bgColor: 'bg-red-500' },
};

function formatFrequency(ghz: number): string {
  if (ghz >= 1) {
    return `${ghz.toFixed(1)} GHz`;
  }
  return `${(ghz * 1000).toFixed(0)} MHz`;
}

function AllocationCard({ allocation }: { allocation: SpectrumAllocation }) {
  const statusInfo = FILING_STATUS_INFO[allocation.filingStatus] || FILING_STATUS_INFO.available;
  const bandInfo = SPECTRUM_BANDS.find((b) => b.value === allocation.bandName);
  const serviceLabels: Record<string, string> = {
    fixed_satellite: 'Fixed Satellite',
    mobile_satellite: 'Mobile Satellite',
    earth_exploration: 'Earth Exploration',
    radio_astronomy: 'Radio Astronomy',
    inter_satellite: 'Inter-Satellite',
  };

  return (
    <div className="p-3 bg-slate-50 rounded-lg">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">📡</span>
          <div>
            <span className="text-slate-800 font-medium text-sm">
              {bandInfo?.label || allocation.bandName}
            </span>
            <span className="text-slate-500 text-xs ml-2">
              {formatFrequency(allocation.frequencyMin)} - {formatFrequency(allocation.frequencyMax)}
            </span>
          </div>
        </div>
        <span
          className={`text-xs px-2 py-0.5 rounded ${statusInfo.color}`}
          style={{ backgroundColor: `${statusInfo.bgColor.replace('bg-', '')}20` }}
        >
          <span className={`inline-block w-1.5 h-1.5 rounded-full ${statusInfo.bgColor} mr-1`} />
          {statusInfo.label}
        </span>
      </div>

      {/* Frequency bar visualization */}
      <div className="h-3 bg-slate-200 rounded-full overflow-hidden mb-2">
        <div
          className={`h-full ${statusInfo.bgColor} rounded-full`}
          style={{
            width: `${Math.min(
              ((allocation.numberOfFilings || 0) / Math.max(allocation.numberOfFilings, 10)) * 100,
              100
            )}%`,
            opacity: 0.7,
          }}
        />
      </div>

      <div className="flex justify-between text-xs text-slate-500">
        <span>{serviceLabels[allocation.service] || allocation.service}</span>
        <span>{allocation.numberOfFilings} filing{allocation.numberOfFilings !== 1 ? 's' : ''}</span>
      </div>

      {allocation.assignedTo && (
        <div className="mt-1 text-xs text-slate-500 truncate">
          Assigned: {allocation.assignedTo}
        </div>
      )}

      {allocation.coordinationRequired && (
        <div className="mt-1 flex items-center gap-1 text-xs text-yellow-400">
          <span>&#9888;</span> Coordination Required
        </div>
      )}
    </div>
  );
}

function FilingRow({ filing }: { filing: SpectrumFiling }) {
  const statusColors: Record<string, string> = {
    granted: 'bg-green-500/20 text-green-400',
    pending: 'bg-yellow-500/20 text-yellow-400',
    coordinating: 'bg-blue-500/20 text-blue-400',
    denied: 'bg-red-500/20 text-red-400',
    expired: 'bg-gray-500/20 text-gray-400',
  };

  const statusClass = statusColors[filing.status] || 'bg-space-600 text-star-300';
  const filingDate = new Date(filing.filingDate);

  return (
    <div className="p-3 bg-slate-50 rounded-lg flex items-center justify-between gap-3">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-slate-800 text-sm font-medium truncate">{filing.operator}</span>
          <span className={`text-xs px-2 py-0.5 rounded whitespace-nowrap ${statusClass}`}>
            {filing.status}
          </span>
        </div>
        <div className="text-slate-500 text-xs flex flex-wrap gap-x-3 gap-y-0.5">
          <span>{filing.system}</span>
          <span>{filing.bandName}</span>
          <span>{filing.orbitType}</span>
          {filing.numberOfSatellites && (
            <span>{filing.numberOfSatellites} sat{filing.numberOfSatellites !== 1 ? 's' : ''}</span>
          )}
        </div>
      </div>
      <div className="text-right shrink-0">
        <div className="text-slate-600 text-xs">
          {filingDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </div>
        <div className="text-slate-400 text-xs">{filing.agency}</div>
      </div>
    </div>
  );
}

export default function SpectrumTrackerModule() {
  const [data, setData] = useState<SpectrumData | null>(null);
  const [loading, setLoading] = useState(true);
  const [initializing, setInitializing] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
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

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!data || (!data.allocations.length && !data.filings.length)) {
    return (
      <div className="card p-8 text-center">
        <span className="text-5xl block mb-4">📡</span>
        <h3 className="text-xl font-semibold text-slate-800 mb-2">Spectrum & Frequency Tracker</h3>
        <p className="text-slate-500 mb-4">
          Satellite frequency allocations, filings, and spectrum availability.
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
            'Load Data'
          )}
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <span className="text-3xl">📡</span>
          <div>
            <h2 className="text-2xl font-display font-bold text-slate-800">Spectrum & Frequency Tracker</h2>
            <p className="text-slate-500 text-sm">Frequency allocations, filings & availability</p>
          </div>
        </div>
        <Link href="/spectrum" className="btn-secondary text-sm py-1.5 px-4">
          View All
        </Link>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="card p-3 text-center">
          <div className="text-2xl font-bold text-slate-800">{data.stats.totalBands}</div>
          <div className="text-slate-500 text-xs">Total Bands</div>
        </div>
        <div className="card p-3 text-center">
          <div className="text-2xl font-bold text-red-400">{data.stats.congestedBands}</div>
          <div className="text-slate-500 text-xs">Congested Bands</div>
        </div>
        <div className="card p-3 text-center">
          <div className="text-2xl font-bold text-blue-400">{data.stats.totalFilings}</div>
          <div className="text-slate-500 text-xs">Total Filings</div>
        </div>
        <div className="card p-3 text-center">
          <div className="text-2xl font-bold text-yellow-400">{data.stats.pendingFilings}</div>
          <div className="text-slate-500 text-xs">Pending Filings</div>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Spectrum Bands */}
        <div className="lg:col-span-2 card p-4">
          <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <span>📊</span> Spectrum Bands
          </h3>
          <div className="space-y-3">
            {data.allocations.slice(0, 6).map((allocation) => (
              <AllocationCard key={allocation.id} allocation={allocation} />
            ))}
          </div>
        </div>

        {/* Recent Filings */}
        <div className="card p-4">
          <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <span>📋</span> Recent Filings
          </h3>
          <div className="space-y-3">
            {data.filings.slice(0, 5).map((filing) => (
              <FilingRow key={filing.id} filing={filing} />
            ))}
            {data.filings.length === 0 && (
              <p className="text-slate-500 text-sm text-center py-4">No filings available</p>
            )}
          </div>
        </div>
      </div>

      {/* Band Legend */}
      <div className="card p-4 mt-6">
        <h3 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2">
          <span>🔑</span> Filing Status Legend
        </h3>
        <div className="flex flex-wrap gap-4">
          {Object.entries(FILING_STATUS_INFO).map(([key, info]) => (
            <div key={key} className="flex items-center gap-2 text-xs">
              <span className={`inline-block w-2.5 h-2.5 rounded-full ${info.bgColor}`} />
              <span className="text-slate-500">{info.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
