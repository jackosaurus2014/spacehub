import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import {
  validationError,
  unauthorizedError,
  forbiddenError,
  internalError,
} from '@/lib/errors';
import { alertRuleSchema, validateBody } from '@/lib/validations';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

/** Maximum alert rules by subscription tier */
const TIER_LIMITS: Record<string, number> = {
  free: 0,
  pro: 10,
  enterprise: 50,
};

/** Channels restricted to enterprise tier */
const ENTERPRISE_ONLY_CHANNELS = ['webhook'];

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return unauthorizedError();
    }

    const rules = await prisma.alertRule.findMany({
      where: { userId: session.user.id },
      include: {
        _count: {
          select: { deliveries: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Get aggregate stats
    const [totalDeliveries, deliveriesToday] = await Promise.all([
      prisma.alertDelivery.count({
        where: { userId: session.user.id },
      }),
      prisma.alertDelivery.count({
        where: {
          userId: session.user.id,
          createdAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        rules,
        stats: {
          totalRules: rules.length,
          activeRules: rules.filter((r: { isActive: boolean }) => r.isActive).length,
          totalDeliveries,
          deliveriesToday,
        },
      },
    });
  } catch (error) {
    logger.error('Error fetching alert rules', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to fetch alert rules');
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return unauthorizedError();
    }

    // Look up user's subscription tier
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        subscriptionTier: true,
        subscriptionStatus: true,
        trialTier: true,
        trialEndDate: true,
      },
    });

    if (!user) {
      return unauthorizedError();
    }

    // Determine effective tier (considering active trials)
    let effectiveTier = user.subscriptionTier;
    if (
      user.trialTier &&
      user.trialEndDate &&
      new Date() < user.trialEndDate
    ) {
      effectiveTier = user.trialTier;
    }

    // Gate behind Pro+ subscription
    if (effectiveTier === 'free') {
      return forbiddenError(
        'Alert rules require a Pro or Enterprise subscription. Upgrade to get started.'
      );
    }

    // Check rule limit
    const existingCount = await prisma.alertRule.count({
      where: { userId: session.user.id },
    });

    const maxRules = TIER_LIMITS[effectiveTier] || 0;
    if (existingCount >= maxRules) {
      return forbiddenError(
        `You have reached the maximum of ${maxRules} alert rules for your ${effectiveTier} plan.`
      );
    }

    const body = await req.json();
    const validation = validateBody(alertRuleSchema, body);
    if (!validation.success) {
      const firstError =
        Object.values(validation.errors)[0]?.[0] || 'Validation failed';
      return validationError(firstError, validation.errors);
    }

    const {
      name,
      description,
      triggerType,
      triggerConfig,
      channels,
      emailFrequency,
      priority,
      cooldownMinutes,
    } = validation.data;

    // Enterprise-only channel check
    if (effectiveTier !== 'enterprise') {
      const hasRestrictedChannel = channels.some((c: string) =>
        ENTERPRISE_ONLY_CHANNELS.includes(c)
      );
      if (hasRestrictedChannel) {
        return forbiddenError(
          'Webhook channel is only available on the Enterprise plan.'
        );
      }
    }

    const rule = await prisma.alertRule.create({
      data: {
        userId: session.user.id,
        name,
        description: description || null,
        triggerType,
        triggerConfig,
        channels,
        emailFrequency,
        priority,
        cooldownMinutes,
      },
    });

    logger.info('Alert rule created', {
      ruleId: rule.id,
      userId: session.user.id,
      triggerType: rule.triggerType,
      channels: rule.channels,
    });

    return NextResponse.json(
      { success: true, data: rule },
      { status: 201 }
    );
  } catch (error) {
    logger.error('Error creating alert rule', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to create alert rule');
  }
}
