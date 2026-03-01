'use client';

import { useState, useEffect, Suspense, useCallback, useMemo } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  InsurancePolicy,
  InsuranceMarketData,
  InsuranceMissionType,
  INSURANCE_MISSION_TYPES,
} from '@/types';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { SkeletonPage } from '@/components/ui/Skeleton';
import PageHeader from '@/components/ui/PageHeader';
import AnimatedPageHeader from '@/components/ui/AnimatedPageHeader';
import { clientLogger } from '@/lib/client-logger';
import ScrollReveal, { StaggerContainer, StaggerItem } from '@/components/ui/ScrollReveal';
import ExportButton from '@/components/ui/ExportButton';

// ────────────────────────────────────────
// Types
// ────────────────────────────────────────

interface InsuranceStats {
  totalPremiums: number;
  avgLossRatio: number;
  activePolicies: number;
  largestClaim: number;
}

interface InsuranceData {
  policies: InsurancePolicy[];
  marketHistory: InsuranceMarketData[];
  stats: InsuranceStats | null;
}

interface CalculatorInputs {
  orbitType: 'LEO' | 'GEO' | 'MEO' | 'deep_space';
  satelliteValue: number;
  launchVehicle: string;
  missionDuration: number;
  isNewDesign: boolean;
  hasHeritage: boolean;
}

interface PremiumBreakdown {
  launchRisk: number;
  inOrbitRisk: number;
  thirdPartyLiability: number;
  totalPremium: number;
  effectiveRate: number;
}

// ────────────────────────────────────────
// Static Data: Premium Rate Benchmarks
// ────────────────────────────────────────

const PREMIUM_RATE_BENCHMARKS: {
  type: string;
  label: string;
  icon: string;
  baseRate: number;
  riskMultiplier: number;
  effectiveRate: number;
  description: string;
}[] = [
  {
    type: 'launch',
    label: 'Launch',
    icon: '🚀',
    baseRate: 8.5,
    riskMultiplier: 1.0,
    effectiveRate: 8.5,
    description: 'Pre-launch through orbit injection. Highest risk window covering ascent, separation, and early operations.',
  },
  {
    type: 'in_orbit',
    label: 'In-Orbit',
    icon: '🛰️',
    baseRate: 5.5,
    riskMultiplier: 0.8,
    effectiveRate: 4.4,
    description: 'Operational phase coverage for on-station satellites including power, propulsion, and payload subsystems.',
  },
  {
    type: 'liability',
    label: 'Liability',
    icon: '⚖️',
    baseRate: 3.0,
    riskMultiplier: 0.6,
    effectiveRate: 1.8,
    description: 'Third-party liability for launch and operations as required by national licensing authorities.',
  },
  {
    type: 'third_party',
    label: 'Third Party',
    icon: '👥',
    baseRate: 2.5,
    riskMultiplier: 0.5,
    effectiveRate: 1.25,
    description: 'Coverage for damage to third-party property or persons from launch debris or re-entry.',
  },
  {
    type: 'ground',
    label: 'Ground Risk',
    icon: '🏗️',
    baseRate: 1.8,
    riskMultiplier: 0.4,
    effectiveRate: 0.72,
    description: 'Pre-launch ground segment coverage including assembly, integration, testing, and transport.',
  },
];

// ────────────────────────────────────────
// Static Data: Orbit Risk Factors
// ────────────────────────────────────────

const ORBIT_RISK_FACTORS: Record<string, { label: string; launchRate: number; inOrbitRate: number; liabilityRate: number; description: string }> = {
  LEO: { label: 'Low Earth Orbit (LEO)', launchRate: 6.5, inOrbitRate: 2.8, liabilityRate: 1.2, description: '200-2,000 km altitude. Higher debris risk but lower launch energy.' },
  MEO: { label: 'Medium Earth Orbit (MEO)', launchRate: 7.5, inOrbitRate: 3.2, liabilityRate: 1.5, description: '2,000-35,786 km. Navigation constellations (GPS, Galileo).' },
  GEO: { label: 'Geostationary Orbit (GEO)', launchRate: 9.0, inOrbitRate: 4.5, liabilityRate: 2.0, description: '35,786 km altitude. Higher launch risk, longer mission life.' },
  deep_space: { label: 'Deep Space / Lunar', launchRate: 14.0, inOrbitRate: 8.0, liabilityRate: 3.5, description: 'Beyond GEO. Highest risk profile, limited heritage data.' },
};

// ────────────────────────────────────────
// Static Data: Launch Vehicle Reliability
// ────────────────────────────────────────

const LAUNCH_VEHICLES: { name: string; reliability: number; riskMultiplier: number; flights: number }[] = [
  { name: 'Falcon 9 (SpaceX)', reliability: 99.3, riskMultiplier: 0.85, flights: 350 },
  { name: 'Falcon Heavy (SpaceX)', reliability: 100, riskMultiplier: 0.90, flights: 12 },
  { name: 'Ariane 6 (Arianespace)', reliability: 95.0, riskMultiplier: 1.10, flights: 8 },
  { name: 'Atlas V (ULA)', reliability: 100, riskMultiplier: 0.80, flights: 101 },
  { name: 'Vulcan Centaur (ULA)', reliability: 100, riskMultiplier: 1.05, flights: 4 },
  { name: 'Electron (Rocket Lab)', reliability: 96.0, riskMultiplier: 0.95, flights: 55 },
  { name: 'Neutron (Rocket Lab)', reliability: 95.0, riskMultiplier: 1.15, flights: 2 },
  { name: 'H3 (JAXA/MHI)', reliability: 90.0, riskMultiplier: 1.10, flights: 5 },
  { name: 'Long March 5 (CASC)', reliability: 92.0, riskMultiplier: 1.05, flights: 15 },
  { name: 'PSLV (ISRO)', reliability: 96.2, riskMultiplier: 0.95, flights: 62 },
  { name: 'New Glenn (Blue Origin)', reliability: 90.0, riskMultiplier: 1.20, flights: 1 },
  { name: 'Starship (SpaceX)', reliability: 85.0, riskMultiplier: 1.35, flights: 7 },
  { name: 'Other / Unspecified', reliability: 90.0, riskMultiplier: 1.25, flights: 0 },
];

// ────────────────────────────────────────
// Static Data: Top Insurers
// ────────────────────────────────────────

const TOP_INSURERS: { name: string; marketShare: number; specialty: string; hq: string; notableClients: string; estPremiumCapacity: string }[] = [
  { name: 'AXA XL', marketShare: 22, specialty: 'Full-spectrum launch & in-orbit', hq: 'London, UK', notableClients: 'SES, Eutelsat, Arianespace', estPremiumCapacity: '$120M' },
  { name: 'Global Aerospace', marketShare: 15, specialty: 'Aviation & space combined', hq: 'London, UK', notableClients: 'Intelsat, Viasat', estPremiumCapacity: '$85M' },
  { name: 'SCOR', marketShare: 12, specialty: 'Reinsurance & large risks', hq: 'Paris, France', notableClients: 'Thales Alenia, Airbus DS', estPremiumCapacity: '$70M' },
  { name: 'Hiscox', marketShare: 10, specialty: 'Specialty launch coverage', hq: 'London, UK', notableClients: 'Rocket Lab, Planet Labs', estPremiumCapacity: '$55M' },
  { name: 'Sompo International', marketShare: 9, specialty: 'Japanese & Asian operators', hq: 'Tokyo, Japan', notableClients: 'JAXA, SKY Perfect JSAT', estPremiumCapacity: '$50M' },
  { name: 'Allianz', marketShare: 8, specialty: 'European commercial operators', hq: 'Munich, Germany', notableClients: 'OHB, SSTL, Telesat', estPremiumCapacity: '$45M' },
  { name: "Lloyd's Syndicates", marketShare: 14, specialty: 'Syndicated underwriting', hq: 'London, UK', notableClients: 'Various (consortium model)', estPremiumCapacity: '$95M' },
  { name: 'Other Markets', marketShare: 10, specialty: 'Regional & emerging', hq: 'Various', notableClients: 'Smaller operators', estPremiumCapacity: '$40M' },
];

// ────────────────────────────────────────
// Static Data: Historical Notable Claims
// ────────────────────────────────────────

const NOTABLE_CLAIMS: { year: number; mission: string; operator: string; insuredValue: number; claimAmount: number; cause: string; outcome: string }[] = [
  { year: 2016, mission: 'Amos-6', operator: 'Spacecom', insuredValue: 285, claimAmount: 285, cause: 'Pre-launch explosion on pad during fueling (Falcon 9 COPV failure)', outcome: 'Total loss. Largest space insurance claim at the time. Led to rate hardening.' },
  { year: 2019, mission: 'Arabsat-6A (Falcon Heavy)', operator: 'Arabsat', insuredValue: 350, claimAmount: 0, cause: 'Core booster lost during landing (no payload damage)', outcome: 'No claim filed -- satellite deployed successfully. Highlighted booster vs payload risk.' },
  { year: 2018, mission: 'Intelsat 29e', operator: 'Intelsat', insuredValue: 408, claimAmount: 390, cause: 'Propellant leak led to loss of attitude control after 3 years in orbit', outcome: 'Partial claim settled. In-orbit anomaly triggered extended coverage review.' },
  { year: 2019, mission: 'Beresheet', operator: 'SpaceIL', insuredValue: 100, claimAmount: 95, cause: 'IMU failure during lunar landing attempt', outcome: 'Total loss. First privately funded lunar mission. Unique deep-space risk profile.' },
  { year: 2020, mission: 'Vega VV16', operator: 'Arianespace', insuredValue: 175, claimAmount: 175, cause: 'Upper stage failure 8 minutes after launch (cable integration error)', outcome: 'Total loss of 2 payloads. Arianespace paused Vega launches for investigation.' },
  { year: 2022, mission: 'Intelsat 33e', operator: 'Intelsat', insuredValue: 425, claimAmount: 400, cause: 'Progressive power subsystem degradation', outcome: 'Constructive total loss declared. Largest single satellite claim in recent years.' },
  { year: 2023, mission: 'ViaSat-3 Americas', operator: 'Viasat', insuredValue: 740, claimAmount: 420, cause: 'Antenna reflector deployment anomaly -- partial capacity loss', outcome: 'Partial loss claim. Satellite operational at reduced capacity (~70%).' },
  { year: 2017, mission: 'Telkom-3S', operator: 'Telkom Indonesia', insuredValue: 220, claimAmount: 0, cause: 'Solar array deployment delay resolved in orbit', outcome: 'No claim filed. Arrays deployed after troubleshooting. Underwriters relieved.' },
];

// ────────────────────────────────────────
// Static Data: Premium Trend (10 years)
// ────────────────────────────────────────

