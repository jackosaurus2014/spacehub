'use client';

// ─── SolarMap3D (4X wave W7 — the WebGL solar map) ──────────────────────────
// R3F scene that replaces SolarSystemCanvas as the DEFAULT desktop renderer
// inside MapCommandCenter. Physically-truthful presentation: real orbital
// elements, log-scaled distances and periods (see orbital-elements.ts),
// NASA-derived equirectangular textures under /textures/.
//
// Interaction parity with the 2D canvas (which REMAINS the fallback for
// mobile / reduced-motion / no-WebGL / user preference):
//   - click a body or orbital pip → same selectLocation flow → MapContextPanel
//   - controlled selection via selectedLocationId (Order Queue HUD, close btn)
//   - keyboard-accessible Location List overlay (same grouping, same buttons)
//   - lanes / ships / world layer toggles, building + NPC + world badges
//   - ship transit arcs interpolated from real departure/arrival times
//   - hazard rings for recent hazards (<60 s)
//
// 4X wave W9 (overlay deepening — read-only state consumption):
//   - ETA countdown labels on in-transit ships (canvas-sprite, 1 Hz refresh)
//   - hazard FORECAST telegraphs (state.hazardWarnings): slow-pulse amber
//     ring + warning glyph, visually distinct from the expanding active-hazard
//     rings; detail lives in MapContextPanel's existing warning chips
//   - zone standing tint (state.zoneStandings): governor gold / stakeholder
//     cyan glow behind every location in the zone, PLUS a crown/diamond text glyph in
//     the label so standing is never conveyed by color alone
//   - science-mission presence: instrument glyph on program target bodies
//
// Performance: single instanced mesh for the belt, sprite labels (no DOM, no
// font network fetch), frameloop paused when the tab/page is hidden, DPR
// capped at 1.5. Text labels are canvas sprites with sizeAttenuation:false so
// they stay readable at Pluto range without DOM overlays.

import { useRef, useState, useEffect, useMemo, useCallback, useLayoutEffect, lazy, Suspense } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { OrbitControls, Stars, Billboard } from '@react-three/drei';
import { useContext } from 'react';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import type { GameState } from '@/lib/game/types';
import { LANES } from '@/lib/game/spatial-strategy';
import { laneKey } from '@/lib/game/trade-lanes';
import { SHIP_MAP } from '@/lib/game/ships';
import { formatCountdown } from '@/lib/game/formulas';
import { ZONE_MAP } from '@/lib/game/zone-influence';
import { getActiveScienceMissions, SCIENCE_PROGRAM_MAP } from '@/lib/game/science-missions';
import { playSound } from '@/lib/game/sound-engine';
import { useWorldState } from '@/hooks/useWorldState';
import { onMapPing, getPingVisual, PING_COLOR, type MapPingEvent } from '@/lib/game/map-ping';
import { EFFECT_ASSETS, SKYBOX_ASSETS } from '@/lib/game/assets';
import { computeModeVisuals, type MapMode, type ModeVisual } from '@/lib/game/map-modes';
import { ORBITAL_BODY_MAP } from '@/lib/game/orbital-elements';
// Wave A2 (map as command theater) — zoom tiers, body presentation data and
// orbital-slot ring math, shared verbatim with the 2D canvas (map-modes.ts
// precedent: one derivation, two renderers, never disagreeing).
import {
  zoomTierFromCameraDistance,
  lensVisibleAt,
  MAP_ZOOM_TIER_LABEL,
  type MapZoomTier,
} from '@/lib/game/map-zoom';
import { computeSlotRings, SLOT_SEGMENT_STYLE, type SlotRingModel } from '@/lib/game/map-bodies';
import { REGION_LABELS, LOCATIONS_BY_REGION } from './SolarSystemCanvas';
// Graphics review 2026-09-12: shell-owned Lanes/Ships/World (item 5), the
// canvas-drawn glyph table (item 10 — DOM emoji are GameIcons now), and the
// chrome kit for the in-transit chip.
import { DEFAULT_MAP_LAYERS, toggleMapLayer, type MapLayerVisibility, type MapLayerKey } from '@/lib/game/map-layers';
// Ship traffic layer (2026-09-13): other corporations' ships as anonymised
// contacts (+ NPC backdrop), identities only with an active fleet reveal.
// Placement maths shared verbatim with the 2D canvas (ship-traffic.ts).
import {
  placeContacts,
  contactLabel,
  contactDetail,
  corpRingColor,
  FACTION_CONTACT_TINT,
  ANON_CONTACT_COLOR,
  TRAFFIC_RENDER_CAP,
  type TrafficContact,
} from '@/lib/game/ship-traffic';
import { MAP_GLYPHS } from '@/lib/game/map-glyphs';
// Flight mode part (a) — shared scene helpers (labels, textures, body
// sphere, reticle, the raycast gate) and the local scene, both children of
// this component's ONE Canvas.
import {
  useSafeTexture,
  labelFontFamily,
  makeGlyphTexture,
  ZoomTierTracker,
  LabelRegistryContext,
  LabelDeclutter,
  labelPriority,
  LabelSprite,
  SelectionMarker,
  BodySphere,
  SceneGateContext,
  useGatedRaycast,
  MESH_RAYCAST,
  INSTANCED_RAYCAST,
  type BadgeCounts,
  type ZoneStandingKind,
  type TierRef,
  type LabelRegistry,
  type PositionsRef,
} from './map3d/shared';
import SolarMapLocal, { type LocalHover } from './map3d/SolarMapLocal';
import {
  flyDurationMs,
  flyProgress,
  interpolatePose,
  frameDistance,
  nextLocalBody,
  localCandidatesFrom,
  localBodyForLocation,
  buildLocalSceneModel,
  bodyName,
  rootBodyId,
  type CameraPose,
  type LocalSceneModel,
} from '@/lib/game/map-flight';
import GameIcon from './GameIcon';
import { DataChip } from './chrome';
import {
  ORBITAL_BODIES,
  ORBITAL_PIPS,
  computeScenePositions,
  sceneBodyRadius,
  sceneOrbitRadius,
  SUN_VISUAL_RADIUS,
  BELT_SCENE_RADIUS,
  type OrbitalBody,
  type OrbitalPip,
  type ScenePositions,
} from '@/lib/game/orbital-elements';

// Role → color, mirrored from the 2D canvas so ships read identically.
const SHIP_COLOR: Record<string, string> = {
  transport: '#22d3ee',
  tanker: '#60a5fa',
  mining: '#fbbf24',
  survey: '#c084fc',
};


interface SolarMap3DProps {
  state: GameState;
  /** Wave A2: an optional `anchor` (container-relative px) accompanies scene
   *  clicks / context requests so the shell can open the radial command menu
   *  AT the body. Omitted = open the full context panel (keyboard path). */
  onSelectLocation?: (locId: string | null, anchor?: { x: number; y: number }) => void;
  selectedLocationId?: string | null;
  /** Wave A2 — force every label/badge at every zoom (accessibility override
   *  for the zoom-based information layering). */
  alwaysLabels?: boolean;
  /** Wave A2 — report the live zoom tier to the shell HUD. */
  onZoomTierChange?: (tier: MapZoomTier) => void;
  /** Freeze rendering entirely (page hidden / map covered by the desktop
   *  panels-as-overlays stage — Wave V4). frameloop drops to 'never'; the
   *  retained framebuffer is the only cost. */
  active?: boolean;
  /** Wave V4 — active map lens. Derived by the SAME map-modes.ts functions
   *  the 2D canvas uses (parity requirement). */
  mapMode?: MapMode;
  /** Flow-map lane-volume layer (GAME_DESIGN_REVIEW_2026-09 §2 row 3):
   *  laneKey → { v: 0..1, n: dispatches }. Lanes with an entry render amber,
   *  brighter with volume, with a larger traffic marker. The count itself is
   *  listed in text by the MapCommandCenter legend (parity with the 2D
   *  canvas's inline labels). */
  laneVolumes?: Record<string, { v: number; n: number }> | null;
  /** 2026-09-12 (browser-crash investigation): the WebGL context was lost
   *  while the map was mounted — driver reset, GPU-process crash, or
   *  Chrome evicting the oldest of too many contexts. The shell persists the
   *  2D preference and swaps renderers. NOT fired for the loss React Three
   *  Fiber itself forces on unmount (the listener is removed first). */
  onContextLost?: () => void;
  /** Graphics review 2026-09-12 item 5 — controlled Lanes/Ships/World
   *  visibility (the shell's phone icon strip owns the switches; this
   *  renderer's own column shows from md up). Absent = private state. */
  layers?: MapLayerVisibility;
  onToggleLayer?: (key: MapLayerKey) => void;
  /** Ship traffic layer — other corporations' anonymised contacts + NPC
   *  backdrop from /api/space-tycoon/traffic (shell-polled). Empty when the
   *  layer is off or the feed is unavailable (anonymous game). */
  contacts?: TrafficContact[];
  /** Feed time the contacts' progress/ETA refer to (extrapolated per frame). */
  contactsAsOfMs?: number;
  /** Flight mode (part a): the shell asks the camera to fly. `local` flies
   *  into a body's local scene, `system` flies out of the current one,
   *  `frame` re-frames the current selection. `token` is a nonce so the
   *  same request can be re-issued. */
  cameraRequest?: { kind: 'local' | 'system' | 'frame'; bodyId?: string | null; token: number } | null;
  /** The local scene the camera is in (null = system view) — reported
   *  whenever the camera crosses a local sphere, so the shell can draw the
   *  breadcrumb and the first-entry hint. */
  onLocalBodyChange?: (bodyId: string | null) => void;
}

// ── Flight mode (part a): fly-to rig + local-sphere tracker ─────────────────
// The flight is a camera-pose tween (lib/game/map-flight.ts) that tracks the
// target body's LIVE position every frame (bodies orbit in real time), so a
// 3 s flight to Mars still lands on Mars. OrbitControls is disabled for the
// duration; any pointer/wheel/key input skips to the end. Under reduced
// motion flyDurationMs() is 0 and the rig applies the end pose at once.

interface Flight {
  from: CameraPose;
  /** Location id whose live anchor is the destination. */
  targetLocId: string;
  /** Unit direction from the target to the camera at the end. */
  dir: THREE.Vector3;
  distance: number;
  start: number;
  duration: number;
}
type FlightRef = React.MutableRefObject<Flight | null>;

function flightEndPose(flight: Flight, positions: ScenePositions): CameraPose | null {
  const a = positions.anchors[flight.targetLocId];
  if (!a) return null;
  return {
    target: [a.pos[0], a.pos[1], a.pos[2]],
    pos: [a.pos[0] + flight.dir.x * flight.distance, a.pos[1] + flight.dir.y * flight.distance, a.pos[2] + flight.dir.z * flight.distance],
  };
}

function applyPose(pose: CameraPose, cam: THREE.Camera, controls: OrbitControlsImpl) {
  controls.target.set(pose.target[0], pose.target[1], pose.target[2]);
  cam.position.set(pose.pos[0], pose.pos[1], pose.pos[2]);
  controls.update();
}

function FlightRig({ flightRef, controlsRef, posRef }: { flightRef: FlightRef; controlsRef: ControlsRef; posRef: PositionsRef }) {
  useFrame(({ camera }) => {
    const flight = flightRef.current;
    const controls = controlsRef.current;
    if (!flight || !controls) return;
    const end = flightEndPose(flight, posRef.current);
    if (!end) { flightRef.current = null; controls.enabled = true; return; }
    const t = flyProgress(performance.now() - flight.start, flight.duration);
    applyPose(interpolatePose(flight.from, end, t), camera, controls);
    if (t >= 1) {
      flightRef.current = null;
      controls.enabled = true;
    }
  });
  return null;
}

/** Per frame: which local sphere (if any) the camera is inside, with the
 *  enter/exit hysteresis from map-flight.ts. Only a real transition touches
 *  React state. */
function LocalSphereTracker({ posRef, localRef, onChange }: { posRef: PositionsRef; localRef: React.MutableRefObject<string | null>; onChange: (id: string | null) => void }) {
  useFrame(({ camera }) => {
    const cands = localCandidatesFrom(posRef.current, [camera.position.x, camera.position.y, camera.position.z]);
    const next = nextLocalBody(localRef.current, cands);
    if (next !== localRef.current) {
      localRef.current = next;
      onChange(next);
    }
  });
  return null;
}

// ── Graphics review 2026-09-12 item 9 — framing ─────────────────────────────
// New games open on the Earth cluster: the camera sits HOME_DISTANCE scene
// units from Earth, above the ecliptic, on the sunward side but 60° off the
// Earth→Sun axis so the Sun stays out of frame while Earth shows a gibbous
// lit face. Earth then reads ~40 px across at 1366×900 (was ~6 px at the old
// system-overview default) and the camera is inside the 'detail' zoom tier,
// so a first-hour player sees LEO / GEO / the Moon labelled. `R`/Home and
// the reset button re-frame the LIVE Earth position (bodies orbit in real
// time, so a saved camera pose would drift into empty space).
const HOME_LOCATION_ID = 'earth_surface';
const HOME_DISTANCE = 26;
/** The intro dolly starts here and glides out to HOME_DISTANCE. */
const INTRO_START_DISTANCE = 9;
const INTRO_DURATION_MS = 2200;
const MAP_INTRO_KEY = 'tycoon-map-intro-seen';

/** Camera offset direction from Earth for the home frame. Mostly above
 *  the ecliptic (the Sun is only 12.8 units from Earth, so from 26 units out
 *  it can only leave the frame vertically — a high vantage puts it below
 *  the bottom edge), tilted a little sideways for depth and a little
 *  sunward so Earth shows a lit gibbous face. */
function homeDirection(earthPos: readonly number[]): THREE.Vector3 {
  const toSun = new THREE.Vector3(-earthPos[0], 0, -earthPos[2]);
  if (toSun.lengthSq() < 1e-6) toSun.set(1, 0, 0);
  toSun.normalize();
  const side = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), toSun).normalize();
  return new THREE.Vector3()
    .addScaledVector(side, 0.35)
    .addScaledVector(toSun, 0.25)
    .add(new THREE.Vector3(0, 0.85, 0))
    .normalize();
}

// Wave V4 feature flag — flip false if the bloom pass ever busts the perf
// budget on min-spec desktops (spec: "feature-flag/off if perf budget
// exceeded"). The pass itself is a lazy chunk (SolarMapBloom.tsx) that only
// downloads when every gate passes, so mobile never fetches it.
const BLOOM_FEATURE_ENABLED = true;
const MAP_FX_KEY = 'tycoon-map-fx'; // '1' | '0' — user quality toggle

