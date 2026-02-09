import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import { internalError, validationError, createSuccessResponse } from '@/lib/errors';
import { requireCronSecret } from '@/lib/errors';
import { validateSearchParams, procurementQuerySchema } from '@/lib/validations';
import { fetchSAMOpportunities } from '@/lib/procurement/sam-gov';
import { Prisma } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const validation = validateSearchParams(procurementQuerySchema, searchParams);

    if (!validation.success) {
      return validationError('Invalid query parameters', validation.errors);
    }

    const { agency, naicsCode, setAside, type, minValue, maxValue, search, deadlineAfter, limit, offset } = validation.data;

    // Build Prisma where clause
    const where: Prisma.ProcurementOpportunityWhereInput = {
      isActive: true,
    };

    if (agency) {
      where.agency = { contains: agency, mode: 'insensitive' };
    }
    if (naicsCode) {
      where.naicsCode = naicsCode;
    }
    if (setAside) {
      where.setAside = { contains: setAside, mode: 'insensitive' };
    }
    if (type) {
      where.type = type;
    }
    if (minValue !== undefined || maxValue !== undefined) {
      const valueFilter: Record<string, number> = {};
      if (minValue !== undefined) valueFilter.gte = minValue;
      if (maxValue !== undefined) valueFilter.lte = maxValue;
      where.estimatedValue = valueFilter;
    }
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { awardee: { contains: search, mode: 'insensitive' } },
        { solicitationNumber: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (deadlineAfter) {
      where.responseDeadline = { gte: deadlineAfter };
    }

    const [opportunities, total] = await Promise.all([
      prisma.procurementOpportunity.findMany({
        where,
        orderBy: { postedDate: 'desc' },
        take: limit,
        skip: offset,
        select: {
          id: true,
          samNoticeId: true,
          title: true,
          description: true,
          agency: true,
          subAgency: true,
          office: true,
          type: true,
          naicsCode: true,
          naicsDescription: true,
          setAside: true,
          classificationCode: true,
          estimatedValue: true,
          awardAmount: true,
          postedDate: true,
          responseDeadline: true,
          awardDate: true,
          placeOfPerformance: true,
          pointOfContact: true,
          contactEmail: true,
          solicitationNumber: true,
          awardee: true,
          samUrl: true,
          isActive: true,
          tags: true,
        },
      }),
      prisma.procurementOpportunity.count({ where }),
    ]);

    return createSuccessResponse({
      opportunities,
      total,
      limit,
      offset,
    });
  } catch (error) {
    logger.error('Failed to fetch procurement opportunities', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to fetch procurement opportunities');
  }
}

// POST: Trigger a SAM.gov fetch (admin/cron only)
export async function POST(request: Request) {
  try {
    // Protect with CRON_SECRET
    const authError = requireCronSecret(request);
    if (authError) return authError;

    const result = await fetchSAMOpportunities({
      limit: 100,
    });

    let created = 0;
    let updated = 0;

    for (const opp of result.opportunities) {
      if (opp.samNoticeId) {
        const existing = await prisma.procurementOpportunity.findUnique({
          where: { samNoticeId: opp.samNoticeId },
          select: { id: true },
        });

        if (existing) {
          await prisma.procurementOpportunity.update({
            where: { samNoticeId: opp.samNoticeId },
            data: {
              title: opp.title,
              description: opp.description,
              agency: opp.agency,
              subAgency: opp.subAgency,
              office: opp.office,
              type: opp.type,
              naicsCode: opp.naicsCode,
              naicsDescription: opp.naicsDescription,
              setAside: opp.setAside,
              classificationCode: opp.classificationCode,
              estimatedValue: opp.estimatedValue,
              awardAmount: opp.awardAmount,
              postedDate: opp.postedDate,
              responseDeadline: opp.responseDeadline,
              awardDate: opp.awardDate,
              placeOfPerformance: opp.placeOfPerformance,
              pointOfContact: opp.pointOfContact,
              contactEmail: opp.contactEmail,
              solicitationNumber: opp.solicitationNumber,
              awardee: opp.awardee,
              samUrl: opp.samUrl,
              tags: opp.tags,
            },
          });
          updated++;
        } else {
          await prisma.procurementOpportunity.create({
            data: {
              samNoticeId: opp.samNoticeId,
              title: opp.title,
              description: opp.description,
              agency: opp.agency,
              subAgency: opp.subAgency,
              office: opp.office,
              type: opp.type,
              naicsCode: opp.naicsCode,
              naicsDescription: opp.naicsDescription,
              setAside: opp.setAside,
              classificationCode: opp.classificationCode,
              estimatedValue: opp.estimatedValue,
              awardAmount: opp.awardAmount,
              postedDate: opp.postedDate,
              responseDeadline: opp.responseDeadline,
              awardDate: opp.awardDate,
              placeOfPerformance: opp.placeOfPerformance,
              pointOfContact: opp.pointOfContact,
              contactEmail: opp.contactEmail,
              solicitationNumber: opp.solicitationNumber,
              awardee: opp.awardee,
              samUrl: opp.samUrl,
              isActive: opp.isActive,
              tags: opp.tags,
            },
          });
          created++;
        }
      }
    }

    logger.info('SAM.gov sync completed', {
      totalFetched: result.totalRecords,
      created,
      updated,
    });

    return createSuccessResponse({ created, updated, totalFetched: result.totalRecords });
  } catch (error) {
    logger.error('Failed to sync SAM.gov data', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to sync SAM.gov data');
  }
}
