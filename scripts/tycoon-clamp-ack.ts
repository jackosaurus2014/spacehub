/**
 * Acknowledge Space Tycoon money-clamp rejections (2026-09-13).
 *
 *   railway ssh -s spacehub -- npx tsx scripts/tycoon-clamp-ack.ts [ISO-instant]
 *
 * The `money-clamp-quiet` content-accuracy check pages when the sync
 * plausibility ceiling rejects a real player's income. After an incident is
 * closed — cause fixed and the money restored with
 * scripts/tycoon-ledger-credit.ts — run this to mark everything up to now (or
 * to the given instant) as handled, so the check reports only NEW rejections.
 * Prints `HEX <hex JSON>`.
 */
import prisma from '../src/lib/db';
import { upsertContent } from '../src/lib/dynamic-content';
import { MONEY_CLAMP_ACK_KEY } from '../src/lib/content-accuracy';

async function main() {
  const arg = process.argv[2];
  const at = arg ? new Date(arg) : new Date();
  if (Number.isNaN(at.getTime())) {
    console.error('usage: tycoon-clamp-ack.ts [ISO-instant]');
    process.exit(2);
  }
  const pending = await prisma.marketAuditLog.count({
    where: { eventType: 'client_money_implausible_rejected', createdAt: { lte: at, gte: new Date(at.getTime() - 24 * 3600_000) } },
  });
  await upsertContent(
    MONEY_CLAMP_ACK_KEY,
    'system',
    null,
    { acknowledgedThrough: at.toISOString(), acknowledgedAt: new Date().toISOString(), coveredRows: pending },
    { sourceType: 'manual', expiresAt: new Date(Date.now() + 365 * 24 * 3600_000) },
  );
  console.log('HEX ' + Buffer.from(JSON.stringify({ acknowledgedThrough: at.toISOString(), coveredRows: pending })).toString('hex'));
}

main().then(() => process.exit(0)).catch((err) => { console.error(err); process.exit(1); });
