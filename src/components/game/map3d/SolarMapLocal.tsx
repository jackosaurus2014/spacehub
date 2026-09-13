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
//   • your satellites (bright bus-with-panels silhouettes) and stations
//     (station rings) on their shell, other corporations' satellites as dim
//     buses — two instanced facility meshes (graphics review item 7),
//   • ships arriving / departing / holding: yours and revealed contacts as
//     instanced hull silhouettes with a name + ETA tag, anonymised contacts
//     the dim generic marker, NPC backdrop the faction slab — all placed by
//     placeContacts() against the local anchor tables (one placement path,
//     two renderers),
//   • the radial command menu reachable for the body, every moon and every
//     slot ring (onPick with a screen anchor, exactly like the system view).
//
// Labels are the shared SDF labels (item 6) with a declutter registry of
// their own; the tier is pinned to 'detail' (a local scene IS the detail
// view). A selected moon's orbit path brightens.

import { useRef, useMemo, useCallback, useLayoutEffect, useEffect, useState } from 'react';
import * as THREE from 'three';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import { formatCountdown } from '@/lib/game/formulas';
import { ORBITAL_BODY_MAP } from '@/lib/game/orbital-elements';
import type { MapZoomTier } from '@/lib/game/map-zoom';
import type { ModeVisual } from '@/lib/game/map-modes';
import { SLOT_SEGMENT_STYLE } from '@/lib/game/map-bodies';
import { placeContacts, contactLabel, contactDetail, corpRingColor, FACTION_CONTACT_TINT, ANON_CONTACT_COLOR, type TrafficContact, type ContactAnchor } from '@/lib/game/ship-traffic';
import { batchHullInstances, contactRenderKind, HULL_SCALE, HULL_MODEL_IDS, type HullInstanceInput, type HullModelId } from '@/lib/game/map-hulls';
import { MAP_LABEL_COLORS, MAP_TAG_PX } from '@/lib/game/map-labels';
import { HullInstances, MarkerMesh, SlabMesh, RingMesh, FacilityMesh, instanceCapacity, paintInstances } from './hulls';
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
  BodyLabel,
  HudTag,
  OrbitPath,
  LabelDeclutter,
  LabelRegistryContext,
  createLabelRegistry,
  SelectionMarker,
  SceneGateContext,
  useGatedRaycast,
  MESH_RAYCAST,
  INSTANCED_RAYCAST,
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

  // Facilities (item 7): your satellites as bright bus-with-panels
  // silhouettes on the ring, other corporations' as dim buses just inside
  // it, your stations as station rings just outside it — two instanced
  // meshes, panels tangent to the orbit. Positions drift slowly (frozen
  // under reduced motion).
  const yoursRef = useRef<THREE.InstancedMesh | null>(null);
  const othersRef = useRef<THREE.InstancedMesh | null>(null);
  const stationsRef = useRef<THREE.InstancedMesh | null>(null);
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
        q.setFromAxisAngle(UP, -(a + Math.PI / 2)); // panel span tangent to the orbit
        m4.compose(pos, q, sc.set(size, size, size));
        mesh.setMatrixAt(i, m4);
      }
      mesh.count = n;
      mesh.instanceMatrix.needsUpdate = true;
    };
    place(yoursRef.current, nYours, R * 1.012, 0.02 * unitR, 0.05 * unitR, 0.25);
    place(othersRef.current, nOthers, R * 0.985, -0.02 * unitR, 0.034 * unitR, 0.6);
    place(stationsRef.current, nStations, R * 1.03, 0.035 * unitR, 0.1 * unitR, 0.5);
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
      {nYours > 0 && <FacilityMesh key={`yours-${nYours}`} kind="satellite" capacity={nYours} color="#a5f3fc" register={m => { yoursRef.current = m; }} />}
      {nOthers > 0 && <FacilityMesh key={`others-${nOthers}`} kind="satellite" capacity={nOthers} color="#8a7a4a" opacity={0.6} register={m => { othersRef.current = m; }} />}
      {nStations > 0 && <FacilityMesh key={`stations-${nStations}`} kind="station" capacity={nStations} color="#e2e8f0" register={m => { stationsRef.current = m; }} />}
      <group position={[0, 0, -R]}>
        <BodyLabel name={shell.label} unlocked badges={badges} mode={lens} tierRef={DETAIL_TIER} locationId={shell.locationId ?? `shell:${shell.id}`} yOffset={0.06 * unitR} priority={1} />
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
      {moon.locationId && <BodyLabel name={moon.name} unlocked={moon.unlocked} badges={NO_BADGES} tierRef={DETAIL_TIER} locationId={moon.locationId} yOffset={-(moon.r + 0.3)} priority={2} />}
      {moon.shells.map(s => (
        <ShellRing key={s.id} shell={s} unitR={moon.r} selected={!!s.locationId && selectedLocationId === s.locationId} reduced={reduced} timeRef={timeRef} onPick={onPick} onHover={onHover} />
      ))}
    </group>
  );
}

