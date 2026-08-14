'use client';

import { useState, useMemo } from 'react';
import Image from 'next/image';
import { useModalA11y } from './useModalA11y';
import type { GameState } from '@/lib/game/types';
import {
  COMMANDER_MAP,
  getPortraitUrl,
  getFullbodyUrl,
  hasPortraitArt,
  getHireCap,
  canHire,
  ensureFreshPool,
  computeCommanderBonuses,
  getRosterBucket,
  getCommanderTraits,
  getCommanderXpProgress,
  canAssignToPost,
  isAssignmentProductive,
  ASSIGNMENT_POST_LABEL,
  RARITY_LABEL,
  RARITY_ACCENT,
  RARITY_HIRE_COST,
  CLASS_LABEL,
  getClassBonusText,
  POOL_REFRESH_MS,
  MAX_LEVEL,
  type CommanderDefinition,
  type HiredCommander,
  type AssignmentPostType,
  type RosterBucket,
} from '@/lib/game/commanders';
import { RESEARCH_CATEGORIES } from '@/lib/game/research-tree';
import { SCIENCE_PROGRAMS } from '@/lib/game/science-missions';
import { LOCATION_MAP } from '@/lib/game/solar-system';
import { INTERSTELLAR_SYSTEM_MAP } from '@/lib/game/interstellar';
import { formatMoney, formatCountdown } from '@/lib/game/formulas';

interface Props {
  state: GameState;
  onHire: (defId: string) => void;
  onDismiss: (defId: string) => void;
  onAssign: (defId: string, postType: AssignmentPostType, targetId?: string) => void;
  onUnassign: (defId: string) => void;
}

const BUCKET_FILTERS: { id: RosterBucket | 'all'; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'commander', label: 'Commander' },
  { id: 'scientist', label: 'Scientist' },
  { id: 'engineer', label: 'Engineer' },
];

