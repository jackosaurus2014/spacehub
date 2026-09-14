/**
 * How much did the mining double-debit take? (2026-09-14)
 *
 *   railway ssh -s spacehub -- npx tsx scripts/tycoon-double-debit-audit.ts [--since ISO]
 *
 * Between mining Phase A shipping (2026-09-13) and the fix, `mining_order_fuel`
 * and `survey_probe_purchase` were charged twice for signed-in players: once
 * locally by page.tsx when the order was placed, and again when the server's
 * ledger row came back as a pending delta because those reasons were missing
 * from CLIENT_APPLIED_LEDGER_REASONS. Every affected row is a real ledger
 * entry, so the overcharge is exactly the sum of those rows per profile.
 * Prints `HEX <hex JSON>`; restore with scripts/tycoon-ledger-credit.ts.
 */
import prisma from '../src/lib/db';
import { QA_EMAIL_DOMAIN } from '../src/lib/qa-accounts';

async function main() {
  const idx = process.argv.indexOf('--since');
  const since = new Date(idx > 0 ? process.argv[idx + 1] : '2026-09-13T00:00:00Z');
  const rows = await prisma.gameLedgerEntry.findMany({
    where: { reason: { in: ['mining_order_fuel', 'survey_probe_purchase'] }, createdAt: { gte: since } },
    select: { profileId: true, reason: true, moneyDelta: true, createdAt: true },
  });
  const byProfile = new Map<string, { rows: number; total: number; byReason: Record<string, number> }>();
  for (const r of rows) {
    const b = byProfile.get(r.profileId) || { rows: 0, total: 0, byReason: {} };
    b.rows += 1;
    b.total += Math.abs(r.moneyDelta);
    b.byReason[r.reason] = (b.byReason[r.reason] || 0) + Math.abs(r.moneyDelta);
    byProfile.set(r.profileId, b);
  }
  const profiles = await prisma.gameProfile.findMany({
    where: { id: { in: [...byProfile.keys()] }, user: { email: { not: { endsWith: QA_EMAIL_DOMAIN } } } },
    select: { id: true, companyName: true, money: true, user: { select: { email: true } } },
  });
  const out = profiles.map((p) => ({
    profileId: p.id, company: p.companyName, email: p.user?.email ?? null, moneyNow: p.money,
    overcharged: byProfile.get(p.id)?.total ?? 0,
    rows: byProfile.get(p.id)?.rows ?? 0,
    byReason: byProfile.get(p.id)?.byReason ?? {},
  })).sort((a, b) => b.overcharged - a.overcharged);
  console.log('HEX ' + Buffer.from(JSON.stringify({ since: since.toISOString(), ledgerRows: rows.length, realProfiles: out.length, profiles: out })).toString('hex'));
}

main().then(() => process.exit(0)).catch((err) => { console.error(err); process.exit(1); });
