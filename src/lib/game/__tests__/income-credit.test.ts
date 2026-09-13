// ─── 2026-09-13: timed-event + delivery credits in the money clamp ──────────
// contract-credit.ts — the founder lost ~$500M of "Precious Metals Bonanza"
// + "Rare Earth Hunt" rewards to the ceiling. Every one-shot client-side
// payout is now credited once, verifiably: timed events against the reward
// formula recomputed from the service count, deliveries against the
// resources they consumed (+ a seed-regenerated payment bound).

import {
  computeTimedEventCredit,
  maxTimedEventReward,
  timedEventCreditId,
  TIMED_EVENT_CREDIT_HEADROOM,
  TIMED_EVENT_CREDIT_MAX_AGE_MS,
  MAX_NEW_TIMED_EVENT_CREDITS_PER_SYNC,
  computeDeliveryCredit,
  regeneratedDeliveryBound,
  parseDeliveryContractId,
  DELIVERY_CREDIT_MULT,
  DELIVERY_SETTLEMENT_CREDIT_MULT,
  DELIVERY_RESOURCE_GATE_FRACTION,
  MAX_FACTION_DELIVERY_PAYMENT_MULT,
  MAX_NEW_DELIVERY_CREDITS_PER_SYNC,
  MAX_REPUTATION_CONTRACT_MULT,
  mergeCreditedIds,
  pruneCreditedIds,
  CREDITED_ID_RETENTION_MS,
} from '../contract-credit';
import { calculateEventReward, EVENT_TEMPLATES, TIMED_EVENT_COMPLETED_RETENTION_MS } from '../timed-events';
import {
  generateContract,
  FACTION_FLAVOR,
  DELIVERY_PAYMENT_NOISE_MAX,
  DELIVERY_POOL_REFRESH_MS,
} from '../delivery-contracts';
import { POSTURE_BAND_MAX } from '../realignment';
import { PRICE_BAND_HIGH } from '../price-band';
import { FRONTIER_CONTRACT_PAYOUT_MULTIPLIER } from '../frontier';
import { MAX_CONTRACT_PAY_BONUS } from '../workforce';
import { maxHqBonus } from '../headquarters';
import { RESOURCE_MAP } from '../resources';
import type { GameState } from '../types';

const NOW = 1_800_000_000_000;
const PMB = 'evt_precious_metals';
const REH = 'evt_rare_earth_hunt';

function viewWithServices(n: number): GameState {
  return { activeServices: Array.from({ length: n }, () => ({})) } as unknown as GameState;
}

function eventClaim(templateId: string, startedAtMs: number, reward: number, completedAtMs = startedAtMs + 3600_000) {
  return { id: timedEventCreditId(templateId, startedAtMs), templateId, startedAtMs, completedAtMs, reward };
}

