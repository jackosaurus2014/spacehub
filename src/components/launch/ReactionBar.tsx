'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

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

const EMOJI_KEYS = Object.keys(EMOJI_MAP);

interface FloatingEmoji {
  id: number;
  emoji: string;
  x: number;
}

export default function ReactionBar({ eventId, currentPhase }: ReactionBarProps) {
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [totals, setTotals] = useState<Record<string, number>>({});
  const [floaters, setFloaters] = useState<FloatingEmoji[]>([]);
  const [cooldown, setCooldown] = useState(false);
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

  const handleReaction = async (emoji: string) => {
    if (cooldown) return;

    setCooldown(true);
    setTimeout(() => setCooldown(false), 2000);

    // Add floating animation
    const newFloater: FloatingEmoji = {
      id: floaterId.current++,
      emoji: EMOJI_MAP[emoji],
      x: 10 + Math.random() * 80,
    };
    setFloaters(prev => [...prev, newFloater]);
    setTimeout(() => {
      setFloaters(prev => prev.filter(f => f.id !== newFloater.id));
    }, 1500);

    // Optimistic update
    setTotals(prev => ({ ...prev, [emoji]: (prev[emoji] || 0) + 1 }));
    setCounts(prev => ({ ...prev, [emoji]: (prev[emoji] || 0) + 1 }));

    try {
      const res = await fetch(`/api/launch-day/${eventId}/reactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emoji, phase: currentPhase }),
      });

      if (!res.ok && res.status !== 429) {
        // Revert optimistic update on non-rate-limit errors
        setTotals(prev => ({ ...prev, [emoji]: Math.max(0, (prev[emoji] || 0) - 1) }));
        setCounts(prev => ({ ...prev, [emoji]: Math.max(0, (prev[emoji] || 0) - 1) }));
      }
    } catch {
      // Revert
      setTotals(prev => ({ ...prev, [emoji]: Math.max(0, (prev[emoji] || 0) - 1) }));
    }
  };

  const totalRecent = Object.values(counts).reduce((s, v) => s + v, 0);

  return (
    <div className="relative">
      {/* Floating emojis */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden" style={{ height: '80px', top: '-80px' }}>
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
      <div className="bg-slate-900/95 rounded-xl border border-slate-700/50 p-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            {EMOJI_KEYS.map(key => {
              const recentCount = counts[key] || 0;
              const totalCount = totals[key] || 0;
              const hasActivity = recentCount > 0;

              return (
                <motion.button
                  key={key}
                  whileHover={{ scale: 1.15 }}
                  whileTap={{ scale: 0.85 }}
                  onClick={() => handleReaction(key)}
                  disabled={cooldown}
                  className={`relative flex items-center gap-1 px-2.5 py-1.5 rounded-lg border transition-all ${
                    hasActivity
                      ? 'bg-slate-800/80 border-slate-600/50'
                      : 'bg-slate-800/50 border-slate-700/30'
                  } ${cooldown ? 'opacity-50' : 'hover:border-slate-500/50'}`}
                >
                  <span className="text-lg">{EMOJI_MAP[key]}</span>
                  {totalCount > 0 && (
                    <span className={`text-[10px] font-mono font-bold ${
                      hasActivity ? 'text-cyan-400' : 'text-slate-500'
                    }`}>
                      {totalCount > 999 ? `${(totalCount / 1000).toFixed(1)}k` : totalCount}
                    </span>
                  )}

                  {/* Activity pulse */}
                  {hasActivity && (
                    <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-cyan-400 rounded-full animate-ping opacity-50" />
                  )}
                </motion.button>
              );
            })}
          </div>

          {totalRecent > 0 && (
            <span className="text-[10px] text-slate-500">
              {totalRecent} reactions (30s)
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
