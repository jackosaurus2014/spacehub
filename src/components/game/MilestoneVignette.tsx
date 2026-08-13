'use client';

import { useEffect, useRef, useState } from 'react';
import type { GameState } from '@/lib/game/types';
import { getTierDef } from '@/lib/game/corporation-tiers';
import { playSound } from '@/lib/game/sound-engine';
import { useEscapeKey } from '@/hooks/useEscapeKey';

/**
 * MilestoneVignette — full-screen celebration overlay that fires when the
 * player crosses a narrative threshold. Handles:
 *
 *   - Corporation tier ascension (rare, cinematic)
 *   - First billion net worth (once per save)
 *   - First interstellar first-contact (once per save)
 *
 * The overlay dims the viewport, renders a large HUD-styled headline with a
 * glow-in animation, fires a milestone sting on the sound engine, and
 * auto-dismisses after 3.8s. Click anywhere dismisses early.
 */

interface MilestoneVignetteProps {
  state: GameState;
}

type Celebration = {
  id: string;
  headline: string;
  subtitle: string;
  accent: string; // hex color for the ring + glow
  icon: string;
};

const STORAGE_KEY = 'spacetycoon_milestones_seen';

/** Read the set of milestone IDs the player has already celebrated in this save. */
function readSeen(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

function writeSeen(seen: Set<string>) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(seen))); } catch { /* ignore */ }
}

export default function MilestoneVignette({ state }: MilestoneVignetteProps) {
  const [active, setActive] = useState<Celebration | null>(null);
  const seenRef = useRef<Set<string>>(readSeen());
  const prevTierRef = useRef<number>(state.corporationTier || 1);
  const checkedOnceRef = useRef(false);

  useEffect(() => {
    // On first mount, capture current state as the "baseline" — we only fire
    // for transitions that happen while the page is mounted, not for the
    // snapshot itself. Prevents a load-flash right after resume.
    if (!checkedOnceRef.current) {
      checkedOnceRef.current = true;
      prevTierRef.current = state.corporationTier || 1;
      return;
    }

    const queue: Celebration[] = [];

    // Corporation tier ascension — cinematic, always fires even if shown before
    // for this tier in a prior session (the save file may have been carried).
    const currentTier = state.corporationTier || 1;
    if (currentTier > prevTierRef.current) {
      const tierDef = getTierDef(currentTier);
      const id = `tier-${currentTier}`;
      if (!seenRef.current.has(id)) {
        queue.push({
          id,
          headline: 'CORPORATE TIER ASCENDED',
          subtitle: `${tierDef.icon}  ${tierDef.name.toUpperCase()}`,
          accent: tierDef.color,
          icon: tierDef.icon,
        });
      }
    }
    prevTierRef.current = currentTier;

    // First $1B net worth — treasury plus building value is close enough.
    const billion = 1_000_000_000;
    if (state.money >= billion && !seenRef.current.has('first-billion')) {
      queue.push({
        id: 'first-billion',
        headline: 'FIRST BILLION CLEARED',
        subtitle: 'YOUR TREASURY · $1,000,000,000',
        accent: '#fbbf24',
        icon: '💎',
      });
    }

    // First interstellar contact — relies on state.interstellar.contactedSystemIds if present
    type ExtendedState = GameState & {
      interstellar?: { contactedSystemIds?: string[] };
    };
    const extended = state as ExtendedState;
    const contacted = extended.interstellar?.contactedSystemIds || [];
    if (contacted.length > 0 && !seenRef.current.has('first-contact')) {
      queue.push({
        id: 'first-contact',
        headline: 'FIRST CONTACT ESTABLISHED',
        subtitle: 'HUMANITY IS NO LONGER ALONE',
        accent: '#a78bfa',
        icon: '👽',
      });
    }

    if (queue.length === 0) return;

    // Show them one at a time. Easier than interleaving overlays, and the user
    // probably wants to savour each milestone anyway.
    const next = queue[0];
    seenRef.current.add(next.id);
    writeSeen(seenRef.current);
    setActive(next);
    playSound('milestone');
    const t = window.setTimeout(() => setActive(null), 3800);
    return () => window.clearTimeout(t);
  }, [state]);

  // Auto-dismiss doesn't require interaction, but keyboard users should still
  // be able to close early the same way mouse users can by clicking.
  useEscapeKey(() => setActive(null), active !== null);

  if (!active) return null;

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center cursor-pointer milestone-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={active.headline}
      onClick={() => setActive(null)}
      style={{ background: 'radial-gradient(ellipse at center, rgba(0,0,0,0.75), rgba(0,0,0,0.92))' }}
    >
      {/* Expanding ring — sized absolutely from center */}
      <span
        aria-hidden="true"
        className="milestone-ring absolute top-1/2 left-1/2 rounded-full border-2 pointer-events-none"
        style={{
          width: 240,
          height: 240,
          borderColor: active.accent,
          boxShadow: `0 0 40px ${active.accent}, inset 0 0 40px ${active.accent}`,
        }}
      />
      <span
        aria-hidden="true"
        className="milestone-ring absolute top-1/2 left-1/2 rounded-full border pointer-events-none"
        style={{
          width: 240,
          height: 240,
          borderColor: active.accent,
          animationDelay: '0.2s',
        }}
      />

      <div className="text-center relative">
        <div className="text-6xl mb-5" aria-hidden="true">{active.icon}</div>
        <h1
          className="milestone-headline font-hud text-3xl sm:text-5xl font-black mb-3"
          style={{
            color: active.accent,
            textShadow: `0 0 20px ${active.accent}, 0 0 40px ${active.accent}80`,
          }}
        >
          {active.headline}
        </h1>
        <p
          className="milestone-subtitle font-hud text-sm sm:text-base tracking-widest text-slate-300"
          style={{ textShadow: '0 0 12px rgba(255,255,255,0.35)' }}
        >
          {active.subtitle}
        </p>
        <p className="milestone-subtitle text-[10px] uppercase tracking-widest text-slate-600 mt-8">
          Click anywhere to continue
        </p>
      </div>
    </div>
  );
}
