import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import { constrainPagination, internalError, unauthorizedError, validationError } from '@/lib/errors';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

/**
 * Whitelist of exportable modules mapped to their Prisma model accessors
 */
const EXPORTABLE_MODULES: Record<string, string> = {
  companies: 'spaceCompany',
  events: 'spaceEvent',
  news: 'newsArticle',
};

/**
 * Convert an array of objects to CSV string with proper escaping
 */
function toCSV(data: Record<string, unknown>[]): string {
  if (data.length === 0) return '';
  const headers = Object.keys(data[0]);
  const rows = data.map(row =>
    headers.map(h => {
      const val = row[h];
      const str = val === null || val === undefined ? '' : String(val);
      return str.includes(',') || str.includes('"') || str.includes('\n')
        ? `"${str.replace(/"/g, '""')}"`
        : str;
    }).join(',')
  );
  return [headers.join(','), ...rows].join('\n');
}

export async function GET(
  req: NextRequest,
  { params }: { params: { module: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return unauthorizedError();
    }

    const { module } = params;
    const { searchParams } = new URL(req.url);

    // Validate module name against whitelist
    const modelName = EXPORTABLE_MODULES[module];
    if (!modelName) {
      return validationError(
        `Invalid module "${module}". Supported modules: ${Object.keys(EXPORTABLE_MODULES).join(', ')}`,
        { module: `Must be one of: ${Object.keys(EXPORTABLE_MODULES).join(', ')}` }
      );
    }

    // Parse and constrain query parameters
    const format = searchParams.get('format') || 'json';
    if (format !== 'json' && format !== 'csv') {
      return validationError(
        'Invalid format. Must be "json" or "csv".',
        { format: 'Must be "json" or "csv"' }
      );
    }

    const rawLimit = parseInt(searchParams.get('limit') || '100', 10) || 100;
    const limit = constrainPagination(rawLimit, 1000);

    // Fetch data from the corresponding Prisma model
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const model = (prisma as any)[modelName];
    const data = await model.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' },
    });

    // Return JSON format
    if (format === 'json') {
      return new NextResponse(JSON.stringify(data, null, 2), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="${module}-export.json"`,
        },
      });
    }

    // Return CSV format
    const csv = toCSV(data as Record<string, unknown>[]);
    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${module}-export.csv"`,
      },
    });
  } catch (error) {
    logger.error('Export error', { error: error instanceof Error ? error.message : String(error) });
    return internalError('Failed to export data');
  }
}
