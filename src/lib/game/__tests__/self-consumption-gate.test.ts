/**
 * @jest-environment node
 */
/**
 * Shadow mode must observe, not block (2026-09-15).
 *
 * The four self-consumption routes — build, refit, research, ship — spend the
 * corporation's own materials on its own asset. They were refusing on
 * `loadAuthoritativeInventory`, which returns SERVER truth whenever the
 * profile has a serverResources map and the mode is not 'off'. Production
 * runs the default mode, 'shadow', so those routes were enforcing a clamp
 * that docs/RESOURCE_CLAMP_FALSE_POSITIVE_AUDIT.md documents as unsafe to
 * enforce, because the server map does not yet know every legitimate inflow.
 *
 * It blocked a real player: a save holding 80 aluminium and 40 rare earth,
 * every client gate passing, and a server map holding 0 aluminium, so a
 * 20-aluminium building could not be ordered.
 *
 * These tests pin the contract that fix rests on.
 */
import { checkSelfConsumption } from '../server-inventory';

jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: {
    gameLedgerEntry: { findMany: jest.fn().mockResolvedValue([]) },
    marketAuditLog: { create: jest.fn().mockResolvedValue({}) },
  },
}));

/** A profile whose client view and server map disagree, exactly as observed. */
function disagreeingProfile() {
  return {
    id: 'p_test',
    resources: { aluminum: 80, rare_earth: 40 },
    serverResources: { aluminum: 0, rare_earth: 20 },
  } as never;
}

const COST = { aluminum: 20, rare_earth: 10 };

describe('checkSelfConsumption', () => {
  beforeEach(() => jest.clearAllMocks());

  it('SHADOW allows the spend the client can afford, and records the disagreement', async () => {
    const res = await checkSelfConsumption(disagreeingProfile(), COST, 'build', { mode: 'shadow' });
    expect(res.ok).toBe(true);
    expect(res.refusal).toBeUndefined();
    expect(res.disagreed).toBe(true);
    expect(res.source).toBe('client');
    // The audit row is the whole point: it is the evidence that would justify
    // enforcing later, and without it shadow mode learns nothing.
    const db = jest.requireMock('@/lib/db').default;
    expect(db.marketAuditLog.create).toHaveBeenCalled();
    const row = db.marketAuditLog.create.mock.calls[0][0].data;
    expect(row.details.path).toBe('self_consumption:build:shadow');
    expect(row.resourceSlug).toBe('aluminum');
  });

  it('ENFORCE refuses on server truth and names the real shortfall', async () => {
    const res = await checkSelfConsumption(disagreeingProfile(), COST, 'build', { mode: 'enforce' });
    expect(res.ok).toBe(false);
    expect(res.refusal).toEqual({ slug: 'aluminum', needed: 20, held: 0 });
    expect(res.source).toBe('server');
  });

  it('OFF never reads the server map at all', async () => {
    const res = await checkSelfConsumption(disagreeingProfile(), COST, 'build', { mode: 'off' });
    expect(res.ok).toBe(true);
    expect(res.disagreed).toBe(false);
    expect(res.source).toBe('client');
    const db = jest.requireMock('@/lib/db').default;
    expect(db.marketAuditLog.create).not.toHaveBeenCalled();
  });

  it('still refuses a spend the CLIENT cannot afford, in every mode', async () => {
    const broke = { id: 'p2', resources: { aluminum: 5 }, serverResources: { aluminum: 5 } } as never;
    for (const mode of ['shadow', 'enforce', 'off'] as const) {
      const res = await checkSelfConsumption(broke, COST, 'build', { mode });
      expect(res.ok).toBe(false);
      expect(res.refusal?.slug).toBe('aluminum');
    }
  });

  it('does not audit when the two views agree', async () => {
    const agreeing = { id: 'p3', resources: { aluminum: 80, rare_earth: 40 }, serverResources: { aluminum: 80, rare_earth: 40 } } as never;
    const res = await checkSelfConsumption(agreeing, COST, 'build', { mode: 'shadow' });
    expect(res.ok).toBe(true);
    expect(res.disagreed).toBe(false);
    const db = jest.requireMock('@/lib/db').default;
    expect(db.marketAuditLog.create).not.toHaveBeenCalled();
  });
});

describe('the self-consumption routes', () => {
  const fs = jest.requireActual('fs') as typeof import('fs');
  const path = jest.requireActual('path') as typeof import('path');

  // A route that goes back to refusing on loadAuthoritativeInventory silently
  // re-enforces the clamp on the player's own materials.
  it.each(['build', 'refit', 'research', 'ship'])(
    '%s gates through checkSelfConsumption, not loadAuthoritativeInventory',
    (route) => {
      const src = fs.readFileSync(
        path.join(process.cwd(), `src/app/api/space-tycoon/assets/${route}/route.ts`),
        'utf8',
      );
      expect(src).toContain('checkSelfConsumption');
      expect(src).not.toContain('loadAuthoritativeInventory');
    },
  );
});
