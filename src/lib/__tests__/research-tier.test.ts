/**
 * @jest-environment node
 */
/**
 * SpaceNexus Research — the guards that keep the tier honest.
 *
 * Three things are pinned here, each because getting it wrong would be a
 * product failure rather than a bug:
 *
 *   1. NOTHING WAS TAKEN AWAY. The free and Pro rows of TIER_ACCESS are frozen
 *      against a 2026-09-13 baseline (the day before Research was built). A
 *      capability flipping from true to false for either of them is a downgrade
 *      for people who are already paying, and fails here.
 *   2. THE LEGACY 'enterprise' ROWS ARE UNMOVED. They map to 'pro' and must not
 *      drift up into 'research' or down into 'free'.
 *   3. THE SEAT MODEL DOES NOT LEAK. Every denial path in resolveResearchAccess
 *      is exercised: no subscription, lapsed owner, revoked seat, a seat pushed
 *      outside the purchased cap, and the seat-holder-as-admin case.
 */

import fs from 'fs';
import path from 'path';

// The factory must not close over a module-scope const: jest hoists
// jest.mock() above the imports, and '@/lib/db' is first required while
// importing '../research' — before any const in this file has initialized.
// Build the stub inside the factory, then read it back with requireMock.
jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: {
    user: { findUnique: jest.fn() },
    researchAccount: { findUnique: jest.fn() },
    researchSeat: { findMany: jest.fn() },
  },
}));

import {
  RESEARCH_CAPABILITIES,
  RESEARCH_PLAN,
  RESEARCH_PRICE_ENV_VAR,
  RESEARCH_REJECTED_CAPABILITIES,
  RESEARCH_TIER_FLAG_ENV_VAR,
  getResearchAvailability,
  getResearchPriceId,
  hashResearchInviteToken,
  isResearchTierEnabled,
  resolveResearchAccess,
} from '../research';
import {
  TIER_ACCESS,
  canAccessModule,
  getRequiredTierForModule,
  normalizeTier,
} from '../subscription';
import { getSubscriberPerks } from '../game/subscriber-perks';
import { SUBSCRIPTION_TO_API_TIERS } from '../api-keys';
import { priceIdToTier } from '../stripe';

const mockPrisma = (
  jest.requireMock('@/lib/db') as {
    default: {
      user: { findUnique: jest.Mock };
      researchAccount: { findUnique: jest.Mock };
      researchSeat: { findMany: jest.Mock };
    };
  }
).default;

// ---------------------------------------------------------------------------
// 1. Nothing was taken away
// ---------------------------------------------------------------------------

/**
 * The exact free/pro capability rows as they stood on 2026-09-13, the day
 * before SpaceNexus Research was built. Adding a NEW capability to either tier
 * later is fine — extend this baseline. Flipping one of these values from true
 * to false is a downgrade for a live user and must never happen silently.
 */
const BASELINE_2026_09_13 = {
  free: {
    maxDailyArticles: 15,
    hasStockTracking: true,
    hasMarketIntel: true,
    hasResourceExchange: true,
    hasAIOpportunities: true,
    hasAlerts: false,
    hasAPIAccess: false,
    adFree: false,
    hasDealFlow: true,
    hasSupplyChainMap: false,
    hasExecutiveMoves: true,
    hasRegulatoryCalendar: false,
    hasSpaceScore: true,
    hasSalaryData: true,
  },
  pro: {
    maxDailyArticles: -1,
    hasStockTracking: true,
    hasMarketIntel: true,
    hasResourceExchange: true,
    hasAIOpportunities: true,
    hasAlerts: true,
    hasAPIAccess: true,
    adFree: true,
    hasDealFlow: true,
    hasSupplyChainMap: true,
    hasExecutiveMoves: true,
    hasRegulatoryCalendar: true,
    hasSpaceScore: true,
    hasSalaryData: true,
  },
} as const;

