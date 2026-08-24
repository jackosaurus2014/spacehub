export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import { logger } from '@/lib/logger';
import {
  unauthorizedError,
  forbiddenError,
  internalError,
  validationError,
  notFoundError,
} from '@/lib/errors';
import {
  REACHOUT_CHANNELS,
  STALE_AFTER_HOURS,
  joinFields,
  type ReachoutChannel,
} from '@/lib/reachout-sentinel';

/**
 * Admin triage queue for every inbound channel — the surface the reachout
 * sentinel links to.
 *
 * One route serves all channels by walking REACHOUT_CHANNELS, so a new channel
 * added to that registry appears here with no code change. Only the channels
 * whose registry entry points at ?tab=reachouts are exposed; the rest are
 * owned by their own admin tabs or have no surface yet (see the registry).
 *
 * GET  — open items across the exposed channels, oldest first.
 * PATCH— { channel, id, status } to move one item out of its open state.
 */

/** Separator between a channel's fields in the triage body. */
const PARAGRAPH_BREAK = '\n\n';

/** Channels this queue owns. Others are triaged in their own tab. */
function ownedChannels(): ReachoutChannel[] {
  return REACHOUT_CHANNELS.filter((c) => c.adminUrl?.includes('tab=reachouts'));
}

type Delegate = {
  findMany?: (args: unknown) => Promise<Record<string, unknown>[]>;
  update?: (args: unknown) => Promise<Record<string, unknown>>;
};

function delegateFor(model: string): Delegate | null {
  const d = (prisma as unknown as Record<string, Delegate>)[model];
  return d ?? null;
}

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { error: unauthorizedError() };
  if (!session.user.isAdmin) return { error: forbiddenError('Admin access required') };
  return { error: null };
}

export async function GET() {
  try {
    const { error } = await requireAdmin();
    if (error) return error;

    const now = Date.now();
    const items: Array<Record<string, unknown>> = [];
    const problems: string[] = [];

    for (const ch of ownedChannels()) {
      const delegate = delegateFor(ch.model);
      if (!delegate?.findMany) {
        problems.push(`${ch.key}: unavailable`);
        continue;
      }
      try {
        const rows = await delegate.findMany({
          where: { status: { in: ch.openStatuses } },
          orderBy: { [ch.dateField]: 'asc' },
          take: 200,
        });
        for (const row of rows) {
          const raw = row[ch.dateField];
          const at = raw instanceof Date ? raw : new Date(String(raw));
          const ageHours = (now - at.getTime()) / 3_600_000;
          items.push({
            channel: ch.key,
            channelLabel: ch.label,
            id: String(row.id ?? ''),
            who: joinFields(row, ch.identityFields, ' · ') || 'unknown sender',
            // Full text, not a preview. This is the triage surface — the whole
            // point is reading what the person actually wrote. Capped only to
            // keep one pathological submission from bloating the payload.
            body: joinFields(row, ch.gistFields, PARAGRAPH_BREAK).slice(0, 8000) || '(no message body)',
            status: String(row.status ?? ''),
            receivedAt: at.toISOString(),
            ageHours,
            stale: ageHours >= STALE_AFTER_HOURS,
          });
        }
      } catch (dbError) {
        // Table not migrated yet, or a renamed column — report, don't 500.
        problems.push(`${ch.key}: ${dbError instanceof Error ? dbError.message.split('\n')[0] : 'query failed'}`);
      }
    }

    items.sort((a, b) => (b.ageHours as number) - (a.ageHours as number));

    return NextResponse.json({
      success: true,
      data: items,
      staleAfterHours: STALE_AFTER_HOURS,
      channels: ownedChannels().map((c) => ({ key: c.key, label: c.label, openStatuses: c.openStatuses })),
      problems,
    });
  } catch (err) {
    logger.error('Admin reachouts GET failed', {
      error: err instanceof Error ? err.message : String(err),
    });
    return internalError('Failed to load reachouts');
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { error } = await requireAdmin();
    if (error) return error;

    const body = await request.json().catch(() => null);
    const channelKey = typeof body?.channel === 'string' ? body.channel : '';
    const id = typeof body?.id === 'string' ? body.id : '';
    const status = typeof body?.status === 'string' ? body.status : '';

    const channel = ownedChannels().find((c) => c.key === channelKey);
    if (!channel) return validationError('Unknown or unmanaged channel');
    if (!id) return validationError('id is required');

    // Only allow moving an item OUT of an open state. Anything else would let
    // an arbitrary string be written into a status column.
    if (!status || channel.openStatuses.includes(status)) {
      return validationError(
        `status must be a closing status (not one of: ${channel.openStatuses.join(', ')})`,
      );
    }

    const delegate = delegateFor(channel.model);
    if (!delegate?.update) return internalError('Channel unavailable');

    try {
      await delegate.update({ where: { id }, data: { status } });
      logger.info('Reachout status updated', { channel: channelKey, id, status });
      return NextResponse.json({ success: true });
    } catch {
      return notFoundError('Reachout not found');
    }
  } catch (err) {
    logger.error('Admin reachouts PATCH failed', {
      error: err instanceof Error ? err.message : String(err),
    });
    return internalError('Failed to update reachout');
  }
}