// ── Ships: hull silhouettes, yours with a name + ETA tag ───────────────────

function ShipTag({ ship, builtAtMs, posMap }: { ship: LocalShip; builtAtMs: number; posMap: Map<string, THREE.Vector3> }) {
  const rootRef = useRef<THREE.Group>(null);
  const placedRef = useRef(false);
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
  useFrame(() => {
    const p = posMap.get(ship.id);
    const g = rootRef.current;
    placedRef.current = !!p;
    if (p && g) g.position.set(p.x, p.y + 0.16, p.z);
  });
  const resolve = useCallback(() => placedRef.current && text !== '', [text]);
  return <HudTag ref={rootRef} text={text} px={MAP_TAG_PX} color={ship.status === 'holding' ? MAP_LABEL_COLORS.tagHolding : MAP_LABEL_COLORS.tag} resolve={resolve} />;
}

interface LocalShipItem extends HullInstanceInput { ship: LocalShip }

function LocalShips({ model, posRef, timeRef, reduced, asOfMs, showShips, showContacts, onHover }: {
  model: LocalSceneModel; posRef: PositionsRef; timeRef: React.MutableRefObject<number>; reduced: boolean;
  asOfMs: number; showShips: boolean; showContacts: boolean; onHover: HoverFn;
}) {
  // Draw groups (lib/game/map-hulls.ts): own + revealed → hull meshes per
  // class; anonymised → generic marker; NPC → faction slab; rings under
  // the revealed. Order inside each group is the item order (instanceId →
  // item for hover).
  const items = useMemo<LocalShipItem[]>(() => {
    const out: LocalShipItem[] = [];
    for (const s of model.ships) {
      if (s.own && !showShips) continue;
      if (!s.own && !showContacts) continue;
      out.push({ id: s.id, hullClass: s.contact.hullClass, kind: s.own ? 'own' : contactRenderKind(s.contact), ship: s });
    }
    return out;
  }, [model.ships, showShips, showContacts]);
  const batches = useMemo(() => batchHullInstances(items), [items]);
  const caps = useMemo(() => ({
    hulls: Object.fromEntries(HULL_MODEL_IDS.map(m => [m, instanceCapacity(batches.hulls[m].length)])) as Record<HullModelId, number>,
    anonymous: instanceCapacity(batches.anonymous.length),
    npc: instanceCapacity(batches.npc.length),
    rings: instanceCapacity(batches.rings.length),
  }), [batches]);
  const refs = useRef<{ hulls: Partial<Record<HullModelId, THREE.InstancedMesh | null>>; anonymous: THREE.InstancedMesh | null; npc: THREE.InstancedMesh | null; rings: THREE.InstancedMesh | null }>({ hulls: {}, anonymous: null, npc: null, rings: null });
  const register = useMemo(() => {
    const hulls = {} as Record<HullModelId, (mesh: THREE.InstancedMesh | null) => void>;
    for (const m of HULL_MODEL_IDS) {
      hulls[m] = mesh => {
        refs.current.hulls[m] = mesh;
        if (mesh) paintInstances(mesh, batches.hulls[m], caps.hulls[m], (it, tmp) => tmp.set(it.kind === 'own' ? it.ship.color : '#cbd5e1'));
      };
    }
    return {
      hulls,
      anonymous: (mesh: THREE.InstancedMesh | null) => {
        refs.current.anonymous = mesh;
        if (mesh) paintInstances(mesh, batches.anonymous, caps.anonymous, (_, tmp) => tmp.set(ANON_CONTACT_COLOR));
      },
      npc: (mesh: THREE.InstancedMesh | null) => {
        refs.current.npc = mesh;
        if (mesh) paintInstances(mesh, batches.npc, caps.npc, (it, tmp) => tmp.set(it.ship.contact.factionHint ? FACTION_CONTACT_TINT[it.ship.contact.factionHint] : ANON_CONTACT_COLOR));
      },
      rings: (mesh: THREE.InstancedMesh | null) => {
        refs.current.rings = mesh;
        if (mesh) paintInstances(mesh, batches.rings, caps.rings, (it, tmp) => tmp.set(corpRingColor(it.ship.contact.intel!.corpId)));
      },
    };
  }, [batches, caps]);

  const posMap = useMemo(() => new Map<string, THREE.Vector3>(), []);
  const headMap = useMemo(() => new Map<string, THREE.Vector3>(), []);
  const tmp = useMemo(() => ({ m4: new THREE.Matrix4(), q: new THREE.Quaternion(), sc: new THREE.Vector3() }), []);

  useFrame(() => {
    const t = reduced ? 0 : timeRef.current;
    const exitDirs: Record<string, [number, number]> = {};
    for (const id of model.externalIds) {
      const d = exitDirection(posRef.current, model.bodyId, id);
      if (d) exitDirs[id] = d;
    }
    const anchors = localAnchorsAt(model, t, model.bodyR, exitDirs);
    const now = Date.now();
    // One placement pass for everything shown, into id-keyed maps.
    const transit: LocalShip[] = [];
    const holding: LocalShip[] = [];
    for (const it of items) (it.ship.contact.status === 'transit' ? transit : holding).push(it.ship);
    const seen = new Set<string>();
    const take = (list: LocalShip[], table: Record<string, ContactAnchor>, hold: boolean) => {
      if (list.length === 0) return;
      const ownFirst = list[0].own;
      const placed = placeContacts(
        list.map(s => s.contact),
        table,
        now,
        hold ? { orbitGap: 0, staticOrbit: reduced, orbitRadPerSec: 0.18 } : { asOfMs: ownFirst ? model.builtAtMs : asOfMs, plane: 'xz', bendCap: 0.6 * model.bodyR },
      );
      for (const p of placed) {
        const v = posMap.get(p.contact.id) ?? new THREE.Vector3();
        v.set(p.pos[0], p.pos[1] + (hold ? 0.03 * model.bodyR : 0.05 * model.bodyR), p.pos[2]);
        posMap.set(p.contact.id, v);
        if (p.heading) {
          const h = headMap.get(p.contact.id) ?? new THREE.Vector3();
          h.set(p.heading[0], p.heading[1], p.heading[2]);
          headMap.set(p.contact.id, h);
        } else headMap.delete(p.contact.id);
        seen.add(p.contact.id);
      }
    };
    // Own transits carry their own feed time; contacts the traffic feed's.
    take(transit.filter(s => s.own), anchors.lane, false);
    take(transit.filter(s => !s.own), anchors.lane, false);
    take(holding, anchors.hold, true);
    posMap.forEach((_, id) => { if (!seen.has(id)) posMap.delete(id); });

    const { m4, q, sc } = tmp;
    const fill = (mesh: THREE.InstancedMesh | null | undefined, list: LocalShipItem[], scaleOf: (it: LocalShipItem) => number) => {
      if (!mesh) return;
      let n = 0;
      for (const it of list) {
        const p = posMap.get(it.id);
        if (!p) continue;
        const h = headMap.get(it.id);
        if (h) q.setFromUnitVectors(UP, h); else q.identity();
        const s = scaleOf(it);
        m4.compose(p, q, sc.set(s, s, s));
        mesh.setMatrixAt(n++, m4);
      }
      mesh.count = n;
      mesh.instanceMatrix.needsUpdate = true;
    };
    const hullScale = (it: LocalShipItem) => (it.kind === 'own' ? HULL_SCALE.ownLocal : HULL_SCALE.revealedLocal) * model.bodyR;
    for (const m of HULL_MODEL_IDS) fill(refs.current.hulls[m], batches.hulls[m], hullScale);
    fill(refs.current.anonymous, batches.anonymous, () => 1);
    fill(refs.current.npc, batches.npc, () => 1);
    fill(refs.current.rings, batches.rings, () => 1);
  });

  const instRaycast = useGatedRaycast(INSTANCED_RAYCAST);
  const hoverFor = useCallback((list: LocalShipItem[]) => (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    const s = typeof e.instanceId === 'number' ? list[e.instanceId]?.ship : undefined;
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
  return (
    <group>
      {HULL_MODEL_IDS.map(m => batches.hulls[m].length > 0 && (
        <HullInstances
          key={`${m}-${caps.hulls[m]}`}
          model={m}
          capacity={caps.hulls[m]}
          markerRadius={0.3}
          register={register.hulls[m]}
          raycast={instRaycast}
          onPointerOver={hoverFor(batches.hulls[m])}
          onPointerOut={leave}
        />
      ))}
      {batches.anonymous.length > 0 && (
        <MarkerMesh key={`anon-${caps.anonymous}`} capacity={caps.anonymous} radius={s * 0.4} opacity={0.55} register={register.anonymous} raycast={instRaycast} onPointerOver={hoverFor(batches.anonymous)} onPointerOut={leave} />
      )}
      {batches.npc.length > 0 && (
        <SlabMesh key={`npc-${caps.npc}`} capacity={caps.npc} size={s * 0.7} opacity={0.5} register={register.npc} raycast={instRaycast} onPointerOver={hoverFor(batches.npc)} onPointerOut={leave} />
      )}
      {batches.rings.length > 0 && (
        <RingMesh key={`rings-${caps.rings}`} capacity={caps.rings} radius={s * 0.9} register={register.rings} />
      )}
      {showShips && model.ships.filter(sh => sh.own && sh.contact.status === 'transit').map(sh => <ShipTag key={sh.id} ship={sh} builtAtMs={model.builtAtMs} posMap={posMap} />)}
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
  const registry = useMemo<LabelRegistry>(() => createLabelRegistry(), []);
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
          <BodyLabel name={model.name} unlocked={model.unlocked} badges={bodyBadges} tierRef={DETAIL_TIER} locationId={model.locationId} yOffset={-(model.bodyR + 0.45)} priority={4} />
          {model.shells.map(s => (
            <ShellRing key={s.id} shell={s} unitR={model.bodyR} selected={!!s.locationId && selectedLocationId === s.locationId} reduced={reduced} timeRef={timeRef} onPick={onPick} onHover={onHover} />
          ))}
          {/* Moon orbit paths — the selected moon's brightens (item 6). */}
          {model.moons.map(m => (
            <OrbitPath key={`orbit-${m.id}`} radius={m.orbitScale * model.bodyR} highlighted={!!m.locationId && selectedLocationId === m.locationId} baseOpacity={0.14} segments={96} />
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
