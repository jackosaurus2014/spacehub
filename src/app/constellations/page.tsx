'use client';

import { useState, useEffect } from 'react';
import AnimatedPageHeader from '@/components/ui/AnimatedPageHeader';
import DataFreshness from '@/components/ui/DataFreshness';
import ScrollReveal, { StaggerContainer, StaggerItem } from '@/components/ui/ScrollReveal';

// ────────────────────────────────────────
// Types & Constants
// ────────────────────────────────────────

type ConstellationStatus = 'operational' | 'deploying' | 'pre-launch' | 'development';
type ServiceType = 'Broadband' | 'Voice/IoT' | 'Earth Observation' | 'Broadband/IoT';

interface Constellation {
  id: string;
  name: string;
  operator: string;
  country: string;
  activeSatellites: number;
  authorizedSatellites: number;
  plannedGeneration: string;
  altitudeKm: string;
  inclinationDeg: string;
  frequencyBands: string;
  serviceType: ServiceType;
  status: ConstellationStatus;
  latencyEstimate: string;
  deorbitPlan: string;
  fccLicense: string;
  ituFiling: string;
  debrisCompliance: string;
  description: string;
  launchProvider: string;
  firstLaunch: string;
  estimatedCompletion: string;
}

const STATUS_CONFIG: Record<ConstellationStatus, { label: string; bg: string; text: string; border: string }> = {
  operational: { label: 'Operational', bg: 'bg-green-900/30', text: 'text-green-400', border: 'border-green-500/40' },
  deploying: { label: 'Deploying', bg: 'bg-cyan-900/30', text: 'text-cyan-400', border: 'border-cyan-500/40' },
  'pre-launch': { label: 'Pre-Launch', bg: 'bg-amber-900/30', text: 'text-amber-400', border: 'border-amber-500/40' },
  development: { label: 'Development', bg: 'bg-purple-900/30', text: 'text-purple-400', border: 'border-purple-500/40' },
};

const SERVICE_COLORS: Record<ServiceType, string> = {
  'Broadband': 'text-blue-400',
  'Voice/IoT': 'text-teal-400',
  'Earth Observation': 'text-emerald-400',
  'Broadband/IoT': 'text-indigo-400',
};

// ────────────────────────────────────────
// (Data fetched from /api/content/constellations)
// ────────────────────────────────────────

// ────────────────────────────────────────
// Helper Functions
// ────────────────────────────────────────

function getDeploymentPercent(active: number, authorized: number): number {
  if (authorized === 0) return 0;
  return Math.min((active / authorized) * 100, 100);
}

function formatNumber(n: number): string {
  return n.toLocaleString();
}

// ────────────────────────────────────────
// Sub-Components
// ────────────────────────────────────────

