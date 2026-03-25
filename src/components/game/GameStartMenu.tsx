'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { loadGame } from '@/lib/game/save-load';
import { BG_ASSETS } from '@/lib/game/assets';

interface GameStartMenuProps {
  onNewGame: () => void;
  onContinue: () => void;
}

/** Cinematic start screen with animated background */
export default function GameStartMenu({ onNewGame, onContinue }: GameStartMenuProps) {
  const [hasSave, setHasSave] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setHasSave(!!loadGame());
  }, []);

  return (
    <div className="min-h-screen bg-[#050510] flex items-center justify-center px-4 relative overflow-hidden">
      {/* Background art */}
      <Image
        src={BG_ASSETS.loadingScreen}
        alt=""
        fill
        sizes="100vw"
        className="absolute inset-0 object-cover opacity-30 pointer-events-none"
        priority
      />

      {/* Animated star field */}
      {mounted && (
        <>
          <div className="absolute inset-0 pointer-events-none">
            {Array.from({ length: 80 }).map((_, i) => {
              const seed = i * 7 + 1;
              const x = ((Math.sin(seed) * 10000) % 1 + 1) % 1 * 100;
              const y = ((Math.sin(seed * 3 + 5) * 10000) % 1 + 1) % 1 * 100;
              const size = 0.5 + ((Math.sin(seed * 11) * 10000) % 1 + 1) % 1 * 2;
              const dur = 2 + ((Math.sin(seed * 17) * 10000) % 1 + 1) % 1 * 4;
              const delay = ((Math.sin(seed * 23) * 10000) % 1 + 1) % 1 * 3;
              return (
                <div
                  key={i}
                  className="absolute rounded-full bg-white"
                  style={{
                    left: `${x}%`,
                    top: `${y}%`,
                    width: size,
                    height: size,
                    animation: `twinkle ${dur}s ease-in-out ${delay}s infinite`,
                  }}
                />
              );
            })}
          </div>

          {/* Nebula glow */}
          <div className="absolute top-1/3 left-1/4 w-[600px] h-[400px] bg-purple-500/[0.04] rounded-full blur-[150px] pointer-events-none" />
          <div className="absolute bottom-1/4 right-1/3 w-[500px] h-[300px] bg-cyan-500/[0.03] rounded-full blur-[120px] pointer-events-none" />
        </>
      )}

      {/* Content */}
      <div className="relative z-10 text-center max-w-lg">
        {/* Logo animation */}
        <div
          className="mb-6"
          style={{ animation: mounted ? 'reveal-up 0.8s ease-out forwards' : 'none', opacity: mounted ? 1 : 0 }}
        >
          {/* Orbit rings logomark */}
          <svg width="80" height="80" viewBox="0 0 80 80" fill="none" className="mx-auto mb-4">
            <ellipse cx="40" cy="40" rx="36" ry="18" stroke="url(#menuGrad)" strokeWidth="1.5" transform="rotate(-25 40 40)" opacity="0.6">
              <animateTransform attributeName="transform" type="rotate" from="-25 40 40" to="335 40 40" dur="20s" repeatCount="indefinite" />
            </ellipse>
            <ellipse cx="40" cy="40" rx="28" ry="14" stroke="url(#menuGrad)" strokeWidth="1" transform="rotate(25 40 40)" opacity="0.3">
              <animateTransform attributeName="transform" type="rotate" from="25 40 40" to="-335 40 40" dur="15s" repeatCount="indefinite" />
            </ellipse>
            <circle cx="40" cy="40" r="8" fill="url(#menuGrad)">
              <animate attributeName="r" values="8;9;8" dur="3s" repeatCount="indefinite" />
            </circle>
            <circle cx="38" cy="38" r="2.5" fill="white" opacity="0.4" />
            {/* Orbiting satellite dot */}
            <circle cx="40" cy="40" r="2" fill="#06b6d4">
              <animateMotion dur="6s" repeatCount="indefinite" path="M36,0 A36,18 -25 1,1 -36,0 A36,18 -25 1,1 36,0" />
            </circle>
            <defs>
              <linearGradient id="menuGrad" x1="0" y1="0" x2="80" y2="80">
                <stop offset="0%" stopColor="#06b6d4" />
                <stop offset="100%" stopColor="#8b5cf6" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        {/* Title */}
        <h1
          className="text-4xl sm:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-white to-purple-300 mb-2 tracking-tight"
          style={{ animation: mounted ? 'reveal-up 0.8s ease-out 0.2s both' : 'none' }}
        >
          Space Tycoon
        </h1>

        <p
          className="text-slate-400 text-sm sm:text-base mb-1 font-medium"
          style={{ animation: mounted ? 'reveal-up 0.6s ease-out 0.4s both' : 'none' }}
        >
          Build Your Space Empire
        </p>

        <p
          className="text-slate-500 text-xs sm:text-sm mb-8 max-w-md mx-auto leading-relaxed"
          style={{ animation: mounted ? 'reveal-up 0.6s ease-out 0.5s both' : 'none' }}
        >
          Research technologies, launch rockets, deploy satellites, build space stations,
          and mine resources across the solar system.
        </p>

        {/* Buttons */}
        <div
          className="flex flex-col gap-3 max-w-xs mx-auto"
          style={{ animation: mounted ? 'reveal-up 0.6s ease-out 0.7s both' : 'none' }}
        >
          <button
            onClick={onNewGame}
            className="group relative w-full py-3.5 text-sm font-bold text-white rounded-xl overflow-hidden transition-all duration-300 hover:shadow-[0_0_30px_rgba(6,182,212,0.3)]"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-600 to-purple-600 group-hover:from-cyan-500 group-hover:to-purple-500 transition-all" />
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.1),transparent_70%)]" />
            <span className="relative flex items-center justify-center gap-2">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58" />
              </svg>
              New Game
            </span>
          </button>

          {hasSave && (
            <button
              onClick={onContinue}
              className="w-full py-3 text-sm font-semibold text-white/90 border border-white/10 hover:border-cyan-500/30 hover:bg-white/[0.04] rounded-xl transition-all duration-200"
            >
              Continue Saved Game
            </button>
          )}
        </div>

        {/* Footer */}
        <div
          className="mt-8 flex items-center justify-center gap-3 text-xs text-slate-600"
          style={{ animation: mounted ? 'reveal-up 0.5s ease-out 1s both' : 'none' }}
        >
          <Link href="/discover" className="hover:text-slate-400 transition-colors">
            Back to SpaceNexus
          </Link>
          <span>•</span>
          <span>Free to play</span>
          <span>•</span>
          <span>Saves locally</span>
        </div>
      </div>

      <style jsx>{`
        @keyframes twinkle {
          0%, 100% { opacity: 0.15; }
          50% { opacity: 0.9; }
        }
      `}</style>
    </div>
  );
}
