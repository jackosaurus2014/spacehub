// ─── Space Tycoon: server-side milestone verification ───────────────────────
// docs/SECURITY_AUDIT_2026-09.md "Game exploit batch 2026-09-02" (H-3).
//
// POST /milestones used to write a GlobalMilestone row for any known
// milestoneId — the condition in milestones.ts was only ever evaluated on
// the client. Every milestone is now verified server-side before the row is
// written, from one of two kinds of fact:
//
//   SERVER-VERIFIED — facts the server owns outright:
//     money (after the plausibility clamp), ColonyClaim rows (a claim costs
//     a burned fee and requires presence — colonies/route.ts).
//   SNAPSHOT-AGED  — facts that live in client-reported columns (buildings,
//     services, research, unlocked locations). These must be present in the
//     profile NOW *and* in an EconomicSnapshot taken >= 24 h ago (the daily
//     cron, economic-snapshot.ts). No snapshot that old yet → 409
//     'verification pending' (the daily cron will produce one). A fact that
//     is forged and then removed never ages into a claim; a fact that is
//     forged and kept for a day shows up in the divergence / clamp telemetry
//     and the snapshot is reversible.
//
// Deadline for the 25 %-late rule: for snapshot-aged facts the qualifying
// time is the FIRST aged snapshot that carries the fact (so the 24 h wait
// itself never pushes an honest player past the target window); for
// server-verified facts it is the claim time.
//
// Which milestone uses which path (kept in sync with milestones.ts):
//
//   milestone_first_billion   money >= 1e9               SERVER-VERIFIED
//   milestone_trillion        money >= 1e12              SERVER-VERIFIED
//   milestone_moon            lunar_surface presence     SERVER (ColonyClaim) or SNAPSHOT-AGED (completed building there)
//   milestone_mars            mars_orbit presence        SERVER (ColonyClaim) or SNAPSHOT-AGED
//   milestone_jupiter         jupiter_system presence    SERVER (ColonyClaim) or SNAPSHOT-AGED
//   milestone_outer_system    outer_system presence      SERVER (ColonyClaim) or SNAPSHOT-AGED
//   milestone_first_orbit     completed building in leo  SNAPSHOT-AGED
//   milestone_asteroid_mine   completed mining_asteroid  SNAPSHOT-AGED
//   milestone_ten_research    >= 10 completed research   SNAPSHOT-AGED
//   milestone_ten_services    >= 10 active services      SNAPSHOT-AGED
//
// Pure: the route loads the rows, this module decides.

export const MILESTONE_SNAPSHOT_AGE_MS = 24 * 3600_000;
/** How many aged snapshots the route loads (oldest first). */
export const MILESTONE_SNAPSHOT_SCAN_LIMIT = 60;

export interface MilestoneProfileFacts {
  money: number;
  buildingsData: unknown;
  activeServicesData: unknown;
  completedResearchList: string[] | null | undefined;
  unlockedLocationsList: string[] | null | undefined;
  /** Location ids of this profile's ColonyClaim rows (server-owned). */
  colonyClaimLocations: string[];
  createdAt: Date;
}

export interface MilestoneSnapshotFacts {
  takenAt: Date;
  buildingsData: unknown;
  activeServicesData: unknown;
  completedResearchList: string[] | null | undefined;
}

export type MilestoneVerification =
  | { ok: true; method: 'server' | 'snapshot'; qualifiedAt: Date }
  | { ok: false; status: 400 | 409; error: string };

type Building = { definitionId?: string; locationId?: string; isComplete?: boolean };

const asArray = <T,>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);

function hasCompletedBuilding(data: unknown, pred: (b: Building) => boolean): boolean {
  return asArray<Building>(data).some(b => !!b && b.isComplete === true && pred(b));
}

/** The per-milestone predicates, evaluated against either the live profile
 *  columns or a snapshot's columns (both carry the same shapes). */
type ColumnFacts = Pick<MilestoneSnapshotFacts, 'buildingsData' | 'activeServicesData' | 'completedResearchList'>;

const PRESENCE_LOCATION: Record<string, string> = {
  milestone_moon: 'lunar_surface',
  milestone_mars: 'mars_orbit',
  milestone_jupiter: 'jupiter_system',
  milestone_outer_system: 'outer_system',
};

