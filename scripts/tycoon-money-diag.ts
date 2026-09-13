/**
 * Space Tycoon money-desync diagnostic (2026-09-12).
 *
 *   railway ssh -s spacehub -- npx tsx scripts/tycoon-money-diag.ts [email]
 *
 * Prints, as `HEX <hex JSON>` (railway ssh mangles some characters):
 *  - how often the sync plausibility clamp fired in the last 7 days
 *    (MarketAuditLog client_money_implausible_rejected), per profile;
 *  - for one account (default: the founder), the server balance vs the
 *    balance inside its last cloud save, i.e. the gap the player sees
 *    between the dashboard and a refused purchase.
 */
import prisma from '../src/lib/db';

async function main() {
  const email = process.argv[2] || process.env.FOUNDER_EMAIL || process.env.ADMIN_EMAIL || '';
  const since = new Date(Date.now() - 7 * 86400_000);
  const events = await prisma.marketAuditLog.findMany({
    where: { eventType: 'client_money_implausible_rejected', createdAt: { gte: since } },
    orderBy: { createdAt: 'desc' }, take: 500,
    select: { profileId: true, details: true, createdAt: true },
  });
  const byProfile: Record<string, { n: number; maxExcess: number; lastExcess: number; last: string; ceiling: number; headroom: number }> = {};
  for (const e of events) {
    const d = (e.details || {}) as Record<string, unknown>;
    const k = e.profileId || '?';
    const b = (byProfile[k] ||= { n: 0, maxExcess: 0, lastExcess: 0, last: '', ceiling: 0, headroom: 0 });
    b.n++;
    const ex = Number(d.rejectedExcess || 0);
    b.maxExcess = Math.max(b.maxExcess, ex);
    if (!b.last) { b.last = e.createdAt.toISOString(); b.lastExcess = ex; b.ceiling = Number(d.ceiling || 0); b.headroom = Number(d.headroom || 0); }
  }
  const user = email ? await prisma.user.findUnique({ where: { email }, select: { id: true, email: true, gameProfile: { select: { id: true, money: true, lastSyncAt: true, companyName: true, cloudSave: true, cloudSavedAt: true, totalEarned: true, createdAt: true } } } }) : null;
  const gp = user?.gameProfile as (Record<string, unknown> & { id: string }) | null | undefined;
  let cloudMoney: number | null = null;
  try {
    const raw = gp?.cloudSave;
    const cs = typeof raw === 'string' ? JSON.parse(raw) : raw;
    cloudMoney = (cs?.money ?? cs?.state?.money ?? null) as number | null;
  } catch { /* unreadable save */ }
  const profileCount = await prisma.gameProfile.count({ where: { lastSyncAt: { gte: since } } });
  const out = {
    since: since.toISOString(),
    activeProfiles7d: profileCount,
    clampEvents7d: events.length,
    profilesClamped: Object.keys(byProfile).length,
    top: Object.entries(byProfile).sort((a, b) => b[1].n - a[1].n).slice(0, 8),
    account: gp ? {
      email: user?.email, company: gp.companyName, serverMoney: gp.money, cloudMoney, gap: cloudMoney !== null ? Number(cloudMoney) - Number(gp.money) : null,
      lastSyncAt: gp.lastSyncAt, cloudSavedAt: gp.cloudSavedAt, totalEarned: gp.totalEarned, profileSince: gp.createdAt,
      clampEvents: byProfile[gp.id]?.n || 0, maxExcess: byProfile[gp.id]?.maxExcess || 0, lastCeiling: byProfile[gp.id]?.ceiling || 0, lastHeadroom: byProfile[gp.id]?.headroom || 0,
    } : `no profile for ${email || '(no email)'}`,
  };
  console.log('HEX ' + Buffer.from(JSON.stringify(out)).toString('hex'));
}

main().then(() => process.exit(0)).catch((err) => { console.error(err); process.exit(1); });
