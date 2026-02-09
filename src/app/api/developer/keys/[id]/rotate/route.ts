import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import { generateApiKey, API_RATE_LIMITS, ApiTier } from '@/lib/api-keys';
import { unauthorizedError, notFoundError, validationError, internalError } from '@/lib/errors';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

/**
 * POST /api/developer/keys/[id]/rotate
 * Rotate an API key: revoke the old one and create a new one with the same settings.
 * Returns the new full key (only time it is shown).
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return unauthorizedError();
    }

    const { id } = params;

    // Verify ownership and get current settings
    const existing = await prisma.apiKey.findFirst({
      where: { id, userId: session.user.id },
      select: {
        id: true,
        name: true,
        tier: true,
        rateLimitPerMonth: true,
        rateLimitPerMinute: true,
        revokedAt: true,
      },
    });

    if (!existing) {
      return notFoundError('API key');
    }

    if (existing.revokedAt) {
      return validationError('Cannot rotate a revoked key');
    }

    // Generate new key
    const { key, hash, prefix } = generateApiKey();

    // Transaction: revoke old key and create new one
    const [, newApiKey] = await prisma.$transaction([
      prisma.apiKey.update({
        where: { id },
        data: {
          isActive: false,
          revokedAt: new Date(),
        },
      }),
      prisma.apiKey.create({
        data: {
          userId: session.user.id,
          name: existing.name,
          keyHash: hash,
          keyPrefix: prefix,
          tier: existing.tier,
          rateLimitPerMonth: existing.rateLimitPerMonth,
          rateLimitPerMinute: existing.rateLimitPerMinute,
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
      }),
    ]);

    logger.info('API key rotated', {
      userId: session.user.id,
      oldKeyId: id,
      newKeyId: newApiKey.id,
      keyPrefix: prefix,
    });

    return NextResponse.json({
      success: true,
      data: {
        ...newApiKey,
        key, // Full key -- shown ONCE
        previousKeyId: id,
      },
      message: 'API key rotated successfully. Save this new key now -- it will not be shown again.',
    });
  } catch (error) {
    logger.error('Error rotating API key', { error: error instanceof Error ? error.message : String(error) });
    return internalError('Failed to rotate API key');
  }
}
