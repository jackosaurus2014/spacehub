import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

// ─── Game chat — Prisma-backed (audit hotlist #7) ────────────────────────────
// The old implementation stored messages in a module-level array: per-lambda
// (players on different instances never saw each other) and wiped on every
// deploy. Messages now persist to GameChatMessage. The in-memory store
// remains ONLY as a fallback until `prisma db push` creates the table.

interface ChatMessageShape {
  id: string;
  userId: string;
  companyName: string;
  message: string;
  timestamp: number;
}

const fallbackMessages: ChatMessageShape[] = [];
const MAX_MESSAGES = 100;
const RATE_LIMIT_MS = 5000; // 1 message per 5 seconds per user
const MAX_MESSAGE_LENGTH = 200;
const lastMessageTime: Record<string, number> = {};

// Cached table-availability probe (mirrors server-ledger.ts pattern)
let chatTableAvailable: boolean | null = null;
let lastProbeAt = 0;
const PROBE_TTL_MS = 5 * 60 * 1000;

async function isChatTableAvailable(): Promise<boolean> {
  if (chatTableAvailable === true) return true;
  const now = Date.now();
  if (chatTableAvailable === false && now - lastProbeAt < PROBE_TTL_MS) return false;
  lastProbeAt = now;
  try {
    await prisma.gameChatMessage.count({ take: 1 });
    chatTableAvailable = true;
  } catch {
    chatTableAvailable = false;
    logger.warn('GameChatMessage table unavailable — chat falling back to in-memory (run prisma db push)');
  }
  return chatTableAvailable;
}

/**
 * GET /api/space-tycoon/chat
 * Returns the last 50 chat messages (global channel).
 */
export async function GET() {
  try {
    if (await isChatTableAvailable()) {
      const rows = await prisma.gameChatMessage.findMany({
        where: { channel: 'global' },
        orderBy: { createdAt: 'desc' },
        take: 50,
        select: { id: true, userId: true, companyName: true, message: true, createdAt: true },
      });
      const messages: ChatMessageShape[] = rows.reverse().map(r => ({
        id: r.id,
        userId: r.userId,
        companyName: r.companyName,
        message: r.message,
        timestamp: r.createdAt.getTime(),
      }));
      return NextResponse.json({ messages });
    }
    return NextResponse.json({ messages: fallbackMessages.slice(-50) });
  } catch (error) {
    logger.error('Failed to fetch chat messages', { error });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/space-tycoon/chat
 * Send a chat message. Requires authentication.
 * Body: { message: string, companyName: string }
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const persistent = await isChatTableAvailable();

    // Rate limit: 1 message per 5 seconds per user. In-memory limiter first
    // (cheap), then a DB check that holds across lambda instances.
    const lastTime = lastMessageTime[userId] || 0;
    const timeSinceLast = Date.now() - lastTime;
    if (timeSinceLast < RATE_LIMIT_MS) {
      const waitMs = RATE_LIMIT_MS - timeSinceLast;
      return NextResponse.json(
        { error: `Too fast. Wait ${Math.ceil(waitMs / 1000)}s.` },
        { status: 429 },
      );
    }
    if (persistent) {
      const recent = await prisma.gameChatMessage.findFirst({
        where: { userId, createdAt: { gt: new Date(Date.now() - RATE_LIMIT_MS) } },
        select: { id: true },
      });
      if (recent) {
        return NextResponse.json({ error: 'Too fast. Wait a few seconds.' }, { status: 429 });
      }
    }

    const body = await request.json();
    const { message, companyName } = body;

    // Validate message
    if (!message || typeof message !== 'string' || !message.trim()) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    if (message.length > MAX_MESSAGE_LENGTH) {
      return NextResponse.json(
        { error: `Message too long (max ${MAX_MESSAGE_LENGTH} chars)` },
        { status: 400 },
      );
    }

    // Sanitize: strip HTML tags, trim, limit length
    const clean = message.trim().replace(/<[^>]*>/g, '').slice(0, MAX_MESSAGE_LENGTH);

    if (!clean) {
      return NextResponse.json({ error: 'Message is empty after sanitization' }, { status: 400 });
    }

    const cleanCompany = typeof companyName === 'string' && companyName.trim()
      ? companyName.trim().replace(/<[^>]*>/g, '').slice(0, 50)
      : 'Anonymous';

    let chatMessage: ChatMessageShape;
    if (persistent) {
      const row = await prisma.gameChatMessage.create({
        data: { channel: 'global', userId, companyName: cleanCompany, message: clean },
      });
      chatMessage = {
        id: row.id,
        userId,
        companyName: cleanCompany,
        message: clean,
        timestamp: row.createdAt.getTime(),
      };
      // Retention: opportunistically trim messages older than 7 days
      if (Math.random() < 0.05) {
        prisma.gameChatMessage.deleteMany({
          where: { createdAt: { lt: new Date(Date.now() - 7 * 24 * 3600_000) } },
        }).catch(() => { /* non-critical */ });
      }
    } else {
      chatMessage = {
        id: crypto.randomUUID(),
        userId,
        companyName: cleanCompany,
        message: clean,
        timestamp: Date.now(),
      };
      fallbackMessages.push(chatMessage);
      if (fallbackMessages.length > MAX_MESSAGES) {
        fallbackMessages.splice(0, fallbackMessages.length - MAX_MESSAGES);
      }
    }

    lastMessageTime[userId] = Date.now();

    return NextResponse.json({ success: true, message: chatMessage });
  } catch (error) {
    logger.error('Failed to send chat message', { error });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
