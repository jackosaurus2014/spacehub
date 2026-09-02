'use client';

// ─── Space Tycoon: Markets Hub ──────────────────────────────────────────────
// Audit Wave F (docs/GAME_SYSTEMS_AUDIT_2026-08.md §B4): merges the three
// market-intel tabs — Analytics/Intelligence, Economy, Futures — into subtabs
// alongside the Market tab's own Spot & Orders view. One place answers
// "what should I trade?" All functionality preserved; subtabs keep their
// original corp-tier gate (FOLDED_FEATURE_TIERS).
//
// Six-hub consolidation + design-system migration (2026-09, GAME_DESIGN_REVIEW
// §3): the shell's Markets row drives the view (`embedded`) through the
// sub-view bus, and the hub's own chrome moved to the shared kit (Console,
// StatusPip, tokens) — the first game surface on the site's design system.

import { useEffect, useState } from 'react';
import type { GameState, GameTab } from '@/lib/game/types';
import { isFoldedFeatureUnlocked, FOLDED_FEATURE_TIERS } from '@/lib/game/corporation-tiers';
import CompetitivePosturePanel from './CompetitivePosturePanel';
import { playSound } from '@/lib/game/sound-engine';
import { Concept } from './HoloTip';
import MarketPanel from './MarketPanel';
import MarketPriceChart from './MarketPriceChart';
import MarketOrderBook from './MarketOrderBook';
import MarketIntelligencePanel from './MarketIntelligencePanel';
import EconomyPanel from './EconomyPanel';
import FuturesPanel from './FuturesPanel';
import LockedSubtabNotice from './LockedSubtabNotice';
import Console from '@/components/ui/Console';
import GameIcon from './GameIcon';
import type { IconName } from '@/lib/game/icons';
import { useHubSubView } from './useHubSubView';

interface MarketHubPanelProps {
  state: GameState;
  setState: (fn: (prev: GameState | null) => GameState | null) => void;
  onSellResource: (resourceId: string, quantity: number, revenue: number) => void;
  onBuyResource: (resourceId: string, quantity: number, cost: number) => void;
  /** PvP Discoverability pass: lets the posture strip route to Crew / Map /
   *  Territory for the verbs that do not live in this hub. Optional so every
   *  existing call site keeps compiling. */
  onNavigateTab?: (tab: GameTab) => void;
  /** Preselect a resource on the order book (crafting panel's "List" lands here). */
  bookResource?: string | null;
  /** Six-hub shell: the Markets row owns the view switcher, so the hub's own
   *  strip is hidden. Defaults to false — standalone behaviour unchanged. */
  embedded?: boolean;
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
    <Console
      title={<span className="inline-flex items-center gap-2"><GameIcon name="market" size={14} /> First time on the Market?</span>}
      actions={
        <button type="button" onClick={dismiss} className="btn-ghost !min-h-[36px] !py-1 text-[12px]">
          Got it
        </button>
      }
    >
      <ol className="space-y-1.5 font-body text-[0.8125rem] leading-[1.55] text-[var(--ink-2)] list-none">
        <li>
          <span className="mr-1.5 font-mono text-[var(--signal)]">1.</span>
          <strong className="text-[var(--ink)]">Prices are live and shared.</strong> Every player trades on the same book — heavy
          selling pushes a price down, shortages push it up, and idle prices drift back toward base
          (<Concept id="mean-reversion">mean reversion</Concept>).
        </li>
        <li>
          <span className="mr-1.5 font-mono text-[var(--signal)]">2.</span>
          <strong className="text-[var(--ink)]">Trades cost a 2% broker fee.</strong> Limit orders on the{' '}
          <Concept id="order-book-depth">order book</Concept> hold your cash or goods in{' '}
          <Concept id="escrow">escrow</Concept> until they fill or you cancel — refunds are automatic.
        </li>
        <li>
          <span className="mr-1.5 font-mono text-[var(--signal)]">3.</span>
          <strong className="text-[var(--ink)]">Why it matters:</strong> construction and (after your Protected Frontier)
          building upkeep consume real resources you can buy here — and everything your mines
          produce can be sold here. Buy cheap during crashes; sell into shortages.
        </li>
      </ol>
    </Console>
  );
}

