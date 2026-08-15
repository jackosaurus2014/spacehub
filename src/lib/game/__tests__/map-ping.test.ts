// Wave V7 (docs/VISUAL_DEPTH_2026-08.md §V7) — map-ping event bus + pure
// lifetime/visual/diff math. Covers exactly the "pure logic" the wave spec
// calls out: effect lifetime math and completion (ack-event) derivation.

import {
  mapPing, onMapPing, getPingVisual, pruneExpiredPings, deriveCompletionEvents,
  hexToRgba, PING_LIFETIME_MS, REDUCED_PING_LIFETIME_MS, PING_COLOR,
  type MapPingEvent,
} from '../map-ping';

describe('map-ping event bus', () => {
  it('notifies subscribers with a well-formed event and unsubscribes cleanly', () => {
    const received: MapPingEvent[] = [];
    const unsubscribe = onMapPing(p => received.push(p));

    const emitted = mapPing({ kind: 'location', id: 'earth_surface' }, 'ack', 'Test ack');
    expect(received).toHaveLength(1);
    expect(received[0]).toBe(emitted);
    expect(received[0].target).toEqual({ kind: 'location', id: 'earth_surface' });
    expect(received[0].kind).toBe('ack');
    expect(received[0].label).toBe('Test ack');
    expect(typeof received[0].id).toBe('string');
    expect(received[0].atMs).toBeGreaterThan(0);

    unsubscribe();
    mapPing({ kind: 'system', id: 'sirius' }, 'warp');
    expect(received).toHaveLength(1); // no further delivery after unsubscribe
  });

  it('gives every ping a unique id even when emitted back-to-back', () => {
    const ids = new Set<string>();
    for (let i = 0; i < 20; i++) {
      ids.add(mapPing({ kind: 'location', id: 'mars_surface' }, 'complete').id);
    }
    expect(ids.size).toBe(20);
  });
});

describe('getPingVisual — lifetime math', () => {
  const base: MapPingEvent = { id: 'p1', target: { kind: 'location', id: 'x' }, kind: 'ack', atMs: 1_000_000 };

  it('is fully opaque at the moment of emission and fades to 0 by end of life', () => {
    const start = getPingVisual(base, base.atMs, false);
    expect(start).not.toBeNull();
    expect(start!.alpha).toBeCloseTo(1, 5);
    expect(start!.radiusProgress).toBeCloseTo(0, 5);

    const lifetime = PING_LIFETIME_MS.ack;
    const mid = getPingVisual(base, base.atMs + lifetime / 2, false);
    expect(mid!.alpha).toBeCloseTo(0.5, 1);
    expect(mid!.radiusProgress).toBeCloseTo(0.5, 1);
  });

  it('expires exactly at its kind-specific lifetime (fixed lifetime — no drift)', () => {
    const lifetime = PING_LIFETIME_MS.ack;
    expect(getPingVisual(base, base.atMs + lifetime - 1, false)).not.toBeNull();
    expect(getPingVisual(base, base.atMs + lifetime, false)).toBeNull();
    expect(getPingVisual(base, base.atMs + lifetime + 500, false)).toBeNull();
  });

  it('returns null for a ping timestamped in the future relative to "now"', () => {
    expect(getPingVisual(base, base.atMs - 1, false)).toBeNull();
  });

  it('every PingKind has a positive, finite lifetime', () => {
    for (const kind of Object.keys(PING_LIFETIME_MS) as (keyof typeof PING_LIFETIME_MS)[]) {
      expect(PING_LIFETIME_MS[kind]).toBeGreaterThan(0);
      expect(Number.isFinite(PING_LIFETIME_MS[kind])).toBe(true);
    }
  });

  it('reduced motion collapses to the short fixed blink window regardless of kind', () => {
    const completePing: MapPingEvent = { ...base, kind: 'complete' };
    // Normal 'complete' lifetime (1600ms) would still be alive at 1000ms in;
    // reduced motion should have already expired it (200ms window).
    expect(getPingVisual(completePing, completePing.atMs + 1000, true)).toBeNull();
    expect(getPingVisual(completePing, completePing.atMs + 100, true)).not.toBeNull();
  });

  it('reduced motion renders a triangular blink (rises then falls) at constant radius', () => {
    const t0 = getPingVisual(base, base.atMs, true)!;
    const tMid = getPingVisual(base, base.atMs + REDUCED_PING_LIFETIME_MS / 2, true)!;
    const tEnd = getPingVisual(base, base.atMs + REDUCED_PING_LIFETIME_MS - 1, true)!;
    expect(t0.alpha).toBeLessThan(tMid.alpha);
    expect(tEnd.alpha).toBeLessThan(tMid.alpha);
    // No expanding-ring motion under reduced motion — radius stays put.
    expect(t0.radiusProgress).toBe(0);
    expect(tMid.radiusProgress).toBe(0);
    expect(tEnd.radiusProgress).toBe(0);
  });
});