const SolarMapBloom = lazy(() => import('./SolarMapBloom'));

// ── Wave V4: nebula skybox (V6 asset, previously unused) ────────────────────
// Equirect background at deliberately low intensity — the NASA body textures
// stay the visual focus (spec's brightness bound). Loads non-suspending; the
// existing CSS gradient remains the fallback until (or if never) loaded.

function NebulaSkybox() {
  const scene = useThree(s => s.scene);
  const tex = useSafeTexture(SKYBOX_ASSETS.nebulaEquirect);
  useEffect(() => {
    if (!tex) return;
    tex.mapping = THREE.EquirectangularReflectionMapping;
    const prevBg = scene.background;
    const prevIntensity = scene.backgroundIntensity;
    scene.background = tex;
    // 0.18 → 0.14 with the item-8 tone pass (ACES + exposure 1.1 would
    // otherwise lift the nebula into the mid-tones; the review asked for
    // deeper blacks, not a brighter backdrop).
    scene.backgroundIntensity = 0.14;
    return () => {
      scene.background = prevBg;
      scene.backgroundIntensity = prevIntensity;
    };
  }, [tex, scene]);
  return null;
}

// ── Framing rig (item 9) ─────────────────────────────────────────────────────

type ControlsRef = React.MutableRefObject<OrbitControlsImpl | null>;

/** Frames the home view (Earth cluster) once, after OrbitControls has
 *  mounted — the Canvas `camera` prop is only a pre-frame fallback. */
function HomeFramer({ frameHome }: { frameHome: () => void }) {
  const framed = useRef(false);
  useEffect(() => {
    if (framed.current) return;
    framed.current = true;
    frameHome();
  }, [frameHome]);
  return null;
}

/** First-open dolly-out: from INTRO_START_DISTANCE to HOME_DISTANCE over
 *  INTRO_DURATION_MS with an ease-out, tracking Earth's live position.
 *  OrbitControls is disabled for the duration (≤2.2 s — the review's 2.5 s
 *  input-block ceiling) and any pointer/key/Skip ends it early. Never
 *  rendered under reduced motion (the shell decides via matchMedia at
 *  mount) or after the first viewing (localStorage MAP_INTRO_KEY). */
function IntroDolly({ controlsRef, posRef, onDone }: { controlsRef: ControlsRef; posRef: PositionsRef; onDone: () => void }) {
  const startRef = useRef<number | null>(null);
  const dirRef = useRef<THREE.Vector3 | null>(null);
  const target = useMemo(() => new THREE.Vector3(), []);
  useEffect(() => () => { const c = controlsRef.current; if (c) c.enabled = true; }, [controlsRef]);
  useFrame(({ camera }) => {
    const controls = controlsRef.current;
    const anchor = posRef.current.anchors[HOME_LOCATION_ID];
    if (!controls || !anchor) return;
    if (startRef.current === null) {
      startRef.current = performance.now();
      dirRef.current = homeDirection(anchor.pos);
      controls.enabled = false;
    }
    const t = Math.min(1, (performance.now() - startRef.current) / INTRO_DURATION_MS);
    const eased = 1 - Math.pow(1 - t, 3);
    const d = INTRO_START_DISTANCE + (HOME_DISTANCE - INTRO_START_DISTANCE) * eased;
    target.set(anchor.pos[0], anchor.pos[1], anchor.pos[2]);
    controls.target.copy(target);
    camera.position.copy(target).addScaledVector(dirRef.current!, d);
    controls.update();
    if (t >= 1) {
      controls.enabled = true;
      onDone();
    }
  });
  return null;
}

/** Dev-only measurement hook for the graphics probes: Earth's on-screen
 *  radius, camera distances and the zoom tier. Stripped from production
 *  builds by the NODE_ENV guard. */
function MapProbe({ posRef, localRef, flightRef }: { posRef: PositionsRef; localRef: React.MutableRefObject<string | null>; flightRef: FlightRef }) {
  const camera = useThree(s => s.camera);
  const size = useThree(s => s.size);
  useEffect(() => {
    if (process.env.NODE_ENV === 'production') return;
    const w = window as unknown as { __solarMapProbe?: () => unknown };
    w.__solarMapProbe = () => {
      const a = posRef.current.anchors[HOME_LOCATION_ID];
      const earth = new THREE.Vector3(a.pos[0], a.pos[1], a.pos[2]);
      const d = camera.position.distanceTo(earth);
      const p11 = (camera as THREE.PerspectiveCamera).projectionMatrix.elements[5];
      const radiusPx = (a.r / d) * p11 * size.height / 2;
      return {
        earthRadiusPx: Math.round(radiusPx * 10) / 10,
        earthDiameterPx: Math.round(radiusPx * 20) / 10,
        cameraToEarth: Math.round(d * 10) / 10,
        cameraToSun: Math.round(camera.position.length() * 10) / 10,
        tier: zoomTierFromCameraDistance(camera.position.length()),
        stage: { w: size.width, h: size.height },
        // Flight mode (part a)
        localBody: localRef.current,
        flying: !!flightRef.current,
      };
    };
    return () => { delete w.__solarMapProbe; };
  }, [camera, size, posRef, localRef, flightRef]);
  return null;
}

// ── Scene rig — owns scene time and the per-frame position table ─────────────

function SceneClock({ posRef, timeRef, reduced }: { posRef: PositionsRef; timeRef: React.MutableRefObject<number>; reduced: boolean }) {
  useFrame((_, delta) => {
    if (!reduced) timeRef.current += Math.min(delta, 0.1);
    posRef.current = computeScenePositions(timeRef.current);
  });
  return null;
}

// ── Sun ──────────────────────────────────────────────────────────────────────

function Sun({ reduced }: { reduced: boolean }) {
  const tex = useSafeTexture('/textures/sun.webp');
  const meshRef = useRef<THREE.Mesh>(null);
  const glowTex = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = c.height = 256;
    const ctx = c.getContext('2d')!;
    // Item 8: a softer, longer corona — lower peak alpha, gentler falloff,
    // drawn at 7× the disc (was a hot 0.9-alpha core at 6×).
    const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
    g.addColorStop(0, 'rgba(254,240,138,0.62)');
    g.addColorStop(0.22, 'rgba(251,191,36,0.3)');
    g.addColorStop(0.5, 'rgba(245,158,11,0.1)');
    g.addColorStop(0.8, 'rgba(245,158,11,0.025)');
    g.addColorStop(1, 'rgba(245,158,11,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 256, 256);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, []);
  useEffect(() => () => glowTex.dispose(), [glowTex]);
  const glowRef = useRef<THREE.Sprite>(null);
  useFrame(({ camera }, delta) => {
    if (!reduced && meshRef.current) meshRef.current.rotation.y += delta * 0.02;
    // The corona is sized for the system overview (camera ≥ 60 units out).
    // From the Earth-cluster home frame the camera is ~22 units from the
    // Sun and a full-size corona would wash out a third of the stage, so
    // it shrinks with proximity (7× the disc far out, 2.5× up close).
    if (glowRef.current) {
      const d = camera.position.length();
      const k = Math.min(7, Math.max(2.5, 7 * (d / 60)));
      glowRef.current.scale.set(SUN_VISUAL_RADIUS * k, SUN_VISUAL_RADIUS * k, 1);
    }
  });
  return (
    <group>
      <mesh ref={meshRef}>
        <sphereGeometry args={[SUN_VISUAL_RADIUS, 48, 48]} />
        <meshBasicMaterial map={tex ?? undefined} color={tex ? '#ffffff' : '#fde047'} toneMapped={false} />
      </mesh>
      <sprite ref={glowRef} scale={[SUN_VISUAL_RADIUS * 7, SUN_VISUAL_RADIUS * 7, 1]} renderOrder={-1}>
        <spriteMaterial map={glowTex} transparent depthWrite={false} blending={THREE.AdditiveBlending} />
      </sprite>
      {/* Item 8: physically plausible falloff. three's lights are physical
          (candela, inverse-square) since r155; decay 2 with intensity 170
          gives Earth (12.8 units) irradiance ≈ 1.0, Mercury ≈ 3.6 (ACES
          rolls it off), Jupiter ≈ 0.24, Pluto ≈ 0.08 — inner planets
          bright, the outer system dim, exactly the sun-lit gradient the
          old decay-0 light flattened. Ambient in the Canvas dropped 0.38 →
          0.16 so the dark limbs and the belt read as space, not fog. */}
      <pointLight position={[0, 0, 0]} intensity={170} distance={0} decay={2} color="#fff7e0" />
    </group>
  );
}

// ── Orbit guide rings ────────────────────────────────────────────────────────

function OrbitRing({ aAU, inclinationDeg }: { aAU: number; inclinationDeg: number }) {
  const geo = useMemo(() => {
    const R = sceneOrbitRadius(aAU);
    const incl = (inclinationDeg * Math.PI) / 180;
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= 128; i++) {
      const th = (i / 128) * Math.PI * 2;
      pts.push(new THREE.Vector3(R * Math.cos(th), R * Math.sin(th) * Math.sin(incl), R * Math.sin(th) * Math.cos(incl)));
    }
    return new THREE.BufferGeometry().setFromPoints(pts);
  }, [aAU, inclinationDeg]);
  const line = useMemo(
    () => new THREE.Line(geo, new THREE.LineBasicMaterial({ color: '#64748b', transparent: true, opacity: 0.16 })),
    [geo],
  );
  useEffect(() => () => { geo.dispose(); (line.material as THREE.Material).dispose(); }, [geo, line]);
  return <primitive object={line} />;
}

// ── Celestial body ───────────────────────────────────────────────────────────

interface BodyMeshProps {
  def: OrbitalBody;
  posRef: PositionsRef;
  reduced: boolean;
  unlocked: boolean;
  badges: BadgeCounts;
  standing: ZoneStandingKind;
  mode: ModeVisual | null;
  tierRef: TierRef;
  alwaysLabels: boolean;
  onPick: (locId: string, anchor?: { x: number; y: number }) => void;
}

function BodyMesh({ def, posRef, reduced, unlocked, badges, standing, mode, tierRef, alwaysLabels, onPick }: BodyMeshProps) {
  const groupRef = useRef<THREE.Group>(null);
  const r = sceneBodyRadius(def.radiusKm);

  useFrame(() => {
    const p = posRef.current.bodies[def.id];
    if (p && groupRef.current) groupRef.current.position.set(p[0], p[1], p[2]);
  });

  const handleClick = useCallback((e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (e.delta > 6) return; // was a drag, not a click
    if (def.locationId) onPick(def.locationId, { x: e.clientX, y: e.clientY });
  }, [def.locationId, onPick]);

  const setCursor = useCallback((on: boolean) => (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    document.body.style.cursor = on && def.locationId ? 'pointer' : 'auto';
  }, [def.locationId]);

  return (
    <group ref={groupRef}>
      {/* The sphere, clouds, night lights, atmosphere shell and ring are the
          shared BodySphere (map3d/shared.tsx) — the local scene draws the
          identical body, so the swap into a local scene never changes what
          the planet looks like. */}
      <BodySphere
        r={r}
        texture={def.texture}
        cloudsTexture={def.cloudsTexture}
        nightTexture={def.nightTexture}
        color={def.color}
        locationId={def.locationId}
        unlocked={unlocked}
        reduced={reduced}
        ring={def.ring}
        onClick={handleClick}
        onPointerOver={setCursor(true)}
        onPointerOut={setCursor(false)}
      />
      {def.locationId && <LabelSprite name={def.name} unlocked={unlocked} badges={badges} standing={standing} mode={mode} tierRef={tierRef} locationId={def.locationId} alwaysLabels={alwaysLabels} yOffset={-(r + 0.45)} priority={labelPriority(def.locationId, 'body', badges)} />}
    </group>
  );
}

// ── Orbital pips (LEO / GEO / belt ops / deep-space relay …) ────────────────

function PipMesh({ pip, posRef, unlocked, badges, standing, mode, tierRef, alwaysLabels, onPick }: {
  pip: OrbitalPip; posRef: PositionsRef; unlocked: boolean; badges: BadgeCounts; standing: ZoneStandingKind;
  mode: ModeVisual | null; tierRef: TierRef; alwaysLabels: boolean;
  onPick: (locId: string, anchor?: { x: number; y: number }) => void;
}) {
  const groupRef = useRef<THREE.Group>(null);
  useFrame(() => {
    const a = posRef.current.anchors[pip.locationId];
    if (a && groupRef.current) groupRef.current.position.set(a.pos[0], a.pos[1], a.pos[2]);
  });
  const handleClick = useCallback((e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (e.delta > 6) return;
    onPick(pip.locationId, { x: e.clientX, y: e.clientY });
  }, [pip.locationId, onPick]);
  const setCursor = useCallback((on: boolean) => (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    document.body.style.cursor = on ? 'pointer' : 'auto';
  }, []);
  const raycast = useGatedRaycast(MESH_RAYCAST);
  return (
    <group ref={groupRef}>
      <mesh onClick={handleClick} onPointerOver={setCursor(true)} onPointerOut={setCursor(false)} raycast={raycast}>
        <octahedronGeometry args={[0.16, 0]} />
        <meshBasicMaterial color={unlocked ? pip.color : '#475569'} />
      </mesh>
      {/* Generous invisible hit target for touch/pointer. Radius 0.3, NOT
          bigger: the tightest pip pair (LEO at 1.5× and GEO at 2.0× Earth's
          0.81 visual radius — orbital-elements.ts sceneBodyRadius) can
          close to ~0.4 scene units, so any radius below that guarantees
          one pip's sphere never swallows its neighbour's centre — the old
          0.5 sphere could steal clicks aimed dead-centre at the adjacent
          pip. (orbital-elements.test.ts pins 0.5 × Earth's radius > 0.3.) */}
      <mesh onClick={handleClick} visible={false} raycast={raycast}>
        <sphereGeometry args={[0.3, 8, 8]} />
        <meshBasicMaterial />
      </mesh>
      <LabelSprite name={pip.label} unlocked={unlocked} badges={badges} standing={standing} mode={mode} tierRef={tierRef} locationId={pip.locationId} alwaysLabels={alwaysLabels} yOffset={-0.5} priority={labelPriority(pip.locationId, 'pip', badges)} />
    </group>
  );
}

