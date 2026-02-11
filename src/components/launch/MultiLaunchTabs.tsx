'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';

interface LiveLaunch {
  id: string;
  name: string;
  launchDate: string | null;
  agency: string | null;
  rocket: string | null;
}

interface MultiLaunchTabsProps {
  launches: LiveLaunch[];
  activeEventId?: string;
}

function MiniCountdown({ launchDate }: { launchDate: string }) {
  const [display, setDisplay] = useState('');

  useEffect(() => {
    const update = () => {
      const diff = (new Date(launchDate).getTime() - Date.now()) / 1000;
      const sign = diff < 0 ? '+' : '-';
      const abs = Math.abs(diff);
      const m = Math.floor(abs / 60);
      const s = Math.floor(abs % 60);
      setDisplay(`T${sign}${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [launchDate]);

  return <span className="font-mono text-[10px]">{display}</span>;
}

export default function MultiLaunchTabs({ launches, activeEventId }: MultiLaunchTabsProps) {
  if (launches.length < 2) return null;

  return (
    <div className="bg-slate-900/90 border-b border-slate-700/50 backdrop-blur-sm">
      <div className="container mx-auto px-4">
        <div className="flex items-center gap-1 overflow-x-auto py-2 scrollbar-hide">
          <span className="text-slate-500 text-xs font-medium mr-2 flex-shrink-0">
            {launches.length} Live:
          </span>
          {launches.map((launch) => {
            const isActive = launch.id === activeEventId;
            return (
              <Link
                key={launch.id}
                href={`/launch/${launch.id}`}
                className="relative flex-shrink-0"
              >
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs transition-all ${
                    isActive
                      ? 'bg-red-500/20 text-white border border-red-500/40'
                      : 'bg-slate-800/50 text-slate-300 border border-slate-700/30 hover:border-slate-600/50'
                  }`}
                >
                  {isActive && (
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-500" />
                    </span>
                  )}
                  <span className="font-medium truncate max-w-[120px]">{launch.name}</span>
                  {launch.launchDate && (
                    <span className={isActive ? 'text-red-300' : 'text-slate-500'}>
                      <MiniCountdown launchDate={launch.launchDate} />
                    </span>
                  )}
                </motion.div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
