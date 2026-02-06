export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';

// ────────────────────────────────────────
// Types
// ────────────────────────────────────────

export type OrbitType = 'LEO' | 'SSO' | 'GTO' | 'GEO' | 'Lunar' | 'Mars' | 'Beyond';
export type PayloadType = 'communications' | 'earth_observation' | 'technology_demo' | 'science' | 'navigation' | 'military' | 'crewed';

interface CostEstimateRequest {
  payloadMass: number; // kg
  orbitType: OrbitType;
  payloadType: PayloadType;
  payloadValue?: number; // USD for insurance calculation
  includeInsurance?: boolean;
  includeRegulatory?: boolean;
}

interface ProviderCostEstimate {
  providerId: string;
  providerName: string;
  vehicleName: string;
  country: string;
  minCost: number;
  maxCost: number;
  typicalCost: number;
  costPerKg: { min: number; max: number };
  supportsOrbit: boolean;
  supportsPayload: boolean;
  reliability: number;
  notes: string[];
}

interface InsuranceEstimate {
  launchInsurance: { min: number; max: number; typical: number };
  inOrbitInsurance: { min: number; max: number; typical: number };
  thirdPartyLiability: { min: number; max: number; typical: number };
  totalInsurance: { min: number; max: number; typical: number };
}

interface RegulatoryFeesEstimate {
  faaLicenseFee: number;
  fccFilingFee: number;
  noaaLicenseFee: number;
  ituFilingFee: number;
  miscFees: number;
  totalFees: number;
  notes: string[];
}

interface TotalCostSummary {
  launchCost: { min: number; max: number; typical: number };
  insurance: InsuranceEstimate | null;
  regulatoryFees: RegulatoryFeesEstimate | null;
  totalCost: { min: number; max: number; typical: number };
}

interface CostEstimateResponse {
  input: CostEstimateRequest;
  providers: ProviderCostEstimate[];
  insurance: InsuranceEstimate | null;
  regulatoryFees: RegulatoryFeesEstimate | null;
  summary: TotalCostSummary;
  generatedAt: string;
}

// ────────────────────────────────────────
// Provider Data (Cost per kg in USD)
// ────────────────────────────────────────

interface LaunchProvider {
  id: string;
  name: string;
  vehicle: string;
  country: string;
  costPerKgLEO: { min: number; max: number };
  dedicatedCostM: number | null; // Dedicated mission cost in millions
  maxPayloadLEO: number; // kg
  maxPayloadGTO: number | null;
  maxPayloadGEO: number | null;
  reliability: number; // 0-1
  supportsSSO: boolean;
  supportsGTO: boolean;
  supportsGEO: boolean;
  supportsLunar: boolean;
  supportsMars: boolean;
  supportsCrewed: boolean;
  notes: string;
}

