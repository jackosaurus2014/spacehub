'use client';

import { useState } from 'react';
import PageHeader from '@/components/ui/PageHeader';

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
// Seed Data
// ────────────────────────────────────────

const CONSTELLATIONS: Constellation[] = [
  {
    id: 'starlink',
    name: 'Starlink',
    operator: 'SpaceX',
    country: 'United States',
    activeSatellites: 6421,
    authorizedSatellites: 12000,
    plannedGeneration: 'Gen1 (Gen2: 29,988 authorized)',
    altitudeKm: '550',
    inclinationDeg: '53',
    frequencyBands: 'Ku/Ka-band',
    serviceType: 'Broadband',
    status: 'deploying',
    latencyEstimate: '20-40 ms',
    deorbitPlan: '5-year autonomous deorbit via ion propulsion; ~5-year atmospheric decay at 550 km',
    fccLicense: 'FCC approved Gen1 (12,000) & Gen2 (7,500 initially); modification granted Dec 2022',
    ituFiling: 'Multiple ITU filings under USSAT-NGSO-10 and related coordination requests',
    debrisCompliance: 'Compliant - active deorbit capability, 97%+ success on autonomous collision avoidance',
    description: 'The largest commercial satellite constellation by active spacecraft count. Provides high-speed, low-latency broadband globally, including underserved and remote areas. Direct-to-cell capability being deployed with T-Mobile partnership.',
    launchProvider: 'SpaceX Falcon 9 / Starship (Gen2)',
    firstLaunch: 'May 2019',
    estimatedCompletion: 'Gen1: 2025, Gen2: ongoing',
  },
  {
    id: 'oneweb',
    name: 'OneWeb',
    operator: 'Eutelsat OneWeb',
    country: 'United Kingdom / France',
    activeSatellites: 634,
    authorizedSatellites: 648,
    plannedGeneration: 'Gen1 (Gen2: ~2,000 planned)',
    altitudeKm: '1,200',
    inclinationDeg: '87.9',
    frequencyBands: 'Ku/Ka-band',
    serviceType: 'Broadband',
    status: 'operational',
    latencyEstimate: '30-50 ms',
    deorbitPlan: '25-year deorbit compliance; satellites equipped with hall-effect thrusters for EOL maneuvers',
    fccLicense: 'FCC market access granted; operates under UK Ofcom license',
    ituFiling: 'ITU filings coordinated through UK administration; Ku/Ka spectrum rights secured',
    debrisCompliance: 'Compliant - meets inter-agency debris mitigation guidelines; 25-year rule adherence confirmed',
    description: 'Global LEO broadband constellation now fully deployed. Merged with Eutelsat in 2023 to create a multi-orbit operator. Focuses on enterprise, government, maritime, and aviation connectivity.',
    launchProvider: 'Arianespace Soyuz (initial), SpaceX Falcon 9, ISRO GSLV Mk III',
    firstLaunch: 'February 2019',
    estimatedCompletion: 'Gen1: Complete (2023)',
  },
  {
    id: 'kuiper',
    name: 'Project Kuiper',
    operator: 'Amazon',
    country: 'United States',
    activeSatellites: 2,
    authorizedSatellites: 3236,
    plannedGeneration: 'Phase 1 (3,236 satellites)',
    altitudeKm: '590-630',
    inclinationDeg: '33-51.9',
    frequencyBands: 'Ka-band',
    serviceType: 'Broadband',
    status: 'pre-launch',
    latencyEstimate: '20-40 ms (estimated)',
    deorbitPlan: 'Designed for autonomous deorbit within 355 days of EOL; atmospheric decay < 10 years at operating altitude',
    fccLicense: 'FCC license granted July 2020; must deploy 50% by July 2026 per FCC milestone requirements',
    ituFiling: 'ITU Ka-band filings under US administration; coordination ongoing with existing NGSO operators',
    debrisCompliance: 'Planned compliant - committed to 355-day post-mission disposal (exceeds FCC 25-year rule)',
    description: 'Amazon\'s planned LEO broadband constellation to compete with Starlink. Two prototype satellites (KuiperSat-1 & KuiperSat-2) launched October 2023. Mass production facility operational in Kirkland, WA. FCC requires 50% deployment by mid-2026.',
    launchProvider: 'ULA Vulcan Centaur, Arianespace Ariane 6, Blue Origin New Glenn',
    firstLaunch: 'October 2023 (prototypes)',
    estimatedCompletion: '2028-2029 (full constellation)',
  },
  {
    id: 'iridium-next',
    name: 'Iridium NEXT',
    operator: 'Iridium Communications',
    country: 'United States',
    activeSatellites: 66,
    authorizedSatellites: 75,
    plannedGeneration: 'Gen2 (66 active + 9 on-orbit spares)',
    altitudeKm: '780',
    inclinationDeg: '86.4',
    frequencyBands: 'L/Ka-band',
    serviceType: 'Voice/IoT',
    status: 'operational',
    latencyEstimate: '30-50 ms (voice), <1 sec (SBD)',
    deorbitPlan: 'Active deorbit at EOL; original Iridium constellation deorbited successfully (completed 2019)',
    fccLicense: 'FCC licensed; renewed spectrum rights for L-band operations',
    ituFiling: 'ITU L-band priority rights; Ka-band feeder link filings coordinated globally',
    debrisCompliance: 'Exemplary - successfully deorbited entire Gen1 constellation; Gen2 designed with full deorbit capability',
    description: 'The only satellite constellation providing true pole-to-pole global coverage. NEXT generation replaced original 1990s constellation. Supports voice, data, IoT (via Iridium Certus), and hosts government payloads. Powers Garmin inReach and Apple Emergency SOS.',
    launchProvider: 'SpaceX Falcon 9',
    firstLaunch: 'January 2017 (NEXT series)',
    estimatedCompletion: 'Complete (2019)',
  },
  {
    id: 'o3b-mpower',
    name: 'O3b mPOWER',
    operator: 'SES',
    country: 'Luxembourg',
    activeSatellites: 11,
    authorizedSatellites: 11,
    plannedGeneration: 'mPOWER (11 satellites, expandable)',
    altitudeKm: '8,000 (MEO)',
    inclinationDeg: '0 (equatorial)',
    frequencyBands: 'Ka-band',
    serviceType: 'Broadband',
    status: 'operational',
    latencyEstimate: '100-150 ms',
    deorbitPlan: 'MEO orbit; satellites equipped with propulsion for graveyard orbit disposal at EOL',
    fccLicense: 'FCC licensed for Ka-band NGSO operations; US market access granted',
    ituFiling: 'ITU Ka-band priority filings for MEO equatorial constellation; coordination with GEO operators completed',
    debrisCompliance: 'Compliant - MEO disposal orbit plan approved; inter-agency guidelines met',
    description: 'Next-generation MEO constellation from SES, successor to the original O3b fleet. Each satellite delivers multiple terabits of throughput with fully steerable beams. Serves telcos, cruise lines, energy, and government customers with fiber-like connectivity.',
    launchProvider: 'SpaceX Falcon 9',
    firstLaunch: 'December 2022',
    estimatedCompletion: 'Complete (2024)',
  },
  {
    id: 'telesat-lightspeed',
    name: 'Telesat Lightspeed',
    operator: 'Telesat',
    country: 'Canada',
    activeSatellites: 0,
    authorizedSatellites: 198,
    plannedGeneration: 'Lightspeed (198 satellites)',
    altitudeKm: '1,015-1,325',
    inclinationDeg: '98.98 / 50.88',
    frequencyBands: 'Ka-band',
    serviceType: 'Broadband',
    status: 'development',
    latencyEstimate: '30-50 ms (estimated)',
    deorbitPlan: 'Designed for post-mission disposal within 5 years; electric propulsion for controlled deorbit',
    fccLicense: 'FCC processing application; Canadian ISED license granted; ITAR considerations for US payloads',
    ituFiling: 'ITU Ka-band filings coordinated through Canadian administration; global coverage spectrum secured',
    debrisCompliance: 'Planned compliant - designed to exceed IADC guidelines with active deorbit and collision avoidance',
    description: 'Telesat\'s planned LEO constellation targeting enterprise, government, maritime, and aero markets. MDA selected as prime manufacturer. Constellation optimized for high-throughput, low-latency service with advanced mesh networking between satellites.',
    launchProvider: 'TBD (multiple launch agreements being negotiated)',
    firstLaunch: '2026 (planned)',
    estimatedCompletion: '2028 (planned)',
  },
  {
    id: 'guowang',
    name: 'Guowang (GW)',
    operator: 'China SatNet (China Satellite Network Group)',
    country: 'China',
    activeSatellites: 20,
    authorizedSatellites: 13000,
    plannedGeneration: 'GW Constellation (~13,000 satellites)',
    altitudeKm: '508-1,145',
    inclinationDeg: '30-85 (multiple shells)',
    frequencyBands: 'TBD (Ka/Ku expected)',
    serviceType: 'Broadband',
    status: 'development',
    latencyEstimate: '20-50 ms (estimated)',
    deorbitPlan: 'Details not publicly disclosed; expected to follow CNSA debris mitigation standards',
    fccLicense: 'N/A - Operates under Chinese regulatory framework (MIIT/CNSA)',
    ituFiling: 'Large-scale ITU filings submitted through Chinese administration; spectrum priority under WRC-23 framework',
    debrisCompliance: 'Under development - expected to meet Chinese national space debris standards (aligned with IADC)',
    description: 'China\'s national broadband mega-constellation managed by the state-owned China Satellite Network Group (est. 2021). Aims to provide global broadband coverage as a strategic national infrastructure. Early test satellites launched beginning 2024.',
    launchProvider: 'Long March series (CZ-5B, CZ-8, commercial rockets)',
    firstLaunch: '2024 (test satellites)',
    estimatedCompletion: '2030+ (estimated)',
  },
  {
    id: 'qianfan',
    name: 'Qianfan (G60 Starlink)',
    operator: 'Shanghai Spacecom Satellite Technology (SSST)',
    country: 'China',
    activeSatellites: 60,
    authorizedSatellites: 14000,
    plannedGeneration: 'G60 Constellation (~14,000 planned)',
    altitudeKm: '1,160',
    inclinationDeg: '53',
    frequencyBands: 'TBD (Ku/Ka expected)',
    serviceType: 'Broadband',
    status: 'deploying',
    latencyEstimate: '25-50 ms (estimated)',
    deorbitPlan: 'Details limited; satellites expected to include propulsion for post-mission disposal',
    fccLicense: 'N/A - Operates under Chinese regulatory framework',
    ituFiling: 'ITU filings submitted through Chinese administration; broadband NGSO spectrum claims registered',
    debrisCompliance: 'Under development - details on specific compliance measures not yet publicly available',
    description: 'Shanghai-backed commercial mega-constellation project, sometimes called "China\'s Starlink." Backed by the G60 Science and Technology Innovation Valley initiative. Rapid deployment began in 2024 with batch launches of 18 satellites per mission. Aims to provide global broadband internet.',
    launchProvider: 'Long March 8, Smart Dragon 3, commercial launch vehicles',
    firstLaunch: 'August 2024',
    estimatedCompletion: '2030+ (estimated)',
  },
];

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

