import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import { unauthorizedError, validationError, internalError } from '@/lib/errors';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ChecklistItem {
  id: string;
  title: string;
  description: string;
  agency: string;
  processingDaysMin?: number;
  processingDaysMax?: number;
  applicationFeeMin?: number | null;
  applicationFeeMax?: number | null;
  regulatoryBasis?: string;
  sourceUrl?: string | null;
}

interface ChecklistCategory {
  id: string;
  label: string;
  description: string;
  items: ChecklistItem[];
}

interface Deadline {
  id: string;
  title: string;
  agency: string;
  type: 'comment_deadline' | 'effective_date';
  date: string;
  daysRemaining: number;
  sourceUrl?: string;
  status?: string;
}

// ---------------------------------------------------------------------------
// GET  — Load checklist categories + user progress
// ---------------------------------------------------------------------------

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return unauthorizedError();

    const userId = session.user.id;

    // Parallel queries: license types, license requirements, export controls,
    // proposed regulations, and the user's saved progress.
    const [
      allLicenseTypes,
      allLicenseRequirements,
      exportClassifications,
      upcomingRegulations,
      progress,
    ] = await Promise.all([
      prisma.spaceLicenseType.findMany({
        include: { agency: { select: { name: true, slug: true } } },
        orderBy: { name: 'asc' },
      }),
      prisma.licenseRequirement.findMany({
        orderBy: { licenseType: 'asc' },
      }),
      prisma.exportClassification.findMany({
        where: { regime: { in: ['ITAR', 'EAR'] } },
        orderBy: { classification: 'asc' },
        take: 5,
      }),
      prisma.proposedRegulation.findMany({
        where: {
          OR: [
            { commentDeadline: { gt: new Date() } },
            { effectiveDate: { gt: new Date() } },
          ],
        },
        orderBy: { publishedDate: 'desc' },
      }),
      prisma.complianceProgress.findFirst({
        where: { userId, companyId: null },
      }),
    ]);

    // -----------------------------------------------------------------------
    // Build categories dynamically from DB data
    // -----------------------------------------------------------------------

    const now = new Date();

    // 1. Launch Operations — FAA license types
    const launchOps: ChecklistItem[] = allLicenseTypes
      .filter((lt) => lt.agency.slug === 'faa-ast' || lt.agency.name.toUpperCase().includes('FAA'))
      .map((lt) => ({
        id: `license-${lt.id}`,
        title: lt.name,
        description: lt.description,
        agency: lt.agency.name,
        processingDaysMin: lt.processingDaysMin,
        processingDaysMax: lt.processingDaysMax,
        applicationFeeMin: lt.applicationFeeMin,
        applicationFeeMax: lt.applicationFeeMax,
        regulatoryBasis: lt.regulatoryBasis,
        sourceUrl: lt.applicationUrl,
      }));

    // 2. Satellite Operations — FCC license types
    const satelliteOps: ChecklistItem[] = allLicenseTypes
      .filter((lt) => lt.agency.slug === 'fcc' || lt.agency.name.toUpperCase().includes('FCC'))
      .map((lt) => ({
        id: `license-${lt.id}`,
        title: lt.name,
        description: lt.description,
        agency: lt.agency.name,
        processingDaysMin: lt.processingDaysMin,
        processingDaysMax: lt.processingDaysMax,
        applicationFeeMin: lt.applicationFeeMin,
        applicationFeeMax: lt.applicationFeeMax,
        regulatoryBasis: lt.regulatoryBasis,
        sourceUrl: lt.applicationUrl,
      }));

    // 3. Export Controls — ITAR/EAR classifications (top 5)
    const exportControls: ChecklistItem[] = exportClassifications.map((ec) => ({
      id: `export-${ec.id}`,
      title: `${ec.regime} ${ec.classification} — ${ec.name}`,
      description: ec.description,
      agency: ec.regime === 'ITAR' ? 'DDTC (ITAR)' : 'BIS (EAR)',
      regulatoryBasis: ec.controlReason || undefined,
      sourceUrl: ec.sourceUrl,
    }));

    // 4. Remote Sensing — LicenseRequirements where category = remote_sensing
    const remoteSensing: ChecklistItem[] = allLicenseRequirements
      .filter((lr) => lr.category === 'remote_sensing')
      .map((lr) => ({
        id: `req-${lr.id}`,
        title: lr.licenseType,
        description: lr.description,
        agency: lr.agency,
        processingDaysMin: lr.processingTimeMin,
        processingDaysMax: lr.processingTimeMax,
        applicationFeeMin: lr.applicationFee,
        applicationFeeMax: lr.applicationFee,
        regulatoryBasis: lr.regulatoryBasis,
        sourceUrl: lr.applicationUrl,
      }));

    // 5. Regulatory Deadlines — upcoming proposed regulations
    const regulatoryDeadlines: ChecklistItem[] = upcomingRegulations.map((reg) => {
      const deadline = reg.commentDeadline || reg.effectiveDate;
      const label = reg.commentDeadline && reg.commentDeadline > now
        ? 'Comment deadline'
        : 'Effective date';
      return {
        id: `reg-${reg.id}`,
        title: reg.title,
        description: `${label}: ${deadline ? deadline.toLocaleDateString('en-US') : 'TBD'} — ${reg.summary}`,
        agency: reg.agency,
        sourceUrl: reg.sourceUrl,
      };
    });

    const categories: ChecklistCategory[] = [
      {
        id: 'launch-operations',
        label: 'Launch Operations',
        description: 'FAA launch and reentry licenses',
        items: launchOps,
      },
      {
        id: 'satellite-operations',
        label: 'Satellite Operations',
        description: 'FCC space station and earth station licenses',
        items: satelliteOps,
      },
      {
        id: 'export-controls',
        label: 'Export Controls',
        description: 'ITAR and EAR export classifications',
        items: exportControls,
      },
      {
        id: 'remote-sensing',
        label: 'Remote Sensing',
        description: 'NOAA remote sensing license requirements',
        items: remoteSensing,
      },
      {
        id: 'regulatory-deadlines',
        label: 'Regulatory Deadlines',
        description: 'Upcoming comment deadlines and effective dates',
        items: regulatoryDeadlines,
      },
    ];

    // Build deadlines array from proposed regulations
    const deadlines: Deadline[] = upcomingRegulations
      .flatMap((reg) => {
        const out: Deadline[] = [];
        if (reg.commentDeadline && reg.commentDeadline > now) {
          const daysRemaining = Math.ceil(
            (reg.commentDeadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
          );
          out.push({
            id: `deadline-comment-${reg.id}`,
            title: reg.title,
            agency: reg.agency,
            type: 'comment_deadline',
            date: reg.commentDeadline.toISOString(),
            daysRemaining,
            sourceUrl: reg.commentUrl || reg.sourceUrl,
            status: reg.status,
          });
        }
        if (reg.effectiveDate && reg.effectiveDate > now) {
          const daysRemaining = Math.ceil(
            (reg.effectiveDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
          );
          out.push({
            id: `deadline-effective-${reg.id}`,
            title: reg.title,
            agency: reg.agency,
            type: 'effective_date',
            date: reg.effectiveDate.toISOString(),
            daysRemaining,
            sourceUrl: reg.sourceUrl,
            status: reg.status,
          });
        }
        return out;
      })
      .sort((a, b) => a.daysRemaining - b.daysRemaining);

    return NextResponse.json({
      categories,
      completedItems: progress?.completedItems ?? [],
      deadlines,
    });
  } catch (error) {
    logger.error('Failed to fetch compliance checklist', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to fetch compliance checklist.');
  }
}

// ---------------------------------------------------------------------------
// PATCH — Update completed items
// ---------------------------------------------------------------------------

export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return unauthorizedError();

    const body = await req.json();

    if (!body || !Array.isArray(body.completedItems)) {
      return validationError('completedItems must be an array of strings');
    }

    // Validate every element is a string
    const completedItems: string[] = body.completedItems;
    if (!completedItems.every((item: unknown) => typeof item === 'string')) {
      return validationError('Each completedItem must be a string');
    }

    const userId = session.user.id;

    // Prisma @@unique with nullable companyId: null values are distinct in SQL,
    // so upsert on the composite key doesn't work when companyId is null.
    // Use findFirst + update/create instead.
    const existing = await prisma.complianceProgress.findFirst({
      where: { userId, companyId: null },
    });

    if (existing) {
      await prisma.complianceProgress.update({
        where: { id: existing.id },
        data: { completedItems, lastUpdatedAt: new Date() },
      });
    } else {
      await prisma.complianceProgress.create({
        data: {
          userId,
          companyId: null,
          completedItems,
          lastUpdatedAt: new Date(),
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error('Failed to save compliance progress', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to save compliance progress.');
  }
}