export default function MarketHubPanel({ state, setState, onSellResource, onBuyResource, onNavigateTab, bookResource, embedded = false }: MarketHubPanelProps) {
  const tier = state.corporationTier || 1;
  const economyUnlocked = isFoldedFeatureUnlocked(tier, 'economy');
  const analyticsUnlocked = isFoldedFeatureUnlocked(tier, 'intelligence');
  const futuresUnlocked = isFoldedFeatureUnlocked(tier, 'futures');

  const [bookSlug, setBookSlug] = useState<string | null>(bookResource ?? null);
  // Lever-discoverability pass (2026-09): a counter the order book watches to
  // open its price-campaign console (a `market:campaign` sub-view request or
  // the Analytics tab's thin "declare from the order book" link).
  const [campaignSignal, setCampaignSignal] = useState(0);
  const scrollToBook = () => setTimeout(() => document.getElementById('market-order-book')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);

  // PvP Discoverability pass (2026-08) + lever-discoverability pass (2026-09)
  // + six-hub consolidation: the view is a two-way binding with the shell's
  // Markets row. `market:campaign` opens the price-campaign console on Spot &
  // Orders — the hub is the home of the declare form now (the order book
  // knows the selected resource and the player's inventory; Analytics keeps
  // a thin link). `market:analytics` still lands on Analytics for the demand
  // map, campaign register and the NPC demand console. A request for a
  // tier-locked view is ignored here (the shell shows the lock notice).
  const [tab, setTab] = useHubSubView<MarketTab>('market', 'spot', requested => {
    if (requested === 'campaign') {
      setCampaignSignal(n => n + 1);
      scrollToBook();
      return 'spot';
    }
    if (requested === 'analytics' && !analyticsUnlocked) return null;
    if (requested === 'economy' && !economyUnlocked) return null;
    if (requested === 'futures' && !futuresUnlocked) return null;
    if (requested === 'spot' || requested === 'analytics' || requested === 'economy' || requested === 'futures') return requested;
    return null;
  });

  useEffect(() => { if (bookResource) { setBookSlug(bookResource); setTab('spot'); } }, [bookResource, setTab]);
  const openOrderBook = (slug: string) => {
    setBookSlug(slug);
    setTab('spot');
    scrollToBook();
  };
  const openCampaignConsole = (slug: string) => {
    openOrderBook(slug);
    setCampaignSignal(n => n + 1);
  };

  const tabs: { id: MarketTab; label: string; icon: IconName; locked: boolean }[] = [
    { id: 'spot', label: 'Spot & Orders', icon: 'market', locked: false },
    { id: 'analytics', label: 'Analytics', icon: 'activity', locked: !analyticsUnlocked },
    { id: 'economy', label: 'Economy', icon: 'globe', locked: !economyUnlocked },
    { id: 'futures', label: 'Futures', icon: 'predictions', locked: !futuresUnlocked },
  ];

  return (
    <div className="space-y-3">
      {!embedded && (
        <Console title="Markets" padded={false}>
          <div className="flex items-center gap-1 overflow-x-auto px-2 py-1 game-tab-bar" role="tablist" aria-label="Markets view">
            {tabs.map(t => (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={tab === t.id}
                onClick={() => setTab(t.id)}
                className={`min-h-[44px] px-3 py-1.5 rounded-[var(--radius-control)] text-[11px] font-medium motion-safe:transition-colors flex items-center gap-1.5 whitespace-nowrap focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--ember)] ${
                  tab === t.id ? 'game-tab-active text-[var(--ink)]' : 'text-[var(--ink-3)] hover:text-[var(--ink)] hover:bg-[var(--hover)]'
                }`}
              >
                <GameIcon name={t.icon} size={13} />
                {t.label}
                {t.locked && <GameIcon name="lock" size={11} label="Locked" />}
              </button>
            ))}
          </div>
        </Console>
      )}

      {tab === 'spot' && (
        <div className="space-y-4">
          <MarketFirstOpenIntro />
          <MarketPanel state={state} onSellResource={onSellResource} onBuyResource={onBuyResource} onOpenOrderBook={openOrderBook} />
          <MarketPriceChart />
          <div id="market-order-book" className="scroll-mt-20">
            <MarketOrderBook
              state={state}
              selectedResource={bookSlug ?? undefined}
              onResourceChange={setBookSlug}
              campaignOpenSignal={campaignSignal}
            />
          </div>
        </div>
      )}
      {tab === 'analytics' && (analyticsUnlocked ? (
        <div className="space-y-3">
          {/* PvP Discoverability pass: Analytics holds the intelligence
              surfaces (campaign register, demand map, NPC demand schedule)
              and the posture readout tells the player WHICH lever, if any,
              today's real state makes worth pulling. The price-campaign
              declare form itself lives on Spot & Orders (order book header)
              since the lever-discoverability pass — Analytics links there. */}
          {onNavigateTab && <CompetitivePosturePanel state={state} onNavigate={onNavigateTab} />}
          <MarketIntelligencePanel
            selectedResource={bookSlug}
            onOpenOrderBook={openOrderBook}
            onDeclareCampaign={openCampaignConsole}
            onNavigateTab={onNavigateTab}
          />
        </div>
      ) : <LockedSubtabNotice iconName="activity" label="Analytics" tier={FOLDED_FEATURE_TIERS.intelligence} />)}
      {tab === 'economy' && (economyUnlocked ? <EconomyPanel state={state} /> : <LockedSubtabNotice iconName="globe" label="Economy" tier={FOLDED_FEATURE_TIERS.economy} />)}
      {tab === 'futures' && (futuresUnlocked ? <FuturesPanel state={state} setState={setState} /> : <LockedSubtabNotice iconName="predictions" label="Futures" tier={FOLDED_FEATURE_TIERS.futures} />)}
    </div>
  );
}
