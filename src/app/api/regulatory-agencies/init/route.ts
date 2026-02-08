import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { requireCronSecret } from '@/lib/errors';
import {
  REGULATORY_AGENCIES,
  FAA_LICENSE_TYPES,
  FCC_LICENSE_TYPES,
  NOAA_LICENSE_TYPES,
  INTERNATIONAL_TREATIES,
  RECENT_RULE_CHANGES,
  FINANCIAL_RESPONSIBILITY_REQUIREMENTS,
} from '@/lib/regulatory-agencies-data';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const authError = requireCronSecret(request);
  if (authError) return authError;

  try {
    let agenciesCount = 0;
    let licenseTypesCount = 0;
    let treatiesCount = 0;
    let ruleChangesCount = 0;
    let financialResponsibilityCount = 0;

    // Initialize regulatory agencies
    for (const agencyData of REGULATORY_AGENCIES) {
      try {
        await prisma.regulatoryAgency.upsert({
          where: { slug: agencyData.slug },
          update: {
            name: agencyData.name,
            fullName: agencyData.fullName,
            parentAgency: agencyData.parentAgency,
            jurisdiction: agencyData.jurisdiction,
            website: agencyData.website,
            contactEmail: agencyData.contactEmail || null,
            description: agencyData.description,
            keyStatutes: JSON.stringify(agencyData.keyStatutes),
            keyRegulations: JSON.stringify(agencyData.keyRegulations),
          },
          create: {
            slug: agencyData.slug,
            name: agencyData.name,
            fullName: agencyData.fullName,
            parentAgency: agencyData.parentAgency,
            jurisdiction: agencyData.jurisdiction,
            website: agencyData.website,
            contactEmail: agencyData.contactEmail || null,
            description: agencyData.description,
            keyStatutes: JSON.stringify(agencyData.keyStatutes),
            keyRegulations: JSON.stringify(agencyData.keyRegulations),
          },
        });
        agenciesCount++;
      } catch (error) {
        logger.error(`Failed to save agency ${agencyData.slug}`, { error: error instanceof Error ? error.message : String(error) });
      }
    }

    // Get agency IDs for license types
    const agencyMap = new Map<string, string>();
    const agencies = await prisma.regulatoryAgency.findMany({
      select: { id: true, slug: true },
    });
    agencies.forEach((a) => agencyMap.set(a.slug, a.id));

    // Initialize license types
    const allLicenseTypes = [...FAA_LICENSE_TYPES, ...FCC_LICENSE_TYPES, ...NOAA_LICENSE_TYPES];
    for (const licenseData of allLicenseTypes) {
      try {
        // Map agency ID from slug
        const agencySlug = licenseData.agencyId.replace('_', '-');
        const agencyId = agencyMap.get(agencySlug);
        if (!agencyId) {
          logger.warn(`Agency not found for license ${licenseData.slug}`, { agencySlug });
          continue;
        }

        await prisma.spaceLicenseType.upsert({
          where: { slug: licenseData.slug },
          update: {
            agencyId,
            name: licenseData.name,
            description: licenseData.description,
            regulatoryBasis: licenseData.regulatoryBasis,
            applicableTo: JSON.stringify(licenseData.applicableTo),
            processingDaysMin: licenseData.estimatedProcessingDays.min,
            processingDaysMax: licenseData.estimatedProcessingDays.max,
            validityYears: licenseData.validityPeriodYears,
            isRenewable: licenseData.isRenewable,
            applicationFeeMin: licenseData.estimatedCostUSD?.min || null,
            applicationFeeMax: licenseData.estimatedCostUSD?.max || null,
            keyRequirements: JSON.stringify(licenseData.keyRequirements),
            guidanceDocuments: licenseData.guidanceDocuments
              ? JSON.stringify(licenseData.guidanceDocuments)
              : null,
            recentChanges: licenseData.recentChanges
              ? JSON.stringify(licenseData.recentChanges)
              : null,
            applicationUrl: licenseData.applicationUrl || null,
            notes: licenseData.notes || null,
            effectiveDate: licenseData.effectiveDate
              ? new Date(licenseData.effectiveDate)
              : null,
          },
          create: {
            slug: licenseData.slug,
            agencyId,
            name: licenseData.name,
            description: licenseData.description,
            regulatoryBasis: licenseData.regulatoryBasis,
            applicableTo: JSON.stringify(licenseData.applicableTo),
            processingDaysMin: licenseData.estimatedProcessingDays.min,
            processingDaysMax: licenseData.estimatedProcessingDays.max,
            validityYears: licenseData.validityPeriodYears,
            isRenewable: licenseData.isRenewable,
            applicationFeeMin: licenseData.estimatedCostUSD?.min || null,
            applicationFeeMax: licenseData.estimatedCostUSD?.max || null,
            keyRequirements: JSON.stringify(licenseData.keyRequirements),
            guidanceDocuments: licenseData.guidanceDocuments
              ? JSON.stringify(licenseData.guidanceDocuments)
              : null,
            recentChanges: licenseData.recentChanges
              ? JSON.stringify(licenseData.recentChanges)
              : null,
            applicationUrl: licenseData.applicationUrl || null,
            notes: licenseData.notes || null,
            effectiveDate: licenseData.effectiveDate
              ? new Date(licenseData.effectiveDate)
              : null,
          },
        });
        licenseTypesCount++;
      } catch (error) {
        logger.error(`Failed to save license type ${licenseData.slug}`, { error: error instanceof Error ? error.message : String(error) });
      }
    }

    // Initialize international treaties
    for (const treatyData of INTERNATIONAL_TREATIES) {
      try {
        await prisma.internationalSpaceTreaty.upsert({
          where: { slug: treatyData.slug },
          update: {
            name: treatyData.name,
            fullName: treatyData.fullName,
            depositaryOrg: treatyData.depositaryOrganization,
            adoptedDate: new Date(treatyData.adoptedDate),
            entryIntoForce: new Date(treatyData.entryIntoForceDate),
            numberOfParties: treatyData.numberOfParties,
            keyProvisions: JSON.stringify(treatyData.keyProvisions),
            commercialImplications: JSON.stringify(treatyData.commercialSpaceImplications),
            usImplementation: treatyData.usImplementation,
            sourceUrl: treatyData.sourceUrl,
          },
          create: {
            slug: treatyData.slug,
            name: treatyData.name,
            fullName: treatyData.fullName,
            depositaryOrg: treatyData.depositaryOrganization,
            adoptedDate: new Date(treatyData.adoptedDate),
            entryIntoForce: new Date(treatyData.entryIntoForceDate),
            numberOfParties: treatyData.numberOfParties,
            keyProvisions: JSON.stringify(treatyData.keyProvisions),
            commercialImplications: JSON.stringify(treatyData.commercialSpaceImplications),
            usImplementation: treatyData.usImplementation,
            sourceUrl: treatyData.sourceUrl,
          },
        });
        treatiesCount++;
      } catch (error) {
        logger.error(`Failed to save treaty ${treatyData.slug}`, { error: error instanceof Error ? error.message : String(error) });
      }
    }

    // Initialize recent rule changes
    for (const ruleData of RECENT_RULE_CHANGES) {
      try {
        const agencySlug = ruleData.agencyId.replace('_', '-');
        const agencyId = agencyMap.get(agencySlug);
        if (!agencyId) {
          logger.warn(`Agency not found for rule change ${ruleData.slug}`, { agencySlug });
          continue;
        }

        await prisma.regulatoryRuleChange.upsert({
          where: { slug: ruleData.slug },
          update: {
            agencyId,
            title: ruleData.title,
            summary: ruleData.summary,
            federalRegisterCitation: ruleData.federalRegisterCitation || null,
            effectiveDate: new Date(ruleData.effectiveDate),
            impactAreas: JSON.stringify(ruleData.impactAreas),
            keyChanges: JSON.stringify(ruleData.keyChanges),
            status: ruleData.status,
            sourceUrl: ruleData.sourceUrl,
          },
          create: {
            slug: ruleData.slug,
            agencyId,
            title: ruleData.title,
            summary: ruleData.summary,
            federalRegisterCitation: ruleData.federalRegisterCitation || null,
            effectiveDate: new Date(ruleData.effectiveDate),
            impactAreas: JSON.stringify(ruleData.impactAreas),
            keyChanges: JSON.stringify(ruleData.keyChanges),
            status: ruleData.status,
            sourceUrl: ruleData.sourceUrl,
          },
        });
        ruleChangesCount++;
      } catch (error) {
        logger.error(`Failed to save rule change ${ruleData.slug}`, { error: error instanceof Error ? error.message : String(error) });
      }
    }

    // Initialize financial responsibility requirements
    for (const finReqData of FINANCIAL_RESPONSIBILITY_REQUIREMENTS) {
      try {
        await prisma.financialResponsibility.upsert({
          where: { slug: finReqData.id },
          update: {
            agencyId: finReqData.agencyId,
            name: finReqData.name,
            description: finReqData.description,
            thirdPartyMax: finReqData.thirdPartyMaximum,
            governmentMax: finReqData.governmentPropertyMaximum,
            determinationBasis: finReqData.determinationBasis,
            alternatives: JSON.stringify(finReqData.alternatives),
            notes: finReqData.notes || null,
          },
          create: {
            slug: finReqData.id,
            agencyId: finReqData.agencyId,
            name: finReqData.name,
            description: finReqData.description,
            thirdPartyMax: finReqData.thirdPartyMaximum,
            governmentMax: finReqData.governmentPropertyMaximum,
            determinationBasis: finReqData.determinationBasis,
            alternatives: JSON.stringify(finReqData.alternatives),
            notes: finReqData.notes || null,
          },
        });
        financialResponsibilityCount++;
      } catch (error) {
        logger.error(`Failed to save financial responsibility ${finReqData.id}`, { error: error instanceof Error ? error.message : String(error) });
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Regulatory agencies data initialized successfully',
      counts: {
        agencies: agenciesCount,
        licenseTypes: licenseTypesCount,
        treaties: treatiesCount,
        ruleChanges: ruleChangesCount,
        financialResponsibility: financialResponsibilityCount,
      },
    });
  } catch (error) {
    logger.error('Error initializing regulatory agencies data', { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json(
      { error: 'Failed to initialize regulatory agencies data' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const [agencies, licenseTypes, treaties, ruleChanges, financialResponsibility] = await Promise.all([
      prisma.regulatoryAgency.count(),
      prisma.spaceLicenseType.count(),
      prisma.internationalSpaceTreaty.count(),
      prisma.regulatoryRuleChange.count(),
      prisma.financialResponsibility.count(),
    ]);

    return NextResponse.json({
      initialized: agencies > 0,
      counts: {
        agencies,
        licenseTypes,
        treaties,
        ruleChanges,
        financialResponsibility,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to check initialization status' },
      { status: 500 }
    );
  }
}
