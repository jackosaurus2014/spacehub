// CC-1 (docs/COMMAND_CENTER_DESIGN_2026-09-13.md): the Bridge window —
// variant by hour, layers from the manifest, actors at their anchors,
// reduced-motion static plate, accessibility contract.

import { render } from '@testing-library/react';
import BridgeWindow, { pickVariant, localHour, actorMotion, coverPlate, ACTOR_PULSE_MS } from '../BridgeWindow';
import { parseHqManifest, getHqManifest, buildSrcSet, computeStackOrder, actorFiles, type HqManifest } from '@/lib/game/hq-manifest';
import earthRaw from '../../../../public/game/hq/earth/manifest.json';

const earth = getHqManifest('earth_ops') as HqManifest;

describe('pickVariant', () => {
  const v = ['day', 'dusk', 'night'];
  it('day 07–17, dusk 17–20 and 05–07, night otherwise', () => {
    expect(pickVariant(v, 7)).toBe('day');
    expect(pickVariant(v, 12.5)).toBe('day');
    expect(pickVariant(v, 16.99)).toBe('day');
    expect(pickVariant(v, 17)).toBe('dusk');
    expect(pickVariant(v, 19.5)).toBe('dusk');
    expect(pickVariant(v, 5)).toBe('dusk');
    expect(pickVariant(v, 6.9)).toBe('dusk');
    expect(pickVariant(v, 20)).toBe('night');
    expect(pickVariant(v, 0)).toBe('night');
    expect(pickVariant(v, 4.99)).toBe('night');
  });
  it('uses sunrise 05–08 only when the manifest has it', () => {
    expect(pickVariant([...v, 'sunrise'], 5.5)).toBe('sunrise');
    expect(pickVariant([...v, 'sunrise'], 7.5)).toBe('sunrise');
    expect(pickVariant([...v, 'sunrise'], 8)).toBe('day');
    expect(pickVariant(v, 6)).toBe('dusk');
  });
  it('falls back through day → dusk → night → first when a band is missing', () => {
    expect(pickVariant(['night'], 12)).toBe('night');
    expect(pickVariant(['dusk', 'night'], 12)).toBe('dusk');
    expect(pickVariant(['weird'], 12)).toBe('weird');
    expect(pickVariant([], 12)).toBeNull();
  });
  it('localHour is UTC plus the stage offset, wrapped', () => {
    expect(localHour(Date.UTC(2026, 8, 13, 22, 30), 0)).toBeCloseTo(22.5);
    expect(localHour(Date.UTC(2026, 8, 13, 22, 30), 3)).toBeCloseTo(1.5);
    expect(localHour(Date.UTC(2026, 8, 13, 1, 0), -4)).toBeCloseTo(21);
  });
});

