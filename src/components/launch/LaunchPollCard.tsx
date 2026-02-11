'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';

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

export default function LaunchPollCard({ eventId }: LaunchPollCardProps) {
  const [polls, setPolls] = useState<Poll[]>([]);
  const [votedPolls, setVotedPolls] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

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

  // Load voted polls from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(`poll-votes-${eventId}`);
      if (stored) setVotedPolls(new Set(JSON.parse(stored)));
    } catch { /* ignore */ }
  }, [eventId]);

  const handleVote = async (pollId: string, optionIndex: number) => {
    if (votedPolls.has(pollId)) return;

    try {
      const res = await fetch(`/api/launch-day/${eventId}/polls/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pollId, option: optionIndex }),
      });

      if (res.ok) {
        const data = await res.json();
        // Update local state
        setPolls(prev => prev.map(p =>
          p.id === pollId ? { ...p, votes: data.data.votes } : p
        ));
        const newVoted = new Set(votedPolls).add(pollId);
        setVotedPolls(newVoted);
        localStorage.setItem(`poll-votes-${eventId}`, JSON.stringify(Array.from(newVoted)));
      } else if (res.status === 409) {
        // Already voted
        const newVoted = new Set(votedPolls).add(pollId);
        setVotedPolls(newVoted);
      }
    } catch {
      // Silent fail
    }
  };

  if (loading || polls.length === 0) return null;

  return (
    <div className="space-y-3">
      {polls.map(poll => {
        const hasVoted = votedPolls.has(poll.id);
        const options = (Array.isArray(poll.options) ? poll.options : []) as string[];
        const votes = poll.votes || {};
        const totalVotes = Object.values(votes).reduce((sum: number, v: any) => sum + (Number(v) || 0), 0);

        return (
          <motion.div
            key={poll.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-slate-900/95 rounded-xl border border-slate-700/50 overflow-hidden"
          >
            <div className="px-4 py-3 border-b border-slate-700/50 bg-slate-800/50">
              <h4 className="text-white font-medium text-sm flex items-center gap-2">
                <span className="text-lg">📊</span>
                {poll.question}
              </h4>
            </div>

            <div className="p-3 space-y-2">
              {options.map((option, i) => {
                const count = Number(votes[String(i)] || 0);
                const pct = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;

                return (
                  <button
                    key={i}
                    onClick={() => handleVote(poll.id, i)}
                    disabled={hasVoted}
                    className={`w-full relative overflow-hidden rounded-lg border transition-all text-left ${
                      hasVoted
                        ? 'border-slate-700/30 cursor-default'
                        : 'border-slate-600/50 hover:border-cyan-500/40 cursor-pointer'
                    }`}
                  >
                    {/* Progress background */}
                    {hasVoted && (
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.5, ease: 'easeOut' }}
                        className="absolute inset-y-0 left-0 bg-cyan-500/10"
                      />
                    )}

                    <div className="relative flex items-center justify-between px-3 py-2">
                      <span className={`text-sm ${hasVoted ? 'text-slate-300' : 'text-white'}`}>
                        {option}
                      </span>
                      {hasVoted && (
                        <span className="text-xs font-mono text-cyan-400 font-bold ml-2">
                          {pct}%
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}

              {totalVotes > 0 && (
                <div className="text-slate-500 text-[10px] text-center pt-1">
                  {totalVotes} vote{totalVotes !== 1 ? 's' : ''}
                </div>
              )}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