const LAUNCH_PROVIDERS: LaunchProvider[] = [
  {
    id: 'spacex-f9',
    name: 'SpaceX',
    vehicle: 'Falcon 9',
    country: 'USA',
    costPerKgLEO: { min: 2720, max: 3300 },
    dedicatedCostM: 67,
    maxPayloadLEO: 22800,
    maxPayloadGTO: 8300,
    maxPayloadGEO: null,
    reliability: 0.98,
    supportsSSO: true,
    supportsGTO: true,
    supportsGEO: false,
    supportsLunar: false,
    supportsMars: false,
    supportsCrewed: true,
    notes: 'Industry workhorse. Reusable first stage reduces costs.',
  },
  {
    id: 'spacex-fh',
    name: 'SpaceX',
    vehicle: 'Falcon Heavy',
    country: 'USA',
    costPerKgLEO: { min: 1400, max: 2350 },
    dedicatedCostM: 150,
    maxPayloadLEO: 63800,
    maxPayloadGTO: 26700,
    maxPayloadGEO: 16000,
    reliability: 1.0,
    supportsSSO: true,
    supportsGTO: true,
    supportsGEO: true,
    supportsLunar: true,
    supportsMars: true,
    supportsCrewed: false,
    notes: 'Heavy-lift. Partially reusable. Best $/kg for large payloads.',
  },
  {
    id: 'spacex-starship',
    name: 'SpaceX',
    vehicle: 'Starship',
    country: 'USA',
    costPerKgLEO: { min: 100, max: 500 },
    dedicatedCostM: 10,
    maxPayloadLEO: 150000,
    maxPayloadGTO: 100000,
    maxPayloadGEO: 50000,
    reliability: 0.85,
    supportsSSO: true,
    supportsGTO: true,
    supportsGEO: true,
    supportsLunar: true,
    supportsMars: true,
    supportsCrewed: true,
    notes: 'Fully reusable super-heavy. Projected costs, limited flight heritage.',
  },
  {
    id: 'ula-vulcan',
    name: 'ULA',
    vehicle: 'Vulcan Centaur',
    country: 'USA',
    costPerKgLEO: { min: 3700, max: 7400 },
    dedicatedCostM: 110,
    maxPayloadLEO: 27200,
    maxPayloadGTO: 14400,
    maxPayloadGEO: null,
    reliability: 1.0,
    supportsSSO: true,
    supportsGTO: true,
    supportsGEO: true,
    supportsLunar: true,
    supportsMars: false,
    supportsCrewed: true,
    notes: 'National security missions. High reliability for government payloads.',
  },
  {
    id: 'rocketlab-electron',
    name: 'Rocket Lab',
    vehicle: 'Electron',
    country: 'USA/NZ',
    costPerKgLEO: { min: 18000, max: 28000 },
    dedicatedCostM: 7.5,
    maxPayloadLEO: 300,
    maxPayloadGTO: null,
    maxPayloadGEO: null,
    reliability: 0.94,
    supportsSSO: true,
    supportsGTO: false,
    supportsGEO: false,
    supportsLunar: false,
    supportsMars: false,
    supportsCrewed: false,
    notes: 'Small-sat specialist. Fast turnaround. Premium for dedicated access.',
  },
  {
    id: 'rocketlab-neutron',
    name: 'Rocket Lab',
    vehicle: 'Neutron',
    country: 'USA',
    costPerKgLEO: { min: 3500, max: 5500 },
    dedicatedCostM: 55,
    maxPayloadLEO: 13000,
    maxPayloadGTO: 6000,
    maxPayloadGEO: null,
    reliability: 0.95,
    supportsSSO: true,
    supportsGTO: true,
    supportsGEO: false,
    supportsLunar: false,
    supportsMars: false,
    supportsCrewed: false,
    notes: 'Medium-lift reusable. Under development, projected costs.',
  },
  {
    id: 'blue-origin-ng',
    name: 'Blue Origin',
    vehicle: 'New Glenn',
    country: 'USA',
    costPerKgLEO: { min: 1500, max: 2200 },
    dedicatedCostM: 68,
    maxPayloadLEO: 45000,
    maxPayloadGTO: 13000,
    maxPayloadGEO: null,
    reliability: 0.95,
    supportsSSO: true,
    supportsGTO: true,
    supportsGEO: true,
    supportsLunar: true,
    supportsMars: false,
    supportsCrewed: false,
    notes: 'Heavy-lift reusable. First flight 2024. Competitive pricing.',
  },
  {
    id: 'isro-pslv',
    name: 'ISRO',
    vehicle: 'PSLV',
    country: 'India',
    costPerKgLEO: { min: 3950, max: 8420 },
    dedicatedCostM: 30,
    maxPayloadLEO: 3800,
    maxPayloadGTO: 1425,
    maxPayloadGEO: null,
    reliability: 0.96,
    supportsSSO: true,
    supportsGTO: true,
    supportsGEO: false,
    supportsLunar: false,
    supportsMars: false,
    supportsCrewed: false,
    notes: 'Reliable workhorse. Very cost-effective for small/medium payloads.',
  },
  {
    id: 'isro-lvm3',
    name: 'ISRO',
    vehicle: 'LVM3',
    country: 'India',
    costPerKgLEO: { min: 4000, max: 6000 },
    dedicatedCostM: 50,
    maxPayloadLEO: 10000,
    maxPayloadGTO: 4000,
    maxPayloadGEO: null,
    reliability: 0.86,
    supportsSSO: true,
    supportsGTO: true,
    supportsGEO: false,
    supportsLunar: true,
    supportsMars: false,
    supportsCrewed: true,
    notes: 'India heavy-lift. Chandrayaan missions. Growing flight heritage.',
  },
  {
    id: 'arianespace-a6',
    name: 'Arianespace',
    vehicle: 'Ariane 6',
    country: 'France/EU',
    costPerKgLEO: { min: 3600, max: 5900 },
    dedicatedCostM: 75,
    maxPayloadLEO: 21600,
    maxPayloadGTO: 11500,
    maxPayloadGEO: 5000,
    reliability: 1.0,
    supportsSSO: true,
    supportsGTO: true,
    supportsGEO: true,
    supportsLunar: false,
    supportsMars: false,
    supportsCrewed: false,
    notes: 'European flagship. Dual-launch GTO. First flight 2024.',
  },
  {
    id: 'arianespace-vega',
    name: 'Arianespace',
    vehicle: 'Vega C',
    country: 'Italy/EU',
    costPerKgLEO: { min: 14000, max: 20000 },
    dedicatedCostM: 37,
    maxPayloadLEO: 2300,
    maxPayloadGTO: 1500,
    maxPayloadGEO: null,
    reliability: 0.92,
    supportsSSO: true,
    supportsGTO: true,
    supportsGEO: false,
    supportsLunar: false,
    supportsMars: false,
    supportsCrewed: false,
    notes: 'Small/medium European launch. SSO specialty.',
  },
  {
    id: 'jaxa-h3',
    name: 'JAXA/MHI',
    vehicle: 'H3',
    country: 'Japan',
    costPerKgLEO: { min: 4500, max: 7000 },
    dedicatedCostM: 50,
    maxPayloadLEO: 16500,
    maxPayloadGTO: 6500,
    maxPayloadGEO: 3500,
    reliability: 0.50,
    supportsSSO: true,
    supportsGTO: true,
    supportsGEO: true,
    supportsLunar: false,
    supportsMars: false,
    supportsCrewed: false,
    notes: 'New Japanese workhorse. Early flight phase. Designed for cost reduction.',
  },
  {
    id: 'china-lm5',
    name: 'CASC',
    vehicle: 'Long March 5',
    country: 'China',
    costPerKgLEO: { min: 3000, max: 5000 },
    dedicatedCostM: 100,
    maxPayloadLEO: 25000,
    maxPayloadGTO: 14000,
    maxPayloadGEO: 8000,
    reliability: 0.86,
    supportsSSO: true,
    supportsGTO: true,
    supportsGEO: true,
    supportsLunar: true,
    supportsMars: true,
    supportsCrewed: false,
    notes: 'Chinese heavy-lift. Limited for Western customers due to ITAR.',
  },
  {
    id: 'roscosmos-soyuz',
    name: 'Roscosmos',
    vehicle: 'Soyuz-2',
    country: 'Russia',
    costPerKgLEO: { min: 4500, max: 7500 },
    dedicatedCostM: 48,
    maxPayloadLEO: 8200,
    maxPayloadGTO: 3250,
    maxPayloadGEO: null,
    reliability: 0.97,
    supportsSSO: true,
    supportsGTO: true,
    supportsGEO: false,
    supportsLunar: false,
    supportsMars: false,
    supportsCrewed: true,
    notes: 'Highly reliable. Limited availability due to sanctions.',
  },
];

