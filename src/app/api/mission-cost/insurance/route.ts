export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

// ────────────────────────────────────────
// Types
// ────────────────────────────────────────

export type OrbitType = 'LEO' | 'SSO' | 'GTO' | 'GEO' | 'Lunar' | 'Mars' | 'Beyond';
export type PayloadType = 'communications' | 'earth_observation' | 'technology_demo' | 'science' | 'navigation' | 'military' | 'crewed';
export type InsuranceCoverageType = 'launch' | 'in_orbit' | 'third_party' | 'comprehensive';

interface InsuranceQuote {
  coverageType: InsuranceCoverageType;
  name: string;
  description: string;
  rateMin: number;
  rateMax: number;
  rateTypical: number;
  premiumMin: number;
  premiumMax: number;
  premiumTypical: number;
  coverageStart: string;
  coverageEnd: string;
  exclusions: string[];
  factors: string[];
}

interface InsuranceProvider {
  id: string;
  name: string;
  type: string;
  headquarters: string;
  marketShare: number;
  specialties: string[];
  minCoverage: number;
  maxCoverage: number;
}

interface InsuranceRatesResponse {
  quotes: InsuranceQuote[];
  providers: InsuranceProvider[];
  marketOverview: {
    totalMarketSize: number;
    avgLaunchRate: number;
    avgInOrbitRate: number;
    avgLiabilityRate: number;
    annualPremiums: number;
    annualClaims: number;
    lossRatio: number;
  };
  input: {
    payloadValue: number;
    orbitType: OrbitType;
    payloadType: PayloadType;
    missionDuration: number;
    launchProvider: string | null;
    flightHeritage: string;
  };
}

// ────────────────────────────────────────
// Insurance Rate Data
// ────────────────────────────────────────

const BASE_RATES = {
  launch: { min: 0.02, max: 0.10, typical: 0.05 },
  inOrbit: { min: 0.01, max: 0.05, typical: 0.025 },
  thirdParty: { min: 0.001, max: 0.005, typical: 0.002 },
};

const ORBIT_RISK_MULTIPLIERS: Record<OrbitType, number> = {
  LEO: 1.0,
  SSO: 1.1,
  GTO: 1.4,
  GEO: 1.6,
  Lunar: 2.2,
  Mars: 3.0,
  Beyond: 4.0,
};

const PAYLOAD_TYPE_MULTIPLIERS: Record<PayloadType, number> = {
  communications: 1.0,
  earth_observation: 0.9,
  technology_demo: 1.4,
  science: 0.85,
  navigation: 1.1,
  military: 1.3,
  crewed: 3.5,
};

const FLIGHT_HERITAGE_MULTIPLIERS: Record<string, number> = {
  proven: 0.8,
  established: 0.9,
  operational: 1.0,
  new: 1.3,
  experimental: 1.8,
};

const INSURANCE_PROVIDERS: InsuranceProvider[] = [
  {
    id: 'swiss-re',
    name: 'Swiss Re',
    type: 'Reinsurer',
    headquarters: 'Zurich, Switzerland',
    marketShare: 15,
    specialties: ['Launch', 'In-orbit', 'GEO satellites'],
    minCoverage: 10000000,
    maxCoverage: 500000000,
  },
  {
    id: 'axa-xl',
    name: 'AXA XL',
    type: 'Primary Insurer',
    headquarters: 'London, UK',
    marketShare: 12,
    specialties: ['Launch', 'Liability', 'Constellation'],
    minCoverage: 5000000,
    maxCoverage: 300000000,
  },
  {
    id: 'munich-re',
    name: 'Munich Re',
    type: 'Reinsurer',
    headquarters: 'Munich, Germany',
    marketShare: 14,
    specialties: ['Launch', 'In-orbit', 'Large GEO'],
    minCoverage: 20000000,
    maxCoverage: 600000000,
  },
  {
    id: 'lloyds',
    name: "Lloyd's of London",
    type: 'Insurance Market',
    headquarters: 'London, UK',
    marketShare: 25,
    specialties: ['All space risks', 'Bespoke coverage'],
    minCoverage: 1000000,
    maxCoverage: 1000000000,
  },
  {
    id: 'starr',
    name: 'Starr Insurance',
    type: 'Primary Insurer',
    headquarters: 'New York, USA',
    marketShare: 8,
    specialties: ['Launch', 'Commercial smallsat'],
    minCoverage: 2000000,
    maxCoverage: 200000000,
  },
  {
    id: 'allianz',
    name: 'Allianz Space',
    type: 'Primary Insurer',
    headquarters: 'Munich, Germany',
    marketShare: 10,
    specialties: ['Launch', 'In-orbit', 'Ground segment'],
    minCoverage: 10000000,
    maxCoverage: 400000000,
  },
  {
    id: 'global-aerospace',
    name: 'Global Aerospace',
    type: 'Specialty Insurer',
    headquarters: 'London, UK',
    marketShare: 6,
    specialties: ['Launch', 'Liability'],
    minCoverage: 5000000,
    maxCoverage: 250000000,
  },
  {
    id: 'assure-space',
    name: 'Assure Space',
    type: 'MGU/Broker',
    headquarters: 'Bethesda, USA',
    marketShare: 5,
    specialties: ['Small satellites', 'Rideshare'],
    minCoverage: 500000,
    maxCoverage: 100000000,
  },
  {
    id: 'berkshire',
    name: 'Berkshire Hathaway',
    type: 'Reinsurer',
    headquarters: 'Omaha, USA',
    marketShare: 5,
    specialties: ['Excess layers', 'Large risks'],
    minCoverage: 50000000,
    maxCoverage: 800000000,
  },
];