const PREMIUM_TREND_DATA: { year: number; avgLaunchRate: number; avgInOrbitRate: number; avgLiabilityRate: number; marketSize: number; lossRatio: number }[] = [
  { year: 2015, avgLaunchRate: 12.5, avgInOrbitRate: 5.8, avgLiabilityRate: 2.8, marketSize: 620, lossRatio: 45 },
  { year: 2016, avgLaunchRate: 11.0, avgInOrbitRate: 5.2, avgLiabilityRate: 2.5, marketSize: 580, lossRatio: 125 },
  { year: 2017, avgLaunchRate: 9.5, avgInOrbitRate: 4.8, avgLiabilityRate: 2.2, marketSize: 530, lossRatio: 55 },
  { year: 2018, avgLaunchRate: 8.0, avgInOrbitRate: 4.2, avgLiabilityRate: 2.0, marketSize: 475, lossRatio: 88 },
  { year: 2019, avgLaunchRate: 7.0, avgInOrbitRate: 3.8, avgLiabilityRate: 1.8, marketSize: 440, lossRatio: 72 },
  { year: 2020, avgLaunchRate: 6.5, avgInOrbitRate: 3.5, avgLiabilityRate: 1.6, marketSize: 410, lossRatio: 95 },
  { year: 2021, avgLaunchRate: 7.5, avgInOrbitRate: 3.8, avgLiabilityRate: 1.8, marketSize: 430, lossRatio: 62 },
  { year: 2022, avgLaunchRate: 8.5, avgInOrbitRate: 4.2, avgLiabilityRate: 2.0, marketSize: 480, lossRatio: 110 },
  { year: 2023, avgLaunchRate: 9.0, avgInOrbitRate: 4.5, avgLiabilityRate: 2.2, marketSize: 510, lossRatio: 78 },
  { year: 2024, avgLaunchRate: 8.5, avgInOrbitRate: 4.3, avgLiabilityRate: 2.1, marketSize: 520, lossRatio: 65 },
  { year: 2025, avgLaunchRate: 8.2, avgInOrbitRate: 4.1, avgLiabilityRate: 2.0, marketSize: 540, lossRatio: 58 },
];

// ────────────────────────────────────────
// Static Data: Insurance Types
// ────────────────────────────────────────

const INSURANCE_TYPES: { id: string; name: string; icon: string; phase: string; typicalRate: string; description: string; covers: string[]; exclusions: string[] }[] = [
  {
    id: 'pre_launch',
    name: 'Pre-Launch Insurance',
    icon: '🏗️',
    phase: 'Manufacturing through launch pad',
    typicalRate: '0.5-2.0%',
    description: 'Covers the satellite and launch vehicle during manufacturing, transport to launch site, integration, testing, and fueling operations.',
    covers: ['Transport damage during shipping', 'Integration & testing failures', 'Storage and handling accidents', 'Fueling incidents on the pad', 'Weather-related damage at launch site'],
    exclusions: ['Design defects known prior to binding', 'War, terrorism, government confiscation', 'Nuclear contamination'],
  },
  {
    id: 'launch',
    name: 'Launch Insurance',
    icon: '🚀',
    phase: 'Ignition through orbit insertion',
    typicalRate: '5-15%',
    description: 'The highest-risk phase. Covers from intentional ignition of the launch vehicle through separation, orbit injection, and early on-orbit commissioning (typically 180 days).',
    covers: ['Launch vehicle failure or explosion', 'Satellite separation anomaly', 'Failed orbit insertion', 'Early on-orbit commissioning failures', 'Partial deployment of solar arrays or antennas'],
    exclusions: ['Intentional deorbiting', 'Gradual degradation after commissioning', 'Cyber attacks (usually separate policy)'],
  },
  {
    id: 'in_orbit',
    name: 'In-Orbit Insurance',
    icon: '🛰️',
    phase: 'Post-commissioning operational life',
    typicalRate: '2-6% per annum',
    description: 'Covers the satellite during its operational lifetime after successful commissioning. Usually renewed annually with rates adjusted based on satellite health telemetry.',
    covers: ['Power subsystem failures', 'Propulsion anomalies', 'Debris collision damage', 'Solar storm or radiation damage', 'Transponder or payload failures', 'Station-keeping fuel depletion'],
    exclusions: ['Normal end-of-life degradation', 'Intentional maneuvers resulting in loss', 'Capacity reduction below contractual threshold (varies)'],
  },
  {
    id: 'third_party',
    name: 'Third-Party Liability',
    icon: '⚖️',
    phase: 'Launch and operations',
    typicalRate: '0.5-3.0%',
    description: 'Covers legal liability for damage caused to third parties on the ground, in the air, or in space. Required by most national licensing authorities before launch approval.',
    covers: ['Ground damage from debris or failed launch', 'Damage to other spacecraft in orbit', 'Environmental contamination', 'Injury or death of third parties', 'Property damage claims'],
    exclusions: ['Damage to own property or employees', 'Contractual liability to launch provider', 'Punitive or exemplary damages (in some jurisdictions)'],
  },
  {
    id: 'government',
    name: 'Government & Treaty Liability',
    icon: '🏛️',
    phase: 'All phases -- state obligation',
    typicalRate: 'Government-backed / varies',
    description: 'Under the 1972 Liability Convention (and 1967 Outer Space Treaty), the launching state bears international liability for damage caused by space objects. Governments may require operators to indemnify the state.',
    covers: ['State liability under UN treaties', 'Cross-waiver of liability arrangements', 'Maximum Probable Loss (MPL) government indemnification', 'International claims between states'],
    exclusions: ['Varies by national space law', 'Some nations cap private operator liability (e.g., US at $500M MPL)', 'Government self-insurance above cap'],
  },
];

// ────────────────────────────────────────
// Static Data: Key Statistics
// ────────────────────────────────────────

const KEY_STATISTICS: { label: string; value: string; detail: string; trend?: 'up' | 'down' | 'stable' }[] = [
  { label: 'Global Annual Premium', value: '~$540M', detail: '2025 estimated total space insurance premium volume', trend: 'up' },
  { label: 'Market Capacity', value: '$2.8B', detail: 'Total underwriting capacity available for space risks', trend: 'up' },
  { label: 'LEO Avg Launch Rate', value: '6.5%', detail: 'Average launch insurance rate for LEO missions', trend: 'down' },
  { label: 'GEO Avg Launch Rate', value: '9.0%', detail: 'Average launch insurance rate for GEO missions', trend: 'stable' },
  { label: 'In-Orbit Avg Rate', value: '4.1%', detail: 'Average annual in-orbit premium rate', trend: 'stable' },
  { label: 'Claims Frequency', value: '~8%', detail: 'Percentage of policies that result in a claim filing', trend: 'down' },
  { label: '10-Year Avg Loss Ratio', value: '75%', detail: 'Average ratio of claims paid to premiums collected (2015-2025)', trend: 'stable' },
  { label: 'Active Underwriters', value: '~40', detail: 'Number of active space insurance underwriting entities globally', trend: 'up' },
];

// ────────────────────────────────────────
// Calculator Logic
// ────────────────────────────────────────

function calculatePremium(inputs: CalculatorInputs): PremiumBreakdown {
  const orbit = ORBIT_RISK_FACTORS[inputs.orbitType];
  const vehicle = LAUNCH_VEHICLES.find((v) => v.name === inputs.launchVehicle) || LAUNCH_VEHICLES[LAUNCH_VEHICLES.length - 1];

  // Base rates from orbit type
  let launchRate = orbit.launchRate;
  let inOrbitRate = orbit.inOrbitRate;
  const liabilityRate = orbit.liabilityRate;

  // Adjust for vehicle reliability
  launchRate *= vehicle.riskMultiplier;

  // Adjust for mission duration (longer = more in-orbit risk)
  if (inputs.missionDuration > 15) {
    inOrbitRate *= 1.3;
  } else if (inputs.missionDuration > 10) {
    inOrbitRate *= 1.15;
  } else if (inputs.missionDuration < 3) {
    inOrbitRate *= 0.8;
  }

  // Adjust for new design vs heritage
  if (inputs.isNewDesign) {
    launchRate *= 1.25;
    inOrbitRate *= 1.20;
  }
  if (inputs.hasHeritage) {
    launchRate *= 0.90;
    inOrbitRate *= 0.85;
  }

  // Value-based discount for very large policies (> $500M)
  let valueDiscount = 1.0;
  if (inputs.satelliteValue > 500) {
    valueDiscount = 0.92;
  } else if (inputs.satelliteValue > 200) {
    valueDiscount = 0.96;
  }

  launchRate *= valueDiscount;
  inOrbitRate *= valueDiscount;

  const launchRisk = inputs.satelliteValue * (launchRate / 100);
  const inOrbitRisk = inputs.satelliteValue * (inOrbitRate / 100) * Math.min(inputs.missionDuration, 1);
  const thirdPartyLiability = inputs.satelliteValue * (liabilityRate / 100);
  const totalPremium = launchRisk + inOrbitRisk + thirdPartyLiability;
  const effectiveRate = (totalPremium / inputs.satelliteValue) * 100;

  return { launchRisk, inOrbitRisk, thirdPartyLiability, totalPremium, effectiveRate };
}

// Insurer comparison estimates (add variance around base calculation)
function getInsurerEstimates(basePremium: PremiumBreakdown, satelliteValue: number): { insurer: string; premium: number; rate: number; notes: string }[] {
  return [
    { insurer: 'AXA XL', premium: basePremium.totalPremium * 0.95, rate: (basePremium.totalPremium * 0.95 / satelliteValue) * 100, notes: 'Competitive on GEO; strong claims track record' },
    { insurer: 'Global Aerospace', premium: basePremium.totalPremium * 1.02, rate: (basePremium.totalPremium * 1.02 / satelliteValue) * 100, notes: 'Broad coverage terms; faster claims processing' },
    { insurer: 'SCOR', premium: basePremium.totalPremium * 0.98, rate: (basePremium.totalPremium * 0.98 / satelliteValue) * 100, notes: 'Strong reinsurance backing; good for large risks' },
    { insurer: 'Hiscox', premium: basePremium.totalPremium * 1.05, rate: (basePremium.totalPremium * 1.05 / satelliteValue) * 100, notes: 'Specialty new-space focus; flexible terms' },
    { insurer: 'Sompo International', premium: basePremium.totalPremium * 1.00, rate: (basePremium.totalPremium * 1.00 / satelliteValue) * 100, notes: 'Competitive for Asian market operators' },
    { insurer: "Lloyd's Syndicate", premium: basePremium.totalPremium * 0.97, rate: (basePremium.totalPremium * 0.97 / satelliteValue) * 100, notes: 'Consortium model; can handle very large risks' },
  ];
}

// ── Export column definitions ──

