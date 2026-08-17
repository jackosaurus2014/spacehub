/**
 * Docket intelligence fetcher (Regulatory Wave B, item 2).
 *
 * Uses the official Regulations.gov API v4 (https://api.regulations.gov/v4/,
 * header X-Api-Key, free key signup at
 * https://open.gsa.gov/api/regulationsgov/) to fetch comment counts and
 * recent commenter organizations for dockets attached to RegulatoryAction
 * rows with OPEN comment windows.
 *
 * Env-gated (same pattern as congress-fetcher): when REGULATIONS_GOV_API_KEY
 * is absent this logs once and returns { skipped: true } with zero network
 * calls — the regulatory-feeds pipeline stays healthy without it.
 *
 * Privacy invariant: only the 'organization' field from comment metadata is
 * ever stored. Comments filed by individuals (no organization) contribute to
 * the total count but are never named — firstName/lastName are never read.
 *
 * Bounded: max 10 dockets per run (soonest-closing first), one comments-list
 * page per docket, and detail lookups for at most 8 recent comments per
 * docket.
 */

import prisma from '@/lib/db';
import { createCircuitBreaker } from '@/lib/circuit-breaker';
import { logger } from '@/lib/logger';
import {
  isDocketIntelAvailable,
  upsertDocketSnapshot,
  type DocketOrganization,
} from '@/lib/docket-intel';

const API_BASE = 'https://api.regulations.gov/v4';

export const MAX_DOCKETS_PER_RUN = 10;
export const MAX_COMMENT_DETAILS_PER_DOCKET = 8;

const circuitBreaker = createCircuitBreaker('regulations-gov', {
  failureThreshold: 3,
  resetTimeout: 300000, // 5 min
});

// ---------------------------------------------------------------------------
// Pure parsers (exported for fixture tests — no live HTTP in tests)
// ---------------------------------------------------------------------------

/** Docket ids from a RegulatoryAction.raw payload (FederalRegisterEntry JSON). Pure. */
export function docketIdsFromRaw(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return [];
    // Stored payload uses camelCase (FederalRegisterEntry.docketIds); accept
    // the FR API's snake_case too for robustness.
    const ids = (parsed as { docketIds?: unknown; docket_ids?: unknown }).docketIds
      ?? (parsed as { docket_ids?: unknown }).docket_ids;
    if (!Array.isArray(ids)) return [];
    return ids.filter((id): id is string => typeof id === 'string' && id.trim().length > 0).map((id) => id.trim());
  } catch {
    return [];
  }
}

/**
 * Parse a v4 GET /comments list response: total comment count (meta.totalElements)
 * plus the ids of the returned (most recent) comments. Pure.
 */
export function parseCommentsListResponse(json: unknown): { totalComments: number; commentIds: string[] } {
  const body = (json ?? {}) as {
    data?: Array<{ id?: unknown }>;
    meta?: { totalElements?: unknown };
  };
  const totalRaw = body.meta?.totalElements;
  const totalComments = typeof totalRaw === 'number' && totalRaw >= 0 ? totalRaw : 0;
  const commentIds = Array.isArray(body.data)
    ? body.data.map((item) => item?.id).filter((id): id is string => typeof id === 'string' && id.length > 0)
    : [];
  return { totalComments, commentIds };
}

/**
 * Extract the commenting ORGANIZATION from a v4 GET /comments/{id} detail
 * response. Returns null when the comment was filed without an organization
 * (an individual) — individuals stay anonymous; name fields are never read.
 * Pure.
 */
export function extractOrganization(json: unknown): string | null {
  const attributes = (json as { data?: { attributes?: { organization?: unknown } } } | null)?.data?.attributes;
  const org = attributes?.organization;
  if (typeof org !== 'string') return null;
  const trimmed = org.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Aggregate organization names into [{ name, count }], case-insensitively
 * merged (first-seen casing wins), sorted by count desc then name. Pure.
 */
export function aggregateOrganizations(names: string[]): DocketOrganization[] {
  const byKey = new Map<string, DocketOrganization>();
  for (const name of names) {
    const key = name.trim().toLowerCase();
    if (!key) continue;
    const existing = byKey.get(key);
    if (existing) existing.count++;
    else byKey.set(key, { name: name.trim(), count: 1 });
  }
  return Array.from(byKey.values()).sort(
    (a, b) => b.count - a.count || a.name.localeCompare(b.name)
  );
}

// ---------------------------------------------------------------------------
// Fetch + store
// ---------------------------------------------------------------------------

let missingKeyLogged = false;

export interface DocketIntelFetchResult {
  skipped: boolean;
  docketsChecked: number;
  errors: number;
}

async function fetchJson(path: string, apiKey: string): Promise<unknown> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { Accept: 'application/json', 'X-Api-Key': apiKey },
    signal: AbortSignal.timeout(20000),
  });
  if (!response.ok) {
    throw new Error(`Regulations.gov API error: ${response.status} ${response.statusText}`);
  }
  return response.json();
}

