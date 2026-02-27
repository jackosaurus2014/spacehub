'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, FormEvent } from 'react';

const popularPages = [
  { href: '/mission-control', label: 'Mission Control', icon: 'M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 00-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448 14.9 14.9 0 01.06-.312m-2.24 2.39a4.493 4.493 0 00-1.757 4.306 4.493 4.493 0 004.306-1.758M16.5 9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z' },
  { href: '/company-profiles', label: 'Company Profiles', icon: 'M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008z' },
  { href: '/marketplace', label: 'Marketplace', icon: 'M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349m-16.5 11.65V9.35m0 0a3.001 3.001 0 003.75-.615A2.993 2.993 0 009.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 002.25 1.016c.896 0 1.7-.393 2.25-1.016A3.001 3.001 0 0021 9.349m-18 0A2.25 2.25 0 005.25 7.5h13.5A2.25 2.25 0 0021 9.349' },
  { href: '/news', label: 'News & Media', icon: 'M12 7.5h1.5m-1.5 3h1.5m-7.5 3h7.5m-7.5 3h7.5m3-9h3.375c.621 0 1.125.504 1.125 1.125V18a2.25 2.25 0 01-2.25 2.25M16.5 7.5V4.875c0-.621-.504-1.125-1.125-1.125H4.125C3.504 3.75 3 4.254 3 4.875V18a2.25 2.25 0 002.25 2.25h13.5M6 7.5h3v3H6v-3z' },
  { href: '/satellites', label: 'Satellite Tracker', icon: 'M8.288 15.038a5.25 5.25 0 017.424 0M5.106 11.856c3.807-3.808 9.98-3.808 13.788 0M1.924 8.674c5.565-5.565 14.587-5.565 20.152 0M12.53 18.22l-.53.53-.53-.53a.75.75 0 011.06 0z' },
  { href: '/space-talent', label: 'Space Talent', icon: 'M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z' },
];

