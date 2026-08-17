import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import {
  forbiddenError,
  internalError,
  serviceUnavailableError,
  unauthorizedError,
  validationError,
} from '@/lib/errors';
import { regulatoryAlertPreferencesSchema, validateBody } from '@/lib/validations';
import {
  isEffectivelyPro,
  isRegulatoryAlertPrefsAvailable,
  parseWatchedCategories,
} from '@/lib/regulatory-alerts';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

/**
 * Per-user regulatory alert preferences (Regulatory Wave C — Pro feature).
 *
 * GET  — any signed-in user (returns isPro so the settings card can render
 *        the upgrade CTA for free users).
 * PUT  — Pro-gated SERVER-SIDE (mirrors the canonical gate in
 *        /api/alerts/route.ts: normalizeTier + active-trial override).
 *        Client-only gating is never trusted.
 */

const DEFAULT_PREFERENCES = {
  enabled: false,
  watchedCategories: [] as string[],
  frequency: 'daily' as const,
};

async function getTierFields(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      subscriptionTier: true,
      trialTier: true,
      trialEndDate: true,
    },
  });
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return unauthorizedError();
    }

    const user = await getTierFields(session.user.id);
    if (!user) {
      return unauthorizedError();
    }
    const isPro = isEffectivelyPro(user);

    // Fail-soft while the table hasn't been pushed yet — the settings card
    // still renders (with defaults) instead of erroring.
    const available = await isRegulatoryAlertPrefsAvailable();
    if (!available) {
      return NextResponse.json({
        success: true,
        data: { isPro, available: false, preferences: DEFAULT_PREFERENCES },
      });
    }

    const pref = await prisma.regulatoryAlertPreference.findUnique({
      where: { userId: session.user.id },
      select: { enabled: true, watchedCategories: true, frequency: true },
    });

    return NextResponse.json({
      success: true,
      data: {
        isPro,
        available: true,
        preferences: pref
          ? {
              enabled: pref.enabled,
              watchedCategories: parseWatchedCategories(pref.watchedCategories),
              frequency: pref.frequency === 'immediate' ? 'immediate' : 'daily',
            }
          : DEFAULT_PREFERENCES,
      },
    });
  } catch (error) {
    logger.error('Error fetching regulatory alert preferences', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to fetch regulatory alert preferences');
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return unauthorizedError();
    }

    const user = await getTierFields(session.user.id);
    if (!user) {
      return unauthorizedError();
    }

    // SERVER-SIDE Pro gate — the settings card also hides the controls for
    // free users, but the API is the enforcement point.
    if (!isEffectivelyPro(user)) {
      return forbiddenError(
        'Regulatory alerts are a SpaceNexus Pro feature. Upgrade to configure per-category email alerts.'
      );
    }

    if (!(await isRegulatoryAlertPrefsAvailable())) {
      return serviceUnavailableError('Regulatory alert preferences are not available yet');
    }

    const body = await req.json().catch(() => null);
    if (!body) {
      return validationError('Invalid JSON body');
    }
    const validation = validateBody(regulatoryAlertPreferencesSchema, body);
    if (!validation.success) {
      const firstError = Object.values(validation.errors)[0]?.[0] || 'Validation failed';
      return validationError(firstError, validation.errors);
    }

    const { enabled, frequency, watchedCategories } = validation.data;
    const serialized = JSON.stringify(watchedCategories);

    const pref = await prisma.regulatoryAlertPreference.upsert({
      where: { userId: session.user.id },
      create: {
        userId: session.user.id,
        enabled,
        frequency,
        watchedCategories: serialized,
      },
      update: {
        enabled,
        frequency,
        watchedCategories: serialized,
      },
      select: { enabled: true, watchedCategories: true, frequency: true },
    });

    logger.info('Regulatory alert preferences updated', {
      userId: session.user.id,
      enabled,
      frequency,
      categoryCount: watchedCategories.length,
    });

    return NextResponse.json({
      success: true,
      data: {
        isPro: true,
        available: true,
        preferences: {
          enabled: pref.enabled,
          watchedCategories: parseWatchedCategories(pref.watchedCategories),
          frequency: pref.frequency === 'immediate' ? 'immediate' : 'daily',
        },
      },
    });
  } catch (error) {
    logger.error('Error updating regulatory alert preferences', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to update regulatory alert preferences');
  }
}
