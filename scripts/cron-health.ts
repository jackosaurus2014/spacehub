/**
 * Cron health at a glance (2026-09-13).
 *   railway ssh -s spacehub -- npx tsx scripts/cron-health.ts [hours=24]
 * Prints `HEX <hex JSON>`: failed/partial DataRefreshLog rows in the window,
 * the unresolved persisted freshness alerts (DynamicContent
 * system:freshness-alerts), and the freshest row per module so a silent job
 * shows up as "last run N h ago".
 */
import prisma from '../src/lib/db';

async function main() {
  const hours = Number(process.argv[2] || 24);
  const since = new Date(Date.now() - hours * 3600_000);
  const failed = await prisma.dataRefreshLog.findMany({
    where: { createdAt: { gte: since }, status: { in: ['failed', 'partial'] } },
    orderBy: { createdAt: 'desc' }, take: 40,
    select: { module: true, refreshType: true, status: true, errorMessage: true, createdAt: true },
  });
  const alertRow = await prisma.dynamicContent.findUnique({ where: { contentKey: 'system:freshness-alerts' } });
  let alerts: unknown[] = [];
  try { alerts = alertRow ? (JSON.parse(alertRow.data) as Array<{ resolved?: boolean }>).filter((a) => !a.resolved) : []; } catch { alerts = ['unreadable']; }
  const latest = await prisma.dataRefreshLog.groupBy({ by: ['module'], _max: { createdAt: true }, where: { createdAt: { gte: new Date(Date.now() - 14 * 86400_000) } } });
  const lastRun = latest
    .map((r) => ({ module: r.module, hoursAgo: r._max.createdAt ? Math.round((Date.now() - r._max.createdAt.getTime()) / 36e5 * 10) / 10 : null }))
    .sort((a, b) => (b.hoursAgo ?? 0) - (a.hoursAgo ?? 0));
  const out = {
    windowHours: hours,
    failed: failed.map((r) => ({ module: r.module, type: r.refreshType, status: r.status, at: r.createdAt.toISOString(), error: (r.errorMessage || '').slice(0, 160) })),
    openAlerts: alerts,
    lastRunByModule: lastRun,
  };
  console.log('HEX ' + Buffer.from(JSON.stringify(out)).toString('hex'));
}

main().then(() => process.exit(0)).catch((err) => { console.error(err); process.exit(1); });
