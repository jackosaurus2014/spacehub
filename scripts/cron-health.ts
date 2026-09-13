/**
 * Cron health at a glance (2026-09-13).
 *   railway ssh -s spacehub -- npx tsx scripts/cron-health.ts [hours=24] [modules=content-accuracy,qa-smoke,qa-tycoon]
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
  // Latest row per named module with its details JSON (failing checks etc.).
  const detailModules = (process.argv[3] || 'content-accuracy,qa-smoke,qa-tycoon').split(',').filter(Boolean);
  const latestDetails: Record<string, unknown> = {};
  for (const m of detailModules) {
    const row = await prisma.dataRefreshLog.findFirst({ where: { module: m }, orderBy: { createdAt: 'desc' }, select: { status: true, createdAt: true, errorMessage: true, details: true } });
    if (!row) { latestDetails[m] = null; continue; }
    let parsed: unknown = null; try { parsed = row.details ? JSON.parse(row.details) : null; } catch { parsed = (row.details || '').slice(0, 800); }
    const checks = parsed && typeof parsed === 'object' && Array.isArray((parsed as { checks?: unknown[] }).checks) ? (parsed as { checks: Array<{ id?: string; ok?: boolean; detail?: string }> }).checks.filter((c) => c && c.ok === false).map((c) => ({ id: c.id, detail: (c.detail || '').slice(0, 300) })) : null;
    latestDetails[m] = { status: row.status, at: row.createdAt.toISOString(), error: (row.errorMessage || '').slice(0, 300), failingChecks: checks, raw: checks ? undefined : (typeof parsed === 'string' ? parsed : JSON.stringify(parsed || {}).slice(0, 800)) };
  }
  const out = {
    windowHours: hours,
    latestDetails,
    failed: failed.map((r) => ({ module: r.module, type: r.refreshType, status: r.status, at: r.createdAt.toISOString(), error: (r.errorMessage || '').slice(0, 160) })),
    openAlerts: alerts,
    lastRunByModule: lastRun,
  };
  console.log('HEX ' + Buffer.from(JSON.stringify(out)).toString('hex'));
}

main().then(() => process.exit(0)).catch((err) => { console.error(err); process.exit(1); });
