/**
 * Apply Balance Pass 14 "opening scarcity" to the LIVE world (2026-09-14).
 *
 *   railway ssh -s spacehub -- npx tsx scripts/tycoon-opening-scarcity.ts          # dry run
 *   railway ssh -s spacehub -- npx tsx scripts/tycoon-opening-scarcity.ts --apply  # commit
 *
 * Epoch 2 opened 2026-08-24 and the hourly NPC restock cron has been adding
 * supply to every market row ever since — including to resources nobody has
 * been anywhere near. Under the Pass 14 model (docs/BALANCE.md "Pass 14 —
 * opening scarcity"; src/lib/game/resources.ts RESOURCE_ORIGINS) an
 * unharvested off-world resource should be sitting at a small fraction of its
 * pricing baseline, not drifting up toward it on NPC restock alone.
 *
 * What this does, per MarketResource row:
 *
 *   - SKIPS anything the order book prices (manufactured hardware,
 *     interstellar goods): baselineSupply 0, no NPC curve, nothing to reset.
 *   - SKIPS anything players have actually been TRADING — any MarketFill,
 *     any non-NPC limit order, or any accumulated totalDemand (a curve buy).
 *     Real trading is real price discovery and this script does not overrule
 *     it. `--force-traded` overrides, for the case where the new model says
 *     a traded resource is still plainly unharvested.
 *   - SKIPS anything already AT or BELOW its opening level. The script only
 *     ever REMOVES phantom NPC supply; it never hands the market units.
 *   - Otherwise sets `totalSupply` to the resource's opening level and
 *     `currentPrice` to the supply-implied fundamental at that level
 *     (market-engine.ts getFundamentalPrice — band-clamped to 3× base), so
 *     the reprice lands as one visible event instead of the mean-revert cron
 *     discovering it over the following day.
 *
 * Idempotent: a second run finds every row already at or below its opening
 * level and changes nothing. Writes one MarketAuditLog row
 * (`opening_scarcity_reset`) and, the FIRST time it commits anything, one
 * public world-feed entry so players read it as a survey revision rather than
 * a silent repricing. Prints `HEX <hex JSON>`.
 */
import prisma from '../src/lib/db';
import { RESOURCE_MAP, RESOURCE_ORIGINS, type ResourceId } from '../src/lib/game/resources';
import { getFundamentalPrice, getSupplyPriceMultiplier } from '../src/lib/game/market-engine';
import { NPC_CORP_PREFIX } from '../src/lib/game/market-orderbook';

const AUDIT_EVENT = 'opening_scarcity_reset';
const ACTIVITY_TYPE = 'market_reprice';
/** Bumped only if the model is re-applied after a further re-tune. */
const MODEL_VERSION = 'pass-14';

type Outcome =
  | 'reset'
  | 'order_book_priced'
  | 'traded'
  | 'already_at_or_below'
  | 'no_definition';

interface Row {
  slug: string;
  outcome: Outcome;
  origin?: string;
  baseline?: number;
  supplyBefore: number;
  supplyAfter: number;
  priceBefore: number;
  priceAfter: number;
  multBefore?: number;
  multAfter?: number;
  fills?: number;
  playerOrders?: number;
  demand?: number;
}

