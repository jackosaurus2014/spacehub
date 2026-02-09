import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import { validateBody, apiKeyUpdateSchema } from '@/lib/validations';
import { unauthorizedError, notFoundError, validationError, internalError } from '@/lib/errors';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

/**
 * PUT /api/developer/keys/[id]
 * Update key name or toggle active status.
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return unauthorizedError();
    }

    const { id } = params;

    // Verify ownership
    const existing = await prisma.apiKey.findFirst({
      where: { id, userId: session.user.id },
      select: { id: true, revokedAt: true },
    });

    if (!existing) {
      return notFoundError('API key');
    }

    if (existing.revokedAt) {
      return validationError('Cannot update a revoked key');
    }

    const body = await req.json();
    const validation = validateBody(apiKeyUpdateSchema, body);
    if (!validation.success) {
      const firstError = Object.values(validation.errors)[0]?.[0] || 'Validation failed';
      return validationError(firstError, validation.errors);
    }

    const updateData: Record<string, unknown> = {};
    if (validation.data.name !== undefined) {
      updateData.name = validation.data.name;
    }
    if (validation.data.isActive !== undefined) {
      updateData.isActive = validation.data.isActive;
    }

    const updated = await prisma.apiKey.update({
      where: { id },
      data: updateData,
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
      },
    });

    logger.info('API key updated', { userId: session.user.id, keyId: id });

    return NextResponse.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    logger.error('Error updating API key', { error: error instanceof Error ? error.message : String(error) });
    return internalError('Failed to update API key');
  }
}

/**
 * DELETE /api/developer/keys/[id]
 * Revoke (soft delete) an API key.
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return unauthorizedError();
    }

    const { id } = params;

    // Verify ownership
    const existing = await prisma.apiKey.findFirst({
      where: { id, userId: session.user.id },
      select: { id: true },
    });

    if (!existing) {
      return notFoundError('API key');
    }

    await prisma.apiKey.update({
      where: { id },
      data: {
        isActive: false,
        revokedAt: new Date(),
      },
    });

    logger.info('API key revoked', { userId: session.user.id, keyId: id });

    return NextResponse.json({
      success: true,
      data: { message: 'API key revoked successfully' },
    });
  } catch (error) {
    logger.error('Error revoking API key', { error: error instanceof Error ? error.message : String(error) });
    return internalError('Failed to revoke API key');
  }
}
