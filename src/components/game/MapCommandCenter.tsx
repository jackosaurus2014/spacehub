'use client';

// ─── Map Command Center (Wave 9 — map-first command interface) ─────────────
// The full-viewport orchestrator for the 'map' tab. Replaces the old
// scroll-in-a-card SolarSystemCanvas usage with a command view: canvas fills
// all available height, HUD panels float over it (Order Queue strip top-
// left, layer toggle top-center, context panel right/bottom-sheet). All
// gameplay logic is delegated to the existing engine-wired handlers passed
// down from space-tycoon/page.tsx — this component only manages which
// location/system is selected and which layer (solar/galactic) is showing.

import { useState, useCallback, useEffect, useRef, useLayoutEffect } from 'react';
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
import MapContextPanel, { type MapSelection } from './MapContextPanel';
import GlobalActivityFeed from './GlobalActivityFeed';
import SpatialStrategyPanel from './SpatialStrategyPanel';
import { playSound } from '@/lib/game/sound-engine';
import { updateMusicMood } from '@/lib/game/music-engine';
import { isFoldedFeatureUnlocked } from '@/lib/game/corporation-tiers';

type Layer = 'solar' | 'galactic';

// ── 3D renderer gating (4X W7) ──────────────────────────────────────────────
// The WebGL map is the DEFAULT on capable desktops; the 2D canvas remains the
// renderer for mobile/small viewports, prefers-reduced-motion, missing WebGL2
// (three r163+ requires WebGL2), and anyone who toggles it off. The user's
// choice persists in localStorage.

const MAP_RENDERER_KEY = 'tycoon-map-renderer'; // '3d' | '2d'

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
  onBuild: (buildingId: string, locationId: string) => void;
  onSellBuilding: (instanceId: string) => void;
  /** W14 (cargo logistics): optional manifest — dispatch debits it at the
   *  origin and the tick engine credits the destination on arrival. */
  onDispatchShip: (shipInstanceId: string, toLocationId: string, cargo?: Record<string, number>) => void;
  onLaunchExpedition: (req: ExpeditionPlanRequest) => void;
  onNavigateTab: (tab: GameTab) => void;
  /** Drives the shell's region backdrop tint + ambient sound, same contract
   *  SolarSystemCanvas's onSelectLocation always had. */
  onRegionFocus: (locId: string | null) => void;
}

export default function MapCommandCenter({
  state, onUnlock, onBuild, onSellBuilding, onDispatchShip, onLaunchExpedition, onNavigateTab, onRegionFocus,
}: MapCommandCenterProps) {
  const [layer, setLayer] = useState<Layer>('solar');
  const [selection, setSelection] = useState<MapSelection | null>(null);
  const [showActivity, setShowActivity] = useState(false);

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
  const use3D = capable3D && prefer3D;
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

  // Explicit measured height. `flex-1` under the shell's `min-h-screen` flex
  // column is unreliable (min-height parents don't guarantee flex-grow space,
  // and the game page sits below variable site chrome), which collapsed the
  // map into a ribbon. Measure our own top edge and take the rest of the
  // viewport, with a floor so tiny landscape phones still get a usable map.
  const rootRef = useRef<HTMLDivElement>(null);
  const [mapHeight, setMapHeight] = useState<number | null>(null);
  useLayoutEffect(() => {
    const measure = () => {
      const el = rootRef.current;
      if (!el) return;
      const top = el.getBoundingClientRect().top;
      const vh = window.visualViewport?.height ?? window.innerHeight;
      setMapHeight(Math.max(420, Math.floor(vh - top)));
    };
    measure();
    window.addEventListener('resize', measure);
    window.visualViewport?.addEventListener('resize', measure);
    return () => {
      window.removeEventListener('resize', measure);
      window.visualViewport?.removeEventListener('resize', measure);
    };
  }, []);

  const selectLocation = useCallback((locId: string | null) => {
    setSelection(locId ? { kind: 'location', id: locId } : null);
    onRegionFocus(locId);
  }, [onRegionFocus]);

  const selectSystem = useCallback((sysId: string | null) => {
    setSelection(sysId ? { kind: 'system', id: sysId } : null);
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
          />
        ) : (
          <SolarSystemCanvas
            state={state}
            onUnlock={onUnlock}
            embedded
            selectedLocationId={selection?.kind === 'location' ? selection.id : null}
            onSelectLocation={selectLocation}
          />
        )
      ) : (
        <GalacticMapView
          state={state}
          selectedSystemId={selection?.kind === 'system' ? selection.id : null}
          onSelectSystem={selectSystem}
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
          onClick={() => { playSound('click'); setLayer('solar'); setSelection(null); }}
          aria-pressed={layer === 'solar'}
          className={`min-h-[44px] px-3 text-[11px] font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-400 ${
            layer === 'solar' ? 'bg-cyan-500/20 text-cyan-200' : 'text-slate-400 hover:text-white'
          }`}
        >
          ☉ Solar System
        </button>
        <button
          type="button"
          onClick={() => { playSound('click'); setLayer('galactic'); setSelection(null); }}
          aria-pressed={layer === 'galactic'}
          className={`min-h-[44px] px-3 text-[11px] font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-400 border-l border-white/[0.08] ${
            layer === 'galactic' ? 'bg-indigo-500/20 text-indigo-200' : 'text-slate-400 hover:text-white'
          }`}
        >
          ✴ Galactic
        </button>
        {capable3D && layer === 'solar' && (
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

      {/* Global Activity Feed popover — reachable from the map HUD (audit
          Change #3 / D1). Sits below the layer toggle so it never collides
          with the Order Queue HUD (top-left) or the context panel (right /
          bottom-sheet). */}
      {showActivity && (
        <div
          id="map-activity-feed-popover"
          className="hud-frame absolute top-14 left-1/2 -translate-x-1/2 z-20 w-[min(92vw,380px)] max-h-[50vh] rounded-xl border border-white/[0.08] bg-[#050510]/95 backdrop-blur-md overflow-hidden animate-reveal-up"
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

      {selection && (
        <MapContextPanel
          state={state}
          selection={selection}
          onClose={() => { setSelection(null); if (selection.kind === 'location') onRegionFocus(null); }}
          onUnlock={onUnlock}
          onBuild={onBuild}
          onSellBuilding={onSellBuilding}
          onDispatchShip={onDispatchShip}
          onLaunchExpedition={onLaunchExpedition}
          onNavigateTab={onNavigateTab}
        />
      )}
    </div>
  );
}