// ────────────────────────────────────────
// Orbit Multipliers
// ────────────────────────────────────────

const ORBIT_MULTIPLIERS: Record<OrbitType, number> = {
  LEO: 1.0,
  SSO: 1.15,
  GTO: 2.0,
  GEO: 2.8,
  Lunar: 4.0,
  Mars: 6.0,
  Beyond: 8.0,
};

// ────────────────────────────────────────
// Payload Type Factors
// ────────────────────────────────────────

const PAYLOAD_TYPE_FACTORS: Record<PayloadType, { insuranceMultiplier: number; regComplexity: number }> = {
  communications: { insuranceMultiplier: 1.0, regComplexity: 1.0 },
  earth_observation: { insuranceMultiplier: 0.9, regComplexity: 1.2 },
  technology_demo: { insuranceMultiplier: 1.3, regComplexity: 0.8 },
  science: { insuranceMultiplier: 0.8, regComplexity: 0.7 },
  navigation: { insuranceMultiplier: 1.1, regComplexity: 1.3 },
  military: { insuranceMultiplier: 1.5, regComplexity: 2.0 },
  crewed: { insuranceMultiplier: 3.0, regComplexity: 2.5 },
};

// ────────────────────────────────────────
// Cost Calculation Functions
// ────────────────────────────────────────

