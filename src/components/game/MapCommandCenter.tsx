'use client';

// ─── Map Command Center (Wave 9 — map-first command interface) ─────────────
// The full-viewport orchestrator for the 'map' tab. Replaces the old
// scroll-in-a-card SolarSystemCanvas usage with a command view: canvas fills
// all available height, HUD panels float over it (Order Queue strip top-
// left, layer toggle top-center, context panel right/bottom-sheet). All
// gameplay logic is delegated to the existing engine-wired handlers passed
// down from space-tycoon/page.tsx — this component only manages which
// location/system is selected and which layer (solar/galactic) is showing.

import { useState, useCallback, useEffect, useMemo, useRef, useLayoutEffect } from 'react';
import dynamic from 'next/dynamic';
import type { GameState, GameTab } from '@/lib/game/types';
import type { ExpeditionPlanRequest } from '@/lib/game/expeditions';
import SolarSystemCanvas from './SolarSystemCanvas';
import GalacticMapView from './GalacticMapView';

// WebGL renderer (4X wave W7) — loaded on demand so three.js lands in an
// async chunk that mobile / reduced-motion / no-WebGL users never download.
const SolarMap3D = dynamic(() => import('./SolarMap3D'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-[#020208]">
      <span className="text-cyan-300/70 text-xs font-hud animate-pulse">Initializing orbital view…</span>
    </div>
  ),
});
import OrderQueueHUD, { type OrderQueueTarget } from './OrderQueueHUD';
import MapContextPanel, { type MapSelection, type MapContextView } from './MapContextPanel';
import RadialCommandMenu, { type RadialMenuItem } from './map/RadialCommandMenu';
import {
  deriveRadialActions,
  deriveSystemRadialActions,
  type RadialActionId,
  type SystemRadialActionId,
} from '@/lib/game/map-radial';
import { LOCATION_MAP } from '@/lib/game/solar-system';
import { consumeSubViewRequest, requestSubView } from '@/lib/game/sub-view';
import { INTERSTELLAR_SYSTEM_MAP } from '@/lib/game/interstellar';
import { MAP_ZOOM_TIER_LABEL, type MapZoomTier } from '@/lib/game/map-zoom';
import { SLOT_SEGMENT_STYLE } from '@/lib/game/map-bodies';
import GlobalActivityFeed from './GlobalActivityFeed';
import SpatialStrategyPanel from './SpatialStrategyPanel';
import { playSound } from '@/lib/game/sound-engine';
import { THREE_D_ENABLED } from '@/lib/three-runtime';
import { updateMusicMood } from '@/lib/game/music-engine';
import { isFoldedFeatureUnlocked } from '@/lib/game/corporation-tiers';
import { MAP_MODES, MAP_MODE_MAP, cycleMapMode, type MapMode } from '@/lib/game/map-modes';
import {
  SOLAR_HOTKEY_ENTRIES,
  GALACTIC_HOTKEY_ENTRIES,
  BANK_CYCLE_KEY,
  bankCount,
  clampBank,
  cycleBank,
  entriesForBank,
  isBankCycleEvent,
  resolveSlot,
  slotFromKeyEvent,
  describeBinding,
  type HotkeyEntry,
} from '@/lib/game/map-hotkeys';
import GameIcon from './GameIcon';

type Layer = 'solar' | 'galactic';

// ── 3D renderer gating (4X W7) ──────────────────────────────────────────────
// The WebGL map is the DEFAULT on capable desktops; the 2D canvas remains the
// renderer for mobile/small viewports, prefers-reduced-motion, missing WebGL2
// (three r163+ requires WebGL2), and anyone who toggles it off. The user's
// choice persists in localStorage.

const MAP_RENDERER_KEY = 'tycoon-map-renderer'; // '3d' | '2d'
/** Wave A2 — "Labels: Always" accessibility override for the zoom-based
 *  information layering. '1' = every label/badge at every zoom. */
const MAP_LABELS_KEY = 'tycoon-map-labels-always';

function detectWebGL2(): boolean {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2');
    return !!gl;
  } catch {
    return false;
  }
}

/** Environment capability — NOT user preference. Re-evaluated on resize and
 *  reduced-motion changes so the map degrades live, never breaks. */
function use3DCapable(): boolean {
  const [capable, setCapable] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const evaluate = () => {
      setCapable(window.innerWidth >= 768 && !mq.matches && detectWebGL2());
    };
    evaluate();
    window.addEventListener('resize', evaluate);
    mq.addEventListener('change', evaluate);
    return () => {
      window.removeEventListener('resize', evaluate);
      mq.removeEventListener('change', evaluate);
    };
  }, []);
  return capable;
}

