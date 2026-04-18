import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import {
  internalError,
  unauthorizedError,
  forbiddenError,
  validationError,
  createSuccessResponse,
} from '@/lib/errors';
import {
  validateBody,
  createDealMemoSchema,
} from '@/lib/validations';
import {
  canAuthorInvestorContent,
  ensureUniqueDealMemoSlug,
  makeSlug,
} from '@/lib/investor-hub';

export const dynamic = 'force-dynamic';

/**
 * GET /api/investor-hub/deal-memos
 * Visibility-aware list:
 *  - unauthenticated: only public + published
 *  - authenticated: public + logged_in (published) + all own memos
 *  - admin: everything
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const recommendation = searchParams.get('recommendation');
    const dealStage = searchParams.get('dealStage');
    const author = searchParams.get('author');
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '20', 10) || 20, 1), 100);
    const offset = Math.max(parseInt(searchParams.get('offset') || '0', 10) || 0, 0);

    const session = await getServerSession(authOptions);
    const userId = session?.user?.id ?? null;
    const isAdmin = Boolean(session?.user?.isAdmin);

    // Visibility filter (OR shape)
    const orClauses: Array<Record<string, unknown>> = [];
    if (isAdmin) {
      orClauses.push({}); // admin sees everything
    } else {
      orClauses.push({ visibility: 'public', publishedAt: { not: null } });
      if (userId) {
        orClauses.push({ visibility: 'logged_in', publishedAt: { not: null } });
        orClauses.push({ authorUserId: userId }); // own memos, even drafts
      }
    }

    const andClauses: Array<Record<string, unknown>> = [];
    if (recommendation) andClauses.push({ recommendation });
    if (dealStage) andClauses.push({ dealStage });
    if (author === 'me') {
      if (!userId) return unauthorizedError('Log in to filter by your memos');
      andClauses.push({ authorUserId: userId });
    } else if (author) {
      andClauses.push({ authorUserId: author });
    }

    const where: Record<string, unknown> = {
      OR: orClauses,
      ...(andClauses.length > 0 ? { AND: andClauses } : {}),
    };

    const [memos, total] = await Promise.all([
      prisma.dealMemo.findMany({
        where,
        orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
        take: limit,
        skip: offset,
      }),
      prisma.dealMemo.count({ where }),
    ]);

    const authorIds = Array.from(new Set(memos.map((m) => m.authorUserId)));
    const authors =
      authorIds.length > 0
        ? await prisma.user.findMany({
            where: { id: { in: authorIds } },
            select: { id: true, name: true, verifiedBadge: true },
          })
        : [];
    const authorMap = new Map(authors.map((a) => [a.id, a]));

    return createSuccessResponse({
      memos: memos.map((m) => ({
        id: m.id,
        slug: m.slug,
        companyName: m.companyName,
        companyId: m.companyId,
        dealStage: m.dealStage,
        investmentAmount: m.investmentAmount,
        currency: m.currency,
        recommendation: m.recommendation,
        visibility: m.visibility,
        publishedAt: m.publishedAt,
        createdAt: m.createdAt,
        updatedAt: m.updatedAt,
        author: {
          id: m.authorUserId,
          name: authorMap.get(m.authorUserId)?.name ?? null,
          verifiedBadge: authorMap.get(m.authorUserId)?.verifiedBadge ?? null,
        },
      })),
      total,
      limit,
      offset,
    });
  } catch (error) {
    logger.error('Failed to list deal memos', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to list deal memos');
  }
}

/**
 * POST /api/investor-hub/deal-memos
 * Requires auth. Any authenticated user can write a private memo.
 * Public / logged_in visibility requires verified investor badge or admin.
 */
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return unauthorizedError('You must be logged in to create a deal memo');
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, isAdmin: true, verifiedBadge: true },
    });
    if (!user) return unauthorizedError('User not found');

    const body = (await request.json()) as Record<string, unknown>;
    const validation = validateBody(createDealMemoSchema, body);
    if (!validation.success) {
      return validationError('Invalid deal memo data', validation.errors);
    }

    const data = validation.data;

    // Non-private visibility requires investor verification
    if (data.visibility !== 'private' && !canAuthorInvestorContent(user)) {
      return forbiddenError(
        'Only verified investors can publish deal memos to other members. Keep the memo private or request investor verification.'
      );
    }

    const baseSlug = makeSlug(`${data.companyName} ${data.dealStage}`);
    const slug = await ensureUniqueDealMemoSlug(baseSlug);

    const memo = await prisma.dealMemo.create({
      data: {
        slug,
        authorUserId: user.id,
        companyName: data.companyName,
        companyId: data.companyId ?? null,
        dealStage: data.dealStage,
        investmentAmount: data.investmentAmount ?? null,
        currency: data.currency ?? 'USD',
        thesis: data.thesis,
        risks: data.risks ?? null,
        recommendation: data.recommendation,
        visibility: data.visibility,
        publishedAt: data.publish ? new Date() : null,
      },
    });

    logger.info('Deal memo created', {
      userId: user.id,
      memoId: memo.id,
      slug: memo.slug,
      visibility: memo.visibility,
      published: Boolean(memo.publishedAt),
    });

    return createSuccessResponse({ memo }, 201);
  } catch (error) {
    logger.error('Failed to create deal memo', {
      error: error instanceof Error ? error.message : String(error),
    });
    return internalError('Failed to create deal memo');
  }
}
