'use client';

// ─── Space Tycoon: Markets Hub ──────────────────────────────────────────────
// Audit Wave F (docs/GAME_SYSTEMS_AUDIT_2026-08.md §B4): merges the three
// market-intel tabs — Analytics/Intelligence, Economy, Futures — into subtabs
// alongside the Market tab's own Spot & Orders view. One place answers
// "what should I trade?" All functionality preserved; subtabs keep their
// original corp-tier gate (FOLDED_FEATURE_TIERS).

import { useState } from 'react';
import type { GameState } from '@/lib/game/types';
import { isFoldedFeatureUnlocked, FOLDED_FEATURE_TIERS } from '@/lib/game/corporation-tiers';
import MarketPanel from './MarketPanel';
import MarketPriceChart from './MarketPriceChart';
import MarketOrderBook from './MarketOrderBook';
import MarketIntelligencePanel from './MarketIntelligencePanel';
import EconomyPanel from './EconomyPanel';
import FuturesPanel from './FuturesPanel';
import LockedSubtabNotice from './LockedSubtabNotice';

interface MarketHubPanelProps {
  state: GameState;
  setState: (fn: (prev: GameState | null) => GameState | null) => void;
  onSellResource: (resourceId: string, quantity: number, revenue: number) => void;
  onBuyResource: (resourceId: string, quantity: number, cost: number) => void;
}

type MarketTab = 'spot' | 'analytics' | 'economy' | 'futures';

export default function MarketHubPanel({ state, setState, onSellResource, onBuyResource }: MarketHubPanelProps) {
  const tier = state.corporationTier || 1;
  const economyUnlocked = isFoldedFeatureUnlocked(tier, 'economy');
  const analyticsUnlocked = isFoldedFeatureUnlocked(tier, 'intelligence');
  const futuresUnlocked = isFoldedFeatureUnlocked(tier, 'futures');

  const [tab, setTab] = useState<MarketTab>('spot');

  const tabs: { id: MarketTab; label: string; icon: string; locked: boolean }[] = [
    { id: 'spot', label: 'Spot & Orders', icon: '📈', locked: false },
    { id: 'analytics', label: 'Analytics', icon: '📊', locked: !analyticsUnlocked },
    { id: 'economy', label: 'Economy', icon: '🌐', locked: !economyUnlocked },
    { id: 'futures', label: 'Futures', icon: '🔮', locked: !futuresUnlocked },
  ];

  return (
    <div className="space-y-3">
      <div className="flex rounded-lg overflow-hidden border border-white/[0.06] w-fit flex-wrap" role="tablist" aria-label="Markets view">
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

      {tab === 'spot' && (
        <div className="space-y-4">
          <MarketPanel state={state} onSellResource={onSellResource} onBuyResource={onBuyResource} />
          <MarketPriceChart />
          <MarketOrderBook state={state} />
        </div>
      )}
      {tab === 'analytics' && (analyticsUnlocked ? <MarketIntelligencePanel /> : <LockedSubtabNotice icon="📊" label="Analytics" tier={FOLDED_FEATURE_TIERS.intelligence} />)}
      {tab === 'economy' && (economyUnlocked ? <EconomyPanel state={state} /> : <LockedSubtabNotice icon="🌐" label="Economy" tier={FOLDED_FEATURE_TIERS.economy} />)}
      {tab === 'futures' && (futuresUnlocked ? <FuturesPanel state={state} setState={setState} /> : <LockedSubtabNotice icon="🔮" label="Futures" tier={FOLDED_FEATURE_TIERS.futures} />)}
    </div>
  );
}
