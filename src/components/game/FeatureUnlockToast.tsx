'use client';

import { useState, useEffect, useRef } from 'react';
import { playSound } from '@/lib/game/sound-engine';

interface UnlockInfo {
  id: string;
  name: string;
  icon: string;
  description: string;
  tab: string;
}

const FEATURE_UNLOCKS: Record<string, UnlockInfo> = {
  services: {
    id: 'services',
    name: 'Services',
    icon: '💼',
    description: 'View your active revenue streams and income breakdown.',
    tab: 'services',
  },
  fleet: {
    id: 'fleet',
    name: 'Fleet',
    icon: '🚢',
    description: 'Build ships to mine resources, transport cargo, and survey locations.',
    tab: 'fleet',
  },
  crafting: {
    id: 'crafting',
    name: 'Crafting',
    icon: '🔨',
    description: 'Refine raw resources into high-value products for advanced construction.',
    tab: 'crafting',
  },
  workforce: {
    id: 'workforce',
    name: 'Crew',
    icon: '👷',
    description: 'Hire operators, scientists, miners, and engineers to boost your empire.',
    tab: 'workforce',
  },
  market: {
    id: 'market',
    name: 'Market',
    icon: '📈',
    description: 'Buy and sell resources on the global multiplayer market.',
    tab: 'market',
  },
  contracts: {
    id: 'contracts',
    name: 'Contracts',
    icon: '📋',
    description: 'Complete goals to earn money and speed boosts for construction/research.',
    tab: 'contracts',
  },
  alliance: {
    id: 'alliance',
    name: 'Alliance',
    icon: '🤝',
    description: 'Join or create an alliance for shared revenue, mining, and research bonuses.',
    tab: 'alliance',
  },
  bounties: {
    id: 'bounties',
    name: 'Bounties',
    icon: '📦',
    description: 'Post and fill resource bounties with other players for profit.',
    tab: 'bounties',
  },
};

const STORAGE_KEY = 'spacetycoon_unlocked_features';

interface FeatureUnlockToastProps {
  availableTabs: string[];
  onNavigateToTab?: (tab: string) => void;
}

/**
 * Shows a toast notification when a new game feature/tab unlocks.
 * Only shows each unlock once (tracked in localStorage).
 */
export default function FeatureUnlockToast({ availableTabs, onNavigateToTab }: FeatureUnlockToastProps) {
  const [currentUnlock, setCurrentUnlock] = useState<UnlockInfo | null>(null);
  const [visible, setVisible] = useState(false);
  const previousTabsRef = useRef<Set<string>>(new Set());
  const shownRef = useRef(false);

  useEffect(() => {
    // Load previously seen unlocks
    let seen: string[] = [];
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) seen = JSON.parse(stored);
    } catch {}

    const currentTabs = new Set(availableTabs);
    const prevTabs = previousTabsRef.current;

    // Find newly available tabs
    for (const tab of availableTabs) {
      if (!prevTabs.has(tab) && !seen.includes(tab) && FEATURE_UNLOCKS[tab] && prevTabs.size > 0) {
        // New tab just unlocked!
        const unlock = FEATURE_UNLOCKS[tab];
        setCurrentUnlock(unlock);
        setVisible(true);
        playSound('milestone');

        // Mark as seen
        seen.push(tab);
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(seen)); } catch {}

        // Auto-hide after 6 seconds
        const timer = setTimeout(() => setVisible(false), 6000);

        // Only show one unlock at a time
        break;
      }
    }

    previousTabsRef.current = currentTabs;
  }, [availableTabs]);

  if (!visible || !currentUnlock) return null;

  return (
    <div className="fixed top-20 right-4 z-50 animate-reveal-up md:w-80">
      <div className="rounded-lg overflow-hidden shadow-xl" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--accent-primary)', boxShadow: '0 0 20px rgba(99, 102, 241, 0.15)' }}>
        {/* Header */}
        <div className="px-4 py-2 flex items-center justify-between" style={{ background: 'rgba(99, 102, 241, 0.1)', borderBottom: '1px solid rgba(99, 102, 241, 0.15)' }}>
          <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--accent-primary)' }}>
            ✨ New Feature Unlocked
          </span>
          <button onClick={() => setVisible(false)} className="text-xs" style={{ color: 'var(--text-muted)' }}>✕</button>
        </div>

        {/* Content */}
        <div className="px-4 py-3">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-xl">{currentUnlock.icon}</span>
            <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{currentUnlock.name}</span>
          </div>
          <p className="text-xs leading-relaxed mb-3" style={{ color: 'var(--text-secondary)' }}>
            {currentUnlock.description}
          </p>
          {onNavigateToTab && (
            <button
              onClick={() => { onNavigateToTab(currentUnlock.tab); setVisible(false); }}
              className="w-full py-1.5 text-xs font-semibold text-white rounded transition-colors"
              style={{ background: 'var(--accent-primary)' }}
            >
              Open {currentUnlock.name} →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
