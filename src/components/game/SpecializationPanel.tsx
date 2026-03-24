'use client';

import { useState } from 'react';
import type { GameState } from '@/lib/game/types';
import {
  SPECIALIZATIONS,
  canPurchaseTier,
  getSpecializationBonuses,
  getRespecCost,
} from '@/lib/game/specializations';
import type { SpecializationPath, SpecializationDefinition, SpecializationState } from '@/lib/game/specializations';
import { formatMoney } from '@/lib/game/formulas';
import { playSound } from '@/lib/game/sound-engine';

interface SpecializationPanelProps {
  state: GameState;
  onPurchaseTier: (path: SpecializationPath, isPrimary: boolean) => void;
  onRespec: (which: 'primary' | 'secondary') => void;
}

function TierNode({
  tierDef,
  tierIndex,
  isUnlocked,
  isNext,
  canBuy,
  reason,
}: {
  tierDef: { tier: number; name: string; description: string; costMoney: number; costResources: Record<string, number>; bonusType: string; bonusValue: number };
  tierIndex: number;
  isUnlocked: boolean;
  isNext: boolean;
  canBuy: boolean;
  reason?: string;
}) {
  return (
    <div className={`relative flex items-start gap-3 py-2 ${tierIndex > 0 ? 'mt-1' : ''}`}>
      {/* Connector line */}
      {tierIndex > 0 && (
        <div
          className={`absolute left-3 -top-2 w-0.5 h-3 ${isUnlocked ? 'bg-cyan-500' : 'bg-zinc-700'}`}
        />
      )}

      {/* Tier node dot */}
      <div className={`w-6 h-6 rounded-full shrink-0 flex items-center justify-center text-[10px] font-bold border-2 ${
        isUnlocked
          ? 'border-cyan-500 bg-cyan-500/20 text-cyan-300'
          : isNext
            ? 'border-yellow-500/60 bg-yellow-500/10 text-yellow-400'
            : 'border-zinc-600 bg-zinc-800 text-zinc-500'
      }`}>
        {tierDef.tier}
      </div>

      {/* Details */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={`text-xs font-medium ${isUnlocked ? 'text-cyan-300' : isNext ? 'text-yellow-300' : 'text-slate-500'}`}>
            {tierDef.name}
          </span>
          {isUnlocked && (
            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              UNLOCKED
            </span>
          )}
        </div>
        <p className="text-[10px] text-slate-500 mt-0.5">{tierDef.description}</p>
        {!isUnlocked && (
          <div className="flex flex-wrap gap-1 mt-1">
            <span className="text-[9px] text-slate-600">
              Cost: {formatMoney(tierDef.costMoney)}
            </span>
            {Object.entries(tierDef.costResources).map(([resId, qty]) => (
              <span key={resId} className="text-[9px] text-slate-600">
                + {qty} {resId.replace(/_/g, ' ')}
              </span>
            ))}
          </div>
        )}
        {isNext && !canBuy && reason && (
          <p className="text-[9px] text-red-400/70 mt-0.5">{reason}</p>
        )}
      </div>
    </div>
  );
}

function SpecCard({
  def,
  state,
  spec,
  isPrimarySlot,
  isAssigned,
  assignedTier,
  onPurchase,
}: {
  def: SpecializationDefinition;
  state: GameState;
  spec: SpecializationState;
  isPrimarySlot: boolean;
  isAssigned: boolean;
  assignedTier: number;
  onPurchase: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const maxTier = isPrimarySlot ? 5 : 3;
  const purchaseCheck = canPurchaseTier(state, def.id, isPrimarySlot);

  return (
    <div className={`rounded-xl border p-4 transition-all ${
      isAssigned
        ? 'border-cyan-500/30 bg-cyan-500/5'
        : 'border-white/[0.06] bg-white/[0.02] hover:border-white/[0.12]'
    }`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{def.icon}</span>
          <div>
            <h3 className="text-sm font-bold text-white">{def.name}</h3>
            {isAssigned && (
              <p className="text-[10px] text-cyan-400 font-mono">
                Tier {assignedTier}/{maxTier}
              </p>
            )}
          </div>
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-[10px] text-slate-500 hover:text-slate-300 transition-colors px-2 py-1"
        >
          {expanded ? 'Hide' : 'Details'}
        </button>
      </div>

      <p className="text-slate-400 text-xs mb-3">{def.description}</p>

      {/* Tier progress indicator (compact) */}
      {!expanded && (
        <div className="flex gap-1 mb-3">
          {def.tiers.slice(0, maxTier).map((t, i) => (
            <div
              key={t.tier}
              className={`h-1.5 flex-1 rounded-full ${
                i < assignedTier ? 'bg-cyan-500' : 'bg-zinc-700'
              }`}
            />
          ))}
        </div>
      )}

      {/* Expanded tier tree */}
      {expanded && (
        <div className="mb-3 pl-1">
          {def.tiers.slice(0, maxTier).map((t, i) => (
            <TierNode
              key={t.tier}
              tierDef={t}
              tierIndex={i}
              isUnlocked={i < assignedTier}
              isNext={i === assignedTier}
              canBuy={i === assignedTier && purchaseCheck.allowed}
              reason={i === assignedTier ? purchaseCheck.reason : undefined}
            />
          ))}
        </div>
      )}

      {/* Purchase button */}
      {assignedTier < maxTier && (
        <button
          onClick={() => {
            if (purchaseCheck.allowed) {
              playSound('click');
              onPurchase();
            }
          }}
          disabled={!purchaseCheck.allowed}
          className={`w-full px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
            purchaseCheck.allowed
              ? 'bg-cyan-600 text-white hover:bg-cyan-500'
              : 'bg-white/[0.04] text-slate-600 cursor-not-allowed'
          }`}
        >
          {isAssigned
            ? `Upgrade to Tier ${assignedTier + 1}`
            : `Choose as ${isPrimarySlot ? 'Primary' : 'Secondary'}`
          }
          {purchaseCheck.allowed && def.tiers[assignedTier] && (
            <span className="ml-1 opacity-70">({formatMoney(def.tiers[assignedTier].costMoney)})</span>
          )}
        </button>
      )}

      {/* Capstone building preview (only for primary at T5) */}
      {isPrimarySlot && assignedTier >= 5 && (
        <div className="mt-3 p-2 rounded-lg border border-yellow-500/20 bg-yellow-500/5">
          <p className="text-[10px] text-yellow-300 font-bold mb-1">Capstone Building Unlocked</p>
          <p className="text-[10px] text-slate-400">{def.capstone.name}: {formatMoney(def.capstone.revenuePerMonth)}/mo revenue</p>
        </div>
      )}
    </div>
  );
}

export default function SpecializationPanel({ state, onPurchaseTier, onRespec }: SpecializationPanelProps) {
  const [viewMode, setViewMode] = useState<'primary' | 'secondary'>('primary');
  const spec: SpecializationState = state.specialization || { primary: null, secondary: null, respecCount: 0 };
  const bonuses = getSpecializationBonuses(spec);
  const respecCost = getRespecCost(state);

  const primaryPath = spec.primary?.path || null;
  const secondaryPath = spec.secondary?.path || null;
  const primaryTier = spec.primary?.tier || 0;
  const secondaryTier = spec.secondary?.tier || 0;

  return (
    <div className="space-y-4">
      {/* Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-3 text-center">
          <p className="text-cyan-400 text-sm font-bold">
            {primaryPath ? SPECIALIZATIONS.find(s => s.id === primaryPath)?.name || 'None' : 'None'}
          </p>
          <p className="text-slate-500 text-[10px]">Primary (T{primaryTier})</p>
        </div>
        <div className="rounded-xl border border-purple-500/20 bg-purple-500/5 p-3 text-center">
          <p className="text-purple-400 text-sm font-bold">
            {secondaryPath ? SPECIALIZATIONS.find(s => s.id === secondaryPath)?.name || 'None' : 'None'}
          </p>
          <p className="text-slate-500 text-[10px]">Secondary (T{secondaryTier})</p>
        </div>
        <div className="rounded-xl border border-green-500/20 bg-green-500/5 p-3 text-center">
          <p className="text-green-400 text-sm font-bold">
            +{Math.round(bonuses.allRevenue * 100)}%
          </p>
          <p className="text-slate-500 text-[10px]">All Revenue</p>
        </div>
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-center">
          <p className="text-amber-400 text-sm font-bold">{spec.respecCount}</p>
          <p className="text-slate-500 text-[10px]">Respecs Used</p>
        </div>
      </div>

      {/* Active bonuses */}
      {(primaryPath || secondaryPath) && (
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
          <p className="text-white text-xs font-bold mb-2">Active Specialization Bonuses</p>
          <div className="flex flex-wrap gap-2">
            {bonuses.launchRevenue > 0 && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-400 border border-orange-500/20">
                Launch +{Math.round(bonuses.launchRevenue * 100)}%
              </span>
            )}
            {bonuses.miningOutput > 0 && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                Mining +{Math.round(bonuses.miningOutput * 100)}%
              </span>
            )}
            {bonuses.dataRevenue > 0 && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                Data +{Math.round(bonuses.dataRevenue * 100)}%
              </span>
            )}
            {bonuses.tourismRevenue > 0 && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-pink-500/10 text-pink-400 border border-pink-500/20">
                Tourism +{Math.round(bonuses.tourismRevenue * 100)}%
              </span>
            )}
            {bonuses.fleetSpeed > 0 && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-400 border border-teal-500/20">
                Fleet +{Math.round(bonuses.fleetSpeed * 100)}%
              </span>
            )}
            {bonuses.fabricationOutput > 0 && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                Fabrication +{Math.round(bonuses.fabricationOutput * 100)}%
              </span>
            )}
            {bonuses.buildSpeed > 0 && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                Build +{Math.round(bonuses.buildSpeed * 100)}%
              </span>
            )}
            {bonuses.researchSpeed > 0 && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20">
                Research +{Math.round(bonuses.researchSpeed * 100)}%
              </span>
            )}
            {bonuses.maintenanceReduction > 0 && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-500/10 text-green-400 border border-green-500/20">
                Maintenance -{Math.round(bonuses.maintenanceReduction * 100)}%
              </span>
            )}
            {bonuses.allRevenue > 0 && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-300 border border-yellow-500/20">
                All Revenue +{Math.round(bonuses.allRevenue * 100)}%
              </span>
            )}
          </div>
        </div>
      )}

      {/* Tab toggle */}
      <div className="flex gap-2">
        <button
          onClick={() => setViewMode('primary')}
          className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
            viewMode === 'primary'
              ? 'bg-cyan-600 text-white'
              : 'bg-white/[0.04] text-slate-400 hover:text-white'
          }`}
        >
          Primary (5 Tiers)
        </button>
        <button
          onClick={() => setViewMode('secondary')}
          disabled={!spec.primary}
          className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
            viewMode === 'secondary'
              ? 'bg-purple-600 text-white'
              : spec.primary
                ? 'bg-white/[0.04] text-slate-400 hover:text-white'
                : 'bg-white/[0.02] text-slate-600 cursor-not-allowed'
          }`}
        >
          Secondary (3 Tiers, 75%)
        </button>
      </div>

      {/* Specialization grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {SPECIALIZATIONS.map((def) => {
          const isPrimarySlot = viewMode === 'primary';
          const isAssigned = isPrimarySlot
            ? primaryPath === def.id
            : secondaryPath === def.id;
          const assignedTier = isAssigned
            ? (isPrimarySlot ? primaryTier : secondaryTier)
            : 0;

          // Hide specs already assigned to the other slot
          const isOtherSlot = isPrimarySlot
            ? secondaryPath === def.id
            : primaryPath === def.id;

          return (
            <SpecCard
              key={def.id}
              def={def}
              state={state}
              spec={spec}
              isPrimarySlot={isPrimarySlot}
              isAssigned={isAssigned}
              assignedTier={isOtherSlot ? 0 : assignedTier}
              onPurchase={() => onPurchaseTier(def.id, isPrimarySlot)}
            />
          );
        })}
      </div>

      {/* Respec section */}
      {(primaryPath || secondaryPath) && (
        <div className="rounded-xl border border-red-500/10 bg-red-500/5 p-4">
          <h3 className="text-white text-xs font-bold mb-2">Respec Specialization</h3>
          <p className="text-slate-400 text-[10px] mb-3">
            Reset your specialization to choose a new path. Cost: {formatMoney(respecCost)}
            {spec.respecCount > 0 && ` (respec #{spec.respecCount + 1})`}
          </p>
          <div className="flex gap-2">
            {primaryPath && (
              <button
                onClick={() => { playSound('click'); onRespec('primary'); }}
                disabled={state.money < respecCost}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  state.money >= respecCost
                    ? 'bg-red-600 text-white hover:bg-red-500'
                    : 'bg-white/[0.04] text-slate-600 cursor-not-allowed'
                }`}
              >
                Reset Primary ({formatMoney(respecCost)})
              </button>
            )}
            {secondaryPath && (
              <button
                onClick={() => { playSound('click'); onRespec('secondary'); }}
                disabled={state.money < respecCost}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  state.money >= respecCost
                    ? 'bg-red-600/80 text-white hover:bg-red-500/80'
                    : 'bg-white/[0.04] text-slate-600 cursor-not-allowed'
                }`}
              >
                Reset Secondary ({formatMoney(respecCost)})
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