function calculateProviderCosts(
  provider: LaunchProvider,
  payloadMass: number,
  orbitType: OrbitType,
  payloadType: PayloadType
): ProviderCostEstimate | null {
  // Check orbit support
  const supportsOrbit =
    orbitType === 'LEO' ||
    (orbitType === 'SSO' && provider.supportsSSO) ||
    (orbitType === 'GTO' && provider.supportsGTO) ||
    (orbitType === 'GEO' && provider.supportsGEO) ||
    (orbitType === 'Lunar' && provider.supportsLunar) ||
    (orbitType === 'Mars' && provider.supportsMars) ||
    (orbitType === 'Beyond' && provider.supportsMars);

  // Check payload capacity
  let maxPayload = provider.maxPayloadLEO;
  if (orbitType === 'GTO' && provider.maxPayloadGTO) maxPayload = provider.maxPayloadGTO;
  if (orbitType === 'GEO' && provider.maxPayloadGEO) maxPayload = provider.maxPayloadGEO;
  if (orbitType === 'Lunar' && provider.maxPayloadGTO) maxPayload = provider.maxPayloadGTO * 0.3;
  if (orbitType === 'Mars' && provider.maxPayloadGTO) maxPayload = provider.maxPayloadGTO * 0.2;

  const supportsPayload = payloadMass <= maxPayload;
  const supportsCrewedMission = payloadType !== 'crewed' || provider.supportsCrewed;

  const orbitMultiplier = ORBIT_MULTIPLIERS[orbitType];
  const minCostPerKg = provider.costPerKgLEO.min * orbitMultiplier;
  const maxCostPerKg = provider.costPerKgLEO.max * orbitMultiplier;

  const minCost = Math.round(minCostPerKg * payloadMass);
  const maxCost = Math.round(maxCostPerKg * payloadMass);
  const typicalCost = Math.round((minCost + maxCost) / 2);

  const notes: string[] = [];
  if (!supportsOrbit) notes.push(`Does not support ${orbitType} orbit`);
  if (!supportsPayload) notes.push(`Payload exceeds capacity (max ${Math.round(maxPayload).toLocaleString()} kg)`);
  if (!supportsCrewedMission) notes.push('Not certified for crewed missions');
  if (provider.dedicatedCostM && typicalCost < provider.dedicatedCostM * 1_000_000) {
    notes.push(`Minimum dedicated mission: $${provider.dedicatedCostM}M`);
  }

  return {
    providerId: provider.id,
    providerName: provider.name,
    vehicleName: provider.vehicle,
    country: provider.country,
    minCost: Math.max(minCost, (provider.dedicatedCostM || 0) * 1_000_000 * 0.3),
    maxCost: Math.max(maxCost, (provider.dedicatedCostM || 0) * 1_000_000),
    typicalCost: Math.max(typicalCost, (provider.dedicatedCostM || 0) * 1_000_000 * 0.5),
    costPerKg: { min: minCostPerKg, max: maxCostPerKg },
    supportsOrbit,
    supportsPayload: supportsPayload && supportsCrewedMission,
    reliability: provider.reliability,
    notes: notes.length > 0 ? notes : [provider.notes],
  };
}

