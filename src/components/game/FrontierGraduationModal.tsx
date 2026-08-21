'use client';

import type { GameState, GameTab } from '@/lib/game/types';
import { computeNetWorth, computeBookNetWorth, GRADUATION_GLIDE_MS } from '@/lib/game/frontier';
import { formatMoney } from '@/lib/game/formulas';
import { PRICE_CAMPAIGN_MIN_NET_WORTH } from '@/lib/game/price-campaigns';
import { deriveAvailableTools, COMPETITIVE_TOOL_MAP } from '@/lib/game/competitive-posture';
import { requestSubView } from '@/lib/game/sub-view';
import { useModalA11y } from './useModalA11y';
import GameIcon from './GameIcon';

interface Props {
  state: GameState;
  onClose: () => void;
  /** PvP Discoverability pass: lets the briefing hand the player straight to
   *  a tool it just told them about. Optional — without it the modal simply
   *  lists the tools without deep links (its pre-pass behaviour). */
  onNavigate?: (tab: GameTab) => void;
}

/**
 * Celebratory one-time modal shown the moment a player's Protected Frontier
 * status flips from 'active' to 'graduated' — whether by hitting the net-worth
 * threshold, running out the 30-day clock, or voluntarily graduating early.
 * Explains what changes: open-economy risk now real, plus what unlocks.
 * Per CLAUDE.md: "Graduation to the open economy happens at a set net-worth
 * threshold." See src/lib/game/frontier.ts for the underlying mechanics.
 */
export default function FrontierGraduationModal({ state, onClose, onNavigate }: Props) {
  const modalRef = useModalA11y<HTMLDivElement>(onClose);
  const netWorth = computeNetWorth(state);

  // ── PvP Discoverability pass (2026-08) — the graduation BEAT ─────────────
  // Graduation is the single moment the shields drop and the competitive
  // game actually begins, and until this pass the player just... graduated.
  // These two lists are derived from real state (competitive-posture.ts's
  // availability predicates + the offense net-worth floor), never authored,
  // so the modal can never promise a tool the save does not have.
  const bookNetWorth = computeBookNetWorth(state);
  const availableNow = deriveAvailableTools(state)
    .map(id => COMPETITIVE_TOOL_MAP.get(id))
    .filter((t): t is NonNullable<typeof t> => !!t);
  const offenseFloorShortfall = PRICE_CAMPAIGN_MIN_NET_WORTH - bookNetWorth;
  const glideDays = Math.round(GRADUATION_GLIDE_MS / (24 * 60 * 60 * 1000));

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

          {/* ── The competitive briefing (PvP Discoverability pass) ──────── */}
          <div className="rounded-lg bg-white/[0.03] border border-white/[0.1] p-3 mb-4">
            <div className="text-[10px] uppercase tracking-wider text-slate-300 font-bold mb-1.5 flex items-center gap-1.5">
              <GameIcon name="swords" size={12} /> Your competitive toolkit
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed mb-2">
              Corporate warfare here is economic — out-producing, out-bidding and out-manoeuvring.
              Nobody can shoot at you and you can never shoot at anyone. What you can do is take
              share, deny scarce ground, and make a rival&apos;s inputs expensive — and they can do
              the same to you.
            </p>
            {availableNow.length > 0 ? (
              <ul className="space-y-1.5 mb-2" role="list">
                {availableNow.map(t => (
                  <li key={t.id} className="text-[11px] text-slate-300 leading-relaxed">
                    <span className="text-[9px] uppercase tracking-wider font-bold px-1 py-0.5 rounded border border-white/15 text-slate-400 mr-1.5">
                      {t.posture}
                    </span>
                    <span className="font-bold text-white">{t.name}</span> — {t.what}
                    {onNavigate && (
                      <>
                        {' '}
                        <button
                          type="button"
                          onClick={() => {
                            if (t.subView) requestSubView(t.subView);
                            onNavigate(t.tab);
                            onClose();
                          }}
                          className="underline decoration-dotted underline-offset-2 text-cyan-300 hover:text-cyan-200 focus:outline-none focus:ring-2 focus:ring-cyan-400 rounded"
                        >
                          Show me
                        </button>
                      </>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[11px] text-slate-400 leading-relaxed mb-2">
                None of the offensive tools are open to you yet — they gate on corporation tier and
                on a {formatMoney(PRICE_CAMPAIGN_MIN_NET_WORTH)} net-worth floor. Keep building; the
                game will tell you the moment each one becomes available.
              </p>
            )}
            {offenseFloorShortfall > 0 && (
              <p className="text-[10px] text-slate-500 leading-relaxed">
                Price campaigns and talent poaching open at {formatMoney(PRICE_CAMPAIGN_MIN_NET_WORTH)} book
                net worth — {formatMoney(offenseFloorShortfall)} above where you stand today.
              </p>
            )}
            <p className="text-[10px] text-slate-500 leading-relaxed mt-1.5">
              You keep a decaying shield for the next {glideDays} days: crowded service markets and
              depressed commodity prices are blended back toward neutral for you, fading to the real
              market rate. Use it to establish a position before the full field applies.
            </p>
            <p className="text-[10px] text-slate-500 leading-relaxed mt-1.5">
              Ignoring all of it is a supported way to play — plenty of corporations simply grow
              their own book and never declare anything.
            </p>
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
