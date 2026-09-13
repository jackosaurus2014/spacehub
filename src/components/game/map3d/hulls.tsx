'use client';

// ─── Hull models + facility silhouettes (graphics review item 7) ────────────
// Ships on the solar map are hull silhouettes: four low-poly glTF hulls from
// art/blender/ships.py (public/game/models/hull-*.glb, ≤ 11 KB each) sharing
// one 512 px atlas (albedo over emissive). This module owns the loading
// (drei useGLTF — inside the SolarMap3D dynamic chunk, never the page
// chunk), the shared material, and the instanced leaf meshes the layers
// fill each frame. It never creates a WebGL context and never mounts a
// second Canvas: every mesh here is a child of the one solar Canvas.
//
// Draw groups (lib/game/map-hulls.ts batchHullInstances): one instanced
// mesh per hull model for YOUR ships and REVEALED contacts; anonymised
// contacts keep the dim generic marker (their class is intelligence the
// viewer has not earned); NPC backdrop keeps its faction slab; revealed
// contacts also get the corp-coloured ring. Thousands of instances cost
// four draw calls. Local scenes reuse the same leaves at body scale, and
// the two facility meshes (satellite bus with panels, station ring)
// replace the old sphere glints on the orbital shells.

import { useMemo, useEffect, useState, Suspense, type ReactNode } from 'react';
import * as THREE from 'three';
import { useGLTF } from '@react-three/drei';
import type { ThreeEvent } from '@react-three/fiber';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { HULL_MODEL_URL, HULL_ATLAS_URL, HULL_ATLAS_EMISSIVE_OFFSET_V, type HullModelId } from '@/lib/game/map-hulls';

// ── Capacity + colour buffers (shared by every instanced layer) ─────────────

export const INSTANCE_CAPACITY_STEP = 256;

/** Allocate instance buffers in steps so a feed that grows by one contact
 *  does not rebuild them. */
export function instanceCapacity(n: number, cap = 5000): number {
  return Math.max(INSTANCE_CAPACITY_STEP, Math.ceil(Math.min(n, cap) / INSTANCE_CAPACITY_STEP) * INSTANCE_CAPACITY_STEP);
}

export function ensureInstanceColor(mesh: THREE.InstancedMesh, capacity: number): THREE.InstancedBufferAttribute {
  if (!mesh.instanceColor || mesh.instanceColor.count < capacity) {
    mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(capacity * 3), 3);
  }
  return mesh.instanceColor;
}

/** Paint per-instance colours (once per list change, never per frame). */
export function paintInstances<T>(mesh: THREE.InstancedMesh | null, list: readonly T[], capacity: number, pick: (item: T, tmp: THREE.Color) => THREE.Color): void {
  if (!mesh) return;
  const attr = ensureInstanceColor(mesh, capacity);
  const tmp = new THREE.Color();
  list.forEach((item, i) => { const c = pick(item, tmp); attr.setXYZ(i, c.r, c.g, c.b); });
  attr.needsUpdate = true;
}

// ── Atlas (one texture, two views) ──────────────────────────────────────────

interface HullAtlas { map: THREE.Texture; emissiveMap: THREE.Texture }

let atlasCache: HullAtlas | null = null;
let atlasPromise: Promise<HullAtlas | null> | null = null;

function loadHullAtlas(): Promise<HullAtlas | null> {
  if (atlasCache) return Promise.resolve(atlasCache);
  if (atlasPromise) return atlasPromise;
  atlasPromise = new Promise(resolve => {
    new THREE.TextureLoader().load(
      HULL_ATLAS_URL,
      tex => {
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.flipY = false; // glTF UV convention (v runs top-down)
        tex.anisotropy = 4;
        tex.wrapS = THREE.ClampToEdgeWrapping;
        tex.wrapT = THREE.ClampToEdgeWrapping;
        tex.needsUpdate = true;
        const emissive = tex.clone();
        emissive.offset.set(0, HULL_ATLAS_EMISSIVE_OFFSET_V);
        emissive.needsUpdate = true;
        atlasCache = { map: tex, emissiveMap: emissive };
        resolve(atlasCache);
      },
      undefined,
      () => resolve(null), // 404 → untextured hulls (still silhouettes)
    );
  });
  return atlasPromise;
}

export function useHullAtlas(): HullAtlas | null {
  const [atlas, setAtlas] = useState<HullAtlas | null>(atlasCache);
  useEffect(() => {
    let live = true;
    loadHullAtlas().then(a => { if (live && a) setAtlas(a); });
    return () => { live = false; };
  }, []);
  return atlas;
}