export default function NotFound() {
  const router = useRouter();
  const [query, setQuery] = useState('');

  const handleSearch = (e: FormEvent) => {
    e.preventDefault();
    if (query.trim()) router.push(`/search?q=${encodeURIComponent(query.trim())}`);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4 relative overflow-hidden">
      {/* Animated stars */}
      <style>{`
        @keyframes float { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-20px); } }
        @keyframes twinkle { 0%,100% { opacity: 0.2; } 50% { opacity: 1; } }
        @keyframes orbit { 0% { transform: rotate(0deg) translateX(60px) rotate(0deg); } 100% { transform: rotate(360deg) translateX(60px) rotate(-360deg); } }
        @keyframes drift { 0% { transform: translate(0,0) rotate(0deg); } 50% { transform: translate(15px,-10px) rotate(180deg); } 100% { transform: translate(0,0) rotate(360deg); } }
        .star { position: absolute; width: 2px; height: 2px; background: white; border-radius: 50%; }
      `}</style>
      {[...Array(40)].map((_, i) => (
        <div key={i} className="star" style={{
          top: `${Math.random() * 100}%`, left: `${Math.random() * 100}%`,
          width: `${1 + Math.random() * 2}px`, height: `${1 + Math.random() * 2}px`,
          animation: `twinkle ${2 + Math.random() * 3}s ease-in-out ${Math.random() * 3}s infinite`,
        }} />
      ))}

      <div className="text-center max-w-xl relative z-10">
        {/* Lost satellite illustration */}
        <div className="relative w-48 h-48 mx-auto mb-6">
          {/* Orbit ring */}
          <div className="absolute inset-4 rounded-full border border-dashed border-cyan-500/20" />
          <div className="absolute inset-8 rounded-full border border-dashed border-cyan-500/10" />
          {/* Satellite body */}
          <div style={{ animation: 'float 6s ease-in-out infinite' }} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
            <svg width="64" height="64" viewBox="0 0 64 64" fill="none" className="drop-shadow-[0_0_12px_rgba(6,182,212,0.4)]">
              {/* Main body */}
              <rect x="24" y="20" width="16" height="24" rx="2" fill="#1e293b" stroke="#06b6d4" strokeWidth="1.5" />
              {/* Solar panels */}
              <rect x="4" y="26" width="18" height="12" rx="1" fill="#0f172a" stroke="#06b6d4" strokeWidth="1" />
              <rect x="42" y="26" width="18" height="12" rx="1" fill="#0f172a" stroke="#06b6d4" strokeWidth="1" />
              {/* Panel lines */}
              <line x1="10" y1="26" x2="10" y2="38" stroke="#06b6d4" strokeWidth="0.5" opacity="0.5" />
              <line x1="16" y1="26" x2="16" y2="38" stroke="#06b6d4" strokeWidth="0.5" opacity="0.5" />
              <line x1="48" y1="26" x2="48" y2="38" stroke="#06b6d4" strokeWidth="0.5" opacity="0.5" />
              <line x1="54" y1="26" x2="54" y2="38" stroke="#06b6d4" strokeWidth="0.5" opacity="0.5" />
              {/* Antenna */}
              <line x1="32" y1="20" x2="32" y2="12" stroke="#06b6d4" strokeWidth="1.5" />
              <circle cx="32" cy="10" r="2.5" fill="#0f172a" stroke="#06b6d4" strokeWidth="1" />
              {/* Signal waves */}
              <path d="M26 8a8 8 0 0 1 12 0" stroke="#06b6d4" strokeWidth="0.8" opacity="0.4" fill="none" />
              <path d="M23 5a12 12 0 0 1 18 0" stroke="#06b6d4" strokeWidth="0.6" opacity="0.2" fill="none" />
              {/* Status light */}
              <circle cx="32" cy="30" r="2" fill="#f97316">
                <animate attributeName="opacity" values="1;0.3;1" dur="2s" repeatCount="indefinite" />
              </circle>
            </svg>
          </div>
          {/* Orbiting debris */}
          <div className="absolute top-1/2 left-1/2" style={{ animation: 'orbit 8s linear infinite' }}>
            <div className="w-1.5 h-1.5 bg-slate-400/60 rounded-sm" style={{ animation: 'drift 3s linear infinite' }} />
          </div>
          <div className="absolute top-1/2 left-1/2" style={{ animation: 'orbit 12s linear infinite reverse' }}>
            <div className="w-1 h-1 bg-cyan-400/40 rounded-full" />
          </div>
        </div>

        {/* 404 number */}
        <div className="text-[8rem] sm:text-[10rem] font-black leading-none tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-cyan-400 via-blue-500 to-purple-600 select-none" style={{ lineHeight: 0.85 }}>
          404
        </div>

        {/* Message */}
        <h1 className="text-2xl sm:text-3xl font-bold text-white mt-4 mb-2">Lost in Space</h1>
        <p className="text-slate-400 mb-8 max-w-md mx-auto">
          The page you&apos;re looking for has drifted into deep space.
        </p>

        {/* Search bar */}
        <form onSubmit={handleSearch} className="flex items-center max-w-sm mx-auto mb-8 bg-slate-900/80 border border-slate-700 rounded-xl overflow-hidden focus-within:border-cyan-500/50 transition-colors">
          <svg className="w-4 h-4 text-slate-500 ml-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search SpaceNexus..."
            aria-label="Search SpaceNexus"
            className="flex-1 px-3 py-3 bg-transparent text-slate-100 placeholder-slate-500 text-sm focus:outline-none"
          />
          <button type="submit" className="px-4 py-3 text-cyan-400 hover:text-cyan-300 text-sm font-medium transition-colors">
            Search
          </button>
        </form>

        {/* Action buttons */}
        <div className="flex gap-3 justify-center mb-10">
          <button onClick={() => router.back()} className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm rounded-lg font-medium transition-colors border border-slate-700">
            Go Back
          </button>
          <Link href="/" className="px-5 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white text-sm rounded-lg font-medium transition-colors">
            Go Home
          </Link>
        </div>

        {/* Popular destinations */}
        <div className="border-t border-slate-800/60 pt-6">
          <p className="text-xs text-slate-500 mb-4 uppercase tracking-wider font-medium">Popular Destinations</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {popularPages.map((page) => (
              <Link key={page.href} href={page.href} className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-slate-900/50 border border-slate-800/50 hover:border-cyan-500/30 hover:bg-slate-800/50 text-slate-400 hover:text-cyan-400 transition-all group">
                <svg className="w-4 h-4 flex-shrink-0 opacity-60 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={page.icon} />
                </svg>
                <span className="text-xs font-medium truncate">{page.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
