import { unstable_cache } from 'next/cache';
import { getContentItem } from '@/lib/dynamic-content';
import { getConjunctionEvents as getOperationalConjunctions, type AlertLevel } from '@/lib/operational-awareness-data';
import { getConjunctionEvents as getDebrisConjunctions } from '@/lib/debris-data';

// /conjunctions — public read of satellite close approaches.
//
// Two very different kinds of rows, kept apart on the page:
//   • LIVE: Space-Track.org public CDMs, stored by fetchConjunctionAlerts()
//     every 6 h under DynamicContent 'satellites:conjunction-alerts:recent-cdms'.
//     The fetcher silently returns 0 when SPACE_TRACK_USER/PASS are unset, so
//     an empty feed is usually "no credentials", and the page says so.
//   • CURATED: OperationalConjunction (10 rows) and ConjunctionEvent (16 rows)
//     are hand-written reference scenarios whose TCAs are set relative to the
//     seed time. They illustrate how a CDM reads; they are not alerts and are
//     labelled that way.
//
// Cached payloads carry ISO strings, never Date objects.

export type { AlertLevel };

export interface StoredCdm {
  tcaTime: string;
  missDistance: number; // metres (Space-Track MISS_DISTANCE)
  probability: number; // collision probability (0..1)
  sat1Name: string;
  sat1NoradId: string;
  sat2Name: string;
  sat2NoradId: string;
  createdAt: string;
}

export interface ConjunctionRow {
  id: string;
  tca: string; // ISO
  primary: string;
  primaryId: string | null;
  secondary: string;
  secondaryId: string | null;
  missDistanceM: number;
  pc: number | null;
  relVelKmS: number | null;
  level: AlertLevel;
  note: string | null; // status / maneuver text for curated rows
  origin: 'space-track' | 'curated';
}

export interface ConjunctionsPageData {
  asOf: string;
  live: {
    credentialsConfigured: boolean;
    fetchedAt: string | null;
    rows: ConjunctionRow[];
    counts: Record<AlertLevel, number>;
    upcoming: number;
    nextTca: string | null;
    closestMissM: number | null;
  };
  curated: {
    rows: ConjunctionRow[];
    counts: Record<AlertLevel, number>;
  };
}

// Pc thresholds follow common operator practice: 1e-4 is the widely used
// maneuver-decision line (NASA CARA "red"), 1e-5 the watch line. A sub-1 km
// miss with unknown/low Pc still rates a look.
export const PC_RED = 1e-4;
export const PC_ORANGE = 1e-5;
export const MISS_YELLOW_M = 1000;

export function levelForCdm(pc: number | null, missM: number): AlertLevel {
  if (pc != null && pc >= PC_RED) return 'red';
  if (pc != null && pc >= PC_ORANGE) return 'orange';
  if (missM < MISS_YELLOW_M) return 'yellow';
  return 'green';
}

function emptyCounts(): Record<AlertLevel, number> {
  return { green: 0, yellow: 0, orange: 0, red: 0 };
}

function countLevels(rows: ConjunctionRow[]): Record<AlertLevel, number> {
  const c = emptyCounts();
  for (const r of rows) c[r.level]++;
  return c;
}

function riskToLevel(risk: string): AlertLevel {
  if (risk === 'critical') return 'red';
  if (risk === 'high') return 'orange';
  if (risk === 'moderate') return 'yellow';
  return 'green';
}

function toIso(v: string | Date): string {
  if (v instanceof Date) return v.toISOString();
  const t = Date.parse(v.endsWith('Z') || /[+-]\d\d:\d\d$/.test(v) ? v : `${v}Z`);
  return Number.isFinite(t) ? new Date(t).toISOString() : v;
}

const getStored = unstable_cache(async () => {
  const [cdm, ops, debris] = await Promise.all([
    getContentItem<StoredCdm[]>('satellites:conjunction-alerts:recent-cdms').catch(() => null),
    getOperationalConjunctions({ limit: 50 }).catch(() => []),
    getDebrisConjunctions({ limit: 50 }).catch(() => []),
  ]);

  const liveRows: ConjunctionRow[] = (Array.isArray(cdm?.data) ? cdm!.data : [])
    .filter((c) => c && typeof c.tcaTime === 'string')
    .map((c, i) => {
      const pc = Number.isFinite(c.probability) && c.probability > 0 ? c.probability : null;
      const miss = Number.isFinite(c.missDistance) ? c.missDistance : 0;
      return {
        id: `cdm-${c.sat1NoradId || 'a'}-${c.sat2NoradId || 'b'}-${c.tcaTime}-${i}`,
        tca: toIso(c.tcaTime),
        primary: c.sat1Name || 'Unknown',
        primaryId: c.sat1NoradId || null,
        secondary: c.sat2Name || 'Unknown',
        secondaryId: c.sat2NoradId || null,
        missDistanceM: miss,
        pc,
        relVelKmS: null, // not carried by the stored CDM shape
        level: levelForCdm(pc, miss),
        note: null,
        origin: 'space-track' as const,
      };
    })
    .sort((a, b) => a.tca.localeCompare(b.tca));

  const curatedRows: ConjunctionRow[] = [
    ...ops.map((e) => ({
      id: `ops-${e.eventId}`,
      tca: e.tca.toISOString(),
      primary: e.primaryObject,
      primaryId: null,
      secondary: e.secondaryObject,
      secondaryId: null,
      missDistanceM: e.missDistance,
      pc: e.collisionProb,
      // Seed stores km/s despite the schema comment; anything ≥ 50 is m/s.
      relVelKmS: e.relativeVelocity == null ? null : e.relativeVelocity >= 50 ? e.relativeVelocity / 1000 : e.relativeVelocity,
      level: e.alertLevel,
      note: e.status,
      origin: 'curated' as const,
    })),
    ...debris.map((e) => ({
      id: `debris-${e.id}`,
      tca: e.eventTime.toISOString(),
      primary: e.primaryObject,
      primaryId: null,
      secondary: e.secondaryObject,
      secondaryId: null,
      missDistanceM: e.missDistance,
      pc: e.probability,
      relVelKmS: null,
      level: riskToLevel(e.riskLevel),
      note: e.maneuverExecuted ? 'maneuver executed' : e.maneuverRequired ? 'maneuver planned' : `${e.orbitType} · ${Math.round(e.altitude)} km`,
      origin: 'curated' as const,
    })),
  ].sort((a, b) => a.tca.localeCompare(b.tca));

  return {
    fetchedAt: cdm?.refreshedAt ? cdm.refreshedAt.toISOString() : null,
    liveRows,
    curatedRows,
  };
}, ['conjunctions-page'], { revalidate: 900 });

export async function getConjunctionsPage(): Promise<ConjunctionsPageData | null> {
  const credentialsConfigured = Boolean(process.env.SPACE_TRACK_USER && process.env.SPACE_TRACK_PASS);
  try {
    const s = await getStored();
    const now = Date.now();
    const upcoming = s.liveRows.filter((r) => Date.parse(r.tca) >= now);
    return {
      asOf: new Date().toISOString(),
      live: {
        credentialsConfigured,
        fetchedAt: s.fetchedAt,
        rows: s.liveRows,
        counts: countLevels(s.liveRows),
        upcoming: upcoming.length,
        nextTca: upcoming[0]?.tca ?? null,
        closestMissM: s.liveRows.length ? Math.min(...s.liveRows.map((r) => r.missDistanceM)) : null,
      },
      curated: {
        rows: s.curatedRows,
        counts: countLevels(s.curatedRows),
      },
    };
  } catch {
    return null;
  }
}