/** Flat-shaded standard material: the atlas albedo × per-instance tint,
 *  plus the atlas emissive (engine glow, window strips) so hulls stay
 *  readable on their night side. One material per opacity. */
export function useHullMaterial(opacity = 1): THREE.MeshStandardMaterial {
  const atlas = useHullAtlas();
  const mat = useMemo(() => new THREE.MeshStandardMaterial({
    color: '#ffffff',
    roughness: 0.62,
    metalness: 0.08,
    flatShading: true,
    emissive: '#ffffff',
    emissiveIntensity: 1.25,
    transparent: opacity < 1,
    opacity,
    depthWrite: opacity >= 1,
  }), [opacity]);
  useEffect(() => {
    mat.map = atlas?.map ?? null;
    mat.emissiveMap = atlas?.emissiveMap ?? null;
    if (!atlas) mat.emissiveIntensity = 0;
    else mat.emissiveIntensity = 1.25;
    mat.needsUpdate = true;
  }, [mat, atlas]);
  useEffect(() => () => mat.dispose(), [mat]);
  return mat;
}

// ── Geometry ────────────────────────────────────────────────────────────────

/** The hull's single indexed geometry (positions + uv). Normals are not in
 *  the file (flat shading derives them); a vertex-normal pass keeps the
 *  attribute present for the standard material's vertex stage. */
export function useHullGeometry(model: HullModelId): THREE.BufferGeometry {
  const gltf = useGLTF(HULL_MODEL_URL[model], false, false);
  return useMemo(() => {
    let geo: THREE.BufferGeometry | null = null;
    gltf.scene.traverse(o => { if (!geo && (o as THREE.Mesh).isMesh) geo = (o as THREE.Mesh).geometry; });
    const g = (geo ?? new THREE.BufferGeometry()) as THREE.BufferGeometry;
    if (!g.attributes.normal && g.attributes.position) g.computeVertexNormals();
    return g;
  }, [gltf]);
}

export function preloadHulls(): void {
  for (const url of Object.values(HULL_MODEL_URL)) useGLTF.preload(url, false, false);
}

// Facility silhouettes for local-scene shells (item 7): a satellite bus
// with two panel wings and a station ring with a hub. Unit-sized (about 1
// across), scaled by the shell per instance. Built once, shared.
let busGeo: THREE.BufferGeometry | null = null;
let stationGeo: THREE.BufferGeometry | null = null;

export function satelliteBusGeometry(): THREE.BufferGeometry {
  if (busGeo) return busGeo;
  const body = new THREE.BoxGeometry(0.28, 0.28, 0.42);
  const panelL = new THREE.BoxGeometry(0.9, 0.03, 0.34).translate(-0.6, 0, 0);
  const panelR = new THREE.BoxGeometry(0.9, 0.03, 0.34).translate(0.6, 0, 0);
  busGeo = mergeGeometries([body, panelL, panelR], false) ?? body;
  return busGeo;
}

export function stationRingGeometry(): THREE.BufferGeometry {
  if (stationGeo) return stationGeo;
  const ring = new THREE.TorusGeometry(0.5, 0.09, 6, 18).rotateX(Math.PI / 2);
  const hub = new THREE.CylinderGeometry(0.12, 0.12, 0.5, 8);
  const spoke = new THREE.BoxGeometry(1.0, 0.05, 0.05);
  stationGeo = mergeGeometries([ring, hub, spoke], false) ?? ring;
  return stationGeo;
}

// ── Leaf meshes ─────────────────────────────────────────────────────────────

type RaycastFn = (raycaster: THREE.Raycaster, intersects: THREE.Intersection[]) => void;

export interface InstancedLeafEvents {
  raycast?: RaycastFn;
  onPointerOver?: (e: ThreeEvent<PointerEvent>) => void;
  onPointerOut?: (e: ThreeEvent<PointerEvent>) => void;
  onClick?: (e: ThreeEvent<MouseEvent>) => void;
}

const NO_RAYCAST: RaycastFn = () => null;

interface HullMeshProps extends InstancedLeafEvents {
  model: HullModelId;
  capacity: number;
  opacity?: number;
  /** Ref callback — the owning layer fills matrices/colours each frame. */
  register: (mesh: THREE.InstancedMesh | null) => void;
}

