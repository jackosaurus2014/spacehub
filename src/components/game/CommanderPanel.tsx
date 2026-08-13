'use client';

import { useState, useMemo } from 'react';
import Image from 'next/image';
import { useModalA11y } from './useModalA11y';
import type { GameState } from '@/lib/game/types';
import {
  COMMANDER_MAP,
  getPortraitUrl,
  getFullbodyUrl,
  getHireCap,
  canHire,
  ensureFreshPool,
  computeCommanderBonuses,
  RARITY_LABEL,
  RARITY_ACCENT,
  RARITY_HIRE_COST,
  RARITY_MAGNITUDE,
  CLASS_LABEL,
  getClassBonusText,
  POOL_REFRESH_MS,
  type CommanderDefinition,
} from '@/lib/game/commanders';
import { formatMoney, formatCountdown } from '@/lib/game/formulas';

interface Props {
  state: GameState;
  onHire: (defId: string) => void;
  onDismiss: (defId: string) => void;
}

export default function CommanderPanel({ state, onHire, onDismiss }: Props) {
  const [activeTab, setActiveTab] = useState<'roster' | 'recruit'>('roster');
  const [heroView, setHeroView] = useState<string | null>(null);

  const hired = state.hiredCommanders || [];
  const cap = getHireCap(state);

  // Ensure the pool is fresh before rendering (pure compute, no mutation here).
  const pool = useMemo(() => ensureFreshPool(state), [state]);
  const poolRefreshIn = Math.max(0, (pool.refreshedAtMs + POOL_REFRESH_MS - Date.now()) / 1000);

  const bonuses = computeCommanderBonuses(hired);
  const pct = (m: number) => `+${Math.round((m - 1) * 100)}%`;

  const heroDef = heroView ? COMMANDER_MAP.get(heroView) : null;

  return (
    <div className="space-y-4">
      {/* Header + active bonuses summary */}
      <div className="hud-frame game-panel-glow p-4">
        <span className="hud-corner-bl" aria-hidden="true" />
        <span className="hud-corner-br" aria-hidden="true" />
        <div className="flex items-start justify-between gap-4 mb-3">
          <div>
            <h2 className="game-heading text-white text-base font-bold">Commanders</h2>
            <p className="text-slate-500 text-xs mt-0.5">Hired commanders grant passive global bonuses. Refresh pool every 8 hours.</p>
          </div>
          <div className="text-right shrink-0">
            <div className="game-label">Roster</div>
            <div className={`game-number font-bold ${hired.length >= cap ? 'text-amber-400' : 'text-white'}`}>{hired.length}/{cap}</div>
            <div className="text-[9px] text-slate-600 mt-0.5">Cap rises with corp tier</div>
          </div>
        </div>

        {/* Active bonus readout */}
        {hired.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-3 border-t border-white/[0.06]">
            <BonusChip label="Revenue" value={pct(bonuses.revenueMultiplier)} />
            <BonusChip label="Build speed" value={pct(bonuses.buildSpeedMultiplier)} />
            <BonusChip label="Research" value={pct(bonuses.researchSpeedMultiplier)} />
            <BonusChip label="Mining" value={pct(bonuses.miningMultiplier)} />
            <BonusChip label="Market" value={pct(bonuses.marketPriceMultiplier)} />
          </div>
        ) : (
          <div className="text-center text-slate-500 text-xs py-3 border-t border-white/[0.06]">
            No commanders hired yet. Recruit one to start stacking bonuses.
          </div>
        )}
      </div>

      {/* Tab nav */}
      <div className="flex gap-2">
        <button
          onClick={() => setActiveTab('roster')}
          className={`flex-1 min-h-[44px] px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'roster' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'bg-white/[0.03] text-slate-400 border border-white/[0.06] hover:text-white'
          }`}
        >
          Roster ({hired.length})
        </button>
        <button
          onClick={() => setActiveTab('recruit')}
          className={`flex-1 min-h-[44px] px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'recruit' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'bg-white/[0.03] text-slate-400 border border-white/[0.06] hover:text-white'
          }`}
        >
          Recruit ({pool.definitionIds.length})
        </button>
      </div>

      {/* Roster */}
      {activeTab === 'roster' && (
        <div>
          {hired.length === 0 ? (
            <div className="hud-frame game-panel p-8 text-center">
              <span className="hud-corner-bl" aria-hidden="true" />
              <span className="hud-corner-br" aria-hidden="true" />
              <div className="text-slate-500 text-sm">Your roster is empty.</div>
              <div className="text-slate-600 text-xs mt-1">Switch to Recruit to hire commanders.</div>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {hired.map(h => {
                const def = COMMANDER_MAP.get(h.definitionId);
                if (!def) return null;
                return (
                  <CommanderCard
                    key={h.definitionId}
                    def={def}
                    actionLabel="Dismiss"
                    actionTone="danger"
                    onAction={() => onDismiss(h.definitionId)}
                    onOpenHero={def.hasFullbody ? () => setHeroView(def.id) : undefined}
                  />
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Recruit */}
      {activeTab === 'recruit' && (
        <div>
          <div className="flex items-center justify-between text-[10px] text-slate-500 mb-2 px-1">
            <span>Pool refreshes in {formatCountdown(poolRefreshIn)}</span>
            {hired.length >= cap && <span className="text-amber-400">Roster full — dismiss someone first</span>}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {pool.definitionIds.map(id => {
              const def = COMMANDER_MAP.get(id);
              if (!def) return null;
              const check = canHire(state, id);
              return (
                <CommanderCard
                  key={id}
                  def={def}
                  actionLabel={check.ok ? `Hire · ${formatMoney(RARITY_HIRE_COST[def.rarity])}` : check.reason || 'Unavailable'}
                  actionTone={check.ok ? 'primary' : 'disabled'}
                  onAction={check.ok ? () => onHire(id) : undefined}
                  onOpenHero={def.hasFullbody ? () => setHeroView(def.id) : undefined}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Legendary hero modal */}
      {heroDef && heroDef.hasFullbody && (
        <HeroModal def={heroDef} onClose={() => setHeroView(null)} />
      )}
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function BonusChip({ label, value }: { label: string; value: string }) {
  const isZero = value === '+0%';
  return (
    <div className={`rounded-lg p-2 text-center ${isZero ? 'bg-white/[0.02] border border-white/[0.04]' : 'bg-cyan-500/5 border border-cyan-500/20'}`}>
      <div className={`text-[9px] uppercase tracking-wide ${isZero ? 'text-slate-600' : 'text-slate-400'}`}>{label}</div>
      <div className={`game-number text-sm font-bold ${isZero ? 'text-slate-500' : 'text-cyan-300'}`}>{value}</div>
    </div>
  );
}

function CommanderCard({
  def,
  actionLabel,
  actionTone,
  onAction,
  onOpenHero,
}: {
  def: CommanderDefinition;
  actionLabel: string;
  actionTone: 'primary' | 'danger' | 'disabled';
  onAction?: () => void;
  onOpenHero?: () => void;
}) {
  const accent = RARITY_ACCENT[def.rarity];
  const toneClasses =
    actionTone === 'primary'
      ? 'bg-cyan-500 text-black hover:bg-cyan-400'
      : actionTone === 'danger'
      ? 'bg-red-500/15 text-red-300 hover:bg-red-500/25 border border-red-500/30'
      : 'bg-white/[0.04] text-slate-500 cursor-not-allowed';

  return (
    <div className={`rounded-xl overflow-hidden border-2 ${accent.border} shadow-lg ${accent.glow} transition-transform hover:-translate-y-0.5`} style={{ background: '#0a0a1a' }}>
      {/* Portrait */}
      <button
        type="button"
        aria-label={onOpenHero ? `View hero portrait for ${def.name}` : `${def.name} portrait`}
        className="hud-frame holo-sprite relative w-full aspect-square bg-gradient-to-b from-transparent to-black/60 overflow-hidden group focus:outline-none focus:ring-2 focus:ring-cyan-400"
        onClick={onOpenHero}
        disabled={!onOpenHero}
      >
        <span className="hud-corner-bl" aria-hidden="true" />
        <span className="hud-corner-br" aria-hidden="true" />
        <Image
          src={getPortraitUrl(def)}
          alt=""
          width={256}
          height={256}
          className="absolute inset-0 w-full h-full object-cover"
        />
        {/* Rarity badge */}
        <span className={`absolute top-1.5 left-1.5 text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wide backdrop-blur-sm ${accent.text}`} style={{ background: 'rgba(0,0,0,0.65)' }}>
          {RARITY_LABEL[def.rarity]}
        </span>
        {onOpenHero && (
          <span className="absolute top-1.5 right-1.5 text-[9px] px-1.5 py-0.5 rounded-full text-amber-300 bg-amber-500/10 border border-amber-500/30 opacity-0 group-hover:opacity-100 transition-opacity" aria-hidden="true">
            View hero
          </span>
        )}
      </button>

      {/* Info */}
      <div className="p-2.5">
        <div className="text-white text-sm font-bold leading-tight truncate">{def.name}</div>
        <div className="text-slate-500 text-[10px] truncate">{def.title}</div>
        <div className="flex items-center gap-1 mt-1">
          <span className={`text-[9px] px-1.5 py-0.5 rounded ${accent.text}`} style={{ background: 'rgba(255,255,255,0.05)' }}>
            {CLASS_LABEL[def.class]}
          </span>
        </div>
        <div className={`game-number mt-1.5 text-[10px] ${accent.text}`}>
          {getClassBonusText(def.class, def.rarity)}
        </div>

        {/* Action button */}
        {onAction ? (
          <button
            onClick={onAction}
            className={`w-full min-h-[44px] mt-2 px-2 py-1.5 rounded text-[10px] font-bold transition-colors ${toneClasses}`}
          >
            {actionLabel}
          </button>
        ) : (
          <div className={`w-full mt-2 px-2 py-1.5 rounded text-[10px] font-medium text-center ${toneClasses}`}>
            {actionLabel}
          </div>
        )}
      </div>
    </div>
  );
}

function HeroModal({ def, onClose }: { def: CommanderDefinition; onClose: () => void }) {
  const modalRef = useModalA11y<HTMLDivElement>(onClose);
  const fullbody = getFullbodyUrl(def);
  if (!fullbody) return null;
  const accent = RARITY_ACCENT[def.rarity];
  const titleId = `hero-title-${def.id}`;
  return (
    <div ref={modalRef} tabIndex={-1} className="fixed inset-0 z-[80] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby={titleId}>
      <div className="absolute inset-0 bg-black/80 backdrop-blur-md game-modal-backdrop" onClick={onClose} aria-hidden="true" />
      <div className={`hud-frame relative w-full max-w-md rounded-2xl overflow-hidden border-2 ${accent.border} shadow-2xl ${accent.glow} game-modal-card`} style={{ background: '#0a0a1a' }}>
        <span className="hud-corner-bl" aria-hidden="true" />
        <span className="hud-corner-br" aria-hidden="true" />
        <div className="relative aspect-[3/4] holo-sprite">
          <Image src={fullbody} alt={`${def.name} hero portrait`} fill className="object-cover" />
          <button
            onClick={onClose}
            aria-label="Close hero portrait"
            className="absolute top-3 right-3 min-w-[44px] min-h-[44px] w-11 h-11 rounded-full bg-black/60 backdrop-blur-sm text-white hover:bg-black/80 focus:outline-none focus:ring-2 focus:ring-cyan-400 transition-colors flex items-center justify-center text-sm"
          >
            <span aria-hidden="true">✕</span>
          </button>
          <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black via-black/70 to-transparent">
            <div className={`text-[10px] font-bold uppercase tracking-wider ${accent.text}`}>{RARITY_LABEL[def.rarity]} · {CLASS_LABEL[def.class]}</div>
            <h3 id={titleId} className="game-heading text-white text-2xl font-bold mt-1">{def.name}</h3>
            <p className="text-slate-300 text-sm">{def.title}</p>
            <div className={`game-number mt-2 text-sm ${accent.text}`}>{getClassBonusText(def.class, def.rarity)}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
