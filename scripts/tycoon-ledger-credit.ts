/**
 * Operator ledger credit/debit for a Space Tycoon profile (2026-09-13).
 *
 *   railway ssh -s spacehub -- npx tsx scripts/tycoon-ledger-credit.ts <email> <amount> "<note>"
 *
 * Writes ONE GameLedgerEntry with reason `admin_adjustment` (positive or
 * negative). Nothing else is touched: on the profile's next sync the server
 * folds the row into reconciledMoney and the client applies it as a delta
 * (ledger-reconcile.ts), so both sides move together. Use it to restore
 * income the plausibility ceiling rejected wrongly; audit trail = the row
 * itself (refId carries the note). Prints `HEX <hex JSON>`.
 */
import prisma from '../src/lib/db';
import { recordLedger } from '../src/lib/game/server-ledger';

async function main() {
  const [email, amountRaw, note] = process.argv.slice(2);
  const amount = Math.round(Number(amountRaw));
  if (!email || !Number.isFinite(amount) || amount === 0 || !note) {
    console.error('usage: tycoon-ledger-credit.ts <email> <amount> "<note>"');
    process.exit(2);
  }
  const user = await prisma.user.findUnique({ where: { email }, select: { id: true, gameProfile: { select: { id: true, money: true, companyName: true } } } });
  if (!user?.gameProfile) { console.error('no game profile for ' + email); process.exit(1); }
  const p = user.gameProfile;
  await recordLedger(prisma, { profileId: p.id, moneyDelta: amount, reason: 'admin_adjustment', refId: `admin:${new Date().toISOString().slice(0, 10)}:${note.slice(0, 80)}` });
  const last = await prisma.gameLedgerEntry.findFirst({ where: { profileId: p.id, reason: 'admin_adjustment' }, orderBy: { seq: 'desc' }, select: { seq: true, moneyDelta: true, refId: true, createdAt: true } });
  console.log('HEX ' + Buffer.from(JSON.stringify({ email, company: p.companyName, serverMoneyBefore: p.money, credited: amount, entry: last })).toString('hex'));
}

main().then(() => process.exit(0)).catch((err) => { console.error(err); process.exit(1); });