async function main() {
  const apply = process.argv.includes('--apply');
  const forceTraded = process.argv.includes('--force-traded');

  const resources = await prisma.marketResource.findMany({ orderBy: { slug: 'asc' } });
  const rows: Row[] = [];

  for (const r of resources) {
    const def = RESOURCE_MAP.get(r.slug as ResourceId);
    const base: Row = {
      slug: r.slug, outcome: 'no_definition',
      supplyBefore: r.totalSupply, supplyAfter: r.totalSupply,
      priceBefore: r.currentPrice, priceAfter: r.currentPrice,
    };
    if (!def) { rows.push(base); continue; }

    base.origin = def.origin;
    base.baseline = def.baselineSupply;
    base.demand = r.totalDemand;

    // Order-book-priced goods have no supply curve to reset.
    if (def.baselineSupply <= 0) { rows.push({ ...base, outcome: 'order_book_priced' }); continue; }

    const [fills, playerOrders] = await Promise.all([
      prisma.marketFill.count({ where: { resourceSlug: r.slug } }),
      prisma.marketLimitOrder.count({
        where: { resourceSlug: r.slug, NOT: { profileId: { startsWith: NPC_CORP_PREFIX } } },
      }),
    ]);
    base.fills = fills;
    base.playerOrders = playerOrders;

    const traded = fills > 0 || playerOrders > 0 || r.totalDemand > 0;
    if (traded && !forceTraded) { rows.push({ ...base, outcome: 'traded' }); continue; }

    const target = def.startingSupply;
    if (r.totalSupply <= target) { rows.push({ ...base, outcome: 'already_at_or_below' }); continue; }

    const priceAfter = getFundamentalPrice(r.basePrice, target, def.baselineSupply, r.minPrice, r.maxPrice);
    const row: Row = {
      ...base,
      outcome: 'reset',
      supplyAfter: target,
      priceAfter,
      multBefore: Number(getSupplyPriceMultiplier(r.totalSupply, def.baselineSupply).toFixed(3)),
      multAfter: Number(getSupplyPriceMultiplier(target, def.baselineSupply).toFixed(3)),
    };
    rows.push(row);

    if (apply) {
      const history = Array.isArray(r.priceHistory) ? (r.priceHistory as number[]) : [];
      await prisma.marketResource.update({
        where: { id: r.id },
        data: {
          totalSupply: target,
          currentPrice: priceAfter,
          priceHistory: [...history, priceAfter].slice(-50),
        },
      });
    }
  }

  const changed = rows.filter((x) => x.outcome === 'reset');
  const unitsRemoved = changed.reduce((s, x) => s + (x.supplyBefore - x.supplyAfter), 0);
  const summary = {
    model: MODEL_VERSION,
    apply,
    forceTraded,
    resourceCount: resources.length,
    reset: changed.length,
    unitsRemoved: Math.round(unitsRemoved),
    skipped: {
      traded: rows.filter((x) => x.outcome === 'traded').map((x) => x.slug),
      orderBookPriced: rows.filter((x) => x.outcome === 'order_book_priced').length,
      alreadyAtOrBelow: rows.filter((x) => x.outcome === 'already_at_or_below').map((x) => x.slug),
      noDefinition: rows.filter((x) => x.outcome === 'no_definition').map((x) => x.slug),
    },
    changes: changed.map((x) => ({
      slug: x.slug, origin: x.origin, baseline: x.baseline,
      supply: `${Math.round(x.supplyBefore)} → ${x.supplyAfter}`,
      price: `${Math.round(x.priceBefore)} → ${x.priceAfter}`,
      mult: `${x.multBefore}× → ${x.multAfter}×`,
    })),
    worldFeed: 'not-posted' as string,
  };

  // ── Human-readable table ────────────────────────────────────────────────
  console.log(`\nBalance Pass 14 — opening scarcity (${apply ? 'APPLYING' : 'DRY RUN — pass --apply to commit'})\n`);
  console.log('| resource | origin | baseline | supply | price | mult | outcome |');
  console.log('| --- | --- | --- | --- | --- | --- | --- |');
  for (const x of rows) {
    const originLabel = x.origin ? RESOURCE_ORIGINS[x.origin as keyof typeof RESOURCE_ORIGINS]?.label ?? x.origin : '—';
    const supply = x.outcome === 'reset' ? `${Math.round(x.supplyBefore)} → ${x.supplyAfter}` : String(Math.round(x.supplyBefore));
    const price = x.outcome === 'reset' ? `${Math.round(x.priceBefore)} → ${x.priceAfter}` : String(Math.round(x.priceBefore));
    const mult = x.outcome === 'reset' ? `${x.multBefore}× → ${x.multAfter}×` : '—';
    console.log(`| ${x.slug} | ${originLabel} | ${x.baseline ?? '—'} | ${supply} | ${price} | ${mult} | ${x.outcome} |`);
  }
  console.log(`\n${changed.length} resource(s) reset; ${Math.round(unitsRemoved)} phantom NPC units removed.`);

  if (apply && changed.length > 0) {
    await prisma.marketAuditLog.create({
      data: {
        eventType: AUDIT_EVENT,
        severity: 'info',
        details: JSON.parse(JSON.stringify({ ...summary, at: new Date().toISOString() })),
      },
    }).catch((e) => console.error('audit log write failed (non-fatal):', String(e)));

    // ── Public world feed (the "Galactic Activity" log every player reads,
    //    /api/space-tycoon/activity) — players should meet this as an event,
    //    not as prices that silently moved overnight. Posted ONCE: a repeat
    //    run finds the prior row and adds nothing.
    //
    //    PlayerActivity.profileId is a required FK to GameProfile and there
    //    is no system corporation to own a world announcement, so the row is
    //    anchored to the oldest corporation in the world and carries the
    //    exchange's name in `companyName` — which is the only field the feed
    //    renders. The reason is recorded in `metadata.systemAnnouncement`.
    const already = await prisma.playerActivity.findFirst({
      where: { type: ACTIVITY_TYPE },
      orderBy: { createdAt: 'desc' },
    });
    const alreadyThisModel = already && (already.metadata as { model?: string } | null)?.model === MODEL_VERSION;
    if (alreadyThisModel) {
      summary.worldFeed = 'already-posted';
    } else {
      const anchor = await prisma.gameProfile.findFirst({ orderBy: { createdAt: 'asc' }, select: { id: true } });
      if (!anchor) {
        summary.worldFeed = 'skipped-no-profiles';
      } else {
        const headline = changed
          .slice()
          .sort((a, b) => (b.multAfter ?? 0) - (a.multAfter ?? 0))
          .slice(0, 4)
          .map((x) => RESOURCE_MAP.get(x.slug as ResourceId)?.name ?? x.slug);
        await prisma.playerActivity.create({
          data: {
            profileId: anchor.id,
            companyName: 'Sol Commodities Exchange',
            type: ACTIVITY_TYPE,
            title: 'Exchange re-surveys off-world reserves — unharvested commodities reprice sharply',
            description:
              `An audit of deliverable stock found the off-world books badly overstated: nothing has actually been landed from ` +
              `${headline.slice(0, 3).join(', ')}${headline.length > 3 ? ' and others' : ''}. ` +
              `${changed.length} commodities open at survey-level inventory and price accordingly until real production arrives. ` +
              `First cargoes clear at the top of the band.`,
            metadata: JSON.parse(JSON.stringify({
              model: MODEL_VERSION,
              systemAnnouncement: true,
              anchoredToOldestProfile: true,
              resources: changed.map((x) => ({ slug: x.slug, supply: x.supplyAfter, price: x.priceAfter })),
            })),
          },
        });
        summary.worldFeed = 'posted';
      }
    }
  }

  console.log('HEX ' + Buffer.from(JSON.stringify(summary)).toString('hex'));
}

main().then(() => process.exit(0)).catch((err) => { console.error(err); process.exit(1); });
