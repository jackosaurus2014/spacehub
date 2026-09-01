import { unstable_cache } from 'next/cache';
import prisma from '@/lib/db';

// G11 — "how many satellites are in orbit" (growth plan). Two data classes,
// kept honestly separate:
//  1. LIVE totals from our daily SATCAT snapshot (DebrisStats — refreshed
//     every morning by the space-environment cron).
//  2. CURATED per-constellation counts, web-verified with sources and an
//     explicit as-of date (the SatelliteOperator table is a stale Feb seed —
//     deliberately NOT used). Refresh cadence: monthly, or on major news.
// Do not present curated numbers as live; the page labels each class.

export const CONSTELLATION_COUNTS_AS_OF = '2026-09-01';

export interface ConstellationCount {
  name: string;
  operator: string;
  satellites: number;
  approx: boolean;
  countDate: string; // when the SOURCE stated the number
  note: string;
  sourceUrl: string;
}

// Verified 2026-09-01 (session log carries the searches).
export const CONSTELLATION_COUNTS: ConstellationCount[] = [
  {
    name: 'Starlink', operator: 'SpaceX', satellites: 11_102, approx: false, countDate: '2026-08-27',
    note: '11,087 working; the largest constellation ever flown (Jonathan McDowell tracking).',
    sourceUrl: 'https://www.space.com/spacex-starlink-satellites.html',
  },
  {
    name: 'OneWeb', operator: 'Eutelsat', satellites: 651, approx: true, countDate: '2026-08-25',
    note: 'First-generation constellation complete at ~648 operational slots; 440 next-gen satellites on order from Airbus.',
    sourceUrl: 'https://www.eoportal.org/satellite-missions/oneweb',
  },
  {
    name: 'Amazon Leo (ex-Kuiper)', operator: 'Amazon', satellites: 391, approx: true, countDate: '2026-08-31',
    note: 'Renamed from Project Kuiper in Nov 2025; third-largest constellation and climbing fast.',
    sourceUrl: 'https://directory.eoportal.org/satellite-missions/projectkuiper',
  },
];

export interface SatelliteTotals {
  asOf: string; // snapshot date ISO
  totalTracked: number;
  totalPayloads: number;
  totalRocketBodies: number;
  totalDebris: number;
  leo: number;
  meo: number;
  geo: number;
}

export const getSatelliteTotals = unstable_cache(async (): Promise<SatelliteTotals | null> => {
  try {
    const s = await prisma.debrisStats.findFirst({ orderBy: { snapshotDate: 'desc' } });
    if (!s) return null;
    return {
      asOf: s.snapshotDate.toISOString(),
      totalTracked: s.totalTracked,
      totalPayloads: s.totalPayloads,
      totalRocketBodies: s.totalRocketBodies,
      totalDebris: s.totalDebris,
      leo: s.leoCount,
      meo: s.meoCount,
      geo: s.geoCount,
    };
  } catch {
    return null;
  }
}, ['satellite-totals'], { revalidate: 3600 });
