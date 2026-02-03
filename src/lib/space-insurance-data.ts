import prisma from './db';
import { InsuranceMissionType, InsuranceCoverageType, InsuranceStatus, InsurancePolicy, InsuranceMarketData } from '@/types';

// Seed data for insurance market history (2021-2025)
export const INSURANCE_MARKET_SEED = [
  {
    year: 2021,
    totalPremiums: 452,
    totalClaims: 241,
    lossRatio: 53.3,
    marketCapacity: 2.1,
    launchPremiums: 198,
    inOrbitPremiums: 187,
    liabilityPremiums: 67,
    avgPremiumRate: 6.8,
    largestClaim: 85,
    numberOfPolicies: 214,
  },
  {
    year: 2022,
    totalPremiums: 478,
    totalClaims: 563,
    lossRatio: 117.8,
    marketCapacity: 2.3,
    launchPremiums: 215,
    inOrbitPremiums: 191,
    liabilityPremiums: 72,
    avgPremiumRate: 8.9,
    largestClaim: 397,
    numberOfPolicies: 237,
  },
  {
    year: 2023,
    totalPremiums: 510,
    totalClaims: 289,
    lossRatio: 56.7,
    marketCapacity: 2.5,
    launchPremiums: 228,
    inOrbitPremiums: 204,
    liabilityPremiums: 78,
    avgPremiumRate: 10.2,
    largestClaim: 120,
    numberOfPolicies: 258,
  },
  {
    year: 2024,
    totalPremiums: 535,
    totalClaims: 312,
    lossRatio: 58.3,
    marketCapacity: 2.7,
    launchPremiums: 241,
    inOrbitPremiums: 212,
    liabilityPremiums: 82,
    avgPremiumRate: 9.5,
    largestClaim: 145,
    numberOfPolicies: 279,
  },
  {
    year: 2025,
    totalPremiums: 548,
    totalClaims: 198,
    lossRatio: 36.1,
    marketCapacity: 2.9,
    launchPremiums: 248,
    inOrbitPremiums: 218,
    liabilityPremiums: 82,
    avgPremiumRate: 7.4,
    largestClaim: 72,
    numberOfPolicies: 301,
  },
];

// Seed data for insurance policies
export const INSURANCE_POLICIES_SEED = [
  {
    slug: 'axa-xl-arabsat-7b-2023',
    missionType: 'launch',
    coverageType: 'full',
    insurer: 'AXA XL',
    country: 'SAU',
    premiumRate: 9.5,
    insuredValue: 310,
    premiumAmount: 29.45,
    deductible: 5,
    maxPayout: 310,
    missionName: 'Arabsat-7B',
    launchVehicle: 'Falcon 9',
    operator: 'Arabsat',
    yearWritten: 2023,
    claimFiled: false,
    status: 'expired',
  },
  {
    slug: 'swiss-re-ses-22-2024',
    missionType: 'launch',
    coverageType: 'full',
    insurer: 'Swiss Re Corporate Solutions',
    country: 'LUX',
    premiumRate: 8.2,
    insuredValue: 420,
    premiumAmount: 34.44,
    deductible: 8,
    maxPayout: 420,
    missionName: 'SES-22',
    launchVehicle: 'Atlas V',
    operator: 'SES',
    yearWritten: 2024,
    claimFiled: false,
    status: 'active',
  },
  {
    slug: 'scor-viasat3-americas-2023',
    missionType: 'launch',
    coverageType: 'full',
    insurer: 'SCOR',
    country: 'USA',
    premiumRate: 11.3,
    insuredValue: 740,
    premiumAmount: 83.62,
    deductible: 15,
    maxPayout: 740,
    missionName: 'ViaSat-3 Americas',
    launchVehicle: 'Falcon Heavy',
    operator: 'Viasat',
    yearWritten: 2023,
    claimFiled: true,
    claimAmount: 420,
    claimPaid: 385,
    claimReason: 'Deployment anomaly resulting in reduced satellite coverage and capacity',
    status: 'settled',
  },
  {
    slug: 'global-aerospace-starlink-group6-2024',
    missionType: 'launch',
    coverageType: 'partial',
    insurer: 'Global Aerospace',
    country: 'USA',
    premiumRate: 5.1,
    insuredValue: 95,
    premiumAmount: 4.85,
    deductible: 2,
    maxPayout: 80,
    missionName: 'Starlink Group 6-38',
    launchVehicle: 'Falcon 9',
    operator: 'SpaceX',
    yearWritten: 2024,
    claimFiled: false,
    status: 'expired',
  },
  {
    slug: 'hiscox-intelsat-40e-2022',
    missionType: 'in_orbit',
    coverageType: 'full',
    insurer: 'Hiscox',
    country: 'USA',
    premiumRate: 7.8,
    insuredValue: 380,
    premiumAmount: 29.64,
    deductible: 10,
    maxPayout: 380,
    missionName: 'Intelsat 40e',
    launchVehicle: null,
    operator: 'Intelsat',
    yearWritten: 2022,
    claimFiled: true,
    claimAmount: 195,
    claimPaid: 175,
    claimReason: 'Power subsystem degradation leading to reduced transponder capacity',
    status: 'settled',
  },
  {
    slug: 'axa-xl-eutelsat-36d-2025',
    missionType: 'in_orbit',
    coverageType: 'full',
    insurer: 'AXA XL',
    country: 'FRA',
    premiumRate: 6.4,
    insuredValue: 290,
    premiumAmount: 18.56,
    deductible: 5,
    maxPayout: 290,
    missionName: 'Eutelsat 36D',
    launchVehicle: null,
    operator: 'Eutelsat',
    yearWritten: 2025,
    claimFiled: false,
    status: 'active',
  },
  {
    slug: 'swiss-re-arianespace-liability-2024',
    missionType: 'liability',
    coverageType: 'excess',
    insurer: 'Swiss Re Corporate Solutions',
    country: 'FRA',
    premiumRate: 3.2,
    insuredValue: 500,
    premiumAmount: 16.0,
    deductible: 25,
    maxPayout: 500,
    missionName: 'Ariane 6 Third-Party Liability',
    launchVehicle: 'Ariane 6',
    operator: 'Arianespace',
    yearWritten: 2024,
    claimFiled: false,
    status: 'active',
  },
  {
    slug: 'scor-isro-pslv-2022',
    missionType: 'launch',
    coverageType: 'full',
    insurer: 'SCOR',
    country: 'IND',
    premiumRate: 10.7,
    insuredValue: 180,
    premiumAmount: 19.26,
    deductible: 4,
    maxPayout: 180,
    missionName: 'OneWeb India-2',
    launchVehicle: 'PSLV-XL',
    operator: 'ISRO / NewSpace India',
    yearWritten: 2022,
    claimFiled: true,
    claimAmount: 52,
    claimPaid: null,
    claimReason: 'Orbit injection shortfall affecting 2 of 36 satellites',
    status: 'claimed',
  },
];

