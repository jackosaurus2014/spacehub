'use client';

import { useState, useEffect } from 'react';
import { selectWeeklyChallenge, getWeekTimeRemaining } from '@/lib/game/weekly-events';
import { formatCountdown } from '@/lib/game/formulas';

export default function WeeklyChallengeWidget() {
  const challenge = selectWeeklyChallenge();
  const [remaining, setRemaining] = useState(getWeekTimeRemaining());

  useEffect(() => {
    const t = setInterval(() => setRemaining(getWeekTimeRemaining()), 60000); // Update every minute
    return () => clearInterval(t);
  }, []);

  const days = Math.floor(remaining / 86400000);
  const hours = Math.floor((remaining % 86400000) / 3600000);

  return (
    <div className="rounded-xl border border-amber-500/20 bg-gradient-to-r from-amber-500/5 to-purple-500/5 p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">{challenge.icon}</span>
          <div>
            <h3 className="text-white text-sm font-semibold">Weekly Challenge</h3>
            <p className="text-amber-400 text-xs font-medium">{challenge.name}</p>
          </div>
        </div>
        <div className="text-right">
          <span className="text-slate-400 text-[10px]">Ends in</span>
          <p className="text-white text-xs font-mono">{days}d {hours}h</p>
        </div>
      </div>
      <p className="text-slate-400 text-xs mb-2">{challenge.description}</p>
      <div className="flex items-center gap-2 text-[10px]">
        <span className="text-green-400">Reward: {challenge.reward.money ? `$${(challenge.reward.money / 1_000_000).toFixed(0)}M` : ''}</span>
        {challenge.reward.title && (
          <span className="px-1.5 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20">
            Title: {challenge.reward.title}
          </span>
        )}
      </div>
    </div>
  );
}
