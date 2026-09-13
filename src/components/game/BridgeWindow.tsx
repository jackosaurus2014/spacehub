'use client';

// ─── Bridge window (CC-1) ────────────────────────────────────────────────────
// docs/COMMAND_CENTER_DESIGN_2026-09-13.md §1/§4 — the headquarters' actual
// view: a 2.5D layered plate (far / mid / near from the stage manifest)
// with CSS parallax on pointer move or device tilt, a variant picked from
// the clock (day / dusk / night / sunrise… — whatever the manifest offers),
// a cross-fade when the variant changes, and manifest-declared actors
// (plume, padlights, weather, vehicle…) anchored by their normalized boxes
// and driven by bridge-events.ts triggers.
//
// Everything here is decoration: the whole window is aria-hidden and a
// visually hidden one-line description sits beside it. Reduced motion
// freezes parallax and actors (static plate, no cross-fade). Only the
// current variant's layers are in the DOM, so nothing else is fetched.
// Styles live in GameStyles.tsx under "BRIDGE WINDOW".

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import type { HqManifest, HqActor, HqLayerFile } from '@/lib/game/hq-manifest';
import { buildSrcSet, pickFile, actorFiles, computeStackOrder } from '@/lib/game/hq-manifest';
import type { BridgeFiredAt } from '@/lib/game/bridge-events';

// ─── Variant selection ───────────────────────────────────────────────────────

/** Hour bands (local hour, may be fractional). `sunrise` wins 05–08 when the
 *  manifest has it; otherwise day 07–17, dusk 17–20 and 05–07, night the
 *  rest. Missing variants fall back down the day → dusk → night → first
 *  ladder so a manifest with a single plate still renders. */
export function pickVariant(available: string[], hour: number): string | null {
  if (available.length === 0) return null;
  const h = ((hour % 24) + 24) % 24;
  const has = (n: string) => available.includes(n);
  const want: string[] = [];
  if (h >= 5 && h < 8 && has('sunrise')) want.push('sunrise');
  if (h >= 7 && h < 17) want.push('day');
  else if ((h >= 17 && h < 20) || (h >= 5 && h < 7)) want.push('dusk');
  else want.push('night');
  for (const w of [...want, 'day', 'dusk', 'night']) if (has(w)) return w;
  return available[0];
}

/** Real UTC hour (fractional) plus the stage's clock offset. */
export function localHour(nowMs: number, offsetHours = 0): number {
  const d = new Date(nowMs);
  const h = d.getUTCHours() + d.getUTCMinutes() / 60 + offsetHours;
  return ((h % 24) + 24) % 24;
}

// ─── Actors ──────────────────────────────────────────────────────────────────

export type ActorMotion = 'plume' | 'lift' | 'lights' | 'fade';

/** How an actor moves when it plays. Known names first, then the trigger
 *  it declares, so a new actor from the art pipeline still gets a sensible
 *  default (fade in/out). */
export function actorMotion(actor: Pick<HqActor, 'name' | 'trigger'>): ActorMotion {
  switch (actor.name) {
    case 'plume': return 'plume';
    case 'vehicle': return 'lift';
    case 'padlights': return 'lights';
    case 'weather': return 'fade';
  }
  switch (actor.trigger) {
    case 'launch': return 'plume';
    case 'build_complete': return 'lights';
    default: return 'fade';
  }
}

/** How long a pulse-driven actor (plume, vehicle lift, padlight flash) plays. */
export const ACTOR_PULSE_MS = 6_000;
/** Cross-fade length when the variant changes. */
export const VARIANT_FADE_MS = 1_400;

// ─── Component ───────────────────────────────────────────────────────────────

