'use client';

// ─── SolarMapLocal — a body's LOCAL SCENE inside the one solar Canvas ────────
// Flight mode part (a) (docs/GRAPHICS_REVIEW_2026-09-12.md addendum). When
// the camera crosses a body's local sphere, SolarMap3D hides the system
// group and mounts this group at the body's live world position — never a
// second Canvas, never a second WebGL context. Everything drawn comes from
// a LocalSceneModel (lib/game/map-flight.ts, built from GameState + the
// traffic feed and cached per body by SolarMap3D):
//
//   • the body itself (the shared BodySphere, so it is the same Earth),
//   • its moons on the system view's orbit scales, ticking on the same
//     scene clock so the swap is seamless,
//   • its orbital shells as thin rings with a label + slot badge,
//   • orbital slots as pips on the ring — yours bright, other corporations
//     dim (corp tag on hover when the world feed names them), free hollow,
//   • your satellites (bright glints) and stations (silhouettes) on their
//     shell, other corporations' satellites as dim glints — instanced,
//   • ships arriving / departing / holding: yours bright cones with a
//     name + ETA tag, traffic contacts dim, both placed by placeContacts()
//     against the local anchor tables (one placement path, two renderers),
//   • the radial command menu reachable for the body, every moon and every
//     slot ring (onPick with a screen anchor, exactly like the system view).
//
// Labels use the Phase 1 declutter with a registry of their own; the tier
// is pinned to 'detail' (a local scene IS the detail view).

import { useRef, useMemo, useCallback, useLayoutEffect, useEffect, useState } from 'react';
import * as THREE from 'three';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import { formatCountdown } from '@/lib/game/formulas';
import { ORBITAL_BODY_MAP } from '@/lib/game/orbital-elements';
import type { MapZoomTier } from '@/lib/game/map-zoom';
import type { ModeVisual } from '@/lib/game/map-modes';
import { SLOT_SEGMENT_STYLE } from '@/lib/game/map-bodies';
import { placeContacts, contactLabel, contactDetail, type TrafficContact, type ContactAnchor } from '@/lib/game/ship-traffic';
import {
  localMoonOffset,
  localAnchorsAt,
  exitDirection,
  glintAngle,
  SLOT_PIP_STYLE,
  type LocalSceneModel,
  type LocalShell,
  type LocalSlotPip,
  type LocalMoon,
  type LocalShip,
} from '@/lib/game/map-flight';
import {
  BodySphere,
  LabelSprite,
  LabelDeclutter,
  LabelRegistryContext,
  SelectionMarker,
  SceneGateContext,
  useGatedRaycast,
  MESH_RAYCAST,
  INSTANCED_RAYCAST,
  labelFontFamily,
  type LabelRegistry,
  type PositionsRef,
  type BadgeCounts,
} from './shared';

export interface LocalHover {
  title: string;
  detail?: string;
  x: number;
  y: number;
}

type PickFn = (locId: string, anchor?: { x: number; y: number }) => void;
type HoverFn = (h: LocalHover | null) => void;

const DETAIL_TIER: React.MutableRefObject<MapZoomTier> = { current: 'detail' };
const NO_BADGES: BadgeCounts = { buildings: 0, npc: 0, world: 0 };
const UP = new THREE.Vector3(0, 1, 0);

// ── Shell ring: thin ring + label + slot pips + glints ───────────────────────

