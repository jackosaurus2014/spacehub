'use client';

// ─── Space Tycoon: Standings Hub ────────────────────────────────────────────
// Audit Wave F (docs/GAME_SYSTEMS_AUDIT_2026-08.md §B3): merges the three
// "how do I compare?" tabs — Leagues (stakes: cash/title/rank boosts),
// Ranks/Leaderboard, Rivals — into one hub. Leagues is the spine when
// unlocked (it's the only one of the three with real stakes); before that
// tier, Ranks is the default since it's always available. All functionality
// preserved; subtabs keep their original corp-tier gate (FOLDED_FEATURE_TIERS).
//
// Six-hub consolidation (2026-09): lives under the Records hub, whose row
// drives the view (`embedded`) through the sub-view bus — 'rivals' is now a
// first-row entry (it was three taps deep).

import type { GameState } from '@/lib/game/types';
import { isFoldedFeatureUnlocked, FOLDED_FEATURE_TIERS } from '@/lib/game/corporation-tiers';
import LeaguePanel from './LeaguePanel';
import LeaderboardPanel from './LeaderboardPanel';
import RivalsPanel from './RivalsPanel';
import HeritageRegistryPanel from './HeritageRegistryPanel';
import LockedSubtabNotice from './LockedSubtabNotice';
import { ConsolePanel } from './chrome';
import GameIcon from './GameIcon';
import type { IconName } from '@/lib/game/icons';
import { useHubSubView } from './useHubSubView';

interface StandingsHubPanelProps {
  state: GameState;
  /** Six-hub shell: hide the panel's own strip; the Records row drives it. */
  embedded?: boolean;
}

type StandingsTab = 'leagues' | 'ranks' | 'rivals' | 'heritage';

export default function StandingsHubPanel({ state, embedded = false }: StandingsHubPanelProps) {
  const tier = state.corporationTier || 1;
  const leaguesUnlocked = isFoldedFeatureUnlocked(tier, 'leagues');
  const rivalsUnlocked = isFoldedFeatureUnlocked(tier, 'rivals');

  const [tab, setTab] = useHubSubView<StandingsTab>(
    'leaderboard',
    leaguesUnlocked ? 'leagues' : 'ranks',
    requested => (requested === 'leagues' || requested === 'ranks' || requested === 'rivals' || requested === 'heritage') ? requested : null,
  );

  // Heritage Registry is flavor/browse-only (real-company-derived NPC
  // dossiers, no economic stakes), so it's available from tier 1 — unlike
  // Leagues/Rivals it never needs a LockedSubtabNotice.
  const tabs: { id: StandingsTab; label: string; icon: IconName; locked: boolean }[] = [
    { id: 'leagues', label: 'Leagues', icon: 'leaderboard', locked: !leaguesUnlocked },
    { id: 'ranks', label: 'Ranks', icon: 'leaderboard', locked: false },
    { id: 'rivals', label: 'Rivals', icon: 'swords', locked: !rivalsUnlocked },
    { id: 'heritage', label: 'Heritage', icon: 'archive', locked: false },
  ];

  return (
    <div className="space-y-3">
      {!embedded && (
        <ConsolePanel title="Standings" icon="leaderboard" subtitle="Leagues, ranks and rivalries — how your corporation compares.">
          <div className="game-tab-bar flex gap-1 overflow-x-auto" role="tablist" aria-label="Standings view">
            {tabs.map(t => (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={tab === t.id}
                onClick={() => setTab(t.id)}
                className={`min-h-[44px] px-3 py-1.5 rounded-lg text-[11px] font-medium transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                  tab === t.id ? 'game-tab-active text-white' : 'text-slate-500 hover:text-white hover:bg-white/[0.04]'
                }`}
              >
                <GameIcon name={t.icon} size={13} />
                {t.label}
                {t.locked && <GameIcon name="lock" size={11} label="Locked" />}
              </button>
            ))}
          </div>
        </ConsolePanel>
      )}
      {tab === 'leagues' && (leaguesUnlocked ? <LeaguePanel /> : <LockedSubtabNotice iconName="leaderboard" label="Leagues" tier={FOLDED_FEATURE_TIERS.leagues} />)}
      {tab === 'ranks' && <LeaderboardPanel state={state} />}
      {tab === 'rivals' && (rivalsUnlocked ? <RivalsPanel state={state} /> : <LockedSubtabNotice iconName="swords" label="Rivals" tier={FOLDED_FEATURE_TIERS.rivals} />)}
      {tab === 'heritage' && <HeritageRegistryPanel />}
    </div>
  );
}
