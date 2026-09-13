/**
 * @jest-environment node
 *
 * Flight mode part (b), graphics review item 6 — the pure half of the label
 * rebuild: declutter priority, displacement with leader lines, suppression
 * as the last resort, placement stickiness and the font-coverage guard.
 */
import {
  labelPriority,
  declutterLabels,
  hudSafeText,
  LEADER_MIN_PX,
  DECLUTTER_CANDIDATES,
  MAP_LABEL_CHARACTERS,
  type LabelRectInput,
} from '../map-labels';

const rect = (id: string, x: number, y: number, priority: number, w = 60, h = 14): LabelRectInput => ({ id, x, y, w, h, priority });

describe('labelPriority', () => {
  it('orders holdings > major bodies > other bodies > pips', () => {
    const none = { buildings: 0, npc: 0, world: 0 };
    const held = { buildings: 2, npc: 0, world: 0 };
    const pip = labelPriority('leo', 'pip', none);
    const moon = labelPriority('callisto_surface', 'body', none);
    const major = labelPriority('earth_surface', 'body', none);
    const heldPip = labelPriority('leo', 'pip', held);
    expect(pip).toBeLessThan(moon);
    expect(moon).toBeLessThan(major);
    expect(heldPip).toBeGreaterThan(major); // holdings beat everything unselected
  });
});

describe('declutterLabels', () => {
  it('keeps non-overlapping labels at their natural spot with no leader', () => {
    const out = declutterLabels([rect('a', 100, 100, 3), rect('b', 300, 100, 2)]);
    expect(out.get('a')).toEqual({ dx: 0, dy: 0, leader: false, suppressed: false });
    expect(out.get('b')).toEqual({ dx: 0, dy: 0, leader: false, suppressed: false });
  });

  it('keeps the higher priority label and pushes the lower one away with a leader', () => {
    const out = declutterLabels([rect('moon', 100, 100, 2), rect('earth', 104, 100, 3)]);
    expect(out.get('earth')).toEqual({ dx: 0, dy: 0, leader: false, suppressed: false });
    const moon = out.get('moon')!;
    expect(moon.suppressed).toBe(false);
    expect(moon.dx !== 0 || moon.dy !== 0).toBe(true);
    expect(Math.hypot(moon.dx, moon.dy)).toBeGreaterThanOrEqual(LEADER_MIN_PX);
    expect(moon.leader).toBe(true);
    // the first candidate is "further below"
    expect(moon.dx).toBe(0);
    expect(moon.dy).toBeCloseTo(DECLUTTER_CANDIDATES[0][1] * 14);
  });

  it('the selected label wins regardless of priority', () => {
    const out = declutterLabels([rect('pip', 100, 100, 1), rect('major', 102, 101, 6)], { selectedId: 'pip' });
    expect(out.get('pip')).toEqual({ dx: 0, dy: 0, leader: false, suppressed: false });
    expect(out.get('major')!.dx !== 0 || out.get('major')!.dy !== 0).toBe(true);
  });

  it('suppresses only when every candidate spot is taken', () => {
    // A dense ring of high-priority labels around one low-priority label
    // leaves it nowhere to go.
    const items: LabelRectInput[] = [rect('victim', 200, 200, 1, 40, 14)];
    let n = 0;
    // Tiles are (w + 2·gap) × (h + 2·gap) apart so they touch without overlapping.
    for (let dx = -3; dx <= 3; dx++) {
      for (let dy = -4; dy <= 4; dy++) {
        items.push(rect(`blocker-${n++}`, 200 + dx * 48, 200 + dy * 20, 5, 44, 16));
      }
    }
    const out = declutterLabels(items);
    expect(out.get('victim')!.suppressed).toBe(true);
    // the blockers themselves are a tiling: none overlaps, all natural
    expect(items.filter(i => i.id !== 'victim').every(i => !out.get(i.id)!.suppressed)).toBe(true);
  });

  it('is deterministic across ties (id order)', () => {
    const a = declutterLabels([rect('b', 100, 100, 2), rect('a', 102, 101, 2)]);
    const b = declutterLabels([rect('a', 102, 101, 2), rect('b', 100, 100, 2)]);
    expect(a.get('a')).toEqual(b.get('a'));
    expect(a.get('b')).toEqual(b.get('b'));
    expect(a.get('a')).toEqual({ dx: 0, dy: 0, leader: false, suppressed: false });
  });

  it('prefers a label\'s previous displaced spot so labels do not hop', () => {
    const items = [rect('lo', 100, 100, 2), rect('hi', 104, 100, 3)];
    const first = declutterLabels(items);
    // Pretend the label had settled on the "above" candidate last tick.
    const previous = new Map(first);
    previous.set('lo', { dx: 0, dy: -1.4 * 14, leader: true, suppressed: false });
    const second = declutterLabels(items, { previous });
    expect(second.get('lo')!.dy).toBeCloseTo(-1.4 * 14);
    expect(second.get('lo')!.leader).toBe(true);
  });

  it('returns an entry for every input, including an empty list', () => {
    expect(declutterLabels([]).size).toBe(0);
    const out = declutterLabels([rect('x', 0, 0, 1)]);
    expect(out.size).toBe(1);
  });
});

describe('hudSafeText', () => {
  it('keeps latin text, punctuation, minus and middle dot', () => {
    expect(hudSafeText('Lunar Orbit · 3/8 slots −$1.2M/mo')).toBe('Lunar Orbit · 3/8 slots −$1.2M/mo');
  });
  it('maps arrows to ASCII and drops symbols the shipped font lacks', () => {
    expect(hudSafeText('Meridian → Ceres')).toBe('Meridian > Ceres');
    expect(hudSafeText('♛ Earth ▲')).toBe(' Earth ');
    expect(hudSafeText('ETA 3h 12m…')).toBe('ETA 3h 12m...');
  });
  it('the pre-warmed character set is itself safe', () => {
    expect(hudSafeText(MAP_LABEL_CHARACTERS)).toBe(MAP_LABEL_CHARACTERS);
  });
});
