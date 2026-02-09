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
import { dashboardWidgetUpdateSchema, validateBody } from '@/lib/validations';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: { id: string; widgetId: string };
}

/**
 * PUT /api/dashboard/layouts/[id]/widgets/[widgetId]
 * Update a widget's position, size, type, or config
 */
export async function PUT(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return unauthorizedError();
    }

    const { id: layoutId, widgetId } = params;
    const body = await req.json();
    const validation = validateBody(dashboardWidgetUpdateSchema, body);

    if (!validation.success) {
      const firstError = Object.values(validation.errors)[0]?.[0] || 'Validation failed';
      return validationError(firstError, validation.errors);
    }

    // Check layout ownership
    const layout = await prisma.dashboardLayout.findUnique({
      where: { id: layoutId },
      select: { userId: true },
    });

    if (!layout) {
      return notFoundError('Dashboard layout');
    }

    if (layout.userId !== session.user.id) {
      return forbiddenError('You can only modify your own layouts');
    }

    // Check widget exists in this layout
    const existingWidget = await prisma.dashboardWidget.findFirst({
      where: { id: widgetId, layoutId },
    });

    if (!existingWidget) {
      return notFoundError('Widget');
    }

    const { widgetType, title, x, y, w, h, config, order } = validation.data;

    const updated = await prisma.dashboardWidget.update({
      where: { id: widgetId },
      data: {
        ...(widgetType !== undefined && { widgetType }),
        ...(title !== undefined && { title }),
        ...(x !== undefined && { x }),
        ...(y !== undefined && { y }),
        ...(w !== undefined && { w }),
        ...(h !== undefined && { h }),
        ...(config !== undefined && { config: (config ?? Prisma.JsonNull) as Prisma.InputJsonValue }),
        ...(order !== undefined && { order }),
      },
    });

    // Touch the layout's updatedAt
    await prisma.dashboardLayout.update({
      where: { id: layoutId },
      data: { updatedAt: new Date() },
    });

    logger.info('Widget updated', {
      widgetId,
      layoutId,
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    logger.error('Error updating widget', {
      error: error instanceof Error ? error.message : String(error),
      layoutId: params.id,
      widgetId: params.widgetId,
    });
    return internalError('Failed to update widget');
  }
}

/**
 * DELETE /api/dashboard/layouts/[id]/widgets/[widgetId]
 * Remove a widget from a layout
 */
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return unauthorizedError();
    }

    const { id: layoutId, widgetId } = params;

    // Check layout ownership
    const layout = await prisma.dashboardLayout.findUnique({
      where: { id: layoutId },
      select: { userId: true },
    });

    if (!layout) {
      return notFoundError('Dashboard layout');
    }

    if (layout.userId !== session.user.id) {
      return forbiddenError('You can only modify your own layouts');
    }

    // Check widget exists
    const widget = await prisma.dashboardWidget.findFirst({
      where: { id: widgetId, layoutId },
    });

    if (!widget) {
      return notFoundError('Widget');
    }

    await prisma.dashboardWidget.delete({ where: { id: widgetId } });

    // Touch the layout's updatedAt
    await prisma.dashboardLayout.update({
      where: { id: layoutId },
      data: { updatedAt: new Date() },
    });

    logger.info('Widget removed from layout', {
      widgetId,
      layoutId,
    });

    return NextResponse.json({
      success: true,
      data: { message: 'Widget removed successfully' },
    });
  } catch (error) {
    logger.error('Error removing widget', {
      error: error instanceof Error ? error.message : String(error),
      layoutId: params.id,
      widgetId: params.widgetId,
    });
    return internalError('Failed to remove widget');
  }
}