describe('manifest parsing (generic over variants and actors)', () => {
  it('parses the shipped Earth manifest', () => {
    expect(earth).not.toBeNull();
    expect(earth.layers.map(l => l.name)).toEqual(['far', 'mid', 'near']);
    expect(Object.keys(earth.variants)).toEqual(expect.arrayContaining(['day', 'dusk', 'night']));
    expect(Object.keys(earth.actors)).toEqual(expect.arrayContaining(['plume', 'padlights', 'weather']));
    expect(earth.baseUrl).toBe('/game/hq/earth/');
    expect(earth.composition.overscan).toBeCloseTo(0.03);
  });
  it('keeps unknown variants and actors rather than dropping them', () => {
    const raw = JSON.parse(JSON.stringify(earthRaw));
    raw.variants.sunrise = raw.variants.day;
    raw.actors.vehicle = { ...raw.actors.plume, trigger: 'launch' };
    const m = parseHqManifest(raw, '/x')!;
    expect(Object.keys(m.variants)).toContain('sunrise');
    expect(m.actors.vehicle.trigger).toBe('launch');
    expect(m.baseUrl).toBe('/x/');
  });
  it('rejects a manifest with no usable layers or variants', () => {
    expect(parseHqManifest({ layers: [], variants: {} }, '/x')).toBeNull();
    expect(parseHqManifest(null, '/x')).toBeNull();
  });
  it('builds a width-descriptor srcset from the file map', () => {
    expect(buildSrcSet('/g/', { '1280': { file: 'a-1280.webp' }, '640': { file: 'a-640.webp' } })).toBe('/g/a-640.webp 640w, /g/a-1280.webp 1280w');
  });
  it('composite order: actors slot beneath the layer OR actor their `below` names', () => {
    const raw = JSON.parse(JSON.stringify(earthRaw));
    // A synthetic stack that exercises actor-below-actor regardless of what
    // the art pipeline ships today: plume under vehicle, vehicle under near.
    raw.actors = {
      vehicle: { ...raw.actors.padlights, trigger: 'launch', below: 'near', order: 3, idle: true },
      plume: { ...raw.actors.padlights, trigger: 'launch', below: 'vehicle', order: 2 },
      padlights: { ...raw.actors.padlights, below: 'near', order: 1 },
      weather: { ...raw.actors.padlights, trigger: 'weather', below: 'no-such-layer', above: 'far', order: 0 },
      orphan: { ...raw.actors.padlights, trigger: 'x', below: 'nope', order: 9 },
    };
    const m = parseHqManifest(raw, '/x')!;
    const names = computeStackOrder(m).map(e => (e.kind === 'layer' ? e.layer.name : e.actor.name));
    const idx = (n: string) => names.indexOf(n);
    expect(idx('far')).toBeLessThan(idx('mid'));
    expect(idx('mid')).toBeLessThan(idx('near'));
    expect(idx('plume')).toBeLessThan(idx('vehicle'));
    expect(idx('vehicle')).toBeLessThan(idx('near'));
    expect(idx('padlights')).toBeLessThan(idx('near'));
    expect(idx('mid')).toBeLessThan(idx('padlights'));
    expect(idx('weather')).toBe(idx('far') + 1); // `above: far`
    expect(idx('orphan')).toBe(names.length - 1); // unresolvable → on top
    // an actor's parallax is the nearest layer behind it
    const stack = computeStackOrder(m);
    const plume = stack.find(e => e.kind === 'actor' && e.actor.name === 'plume')!;
    expect(plume.parallax).toBe(m.layers.find(l => l.name === 'mid')!.parallax);
  });

  it('per-variant actor files: files keyed by variant, with a fallback map', () => {
    const raw = JSON.parse(JSON.stringify(earthRaw));
    raw.actors.probe = {
      ...raw.actors.padlights, trigger: 'launch', idle: true,
      files: { day: { '640': { file: 'day-probe-640.webp' } }, night: { '640': { file: 'night-probe-640.webp' } } },
    };
    const m = parseHqManifest(raw, '/x')!;
    expect(m.actors.probe.perVariant).toBe(true);
    expect(m.actors.probe.idle).toBe(true);
    expect(actorFiles(m.actors.probe, 'night')['640'].file).toBe('night-probe-640.webp');
    expect(actorFiles(m.actors.probe, 'sunrise')['640'].file).toBe('day-probe-640.webp');
    expect(actorFiles(m.actors.padlights, 'night')).toBe(m.actors.padlights.files);
  });

  it('coverPlate: covers the window × overscan and keeps the horizon in view without exposing an edge', () => {
    const p = coverPlate({ width: 1000, height: 300 }, [21, 9], 0.03, 0.33);
    expect(p.width).toBeGreaterThanOrEqual(1030);
    expect(p.height).toBeGreaterThanOrEqual(300 * 1.03);
    expect(p.left).toBeLessThanOrEqual(-15);
    expect(p.left + p.width).toBeGreaterThanOrEqual(1015);
    expect(p.top).toBeLessThanOrEqual(-4.5);
    expect(p.top + p.height).toBeGreaterThanOrEqual(304.5);
    // horizon (plate y = 0.33) lands near 42% of the window
    expect(p.top + p.height * 0.33).toBeCloseTo(300 * 0.42, -1);
    // a very wide, short window: still covered, edges still hidden
    const q = coverPlate({ width: 390, height: 96 }, [21, 9], 0.03, 0.33);
    expect(q.left + q.width).toBeGreaterThanOrEqual(390 + 390 * 0.015);
    expect(q.top).toBeLessThanOrEqual(-96 * 0.015);
    expect(q.top + q.height).toBeGreaterThanOrEqual(96 + 96 * 0.015);
  });

  it('actorMotion: known names, then trigger, then fade', () => {
    expect(actorMotion({ name: 'plume', trigger: 'launch' })).toBe('plume');
    expect(actorMotion({ name: 'vehicle', trigger: 'launch' })).toBe('lift');
    expect(actorMotion({ name: 'padlights', trigger: 'build_complete' })).toBe('lights');
    expect(actorMotion({ name: 'weather', trigger: 'weather' })).toBe('fade');
    expect(actorMotion({ name: 'sparks', trigger: 'launch' })).toBe('plume');
    expect(actorMotion({ name: 'aurora', trigger: 'storm' })).toBe('fade');
  });
});

