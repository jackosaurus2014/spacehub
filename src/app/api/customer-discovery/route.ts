import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { internalError, validationError } from '@/lib/errors';
import {
  CUSTOMER_SEGMENTS,
  PROCUREMENT_CATEGORIES,
  findPotentialCustomers,
  type CustomerSegment,
} from '@/lib/customer-discovery-data';

export const dynamic = 'force-dynamic';

/**
 * GET /api/customer-discovery
 *
 * Query params:
 * - categories  — comma-separated procurement category IDs
 * - keywords    — comma-separated tech keywords
 * - type        — customer type filter (government, prime_contractor, commercial, international, end_user)
 * - includeCompanies — "true" to include matching CompanyProfile entries
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const categoriesParam = searchParams.get('categories') || '';
    const keywordsParam = searchParams.get('keywords') || '';
    const typeFilter = searchParams.get('type') || '';
    const includeCompanies = searchParams.get('includeCompanies') === 'true';

    // Parse inputs
    const categories = categoriesParam
      .split(',')
      .map(c => c.trim())
      .filter(Boolean);

    const keywords = keywordsParam
      .split(',')
      .map(k => k.trim())
      .filter(Boolean);

    // Validate category IDs
    const validCategoryIds = PROCUREMENT_CATEGORIES.map(c => c.id);
    const invalidCategories = categories.filter(c => !validCategoryIds.includes(c));
    if (invalidCategories.length > 0) {
      return validationError(
        `Invalid procurement categories: ${invalidCategories.join(', ')}`,
        { categories: [`Valid categories: ${validCategoryIds.join(', ')}`] }
      );
    }

    // Validate type filter
    const validTypes = ['government', 'prime_contractor', 'commercial', 'international', 'end_user'];
    if (typeFilter && !validTypes.includes(typeFilter)) {
      return validationError(
        `Invalid customer type: ${typeFilter}`,
        { type: [`Valid types: ${validTypes.join(', ')}`] }
      );
    }

    // Find matching segments
    let matchedSegments: CustomerSegment[];

    if (categories.length === 0 && keywords.length === 0) {
      // No filters — return all segments
      matchedSegments = [...CUSTOMER_SEGMENTS];
    } else {
      matchedSegments = findPotentialCustomers(categories, 'startup', keywords);
    }

    // Apply type filter
    if (typeFilter) {
      matchedSegments = matchedSegments.filter(s => s.type === typeFilter);
    }

    // Enrich with matching procurement category details
    const enrichedSegments = matchedSegments.map(segment => {
      const matchingCategories = categories.filter(c =>
        segment.procurementCategories.includes(c)
      );
      const matchingTechNeeds = segment.techNeeds.filter(need =>
        keywords.some(kw => need.toLowerCase().includes(kw.toLowerCase()))
      );

      return {
        ...segment,
        matchingCategories,
        matchingTechNeeds,
        relevanceScore: matchingCategories.length * 3 + matchingTechNeeds.length * 2,
      };
    });

    // Optionally fetch related companies from CompanyProfile database
    const relatedCompanies: Record<string, unknown[]> = {};

    if (includeCompanies && matchedSegments.length > 0) {
      try {
        // Build search terms from matched segments
        const segmentSectors = new Set<string>();
        const segmentTags = new Set<string>();

        for (const segment of matchedSegments) {
          // Map segment types to company sectors
          if (segment.type === 'prime_contractor') {
            segmentSectors.add('defense');
            segmentSectors.add('satellite');
            segmentSectors.add('launch');
          }
          if (segment.type === 'commercial') {
            segmentSectors.add('launch');
            segmentSectors.add('satellite');
            segmentSectors.add('infrastructure');
          }
          if (segment.type === 'government') {
            segmentSectors.add('agency');
            segmentSectors.add('defense');
          }

          // Map procurement categories to tags
          for (const cat of segment.procurementCategories) {
            if (cat === 'launch_services') segmentTags.add('launch');
            if (cat === 'satellites') segmentTags.add('satellite');
            if (cat === 'data_services') segmentTags.add('earth-observation');
            if (cat === 'communications') segmentTags.add('communications');
            if (cat === 'ground_systems') segmentTags.add('ground-segment');
            if (cat === 'propulsion') segmentTags.add('propulsion');
            if (cat === 'sensors' || cat === 'instruments') segmentTags.add('earth-observation');
          }
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const db = prisma.companyProfile as any;

        // Query companies matching sectors or tags
        const sectorArray = Array.from(segmentSectors);
        const tagArray = Array.from(segmentTags);

        if (sectorArray.length > 0 || tagArray.length > 0) {
          const whereConditions: unknown[] = [];

          if (sectorArray.length > 0) {
            whereConditions.push({ sector: { in: sectorArray } });
          }
          if (tagArray.length > 0) {
            whereConditions.push({ tags: { hasSome: tagArray } });
          }

          const companies = await db.findMany({
            where: {
              OR: whereConditions,
              status: 'active',
            },
            select: {
              id: true,
              slug: true,
              name: true,
              description: true,
              sector: true,
              subsector: true,
              tags: true,
              headquarters: true,
              employeeRange: true,
              tier: true,
              logoUrl: true,
              cageCode: true,
              samUei: true,
              website: true,
            },
            orderBy: { tier: 'asc' },
            take: 50,
          });

          // Group companies by their matching segment
          for (const segment of matchedSegments) {
            const matchingCompanies = companies.filter(
              (company: { sector: string | null; tags: string[] }) => {
                const sectorMatch = segment.type === 'prime_contractor'
                  ? ['defense', 'satellite', 'launch'].includes(company.sector || '')
                  : segment.type === 'commercial'
                    ? ['launch', 'satellite', 'infrastructure'].includes(company.sector || '')
                    : segment.type === 'government'
                      ? company.sector === 'agency'
                      : false;

                const tagMatch = segment.procurementCategories.some(cat => {
                  const tagMap: Record<string, string> = {
                    launch_services: 'launch',
                    satellites: 'satellite',
                    data_services: 'earth-observation',
                    communications: 'communications',
                    ground_systems: 'ground-segment',
                    propulsion: 'propulsion',
                  };
                  return company.tags?.includes(tagMap[cat] || '');
                });

                return sectorMatch || tagMatch;
              }
            );

            if (matchingCompanies.length > 0) {
              relatedCompanies[segment.id] = matchingCompanies.slice(0, 10);
            }
          }
        }
      } catch (companyError) {
        // Non-fatal: log and continue without company data
        logger.warn('Failed to fetch related companies for customer discovery', {
          error: companyError instanceof Error ? companyError.message : String(companyError),
        });
      }
    }

    // Get procurement categories details for the requested categories
    const categoryDetails = categories.length > 0
      ? PROCUREMENT_CATEGORIES.filter(c => categories.includes(c.id))
      : PROCUREMENT_CATEGORIES;

    return NextResponse.json({
      success: true,
      data: {
        segments: enrichedSegments,
        totalMatches: enrichedSegments.length,
        categories: categoryDetails,
        relatedCompanies,
        filters: {
          categories,
          keywords,
          type: typeFilter || null,
        },
      },
    });
  } catch (error) {
    logger.error('Customer discovery API error', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to process customer discovery query');
  }
}
