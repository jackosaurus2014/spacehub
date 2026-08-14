'use client';

// ─── Space Tycoon: Standings Hub ────────────────────────────────────────────
// Audit Wave F (docs/GAME_SYSTEMS_AUDIT_2026-08.md §B3): merges the three
// "how do I compare?" tabs — Leagues (stakes: cash/title/rank boosts),
// Ranks/Leaderboard, Rivals — into one hub. Leagues is the spine when
// unlocked (it's the only one of the three with real stakes); before that
// tier, Ranks is the default since it's always available. All functionality
// preserved; subtabs keep their original corp-tier gate (FOLDED_FEATURE_TIERS).

import { useState } from 'react';
import type { GameState } from '@/lib/game/types';
import { isFoldedFeatureUnlocked, FOLDED_FEATURE_TIERS } from '@/lib/game/corporation-tiers';
import LeaguePanel from './LeaguePanel';
import LeaderboardPanel from './LeaderboardPanel';
import RivalsPanel from './RivalsPanel';
import HeritageRegistryPanel from './HeritageRegistryPanel';
import LockedSubtabNotice from './LockedSubtabNotice';

interface StandingsHubPanelProps {
  state: GameState;
}

type StandingsTab = 'leagues' | 'ranks' | 'rivals' | 'heritage';

export default function StandingsHubPanel({ state }: StandingsHubPanelProps) {
  const tier = state.corporationTier || 1;
  const leaguesUnlocked = isFoldedFeatureUnlocked(tier, 'leagues');
  const rivalsUnlocked = isFoldedFeatureUnlocked(tier, 'rivals');

  const [tab, setTab] = useState<StandingsTab>(leaguesUnlocked ? 'leagues' : 'ranks');

  // Heritage Registry is flavor/browse-only (real-company-derived NPC
  // dossiers, no economic stakes), so it's available from tier 1 — unlike
  // Leagues/Rivals it never needs a LockedSubtabNotice.
  const tabs: { id: StandingsTab; label: string; icon: string; locked: boolean }[] = [
    { id: 'leagues', label: 'Leagues', icon: '🏅', locked: !leaguesUnlocked },
    { id: 'ranks', label: 'Ranks', icon: '🏆', locked: false },
    { id: 'rivals', label: 'Rivals', icon: '⚔️', locked: !rivalsUnlocked },
    { id: 'heritage', label: 'Heritage', icon: '◆', locked: false },
  ];

  return (
    <div className="space-y-3">
      <div className="flex rounded-lg overflow-hidden border border-white/[0.06] w-fit" role="tablist" aria-label="Standings view">
        {tabs.map(t => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={`min-h-[44px] px-3 py-1.5 text-[11px] font-medium transition-colors ${
              tab === t.id ? 'bg-white/[0.08] text-white' : 'text-slate-500 hover:text-white hover:bg-white/[0.04]'
            }`}
          >
            {t.icon} {t.label}{t.locked ? ' 🔒' : ''}
          </button>
        ))}
      </div>
      {tab === 'leagues' && (leaguesUnlocked ? <LeaguePanel /> : <LockedSubtabNotice icon="🏅" label="Leagues" tier={FOLDED_FEATURE_TIERS.leagues} />)}
      {tab === 'ranks' && <LeaderboardPanel state={state} />}
      {tab === 'rivals' && (rivalsUnlocked ? <RivalsPanel /> : <LockedSubtabNotice icon="⚔️" label="Rivals" tier={FOLDED_FEATURE_TIERS.rivals} />)}
      {tab === 'heritage' && <HeritageRegistryPanel />}
    </div>
  );
}