// ────────────────────────────────────────
// API Handler
// ────────────────────────────────────────

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const payloadValue = parseFloat(searchParams.get('value') || '100000000');
    const orbitType = (searchParams.get('orbit') || 'LEO') as OrbitType;
    const payloadType = (searchParams.get('type') || 'communications') as PayloadType;
    const missionDuration = parseInt(searchParams.get('duration') || '5'); // years
    const launchProvider = searchParams.get('provider');
    const flightHeritage = searchParams.get('heritage') || 'operational';

    // Calculate multipliers
    const orbitMultiplier = ORBIT_RISK_MULTIPLIERS[orbitType];
    const payloadMultiplier = PAYLOAD_TYPE_MULTIPLIERS[payloadType];
    const heritageMultiplier = FLIGHT_HERITAGE_MULTIPLIERS[flightHeritage] || 1.0;

    const totalMultiplier = orbitMultiplier * payloadMultiplier * heritageMultiplier;

    // Generate quotes
    const quotes: InsuranceQuote[] = [
      {
        coverageType: 'launch',
        name: 'Pre-Launch & Launch Insurance',
        description: 'Covers satellite from ground handling through orbit insertion and commissioning',
        rateMin: BASE_RATES.launch.min * totalMultiplier,
        rateMax: BASE_RATES.launch.max * totalMultiplier,
        rateTypical: BASE_RATES.launch.typical * totalMultiplier,
        premiumMin: Math.round(payloadValue * BASE_RATES.launch.min * totalMultiplier),
        premiumMax: Math.round(payloadValue * BASE_RATES.launch.max * totalMultiplier),
        premiumTypical: Math.round(payloadValue * BASE_RATES.launch.typical * totalMultiplier),
        coverageStart: 'First movement from factory',
        coverageEnd: '30-90 days after launch (commissioning)',
        exclusions: [
          'War and terrorism',
          'Nuclear incidents',
          'Willful misconduct',
          'Pre-existing defects',
          'Cyber attacks (unless endorsed)',
        ],
        factors: [
          `Orbit type: ${orbitType} (${((orbitMultiplier - 1) * 100).toFixed(0)}% adjustment)`,
          `Payload type: ${payloadType} (${((payloadMultiplier - 1) * 100).toFixed(0)}% adjustment)`,
          `Flight heritage: ${flightHeritage} (${((heritageMultiplier - 1) * 100).toFixed(0)}% adjustment)`,
        ],
      },
      {
        coverageType: 'in_orbit',
        name: 'In-Orbit Insurance (Annual)',
        description: 'Covers operational satellite for partial or total loss during mission life',
        rateMin: BASE_RATES.inOrbit.min * orbitMultiplier * payloadMultiplier,
        rateMax: BASE_RATES.inOrbit.max * orbitMultiplier * payloadMultiplier,
        rateTypical: BASE_RATES.inOrbit.typical * orbitMultiplier * payloadMultiplier,
        premiumMin: Math.round(payloadValue * BASE_RATES.inOrbit.min * orbitMultiplier * payloadMultiplier),
        premiumMax: Math.round(payloadValue * BASE_RATES.inOrbit.max * orbitMultiplier * payloadMultiplier),
        premiumTypical: Math.round(payloadValue * BASE_RATES.inOrbit.typical * orbitMultiplier * payloadMultiplier),
        coverageStart: 'End of commissioning period',
        coverageEnd: `${missionDuration} year policy term`,
        exclusions: [
          'Gradual degradation',
          'End-of-life decommissioning',
          'Ground segment failures',
          'Revenue loss (unless endorsed)',
          'Debris damage from known objects',
        ],
        factors: [
          'Satellite bus heritage',
          'Propulsion system type',
          'Orbital environment (debris density)',
          'Operator track record',
          'Spacecraft redundancy design',
        ],
      },
      {
        coverageType: 'third_party',
        name: 'Third-Party Liability Insurance',
        description: 'Covers claims from third parties for property damage or bodily injury',
        rateMin: BASE_RATES.thirdParty.min * orbitMultiplier,
        rateMax: BASE_RATES.thirdParty.max * orbitMultiplier,
        rateTypical: BASE_RATES.thirdParty.typical * orbitMultiplier,
        premiumMin: Math.round(payloadValue * BASE_RATES.thirdParty.min * orbitMultiplier),
        premiumMax: Math.round(payloadValue * BASE_RATES.thirdParty.max * orbitMultiplier),
        premiumTypical: Math.round(payloadValue * BASE_RATES.thirdParty.typical * orbitMultiplier),
        coverageStart: 'Launch day',
        coverageEnd: 'Deorbit or graveyard disposal',
        exclusions: [
          'Intentional damage',
          'Pollution liability',
          'Employee claims',
          'Product liability',
          'Contractual liability',
        ],
        factors: [
          'Launch site location',
          'Flight path over populated areas',
          'Orbital altitude and inclination',
          'Reentry characteristics',
          'National licensing requirements',
        ],
      },
      {
        coverageType: 'comprehensive',
        name: 'Comprehensive Space Insurance Package',
        description: 'Combined launch, in-orbit (Year 1), and liability coverage',
        rateMin: (BASE_RATES.launch.min + BASE_RATES.inOrbit.min + BASE_RATES.thirdParty.min) * totalMultiplier * 0.9,
        rateMax: (BASE_RATES.launch.max + BASE_RATES.inOrbit.max + BASE_RATES.thirdParty.max) * totalMultiplier * 0.95,
        rateTypical: (BASE_RATES.launch.typical + BASE_RATES.inOrbit.typical + BASE_RATES.thirdParty.typical) * totalMultiplier * 0.92,
        premiumMin: Math.round(payloadValue * (BASE_RATES.launch.min + BASE_RATES.inOrbit.min + BASE_RATES.thirdParty.min) * totalMultiplier * 0.9),
        premiumMax: Math.round(payloadValue * (BASE_RATES.launch.max + BASE_RATES.inOrbit.max + BASE_RATES.thirdParty.max) * totalMultiplier * 0.95),
        premiumTypical: Math.round(payloadValue * (BASE_RATES.launch.typical + BASE_RATES.inOrbit.typical + BASE_RATES.thirdParty.typical) * totalMultiplier * 0.92),
        coverageStart: 'First movement from factory',
        coverageEnd: 'End of Year 1 operations',
        exclusions: [
          'All standard exclusions apply',
          'Consequential losses',
          'Business interruption (unless endorsed)',
        ],
        factors: [
          '5-10% bundling discount applied',
          'Single deductible across coverage types',
          'Streamlined claims process',
        ],
      },
    ];

    // Mission lifetime insurance cost
    const totalMissionLifetimeInsurance = {
      min: quotes[0].premiumMin + (quotes[1].premiumMin * missionDuration) + quotes[2].premiumMin,
      max: quotes[0].premiumMax + (quotes[1].premiumMax * missionDuration) + quotes[2].premiumMax,
      typical: quotes[0].premiumTypical + (quotes[1].premiumTypical * missionDuration) + quotes[2].premiumTypical,
    };

    const response: InsuranceRatesResponse = {
      quotes,
      providers: INSURANCE_PROVIDERS,
      marketOverview: {
        totalMarketSize: 550000000, // $550M annual premiums
        avgLaunchRate: 0.05,
        avgInOrbitRate: 0.025,
        avgLiabilityRate: 0.002,
        annualPremiums: 550000000,
        annualClaims: 300000000,
        lossRatio: 54.5,
      },
      input: {
        payloadValue,
        orbitType,
        payloadType,
        missionDuration,
        launchProvider,
        flightHeritage,
      },
    };

    return NextResponse.json({
      ...response,
      totalMissionLifetimeInsurance,
    });
  } catch (error) {
    logger.error('Failed to calculate insurance rates', { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json(
      { error: 'Failed to calculate insurance rates' },
      { status: 500 }
    );
  }
}
