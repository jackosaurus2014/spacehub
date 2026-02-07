import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const agencySlug = searchParams.get('agency');
    const licenseSlug = searchParams.get('license');

    // If specific license requested
    if (licenseSlug) {
      const license = await prisma.spaceLicenseType.findUnique({
        where: { slug: licenseSlug },
        include: { agency: true },
      });

      if (!license) {
        return NextResponse.json(
          { error: 'License type not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        license: {
          ...license,
          applicableTo: JSON.parse(license.applicableTo || '[]'),
          keyRequirements: JSON.parse(license.keyRequirements || '[]'),
          guidanceDocuments: license.guidanceDocuments
            ? JSON.parse(license.guidanceDocuments)
            : [],
          recentChanges: license.recentChanges
            ? JSON.parse(license.recentChanges)
            : [],
          agency: {
            ...license.agency,
            keyStatutes: JSON.parse(license.agency.keyStatutes || '[]'),
            keyRegulations: JSON.parse(license.agency.keyRegulations || '[]'),
          },
        },
      });
    }

    // Build query
    const where: any = {};
    if (agencySlug) {
      const agency = await prisma.regulatoryAgency.findUnique({
        where: { slug: agencySlug },
        select: { id: true },
      });
      if (agency) {
        where.agencyId = agency.id;
      }
    }

    // Get all license types
    const licenseTypes = await prisma.spaceLicenseType.findMany({
      where,
      include: { agency: true },
      orderBy: [{ agency: { name: 'asc' } }, { name: 'asc' }],
    });

    // Group by agency
    const byAgency = licenseTypes.reduce((acc, lt) => {
      const agencyName = lt.agency.name;
      if (!acc[agencyName]) {
        acc[agencyName] = {
          agency: {
            id: lt.agency.id,
            slug: lt.agency.slug,
            name: lt.agency.name,
            fullName: lt.agency.fullName,
            website: lt.agency.website,
          },
          licenses: [],
        };
      }
      acc[agencyName].licenses.push({
        id: lt.id,
        slug: lt.slug,
        name: lt.name,
        description: lt.description,
        regulatoryBasis: lt.regulatoryBasis,
        applicableTo: JSON.parse(lt.applicableTo || '[]'),
        processingDays: {
          min: lt.processingDaysMin,
          max: lt.processingDaysMax,
        },
        validityYears: lt.validityYears,
        isRenewable: lt.isRenewable,
        applicationFee: lt.applicationFeeMin
          ? {
              min: lt.applicationFeeMin,
              max: lt.applicationFeeMax,
            }
          : null,
        applicationUrl: lt.applicationUrl,
        keyRequirements: JSON.parse(lt.keyRequirements || '[]'),
      });
      return acc;
    }, {} as Record<string, any>);

    // Get summary statistics
    const stats = {
      total: licenseTypes.length,
      byAgency: Object.entries(byAgency).map(([name, data]: [string, any]) => ({
        agency: name,
        count: data.licenses.length,
      })),
      avgProcessingDays: Math.round(
        licenseTypes.reduce((sum, lt) => sum + (lt.processingDaysMin + lt.processingDaysMax) / 2, 0) /
          licenseTypes.length
      ),
      withFees: licenseTypes.filter((lt) => lt.applicationFeeMin !== null).length,
    };

    return NextResponse.json({
      licenseTypes: Object.values(byAgency),
      stats,
    });
  } catch (error) {
    logger.error('Error fetching license types', { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json(
      { error: 'Failed to fetch license types' },
      { status: 500 }
    );
  }
}
