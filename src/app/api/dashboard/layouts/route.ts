import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import { Prisma } from '@prisma/client';
import {
  validationError,
  unauthorizedError,
  forbiddenError,
  internalError,
} from '@/lib/errors';
import { dashboardLayoutCreateSchema, validateBody } from '@/lib/validations';
import { logger } from '@/lib/logger';
import { DEFAULT_LAYOUTS } from '@/lib/dashboard/default-layouts';

export const dynamic = 'force-dynamic';

/** Layout limits per subscription tier */
const LAYOUT_LIMITS: Record<string, number> = {
  free: 0, // Free users use localStorage only
  pro: 3,
  enterprise: 10,
};

/**
 * GET /api/dashboard/layouts
 * List user's dashboard layouts. If none exist, return default presets.
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      // Return default presets for anonymous users (they use localStorage)
      return NextResponse.json({
        success: true,
        data: {
          layouts: [],
          presets: DEFAULT_LAYOUTS,
          tier: 'free',
          limit: 0,
        },
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { subscriptionTier: true },
    });

    const tier = user?.subscriptionTier ?? 'free';
    const limit = LAYOUT_LIMITS[tier] ?? 0;

    const layouts = await prisma.dashboardLayout.findMany({
      where: { userId: session.user.id },
      include: {
        widgets: {
          orderBy: { order: 'asc' },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return NextResponse.json({
      success: true,
      data: {
        layouts,
        presets: layouts.length === 0 ? DEFAULT_LAYOUTS : [],
        tier,
        limit,
      },
    });
  } catch (error) {
    logger.error('Error fetching dashboard layouts', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to fetch dashboard layouts');
  }
}

/**
 * POST /api/dashboard/layouts
 * Create a new dashboard layout (requires auth, Pro+ subscription for DB persistence)
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return unauthorizedError('Authentication required to create dashboard layouts');
    }

    const body = await req.json();
    const validation = validateBody(dashboardLayoutCreateSchema, body);

    if (!validation.success) {
      const firstError = Object.values(validation.errors)[0]?.[0] || 'Validation failed';
      return validationError(firstError, validation.errors);
    }

    const { name, description, isDefault, isPublic, gridColumns, widgets } = validation.data;

    // Check subscription tier
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { subscriptionTier: true },
    });

    const tier = user?.subscriptionTier ?? 'free';
    const limit = LAYOUT_LIMITS[tier] ?? 0;

    if (limit === 0) {
      return forbiddenError(
        'Dashboard layouts require a Pro or Enterprise subscription. Free users can use the local dashboard builder.'
      );
    }

    // Check existing layout count
    const existingCount = await prisma.dashboardLayout.count({
      where: { userId: session.user.id },
    });

    if (existingCount >= limit) {
      return validationError(
        `You have reached the maximum of ${limit} layouts for the ${tier} tier. Upgrade to create more.`
      );
    }

    // If setting as default, unset other defaults
    if (isDefault) {
      await prisma.dashboardLayout.updateMany({
        where: { userId: session.user.id, isDefault: true },
        data: { isDefault: false },
      });
    }

    // Create layout with widgets
    const layout = await prisma.dashboardLayout.create({
      data: {
        userId: session.user.id,
        name,
        description,
        isDefault: isDefault || existingCount === 0, // First layout is always default
        isPublic,
        gridColumns,
        widgets: {
          create: widgets.map((w, index) => ({
            moduleId: w.moduleId,
            widgetType: w.widgetType,
            title: w.title,
            x: w.x,
            y: w.y,
            w: w.w,
            h: w.h,
            minW: w.minW,
            minH: w.minH,
            config: (w.config ?? Prisma.JsonNull) as Prisma.InputJsonValue,
            order: w.order ?? index,
          })),
        },
      },
      include: {
        widgets: {
          orderBy: { order: 'asc' },
        },
      },
    });

    logger.info('Dashboard layout created', {
      layoutId: layout.id,
      userId: session.user.id,
      name: layout.name,
      widgetCount: layout.widgets.length,
    });

    return NextResponse.json(
      { success: true, data: layout },
      { status: 201 }
    );
  } catch (error) {
    logger.error('Error creating dashboard layout', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to create dashboard layout');
  }
}