// ── Asteroid belt (single instanced draw call) ───────────────────────────────

function BeltRocks({ reduced }: { reduced: boolean }) {
  const COUNT = 550;
  const instRef = useRef<THREE.InstancedMesh>(null);
  const groupRef = useRef<THREE.Group>(null);
  useLayoutEffect(() => {
    const mesh = instRef.current;
    if (!mesh) return;
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    // mulberry32-style deterministic scatter
    let s = 20260813;
    const rand = () => {
      s |= 0; s = (s + 0x6d2b79f5) | 0;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    for (let i = 0; i < COUNT; i++) {
      const th = rand() * Math.PI * 2;
      const R = BELT_SCENE_RADIUS + (rand() - 0.5) * 3.4;
      const y = (rand() - 0.5) * 1.1;
      e.set(rand() * Math.PI, rand() * Math.PI, rand() * Math.PI);
      q.setFromEuler(e);
      const sc = 0.035 + rand() * 0.1;
      m.compose(new THREE.Vector3(R * Math.cos(th), y, R * Math.sin(th)), q, new THREE.Vector3(sc, sc, sc));
      mesh.setMatrixAt(i, m);
    }
    mesh.instanceMatrix.needsUpdate = true;
  }, []);
  useFrame((_, delta) => {
    if (!reduced && groupRef.current) groupRef.current.rotation.y += delta * 0.0042;
  });
  return (
    <group ref={groupRef}>
      <instancedMesh ref={instRef} args={[undefined, undefined, COUNT]}>
        <icosahedronGeometry args={[1, 0]} />
        <meshStandardMaterial color="#78716c" roughness={1} />
      </instancedMesh>
    </group>
  );
}

// ── Shipping lanes ───────────────────────────────────────────────────────────

function LaneLines({ posRef, state, reduced, laneVolumes }: { posRef: PositionsRef; state: GameState; reduced: boolean; laneVolumes?: Record<string, { v: number; n: number }> | null }) {
  // One 2-point line per lane + one traffic pulse per active lane.
  const pulsesRef = useRef<(THREE.Mesh | null)[]>([]);
  const unlockedSet = useMemo(() => new Set(state.unlockedLocations), [state.unlockedLocations]);
  const lanes = useMemo(
    () => LANES.map(lane => ({ lane, active: unlockedSet.has(lane.from) && unlockedSet.has(lane.to) })),
    [unlockedSet],
  );
  const laneObjs = useMemo(() =>
    lanes.map(({ active }) => {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6), 3));
      const mat = new THREE.LineBasicMaterial({
        color: active ? '#22d3ee' : '#64748b',
        transparent: true,
        opacity: active ? 0.18 : 0.06,
      });
      return new THREE.Line(geo, mat);
    }),
  [lanes]);
  useEffect(() => () => { laneObjs.forEach(l => { l.geometry.dispose(); (l.material as THREE.Material).dispose(); }); }, [laneObjs]);

  useFrame(({ clock }) => {
    const anchors = posRef.current.anchors;
    lanes.forEach(({ lane, active }, i) => {
      const line = laneObjs[i];
      const from = anchors[lane.from];
      const to = anchors[lane.to];
      if (!from || !to) { line.visible = false; return; }
      line.visible = true;
      const attr = line.geometry.attributes.position as THREE.BufferAttribute;
      attr.setXYZ(0, from.pos[0], from.pos[1], from.pos[2]);
      attr.setXYZ(1, to.pos[0], to.pos[1], to.pos[2]);
      attr.needsUpdate = true;
      // Flow-map volume layer: amber + brighter + bigger marker by volume.
      const vol = laneVolumes ? laneVolumes[laneKey(lane.from, lane.to)] : undefined;
      const mat = line.material as THREE.LineBasicMaterial;
      mat.opacity = vol ? 0.3 + 0.6 * vol.v : active ? 0.18 : 0.06;
      mat.color.set(vol ? '#fbbf24' : active ? '#22d3ee' : '#64748b');
      // pulse dots — one per active lane (3 in the 2D map; 1 keeps draw calls low)
      const pulse = pulsesRef.current[i];
      if (pulse) {
        if (!active && !vol) { pulse.visible = false; return; }
        pulse.visible = true;
        pulse.scale.setScalar(vol ? 1 + 2.5 * vol.v : 1);
        const seed = (lane.from.charCodeAt(0) + lane.to.charCodeAt(0)) * 0.13;
        const t = reduced ? 0.5 : ((clock.elapsedTime * 0.25 + seed) % 1 + 1) % 1;
        pulse.position.set(
          from.pos[0] + (to.pos[0] - from.pos[0]) * t,
          from.pos[1] + (to.pos[1] - from.pos[1]) * t,
          from.pos[2] + (to.pos[2] - from.pos[2]) * t,
        );
        const fade = Math.sin(t * Math.PI);
        (pulse.material as THREE.MeshBasicMaterial).opacity = 0.55 * fade;
      }
    });
  });

  return (
    <group>
      {laneObjs.map((obj, i) => (
        <primitive key={lanes[i].lane.id} object={obj} />
      ))}
      {lanes.map(({ lane }, i) => (
        <mesh key={`pulse-${lane.id}`} ref={el => { pulsesRef.current[i] = el; }} visible={false}>
          <sphereGeometry args={[0.09, 6, 6]} />
          <meshBasicMaterial color="#22d3ee" transparent opacity={0.5} depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
}

// ── Ships ────────────────────────────────────────────────────────────────────

type ShipInstanceLike = NonNullable<GameState['ships']>[number];
const NO_CONTACTS: TrafficContact[] = [];

// Fixed ETA-label canvas geometry — one size for every transit ship so the
// texture is allocated once per ship and only repainted (1 Hz), never resized.
const ETA_CANVAS_W = 200;
const ETA_CANVAS_H = 44;

// Wave V7 — engine trail: fixed-count sprite ribbon trailing every in-transit
// ship (EFFECT_ASSETS.engineTrail, previously unused in the scene — the
// audit's headline orphaned-asset finding). Sampled directly from the same
// bezier the marker uses (no per-frame history buffer — bounded allocation,
// fixed lifetime by construction).
const ENGINE_TRAIL_COUNT = 6;
const ENGINE_TRAIL_SPACING = 0.014;

/** In-transit ship: curved arc + oriented marker, interpolated from the REAL
 *  departure/arrival timestamps — functional motion, identical to the 2D map.
 *  W9: an arrival-countdown sprite follows the marker (screen-constant size,
 *  repainted once per second outside the frame loop). V7: an engine-trail
 *  sprite ribbon (off under reduced motion — purely decorative). */
function TransitShip({ ship, posRef, reduced }: { ship: ShipInstanceLike; posRef: PositionsRef; reduced: boolean }) {
  const markerRef = useRef<THREE.Mesh>(null);
  const etaSpriteRef = useRef<THREE.Sprite>(null);
  const trailRefs = useRef<(THREE.Sprite | null)[]>(Array(ENGINE_TRAIL_COUNT).fill(null));
  const engineTrailTex = useSafeTexture(EFFECT_ASSETS.engineTrail);
  const lineObj = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(33 * 3), 3));
    return new THREE.Line(geo, new THREE.LineBasicMaterial({ color: '#22d3ee', transparent: true, opacity: 0.3 }));
  }, []);
  useEffect(() => () => { lineObj.geometry.dispose(); (lineObj.material as THREE.Material).dispose(); }, [lineObj]);
  const def = SHIP_MAP.get(ship.definitionId);
  const color = def ? SHIP_COLOR[def.role] || '#22d3ee' : '#22d3ee';

  // ETA countdown texture — persistent canvas repainted at 1 Hz (no per-frame
  // allocation; the frame loop only moves the sprite).
  const etaCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const etaTex = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = ETA_CANVAS_W;
    c.height = ETA_CANVAS_H;
    etaCanvasRef.current = c;
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, []);
  useEffect(() => () => etaTex.dispose(), [etaTex]);
  const [etaText, setEtaText] = useState('');
  const arrivalAtMs = ship.route?.arrivalAtMs;
  useEffect(() => {
    if (!arrivalAtMs) { setEtaText(''); return; }
    const compute = () => setEtaText(`ETA ${formatCountdown(Math.max(0, (arrivalAtMs - Date.now()) / 1000))}`);
    compute();
    const iv = setInterval(compute, 1000);
    return () => clearInterval(iv);
  }, [arrivalAtMs]);
  useEffect(() => {
    const c = etaCanvasRef.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, c.width, c.height);
    if (etaText) {
      ctx.font = `600 22px ${labelFontFamily()}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = 'rgba(0,0,0,0.9)';
      ctx.shadowBlur = 6;
      ctx.fillStyle = '#67e8f9';
      ctx.fillText(etaText, c.width / 2, c.height / 2);
    }
    etaTex.needsUpdate = true;
  }, [etaText, etaTex]);

  useFrame(() => {
    const route = ship.route;
    if (!route) return;
    const anchors = posRef.current.anchors;
    const from = anchors[route.from];
    const to = anchors[route.to];
    const marker = markerRef.current;
    const etaLabel = etaSpriteRef.current;
    if (!from || !to || !marker) {
      if (marker) marker.visible = false;
      if (etaLabel) etaLabel.visible = false;
      lineObj.visible = false;
      return;
    }
    marker.visible = true;
    lineObj.visible = true;
    const f = new THREE.Vector3(...from.pos);
    const t3 = new THREE.Vector3(...to.pos);
    const mid = f.clone().add(t3).multiplyScalar(0.5);
    const chord = t3.clone().sub(f);
    const len = chord.length();
    // lift the control point up + sideways so arcs don't hug the ecliptic
    const perp = new THREE.Vector3().crossVectors(chord, new THREE.Vector3(0, 1, 0)).normalize().multiplyScalar(Math.min(2.2, len * 0.12));
    const ctrl = mid.add(perp).add(new THREE.Vector3(0, Math.min(2.5, 0.8 + len * 0.08), 0));
    const total = Math.max(1, route.arrivalAtMs - route.departedAtMs);
    const prog = Math.max(0, Math.min(1, (Date.now() - route.departedAtMs) / total));
    // update the trail (departure → current position)
    const attr = lineObj.geometry.attributes.position as THREE.BufferAttribute;
    const tmp = new THREE.Vector3();
    for (let i = 0; i <= 32; i++) {
      const u = (i / 32) * prog;
      tmp.set(0, 0, 0)
        .addScaledVector(f, (1 - u) * (1 - u))
        .addScaledVector(ctrl, 2 * (1 - u) * u)
        .addScaledVector(t3, u * u);
      attr.setXYZ(i, tmp.x, tmp.y, tmp.z);
    }
    attr.needsUpdate = true;
    lineObj.geometry.computeBoundingSphere();
    // marker position + heading
    const pos = new THREE.Vector3()
      .addScaledVector(f, (1 - prog) * (1 - prog))
      .addScaledVector(ctrl, 2 * (1 - prog) * prog)
      .addScaledVector(t3, prog * prog);
    const tangent = new THREE.Vector3()
      .addScaledVector(ctrl.clone().sub(f), 2 * (1 - prog))
      .addScaledVector(t3.clone().sub(ctrl), 2 * prog)
      .normalize();
    marker.position.copy(pos);
    marker.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), tangent);
    if (etaLabel) {
      etaLabel.visible = true;
      etaLabel.position.set(pos.x, pos.y + 0.55, pos.z);
    }
    // V7: engine trail — 6 sprites sampled behind the marker along the same
    // bezier, fading in opacity/scale. Off under reduced motion.
    for (let k = 0; k < ENGINE_TRAIL_COUNT; k++) {
      const spr = trailRefs.current[k];
      if (!spr) continue;
      if (reduced) { spr.visible = false; continue; }
      const u = prog - (k + 1) * ENGINE_TRAIL_SPACING;
      if (u <= 0) { spr.visible = false; continue; }
      spr.visible = true;
      const tp = new THREE.Vector3()
        .addScaledVector(f, (1 - u) * (1 - u))
        .addScaledVector(ctrl, 2 * (1 - u) * u)
        .addScaledVector(t3, u * u);
      spr.position.copy(tp);
      const fade = 1 - (k + 1) / (ENGINE_TRAIL_COUNT + 1);
      (spr.material as THREE.SpriteMaterial).opacity = fade * 0.55;
      const s = 0.16 * fade + 0.05;
      spr.scale.set(s, s, 1);
    }
  });

  return (
    <group>
      <primitive object={lineObj} />
      <mesh ref={markerRef}>
        <coneGeometry args={[0.12, 0.34, 8]} />
        <meshBasicMaterial color={color} />
      </mesh>
      <sprite ref={etaSpriteRef} visible={false} scale={[0.05 * (ETA_CANVAS_W / ETA_CANVAS_H), 0.05, 1]} renderOrder={11}>
        <spriteMaterial map={etaTex} sizeAttenuation={false} transparent depthTest={false} />
      </sprite>
      {Array.from({ length: ENGINE_TRAIL_COUNT }).map((_, k) => (
        <sprite
          key={k}
          ref={el => { trailRefs.current[k] = el; }}
          visible={false}
          renderOrder={9}
        >
          <spriteMaterial map={engineTrailTex ?? undefined} color={color} transparent depthTest={false} opacity={0} />
        </sprite>
      ))}
    </group>
  );
}

/** Stationary ship — small dot orbiting its current location (2D parity). */
function StationShip({ ship, posRef, reduced }: { ship: ShipInstanceLike; posRef: PositionsRef; reduced: boolean }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const def = SHIP_MAP.get(ship.definitionId);
  const color = def ? SHIP_COLOR[def.role] || '#22d3ee' : '#22d3ee';
  const seed = ship.instanceId.charCodeAt(0) * 0.1 + (ship.instanceId.charCodeAt(1) || 0) * 0.05;
  useFrame(({ clock }) => {
    const a = posRef.current.anchors[ship.currentLocation];
    const mesh = meshRef.current;
    if (!a || !mesh) { if (mesh) mesh.visible = false; return; }
    mesh.visible = true;
    const angle = reduced ? seed : clock.elapsedTime * 0.5 + seed;
    const orbitR = a.r + 0.32;
    mesh.position.set(a.pos[0] + Math.cos(angle) * orbitR, a.pos[1] + 0.12, a.pos[2] + Math.sin(angle) * orbitR);
  });
  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[0.07, 8, 8]} />
      <meshBasicMaterial color={color} />
    </mesh>
  );
}

// ── Ship traffic: other corporations' contacts (instanced) ──────────────────
// Three instanced draws, never per-contact meshes: anonymised player hulls
// (dim octahedra), NPC backdrop hulls (flattened faction-tinted slabs — a
// different SHAPE, so NPC vs player never rests on colour alone) and a
// corp-coloured ring under every REVEALED contact (again shape, not just
// colour). Positions come from placeContacts() every frame — the same
// function the 2D canvas calls — extrapolated from the feed's asOf. Capacity
// is allocated in steps and `count` trimmed per frame so a feed that grows
// by one contact does not rebuild the buffers.

export interface ContactHover { contact: TrafficContact; x: number; y: number }

const CONTACT_CAPACITY_STEP = 256;
const CONTACT_ANON_COLOR = new THREE.Color(ANON_CONTACT_COLOR);
const CONTACT_REVEALED_COLOR = new THREE.Color('#cbd5e1');

function contactCapacity(n: number): number {
  return Math.max(CONTACT_CAPACITY_STEP, Math.ceil(Math.min(n, TRAFFIC_RENDER_CAP) / CONTACT_CAPACITY_STEP) * CONTACT_CAPACITY_STEP);
}

function ensureInstanceColor(mesh: THREE.InstancedMesh, capacity: number): THREE.InstancedBufferAttribute {
  if (!mesh.instanceColor || mesh.instanceColor.count < capacity) {
    mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(capacity * 3), 3);
  }
  return mesh.instanceColor;
}

function ContactsLayer({ contacts, asOfMs, posRef, reduced, onHover }: {
  contacts: TrafficContact[];
  asOfMs: number;
  posRef: PositionsRef;
  reduced: boolean;
  onHover: (h: ContactHover | null) => void;
}) {
  const playersRef = useRef<THREE.InstancedMesh>(null);
  const npcRef = useRef<THREE.InstancedMesh>(null);
  const ringsRef = useRef<THREE.InstancedMesh>(null);
  const split = useMemo(() => {
    const players: TrafficContact[] = [];
    const npcs: TrafficContact[] = [];
    for (const c of contacts) {
      if (players.length + npcs.length >= TRAFFIC_RENDER_CAP) break;
      if (c.npc) npcs.push(c); else players.push(c);
    }
    const revealed = players.filter(c => !!c.intel);
    return { players, npcs, revealed };
  }, [contacts]);
  const capPlayers = contactCapacity(split.players.length);
  const capNpc = contactCapacity(split.npcs.length);
  const capRings = contactCapacity(split.revealed.length);

  // Colours change only when the contact set does — not per frame.
  useLayoutEffect(() => {
    const tmp = new THREE.Color();
    const paint = (mesh: THREE.InstancedMesh | null, list: TrafficContact[], cap: number, pick: (c: TrafficContact) => THREE.Color) => {
      if (!mesh) return;
      const attr = ensureInstanceColor(mesh, cap);
      list.forEach((c, i) => { const col = pick(c); attr.setXYZ(i, col.r, col.g, col.b); });
      attr.needsUpdate = true;
    };
    paint(playersRef.current, split.players, capPlayers, c => c.intel ? CONTACT_REVEALED_COLOR : CONTACT_ANON_COLOR);
    paint(npcRef.current, split.npcs, capNpc, c => tmp.set(c.factionHint ? FACTION_CONTACT_TINT[c.factionHint] : ANON_CONTACT_COLOR));
    paint(ringsRef.current, split.revealed, capRings, c => tmp.set(corpRingColor(c.intel!.corpId)));
  }, [split, capPlayers, capNpc, capRings]);

  const m4 = useMemo(() => new THREE.Matrix4(), []);
  const q = useMemo(() => new THREE.Quaternion(), []);
  const up = useMemo(() => new THREE.Vector3(0, 1, 0), []);
  const dir = useMemo(() => new THREE.Vector3(), []);
  const one = useMemo(() => new THREE.Vector3(1, 1, 1), []);
  const posV = useMemo(() => new THREE.Vector3(), []);
  useFrame(() => {
    const anchors = posRef.current.anchors;
    const now = Date.now();
    const opts = { asOfMs, plane: 'xz' as const, staticOrbit: reduced };
    const fill = (mesh: THREE.InstancedMesh | null, list: TrafficContact[], scale: number, orient: boolean) => {
      if (!mesh) return;
      const placed = placeContacts(list, anchors, now, opts);
      let n = 0;
      for (const p of placed) {
        posV.set(p.pos[0], p.pos[1], p.pos[2]);
        if (orient && p.heading) { dir.set(p.heading[0], p.heading[1], p.heading[2]); q.setFromUnitVectors(up, dir); }
        else q.identity();
        m4.compose(posV, q, one.set(scale, scale, scale));
        mesh.setMatrixAt(n++, m4);
      }
      mesh.count = n;
      mesh.instanceMatrix.needsUpdate = true;
    };
    fill(playersRef.current, split.players, 1, true);
    fill(npcRef.current, split.npcs, 1, true);
    fill(ringsRef.current, split.revealed, 1, false);
  });

  const hoverFor = useCallback((list: TrafficContact[]) => (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    const c = typeof e.instanceId === 'number' ? list[e.instanceId] : undefined;
    if (!c) return;
    document.body.style.cursor = 'help';
    onHover({ contact: c, x: e.clientX, y: e.clientY });
  }, [onHover]);
  const leave = useCallback((e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    document.body.style.cursor = 'auto';
    onHover(null);
  }, [onHover]);
  const tapFor = useCallback((list: TrafficContact[]) => (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (e.delta > 6) return;
    const c = typeof e.instanceId === 'number' ? list[e.instanceId] : undefined;
    if (c) onHover({ contact: c, x: e.clientX, y: e.clientY });
  }, [onHover]);
  const raycast = useGatedRaycast(INSTANCED_RAYCAST);

  return (
    <group>
      <instancedMesh
        key={`players-${capPlayers}`}
        ref={playersRef}
        args={[undefined, undefined, capPlayers]}
        frustumCulled={false}
        raycast={raycast}
        onPointerOver={hoverFor(split.players)}
        onPointerOut={leave}
        onClick={tapFor(split.players)}
      >
        <octahedronGeometry args={[0.085, 0]} />
        <meshBasicMaterial transparent opacity={0.8} depthWrite={false} toneMapped={false} />
      </instancedMesh>
      <instancedMesh
        key={`npc-${capNpc}`}
        ref={npcRef}
        args={[undefined, undefined, capNpc]}
        frustumCulled={false}
        raycast={raycast}
        onPointerOver={hoverFor(split.npcs)}
        onPointerOut={leave}
        onClick={tapFor(split.npcs)}
      >
        <boxGeometry args={[0.07, 0.16, 0.07]} />
        <meshBasicMaterial transparent opacity={0.55} depthWrite={false} toneMapped={false} />
      </instancedMesh>
      <instancedMesh key={`rings-${capRings}`} ref={ringsRef} args={[undefined, undefined, capRings]} frustumCulled={false} raycast={() => null}>
        <torusGeometry args={[0.2, 0.022, 6, 24]} />
        <meshBasicMaterial transparent opacity={0.95} depthWrite={false} toneMapped={false} />
      </instancedMesh>
    </group>
  );
}

// ── Hazard rings (recent hazards <60 s, expanding + fading — 2D parity) ─────

function HazardRings({ posRef, state }: { posRef: PositionsRef; state: GameState }) {
  const [, force] = useState(0);
  const recent = (state.recentHazards || []).filter(h => Date.now() - h.occurredAtMs < 60_000);
  // prune finished rings once a second without re-rendering every frame
  useEffect(() => {
    if (recent.length === 0) return;
    const iv = setInterval(() => force(n => n + 1), 5_000);
    return () => clearInterval(iv);
  }, [recent.length]);
  return (
    <group>
      {recent.map(h => <HazardRing key={h.id} hazard={h} posRef={posRef} />)}
    </group>
  );
}

function HazardRing({ hazard, posRef }: { hazard: NonNullable<GameState['recentHazards']>[number]; posRef: PositionsRef }) {
  const groupRef = useRef<THREE.Group>(null);
  const matRef = useRef<THREE.MeshBasicMaterial>(null);
  useFrame(() => {
    const a = posRef.current.anchors[hazard.locationId];
    const g = groupRef.current;
    if (!a || !g) { if (g) g.visible = false; return; }
    const age = (Date.now() - hazard.occurredAtMs) / 60_000; // 0..1
    if (age >= 1) { g.visible = false; return; }
    g.visible = true;
    g.position.set(a.pos[0], a.pos[1], a.pos[2]);
    const s = a.r + 0.4 + age * 2.6;
    g.scale.set(s, s, s);
    if (matRef.current) matRef.current.opacity = 1 - age;
  });
  return (
    <group ref={groupRef}>
      <Billboard>
        <mesh>
          <ringGeometry args={[0.92, 1, 48]} />
          <meshBasicMaterial ref={matRef} color={hazard.destroyed ? '#ef4444' : '#fbbf24'} transparent side={THREE.DoubleSide} depthWrite={false} />
        </mesh>
      </Billboard>
    </group>
  );
}

// ── Wave V7: order-ack / completion map pings ────────────────────────────────
// Same event bus as the 2D canvas (lib/game/map-ping.ts) — only location-
// targeted pings render here (system-targeted pings belong to
// GalacticMapView). Managed as React state (not a ref-only loop like the
// ships above) because pings are rare, bursty events, not per-frame data;
// pruning runs on a slow interval, same precedent as HazardRings above.

function MapPings3D({ posRef, reduced }: { posRef: PositionsRef; reduced: boolean }) {
  const [pings, setPings] = useState<MapPingEvent[]>([]);
  useEffect(() => onMapPing(ping => {
    if (ping.target.kind !== 'location') return;
    setPings(prev => [...prev, ping]);
  }), []);
  useEffect(() => {
    if (pings.length === 0) return;
    const iv = setInterval(() => {
      const now = Date.now();
      setPings(prev => prev.filter(p => getPingVisual(p, now, reduced) !== null));
    }, 250);
    return () => clearInterval(iv);
  }, [pings.length, reduced]);
  return (
    <group>
      {pings.map(p => <MapPingRing key={p.id} ping={p} posRef={posRef} reduced={reduced} />)}
    </group>
  );
}

function MapPingRing({ ping, posRef, reduced }: { ping: MapPingEvent; posRef: PositionsRef; reduced: boolean }) {
  const groupRef = useRef<THREE.Group>(null);
  const matRef = useRef<THREE.MeshBasicMaterial>(null);
  useFrame(() => {
    const a = posRef.current.anchors[ping.target.id];
    const g = groupRef.current;
    if (!a || !g) { if (g) g.visible = false; return; }
    const visual = getPingVisual(ping, Date.now(), reduced);
    if (!visual) { g.visible = false; return; }
    g.visible = true;
    g.position.set(a.pos[0], a.pos[1], a.pos[2]);
    const s = a.r + 0.35 + visual.radiusProgress * 1.6;
    g.scale.set(s, s, s);
    if (matRef.current) matRef.current.opacity = visual.alpha;
  });
  return (
    <group ref={groupRef}>
      <Billboard>
        <mesh>
          <ringGeometry args={[0.9, 1, 40]} />
          <meshBasicMaterial ref={matRef} color={PING_COLOR[ping.kind]} transparent side={THREE.DoubleSide} depthWrite={false} />
        </mesh>
      </Billboard>
    </group>
  );
}

// ── Hazard FORECAST telegraphs (W9) — state.hazardWarnings ──────────────────
// Visually distinct from active-hazard rings: those expand outward and fade
// over 60 s; forecasts hold a constant radius and slow-pulse amber (static
// under reduced motion). Selecting the location shows the full warning text
// in MapContextPanel's existing forecast chips.

function ForecastMarkers({ posRef, state, reduced }: { posRef: PositionsRef; state: GameState; reduced: boolean }) {
  const grouped = useMemo(() => {
    const map = new Map<string, number>();
    for (const w of state.hazardWarnings || []) map.set(w.locationId, (map.get(w.locationId) || 0) + 1);
    return Array.from(map.entries());
  }, [state.hazardWarnings]);
  return (
    <group>
      {grouped.map(([locId, count]) => (
        <ForecastRing key={locId} locId={locId} count={count} posRef={posRef} reduced={reduced} />
      ))}
    </group>
  );
}

function ForecastRing({ locId, count, posRef, reduced }: { locId: string; count: number; posRef: PositionsRef; reduced: boolean }) {
  const groupRef = useRef<THREE.Group>(null);
  const matRef = useRef<THREE.MeshBasicMaterial>(null);
  const glyphRef = useRef<THREE.Sprite>(null);
  const glyph = useMemo(() => makeGlyphTexture(count > 1 ? `${MAP_GLYPHS.warning}×${count}` : MAP_GLYPHS.warning, '#fbbf24'), [count]);
  useEffect(() => () => glyph.tex.dispose(), [glyph]);
  useFrame(({ clock }) => {
    const a = posRef.current.anchors[locId];
    const g = groupRef.current;
    const gs = glyphRef.current;
    if (!a || !g) {
      if (g) g.visible = false;
      if (gs) gs.visible = false;
      return;
    }
    g.visible = true;
    g.position.set(a.pos[0], a.pos[1], a.pos[2]);
    const wave = reduced ? 0.5 : Math.sin(clock.elapsedTime * 1.8) * 0.5 + 0.5;
    const s = (a.r + 0.55) * (reduced ? 1 : 1 + (wave - 0.5) * 0.14);
    g.scale.set(s, s, s);
    if (matRef.current) matRef.current.opacity = 0.3 + wave * 0.3;
    if (gs) {
      gs.visible = true;
      gs.position.set(a.pos[0], a.pos[1] + a.r + 0.75, a.pos[2]);
    }
  });
  return (
    <group>
      <group ref={groupRef} visible={false}>
        <Billboard>
          <mesh renderOrder={4}>
            <ringGeometry args={[0.86, 0.94, 48]} />
            <meshBasicMaterial ref={matRef} color="#fbbf24" transparent opacity={0.45} side={THREE.DoubleSide} depthTest={false} depthWrite={false} />
          </mesh>
        </Billboard>
      </group>
      <sprite ref={glyphRef} visible={false} scale={[0.038 * glyph.aspect, 0.038, 1]} renderOrder={11}>
        <spriteMaterial map={glyph.tex} sizeAttenuation={false} transparent depthTest={false} />
      </sprite>
    </group>
  );
}

// ── Zone standing tint (W9) — state.zoneStandings ───────────────────────────
// Soft glow behind every location of a zone the player holds standing in:
// governor gold, stakeholder cyan. Reinforcement only — the crown/diamond text glyph
// in the location label carries the information (no color-only state).

function makeTintTexture(rgb: string): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const ctx = c.getContext('2d')!;
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, `rgba(${rgb},0.55)`);
  g.addColorStop(0.5, `rgba(${rgb},0.18)`);
  g.addColorStop(1, `rgba(${rgb},0)`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function ZoneTints({ posRef, tinted }: { posRef: PositionsRef; tinted: { locId: string; kind: 'governor' | 'stakeholder' }[] }) {
  const goldTex = useMemo(() => makeTintTexture('251,191,36'), []);
  const cyanTex = useMemo(() => makeTintTexture('34,211,238'), []);
  useEffect(() => () => { goldTex.dispose(); cyanTex.dispose(); }, [goldTex, cyanTex]);
  const spritesRef = useRef<(THREE.Sprite | null)[]>([]);
  useFrame(() => {
    const anchors = posRef.current.anchors;
    for (let i = 0; i < tinted.length; i++) {
      const sp = spritesRef.current[i];
      if (!sp) continue;
      const a = anchors[tinted[i].locId];
      if (!a) { sp.visible = false; continue; }
      sp.visible = true;
      sp.position.set(a.pos[0], a.pos[1], a.pos[2]);
      const s = a.r * 2 + 2.6;
      sp.scale.set(s, s, 1);
    }
  });
  return (
    <group>
      {tinted.map((t, i) => (
        <sprite key={`${t.locId}-${t.kind}`} ref={el => { spritesRef.current[i] = el; }} visible={false} renderOrder={-2}>
          <spriteMaterial
            map={t.kind === 'governor' ? goldTex : cyanTex}
            transparent
            opacity={0.3}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </sprite>
      ))}
    </group>
  );
}

// ── Wave V4: mode-lens tints — computeModeVisuals output as glow sprites ────
// Same radial-gradient sprite approach as ZoneTints, generalized to the mode
// palette. Reinforcement only: the label's mode glyph/badge (LabelSprite)
// carries the information in text.

function hexToRgbTriplet(hex: string): string {
  const n = parseInt(hex.replace('#', ''), 16);
  return `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`;
}

function ModeTints({ posRef, visuals }: { posRef: PositionsRef; visuals: Record<string, ModeVisual> }) {
  const entries = useMemo(() => Object.entries(visuals), [visuals]);
  // One texture per unique tint color (modes use ≤3 colors at once).
  const texByColor = useMemo(() => {
    const map = new Map<string, THREE.CanvasTexture>();
    for (const [, v] of entries) {
      if (!map.has(v.tint)) map.set(v.tint, makeTintTexture(hexToRgbTriplet(v.tint)));
    }
    return map;
  }, [entries]);
  useEffect(() => () => { texByColor.forEach(t => t.dispose()); }, [texByColor]);
  const spritesRef = useRef<(THREE.Sprite | null)[]>([]);
  useFrame(() => {
    const anchors = posRef.current.anchors;
    for (let i = 0; i < entries.length; i++) {
      const sp = spritesRef.current[i];
      if (!sp) continue;
      const a = anchors[entries[i][0]];
      if (!a) { sp.visible = false; continue; }
      sp.visible = true;
      sp.position.set(a.pos[0], a.pos[1], a.pos[2]);
      const s = a.r * 2 + 2.2 + entries[i][1].intensity * 1.4;
      sp.scale.set(s, s, 1);
    }
  });
  return (
    <group>
      {entries.map(([locId, v], i) => (
        <sprite key={`${locId}-${v.tint}`} ref={el => { spritesRef.current[i] = el; }} visible={false} renderOrder={-2}>
          <spriteMaterial
            map={texByColor.get(v.tint)}
            transparent
            opacity={0.2 + v.intensity * 0.35}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </sprite>
      ))}
    </group>
  );
}

// ── Wave A2 (item 3): orbital-slot occupancy rings ──────────────────────────
// "Orbital slots are finite" is a core design pillar (CLAUDE.md §Spatial
// strategy) that until now existed only as rows in a popover table. Every
// location with an ORBITAL_SLOT_POOL now wears its occupancy: contiguous arc
// segments for yours / other corporations / free, read from the REAL
// sync-delivered snapshot (state.orbitalSlotOccupancy) via map-bodies.ts —
// the same model the 2D canvas draws, so the two can't disagree.
//
// Colour is reinforcement only. The three kinds also differ in RADIAL BAND
// THICKNESS (yours thick, rivals medium, free hairline) and the numeric
// badge sprite states the counts in text; a saturated pool adds a separate
// full hairline ring, so "you cannot build here without a lease" is a shape,
// not a hue. Geometry is static per model — the frame loop only repositions.

const SLOT_RING_BASE_INNER = 0.86;

function SlotRings({ posRef, rings, tierRef, alwaysLabels }: {
  posRef: PositionsRef; rings: SlotRingModel[]; tierRef: TierRef; alwaysLabels: boolean;
}) {
  return (
    <group>
      {rings.map(ring => (
        <SlotRing key={ring.locationId} ring={ring} posRef={posRef} tierRef={tierRef} alwaysLabels={alwaysLabels} />
      ))}
    </group>
  );
}

function SlotRing({ ring, posRef, tierRef, alwaysLabels }: {
  ring: SlotRingModel; posRef: PositionsRef; tierRef: TierRef; alwaysLabels: boolean;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const badgeRef = useRef<THREE.Sprite>(null);
  const badge = useMemo(
    () => makeGlyphTexture(ring.badge, ring.saturated ? '#fca5a5' : '#c4b5fd'),
    [ring.badge, ring.saturated],
  );
  useEffect(() => () => badge.tex.dispose(), [badge]);

  // The occupancy badge joins the label declutter (item 9) at the lowest
  // priority: three badges stacked over the LEO / GEO / Moon cluster used to
  // paint on top of one another. The sprite IS the registered object (its
  // position is set in world space each frame), so yOffset is 0.
  const registry = useContext(LabelRegistryContext);
  const registryId = `slot:${ring.locationId}`;
  useEffect(() => {
    const sprite = badgeRef.current;
    if (!registry || !sprite) return;
    const size = { w: 0.036 * badge.aspect, h: 0.036 };
    registry.entries.set(registryId, { group: sprite, yOffset: 0, priority: 0, sizeByTier: { detail: size, location: size, system: size }, shown: false, tier: 'detail' });
    return () => { registry.entries.delete(registryId); registry.suppressed.delete(registryId); };
  }, [registry, registryId, badge.aspect]);

  useFrame(() => {
    const a = posRef.current.anchors[ring.locationId];
    const g = groupRef.current;
    const b = badgeRef.current;
    const visible = lensVisibleAt(tierRef.current, alwaysLabels);
    const entry = registry?.entries.get(registryId);
    if (!a || !g) {
      if (g) g.visible = false;
      if (b) b.visible = false;
      if (entry) entry.shown = false;
      return;
    }
    g.visible = visible;
    if (visible) {
      g.position.set(a.pos[0], a.pos[1], a.pos[2]);
      const s = a.r + 0.62;
      g.scale.set(s, s, s);
    }
    if (b) {
      if (visible) b.position.set(a.pos[0], a.pos[1] + a.r + 1.05, a.pos[2]);
      if (entry) entry.shown = visible;
      const suppressed = !alwaysLabels && !!registry?.suppressed.has(registryId);
      b.visible = visible && !suppressed;
    }
  });

  return (
    <group>
      <group ref={groupRef} visible={false}>
        <Billboard>
          {ring.segments.map(seg => {
            const style = SLOT_SEGMENT_STYLE[seg.kind];
            const band = (1 - SLOT_RING_BASE_INNER) * style.weight;
            const inner = 1 - band;
            // ringGeometry sweeps counter-clockwise from +X; remap so the
            // segments run clockwise from 12 o'clock like the 2D canvas.
            const thetaLength = Math.max(0.001, (seg.endFrac - seg.startFrac) * Math.PI * 2);
            const thetaStart = Math.PI / 2 - seg.endFrac * Math.PI * 2;
            return (
              <mesh key={seg.kind} renderOrder={4}>
                <ringGeometry args={[inner, 1, 64, 1, thetaStart, thetaLength]} />
                <meshBasicMaterial
                  color={style.color}
                  transparent
                  opacity={seg.kind === 'free' ? 0.5 : 0.92}
                  side={THREE.DoubleSide}
                  depthTest={false}
                  depthWrite={false}
                />
              </mesh>
            );
          })}
          {ring.saturated && (
            <mesh renderOrder={4}>
              <ringGeometry args={[1.06, 1.09, 64]} />
              <meshBasicMaterial color="#f87171" transparent opacity={0.85} side={THREE.DoubleSide} depthTest={false} depthWrite={false} />
            </mesh>
          )}
        </Billboard>
      </group>
      <sprite ref={badgeRef} visible={false} scale={[0.036 * badge.aspect, 0.036, 1]} renderOrder={11}>
        <spriteMaterial map={badge.tex} sizeAttenuation={false} transparent depthTest={false} />
      </sprite>
    </group>
  );
}

// ── Science-mission presence (W9) — state.scienceMissions ───────────────────
// Active flagship missions put an instrument glyph on their target body.
// Order Queue HUD rows for the same missions focus the same location, and
// MapContextPanel lists mission phase details on selection.

function ScienceMarkers({ posRef, state }: { posRef: PositionsRef; state: GameState }) {
  const grouped = useMemo(() => {
    const map = new Map<string, number>();
    for (const m of getActiveScienceMissions(state)) {
      const program = SCIENCE_PROGRAM_MAP.get(m.programId);
      if (!program) continue;
      map.set(program.locationId, (map.get(program.locationId) || 0) + 1);
    }
    return Array.from(map.entries());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.scienceMissions]);
  return (
    <group>
      {grouped.map(([locId, count]) => (
        <ScienceMarker key={locId} locId={locId} count={count} posRef={posRef} />
      ))}
    </group>
  );
}

function ScienceMarker({ locId, count, posRef }: { locId: string; count: number; posRef: PositionsRef }) {
  const spriteRef = useRef<THREE.Sprite>(null);
  const glyph = useMemo(() => makeGlyphTexture(count > 1 ? `${MAP_GLYPHS.science}×${count}` : MAP_GLYPHS.science, '#a5f3fc'), [count]);
  useEffect(() => () => glyph.tex.dispose(), [glyph]);
  useFrame(() => {
    const sp = spriteRef.current;
    if (!sp) return;
    const a = posRef.current.anchors[locId];
    if (!a) { sp.visible = false; return; }
    sp.visible = true;
    sp.position.set(a.pos[0] + a.r * 0.9 + 0.3, a.pos[1] + a.r + 0.45, a.pos[2]);
  });
  return (
    <sprite ref={spriteRef} visible={false} scale={[0.04 * glyph.aspect, 0.04, 1]} renderOrder={11}>
      <spriteMaterial map={glyph.tex} sizeAttenuation={false} transparent depthTest={false} />
    </sprite>
  );
}

// ── Main component ───────────────────────────────────────────────────────────

export default function SolarMap3D({ state, onSelectLocation, selectedLocationId, active = true, mapMode = 'standard', alwaysLabels = false, onZoomTierChange, laneVolumes, onContextLost, layers, onToggleLayer, contacts = NO_CONTACTS, contactsAsOfMs = 0, cameraRequest, onLocalBodyChange }: SolarMap3DProps) {
  const [selectedLoc, setSelectedLoc] = useState<string | null>(null);
  // Lanes / Ships / World — shell-controlled when `layers` is passed (item
  // 5: the phone icon strip owns the switches), private state otherwise.
  const [localLayers, setLocalLayers] = useState<MapLayerVisibility>(DEFAULT_MAP_LAYERS);
  const layerVis = layers ?? localLayers;
  const showLanes = layerVis.lanes;
  const showShips = layerVis.ships;
  const showContacts = layerVis.contacts;
  const showWorld = layerVis.world;
  const toggleLayer = useCallback((key: MapLayerKey) => {
    if (onToggleLayer) onToggleLayer(key);
    else setLocalLayers(prev => toggleMapLayer(prev, key));
  }, [onToggleLayer]);
  // Ship traffic: the hover/tap tag for a contact (container-relative px).
  const [contactHover, setContactHover] = useState<ContactHover | null>(null);
  const handleContactHover = useCallback((h: ContactHover | null) => {
    if (!h) { setContactHover(null); return; }
    const root = rootRef.current;
    const r = root?.getBoundingClientRect();
    setContactHover(r ? { contact: h.contact, x: h.x - r.left, y: h.y - r.top } : h);
  }, []);
  useEffect(() => { if (!showContacts || contacts.length === 0) setContactHover(null); }, [showContacts, contacts.length]);
  const [listExpanded, setListExpanded] = useState(false);
  const controlsRef = useRef<OrbitControlsImpl | null>(null);
  const cameraRef = useRef<THREE.Camera | null>(null);
  const pointerDownRef = useRef<{ x: number; y: number } | null>(null);
  const posRef = useRef<ScenePositions>(computeScenePositions(0));
  const timeRef = useRef(0);
  const rootRef = useRef<HTMLDivElement>(null);
  // Flight mode (part a): the scene the camera is inside (React state for
  // mounting the local scene + the UI; a ref for the frame loop), the
  // active flight, the system scene's raycast gate and the local hover tag.
  const [localBody, setLocalBody] = useState<string | null>(null);
  const localRef = useRef<string | null>(null);
  const flightRef = useRef<Flight | null>(null);
  const systemGateRef = useRef(true);
  systemGateRef.current = localBody === null;
  const [localHover, setLocalHover] = useState<LocalHover | null>(null);
  const onLocalBodyChangeRef = useRef(onLocalBodyChange);
  onLocalBodyChangeRef.current = onLocalBodyChange;
  const handleLocalChange = useCallback((id: string | null) => {
    setLocalBody(id);
    setLocalHover(null);
    document.body.style.cursor = 'auto';
    onLocalBodyChangeRef.current?.(id);
  }, []);
  const handleLocalHover = useCallback((h: LocalHover | null) => {
    if (!h) { setLocalHover(null); return; }
    const r = rootRef.current?.getBoundingClientRect();
    setLocalHover(r ? { ...h, x: h.x - r.left, y: h.y - r.top } : h);
  }, []);
  // Wave A2 — zoom tier shared ref (ZoomTierTracker writes, LabelSprites and
  // SlotRings read). Same "one ref, no 60Hz React state" pattern as the V4
  // LOD bands it replaces.
  const tierRef = useRef<MapZoomTier>('location');
  const [zoomTier, setZoomTier] = useState<MapZoomTier>('location');
  const handleTierChange = useCallback((t: MapZoomTier) => {
    setZoomTier(t);
    onZoomTierChange?.(t);
  }, [onZoomTierChange]);

  // Defensive: MapCommandCenter already falls back to 2D under
  // prefers-reduced-motion, but honor it here too in case of direct use.
  const [reduced, setReduced] = useState(false);
  const reducedRef = useRef(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mq.matches);
    reducedRef.current = mq.matches;
    const onChange = () => { setReduced(mq.matches); reducedRef.current = mq.matches; };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  // Pause rendering when the page is hidden.
  const [pageVisible, setPageVisible] = useState(true);
  useEffect(() => {
    const onVis = () => setPageVisible(!document.hidden);
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);
  const running = active && pageVisible;

  // Context-loss watch (2026-09-12). The renderer's canvas is only known once
  // R3F has created it (onCreated), so the listener is attached by an effect
  // keyed on that element — and removed on unmount BEFORE R3F's own deferred
  // forceContextLoss (500 ms after unmount), so a routine unmount is never
  // mistaken for a crash. StrictMode's mount/unmount/mount is handled the
  // same way (the effect re-attaches).
  const [glCanvas, setGlCanvas] = useState<HTMLCanvasElement | null>(null);
  const onContextLostRef = useRef(onContextLost);
  onContextLostRef.current = onContextLost;
  useEffect(() => {
    if (!glCanvas) return;
    let fired = false;
    const onLost = () => {
      if (fired) return;
      fired = true;
      onContextLostRef.current?.();
    };
    glCanvas.addEventListener('webglcontextlost', onLost);
    return () => glCanvas.removeEventListener('webglcontextlost', onLost);
  }, [glCanvas]);

  // Wave V4 — bloom gating (spec: ON only when use3D && dpr>1 && !reduced,
  // user quality toggle in the renderer button group, lazy chunk). dprHigh
  // starts false so SSR/first paint never fetches the chunk speculatively.
  // 2026-09-12: the pass is OPT-IN (default off). `dpr > 1` is true on every
  // scaled Windows display (125% = 1.25), so "on when dpr > 1" made the
  // HalfFloat composer targets the default for essentially all Windows
  // laptops — the population reporting whole-browser exits. The FX button
  // still enables it; the choice persists.
  const [dprHigh, setDprHigh] = useState(false);
  useEffect(() => { setDprHigh(window.devicePixelRatio > 1); }, []);
  const [fxPref, setFxPref] = useState(false);
  useEffect(() => {
    try { setFxPref(localStorage.getItem(MAP_FX_KEY) === '1'); } catch { /* default off */ }
  }, []);
  const toggleFx = useCallback(() => {
    playSound('click');
    setFxPref(prev => {
      const next = !prev;
      try { localStorage.setItem(MAP_FX_KEY, next ? '1' : '0'); } catch { /* ignore */ }
      return next;
    });
  }, []);

  // Wave V4 — mode-lens derivation (pure, shared with the 2D canvas).
  const modeVisuals = useMemo(
    () => computeModeVisuals(state, mapMode, Date.now()),
    [state, mapMode],
  );

  // Never leave a pointer cursor behind when the map unmounts mid-hover.
  useEffect(() => () => { document.body.style.cursor = 'auto'; }, []);

  // A jump from outside the renderer (map jump hotkeys, Order Queue chip,
  // Outliner deep-link) has to bring the camera with it. Without this the
  // reticle lands on a body that is off-screen or a few pixels wide and the
  // jump reads as "nothing happened". Held in a ref because the focus helper
  // is defined further down, after the layout maths it depends on; the ref is
  // assigned during render, so it is always set before any effect runs.
  const focusExternalRef = useRef<((locId: string) => void) | null>(null);

  // External selection sync (Order Queue HUD / context-panel close) — same
  // contract as the 2D canvas.
  useEffect(() => {
    if (selectedLocationId !== undefined && selectedLocationId !== selectedLoc) {
      setSelectedLoc(selectedLocationId);
      if (selectedLocationId) focusExternalRef.current?.(selectedLocationId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedLocationId]);

  const { world, available: worldAvailable } = useWorldState();
  const worldLayerActive = showWorld && worldAvailable;

  /** Land the active flight on its end pose now (any input skips a flight). */
  const skipFlight = useCallback(() => {
    const flight = flightRef.current;
    const controls = controlsRef.current;
    const cam = cameraRef.current;
    if (!flight) return;
    flightRef.current = null;
    if (controls) controls.enabled = true;
    const end = flightEndPose(flight, posRef.current);
    if (end && cam && controls) applyPose(end, cam, controls);
  }, []);

  /** Fly the camera to a location (flight mode, part a). A body with a local
   *  scene (or a pip that belongs to one — LEO → Earth) is approached to
   *  frameDistance(r, 'local'), INSIDE its local sphere, so selecting a body
   *  flies you into its local view; `system` flies back out to the system
   *  frame; region pips (belt, relay) always get the system frame. Keeps the
   *  current viewing angle. Zero-length flights are ignored. */
  const flyTo = useCallback((locId: string, mode: 'auto' | 'local' | 'system' = 'auto') => {
    const controls = controlsRef.current;
    const cam = cameraRef.current;
    if (!controls || !cam) return;
    const bodyId = localBodyForLocation(locId);
    const targetLocId = bodyId ? (ORBITAL_BODY_MAP.get(bodyId)?.locationId ?? locId) : locId;
    const anchor = posRef.current.anchors[targetLocId];
    if (!anchor) return;
    const frame: 'local' | 'system' = mode === 'system' ? 'system' : bodyId ? 'local' : 'system';
    const distance = frameDistance(anchor.r, frame);
    const dir = new THREE.Vector3().subVectors(cam.position, controls.target);
    if (dir.lengthSq() < 1e-6) dir.set(0.35, 0.85, 0.4);
    dir.normalize();
    // Flights into a local scene come in from above the ecliptic so the
    // rings read as rings, not as lines.
    if (frame === 'local' && dir.y < 0.35) { dir.y = 0.35; dir.normalize(); }
    const from: CameraPose = { pos: [cam.position.x, cam.position.y, cam.position.z], target: [controls.target.x, controls.target.y, controls.target.z] };
    const flight: Flight = { from, targetLocId, dir, distance, start: performance.now(), duration: 0 };
    const end = flightEndPose(flight, posRef.current);
    if (!end) return;
    const travel = Math.hypot(end.pos[0] - from.pos[0], end.pos[1] - from.pos[1], end.pos[2] - from.pos[2]);
    if (travel < 0.05) return;
    flight.duration = flyDurationMs(travel, reducedRef.current);
    if (flight.duration === 0) { flightRef.current = null; controls.enabled = true; applyPose(end, cam, controls); return; }
    controls.enabled = false;
    flightRef.current = flight;
  }, []);
  const focusCameraOn = useCallback((locId: string) => flyTo(locId, 'auto'), [flyTo]);
  focusExternalRef.current = focusCameraOn;
  /** Leave the local scene: fly out past the ROOT body's exit sphere (from
   *  the Moon's scene that is Earth's), so "System" always reaches the
   *  system view. */
  const flyOut = useCallback(() => {
    const cur = localRef.current;
    if (!cur) return;
    const loc = ORBITAL_BODY_MAP.get(rootBodyId(cur))?.locationId;
    if (loc) flyTo(loc, 'system');
  }, [flyTo]);

  // Any input skips a flight (the rig then hands OrbitControls back).
  useEffect(() => {
    const onKey = () => { if (flightRef.current) skipFlight(); };
    const onWheel = () => { if (flightRef.current) skipFlight(); };
    window.addEventListener('keydown', onKey);
    window.addEventListener('wheel', onWheel, { passive: true });
    return () => { window.removeEventListener('keydown', onKey); window.removeEventListener('wheel', onWheel); };
  }, [skipFlight]);

  // Shell requests: enter a local scene, leave it, or re-frame the selection.
  const lastCameraTokenRef = useRef<number | null>(null);
  useEffect(() => {
    if (!cameraRequest || cameraRequest.token === lastCameraTokenRef.current) return;
    lastCameraTokenRef.current = cameraRequest.token;
    if (cameraRequest.kind === 'local') {
      const loc = cameraRequest.bodyId ? ORBITAL_BODY_MAP.get(cameraRequest.bodyId)?.locationId : undefined;
      if (loc) flyTo(loc, 'local');
    } else if (cameraRequest.kind === 'system') {
      flyOut();
    } else if (cameraRequest.kind === 'frame') {
      const sel = selectedLoc ?? (localRef.current ? ORBITAL_BODY_MAP.get(localRef.current)?.locationId : undefined);
      if (sel) flyTo(sel, 'auto');
    }
  }, [cameraRequest, flyTo, flyOut, selectedLoc]);

  // The local scene model: built lazily from state (+ the traffic feed and
  // the world feed's corporation names) and cached per body — only the
  // scene the camera is in is ever built or mounted.
  const localCacheRef = useRef<Map<string, LocalSceneModel>>(new Map());
  useEffect(() => { localCacheRef.current.clear(); }, [state, contacts, world]);
  const localModel = useMemo(() => {
    if (!localBody) return null;
    const cached = localCacheRef.current.get(localBody);
    if (cached) return cached;
    const built = buildLocalSceneModel(state, localBody, { contacts, nowMs: Date.now(), worldNames: world?.world.colonies ?? null });
    if (built) localCacheRef.current.set(localBody, built);
    return built;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localBody, state, contacts, world]);

  // Item 9 — home framing (Earth cluster), the first-open intro dolly, and
  // the label declutter registry.
  const frameHome = useCallback(() => {
    const controls = controlsRef.current;
    const cam = cameraRef.current;
    const anchor = posRef.current.anchors[HOME_LOCATION_ID];
    if (!controls || !cam || !anchor) return;
    const target = new THREE.Vector3(anchor.pos[0], anchor.pos[1], anchor.pos[2]);
    controls.target.copy(target);
    cam.position.copy(target).addScaledVector(homeDirection(anchor.pos), HOME_DISTANCE);
    controls.update();
  }, []);
  // Decided once at mount from matchMedia directly (the `reduced` state
  // above settles in an effect that runs AFTER the children's), so the intro
  // can never start under reduced motion.
  const [intro, setIntro] = useState(false);
  useEffect(() => {
    let seen = true;
    try { seen = localStorage.getItem(MAP_INTRO_KEY) === '1'; } catch { /* no storage → no intro */ }
    const reducedNow = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!seen && !reducedNow) setIntro(true);
  }, []);
  const endIntro = useCallback(() => {
    setIntro(false);
    try { localStorage.setItem(MAP_INTRO_KEY, '1'); } catch { /* ignore */ }
  }, []);
  const skipIntro = useCallback(() => {
    if (!intro) return;
    endIntro();
    const c = controlsRef.current;
    if (c) c.enabled = true;
    frameHome();
  }, [intro, endIntro, frameHome]);
  // Any input during the intro ends it (pointer via the root's capture
  // handler below; keys here).
  useEffect(() => {
    if (!intro) return;
    const onKey = () => skipIntro();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [intro, skipIntro]);
  const labelRegistry = useMemo<LabelRegistry>(() => ({ entries: new Map(), suppressed: new Set() }), []);
  const resolveSystemAnchor = useCallback((locId: string) => posRef.current.anchors[locId] ?? null, []);

  /**
   * @param anchor  Screen point to hang the radial command menu on.
   * @param opts.toggle  Whether re-picking the current selection clears it.
   *   Defaults to true for un-anchored picks, preserving click-again-to-
   *   deselect on the map body. The Location List passes false: a list row
   *   that silently deselects reads as "the button did nothing", which is
   *   exactly how the first-hour "claim your next orbit" step got stuck.
   * @param opts.focus  Move the camera to frame the body.
   */
  const selectLocation = useCallback((
    locId: string,
    anchor?: { x: number; y: number },
    opts?: { toggle?: boolean; focus?: boolean },
  ) => {
    playSound('click');
    // Derive from current state rather than inside the updater — the updater
    // must stay pure, and notifying the parent from inside it can double-fire
    // or be dropped entirely under StrictMode and concurrent rendering.
    const allowToggle = opts?.toggle ?? !anchor;
    const next = allowToggle && selectedLoc === locId ? null : locId;
    setSelectedLoc(next);
    onSelectLocation?.(next, next ? anchor : undefined);
    if (next && opts?.focus) focusCameraOn(next);
  }, [selectedLoc, onSelectLocation, focusCameraOn]);

  /** Scene clicks arrive in client coordinates; the radial menu is positioned
   *  inside this component's container, so translate once here. */
  const pickFromScene = useCallback((locId: string, anchor?: { x: number; y: number }) => {
    const root = rootRef.current;
    if (!anchor || !root) { selectLocation(locId, anchor, { focus: true }); return; }
    const r = root.getBoundingClientRect();
    // Flight mode: a click on a body flies to it (into its local scene) as
    // well as opening the radial menu at the click point.
    selectLocation(locId, { x: anchor.x - r.left, y: anchor.y - r.top }, { focus: true });
  }, [selectLocation]);

  /** Container-relative centre of a DOM element (Location List rows opening
   *  the radial menu by keyboard / right-click). */
  const anchorForElement = useCallback((el: HTMLElement | null): { x: number; y: number } | undefined => {
    const root = rootRef.current;
    if (!el || !root) return undefined;
    const r = el.getBoundingClientRect();
    const rr = root.getBoundingClientRect();
    return { x: r.left + r.width / 2 - rr.left, y: r.top + r.height / 2 - rr.top };
  }, []);

  const deselect = useCallback(() => {
    setSelectedLoc(null);
    onSelectLocation?.(null);
  }, [onSelectLocation]);

  // Badge counts per location id — identical semantics to the 2D canvas.
  const badgesByLoc = useMemo(() => {
    const out: Record<string, BadgeCounts> = {};
    const get = (id: string) => (out[id] ||= { buildings: 0, npc: 0, world: 0 });
    for (const b of state.buildings) {
      if (b.isComplete) get(b.locationId).buildings++;
    }
    for (const n of state.npcCompanies || []) {
      for (const locId of n.unlockedLocations) get(locId).npc++;
    }
    if (worldLayerActive && world) {
      for (const [locId, count] of Object.entries(world.world.colonyCounts)) {
        if (count > 0) get(locId).world = count;
      }
    }
    return out;
  }, [state.buildings, state.npcCompanies, worldLayerActive, world]);

  const NO_BADGES: BadgeCounts = useMemo(() => ({ buildings: 0, npc: 0, world: 0 }), []);
  const unlockedSet = useMemo(() => new Set(state.unlockedLocations), [state.unlockedLocations]);

  // W9: zone standing per location (governor beats stakeholder when zones
  // overlap a location) — drives the label glyph, the tint layer, and the
  // keyboard Location List annotations.
  const standingByLoc = useMemo(() => {
    const out: Record<string, 'governor' | 'stakeholder'> = {};
    for (const zs of state.zoneStandings || []) {
      const kind: 'governor' | 'stakeholder' | null = zs.isGovernor ? 'governor' : zs.sharePct >= 1 ? 'stakeholder' : null;
      if (!kind) continue;
      const zone = ZONE_MAP.get(zs.zoneSlug);
      for (const locId of zone?.locations || []) {
        if (out[locId] !== 'governor') out[locId] = kind;
      }
    }
    return out;
  }, [state.zoneStandings]);
  const tintedLocations = useMemo(
    () => Object.entries(standingByLoc).map(([locId, kind]) => ({ locId, kind })),
    [standingByLoc],
  );

  // W9: locations with a severe-hazard forecast (next game-month telegraphs).
  const warningLocs = useMemo(
    () => new Set((state.hazardWarnings || []).map(w => w.locationId)),
    [state.hazardWarnings],
  );

  // Wave A2 — orbital-slot occupancy rings. Real sync-delivered occupancy;
  // fail-soft to your-footprint-only when the save has never synced.
  const slotRings = useMemo(() => computeSlotRings(state), [state]);
  const slotRingByLoc = useMemo(() => {
    const out: Record<string, SlotRingModel> = {};
    for (const r of slotRings) out[r.locationId] = r;
    return out;
  }, [slotRings]);

  const ships = (state.ships || []).filter(s => s.isBuilt);
  const transitShips = ships.filter(s => s.status === 'in_transit' && s.route);
  const stationShips = ships.filter(s => !(s.status === 'in_transit' && s.route));
  const shipsInTransit = transitShips.length;

  // Zoom controls (OrbitControls has no public zoom setter — dolly the camera
  // along the target axis, mirroring the 2D +/- buttons).
  const zoomBy = useCallback((factor: number) => {
    const controls = controlsRef.current;
    const cam = cameraRef.current;
    if (!controls || !cam) return;
    const target = controls.target;
    cam.position.sub(target).multiplyScalar(factor).add(target);
    controls.update();
  }, []);

  // Reset re-frames the LIVE Earth cluster (item 9) rather than restoring
  // the mount-time pose: bodies orbit in real time, so a saved pose would
  // point at where Earth was several minutes ago.
  const resetView = useCallback(() => {
    // Flight mode: inside a local scene, R/Home re-frames THAT scene (a
    // short flight back to its frame distance); in the system view it is
    // the instant Earth-cluster home frame as before.
    const cur = localRef.current;
    const loc = cur ? ORBITAL_BODY_MAP.get(cur)?.locationId : undefined;
    if (loc) { flyTo(loc, 'local'); return; }
    skipFlight();
    frameHome();
  }, [frameHome, flyTo, skipFlight]);

  /** Free look (part a): drift the orbit target in the camera's screen
   *  plane. Step scales with the orbit distance so a nudge means the same
   *  thing at Pluto range and inside Earth's local scene. */
  const driftBy = useCallback((sx: number, sy: number) => {
    const controls = controlsRef.current;
    const cam = cameraRef.current;
    if (!controls || !cam) return;
    const fwd = new THREE.Vector3();
    cam.getWorldDirection(fwd);
    const right = new THREE.Vector3().crossVectors(fwd, new THREE.Vector3(0, 1, 0)).normalize();
    const up = new THREE.Vector3().crossVectors(right, fwd).normalize();
    const step = Math.max(0.05, cam.position.distanceTo(controls.target) * 0.08);
    const delta = new THREE.Vector3().addScaledVector(right, sx * step).addScaledVector(up, sy * step);
    controls.target.add(delta);
    cam.position.add(delta);
    controls.update();
  }, []);

  // Keyboard zoom — CLAUDE.md keyboard-only invariant, matching the 2D
  // canvas's bindings exactly (`+` / `=` in, `-` / `_` out, `R` / Home reset) with
  // the same input-field guards the shell's M/C shortcuts use. Gated on
  // `active` so keys never fire under a covering panel overlay. zoomBy and
  // reset are instant camera moves (OrbitControls.update clamps distance),
  // so there is no animated transition to gate on reduced motion.
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable)) return;
      if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        zoomBy(0.8);
      } else if (e.key === '-' || e.key === '_') {
        e.preventDefault();
        zoomBy(1.25);
      } else if (e.key === 'r' || e.key === 'R' || e.key === 'Home') {
        // Reset moved off `0` (2026-09-04) so the whole digit row belongs to
        // the map's jump hotkeys. `R` works on compact keyboards that have no
        // Home key; Home is kept for the pan/zoom convention.
        e.preventDefault();
        resetView();
      } else {
        // Free look (flight mode part a): arrows / WASD drift the camera
        // target. Never inside a modal, a radiogroup (the mode strip uses
        // arrows) or a menu; the digit row stays the jump hotkeys'.
        if (document.querySelector('[aria-modal="true"]')) return;
        if (el?.closest?.('[role="radiogroup"], [role="menu"], [role="dialog"], [role="listbox"]')) return;
        const k = e.key;
        const sx = k === 'ArrowLeft' || k === 'a' || k === 'A' ? -1 : k === 'ArrowRight' || k === 'd' || k === 'D' ? 1 : 0;
        const sy = k === 'ArrowUp' || k === 'w' || k === 'W' ? 1 : k === 'ArrowDown' || k === 's' || k === 'S' ? -1 : 0;
        if (sx === 0 && sy === 0) return;
        e.preventDefault();
        driftBy(sx, sy);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active, zoomBy, resetView, driftBy]);

  return (
    <div
      ref={rootRef}
      className="relative w-full h-full"
      onPointerDownCapture={e => { pointerDownRef.current = { x: e.clientX, y: e.clientY }; if (intro) skipIntro(); if (flightRef.current) skipFlight(); }}
    >
      <div
        className="absolute inset-0"
        role="img"
        aria-label="3D solar system map showing your unlocked locations, buildings, NPC presence, and ships in transit. Bodies orbit the Sun with realistic relative periods."
        aria-describedby="solar-map-3d-hint"
      >
      {/* 2026-09-12 (browser-crash investigation): dpr capped at 1.5 (was 2 —
          the MSAA default framebuffer scales with dpr²) and powerPreference
          'default' (was 'high-performance', which forces a discrete-GPU
          device switch on every context creation on hybrid Windows
          laptops). */}
      {/* Item 8 (lighting & tone): explicit ACES filmic tone mapping with a
          tuned exposure (R3F's default is ACES at exposure 1; 1.1 lifts the
          sun-lit hemispheres without clipping the sun sprite, which is
          toneMapped={false}), and a true-black stage gradient instead of
          the old blue-grey one. The camera prop is only the pre-frame pose:
          HomeFramer re-frames on the Earth cluster once controls exist. */}
      <Canvas
        camera={{ position: [0, 30, 44], fov: 50, near: 0.1, far: 1200 }}
        dpr={[1, 1.5]}
        frameloop={running ? 'always' : 'never'}
        gl={{ antialias: true, powerPreference: 'default', toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.1 }}
        style={{ background: 'linear-gradient(180deg, #000000 0%, #020208 100%)' }}
        onCreated={({ camera, gl }) => { cameraRef.current = camera; setGlCanvas(gl.domElement); }}
        onPointerMissed={e => {
          // Ignore "clicks" that were actually orbit drags.
          const down = pointerDownRef.current;
          if (down && (Math.abs(e.clientX - down.x) > 6 || Math.abs(e.clientY - down.y) > 6)) return;
          deselect();
        }}
      >
        <ambientLight intensity={0.16} />
        <NebulaSkybox />
        {/* Item 8: more and larger stars (4,200 → 7,000, factor 5 → 6.5);
            still monochrome and still static under reduced motion. */}
        <Stars radius={420} depth={90} count={7000} factor={6.5} saturation={0} fade speed={reduced ? 0 : 0.5} />
        <SceneClock posRef={posRef} timeRef={timeRef} reduced={reduced} />
        <ZoomTierTracker tierRef={tierRef} onChange={handleTierChange} />
        <MapProbe posRef={posRef} localRef={localRef} flightRef={flightRef} />
        <Sun reduced={reduced} />
        {/* Flight mode (part a): the rig that flies the camera and the
            tracker that swaps scenes when the camera crosses a local sphere.
            Both are frame-loop subscribers of THIS Canvas. */}
        <FlightRig flightRef={flightRef} controlsRef={controlsRef} posRef={posRef} />
        <LocalSphereTracker posRef={posRef} localRef={localRef} onChange={handleLocalChange} />
        {/* The local scene: mounted only while the camera is inside a body's
            sphere, positioned at the body's live world position — a child
            group of the same Canvas (one WebGL context for the session). */}
        {localModel && (
          <SolarMapLocal
            model={localModel}
            posRef={posRef}
            timeRef={timeRef}
            reduced={reduced}
            selectedLocationId={selectedLoc}
            contactsAsOfMs={contactsAsOfMs}
            showShips={showShips}
            showContacts={showContacts}
            onPick={pickFromScene}
            onHover={handleLocalHover}
          />
        )}
        {/* The system view. Hidden (not unmounted) while a local scene is up
            so its textures, sprites and instanced buffers survive; its
            interactive meshes stop answering raycasts through the gate. */}
        <SceneGateContext.Provider value={systemGateRef}>
        <LabelRegistryContext.Provider value={labelRegistry}>
        <group visible={localBody === null}>
        {ORBITAL_BODIES.filter(b => !b.parent).map(b => (
          <OrbitRing key={`orbit-${b.id}`} aAU={b.aAU!} inclinationDeg={b.inclinationDeg || 0} />
        ))}
        <BeltRocks reduced={reduced} />
        {tintedLocations.length > 0 && mapMode === 'standard' && <ZoneTints posRef={posRef} tinted={tintedLocations} />}
        {Object.keys(modeVisuals).length > 0 && <ModeTints posRef={posRef} visuals={modeVisuals} />}
        {ORBITAL_BODIES.map(b => (
          <BodyMesh
            key={b.id}
            def={b}
            posRef={posRef}
            reduced={reduced}
            unlocked={b.locationId ? unlockedSet.has(b.locationId) : true}
            badges={(b.locationId && badgesByLoc[b.locationId]) || NO_BADGES}
            standing={(b.locationId && standingByLoc[b.locationId]) || null}
            mode={(b.locationId && modeVisuals[b.locationId]) || null}
            tierRef={tierRef}
            alwaysLabels={alwaysLabels}
            onPick={pickFromScene}
          />
        ))}
        {ORBITAL_PIPS.map(p => (
          <PipMesh
            key={p.locationId}
            pip={p}
            posRef={posRef}
            unlocked={unlockedSet.has(p.locationId)}
            badges={badgesByLoc[p.locationId] || NO_BADGES}
            standing={standingByLoc[p.locationId] || null}
            mode={modeVisuals[p.locationId] || null}
            tierRef={tierRef}
            alwaysLabels={alwaysLabels}
            onPick={pickFromScene}
          />
        ))}
        <LabelDeclutter registry={labelRegistry} selectedLocationId={selectedLoc} alwaysLabels={alwaysLabels} enabled={localBody === null} />
        <SlotRings posRef={posRef} rings={slotRings} tierRef={tierRef} alwaysLabels={alwaysLabels} />
        {showLanes && <LaneLines posRef={posRef} state={state} reduced={reduced} laneVolumes={laneVolumes} />}
        {showShips && transitShips.map(s => <TransitShip key={s.instanceId} ship={s} posRef={posRef} reduced={reduced} />)}
        {showShips && stationShips.map(s => <StationShip key={s.instanceId} ship={s} posRef={posRef} reduced={reduced} />)}
        {showContacts && contacts.length > 0 && (
          <ContactsLayer contacts={contacts} asOfMs={contactsAsOfMs} posRef={posRef} reduced={reduced} onHover={handleContactHover} />
        )}
        <MapPings3D posRef={posRef} reduced={reduced} />
        <HazardRings posRef={posRef} state={state} />
        <ForecastMarkers posRef={posRef} state={state} reduced={reduced} />
        <ScienceMarkers posRef={posRef} state={state} />
        <SelectionMarker resolve={resolveSystemAnchor} selectedLocationId={selectedLoc} reduced={reduced} />
        </group>
        {/* Wave V4 — selective bloom, desktop-only lazy chunk. Never fetched
            unless every gate passes (feature flag × user FX toggle × dpr>1 ×
            not reduced-motion); mobile uses the 2D renderer and never even
            loads SolarMap3D, let alone this chunk. */}
        {BLOOM_FEATURE_ENABLED && fxPref && dprHigh && !reduced && (
          <Suspense fallback={null}>
            <SolarMapBloom />
          </Suspense>
        )}
        {/* Zoom pass: zoomToCursor makes the wheel dolly toward the pointer
            (three-stdlib ≥2.24), so "zoom into the Earth cluster" is one
            scroll instead of scroll + re-aim — the founder-flagged fix for
            telling leo / geo / lunar_orbit / lunar_surface apart. Pinch-zoom
            on touch is native to OrbitControls. minDistance lowered 4 → 2.5
            so the camera can get inside the cluster's angular spread (LEO and
            GEO sit only ~0.33 scene units apart). Damping is an inertial
            glide — decorative easing — so it's off under reduced motion. */}
        <OrbitControls
          ref={controlsRef}
          enablePan
          enableDamping={!reduced}
          dampingFactor={0.08}
          rotateSpeed={0.5}
          zoomSpeed={0.6}
          zoomToCursor
          minDistance={2.5}
          maxDistance={160}
          maxPolarAngle={Math.PI * 0.49}
        />
        {/* Rendered AFTER OrbitControls so its ref is populated when the
            framer's effect runs (siblings commit refs before effects). */}
        <HomeFramer frameHome={frameHome} />
        {intro && <IntroDolly controlsRef={controlsRef} posRef={posRef} onDone={endIntro} />}
        </LabelRegistryContext.Provider>
        </SceneGateContext.Provider>
      </Canvas>
      </div>

      {/* Intro skip — the dolly disables orbit input for ≤2.2 s; this (and
          any pointer/key) ends it at once. */}
      {intro && (
        <button
          type="button"
          onClick={skipIntro}
          className="absolute top-2 left-1/2 -translate-x-1/2 z-30 min-h-[44px] px-4 rounded-xl border border-white/[0.12] bg-black/70 text-[11px] font-hud font-semibold text-cyan-200 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-cyan-400"
        >
          Skip intro
        </button>
      )}

      {/* Zoom controls — same placement as the 2D embedded layout */}
      <div className="absolute top-2 right-2 flex flex-col gap-1 z-20">
        <button onClick={() => zoomBy(0.8)} className="w-11 h-11 flex items-center justify-center rounded bg-black/60 text-white text-xs hover:bg-white/10 border border-white/10 focus:outline-none focus:ring-2 focus:ring-cyan-400" aria-label="Zoom in" aria-keyshortcuts="+">+</button>
        <button onClick={() => zoomBy(1.25)} className="w-11 h-11 flex items-center justify-center rounded bg-black/60 text-white text-xs hover:bg-white/10 border border-white/10 focus:outline-none focus:ring-2 focus:ring-cyan-400" aria-label="Zoom out" aria-keyshortcuts="-">−</button>
        <button onClick={resetView} className="w-11 h-11 flex items-center justify-center rounded bg-black/60 text-white text-[10px] hover:bg-white/10 border border-white/10 focus:outline-none focus:ring-2 focus:ring-cyan-400" aria-label="Reset view" aria-keyshortcuts="R Home">⟲</button>
      </div>

      {/* Layer toggles — bottom-right, same as 2D embedded. When the shell
          owns the layer state its phone icon strip carries these, so the
          column only renders from md up (item 5). */}
      <div className={`absolute bottom-2 right-2 ${onToggleLayer ? 'hidden md:flex' : 'flex'} flex-col gap-1 z-20`}>
        <button
          onClick={() => toggleLayer('lanes')}
          aria-pressed={showLanes}
          className={`min-h-[44px] px-2 py-1 rounded text-[10px] font-medium border backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-cyan-400 ${
            showLanes ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30' : 'bg-black/60 text-slate-500 border-white/10 hover:text-white'
          }`}
        >
          {showLanes ? '● Lanes' : '○ Lanes'}
        </button>
        <button
          onClick={() => toggleLayer('ships')}
          aria-pressed={showShips}
          className={`min-h-[44px] px-2 py-1 rounded text-[10px] font-medium border backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-cyan-400 ${
            showShips ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30' : 'bg-black/60 text-slate-500 border-white/10 hover:text-white'
          }`}
        >
          {showShips ? '● Ships' : '○ Ships'}
        </button>
        <button
          onClick={() => toggleLayer('contacts')}
          aria-pressed={showContacts}
          title="Toggle other corporations' ships (anonymised contacts; identities need an active Fleet Tracking reveal)"
          className={`min-h-[44px] px-2 py-1 rounded text-[10px] font-medium border backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-cyan-400 ${
            showContacts ? 'bg-slate-500/20 text-slate-200 border-slate-400/30' : 'bg-black/60 text-slate-500 border-white/10 hover:text-white'
          }`}
        >
          {showContacts ? '● Contacts' : '○ Contacts'}
        </button>
        <button
          onClick={() => toggleLayer('world')}
          aria-pressed={showWorld}
          disabled={!worldAvailable}
          title={worldAvailable ? "Toggle other corporations' colony claims" : 'Sign in to see the live world'}
          className={`min-h-[44px] px-2 py-1 rounded text-[10px] font-medium border backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-cyan-400 disabled:opacity-40 disabled:cursor-not-allowed ${
            worldLayerActive ? 'bg-purple-500/20 text-purple-300 border-purple-500/30' : 'bg-black/60 text-slate-500 border-white/10 hover:text-white'
          }`}
        >
          {worldLayerActive ? '● World' : '○ World'}
        </button>
        {BLOOM_FEATURE_ENABLED && dprHigh && !reduced && (
          <button
            onClick={toggleFx}
            aria-pressed={fxPref}
            title={fxPref ? 'Disable bloom post-processing (quality toggle)' : 'Enable bloom post-processing'}
            className={`min-h-[44px] px-2 py-1 rounded text-[10px] font-medium border backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-cyan-400 ${
              fxPref ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30' : 'bg-black/60 text-slate-500 border-white/10 hover:text-white'
            }`}
          >
            {fxPref ? '● FX' : '○ FX'}
          </button>
        )}
      </div>

      {/* Keyboard-accessible Location List — identical grouping + behavior to
          the 2D canvas overlay (wave-8 list drives selection in both modes). */}
      <div className="hud-frame absolute bottom-2 left-2 z-20 rounded-xl border border-white/[0.06] bg-[#050510]/90 backdrop-blur-sm w-[min(92vw,380px)]">
        <span className="hud-corner-bl" aria-hidden="true" />
        <span className="hud-corner-br" aria-hidden="true" />
        <button
          type="button"
          onClick={() => setListExpanded(v => !v)}
          aria-expanded={listExpanded}
          aria-controls="solar-map-3d-location-list"
          className="w-full flex items-center justify-between gap-2 px-3 py-2.5 min-h-[44px] text-left rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-400"
        >
          <span className="font-hud text-xs font-semibold text-white flex items-center gap-2">
            <GameIcon name="scroll" size={14} /> Location List
            <span className="text-slate-500 font-normal text-[10px] hidden sm:inline">— keyboard-accessible alternative to the map</span>
          </span>
          <span aria-hidden="true" className={`text-slate-400 transition-transform ${listExpanded ? 'rotate-180' : ''}`}>▾</span>
        </button>
        {listExpanded && (
          <div id="solar-map-3d-location-list" className="px-3 pb-3 space-y-3 max-h-[50vh] overflow-y-auto">
            {LOCATIONS_BY_REGION.map(({ type, locations }) => (
              <div key={type}>
                <h4 className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-1.5">
                  {REGION_LABELS[type] || type}
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5" role="group" aria-label={`${REGION_LABELS[type] || type} locations`}>
                  {locations.map(loc => {
                    const unlocked = unlockedSet.has(loc.id);
                    const isSelected = selectedLoc === loc.id;
                    const standing = standingByLoc[loc.id];
                    const hasWarning = warningLocs.has(loc.id);
                    const modeVis = modeVisuals[loc.id];
                    const localBodyId = localBodyForLocation(loc.id);
                    return (
                      <div key={loc.id} className="flex items-stretch gap-1 min-w-0">
                      <button
                        type="button"
                        onClick={() => selectLocation(loc.id, undefined, { toggle: false, focus: true })}
                        // Wave A2 — keyboard/right-click route into the radial
                        // command menu, anchored on this row.
                        onContextMenu={e => { e.preventDefault(); selectLocation(loc.id, anchorForElement(e.currentTarget)); }}
                        onKeyDown={e => {
                          if (e.key === 'c' || e.key === 'C' || e.key === 'ContextMenu') {
                            e.preventDefault();
                            selectLocation(loc.id, anchorForElement(e.currentTarget));
                          }
                        }}
                        aria-pressed={isSelected}
                        aria-keyshortcuts="C"
                        className={`flex-1 min-w-0 min-h-[44px] px-2 py-1.5 rounded-lg text-[11px] text-left border transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-400 ${
                          isSelected
                            ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-200'
                            : unlocked
                              ? 'bg-white/[0.03] border-white/[0.08] text-slate-200 hover:bg-white/[0.06]'
                              : 'bg-white/[0.01] border-white/[0.04] text-slate-500 hover:bg-white/[0.03]'
                        }`}
                      >
                        <span className="flex items-center gap-1">
                          <GameIcon name={unlocked ? 'unlock' : 'lock'} size={12} className="text-slate-400" />
                          <span className="truncate">{loc.name}</span>
                          {standing === 'governor' && <GameIcon name="crown" size={12} className="text-amber-300 shrink-0" />}
                          {standing === 'stakeholder' && <GameIcon name="diamond" size={12} className="text-cyan-300 shrink-0" />}
                          {hasWarning && <GameIcon name="warning" size={12} className="text-amber-300 shrink-0" />}
                          {modeVis?.glyph && <span aria-hidden="true" className="text-slate-300 shrink-0">{modeVis.glyph}</span>}
                        </span>
                        <span className="sr-only">
                          {unlocked ? ', unlocked' : ', locked'}{isSelected ? ', currently selected' : ''}
                          {standing === 'governor' ? ', you govern this zone' : standing === 'stakeholder' ? ', zone stakeholder' : ''}
                          {hasWarning ? ', severe hazard forecast next month' : ''}
                          {modeVis ? `, ${modeVis.srText}` : ''}
                          {slotRingByLoc[loc.id] ? `. ${slotRingByLoc[loc.id].srText}` : ''}
                          {localBodyId && localBody === localBodyId ? `. ${localModel?.srText ?? ''}` : ''}
                          . Press C for the command menu.
                        </span>
                      </button>
                        {/* Flight mode (part a): the screen-reader / keyboard
                            path into and out of a body's local view. */}
                        {localBodyId && (
                          <button
                            type="button"
                            onClick={() => {
                              playSound('click');
                              const loc = ORBITAL_BODY_MAP.get(localBodyId)?.locationId;
                              if (!loc) return;
                              if (localBody === localBodyId) flyOut();
                              else flyTo(loc, 'local');
                            }}
                            aria-pressed={localBody === localBodyId}
                            aria-label={`${localBody === localBodyId ? 'Leave' : 'Enter'} the local view of ${bodyName(localBodyId)}`}
                            title={localBody === localBodyId ? 'Back to the system view' : `Local view: ${bodyName(localBodyId)} with its moons, orbital shells, slots, your satellites and ships`}
                            className={`min-h-[44px] w-8 shrink-0 flex items-center justify-center rounded-lg text-[12px] font-semibold border transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-400 ${
                              localBody === localBodyId ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-200' : 'bg-white/[0.02] border-white/[0.08] text-slate-400 hover:text-white'
                            }`}
                          >
                            <span aria-hidden="true">{localBody === localBodyId ? '◉' : '○'}</span>
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {(shipsInTransit > 0 || (showContacts && contacts.length > 0)) && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-10 pointer-events-none flex gap-1.5">
          {shipsInTransit > 0 && <DataChip icon="ship-transport" tone="good">{shipsInTransit} in transit</DataChip>}
          {showContacts && contacts.length > 0 && (
            <DataChip icon="target">{contacts.length} contact{contacts.length === 1 ? '' : 's'}</DataChip>
          )}
        </div>
      )}

      {/* Flight mode (part a): local-scene hover tag — a slot pip's owner, a
          shell's occupancy, a ship's ETA. Pointer path only; the Location
          List row's screen-reader text carries the same facts. */}
      {localHover && localBody && (
        <div
          role="tooltip"
          className="absolute z-30 pointer-events-none max-w-[260px] rounded-lg border border-white/[0.14] bg-[#050510]/95 px-2.5 py-1.5 text-[11px] leading-snug text-slate-100 shadow-lg backdrop-blur-sm"
          style={{ left: Math.max(4, localHover.x + 12), top: Math.max(4, localHover.y - 8) }}
        >
          <div className="font-hud font-semibold text-cyan-200">{localHover.title}</div>
          {localHover.detail && <div className="text-slate-400">{localHover.detail}</div>}
        </div>
      )}
      {localModel && (
        <p className="sr-only" role="status" aria-live="polite">{localModel.srText} Scroll out or press Escape to return to the system.</p>
      )}

      {/* Ship traffic: hover/tap tag. Screen readers get the same text from
          the contact list below; this is the pointer path only. */}
      {contactHover && showContacts && (
        <div
          role="tooltip"
          className="absolute z-30 pointer-events-none max-w-[240px] rounded-lg border border-white/[0.14] bg-[#050510]/95 px-2.5 py-1.5 text-[11px] leading-snug text-slate-100 shadow-lg backdrop-blur-sm"
          style={{ left: Math.max(4, contactHover.x + 12), top: Math.max(4, contactHover.y - 8) }}
        >
          <div className="font-hud font-semibold text-cyan-200">{contactLabel(contactHover.contact)}</div>
          <div className="text-slate-400">{contactDetail(contactHover.contact, Date.now(), contactsAsOfMs)}</div>
        </div>
      )}
      {showContacts && contacts.length > 0 && (
        <ul className="sr-only" aria-label="Ship contacts near your holdings (other corporations, anonymised unless you hold a fleet reveal)">
          {contacts.slice(0, 40).map(c => <li key={c.id}>{contactLabel(c)}</li>)}
          {contacts.length > 40 && <li>and {contacts.length - 40} more contacts</li>}
        </ul>
      )}

      <p id="solar-map-3d-hint" className="sr-only">
        Click a planet, moon, or orbital marker to open its radial command menu — build, dispatch, demand,
        standing orders and full detail, right at the body. Selecting a body flies the camera to it and into its
        local view: the body with its moons, orbital shells, slots, your satellites and the ships coming and going.
        Scroll out, press Escape, or use the System chip to return to the system view; each Location List row has a
        Local button that does the same. Drag to orbit the camera; arrow keys or W A S D drift the view; scroll, pinch with two
        fingers, or press plus and minus to zoom (R or Home re-frames the current view, G frames the selection). The wheel zooms toward the cursor, so
        pointing at Earth and scrolling spreads the close-packed orbital markers apart for easy picking.
        Camera distance controls how much per-location detail is drawn; the Location List always shows
        everything, and the Labels toggle forces full labels at every zoom.
        Use the Location List overlay (bottom-left) to browse and select every location by keyboard and press
        C on a row for its command menu, or switch to the 2D map with the 2D/3D toggle.
        Number keys jump straight to a body: 1 to 9 and 0 select the ten bodies of the active bank, and the backquote key pages between banks. The Jump legend at the bottom of the map names every binding and is clickable. 
        Current zoom tier: {MAP_ZOOM_TIER_LABEL[zoomTier]}.
      </p>
    </div>
  );
}
