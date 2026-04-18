import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import {
  unauthorizedError,
  forbiddenError,
  internalError,
} from '@/lib/errors';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/credentials
 * Admin-only. Returns the queue of credentials in status='pending' along with
 * basic submitter info so reviewers can make a decision.
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return unauthorizedError();
    }
    if (!session.user.isAdmin) {
      return forbiddenError('Admin access required');
    }

    const credentials = await prisma.userCredential.findMany({
      where: { status: 'pending' },
      orderBy: { updatedAt: 'asc' },
      take: 200,
    });

    // Join submitter info — UserCredential.userId is a scalar reference.
    const userIds = Array.from(new Set(credentials.map((c) => c.userId)));
    const users = userIds.length
      ? await prisma.user.findMany({
          where: { id: { in: userIds } },
          select: {
            id: true,
            email: true,
            name: true,
            verifiedBadge: true,
            emailVerified: true,
          },
        })
      : [];
    const userMap = new Map(users.map((u) => [u.id, u]));

    const data = credentials.map((c) => ({
      id: c.id,
      credentialType: c.credentialType,
      title: c.title,
      issuingOrg: c.issuingOrg,
      issuedAt: c.issuedAt,
      expiresAt: c.expiresAt,
      credentialId: c.credentialId,
      verificationUrl: c.verificationUrl,
      supportingDocUrl: c.supportingDocUrl,
      status: c.status,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
      user: userMap.get(c.userId) ?? null,
    }));

    return NextResponse.json({
      success: true,
      data: { credentials: data },
    });
  } catch (error) {
    logger.error('GET /api/admin/credentials failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to load credential queue');
  }
}