const POLICY_EXPORT_COLUMNS = [
  { key: 'missionName', label: 'Mission Name' },
  { key: 'insurer', label: 'Insurer' },
  { key: 'missionType', label: 'Mission Type' },
  { key: 'status', label: 'Status' },
  { key: 'premiumAmount', label: 'Premium Amount' },
  { key: 'premiumRate', label: 'Premium Rate' },
  { key: 'coverageType', label: 'Coverage Type' },
  { key: 'insuredValue', label: 'Insured Value' },
  { key: 'maxPayout', label: 'Max Payout' },
  { key: 'deductible', label: 'Deductible' },
  { key: 'operator', label: 'Operator' },
  { key: 'launchVehicle', label: 'Launch Vehicle' },
  { key: 'claimFiled', label: 'Claim Filed' },
  { key: 'claimAmount', label: 'Claim Amount' },
  { key: 'claimPaid', label: 'Claim Paid Amount' },
  { key: 'claimReason', label: 'Claim Reason' },
];

const MARKET_EXPORT_COLUMNS = [
  { key: 'year', label: 'Year' },
  { key: 'totalPremiums', label: 'Total Premiums' },
  { key: 'totalClaims', label: 'Total Claims' },
  { key: 'lossRatio', label: 'Loss Ratio' },
  { key: 'marketCapacity', label: 'Market Capacity' },
  { key: 'numberOfPolicies', label: 'Active Policies' },
  { key: 'avgPremiumRate', label: 'Avg Premium Rate' },
  { key: 'largestClaim', label: 'Largest Claim' },
];

// ── Known operators for cross-module linking ──

const KNOWN_OPERATORS = [
  'SpaceX', 'Arianespace', 'ULA', 'Rocket Lab', 'Blue Origin',
  'OneWeb', 'SES', 'Intelsat', 'Telesat', 'Viasat', 'Eutelsat',
  'Iridium', 'Hughes', 'Amazon', 'Boeing', 'Northrop Grumman',
  'L3Harris', 'Maxar', 'Planet Labs', 'BlackSky', 'Spire',
];

// ────────────────────────────────────────
// Helpers
// ────────────────────────────────────────

function formatCurrency(value: number): string {
  if (value >= 1000) return `$${(value / 1000).toFixed(1)}B`;
  return `$${value.toFixed(1)}M`;
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'active':
      return 'bg-green-500/20 text-green-400 border border-green-500/30';
    case 'expired':
      return 'bg-star-500/20 text-slate-400 border border-star-500/30';
    case 'claimed':
      return 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30';
    case 'settled':
      return 'bg-blue-500/20 text-blue-400 border border-blue-500/30';
    default:
      return 'bg-slate-700/50 text-slate-500';
  }
}

function getLossRatioColor(ratio: number): string {
  if (ratio > 100) return 'text-red-400';
  if (ratio > 70) return 'text-yellow-400';
  return 'text-green-400';
}

function getMissionTypeInfo(missionType: string) {
  return INSURANCE_MISSION_TYPES.find((t) => t.value === missionType);
}

function isKnownOperator(operator: string | null): boolean {
  if (!operator) return false;
  return KNOWN_OPERATORS.some(
    (known) => operator.toLowerCase().includes(known.toLowerCase())
  );
}

// ────────────────────────────────────────
// Market Year Card
// ────────────────────────────────────────

