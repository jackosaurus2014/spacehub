import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { validateBody, createCredentialSchema } from '@/lib/validations';
import {
  validationError,
  unauthorizedError,
  internalError,
} from '@/lib/errors';

export const dynamic = 'force-dynamic';

/**
 * GET /api/account/credentials
 * List the current user's credentials.
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return unauthorizedError();
    }

    const credentials = await prisma.userCredential.findMany({
      where: { userId: session.user.id },
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
    });

    return NextResponse.json({
      success: true,
      data: { credentials },
    });
  } catch (error) {
    logger.error('GET /api/account/credentials failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to load credentials');
  }
}

/**
 * POST /api/account/credentials
 * Create a new credential. Defaults to status='self_reported'. If the user
 * provides a supportingDocUrl at submission time, the credential is created
 * in status='pending' (queued for admin review).
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return unauthorizedError();
    }

    const body = await req.json();
    const validation = validateBody(createCredentialSchema, body);
    if (!validation.success) {
      const firstError =
        Object.values(validation.errors)[0]?.[0] || 'Validation failed';
      return validationError(firstError, validation.errors);
    }

    const data = validation.data;

    const initialStatus = data.supportingDocUrl ? 'pending' : 'self_reported';

    const credential = await prisma.userCredential.create({
      data: {
        userId: session.user.id,
        credentialType: data.credentialType,
        title: data.title,
        issuingOrg: data.issuingOrg,
        issuedAt: data.issuedAt ? new Date(data.issuedAt) : null,
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
        credentialId: data.credentialId ?? null,
        verificationUrl: data.verificationUrl ?? null,
        supportingDocUrl: data.supportingDocUrl ?? null,
        status: initialStatus,
      },
    });

    logger.info('Credential created', {
      userId: session.user.id,
      credentialId: credential.id,
      credentialType: credential.credentialType,
      status: credential.status,
    });

    return NextResponse.json(
      { success: true, data: { credential } },
      { status: 201 }
    );
  } catch (error) {
    logger.error('POST /api/account/credentials failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to create credential');
  }
}
