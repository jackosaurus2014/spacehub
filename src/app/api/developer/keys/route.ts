import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import { generateApiKey, API_RATE_LIMITS, MAX_KEYS_PER_TIER, SUBSCRIPTION_TO_API_TIERS, ApiTier } from '@/lib/api-keys';
import { validateBody, apiKeyCreateSchema } from '@/lib/validations';
import { unauthorizedError, forbiddenError, validationError, internalError, conflictError } from '@/lib/errors';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

/**
 * GET /api/developer/keys
 * List the current user's API keys (never returns the full key).
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return unauthorizedError();
    }

    const keys = await prisma.apiKey.findMany({
      where: { userId: session.user.id },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        tier: true,
        rateLimitPerMonth: true,
        rateLimitPerMinute: true,
        isActive: true,
        lastUsedAt: true,
        expiresAt: true,
        createdAt: true,
        revokedAt: true,
        _count: {
          select: { usageLogs: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      success: true,
      data: keys.map((k) => ({
        ...k,
        totalCalls: k._count.usageLogs,
        _count: undefined,
      })),
    });
  } catch (error) {
    logger.error('Error listing API keys', { error: error instanceof Error ? error.message : String(error) });
    return internalError('Failed to list API keys');
  }
}

/**
 * POST /api/developer/keys
 * Create a new API key. Returns the full key ONLY this one time.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return unauthorizedError();
    }

    // Check subscription tier
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        subscriptionTier: true,
        trialTier: true,
        trialEndDate: true,
      },
    });

    if (!user) {
      return unauthorizedError();
    }

    // Determine effective tier (account for active trials)
    let effectiveTier = user.subscriptionTier;
    if (user.trialTier && user.trialEndDate && new Date(user.trialEndDate) > new Date()) {
      effectiveTier = user.trialTier;
    }

    const allowedApiTiers = SUBSCRIPTION_TO_API_TIERS[effectiveTier] || [];
    if (allowedApiTiers.length === 0) {
      return forbiddenError(
        'API access requires a Pro or Enterprise subscription. Please upgrade your plan.'
      );
    }

    const body = await req.json();
    const validation = validateBody(apiKeyCreateSchema, body);
    if (!validation.success) {
      const firstError = Object.values(validation.errors)[0]?.[0] || 'Validation failed';
      return validationError(firstError, validation.errors);
    }

    const { name } = validation.data;

    // Determine the API tier for this key based on subscription
    const apiTier: ApiTier = allowedApiTiers.includes('enterprise')
      ? 'enterprise'
      : allowedApiTiers.includes('business')
        ? 'business'
        : 'developer';

    // Check key limit
    const existingKeyCount = await prisma.apiKey.count({
      where: {
        userId: session.user.id,
        revokedAt: null,
      },
    });

    const maxKeys = MAX_KEYS_PER_TIER[apiTier] || 3;
    if (existingKeyCount >= maxKeys) {
      return conflictError(
        `Maximum ${maxKeys} active API keys allowed for ${apiTier} tier. Revoke an existing key first.`
      );
    }

    // Generate the key
    const { key, hash, prefix } = generateApiKey();
    const limits = API_RATE_LIMITS[apiTier];

    const apiKey = await prisma.apiKey.create({
      data: {
        userId: session.user.id,
        name,
        keyHash: hash,
        keyPrefix: prefix,
        tier: apiTier,
        rateLimitPerMonth: limits.monthly,
        rateLimitPerMinute: limits.perMinute,
      },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        tier: true,
        rateLimitPerMonth: true,
        rateLimitPerMinute: true,
        isActive: true,
        createdAt: true,
      },
    });

    logger.info('API key created', {
      userId: session.user.id,
      keyId: apiKey.id,
      tier: apiTier,
      keyPrefix: prefix,
    });

    // Return the full key ONLY on creation
    return NextResponse.json(
      {
        success: true,
        data: {
          ...apiKey,
          key, // Full key -- shown ONCE
        },
        message: 'API key created successfully. Save this key now -- it will not be shown again.',
      },
      { status: 201 }
    );
  } catch (error) {
    logger.error('Error creating API key', { error: error instanceof Error ? error.message : String(error) });
    return internalError('Failed to create API key');
  }
}
