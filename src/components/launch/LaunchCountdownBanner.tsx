'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';

interface ActiveLaunch {
  id: string;
  name: string;
  agency: string | null;
  launchDate: string | null;
  isLive: boolean;
  streamUrl: string | null;
}

export default function LaunchCountdownBanner() {
  const [launch, setLaunch] = useState<ActiveLaunch | null>(null);
  const [countdown, setCountdown] = useState<string>('');
  const [dismissed, setDismissed] = useState(false);
  const [isImminent, setIsImminent] = useState(false);

  const fetchActiveLaunch = useCallback(async () => {
    try {
      const res = await fetch('/api/launch-day/active');
      if (!res.ok) return;
      const data = await res.json();
      if (data.success) {
        // Prioritize live launches, then imminent
        const liveLaunch = data.data.live?.[0];
        const imminentLaunch = data.data.imminent?.[0];
        setLaunch(liveLaunch || imminentLaunch || null);
      }
    } catch {
      // Silently fail
    }
  }, []);

  useEffect(() => {
    fetchActiveLaunch();
    const interval = setInterval(fetchActiveLaunch, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [fetchActiveLaunch]);

  useEffect(() => {
    if (!launch?.launchDate) return;

    const updateCountdown = () => {
      const now = new Date();
      const launchDate = new Date(launch.launchDate!);
      const diff = launchDate.getTime() - now.getTime();

      if (launch.isLive) {
        setCountdown('LIVE NOW');
        setIsImminent(true);
        return;
      }

      if (diff <= 0) {
        setCountdown('LAUNCHED');
        setIsImminent(true);
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      const pad = (n: number) => n.toString().padStart(2, '0');

      setCountdown(`T-${pad(hours)}:${pad(minutes)}:${pad(seconds)}`);
      setIsImminent(diff <= 10 * 60 * 1000); // Less than 10 minutes
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [launch]);

  if (!launch || dismissed) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: 'auto', opacity: 1 }}
        exit={{ height: 0, opacity: 0 }}
        transition={{ duration: 0.3 }}
        className="overflow-hidden"
      >
        <div
          className={`relative px-4 py-2.5 ${
            launch.isLive
              ? 'bg-gradient-to-r from-red-900/80 via-red-800/80 to-red-900/80'
              : isImminent
              ? 'bg-gradient-to-r from-orange-900/80 via-orange-800/80 to-orange-900/80'
              : 'bg-gradient-to-r from-slate-800/90 via-slate-700/90 to-slate-800/90'
          } border-b border-slate-700/50`}
        >
          {/* Pulsing background for imminent launches */}
          {isImminent && (
            <div className="absolute inset-0 bg-gradient-to-r from-red-500/10 via-orange-500/10 to-red-500/10 animate-pulse" />
          )}

          <div className="relative container mx-auto flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              {/* Live indicator */}
              {launch.isLive && (
                <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-red-500/30 text-red-400 text-xs font-bold flex-shrink-0">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
                  </span>
                  LIVE
                </span>
              )}

              {/* Mission info */}
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-white text-sm font-medium truncate">{launch.name}</span>
                {launch.agency && (
                  <span className="text-slate-400 text-xs hidden sm:inline">
                    by {launch.agency}
                  </span>
                )}
              </div>

              {/* Countdown */}
              <span
                className={`font-mono text-sm font-bold flex-shrink-0 ${
                  launch.isLive
                    ? 'text-red-400'
                    : isImminent
                    ? 'text-orange-400'
                    : 'text-cyan-400'
                }`}
              >
                {countdown}
              </span>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              {/* Watch Live button */}
              <Link
                href={`/launch/${launch.id}`}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
                  launch.isLive
                    ? 'bg-red-500 text-white hover:bg-red-400'
                    : 'bg-cyan-500 text-white hover:bg-cyan-400'
                }`}
              >
                {launch.isLive ? 'Watch Live' : 'View Launch'}
              </Link>

              {/* Dismiss button */}
              <button
                onClick={() => setDismissed(true)}
                className="text-slate-400 hover:text-white transition-colors p-1"
                aria-label="Dismiss banner"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