function HeroStats({ constellations }: { constellations: Constellation[] }) {
  const totalActive = constellations.reduce((sum, c) => sum + c.activeSatellites, 0);
  const totalAuthorized = constellations.reduce((sum, c) => sum + c.authorizedSatellites, 0);
  const totalConstellations = constellations.length;
  // Rough global coverage estimate based on operational + deploying constellations
  const operationalOrDeploying = constellations.filter(
    c => c.status === 'operational' || c.status === 'deploying'
  );
  const coverageEstimate = Math.min(
    Math.round(
      operationalOrDeploying.reduce((sum, c) => {
        const pct = getDeploymentPercent(c.activeSatellites, c.authorizedSatellites);
        return sum + pct * 0.15; // weighted contribution per constellation
      }, 0)
    ),
    98
  );

  const stats = [
    { label: 'Constellations Tracked', value: totalConstellations.toString(), color: 'text-white' },
    { label: 'Active Satellites', value: formatNumber(totalActive), color: 'text-cyan-400' },
    { label: 'Total Authorized', value: formatNumber(totalAuthorized), color: 'text-amber-400' },
    { label: 'Est. Global Coverage', value: `${coverageEstimate}%`, color: 'text-green-400' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
      {stats.map((stat) => (
        <div key={stat.label} className="card-elevated p-5 text-center">
          <div className={`text-3xl font-bold font-display ${stat.color}`}>
            {stat.value}
          </div>
          <div className="text-star-300 text-xs uppercase tracking-widest font-medium mt-1">
            {stat.label}
          </div>
        </div>
      ))}
    </div>
  );
}

function ConstellationCard({ constellation }: { constellation: Constellation }) {
  const statusStyle = STATUS_CONFIG[constellation.status];
  const deployPct = getDeploymentPercent(
    constellation.activeSatellites,
    constellation.authorizedSatellites
  );
  const serviceColor = SERVICE_COLORS[constellation.serviceType] || 'text-white';

  return (
    <div className="card p-6 hover:border-nebula-500/30 transition-all duration-300">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-1">
            <h3 className="text-lg font-bold text-white truncate">{constellation.name}</h3>
            <span className={`px-2.5 py-0.5 rounded text-xs font-semibold ${statusStyle.bg} ${statusStyle.text} border ${statusStyle.border}`}>
              {statusStyle.label}
            </span>
          </div>
          <p className="text-star-300 text-sm">{constellation.operator}</p>
          <p className="text-star-300/60 text-xs mt-0.5">{constellation.country}</p>
        </div>
        <div className="text-right flex-shrink-0 ml-4">
          <div className={`text-2xl font-bold font-display ${serviceColor}`}>
            {formatNumber(constellation.activeSatellites)}
          </div>
          <div className="text-star-300 text-xs">
            / {formatNumber(constellation.authorizedSatellites)} authorized
          </div>
        </div>
      </div>

      {/* Deployment Progress */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-star-300 text-xs font-medium">Deployment Progress</span>
          <span className="text-white text-xs font-bold">{deployPct.toFixed(1)}%</span>
        </div>
        <div className="h-2.5 bg-white/5 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              deployPct >= 90
                ? 'bg-gradient-to-r from-green-500 to-green-400'
                : deployPct >= 50
                ? 'bg-gradient-to-r from-cyan-500 to-cyan-400'
                : deployPct >= 10
                ? 'bg-gradient-to-r from-amber-500 to-amber-400'
                : 'bg-gradient-to-r from-purple-500 to-purple-400'
            }`}
            style={{ width: `${Math.max(deployPct, 1)}%` }}
          />
        </div>
        <div className="text-star-300/50 text-xs mt-1">{constellation.plannedGeneration}</div>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <span className="text-star-300/60 text-xs block">Altitude</span>
          <span className="text-white font-medium">{constellation.altitudeKm} km</span>
        </div>
        <div>
          <span className="text-star-300/60 text-xs block">Inclination</span>
          <span className="text-white font-medium">{constellation.inclinationDeg}&deg;</span>
        </div>
        <div>
          <span className="text-star-300/60 text-xs block">Bands</span>
          <span className="text-white font-medium">{constellation.frequencyBands}</span>
        </div>
        <div>
          <span className="text-star-300/60 text-xs block">Service</span>
          <span className={`font-medium ${serviceColor}`}>{constellation.serviceType}</span>
        </div>
      </div>

      {/* Description */}
      <p className="text-star-300/70 text-xs mt-4 leading-relaxed line-clamp-2">
        {constellation.description}
      </p>

      {/* Footer */}
      <div className="flex items-center gap-3 mt-4 pt-3 border-t border-white/5 text-xs text-star-300/50">
        <span>Latency: <span className="text-star-300">{constellation.latencyEstimate}</span></span>
        <span className="text-white/10">|</span>
        <span>First launch: <span className="text-star-300">{constellation.firstLaunch}</span></span>
      </div>
    </div>
  );
}

function ComparisonTable({ constellations }: { constellations: Constellation[] }) {
  return (
    <div className="card overflow-hidden">
      <div className="p-5 border-b border-white/5">
        <h2 className="text-lg font-bold text-white">Constellation Comparison</h2>
        <p className="text-star-300 text-sm mt-1">Side-by-side analysis of all tracked constellations</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-white/5">
              <th className="text-left px-4 py-3 text-star-300 font-semibold text-xs uppercase tracking-wider whitespace-nowrap">Constellation</th>
              <th className="text-left px-4 py-3 text-star-300 font-semibold text-xs uppercase tracking-wider whitespace-nowrap">Operator</th>
              <th className="text-right px-4 py-3 text-star-300 font-semibold text-xs uppercase tracking-wider whitespace-nowrap">Active</th>
              <th className="text-right px-4 py-3 text-star-300 font-semibold text-xs uppercase tracking-wider whitespace-nowrap">Authorized</th>
              <th className="text-right px-4 py-3 text-star-300 font-semibold text-xs uppercase tracking-wider whitespace-nowrap">Deployed %</th>
              <th className="text-left px-4 py-3 text-star-300 font-semibold text-xs uppercase tracking-wider whitespace-nowrap">Altitude</th>
              <th className="text-left px-4 py-3 text-star-300 font-semibold text-xs uppercase tracking-wider whitespace-nowrap">Bands</th>
              <th className="text-left px-4 py-3 text-star-300 font-semibold text-xs uppercase tracking-wider whitespace-nowrap">Service</th>
              <th className="text-left px-4 py-3 text-star-300 font-semibold text-xs uppercase tracking-wider whitespace-nowrap">Latency</th>
              <th className="text-left px-4 py-3 text-star-300 font-semibold text-xs uppercase tracking-wider whitespace-nowrap">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {constellations.map((c) => {
              const statusStyle = STATUS_CONFIG[c.status];
              const deployPct = getDeploymentPercent(c.activeSatellites, c.authorizedSatellites);
              return (
                <tr key={c.id} className="hover:bg-white/5 transition-colors">
                  <td className="px-4 py-3 font-semibold text-white whitespace-nowrap">{c.name}</td>
                  <td className="px-4 py-3 text-star-300 whitespace-nowrap">{c.operator}</td>
                  <td className="px-4 py-3 text-right text-white font-mono">{formatNumber(c.activeSatellites)}</td>
                  <td className="px-4 py-3 text-right text-star-300 font-mono">{formatNumber(c.authorizedSatellites)}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <div className="w-16 h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            deployPct >= 90 ? 'bg-green-400' : deployPct >= 50 ? 'bg-cyan-400' : deployPct >= 10 ? 'bg-amber-400' : 'bg-purple-400'
                          }`}
                          style={{ width: `${Math.max(deployPct, 2)}%` }}
                        />
                      </div>
                      <span className="text-white font-mono text-xs w-12 text-right">{deployPct.toFixed(1)}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-star-300 whitespace-nowrap">{c.altitudeKm} km</td>
                  <td className="px-4 py-3 text-star-300 whitespace-nowrap">{c.frequencyBands}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={SERVICE_COLORS[c.serviceType] || 'text-white'}>{c.serviceType}</span>
                  </td>
                  <td className="px-4 py-3 text-star-300 whitespace-nowrap">{c.latencyEstimate}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`px-2 py-0.5 rounded text-xs font-semibold ${statusStyle.bg} ${statusStyle.text} border ${statusStyle.border}`}>
                      {statusStyle.label}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Table Summary */}
      <div className="p-4 bg-white/[0.02] border-t border-white/5 flex flex-wrap items-center gap-6 text-xs text-star-300/60">
        <span>Total active: <span className="text-white font-bold">{formatNumber(constellations.reduce((s, c) => s + c.activeSatellites, 0))}</span></span>
        <span>Total authorized: <span className="text-white font-bold">{formatNumber(constellations.reduce((s, c) => s + c.authorizedSatellites, 0))}</span></span>
        <span>Operational: <span className="text-green-400 font-bold">{constellations.filter(c => c.status === 'operational').length}</span></span>
        <span>Deploying: <span className="text-cyan-400 font-bold">{constellations.filter(c => c.status === 'deploying').length}</span></span>
        <span>Development/Pre-Launch: <span className="text-amber-400 font-bold">{constellations.filter(c => c.status === 'development' || c.status === 'pre-launch').length}</span></span>
      </div>
    </div>
  );
}