/**
 * Refresh docket snapshots for radar actions with open comment windows.
 * Returns { skipped: true } without touching the network when
 * REGULATIONS_GOV_API_KEY is not configured. Fail-soft everywhere: a missing
 * DocketSnapshot table, a dead docket, or an API error never breaks the
 * regulatory-feeds cron.
 */
export async function fetchAndStoreDocketIntel(now = new Date()): Promise<DocketIntelFetchResult> {
  const apiKey = process.env.REGULATIONS_GOV_API_KEY;
  if (!apiKey) {
    if (!missingKeyLogged) {
      logger.info('[DocketIntel] REGULATIONS_GOV_API_KEY not set — docket intelligence skipped (sign up free at https://open.gsa.gov/api/regulationsgov/)');
      missingKeyLogged = true;
    }
    return { skipped: true, docketsChecked: 0, errors: 0 };
  }

  if (!(await isDocketIntelAvailable())) {
    // Table not migrated yet — probe already logged; skip quietly.
    return { skipped: true, docketsChecked: 0, errors: 0 };
  }

  let docketsChecked = 0;
  let errors = 0;

  try {
    // Only re-check dockets attached to OPEN comment windows, soonest-closing
    // first — those are the ones where "who's commenting" is actionable.
    const openActions = await prisma.regulatoryAction.findMany({
      where: {
        source: 'federal-register',
        commentCloseDate: { gt: now },
        raw: { not: null },
      },
      orderBy: { commentCloseDate: 'asc' },
      take: 40,
      select: { dedupKey: true, raw: true },
    });

    // Unique docket ids, keeping soonest-closing-first order; first action
    // seen claims the docket.
    const docketToAction = new Map<string, string>();
    for (const action of openActions) {
      for (const docketId of docketIdsFromRaw(action.raw)) {
        if (!docketToAction.has(docketId)) docketToAction.set(docketId, action.dedupKey);
      }
    }

    const dockets = Array.from(docketToAction.entries()).slice(0, MAX_DOCKETS_PER_RUN);
    if (dockets.length === 0) {
      logger.info('[DocketIntel] No open-comment dockets to check');
      return { skipped: false, docketsChecked: 0, errors: 0 };
    }

    for (const [docketId, actionDedupKey] of dockets) {
      try {
        const listJson = await circuitBreaker.execute(
          () => fetchJson(`/comments?filter[docketId]=${encodeURIComponent(docketId)}&page[size]=25&sort=-postedDate`, apiKey),
          null as unknown
        );
        if (listJson === null) {
          // Circuit open / fallback — count as an error, keep going.
          errors++;
          continue;
        }
        const { totalComments, commentIds } = parseCommentsListResponse(listJson);

        // Sample recent comments for organization names (bounded).
        const orgNames: string[] = [];
        for (const commentId of commentIds.slice(0, MAX_COMMENT_DETAILS_PER_DOCKET)) {
          try {
            const detailJson = await fetchJson(`/comments/${encodeURIComponent(commentId)}`, apiKey);
            const org = extractOrganization(detailJson);
            if (org) orgNames.push(org);
          } catch (detailError) {
            // One bad comment detail shouldn't sink the docket.
            logger.warn('[DocketIntel] Comment detail fetch failed', {
              docketId,
              commentId,
              error: detailError instanceof Error ? detailError.message : String(detailError),
            });
          }
        }

        await upsertDocketSnapshot({
          docketId,
          actionDedupKey,
          commentCount: totalComments,
          organizations: aggregateOrganizations(orgNames),
        });
        docketsChecked++;
      } catch (docketError) {
        errors++;
        logger.warn('[DocketIntel] Docket check failed', {
          docketId,
          error: docketError instanceof Error ? docketError.message : String(docketError),
        });
      }
    }

    logger.info('[DocketIntel] Refreshed docket snapshots', { docketsChecked, errors });
    return { skipped: false, docketsChecked, errors };
  } catch (error) {
    logger.error('[DocketIntel] Failed to refresh docket intelligence', {
      error: error instanceof Error ? error.message : String(error),
    });
    return { skipped: false, docketsChecked, errors: errors + 1 };
  }
}