describe('no free or Pro capability moved behind SpaceNexus Research', () => {
  it.each(Object.entries(BASELINE_2026_09_13.free))(
    'free.%s is unchanged from the 2026-09-13 baseline',
    (flag, expected) => {
      expect(TIER_ACCESS.free[flag as keyof typeof TIER_ACCESS.free]).toBe(expected);
    }
  );

  it.each(Object.entries(BASELINE_2026_09_13.pro))(
    'pro.%s is unchanged from the 2026-09-13 baseline',
    (flag, expected) => {
      expect(TIER_ACCESS.pro[flag as keyof typeof TIER_ACCESS.pro]).toBe(expected);
    }
  );

  it('Research is a strict superset of Pro — never less on any flag', () => {
    for (const key of Object.keys(TIER_ACCESS.pro) as (keyof typeof TIER_ACCESS.pro)[]) {
      const pro: boolean | number = TIER_ACCESS.pro[key];
      const research: boolean | number = TIER_ACCESS.research[key];
      if (typeof pro === 'boolean' && typeof research === 'boolean') {
        expect(`${key}=${research}`).toBe(`${key}=${pro || research}`);
      } else if (typeof pro === 'number' && typeof research === 'number') {
        // -1 means unlimited, so it beats any finite number.
        expect(research === -1 || research >= pro).toBe(true);
      } else {
        throw new Error(`${key} changed shape between pro and research`);
      }
    }
  });

  it('the modules Pro already paid for still require only Pro', () => {
    for (const moduleId of [
      'supply-chain',
      'supply-chain-map',
      'regulatory-calendar',
      'compliance',
      'api-docs',
      'deal-rooms',
      'customer-discovery',
    ]) {
      expect(getRequiredTierForModule(moduleId)).toBe('pro');
      expect(canAccessModule('pro', moduleId)).toBe(true);
    }
  });

  it('a Research subscriber can reach every Pro module', () => {
    for (const moduleId of ['supply-chain', 'regulatory-calendar', 'api-docs']) {
      expect(canAccessModule('research', moduleId)).toBe(true);
    }
  });

  it('Pro cannot reach the Research modules, and free cannot either', () => {
    for (const moduleId of [
      'research-exports',
      'research-portfolio',
      'research-screens',
      'research-quarterly',
      'score-history',
    ]) {
      expect(getRequiredTierForModule(moduleId)).toBe('research');
      expect(canAccessModule('free', moduleId)).toBe(false);
      expect(canAccessModule('pro', moduleId)).toBe(false);
      expect(canAccessModule('research', moduleId)).toBe(true);
      expect(canAccessModule('test', moduleId)).toBe(true);
    }
  });

  it('Research grants no Space Tycoon advantage — it gets the Pro perk table', () => {
    expect(getSubscriberPerks('research')).toEqual(getSubscriberPerks('pro'));
  });

  it('Research keeps the API tiers Pro has, and gains none — Pro was already unlimited', () => {
    expect(SUBSCRIPTION_TO_API_TIERS.research).toEqual(SUBSCRIPTION_TO_API_TIERS.pro);
  });
});

// ---------------------------------------------------------------------------
// 2. The legacy enterprise rows
// ---------------------------------------------------------------------------

describe('legacy enterprise subscribers', () => {
  it('still normalize to pro — not promoted to research, not demoted to free', () => {
    expect(normalizeTier('enterprise')).toBe('pro');
  });

  it('their legacy Stripe price IDs still resolve to pro', () => {
    const prev = {
      m: process.env.STRIPE_PRICE_ENTERPRISE_MONTHLY,
      y: process.env.STRIPE_PRICE_ENTERPRISE_YEARLY,
      r: process.env.STRIPE_PRICE_RESEARCH_YEARLY,
    };
    process.env.STRIPE_PRICE_ENTERPRISE_MONTHLY = 'price_legacy_month';
    process.env.STRIPE_PRICE_ENTERPRISE_YEARLY = 'price_legacy_year';
    process.env.STRIPE_PRICE_RESEARCH_YEARLY = 'price_research_year';

    expect(priceIdToTier('price_legacy_month')).toBe('pro');
    expect(priceIdToTier('price_legacy_year')).toBe('pro');
    expect(priceIdToTier('price_research_year')).toBe('research');
    expect(priceIdToTier('price_unknown')).toBeNull();

    process.env.STRIPE_PRICE_ENTERPRISE_MONTHLY = prev.m;
    process.env.STRIPE_PRICE_ENTERPRISE_YEARLY = prev.y;
    if (prev.r === undefined) delete process.env.STRIPE_PRICE_RESEARCH_YEARLY;
    else process.env.STRIPE_PRICE_RESEARCH_YEARLY = prev.r;
  });

  it('an unset research price cannot resolve an unknown price ID to research', () => {
    const prev = process.env.STRIPE_PRICE_RESEARCH_YEARLY;
    delete process.env.STRIPE_PRICE_RESEARCH_YEARLY;
    expect(priceIdToTier('')).not.toBe('research');
    if (prev !== undefined) process.env.STRIPE_PRICE_RESEARCH_YEARLY = prev;
  });

  it('normalizeTier round-trips the real tiers and rejects anything else', () => {
    expect(normalizeTier('research')).toBe('research');
    expect(normalizeTier('pro')).toBe('pro');
    expect(normalizeTier('test')).toBe('test');
    expect(normalizeTier('Research')).toBe('free');
    expect(normalizeTier(null)).toBe('free');
    expect(normalizeTier('nonsense')).toBe('free');
  });
});

