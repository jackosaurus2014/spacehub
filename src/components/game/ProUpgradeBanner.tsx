'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

const STORAGE_KEY = 'spacetycoon_pro_banner_dismissed';

/**
 * Shows a non-intrusive banner in Space Tycoon when the player reaches
 * a certain progress level, inviting them to explore real space data.
 * Only shows once. Dismissible.
 */
export default function ProUpgradeBanner({ completedResearch }: { completedResearch: number }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Show after player has completed 2+ research (engaged player)
    if (completedResearch < 2) return;
    try {
      if (localStorage.getItem(STORAGE_KEY) === 'true') return;
    } catch {}
    const timer = setTimeout(() => setVisible(true), 5000);
    return () => clearTimeout(timer);
  }, [completedResearch]);

  const handleDismiss = () => {
    try { localStorage.setItem(STORAGE_KEY, 'true'); } catch {}
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-80 z-40 animate-reveal-up">
      <div className="rounded-xl border border-cyan-500/20 bg-[#0a0a1a]/95 backdrop-blur-sm p-4 shadow-2xl shadow-black/50">
        <button
          onClick={handleDismiss}
          className="absolute top-2 right-2 text-slate-600 hover:text-white text-xs"
        >
          ✕
        </button>
        <div className="flex items-start gap-3">
          <span className="text-2xl shrink-0">🛰️</span>
          <div>
            <h4 className="text-white text-sm font-semibold mb-1">Love Space Tycoon?</h4>
            <p className="text-slate-400 text-xs leading-relaxed mb-3">
              Explore <strong className="text-white">real</strong> space industry data — track actual satellites, monitor live launches, and analyze 200+ real space companies.
            </p>
            <div className="flex gap-2">
              <Link
                href="/discover?utm_source=game&utm_medium=pro_banner"
                className="px-3 py-1.5 text-[10px] font-semibold text-white bg-gradient-to-r from-cyan-600 to-purple-600 rounded-lg hover:from-cyan-500 hover:to-purple-500 transition-all"
                onClick={handleDismiss}
              >
                Explore SpaceNexus
              </Link>
              <button
                onClick={handleDismiss}
                className="px-3 py-1.5 text-[10px] text-slate-500 hover:text-white transition-colors"
              >
                Maybe later
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