function ShellRing({ shell, unitR, selected, reduced, timeRef, onPick, onHover }: {
  shell: LocalShell;
  /** Scene units per body radius of the ring's OWNER (the body or a moon). */
  unitR: number;
  selected: boolean;
  reduced: boolean;
  timeRef: React.MutableRefObject<number>;
  onPick: PickFn;
  onHover: HoverFn;
}) {
  const R = shell.scale * unitR;
  const band = Math.max(0.006, R * 0.011);
  const raycast = useGatedRaycast(MESH_RAYCAST);
  const instRaycast = useGatedRaycast(INSTANCED_RAYCAST);

  const handleClick = useCallback((e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (e.delta > 6 || !shell.locationId) return;
    onPick(shell.locationId, { x: e.clientX, y: e.clientY });
  }, [shell.locationId, onPick]);
  const over = useCallback((e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    document.body.style.cursor = shell.locationId ? 'pointer' : 'auto';
    onHover({ title: shell.label, detail: shell.slots ? shell.slots.badge : 'No slot pool', x: e.clientX, y: e.clientY });
  }, [shell.label, shell.locationId, shell.slots, onHover]);
  const out = useCallback((e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    document.body.style.cursor = 'auto';
    onHover(null);
  }, [onHover]);

  // Pips — two instanced draws: solid (yours bright, others dim amber) and
  // hollow (free). Colour + size + shape all differ, never colour alone.
  const solid = useMemo(() => shell.pips.filter(p => p.kind !== 'free'), [shell.pips]);
  const hollow = useMemo(() => shell.pips.filter(p => p.kind === 'free'), [shell.pips]);
  const solidRef = useRef<THREE.InstancedMesh>(null);
  const hollowRef = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const m4 = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const pos = new THREE.Vector3();
    const sc = new THREE.Vector3();
    const col = new THREE.Color();
    const fill = (mesh: THREE.InstancedMesh | null, list: LocalSlotPip[], baseScale: number) => {
      if (!mesh) return;
      if (!mesh.instanceColor || mesh.instanceColor.count < list.length) {
        mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(Math.max(1, list.length) * 3), 3);
      }
      list.forEach((p, i) => {
        const a = -Math.PI / 2 + p.frac * Math.PI * 2;
        const s = baseScale * (p.kind === 'yours' ? 1.35 : 1);
        pos.set(Math.cos(a) * R, 0, Math.sin(a) * R);
        m4.compose(pos, q, sc.set(s, s, s));
        mesh.setMatrixAt(i, m4);
        const style = SLOT_PIP_STYLE[p.kind];
        col.set(style.color).multiplyScalar(style.alpha);
        mesh.instanceColor!.setXYZ(i, col.r, col.g, col.b);
      });
      mesh.count = list.length;
      mesh.instanceMatrix.needsUpdate = true;
      mesh.instanceColor!.needsUpdate = true;
    };
    fill(solidRef.current, solid, 0.028 * unitR);
    fill(hollowRef.current, hollow, 0.022 * unitR);
  }, [solid, hollow, R, unitR]);

  const pipOver = useCallback((list: LocalSlotPip[]) => (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    const p = typeof e.instanceId === 'number' ? list[e.instanceId] : undefined;
    if (!p) return;
    document.body.style.cursor = 'help';
    onHover({ title: `${shell.label} slot ${p.index + 1}`, detail: p.tag, x: e.clientX, y: e.clientY });
  }, [shell.label, onHover]);

  // Glints: your satellites bright on the ring, other corporations' dim just
  // inside it, your stations as small slabs just outside it. Positions
  // drift slowly (frozen under reduced motion).
  const yoursRef = useRef<THREE.InstancedMesh>(null);
  const othersRef = useRef<THREE.InstancedMesh>(null);
  const stationsRef = useRef<THREE.InstancedMesh>(null);
  const nYours = Math.min(2000, shell.satellites);
  const nOthers = Math.min(2000, shell.otherSatellites);
  const nStations = Math.min(200, shell.stations);
  const tmp = useMemo(() => ({ m4: new THREE.Matrix4(), q: new THREE.Quaternion(), pos: new THREE.Vector3(), sc: new THREE.Vector3() }), []);
  useFrame(() => {
    const t = reduced ? 0 : timeRef.current;
    const { m4, q, pos, sc } = tmp;
    const place = (mesh: THREE.InstancedMesh | null, n: number, radius: number, y: number, size: number, phase: number) => {
      if (!mesh) return;
      for (let i = 0; i < n; i++) {
        const a = glintAngle(i + phase, n, t);
        pos.set(Math.cos(a) * radius, y, Math.sin(a) * radius);
        m4.compose(pos, q, sc.set(size, size, size));
        mesh.setMatrixAt(i, m4);
      }
      mesh.count = n;
      mesh.instanceMatrix.needsUpdate = true;
    };
    place(yoursRef.current, nYours, R * 1.012, 0.02 * unitR, 0.02 * unitR, 0.25);
    place(othersRef.current, nOthers, R * 0.985, -0.02 * unitR, 0.014 * unitR, 0.6);
    place(stationsRef.current, nStations, R * 1.03, 0.035 * unitR, 0.045 * unitR, 0.5);
  });

  const lens: ModeVisual | null = shell.slots
    ? { tint: shell.slots.saturated ? '#f87171' : SLOT_SEGMENT_STYLE.others.color, intensity: 0.5, glyph: '', badge: shell.slots.badge, srText: shell.slots.srText }
    : null;
  const badges: BadgeCounts = shell.satellites + shell.stations > 0 ? { buildings: shell.satellites + shell.stations, npc: 0, world: 0 } : NO_BADGES;

  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} renderOrder={3}>
        <ringGeometry args={[R - band, R + band, 160]} />
        <meshBasicMaterial color={shell.color} transparent opacity={selected ? 0.95 : 0.62} side={THREE.DoubleSide} depthWrite={false} toneMapped={false} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} renderOrder={2}>
        <ringGeometry args={[R - band * 3.5, R + band * 3.5, 160]} />
        <meshBasicMaterial color={shell.color} transparent opacity={selected ? 0.14 : 0.08} side={THREE.DoubleSide} depthWrite={false} toneMapped={false} />
      </mesh>
      {selected && (
        <mesh rotation-x={-Math.PI / 2} renderOrder={3}>
          <ringGeometry args={[R - band * 4, R + band * 4, 160]} />
          <meshBasicMaterial color={shell.color} transparent opacity={0.18} side={THREE.DoubleSide} depthWrite={false} toneMapped={false} />
        </mesh>
      )}
      {/* Invisible torus: the ring's click / hover surface (radial menu for
          the slot ring). Raycast-gated like every interactive mesh. */}
      <mesh rotation-x={-Math.PI / 2} visible={false} onClick={handleClick} onPointerOver={over} onPointerOut={out} raycast={raycast}>
        <torusGeometry args={[R, Math.max(0.05, 0.09 * unitR), 6, 96]} />
        <meshBasicMaterial />
      </mesh>
      {solid.length > 0 && (
        <instancedMesh key={`solid-${solid.length}`} ref={solidRef} args={[undefined, undefined, solid.length]} frustumCulled={false} raycast={instRaycast} onPointerOver={pipOver(solid)} onPointerOut={out}>
          <octahedronGeometry args={[1, 0]} />
          <meshBasicMaterial toneMapped={false} />
        </instancedMesh>
      )}
      {hollow.length > 0 && (
        <instancedMesh key={`hollow-${hollow.length}`} ref={hollowRef} args={[undefined, undefined, hollow.length]} frustumCulled={false} raycast={instRaycast} onPointerOver={pipOver(hollow)} onPointerOut={out}>
          <torusGeometry args={[1, 0.28, 4, 10]} />
          <meshBasicMaterial toneMapped={false} transparent opacity={0.7} />
        </instancedMesh>
      )}
      {nYours > 0 && (
        <instancedMesh key={`yours-${nYours}`} ref={yoursRef} args={[undefined, undefined, nYours]} frustumCulled={false} raycast={() => null}>
          <sphereGeometry args={[1, 6, 6]} />
          <meshBasicMaterial color="#a5f3fc" toneMapped={false} />
        </instancedMesh>
      )}
      {nOthers > 0 && (
        <instancedMesh key={`others-${nOthers}`} ref={othersRef} args={[undefined, undefined, nOthers]} frustumCulled={false} raycast={() => null}>
          <sphereGeometry args={[1, 5, 5]} />
          <meshBasicMaterial color="#8a7a4a" transparent opacity={0.6} toneMapped={false} />
        </instancedMesh>
      )}
      {nStations > 0 && (
        <instancedMesh key={`stations-${nStations}`} ref={stationsRef} args={[undefined, undefined, nStations]} frustumCulled={false} raycast={() => null}>
          <boxGeometry args={[1.6, 0.5, 0.5]} />
          <meshBasicMaterial color="#e2e8f0" toneMapped={false} />
        </instancedMesh>
      )}
      <group position={[0, 0, -R]}>
        <LabelSprite name={shell.label} unlocked badges={badges} mode={lens} tierRef={DETAIL_TIER} locationId={shell.locationId ?? `shell:${shell.id}`} yOffset={0.06 * unitR} priority={1} />
      </group>
    </group>
  );
}

