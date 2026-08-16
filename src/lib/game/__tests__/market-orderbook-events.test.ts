/**
 * @jest-environment node
 *
 * Wave M4 (docs/MEANINGFUL_2026-08.md §M4, F10) — the NPC maker must not be
 * a free, risk-free counterparty during a known market-event window: its
 * spread doubles and its resting volume cap halves. This suite exercises
 * `getNPCMarketMakerOrders` with `isMarketEventActiveForResource` mocked so
 * the event-window branch is deterministic to test, without needing the
 * real wall-clock schedule to line up with a live event.
 *
 * '@/lib/db' is mocked purely so importing market-orderbook.ts (which has a
 * top-level `import prisma from '@/lib/db'`) doesn't construct a real
 * PrismaClient — same pattern as market-share.test.ts.
 */

const mockUpdateMany = jest.fn().mockResolvedValue({ count: 0 });
const mockCreate = jest.fn().mockImplementation(({ data }: { data: Record<string, unknown> }) =>
  Promise.resolve({ id: 'npc-order', ...data }),
);
const mockFillFindMany = jest.fn().mockResolvedValue([]);
const mockResourceFindUnique = jest.fn().mockResolvedValue(null);

jest.mock('@/lib/db', () => ({
  __esModule: true,
  default: {
    marketLimitOrder: { updateMany: (...a: unknown[]) => mockUpdateMany(...a), create: (...a: unknown[]) => mockCreate(...a) },
    marketFill: { findMany: (...a: unknown[]) => mockFillFindMany(...a) },
    marketResource: { findUnique: (...a: unknown[]) => mockResourceFindUnique(...a) },
  },
}));

jest.mock('../market-events', () => {
  const actual = jest.requireActual('../market-events');
  return { ...actual, isMarketEventActiveForResource: jest.fn() };
});

import { getNPCMarketMakerOrders } from '../market-orderbook';
import { isMarketEventActiveForResource } from '../market-events';

const mockEventActive = isMarketEventActiveForResource as jest.MockedFunction<typeof isMarketEventActiveForResource>;

describe('getNPCMarketMakerOrders — Wave M4 event-window spread/volume schedule', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUpdateMany.mockResolvedValue({ count: 0 });
    mockFillFindMany.mockResolvedValue([]);
    mockResourceFindUnique.mockResolvedValue(null);
  });

  it('quotes the base half-spread (0.06, no cap usage) with no event active', async () => {
    mockEventActive.mockReturnValue(false);
    const q = await getNPCMarketMakerOrders('iron', 5_000);
    expect(q.spreadHalf).toBeCloseTo(0.06, 5);
    expect(q.bid.quantity).toBe(200); // NPC_VOLUME_CAPS.iron, unhalved
    expect(q.ask.quantity).toBe(200);
  });

  it('exactly doubles the half-spread during a live event on that resource', async () => {
    mockEventActive.mockReturnValue(false);
    const base = await getNPCMarketMakerOrders('helium3', 5_000_000);

    mockEventActive.mockReturnValue(true);
    const widened = await getNPCMarketMakerOrders('helium3', 5_000_000);

    expect(base.spreadHalf).toBeCloseTo(0.06, 5);
    expect(widened.spreadHalf).toBeCloseTo(base.spreadHalf * 2, 5);
    // Wider spread => lower bid, higher ask than the no-event quote.
    expect(widened.bid.price).toBeLessThan(base.bid.price);
    expect(widened.ask.price).toBeGreaterThan(base.ask.price);
  });

  it('halves the resting volume cap (floored at 1) during a live event', async () => {
    mockEventActive.mockReturnValue(false);
    const base = await getNPCMarketMakerOrders('helium3', 5_000_000); // cap 10

    mockEventActive.mockReturnValue(true);
    const widened = await getNPCMarketMakerOrders('helium3', 5_000_000);

    expect(base.bid.quantity).toBe(10);
    expect(widened.bid.quantity).toBe(5);
    expect(widened.ask.quantity).toBe(5);
  });

  it('never drops the event-window cap to zero for a resource with a nonzero base cap', async () => {
    mockEventActive.mockReturnValue(true);
    // titanium cap is 50 -> would floor-divide fine, but exercise the
    // Math.max(1, ...) floor explicitly with a hypothetical 1-unit cap by
    // checking a resource whose halved cap would round to 0 under naive
    // integer division is never actually requested at cap 1 in this game's
    // table — so instead assert the invariant holds for the smallest real
    // nonzero cap (exotic_materials / helium3 = 10 -> halves cleanly to 5).
    const q = await getNPCMarketMakerOrders('helium3', 5_000_000);
    expect(q.bid.quantity).toBeGreaterThanOrEqual(1);
  });

  it('a zero-cap resource still places no orders regardless of event state', async () => {
    mockEventActive.mockReturnValue(true);
    const q = await getNPCMarketMakerOrders('fusion_core', 100_000);
    expect(q.bid.quantity).toBe(0);
    expect(q.ask.quantity).toBe(0);
    expect(mockCreate).not.toHaveBeenCalled();
  });
});