describe('pruneExpiredPings', () => {
  it('drops expired pings and keeps live ones, per-kind lifetime respected', () => {
    const now = 2_000_000;
    const pings: MapPingEvent[] = [
      { id: 'a', target: { kind: 'location', id: 'x' }, kind: 'ack', atMs: now - 100 },       // alive (ack: 1200ms)
      { id: 'b', target: { kind: 'location', id: 'x' }, kind: 'ack', atMs: now - 5000 },      // expired
      { id: 'c', target: { kind: 'system', id: 'y' }, kind: 'complete', atMs: now - 1500 },   // alive (complete: 1600ms)
    ];
    const kept = pruneExpiredPings(pings, now, false);
    expect(kept.map(p => p.id).sort()).toEqual(['a', 'c']);
  });

  it('applies the short reduced-motion window uniformly when reducedMotion=true', () => {
    const now = 3_000_000;
    const pings: MapPingEvent[] = [
      { id: 'a', target: { kind: 'location', id: 'x' }, kind: 'complete', atMs: now - 100 },  // alive under 200ms window
      { id: 'b', target: { kind: 'location', id: 'x' }, kind: 'complete', atMs: now - 1000 }, // would be alive normally, not under reduced motion
    ];
    const kept = pruneExpiredPings(pings, now, true);
    expect(kept.map(p => p.id)).toEqual(['a']);
  });
});

describe('hexToRgba', () => {
  it('parses every PING_COLOR entry into a valid rgba() string', () => {
    for (const hex of Object.values(PING_COLOR)) {
      const out = hexToRgba(hex, 0.5);
      expect(out).toMatch(/^rgba\(\d{1,3},\d{1,3},\d{1,3},0\.5\)$/);
    }
  });

  it('clamps alpha to [0, 1]', () => {
    expect(hexToRgba('#22d3ee', 2)).toBe('rgba(34,211,238,1)');
    expect(hexToRgba('#22d3ee', -1)).toBe('rgba(34,211,238,0)');
  });
});

describe('deriveCompletionEvents — ack-event derivation', () => {
  it('returns nothing on first mount (prev === null)', () => {
    const next = { buildings: [{ instanceId: 'b1', locationId: 'earth_surface', isComplete: true }] };
    expect(deriveCompletionEvents(null, next)).toEqual([]);
  });

  it('detects a building flipping isComplete false → true', () => {
    const prev = { buildings: [{ instanceId: 'b1', locationId: 'earth_surface', isComplete: false }] };
    const next = { buildings: [{ instanceId: 'b1', locationId: 'earth_surface', isComplete: true }] };
    const events = deriveCompletionEvents(prev, next);
    expect(events).toEqual([{ target: { kind: 'location', id: 'earth_surface' }, label: 'Construction complete' }]);
  });

  it('does not re-fire for a building that was already complete', () => {
    const prev = { buildings: [{ instanceId: 'b1', locationId: 'earth_surface', isComplete: true }] };
    const next = { buildings: [{ instanceId: 'b1', locationId: 'earth_surface', isComplete: true }] };
    expect(deriveCompletionEvents(prev, next)).toEqual([]);
  });

  it('detects a ship arriving (in_transit + route → not in_transit)', () => {
    const prev = { ships: [{ instanceId: 's1', status: 'in_transit', currentLocation: 'lunar_orbit', route: { to: 'mars_surface' } }] };
    const next = { ships: [{ instanceId: 's1', status: 'idle', currentLocation: 'mars_surface' }] };
    const events = deriveCompletionEvents(prev, next);
    expect(events).toEqual([{ target: { kind: 'location', id: 'mars_surface' }, label: 'Ship arrived' }]);
  });

  it('ignores a ship that was already stationary (no false positive)', () => {
    const prev = { ships: [{ instanceId: 's1', status: 'idle', currentLocation: 'mars_surface' }] };
    const next = { ships: [{ instanceId: 's1', status: 'mining', currentLocation: 'mars_surface' }] };
    expect(deriveCompletionEvents(prev, next)).toEqual([]);
  });

  it('detects an expedition arriving at its destination (outbound → exploring)', () => {
    const prev = { expeditions: [{ id: 'e1', phase: 'outbound', targetSystemId: 'proxima_centauri' }] };
    const next = { expeditions: [{ id: 'e1', phase: 'exploring', targetSystemId: 'proxima_centauri' }] };
    expect(deriveCompletionEvents(prev, next)).toEqual([
      { target: { kind: 'system', id: 'proxima_centauri' }, label: 'Expedition arrived' },
    ]);
  });

  it('detects an expedition returning home (returning → completed)', () => {
    const prev = { expeditions: [{ id: 'e1', phase: 'returning', targetSystemId: 'sirius' }] };
    const next = { expeditions: [{ id: 'e1', phase: 'completed', targetSystemId: 'sirius' }] };
    expect(deriveCompletionEvents(prev, next)).toEqual([
      { target: { kind: 'system', id: 'sirius' }, label: 'Expedition returned' },
    ]);
  });

  it('batches multiple simultaneous completions from one tick into multiple events', () => {
    const prev = {
      buildings: [{ instanceId: 'b1', locationId: 'earth_surface', isComplete: false }],
      ships: [{ instanceId: 's1', status: 'in_transit', currentLocation: 'leo', route: { to: 'geo' } }],
    };
    const next = {
      buildings: [{ instanceId: 'b1', locationId: 'earth_surface', isComplete: true }],
      ships: [{ instanceId: 's1', status: 'idle', currentLocation: 'geo' }],
    };
    expect(deriveCompletionEvents(prev, next)).toHaveLength(2);
  });
});
