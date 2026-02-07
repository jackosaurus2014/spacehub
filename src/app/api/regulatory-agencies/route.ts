import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const agencySlug = searchParams.get('agency');
    const includeDetails = searchParams.get('details') === 'true';

    // If specific agency requested
    if (agencySlug) {
      const agency = await prisma.regulatoryAgency.findUnique({
        where: { slug: agencySlug },
        include: {
          licenseTypes: true,
          ruleChanges: {
            orderBy: { effectiveDate: 'desc' },
            take: 10,
          },
        },
      });

      if (!agency) {
        return NextResponse.json(
          { error: 'Agency not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        agency: {
          ...agency,
          keyStatutes: JSON.parse(agency.keyStatutes || '[]'),
          keyRegulations: JSON.parse(agency.keyRegulations || '[]'),
          licenseTypes: agency.licenseTypes.map((lt) => ({
            ...lt,
            applicableTo: JSON.parse(lt.applicableTo || '[]'),
            keyRequirements: JSON.parse(lt.keyRequirements || '[]'),
            guidanceDocuments: lt.guidanceDocuments ? JSON.parse(lt.guidanceDocuments) : [],
            recentChanges: lt.recentChanges ? JSON.parse(lt.recentChanges) : [],
          })),
          ruleChanges: agency.ruleChanges.map((rc) => ({
            ...rc,
            impactAreas: JSON.parse(rc.impactAreas || '[]'),
            keyChanges: JSON.parse(rc.keyChanges || '[]'),
          })),
        },
      });
    }

    // Get all agencies
    const agencies = await prisma.regulatoryAgency.findMany({
      include: includeDetails
        ? {
            licenseTypes: true,
            ruleChanges: {
              orderBy: { effectiveDate: 'desc' },
              take: 5,
            },
          }
        : {
            _count: {
              select: {
                licenseTypes: true,
                ruleChanges: true,
              },
            },
          },
      orderBy: { name: 'asc' },
    });

    // Get treaties
    const treaties = await prisma.internationalSpaceTreaty.findMany({
      orderBy: { adoptedDate: 'asc' },
    });

    // Get summary stats
    const [licenseTypeCount, ruleChangeCount, treatyCount] = await Promise.all([
      prisma.spaceLicenseType.count(),
      prisma.regulatoryRuleChange.count(),
      prisma.internationalSpaceTreaty.count(),
    ]);

    // Get recent rule changes
    const recentChanges = await prisma.regulatoryRuleChange.findMany({
      include: { agency: true },
      orderBy: { effectiveDate: 'desc' },
      take: 10,
    });

    return NextResponse.json({
      agencies: agencies.map((a: any) => ({
        ...a,
        keyStatutes: JSON.parse(a.keyStatutes || '[]'),
        keyRegulations: JSON.parse(a.keyRegulations || '[]'),
        ...(includeDetails && a.licenseTypes
          ? {
              licenseTypes: a.licenseTypes.map((lt: any) => ({
                ...lt,
                applicableTo: JSON.parse(lt.applicableTo || '[]'),
                keyRequirements: JSON.parse(lt.keyRequirements || '[]'),
              })),
            }
          : {}),
        ...(includeDetails && a.ruleChanges
          ? {
              ruleChanges: a.ruleChanges.map((rc: any) => ({
                ...rc,
                impactAreas: JSON.parse(rc.impactAreas || '[]'),
                keyChanges: JSON.parse(rc.keyChanges || '[]'),
              })),
            }
          : {}),
      })),
      treaties: treaties.map((t) => ({
        ...t,
        keyProvisions: JSON.parse(t.keyProvisions || '[]'),
        commercialImplications: JSON.parse(t.commercialImplications || '[]'),
      })),
      recentChanges: recentChanges.map((rc) => ({
        ...rc,
        impactAreas: JSON.parse(rc.impactAreas || '[]'),
        keyChanges: JSON.parse(rc.keyChanges || '[]'),
      })),
      stats: {
        totalAgencies: agencies.length,
        totalLicenseTypes: licenseTypeCount,
        totalRuleChanges: ruleChangeCount,
        totalTreaties: treatyCount,
      },
    });
  } catch (error) {
    logger.error('Error fetching regulatory agencies', { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json(
      { error: 'Failed to fetch regulatory agencies data' },
      { status: 500 }
    );
  }
}