describe('<BridgeWindow>', () => {
  it('renders the current variant only, three layers with srcset, aria-hidden plate + sr-only description', () => {
    const { container, getByText } = render(<BridgeWindow manifest={earth} hour={12} description="Headquarters window: Earth Operations Center in daylight." />);
    const plates = container.querySelector('.hq-window-plates')!;
    expect(plates.getAttribute('aria-hidden')).toBe('true');
    expect(plates.getAttribute('data-variant')).toBe('day');
    const layers = Array.from(container.querySelectorAll('img.hq-layer')) as HTMLImageElement[];
    expect(layers).toHaveLength(3);
    expect(layers.map(l => l.getAttribute('src'))).toEqual([
      expect.stringContaining('/game/hq/earth/day-far-'),
      expect.stringContaining('/game/hq/earth/day-mid-'),
      expect.stringContaining('/game/hq/earth/day-near-'),
    ]);
    expect(layers[0].getAttribute('srcset')).toContain('day-far-640.webp 640w');
    expect(layers[0].getAttribute('srcset')).toContain('day-far-2560.webp 2560w');
    expect(layers[0].getAttribute('alt')).toBe('');
    // no other variant's files are in the DOM (nothing else is fetched)
    expect(container.innerHTML).not.toContain('night-far');
    expect(container.innerHTML).not.toContain('dusk-far');
    // description is real text for assistive tech
    const desc = getByText('Headquarters window: Earth Operations Center in daylight.');
    expect(desc.className).toContain('sr-only');
    expect(desc.closest('[aria-hidden="true"]')).toBeNull();
  });

  it('picks night at 23h and blends the padlights in by the variant light level; day hides them', () => {
    const night = render(<BridgeWindow manifest={earth} hour={23} description="d" />);
    expect(night.container.querySelector('.hq-window-plates')!.getAttribute('data-variant')).toBe('night');
    const lights = night.container.querySelector('.hq-actor[data-actor="padlights"]') as HTMLElement;
    expect(lights).toBeTruthy();
    expect(lights.getAttribute('data-motion')).toBe('lights');
    expect(lights.getAttribute('data-active')).toBe('false');
    expect(lights.style.getPropertyValue('--hq-actor-base')).toBe('1');
    // anchored by the manifest's normalized box
    const a = earth.actors.padlights.anchor;
    expect(lights.style.left).toBe(`${a.x * 100}%`);
    expect(lights.style.top).toBe(`${a.y * 100}%`);
    expect(lights.style.width).toBe(`${a.w * 100}%`);
    // padlights sit beneath the near layer
    const plate = night.container.querySelector('.hq-plate-live')!;
    const children = Array.from(plate.children);
    const idxLights = children.indexOf(lights);
    const idxNear = children.findIndex(c => c.getAttribute('src')?.includes('night-near-'));
    expect(idxLights).toBeGreaterThan(-1);
    expect(idxLights).toBeLessThan(idxNear);

    const day = render(<BridgeWindow manifest={earth} hour={12} description="d" />);
    expect(day.container.querySelector('.hq-actor[data-actor="padlights"]')).toBeNull();
  });

  it('plays the plume for a fresh launch pulse and drops it once the pulse has played out', () => {
    const t0 = 5_000_000;
    const live = render(<BridgeWindow manifest={earth} hour={12} description="d" firedAt={{ launch: t0 }} now={() => t0 + 100} />);
    const plume = live.container.querySelector('.hq-actor[data-actor="plume"]') as HTMLElement;
    expect(plume).toBeTruthy();
    expect(plume.getAttribute('data-active')).toBe('true');
    expect(plume.getAttribute('data-motion')).toBe('plume');
    expect(plume.querySelector('img')!.getAttribute('src')).toContain('actor-plume-');
    const done = render(<BridgeWindow manifest={earth} hour={12} description="d" firedAt={{ launch: t0 }} now={() => t0 + ACTOR_PULSE_MS + 1} />);
    expect(done.container.querySelector('.hq-actor[data-actor="plume"]')).toBeNull();
  });

  it('shows the weather actor only while weather is active', () => {
    const off = render(<BridgeWindow manifest={earth} hour={12} description="d" />);
    expect(off.container.querySelector('.hq-actor[data-actor="weather"]')).toBeNull();
    const on = render(<BridgeWindow manifest={earth} hour={12} description="d" weatherActive />);
    const w = on.container.querySelector('.hq-actor[data-actor="weather"]') as HTMLElement;
    expect(w).toBeTruthy();
    expect(w.getAttribute('data-motion')).toBe('fade');
  });

  it('an idle actor is always drawn at rest, under the current variant\'s files', () => {
    const raw = JSON.parse(JSON.stringify(earthRaw));
    raw.actors.beacon = {
      ...raw.actors.padlights, trigger: 'launch', idle: true, below: 'near',
      files: { day: { '640': { file: 'day-beacon-640.webp' } }, night: { '640': { file: 'night-beacon-640.webp' } } },
    };
    const m = parseHqManifest(raw, '/game/hq/earth/')!;
    const { container } = render(<BridgeWindow manifest={m} hour={23} description="d" />);
    const b = container.querySelector('.hq-actor[data-actor="beacon"]') as HTMLElement;
    expect(b).toBeTruthy();
    expect(b.getAttribute('data-active')).toBe('false');
    expect(b.querySelector('img')!.getAttribute('src')).toContain('night-beacon-640.webp');
  });

  it('a launch-trigger actor other than the plume (vehicle) rests on the pad and lifts on launch', () => {
    const raw = JSON.parse(JSON.stringify(earthRaw));
    raw.actors.vehicle = { ...raw.actors.plume, trigger: 'launch' };
    const m = parseHqManifest(raw, '/game/hq/earth/')!;
    const rest = render(<BridgeWindow manifest={m} hour={12} description="d" vehicleOnPad />);
    const v = rest.container.querySelector('.hq-actor[data-actor="vehicle"]') as HTMLElement;
    expect(v.getAttribute('data-motion')).toBe('lift');
    expect(v.getAttribute('data-active')).toBe('false');
    expect(rest.container.querySelector('.hq-actor[data-actor="plume"]')).toBeNull();
    const t0 = 9_000_000;
    const lift = render(<BridgeWindow manifest={m} hour={12} description="d" vehicleOnPad firedAt={{ launch: t0 }} now={() => t0 + 10} />);
    expect(lift.container.querySelector('.hq-actor[data-actor="vehicle"]')!.getAttribute('data-active')).toBe('true');
    expect(lift.container.querySelector('.hq-actor[data-actor="plume"]')!.getAttribute('data-active')).toBe('true');
  });

  it('reduced motion: static plate — no pulse actors, padlights still blended, no cross-fade', () => {
    const t0 = 7_000_000;
    const { container, rerender } = render(
      <BridgeWindow manifest={earth} hour={23} description="d" reducedMotion firedAt={{ launch: t0, build_complete: t0 }} now={() => t0 + 10} />,
    );
    expect(container.querySelector('.hq-window')!.getAttribute('data-reduced')).toBe('true');
    expect(container.querySelector('.hq-actor[data-actor="plume"]')).toBeNull();
    const lights = container.querySelector('.hq-actor[data-actor="padlights"]') as HTMLElement;
    expect(lights).toBeTruthy();
    expect(lights.getAttribute('data-active')).toBe('false');
    // variant change: the outgoing plate is not kept for a fade
    rerender(<BridgeWindow manifest={earth} hour={12} description="d" reducedMotion now={() => t0 + 10} />);
    expect(container.querySelector('.hq-plate-out')).toBeNull();
    expect(container.querySelector('.hq-window-plates')!.getAttribute('data-variant')).toBe('day');
  });

  it('cross-fades on a variant change when motion is allowed', () => {
    const { container, rerender } = render(<BridgeWindow manifest={earth} hour={12} description="d" />);
    rerender(<BridgeWindow manifest={earth} hour={23} description="d" />);
    expect(container.querySelector('.hq-window-plates')!.getAttribute('data-variant')).toBe('night');
    const out = container.querySelector('.hq-plate-out');
    expect(out).toBeTruthy();
    expect(out!.getAttribute('data-variant')).toBe('day');
  });

  it('renders overlay children outside the aria-hidden plate', () => {
    const { getByText } = render(
      <BridgeWindow manifest={earth} hour={12} description="d"><button type="button">HQ chip</button></BridgeWindow>,
    );
    expect(getByText('HQ chip').closest('[aria-hidden="true"]')).toBeNull();
  });
});