// ── Moon: sphere + label + its own shells, orbiting on the scene clock ──────

function MoonNode({ moon, bodyR, reduced, timeRef, selectedLocationId, onPick, onHover }: {
  moon: LocalMoon; bodyR: number; reduced: boolean; timeRef: React.MutableRefObject<number>;
  selectedLocationId: string | null; onPick: PickFn; onHover: HoverFn;
}) {
  const groupRef = useRef<THREE.Group>(null);
  useFrame(() => {
    const o = localMoonOffset(moon, reduced ? 0 : timeRef.current);
    groupRef.current?.position.set(o[0] * bodyR, 0, o[2] * bodyR);
  });
  const handleClick = useCallback((e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (e.delta > 6 || !moon.locationId) return;
    onPick(moon.locationId, { x: e.clientX, y: e.clientY });
  }, [moon.locationId, onPick]);
  const setCursor = useCallback((on: boolean) => (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    document.body.style.cursor = on && moon.locationId ? 'pointer' : 'auto';
  }, [moon.locationId]);
  return (
    <group ref={groupRef}>
      <BodySphere r={moon.r} texture={moon.texture} color={moon.color} locationId={moon.locationId} unlocked={moon.unlocked} reduced={reduced} onClick={handleClick} onPointerOver={setCursor(true)} onPointerOut={setCursor(false)} />
      {moon.locationId && <LabelSprite name={moon.name} unlocked={moon.unlocked} badges={NO_BADGES} tierRef={DETAIL_TIER} locationId={moon.locationId} yOffset={-(moon.r + 0.3)} priority={2} />}
      {moon.shells.map(s => (
        <ShellRing key={s.id} shell={s} unitR={moon.r} selected={!!s.locationId && selectedLocationId === s.locationId} reduced={reduced} timeRef={timeRef} onPick={onPick} onHover={onHover} />
      ))}
    </group>
  );
}

