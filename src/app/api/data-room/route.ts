import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import { validateBody, createDataRoomDocSchema } from '@/lib/validations';
import { validationError, internalError, unauthorizedError, forbiddenError, notFoundError } from '@/lib/errors';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// GET /api/data-room?companyId=... — list docs, enforce visibility
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');
    if (!companyId) {
      return validationError('companyId is required');
    }

    const company = await prisma.companyProfile.findUnique({
      where: { id: companyId },
      select: { id: true, claimedByUserId: true },
    });
    if (!company) return notFoundError('Company');

    const session = await getServerSession(authOptions);
    const userId = session?.user?.id || null;
    const isAdmin = Boolean(session?.user?.isAdmin);
    const isOwner = Boolean(userId && company.claimedByUserId === userId);

    const allowedVisibilities: string[] = ['public'];
    if (userId) allowedVisibilities.push('logged_in');
    const where = isOwner || isAdmin
      ? { companyId: company.id }
      : { companyId: company.id, visibility: { in: allowedVisibilities } };

    const docs = await prisma.dataRoomDocument.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return NextResponse.json({ documents: docs, isOwner, isAdmin });
  } catch (error) {
    logger.error('List data room documents error', { error: error instanceof Error ? error.message : String(error) });
    return internalError('Failed to fetch data room documents');
  }
}

// POST /api/data-room — create, owner only
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return unauthorizedError();

    const body = await request.json();
    const validation = validateBody(createDataRoomDocSchema, body);
    if (!validation.success) {
      return validationError('Validation failed', validation.errors);
    }
    const data = validation.data;

    const company = await prisma.companyProfile.findUnique({
      where: { id: data.companyId },
      select: { id: true, claimedByUserId: true, slug: true },
    });
    if (!company) return notFoundError('Company');

    const isOwner = company.claimedByUserId === session.user.id;
    const isAdmin = Boolean(session.user.isAdmin);
    if (!isOwner && !isAdmin) {
      return forbiddenError('Only the profile owner can upload data room documents');
    }

    const doc = await prisma.dataRoomDocument.create({
      data: {
        companyId: company.id,
        title: data.title,
        description: data.description || null,
        fileUrl: data.fileUrl,
        fileSize: data.fileSize ?? null,
        docType: data.docType || null,
        visibility: data.visibility,
      },
    });

    logger.info('Data room document created', {
      documentId: doc.id,
      companyId: company.id,
      companySlug: company.slug,
      userId: session.user.id,
      visibility: doc.visibility,
    });

    return NextResponse.json({ success: true, document: doc }, { status: 201 });
  } catch (error) {
    logger.error('Create data room document error', { error: error instanceof Error ? error.message : String(error) });
    return internalError('Failed to create data room document');
  }
}
