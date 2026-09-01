import { unstable_cache } from 'next/cache';
import prisma from '@/lib/db';

// G8 — Slip Explorer (growth plan). LaunchDateChange records EVERY manifest
// date move we observe (live recording since 2026-08-29 — LL2 exposes no
// revision history, so this ledger cannot be backfilled by anyone, us
// included; that scarcity is the moat AND the reason for honest framing).
// Provider-level reliability claims unlock at a stated threshold rather
// than pretending five rows are a dataset (same discipline as
// /hiring-trends' movers table).

export const PROVIDER_STATS_THRESHOLD = 25;
export const RECORDING_SINCE = '2026-08-29';

export interface SlipRow {
  eventId: string;
  mission: string;
  provider: string | null;
  rocket: string | null;
  fromDate: string;
  toDate: string;
  deltaDays: number; // positive = slipped later, negative = moved earlier
  observedAt: string;
}

export interface SlipData {
  asOf: string;
  totalChanges: number;
  launchesTracked: number;
  biggestRecentSlipDays: number | null;
  recent: SlipRow[];
  providerStatsUnlocked: boolean;
  providers: { provider: string; changes: number; avgSlipDays: number; netDaysLost: number }[];
}

export const getSlipData = unstable_cache(async (): Promise<SlipData | null> => {
  try {
    const [total, distinct, rows] = await Promise.all([
      prisma.launchDateChange.count(),
      prisma.launchDateChange.groupBy({ by: ['eventId'] }).then(r => r.length),
      prisma.launchDateChange.findMany({
        orderBy: { observedAt: 'desc' },
        take: 40,
        include: { event: { select: { name: true, agency: true, rocket: true } } },
      }),
    ]);

    const toRow = (c: (typeof rows)[number]): SlipRow => ({
      eventId: c.eventId,
      mission: c.event?.name || 'Unknown mission',
      provider: c.event?.agency || null,
      rocket: c.event?.rocket || null,
      fromDate: c.fromDate.toISOString(),
      toDate: c.toDate.toISOString(),
      deltaDays: Math.round(((c.toDate.getTime() - c.fromDate.getTime()) / 86400_000) * 10) / 10,
      observedAt: c.observedAt.toISOString(),
    });
    const recent = rows.map(toRow);
    const biggest = recent.length ? Math.max(...recent.map(r => Math.abs(r.deltaDays))) : null;

    let providers: SlipData['providers'] = [];
    const unlocked = total >= PROVIDER_STATS_THRESHOLD;
    if (unlocked) {
      const all = await prisma.launchDateChange.findMany({
        include: { event: { select: { agency: true } } },
      });
      const agg = new Map<string, { changes: number; sum: number }>();
      for (const c of all) {
        const p = c.event?.agency || 'Unknown';
        const d = (c.toDate.getTime() - c.fromDate.getTime()) / 86400_000;
        const e = agg.get(p) || { changes: 0, sum: 0 };
        e.changes++; e.sum += d;
        agg.set(p, e);
      }
      providers = Array.from(agg.entries())
        .map(([provider, e]) => ({
          provider,
          changes: e.changes,
          avgSlipDays: Math.round((e.sum / e.changes) * 10) / 10,
          netDaysLost: Math.round(e.sum),
        }))
        .filter(p => p.changes >= 3)
        .sort((a, b) => b.changes - a.changes)
        .slice(0, 12);
    }

    return {
      asOf: new Date().toISOString(),
      totalChanges: total,
      launchesTracked: distinct,
      biggestRecentSlipDays: biggest,
      recent,
      providerStatsUnlocked: unlocked,
      providers,
    };
  } catch {
    return null;
  }
}, ['launch-slips'], { revalidate: 1800 });
