// ─── SAM.gov Contract Awards API Integration ────────────────────────────────
// Fetches historical contract award data including competition intelligence.
// Captures: who won, how much, which agency, AND how many companies bid.
// API docs: https://open.gsa.gov/api/contract-awards/
// This replaces the deprecated FPDS.gov (merged into SAM.gov Feb 2026).

import prisma from '@/lib/db';
import { logger } from '../logger';
import { upsertContent } from '../dynamic-content';

const AWARDS_URL = 'https://api.sam.gov/prod/contractdata/v1/awards';

// Space-related NAICS codes
const SPACE_NAICS = [
  '336414', // Guided missile and space vehicle manufacturing
  '336415', // Guided missile and space vehicle propulsion unit
  '336419', // Other guided missile and space vehicle parts
  '517410', // Satellite telecommunications
  '541715', // R&D in physical, engineering, and life sciences
  '927110', // Space research and technology (NASA)
  '334511', // Search/detection/navigation/guidance systems
  '334220', // Broadcasting and satellite equipment
];

// Company name → CompanyProfile slug aliases for matching
const COMPANY_ALIASES: Record<string, string> = {
  'SPACE EXPLORATION TECHNOLOGIES CORP': 'spacex',
  'SPACEX': 'spacex',
  'ROCKET LAB USA INC': 'rocket-lab',
  'ROCKET LAB': 'rocket-lab',
  'BLUE ORIGIN LLC': 'blue-origin',
  'BLUE ORIGIN': 'blue-origin',
  'NORTHROP GRUMMAN CORPORATION': 'northrop-grumman',
  'NORTHROP GRUMMAN': 'northrop-grumman',
  'LOCKHEED MARTIN CORPORATION': 'lockheed-martin',
  'LOCKHEED MARTIN': 'lockheed-martin',
  'THE BOEING COMPANY': 'boeing',
  'BOEING': 'boeing',
  'L3HARRIS TECHNOLOGIES INC': 'l3harris',
  'L3HARRIS': 'l3harris',
  'BALL AEROSPACE & TECHNOLOGIES CORP': 'ball-aerospace',
  'RAYTHEON TECHNOLOGIES CORPORATION': 'rtx',
  'UNITED LAUNCH ALLIANCE LLC': 'ula',
  'AEROJET ROCKETDYNE INC': 'aerojet-rocketdyne',
  'MAXAR TECHNOLOGIES INC': 'maxar',
  'RELATIVITY SPACE INC': 'relativity-space',
  'FIREFLY AEROSPACE INC': 'firefly-aerospace',
  'ASTROBOTIC TECHNOLOGY INC': 'astrobotic',
  'INTUITIVE MACHINES LLC': 'intuitive-machines',
  'SIERRA SPACE LLC': 'sierra-space',
  'AXIOM SPACE INC': 'axiom-space',
  'PLANET LABS PBC': 'planet-labs',
  'SPIRE GLOBAL INC': 'spire-global',
  'VIASAT INC': 'viasat',
  'SES S.A.': 'ses',
};

interface EnhancedContractAward {
  awardId: string;
  contractNumber: string;
  vendorName: string;
  vendorUei: string;
  vendorCageCode: string;
  awardAmount: number;
  ceilingAmount: number;
  agencyName: string;
  description: string;
  awardDate: string;
  naicsCode: string;
  pscCode: string;
  placeOfPerformance: string;
  contractType: string;
  setAside: string;
  // Competition intelligence
  numberOfOffers: number | null;
  extentCompeted: string;
  competitionType: string;
}

async function matchCompanyProfile(vendorName: string, vendorUei?: string): Promise<string | null> {
  // Try UEI match first
  if (vendorUei) {
    const byUei = await prisma.companyProfile.findFirst({
      where: { samUei: vendorUei },
      select: { id: true },
    });
    if (byUei) return byUei.id;
  }

  // Try alias match
  const upperName = vendorName.toUpperCase().trim();
  const aliasSlug = COMPANY_ALIASES[upperName];
  if (aliasSlug) {
    const bySlug = await prisma.companyProfile.findUnique({
      where: { slug: aliasSlug },
      select: { id: true },
    });
    if (bySlug) return bySlug.id;
  }

  // Try exact name match (case-insensitive)
  const byName = await prisma.companyProfile.findFirst({
    where: { name: { equals: vendorName, mode: 'insensitive' } },
    select: { id: true },
  });
  if (byName) return byName.id;

  return null;
}

/**
 * Fetch recent space-related contract awards from SAM.gov with competition intelligence.
 * Stores directly in GovernmentContractAward model AND DynamicContent cache.
 * Runs weekly via cron scheduler.
 */