export interface BridgeWindowProps {
  manifest: HqManifest;
  /** Local hour 0–24 (fractional ok). Omit to follow the real clock. */
  hour?: number;
  /** Added to the UTC hour when `hour` is not given (stage clock offset). */
  clockOffsetHours?: number;
  /** Real-clock ms each trigger last fired (bridge-events.ts). */
  firedAt?: BridgeFiredAt;
  /** Weather actor on. */
  weatherActive?: boolean;
  /** A vehicle sits on the pad (launch-trigger actors other than the plume
   *  are shown at rest). */
  vehicleOnPad?: boolean;
  /** prefers-reduced-motion: static plate, no parallax, no actors in motion. */
  reducedMotion?: boolean;
  /** One line for screen readers (the window itself is aria-hidden). */
  description: string;
  /** Overlays rendered OUTSIDE the aria-hidden plate (chips, buttons). */
  children?: ReactNode;
  className?: string;
  style?: CSSProperties;
  /** Test seam for the clock. */
  now?: () => number;
}

interface PlateSize { width: number; height: number; left: number; top: number }

/** Where the horizon should sit in the window (fraction of its height) when
 *  the window is squarer than the plate and the crop has room to choose. */
const HORIZON_TARGET = 0.42;

/** Cover-fit the plate (× overscan) to the window, then slide it vertically
 *  so the manifest's horizon lands near HORIZON_TARGET without ever
 *  exposing an edge (the overscan margin is kept on every side). */
export function coverPlate(win: { width: number; height: number }, aspect: [number, number], overscan: number, horizonY: number): PlateSize {
  const ratio = aspect[0] / aspect[1];
  const scale = 1 + overscan;
  const cover = win.width / win.height > ratio
    ? { width: win.width, height: win.width / ratio }
    : { width: win.height * ratio, height: win.height };
  const width = Math.ceil(cover.width * scale);
  const height = Math.ceil(cover.height * scale);
  const mx = (win.width * overscan) / 2;
  const my = (win.height * overscan) / 2;
  const left = Math.round((win.width - width) / 2);
  const wanted = win.height * HORIZON_TARGET - height * horizonY;
  const minTop = win.height - height + my;
  const maxTop = -my;
  const top = minTop <= maxTop ? Math.round(Math.max(minTop, Math.min(maxTop, wanted))) : Math.round((win.height - height) / 2);
  return { width, height, left: Math.min(-mx, left), top };
}

