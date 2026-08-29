import { NPC_INDUSTRY_SEEDS, NPC_INDUSTRY_NAMES, populationScale, recipeTierOf } from '../npc-industry';
import { MANUFACTURED_RESOURCE_IDS } from '../economic-sinks';
import { PRODUCTION_CHAINS, facilityTierFor } from '../production-chains';
import { NPC_CORP_PREFIX, isNpcCorpId, isNpcParty } from '../market-orderbook';

// Pure-function coverage for the NPC industrial backdrop. The tick itself
// needs Postgres and is exercised by the hourly cron in prod.
describe('NPC industrial corps — roster', () => {
  it('every corp makes only manufactured goods it has the facility tier for, and consumes only manufactured goods', () => {
    for (const seed of NPC_INDUSTRY_SEEDS) {
      expect(seed.id.startsWith(NPC_CORP_PREFIX)).toBe(true);
      expect(seed.seedTreasury).toBeGreaterThan(0);
      for (const out of seed.focus) {
        expect(MANUFACTURED_RESOURCE_IDS).toContain(out);
        const recipe = PRODUCTION_CHAINS.find((r) => r.outputId === out);
        expect(recipe).toBeDefined();
        expect(facilityTierFor(recipe!)).toBeLessThanOrEqual(seed.capacityTier);
      }
      for (const c of Object.keys(seed.consumes)) expect(MANUFACTURED_RESOURCE_IDS).toContain(c);
    }
  });

  it('between them the corps cover every manufactured good on at least one side', () => {
    const made = new Set(NPC_INDUSTRY_SEEDS.flatMap((s) => s.focus));
    const used = new Set(NPC_INDUSTRY_SEEDS.flatMap((s) => Object.keys(s.consumes)));
    for (const id of MANUFACTURED_RESOURCE_IDS) expect(made.has(id) || used.has(id)).toBe(true);
    // and there is real cross-corp demand: something one corp makes, another buys
    expect(Array.from(made).some((m) => used.has(m))).toBe(true);
  });

  it('names resolve and ids are unique', () => {
    const ids = NPC_INDUSTRY_SEEDS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(NPC_INDUSTRY_NAMES[id]).toBeTruthy();
  });
});

describe('NPC industrial corps — scaling and identity', () => {
  it('recede with population: full weight at ≤10 active corps, floor of 25%', () => {
    expect(populationScale(0)).toBe(1);
    expect(populationScale(10)).toBe(1);
    expect(populationScale(60)).toBeCloseTo(0.8);
    expect(populationScale(1000)).toBe(0.25);
  });

  it('recipeTierOf knows the chain', () => {
    expect(recipeTierOf('steel_ingots')).toBe(1);
    expect(recipeTierOf('satellite_bus')).toBe(3);
    expect(recipeTierOf('iron')).toBeNull();
  });

  it('the book distinguishes corps from the market maker and from players', () => {
    expect(isNpcCorpId(`${NPC_CORP_PREFIX}nova`)).toBe(true);
    expect(isNpcCorpId('__NPC_MARKET_MAKER__')).toBe(false);
    expect(isNpcParty('__NPC_MARKET_MAKER__')).toBe(true);
    expect(isNpcParty(`${NPC_CORP_PREFIX}nova`)).toBe(true);
    expect(isNpcParty('clx123playerid')).toBe(false);
  });
});
