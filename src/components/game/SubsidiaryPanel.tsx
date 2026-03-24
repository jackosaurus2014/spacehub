'use client';

import { useState } from 'react';
import type { GameState } from '@/lib/game/types';
import {
  SUBSIDIARY_DEFS,
  SUBSIDIARY_DEF_MAP,
  getSubsidiaryIncome,
  getTotalSubsidiaryIncome,
  getMaxSubsidiarySlots,
  canCreateSubsidiary,
  canUpgradeSubsidiary,
  getUpgradeCost,
  inferCorpTier,
} from '@/lib/game/subsidiaries';
import type { SubsidiaryType, SubsidiaryInstance, UpgradeTrack } from '@/lib/game/subsidiaries';
import { formatMoney } from '@/lib/game/formulas';
import { playSound } from '@/lib/game/sound-engine';

interface SubsidiaryPanelProps {
  state: GameState;
  onCreate: (type: SubsidiaryType) => void;
  onUpgrade: (subId: string, track: UpgradeTrack) => void;
  onDissolve: (subId: string) => void;
}

// ─── Upgrade Track Widget ──────────────────────────────────────────────────

function UpgradeTrackWidget({
  label,
  level,
  maxLevel,
  canBuy,
  cost,
  reason,
  bonusLabel,
  onUpgrade,
}: {
  label: string;
  level: number;
  maxLevel: number;
  canBuy: boolean;
  cost: number;
  reason?: string;
  bonusLabel: string;
  onUpgrade: () => void;
}) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-white/[0.03] last:border-0">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[11px] text-white font-medium">{label}</span>
          <span className="text-[9px] font-mono text-cyan-400">Lv {level}/{maxLevel}</span>
        </div>
        {/* Level dots */}
        <div className="flex gap-1 mb-1">
          {Array.from({ length: maxLevel }).map((_, i) => (
            <div
              key={i}
              className={`w-4 h-1.5 rounded-sm ${
                i < level ? 'bg-cyan-500' : 'bg-zinc-700'
              }`}
            />
          ))}
        </div>
        <p className="text-[9px] text-slate-500">{bonusLabel}</p>
      </div>
      <div className="shrink-0 ml-2">
        {level < maxLevel ? (
          <button
            onClick={() => { if (canBuy) { playSound('click'); onUpgrade(); } }}
            disabled={!canBuy}
            title={!canBuy ? reason : undefined}
            className={`px-2 py-1 rounded text-[10px] font-medium transition-colors ${
              canBuy
                ? 'bg-cyan-600 text-white hover:bg-cyan-500'
                : 'bg-white/[0.04] text-slate-600 cursor-not-allowed'
            }`}
          >
            {formatMoney(cost)}
          </button>
        ) : (
          <span className="text-[10px] text-green-400 font-medium px-2">MAX</span>
        )}
      </div>
    </div>
  );
}

// ─── Subsidiary Card ────────────────────────────────────────────────────────

