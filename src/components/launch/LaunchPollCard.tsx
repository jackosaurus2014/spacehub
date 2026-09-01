'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

interface Poll {
  id: string;
  question: string;
  options: string[];
  votes: Record<string, number>;
  isActive: boolean;
}

interface LaunchPollCardProps {
  eventId: string;
}

/**
 * Launch-day polls. Anyone can vote (2026-09-01) — the server keys votes on
 * the signed-in user id or the httpOnly sn_vid visitor cookie, one vote per
 * actor. Voting again moves your vote; localStorage only remembers which
 * option you picked so results render on reload.
 */
export default function LaunchPollCard({ eventId }: LaunchPollCardProps) {
  const reduceMotion = useReducedMotion();
  const [polls, setPolls] = useState<Poll[]>([]);
  // pollId -> chosen option index
  const [myVotes, setMyVotes] = useState<Record<string, number>>({});
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  const storageKey = `poll-votes-${eventId}`;

  const fetchPolls = useCallback(async () => {
    try {
      const res = await fetch(`/api/launch-day/${eventId}/polls`);
      if (!res.ok) return;
      const data = await res.json();
      if (data.success && data.data.polls) {
        setPolls(data.data.polls);
      }
    } catch {
      // Silent fail
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    fetchPolls();
    pollRef.current = setInterval(fetchPolls, 5000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [fetchPolls]);

  // Load remembered votes from localStorage (legacy format was an array of ids).
  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (!stored) return;
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        const map: Record<string, number> = {};
        for (const id of parsed) if (typeof id === 'string') map[id] = -1;
        setMyVotes(map);
      } else if (parsed && typeof parsed === 'object') {
        setMyVotes(parsed);
      }
    } catch { /* ignore */ }
  }, [storageKey]);

  const remember = (next: Record<string, number>) => {
    setMyVotes(next);
    try {
      localStorage.setItem(storageKey, JSON.stringify(next));
    } catch { /* ignore */ }
  };

  const handleVote = async (pollId: string, optionIndex: number) => {
    if (pending || myVotes[pollId] === optionIndex) return;

    setPending(pollId);
    setError(null);
    try {
      const res = await fetch(`/api/launch-day/${eventId}/polls/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pollId, optionIndex }),
      });

      if (res.ok) {
        const data = await res.json();
        setPolls(prev => prev.map(p =>
          p.id === pollId ? { ...p, votes: data.data.votes } : p
        ));
        remember({ ...myVotes, [pollId]: optionIndex });
      } else if (res.status === 401) {
        setError('Enable cookies to vote.');
      } else if (res.status === 400) {
        const data = await res.json().catch(() => ({}));
        setError(typeof data.error === 'string' ? data.error : 'This poll has closed.');
      }
    } catch {
      // Silent fail
    } finally {
      setPending(null);
    }
  };

  if (loading || polls.length === 0) return null;

  return (
    <div className="space-y-3">
      {error && (
        <div className="text-xs text-yellow-400" role="alert">{error}</div>
      )}
      {polls.map(poll => {
        const chosen = myVotes[poll.id];
        const hasVoted = chosen !== undefined;
        const options = (Array.isArray(poll.options) ? poll.options : []) as string[];
        const votes = poll.votes || {};
        const totalVotes = Object.values(votes).reduce((sum: number, v: any) => sum + (Number(v) || 0), 0);
        const groupId = `launch-poll-${poll.id}`;

        return (
          <motion.div
            key={poll.id}
            initial={reduceMotion ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-black/95 rounded-xl border border-white/[0.06] overflow-hidden"
            role="group"
            aria-labelledby={groupId}
          >
            <div className="px-4 py-3 border-b border-white/[0.06] bg-white/[0.04]">
              <h4 id={groupId} className="text-white font-medium text-sm flex items-center gap-2">
                <span className="text-lg" aria-hidden="true">📊</span>
                {poll.question}
              </h4>
            </div>

            <div className="p-3 space-y-2">
              {options.map((option, i) => {
                const count = Number(votes[String(i)] || 0);
                const pct = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
                const isChosen = chosen === i;

                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleVote(poll.id, i)}
                    disabled={pending === poll.id}
                    aria-pressed={isChosen}
                    aria-label={hasVoted ? `${option}, ${pct}%${isChosen ? ', your vote' : ''}` : option}
                    className={`w-full min-h-[44px] relative overflow-hidden rounded-lg border transition-all motion-reduce:transition-none text-left ${
                      isChosen
                        ? 'border-white/25'
                        : hasVoted
                          ? 'border-white/[0.06] hover:border-white/15'
                          : 'border-white/[0.08] hover:border-white/15'
                    } ${pending === poll.id ? 'opacity-70 cursor-wait' : 'cursor-pointer'}`}
                  >
                    {/* Progress background */}
                    {hasVoted && (
                      <motion.div
                        initial={reduceMotion ? false : { width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={reduceMotion ? { duration: 0 } : { duration: 0.5, ease: 'easeOut' }}
                        className={`absolute inset-y-0 left-0 ${isChosen ? 'bg-white/10' : 'bg-white/5'}`}
                        aria-hidden="true"
                      />
                    )}

                    <div className="relative flex items-center justify-between px-3 py-2.5 gap-2">
                      <span className={`text-sm flex items-center gap-2 ${hasVoted && !isChosen ? 'text-white/70' : 'text-white'}`}>
                        {isChosen && (
                          <svg className="w-3.5 h-3.5 text-white/80 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                        {option}
                      </span>
                      {hasVoted && (
                        <span className="text-xs font-mono text-white/70 font-bold ml-2 flex-shrink-0">
                          {pct}%
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}

              <div className="text-slate-500 text-xs text-center pt-1">
                {totalVotes > 0 ? `${totalVotes} vote${totalVotes !== 1 ? 's' : ''}` : 'No votes yet'}
                {hasVoted ? ' · tap another option to change your vote' : ' · no account needed'}
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