describe('timed-event credit — bound is the engine formula recomputed server-side', () => {
  it('maxTimedEventReward = calculateEventReward(template, serviceCount) x headroom', () => {
    const t = EVENT_TEMPLATES.find(e => e.id === PMB)!;
    for (const n of [0, 1, 4, 14, 40]) {
      expect(maxTimedEventReward(PMB, n)).toBe(Math.round(calculateEventReward(t, viewWithServices(n)) * TIMED_EVENT_CREDIT_HEADROOM));
    }
    expect(maxTimedEventReward('evt_not_a_template', 3)).toBeNull();
  });

  it('the founder case: one Precious Metals Bonanza + one Rare Earth Hunt on a 14-service corporation', () => {
    // calculateEventReward = max(5M x services, 10M) x rewardMultiplier (4 / 3).
    const pmbReward = calculateEventReward(EVENT_TEMPLATES.find(e => e.id === PMB)!, viewWithServices(14));
    const rehReward = calculateEventReward(EVENT_TEMPLATES.find(e => e.id === REH)!, viewWithServices(14));
    expect(pmbReward).toBe(280_000_000);
    expect(rehReward).toBe(210_000_000);
    const r = computeTimedEventCredit(
      [eventClaim(PMB, NOW - 5 * 3600_000, pmbReward), eventClaim(REH, NOW - 4 * 3600_000, rehReward)],
      [], 14, NOW,
    );
    expect(r.creditedNow).toHaveLength(2);
    expect(r.headroomCredit).toBe(490_000_000); // the full claim — never the bound
    expect(r.rejected).toEqual([]);
    // Bounds at the 1.5 headroom: 420M / 315M.
    expect(maxTimedEventReward(PMB, 14)).toBe(420_000_000);
    expect(maxTimedEventReward(REH, 14)).toBe(315_000_000);
  });

  it('a claim above the bound is credited at the bound, never the claim', () => {
    const r = computeTimedEventCredit([eventClaim(PMB, NOW - 3600_000, 5_000_000_000)], [], 2, NOW);
    expect(r.headroomCredit).toBe(maxTimedEventReward(PMB, 2));
  });

  it('a bare corporation (0 services) still gets the $10M floor x multiplier x headroom', () => {
    expect(maxTimedEventReward(REH, 0)).toBe(Math.round(10_000_000 * 3 * TIMED_EVENT_CREDIT_HEADROOM));
  });

  it('each occurrence is credited once: an already-credited id lifts nothing', () => {
    const c = eventClaim(PMB, NOW - 3600_000, 40_000_000);
    const first = computeTimedEventCredit([c], [], 1, NOW);
    expect(first.creditedNow).toEqual([c.id]);
    const second = computeTimedEventCredit([c], first.creditedAfter, 1, NOW);
    expect(second.creditedNow).toEqual([]);
    expect(second.headroomCredit).toBe(0);
    expect(second.creditedAfter).toEqual(first.creditedAfter);
  });

  it('rejects unknown templates, forged ids, future spawns, completions outside the duration window, stale and non-positive rewards', () => {
    const t = EVENT_TEMPLATES.find(e => e.id === PMB)!; // 8 h window
    const start = NOW - 10 * 3600_000;
    // Distinct spawn timestamps: the credit dedupes claims by occurrence id.
    const claims = [
      { ...eventClaim('evt_bogus', start, 1), templateId: 'evt_bogus' },
      { ...eventClaim(PMB, start, 1), id: 'evt:evt_precious_metals:1' },
      eventClaim(PMB, NOW + 3600_000, 1),
      eventClaim(PMB, start, 1, start + t.durationHours * 3600_000 + 3600_000),
      eventClaim(PMB, start + 1, 1, start),
      eventClaim(REH, NOW - TIMED_EVENT_CREDIT_MAX_AGE_MS - 7 * 3600_000, 1, NOW - TIMED_EVENT_CREDIT_MAX_AGE_MS - 3600_000),
      eventClaim(REH, start + 2, 0),
    ];
    const r = computeTimedEventCredit(claims, [], 3, NOW);
    expect(r.creditedNow).toEqual([]);
    expect(r.rejected.map(x => x.reason)).toEqual([
      'unknown_template', 'bad_id', 'future_start', 'outside_window', 'outside_window', 'too_old', 'bad_reward',
    ]);
  });

  it('the engine keeps completions long enough to be reported, and the credit accepts them', () => {
    expect(TIMED_EVENT_COMPLETED_RETENTION_MS).toBeLessThan(TIMED_EVENT_CREDIT_MAX_AGE_MS);
    const completed = NOW - TIMED_EVENT_COMPLETED_RETENTION_MS + 60_000;
    const r = computeTimedEventCredit([eventClaim(REH, completed - 3600_000, 30_000_000, completed)], [], 2, NOW);
    expect(r.creditedNow).toHaveLength(1);
  });

  it('caps new occurrences per sync and defers the rest (nothing lost)', () => {
    const claims = Array.from({ length: MAX_NEW_TIMED_EVENT_CREDITS_PER_SYNC + 2 }, (_, i) =>
      eventClaim(PMB, NOW - (i + 1) * 3600_000 - 60_000, 1_000_000));
    const r = computeTimedEventCredit(claims, [], 1, NOW);
    expect(r.creditedNow).toHaveLength(MAX_NEW_TIMED_EVENT_CREDITS_PER_SYNC);
    expect(r.deferred).toHaveLength(2);
    expect(r.creditedAfter).not.toEqual(expect.arrayContaining(r.deferred));
  });
});