function HeroStats() {
  const totalActive = CONSTELLATIONS.reduce((sum, c) => sum + c.activeSatellites, 0);
  const totalAuthorized = CONSTELLATIONS.reduce((sum, c) => sum + c.authorizedSatellites, 0);
  const totalConstellations = CONSTELLATIONS.length;
  // Rough global coverage estimate based on operational + deploying constellations
  const operationalOrDeploying = CONSTELLATIONS.filter(
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

function ComparisonTable() {
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
            {CONSTELLATIONS.map((c) => {
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
        <span>Total active: <span className="text-white font-bold">{formatNumber(CONSTELLATIONS.reduce((s, c) => s + c.activeSatellites, 0))}</span></span>
        <span>Total authorized: <span className="text-white font-bold">{formatNumber(CONSTELLATIONS.reduce((s, c) => s + c.authorizedSatellites, 0))}</span></span>
        <span>Operational: <span className="text-green-400 font-bold">{CONSTELLATIONS.filter(c => c.status === 'operational').length}</span></span>
        <span>Deploying: <span className="text-cyan-400 font-bold">{CONSTELLATIONS.filter(c => c.status === 'deploying').length}</span></span>
        <span>Development/Pre-Launch: <span className="text-amber-400 font-bold">{CONSTELLATIONS.filter(c => c.status === 'development' || c.status === 'pre-launch').length}</span></span>
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

function RegulatoryPanel() {
  return (
    <div className="card p-6">
      <h2 className="text-lg font-bold text-white mb-2">Regulatory & Compliance Overview</h2>
      <p className="text-star-300 text-sm mb-6">
        FCC/ITU licensing status and debris mitigation compliance across tracked constellations
      </p>

      <div className="space-y-4">
        {CONSTELLATIONS.map((c) => {
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

  const filteredConstellations = statusFilter
    ? CONSTELLATIONS.filter((c) => c.status === statusFilter)
    : CONSTELLATIONS;

  const tabs: { id: TabId; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'comparison', label: 'Comparison Table' },
    { id: 'details', label: 'Detailed Profiles' },
    { id: 'regulatory', label: 'Regulatory & Compliance' },
  ];

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4">
        <PageHeader
          title="Constellation Tracker"
          subtitle="Track major satellite constellations -- deployments, orbital parameters, coverage, and regulatory compliance"
          breadcrumbs={[
            { label: 'Home', href: '/' },
            { label: 'Space Operations', href: '/satellites' },
            { label: 'Constellation Tracker' },
          ]}
        />

        {/* Hero Stats */}
        <HeroStats />

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
                  All ({CONSTELLATIONS.length})
                </button>
                {(Object.entries(STATUS_CONFIG) as [ConstellationStatus, typeof STATUS_CONFIG[ConstellationStatus]][]).map(([key, config]) => {
                  const count = CONSTELLATIONS.filter((c) => c.status === key).length;
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
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {filteredConstellations.map((constellation) => (
                <ConstellationCard key={constellation.id} constellation={constellation} />
              ))}
            </div>

            {/* Market Overview */}
            <div className="card p-6">
              <h3 className="text-lg font-bold text-white mb-4">Deployment Race -- Satellites by Operator</h3>
              <div className="space-y-3">
                {[...CONSTELLATIONS]
                  .sort((a, b) => b.activeSatellites - a.activeSatellites)
                  .map((c) => {
                    const maxActive = Math.max(...CONSTELLATIONS.map(x => x.activeSatellites));
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

            {/* Orbit Distribution */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="card p-6">
                <h3 className="text-lg font-bold text-white mb-4">By Orbital Regime</h3>
                <div className="space-y-3">
                  {[
                    { label: 'LEO (< 2,000 km)', constellations: CONSTELLATIONS.filter(c => {
                      const alt = parseInt(c.altitudeKm.replace(/,/g, '').split('-')[0]);
                      return alt < 2000;
                    }), color: 'from-blue-500 to-blue-400' },
                    { label: 'MEO (2,000 - 35,786 km)', constellations: CONSTELLATIONS.filter(c => {
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
                    const matching = CONSTELLATIONS.filter(c => c.serviceType === svc);
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
            <ComparisonTable />
          </div>
        )}

        {/* ──────────────── DETAILED PROFILES TAB ──────────────── */}
        {activeTab === 'details' && (
          <div className="space-y-6">
            {CONSTELLATIONS.map((constellation) => (
              <ConstellationDetail key={constellation.id} constellation={constellation} />
            ))}
          </div>
        )}

        {/* ──────────────── REGULATORY TAB ──────────────── */}
        {activeTab === 'regulatory' && (
          <div className="space-y-6">
            <RegulatoryPanel />
          </div>
        )}

        {/* Bottom spacing */}
        <div className="h-12" />
      </div>
    </div>
  );
}