// ── Ships: yours bright with a name + ETA tag, contacts dim ──────────────────

const TAG_W = 240;
const TAG_H = 44;

function ShipTag({ ship, builtAtMs, posMap }: { ship: LocalShip; builtAtMs: number; posMap: Map<string, THREE.Vector3> }) {
  const spriteRef = useRef<THREE.Sprite>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const tex = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = TAG_W;
    c.height = TAG_H;
    canvasRef.current = c;
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, []);
  useEffect(() => () => tex.dispose(), [tex]);
  const [text, setText] = useState('');
  useEffect(() => {
    const arrival = typeof ship.etaMs === 'number' ? builtAtMs + ship.etaMs : null;
    const compute = () => {
      const eta = arrival ? ` · ETA ${formatCountdown(Math.max(0, (arrival - Date.now()) / 1000))}` : '';
      const verb = ship.status === 'arriving' ? 'arriving' : ship.status === 'departing' ? 'departing' : 'holding';
      setText(`${ship.name} · ${verb}${eta}`);
    };
    compute();
    const iv = setInterval(compute, 1000);
    return () => clearInterval(iv);
  }, [ship, builtAtMs]);
  useEffect(() => {
    const c = canvasRef.current;
    const ctx = c?.getContext('2d');
    if (!c || !ctx) return;
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.font = `600 20px ${labelFontFamily()}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0,0,0,0.9)';
    ctx.shadowBlur = 6;
    ctx.fillStyle = ship.status === 'holding' ? '#cbd5e1' : '#67e8f9';
    ctx.fillText(text, c.width / 2, c.height / 2);
    tex.needsUpdate = true;
  }, [text, tex, ship.status]);
  useFrame(() => {
    const sp = spriteRef.current;
    const p = posMap.get(ship.id);
    if (!sp) return;
    if (!p) { sp.visible = false; return; }
    sp.visible = true;
    sp.position.set(p.x, p.y + 0.16, p.z);
  });
  return (
    <sprite ref={spriteRef} visible={false} scale={[0.046 * (TAG_W / TAG_H), 0.046, 1]} renderOrder={11}>
      <spriteMaterial map={tex} sizeAttenuation={false} transparent depthTest={false} />
    </sprite>
  );
}

function LocalShips({ model, posRef, timeRef, reduced, asOfMs, showShips, showContacts, onHover }: {
  model: LocalSceneModel; posRef: PositionsRef; timeRef: React.MutableRefObject<number>; reduced: boolean;
  asOfMs: number; showShips: boolean; showContacts: boolean; onHover: HoverFn;
}) {
  const lists = useMemo(() => {
    const ownTransit: LocalShip[] = [];
    const ownHold: LocalShip[] = [];
    const conTransit: LocalShip[] = [];
    const conHold: LocalShip[] = [];
    for (const s of model.ships) {
      if (s.own && !showShips) continue;
      if (!s.own && !showContacts) continue;
      const transit = s.contact.status === 'transit';
      (s.own ? (transit ? ownTransit : ownHold) : (transit ? conTransit : conHold)).push(s);
    }
    return { ownTransit, ownHold, conTransit, conHold };
  }, [model.ships, showShips, showContacts]);
  const refs = {
    ownTransit: useRef<THREE.InstancedMesh>(null),
    ownHold: useRef<THREE.InstancedMesh>(null),
    conTransit: useRef<THREE.InstancedMesh>(null),
    conHold: useRef<THREE.InstancedMesh>(null),
  };
  const posMap = useMemo(() => new Map<string, THREE.Vector3>(), []);
  const tmp = useMemo(() => ({ m4: new THREE.Matrix4(), q: new THREE.Quaternion(), v: new THREE.Vector3(), dir: new THREE.Vector3(), sc: new THREE.Vector3() }), []);

  // Own-ship colours by hull class (set once per list).
  useLayoutEffect(() => {
    const col = new THREE.Color();
    const paint = (mesh: THREE.InstancedMesh | null, list: LocalShip[]) => {
      if (!mesh || list.length === 0) return;
      if (!mesh.instanceColor || mesh.instanceColor.count < list.length) {
        mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(list.length * 3), 3);
      }
      list.forEach((s, i) => { col.set(s.color); mesh.instanceColor!.setXYZ(i, col.r, col.g, col.b); });
      mesh.instanceColor.needsUpdate = true;
    };
    paint(refs.ownTransit.current, lists.ownTransit);
    paint(refs.ownHold.current, lists.ownHold);
    paint(refs.conTransit.current, lists.conTransit);
    paint(refs.conHold.current, lists.conHold);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lists]);

  useFrame(() => {
    const t = reduced ? 0 : timeRef.current;
    const exitDirs: Record<string, [number, number]> = {};
    for (const id of model.externalIds) {
      const d = exitDirection(posRef.current, model.bodyId, id);
      if (d) exitDirs[id] = d;
    }
    const anchors = localAnchorsAt(model, t, model.bodyR, exitDirs);
    const now = Date.now();
    const { m4, q, v, dir, sc } = tmp;
    const fill = (mesh: THREE.InstancedMesh | null, list: LocalShip[], table: Record<string, ContactAnchor>, holding: boolean, size: number) => {
      if (!mesh) return;
      const placed = placeContacts(
        list.map(s => s.contact),
        table,
        now,
        holding ? { orbitGap: 0, staticOrbit: reduced, orbitRadPerSec: 0.18 } : { asOfMs: list[0]?.own ? model.builtAtMs : asOfMs, plane: 'xz', bendCap: 0.6 * model.bodyR },
      );
      let n = 0;
      for (const p of placed) {
        v.set(p.pos[0], p.pos[1] + (holding ? 0.03 * model.bodyR : 0.05 * model.bodyR), p.pos[2]);
        if (p.heading) { dir.set(p.heading[0], p.heading[1], p.heading[2]); q.setFromUnitVectors(UP, dir); } else q.identity();
        m4.compose(v, q, sc.set(size, size, size));
        mesh.setMatrixAt(n, m4);
        posMap.set(p.contact.id, (posMap.get(p.contact.id) ?? new THREE.Vector3()).copy(v));
        n++;
      }
      mesh.count = n;
      mesh.instanceMatrix.needsUpdate = true;
    };
    fill(refs.ownTransit.current, lists.ownTransit, anchors.lane, false, 1);
    fill(refs.ownHold.current, lists.ownHold, anchors.hold, true, 1);
    fill(refs.conTransit.current, lists.conTransit, anchors.lane, false, 1);
    fill(refs.conHold.current, lists.conHold, anchors.hold, true, 1);
  });

  const instRaycast = useGatedRaycast(INSTANCED_RAYCAST);
  const hoverFor = useCallback((list: LocalShip[]) => (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    const s = typeof e.instanceId === 'number' ? list[e.instanceId] : undefined;
    if (!s) return;
    document.body.style.cursor = 'help';
    if (s.own) {
      const arrival = typeof s.etaMs === 'number' ? model.builtAtMs + s.etaMs : null;
      onHover({ title: s.name, detail: `${s.status}${arrival ? ` · ETA ${formatCountdown(Math.max(0, (arrival - Date.now()) / 1000))}` : ''}`, x: e.clientX, y: e.clientY });
    } else {
      onHover({ title: contactLabel(s.contact), detail: contactDetail(s.contact, Date.now(), asOfMs), x: e.clientX, y: e.clientY });
    }
  }, [asOfMs, model.builtAtMs, onHover]);
  const leave = useCallback((e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    document.body.style.cursor = 'auto';
    onHover(null);
  }, [onHover]);

  const s = 0.11 * model.bodyR;
  const inst = (key: keyof typeof lists, geo: React.ReactNode, opacity: number) => {
    const list = lists[key];
    if (list.length === 0) return null;
    return (
      <instancedMesh key={`${key}-${list.length}`} ref={refs[key]} args={[undefined, undefined, list.length]} frustumCulled={false} raycast={instRaycast} onPointerOver={hoverFor(list)} onPointerOut={leave}>
        {geo}
        <meshBasicMaterial transparent opacity={opacity} depthWrite={false} toneMapped={false} />
      </instancedMesh>
    );
  };
  return (
    <group>
      {inst('ownTransit', <coneGeometry args={[s * 0.45, s * 1.3, 8]} />, 1)}
      {inst('ownHold', <sphereGeometry args={[s * 0.32, 8, 8]} />, 1)}
      {inst('conTransit', <octahedronGeometry args={[s * 0.4, 0]} />, 0.55)}
      {inst('conHold', <octahedronGeometry args={[s * 0.32, 0]} />, 0.45)}
      {showShips && lists.ownTransit.map(sh => <ShipTag key={sh.id} ship={sh} builtAtMs={model.builtAtMs} posMap={posMap} />)}
    </group>
  );
}

// ── The local scene ──────────────────────────────────────────────────────────

export interface SolarMapLocalProps {
  model: LocalSceneModel;
  posRef: PositionsRef;
  timeRef: React.MutableRefObject<number>;
  reduced: boolean;
  selectedLocationId: string | null;
  contactsAsOfMs: number;
  showShips: boolean;
  showContacts: boolean;
  onPick: PickFn;
  onHover: HoverFn;
}

export default function SolarMapLocal({ model, posRef, timeRef, reduced, selectedLocationId, contactsAsOfMs, showShips, showContacts, onPick, onHover }: SolarMapLocalProps) {
  const rootRef = useRef<THREE.Group>(null);
  const gate = useRef(true);
  const def = ORBITAL_BODY_MAP.get(model.bodyId);
  const registry = useMemo<LabelRegistry>(() => ({ entries: new Map(), suppressed: new Set() }), []);
  useFrame(() => {
    const p = posRef.current.bodies[model.bodyId];
    if (p && rootRef.current) rootRef.current.position.set(p[0], p[1], p[2]);
  });
  const handleBodyClick = useCallback((e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (e.delta > 6) return;
    onPick(model.locationId, { x: e.clientX, y: e.clientY });
  }, [model.locationId, onPick]);
  const setCursor = useCallback((on: boolean) => (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    document.body.style.cursor = on ? 'pointer' : 'auto';
  }, []);
  // Reticle anchors in the local frame: the body, each moon (live), and
  // nothing for shells (the ring itself brightens instead).
  const resolve = useCallback((locId: string) => {
    if (locId === model.locationId) return { pos: [0, 0, 0] as const, r: model.bodyR };
    const moon = model.moons.find(m => m.locationId === locId);
    if (moon) {
      const o = localMoonOffset(moon, reduced ? 0 : timeRef.current);
      return { pos: [o[0] * model.bodyR, 0, o[2] * model.bodyR] as const, r: moon.r };
    }
    return null;
  }, [model, reduced, timeRef]);
  const bodyBadges: BadgeCounts = useMemo(() => {
    const n = model.shells.reduce((a, s) => a + s.satellites + s.stations, 0);
    return n > 0 ? { buildings: n, npc: 0, world: 0 } : NO_BADGES;
  }, [model.shells]);

  return (
    <SceneGateContext.Provider value={gate}>
      <LabelRegistryContext.Provider value={registry}>
        <group ref={rootRef}>
          <BodySphere
            r={model.bodyR}
            texture={model.texture}
            cloudsTexture={def?.cloudsTexture}
            nightTexture={def?.nightTexture}
            color={model.color}
            locationId={model.locationId}
            unlocked={model.unlocked}
            reduced={reduced}
            ring={def?.ring}
            onClick={handleBodyClick}
            onPointerOver={setCursor(true)}
            onPointerOut={setCursor(false)}
          />
          <LabelSprite name={model.name} unlocked={model.unlocked} badges={bodyBadges} tierRef={DETAIL_TIER} locationId={model.locationId} yOffset={-(model.bodyR + 0.45)} priority={4} />
          {model.shells.map(s => (
            <ShellRing key={s.id} shell={s} unitR={model.bodyR} selected={!!s.locationId && selectedLocationId === s.locationId} reduced={reduced} timeRef={timeRef} onPick={onPick} onHover={onHover} />
          ))}
          {model.moons.map(m => (
            <MoonNode key={m.id} moon={m} bodyR={model.bodyR} reduced={reduced} timeRef={timeRef} selectedLocationId={selectedLocationId} onPick={onPick} onHover={onHover} />
          ))}
          <LocalShips model={model} posRef={posRef} timeRef={timeRef} reduced={reduced} asOfMs={contactsAsOfMs} showShips={showShips} showContacts={showContacts} onHover={onHover} />
          <SelectionMarker resolve={resolve} selectedLocationId={selectedLocationId} reduced={reduced} pad={0.1 * model.bodyR} />
          <LabelDeclutter registry={registry} selectedLocationId={selectedLocationId} alwaysLabels={false} />
        </group>
      </LabelRegistryContext.Provider>
    </SceneGateContext.Provider>
  );
}
