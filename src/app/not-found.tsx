'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useEffect, FormEvent, useCallback } from 'react';
import { motion } from 'framer-motion';

const popularPages = [
  {
    href: '/mission-control',
    label: 'Mission Control',
    description: 'Real-time space operations dashboard',
    icon: 'M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 00-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448 14.9 14.9 0 01.06-.312m-2.24 2.39a4.493 4.493 0 00-1.757 4.306 4.493 4.493 0 004.306-1.758M16.5 9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z',
    color: 'cyan',
  },
  {
    href: '/company-profiles',
    label: 'Company Directory',
    description: '100+ space company profiles',
    icon: 'M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008z',
    color: 'purple',
  },
  {
    href: '/marketplace',
    label: 'Marketplace',
    description: 'Space services and procurement',
    icon: 'M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349m-16.5 11.65V9.35m0 0a3.001 3.001 0 003.75-.615A2.993 2.993 0 009.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 002.25 1.016c.896 0 1.7-.393 2.25-1.016A3.001 3.001 0 0021 9.349m-18 0A2.25 2.25 0 005.25 7.5h13.5A2.25 2.25 0 0021 9.349',
    color: 'emerald',
  },
  {
    href: '/news',
    label: 'News & Media',
    description: 'Latest space industry news',
    icon: 'M12 7.5h1.5m-1.5 3h1.5m-7.5 3h7.5m-7.5 3h7.5m3-9h3.375c.621 0 1.125.504 1.125 1.125V18a2.25 2.25 0 01-2.25 2.25M16.5 7.5V4.875c0-.621-.504-1.125-1.125-1.125H4.125C3.504 3.75 3 4.254 3 4.875V18a2.25 2.25 0 002.25 2.25h13.5M6 7.5h3v3H6v-3z',
    color: 'amber',
  },
  {
    href: '/tools',
    label: 'Tools',
    description: 'Calculators and analysis tools',
    icon: 'M11.42 15.17l-5.1-5.1m0 0L11.42 4.97m-5.1 5.1h14.25M4.5 19.5h15M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
    color: 'blue',
  },
];

const colorClasses: Record<string, { border: string; bg: string; text: string; glow: string }> = {
  cyan: {
    border: 'border-white/10 hover:border-white/10',
    bg: 'bg-white/5',
    text: 'text-slate-300',
    glow: 'group-hover:shadow-[0_0_20px_rgba(255,255,255,0.08)]',
  },
  purple: {
    border: 'border-purple-500/30 hover:border-purple-400/60',
    bg: 'bg-purple-500/10',
    text: 'text-purple-400',
    glow: 'group-hover:shadow-[0_0_20px_rgba(168,85,247,0.15)]',
  },
  emerald: {
    border: 'border-emerald-500/30 hover:border-emerald-400/60',
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-400',
    glow: 'group-hover:shadow-[0_0_20px_rgba(16,185,129,0.15)]',
  },
  amber: {
    border: 'border-amber-500/30 hover:border-amber-400/60',
    bg: 'bg-amber-500/10',
    text: 'text-amber-400',
    glow: 'group-hover:shadow-[0_0_20px_rgba(245,158,11,0.15)]',
  },
  blue: {
    border: 'border-blue-500/30 hover:border-blue-400/60',
    bg: 'bg-blue-500/10',
    text: 'text-blue-400',
    glow: 'group-hover:shadow-[0_0_20px_rgba(59,130,246,0.15)]',
  },
};

// Generate deterministic star positions using a seed
function seededRandom(seed: number) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

const stars = Array.from({ length: 60 }, (_, i) => ({
  id: i,
  top: `${seededRandom(i * 7 + 1) * 100}%`,
  left: `${seededRandom(i * 13 + 3) * 100}%`,
  size: 1 + seededRandom(i * 3 + 5) * 2.5,
  duration: 2 + seededRandom(i * 11 + 7) * 4,
  delay: seededRandom(i * 17 + 9) * 4,
}));

