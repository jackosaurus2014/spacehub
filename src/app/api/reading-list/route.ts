import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';

// GET: Fetch user's reading list
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ items: [] });
    }

    const contentKey = `reading-list:${session.user.id}`;
    const record = await prisma.dynamicContent.findUnique({
      where: { contentKey },
      select: { data: true },
    });
    const items = record ? JSON.parse(record.data) : [];

    return NextResponse.json({ items });
  } catch (error) {
    logger.error('Reading list GET error', {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ items: [] });
  }
}

// POST: Add item to reading list
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { title, url, source, category } = await request.json();
    if (!title || !url) {
      return NextResponse.json(
        { error: 'Title and URL required' },
        { status: 400 }
      );
    }

    const contentKey = `reading-list:${session.user.id}`;
    const record = await prisma.dynamicContent.findUnique({
      where: { contentKey },
      select: { data: true },
    });
    const items = record ? JSON.parse(record.data) : [];

    // Check for duplicate
    if (items.some((item: any) => item.url === url)) {
      return NextResponse.json({ message: 'Already in reading list' });
    }

    items.unshift({
      id: crypto.randomUUID(),
      title,
      url,
      source: source || '',
      category: category || '',
      savedAt: new Date().toISOString(),
      read: false,
    });

    // Keep max 100 items
    const trimmed = items.slice(0, 100);

    // Set expiry far in the future (reading lists are persistent)
    const farFuture = new Date();
    farFuture.setFullYear(farFuture.getFullYear() + 10);

    await prisma.dynamicContent.upsert({
      where: { contentKey },
      update: {
        data: JSON.stringify(trimmed),
        refreshedAt: new Date(),
      },
      create: {
        contentKey,
        module: 'reading-list',
        section: 'bookmarks',
        data: JSON.stringify(trimmed),
        sourceType: 'manual',
        expiresAt: farFuture,
      },
    });

    return NextResponse.json({
      message: 'Added to reading list',
      count: trimmed.length,
    });
  } catch (error) {
    logger.error('Reading list POST error', {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 });
  }
}

// PATCH: Toggle read status
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await request.json();
    if (!id) {
      return NextResponse.json(
        { error: 'Item ID required' },
        { status: 400 }
      );
    }

    const contentKey = `reading-list:${session.user.id}`;
    const record = await prisma.dynamicContent.findUnique({
      where: { contentKey },
      select: { data: true },
    });

    if (!record) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const items = JSON.parse(record.data);
    const item = items.find((i: any) => i.id === id);
    if (!item) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    item.read = !item.read;

    await prisma.dynamicContent.update({
      where: { contentKey },
      data: {
        data: JSON.stringify(items),
        refreshedAt: new Date(),
      },
    });

    return NextResponse.json({
      message: item.read ? 'Marked as read' : 'Marked as unread',
      read: item.read,
    });
  } catch (error) {
    logger.error('Reading list PATCH error', {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: 'Failed to update' },
      { status: 500 }
    );
  }
}

// DELETE: Remove from reading list
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await request.json();
    if (!id) {
      return NextResponse.json(
        { error: 'Item ID required' },
        { status: 400 }
      );
    }

    const contentKey = `reading-list:${session.user.id}`;
    const record = await prisma.dynamicContent.findUnique({
      where: { contentKey },
      select: { data: true },
    });

    if (!record) {
      return NextResponse.json({ message: 'Not found' });
    }

    const items = JSON.parse(record.data).filter(
      (item: any) => item.id !== id
    );

    await prisma.dynamicContent.update({
      where: { contentKey },
      data: {
        data: JSON.stringify(items),
        refreshedAt: new Date(),
      },
    });

    return NextResponse.json({ message: 'Removed', count: items.length });
  } catch (error) {
    logger.error('Reading list DELETE error', {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: 'Failed to remove' },
      { status: 500 }
    );
  }
}
