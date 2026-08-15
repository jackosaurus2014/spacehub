'use client';

// ─── Cargo Loader (4X Wave W14 — cargo logistics, audit C1) ─────────────────
// Shared manifest-builder used by both freight dispatch flows (FleetPanel's
// transport action + MapContextPanel's map dispatch). Lists what's physically
// in stock at the ship's CURRENT location (home cluster → the global Earth
// pool; remote → that location's local stockpile), lets the player load
// integer quantities with +/-/max steppers, and renders a live capacity bar
// (hull capacity × fitted Extended Cargo Bays; tankers count liquids at half
// weight). Pure presentation — validation is re-run by planFreight /
// dispatchShipWithCargo so nothing here can be bypassed.

import { SHIP_MAP } from '@/lib/game/ships';
import { RESOURCE_MAP, type ResourceId } from '@/lib/game/resources';
import { LOCATION_MAP } from '@/lib/game/solar-system';
import {
  getLocationInventory,
  getShipCargoCapacity,
  getCargoLoadUnits,
  isHomeLocation,
} from '@/lib/game/cargo-logistics';
import { playSound } from '@/lib/game/sound-engine';
import type { GameState } from '@/lib/game/types';

interface CargoLoaderProps {
  state: GameState;
  shipInstanceId: string;
  cargo: Record<string, number>;
  onChange: (cargo: Record<string, number>) => void;
}

export default function CargoLoader({ state, shipInstanceId, cargo, onChange }: CargoLoaderProps) {
  const ship = (state.ships || []).find(s => s.instanceId === shipInstanceId);
  const def = ship ? SHIP_MAP.get(ship.definitionId) : undefined;
  if (!ship || !def) return null;

  const origin = ship.currentLocation;
  const originName = LOCATION_MAP.get(origin)?.name || origin;
  const inventory = getLocationInventory(state, origin);
  const stockEntries = Object.entries(inventory)
    .filter(([resId, qty]) => qty > 0 && RESOURCE_MAP.has(resId as ResourceId))
    .sort((a, b) => b[1] - a[1]);

  const capacity = getShipCargoCapacity(state, shipInstanceId);
  const loadUnits = getCargoLoadUnits(def.role, cargo);
  const loadPct = capacity > 0 ? Math.min(100, (loadUnits / capacity) * 100) : 0;
  const overCapacity = loadUnits > capacity;
  const isTanker = def.role === 'tanker';

  const setQty = (resId: string, qty: number) => {
    const next = { ...cargo };
    const stock = inventory[resId] || 0;
    const clamped = Math.max(0, Math.min(stock, Math.floor(qty)));
    if (clamped <= 0) delete next[resId];
    else next[resId] = clamped;
    onChange(next);
  };

  /** Largest integer of resId that still fits within capacity + stock. */
  const maxLoadable = (resId: string): number => {
    const stock = inventory[resId] || 0;
    const cat = RESOURCE_MAP.get(resId as ResourceId)?.category;
    const unitWeight = isTanker && (cat === 'water' || cat === 'hydrocarbon') ? 0.5 : 1;
    const otherLoad = getCargoLoadUnits(def.role, { ...cargo, [resId]: 0 });
    const room = Math.max(0, capacity - otherLoad);
    return Math.min(stock, Math.floor(room / unitWeight));
  };

  if (capacity <= 0) {
    return (
      <p className="text-slate-500 text-[10px]">
        This hull has no cargo capacity — it can reposition but carries nothing.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">
          Load cargo · stock at {originName}
        </span>
        <span className={`text-[10px] font-mono ${overCapacity ? 'text-red-300' : 'text-cyan-300'}`}>
          {loadUnits}/{capacity} units
        </span>
      </div>

      {/* Capacity bar — never color-alone: the numeric readout above is the
          authoritative signal (colorblind-safe). */}
      <div
        className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden"
        role="progressbar"
        aria-label="Cargo capacity used"
        aria-valuenow={Math.round(loadUnits)}
        aria-valuemin={0}
        aria-valuemax={capacity}
      >
        <div
          className={`h-full rounded-full transition-all ${overCapacity ? 'bg-red-500' : 'bg-cyan-500'}`}
          style={{ width: `${loadPct}%` }}
        />
      </div>
      {isTanker && (
        <p className="text-[11px] text-sky-300/80">⛽ Tanker hull: water &amp; hydrocarbons count at half weight (2x liquid capacity).</p>
      )}

      {stockEntries.length === 0 ? (
        <p className="text-slate-600 text-[10px]">
          Nothing in stock at {originName}
          {isHomeLocation(origin) ? '' : ' — production here accrues into this local stockpile once mining runs'}.
        </p>
      ) : (
        <div className="space-y-1 max-h-[30vh] overflow-y-auto game-scroll">
          {stockEntries.map(([resId, stock]) => {
            const res = RESOURCE_MAP.get(resId as ResourceId);
            const loaded = cargo[resId] || 0;
            return (
              <div key={resId} className="flex items-center gap-1.5 text-[11px] px-2 py-1 rounded bg-white/[0.02]">
                <span className="text-slate-300 truncate flex-1 min-w-0">
                  <span aria-hidden="true">{res?.icon}</span> {res?.name || resId.replace(/_/g, ' ')}
                  <span className="text-slate-600 ml-1">×{Math.floor(stock).toLocaleString()}</span>
                </span>
                <button
                  type="button"
                  onClick={() => { playSound('click'); setQty(resId, loaded - Math.max(1, Math.floor(stock / 20))); }}
                  disabled={loaded <= 0}
                  aria-label={`Load less ${res?.name || resId}`}
                  className="min-w-[36px] min-h-[36px] flex items-center justify-center rounded bg-white/[0.06] text-white text-xs hover:bg-white/[0.1] disabled:opacity-30 transition-colors"
                >
                  −
                </button>
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={Math.floor(stock)}
                  value={loaded}
                  onChange={e => setQty(resId, parseInt(e.target.value, 10) || 0)}
                  aria-label={`${res?.name || resId} quantity to load`}
                  className="w-14 h-9 rounded bg-white/[0.06] text-white text-[11px] text-center border border-white/[0.06] focus:outline-none focus:border-cyan-500/30"
                />
                <button
                  type="button"
                  onClick={() => { playSound('click'); setQty(resId, loaded + Math.max(1, Math.floor(stock / 20))); }}
                  disabled={loaded >= maxLoadable(resId)}
                  aria-label={`Load more ${res?.name || resId}`}
                  className="min-w-[36px] min-h-[36px] flex items-center justify-center rounded bg-white/[0.06] text-white text-xs hover:bg-white/[0.1] disabled:opacity-30 transition-colors"
                >
                  +
                </button>
                <button
                  type="button"
                  onClick={() => { playSound('click'); setQty(resId, loaded >= maxLoadable(resId) ? 0 : maxLoadable(resId)); }}
                  aria-label={loaded >= maxLoadable(resId) ? `Unload all ${res?.name || resId}` : `Load maximum ${res?.name || resId}`}
                  className="min-w-[36px] min-h-[36px] px-1 flex items-center justify-center rounded text-[10px] font-semibold bg-cyan-600/20 text-cyan-300 border border-cyan-600/30 hover:bg-cyan-600/30 transition-colors"
                >
                  {loaded >= maxLoadable(resId) && loaded > 0 ? '0' : 'MAX'}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