export default function CommanderPanel({ state, onHire, onDismiss, onAssign, onUnassign }: Props) {
  const [activeTab, setActiveTab] = useState<'roster' | 'recruit'>('roster');
  const [heroView, setHeroView] = useState<string | null>(null);
  const [rosterFilter, setRosterFilter] = useState<RosterBucket | 'all'>('all');

  const hired = state.hiredCommanders || [];
  const cap = getHireCap(state);

  // Ensure the pool is fresh before rendering (pure compute, no mutation here).
  const pool = useMemo(() => ensureFreshPool(state), [state]);
  const poolRefreshIn = Math.max(0, (pool.refreshedAtMs + POOL_REFRESH_MS - Date.now()) / 1000);

  const bonuses = computeCommanderBonuses(hired, state);
  const pct = (m: number) => `+${Math.round((m - 1) * 100)}%`;
  const pt = (v: number) => `${v >= 0 ? '+' : ''}${Math.round(v * 100)}%`;

  const heroDef = heroView ? COMMANDER_MAP.get(heroView) : null;

  const filteredHired = useMemo(() => {
    if (rosterFilter === 'all') return hired;
    return hired.filter(h => {
      const def = COMMANDER_MAP.get(h.definitionId);
      return def && getRosterBucket(def) === rosterFilter;
    });
  }, [hired, rosterFilter]);

  // Active/completed expeditions available as an assignment target.
  const activeExpeditions = (state.expeditions || []).filter(
    e => e.phase !== 'completed' && e.phase !== 'lost',
  );

  return (
    <div className="space-y-4">
      {/* Header + active bonuses summary */}
      <div className="hud-frame game-panel-glow p-4">
        <span className="hud-corner-bl" aria-hidden="true" />
        <span className="hud-corner-br" aria-hidden="true" />
        <div className="flex items-start justify-between gap-4 mb-3">
          <div>
            <h2 className="game-heading text-white text-base font-bold">Commanders</h2>
            <p className="text-slate-500 text-xs mt-0.5">Hired commanders grant passive global bonuses. Assign them to a post to earn levels. Refresh pool every 8 hours.</p>
          </div>
          <div className="text-right shrink-0">
            <div className="game-label">Roster</div>
            <div className={`game-number font-bold ${hired.length >= cap ? 'text-amber-400' : 'text-white'}`}>{hired.length}/{cap}</div>
            <div className="text-[9px] text-slate-600 mt-0.5">Cap rises with corp tier</div>
          </div>
        </div>

        {/* Active bonus readout */}
        {hired.length > 0 ? (
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 pt-3 border-t border-white/[0.06]">
            <BonusChip label="Revenue" value={pct(bonuses.revenueMultiplier)} />
            <BonusChip label="Build speed" value={pct(bonuses.buildSpeedMultiplier)} />
            <BonusChip label="Research" value={pct(bonuses.researchSpeedMultiplier)} />
            <BonusChip label="Mining" value={pct(bonuses.miningMultiplier)} />
            <BonusChip label="Market" value={pct(bonuses.marketPriceMultiplier)} />
            <BonusChip label="Transit" value={pt(bonuses.travelSpeedBonus)} />
            <BonusChip label="Insurance" value={pt(bonuses.insuranceDiscountBonus)} />
            <BonusChip label="Hazard resist" value={pt(bonuses.hazardResistanceBonus)} />
            <BonusChip label="Crew morale" value={pt(bonuses.crewMoraleBonus)} />
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
            <>
              {/* Roster filter by class bucket */}
              <div className="flex gap-1.5 mb-3" role="group" aria-label="Filter roster by class">
                {BUCKET_FILTERS.map(f => (
                  <button
                    key={f.id}
                    onClick={() => setRosterFilter(f.id)}
                    aria-pressed={rosterFilter === f.id}
                    className={`min-h-[36px] px-3 py-1.5 rounded-md text-[11px] font-medium transition-colors ${
                      rosterFilter === f.id ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'bg-white/[0.03] text-slate-400 border border-white/[0.06] hover:text-white'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {filteredHired.map(h => {
                  const def = COMMANDER_MAP.get(h.definitionId);
                  if (!def) return null;
                  return (
                    <HiredCommanderCard
                      key={h.definitionId}
                      def={def}
                      hiredCommander={h}
                      state={state}
                      activeExpeditions={activeExpeditions}
                      onDismiss={() => onDismiss(def.id)}
                      onAssign={(postType, targetId) => onAssign(def.id, postType, targetId)}
                      onUnassign={() => onUnassign(def.id)}
                      onOpenHero={def.hasFullbody ? () => setHeroView(def.id) : undefined}
                    />
                  );
                })}
              </div>
            </>
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

/** Portrait or, for the 20 W8 leaders with no unique art yet, a text-avatar
 *  fallback (initials on a rarity-tinted field) — never a 404'd <Image>. */
function Portrait({ def, size }: { def: CommanderDefinition; size: number }) {
  if (!hasPortraitArt(def)) {
    const initials = def.name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase();
    const accent = RARITY_ACCENT[def.rarity];
    return (
      <div className={`absolute inset-0 w-full h-full flex items-center justify-center ${accent.text}`} style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.06), transparent)' }} aria-hidden="true">
        <span className="game-heading font-bold" style={{ fontSize: size / 3 }}>{initials || '??'}</span>
      </div>
    );
  }
  return (
    <Image
      src={getPortraitUrl(def)}
      alt=""
      width={size}
      height={size}
      className="absolute inset-0 w-full h-full object-cover"
    />
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
        <Portrait def={def} size={256} />
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

/** Targets a post type can point at, for the assignment picker. */
function targetOptionsFor(
  postType: AssignmentPostType,
  state: GameState,
  activeExpeditions: GameState['expeditions'],
): { id: string; label: string }[] {
  switch (postType) {
    case 'research':
      return RESEARCH_CATEGORIES.map(c => ({ id: c.id, label: `${c.icon} ${c.name}` }));
    case 'science_program':
      return SCIENCE_PROGRAMS.map(p => ({ id: p.id, label: `${p.icon} ${p.name}` }));
    case 'expedition':
      return (activeExpeditions || []).map(e => ({
        id: e.id,
        label: INTERSTELLAR_SYSTEM_MAP.get(e.targetSystemId)?.name || e.targetSystemId,
      }));
    case 'zone':
      return (state.unlockedLocations || []).map(id => ({ id, label: LOCATION_MAP.get(id)?.name || id }));
    default:
      return [];
  }
}

function targetLabelFor(assignment: { postType: AssignmentPostType; targetId?: string }, state: GameState): string | null {
  if (!assignment.targetId) return null;
  switch (assignment.postType) {
    case 'research':
      return RESEARCH_CATEGORIES.find(c => c.id === assignment.targetId)?.name || assignment.targetId;
    case 'science_program':
      return SCIENCE_PROGRAMS.find(p => p.id === assignment.targetId)?.name || assignment.targetId;
    case 'expedition':
      return INTERSTELLAR_SYSTEM_MAP.get(
        (state.expeditions || []).find(e => e.id === assignment.targetId)?.targetSystemId || '',
      )?.name || assignment.targetId;
    case 'zone':
      return LOCATION_MAP.get(assignment.targetId)?.name || assignment.targetId;
    default:
      return null;
  }
}

const POST_TYPES: AssignmentPostType[] = ['research', 'science_program', 'expedition', 'zone', 'fleet_ops', 'market_desk'];
const NEEDS_TARGET: Record<AssignmentPostType, boolean> = {
  research: true, science_program: true, expedition: true, zone: true, fleet_ops: false, market_desk: false,
};

function HiredCommanderCard({
  def,
  hiredCommander,
  state,
  activeExpeditions,
  onDismiss,
  onAssign,
  onUnassign,
  onOpenHero,
}: {
  def: CommanderDefinition;
  hiredCommander: HiredCommander;
  state: GameState;
  activeExpeditions: GameState['expeditions'];
  onDismiss: () => void;
  onAssign: (postType: AssignmentPostType, targetId?: string) => void;
  onUnassign: () => void;
  onOpenHero?: () => void;
}) {
  const accent = RARITY_ACCENT[def.rarity];
  const { specialty, quirk } = getCommanderTraits(def.id);
  const xpProgress = getCommanderXpProgress(hiredCommander);
  const assignment = hiredCommander.assignment;
  const availablePosts = POST_TYPES.filter(p => canAssignToPost(def, p));

  const [pickerPost, setPickerPost] = useState<AssignmentPostType>(availablePosts[0]);
  const [pickerTarget, setPickerTarget] = useState<string>('');

  const targetOptions = targetOptionsFor(pickerPost, state, activeExpeditions);
  const needsTarget = NEEDS_TARGET[pickerPost];
  const canSubmit = !needsTarget || !!pickerTarget;
  const isProductive = !!assignment && isAssignmentProductive(state, assignment);

  return (
    <div className={`rounded-xl overflow-hidden border-2 ${accent.border} shadow-lg ${accent.glow}`} style={{ background: '#0a0a1a' }}>
      <div className="flex gap-3 p-3">
        {/* Portrait */}
        <button
          type="button"
          aria-label={onOpenHero ? `View hero portrait for ${def.name}` : `${def.name} portrait`}
          className="hud-frame holo-sprite relative w-20 h-20 shrink-0 rounded-lg bg-gradient-to-b from-transparent to-black/60 overflow-hidden group focus:outline-none focus:ring-2 focus:ring-cyan-400"
          onClick={onOpenHero}
          disabled={!onOpenHero}
        >
          <Portrait def={def} size={80} />
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="text-white text-sm font-bold leading-tight truncate">{def.name}</div>
              <div className="text-slate-500 text-[10px] truncate">{def.title}</div>
            </div>
            <span className={`shrink-0 text-[9px] px-1.5 py-0.5 rounded ${accent.text}`} style={{ background: 'rgba(255,255,255,0.05)' }}>
              {CLASS_LABEL[def.class]}
            </span>
          </div>

          {/* Level / XP bar */}
          <div className="mt-1.5">
            <div className="flex items-center justify-between text-[9px] text-slate-500 mb-0.5">
              <span>Level {xpProgress.level}{xpProgress.level >= MAX_LEVEL ? ' (max)' : ''}</span>
              <span>{xpProgress.xpForNextLevel !== null ? `${xpProgress.xp}/${xpProgress.xpForNextLevel} XP` : 'MAX'}</span>
            </div>
            <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden" role="progressbar" aria-valuenow={Math.round(xpProgress.pctToNextLevel * 100)} aria-valuemin={0} aria-valuemax={100} aria-label={`${def.name} level progress`}>
              <div className="h-full bg-cyan-500/70" style={{ width: `${xpProgress.pctToNextLevel * 100}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* Trait chips (text tooltips — not color-only) */}
      <div className="px-3 flex flex-wrap gap-1.5">
        <span
          className="text-[9px] px-1.5 py-0.5 rounded border border-emerald-500/30 text-emerald-300 bg-emerald-500/5"
          title={`Specialty — ${specialty.name}: ${specialty.description}`}
        >
          ★ {specialty.name}
        </span>
        <span
          className="text-[9px] px-1.5 py-0.5 rounded border border-amber-500/30 text-amber-300 bg-amber-500/5"
          title={`Quirk — ${quirk.name}: ${quirk.description}`}
        >
          ◆ {quirk.name}
        </span>
      </div>

      {/* Assignment */}
      <div className="px-3 pt-2 pb-3 mt-2 border-t border-white/[0.06]">
        {assignment ? (
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="text-[10px] text-slate-400">
                Posted: <span className="text-white font-medium">{ASSIGNMENT_POST_LABEL[assignment.postType]}</span>
                {targetLabelFor(assignment, state) && <> — {targetLabelFor(assignment, state)}</>}
              </div>
              <div className={`text-[9px] mt-0.5 ${isProductive ? 'text-emerald-400' : 'text-slate-600'}`}>
                {isProductive ? 'Active — earning XP this month' : 'Idle — no XP this month (post not producing)'}
              </div>
            </div>
            <button
              onClick={onUnassign}
              className="shrink-0 min-h-[36px] px-2.5 py-1 rounded text-[10px] font-medium bg-white/[0.04] text-slate-400 hover:text-white border border-white/[0.08]"
            >
              Unassign
            </button>
          </div>
        ) : availablePosts.length === 0 ? (
          <div className="text-[10px] text-slate-600">No posts available for this class.</div>
        ) : (
          <div className="space-y-1.5">
            <label className="sr-only" htmlFor={`post-${def.id}`}>Assignment post for {def.name}</label>
            <select
              id={`post-${def.id}`}
              value={pickerPost}
              onChange={e => { setPickerPost(e.target.value as AssignmentPostType); setPickerTarget(''); }}
              className="w-full min-h-[36px] px-2 rounded bg-white/[0.04] border border-white/[0.08] text-[11px] text-white"
            >
              {availablePosts.map(p => (
                <option key={p} value={p} className="bg-black">{ASSIGNMENT_POST_LABEL[p]}</option>
              ))}
            </select>
            {needsTarget && (
              <>
                <label className="sr-only" htmlFor={`target-${def.id}`}>Assignment target for {def.name}</label>
                <select
                  id={`target-${def.id}`}
                  value={pickerTarget}
                  onChange={e => setPickerTarget(e.target.value)}
                  className="w-full min-h-[36px] px-2 rounded bg-white/[0.04] border border-white/[0.08] text-[11px] text-white"
                >
                  <option value="" className="bg-black">Select target…</option>
                  {targetOptions.map(o => (
                    <option key={o.id} value={o.id} className="bg-black">{o.label}</option>
                  ))}
                </select>
              </>
            )}
            <button
              onClick={() => onAssign(pickerPost, pickerTarget || undefined)}
              disabled={!canSubmit}
              className={`w-full min-h-[36px] px-2 py-1.5 rounded text-[10px] font-bold transition-colors ${
                canSubmit ? 'bg-cyan-500 text-black hover:bg-cyan-400' : 'bg-white/[0.04] text-slate-500 cursor-not-allowed'
              }`}
            >
              Assign
            </button>
          </div>
        )}
      </div>

      <div className="px-3 pb-3">
        <button
          onClick={onDismiss}
          className="w-full min-h-[36px] px-2 py-1.5 rounded text-[10px] font-medium bg-red-500/15 text-red-300 hover:bg-red-500/25 border border-red-500/30"
        >
          Dismiss
        </button>
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
