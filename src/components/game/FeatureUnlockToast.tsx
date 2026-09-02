'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { playSound } from '@/lib/game/sound-engine';
import GameIcon from './GameIcon';
import type { IconName } from '@/lib/game/icons';

export interface UnlockInfo {
  id: string;
  name: string;
  icon: IconName;
  description: string;
  tab: string;
}

const FEATURE_UNLOCKS: Record<string, UnlockInfo> = {
  services: {
    id: 'services',
    name: 'Services',
    icon: 'services',
    description: 'View your active revenue streams and income breakdown.',
    tab: 'services',
  },
  fleet: {
    id: 'fleet',
    name: 'Fleet',
    icon: 'fleet',
    description: 'Build ships to mine resources, transport cargo, and survey locations.',
    tab: 'fleet',
  },
  crafting: {
    id: 'crafting',
    name: 'Manufacturing',
    icon: 'crafting',
    description: 'Your fabrication facility is online — refine raw resources into fuel, satellite buses and high-value products in the Manufacture tab.',
    tab: 'crafting',
  },
  workforce: {
    id: 'workforce',
    name: 'Crew',
    icon: 'workforce',
    description: 'Hire operators, scientists, miners, and engineers to boost your empire.',
    tab: 'workforce',
  },
  market: {
    id: 'market',
    name: 'Market',
    icon: 'market',
    description: 'Buy and sell resources on the global multiplayer market.',
    tab: 'market',
  },
  contracts: {
    id: 'contracts',
    name: 'Contracts',
    icon: 'contracts',
    description: 'Complete goals to earn money and speed boosts for construction/research.',
    tab: 'contracts',
  },
  alliance: {
    id: 'alliance',
    name: 'Alliance',
    icon: 'alliance',
    description: 'Join or create an alliance for shared revenue, mining, and research bonuses.',
    tab: 'alliance',
  },
  bounties: {
    id: 'bounties',
    name: 'Bounties',
    icon: 'bounties',
    description: 'Post and fill resource bounties with other players for profit.',
    tab: 'bounties',
  },
};

const STORAGE_KEY = 'spacetycoon_unlocked_features';
const AUTO_DISMISS_MS = 6000;

/**
 * Detection half of the feature-unlock toast (overlay-manager split,
 * 2026-09). Lives in the SHELL so the toast component can be mounted only
 * while it is the arbitrated overlay — an unmounted component cannot watch
 * `availableTabs` change, so the watching moved up here.
 *
 * Shows each unlock once (tracked in localStorage), auto-dismisses after 6s.
 *
 * IMPORTANT: availableTabsKey must be a stable string (e.g.
 * allTabs.map(t=>t.id).join(',')) to avoid the React hooks infinite
 * re-render issue (#310).
 */
export function useFeatureUnlockQueue(availableTabsKey: string, availableTabs: string[]): {
  unlock: UnlockInfo | null;
  dismiss: () => void;
} {
  const [unlock, setUnlock] = useState<UnlockInfo | null>(null);
  const previousTabsRef = useRef<Set<string>>(new Set());
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismiss = useCallback(() => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
    setUnlock(null);
  }, []);

  useEffect(() => {
    // Load previously seen unlocks
    let seen: string[] = [];
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) seen = JSON.parse(stored);
    } catch {}

    const currentTabs = new Set(availableTabs);
    const prevTabs = previousTabsRef.current;

    // Find newly available tabs (only if we have a previous state to compare against)
    if (prevTabs.size > 0) {
      for (const tab of availableTabs) {
        if (!prevTabs.has(tab) && !seen.includes(tab) && FEATURE_UNLOCKS[tab]) {
          const next = FEATURE_UNLOCKS[tab];
          setUnlock(next);
          playSound('milestone');

          seen.push(tab);
          try { localStorage.setItem(STORAGE_KEY, JSON.stringify(seen)); } catch {}

          if (timerRef.current) clearTimeout(timerRef.current);
          timerRef.current = setTimeout(() => setUnlock(null), AUTO_DISMISS_MS);
          break;
        }
      }
    }

    previousTabsRef.current = currentTabs;
    // Depend on the stable string key, not the array reference (#310).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [availableTabsKey]);

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  return { unlock, dismiss };
}

interface FeatureUnlockToastProps {
  unlock: UnlockInfo | null;
  onDismiss: () => void;
  onNavigateToTab?: (tab: string) => void;
}

/**
 * Presentational half: the toast card for one unlock. Mounted by the shell's
 * OverlayManager only while it holds the overlay slot.
 */
export default function FeatureUnlockToast({ unlock, onDismiss, onNavigateToTab }: FeatureUnlockToastProps) {
  if (!unlock) return null;

  return (
    <div className="fixed top-20 right-4 z-50 motion-safe:animate-reveal-up md:w-80" role="status" aria-live="polite">
      <div className="rounded-lg overflow-hidden shadow-xl" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--accent-primary)', boxShadow: '0 0 20px rgba(99, 102, 241, 0.15)' }}>
        {/* Header */}
        <div className="px-4 py-2 flex items-center justify-between" style={{ background: 'rgba(99, 102, 241, 0.1)', borderBottom: '1px solid rgba(99, 102, 241, 0.15)' }}>
          <span className="text-[10px] font-bold uppercase tracking-wider flex items-center gap-1" style={{ color: 'var(--accent-primary)' }}>
            <GameIcon name="sparkle" size={12} glow="purple" />New Feature Unlocked
          </span>
          <button
            onClick={onDismiss}
            aria-label="Dismiss notification"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center text-xs"
            style={{ color: 'var(--text-muted)' }}
          >
            <GameIcon name="close" size={14} />
          </button>
        </div>

        {/* Content */}
        <div className="px-4 py-3">
          <div className="flex items-center gap-2 mb-1.5">
            <GameIcon name={unlock.icon} size={22} glow="cyan" />
            <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{unlock.name}</span>
          </div>
          <p className="text-xs leading-relaxed mb-3" style={{ color: 'var(--text-secondary)' }}>
            {unlock.description}
          </p>
          {onNavigateToTab && (
            <button
              onClick={() => { onNavigateToTab(unlock.tab); onDismiss(); }}
              className="w-full min-h-[44px] py-1.5 text-xs font-semibold text-white rounded transition-colors"
              style={{ background: 'var(--accent-primary)' }}
            >
              Open {unlock.name} →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
