'use client';

import type { GameState } from '@/lib/game/types';
import {
  DOCTRINE_CATEGORY_LABEL,
  getPoliciesForCategory,
  DEFAULT_DOCTRINE,
  getDoctrineSwitchCost,
  canSwitchDoctrinePolicy,
  DOCTRINE_SWITCH_COOLDOWN_MONTHS,
  getConstituencyApprovals,
  getCurrentBoardDirective,
  CONSTITUENCY_MAP,
} from '@/lib/game/corporate-doctrine';
import type { DoctrineCategory, DoctrinePolicyId, ConstituencyMood } from '@/lib/game/corporate-doctrine';
import { getTotalGameMonthsElapsed } from '@/lib/game/quarterly-reports';
import { formatMoney } from '@/lib/game/formulas';
import { playSound } from '@/lib/game/sound-engine';
import type { EraCharterId } from '@/lib/game/types';
import CorporateEraPanel from './CorporateEraPanel';

interface GovernancePanelProps {
  state: GameState;
  onSwitchPolicy: (category: DoctrineCategory, policyId: DoctrinePolicyId | null) => void;
  /** Live-Service Wave LS4 (docs/LIVE_SERVICE_2026-08.md §LS4): charter a new
   *  90-day era. Era chartering lives with board politics per the spec — the
   *  Governance tab is where doctrine, board directives, AND era mandates all
   *  live, since all three are board-level decisions. */
  onCharterEra: (charterId: EraCharterId) => void;
}

const CATEGORY_ORDER: DoctrineCategory[] = ['operations', 'disclosure', 'compensation'];

// Colorblind-safe mood presentation — text label + glyph, never color alone.
const MOOD_META: Record<ConstituencyMood, { glyph: string; label: string; barColor: string }> = {
  restive:    { glyph: '▼▼', label: 'Restive',    barColor: 'from-red-500 to-red-400' },
  uneasy:     { glyph: '▼',  label: 'Uneasy',      barColor: 'from-amber-500 to-amber-400' },
  steady:     { glyph: '●',  label: 'Steady',      barColor: 'from-cyan-500 to-cyan-400' },
  supportive: { glyph: '▲',  label: 'Supportive',  barColor: 'from-emerald-500 to-emerald-400' },
};

const DIRECTIVE_METRIC_ICON: Record<string, string> = {
  growth: '📈', profit: '💰', safety: '🛡️',
};