interface MapCommandCenterProps {
  state: GameState;
  onUnlock: (locId: string) => void;
  /** Colony-slot claim fix (2026-09-03): a deliberate, presence-gated action
   *  distinct from onUnlock — see MapContextPanel.tsx's Claim Colony Slot
   *  affordance and space-tycoon/page.tsx's handleClaimColony. */
  onClaimColony: (locId: string) => void;
  onBuild: (buildingId: string, locationId: string) => void;
  onSellBuilding: (instanceId: string) => void;
  /** Wave M2 (docs/MEANINGFUL_2026-08.md §M2): mothball (pause) / reactivate
   *  a completed building from the map's Build sub-panel. */
  onMothballBuilding?: (instanceId: string) => void;
  /** Damage-visibility wave (2026-08-31): rush-repair from the map's context
   *  panel — the natural place to click a damaged satellite. */
  onRushRepairBuilding?: (instanceId: string) => void;
  onReactivateBuilding?: (instanceId: string) => void;
  /** D4: start a Mark-II/III refit from the map's Build sub-panel. */
  onMarkUpgradeBuilding?: (instanceId: string) => void;
  /** W14 (cargo logistics): optional manifest — dispatch debits it at the
   *  origin and the tick engine credits the destination on arrival. */
  onDispatchShip: (shipInstanceId: string, toLocationId: string, cargo?: Record<string, number>) => void;
  onLaunchExpedition: (req: ExpeditionPlanRequest) => void;
  onNavigateTab: (tab: GameTab) => void;
  /** Drives the shell's region backdrop tint + ambient sound, same contract
   *  SolarSystemCanvas's onSelectLocation always had. */
  onRegionFocus: (locId: string | null) => void;
  /** Wave V3 (docs/VISUAL_DEPTH_2026-08.md §V3): an external deep-link
   *  request — the Outliner's rows call this via page.tsx (setTab('map') +
   *  this) instead of a new selection mechanic. `token` is a monotonic
   *  nonce (Date.now() at request time) so requesting the SAME location
   *  twice in a row while already on the map tab still re-triggers the
   *  selection effect below (a plain value-equality prop wouldn't). */
  focusRequest?: { target: OrderQueueTarget; token: number } | null;
  /** Wave V4 (map-as-stage): true while a desktop panel overlay fully covers
   *  the mounted map. Both renderers freeze (no rAF / frameloop 'never' —
   *  retained framebuffer only) and the map's keyboard shortcuts go quiet
   *  so they can't fire under the overlay. */
  covered?: boolean;
}

