'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';

interface ReactionBarProps {
  eventId: string;
  currentPhase?: string;
}

const EMOJI_MAP: Record<string, string> = {
  rocket: '🚀',
  fire: '🔥',
  star: '⭐',
  heart: '❤️',
  '100': '💯',
};

const EMOJI_LABELS: Record<string, string> = {
  rocket: 'Rocket',
  fire: 'Fire',
  star: 'Star',
  heart: 'Heart',
  '100': 'One hundred',
};

const EMOJI_KEYS = Object.keys(EMOJI_MAP);

interface FloatingEmoji {
  id: number;
  emoji: string;
  x: number;
}

/**
 * Emoji reaction bar. Anyone can react (2026-09-01) — the server rate-limits
 * per signed-in user or per httpOnly sn_vid visitor cookie (1 per 2s).
 */
export default function ReactionBar({ eventId, currentPhase }: ReactionBarProps) {
  const reduceMotion = useReducedMotion();
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [totals, setTotals] = useState<Record<string, number>>({});
  const [floaters, setFloaters] = useState<FloatingEmoji[]>([]);
  const [cooldown, setCooldown] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const floaterId = useRef(0);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  const fetchReactions = useCallback(async () => {
    try {
      const res = await fetch(`/api/launch-day/${eventId}/reactions`);
      if (!res.ok) return;
      const data = await res.json();
      if (data.success) {
        setCounts(data.data.recent || {});
        setTotals(data.data.totals || {});
      }
    } catch {
      // Silent fail
    }
  }, [eventId]);

  useEffect(() => {
    fetchReactions();
    pollRef.current = setInterval(fetchReactions, 3000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [fetchReactions]);

  const revert = (emoji: string) => {
    setTotals(prev => ({ ...prev, [emoji]: Math.max(0, (prev[emoji] || 0) - 1) }));
    setCounts(prev => ({ ...prev, [emoji]: Math.max(0, (prev[emoji] || 0) - 1) }));
  };

  const handleReaction = async (emoji: string) => {
    if (cooldown) return;

    setCooldown(true);
    setTimeout(() => setCooldown(false), 2000);

    // Floating animation (skipped under prefers-reduced-motion)
    if (!reduceMotion) {
      const newFloater: FloatingEmoji = {
        id: floaterId.current++,
        emoji: EMOJI_MAP[emoji],
        x: 10 + Math.random() * 80,
      };
      setFloaters(prev => [...prev, newFloater]);
      setTimeout(() => {
        setFloaters(prev => prev.filter(f => f.id !== newFloater.id));
      }, 1500);
    }

    // Optimistic update
    setTotals(prev => ({ ...prev, [emoji]: (prev[emoji] || 0) + 1 }));
    setCounts(prev => ({ ...prev, [emoji]: (prev[emoji] || 0) + 1 }));

    try {
      const res = await fetch(`/api/launch-day/${eventId}/reactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emoji, phase: currentPhase }),
      });

      if (res.status === 401) {
        revert(emoji);
        setNotice('Enable cookies to react.');
      } else if (!res.ok && res.status !== 429) {
        // Revert optimistic update on non-rate-limit errors
        revert(emoji);
      }
    } catch {
      // Revert
      revert(emoji);
    }
  };

  const totalRecent = Object.values(counts).reduce((s, v) => s + v, 0);

  return (
    <div className="relative">
      {/* Floating emojis */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden" style={{ height: '80px', top: '-80px' }} aria-hidden="true">
        <AnimatePresence>
          {floaters.map(f => (
            <motion.span
              key={f.id}
              initial={{ opacity: 1, y: 60, x: `${f.x}%`, scale: 0.5 }}
              animate={{ opacity: 0, y: -20, scale: 1.2 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1.2, ease: 'easeOut' }}
              className="absolute text-2xl"
              style={{ left: `${f.x}%` }}
            >
              {f.emoji}
            </motion.span>
          ))}
        </AnimatePresence>
      </div>

      {/* Reaction buttons */}
      <div className="bg-black/95 rounded-xl border border-white/[0.06] p-2 sm:p-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 flex-wrap" role="group" aria-label="React to the launch">
            {EMOJI_KEYS.map(key => {
              const recentCount = counts[key] || 0;
              const totalCount = totals[key] || 0;
              const hasActivity = recentCount > 0;

              return (
                <motion.button
                  key={key}
                  type="button"
                  whileHover={reduceMotion ? undefined : { scale: 1.15 }}
                  whileTap={reduceMotion ? undefined : { scale: 0.85 }}
                  onClick={() => handleReaction(key)}
                  disabled={cooldown}
                  aria-label={`${EMOJI_LABELS[key]}${totalCount > 0 ? `, ${totalCount} reactions` : ''}`}
                  className={`relative flex items-center justify-center gap-1 min-w-[44px] min-h-[44px] px-2.5 py-1.5 rounded-lg border transition-all motion-reduce:transition-none ${
                    hasActivity
                      ? 'bg-white/[0.06] border-white/[0.08]'
                      : 'bg-white/[0.04] border-white/[0.04]'
                  } ${cooldown ? 'opacity-50' : 'hover:border-slate-500/50'}`}
                >
                  <span className="text-lg" aria-hidden="true">{EMOJI_MAP[key]}</span>
                  {totalCount > 0 && (
                    <span className={`text-xs font-mono font-bold ${
                      hasActivity ? 'text-white/70' : 'text-slate-500'
                    }`} aria-hidden="true">
                      {totalCount > 999 ? `${(totalCount / 1000).toFixed(1)}k` : totalCount}
                    </span>
                  )}

                  {/* Activity pulse */}
                  {hasActivity && (
                    <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-white rounded-full animate-ping motion-reduce:animate-none opacity-50" aria-hidden="true" />
                  )}
                </motion.button>
              );
            })}
          </div>

          <span className="text-xs text-slate-500" aria-live="polite">
            {notice ?? (totalRecent > 0 ? `${totalRecent} reactions (30s)` : 'Tap to react — no account needed')}
          </span>
        </div>
      </div>
    </div>
  );
}
