'use client';

import { useState, useMemo } from 'react';
import Image from 'next/image';
import type { GameState } from '@/lib/game/types';
import { EFFECT_ASSETS } from '@/lib/game/assets';
import {
  MODULES,
  MODULE_MAP,
  RARITY_LABEL,
  getInventoryModules,
  getFittedModulesForShip,
  getEffectiveShipStats,
  purchaseModule,
  fitModule,
  unfitModule,
  type ModuleDefinition,
  type ModuleRarity,
  type OwnedModule,
} from '@/lib/game/modules';
import { SHIP_MAP, getShipDerivedStats } from '@/lib/game/ships';
import { formatMoney } from '@/lib/game/formulas';

interface Props {
  state: GameState;
  setState: (fn: (prev: GameState | null) => GameState | null) => void;
}

type ModulesTab = 'shop' | 'inventory' | 'fit';

const RARITY_ACCENT: Record<ModuleRarity, { text: string; border: string; bg: string }> = {
  common:    { text: 'text-slate-300',  border: 'border-slate-500/30',   bg: 'bg-slate-500/5' },
  uncommon:  { text: 'text-emerald-300', border: 'border-emerald-500/40', bg: 'bg-emerald-500/10' },
  rare:      { text: 'text-sky-300',    border: 'border-sky-500/40',     bg: 'bg-sky-500/10' },
  epic:      { text: 'text-purple-300', border: 'border-purple-500/40',  bg: 'bg-purple-500/10' },
  legendary: { text: 'text-amber-300',  border: 'border-amber-500/40',   bg: 'bg-amber-500/10' },
};

const HARDPOINT_ICON: Record<string, string> = {
  engine: '🚀', shield: '🛡', cargo: '📦', sensor: '📡', drone: '⚙️', utility: '🔧',
};

export default function ModulesPanel({ state, setState }: Props) {
  const [tab, setTab] = useState<ModulesTab>('shop');
  const [selectedShipId, setSelectedShipId] = useState<string | null>(null);

  const inventory = useMemo(() => getInventoryModules(state), [state]);
  const builtShips = (state.ships || []).filter(s => s.isBuilt);

  return (
    <div className="space-y-4">
      <div className="hud-frame relative card p-4">
        <span className="hud-corner-bl" aria-hidden="true" />
        <span className="hud-corner-br" aria-hidden="true" />
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <div className="vfx-sprite relative w-7 h-7 flex-shrink-0" aria-hidden="true">
              <Image src={EFFECT_ASSETS.shield} alt="" fill className="object-contain" />
            </div>
            <div>
              <h2 className="font-hud text-white text-base font-bold flex items-center gap-2">
                <span className="text-cyan-400">⚙️</span> Ship Modules
              </h2>
              <p className="text-slate-500 text-xs mt-0.5">
                Purchase modules at the fabrication shop, fit them to your ships for stat bonuses. Each ship has a fixed
                number of hardpoints by role — cargo freighters fit cargo/engine/utility modules, survey ships fit sensors, etc.
              </p>
            </div>
          </div>
        </div>

        <div className="game-tab-bar flex gap-1 overflow-x-auto">
          <TabButton active={tab === 'shop'} onClick={() => setTab('shop')}>🏪 Shop ({MODULES.length})</TabButton>
          <TabButton active={tab === 'inventory'} onClick={() => setTab('inventory')}>📦 Inventory ({inventory.length})</TabButton>
          <TabButton active={tab === 'fit'} onClick={() => setTab('fit')}>🔩 Fit ({builtShips.length} ships)</TabButton>
        </div>
      </div>

      {tab === 'shop' && <ShopTab state={state} setState={setState} />}
      {tab === 'inventory' && <InventoryTab state={state} inventory={inventory} />}
      {tab === 'fit' && (
        <FitTab
          state={state}
          setState={setState}
          selectedShipId={selectedShipId}
          setSelectedShipId={setSelectedShipId}
        />
      )}
    </div>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`min-h-[44px] px-3 py-1.5 rounded-lg text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-400 whitespace-nowrap ${
        active ? 'game-tab-active bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'bg-white/[0.04] text-slate-400 border border-white/[0.06] hover:text-white'
      }`}
    >
      {children}
    </button>
  );
}

// ─── Shop Tab ─────────────────────────────────────────────────────────────────

