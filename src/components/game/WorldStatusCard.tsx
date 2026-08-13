'use client';

// ─── World Status Card (audit Change #3 / D1 + top-10 item #3) ─────────────
// Dashboard surface for the two "races" the server already runs but nothing
// rendered: the four global first-to-colonize milestones and the limited-
// winner competitive contract pool. Makes scarcity and rivalry visible
// without leaving the Command Center.

import { useWorldState, useCompetitiveContracts, LOCATION_MILESTONE_MAP } from '@/hooks/useWorldState';
import { formatMoney } from '@/lib/game/formulas';

export default function WorldStatusCard({ companyName }: { companyName?: string }) {
  const { world, available: worldAvailable } = useWorldState();
  const { contracts, available: contractsAvailable } = useCompetitiveContracts();

  if (!worldAvailable && !contractsAvailable) {
    return (
      <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 text-center">
        <p className="text-slate-500 text-[11px]">
          🌐 Sign in to see the live world — other corporations&rsquo; colony claims, milestone races, and competitive contracts.
        </p>
      </div>
    );
  }

  const races = Object.entries(LOCATION_MILESTONE_MAP);
  const openRaces = races.filter(([, def]) => !world?.milestones[def.id]);
  const claimedRaces = races.filter(([, def]) => world?.milestones[def.id]);

  // Only surface competitive contracts that are actually open right now —
  // the pool includes tiers gated by game-month that aren't live yet.
  const liveContracts = [...contracts]
    .filter(c => !c.isFull)
    .sort((a, b) => b.reward.money - a.reward.money)
    .slice(0, 3);
  const fullContracts = contracts.filter(c => c.isFull).length;

  return (
    <div className="hud-frame relative rounded-xl border border-purple-500/15 bg-gradient-to-br from-purple-500/[0.04] to-white/[0.02] p-4">
      <span className="hud-corner-bl" aria-hidden="true" />
      <span className="hud-corner-br" aria-hidden="true" />
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-hud text-white text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
          <span aria-hidden="true">🌐</span> The Live World
        </h3>
        {world && (
          <span className="text-[10px] text-slate-500 font-mono">{world.world.totalColonists} colony claims across the system</span>
        )}
      </div>

      {/* Milestone races */}
      {worldAvailable && (
        <div className="mb-3">
          <p className="game-label mb-1.5">First-Mover Milestone Races</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            {claimedRaces.map(([locId, def]) => {
              const winner = world?.milestones[def.id];
              const wonByYou = !!companyName && winner === companyName;
              return (
                <div key={locId} className={`text-[10px] px-2 py-1.5 rounded-lg border ${wonByYou ? 'border-amber-500/30 bg-amber-500/10' : 'border-white/[0.06] bg-white/[0.02]'}`}>
                  <span className="text-slate-300">{def.label}</span>
                  <div className={wonByYou ? 'text-amber-300 font-semibold' : 'text-slate-500'}>
                    🏆 {wonByYou ? 'You claimed this!' : `Claimed by ${winner}`}
                  </div>
                </div>
              );
            })}
            {openRaces.map(([locId, def]) => (
              <div key={locId} className="text-[10px] px-2 py-1.5 rounded-lg border border-emerald-500/20 bg-emerald-500/5">
                <span className="text-slate-300">{def.label}</span>
                <div className="text-emerald-300 font-semibold">🏁 OPEN — be first</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Competitive contracts */}
      {contractsAvailable && liveContracts.length > 0 && (
        <div>
          <p className="game-label mb-1.5">
            Competitive Contracts {fullContracts > 0 && <span className="text-slate-600 normal-case">({fullContracts} filled)</span>}
          </p>
          <div className="space-y-1">
            {liveContracts.map(c => (
              <div key={c.id} className="flex items-center justify-between text-[10px] px-2 py-1.5 rounded-lg bg-white/[0.02] border border-white/[0.06]">
                <span className="text-slate-300 truncate pr-2">{c.title}</span>
                <span className="shrink-0 flex items-center gap-2">
                  <span className="text-green-400 font-mono">{formatMoney(c.reward.money)}</span>
                  <span className="text-cyan-300 font-mono">{c.slotsRemaining}/{c.maxWinners} slots</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