function ConstellationDetail({ constellation }: { constellation: Constellation }) {
  const statusStyle = STATUS_CONFIG[constellation.status];
  const deployPct = getDeploymentPercent(constellation.activeSatellites, constellation.authorizedSatellites);

  return (
    <div className="card p-6" id={constellation.id}>
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3">
            <h3 className="text-xl font-bold text-white">{constellation.name}</h3>
            <span className={`px-2.5 py-0.5 rounded text-xs font-semibold ${statusStyle.bg} ${statusStyle.text} border ${statusStyle.border}`}>
              {statusStyle.label}
            </span>
          </div>
          <p className="text-star-300 text-sm mt-1">{constellation.operator} &mdash; {constellation.country}</p>
        </div>
        <div className="text-right">
          <div className="text-3xl font-bold font-display text-cyan-400">{formatNumber(constellation.activeSatellites)}</div>
          <div className="text-star-300 text-xs">of {formatNumber(constellation.authorizedSatellites)} authorized</div>
        </div>
      </div>

      {/* Description */}
      <p className="text-star-300 text-sm leading-relaxed mb-6">{constellation.description}</p>

      {/* Deployment bar */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-star-300 text-sm font-medium">Deployment Progress</span>
          <span className="text-white font-bold">{deployPct.toFixed(1)}%</span>
        </div>
        <div className="h-3 bg-white/5 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              deployPct >= 90
                ? 'bg-gradient-to-r from-green-500 to-green-400'
                : deployPct >= 50
                ? 'bg-gradient-to-r from-cyan-500 to-cyan-400'
                : deployPct >= 10
                ? 'bg-gradient-to-r from-amber-500 to-amber-400'
                : 'bg-gradient-to-r from-purple-500 to-purple-400'
            }`}
            style={{ width: `${Math.max(deployPct, 1)}%` }}
          />
        </div>
      </div>

      {/* Technical Specs Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white/[0.03] rounded-lg p-3">
          <span className="text-star-300/60 text-xs block mb-1">Altitude</span>
          <span className="text-white font-semibold">{constellation.altitudeKm} km</span>
        </div>
        <div className="bg-white/[0.03] rounded-lg p-3">
          <span className="text-star-300/60 text-xs block mb-1">Inclination</span>
          <span className="text-white font-semibold">{constellation.inclinationDeg}&deg;</span>
        </div>
        <div className="bg-white/[0.03] rounded-lg p-3">
          <span className="text-star-300/60 text-xs block mb-1">Frequency Bands</span>
          <span className="text-white font-semibold">{constellation.frequencyBands}</span>
        </div>
        <div className="bg-white/[0.03] rounded-lg p-3">
          <span className="text-star-300/60 text-xs block mb-1">Service Type</span>
          <span className={`font-semibold ${SERVICE_COLORS[constellation.serviceType] || 'text-white'}`}>
            {constellation.serviceType}
          </span>
        </div>
        <div className="bg-white/[0.03] rounded-lg p-3">
          <span className="text-star-300/60 text-xs block mb-1">Latency Estimate</span>
          <span className="text-white font-semibold">{constellation.latencyEstimate}</span>
        </div>
        <div className="bg-white/[0.03] rounded-lg p-3">
          <span className="text-star-300/60 text-xs block mb-1">Launch Provider</span>
          <span className="text-white font-semibold text-xs">{constellation.launchProvider}</span>
        </div>
        <div className="bg-white/[0.03] rounded-lg p-3">
          <span className="text-star-300/60 text-xs block mb-1">First Launch</span>
          <span className="text-white font-semibold">{constellation.firstLaunch}</span>
        </div>
        <div className="bg-white/[0.03] rounded-lg p-3">
          <span className="text-star-300/60 text-xs block mb-1">Est. Completion</span>
          <span className="text-white font-semibold">{constellation.estimatedCompletion}</span>
        </div>
      </div>

      {/* Deorbit Plan */}
      <div className="bg-white/[0.02] rounded-lg p-4 border border-white/5">
        <h4 className="text-sm font-semibold text-white mb-2">Deorbit / Debris Mitigation Plan</h4>
        <p className="text-star-300 text-xs leading-relaxed">{constellation.deorbitPlan}</p>
      </div>
    </div>
  );
}

function RegulatoryPanel({ constellations }: { constellations: Constellation[] }) {
  return (
    <div className="card p-6">
      <h2 className="text-lg font-bold text-white mb-2">Regulatory & Compliance Overview</h2>
      <p className="text-star-300 text-sm mb-6">
        FCC/ITU licensing status and debris mitigation compliance across tracked constellations
      </p>

      <div className="space-y-4">
        {constellations.map((c) => {
          const statusStyle = STATUS_CONFIG[c.status];
          const complianceColor = c.debrisCompliance.toLowerCase().startsWith('compliant')
            ? 'text-green-400'
            : c.debrisCompliance.toLowerCase().startsWith('exemplary')
            ? 'text-green-400'
            : c.debrisCompliance.toLowerCase().startsWith('planned')
            ? 'text-amber-400'
            : 'text-yellow-400';
          const complianceBg = c.debrisCompliance.toLowerCase().startsWith('compliant')
            ? 'bg-green-900/20 border-green-500/20'
            : c.debrisCompliance.toLowerCase().startsWith('exemplary')
            ? 'bg-green-900/20 border-green-500/20'
            : c.debrisCompliance.toLowerCase().startsWith('planned')
            ? 'bg-amber-900/20 border-amber-500/20'
            : 'bg-yellow-900/20 border-yellow-500/20';
          const complianceLabel = c.debrisCompliance.toLowerCase().startsWith('compliant')
            ? 'Compliant'
            : c.debrisCompliance.toLowerCase().startsWith('exemplary')
            ? 'Exemplary'
            : c.debrisCompliance.toLowerCase().startsWith('planned')
            ? 'Planned'
            : 'Under Review';

          return (
            <div key={c.id} className="bg-white/[0.02] rounded-lg p-4 border border-white/5">
              <div className="flex items-start justify-between flex-wrap gap-3 mb-3">
                <div className="flex items-center gap-3">
                  <h4 className="font-semibold text-white">{c.name}</h4>
                  <span className={`px-2 py-0.5 rounded text-xs font-semibold ${statusStyle.bg} ${statusStyle.text} border ${statusStyle.border}`}>
                    {statusStyle.label}
                  </span>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-bold border ${complianceBg} ${complianceColor}`}>
                  {complianceLabel}
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                <div>
                  <span className="text-star-300/60 block mb-1 font-medium uppercase tracking-wider">FCC License</span>
                  <span className="text-star-300 leading-relaxed">{c.fccLicense}</span>
                </div>
                <div>
                  <span className="text-star-300/60 block mb-1 font-medium uppercase tracking-wider">ITU Filing</span>
                  <span className="text-star-300 leading-relaxed">{c.ituFiling}</span>
                </div>
                <div>
                  <span className="text-star-300/60 block mb-1 font-medium uppercase tracking-wider">Debris Compliance</span>
                  <span className={`leading-relaxed ${complianceColor}`}>{c.debrisCompliance}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Regulatory Notes */}
      <div className="mt-6 p-4 bg-white/[0.02] border border-white/5 rounded-lg border-dashed">
        <h4 className="text-sm font-semibold text-white mb-2">Regulatory Notes</h4>
        <ul className="text-star-300 text-xs space-y-2 leading-relaxed">
          <li>
            <strong className="text-white">FCC 25-Year Rule (Updated 2022):</strong> The FCC adopted a new 5-year post-mission disposal rule for LEO satellites (effective Sep 2024), replacing the prior 25-year guideline. US-licensed operators must now deorbit within 5 years of mission end.
          </li>
          <li>
            <strong className="text-white">ITU Coordination:</strong> Non-geostationary (NGSO) constellations must coordinate with existing GEO and NGSO systems per ITU Radio Regulations Article 22. WRC-23 updated rules for NGSO milestone requirements.
          </li>
          <li>
            <strong className="text-white">IADC Guidelines:</strong> The Inter-Agency Space Debris Coordination Committee guidelines recommend end-of-life passivation, collision avoidance maneuvers, and post-mission disposal for all operators.
          </li>
          <li>
            <strong className="text-white">Space Sustainability Rating (SSR):</strong> The World Economic Forum&apos;s SSR initiative scores operators on debris mitigation, data sharing, collision avoidance, and detectability.
          </li>
        </ul>
      </div>
    </div>
  );
}