// Average premium rate benchmarks by mission type (used for premium calculator)
const PREMIUM_RATE_BENCHMARKS: Record<string, { baseRate: number; riskMultiplier: number }> = {
  launch: { baseRate: 8.5, riskMultiplier: 1.0 },
  in_orbit: { baseRate: 5.5, riskMultiplier: 0.8 },
  liability: { baseRate: 3.0, riskMultiplier: 0.6 },
  third_party: { baseRate: 2.5, riskMultiplier: 0.5 },
  ground: { baseRate: 1.8, riskMultiplier: 0.4 },
};

// Initialize space insurance seed data
export async function initializeSpaceInsuranceData(): Promise<{ marketRecords: number; policies: number }> {
  let marketRecords = 0;
  let policies = 0;

  // Upsert market data by year
  for (const marketData of INSURANCE_MARKET_SEED) {
    try {
      await prisma.insuranceMarketData.upsert({
        where: { year: marketData.year },
        update: marketData,
        create: marketData,
      });
      marketRecords++;
    } catch (error) {
      console.error(`Failed to upsert insurance market data for year ${marketData.year}:`, error);
    }
  }

  // Upsert policies by slug
  for (const policyData of INSURANCE_POLICIES_SEED) {
    try {
      await prisma.insurancePolicy.upsert({
        where: { slug: policyData.slug },
        update: policyData,
        create: policyData,
      });
      policies++;
    } catch (error) {
      console.error(`Failed to upsert insurance policy ${policyData.slug}:`, error);
    }
  }

  return { marketRecords, policies };
}

// ----- Query Functions -----

// Return all market data ordered by year ascending
export async function getInsuranceMarketHistory(): Promise<InsuranceMarketData[]> {
  const records = await prisma.insuranceMarketData.findMany({
    orderBy: { year: 'asc' },
  });

  return records as InsuranceMarketData[];
}

// Return filtered insurance policies
export async function getInsurancePolicies(options?: {
  missionType?: InsuranceMissionType;
  status?: InsuranceStatus;
  limit?: number;
}): Promise<InsurancePolicy[]> {
  const where: Record<string, unknown> = {};

  if (options?.missionType) {
    where.missionType = options.missionType;
  }
  if (options?.status) {
    where.status = options.status;
  }

  const policies = await prisma.insurancePolicy.findMany({
    where,
    orderBy: { yearWritten: 'desc' },
    take: options?.limit || 50,
  });

  return policies.map((p) => ({
    ...p,
    missionType: p.missionType as InsuranceMissionType,
    coverageType: p.coverageType as InsuranceCoverageType,
    status: p.status as InsuranceStatus,
  }));
}

// Aggregate statistics across the insurance module
export async function getInsuranceStats(): Promise<{
  totalPremiums: number;
  avgLossRatio: number;
  activePolicies: number;
  largestClaim: number;
}> {
  const [marketData, activePolicies, largestClaimResult] = await Promise.all([
    prisma.insuranceMarketData.findMany(),
    prisma.insurancePolicy.count({ where: { status: 'active' } }),
    prisma.insurancePolicy.aggregate({
      _max: { claimPaid: true },
    }),
  ]);

  const totalPremiums = marketData.reduce((sum, m) => sum + m.totalPremiums, 0);
  const avgLossRatio =
    marketData.length > 0
      ? marketData.reduce((sum, m) => sum + m.lossRatio, 0) / marketData.length
      : 0;
  const largestClaim = largestClaimResult._max.claimPaid ?? 0;

  return {
    totalPremiums,
    avgLossRatio: Math.round(avgLossRatio * 10) / 10,
    activePolicies,
    largestClaim,
  };
}

// Simple premium estimator based on mission type benchmarks
export function calculatePremium(
  insuredValue: number,
  missionType: string
): {
  estimatedPremium: number;
  premiumRate: number;
  missionType: string;
  insuredValue: number;
} {
  const benchmark = PREMIUM_RATE_BENCHMARKS[missionType] ?? PREMIUM_RATE_BENCHMARKS.launch;
  const premiumRate = benchmark.baseRate * benchmark.riskMultiplier;
  const estimatedPremium = Math.round(insuredValue * (premiumRate / 100) * 100) / 100;

  return {
    estimatedPremium,
    premiumRate,
    missionType,
    insuredValue,
  };
}