function calculateInsurance(
  payloadValue: number,
  orbitType: OrbitType,
  payloadType: PayloadType
): InsuranceEstimate {
  const factors = PAYLOAD_TYPE_FACTORS[payloadType];
  const orbitRisk = ORBIT_MULTIPLIERS[orbitType] / 2; // Higher orbit = higher risk

  // Launch insurance: 2-10% of payload value
  const launchMin = payloadValue * 0.02 * factors.insuranceMultiplier;
  const launchMax = payloadValue * 0.10 * factors.insuranceMultiplier * orbitRisk;
  const launchTypical = (launchMin + launchMax) / 2;

  // In-orbit insurance: 1-5% annual
  const inOrbitMin = payloadValue * 0.01 * factors.insuranceMultiplier * 0.8;
  const inOrbitMax = payloadValue * 0.05 * factors.insuranceMultiplier * orbitRisk;
  const inOrbitTypical = (inOrbitMin + inOrbitMax) / 2;

  // Third-party liability: 0.1-0.5%
  const liabilityMin = payloadValue * 0.001 * factors.insuranceMultiplier;
  const liabilityMax = payloadValue * 0.005 * factors.insuranceMultiplier;
  const liabilityTypical = (liabilityMin + liabilityMax) / 2;

  return {
    launchInsurance: { min: Math.round(launchMin), max: Math.round(launchMax), typical: Math.round(launchTypical) },
    inOrbitInsurance: { min: Math.round(inOrbitMin), max: Math.round(inOrbitMax), typical: Math.round(inOrbitTypical) },
    thirdPartyLiability: { min: Math.round(liabilityMin), max: Math.round(liabilityMax), typical: Math.round(liabilityTypical) },
    totalInsurance: {
      min: Math.round(launchMin + inOrbitMin + liabilityMin),
      max: Math.round(launchMax + inOrbitMax + liabilityMax),
      typical: Math.round(launchTypical + inOrbitTypical + liabilityTypical),
    },
  };
}

function calculateRegulatoryFees(
  orbitType: OrbitType,
  payloadType: PayloadType
): RegulatoryFeesEstimate {
  const factors = PAYLOAD_TYPE_FACTORS[payloadType];
  const complexity = factors.regComplexity;

  // FAA Launch License: $50K - $250K depending on complexity
  const faaLicenseFee = Math.round(50000 + 200000 * (complexity - 0.5));

  // FCC Filing Fees: $5K - $50K for spectrum coordination
  const fccFilingFee = payloadType === 'communications' || payloadType === 'navigation'
    ? Math.round(25000 * complexity)
    : 5000;

  // NOAA License: $10K - $50K for Earth observation
  const noaaLicenseFee = payloadType === 'earth_observation'
    ? Math.round(30000 * complexity)
    : 0;

  // ITU Filing: $10K - $100K for spectrum registration
  const ituFilingFee = payloadType === 'communications' || payloadType === 'navigation'
    ? Math.round(50000 * complexity)
    : payloadType === 'earth_observation' ? 15000 : 0;

  // Misc fees (environmental, safety reviews, etc.)
  const miscFees = Math.round(25000 * complexity);

  const notes: string[] = [];
  if (payloadType === 'military') notes.push('Additional DoD security clearances required');
  if (orbitType === 'GEO') notes.push('ITU orbital slot coordination required');
  if (payloadType === 'crewed') notes.push('NASA/FAA human spaceflight certification required');
  if (payloadType === 'earth_observation') notes.push('NOAA remote sensing license required');

  return {
    faaLicenseFee,
    fccFilingFee,
    noaaLicenseFee,
    ituFilingFee,
    miscFees,
    totalFees: faaLicenseFee + fccFilingFee + noaaLicenseFee + ituFilingFee + miscFees,
    notes: notes.length > 0 ? notes : ['Standard regulatory pathway'],
  };
}