// ---------------------------------------------------------------------------
// 3. The flag
// ---------------------------------------------------------------------------

describe('the RESEARCH_TIER_ENABLED flag', () => {
  const saved = {
    flag: process.env[RESEARCH_TIER_FLAG_ENV_VAR],
    price: process.env[RESEARCH_PRICE_ENV_VAR],
  };
  afterEach(() => {
    if (saved.flag === undefined) delete process.env[RESEARCH_TIER_FLAG_ENV_VAR];
    else process.env[RESEARCH_TIER_FLAG_ENV_VAR] = saved.flag;
    if (saved.price === undefined) delete process.env[RESEARCH_PRICE_ENV_VAR];
    else process.env[RESEARCH_PRICE_ENV_VAR] = saved.price;
  });

  it('defaults to OFF when unset — building is not launching', () => {
    delete process.env[RESEARCH_TIER_FLAG_ENV_VAR];
    expect(isResearchTierEnabled()).toBe(false);
    expect(getResearchAvailability().available).toBe(false);
  });

  it('fails closed on anything but the exact string "true"', () => {
    for (const value of ['TRUE', '1', 'yes', 'on', ' true', '']) {
      process.env[RESEARCH_TIER_FLAG_ENV_VAR] = value;
      expect(isResearchTierEnabled()).toBe(false);
    }
  });

  it('is still unavailable when the flag is on but no Stripe price is configured', () => {
    process.env[RESEARCH_TIER_FLAG_ENV_VAR] = 'true';
    delete process.env[RESEARCH_PRICE_ENV_VAR];
    expect(isResearchTierEnabled()).toBe(true);
    expect(getResearchPriceId()).toBeNull();
    // A buy button whose price does not exist is a promise checkout refuses.
    expect(getResearchAvailability().available).toBe(false);
  });

  it('is available only with both the flag and the price', () => {
    process.env[RESEARCH_TIER_FLAG_ENV_VAR] = 'true';
    process.env[RESEARCH_PRICE_ENV_VAR] = 'price_abc';
    const availability = getResearchAvailability();
    expect(availability.available).toBe(true);
    expect(availability.plan.priceYearly).toBe(RESEARCH_PLAN.priceYearly);
    expect(availability.plan.interval).toBe('year');
    expect(availability.plan.trialDays).toBe(0);
  });

  it('treats a whitespace-only price ID as unconfigured', () => {
    process.env[RESEARCH_PRICE_ENV_VAR] = '   ';
    expect(getResearchPriceId()).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 4. The capability registry
// ---------------------------------------------------------------------------

describe('the advertised capability registry', () => {
  it('names a real file that enforces each capability', () => {
    for (const cap of RESEARCH_CAPABILITIES) {
      const full = path.join(process.cwd(), cap.enforcedBy);
      expect(fs.existsSync(full)).toBe(true);
    }
  });

  it('every gated API route actually calls the server-side guard', () => {
    for (const cap of RESEARCH_CAPABILITIES) {
      if (!cap.enforcedBy.startsWith('src/app/api/')) continue;
      const src = fs.readFileSync(path.join(process.cwd(), cap.enforcedBy), 'utf-8');
      expect(src).toContain('requireResearchAccess');
    }
  });

  it('every capability is true for research and false for pro and free', () => {
    for (const cap of RESEARCH_CAPABILITIES) {
      expect(TIER_ACCESS.research[cap.accessFlag]).toBe(true);
      expect(TIER_ACCESS.pro[cap.accessFlag]).toBe(false);
      expect(TIER_ACCESS.free[cap.accessFlag]).toBe(false);
    }
  });

  it('records what was rejected, so it is not re-proposed', () => {
    expect(RESEARCH_REJECTED_CAPABILITIES.length).toBeGreaterThan(0);
    for (const r of RESEARCH_REJECTED_CAPABILITIES) {
      expect(r.idea.length).toBeGreaterThan(0);
      expect(r.why.length).toBeGreaterThan(0);
    }
  });
});

// ---------------------------------------------------------------------------
// 5. Seat authorization
// ---------------------------------------------------------------------------

const OWNER = 'user_owner';
const MEMBER = 'user_member';

function activeOwner(overrides: Record<string, unknown> = {}) {
  return { id: OWNER, subscriptionTier: 'research', subscriptionStatus: 'active', ...overrides };
}

describe('resolveResearchAccess', () => {
  beforeEach(() => {
    mockPrisma.user.findUnique.mockReset();
    mockPrisma.researchAccount.findUnique.mockReset();
    mockPrisma.researchSeat.findMany.mockReset();
  });

  it('denies an anonymous caller', async () => {
    const r = await resolveResearchAccess(null);
    expect(r).toEqual({ ok: false, reason: 'not-signed-in' });
    expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
  });

  it('denies a free member', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: MEMBER,
      subscriptionTier: 'free',
      subscriptionStatus: 'active',
    });
    mockPrisma.researchSeat.findMany.mockResolvedValue([]);
    const r = await resolveResearchAccess(MEMBER);
    expect(r).toEqual({ ok: false, reason: 'no-research-subscription' });
  });

  it('denies a Pro member — Research is not included in Pro', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: MEMBER,
      subscriptionTier: 'pro',
      subscriptionStatus: 'active',
    });
    mockPrisma.researchSeat.findMany.mockResolvedValue([]);
    const r = await resolveResearchAccess(MEMBER);
    expect(r.ok).toBe(false);
  });

  it('denies a legacy enterprise row — it is a Pro subscriber, not a Research one', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: MEMBER,
      subscriptionTier: 'enterprise',
      subscriptionStatus: 'active',
    });
    mockPrisma.researchSeat.findMany.mockResolvedValue([]);
    const r = await resolveResearchAccess(MEMBER);
    expect(r.ok).toBe(false);
  });

  it('allows the paying owner', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(activeOwner());
    mockPrisma.researchAccount.findUnique.mockResolvedValue({ seatsTotal: 5, status: 'active' });
    const r = await resolveResearchAccess(OWNER);
    expect(r).toEqual({
      ok: true,
      access: { ownerUserId: OWNER, via: 'owner', seatsTotal: 5 },
    });
  });

  it('denies an owner whose subscription is past_due', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(
      activeOwner({ subscriptionStatus: 'past_due' })
    );
    const r = await resolveResearchAccess(OWNER);
    expect(r).toEqual({ ok: false, reason: 'subscription-not-active' });
  });

  it('denies an owner whose ResearchAccount has been deactivated', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(activeOwner());
    mockPrisma.researchAccount.findUnique.mockResolvedValue({ seatsTotal: 5, status: 'canceled' });
    const r = await resolveResearchAccess(OWNER);
    expect(r).toEqual({ ok: false, reason: 'subscription-not-active' });
  });

  it('allows an active seat whose owner is still paying', async () => {
    mockPrisma.user.findUnique.mockImplementation(({ where }: { where: { id: string } }) =>
      Promise.resolve(
        where.id === MEMBER
          ? { id: MEMBER, subscriptionTier: 'free', subscriptionStatus: 'active' }
          : { subscriptionTier: 'research', subscriptionStatus: 'active' }
      )
    );
    mockPrisma.researchSeat.findMany
      .mockResolvedValueOnce([{ id: 'seat_1', ownerUserId: OWNER }])
      .mockResolvedValueOnce([{ id: 'seat_1' }, { id: 'seat_2' }]);
    mockPrisma.researchAccount.findUnique.mockResolvedValue({ seatsTotal: 5, status: 'active' });

    const r = await resolveResearchAccess(MEMBER);
    expect(r).toEqual({
      ok: true,
      access: { ownerUserId: OWNER, via: 'seat', seatsTotal: 5, seatId: 'seat_1' },
    });
  });

  it('denies a seat whose owner has lapsed — a seat cannot outlive the subscription', async () => {
    mockPrisma.user.findUnique.mockImplementation(({ where }: { where: { id: string } }) =>
      Promise.resolve(
        where.id === MEMBER
          ? { id: MEMBER, subscriptionTier: 'free', subscriptionStatus: 'active' }
          : { subscriptionTier: 'research', subscriptionStatus: 'canceled' }
      )
    );
    mockPrisma.researchSeat.findMany.mockResolvedValue([{ id: 'seat_1', ownerUserId: OWNER }]);

    const r = await resolveResearchAccess(MEMBER);
    expect(r).toEqual({ ok: false, reason: 'subscription-not-active' });
  });

  it('denies a seat whose owner dropped off Research entirely', async () => {
    mockPrisma.user.findUnique.mockImplementation(({ where }: { where: { id: string } }) =>
      Promise.resolve(
        where.id === MEMBER
          ? { id: MEMBER, subscriptionTier: 'free', subscriptionStatus: 'active' }
          : { subscriptionTier: 'pro', subscriptionStatus: 'active' }
      )
    );
    mockPrisma.researchSeat.findMany.mockResolvedValue([{ id: 'seat_1', ownerUserId: OWNER }]);

    const r = await resolveResearchAccess(MEMBER);
    expect(r).toEqual({ ok: false, reason: 'subscription-not-active' });
  });

  it('denies a seat that falls outside the purchased seat count', async () => {
    // The firm cut its Stripe quantity to 2 (owner + 1). This member's seat is
    // second in the deterministic order, so it is no longer covered.
    mockPrisma.user.findUnique.mockImplementation(({ where }: { where: { id: string } }) =>
      Promise.resolve(
        where.id === MEMBER
          ? { id: MEMBER, subscriptionTier: 'free', subscriptionStatus: 'active' }
          : { subscriptionTier: 'research', subscriptionStatus: 'active' }
      )
    );
    mockPrisma.researchSeat.findMany
      .mockResolvedValueOnce([{ id: 'seat_2', ownerUserId: OWNER }])
      .mockResolvedValueOnce([{ id: 'seat_1' }]); // take: memberCap === 1
    mockPrisma.researchAccount.findUnique.mockResolvedValue({ seatsTotal: 2, status: 'active' });

    const r = await resolveResearchAccess(MEMBER);
    expect(r).toEqual({ ok: false, reason: 'seat-over-cap' });
  });

  it('denies every seat when the firm bought exactly one seat (the owner holds it)', async () => {
    mockPrisma.user.findUnique.mockImplementation(({ where }: { where: { id: string } }) =>
      Promise.resolve(
        where.id === MEMBER
          ? { id: MEMBER, subscriptionTier: 'free', subscriptionStatus: 'active' }
          : { subscriptionTier: 'research', subscriptionStatus: 'active' }
      )
    );
    mockPrisma.researchSeat.findMany.mockResolvedValue([{ id: 'seat_1', ownerUserId: OWNER }]);
    mockPrisma.researchAccount.findUnique.mockResolvedValue({ seatsTotal: 1, status: 'active' });

    const r = await resolveResearchAccess(MEMBER);
    expect(r.ok).toBe(false);
  });

  it('only ever reads seats in status active — a revoked seat is never even a candidate', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: MEMBER,
      subscriptionTier: 'free',
      subscriptionStatus: 'active',
    });
    mockPrisma.researchSeat.findMany.mockResolvedValue([]);
    await resolveResearchAccess(MEMBER);
    expect(mockPrisma.researchSeat.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { memberUserId: MEMBER, status: 'active' },
      })
    );
  });

  it('orders the seat cap deterministically, so revoking a quantity is not a lottery', async () => {
    mockPrisma.user.findUnique.mockImplementation(({ where }: { where: { id: string } }) =>
      Promise.resolve(
        where.id === MEMBER
          ? { id: MEMBER, subscriptionTier: 'free', subscriptionStatus: 'active' }
          : { subscriptionTier: 'research', subscriptionStatus: 'active' }
      )
    );
    mockPrisma.researchSeat.findMany
      .mockResolvedValueOnce([{ id: 'seat_1', ownerUserId: OWNER }])
      .mockResolvedValueOnce([{ id: 'seat_1' }]);
    mockPrisma.researchAccount.findUnique.mockResolvedValue({ seatsTotal: 2, status: 'active' });

    await resolveResearchAccess(MEMBER);
    expect(mockPrisma.researchSeat.findMany).toHaveBeenLastCalledWith(
      expect.objectContaining({
        orderBy: [{ acceptedAt: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }],
        take: 1,
      })
    );
  });
});

describe('seat invite tokens', () => {
  it('are stored as a hash, never in plaintext', () => {
    const token = 'a'.repeat(64);
    const hash = hashResearchInviteToken(token);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(hash).not.toContain(token);
    expect(hashResearchInviteToken(token)).toBe(hash);
    expect(hashResearchInviteToken('b'.repeat(64))).not.toBe(hash);
  });
});
