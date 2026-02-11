'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';

interface CompactLaunchCardProps {
  event: {
    id: string;
    name: string;
    launchDate: string | null;
    agency: string | null;
    rocket: string | null;
    location: string | null;
    isLive: boolean;
  };
}

export default function CompactLaunchCard({ event }: CompactLaunchCardProps) {
  const [countdown, setCountdown] = useState('');
  const [phase, setPhase] = useState('');

  useEffect(() => {
    if (!event.launchDate) return;

    const update = () => {
      const diff = (new Date(event.launchDate!).getTime() - Date.now()) / 1000;
      const sign = diff < 0 ? '+' : '-';
      const abs = Math.abs(diff);
      const h = Math.floor(abs / 3600);
      const m = Math.floor((abs % 3600) / 60);
      const s = Math.floor(abs % 60);
      setCountdown(`T${sign}${h > 0 ? h.toString().padStart(2, '0') + ':' : ''}${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);

      // Simple phase detection
      if (diff > 600) setPhase('Pre-Launch');
      else if (diff > 0) setPhase('Terminal Count');
      else if (diff > -162) setPhase('First Stage');
      else if (diff > -510) setPhase('Second Stage');
      else setPhase('Orbital');
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [event.launchDate]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-slate-800/50 rounded-lg border border-slate-700/30 p-3 hover:border-slate-600/50 transition-all"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            {event.isLive && (
              <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 text-[10px] font-bold flex-shrink-0">
                <span className="w-1 h-1 bg-red-400 rounded-full animate-pulse" />
                LIVE
              </span>
            )}
            <h4 className="text-white text-sm font-medium truncate">{event.name}</h4>
          </div>
          <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-400">
            {event.rocket && <span className="text-cyan-400">{event.rocket}</span>}
            {event.agency && <span>{event.agency}</span>}
            {phase && (
              <span className="px-1.5 py-0.5 rounded bg-slate-700/50 text-slate-300 text-[10px]">
                {phase}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          <span className="font-mono text-sm font-bold text-cyan-400">
            {countdown || '--:--'}
          </span>
          <Link
            href={`/launch/${event.id}`}
            className="px-2.5 py-1 rounded-lg bg-cyan-500/20 text-cyan-400 text-xs font-bold hover:bg-cyan-500/30 border border-cyan-500/30 transition-colors"
          >
            Open
          </Link>
        </div>
      </div>
    </motion.div>
  );
}
