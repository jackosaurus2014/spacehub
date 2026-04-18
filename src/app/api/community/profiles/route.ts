import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import {
  unauthorizedError,
  validationError,
  internalError,
  constrainPagination,
} from '@/lib/errors';

export const dynamic = 'force-dynamic';

/**
 * GET /api/community/profiles
 * Search professional profiles (public only)
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const expertise = searchParams.get('expertise') || '';
    const location = searchParams.get('location') || '';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = constrainPagination(
      parseInt(searchParams.get('limit') || '20', 10),
      50
    );
    const skip = (page - 1) * limit;

    // Build filter conditions
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = { isPublic: true };

    if (search) {
      where.OR = [
        { headline: { contains: search, mode: 'insensitive' } },
        { bio: { contains: search, mode: 'insensitive' } },
        { user: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }

    if (expertise) {
      where.expertise = { has: expertise };
    }

    if (location) {
      where.location = { contains: location, mode: 'insensitive' };
    }

    const [profiles, total] = await Promise.all([
      prisma.professionalProfile.findMany({
        where,
        include: {
          user: {
            select: { id: true, name: true, email: true, verifiedBadge: true },
          },
        },
        orderBy: { updatedAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.professionalProfile.count({ where }),
    ]);

    // Fetch only the verified credentials for the listed users so the
    // directory can render badges. Self-reported / pending / rejected
    // credentials are intentionally excluded from public output.
    const userIds = profiles.map((p) => p.userId);
    const verifiedCredentials = userIds.length
      ? await prisma.userCredential.findMany({
          where: { userId: { in: userIds }, status: 'verified' },
          select: {
            id: true,
            userId: true,
            credentialType: true,
            title: true,
            issuingOrg: true,
          },
          orderBy: { verifiedAt: 'desc' },
        })
      : [];
    const credsByUser = new Map<string, typeof verifiedCredentials>();
    for (const cred of verifiedCredentials) {
      const list = credsByUser.get(cred.userId) ?? [];
      list.push(cred);
      credsByUser.set(cred.userId, list);
    }

    const profilesWithCredentials = profiles.map((p) => ({
      ...p,
      verifiedCredentials: credsByUser.get(p.userId) ?? [],
    }));

    return NextResponse.json({
      success: true,
      data: {
        profiles: profilesWithCredentials,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
      // Backwards-compatible flat field for older clients that read
      // `data.profiles` and the directory page that reads `profiles` at the
      // top level (it does not use `data` because the response was originally
      // shaped as `{ profiles, pagination }`).
      profiles: profilesWithCredentials,
    });
  } catch (error) {
    logger.error('Error fetching professional profiles', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to fetch profiles');
  }
}

/**
 * POST /api/community/profiles
 * Create or update own professional profile (upsert on userId)
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return unauthorizedError();
    }

    const body = await req.json();
    const { headline, bio, expertise, location, linkedinUrl, isPublic } = body;

    // Basic validation
    if (expertise && !Array.isArray(expertise)) {
      return validationError('expertise must be an array of strings');
    }

    if (linkedinUrl && typeof linkedinUrl === 'string' && linkedinUrl.length > 0) {
      if (!linkedinUrl.startsWith('https://www.linkedin.com/') && !linkedinUrl.startsWith('https://linkedin.com/')) {
        return validationError('linkedinUrl must be a valid LinkedIn URL');
      }
    }

    const profile = await prisma.professionalProfile.upsert({
      where: { userId: session.user.id },
      create: {
        userId: session.user.id,
        headline: headline || null,
        bio: bio || null,
        expertise: expertise || [],
        location: location || null,
        linkedinUrl: linkedinUrl || null,
        isPublic: isPublic !== undefined ? Boolean(isPublic) : true,
      },
      update: {
        ...(headline !== undefined && { headline: headline || null }),
        ...(bio !== undefined && { bio: bio || null }),
        ...(expertise !== undefined && { expertise: expertise || [] }),
        ...(location !== undefined && { location: location || null }),
        ...(linkedinUrl !== undefined && { linkedinUrl: linkedinUrl || null }),
        ...(isPublic !== undefined && { isPublic: Boolean(isPublic) }),
      },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    logger.info('Professional profile upserted', {
      userId: session.user.id,
      profileId: profile.id,
    });

    return NextResponse.json(
      { success: true, data: profile },
      { status: 200 }
    );
  } catch (error) {
    logger.error('Error upserting professional profile', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to save profile');
  }
}