describe('delivery credit — DELIVERY_CREDIT_MULT is derived from the enforcing constants', () => {
  it('generation maxima x settlement maxima', () => {
    expect(MAX_FACTION_DELIVERY_PAYMENT_MULT).toBe(Math.max(...Object.values(FACTION_FLAVOR).map(f => f.paymentMultiplier)));
    expect(MAX_FACTION_DELIVERY_PAYMENT_MULT).toBe(1.5);
    expect(DELIVERY_SETTLEMENT_CREDIT_MULT).toBeCloseTo(
      PRICE_BAND_HIGH * FRONTIER_CONTRACT_PAYOUT_MULTIPLIER * MAX_REPUTATION_CONTRACT_MULT * (1 + MAX_CONTRACT_PAY_BONUS) * maxHqBonus('contractPayoutMult'), 10);
    expect(DELIVERY_CREDIT_MULT).toBeCloseTo(
      MAX_FACTION_DELIVERY_PAYMENT_MULT * POSTURE_BAND_MAX * DELIVERY_PAYMENT_NOISE_MAX * DELIVERY_SETTLEMENT_CREDIT_MULT, 10);
    // 1.5 x 1.2 x 1.1 x 3.0 x 1.25 x 1.6 x 1.5 x 1.1 ≈ 19.6 at the current
    // constants — asserted loosely so a balance change to one term does not
    // break the derivation test (the product identity above is the contract).
    expect(DELIVERY_CREDIT_MULT).toBeGreaterThan(10);
    expect(DELIVERY_CREDIT_MULT).toBeLessThan(30);
  });
});

describe('delivery credit — seed regeneration bound', () => {
  const gen = generateContract('hive-collective', 4_500_123, NOW, 1.0);

  it('parses the id back to faction + seed', () => {
    expect(parseDeliveryContractId(gen.id)).toEqual({ factionId: 'hive-collective', seed: 4_500_123 });
    expect(parseDeliveryContractId('dlv-no-such-faction-abc-def')).toBeNull();
    expect(parseDeliveryContractId('c_first_launch')).toBeNull();
    expect(parseDeliveryContractId('dlv-hive-collective-ZZ!-x')).toBeNull();
  });

  it('regenerates the contract at the posture band maximum: bound = payment x 1.2 over the generated 1.0', () => {
    const b = regeneratedDeliveryBound(gen.id, gen.resourceId, gen.quantity);
    expect(b.kind).toBe('bound');
    if (b.kind === 'bound') {
      expect(Math.abs(b.maxPayment - gen.paymentMoney * POSTURE_BAND_MAX)).toBeLessThanOrEqual(2);
    }
  });

  it('a claim naming a resource no focus produces for that seed, or a different quantity, is a mismatch (forged)', () => {
    // The procurement focus changes the resource pick, so several resources
    // can be legitimate for one seed; at least one of the catalogue is not.
    const impossible = Array.from(RESOURCE_MAP.keys()).filter(r => regeneratedDeliveryBound(gen.id, r, gen.quantity).kind === 'mismatch');
    expect(impossible.length).toBeGreaterThan(0);
    expect(regeneratedDeliveryBound(gen.id, gen.resourceId, gen.quantity + 1)).toEqual({ kind: 'mismatch' });
  });

  it('an id whose rand segment does not reproduce is unparsable (resource bound only)', () => {
    const forged = gen.id.replace(/-[a-z0-9]+$/, '-zzzz');
    expect(regeneratedDeliveryBound(forged, gen.resourceId, gen.quantity)).toEqual({ kind: 'unparsable' });
    expect(regeneratedDeliveryBound('dlv-x', gen.resourceId, gen.quantity)).toEqual({ kind: 'unparsable' });
  });
});

