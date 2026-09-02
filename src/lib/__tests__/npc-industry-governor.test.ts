/**
 * @jest-environment node
 *
 * GAME_DESIGN_REVIEW_2026-09 row 11 — the server-side industrial tick
 * honours the density governor: at 60 thirty-day-active players only the
 * first 2 of 5 corps run; the dormant tail has its resting orders cancelled
 * (both sides) and neither produces nor procures.
 */
const counts: number[] = [];
const cancelled: Record<string, unknown>[] = [];

const prismaMock = {
  gameProfile: { count: jest.fn(async () => counts.shift() ?? 0) },
  marketLimitOrder: { updateMany: jest.fn(async (args: Record<string, unknown>) => { cancelled.push(args); return { count: 2 }; }) },
  // Active corps hit the real tick path, which starts with an upsert — make
  // it fail so the test stays DB-free; the tick catches per-corp errors.
  npcIndustrialCorp: { upsert: jest.fn(async () => { throw new Error('no db in test'); }) },
};
jest.mock('@/lib/db', () => ({ __esModule: true, default: prismaMock }));
jest.mock('@/lib/logger', () => ({ logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() } }));

// Dynamic import (same pattern as api-routes-space-tycoon-e1.test.ts) so the
// mock factory above sees an initialised prismaMock.
async function load() {
  return import('@/lib/game/npc-industry');
}

beforeEach(() => { jest.clearAllMocks(); counts.length = 0; cancelled.length = 0; });

describe('runNpcIndustryTick under the governor', () => {
  it('60 active players → 2 active corps, 3 dormant with orders cancelled', async () => {
    counts.push(60, 60); // 14d count, then 30d count
    const { runNpcIndustryTick, NPC_INDUSTRY_SEEDS, NPC_DORMANT_REASON } = await load();
    const out = await runNpcIndustryTick(new Date('2026-09-02T00:00:00Z'));
    expect(out.active30d).toBe(60);
    expect(out.activeIndustryCorps).toBe(2);
    expect(out.corps).toHaveLength(NPC_INDUSTRY_SEEDS.length);
    const dormant = out.corps.filter(c => c.skipped.includes(NPC_DORMANT_REASON)).map(c => c.corpId);
    expect(dormant).toEqual(NPC_INDUSTRY_SEEDS.slice(2).map(s => s.id));
    // The active head tried to run (and failed on the mocked upsert) — not dormant.
    for (const c of out.corps.slice(0, 2)) expect(c.skipped).not.toContain(NPC_DORMANT_REASON);
    // Both sides of each dormant corp's book are cancelled.
    expect(cancelled).toHaveLength(3);
    for (const call of cancelled) {
      expect(call).toMatchObject({ where: { status: { in: ['open', 'partial'] } }, data: { status: 'cancelled' } });
      expect((call.where as { side?: string }).side).toBeUndefined();
    }
  });

  it('a quiet server keeps all five corps active', async () => {
    counts.push(3, 3);
    const { runNpcIndustryTick, NPC_DORMANT_REASON } = await load();
    const out = await runNpcIndustryTick(new Date('2026-09-02T00:00:00Z'));
    expect(out.activeIndustryCorps).toBe(5);
    expect(out.corps.every(c => !c.skipped.includes(NPC_DORMANT_REASON))).toBe(true);
    expect(cancelled).toHaveLength(0);
  });
});