function LoadedHullMesh({ model, capacity, opacity = 1, register, raycast, onPointerOver, onPointerOut, onClick }: HullMeshProps) {
  const geometry = useHullGeometry(model);
  const material = useHullMaterial(opacity);
  return (
    <instancedMesh
      ref={register}
      args={[geometry, material, capacity]}
      frustumCulled={false}
      raycast={raycast ?? NO_RAYCAST}
      onPointerOver={onPointerOver}
      onPointerOut={onPointerOut}
      onClick={onClick}
    />
  );
}

/** The generic marker: a dim octahedron, the anonymised-contact shape, and
 *  the stand-in while a hull file streams in. */
export function MarkerMesh({ capacity, radius, opacity = 0.8, register, raycast, onPointerOver, onPointerOut, onClick }: InstancedLeafEvents & { capacity: number; radius: number; opacity?: number; register: (mesh: THREE.InstancedMesh | null) => void }) {
  return (
    <instancedMesh
      ref={register}
      args={[undefined, undefined, capacity]}
      frustumCulled={false}
      raycast={raycast ?? NO_RAYCAST}
      onPointerOver={onPointerOver}
      onPointerOut={onPointerOut}
      onClick={onClick}
    >
      <octahedronGeometry args={[radius, 0]} />
      <meshBasicMaterial transparent opacity={opacity} depthWrite={false} toneMapped={false} />
    </instancedMesh>
  );
}

/** NPC backdrop slab (a different SHAPE, so NPC vs player never rests on
 *  colour alone). */
export function SlabMesh({ capacity, size, opacity = 0.55, register, raycast, onPointerOver, onPointerOut, onClick }: InstancedLeafEvents & { capacity: number; size: number; opacity?: number; register: (mesh: THREE.InstancedMesh | null) => void }) {
  return (
    <instancedMesh
      ref={register}
      args={[undefined, undefined, capacity]}
      frustumCulled={false}
      raycast={raycast ?? NO_RAYCAST}
      onPointerOver={onPointerOver}
      onPointerOut={onPointerOut}
      onClick={onClick}
    >
      <boxGeometry args={[size * 0.44, size, size * 0.44]} />
      <meshBasicMaterial transparent opacity={opacity} depthWrite={false} toneMapped={false} />
    </instancedMesh>
  );
}

/** Corp-coloured ring under every revealed contact (shape, not just colour). */
export function RingMesh({ capacity, radius, register }: { capacity: number; radius: number; register: (mesh: THREE.InstancedMesh | null) => void }) {
  return (
    <instancedMesh ref={register} args={[undefined, undefined, capacity]} frustumCulled={false} raycast={NO_RAYCAST}>
      <torusGeometry args={[radius, radius * 0.11, 6, 24]} />
      <meshBasicMaterial transparent opacity={0.95} depthWrite={false} toneMapped={false} />
    </instancedMesh>
  );
}

/**
 * One hull model's instanced mesh. Suspends on the glb (drei useGLTF) with
 * the generic marker as the fallback, registered under the SAME callback,
 * so the owning layer's per-frame fill works on whichever leaf is mounted.
 * Hull length is 1.0 (nose +Y); `markerRadius` sizes the fallback.
 */
export function HullInstances(props: HullMeshProps & { markerRadius: number }) {
  const { markerRadius, ...rest } = props;
  return (
    <Suspense fallback={<MarkerMesh capacity={rest.capacity} radius={markerRadius} opacity={rest.opacity ?? 0.9} register={rest.register} raycast={rest.raycast} onPointerOver={rest.onPointerOver} onPointerOut={rest.onPointerOut} onClick={rest.onClick} />}>
      <LoadedHullMesh {...rest} />
    </Suspense>
  );
}

/** Facility leaf: satellite buses (yours bright / others dim) or station rings. */
export function FacilityMesh({ kind, capacity, color, opacity = 1, register, children }: { kind: 'satellite' | 'station'; capacity: number; color: string; opacity?: number; register: (mesh: THREE.InstancedMesh | null) => void; children?: ReactNode }) {
  const geometry = useMemo(() => (kind === 'satellite' ? satelliteBusGeometry() : stationRingGeometry()), [kind]);
  return (
    <instancedMesh ref={register} args={[geometry, undefined, capacity]} frustumCulled={false} raycast={NO_RAYCAST}>
      <meshBasicMaterial color={color} transparent={opacity < 1} opacity={opacity} toneMapped={false} />
      {children}
    </instancedMesh>
  );
}