const shootingStars = Array.from({ length: 3 }, (_, i) => ({
  id: i,
  top: `${10 + seededRandom(i * 31 + 1) * 40}%`,
  left: `${seededRandom(i * 37 + 3) * 60}%`,
  delay: 3 + i * 5,
  duration: 0.8 + seededRandom(i * 41 + 5) * 0.6,
}));

export default function NotFound() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSearch = useCallback((e: FormEvent) => {
    e.preventDefault();
    if (query.trim()) router.push(`/search?q=${encodeURIComponent(query.trim())}`);
  }, [query, router]);

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 relative overflow-hidden">
      {/* Inline CSS for animations */}
      <style>{`
        @keyframes float { 0%,100% { transform: translateY(0) rotate(0deg); } 50% { transform: translateY(-18px) rotate(2deg); } }
        @keyframes twinkle-404 { 0%,100% { opacity: 0.15; } 50% { opacity: 1; } }
        @keyframes orbit { 0% { transform: rotate(0deg) translateX(60px) rotate(0deg); } 100% { transform: rotate(360deg) translateX(60px) rotate(-360deg); } }
        @keyframes drift { 0% { transform: translate(0,0) rotate(0deg); } 50% { transform: translate(15px,-10px) rotate(180deg); } 100% { transform: translate(0,0) rotate(360deg); } }
        @keyframes shoot {
          0% { transform: translateX(0) translateY(0) rotate(-35deg); opacity: 1; width: 0; }
          30% { opacity: 1; width: 80px; }
          100% { transform: translateX(300px) translateY(180px) rotate(-35deg); opacity: 0; width: 0; }
        }
        @keyframes pulse-ring {
          0% { transform: scale(1); opacity: 0.3; }
          50% { transform: scale(1.15); opacity: 0.1; }
          100% { transform: scale(1); opacity: 0.3; }
        }
        @keyframes signal-blink {
          0%,100% { opacity: 0.15; }
          50% { opacity: 0.6; }
        }
        .star-404 { position: absolute; background: white; border-radius: 50%; }
        .shooting-star {
          position: absolute;
          height: 1px;
          background: linear-gradient(90deg, rgba(148,163,184,0.6), transparent);
          border-radius: 999px;
          pointer-events: none;
        }
      `}</style>

      {/* Nebula background glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 600px 400px at 50% 40%, rgba(148,163,184,0.04) 0%, transparent 70%), radial-gradient(ellipse 400px 300px at 30% 60%, rgba(139,92,246,0.04) 0%, transparent 70%), radial-gradient(ellipse 400px 300px at 70% 30%, rgba(59,130,246,0.04) 0%, transparent 70%)',
        }}
      />

      {/* Stars */}
      {mounted && stars.map((star) => (
        <div
          key={star.id}
          className="star-404"
          style={{
            top: star.top,
            left: star.left,
            width: `${star.size}px`,
            height: `${star.size}px`,
            animation: `twinkle-404 ${star.duration}s ease-in-out ${star.delay}s infinite`,
          }}
        />
      ))}

      {/* Shooting stars */}
      {mounted && shootingStars.map((s) => (
        <div
          key={`shoot-${s.id}`}
          className="shooting-star"
          style={{
            top: s.top,
            left: s.left,
            animation: `shoot ${s.duration}s ease-out ${s.delay}s infinite`,
          }}
        />
      ))}

      <div className="text-center max-w-2xl w-full relative z-10">
        {/* Lost satellite illustration */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="relative w-52 h-52 mx-auto mb-4"
        >
          {/* Orbit rings */}
          <div className="absolute inset-2 rounded-full border border-dashed border-white/15" style={{ animation: 'pulse-ring 4s ease-in-out infinite' }} />
          <div className="absolute inset-6 rounded-full border border-dashed border-purple-500/10" style={{ animation: 'pulse-ring 5s ease-in-out 1s infinite' }} />
          <div className="absolute inset-10 rounded-full border border-dashed border-blue-500/8" style={{ animation: 'pulse-ring 6s ease-in-out 2s infinite' }} />

          {/* Satellite body */}
          <div style={{ animation: 'float 6s ease-in-out infinite' }} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
            <svg width="72" height="72" viewBox="0 0 64 64" fill="none" className="drop-shadow-[0_0_16px_rgba(148,163,184,0.4)]">
              {/* Main body */}
              <rect x="24" y="20" width="16" height="24" rx="2" fill="#1e293b" stroke="#94a3b8" strokeWidth="1.5" />
              {/* Solar panels */}
              <rect x="4" y="26" width="18" height="12" rx="1" fill="#0f172a" stroke="#94a3b8" strokeWidth="1" />
              <rect x="42" y="26" width="18" height="12" rx="1" fill="#0f172a" stroke="#94a3b8" strokeWidth="1" />
              {/* Panel lines */}
              <line x1="10" y1="26" x2="10" y2="38" stroke="#94a3b8" strokeWidth="0.5" opacity="0.5" />
              <line x1="16" y1="26" x2="16" y2="38" stroke="#94a3b8" strokeWidth="0.5" opacity="0.5" />
              <line x1="48" y1="26" x2="48" y2="38" stroke="#94a3b8" strokeWidth="0.5" opacity="0.5" />
              <line x1="54" y1="26" x2="54" y2="38" stroke="#94a3b8" strokeWidth="0.5" opacity="0.5" />
              {/* Antenna */}
              <line x1="32" y1="20" x2="32" y2="12" stroke="#94a3b8" strokeWidth="1.5" />
              <circle cx="32" cy="10" r="2.5" fill="#0f172a" stroke="#94a3b8" strokeWidth="1" />
              {/* Signal waves (disconnected look) */}
              <path d="M26 8a8 8 0 0 1 12 0" stroke="#94a3b8" strokeWidth="0.8" fill="none" strokeDasharray="2 2">
                <animate attributeName="opacity" values="0.15;0.5;0.15" dur="2.5s" repeatCount="indefinite" />
              </path>
              <path d="M23 5a12 12 0 0 1 18 0" stroke="#94a3b8" strokeWidth="0.6" fill="none" strokeDasharray="3 3">
                <animate attributeName="opacity" values="0.1;0.35;0.1" dur="3s" repeatCount="indefinite" />
              </path>
              {/* Status light - warning orange blink */}
              <circle cx="32" cy="30" r="2" fill="#f97316">
                <animate attributeName="opacity" values="1;0.2;1" dur="1.5s" repeatCount="indefinite" />
              </circle>
              {/* Second status light */}
              <circle cx="28" cy="34" r="1.2" fill="#ef4444">
                <animate attributeName="opacity" values="0.3;1;0.3" dur="2s" repeatCount="indefinite" />
              </circle>
            </svg>
          </div>

          {/* Orbiting debris */}
          <div className="absolute top-1/2 left-1/2" style={{ animation: 'orbit 8s linear infinite' }}>
            <div className="w-1.5 h-1.5 bg-slate-400/60 rounded-sm" style={{ animation: 'drift 3s linear infinite' }} />
          </div>
          <div className="absolute top-1/2 left-1/2" style={{ animation: 'orbit 12s linear infinite reverse' }}>
            <div className="w-1 h-1 bg-white/40 rounded-full" />
          </div>
          <div className="absolute top-1/2 left-1/2" style={{ animation: 'orbit 15s linear 2s infinite' }}>
            <div className="w-0.5 h-0.5 bg-purple-400/30 rounded-full" />
          </div>
        </motion.div>

        {/* 404 number */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="text-[7rem] sm:text-[9rem] font-black leading-none tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-slate-300 via-blue-500 to-purple-600 select-none"
          style={{ lineHeight: 0.85 }}
        >
          404
        </motion.div>

        {/* Message */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <h1 className="text-2xl sm:text-3xl font-bold text-white mt-5 mb-2 font-display">
            Lost in Space?
          </h1>
          <p className="text-slate-400 mb-2 max-w-md mx-auto text-base">
            This page doesn&apos;t exist. It may have been moved, renamed, or lost to the void.
          </p>
          <p className="text-slate-500 text-sm mb-8 max-w-sm mx-auto">
            Try searching for what you&apos;re looking for, or navigate to one of our popular destinations below.
          </p>
        </motion.div>

        {/* Search bar */}
        <motion.form
          onSubmit={handleSearch}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.55 }}
          className="flex items-center max-w-md mx-auto mb-8 bg-slate-900/80 backdrop-blur-sm border border-slate-700/80 rounded-xl overflow-hidden focus-within:border-white/15 focus-within:shadow-[0_0_20px_rgba(6,182,212,0.1)] transition-all duration-300"
        >
          <svg className="w-4 h-4 text-slate-500 ml-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search SpaceNexus..."
            aria-label="Search SpaceNexus"
            className="flex-1 px-3 py-3 bg-transparent text-slate-100 placeholder-slate-500 text-sm focus:outline-none"
          />
          <button
            type="submit"
            className="px-4 py-3 text-slate-300 hover:text-white hover:bg-slate-100/10 text-sm font-medium transition-colors"
          >
            Search
          </button>
        </motion.form>

        {/* Action buttons */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.65 }}
          className="flex gap-3 justify-center mb-10"
        >
          <button
            onClick={() => router.back()}
            className="px-5 py-2.5 bg-slate-800/80 hover:bg-slate-700/80 text-slate-200 text-sm rounded-lg font-medium transition-all duration-200 border border-slate-700/80 hover:border-slate-600 backdrop-blur-sm"
          >
            <span className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Go Back
            </span>
          </button>
          <Link
            href="/"
            className="px-5 py-2.5 bg-gradient-to-r from-slate-200 to-slate-200 hover:from-white hover:to-slate-400 text-white text-sm rounded-lg font-medium transition-all duration-200 shadow-lg shadow-black/10 hover:shadow-black/15"
          >
            <span className="flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              Go Home
            </span>
          </Link>
        </motion.div>

        {/* Popular destinations */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="border-t border-slate-800/60 pt-8"
        >
          <p className="text-xs text-slate-500 mb-5 uppercase tracking-wider font-medium flex items-center justify-center gap-2">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Popular Destinations
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {popularPages.map((page, index) => {
              const colors = colorClasses[page.color] || colorClasses.cyan;
              return (
                <motion.div
                  key={page.href}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.9 + index * 0.08 }}
                >
                  <Link
                    href={page.href}
                    className={`group flex items-start gap-3 px-4 py-3.5 rounded-xl bg-slate-900/60 backdrop-blur-sm border ${colors.border} ${colors.glow} transition-all duration-300 hover:-translate-y-0.5`}
                  >
                    <div className={`w-9 h-9 rounded-lg ${colors.bg} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                      <svg className={`w-4.5 h-4.5 ${colors.text} opacity-80 group-hover:opacity-100 transition-opacity`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={page.icon} />
                      </svg>
                    </div>
                    <div className="text-left min-w-0">
                      <span className="text-sm font-medium text-slate-200 group-hover:text-white transition-colors block">{page.label}</span>
                      <span className="text-xs text-slate-500 group-hover:text-slate-400 transition-colors block mt-0.5 truncate">{page.description}</span>
                    </div>
                    <svg className={`w-4 h-4 ${colors.text} opacity-0 group-hover:opacity-60 transition-all ml-auto flex-shrink-0 mt-1 -translate-x-1 group-hover:translate-x-0`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        {/* Help hint */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 1.4 }}
          className="text-slate-600 text-xs mt-8"
        >
          If you believe this is an error, please{' '}
          <Link href="/contact" className="text-slate-300 hover:text-white underline underline-offset-2 transition-colors">
            contact us
          </Link>
          .
        </motion.p>
      </div>
    </div>
  );
}
