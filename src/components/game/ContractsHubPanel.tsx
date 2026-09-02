'use client';

// ─── Space Tycoon: Contracts Hub ────────────────────────────────────────────
// Audit Wave F (docs/GAME_SYSTEMS_AUDIT_2026-08.md §B2): merges the three
// PvE/PvP contract-shaped tabs — Contracts (static pool), Diplomacy (faction
// deliveries), Bidding (competitive PVP) — into one hub with PVE/PVP subtabs.
// All functionality is preserved as sub-sections; nothing was removed.
// Pattern follows ReportsPanel's Mail/Quarterly tab strip. Subtabs preserve
// their original corp-tier gate (FOLDED_FEATURE_TIERS) even though the hub
// tab itself is unlocked at tier 1.
//
// Six-hub consolidation (2026-09): the shell's Contracts & Diplomacy row now
// drives the view (`embedded`), through the sub-view bus — 'standard',
// 'deliveries', 'races', 'pvp' (alias 'bidding'). The internal strips remain
// for the non-embedded case so the panel is unchanged wherever else it is
// mounted.

import type { GameState } from '@/lib/game/types';
import { isFoldedFeatureUnlocked, FOLDED_FEATURE_TIERS } from '@/lib/game/corporation-tiers';
import ContractsPanel from './ContractsPanel';
import DiplomacyPanel from './DiplomacyPanel';
import BiddingPanel from './BiddingPanel';
import CompetitiveRacesPanel from './CompetitiveRacesPanel';
import LockedSubtabNotice from './LockedSubtabNotice';
import { ConsolePanel } from './chrome';
import GameIcon from './GameIcon';
import { useHubSubView } from './useHubSubView';

interface ContractsHubPanelProps {
  state: GameState;
  onAcceptContract: (contractId: string) => void;
  onAcceptDelivery: (contractId: string) => void;
  onDeliverContract: (contractId: string) => void;
  /** Six-hub shell: the hub row owns the view switcher, so hide the panel's
   *  own strips. Defaults to false (standalone behaviour unchanged). */
  embedded?: boolean;
}

type ContractsView = 'standard' | 'deliveries' | 'races' | 'pvp';

export default function ContractsHubPanel({ state, onAcceptContract, onAcceptDelivery, onDeliverContract, embedded = false }: ContractsHubPanelProps) {
  const tier = state.corporationTier || 1;
  const deliveriesUnlocked = isFoldedFeatureUnlocked(tier, 'diplomacy');
  const biddingUnlocked = isFoldedFeatureUnlocked(tier, 'bidding');

  const [view, setView] = useHubSubView<ContractsView>(
    'contracts',
    deliveriesUnlocked ? 'deliveries' : 'standard',
    requested => {
      if (requested === 'standard' || requested === 'races' || requested === 'pvp') return requested;
      if (requested === 'bidding' || requested === 'pvp') return 'pvp';
      if (requested === 'pve') return deliveriesUnlocked ? 'deliveries' : 'standard';
      if (requested === 'deliveries') return 'deliveries';
      return null;
    },
  );
  const hubTab: 'pve' | 'pvp' = view === 'pvp' || view === 'races' ? 'pvp' : 'pve';
  const pveSection: 'deliveries' | 'standard' = view === 'deliveries' ? 'deliveries' : 'standard';

  const TopTabs = (
    <div className="game-tab-bar flex gap-1 overflow-x-auto" role="tablist" aria-label="Contracts view">
      <button
        type="button"
        role="tab"
        aria-selected={hubTab === 'pve'}
        onClick={() => setView(deliveriesUnlocked ? 'deliveries' : 'standard')}
        className={`min-h-[44px] px-3 py-1.5 rounded-lg text-[11px] font-medium transition-colors flex items-center gap-1.5 whitespace-nowrap ${
          hubTab === 'pve' ? 'game-tab-active text-white' : 'text-slate-500 hover:text-white hover:bg-white/[0.04]'
        }`}
      >
        <GameIcon name="contracts" size={13} /> PVE Contracts
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={hubTab === 'pvp'}
        onClick={() => setView('pvp')}
        className={`min-h-[44px] px-3 py-1.5 rounded-lg text-[11px] font-medium transition-colors flex items-center gap-1.5 whitespace-nowrap ${
          hubTab === 'pvp' ? 'game-tab-active text-white' : 'text-slate-500 hover:text-white hover:bg-white/[0.04]'
        }`}
      >
        <GameIcon name="target" size={13} /> PVP Bidding{!biddingUnlocked && <GameIcon name="lock" size={11} label="Locked" />}
      </button>
    </div>
  );

  if (hubTab === 'pvp') {
    return (
      <div className="space-y-3">
        {!embedded && (
          <ConsolePanel title="Contracts" icon="contracts" subtitle="PVE delivery work and PVP competitive bidding.">{TopTabs}</ConsolePanel>
        )}
        {/* GAME_DESIGN_REVIEW_2026-09 row 15: competitive RACES (first-N-to-
            complete, server-verified) are gated by game month, not tier, so
            they render for everyone; the sealed-bid board keeps its T5 gate. */}
        <CompetitiveRacesPanel state={state} />
        {biddingUnlocked
          ? <BiddingPanel state={state} />
          : <LockedSubtabNotice iconName="swords" label="PVP Bidding" tier={FOLDED_FEATURE_TIERS.bidding} />}
      </div>
    );
  }

  // PVE: faction deliveries (responsive, faction-rep-driven) and the static
  // contract pool, kept as sub-sections of one PVE view per the audit's
  // "fold the static pool into deliveries as low-tier faction work" guidance —
  // engine-side reward unification is Wave A/rewire scope, not this UI merge.
  const SubSections = (
    <div className="flex rounded-lg overflow-hidden border border-white/[0.05] w-fit" role="tablist" aria-label="PVE contract type">
      <button
        type="button"
        role="tab"
        aria-selected={pveSection === 'deliveries'}
        onClick={() => setView('deliveries')}
        className={`min-h-[36px] px-3 py-1 text-[10px] font-medium transition-colors flex items-center gap-1 ${
          pveSection === 'deliveries' ? 'bg-white/[0.06] text-white' : 'text-slate-500 hover:text-white'
        }`}
      >
        <GameIcon name="handshake" size={11} /> Faction Deliveries{!deliveriesUnlocked && <GameIcon name="lock" size={10} label="Locked" />}
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={pveSection === 'standard'}
        onClick={() => setView('standard')}
        className={`min-h-[36px] px-3 py-1 text-[10px] font-medium transition-colors flex items-center gap-1 ${
          pveSection === 'standard' ? 'bg-white/[0.06] text-white' : 'text-slate-500 hover:text-white'
        }`}
      >
        <GameIcon name="contracts" size={11} /> Standard Contracts
      </button>
    </div>
  );

  return (
    <div className="space-y-3">
      {!embedded && (
        <ConsolePanel title="Contracts" icon="contracts" subtitle="PVE delivery work and PVP competitive bidding.">
          <div className="space-y-2">
            {TopTabs}
            {SubSections}
          </div>
        </ConsolePanel>
      )}
      {pveSection === 'deliveries' ? (
        deliveriesUnlocked
          ? <DiplomacyPanel state={state} onAccept={onAcceptDelivery} onDeliver={onDeliverContract} />
          : <LockedSubtabNotice iconName="handshake" label="Faction Deliveries" tier={FOLDED_FEATURE_TIERS.diplomacy} />
      ) : (
        <ContractsPanel state={state} onAcceptContract={onAcceptContract} />
      )}
    </div>
  );
}