// ────────────────────────────────────────
// Main Page Component
// ────────────────────────────────────────

type TabId = 'overview' | 'comparison' | 'details' | 'regulatory';

export default function ConstellationTrackerPage() {
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [statusFilter, setStatusFilter] = useState<ConstellationStatus | ''>('');
  const [constellations, setConstellations] = useState<Constellation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshedAt, setRefreshedAt] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch('/api/content/constellations?section=constellations');
        if (!res.ok) throw new Error('Failed to fetch constellations');
        const json = await res.json();
        setConstellations(json.data || []);
        setRefreshedAt(json.meta?.lastRefreshed || null);
      } catch (err) {
        console.error('Error fetching constellation data:', err);
        setConstellations([]);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B0F1A] text-white p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-slate-800 rounded w-1/3"></div>
            <div className="h-4 bg-slate-800 rounded w-2/3"></div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
              {[1,2,3,4].map(i => <div key={i} className="h-24 bg-slate-800 rounded-lg"></div>)}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
              {[1,2,3,4].map(i => <div key={i} className="h-48 bg-slate-800 rounded-lg"></div>)}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const filteredConstellations = statusFilter
    ? constellations.filter((c) => c.status === statusFilter)
    : constellations;

  const tabs: { id: TabId; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'comparison', label: 'Comparison Table' },
    { id: 'details', label: 'Detailed Profiles' },
    { id: 'regulatory', label: 'Regulatory & Compliance' },
  ];

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4">
        <AnimatedPageHeader
          title="Constellation Tracker"
          subtitle="Track major satellite constellations -- deployments, orbital parameters, coverage, and regulatory compliance"
          icon="✨"
          accentColor="purple"
        />
        <DataFreshness refreshedAt={refreshedAt} source="DynamicContent" />

        {/* Hero Stats */}
        <ScrollReveal>
          <HeroStats constellations={constellations} />
        </ScrollReveal>

        {/* Tab Navigation */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-nebula-500 text-white shadow-glow-sm'
                  : 'bg-white/5 text-star-300 hover:bg-white/10'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ──────────────── OVERVIEW TAB ──────────────── */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Status Filters */}
            <div className="card p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-star-300 text-sm mr-2">Filter by status:</span>
                <button
                  onClick={() => setStatusFilter('')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    statusFilter === ''
                      ? 'bg-white/10 text-white border border-white/20'
                      : 'bg-transparent text-star-300 border border-white/10 hover:border-white/20'
                  }`}
                >
                  All ({constellations.length})
                </button>
                {(Object.entries(STATUS_CONFIG) as [ConstellationStatus, typeof STATUS_CONFIG[ConstellationStatus]][]).map(([key, config]) => {
                  const count = constellations.filter((c) => c.status === key).length;
                  return (
                    <button
                      key={key}
                      onClick={() => setStatusFilter(key)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                        statusFilter === key
                          ? `${config.bg} ${config.text} border ${config.border}`
                          : 'bg-transparent text-star-300 border border-white/10 hover:border-white/20'
                      }`}
                    >
                      {config.label} ({count})
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Constellation Cards Grid */}
            <StaggerContainer className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {filteredConstellations.map((constellation) => (
                <StaggerItem key={constellation.id}>
                  <ConstellationCard constellation={constellation} />
                </StaggerItem>
              ))}
            </StaggerContainer>

            {/* Market Overview */}
            <ScrollReveal>
            <div className="card p-6">
              <h3 className="text-lg font-bold text-white mb-4">Deployment Race -- Satellites by Operator</h3>
              <div className="space-y-3">
                {[...constellations]
                  .sort((a, b) => b.activeSatellites - a.activeSatellites)
                  .map((c) => {
                    const maxActive = Math.max(...constellations.map(x => x.activeSatellites));
                    const barWidth = maxActive > 0 ? (c.activeSatellites / maxActive) * 100 : 0;
                    const statusStyle = STATUS_CONFIG[c.status];
                    return (
                      <div key={c.id} className="flex items-center gap-4">
                        <div className="w-32 flex-shrink-0 text-sm text-white font-medium truncate">{c.name}</div>
                        <div className="flex-1 h-6 bg-white/5 rounded overflow-hidden relative">
                          <div
                            className="h-full bg-gradient-to-r from-cyan-600 to-cyan-400 rounded transition-all"
                            style={{ width: `${Math.max(barWidth, 0.5)}%` }}
                          />
                          <span className="absolute inset-0 flex items-center px-2 text-xs text-white font-mono">
                            {formatNumber(c.activeSatellites)}
                          </span>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-xs font-semibold ${statusStyle.bg} ${statusStyle.text} border ${statusStyle.border} flex-shrink-0`}>
                          {statusStyle.label}
                        </span>
                      </div>
                    );
                  })}
              </div>
            </div>
            </ScrollReveal>

            {/* Orbit Distribution */}
            <ScrollReveal>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="card p-6">
                <h3 className="text-lg font-bold text-white mb-4">By Orbital Regime</h3>
                <div className="space-y-3">
                  {[
                    { label: 'LEO (< 2,000 km)', constellations: constellations.filter(c => {
                      const alt = parseInt(c.altitudeKm.replace(/,/g, '').split('-')[0]);
                      return alt < 2000;
                    }), color: 'from-blue-500 to-blue-400' },
                    { label: 'MEO (2,000 - 35,786 km)', constellations: constellations.filter(c => {
                      const alt = parseInt(c.altitudeKm.replace(/,/g, '').split('-')[0]);
                      return alt >= 2000 && alt < 35786;
                    }), color: 'from-purple-500 to-purple-400' },
                  ].map((regime) => (
                    <div key={regime.label}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-star-300 text-sm">{regime.label}</span>
                        <span className="text-white text-sm font-medium">{regime.constellations.length} constellations</span>
                      </div>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {regime.constellations.map(c => (
                          <span key={c.id} className="px-2 py-0.5 rounded text-xs bg-white/5 text-star-300">
                            {c.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="card p-6">
                <h3 className="text-lg font-bold text-white mb-4">By Service Type</h3>
                <div className="space-y-3">
                  {['Broadband', 'Voice/IoT'].map((svc) => {
                    const matching = constellations.filter(c => c.serviceType === svc);
                    const totalActive = matching.reduce((s, c) => s + c.activeSatellites, 0);
                    return (
                      <div key={svc}>
                        <div className="flex items-center justify-between mb-1">
                          <span className={`text-sm font-medium ${SERVICE_COLORS[svc as ServiceType] || 'text-white'}`}>{svc}</span>
                          <span className="text-white text-sm font-medium">
                            {matching.length} constellations &middot; {formatNumber(totalActive)} active
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {matching.map(c => (
                            <span key={c.id} className="px-2 py-0.5 rounded text-xs bg-white/5 text-star-300">
                              {c.name} ({formatNumber(c.activeSatellites)})
                            </span>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
            </ScrollReveal>

            {/* Data Sources */}
            <div className="card p-5 border-dashed">
              <h3 className="text-sm font-semibold text-white mb-2">Data Sources</h3>
              <p className="text-star-300/60 text-xs leading-relaxed">
                Satellite counts derived from UCS Satellite Database, Space-Track.org TLE catalog, operator press releases, and FCC/ITU public filings.
                Coverage estimates are approximate and based on deployed satellite count relative to constellation design parameters.
                Data is representative and may not reflect real-time operational status.
              </p>
            </div>
          </div>
        )}

        {/* ──────────────── COMPARISON TABLE TAB ──────────────── */}
        {activeTab === 'comparison' && (
          <div className="space-y-6">
            <ComparisonTable constellations={constellations} />
          </div>
        )}

        {/* ──────────────── DETAILED PROFILES TAB ──────────────── */}
        {activeTab === 'details' && (
          <div className="space-y-6">
            {constellations.map((constellation) => (
              <ConstellationDetail key={constellation.id} constellation={constellation} />
            ))}
          </div>
        )}

        {/* ──────────────── REGULATORY TAB ──────────────── */}
        {activeTab === 'regulatory' && (
          <div className="space-y-6">
            <RegulatoryPanel constellations={constellations} />
          </div>
        )}

        {/* Bottom spacing */}
        <div className="h-12" />
      </div>
    </div>
  );
}
