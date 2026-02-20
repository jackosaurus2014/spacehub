import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

const VALID_CATEGORIES = ['pitch_deck', 'financials', 'technical', 'legal', 'team', 'general'];
const VALID_FILE_TYPES = ['pdf', 'pptx', 'xlsx', 'docx', 'png', 'jpg', 'csv', 'txt'];
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB limit for metadata tracking

// GET — list documents in a room
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;
  const { searchParams } = new URL(request.url);
  const email = searchParams.get('email');
  const category = searchParams.get('category');

  try {
    // Verify membership
    if (email) {
      const membership = await (prisma as any).dealRoomMember.findFirst({
        where: { dealRoomId: id, email },
      });

      if (!membership) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }

      // Check NDA acceptance if required
      const room = await (prisma as any).dealRoom.findUnique({
        where: { id },
        select: { ndaRequired: true },
      });

      if (room?.ndaRequired && !membership.ndaAcceptedAt) {
        return NextResponse.json({ error: 'NDA acceptance required before accessing documents' }, { status: 403 });
      }
    }

    const where: Record<string, unknown> = { dealRoomId: id };
    if (category && VALID_CATEGORIES.includes(category)) {
      where.category = category;
    }

    const documents = await (prisma as any).dealRoomDocument.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ documents });
  } catch (error) {
    logger.error('Failed to fetch documents', { error: error instanceof Error ? error.message : String(error), roomId: id });
    return NextResponse.json({ error: 'Failed to fetch documents' }, { status: 500 });
  }
}

// POST — upload a document (metadata only for MVP)
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;

  try {
    const body = await request.json();
    const { name, category, fileType, fileSize, uploaderEmail, description } = body;

    if (!name || !fileType || !fileSize || !uploaderEmail) {
      return NextResponse.json({ error: 'name, fileType, fileSize, and uploaderEmail are required' }, { status: 400 });
    }

    if (typeof name !== 'string' || name.length > 500) {
      return NextResponse.json({ error: 'Name must be a string under 500 characters' }, { status: 400 });
    }

    if (!VALID_FILE_TYPES.includes(fileType)) {
      return NextResponse.json({ error: `Invalid file type. Allowed: ${VALID_FILE_TYPES.join(', ')}` }, { status: 400 });
    }

    if (typeof fileSize !== 'number' || fileSize <= 0 || fileSize > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'Invalid file size' }, { status: 400 });
    }

    const docCategory = VALID_CATEGORIES.includes(category) ? category : 'general';

    // Verify membership and permission
    const membership = await (prisma as any).dealRoomMember.findFirst({
      where: { dealRoomId: id, email: uploaderEmail, role: { in: ['owner', 'admin'] } },
    });

    if (!membership) {
      return NextResponse.json({ error: 'Only owners and admins can upload documents' }, { status: 403 });
    }

    // Check NDA
    const room = await (prisma as any).dealRoom.findUnique({
      where: { id },
      select: { ndaRequired: true },
    });

    if (room?.ndaRequired && !membership.ndaAcceptedAt) {
      return NextResponse.json({ error: 'NDA acceptance required' }, { status: 403 });
    }

    // Count existing docs with same name for versioning
    const existingCount = await (prisma as any).dealRoomDocument.count({
      where: { dealRoomId: id, name: name.trim() },
    });

    const document = await (prisma as any).dealRoomDocument.create({
      data: {
        dealRoomId: id,
        name: name.trim(),
        category: docCategory,
        fileType,
        fileSize,
        uploadedBy: uploaderEmail,
        description: description?.trim() || null,
        version: existingCount + 1,
      },
    });

    // Log activity
    await (prisma as any).dealRoomActivity.create({
      data: {
        dealRoomId: id,
        userEmail: uploaderEmail,
        action: 'uploaded_document',
        details: `Uploaded "${name.trim()}" (${docCategory}, ${fileType})`,
      },
    });

    logger.info('Deal room document uploaded', { roomId: id, docId: document.id, name: document.name });

    return NextResponse.json({ document }, { status: 201 });
  } catch (error) {
    logger.error('Failed to upload document', { error: error instanceof Error ? error.message : String(error), roomId: id });
    return NextResponse.json({ error: 'Failed to upload document' }, { status: 500 });
  }
}
