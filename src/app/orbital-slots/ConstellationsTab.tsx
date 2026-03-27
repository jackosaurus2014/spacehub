'use client';

import Link from 'next/link';
import { StaggerContainer, StaggerItem } from '@/components/ui/ScrollReveal';
import {
  MEGA_CONSTELLATIONS,
  COUNTRY_FLAGS,
  type MegaConstellationInfo,
} from './data';

function formatNumber(n: number): string {
  return n.toLocaleString();
}

interface ConstellationsTabProps {
  filteredConstellations: MegaConstellationInfo[];
  constellationStatusFilter: string;
  setConstellationStatusFilter: (v: string) => void;
}

export default function ConstellationsTab({ filteredConstellations, constellationStatusFilter, setConstellationStatusFilter }: ConstellationsTabProps) {
  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="card-elevated p-4 text-center">
          <div className="text-2xl font-bold font-display text-white">
            {formatNumber(MEGA_CONSTELLATIONS.reduce((s, c) => s + c.launched, 0))}
          </div>
          <div className="text-slate-400 text-xs uppercase tracking-widest font-medium">Total Launched</div>
        </div>
        <div className="card-elevated p-4 text-center">
          <div className="text-2xl font-bold font-display text-green-400">
            {formatNumber(MEGA_CONSTELLATIONS.reduce((s, c) => s + c.operational, 0))}
          </div>
          <div className="text-slate-400 text-xs uppercase tracking-widest font-medium">Operational</div>
        </div>
        <div className="card-elevated p-4 text-center">
          <div className="text-2xl font-bold font-display text-slate-300">
            {formatNumber(MEGA_CONSTELLATIONS.reduce((s, c) => s + c.approved, 0))}
          </div>
          <div className="text-slate-400 text-xs uppercase tracking-widest font-medium">Approved</div>
        </div>
        <div className="card-elevated p-4 text-center">
          <div className="text-2xl font-bold font-display text-purple-400">
            {formatNumber(MEGA_CONSTELLATIONS.reduce((s, c) => s + (c.gen2Target || 0), 0))}
          </div>
          <div className="text-slate-400 text-xs uppercase tracking-widest font-medium">Gen2 Target</div>
        </div>
        <div className="card-elevated p-4 text-center">
          <div className="text-2xl font-bold font-display text-yellow-400">
            {MEGA_CONSTELLATIONS.length}
          </div>
          <div className="text-slate-400 text-xs uppercase tracking-widest font-medium">Constellations</div>
        </div>
      </div>

      {/* Status Filter */}
      <div className="card p-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-slate-400 text-sm mr-2">Filter by status:</span>
          <button
            onClick={() => setConstellationStatusFilter('')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              constellationStatusFilter === ''
                ? 'bg-white/[0.08] text-white border border-white/[0.06]'
                : 'bg-transparent text-slate-400 border border-white/[0.06] hover:border-white/[0.1]'
            }`}
          >
            All ({MEGA_CONSTELLATIONS.length})
          </button>
          {(['operational', 'deploying', 'planned', 'early-stage'] as const).map((status) => {
            const count = MEGA_CONSTELLATIONS.filter(c => c.status === status).length;
            const colors: Record<string, string> = {
              operational: 'text-green-400',
              deploying: 'text-blue-400',
              planned: 'text-yellow-400',
              'early-stage': 'text-slate-400',
            };
            return (
              <button
                key={status}
                onClick={() => setConstellationStatusFilter(status === constellationStatusFilter ? '' : status)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  constellationStatusFilter === status
                    ? 'bg-white/[0.08] text-white border border-white/[0.06]'
                    : 'bg-transparent text-slate-400 border border-white/[0.06] hover:border-white/[0.1]'
                }`}
              >
                <span className={colors[status]}>{status.charAt(0).toUpperCase() + status.slice(1).replace('-', ' ')}</span> ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Constellation Cards */}
      <StaggerContainer className="space-y-6">
        {filteredConstellations.map((constellation) => {
          const flag = COUNTRY_FLAGS[constellation.country] || '\u{1F30D}';
          const launchProgress = constellation.approved > 0 ? (constellation.launched / constellation.approved) * 100 : 0;
          const operationalRate = constellation.launched > 0 ? (constellation.operational / constellation.launched) * 100 : 0;
          const statusColors: Record<string, { bg: string; text: string; border: string }> = {
            operational: { bg: 'bg-green-900/20', text: 'text-green-400', border: 'border-green-500/30' },
            deploying: { bg: 'bg-blue-900/20', text: 'text-blue-400', border: 'border-blue-500/30' },
            planned: { bg: 'bg-yellow-900/20', text: 'text-yellow-400', border: 'border-yellow-500/30' },
            'early-stage': { bg: 'bg-white/[0.04]', text: 'text-slate-400', border: 'border-white/[0.06]' },
          };
          const sc = statusColors[constellation.status];

          return (
            <StaggerItem key={constellation.name}>
              <div className={`card p-6 border ${sc.border}`}>
                {/* Header */}
                <div className="flex items-start justify-between mb-5">
                  <div className="flex items-center gap-4">
                    <div className={`w-14 h-14 rounded-xl ${sc.bg} border ${sc.border} flex items-center justify-center`}>
                      <span className="text-3xl">{'\u{2B50}'}</span>
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-white">{constellation.name}</h3>
                      <div className="flex items-center gap-2 text-sm text-slate-400 mt-0.5">
                        <span>{flag} {constellation.country}</span>
                        <span className="text-slate-600">|</span>
                        <span>{constellation.operator}</span>
                        <span className="text-slate-600">|</span>
                        <span>{constellation.orbit} @ {constellation.altitude}</span>
                      </div>
                    </div>
                  </div>
                  <span className={`text-xs font-bold px-3 py-1.5 rounded ${sc.bg} ${sc.text} border ${sc.border} uppercase tracking-wider`}>
                    {constellation.status.replace('-', ' ')}
                  </span>
                </div>

                {/* Purpose */}
                <p className="text-slate-400 text-sm mb-5">{constellation.purpose}</p>

                {/* Launch Progress Bar */}
                <div className="mb-5">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-slate-400 text-xs font-medium uppercase tracking-widest">Launch Progress</span>
                    <span className="text-white text-sm font-bold">{launchProgress.toFixed(1)}% ({formatNumber(constellation.launched)} / {formatNumber(constellation.approved)})</span>
                  </div>
                  <div className="h-4 bg-white/[0.08] rounded-full overflow-hidden relative">
                    <div
                      className="h-full bg-gradient-to-r from-white to-blue-500 rounded-full transition-all duration-1000"
                      style={{ width: `${Math.min(launchProgress, 100)}%` }}
                    />
                    {constellation.gen2Target && constellation.gen2Target > constellation.approved && (
                      <div
                        className="absolute top-0 h-full border-r-2 border-dashed border-purple-400/50"
                        style={{ left: `${Math.min((constellation.approved / constellation.gen2Target) * 100, 100)}%` }}
                        title={`Gen1 approved: ${formatNumber(constellation.approved)}`}
                      />
                    )}
                  </div>
                  {constellation.gen2Target && (
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-purple-400/60 text-xs">Gen2 Target: {formatNumber(constellation.gen2Target)}</span>
                      <span className="text-slate-500 text-xs">{((constellation.launched / constellation.gen2Target) * 100).toFixed(1)}% of Gen2</span>
                    </div>
                  )}
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
                  <div className="bg-white/[0.08] rounded-lg p-3 text-center">
                    <div className="text-lg font-bold text-white">{formatNumber(constellation.launched)}</div>
                    <div className="text-slate-400 text-xs">Launched</div>
                  </div>
                  <div className="bg-white/[0.08] rounded-lg p-3 text-center">
                    <div className="text-lg font-bold text-green-400">{formatNumber(constellation.operational)}</div>
                    <div className="text-slate-400 text-xs">Operational</div>
                  </div>
                  <div className="bg-white/[0.08] rounded-lg p-3 text-center">
                    <div className="text-lg font-bold text-slate-300">{formatNumber(constellation.approved)}</div>
                    <div className="text-slate-400 text-xs">Approved</div>
                  </div>
                  <div className="bg-white/[0.08] rounded-lg p-3 text-center">
                    <div className="text-lg font-bold text-purple-400">{formatNumber(constellation.gen2Target || 0)}</div>
                    <div className="text-slate-400 text-xs">Gen2 Target</div>
                  </div>
                </div>

                {/* Technical Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-400">First Launch</span>
                      <span className="text-white">{constellation.firstLaunch}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-400">Inclination/Planes</span>
                      <span className="text-white text-xs text-right max-w-[200px]">{constellation.inclinationPlanes}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-400">Mass/Satellite</span>
                      <span className="text-white">{constellation.massPerSat}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-400">Design Life</span>
                      <span className="text-white">{constellation.designLife}</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-400">Deorbit Plan</span>
                      <span className="text-white text-xs text-right max-w-[200px]">{constellation.deorbitPlan}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-400">Funding</span>
                      <span className="text-white text-xs text-right max-w-[200px]">{constellation.fundingStatus}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-400">Operational Rate</span>
                      <span className={`font-semibold ${operationalRate > 95 ? 'text-green-400' : operationalRate > 80 ? 'text-yellow-400' : 'text-slate-400'}`}>
                        {constellation.launched > 0 ? `${operationalRate.toFixed(1)}%` : 'N/A'}
                      </span>
                    </div>
                    {constellation.website !== 'N/A' && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-400">Website</span>
                        <a
                          href={constellation.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-white/90 hover:text-white text-xs transition-colors"
                        >
                          Visit &rarr;
                        </a>
                      </div>
                    )}
                  </div>
                </div>

                {/* Cross-links */}
                <div className="mt-4 pt-4 border-t border-white/[0.06] flex flex-wrap gap-2">
                  <Link
                    href={`/market-intel?search=${encodeURIComponent(constellation.operator)}`}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium bg-green-500/20 text-green-300 hover:bg-green-500/30 transition-colors border border-green-500/30"
                  >
                    Company Intel &rarr;
                  </Link>
                  <Link
                    href="/space-environment?tab=debris"
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium bg-white/10 text-white/90 hover:bg-white/15 transition-colors border border-white/10"
                  >
                    Debris Impact &rarr;
                  </Link>
                  <Link
                    href="/spectrum"
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium bg-white/[0.08] text-white/70 hover:bg-white/[0.12] transition-colors border border-white/[0.1]"
                  >
                    Spectrum Filings &rarr;
                  </Link>
                </div>
              </div>
            </StaggerItem>
          );
        })}
      </StaggerContainer>

      {filteredConstellations.length === 0 && (
        <div className="text-center py-16">
          <h3 className="text-xl font-semibold text-white mb-2">No Matching Constellations</h3>
          <p className="text-slate-400">Try adjusting your search or filter.</p>
        </div>
      )}

      {/* Data Sources */}
      <div className="card p-5 border-dashed">
        <h3 className="text-lg font-semibold text-white mb-3">Constellation Data Sources</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-slate-400">
          <div>
            <h4 className="text-white font-medium mb-2">Launch & Operations Data</h4>
            <ul className="space-y-1 text-xs">
              <li>FCC NGSO processing round filings</li>
              <li>ITU satellite network filings (SNL database)</li>
              <li>Jonathan McDowell&apos;s GCAT satellite catalog</li>
              <li>UCS Satellite Database</li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-medium mb-2">Regulatory & Approval Data</h4>
            <ul className="space-y-1 text-xs">
              <li>FCC Space Bureau authorization records</li>
              <li>ITU BR IFIC publications</li>
              <li>National regulatory filings (Ofcom, CNES, etc.)</li>
              <li>Operator press releases and SEC filings</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
