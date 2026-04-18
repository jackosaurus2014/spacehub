import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import {
  forbiddenError,
  internalError,
  unauthorizedError,
  validationError,
  constrainPagination,
  constrainOffset,
} from '@/lib/errors';
import {
  createLaunchCostSchema,
  validateBody,
  LAUNCH_ORBIT_TYPES,
  type LaunchOrbitType,
} from '@/lib/validations';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const provider = searchParams.get('provider') || '';
    const vehicle = searchParams.get('vehicle') || '';
    const orbitType = searchParams.get('orbitType') || '';
    const from = searchParams.get('from') || '';
    const to = searchParams.get('to') || '';
    const minPayload = parseFloat(searchParams.get('minPayload') || '');
    const maxPayload = parseFloat(searchParams.get('maxPayload') || '');
    const sortBy = searchParams.get('sortBy') || 'launchDate';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    const limit = constrainPagination(parseInt(searchParams.get('limit') || '200'), 500);
    const offset = constrainOffset(parseInt(searchParams.get('offset') || '0'));

    const where: Record<string, unknown> = {};

    if (provider) where.provider = provider;
    if (vehicle) where.vehicle = vehicle;
    if (orbitType && (LAUNCH_ORBIT_TYPES as readonly string[]).includes(orbitType)) {
      where.orbitType = orbitType as LaunchOrbitType;
    }

    const launchDateFilter: Record<string, Date> = {};
    if (from && !Number.isNaN(new Date(from).getTime())) {
      launchDateFilter.gte = new Date(from);
    }
    if (to && !Number.isNaN(new Date(to).getTime())) {
      launchDateFilter.lte = new Date(to);
    }
    if (Object.keys(launchDateFilter).length > 0) {
      where.launchDate = launchDateFilter;
    }

    const payloadFilter: Record<string, number> = {};
    if (!Number.isNaN(minPayload)) payloadFilter.gte = minPayload;
    if (!Number.isNaN(maxPayload)) payloadFilter.lte = maxPayload;
    if (Object.keys(payloadFilter).length > 0) {
      where.payloadKg = payloadFilter;
    }

    const validSortFields = new Set([
      'launchDate',
      'costPerKg',
      'costUSD',
      'payloadKg',
      'vehicle',
      'provider',
    ]);
    const orderBy: Record<string, 'asc' | 'desc'> = {};
    if (validSortFields.has(sortBy)) {
      orderBy[sortBy] = sortOrder === 'asc' ? 'asc' : 'desc';
    } else {
      orderBy.launchDate = 'desc';
    }

    const [benchmarks, total] = await Promise.all([
      prisma.launchCostBenchmark.findMany({
        where,
        orderBy,
        take: limit,
        skip: offset,
      }),
      prisma.launchCostBenchmark.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        benchmarks,
        total,
        limit,
        offset,
      },
    });
  } catch (error) {
    logger.error('Failed to fetch launch cost benchmarks', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to fetch launch cost benchmarks');
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return unauthorizedError();
    }
    if (!session.user.isAdmin) {
      return forbiddenError('Admin access required');
    }

    const body = await req.json();
    const validation = validateBody(createLaunchCostSchema, body);
    if (!validation.success) {
      const firstError =
        Object.values(validation.errors)[0]?.[0] || 'Validation failed';
      return validationError(firstError, validation.errors);
    }

    const {
      vehicle,
      provider,
      payloadKg,
      orbitType,
      launchDate,
      costUSD,
      costPerKg,
      source,
      sourceUrl,
      reliability,
      notes,
    } = validation.data;

    // Auto-derive costPerKg if not provided
    const derivedCostPerKg =
      costPerKg != null
        ? costPerKg
        : payloadKg > 0
          ? costUSD / payloadKg
          : null;

    const created = await prisma.launchCostBenchmark.create({
      data: {
        vehicle,
        provider,
        payloadKg,
        orbitType,
        launchDate: new Date(launchDate),
        costUSD,
        costPerKg: derivedCostPerKg,
        source: source || null,
        sourceUrl: sourceUrl || null,
        reliability: reliability ?? null,
        notes: notes || null,
      },
    });

    logger.info('Launch cost benchmark created', {
      id: created.id,
      vehicle: created.vehicle,
      userId: session.user.id,
    });

    return NextResponse.json(
      { success: true, data: created },
      { status: 201 }
    );
  } catch (error) {
    logger.error('Failed to create launch cost benchmark', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to create launch cost benchmark');
  }
}