function MarketYearCard({
  year,
  maxPremium,
}: {
  year: InsuranceMarketData;
  maxPremium: number;
}) {
  const premiumWidth = maxPremium > 0 ? (year.totalPremiums / maxPremium) * 100 : 0;
  const claimsWidth = maxPremium > 0 ? (year.totalClaims / maxPremium) * 100 : 0;

  return (
    <div className="card p-5">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h4 className="text-xl font-display font-bold text-white">{year.year}</h4>
          <span className="text-slate-400 text-xs">Fiscal Year</span>
        </div>
        <div className="text-right">
          <span
            className={`text-lg font-bold ${getLossRatioColor(year.lossRatio)}`}
          >
            {year.lossRatio.toFixed(1)}%
          </span>
          <span className="text-slate-400 text-xs block">Loss Ratio</span>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
        <div>
          <span className="text-slate-400 text-xs block">Total Premiums</span>
          <span className="text-nebula-300 font-bold text-sm">
            {formatCurrency(year.totalPremiums)}
          </span>
        </div>
        <div>
          <span className="text-slate-400 text-xs block">Market Capacity</span>
          <span className="text-white font-bold text-sm">
            ${year.marketCapacity.toFixed(1)}B
          </span>
        </div>
        <div>
          <span className="text-slate-400 text-xs block">Active Policies</span>
          <span className="text-white font-bold text-sm">
            {year.numberOfPolicies}
          </span>
        </div>
        <div>
          <span className="text-slate-400 text-xs block">Avg Rate</span>
          <span className="text-white font-bold text-sm">
            {year.avgPremiumRate.toFixed(1)}%
          </span>
        </div>
      </div>

      {/* Premium vs Claims bars */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 w-16">Premiums</span>
          <div className="flex-1 h-3 bg-slate-700/50 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-nebula-500 to-nebula-400 rounded-full transition-all"
              style={{ width: `${Math.min(premiumWidth, 100)}%` }}
            />
          </div>
          <span className="text-xs text-nebula-300 w-16 text-right font-mono">
            {formatCurrency(year.totalPremiums)}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 w-16">Claims</span>
          <div className="flex-1 h-3 bg-slate-700/50 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-red-500 to-red-400 rounded-full transition-all"
              style={{ width: `${Math.min(claimsWidth, 100)}%` }}
            />
          </div>
          <span className="text-xs text-red-400 w-16 text-right font-mono">
            {formatCurrency(year.totalClaims)}
          </span>
        </div>
      </div>

      {/* Premium breakdown */}
      <div className="flex flex-wrap gap-3 mt-4 pt-3 border-t border-slate-700/50 text-xs">
        {year.launchPremiums !== null && (
          <span className="text-slate-400">
            Launch: <span className="text-slate-400 font-medium">{formatCurrency(year.launchPremiums)}</span>
          </span>
        )}
        {year.inOrbitPremiums !== null && (
          <span className="text-slate-400">
            In-Orbit: <span className="text-slate-400 font-medium">{formatCurrency(year.inOrbitPremiums)}</span>
          </span>
        )}
        {year.liabilityPremiums !== null && (
          <span className="text-slate-400">
            Liability: <span className="text-slate-400 font-medium">{formatCurrency(year.liabilityPremiums)}</span>
          </span>
        )}
        {year.largestClaim !== null && (
          <span className="text-slate-400">
            Largest Claim: <span className="text-red-400 font-medium">{formatCurrency(year.largestClaim)}</span>
          </span>
        )}
      </div>
    </div>
  );
}

// ────────────────────────────────────────
// Policy Card
// ────────────────────────────────────────

function PolicyCard({ policy }: { policy: InsurancePolicy }) {
  const missionInfo = getMissionTypeInfo(policy.missionType);

  return (
    <div className="card p-5">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">{missionInfo?.icon || '🛡️'}</span>
            <h4 className="font-semibold text-white text-sm truncate">
              {policy.missionName || 'Unnamed Policy'}
            </h4>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="px-2 py-0.5 rounded bg-slate-700/50 text-slate-300">
              {missionInfo?.label || policy.missionType}
            </span>
            <span className="text-slate-400">{policy.insurer}</span>
            <span
              className={`text-xs px-2 py-0.5 rounded ${getStatusColor(policy.status)}`}
            >
              {policy.status}
            </span>
          </div>
        </div>
        <div className="text-right flex-shrink-0 ml-3">
          <div className="text-white font-bold text-sm">
            {formatCurrency(policy.insuredValue)}
          </div>
          <div className="text-slate-400 text-xs">Insured Value</div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div>
          <span className="text-slate-400 block">Premium</span>
          <span className="text-nebula-300 font-bold">
            {formatCurrency(policy.premiumAmount)}
          </span>
        </div>
        <div>
          <span className="text-slate-400 block">Rate</span>
          <span className="text-white font-medium font-mono">
            {policy.premiumRate.toFixed(2)}%
          </span>
        </div>
        <div>
          <span className="text-slate-400 block">Coverage</span>
          <span className="text-white font-medium capitalize">
            {policy.coverageType}
          </span>
        </div>
        <div>
          <span className="text-slate-400 block">Year</span>
          <span className="text-white font-medium">{policy.yearWritten}</span>
        </div>
      </div>

      {/* Additional details + cross-module links */}
      <div className="flex flex-wrap gap-4 mt-3 pt-3 border-t border-slate-700/50 text-xs text-slate-400">
        {policy.operator && (
          <span>
            Operator:{' '}
            {isKnownOperator(policy.operator) ? (
              <Link
                href={`/market-intel?search=${encodeURIComponent(policy.operator)}`}
                className="text-nebula-300 hover:text-nebula-200 underline underline-offset-2 font-medium transition-colors"
              >
                {policy.operator}
              </Link>
            ) : (
              <span className="text-slate-400 font-medium">{policy.operator}</span>
            )}
          </span>
        )}
        {policy.launchVehicle && (
          <span>
            Vehicle:{' '}
            <Link
              href="/resource-exchange"
              className="text-nebula-300 hover:text-nebula-200 underline underline-offset-2 font-medium transition-colors"
              aria-label="View launch providers in Resource Exchange"
            >
              {policy.launchVehicle}
            </Link>
          </span>
        )}
        {policy.deductible !== null && (
          <span>
            Deductible: <span className="text-slate-400 font-medium">{formatCurrency(policy.deductible)}</span>
          </span>
        )}
        {policy.maxPayout !== null && (
          <span>
            Max Payout: <span className="text-slate-400 font-medium">{formatCurrency(policy.maxPayout)}</span>
          </span>
        )}
      </div>

      {/* Claim info if filed */}
      {policy.claimFiled && (
        <div className="mt-3 p-3 bg-red-900/10 border border-red-500/20 rounded-lg">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold text-red-400">Claim Filed</span>
            {policy.claimPaid !== null && (
              <span className="text-xs text-blue-400">
                Paid: {formatCurrency(policy.claimPaid)}
              </span>
            )}
            {policy.claimAmount !== null && (
              <span className="text-xs text-slate-400">
                (of {formatCurrency(policy.claimAmount)} claimed)
              </span>
            )}
          </div>
          {policy.claimReason && (
            <p className="text-slate-400 text-xs leading-relaxed">{policy.claimReason}</p>
          )}
        </div>
      )}
    </div>
  );
}

// ────────────────────────────────────────
// Inner Content (uses useSearchParams)
// ────────────────────────────────────────

function InsuranceContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  type TabId = 'market' | 'policies' | 'calculator' | 'types' | 'statistics';
  const validTabs: TabId[] = ['market', 'policies', 'calculator', 'types', 'statistics'];

  // Read initial values from URL
  const initialTab = (searchParams.get('tab') as TabId) || 'market';
  const initialType = (searchParams.get('type') as InsuranceMissionType | '') || '';

  const [data, setData] = useState<InsuranceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [initializing, setInitializing] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>(
    validTabs.includes(initialTab) ? initialTab : 'market'
  );
  const [policyTypeFilter, setPolicyTypeFilter] = useState<InsuranceMissionType | ''>(
    ['launch', 'in_orbit', 'liability', 'third_party', 'ground', ''].includes(initialType) ? initialType : ''
  );

  // Calculator state
  const [calcInputs, setCalcInputs] = useState<CalculatorInputs>({
    orbitType: 'GEO',
    satelliteValue: 200,
    launchVehicle: LAUNCH_VEHICLES[0].name,
    missionDuration: 15,
    isNewDesign: false,
    hasHeritage: true,
  });
  const [showInsurerComparison, setShowInsurerComparison] = useState(false);
  const [expandedInsuranceType, setExpandedInsuranceType] = useState<string | null>(null);

  const calcResult = useMemo(() => calculatePremium(calcInputs), [calcInputs]);
  const insurerEstimates = useMemo(
    () => getInsurerEstimates(calcResult, calcInputs.satelliteValue),
    [calcResult, calcInputs.satelliteValue]
  );

  // ── URL sync helper ──

  const updateUrl = useCallback(
    (params: Record<string, string>) => {
      const newParams = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(params)) {
        if (!value || (key === 'tab' && value === 'market') || (key === 'type' && value === '')) {
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
    (tab: TabId) => {
      setActiveTab(tab);
      updateUrl({ tab, type: tab === 'policies' ? policyTypeFilter : '' });
    },
    [updateUrl, policyTypeFilter]
  );

  const handleTypeFilterChange = useCallback(
    (type: InsuranceMissionType | '') => {
      setPolicyTypeFilter(type);
      updateUrl({ type });
    },
    [updateUrl]
  );

  // ── Data fetching ──

  const fetchData = async () => {
    setError(null);
    try {
      const res = await fetch('/api/space-insurance?limit=50');
      const result = await res.json();

      if (!result.error) {
        setData({
          policies: result.policies || [],
          marketHistory: result.marketHistory || [],
          stats: result.stats || null,
        });
      }
    } catch (error) {
      clientLogger.error('Failed to fetch space insurance data', { error: error instanceof Error ? error.message : String(error) });
      setError('Failed to load data.');
    } finally {
      setLoading(false);
    }
  };

  const handleInitialize = async () => {
    setInitializing(true);
    try {
      await fetch('/api/space-insurance/init', { method: 'POST' });
      setLoading(true);
      await fetchData();
    } catch (error) {
      clientLogger.error('Failed to initialize space insurance data', { error: error instanceof Error ? error.message : String(error) });
    } finally {
      setInitializing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // ── Derived values ──

  const policies = data?.policies || [];
  const marketHistory = data?.marketHistory || [];
  const stats = data?.stats;
  const needsInit = !loading && (!stats || (stats.totalPremiums === 0 && stats.activePolicies === 0));

  // Filtered policies
  const filteredPolicies = policyTypeFilter
    ? policies.filter((p) => p.missionType === policyTypeFilter)
    : policies;

  // Policy aggregate stats
  const totalCoverage = filteredPolicies.reduce((sum, p) => sum + p.insuredValue, 0);
  const totalPremiumAmount = filteredPolicies.reduce((sum, p) => sum + p.premiumAmount, 0);

  // Market history max premium for bar widths
  const maxPremium = Math.max(...marketHistory.map((y) => y.totalPremiums), 1);

  // Latest year data for summary banner
  const latestYear = marketHistory.length > 0 ? marketHistory[marketHistory.length - 1] : null;

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4">
        <AnimatedPageHeader
          title="Space Insurance & Risk Assessment"
          subtitle="Comprehensive view of the space insurance market, active policies, and premium rate benchmarks"
          icon="🛡️"
          accentColor="amber"
        />

        {error && (
          <div className="card p-5 border border-red-500/20 bg-red-500/5 text-center mb-6">
            <div className="text-red-400 text-sm font-medium">{error}</div>
          </div>
        )}

        {loading ? (
          <SkeletonPage statCards={4} contentCards={3} />
        ) : needsInit ? (
          <div className="card p-12 text-center">
            <span className="text-6xl block mb-4">🛡️</span>
            <h2 className="text-2xl font-semibold text-white mb-2">
              No Insurance Data Available
            </h2>
            <p className="text-slate-400 mb-6 max-w-lg mx-auto">
              Load space insurance market data including historical premiums, active
              policies, and premium rate benchmarks.
            </p>
            <button
              onClick={handleInitialize}
              disabled={initializing}
              className="btn-primary py-3 px-8"
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
        ) : (
          <>
            {/* ──────────── Quick Stats ──────────── */}
            <ScrollReveal><div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <div className="card-elevated p-4 text-center">
                <div className="text-2xl font-bold font-display text-nebula-300">
                  {stats ? formatCurrency(stats.totalPremiums) : '--'}
                </div>
                <div className="text-slate-400 text-xs uppercase tracking-widest font-medium">
                  Total Market Size
                </div>
              </div>
              <div className="card-elevated p-4 text-center">
                <div
                  className={`text-2xl font-bold font-display ${
                    stats ? getLossRatioColor(stats.avgLossRatio) : 'text-white'
                  }`}
                >
                  {stats ? `${stats.avgLossRatio.toFixed(1)}%` : '--'}
                </div>
                <div className="text-slate-400 text-xs uppercase tracking-widest font-medium">
                  Avg Loss Ratio
                </div>
              </div>
              <div className="card-elevated p-4 text-center">
                <div className="text-2xl font-bold font-display text-green-400">
                  {stats?.activePolicies ?? '--'}
                </div>
                <div className="text-slate-400 text-xs uppercase tracking-widest font-medium">
                  Active Policies
                </div>
              </div>
              <div className="card-elevated p-4 text-center">
                <div className="text-2xl font-bold font-display text-white">
                  {policies.length > 0
                    ? formatCurrency(
                        policies.reduce((sum, p) => sum + p.insuredValue, 0)
                      )
                    : '--'}
                </div>
                <div className="text-slate-400 text-xs uppercase tracking-widest font-medium">
                  Total Coverage
                </div>
              </div>
            </div></ScrollReveal>

            {/* ──────────── Tab Navigation ──────────── */}
            <ScrollReveal delay={0.1}><div className="flex gap-2 mb-6 overflow-x-auto pb-1">
              {[
                { id: 'market' as const, label: 'Market Overview', count: marketHistory.length },
                { id: 'policies' as const, label: 'Active Policies', count: policies.length },
                { id: 'calculator' as const, label: 'Premium Calculator' },
                { id: 'types' as const, label: 'Insurance Types' },
                { id: 'statistics' as const, label: 'Key Statistics' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'bg-nebula-500 text-white shadow-glow-sm'
                      : 'bg-slate-700/50 text-slate-500 hover:bg-slate-700/50'
                  }`}
                >
                  {tab.label}
                  {tab.count !== undefined && tab.count > 0 && (
                    <span
                      className={`text-xs px-1.5 py-0.5 rounded-full ${
                        activeTab === tab.id
                          ? 'bg-white/20 text-white'
                          : 'bg-slate-700/50 text-slate-500'
                      }`}
                    >
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </div></ScrollReveal>

            {/* ──────────── MARKET OVERVIEW TAB ──────────── */}
            {activeTab === 'market' && (
              <div className="space-y-6">
                {/* Latest Year Summary Banner */}
                {latestYear && (
                  <div className="card-elevated p-6 border border-nebula-500/20">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">📊</span>
                        <div>
                          <h3 className="text-lg font-semibold text-white">
                            {latestYear.year} Market Summary
                          </h3>
                          <p className="text-slate-400 text-sm">
                            Latest fiscal year performance snapshot
                          </p>
                        </div>
                      </div>
                      <ExportButton
                        data={marketHistory}
                        filename="space-insurance-market-history"
                        columns={MARKET_EXPORT_COLUMNS}
                        label="Export Market Data"
                      />
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                      <div>
                        <span className="text-slate-400 text-xs block mb-1">Total Premiums</span>
                        <span className="text-nebula-300 font-bold text-lg">
                          {formatCurrency(latestYear.totalPremiums)}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 text-xs block mb-1">Total Claims</span>
                        <span className="text-red-400 font-bold text-lg">
                          {formatCurrency(latestYear.totalClaims)}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 text-xs block mb-1">Loss Ratio</span>
                        <span
                          className={`font-bold text-lg ${getLossRatioColor(latestYear.lossRatio)}`}
                        >
                          {latestYear.lossRatio.toFixed(1)}%
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 text-xs block mb-1">Capacity</span>
                        <span className="text-white font-bold text-lg">
                          ${latestYear.marketCapacity.toFixed(1)}B
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 text-xs block mb-1">Policies</span>
                        <span className="text-white font-bold text-lg">
                          {latestYear.numberOfPolicies}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 text-xs block mb-1">Avg Rate</span>
                        <span className="text-white font-bold text-lg">
                          {latestYear.avgPremiumRate.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Year-by-Year Cards */}
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <span>📈</span> Annual Market History
                  </h3>
                  <StaggerContainer className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {[...marketHistory].reverse().map((year) => (
                      <StaggerItem key={year.id}>
                        <MarketYearCard
                          year={year}
                          maxPremium={maxPremium}
                        />
                      </StaggerItem>
                    ))}
                  </StaggerContainer>
                </div>

                {/* Risk Factor Links */}
                <ScrollReveal><div className="card p-5">
                  <h3 className="text-lg font-semibold text-white mb-3">
                    Active Risk Factors
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <Link href="/space-environment?tab=debris" className="p-3 rounded-lg bg-slate-700/30 hover:bg-slate-700/50 transition-colors group">
                      <div className="text-sm font-medium text-white group-hover:text-nebula-200">🛰️ Debris Monitor</div>
                      <p className="text-xs text-slate-400 mt-1">Orbital debris increases collision risk and claims</p>
                    </Link>
                    <Link href="/space-environment?tab=weather" className="p-3 rounded-lg bg-slate-700/30 hover:bg-slate-700/50 transition-colors group">
                      <div className="text-sm font-medium text-white group-hover:text-nebula-200">☀️ Solar Activity</div>
                      <p className="text-xs text-slate-400 mt-1">Solar storms affect satellite operations</p>
                    </Link>
                    <Link href="/compliance?tab=regulations" className="p-3 rounded-lg bg-slate-700/30 hover:bg-slate-700/50 transition-colors group">
                      <div className="text-sm font-medium text-white group-hover:text-nebula-200">📋 Compliance</div>
                      <p className="text-xs text-slate-400 mt-1">Liability regulations and requirements</p>
                    </Link>
                  </div>
                </div></ScrollReveal>

                {/* Trend Insight Card */}
                {marketHistory.length >= 2 && (
                  <div className="card p-5 border-dashed">
                    <h3 className="text-lg font-semibold text-white mb-3">
                      Market Trend Insights
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <h4 className="text-white font-medium mb-2">Premium Growth</h4>
                        <p className="text-slate-400">
                          Total premiums grew from {formatCurrency(marketHistory[0].totalPremiums)} in{' '}
                          {marketHistory[0].year} to{' '}
                          {formatCurrency(marketHistory[marketHistory.length - 1].totalPremiums)} in{' '}
                          {marketHistory[marketHistory.length - 1].year}, representing a{' '}
                          <span className="text-nebula-300 font-medium">
                            {(
                              ((marketHistory[marketHistory.length - 1].totalPremiums -
                                marketHistory[0].totalPremiums) /
                                marketHistory[0].totalPremiums) *
                              100
                            ).toFixed(1)}
                            %
                          </span>{' '}
                          increase.
                        </p>
                      </div>
                      <div>
                        <h4 className="text-white font-medium mb-2">Market Capacity</h4>
                        <p className="text-slate-400">
                          Industry capacity expanded from ${marketHistory[0].marketCapacity.toFixed(1)}B
                          to ${marketHistory[marketHistory.length - 1].marketCapacity.toFixed(1)}B, reflecting
                          growing confidence from underwriters and reinsurers.
                        </p>
                      </div>
                      <div>
                        <h4 className="text-white font-medium mb-2">Loss Experience</h4>
                        <p className="text-slate-400">
                          The{' '}
                          {marketHistory.find((y) => y.lossRatio > 100)
                            ? `${marketHistory.find((y) => y.lossRatio > 100)!.year} loss ratio of ${marketHistory.find((y) => y.lossRatio > 100)!.lossRatio.toFixed(1)}% was driven by exceptional claims, but the market has since stabilized.`
                            : 'market has maintained healthy loss ratios below 100% across all tracked years.'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ──────────── ACTIVE POLICIES TAB ──────────── */}
            {activeTab === 'policies' && (
              <div>
                {/* Filter Bar */}
                <div className="card p-4 mb-6">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-slate-400 text-sm mr-2">Filter by type:</span>
                    <button
                      onClick={() => handleTypeFilterChange('')}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                        policyTypeFilter === ''
                          ? 'bg-slate-700/50 text-white border border-slate-700/50 shadow-glow-sm'
                          : 'bg-transparent text-slate-400 border border-slate-700/50 hover:border-slate-300'
                      }`}
                    >
                      All ({policies.length})
                    </button>
                    {(
                      ['launch', 'in_orbit', 'liability', 'third_party'] as InsuranceMissionType[]
                    ).map((type) => {
                      const info = getMissionTypeInfo(type);
                      const count = policies.filter((p) => p.missionType === type).length;
                      return (
                        <button
                          key={type}
                          onClick={() => handleTypeFilterChange(type)}
                          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-1 ${
                            policyTypeFilter === type
                              ? 'bg-slate-700/50 text-white border border-slate-700/50 shadow-glow-sm'
                              : 'bg-transparent text-slate-400 border border-slate-700/50 hover:border-slate-300'
                          }`}
                        >
                          <span>{info?.icon}</span>
                          {info?.label || type} ({count})
                        </button>
                      );
                    })}
                    <div className="ml-auto">
                      <ExportButton
                        data={filteredPolicies}
                        filename="space-insurance-policies"
                        columns={POLICY_EXPORT_COLUMNS}
                        label="Export Policies"
                      />
                    </div>
                  </div>
                </div>

                {/* Aggregate Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="card p-3 text-center">
                    <div className="text-lg font-bold text-white">{filteredPolicies.length}</div>
                    <div className="text-slate-400 text-xs">Policies Shown</div>
                  </div>
                  <div className="card p-3 text-center">
                    <div className="text-lg font-bold text-nebula-300">
                      {formatCurrency(totalCoverage)}
                    </div>
                    <div className="text-slate-400 text-xs">Total Coverage</div>
                  </div>
                  <div className="card p-3 text-center">
                    <div className="text-lg font-bold text-green-400">
                      {formatCurrency(totalPremiumAmount)}
                    </div>
                    <div className="text-slate-400 text-xs">Total Premiums</div>
                  </div>
                  <div className="card p-3 text-center">
                    <div className="text-lg font-bold text-white">
                      {filteredPolicies.length > 0
                        ? (
                            filteredPolicies.reduce((sum, p) => sum + p.premiumRate, 0) /
                            filteredPolicies.length
                          ).toFixed(2)
                        : '0.00'}
                      %
                    </div>
                    <div className="text-slate-400 text-xs">Avg Premium Rate</div>
                  </div>
                </div>

                {/* Policy Cards */}
                {filteredPolicies.length === 0 ? (
                  <div className="text-center py-16">
                    <h3 className="text-xl font-semibold text-white mb-2">No Policies Found</h3>
                    <p className="text-slate-400">
                      {policyTypeFilter
                        ? `No ${getMissionTypeInfo(policyTypeFilter)?.label || policyTypeFilter} policies in the database.`
                        : 'No policies available.'}
                    </p>
                  </div>
                ) : (
                  <StaggerContainer className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {filteredPolicies.map((policy) => (
                      <StaggerItem key={policy.id}>
                        <PolicyCard policy={policy} />
                      </StaggerItem>
                    ))}
                  </StaggerContainer>
                )}
              </div>
            )}

            {/* ──────────── PREMIUM CALCULATOR TAB ──────────── */}
            {activeTab === 'calculator' && (
              <div className="space-y-6">
                {/* Interactive Calculator */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Input Form */}
                  <ScrollReveal>
                    <div className="card-elevated p-6 border border-nebula-500/20">
                      <div className="flex items-center gap-3 mb-5">
                        <span className="text-2xl">🧮</span>
                        <div>
                          <h3 className="text-lg font-semibold text-white">Insurance Premium Calculator</h3>
                          <p className="text-slate-400 text-sm">Configure your mission parameters to estimate insurance costs</p>
                        </div>
                      </div>

                      <div className="space-y-5">
                        {/* Orbit Type */}
                        <div>
                          <label className="block text-sm font-medium text-slate-300 mb-2">Mission Orbit Type</label>
                          <div className="grid grid-cols-2 gap-2">
                            {(Object.keys(ORBIT_RISK_FACTORS) as Array<keyof typeof ORBIT_RISK_FACTORS>).map((key) => (
                              <button
                                key={key}
                                onClick={() => setCalcInputs((prev) => ({ ...prev, orbitType: key as CalculatorInputs['orbitType'] }))}
                                className={`p-3 rounded-lg text-left text-sm transition-all ${
                                  calcInputs.orbitType === key
                                    ? 'bg-nebula-500/20 border border-nebula-500/40 text-white'
                                    : 'bg-slate-700/30 border border-slate-700/50 text-slate-400 hover:border-slate-500'
                                }`}
                              >
                                <div className="font-medium">{key === 'deep_space' ? 'Deep Space' : key}</div>
                                <div className="text-xs mt-0.5 opacity-75">{ORBIT_RISK_FACTORS[key].description.split('.')[0]}</div>
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Satellite Value Slider */}
                        <div>
                          <label className="block text-sm font-medium text-slate-300 mb-2">
                            Satellite / Payload Value: <span className="text-nebula-300 font-bold">{formatCurrency(calcInputs.satelliteValue)}</span>
                          </label>
                          <input
                            type="range"
                            min={1}
                            max={1000}
                            step={1}
                            value={calcInputs.satelliteValue}
                            onChange={(e) => setCalcInputs((prev) => ({ ...prev, satelliteValue: Number(e.target.value) }))}
                            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-nebula-500"
                          />
                          <div className="flex justify-between text-xs text-slate-500 mt-1">
                            <span>$1M</span>
                            <span>$250M</span>
                            <span>$500M</span>
                            <span>$750M</span>
                            <span>$1B</span>
                          </div>
                        </div>

                        {/* Launch Vehicle */}
                        <div>
                          <label className="block text-sm font-medium text-slate-300 mb-2">Launch Vehicle</label>
                          <select
                            value={calcInputs.launchVehicle}
                            onChange={(e) => setCalcInputs((prev) => ({ ...prev, launchVehicle: e.target.value }))}
                            className="w-full bg-slate-700/50 border border-slate-600 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-nebula-500 transition-colors"
                          >
                            {LAUNCH_VEHICLES.map((v) => (
                              <option key={v.name} value={v.name}>
                                {v.name} ({v.reliability}% reliability, {v.flights} flights)
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Mission Duration */}
                        <div>
                          <label className="block text-sm font-medium text-slate-300 mb-2">
                            Mission Duration: <span className="text-nebula-300 font-bold">{calcInputs.missionDuration} years</span>
                          </label>
                          <input
                            type="range"
                            min={1}
                            max={25}
                            step={1}
                            value={calcInputs.missionDuration}
                            onChange={(e) => setCalcInputs((prev) => ({ ...prev, missionDuration: Number(e.target.value) }))}
                            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-nebula-500"
                          />
                          <div className="flex justify-between text-xs text-slate-500 mt-1">
                            <span>1 yr</span>
                            <span>5 yr</span>
                            <span>10 yr</span>
                            <span>15 yr</span>
                            <span>20 yr</span>
                            <span>25 yr</span>
                          </div>
                        </div>

                        {/* Toggle Options */}
                        <div className="grid grid-cols-2 gap-3">
                          <button
                            onClick={() => setCalcInputs((prev) => ({ ...prev, isNewDesign: !prev.isNewDesign }))}
                            className={`p-3 rounded-lg text-sm text-left transition-all ${
                              calcInputs.isNewDesign
                                ? 'bg-amber-500/20 border border-amber-500/40 text-amber-300'
                                : 'bg-slate-700/30 border border-slate-700/50 text-slate-400'
                            }`}
                          >
                            <div className="font-medium">New Design</div>
                            <div className="text-xs mt-0.5 opacity-75">First-of-kind spacecraft (+25% risk)</div>
                          </button>
                          <button
                            onClick={() => setCalcInputs((prev) => ({ ...prev, hasHeritage: !prev.hasHeritage }))}
                            className={`p-3 rounded-lg text-sm text-left transition-all ${
                              calcInputs.hasHeritage
                                ? 'bg-green-500/20 border border-green-500/40 text-green-300'
                                : 'bg-slate-700/30 border border-slate-700/50 text-slate-400'
                            }`}
                          >
                            <div className="font-medium">Heritage Platform</div>
                            <div className="text-xs mt-0.5 opacity-75">Proven bus/platform (-10% risk)</div>
                          </button>
                        </div>
                      </div>
                    </div>
                  </ScrollReveal>

                  {/* Results Panel */}
                  <ScrollReveal delay={0.1}>
                    <div className="space-y-4">
                      {/* Total Premium */}
                      <div className="card-elevated p-6 border border-amber-500/20">
                        <h3 className="text-sm font-medium text-slate-400 uppercase tracking-widest mb-3">Estimated Total Premium</h3>
                        <div className="text-4xl font-bold font-display text-amber-400 mb-1">
                          {formatCurrency(calcResult.totalPremium)}
                        </div>
                        <div className="text-sm text-slate-400">
                          Effective rate: <span className="text-white font-mono font-bold">{calcResult.effectiveRate.toFixed(2)}%</span> of {formatCurrency(calcInputs.satelliteValue)} insured value
                        </div>
                      </div>

                      {/* Breakdown */}
                      <div className="card p-5">
                        <h4 className="text-sm font-semibold text-white mb-4">Premium Breakdown</h4>
                        <div className="space-y-3">
                          {[
                            { label: 'Launch Risk', value: calcResult.launchRisk, color: 'from-red-500 to-orange-500', icon: '🚀' },
                            { label: 'In-Orbit Risk (Year 1)', value: calcResult.inOrbitRisk, color: 'from-blue-500 to-cyan-500', icon: '🛰️' },
                            { label: 'Third-Party Liability', value: calcResult.thirdPartyLiability, color: 'from-purple-500 to-pink-500', icon: '⚖️' },
                          ].map((item) => {
                            const pct = calcResult.totalPremium > 0 ? (item.value / calcResult.totalPremium) * 100 : 0;
                            return (
                              <div key={item.label}>
                                <div className="flex items-center justify-between text-sm mb-1">
                                  <span className="text-slate-300 flex items-center gap-2">
                                    <span>{item.icon}</span> {item.label}
                                  </span>
                                  <span className="text-white font-mono font-bold">{formatCurrency(item.value)}</span>
                                </div>
                                <div className="h-2.5 bg-slate-700/50 rounded-full overflow-hidden">
                                  <div
                                    className={`h-full bg-gradient-to-r ${item.color} rounded-full transition-all duration-500`}
                                    style={{ width: `${Math.min(pct, 100)}%` }}
                                  />
                                </div>
                                <div className="text-right text-xs text-slate-500 mt-0.5">{pct.toFixed(1)}% of total</div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Risk Factors Applied */}
                      <div className="card p-5">
                        <h4 className="text-sm font-semibold text-white mb-3">Risk Factors Applied</h4>
                        <div className="grid grid-cols-2 gap-3 text-xs">
                          <div className="p-2 rounded bg-slate-700/30">
                            <span className="text-slate-400">Orbit</span>
                            <div className="text-white font-medium">{ORBIT_RISK_FACTORS[calcInputs.orbitType].label}</div>
                          </div>
                          <div className="p-2 rounded bg-slate-700/30">
                            <span className="text-slate-400">Vehicle Multiplier</span>
                            <div className="text-white font-medium font-mono">
                              {(LAUNCH_VEHICLES.find((v) => v.name === calcInputs.launchVehicle)?.riskMultiplier || 1.0).toFixed(2)}x
                            </div>
                          </div>
                          <div className="p-2 rounded bg-slate-700/30">
                            <span className="text-slate-400">Duration Adj.</span>
                            <div className="text-white font-medium">
                              {calcInputs.missionDuration > 15 ? '+30%' : calcInputs.missionDuration > 10 ? '+15%' : calcInputs.missionDuration < 3 ? '-20%' : 'Standard'}
                            </div>
                          </div>
                          <div className="p-2 rounded bg-slate-700/30">
                            <span className="text-slate-400">Design Premium</span>
                            <div className="text-white font-medium">
                              {calcInputs.isNewDesign ? '+25% new design' : 'None'}{calcInputs.hasHeritage ? ', -10% heritage' : ''}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Toggle Insurer Comparison */}
                      <button
                        onClick={() => setShowInsurerComparison(!showInsurerComparison)}
                        className="w-full py-3 px-4 rounded-lg text-sm font-medium bg-nebula-500/20 text-nebula-300 hover:bg-nebula-500/30 transition-colors flex items-center justify-center gap-2"
                      >
                        {showInsurerComparison ? 'Hide' : 'Show'} Insurer Comparison Estimates
                        <svg className={`w-4 h-4 transition-transform ${showInsurerComparison ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                    </div>
                  </ScrollReveal>
                </div>

                {/* Insurer Comparison Table */}
                {showInsurerComparison && (
                  <ScrollReveal>
                    <div className="card p-5">
                      <h3 className="text-lg font-semibold text-white mb-1">Estimated Premium Comparison by Insurer</h3>
                      <p className="text-slate-400 text-xs mb-4">Indicative estimates based on market positioning. Actual quotes require formal submission.</p>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="text-slate-400 text-xs border-b border-slate-700">
                              <th className="text-left py-2 pr-4">Insurer</th>
                              <th className="text-right py-2 pr-4">Est. Premium</th>
                              <th className="text-right py-2 pr-4">Eff. Rate</th>
                              <th className="text-left py-2">Notes</th>
                            </tr>
                          </thead>
                          <tbody>
                            {insurerEstimates.sort((a, b) => a.premium - b.premium).map((est) => (
                              <tr key={est.insurer} className="border-b border-slate-700/50 hover:bg-slate-700/20">
                                <td className="py-2.5 pr-4 text-white font-medium">{est.insurer}</td>
                                <td className="py-2.5 pr-4 text-right text-nebula-300 font-mono font-bold">{formatCurrency(est.premium)}</td>
                                <td className="py-2.5 pr-4 text-right text-slate-400 font-mono">{est.rate.toFixed(2)}%</td>
                                <td className="py-2.5 text-slate-400 text-xs">{est.notes}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </ScrollReveal>
                )}

                {/* Benchmark Rate Cards (kept from original) */}
                <ScrollReveal delay={0.15}>
                  <div className="card p-5">
                    <h3 className="text-lg font-semibold text-white mb-4">Industry Rate Benchmarks</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-slate-400 text-xs border-b border-slate-700">
                            <th className="text-left py-2 pr-4">Coverage Type</th>
                            <th className="text-right py-2 pr-4">Base Rate</th>
                            <th className="text-right py-2 pr-4">Risk Multiplier</th>
                            <th className="text-right py-2 pr-4">Effective Rate</th>
                            <th className="text-left py-2">Description</th>
                          </tr>
                        </thead>
                        <tbody>
                          {PREMIUM_RATE_BENCHMARKS.map((b) => (
                            <tr key={b.type} className="border-b border-slate-700/50 hover:bg-slate-700/20">
                              <td className="py-2.5 pr-4 text-white font-medium">
                                <span className="mr-2">{b.icon}</span>{b.label}
                              </td>
                              <td className="py-2.5 pr-4 text-right text-slate-400 font-mono">{b.baseRate.toFixed(1)}%</td>
                              <td className="py-2.5 pr-4 text-right text-slate-400 font-mono">{b.riskMultiplier.toFixed(1)}x</td>
                              <td className="py-2.5 pr-4 text-right text-nebula-300 font-mono font-bold">{b.effectiveRate.toFixed(2)}%</td>
                              <td className="py-2.5 text-slate-400 text-xs max-w-xs">{b.description}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </ScrollReveal>

                {/* Disclaimer */}
                <div className="card p-5 border-dashed">
                  <div className="flex items-start gap-3">
                    <span className="text-xl mt-0.5">&#9888;&#65039;</span>
                    <div>
                      <h4 className="text-white font-medium text-sm mb-1">Disclaimer</h4>
                      <p className="text-slate-400 text-xs leading-relaxed">
                        These estimates are for informational purposes only and do not constitute an insurance quote or offer.
                        Actual premiums are determined by underwriters based on detailed mission analysis, spacecraft design review,
                        launch vehicle track record, and current market conditions. Contact a licensed space insurance broker for binding quotes.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ──────────── INSURANCE TYPES TAB ──────────── */}
            {activeTab === 'types' && (
              <div className="space-y-6">
                <ScrollReveal>
                  <div className="card-elevated p-6 border border-nebula-500/20">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-2xl">📋</span>
                      <div>
                        <h3 className="text-lg font-semibold text-white">Space Insurance Coverage Types</h3>
                        <p className="text-slate-400 text-sm">
                          Understanding the five principal categories of space insurance coverage, from ground to orbit and beyond
                        </p>
                      </div>
                    </div>
                  </div>
                </ScrollReveal>

                {/* Insurance Type Cards */}
                <StaggerContainer className="space-y-4">
                  {INSURANCE_TYPES.map((type) => {
                    const isExpanded = expandedInsuranceType === type.id;
                    return (
                      <StaggerItem key={type.id}>
                        <div className="card overflow-hidden">
                          <button
                            onClick={() => setExpandedInsuranceType(isExpanded ? null : type.id)}
                            className="w-full p-5 text-left flex items-start justify-between gap-4 hover:bg-slate-700/10 transition-colors"
                          >
                            <div className="flex items-start gap-3 flex-1">
                              <span className="text-2xl mt-0.5">{type.icon}</span>
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-1">
                                  <h4 className="text-white font-semibold">{type.name}</h4>
                                  <span className="text-xs px-2 py-0.5 rounded bg-nebula-500/20 text-nebula-300">{type.typicalRate}</span>
                                </div>
                                <p className="text-slate-400 text-sm">{type.description}</p>
                                <div className="mt-2 text-xs text-slate-500">Phase: {type.phase}</div>
                              </div>
                            </div>
                            <svg
                              className={`w-5 h-5 text-slate-400 flex-shrink-0 transition-transform mt-1 ${isExpanded ? 'rotate-180' : ''}`}
                              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                            </svg>
                          </button>

                          {isExpanded && (
                            <div className="px-5 pb-5 border-t border-slate-700/50">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                                <div>
                                  <h5 className="text-sm font-semibold text-green-400 mb-2 flex items-center gap-1.5">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    What It Covers
                                  </h5>
                                  <ul className="space-y-1.5">
                                    {type.covers.map((item, i) => (
                                      <li key={i} className="text-sm text-slate-300 flex items-start gap-2">
                                        <span className="text-green-400 mt-0.5 text-xs">+</span>
                                        {item}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                                <div>
                                  <h5 className="text-sm font-semibold text-red-400 mb-2 flex items-center gap-1.5">
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    Common Exclusions
                                  </h5>
                                  <ul className="space-y-1.5">
                                    {type.exclusions.map((item, i) => (
                                      <li key={i} className="text-sm text-slate-400 flex items-start gap-2">
                                        <span className="text-red-400 mt-0.5 text-xs">-</span>
                                        {item}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </StaggerItem>
                    );
                  })}
                </StaggerContainer>

                {/* Treaty & Regulatory Links */}
                <ScrollReveal>
                  <div className="card p-5 border border-nebula-500/20">
                    <h3 className="text-white font-semibold mb-3">Related Regulatory Framework</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <Link href="/compliance?tab=treaties" className="p-3 rounded-lg bg-slate-700/30 hover:bg-slate-700/50 transition-colors group">
                        <div className="text-sm font-medium text-white group-hover:text-nebula-200">🏛️ UN Space Treaties</div>
                        <p className="text-xs text-slate-400 mt-1">1967 Outer Space Treaty & 1972 Liability Convention</p>
                      </Link>
                      <Link href="/compliance?tab=filings" className="p-3 rounded-lg bg-slate-700/30 hover:bg-slate-700/50 transition-colors group">
                        <div className="text-sm font-medium text-white group-hover:text-nebula-200">📄 Regulatory Filings</div>
                        <p className="text-xs text-slate-400 mt-1">National licensing requirements for launches</p>
                      </Link>
                      <Link href="/space-talent?tab=jobs&category=legal" className="p-3 rounded-lg bg-slate-700/30 hover:bg-slate-700/50 transition-colors group">
                        <div className="text-sm font-medium text-white group-hover:text-nebula-200">👤 Insurance Professionals</div>
                        <p className="text-xs text-slate-400 mt-1">Find brokers and underwriting specialists</p>
                      </Link>
                    </div>
                  </div>
                </ScrollReveal>
              </div>
            )}

            {/* ──────────── KEY STATISTICS TAB ──────────── */}
            {activeTab === 'statistics' && (
              <div className="space-y-6">
                {/* Key Market Stats Grid */}
                <ScrollReveal>
                  <div className="card-elevated p-6 border border-nebula-500/20 mb-2">
                    <div className="flex items-center gap-3 mb-5">
                      <span className="text-2xl">📊</span>
                      <div>
                        <h3 className="text-lg font-semibold text-white">Key Market Statistics</h3>
                        <p className="text-slate-400 text-sm">Global space insurance market metrics and trends (2025 estimates)</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {KEY_STATISTICS.map((stat) => (
                        <div key={stat.label} className="p-4 rounded-lg bg-slate-700/30 border border-slate-700/50">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-slate-400 text-xs">{stat.label}</span>
                            {stat.trend && (
                              <span className={`text-xs px-1.5 py-0.5 rounded ${
                                stat.trend === 'up' ? 'bg-green-500/20 text-green-400' :
                                stat.trend === 'down' ? 'bg-red-500/20 text-red-400' :
                                'bg-slate-600/50 text-slate-400'
                              }`}>
                                {stat.trend === 'up' ? '^ Up' : stat.trend === 'down' ? 'v Down' : '- Stable'}
                              </span>
                            )}
                          </div>
                          <div className="text-xl font-bold font-display text-white">{stat.value}</div>
                          <div className="text-xs text-slate-500 mt-1">{stat.detail}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </ScrollReveal>

                {/* Top Insurers */}
                <ScrollReveal delay={0.1}>
                  <div className="card p-5">
                    <h3 className="text-lg font-semibold text-white mb-1">Top Space Insurance Underwriters</h3>
                    <p className="text-slate-400 text-xs mb-4">Market share and capacity estimates for leading global space insurers</p>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-slate-400 text-xs border-b border-slate-700">
                            <th className="text-left py-2 pr-4">Insurer</th>
                            <th className="text-right py-2 pr-4">Market Share</th>
                            <th className="text-right py-2 pr-4">Est. Capacity</th>
                            <th className="text-left py-2 pr-4">Specialty</th>
                            <th className="text-left py-2 pr-4">HQ</th>
                            <th className="text-left py-2">Notable Clients</th>
                          </tr>
                        </thead>
                        <tbody>
                          {TOP_INSURERS.map((ins) => (
                            <tr key={ins.name} className="border-b border-slate-700/50 hover:bg-slate-700/20">
                              <td className="py-2.5 pr-4 text-white font-medium whitespace-nowrap">{ins.name}</td>
                              <td className="py-2.5 pr-4 text-right">
                                <div className="flex items-center gap-2 justify-end">
                                  <div className="w-16 h-2 bg-slate-700/50 rounded-full overflow-hidden">
                                    <div className="h-full bg-gradient-to-r from-nebula-500 to-nebula-400 rounded-full" style={{ width: `${(ins.marketShare / 22) * 100}%` }} />
                                  </div>
                                  <span className="text-nebula-300 font-mono text-xs">{ins.marketShare}%</span>
                                </div>
                              </td>
                              <td className="py-2.5 pr-4 text-right text-slate-400 font-mono text-xs">{ins.estPremiumCapacity}</td>
                              <td className="py-2.5 pr-4 text-slate-400 text-xs">{ins.specialty}</td>
                              <td className="py-2.5 pr-4 text-slate-500 text-xs whitespace-nowrap">{ins.hq}</td>
                              <td className="py-2.5 text-slate-500 text-xs">{ins.notableClients}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </ScrollReveal>

                {/* Premium Rate Trends Chart (ASCII bar chart) */}
                <ScrollReveal delay={0.15}>
                  <div className="card p-5">
                    <h3 className="text-lg font-semibold text-white mb-1">Premium Rate Trends (2015-2025)</h3>
                    <p className="text-slate-400 text-xs mb-4">Historical average premium rates by coverage type, showing the soft market decline and post-2020 recovery</p>
                    <div className="space-y-2">
                      {PREMIUM_TREND_DATA.map((yr) => {
                        const maxRate = 15;
                        return (
                          <div key={yr.year} className="grid grid-cols-[60px_1fr] gap-3 items-center">
                            <span className="text-xs text-slate-400 font-mono text-right">{yr.year}</span>
                            <div className="flex items-center gap-2">
                              <div className="flex-1 flex items-center gap-1 h-6">
                                <div
                                  className="h-full bg-gradient-to-r from-red-500/80 to-orange-500/80 rounded-sm transition-all duration-500 relative group"
                                  style={{ width: `${(yr.avgLaunchRate / maxRate) * 100}%` }}
                                  title={`Launch: ${yr.avgLaunchRate}%`}
                                >
                                  <span className="absolute inset-0 flex items-center justify-center text-[10px] text-white font-mono opacity-0 group-hover:opacity-100 transition-opacity">
                                    {yr.avgLaunchRate}%
                                  </span>
                                </div>
                                <div
                                  className="h-full bg-gradient-to-r from-blue-500/80 to-cyan-500/80 rounded-sm transition-all duration-500 relative group"
                                  style={{ width: `${(yr.avgInOrbitRate / maxRate) * 100}%` }}
                                  title={`In-Orbit: ${yr.avgInOrbitRate}%`}
                                >
                                  <span className="absolute inset-0 flex items-center justify-center text-[10px] text-white font-mono opacity-0 group-hover:opacity-100 transition-opacity">
                                    {yr.avgInOrbitRate}%
                                  </span>
                                </div>
                                <div
                                  className="h-full bg-gradient-to-r from-purple-500/80 to-pink-500/80 rounded-sm transition-all duration-500 relative group"
                                  style={{ width: `${(yr.avgLiabilityRate / maxRate) * 100}%` }}
                                  title={`Liability: ${yr.avgLiabilityRate}%`}
                                >
                                  <span className="absolute inset-0 flex items-center justify-center text-[10px] text-white font-mono opacity-0 group-hover:opacity-100 transition-opacity">
                                    {yr.avgLiabilityRate}%
                                  </span>
                                </div>
                              </div>
                              <span className={`text-xs font-mono w-14 text-right ${yr.lossRatio > 100 ? 'text-red-400' : yr.lossRatio > 70 ? 'text-yellow-400' : 'text-green-400'}`}>
                                {yr.lossRatio}% LR
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <div className="flex items-center gap-4 mt-4 pt-3 border-t border-slate-700/50 text-xs text-slate-400">
                      <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-gradient-to-r from-red-500/80 to-orange-500/80" /> Launch</span>
                      <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-gradient-to-r from-blue-500/80 to-cyan-500/80" /> In-Orbit</span>
                      <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-gradient-to-r from-purple-500/80 to-pink-500/80" /> Liability</span>
                      <span className="ml-auto">LR = Loss Ratio</span>
                    </div>
                  </div>
                </ScrollReveal>

                {/* Market Size Trend */}
                <ScrollReveal delay={0.2}>
                  <div className="card p-5">
                    <h3 className="text-lg font-semibold text-white mb-1">Market Size Trend</h3>
                    <p className="text-slate-400 text-xs mb-4">Annual global space insurance premium volume ($M)</p>
                    <div className="space-y-1.5">
                      {PREMIUM_TREND_DATA.map((yr) => {
                        const maxSize = 650;
                        const width = (yr.marketSize / maxSize) * 100;
                        return (
                          <div key={yr.year} className="grid grid-cols-[60px_1fr_70px] gap-3 items-center">
                            <span className="text-xs text-slate-400 font-mono text-right">{yr.year}</span>
                            <div className="h-5 bg-slate-700/50 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-nebula-500 to-nebula-400 rounded-full transition-all duration-500"
                                style={{ width: `${width}%` }}
                              />
                            </div>
                            <span className="text-xs text-nebula-300 font-mono">${yr.marketSize}M</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </ScrollReveal>

                {/* Notable Historical Claims */}
                <ScrollReveal delay={0.25}>
                  <div className="card p-5">
                    <h3 className="text-lg font-semibold text-white mb-1">Notable Historical Claims</h3>
                    <p className="text-slate-400 text-xs mb-4">Major space insurance claims that shaped the market</p>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-slate-400 text-xs border-b border-slate-700">
                            <th className="text-left py-2 pr-3">Year</th>
                            <th className="text-left py-2 pr-3">Mission</th>
                            <th className="text-left py-2 pr-3">Operator</th>
                            <th className="text-right py-2 pr-3">Insured Value</th>
                            <th className="text-right py-2 pr-3">Claim</th>
                            <th className="text-left py-2">Cause & Outcome</th>
                          </tr>
                        </thead>
                        <tbody>
                          {NOTABLE_CLAIMS.sort((a, b) => b.year - a.year).map((claim) => (
                            <tr key={claim.mission} className="border-b border-slate-700/50 hover:bg-slate-700/20 align-top">
                              <td className="py-2.5 pr-3 text-white font-mono text-xs">{claim.year}</td>
                              <td className="py-2.5 pr-3 text-white font-medium text-xs whitespace-nowrap">{claim.mission}</td>
                              <td className="py-2.5 pr-3 text-slate-400 text-xs whitespace-nowrap">{claim.operator}</td>
                              <td className="py-2.5 pr-3 text-right text-slate-400 font-mono text-xs">${claim.insuredValue}M</td>
                              <td className={`py-2.5 pr-3 text-right font-mono text-xs ${claim.claimAmount > 0 ? 'text-red-400' : 'text-green-400'}`}>
                                {claim.claimAmount > 0 ? `$${claim.claimAmount}M` : 'None'}
                              </td>
                              <td className="py-2.5 text-xs">
                                <div className="text-slate-300 mb-0.5">{claim.cause}</div>
                                <div className="text-slate-500 italic">{claim.outcome}</div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </ScrollReveal>

                {/* Average Premium Rates by Orbit */}
                <ScrollReveal delay={0.3}>
                  <div className="card p-5">
                    <h3 className="text-lg font-semibold text-white mb-4">Average Premium Rates by Orbit Type</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      {(Object.entries(ORBIT_RISK_FACTORS) as [string, typeof ORBIT_RISK_FACTORS[string]][]).map(([key, orbit]) => (
                        <div key={key} className="p-4 rounded-lg bg-slate-700/30 border border-slate-700/50">
                          <h4 className="text-white font-semibold text-sm mb-3">{key === 'deep_space' ? 'Deep Space' : key}</h4>
                          <div className="space-y-2">
                            <div className="flex justify-between text-xs">
                              <span className="text-slate-400">Launch</span>
                              <span className="text-red-400 font-mono font-bold">{orbit.launchRate}%</span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span className="text-slate-400">In-Orbit</span>
                              <span className="text-blue-400 font-mono font-bold">{orbit.inOrbitRate}%</span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span className="text-slate-400">Liability</span>
                              <span className="text-purple-400 font-mono font-bold">{orbit.liabilityRate}%</span>
                            </div>
                            <div className="pt-2 mt-2 border-t border-slate-700/50">
                              <div className="flex justify-between text-xs">
                                <span className="text-slate-400">Combined</span>
                                <span className="text-nebula-300 font-mono font-bold">
                                  {(orbit.launchRate + orbit.inOrbitRate + orbit.liabilityRate).toFixed(1)}%
                                </span>
                              </div>
                            </div>
                          </div>
                          <p className="text-xs text-slate-500 mt-3">{orbit.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </ScrollReveal>

                {/* Claims Frequency & Capacity */}
                <ScrollReveal delay={0.35}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="card p-5">
                      <h3 className="text-lg font-semibold text-white mb-3">Claims Frequency by Type</h3>
                      <div className="space-y-3">
                        {[
                          { type: 'Launch Failure', frequency: 5.2, color: 'from-red-500 to-orange-500' },
                          { type: 'In-Orbit Anomaly', frequency: 8.1, color: 'from-blue-500 to-cyan-500' },
                          { type: 'Partial Loss', frequency: 12.5, color: 'from-yellow-500 to-amber-500' },
                          { type: 'Deployment Failure', frequency: 3.8, color: 'from-purple-500 to-pink-500' },
                          { type: 'Debris Collision', frequency: 0.4, color: 'from-slate-500 to-slate-400' },
                        ].map((item) => (
                          <div key={item.type}>
                            <div className="flex justify-between text-sm mb-1">
                              <span className="text-slate-300">{item.type}</span>
                              <span className="text-white font-mono font-bold">{item.frequency}%</span>
                            </div>
                            <div className="h-2 bg-slate-700/50 rounded-full overflow-hidden">
                              <div
                                className={`h-full bg-gradient-to-r ${item.color} rounded-full`}
                                style={{ width: `${(item.frequency / 15) * 100}%` }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                      <p className="text-xs text-slate-500 mt-3">Percentage of policies resulting in claims (5-year average)</p>
                    </div>

                    <div className="card p-5">
                      <h3 className="text-lg font-semibold text-white mb-3">Market Capacity Trend</h3>
                      <div className="space-y-2">
                        {[
                          { year: 2020, capacity: 1.8 },
                          { year: 2021, capacity: 2.0 },
                          { year: 2022, capacity: 2.2 },
                          { year: 2023, capacity: 2.4 },
                          { year: 2024, capacity: 2.6 },
                          { year: 2025, capacity: 2.8 },
                        ].map((yr) => (
                          <div key={yr.year} className="grid grid-cols-[50px_1fr_60px] gap-3 items-center">
                            <span className="text-xs text-slate-400 font-mono">{yr.year}</span>
                            <div className="h-4 bg-slate-700/50 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-green-500 to-emerald-400 rounded-full"
                                style={{ width: `${(yr.capacity / 3.0) * 100}%` }}
                              />
                            </div>
                            <span className="text-xs text-green-400 font-mono">${yr.capacity}B</span>
                          </div>
                        ))}
                      </div>
                      <p className="text-xs text-slate-500 mt-3">Total available underwriting capacity from all market participants</p>
                    </div>
                  </div>
                </ScrollReveal>
              </div>
            )}
          </>
        )}

        {/* ── Dynamic Content: Market Commentary + Related News ── */}
        <DynamicInsuranceContent />
      </div>
    </div>
  );
}

// ────────────────────────────────────────
// Dynamic Content Section (fetched from DynamicContent)
// ────────────────────────────────────────

interface DynamicNewsArticle {
  id: string;
  title: string;
  summary: string;
  source: string;
  url: string;
  imageUrl: string | null;
  publishedAt: string;
  category: string;
}

interface DynamicBlogPost {
  id: string;
  title: string;
  excerpt: string;
  url: string;
  publishedAt: string;
  topic: string;
  sourceName: string;
}

interface MarketCommentary {
  title: string;
  summary: string;
  content: string;
  keyTakeaways: string[];
  generatedAt: string;
}

function DynamicInsuranceContent() {
  const [news, setNews] = useState<DynamicNewsArticle[]>([]);
  const [blogs, setBlogs] = useState<DynamicBlogPost[]>([]);
  const [commentary, setCommentary] = useState<MarketCommentary | null>(null);
  const [showFullCommentary, setShowFullCommentary] = useState(false);

  useEffect(() => {
    async function fetchDynamic() {
      try {
        const res = await fetch('/api/space-insurance/dynamic');
        if (res.ok) {
          const data = await res.json();
          setNews(data.relatedNews || []);
          setBlogs(data.relatedBlogs || []);
          setCommentary(data.marketCommentary || null);
        }
      } catch {
        // Dynamic content is supplementary — fail silently
      }
    }
    fetchDynamic();
  }, []);

  if (!commentary && news.length === 0 && blogs.length === 0) return null;

  return (
    <div className="mt-10 space-y-8">
      {/* AI Market Commentary */}
      {commentary && (
        <ScrollReveal>
          <div className="card p-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-2xl">🤖</span>
              <div>
                <h3 className="text-lg font-display font-bold text-white">{commentary.title}</h3>
                <p className="text-xs text-slate-400">
                  AI-generated analysis · {new Date(commentary.generatedAt).toLocaleDateString()}
                </p>
              </div>
            </div>
            <p className="text-slate-300 text-sm mb-4">{commentary.summary}</p>

            {commentary.keyTakeaways.length > 0 && (
              <div className="mb-4 p-4 bg-nebula-500/5 rounded-lg border border-nebula-500/20">
                <h4 className="text-sm font-semibold text-nebula-300 mb-2">Key Takeaways</h4>
                <ul className="space-y-1">
                  {commentary.keyTakeaways.map((t, i) => (
                    <li key={i} className="text-sm text-slate-300 flex items-start gap-2">
                      <span className="text-nebula-300 mt-0.5">•</span>
                      {t}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {showFullCommentary ? (
              <div className="prose prose-sm max-w-none text-slate-300 mb-4">
                <div dangerouslySetInnerHTML={{ __html: commentary.content.replace(/\n/g, '<br/>').replace(/## /g, '<strong>').replace(/\n/g, '</strong><br/>') }} />
              </div>
            ) : null}

            <button
              onClick={() => setShowFullCommentary(!showFullCommentary)}
              className="text-sm text-nebula-300 hover:text-nebula-200 font-medium transition-colors"
            >
              {showFullCommentary ? 'Show Less' : 'Read Full Analysis →'}
            </button>
          </div>
        </ScrollReveal>
      )}

      {/* Related News */}
      {news.length > 0 && (
        <ScrollReveal>
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="text-xl">📰</span>
                <h3 className="text-lg font-display font-bold text-white">Insurance Industry News</h3>
              </div>
              <span className="text-xs text-slate-400">{news.length} articles</span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {news.slice(0, 6).map((article) => (
                <a
                  key={article.id}
                  href={article.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block p-3 rounded-lg border border-slate-700/50 hover:border-nebula-500/30 hover:bg-nebula-500/5 transition-all group"
                >
                  <h4 className="text-sm font-medium text-white group-hover:text-nebula-300 line-clamp-2 mb-1">
                    {article.title}
                  </h4>
                  <p className="text-xs text-slate-400 line-clamp-2 mb-2">
                    {article.summary}
                  </p>
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>{article.source}</span>
                    <span>{new Date(article.publishedAt).toLocaleDateString()}</span>
                  </div>
                </a>
              ))}
            </div>
          </div>
        </ScrollReveal>
      )}

      {/* Related Blog Posts */}
      {blogs.length > 0 && (
        <ScrollReveal>
          <div className="card p-6">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-xl">📝</span>
              <h3 className="text-lg font-display font-bold text-white">Industry Analysis & Reports</h3>
            </div>
            <div className="space-y-3">
              {blogs.slice(0, 5).map((post) => (
                <a
                  key={post.id}
                  href={post.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block p-3 rounded-lg border border-slate-700/50 hover:border-nebula-500/30 hover:bg-nebula-500/5 transition-all group"
                >
                  <h4 className="text-sm font-medium text-white group-hover:text-nebula-300 mb-1">
                    {post.title}
                  </h4>
                  <div className="flex items-center gap-3 text-xs text-slate-400">
                    <span>{post.sourceName}</span>
                    <span>{new Date(post.publishedAt).toLocaleDateString()}</span>
                    <span className="px-1.5 py-0.5 rounded bg-slate-700/50 text-slate-500">{post.topic}</span>
                  </div>
                </a>
              ))}
            </div>
          </div>
        </ScrollReveal>
      )}
    </div>
  );
}

// ────────────────────────────────────────
// Main Page (with Suspense boundary)
// ────────────────────────────────────────

export default function SpaceInsurancePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen">
          <div className="container mx-auto px-4">
            <PageHeader
              title="Space Insurance & Risk Assessment"
              subtitle="Comprehensive view of the space insurance market, active policies, and premium rate benchmarks"
              breadcrumbs={[{ label: 'Home', href: '/' }, { label: 'Space Insurance' }]}
            />
            <div className="flex justify-center py-20">
              <LoadingSpinner size="lg" />
            </div>
          </div>
        </div>
      }
    >
      <InsuranceContent />
    </Suspense>
  );
}
