import { unstable_cache } from 'next/cache';
import prisma from '@/lib/db';

// G1 — SpaceNexus Launch Cadence Index (growth plan item 1, founder "go"
// 2026-09-01). Live YoY orbital-launch pace from our own SpaceEvent history
// (LL2-sourced, backfilled through Jan 2025; type-classifier bug that hid
// 289 Starlink launches fixed the same day — the universe below is defined
// by FLOWN + rocket, deliberately independent of the type column).
//
// Definitions (stated on-page for citability):
// - "Launch attempt": an orbital launch that lifted off — status completed
//   or failed. Scrubs and stand-downs are not attempts.
// - "To date" comparisons cut both years at the same UTC day-of-year.

export interface CadenceProviderRow {
  provider: string;
  thisYear: number;
  lastYearToDate: number;
  delta: number;
  successRate: number; // 0-100, this year
}

export interface CadenceData {
  asOf: string; // ISO
  year: number;
  thisYearToDate: number;
  lastYearToDate: number;
  paceDeltaPct: number | null;
  projectedFullYear: number;
  successRateThisYear: number; // 0-100
  providers: CadenceProviderRow[];
  countries: { country: string; thisYear: number; lastYearToDate: number }[];
}

/** Blank-agency rows (~5%) get a provider inferred from the rocket name so
 *  the table doesn't ship an "Unknown" top-10 entry for known vehicles. */
function normalizeProvider(agency: string | null, rocket: string | null): string {
  const a = (agency || '').trim();
  if (a) {
    // LL2 long names → the names readers know.
    if (/china aerospace science and technology/i.test(a)) return 'CASC';
    if (/russian federal space agency|roscosmos/i.test(a)) return 'Roscosmos';
    if (/japan aerospace exploration/i.test(a)) return 'JAXA';
    if (/indian space research/i.test(a)) return 'ISRO';
    if (/united launch alliance/i.test(a)) return 'ULA';
    return a;
  }
  const r = (rocket || '').toLowerCase();
  if (r.includes('falcon') || r.includes('starship')) return 'SpaceX';
  if (r.includes('electron') || r.includes('neutron')) return 'Rocket Lab';
  if (r.includes('long march')) return 'CASC';
  if (r.includes('soyuz') || r.includes('proton') || r.includes('angara')) return 'Roscosmos';
  if (r.includes('new glenn') || r.includes('new shepard')) return 'Blue Origin';
  if (r.includes('vulcan') || r.includes('atlas')) return 'ULA';
  if (r.includes('ariane') || r.includes('vega')) return 'Arianespace';
  if (r.includes('zhuque')) return 'LandSpace';
  return 'Other';
}

export const getLaunchCadence = unstable_cache(async (): Promise<CadenceData | null> => {
  try {
    const now = new Date();
    const year = now.getUTCFullYear();
    const startThis = new Date(Date.UTC(year, 0, 1));
    const startLast = new Date(Date.UTC(year - 1, 0, 1));
    const cutLast = new Date(Date.UTC(year - 1, now.getUTCMonth(), now.getUTCDate(), 23, 59, 59));

    const rows = await prisma.spaceEvent.findMany({
      where: {
        status: { in: ['completed', 'failed'] },
        rocket: { not: null },
        launchDate: { gte: startLast, lte: now },
      },
      select: { launchDate: true, status: true, agency: true, rocket: true, country: true },
    });

    const thisYearRows = rows.filter(r => r.launchDate! >= startThis);
    const lastYearTdRows = rows.filter(r => r.launchDate! >= startLast && r.launchDate! <= cutLast);

    const thisYearToDate = thisYearRows.length;
    const lastYearToDate = lastYearTdRows.length;
    const successes = thisYearRows.filter(r => r.status === 'completed').length;
    const dayOfYear = Math.max(1, Math.floor((now.getTime() - startThis.getTime()) / 86400_000));

    const provCount = new Map<string, { t: number; l: number; s: number }>();
    for (const r of thisYearRows) {
      const p = normalizeProvider(r.agency, r.rocket);
      const e = provCount.get(p) || { t: 0, l: 0, s: 0 };
      e.t++; if (r.status === 'completed') e.s++;
      provCount.set(p, e);
    }
    for (const r of lastYearTdRows) {
      const p = normalizeProvider(r.agency, r.rocket);
      const e = provCount.get(p) || { t: 0, l: 0, s: 0 };
      e.l++;
      provCount.set(p, e);
    }
    const providers: CadenceProviderRow[] = Array.from(provCount.entries())
      .map(([provider, e]) => ({
        provider,
        thisYear: e.t,
        lastYearToDate: e.l,
        delta: e.t - e.l,
        successRate: e.t > 0 ? Math.round((e.s / e.t) * 100) : 0,
      }))
      .sort((a, b) => b.thisYear - a.thisYear)
      .slice(0, 12);

    const ctryCount = new Map<string, { t: number; l: number }>();
    for (const r of thisYearRows) {
      const c = (r.country || 'Unknown').trim() || 'Unknown';
      const e = ctryCount.get(c) || { t: 0, l: 0 };
      e.t++; ctryCount.set(c, e);
    }
    for (const r of lastYearTdRows) {
      const c = (r.country || 'Unknown').trim() || 'Unknown';
      const e = ctryCount.get(c) || { t: 0, l: 0 };
      e.l++; ctryCount.set(c, e);
    }
    const countries = Array.from(ctryCount.entries())
      .map(([country, e]) => ({ country, thisYear: e.t, lastYearToDate: e.l }))
      .sort((a, b) => b.thisYear - a.thisYear)
      .slice(0, 8);

    return {
      asOf: now.toISOString(),
      year,
      thisYearToDate,
      lastYearToDate,
      paceDeltaPct: lastYearToDate > 0 ? Math.round(((thisYearToDate - lastYearToDate) / lastYearToDate) * 1000) / 10 : null,
      projectedFullYear: Math.round((thisYearToDate / dayOfYear) * 365),
      successRateThisYear: thisYearToDate > 0 ? Math.round((successes / thisYearToDate) * 1000) / 10 : 0,
      providers,
      countries,
    };
  } catch {
    return null;
  }
}, ['launch-cadence'], { revalidate: 3600 });
