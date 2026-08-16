'use client';

// ─── Space Tycoon: Markets Hub ──────────────────────────────────────────────
// Audit Wave F (docs/GAME_SYSTEMS_AUDIT_2026-08.md §B4): merges the three
// market-intel tabs — Analytics/Intelligence, Economy, Futures — into subtabs
// alongside the Market tab's own Spot & Orders view. One place answers
// "what should I trade?" All functionality preserved; subtabs keep their
// original corp-tier gate (FOLDED_FEATURE_TIERS).

import { useEffect, useState } from 'react';
import type { GameState } from '@/lib/game/types';
import { isFoldedFeatureUnlocked, FOLDED_FEATURE_TIERS } from '@/lib/game/corporation-tiers';
import { playSound } from '@/lib/game/sound-engine';
import { Concept } from './HoloTip';
import MarketPanel from './MarketPanel';
import MarketPriceChart from './MarketPriceChart';
import MarketOrderBook from './MarketOrderBook';
import MarketIntelligencePanel from './MarketIntelligencePanel';
import EconomyPanel from './EconomyPanel';
import FuturesPanel from './FuturesPanel';
import LockedSubtabNotice from './LockedSubtabNotice';
import { ConsolePanel } from './chrome';
import GameIcon from './GameIcon';
import type { IconName } from '@/lib/game/icons';

interface MarketHubPanelProps {
  state: GameState;
  setState: (fn: (prev: GameState | null) => GameState | null) => void;
  onSellResource: (resourceId: string, quantity: number, revenue: number) => void;
  onBuyResource: (resourceId: string, quantity: number, cost: number) => void;
}

type MarketTab = 'spot' | 'analytics' | 'economy' | 'futures';

// FTUE beat (simulated-newcomer audit 8/16): the first time a player ever
// opens the Markets hub, show a one-time 3-point explainer — spot prices,
// broker fee, and why the market matters to their buildings. Dismiss persists
// in localStorage (presentation-only state, same pattern as the tutorial deck).
const MARKET_INTRO_KEY = 'spacetycoon_market_intro_seen';

function MarketFirstOpenIntro() {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    try {
      if (localStorage.getItem(MARKET_INTRO_KEY) !== 'true') setVisible(true);
    } catch {}
  }, []);
  if (!visible) return null;
  const dismiss = () => {
    playSound('click');
    try { localStorage.setItem(MARKET_INTRO_KEY, 'true'); } catch {}
    setVisible(false);
  };
  return (
    <div className="rounded-xl border border-cyan-500/25 bg-cyan-500/[0.04] p-4">
      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className="text-white text-sm font-bold flex items-center gap-2">
          <GameIcon name="market" size={16} glow="cyan" /> First time on the Market?
        </h3>
        <button
          onClick={dismiss}
          className="min-h-[36px] px-2 text-[10px] uppercase tracking-wider text-slate-500 hover:text-white transition-colors"
        >
          Got it
        </button>
      </div>
      <ol className="space-y-1.5 text-xs text-slate-300 list-none">
        <li>
          <span className="text-cyan-400 font-mono mr-1.5">1.</span>
          <strong>Prices are live and shared.</strong> Every player trades on the same book — heavy
          selling pushes a price down, shortages push it up, and idle prices drift back toward base
          (<Concept id="mean-reversion">mean reversion</Concept>).
        </li>
        <li>
          <span className="text-cyan-400 font-mono mr-1.5">2.</span>
          <strong>Trades cost a 2% broker fee.</strong> Limit orders on the{' '}
          <Concept id="order-book-depth">order book</Concept> hold your cash or goods in{' '}
          <Concept id="escrow">escrow</Concept> until they fill or you cancel — refunds are automatic.
        </li>
        <li>
          <span className="text-cyan-400 font-mono mr-1.5">3.</span>
          <strong>Why it matters:</strong> construction and (after your Protected Frontier)
          building upkeep consume real resources you can buy here — and everything your mines
          produce can be sold here. Buy cheap during crashes; sell into shortages.
        </li>
      </ol>
    </div>
  );
}

export default function MarketHubPanel({ state, setState, onSellResource, onBuyResource }: MarketHubPanelProps) {
  const tier = state.corporationTier || 1;
  const economyUnlocked = isFoldedFeatureUnlocked(tier, 'economy');
  const analyticsUnlocked = isFoldedFeatureUnlocked(tier, 'intelligence');
  const futuresUnlocked = isFoldedFeatureUnlocked(tier, 'futures');

  const [tab, setTab] = useState<MarketTab>('spot');

  const tabs: { id: MarketTab; label: string; icon: IconName; locked: boolean }[] = [
    { id: 'spot', label: 'Spot & Orders', icon: 'market', locked: false },
    { id: 'analytics', label: 'Analytics', icon: 'activity', locked: !analyticsUnlocked },
    { id: 'economy', label: 'Economy', icon: 'globe', locked: !economyUnlocked },
    { id: 'futures', label: 'Futures', icon: 'predictions', locked: !futuresUnlocked },
  ];

  return (
    <div className="space-y-3">
      <ConsolePanel title="Markets" icon="market" subtitle="Spot prices, order books, macro intelligence and futures — one place to answer &ldquo;what should I trade?&rdquo;">
        <div className="game-tab-bar flex gap-1 overflow-x-auto" role="tablist" aria-label="Markets view">
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

      {tab === 'spot' && (
        <div className="space-y-4">
          <MarketFirstOpenIntro />
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