export default function MapCommandCenter({
  state, onUnlock, onClaimColony, onBuild, onSellBuilding, onMothballBuilding, onReactivateBuilding, onRushRepairBuilding, onMarkUpgradeBuilding, onDispatchShip, onLaunchExpedition, onNavigateTab, onRegionFocus, focusRequest, covered = false,
}: MapCommandCenterProps) {
  const [layer, setLayer] = useState<Layer>('solar');
  const [selection, setSelection] = useState<MapSelection | null>(null);
  const [showActivity, setShowActivity] = useState(false);

  // ── Wave A2: map as command theater ───────────────────────────────────────
  // Selecting a body no longer *implies* the side panel. A map click puts the
  // verbs at the body (radial command menu, Sins-style); the panel opens from
  // the menu's Detail/Build/Dispatch actions, from the Location List (Enter),
  // from Order-Queue chips, and from Outliner deep-links — every keyboard and
  // deep-link path still lands straight in the panel.
  // Wave A4: the arc now serves BOTH layers. The solar action set is
  // location-shaped and the galactic one is system-shaped (see map-radial.ts),
  // so the target carries its kind and the derivation is chosen from it.
  const [radial, setRadial] = useState<{ kind: 'location' | 'system'; id: string; x: number; y: number } | null>(null);
  const [detail, setDetail] = useState<{ view: MapContextView; token: number } | null>(null);
  const [zoomTier, setZoomTier] = useState<MapZoomTier>('location');
  const [labelsAlways, setLabelsAlways] = useState(false);
  // Flow-map lane-volume layer (GAME_DESIGN_REVIEW_2026-09 §2 row 3): fetched
  // once on first toggle from the 10-min-cached flows endpoint; both solar
  // renderers thicken/recolour the listed lanes and the legend names the top
  // lanes in text (never width or colour alone). Static — reduced-motion safe.
  const [showVolume, setShowVolume] = useState(false);
  const [laneVolumes, setLaneVolumes] = useState<{ map: Record<string, { v: number; n: number }>; top: string[]; windowDays: number } | null>(null);
  useEffect(() => {
    if (!showVolume || laneVolumes) return;
    let cancelled = false;
    fetch('/api/space-tycoon/market/flows?days=7')
      .then(r => (r.ok ? r.json() : null))
      .then((d: { windowDays?: number; lanes?: { laneKey: string; dispatches: number; fromName: string; toName: string }[] } | null) => {
        if (cancelled) return;
        const lanes = Array.isArray(d?.lanes) ? d.lanes : [];
        const max = lanes[0]?.dispatches || 0;
        const map: Record<string, { v: number; n: number }> = {};
        for (const l of lanes) if (l.dispatches > 0) map[l.laneKey] = { v: max > 0 ? l.dispatches / max : 0, n: l.dispatches };
        setLaneVolumes({ map, top: lanes.slice(0, 4).map(l => `${l.fromName}↔${l.toName} ${Math.round(l.dispatches)}`), windowDays: d?.windowDays || 7 });
      })
      .catch(() => { if (!cancelled) setLaneVolumes({ map: {}, top: [], windowDays: 7 }); });
    return () => { cancelled = true; };
  }, [showVolume, laneVolumes]);
  useEffect(() => {
    try { setLabelsAlways(localStorage.getItem(MAP_LABELS_KEY) === '1'); } catch { /* default off */ }
  }, []);
  const toggleLabelsAlways = useCallback(() => {
    playSound('click');
    setLabelsAlways(prev => {
      const next = !prev;
      try { localStorage.setItem(MAP_LABELS_KEY, next ? '1' : '0'); } catch { /* ignore */ }
      return next;
    });
  }, []);
  // A panel overlay covering the map must not leave a floating arc behind it.
  useEffect(() => { if (covered) setRadial(null); }, [covered]);

  // Wave V4 — map mode ("Stellaris lens"). Pure recolor/re-badge of existing
  // data via map-modes.ts, consumed by BOTH renderers. Keyboard: `M` cycles.
  const [mapMode, setMapMode] = useState<MapMode>('standard');
  const setMode = useCallback((mode: MapMode) => {
    playSound('click');
    setMapMode(mode);
  }, []);
  useEffect(() => {
    if (covered) return; // never steal keys while a panel overlay is up
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key !== 'm' && e.key !== 'M') return;
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable)) return;
      playSound('click');
      setMapMode(prev => cycleMapMode(prev));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [covered]);

  // W12: the galactic layer steers the adaptive score toward the colder
  // interstellar palette (hint is only honored while the map tab is active —
  // see selectMusicMood). Covers both the toggle buttons and the keyboard
  // layer shortcut, since both funnel through `layer`.
  useEffect(() => {
    updateMusicMood(state, { mapLayer: layer });
  }, [layer, state]);

  // 3D/2D renderer selection: environment capability × persisted preference.
  // Starts false (2D) so SSR/first paint never assumes WebGL, then upgrades.
  const capable3D = use3DCapable();
  const [prefer3D, setPrefer3D] = useState(true);
  useEffect(() => {
    try {
      setPrefer3D(localStorage.getItem(MAP_RENDERER_KEY) !== '2d');
    } catch { /* storage unavailable → default 3D on capable hardware */ }
  }, []);
  const use3D = THREE_D_ENABLED && capable3D && prefer3D;
  const toggleRenderer = useCallback(() => {
    playSound('click');
    setPrefer3D(prev => {
      const next = !prev;
      try { localStorage.setItem(MAP_RENDERER_KEY, next ? '3d' : '2d'); } catch { /* ignore */ }
      return next;
    });
  }, []);
  // Audit Wave F §B5: Spatial Strategy (lane traffic, orbital-slot occupancy,
  // chokepoints) folded into the map as a HUD overlay — it's geography, so it
  // belongs here per the map-first mandate. Standalone 'spatial' tab removed.
  const [showSpatial, setShowSpatial] = useState(false);
  const spatialUnlocked = isFoldedFeatureUnlocked(state.corporationTier || 1, 'spatial');

  // PvP Discoverability pass (2026-08): honour a parked `map:slots` sub-view
  // request (sub-view.ts) so a Situation Log row or posture readout that says
  // "GEO is saturated — leases are the only way in" opens the Spatial
  // Strategy overlay it is talking about, rather than dropping the player on
  // a bare map. A request for a tier-locked overlay is ignored.
  useEffect(() => {
    const requested = consumeSubViewRequest('map');
    if (requested === 'slots' && spatialUnlocked) setShowSpatial(true);
  }, [spatialUnlocked]);

  // Explicit measured height. `flex-1` under the shell's `min-h-screen` flex
  // column is unreliable (min-height parents don't guarantee flex-grow space,
  // and the game page sits below variable site chrome), which collapsed the
  // map into a ribbon. Measure our own top edge and take the rest of the
  // viewport, with a floor so tiny landscape phones still get a usable map.
  const rootRef = useRef<HTMLDivElement>(null);
  const [mapHeight, setMapHeight] = useState<number | null>(null);
  // Wave A2 — the radial menu is positioned inside this container, so it needs
  // the container's live size for its near-edge repositioning.
  const [mapWidth, setMapWidth] = useState<number>(0);
  useLayoutEffect(() => {
    const measure = () => {
      const el = rootRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const vh = window.visualViewport?.height ?? window.innerHeight;
      setMapHeight(Math.max(420, Math.floor(vh - rect.top)));
      setMapWidth(Math.floor(rect.width));
    };
    measure();
    window.addEventListener('resize', measure);
    window.visualViewport?.addEventListener('resize', measure);
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null;
    if (rootRef.current) ro?.observe(rootRef.current);
    return () => {
      window.removeEventListener('resize', measure);
      window.visualViewport?.removeEventListener('resize', measure);
      ro?.disconnect();
    };
  }, []);

  /** Solar-layer selection.
   *  `anchor` present  → a map click / context request: select the body and
   *                      open the radial command menu AT it (Wave A2).
   *  `anchor` absent   → keyboard list, Order-Queue chip, Outliner deep-link:
   *                      select and open the full context panel directly. */
  const selectLocation = useCallback((locId: string | null, anchor?: { x: number; y: number }) => {
    setSelection(locId ? { kind: 'location', id: locId } : null);
    onRegionFocus(locId);
    if (!locId) {
      setRadial(null);
      setDetail(null);
      return;
    }
    if (anchor) {
      setDetail(null);
      setRadial({ kind: 'location', id: locId, x: anchor.x, y: anchor.y });
    } else {
      setRadial(null);
      setDetail({ view: 'overview', token: Date.now() });
    }
  }, [onRegionFocus]);

  /** Galactic-layer selection. Mirrors selectLocation's contract exactly:
   *  `anchor` present -> open the command arc AT the node; absent -> open the
   *  full dossier panel (Order-Queue chip, deep-link, transit marker). */
  const selectSystem = useCallback((sysId: string | null, anchor?: { x: number; y: number }) => {
    setSelection(sysId ? { kind: 'system', id: sysId } : null);
    if (!sysId) {
      setRadial(null);
      setDetail(null);
      return;
    }
    if (anchor) {
      setDetail(null);
      setRadial({ kind: 'system', id: sysId, x: anchor.x, y: anchor.y });
    } else {
      setRadial(null);
      setDetail({ view: 'overview', token: Date.now() });
    }
  }, []);

  const handleOrderQueueSelect = useCallback((target: OrderQueueTarget) => {
    if (target.kind === 'system') {
      if (layer !== 'galactic') setLayer('galactic');
      selectSystem(target.id);
    } else {
      if (layer !== 'solar') setLayer('solar');
      selectLocation(target.id);
    }
  }, [layer, selectLocation, selectSystem]);

  /** Radial action → the SAME handlers the context panel and HUD already use.
   *  Nothing here forks business logic; the menu is a faster route to it. */
  const runRadialAction = useCallback((rawId: string) => {
    const target = radial;
    setRadial(null);
    if (!target) return;
    if (target.kind === 'system') {
      switch (rawId as SystemRadialActionId) {
        case 'sys-detail': setDetail({ view: 'overview', token: Date.now() }); break;
        case 'sys-expedition': setDetail({ view: 'plan-expedition', token: Date.now() }); break;
        case 'sys-research': onNavigateTab('research'); break;
        case 'sys-fleet': onNavigateTab('fleet'); break;
        case 'sys-gateway': onNavigateTab('interstellar'); break;
      }
      return;
    }
    const locId = target.id;
    switch (rawId as RadialActionId) {
      case 'detail': setDetail({ view: 'overview', token: Date.now() }); break;
      case 'build': setDetail({ view: 'build', token: Date.now() }); break;
      case 'dispatch': setDetail({ view: 'dispatch', token: Date.now() }); break;
      case 'unlock': onUnlock(locId); setDetail({ view: 'overview', token: Date.now() }); break;
      // PvP Discoverability pass: the demand map lives in Markets →
      // Analytics, which is also where the price-campaign register and
      // declare form live. Before this pass the radial dropped the player on
      // Spot & Orders and the surface it promised was two clicks away.
      case 'demand': requestSubView('market:analytics'); onNavigateTab('market'); break;
      case 'orders': onNavigateTab('fleet'); break;
      case 'slots': setShowSpatial(true); break;
    }
  }, [radial, onUnlock, onNavigateTab]);

  /** Action list + name for whichever target the arc is open on. Order is
   *  stable within each derivation, so the ring never reshuffles. */
  const radialActions: RadialMenuItem[] = useMemo(() => {
    if (!radial) return [];
    return radial.kind === 'system'
      ? deriveSystemRadialActions(state, radial.id)
      : deriveRadialActions(state, radial.id, Date.now());
  }, [radial, state]);
  const radialName = radial
    ? (radial.kind === 'system'
        ? INTERSTELLAR_SYSTEM_MAP.get(radial.id)?.name || radial.id
        : LOCATION_MAP.get(radial.id)?.name || radial.id)
    : '';

  // ── Jump hotkeys (2026-09-04) ─────────────────────────────────────────────
  // `1`-`9` and `0` select the ten bodies of the active bank; `` ` `` pages
  // banks (Shift+`` ` `` pages back). Slots come from map-hotkeys.ts, which is
  // ALSO what the visible legend below renders — one derivation, so the
  // binding a player reads is the binding that fires. Camera reset moved off
  // `0` to `R`/Home in both renderers to free the digit row.
  const hotkeyEntries = layer === 'solar' ? SOLAR_HOTKEY_ENTRIES : GALACTIC_HOTKEY_ENTRIES;
  const hotkeyBanks = bankCount(hotkeyEntries.length);
  const [hotkeyBank, setHotkeyBank] = useState(0);
  const [jumpOpen, setJumpOpen] = useState(false);
  // The layers hold different body counts, so a bank carried across from the
  // solar map can point past the end of the galactic one.
  useEffect(() => { setHotkeyBank(b => clampBank(b, hotkeyEntries.length)); }, [hotkeyEntries]);

  /** Screen-reader announcement for a jump. The map itself is a canvas, so a
   *  keyboard-only player gets no visual confirmation of what they selected —
   *  this is the confirmation. */
  const [jumpNotice, setJumpNotice] = useState('');
  const jumpTo = useCallback((entry: HotkeyEntry) => {
    playSound('click');
    if (layer === 'solar') {
      // A locked body is a legitimate jump target: it opens the unlock panel,
      // exactly as activating a locked Location List row does.
      const locked = !state.unlockedLocations?.includes(entry.id);
      setJumpNotice(`${entry.name} selected${locked ? ', locked — showing unlock requirements' : ''}.`);
      selectLocation(entry.id);
    } else {
      setJumpNotice(`${entry.name} selected.`);
      selectSystem(entry.id);
    }
  }, [layer, selectLocation, selectSystem, state.unlockedLocations]);

  const pageBank = useCallback((dir: 1 | -1) => {
    if (hotkeyBanks < 2) return;
    playSound('click');
    setHotkeyBank(b => cycleBank(b, hotkeyEntries.length, dir));
    setJumpOpen(true); // paging blind would be a guessing game
  }, [hotkeyBanks, hotkeyEntries.length]);

  useEffect(() => {
    if (covered) return; // never steal keys while a panel overlay is up
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented) return;
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable)) return;
      // `covered` only tracks the desktop panel overlay. Event choices, the
      // tutorial, daily bonus and achievements are modal dialogs rendered
      // outside this tree, and a jump firing behind one of them moves a map
      // the player cannot see. Observed live: an Accord Council event modal
      // opened over the map mid-session.
      if (document.querySelector('[aria-modal="true"]')) return;
      if (isBankCycleEvent(e)) {
        if (hotkeyBanks < 2) return;
        e.preventDefault();
        pageBank(e.shiftKey ? -1 : 1);
        return;
      }
      const slot = slotFromKeyEvent(e);
      if (slot === null) return;
      // A partial last bank has empty slots; those keys stay silent rather
      // than beeping or wrapping to some other body.
      const entry = resolveSlot(hotkeyEntries, hotkeyBank, slot);
      if (!entry) return;
      e.preventDefault();
      jumpTo(entry);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [covered, hotkeyEntries, hotkeyBank, hotkeyBanks, jumpTo, pageBank]);

  const bankEntries = useMemo(
    () => entriesForBank(hotkeyEntries, hotkeyBank),
    [hotkeyEntries, hotkeyBank],
  );

  // Keyboard route into the radial menu from anywhere on the map: with a
  // location selected, `C` opens its command arc in the centre of the stage.
  // (The Location List rows handle `C` themselves and anchor the arc on the
  // row — this is the fallback for selections made any other way.) CLAUDE.md
  // requires every action to be reachable without a mouse.
  useEffect(() => {
    if (covered) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'c' && e.key !== 'C' && e.key !== 'ContextMenu') return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable)) return;
      // The Location List rows and the galactic system nodes own `C` for
      // themselves (they anchor the arc on the row / node).
      if (el?.getAttribute?.('aria-keyshortcuts') === 'C') return;
      if (radial) return;
      if (!selection) return;
      // The arc's action set must match the layer being shown.
      if (layer === 'solar' && selection.kind !== 'location') return;
      if (layer === 'galactic' && selection.kind !== 'system') return;
      e.preventDefault();
      playSound('click');
      setDetail(null);
      setRadial({
        kind: selection.kind,
        id: selection.id,
        x: (rootRef.current?.clientWidth ?? 0) / 2,
        y: (rootRef.current?.clientHeight ?? 0) / 2,
      });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [covered, layer, radial, selection]);

  // Wave V3: consume an external focus request (Outliner deep-link) — the
  // EXACT same selection logic OrderQueueHUD's own chips use, just fed by a
  // prop instead of a click. Guarded by `token` so it fires once per request
  // (including re-requesting the same target while already on this tab).
  const lastFocusTokenRef = useRef<number | null>(null);
  useEffect(() => {
    if (!focusRequest || focusRequest.token === lastFocusTokenRef.current) return;
    lastFocusTokenRef.current = focusRequest.token;
    handleOrderQueueSelect(focusRequest.target);
  }, [focusRequest, handleOrderQueueSelect]);

  return (
    <div
      ref={rootRef}
      className="relative w-full overflow-hidden bg-[#020208]"
      style={{ height: mapHeight ? `${mapHeight}px` : '70vh' }}
    >
      {layer === 'solar' ? (
        use3D ? (
          <SolarMap3D
            state={state}
            selectedLocationId={selection?.kind === 'location' ? selection.id : null}
            onSelectLocation={selectLocation}
            active={!covered}
            mapMode={mapMode}
            alwaysLabels={labelsAlways}
            onZoomTierChange={setZoomTier}
            laneVolumes={showVolume ? laneVolumes?.map : null}
          />
        ) : (
          <SolarSystemCanvas
            state={state}
            onUnlock={onUnlock}
            embedded
            selectedLocationId={selection?.kind === 'location' ? selection.id : null}
            onSelectLocation={selectLocation}
            active={!covered}
            mapMode={mapMode}
            alwaysLabels={labelsAlways}
            onZoomTierChange={setZoomTier}
            laneVolumes={showVolume ? laneVolumes?.map : null}
          />
        )
      ) : (
        <GalacticMapView
          state={state}
          selectedSystemId={selection?.kind === 'system' ? selection.id : null}
          onSelectSystem={selectSystem}
          active={!covered}
        />
      )}

      {/* Order Queue HUD — top-left */}
      <OrderQueueHUD state={state} onSelect={handleOrderQueueSelect} className="absolute top-2 left-2 z-20 max-w-[calc(100%-1rem)]" />

      {/* Layer toggle — top-center */}
      <div
        className="hud-frame absolute top-2 left-1/2 -translate-x-1/2 z-20 flex rounded-xl border border-white/[0.08] bg-[#050510]/90 backdrop-blur-sm overflow-hidden"
        role="group"
        aria-label="Map layer"
      >
        <button
          type="button"
          onClick={() => { playSound('click'); setLayer('solar'); setSelection(null); setRadial(null); setDetail(null); }}
          aria-pressed={layer === 'solar'}
          className={`min-h-[44px] px-3 text-[11px] font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-400 ${
            layer === 'solar' ? 'bg-cyan-500/20 text-cyan-200' : 'text-slate-400 hover:text-white'
          }`}
        >
          ☉ Solar System
        </button>
        <button
          type="button"
          onClick={() => { playSound('click'); setLayer('galactic'); setSelection(null); setRadial(null); setDetail(null); }}
          aria-pressed={layer === 'galactic'}
          className={`min-h-[44px] px-3 text-[11px] font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-400 border-l border-white/[0.08] ${
            layer === 'galactic' ? 'bg-indigo-500/20 text-indigo-200' : 'text-slate-400 hover:text-white'
          }`}
        >
          ✴ Galactic
        </button>
        {THREE_D_ENABLED && capable3D && layer === 'solar' && (
          <button
            type="button"
            onClick={toggleRenderer}
            aria-pressed={use3D}
            title={use3D ? 'Switch to the 2D map (also the keyboard/reduced-motion-friendly renderer)' : 'Switch to the 3D orbital map'}
            className={`min-h-[44px] px-3 text-[11px] font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-400 border-l border-white/[0.08] ${
              use3D ? 'bg-emerald-500/20 text-emerald-200' : 'text-slate-400 hover:text-white'
            }`}
          >
            {use3D ? '◉ 3D' : '◎ 2D'}
          </button>
        )}
        <button
          type="button"
          onClick={() => { playSound('click'); setShowActivity(v => !v); }}
          aria-pressed={showActivity}
          aria-expanded={showActivity}
          aria-controls="map-activity-feed-popover"
          className={`min-h-[44px] px-3 text-[11px] font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-400 border-l border-white/[0.08] ${
            showActivity ? 'bg-purple-500/20 text-purple-200' : 'text-slate-400 hover:text-white'
          }`}
        >
          📡 Activity
        </button>
        {spatialUnlocked && (
          <button
            type="button"
            onClick={() => { playSound('click'); setShowSpatial(v => !v); }}
            aria-pressed={showSpatial}
            aria-expanded={showSpatial}
            aria-controls="map-spatial-strategy-popover"
            className={`min-h-[44px] px-3 text-[11px] font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-400 border-l border-white/[0.08] ${
              showSpatial ? 'bg-amber-500/20 text-amber-200' : 'text-slate-400 hover:text-white'
            }`}
          >
            ✦ Spatial
          </button>
        )}
      </div>

      {/* Wave V4 — map-mode strip (Stellaris lenses), directly below the
          layer toggle. Radiogroup: exactly one mode active; arrow keys move
          within the group and `M` cycles globally. Modes recolor/re-badge
          the SOLAR renderers only, so the strip hides on the galactic layer.
          44px targets, horizontally scrollable on phones. */}
      {layer === 'solar' && (
        <div className="absolute top-14 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-1 max-w-[94vw]">
          <div
            className="hud-frame flex rounded-xl border border-white/[0.08] bg-[#050510]/90 backdrop-blur-sm overflow-x-auto max-w-full"
            role="radiogroup"
            aria-label="Map mode"
            onKeyDown={e => {
              if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
                e.preventDefault();
                setMode(cycleMapMode(mapMode, 1));
              } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
                e.preventDefault();
                setMode(cycleMapMode(mapMode, -1));
              }
            }}
          >
            {MAP_MODES.map((m, i) => {
              const isActive = mapMode === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  role="radio"
                  aria-checked={isActive}
                  tabIndex={isActive ? 0 : -1}
                  onClick={() => setMode(m.id)}
                  title={`${m.label} lens — ${m.legend} (press M to cycle)`}
                  className={`min-h-[44px] px-2.5 sm:px-3 text-[10px] sm:text-[11px] font-semibold whitespace-nowrap transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-400 flex items-center gap-1 sm:gap-1.5 shrink-0 ${
                    i > 0 ? 'border-l border-white/[0.08]' : ''
                  } ${isActive ? 'bg-cyan-500/20 text-cyan-200' : 'text-slate-400 hover:text-white'}`}
                >
                  <GameIcon name={m.icon} size={13} />
                  <span className={isActive ? '' : 'hidden sm:inline'}>{m.label}</span>
                </button>
              );
            })}
          </div>
          {/* Legend chip — states the active lens's meaning in TEXT (modes
              are never conveyed by color alone). */}
          {mapMode !== 'standard' && (
            <p className="hud-frame rounded-lg border border-white/[0.08] bg-[#050510]/90 backdrop-blur-sm px-2.5 py-1 text-[10px] text-slate-300 max-w-[min(94vw,460px)] text-center" role="status">
              {MAP_MODE_MAP.get(mapMode)?.legend}
            </p>
          )}

          {/* Wave A2 — zoom-tier readout + the accessibility override.
              The tier is named in TEXT (never inferred from what happens to
              be drawn), and "Labels: All" pins every label/badge on at every
              zoom so information is never zoom-only for keyboard/screen-
              reader users. */}
          <div className="hud-frame flex items-center gap-1 rounded-lg border border-white/[0.08] bg-[#050510]/90 backdrop-blur-sm overflow-hidden">
            <span className="px-2 text-[10px] text-slate-400 whitespace-nowrap" role="status" aria-live="polite">
              Zoom: <span className="text-cyan-300 font-semibold">{MAP_ZOOM_TIER_LABEL[zoomTier]}</span>
            </span>
            <button
              type="button"
              onClick={toggleLabelsAlways}
              aria-pressed={labelsAlways}
              title="Show every label and badge at every zoom level (accessibility override for zoom-based detail)"
              className={`min-h-[44px] px-2.5 text-[10px] font-semibold whitespace-nowrap border-l border-white/[0.08] transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-400 ${
                labelsAlways ? 'bg-cyan-500/20 text-cyan-200' : 'text-slate-400 hover:text-white'
              }`}
            >
              {labelsAlways ? '● Labels: All' : '○ Labels: Zoom'}
            </button>
            <button
              type="button"
              onClick={() => { playSound('click'); setShowVolume(v => !v); }}
              aria-pressed={showVolume}
              title="Lane volume layer — thicken and label the busiest freight lanes from the last 7 days (Markets → Analytics → Flow Map)"
              className={`min-h-[44px] px-2.5 text-[10px] font-semibold whitespace-nowrap border-l border-white/[0.08] transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-400 ${
                showVolume ? 'bg-amber-500/20 text-amber-200' : 'text-slate-400 hover:text-white'
              }`}
            >
              {showVolume ? '● Volume' : '○ Volume'}
            </button>
          </div>
          {showVolume && (
            <p className="hud-frame rounded-lg border border-white/[0.08] bg-[#050510]/90 backdrop-blur-sm px-2.5 py-1 text-[10px] text-slate-300 max-w-[min(94vw,460px)] text-center" role="status" aria-live="polite">
              {!laneVolumes ? 'Loading lane volume…'
                : laneVolumes.top.length === 0 ? `Lane volume (${laneVolumes.windowDays}d): no freight dispatches recorded.`
                : `Lane volume (${laneVolumes.windowDays}d, dispatches): ${laneVolumes.top.join(' · ')}`}
            </p>
          )}

          {/* Orbital-slot ring legend — the ring is colour + line pattern +
              numbers; this names all three in text. */}
          {mapMode === 'logistics' && (
            <p className="hud-frame rounded-lg border border-white/[0.08] bg-[#050510]/90 backdrop-blur-sm px-2.5 py-1 text-[10px] text-slate-300 max-w-[min(94vw,460px)] text-center">
              Orbital slot rings: <span style={{ color: SLOT_SEGMENT_STYLE.yours.color }}>solid = yours</span> ·{' '}
              <span style={{ color: SLOT_SEGMENT_STYLE.others.color }}>dashed = other corporations</span> ·{' '}
              <span style={{ color: SLOT_SEGMENT_STYLE.free.color }}>dotted = free</span>. A full outer ring means the pool is saturated — a lease auction is required to build.
            </p>
          )}
        </div>
      )}

      {/* Global Activity Feed popover — reachable from the map HUD (audit
          Change #3 / D1). Sits below the layer toggle + mode strip so it
          never collides with the Order Queue HUD (top-left) or the context
          panel (right / bottom-sheet). */}
      {showActivity && (
        <div
          id="map-activity-feed-popover"
          className="hud-frame absolute top-28 left-1/2 -translate-x-1/2 z-30 w-[min(92vw,380px)] max-h-[50vh] rounded-xl border border-white/[0.08] bg-[#050510]/95 backdrop-blur-md overflow-hidden animate-reveal-up"
        >
          <span className="hud-corner-bl" aria-hidden="true" />
          <span className="hud-corner-br" aria-hidden="true" />
          <div className="flex items-center justify-between px-3 py-2 border-b border-white/[0.06]">
            <span className="text-[11px] font-hud font-bold text-white flex items-center gap-1.5">
              <span aria-hidden="true">📡</span> Galactic Activity
            </span>
            <button
              type="button"
              onClick={() => setShowActivity(false)}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-white focus:outline-none focus:ring-2 focus:ring-cyan-400"
              aria-label="Close activity feed"
            >
              ✕
            </button>
          </div>
          <GlobalActivityFeed compact limit={25} className="p-2" />
        </div>
      )}

      {/* Spatial Strategy overlay — lane traffic, orbital-slot occupancy,
          chokepoints (audit §B5: folded from the standalone 'spatial' tab). */}
      {showSpatial && spatialUnlocked && (
        <div
          id="map-spatial-strategy-popover"
          className="hud-frame absolute inset-x-2 bottom-2 sm:inset-x-auto sm:right-2 sm:top-14 sm:bottom-2 z-20 sm:w-[min(94vw,460px)] max-h-[70vh] sm:max-h-none overflow-y-auto rounded-xl border border-white/[0.08] bg-[#050510]/95 backdrop-blur-md animate-reveal-up"
        >
          <span className="hud-corner-bl" aria-hidden="true" />
          <span className="hud-corner-br" aria-hidden="true" />
          <div className="sticky top-0 flex items-center justify-between px-3 py-2 border-b border-white/[0.06] bg-[#050510]/95 backdrop-blur-md z-10">
            <span className="text-[11px] font-hud font-bold text-white flex items-center gap-1.5">
              <span aria-hidden="true">✦</span> Spatial Strategy
            </span>
            <button
              type="button"
              onClick={() => setShowSpatial(false)}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-white focus:outline-none focus:ring-2 focus:ring-cyan-400"
              aria-label="Close spatial strategy"
            >
              ✕
            </button>
          </div>
          <div className="p-2">
            <SpatialStrategyPanel state={state} />
          </div>
        </div>
      )}

      {/* Jump hotkey legend (2026-09-04) — the visible half of the number-key
          bindings. Collapsed to a chip by default so it never eats map; the
          chip still names the keys, which is how the feature is discovered.
          Every slot is also a button, so this doubles as the keyboard route
          to the twelve colony bodies the renderers' Location List omits. */}
      <div className="absolute bottom-16 sm:bottom-10 left-1/2 -translate-x-1/2 z-20 w-[min(92vw,300px)] flex flex-col items-stretch gap-1">
        {jumpOpen && (
          <div className="hud-frame rounded-xl border border-white/[0.08] bg-[#050510]/95 backdrop-blur-md overflow-hidden animate-reveal-up">
            <span className="hud-corner-bl" aria-hidden="true" />
            <span className="hud-corner-br" aria-hidden="true" />
            {hotkeyBanks > 1 && (
              <div className="flex items-center justify-between border-b border-white/[0.06] px-1">
                <button
                  type="button"
                  onClick={() => pageBank(-1)}
                  className="w-9 h-9 flex items-center justify-center rounded-lg text-slate-400 hover:text-white focus:outline-none focus:ring-2 focus:ring-cyan-400"
                  aria-label={`Previous hotkey bank (Shift plus ${BANK_CYCLE_KEY})`}
                >
                  ‹
                </button>
                <span className="text-[10px] text-slate-300 font-hud" role="status" aria-live="polite">
                  Bank <span className="text-cyan-300 font-semibold">{hotkeyBank + 1}</span> of {hotkeyBanks}
                  <span className="text-slate-500"> · press {BANK_CYCLE_KEY} to page</span>
                </span>
                <button
                  type="button"
                  onClick={() => pageBank(1)}
                  className="w-9 h-9 flex items-center justify-center rounded-lg text-slate-400 hover:text-white focus:outline-none focus:ring-2 focus:ring-cyan-400"
                  aria-label={`Next hotkey bank (${BANK_CYCLE_KEY})`}
                >
                  ›
                </button>
              </div>
            )}
            <ul className="max-h-[44vh] overflow-y-auto py-1" aria-label={`Jump hotkeys, bank ${hotkeyBank + 1} of ${hotkeyBanks}`}>
              {bankEntries.map(entry => {
                const isSelected = selection?.id === entry.id;
                const locked = layer === 'solar' && !state.unlockedLocations?.includes(entry.id);
                return (
                  <li key={entry.id}>
                    <button
                      type="button"
                      onClick={() => jumpTo(entry)}
                      aria-pressed={isSelected}
                      aria-keyshortcuts={entry.digit}
                      className={`w-full min-h-[44px] px-2 flex items-center gap-2 text-left text-[11px] transition-colors focus:outline-none focus:ring-2 focus:ring-inset focus:ring-cyan-400 ${
                        isSelected ? 'bg-cyan-500/15 text-cyan-200' : 'text-slate-300 hover:bg-white/[0.06]'
                      }`}
                    >
                      <kbd className="shrink-0 w-6 h-6 flex items-center justify-center rounded border border-white/15 bg-white/[0.06] font-mono text-[11px] text-white">
                        {entry.digit}
                      </kbd>
                      <span aria-hidden="true" className="shrink-0">{layer === 'solar' ? (locked ? '🔒' : '🔓') : '✴'}</span>
                      <span className="truncate">{entry.name}</span>
                      <span className="sr-only">
                        {locked ? ', locked' : ''}{isSelected ? ', currently selected' : ''}. Press {describeBinding(entry)}.
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
        <button
          type="button"
          onClick={() => { playSound('click'); setJumpOpen(v => !v); }}
          aria-expanded={jumpOpen}
          title={`Jump to a map body by number key. 1-9 and 0 select the ten bodies of the active bank${hotkeyBanks > 1 ? `; ${BANK_CYCLE_KEY} pages between the ${hotkeyBanks} banks` : ''}.`}
          className="hud-frame min-h-[36px] px-3 rounded-xl border border-white/[0.08] bg-[#050510]/90 backdrop-blur-sm text-[10px] font-semibold text-slate-300 hover:text-white flex items-center justify-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-cyan-400"
        >
          <span aria-hidden="true">⌨</span>
          <span>Jump <span className="font-mono text-cyan-300">1</span>–<span className="font-mono text-cyan-300">0</span></span>
          {hotkeyBanks > 1 && <span className="text-slate-500">bank {hotkeyBank + 1}/{hotkeyBanks}</span>}
          <span aria-hidden="true" className={`text-slate-500 transition-transform ${jumpOpen ? '' : 'rotate-180'}`}>▾</span>
        </button>
        {/* Keyboard-only players get no visual confirmation from a canvas. */}
        <p className="sr-only" role="status" aria-live="polite">{jumpNotice}</p>
      </div>

      {/* Wave A2 — radial command menu, now on BOTH layers (Wave A4). The
          component is presentational; the action set comes from the layer's
          own derivation, so the solar verbs (build / dispatch / slots /
          demand) never appear at a star system and vice versa. */}
      {radial && !covered && mapWidth > 0 && mapHeight
        && ((radial.kind === 'location' && layer === 'solar') || (radial.kind === 'system' && layer === 'galactic')) && (
        <RadialCommandMenu
          targetId={radial.id}
          targetName={radialName}
          actions={radialActions}
          anchor={{ x: radial.x, y: radial.y }}
          viewport={{ w: mapWidth, h: mapHeight }}
          onAction={runRadialAction}
          onClose={() => setRadial(null)}
        />
      )}

      {selection && detail && (
        <MapContextPanel
          state={state}
          selection={selection}
          initialView={detail.view}
          viewToken={detail.token}
          onClose={() => { setSelection(null); setDetail(null); if (selection.kind === 'location') onRegionFocus(null); }}
          onUnlock={onUnlock}
          onClaimColony={onClaimColony}
          onBuild={onBuild}
          onSellBuilding={onSellBuilding}
          onMothballBuilding={onMothballBuilding}
          onReactivateBuilding={onReactivateBuilding}
          onRushRepairBuilding={onRushRepairBuilding}
          onMarkUpgradeBuilding={onMarkUpgradeBuilding}
          onDispatchShip={onDispatchShip}
          onLaunchExpedition={onLaunchExpedition}
          onNavigateTab={onNavigateTab}
        />
      )}
    </div>
  );
}