export default function GovernancePanel({ state, onSwitchPolicy, onCharterEra }: GovernancePanelProps) {
  const doctrine = state.corporateDoctrine || DEFAULT_DOCTRINE;
  const currentTotalMonths = getTotalGameMonthsElapsed(state.gameDate);
  const switchCost = getDoctrineSwitchCost(state.workforce);
  const approvals = getConstituencyApprovals(state);
  const currentDirective = getCurrentBoardDirective(state);
  const directiveHistory = (state.boardDirectives || []).filter(d => d.status !== 'pending').slice(-4).reverse();

  return (
    <div className="space-y-4">
      {/* Header banner */}
      <div className="hud-frame relative flex items-center justify-between px-3 py-2 rounded-lg bg-white/[0.02] border border-white/[0.04]">
        <span className="hud-corner-bl" aria-hidden="true" />
        <span className="hud-corner-br" aria-hidden="true" />
        <div className="flex items-center gap-2">
          <span className="text-base" aria-hidden="true">🏛️</span>
          <span className="font-hud text-[10px] text-slate-400 uppercase tracking-wider font-medium">Corporate Doctrine &amp; Board Politics</span>
        </div>
        <span className="text-[10px] text-slate-500">Policies, constituencies, and quarterly board expectations</span>
      </div>

      {/* ── Corporate Eras (Live-Service Wave LS4) ─────────────────────── */}
      <CorporateEraPanel state={state} onCharterEra={onCharterEra} />

      {/* ── Policies ─────────────────────────────────────────────────── */}
      <div className="hud-frame relative rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
        <span className="hud-corner-bl" aria-hidden="true" />
        <span className="hud-corner-br" aria-hidden="true" />
        <p className="font-hud text-white text-xs font-bold mb-1 uppercase tracking-wider">Corporate Policies</p>
        <p className="text-[10px] text-slate-500 mb-3">
          One stance per category. Switching costs {formatMoney(switchCost)} and locks the category for {DOCTRINE_SWITCH_COOLDOWN_MONTHS} game-months — no free re-toggling.
        </p>
        <div className="space-y-4">
          {CATEGORY_ORDER.map(category => {
            const options = getPoliciesForCategory(category);
            const active = doctrine.activePolicies[category] ?? null;
            const gate = canSwitchDoctrinePolicy(doctrine, category, currentTotalMonths);
            return (
              <div key={category}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] uppercase tracking-wider text-cyan-300 font-bold">{DOCTRINE_CATEGORY_LABEL[category]}</span>
                  {!gate.allowed && (
                    <span className="text-[10px] text-amber-400 font-mono">Cooldown: {gate.monthsRemaining}mo</span>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {options.map(opt => {
                    const isActive = active === opt.id;
                    const canAfford = state.money >= switchCost;
                    const disabled = isActive || !gate.allowed || !canAfford;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => {
                          if (disabled) return;
                          playSound('click');
                          onSwitchPolicy(category, opt.id);
                        }}
                        disabled={disabled}
                        aria-pressed={isActive}
                        title={!gate.allowed ? `On cooldown: ${gate.monthsRemaining} game-month(s) remaining` : (!canAfford ? `Need ${formatMoney(switchCost)} to switch` : undefined)}
                        className={`text-left min-h-[44px] rounded-lg border p-2.5 transition-colors ${
                          isActive
                            ? 'border-cyan-400/60 bg-cyan-500/10'
                            : disabled
                              ? 'border-white/[0.04] bg-white/[0.01] opacity-50 cursor-not-allowed'
                              : 'border-white/[0.06] bg-white/[0.02] hover:border-cyan-400/30 hover:bg-cyan-500/5'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 mb-1">
                          <span aria-hidden="true">{opt.icon}</span>
                          <span className="text-[11px] font-medium text-white">{opt.name}</span>
                          {isActive && <span className="text-[10px] font-mono text-cyan-300 uppercase ml-auto">Active</span>}
                        </div>
                        <p className="text-[11px] text-slate-400 mb-1">{opt.description}</p>
                        <p className="text-[10px] text-amber-400/80">Catch: {opt.tradeoff}</p>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Constituencies ───────────────────────────────────────────── */}
      <div className="hud-frame relative rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
        <span className="hud-corner-bl" aria-hidden="true" />
        <span className="hud-corner-br" aria-hidden="true" />
        <p className="font-hud text-white text-xs font-bold mb-1 uppercase tracking-wider">Workforce Constituencies</p>
        <p className="text-[10px] text-slate-500 mb-3">
          Approval reacts to your policy mix, recent hazards, cash position, and board-directive record. Low approval draws demands.
        </p>
        <div className="space-y-2">
          {approvals.map(a => {
            const meta = MOOD_META[a.mood];
            const def = CONSTITUENCY_MAP.get(a.id)!;
            const name = def.name;
            return (
              <div key={a.id} className="rounded-lg bg-white/[0.03] p-2">
                <div className="flex justify-between items-baseline mb-1">
                  <span className="text-[10px] text-white font-medium flex items-center gap-1.5">
                    <span aria-hidden="true">{def.icon}</span>{name}
                  </span>
                  <span className="text-[10px] font-mono text-slate-300">
                    <span aria-hidden="true">{meta.glyph}</span> {meta.label} · {a.approval}%
                  </span>
                </div>
                <div
                  className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden"
                  role="progressbar"
                  aria-label={`${name} approval: ${a.approval}% (${meta.label})`}
                  aria-valuenow={a.approval}
                  aria-valuemin={0}
                  aria-valuemax={100}
                >
                  <div
                    className={`h-full bg-gradient-to-r ${meta.barColor} rounded-full transition-all`}
                    style={{ width: `${a.approval}%` }}
                    aria-hidden="true"
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Board directives ─────────────────────────────────────────── */}
      <div className="hud-frame relative rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
        <span className="hud-corner-bl" aria-hidden="true" />
        <span className="hud-corner-br" aria-hidden="true" />
        <p className="font-hud text-white text-xs font-bold mb-1 uppercase tracking-wider">Board Directives</p>
        <p className="text-[10px] text-slate-500 mb-3">
          One growth, profit, or safety target per quarter. A hit earns board confidence (reputation); a miss dents crew morale.
        </p>
        {currentDirective ? (
          <div className="rounded-lg bg-white/[0.03] p-2.5 mb-2">
            <div className="flex items-center gap-1.5 mb-1">
              <span aria-hidden="true">{DIRECTIVE_METRIC_ICON[currentDirective.metric]}</span>
              <span className="text-[11px] text-white font-medium">{currentDirective.label}</span>
              <span className={`text-[10px] font-mono uppercase ml-auto ${
                currentDirective.status === 'pending' ? 'text-cyan-300'
                  : currentDirective.status === 'hit' ? 'text-emerald-400' : 'text-red-400'
              }`}>
                {currentDirective.status === 'pending' ? 'In progress' : currentDirective.status}
              </span>
            </div>
            <p className="text-[10px] text-slate-500">Quarter {currentDirective.quarterIndex + 1}{currentDirective.actualValue !== undefined ? ` — actual: ${currentDirective.metric === 'profit' ? formatMoney(currentDirective.actualValue) : currentDirective.actualValue}` : ''}</p>
          </div>
        ) : (
          <p className="text-[10px] text-slate-500 mb-2">No directive yet — the board issues its first target after your first quarterly report.</p>
        )}
        {directiveHistory.length > 0 && (
          <div className="space-y-1">
            <p className="text-[10px] text-slate-500 uppercase tracking-wider">History</p>
            {directiveHistory.map(d => (
              <div key={d.id} className="flex items-center justify-between text-[10px] text-slate-400 py-0.5">
                <span className="flex items-center gap-1"><span aria-hidden="true">{DIRECTIVE_METRIC_ICON[d.metric]}</span>{d.label}</span>
                <span className={d.status === 'hit' ? 'text-emerald-400' : 'text-red-400'}>{d.status === 'hit' ? '✓ Hit' : '✗ Missed'}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
