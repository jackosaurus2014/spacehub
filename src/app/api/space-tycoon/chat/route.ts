import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

// ─── In-memory chat store (resets on deploy — fine for game chat) ────────────

interface ChatMessage {
  id: string;
  userId: string;
  companyName: string;
  message: string;
  timestamp: number;
}

const messages: ChatMessage[] = [];
const MAX_MESSAGES = 100;
const RATE_LIMIT_MS = 5000; // 1 message per 5 seconds per user
const MAX_MESSAGE_LENGTH = 200;
const lastMessageTime: Record<string, number> = {};

/**
 * GET /api/space-tycoon/chat
 * Returns the last 50 chat messages.
 */
export async function GET() {
  try {
    return NextResponse.json({ messages: messages.slice(-50) });
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

    // Rate limit: 1 message per 5 seconds per user
    const lastTime = lastMessageTime[userId] || 0;
    const timeSinceLast = Date.now() - lastTime;
    if (timeSinceLast < RATE_LIMIT_MS) {
      const waitMs = RATE_LIMIT_MS - timeSinceLast;
      return NextResponse.json(
        { error: `Too fast. Wait ${Math.ceil(waitMs / 1000)}s.` },
        { status: 429 },
      );
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

    const chatMessage: ChatMessage = {
      id: crypto.randomUUID(),
      userId,
      companyName: typeof companyName === 'string' && companyName.trim()
        ? companyName.trim().replace(/<[^>]*>/g, '').slice(0, 50)
        : 'Anonymous',
      message: clean,
      timestamp: Date.now(),
    };

    messages.push(chatMessage);

    // Trim old messages beyond the cap
    if (messages.length > MAX_MESSAGES) {
      messages.splice(0, messages.length - MAX_MESSAGES);
    }

    lastMessageTime[userId] = Date.now();

    return NextResponse.json({ success: true, message: chatMessage });
  } catch (error) {
    logger.error('Failed to send chat message', { error });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
