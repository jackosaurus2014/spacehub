'use client';

// ─── Map Command Center (Wave 9 — map-first command interface) ─────────────
// The full-viewport orchestrator for the 'map' tab. Replaces the old
// scroll-in-a-card SolarSystemCanvas usage with a command view: canvas fills
// all available height, HUD panels float over it (Order Queue strip top-
// left, layer toggle top-center, context panel right/bottom-sheet). All
// gameplay logic is delegated to the existing engine-wired handlers passed
// down from space-tycoon/page.tsx — this component only manages which
// location/system is selected and which layer (solar/galactic) is showing.

import { useState, useCallback, useRef, useLayoutEffect } from 'react';
import type { GameState, GameTab } from '@/lib/game/types';
import type { ExpeditionPlanRequest } from '@/lib/game/expeditions';
import SolarSystemCanvas from './SolarSystemCanvas';
import GalacticMapView from './GalacticMapView';
import OrderQueueHUD, { type OrderQueueTarget } from './OrderQueueHUD';
import MapContextPanel, { type MapSelection } from './MapContextPanel';
import { playSound } from '@/lib/game/sound-engine';

type Layer = 'solar' | 'galactic';

interface MapCommandCenterProps {
  state: GameState;
  onUnlock: (locId: string) => void;
  onBuild: (buildingId: string, locationId: string) => void;
  onSellBuilding: (instanceId: string) => void;
  onDispatchShip: (shipInstanceId: string, toLocationId: string) => void;
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
        <SolarSystemCanvas
          state={state}
          onUnlock={onUnlock}
          embedded
          selectedLocationId={selection?.kind === 'location' ? selection.id : null}
          onSelectLocation={selectLocation}
        />
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
      </div>

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
