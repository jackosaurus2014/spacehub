import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import {
  validationError,
  unauthorizedError,
  notFoundError,
  forbiddenError,
  internalError,
} from '@/lib/errors';
import { alertRuleUpdateSchema, validateBody } from '@/lib/validations';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

/** Channels restricted to enterprise tier */
const ENTERPRISE_ONLY_CHANNELS = ['webhook'];

// GET /api/alerts/[id] - Get rule details with recent deliveries
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return unauthorizedError();
    }

    const rule = await prisma.alertRule.findUnique({
      where: { id: params.id },
      include: {
        deliveries: {
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
        _count: {
          select: { deliveries: true },
        },
      },
    });

    if (!rule) {
      return notFoundError('Alert rule');
    }

    // Ensure user owns this rule
    if (rule.userId !== session.user.id && !session.user.isAdmin) {
      return forbiddenError('You do not have access to this alert rule');
    }

    return NextResponse.json({ success: true, data: rule });
  } catch (error) {
    logger.error('Error fetching alert rule', {
      ruleId: params.id,
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to fetch alert rule');
  }
}

// PUT /api/alerts/[id] - Update rule
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return unauthorizedError();
    }

    // Verify ownership
    const existing = await prisma.alertRule.findUnique({
      where: { id: params.id },
      select: { userId: true },
    });

    if (!existing) {
      return notFoundError('Alert rule');
    }

    if (existing.userId !== session.user.id && !session.user.isAdmin) {
      return forbiddenError('You do not have access to this alert rule');
    }

    const body = await req.json();
    const validation = validateBody(alertRuleUpdateSchema, body);
    if (!validation.success) {
      const firstError =
        Object.values(validation.errors)[0]?.[0] || 'Validation failed';
      return validationError(firstError, validation.errors);
    }

    const updateData = validation.data;

    // If channels are being updated, check enterprise restriction
    if (updateData.channels) {
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: {
          subscriptionTier: true,
          trialTier: true,
          trialEndDate: true,
        },
      });

      let effectiveTier = user?.subscriptionTier || 'free';
      if (
        user?.trialTier &&
        user?.trialEndDate &&
        new Date() < user.trialEndDate
      ) {
        effectiveTier = user.trialTier;
      }

      if (effectiveTier !== 'enterprise') {
        const hasRestrictedChannel = updateData.channels.some((c: string) =>
          ENTERPRISE_ONLY_CHANNELS.includes(c)
        );
        if (hasRestrictedChannel) {
          return forbiddenError(
            'Webhook channel is only available on the Enterprise plan.'
          );
        }
      }
    }

    // Build the update payload, filtering undefined values
    const prismaUpdate: Record<string, unknown> = {};
    if (updateData.name !== undefined) prismaUpdate.name = updateData.name;
    if (updateData.description !== undefined) prismaUpdate.description = updateData.description || null;
    if (updateData.triggerConfig !== undefined) prismaUpdate.triggerConfig = updateData.triggerConfig;
    if (updateData.channels !== undefined) prismaUpdate.channels = updateData.channels;
    if (updateData.emailFrequency !== undefined) prismaUpdate.emailFrequency = updateData.emailFrequency;
    if (updateData.isActive !== undefined) prismaUpdate.isActive = updateData.isActive;
    if (updateData.priority !== undefined) prismaUpdate.priority = updateData.priority;
    if (updateData.cooldownMinutes !== undefined) prismaUpdate.cooldownMinutes = updateData.cooldownMinutes;

    const updated = await prisma.alertRule.update({
      where: { id: params.id },
      data: prismaUpdate,
    });

    logger.info('Alert rule updated', {
      ruleId: params.id,
      userId: session.user.id,
      fields: Object.keys(prismaUpdate),
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    logger.error('Error updating alert rule', {
      ruleId: params.id,
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to update alert rule');
  }
}

// DELETE /api/alerts/[id] - Delete rule and all deliveries
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return unauthorizedError();
    }

    // Verify ownership
    const existing = await prisma.alertRule.findUnique({
      where: { id: params.id },
      select: { userId: true, name: true },
    });

    if (!existing) {
      return notFoundError('Alert rule');
    }

    if (existing.userId !== session.user.id && !session.user.isAdmin) {
      return forbiddenError('You do not have access to this alert rule');
    }

    // Delete the rule (cascade will handle deliveries)
    await prisma.alertRule.delete({
      where: { id: params.id },
    });

    logger.info('Alert rule deleted', {
      ruleId: params.id,
      userId: session.user.id,
      ruleName: existing.name,
    });

    return NextResponse.json({
      success: true,
      data: { message: 'Alert rule deleted successfully' },
    });
  } catch (error) {
    logger.error('Error deleting alert rule', {
      ruleId: params.id,
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to delete alert rule');
  }
}
