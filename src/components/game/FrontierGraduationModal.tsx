'use client';

import type { GameState } from '@/lib/game/types';
import { computeNetWorth } from '@/lib/game/frontier';
import { formatMoney } from '@/lib/game/formulas';
import { useModalA11y } from './useModalA11y';

interface Props {
  state: GameState;
  onClose: () => void;
}

/**
 * Celebratory one-time modal shown the moment a player's Protected Frontier
 * status flips from 'active' to 'graduated' — whether by hitting the net-worth
 * threshold, running out the 30-day clock, or voluntarily graduating early.
 * Explains what changes: open-economy risk now real, plus what unlocks.
 * Per CLAUDE.md: "Graduation to the open economy happens at a set net-worth
 * threshold." See src/lib/game/frontier.ts for the underlying mechanics.
 */
export default function FrontierGraduationModal({ state, onClose }: Props) {
  const modalRef = useModalA11y<HTMLDivElement>(onClose);
  const netWorth = computeNetWorth(state);

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="graduation-title">
      <div className="absolute inset-0 bg-black/85 backdrop-blur-md game-modal-backdrop" onClick={onClose} aria-hidden="true" />
      <div ref={modalRef} tabIndex={-1} className="relative w-full max-w-lg rounded-2xl overflow-hidden border border-amber-500/30 game-modal-card" style={{ background: '#0a0a1a' }}>
        <div className="h-1 bg-gradient-to-r from-purple-500 via-amber-400 to-cyan-500" aria-hidden="true" />

        <div className="p-5 sm:p-6">
          <div className="text-center mb-4">
            <div className="text-4xl mb-2" aria-hidden="true">🎓</div>
            <h2 id="graduation-title" className="text-white text-xl sm:text-2xl font-bold font-hud">
              Protected Frontier Complete
            </h2>
            <p className="text-slate-400 text-xs mt-1.5 max-w-md mx-auto leading-relaxed">
              Your corporation has graduated into the open economy at a net worth of{' '}
              <span className="text-white font-mono">{formatMoney(netWorth)}</span>. The training wheels are off —
              everything from here is earned against the full field.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-3 mb-4">
            {/* Risks now real */}
            <div className="rounded-lg bg-red-500/5 border border-red-500/20 p-3">
              <div className="text-[10px] uppercase tracking-wider text-red-300 font-bold mb-1.5 flex items-center gap-1.5">
                <span aria-hidden="true">⚠</span> Now At Risk
              </div>
              <ul className="text-[11px] text-slate-300 space-y-1.5">
                <li>Rival corporations can target your assets economically (never combat)</li>
                <li>Espionage operations can be run against you</li>
                <li>NPC piracy, sabotage, and hazard events are no longer suppressed</li>
                <li>Contract payouts drop to standard rates (Frontier's +25% bonus ends)</li>
                <li>Buildings start consuming real monthly inputs (propellant, spares, life support) — watch the Supply Lines strip on the Dashboard; stock inputs or set standing orders</li>
              </ul>
            </div>

            {/* Unlocked */}
            <div className="rounded-lg bg-cyan-500/5 border border-cyan-500/20 p-3">
              <div className="text-[10px] uppercase tracking-wider text-cyan-300 font-bold mb-1.5 flex items-center gap-1.5">
                <span aria-hidden="true">🔓</span> Now Unlocked
              </div>
              <ul className="text-[11px] text-slate-300 space-y-1.5">
                <li>You can scout, raid, and out-maneuver other graduated corporations</li>
                <li>Full league standings and rival leaderboards count you in</li>
                <li>Diplomacy, binding contracts, and market intelligence on rivals</li>
                <li>Insurance, redundancy, and hazard-mitigation strategy actually matters now</li>
              </ul>
            </div>
          </div>

          <p className="text-[10px] text-slate-500 text-center mb-4">
            This is permanent — invest in shielding, insurance, and contingency planning before you need them.
          </p>

          <button
            onClick={onClose}
            className="w-full min-h-[44px] px-3 py-2.5 rounded-lg text-sm font-bold bg-gradient-to-r from-purple-500/20 to-cyan-500/20 text-white border border-white/20 hover:from-purple-500/30 hover:to-cyan-500/30 focus:outline-none focus:ring-2 focus:ring-cyan-400 transition-colors"
          >
            Enter the Open Economy
          </button>
        </div>
      </div>
    </div>
  );
}
