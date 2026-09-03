// ─── Space Tycoon: Canonical NPC-Party Identity ─────────────────────────────
// Single source of truth for "is this MarketFill / order-book participant id
// an NPC, and what should it be called" — shared by market-share.ts,
// market-orderbook.ts, flow-map.ts, and any future consumer. Deliberately
// dependency-free (no prisma, no other game module) so it's safe to import
// from the pure, unit-tested aggregation layer without dragging in I/O.
//
// Fixed 2026-09-03 (balance-report-2026-q3.ts §8, "two things to fix before
// then"): before this module existed, market-share.ts's rankShares() only
// recognized NPC_PROFILE_ID (the market maker) — the five __NPC_CORP_*
// industrial corporations (npc-industry.ts's NPC_INDUSTRY_SEEDS) were
// misclassified as rival PLAYERS on every /api/space-tycoon/market/share
// response and in every UI reading it (MarketIntelligencePanel,
// MarketOrderBook, RivalsPanel, FlowMapPanel). flow-map.ts had already
// solved the predicate correctly (its own isNpcProfileId, tested at
// __tests__/flow-map.test.ts:173) but kept a private copy instead of a
// shared one, and market-orderbook.ts had a THIRD copy (isNpcParty). All
// three now delegate here.

/** The NPC market maker's profile id — rests standing bid/ask liquidity
 *  (market-orderbook.ts's computeNpcMakerQuote). */
export const NPC_PROFILE_ID = '__NPC_MARKET_MAKER__';

/** Id prefix for the five NPC industrial corporations (npc-industry.ts's
 *  NPC_INDUSTRY_SEEDS). They have no GameProfile row — fills settle against
 *  NpcIndustrialCorp.inventory / .treasury instead (market-orderbook.ts). */
export const NPC_CORP_PREFIX = '__NPC_CORP_';

export function isNpcCorpId(id: string): boolean {
  return id.startsWith(NPC_CORP_PREFIX);
}

/** Any non-player party on the book: the market maker or an NPC industrial
 *  corp. This is the ONE predicate every caller should use — do not
 *  re-derive it from NPC_PROFILE_ID / NPC_CORP_PREFIX locally. */
export function isNpcProfileId(id: string): boolean {
  return id === NPC_PROFILE_ID || isNpcCorpId(id);
}

/** Back-compat alias — market-orderbook.ts named this `isNpcParty` before
 *  the predicate moved here; kept so its existing exports don't churn. */
export const isNpcParty = isNpcProfileId;

/**
 * Known industrial-corp display names, mirrored from npc-industry.ts's
 * NPC_INDUSTRY_SEEDS. Deliberately duplicated (not imported) — npc-industry.ts
 * pulls in prisma, production-chains, market-engine and matchOrders, and
 * this module must stay import-free for the pure aggregation layer
 * (market-share.ts's __tests__ construct it without a real PrismaClient).
 * If npc-industry.ts ever adds a corp before this list is updated, the id
 * falls back to a slug-derived name rather than a bare id or a crash — NPCs
 * are a floor, not a hard dependency.
 */
const NPC_CORP_NAMES: Record<string, string> = {
  [`${NPC_CORP_PREFIX}stellar`]: 'Stellar Industries',
  [`${NPC_CORP_PREFIX}helios`]: 'Helios Energy',
  [`${NPC_CORP_PREFIX}nova`]: 'Nova Aerospace',
  [`${NPC_CORP_PREFIX}frontier`]: 'Frontier Spacecraft',
  [`${NPC_CORP_PREFIX}deep_space`]: 'Deep Space Holdings',
};

/**
 * Sensible display name for an NPC party id: the real industrial-corp name
 * when known (LORE-consistent — these names also appear in contracts and
 * quarterlies), a slug-derived fallback otherwise (id's tail with
 * underscores turned to spaces — the pre-existing flow-map.ts behavior,
 * preserved verbatim so its pinned tests don't churn), or "NPC Market
 * Maker" for the maker. Returns null for a non-NPC id so callers fall back
 * to a looked-up player company name.
 */
export function npcDisplayName(id: string): string | null {
  if (id === NPC_PROFILE_ID) return 'NPC Market Maker';
  if (isNpcCorpId(id)) {
    const known = NPC_CORP_NAMES[id];
    if (known) return known;
    const slug = id.slice(NPC_CORP_PREFIX.length).replace(/_+$/, '');
    return `NPC ${slug.replace(/_/g, ' ')}`;
  }
  return null;
}