export async function fetchSpaceContractAwards(): Promise<number> {
  const apiKey = process.env.SAM_GOV_API_KEY;
  if (!apiKey) {
    logger.debug('SAM_GOV_API_KEY not set — skipping contract awards fetch');
    return 0;
  }

  const allAwards: EnhancedContractAward[] = [];

  for (const naics of SPACE_NAICS) {
    try {
      const params = new URLSearchParams({
        api_key: apiKey,
        naicsCode: naics,
        limit: '50',
        offset: '0',
      });

      const res = await fetch(`${AWARDS_URL}?${params}`, {
        signal: AbortSignal.timeout(20000),
      });

      if (!res.ok) {
        logger.debug('SAM.gov awards fetch failed for NAICS ' + naics, { status: res.status });
        continue;
      }

      const data = await res.json();
      const awards = data?.data || data?.results || [];

      for (const award of awards) {
        const competition = award.competitionInformation || {};
        const vendor = award.vendorInformation || award;

        allAwards.push({
          awardId: award.awardId || award.piid || `sam-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          contractNumber: award.piid || award.contractNumber || '',
          vendorName: vendor.vendorName || vendor.recipientName || award.vendorName || 'Unknown',
          vendorUei: vendor.ueiSAM || vendor.vendorUEI || '',
          vendorCageCode: vendor.cageCode || '',
          awardAmount: parseFloat(award.totalObligatedAmount || award.awardAmount || '0'),
          ceilingAmount: parseFloat(award.baseAndAllOptionsValue || award.ultimateContractValue || '0'),
          agencyName: award.agencyName || award.fundingAgencyName || '',
          description: (award.descriptionOfContractRequirement || award.description || '').slice(0, 500),
          awardDate: award.signedDate || award.awardDate || '',
          naicsCode: naics,
          pscCode: award.pscCode || award.productOrServiceCode || '',
          placeOfPerformance: [
            award.placeOfPerformanceCity,
            award.placeOfPerformanceState,
          ].filter(Boolean).join(', '),
          contractType: award.contractType || award.typeOfContractPricing || '',
          setAside: award.typeOfSetAside || award.setAsideType || '',
          // Competition intelligence
          numberOfOffers: competition.numberOfOffersReceived
            ? parseInt(competition.numberOfOffersReceived, 10)
            : (award.numberOfOffersReceived ? parseInt(award.numberOfOffersReceived, 10) : null),
          extentCompeted: competition.extentCompeted || award.extentCompeted || '',
          competitionType: competition.solicitationProcedures || '',
        });
      }
    } catch (err) {
      logger.debug('SAM.gov awards error for NAICS ' + naics, { error: String(err) });
    }
  }

  // Store in GovernmentContractAward model with company matching
  let matchedCount = 0;
  for (const award of allAwards) {
    if (!award.contractNumber) continue;
    try {
      const companyId = await matchCompanyProfile(award.vendorName, award.vendorUei);
      if (companyId) matchedCount++;

      await prisma.governmentContractAward.upsert({
        where: { contractNumber: award.contractNumber },
        update: {
          value: award.awardAmount || undefined,
          ceiling: award.ceilingAmount || undefined,
          numberOfOffers: award.numberOfOffers,
          extentCompeted: award.extentCompeted || undefined,
          competitionType: award.competitionType || undefined,
          pscCode: award.pscCode || undefined,
        },
        create: {
          companyId: companyId,
          companyName: award.vendorName,
          contractNumber: award.contractNumber,
          agency: award.agencyName,
          title: award.description.slice(0, 200) || award.contractNumber,
          description: award.description,
          awardDate: award.awardDate ? new Date(award.awardDate) : null,
          value: award.awardAmount || null,
          ceiling: award.ceilingAmount || null,
          type: award.contractType || null,
          naicsCode: award.naicsCode,
          setAside: award.setAside || null,
          placeOfPerformance: award.placeOfPerformance || null,
          numberOfOffers: award.numberOfOffers,
          extentCompeted: award.extentCompeted || null,
          competitionType: award.competitionType || null,
          pscCode: award.pscCode || null,
          source: 'sam.gov',
        },
      });
    } catch (err) {
      // Skip duplicate/constraint errors silently
      if (!(err instanceof Error && err.message.includes('Unique constraint'))) {
        logger.debug('Failed to upsert contract award', { contractNumber: award.contractNumber, error: String(err) });
      }
    }
  }

  // Also store in DynamicContent cache for legacy compatibility
  if (allAwards.length > 0) {
    await upsertContent(
      'procurement:sam-awards:recent-space-contracts',
      'procurement',
      'sam-awards',
      allAwards.slice(0, 100),
      { sourceType: 'api', sourceUrl: 'https://sam.gov' },
    );
  }

  logger.info('SAM.gov contract awards fetched', {
    total: allAwards.length,
    matchedToProfiles: matchedCount,
    naicsCodes: SPACE_NAICS.length,
  });
  return allAwards.length;
}