function SubsidiaryCard({
  sub,
  state,
  onUpgrade,
  onDissolve,
}: {
  sub: SubsidiaryInstance;
  state: GameState;
  onUpgrade: (track: UpgradeTrack) => void;
  onDissolve: () => void;
}) {
  const [showDissolve, setShowDissolve] = useState(false);
  const def = SUBSIDIARY_DEF_MAP.get(sub.type);
  if (!def) return null;

  const income = getSubsidiaryIncome(sub, state);
  const opsCheck = canUpgradeSubsidiary(state, sub.id, 'operations');
  const synCheck = canUpgradeSubsidiary(state, sub.id, 'synergy');
  const effCheck = canUpgradeSubsidiary(state, sub.id, 'efficiency');

  // Multiplier labels
  const OPERATIONS_MULT = [1, 1.5, 2.2, 3.5, 5.5, 9];
  const SYNERGY_MULT = [0, 0.08, 0.18, 0.30, 0.45, 0.65];
  const EFFICIENCY_MULT = [0, 0.10, 0.20, 0.32, 0.45, 0.60];

  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{def.icon}</span>
          <div>
            <h3 className="text-sm font-bold text-white">{def.name}</h3>
            <p className="text-[10px] text-slate-500">{def.description}</p>
          </div>
        </div>
      </div>

      {/* Income display */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="rounded-lg bg-green-500/5 border border-green-500/15 p-2 text-center">
          <p className="text-green-400 text-xs font-bold">{formatMoney(income.grossIncome)}</p>
          <p className="text-slate-600 text-[9px]">Gross/mo</p>
        </div>
        <div className="rounded-lg bg-red-500/5 border border-red-500/15 p-2 text-center">
          <p className="text-red-400 text-xs font-bold">-{formatMoney(income.overhead)}</p>
          <p className="text-slate-600 text-[9px]">Overhead/mo</p>
        </div>
        <div className={`rounded-lg border p-2 text-center ${
          income.netIncome >= 0
            ? 'bg-cyan-500/5 border-cyan-500/15'
            : 'bg-red-500/5 border-red-500/15'
        }`}>
          <p className={`text-xs font-bold ${income.netIncome >= 0 ? 'text-cyan-400' : 'text-red-400'}`}>
            {formatMoney(income.netIncome)}
          </p>
          <p className="text-slate-600 text-[9px]">Net/mo</p>
        </div>
      </div>

      {/* Upgrade tracks */}
      <div className="rounded-lg bg-white/[0.01] border border-white/[0.04] p-3 mb-3">
        <UpgradeTrackWidget
          label="Operations"
          level={sub.operations}
          maxLevel={5}
          canBuy={opsCheck.allowed}
          cost={opsCheck.cost || getUpgradeCost('operations', sub.operations + 1)}
          reason={opsCheck.reason}
          bonusLabel={`Income: x${OPERATIONS_MULT[Math.min(sub.operations, 5)]} ${sub.operations < 5 ? `\u2192 x${OPERATIONS_MULT[Math.min(sub.operations + 1, 5)]}` : ''}`}
          onUpgrade={() => onUpgrade('operations')}
        />
        <UpgradeTrackWidget
          label="Synergy"
          level={sub.synergy}
          maxLevel={5}
          canBuy={synCheck.allowed}
          cost={synCheck.cost || getUpgradeCost('synergy', sub.synergy + 1)}
          reason={synCheck.reason}
          bonusLabel={`Service bonus: +${Math.round(SYNERGY_MULT[Math.min(sub.synergy, 5)] * 100)}% ${sub.synergy < 5 ? `\u2192 +${Math.round(SYNERGY_MULT[Math.min(sub.synergy + 1, 5)] * 100)}%` : ''}`}
          onUpgrade={() => onUpgrade('synergy')}
        />
        <UpgradeTrackWidget
          label="Efficiency"
          level={sub.efficiency}
          maxLevel={5}
          canBuy={effCheck.allowed}
          cost={effCheck.cost || getUpgradeCost('efficiency', sub.efficiency + 1)}
          reason={effCheck.reason}
          bonusLabel={`Overhead: -${Math.round(EFFICIENCY_MULT[Math.min(sub.efficiency, 5)] * 100)}% ${sub.efficiency < 5 ? `\u2192 -${Math.round(EFFICIENCY_MULT[Math.min(sub.efficiency + 1, 5)] * 100)}%` : ''}`}
          onUpgrade={() => onUpgrade('efficiency')}
        />
      </div>

      {/* Service types affected */}
      <div className="flex flex-wrap gap-1 mb-3">
        <span className="text-[9px] text-slate-500">Boosts:</span>
        {def.targetServiceTypes.map(st => (
          <span key={st} className="text-[9px] px-1.5 py-0.5 rounded bg-white/[0.04] text-slate-400">
            {st.replace(/_/g, ' ')}
          </span>
        ))}
      </div>

      {/* Dissolve */}
      {!showDissolve ? (
        <button
          onClick={() => setShowDissolve(true)}
          className="text-[10px] text-red-400/50 hover:text-red-400 transition-colors"
        >
          Dissolve subsidiary...
        </button>
      ) : (
        <div className="flex items-center gap-2 p-2 rounded-lg border border-red-500/20 bg-red-500/5">
          <span className="text-[10px] text-red-400">Dissolve? No refund.</span>
          <button
            onClick={() => { playSound('click'); onDissolve(); }}
            className="px-2 py-1 rounded text-[10px] font-medium bg-red-600 text-white hover:bg-red-500"
          >
            Confirm
          </button>
          <button
            onClick={() => setShowDissolve(false)}
            className="px-2 py-1 rounded text-[10px] text-slate-400 hover:text-white"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Main Panel ─────────────────────────────────────────────────────────────

export default function SubsidiaryPanel({ state, onCreate, onUpgrade, onDissolve }: SubsidiaryPanelProps) {
  const [showCreate, setShowCreate] = useState(false);
  const subsidiaries = state.subsidiaries || [];
  const maxSlots = getMaxSubsidiarySlots(state);
  const totalIncome = getTotalSubsidiaryIncome(state);
  const corpTier = inferCorpTier(state);
  const ownedTypes = new Set(subsidiaries.map(s => s.type));

  return (
    <div className="space-y-4">
      {/* Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-3 text-center">
          <p className="text-cyan-400 text-lg font-bold">{subsidiaries.length}</p>
          <p className="text-slate-500 text-xs">Subsidiaries</p>
        </div>
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 text-center">
          <p className="text-white text-lg font-bold">{maxSlots}</p>
          <p className="text-slate-500 text-xs">Max Slots (Tier {corpTier})</p>
        </div>
        <div className={`rounded-xl border p-3 text-center ${
          totalIncome >= 0
            ? 'border-green-500/20 bg-green-500/5'
            : 'border-red-500/20 bg-red-500/5'
        }`}>
          <p className={`text-lg font-bold ${totalIncome >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {formatMoney(totalIncome)}
          </p>
          <p className="text-slate-500 text-xs">Net Income/mo</p>
        </div>
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-center">
          <p className="text-amber-400 text-lg font-bold">Tier {corpTier}</p>
          <p className="text-slate-500 text-xs">Corp Level</p>
        </div>
      </div>

      {/* Slot capacity bar */}
      <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-white text-xs font-bold uppercase tracking-wider">Subsidiary Slots</span>
          <span className="text-cyan-400 text-xs font-mono">{subsidiaries.length}/{maxSlots}</span>
        </div>
        <div className="flex gap-1.5">
          {Array.from({ length: Math.max(maxSlots, 1) }).map((_, i) => (
            <div
              key={i}
              className={`h-2.5 flex-1 rounded-sm transition-colors ${
                i < subsidiaries.length ? 'bg-cyan-500' : i < maxSlots ? 'bg-zinc-700' : 'bg-zinc-800'
              }`}
            />
          ))}
        </div>
        {maxSlots === 0 && (
          <p className="text-slate-500 text-[10px] mt-2">
            Subsidiaries unlock at Corporation tier (earn $10B+, build 15+ buildings, complete 15+ research, unlock 5+ locations).
          </p>
        )}
      </div>

      {/* Existing subsidiaries */}
      {subsidiaries.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-white text-xs font-bold uppercase tracking-wider">Your Subsidiaries</h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {subsidiaries.map(sub => (
              <SubsidiaryCard
                key={sub.id}
                sub={sub}
                state={state}
                onUpgrade={(track) => onUpgrade(sub.id, track)}
                onDissolve={() => onDissolve(sub.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Create new subsidiary */}
      {subsidiaries.length < maxSlots && (
        <>
          <button
            onClick={() => setShowCreate(!showCreate)}
            className="w-full px-4 py-3 rounded-xl border border-dashed border-cyan-500/30 bg-cyan-500/5 text-cyan-400 text-sm font-medium hover:bg-cyan-500/10 transition-colors"
          >
            {showCreate ? 'Hide Options' : '+ Establish New Subsidiary'}
          </button>

          {showCreate && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {SUBSIDIARY_DEFS.filter(d => !ownedTypes.has(d.id)).map(def => {
                const check = canCreateSubsidiary(state, def.id);
                return (
                  <div
                    key={def.id}
                    className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 hover:border-white/[0.12] transition-all"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-2xl">{def.icon}</span>
                      <div>
                        <h4 className="text-sm font-bold text-white">{def.name}</h4>
                        <p className="text-[10px] text-cyan-400">Base: {formatMoney(def.baseIncome)}/mo</p>
                      </div>
                    </div>
                    <p className="text-slate-400 text-[10px] mb-2">{def.description}</p>
                    <div className="flex flex-wrap gap-1 mb-3">
                      <span className="text-[9px] text-slate-500">Boosts:</span>
                      {def.targetServiceTypes.map(st => (
                        <span key={st} className="text-[9px] px-1.5 py-0.5 rounded bg-white/[0.04] text-slate-400">
                          {st.replace(/_/g, ' ')}
                        </span>
                      ))}
                    </div>
                    <button
                      onClick={() => { if (check.allowed) { playSound('click'); onCreate(def.id); setShowCreate(false); } }}
                      disabled={!check.allowed}
                      title={check.reason}
                      className={`w-full px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                        check.allowed
                          ? 'bg-cyan-600 text-white hover:bg-cyan-500'
                          : 'bg-white/[0.04] text-slate-600 cursor-not-allowed'
                      }`}
                    >
                      Establish ({formatMoney(def.setupCost)})
                    </button>
                    {!check.allowed && check.reason && (
                      <p className="text-[9px] text-red-400/70 mt-1 text-center">{check.reason}</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