describe('delivery credit — the resource gate and the three bounds', () => {
  const gen = generateContract('the-dominion', 4_500_000, NOW, 1.0); // Dominion: iron/aluminum/titanium/rare_earth preferred
  const base = RESOURCE_MAP.get(gen.resourceId as never)!.baseMarketPrice;
  const claim = { id: gen.id, resourceId: gen.resourceId, quantity: gen.quantity, paymentMoney: gen.paymentMoney };

  it('credits the claim in full when the resource decrease covers the quantity', () => {
    const prev = { [gen.resourceId]: 1_000 };
    const client = { [gen.resourceId]: 1_000 - gen.quantity };
    const r = computeDeliveryCredit([claim], [], prev, client);
    expect(r.creditedNow).toEqual([gen.id]);
    expect(r.headroomCredit).toBe(gen.paymentMoney);
    expect(r.resourceGate[gen.resourceId]).toEqual({ claimed: gen.quantity, decrease: gen.quantity, passed: true });
  });

  it('tolerates concurrent production: a decrease of half the claimed quantity still passes', () => {
    const prev = { [gen.resourceId]: 1_000 };
    const client = { [gen.resourceId]: 1_000 - Math.ceil(gen.quantity * DELIVERY_RESOURCE_GATE_FRACTION) };
    expect(computeDeliveryCredit([claim], [], prev, client).creditedNow).toEqual([gen.id]);
  });

  it('credits NOTHING for a resource whose stock did not fall enough, and audits every claim on it', () => {
    const prev = { [gen.resourceId]: 1_000 };
    const client = { [gen.resourceId]: 1_000 }; // unchanged
    const r = computeDeliveryCredit([claim], [], prev, client);
    expect(r.creditedNow).toEqual([]);
    expect(r.headroomCredit).toBe(0);
    expect(r.rejected).toEqual([{ id: gen.id, reason: 'resource_gate' }]);
    expect(r.resourceGate[gen.resourceId].passed).toBe(false);
    expect(r.creditedAfter).toEqual([]); // not persisted — a later sync may still prove it
    // A resource the server never saw (absent on both sides) is the same failure.
    expect(computeDeliveryCredit([claim], [], {}, {}).rejected[0].reason).toBe('resource_gate');
  });

  it('a claimed payment above the resource bound is credited at min(resource bound, seed bound)', () => {
    const prev = { [gen.resourceId]: 1_000 };
    const client = { [gen.resourceId]: 1_000 - gen.quantity };
    const r = computeDeliveryCredit([{ ...claim, paymentMoney: 1e12 }], [], prev, client);
    const resourceBound = Math.round(gen.quantity * base * DELIVERY_CREDIT_MULT);
    const seed = regeneratedDeliveryBound(gen.id, gen.resourceId, gen.quantity);
    const seedBound = seed.kind === 'bound' ? Math.round(seed.maxPayment * DELIVERY_SETTLEMENT_CREDIT_MULT) : Infinity;
    expect(r.headroomCredit).toBe(Math.min(resourceBound, seedBound));
    expect(r.headroomCredit).toBeLessThan(1e12);
    expect(seedBound).toBeLessThan(resourceBound); // the seed bound is the tighter one
  });

  it('an unparsable id gets the resource bound only', () => {
    const id = 'dlv-the-dominion-zz-zz';
    const prev = { iron: 500 };
    const client = { iron: 400 };
    const iron = RESOURCE_MAP.get('iron')!.baseMarketPrice;
    const r = computeDeliveryCredit([{ id, resourceId: 'iron', quantity: 100, paymentMoney: 1e12 }], [], prev, client);
    expect(r.creditedNow).toEqual([id]);
    expect(r.headroomCredit).toBe(Math.round(100 * iron * DELIVERY_CREDIT_MULT));
  });

  it('a seed mismatch (real id, a resource that seed cannot produce) is rejected outright', () => {
    const other = Array.from(RESOURCE_MAP.keys()).find(r => regeneratedDeliveryBound(gen.id, r, gen.quantity).kind === 'mismatch')!;
    expect(other).toBeDefined();
    const prev = { [other]: 1_000 };
    const client = { [other]: 1_000 - gen.quantity };
    const r = computeDeliveryCredit([{ ...claim, resourceId: other }], [], prev, client);
    expect(r.creditedNow).toEqual([]);
    expect(r.rejected).toEqual([{ id: gen.id, reason: 'seed_mismatch' }]);
  });

  it('rejects malformed claims and non-delivery ids without touching the gate', () => {
    const r = computeDeliveryCredit([
      { id: 'c_first_launch', resourceId: 'iron', quantity: 10, paymentMoney: 1 },
      { id: 'dlv-a-b-c', resourceId: 'unobtainium', quantity: 10, paymentMoney: 1 },
      { id: 'dlv-a-b-d', resourceId: 'iron', quantity: 0, paymentMoney: 1 },
      { id: 'dlv-a-b-e', resourceId: 'iron', quantity: 1.5, paymentMoney: 1 },
      { id: 'dlv-a-b-f', resourceId: 'iron', quantity: 10, paymentMoney: 0 },
    ], [], { iron: 100 }, { iron: 0 });
    expect(r.creditedNow).toEqual([]);
    expect(r.rejected.map(x => x.reason)).toEqual(['bad_id', 'unknown_resource', 'bad_claim', 'bad_claim', 'bad_claim']);
    expect(r.resourceGate).toEqual({});
  });

  it('each id is credited once; the per-sync cap defers the rest', () => {
    const prev = { [gen.resourceId]: 1_000 };
    const client = { [gen.resourceId]: 1_000 - gen.quantity };
    const first = computeDeliveryCredit([claim], [], prev, client);
    const again = computeDeliveryCredit([claim], first.creditedAfter, prev, client);
    expect(again.creditedNow).toEqual([]);
    expect(again.headroomCredit).toBe(0);

    const many = Array.from({ length: MAX_NEW_DELIVERY_CREDITS_PER_SYNC + 3 }, (_, i) =>
      ({ id: `dlv-the-dominion-q${i}-r`, resourceId: 'iron', quantity: 1, paymentMoney: 1_000 }));
    const capped = computeDeliveryCredit(many, [], { iron: 100 }, { iron: 0 });
    expect(capped.creditedNow).toHaveLength(MAX_NEW_DELIVERY_CREDITS_PER_SYNC);
    expect(capped.deferred).toHaveLength(3);
  });
});