function ShopTab({ state, setState }: { state: GameState; setState: Props['setState'] }) {
  const [hardpointFilter, setHardpointFilter] = useState<string | 'all'>('all');

  const visible = MODULES.filter(m => hardpointFilter === 'all' || m.hardpointType === hardpointFilter);

  return (
    <>
      <div className="card p-2 flex flex-wrap gap-1 items-center text-[10px]">
        <span className="text-slate-500 px-1">Filter:</span>
        <button onClick={() => setHardpointFilter('all')} className={`px-2 py-1 rounded ${hardpointFilter === 'all' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'bg-white/[0.04] text-slate-400'}`}>All</button>
        {Object.entries(HARDPOINT_ICON).map(([type, icon]) => (
          <button
            key={type}
            onClick={() => setHardpointFilter(type)}
            className={`px-2 py-1 rounded ${hardpointFilter === type ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'bg-white/[0.04] text-slate-400 hover:text-white'}`}
          >
            {icon} {type}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {visible.map(m => {
          const accent = RARITY_ACCENT[m.rarity];
          const canAfford = state.money >= m.baseCost;
          return (
            <div key={m.id} className={`game-card rounded-xl overflow-hidden border-2 ${accent.border}`} style={{ background: '#0a0a1a' }}>
              <div className={`p-3 ${accent.bg}`}>
                <div className="flex items-start gap-2">
                  <span className="text-3xl shrink-0" aria-hidden="true">{m.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className={`text-[10px] uppercase tracking-wider font-bold ${accent.text}`}>
                      {RARITY_LABEL[m.rarity]} · T{m.tier} · {HARDPOINT_ICON[m.hardpointType]} {m.hardpointType}
                    </div>
                    <h3 className="text-white text-sm font-bold leading-tight">{m.name}</h3>
                  </div>
                </div>
                <p className="text-slate-400 text-[11px] mt-2 leading-relaxed">{m.description}</p>

                {m.compatibleRoles && m.compatibleRoles.length > 0 && (
                  <div className="mt-2 text-[10px] text-slate-500">
                    Role-locked: <span className="text-slate-300">{m.compatibleRoles.join(', ')}</span>
                  </div>
                )}

                <div className="flex items-center justify-between mt-3">
                  <div className={`font-mono font-bold text-sm ${canAfford ? accent.text : 'text-red-300'}`}>{formatMoney(m.baseCost)}</div>
                  <button
                    onClick={() => setState(prev => prev ? purchaseModule(prev, m.id) : prev)}
                    disabled={!canAfford}
                    className={`game-btn min-h-[44px] px-3 py-1.5 rounded text-[11px] font-bold transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-400 ${
                      canAfford ? 'bg-cyan-500 text-black hover:bg-cyan-400' : 'bg-white/[0.04] text-slate-500 cursor-not-allowed'
                    }`}
                  >
                    {canAfford ? 'Purchase' : 'Insufficient funds'}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

// ─── Inventory Tab ────────────────────────────────────────────────────────────

function InventoryTab({ state, inventory }: { state: GameState; inventory: OwnedModule[] }) {
  if (inventory.length === 0) {
    return (
      <div className="card p-8 text-center">
        <div className="text-slate-500 text-sm">Your module inventory is empty.</div>
        <div className="text-slate-600 text-xs mt-1">Visit the Shop tab to purchase modules.</div>
      </div>
    );
  }
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {inventory.map(owned => {
        const def = MODULE_MAP.get(owned.definitionId);
        if (!def) return null;
        const accent = RARITY_ACCENT[def.rarity];
        return (
          <div key={owned.instanceId} className={`rounded-lg border ${accent.border} p-3 flex items-center gap-3`} style={{ background: '#0a0a1a' }}>
            <span className="text-2xl" aria-hidden="true">{def.icon}</span>
            <div className="flex-1 min-w-0">
              <div className={`text-[10px] uppercase tracking-wider font-bold ${accent.text}`}>
                {RARITY_LABEL[def.rarity]} · T{def.tier} · {HARDPOINT_ICON[def.hardpointType]} {def.hardpointType}
              </div>
              <div className="text-white text-sm font-bold">{def.name}</div>
              <div className="text-[10px] text-slate-500 mt-0.5">In inventory — go to Fit tab to install on a ship</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Fit Tab ──────────────────────────────────────────────────────────────────

function FitTab({
  state, setState, selectedShipId, setSelectedShipId,
}: {
  state: GameState;
  setState: Props['setState'];
  selectedShipId: string | null;
  setSelectedShipId: (id: string | null) => void;
}) {
  const builtShips = (state.ships || []).filter(s => s.isBuilt);

  if (builtShips.length === 0) {
    return (
      <div className="card p-8 text-center">
        <div className="text-slate-500 text-sm">No ships built yet.</div>
        <div className="text-slate-600 text-xs mt-1">Build a ship in the Fleet tab first, then return here to fit modules.</div>
      </div>
    );
  }

  const selected = selectedShipId ? builtShips.find(s => s.instanceId === selectedShipId) : null;
  const selectedDef = selected ? SHIP_MAP.get(selected.definitionId) : null;
  const selectedStats = selectedDef ? getShipDerivedStats(selectedDef) : null;
  const fitted = selected ? getFittedModulesForShip(state, selected.instanceId) : [];
  const effectiveStats = selected ? getEffectiveShipStats(state, selected.instanceId) : null;
  const inventory = getInventoryModules(state);

  return (
    <div className="space-y-3">
      {/* Ship picker */}
      <div className="card p-3">
        <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-2">Select a ship to fit</div>
        <div className="flex flex-wrap gap-1.5">
          {builtShips.map(ship => {
            const def = SHIP_MAP.get(ship.definitionId);
            const stats = def ? getShipDerivedStats(def) : null;
            const fitCount = (state.fittedModules || {})[ship.instanceId]?.length || 0;
            const slots = stats?.moduleSlots || 0;
            return (
              <button
                key={ship.instanceId}
                onClick={() => setSelectedShipId(ship.instanceId)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-400 ${
                  selectedShipId === ship.instanceId
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                    : 'bg-white/[0.04] text-slate-300 border border-white/[0.06] hover:text-white'
                }`}
              >
                {ship.name} <span className="text-slate-500">({fitCount}/{slots})</span>
              </button>
            );
          })}
        </div>
      </div>

      {selected && selectedDef && selectedStats && effectiveStats && (
        <>
          {/* Slot visualization */}
          <div className="hud-frame relative card p-3">
            <span className="hud-corner-bl" aria-hidden="true" />
            <span className="hud-corner-br" aria-hidden="true" />
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="flex items-center gap-2">
                <div className="vfx-sprite relative w-6 h-6 flex-shrink-0" aria-hidden="true">
                  <Image src={EFFECT_ASSETS.shield} alt="" fill className="object-contain" />
                </div>
                <div>
                  <h3 className="font-hud text-white text-sm font-bold">{selected.name}</h3>
                  <p className="text-[10px] text-slate-500">
                    {selectedDef.name} · {selectedDef.role} · Hardpoints: {selectedStats.hardpointTypes.map(t => HARDPOINT_ICON[t] + ' ' + t).join(' / ')}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-1.5 mb-3 flex-wrap">
              {Array.from({ length: selectedStats.moduleSlots }).map((_, i) => {
                const fittedItem = fitted[i];
                const fittedDef = fittedItem ? MODULE_MAP.get(fittedItem.definitionId) : null;
                return (
                  <div
                    key={i}
                    className={`module-socket flex-1 min-w-[64px] min-h-[64px] p-2 rounded-lg text-center flex flex-col items-center justify-center ${
                      fittedDef
                        ? `module-socket-filled ${RARITY_ACCENT[fittedDef.rarity].border} ${RARITY_ACCENT[fittedDef.rarity].bg} border-2`
                        : 'module-socket-empty border-2 border-dashed border-white/10'
                    }`}
                  >
                    {fittedDef ? (
                      <>
                        <div className="text-xl" aria-hidden="true">{fittedDef.icon}</div>
                        <div className={`text-[10px] font-bold truncate ${RARITY_ACCENT[fittedDef.rarity].text}`}>{fittedDef.name}</div>
                        <button
                          onClick={() => setState(prev => prev ? unfitModule(prev, selected.instanceId, fittedItem.instanceId) : prev)}
                          aria-label={`Unfit ${fittedDef.name}`}
                          className="mt-1 text-[10px] text-red-300 hover:text-red-200 min-h-[44px] min-w-[44px] px-2 flex items-center justify-center"
                        >
                          Unfit
                        </button>
                      </>
                    ) : (
                      <>
                        <div className="text-slate-600 text-xl">◯</div>
                        <div className="text-[10px] text-slate-600">Empty slot</div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Effective stats comparison */}
            <div className="rounded-lg bg-white/[0.03] p-2">
              <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-1">Effective stats</div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-[10px]">
                <StatRow label="Sublight" base={selectedStats.sublightSpeed} effective={effectiveStats.sublightSpeed} unit="m/s" />
                <StatRow label="Warp" base={selectedStats.warpFactor} effective={effectiveStats.warpFactor} suffix="×" />
                <StatRow label="Fuel cap" base={selectedStats.fuelCapacity} effective={effectiveStats.fuelCapacity} />
                <StatRow label="Δv" base={selectedStats.deltaVBudget} effective={effectiveStats.deltaVBudget} unit="m/s" />
                <StatRow label="Hull" base={selectedStats.hullIntegrity} effective={effectiveStats.hullIntegrity} />
                <StatRow label="Shield" base={selectedStats.shieldingRating} effective={effectiveStats.shieldingRating} pct />
                <StatRow label="Survey rng" base={selectedStats.surveyRange} effective={effectiveStats.surveyRange} unit="AU" />
                <StatRow label="Stealth" base={selectedStats.stealthSignature} effective={effectiveStats.stealthSignature} />
                <StatRow label="Life sup" base={selectedStats.lifeSupportDays} effective={effectiveStats.lifeSupportDays} unit="d" />
                <StatRow label="Point def" base={selectedStats.pointDefenseRating} effective={effectiveStats.pointDefenseRating} pct />
              </div>
            </div>
          </div>

          {/* Available inventory (compatible) */}
          <div className="card p-3">
            <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold mb-2">Fit from inventory</div>
            {inventory.length === 0 ? (
              <div className="text-slate-500 text-sm py-2">No modules in inventory. Buy some in the Shop tab.</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {inventory.map(owned => {
                  const def = MODULE_MAP.get(owned.definitionId);
                  if (!def) return null;
                  const accent = RARITY_ACCENT[def.rarity];
                  const compatHardpoint = selectedStats.hardpointTypes.includes(def.hardpointType);
                  const compatRole = !def.compatibleRoles?.length || def.compatibleRoles.includes(selectedDef.role);
                  const slotsFree = (selectedStats.moduleSlots) > ((state.fittedModules || {})[selected.instanceId]?.length || 0);
                  const fittable = compatHardpoint && compatRole && slotsFree;
                  return (
                    <div key={owned.instanceId} className={`rounded-lg border ${accent.border} p-2 flex items-center gap-2`} style={{ background: 'rgba(0,0,0,0.2)' }}>
                      <span className="text-xl shrink-0" aria-hidden="true">{def.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className={`text-[10px] ${accent.text} font-bold truncate`}>{def.name}</div>
                        <div className="text-[10px] text-slate-500">{HARDPOINT_ICON[def.hardpointType]} {def.hardpointType} · T{def.tier}</div>
                      </div>
                      <button
                        onClick={() => setState(prev => prev ? fitModule(prev, selected.instanceId, owned.instanceId) : prev)}
                        disabled={!fittable}
                        className={`game-btn min-h-[44px] min-w-[44px] px-2 py-1 rounded text-[10px] font-bold transition-colors shrink-0 focus:outline-none focus:ring-2 focus:ring-cyan-400 ${
                          fittable ? 'bg-cyan-500 text-black hover:bg-cyan-400' : 'bg-white/[0.04] text-slate-600 cursor-not-allowed'
                        }`}
                        title={!compatHardpoint ? 'Incompatible hardpoint type' : !compatRole ? `Role-locked (${def.compatibleRoles?.join(', ')})` : !slotsFree ? 'All slots full' : ''}
                        aria-label={fittable ? `Fit ${def.name}` : !compatHardpoint ? `Cannot fit ${def.name}: incompatible hardpoint type` : !compatRole ? `Cannot fit ${def.name}: role-locked (${def.compatibleRoles?.join(', ')})` : `Cannot fit ${def.name}: all slots full`}
                      >
                        {fittable ? 'Fit' : '—'}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      {!selected && (
        <div className="card p-8 text-center text-slate-500 text-sm">
          Select a ship above to see its hardpoints and fit modules.
        </div>
      )}
    </div>
  );
}

function StatRow({
  label, base, effective, unit = '', suffix = '', pct = false,
}: { label: string; base: number; effective: number; unit?: string; suffix?: string; pct?: boolean }) {
  const changed = Math.abs(base - effective) > 0.001;
  const isImprovement = pct ? effective > base : label === 'Stealth' ? effective < base : effective > base;
  const format = (v: number) => {
    if (pct) return `${(v * 100).toFixed(0)}%`;
    if (unit) return `${v.toLocaleString(undefined, { maximumFractionDigits: 1 })} ${unit}`;
    if (suffix) return `${v.toFixed(1)}${suffix}`;
    return v.toLocaleString(undefined, { maximumFractionDigits: 1 });
  };
  return (
    <div className="flex justify-between">
      <span className="text-slate-500">{label}</span>
      <span className={changed ? (isImprovement ? 'text-emerald-300 font-mono' : 'text-red-300 font-mono') : 'text-slate-300 font-mono'}>
        {changed && <span className="text-slate-600 text-[10px]">{format(base)} → </span>}
        {changed && <span aria-hidden="true">{isImprovement ? '▲' : '▼'} </span>}
        {format(effective)}
      </span>
    </div>
  );
}