// ────────────────────────────────────────
// API Handler
// ────────────────────────────────────────

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const payloadMass = parseFloat(searchParams.get('mass') || '1000');
    const orbitType = (searchParams.get('orbit') || 'LEO') as OrbitType;
    const payloadType = (searchParams.get('type') || 'communications') as PayloadType;
    const payloadValue = parseFloat(searchParams.get('value') || '100000000'); // Default $100M
    const includeInsurance = searchParams.get('insurance') !== 'false';
    const includeRegulatory = searchParams.get('regulatory') !== 'false';

    const input: CostEstimateRequest = {
      payloadMass,
      orbitType,
      payloadType,
      payloadValue,
      includeInsurance,
      includeRegulatory,
    };

    // Calculate costs for all providers
    const providerEstimates: ProviderCostEstimate[] = [];
    for (const provider of LAUNCH_PROVIDERS) {
      const estimate = calculateProviderCosts(provider, payloadMass, orbitType, payloadType);
      if (estimate) {
        providerEstimates.push(estimate);
      }
    }

    // Sort by typical cost (viable options first)
    providerEstimates.sort((a, b) => {
      // Viable providers first
      if (a.supportsOrbit && a.supportsPayload && !b.supportsOrbit && !b.supportsPayload) return -1;
      if (!a.supportsOrbit && !a.supportsPayload && b.supportsOrbit && b.supportsPayload) return 1;
      // Then by cost
      return a.typicalCost - b.typicalCost;
    });

    // Calculate insurance if requested
    const insurance = includeInsurance ? calculateInsurance(payloadValue, orbitType, payloadType) : null;

    // Calculate regulatory fees if requested
    const regulatoryFees = includeRegulatory ? calculateRegulatoryFees(orbitType, payloadType) : null;

    // Calculate summary
    const viableProviders = providerEstimates.filter(p => p.supportsOrbit && p.supportsPayload);
    const minLaunchCost = viableProviders.length > 0 ? Math.min(...viableProviders.map(p => p.minCost)) : 0;
    const maxLaunchCost = viableProviders.length > 0 ? Math.max(...viableProviders.map(p => p.maxCost)) : 0;
    const typicalLaunchCost = viableProviders.length > 0
      ? Math.round(viableProviders.reduce((sum, p) => sum + p.typicalCost, 0) / viableProviders.length)
      : 0;

    const summary: TotalCostSummary = {
      launchCost: { min: minLaunchCost, max: maxLaunchCost, typical: typicalLaunchCost },
      insurance,
      regulatoryFees,
      totalCost: {
        min: minLaunchCost + (insurance?.totalInsurance.min || 0) + (regulatoryFees?.totalFees || 0),
        max: maxLaunchCost + (insurance?.totalInsurance.max || 0) + (regulatoryFees?.totalFees || 0),
        typical: typicalLaunchCost + (insurance?.totalInsurance.typical || 0) + (regulatoryFees?.totalFees || 0),
      },
    };

    const response: CostEstimateResponse = {
      input,
      providers: providerEstimates,
      insurance,
      regulatoryFees,
      summary,
      generatedAt: new Date().toISOString(),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Failed to calculate mission cost:', error);
    return NextResponse.json(
      { error: 'Failed to calculate mission cost' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const payloadMass = body.payloadMass || 1000;
    const orbitType = (body.orbitType || 'LEO') as OrbitType;
    const payloadType = (body.payloadType || 'communications') as PayloadType;
    const payloadValue = body.payloadValue || 100000000;
    const includeInsurance = body.includeInsurance !== false;
    const includeRegulatory = body.includeRegulatory !== false;

    // Redirect to GET with params
    const url = new URL(request.url);
    url.searchParams.set('mass', payloadMass.toString());
    url.searchParams.set('orbit', orbitType);
    url.searchParams.set('type', payloadType);
    url.searchParams.set('value', payloadValue.toString());
    url.searchParams.set('insurance', includeInsurance.toString());
    url.searchParams.set('regulatory', includeRegulatory.toString());

    const response = await GET(new Request(url.toString()));
    return response;
  } catch (error) {
    console.error('Failed to calculate mission cost:', error);
    return NextResponse.json(
      { error: 'Failed to calculate mission cost' },
      { status: 500 }
    );
  }
}