describe('the shared credited-id column', () => {
  it('mergeCreditedIds unions in order without duplicates', () => {
    expect(mergeCreditedIds(['a', 'b'], ['b', 'c'], [], ['a', 'd'])).toEqual(['a', 'b', 'c', 'd']);
  });

  it('pruneCreditedIds keeps static ids forever and drops old occurrence ids', () => {
    const freshEvt = timedEventCreditId(PMB, NOW - 3600_000);
    const oldEvt = timedEventCreditId(PMB, NOW - CREDITED_ID_RETENTION_MS - 1);
    const freshBucket = Math.floor((NOW - 3600_000) / DELIVERY_POOL_REFRESH_MS);
    const oldBucket = Math.floor((NOW - CREDITED_ID_RETENTION_MS - DELIVERY_POOL_REFRESH_MS) / DELIVERY_POOL_REFRESH_MS);
    const freshDlv = generateContract('the-syndicate', freshBucket * 1000 + 37, NOW).id;
    const oldDlv = generateContract('the-syndicate', oldBucket * 1000 + 37, NOW).id;
    expect(pruneCreditedIds(['c_first_launch', freshEvt, oldEvt, freshDlv, oldDlv, 'dlv-garbage'], NOW))
      .toEqual(['c_first_launch', freshEvt, freshDlv, 'dlv-garbage']);
  });
});