function columnCheck(milestoneId: string, f: ColumnFacts): boolean | null {
  switch (milestoneId) {
    case 'milestone_first_orbit':
      return hasCompletedBuilding(f.buildingsData, b => b.locationId === 'leo');
    case 'milestone_asteroid_mine':
      return hasCompletedBuilding(f.buildingsData, b => b.definitionId === 'mining_asteroid');
    case 'milestone_ten_research':
      return Array.isArray(f.completedResearchList) && new Set(f.completedResearchList.filter(r => typeof r === 'string')).size >= 10;
    case 'milestone_ten_services':
      return asArray<{ definitionId?: string }>(f.activeServicesData).filter(s => !!s && typeof s.definitionId === 'string').length >= 10;
    default: {
      const loc = PRESENCE_LOCATION[milestoneId];
      if (!loc) return null;
      return hasCompletedBuilding(f.buildingsData, b => b.locationId === loc);
    }
  }
}

/** Server-owned check; `null` when the milestone has no server-owned fact. */
function serverCheck(milestoneId: string, p: MilestoneProfileFacts): boolean | null {
  switch (milestoneId) {
    case 'milestone_first_billion':
      return Number.isFinite(p.money) && p.money >= 1_000_000_000;
    case 'milestone_trillion':
      return Number.isFinite(p.money) && p.money >= 1_000_000_000_000;
    default: {
      const loc = PRESENCE_LOCATION[milestoneId];
      if (!loc) return null;
      return p.colonyClaimLocations.includes(loc) ? true : null;
    }
  }
}

/** Every milestone id this module knows how to verify. */
export const VERIFIABLE_MILESTONE_IDS = new Set([
  'milestone_first_billion', 'milestone_trillion',
  'milestone_moon', 'milestone_mars', 'milestone_jupiter', 'milestone_outer_system',
  'milestone_first_orbit', 'milestone_asteroid_mine', 'milestone_ten_research', 'milestone_ten_services',
]);

export function verificationMethodFor(milestoneId: string): 'server' | 'server-or-snapshot' | 'snapshot' | 'unknown' {
  if (milestoneId === 'milestone_first_billion' || milestoneId === 'milestone_trillion') return 'server';
  if (PRESENCE_LOCATION[milestoneId]) return 'server-or-snapshot';
  if (VERIFIABLE_MILESTONE_IDS.has(milestoneId)) return 'snapshot';
  return 'unknown';
}

/**
 * Decide whether `milestoneId` is verifiably achieved. `agedSnapshots` must
 * be the profile's snapshots with takenAt <= now - MILESTONE_SNAPSHOT_AGE_MS,
 * OLDEST FIRST (the first one carrying the fact sets the qualifying time).
 */
export function verifyMilestone(
  milestoneId: string,
  profile: MilestoneProfileFacts,
  agedSnapshots: MilestoneSnapshotFacts[],
  nowMs: number = Date.now(),
): MilestoneVerification {
  if (!VERIFIABLE_MILESTONE_IDS.has(milestoneId)) {
    return { ok: false, status: 400, error: 'Milestone cannot be verified server-side' };
  }

  // 1. Server-owned facts settle it immediately.
  const server = serverCheck(milestoneId, profile);
  if (server === true) return { ok: true, method: 'server', qualifiedAt: new Date(nowMs) };
  if (server === false) return { ok: false, status: 400, error: 'Milestone condition not met' };

  // 2. Snapshot-aged: the fact must be present NOW and in an aged snapshot.
  const liveOk = columnCheck(milestoneId, {
    buildingsData: profile.buildingsData,
    activeServicesData: profile.activeServicesData,
    completedResearchList: profile.completedResearchList,
  });
  if (liveOk !== true) return { ok: false, status: 400, error: 'Milestone condition not met' };

  const cutoff = nowMs - MILESTONE_SNAPSHOT_AGE_MS;
  const aged = agedSnapshots
    .filter(s => s && s.takenAt instanceof Date && s.takenAt.getTime() <= cutoff)
    .sort((a, b) => a.takenAt.getTime() - b.takenAt.getTime());
  if (aged.length === 0) {
    return { ok: false, status: 409, error: 'verification pending' };
  }
  const first = aged.find(s => columnCheck(milestoneId, s) === true);
  if (!first) {
    return { ok: false, status: 409, error: 'verification pending' };
  }
  return { ok: true, method: 'snapshot', qualifiedAt: first.takenAt };
}