export default function BridgeWindow({
  manifest, hour, clockOffsetHours = 0, firedAt, weatherActive = false, vehicleOnPad = false,
  reducedMotion = false, description, children, className = '', style, now = Date.now,
}: BridgeWindowProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const variantNames = useMemo(() => Object.keys(manifest.variants), [manifest]);

  // ── clock → variant ──
  const [clockHour, setClockHour] = useState(() => localHour(now(), clockOffsetHours));
  useEffect(() => {
    if (hour !== undefined) return;
    setClockHour(localHour(now(), clockOffsetHours));
    const id = setInterval(() => setClockHour(localHour(now(), clockOffsetHours)), 60_000);
    return () => clearInterval(id);
  }, [hour, clockOffsetHours, now]);
  const effectiveHour = hour ?? clockHour;
  const variantName = pickVariant(variantNames, effectiveHour);

  // ── cross-fade: keep the outgoing variant on top while it fades ──
  const [fade, setFade] = useState<{ from: string; to: string } | null>(null);
  const lastVariantRef = useRef<string | null>(variantName);
  useEffect(() => {
    const prev = lastVariantRef.current;
    lastVariantRef.current = variantName;
    if (!prev || !variantName || prev === variantName || reducedMotion) return;
    setFade({ from: prev, to: variantName });
    const id = setTimeout(() => setFade(null), VARIANT_FADE_MS);
    return () => clearTimeout(id);
  }, [variantName, reducedMotion]);

  // ── cover sizing: each plate is the manifest aspect, scaled to cover the
  //    window × (1 + overscan) so parallax never reveals an edge ──
  const [size, setSize] = useState<PlateSize | null>(null);
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const measure = () => {
      const w = el.clientWidth, h = el.clientHeight;
      if (!w || !h) return;
      const next = coverPlate({ width: w, height: h }, manifest.aspect, manifest.composition.overscan, manifest.composition.horizonY);
      setSize(prev => (prev && prev.width === next.width && prev.height === next.height && prev.left === next.left && prev.top === next.top) ? prev : next);
    };
    measure();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null;
    ro?.observe(el);
    window.addEventListener('resize', measure);
    return () => { ro?.disconnect(); window.removeEventListener('resize', measure); };
  }, [manifest]);

  // ── parallax: pointer (and device tilt on coarse pointers) → CSS vars ──
  const setOffset = useCallback((nx: number, ny: number) => {
    const el = rootRef.current;
    if (!el) return;
    el.style.setProperty('--hq-nx', String(Math.max(-1, Math.min(1, nx)).toFixed(3)));
    el.style.setProperty('--hq-ny', String(Math.max(-1, Math.min(1, ny)).toFixed(3)));
  }, []);
  useEffect(() => {
    if (reducedMotion) { setOffset(0, 0); return; }
    const el = rootRef.current;
    if (!el) return;
    let raf = 0;
    const onMove = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return;
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height) return;
      const nx = ((e.clientX - r.left) / r.width) * 2 - 1;
      const ny = ((e.clientY - r.top) / r.height) * 2 - 1;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => setOffset(nx, ny));
    };
    const onLeave = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(() => setOffset(0, 0)); };
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerleave', onLeave);
    // Device tilt: only on coarse pointers (phones/tablets), and only when
    // the platform exposes orientation without a permission prompt.
    let tiltOn = false;
    const onTilt = (e: DeviceOrientationEvent) => {
      if (typeof e.gamma !== 'number' || typeof e.beta !== 'number') return;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => setOffset(e.gamma! / 25, (e.beta! - 45) / 30));
    };
    try {
      const coarse = typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches;
      const DOE = (window as unknown as { DeviceOrientationEvent?: { requestPermission?: unknown } }).DeviceOrientationEvent;
      if (coarse && DOE && typeof DOE.requestPermission !== 'function') {
        window.addEventListener('deviceorientation', onTilt);
        tiltOn = true;
      }
    } catch { /* no tilt */ }
    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerleave', onLeave);
      if (tiltOn) window.removeEventListener('deviceorientation', onTilt);
    };
  }, [reducedMotion, setOffset]);

  // ── pulse expiry: re-render once the newest pulse has played out ──
  const [, setPulseTick] = useState(0);
  const newestPulse = useMemo(() => Math.max(0, ...Object.values(firedAt ?? {}).map(v => v ?? 0)), [firedAt]);
  useEffect(() => {
    if (!newestPulse) return;
    const remaining = newestPulse + ACTOR_PULSE_MS - now();
    if (remaining <= 0) return;
    const id = setTimeout(() => setPulseTick(t => t + 1), remaining + 50);
    return () => clearTimeout(id);
  }, [newestPulse, now]);

  const nowMs = now();
  const preferWidth = typeof window !== 'undefined' ? Math.round((size?.width ?? window.innerWidth) * (window.devicePixelRatio || 1)) : 1280;
  const overscanHalfPct = (manifest.composition.overscan / 2) * 100;

  const plateStyle: CSSProperties = size
    ? { width: size.width, height: size.height, left: size.left, top: size.top, transform: 'none' }
    : { minWidth: `${100 * (1 + manifest.composition.overscan)}%`, minHeight: `${100 * (1 + manifest.composition.overscan)}%`, aspectRatio: `${manifest.aspect[0]} / ${manifest.aspect[1]}` };
  const stack = useMemo(() => computeStackOrder(manifest), [manifest]);

  const renderLayerImg = (files: Record<string, HqLayerFile>, parallax: number, key: string, priority: boolean) => {
    const file = pickFile(files, preferWidth);
    if (!file) return null;
    return (
      <img
        key={key}
        className="hq-layer"
        src={`${manifest.baseUrl}${file.file}`}
        srcSet={buildSrcSet(manifest.baseUrl, files)}
        sizes="100vw"
        alt=""
        draggable={false}
        decoding="async"
        loading={priority ? 'eager' : 'lazy'}
        fetchPriority={priority ? 'high' : 'auto'}
        style={{ '--hq-p': parallax, '--hq-shift': `${overscanHalfPct}%` } as CSSProperties}
      />
    );
  };

  /** Actor visibility + motion state for the current tick. */
  const actorState = (actor: HqActor) => {
    const motion = actorMotion(actor);
    const fired = firedAt?.[actor.trigger as keyof BridgeFiredAt] ?? 0;
    const pulsing = fired > 0 && nowMs - fired < ACTOR_PULSE_MS && !reducedMotion;
    const lights = variantName ? Math.max(0, Math.min(1, manifest.variants[variantName]?.lights ?? 0)) : 0;
    let mounted = false;
    let base = 1;
    if (motion === 'lights') { mounted = lights > 0 || pulsing; base = lights; }
    else if (actor.idle) { mounted = true; }
    else if (motion === 'lift') { mounted = vehicleOnPad || pulsing; }
    else if (actor.trigger === 'weather') { mounted = weatherActive; }
    else { mounted = pulsing; }
    return { motion, mounted, pulsing, base, fired };
  };

  const renderActor = (actor: HqActor, parallax: number) => {
    const s = actorState(actor);
    if (!s.mounted) return null;
    const files = actorFiles(actor, variantName);
    const file = pickFile(files, Math.round(preferWidth * actor.anchor.w));
    if (!file) return null;
    const a = actor.anchor;
    return (
      <div
        key={`${actor.name}-${s.pulsing ? s.fired : 'rest'}`}
        className="hq-actor"
        data-actor={actor.name}
        data-trigger={actor.trigger}
        data-motion={s.motion}
        data-active={s.pulsing ? 'true' : 'false'}
        style={{
          left: `${a.x * 100}%`, top: `${a.y * 100}%`, width: `${a.w * 100}%`, height: `${a.h * 100}%`,
          mixBlendMode: actor.blend === 'screen' ? 'screen' : 'normal',
          '--hq-p': parallax, '--hq-shift': `${overscanHalfPct}%`, '--hq-actor-base': s.base,
        } as CSSProperties}
      >
        <img
          src={`${manifest.baseUrl}${file.file}`}
          srcSet={buildSrcSet(manifest.baseUrl, files)}
          sizes={`${Math.round(a.w * 100)}vw`}
          alt=""
          draggable={false}
          decoding="async"
        />
      </div>
    );
  };

  /** One full plate (layers and actors in the manifest's composite order,
   *  hq-manifest.ts computeStackOrder) for a variant. Actors only mount on
   *  the live plate. */
  const renderPlate = (name: string, live: boolean, extraClass: string) => {
    const variant = manifest.variants[name];
    if (!variant) return null;
    const nodes: ReactNode[] = [];
    let layerIndex = 0;
    for (const entry of stack) {
      if (entry.kind === 'layer') {
        const files = variant.layers[entry.layer.name];
        if (files) nodes.push(renderLayerImg(files, entry.layer.parallax, `${name}-${entry.layer.name}`, layerIndex < 2));
        layerIndex++;
      } else if (live) {
        nodes.push(renderActor(entry.actor, entry.parallax));
      }
    }
    return (
      <div key={name} className={`hq-plate ${extraClass}`} data-variant={name} style={plateStyle}>
        {nodes}
      </div>
    );
  };

  return (
    <div className={`hq-window ${className}`} style={style} data-reduced={reducedMotion ? 'true' : 'false'}>
      <p className="sr-only">{description}</p>
      <div ref={rootRef} className="hq-window-plates" aria-hidden="true" data-variant={variantName ?? ''}>
        {variantName && renderPlate(variantName, true, 'hq-plate-live')}
        {fade && fade.from !== variantName && renderPlate(fade.from, false, 'hq-plate-out')}
        <div className="hq-window-vignette" />
      </div>
      {children}
    </div>
  );
}
