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
import { dashboardWidgetSchema, validateBody } from '@/lib/validations';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: { id: string };
}

const MAX_WIDGETS_PER_LAYOUT = 20;

/**
 * POST /api/dashboard/layouts/[id]/widgets
 * Add a widget to a layout
 */
export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return unauthorizedError();
    }

    const { id: layoutId } = params;
    const body = await req.json();
    const validation = validateBody(dashboardWidgetSchema, body);

    if (!validation.success) {
      const firstError = Object.values(validation.errors)[0]?.[0] || 'Validation failed';
      return validationError(firstError, validation.errors);
    }

    // Check ownership
    const layout = await prisma.dashboardLayout.findUnique({
      where: { id: layoutId },
      select: { userId: true, _count: { select: { widgets: true } } },
    });

    if (!layout) {
      return notFoundError('Dashboard layout');
    }

    if (layout.userId !== session.user.id) {
      return forbiddenError('You can only modify your own layouts');
    }

    if (layout._count.widgets >= MAX_WIDGETS_PER_LAYOUT) {
      return validationError(`Maximum ${MAX_WIDGETS_PER_LAYOUT} widgets per layout`);
    }

    const { moduleId, widgetType, title, x, y, w, h, minW, minH, config, order } = validation.data;

    const widget = await prisma.dashboardWidget.create({
      data: {
        layoutId,
        moduleId,
        widgetType,
        title,
        x,
        y,
        w,
        h,
        minW,
        minH,
        config: (config ?? Prisma.JsonNull) as Prisma.InputJsonValue,
        order: order ?? layout._count.widgets,
      },
    });

    // Touch the layout's updatedAt
    await prisma.dashboardLayout.update({
      where: { id: layoutId },
      data: { updatedAt: new Date() },
    });

    logger.info('Widget added to dashboard layout', {
      widgetId: widget.id,
      layoutId,
      moduleId,
      widgetType,
    });

    return NextResponse.json(
      { success: true, data: widget },
      { status: 201 }
    );
  } catch (error) {
    logger.error('Error adding widget to layout', {
      error: error instanceof Error ? error.message : String(error),
      layoutId: params.id,
    });
    return internalError('Failed to add widget');
  }
}
