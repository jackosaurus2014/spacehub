import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import { Prisma } from '@prisma/client';
import {
  validationError,
  unauthorizedError,
  notFoundError,
  forbiddenError,
  internalError,
} from '@/lib/errors';
import { dashboardLayoutUpdateSchema, validateBody } from '@/lib/validations';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: { id: string };
}

/**
 * GET /api/dashboard/layouts/[id]
 * Get a single dashboard layout with all widgets
 */
export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    const { id } = params;

    const layout = await prisma.dashboardLayout.findUnique({
      where: { id },
      include: {
        widgets: {
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!layout) {
      return notFoundError('Dashboard layout');
    }

    // Only allow access if public or owned by the user
    if (!layout.isPublic && layout.userId !== session?.user?.id) {
      return forbiddenError('You do not have access to this layout');
    }

    return NextResponse.json({ success: true, data: layout });
  } catch (error) {
    logger.error('Error fetching dashboard layout', {
      error: error instanceof Error ? error.message : String(error),
      layoutId: params.id,
    });
    return internalError('Failed to fetch dashboard layout');
  }
}

/**
 * PUT /api/dashboard/layouts/[id]
 * Update a dashboard layout (name, widgets, settings)
 */
export async function PUT(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return unauthorizedError();
    }

    const { id } = params;
    const body = await req.json();
    const validation = validateBody(dashboardLayoutUpdateSchema, body);

    if (!validation.success) {
      const firstError = Object.values(validation.errors)[0]?.[0] || 'Validation failed';
      return validationError(firstError, validation.errors);
    }

    // Check ownership
    const existing = await prisma.dashboardLayout.findUnique({
      where: { id },
      select: { userId: true },
    });

    if (!existing) {
      return notFoundError('Dashboard layout');
    }

    if (existing.userId !== session.user.id) {
      return forbiddenError('You can only edit your own layouts');
    }

    const { name, description, isDefault, isPublic, gridColumns, widgets } = validation.data;

    // If setting as default, unset other defaults
    if (isDefault) {
      await prisma.dashboardLayout.updateMany({
        where: { userId: session.user.id, isDefault: true, id: { not: id } },
        data: { isDefault: false },
      });
    }

    // If widgets are provided, replace all widgets (transactional)
    if (widgets !== undefined) {
      await prisma.$transaction([
        prisma.dashboardWidget.deleteMany({ where: { layoutId: id } }),
        ...widgets.map((w, index) =>
          prisma.dashboardWidget.create({
            data: {
              layoutId: id,
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
            },
          })
        ),
      ]);
    }

    // Update layout metadata
    const updated = await prisma.dashboardLayout.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(isDefault !== undefined && { isDefault }),
        ...(isPublic !== undefined && { isPublic }),
        ...(gridColumns !== undefined && { gridColumns }),
      },
      include: {
        widgets: {
          orderBy: { order: 'asc' },
        },
      },
    });

    logger.info('Dashboard layout updated', {
      layoutId: id,
      userId: session.user.id,
      widgetCount: updated.widgets.length,
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    logger.error('Error updating dashboard layout', {
      error: error instanceof Error ? error.message : String(error),
      layoutId: params.id,
    });
    return internalError('Failed to update dashboard layout');
  }
}

/**
 * DELETE /api/dashboard/layouts/[id]
 * Delete a dashboard layout
 */
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return unauthorizedError();
    }

    const { id } = params;

    // Check ownership
    const existing = await prisma.dashboardLayout.findUnique({
      where: { id },
      select: { userId: true, isDefault: true },
    });

    if (!existing) {
      return notFoundError('Dashboard layout');
    }

    if (existing.userId !== session.user.id) {
      return forbiddenError('You can only delete your own layouts');
    }

    await prisma.dashboardLayout.delete({ where: { id } });

    // If this was the default, make another layout the default
    if (existing.isDefault) {
      const next = await prisma.dashboardLayout.findFirst({
        where: { userId: session.user.id },
        orderBy: { updatedAt: 'desc' },
      });
      if (next) {
        await prisma.dashboardLayout.update({
          where: { id: next.id },
          data: { isDefault: true },
        });
      }
    }

    logger.info('Dashboard layout deleted', {
      layoutId: id,
      userId: session.user.id,
    });

    return NextResponse.json({
      success: true,
      data: { message: 'Layout deleted successfully' },
    });
  } catch (error) {
    logger.error('Error deleting dashboard layout', {
      error: error instanceof Error ? error.message : String(error),
      layoutId: params.id,
    });
    return internalError('Failed to delete dashboard layout');
  }
}
