import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { validateBody, updateCredentialSchema } from '@/lib/validations';
import {
  validationError,
  unauthorizedError,
  forbiddenError,
  notFoundError,
  internalError,
} from '@/lib/errors';

export const dynamic = 'force-dynamic';

/**
 * Fields whose mutation should reset a verified or pending credential back to
 * 'self_reported' (since the previously approved evidence no longer matches
 * the new claim).
 */
const SIGNIFICANT_FIELDS = [
  'credentialType',
  'title',
  'issuingOrg',
  'credentialId',
  'verificationUrl',
] as const;

/**
 * PATCH /api/account/credentials/[id]
 * Owner-only edit. Significant field changes reset status back to 'self_reported'.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return unauthorizedError();
    }

    const credential = await prisma.userCredential.findUnique({
      where: { id: params.id },
    });
    if (!credential) {
      return notFoundError('Credential');
    }
    if (credential.userId !== session.user.id) {
      return forbiddenError('You can only edit your own credentials');
    }

    const body = await req.json();
    const validation = validateBody(updateCredentialSchema, body);
    if (!validation.success) {
      const firstError =
        Object.values(validation.errors)[0]?.[0] || 'Validation failed';
      return validationError(firstError, validation.errors);
    }

    const data = validation.data;

    // Detect changes to significant fields — reset status if any change.
    let resetStatus = false;
    for (const field of SIGNIFICANT_FIELDS) {
      const incoming = (data as Record<string, unknown>)[field];
      if (incoming === undefined) continue;
      const current = (credential as unknown as Record<string, unknown>)[field];
      const normalisedIncoming = incoming === '' ? null : incoming ?? null;
      const normalisedCurrent = current ?? null;
      if (normalisedIncoming !== normalisedCurrent) {
        resetStatus = true;
        break;
      }
    }

    // Build update payload — only include keys explicitly provided.
    const updateData: Record<string, unknown> = {};
    if (data.credentialType !== undefined) updateData.credentialType = data.credentialType;
    if (data.title !== undefined) updateData.title = data.title;
    if (data.issuingOrg !== undefined) updateData.issuingOrg = data.issuingOrg;
    if (data.issuedAt !== undefined) {
      updateData.issuedAt = data.issuedAt ? new Date(data.issuedAt) : null;
    }
    if (data.expiresAt !== undefined) {
      updateData.expiresAt = data.expiresAt ? new Date(data.expiresAt) : null;
    }
    if (data.credentialId !== undefined) {
      updateData.credentialId = data.credentialId ?? null;
    }
    if (data.verificationUrl !== undefined) {
      updateData.verificationUrl = data.verificationUrl ?? null;
    }
    if (data.supportingDocUrl !== undefined) {
      updateData.supportingDocUrl = data.supportingDocUrl ?? null;
    }

    if (
      resetStatus &&
      (credential.status === 'verified' || credential.status === 'pending')
    ) {
      updateData.status = 'self_reported';
      updateData.verifiedAt = null;
      updateData.verifierId = null;
      updateData.rejectionReason = null;
    }

    const updated = await prisma.userCredential.update({
      where: { id: credential.id },
      data: updateData,
    });

    logger.info('Credential updated', {
      userId: session.user.id,
      credentialId: credential.id,
      statusReset: resetStatus,
    });

    return NextResponse.json({ success: true, data: { credential: updated } });
  } catch (error) {
    logger.error('PATCH /api/account/credentials/[id] failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to update credential');
  }
}

/**
 * DELETE /api/account/credentials/[id]
 * Owner-only delete.
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

    const credential = await prisma.userCredential.findUnique({
      where: { id: params.id },
      select: { id: true, userId: true },
    });
    if (!credential) {
      return notFoundError('Credential');
    }
    if (credential.userId !== session.user.id) {
      return forbiddenError('You can only delete your own credentials');
    }

    await prisma.userCredential.delete({ where: { id: credential.id } });

    logger.info('Credential deleted', {
      userId: session.user.id,
      credentialId: credential.id,
    });

    return NextResponse.json({ success: true, data: { deleted: true } });
  } catch (error) {
    logger.error('DELETE /api/account/credentials/[id] failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to delete credential');
  }
}
