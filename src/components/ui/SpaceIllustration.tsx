'use client';

import { useEffect, useState } from 'react';

/**
 * Animated SVG space illustration with orbiting satellite, Earth, and stars.
 * Used on hero sections, empty states, and feature pages for visual appeal.
 */
export default function SpaceIllustration({ size = 280, className = '' }: { size?: number; className?: string }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <div className={`relative ${className}`} style={{ width: size, height: size }}>
      <svg
        viewBox="0 0 400 400"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full"
      >
        {/* Background stars */}
        {mounted && (
          <g>
            {[
              { cx: 40, cy: 60, r: 1.2, delay: 0 },
              { cx: 350, cy: 40, r: 0.8, delay: 0.5 },
              { cx: 80, cy: 320, r: 1, delay: 1 },
              { cx: 300, cy: 350, r: 0.6, delay: 1.5 },
              { cx: 180, cy: 30, r: 1.4, delay: 0.3 },
              { cx: 320, cy: 180, r: 0.9, delay: 0.8 },
              { cx: 50, cy: 200, r: 1.1, delay: 1.2 },
              { cx: 370, cy: 280, r: 0.7, delay: 0.6 },
              { cx: 150, cy: 370, r: 1, delay: 1.8 },
              { cx: 260, cy: 50, r: 1.3, delay: 0.4 },
              { cx: 100, cy: 140, r: 0.5, delay: 2 },
              { cx: 340, cy: 120, r: 0.8, delay: 1.1 },
            ].map((star, i) => (
              <circle key={i} cx={star.cx} cy={star.cy} r={star.r} fill="white">
                <animate
                  attributeName="opacity"
                  values="0.2;0.8;0.2"
                  dur={`${2 + star.delay}s`}
                  begin={`${star.delay}s`}
                  repeatCount="indefinite"
                />
              </circle>
            ))}
          </g>
        )}

        {/* Earth */}
        <circle cx="200" cy="200" r="80" fill="url(#earthGradient)" />
        <ellipse cx="200" cy="200" rx="80" ry="80" fill="url(#atmosphereGlow)" />

        {/* Earth surface details */}
        <path d="M150 180 Q170 160 200 170 Q220 175 240 165 Q255 180 250 200 Q240 210 220 205 Q200 200 180 210 Q160 205 150 190Z" fill="#22c55e" opacity="0.3" />
        <path d="M170 220 Q185 215 200 225 Q210 230 225 225 Q235 235 220 245 Q200 250 185 240 Q170 235 170 220Z" fill="#22c55e" opacity="0.25" />

        {/* Atmosphere glow ring */}
        <circle cx="200" cy="200" r="84" stroke="url(#atmosphereStroke)" strokeWidth="2" fill="none" opacity="0.5" />

        {/* Orbit path */}
        <ellipse cx="200" cy="200" rx="140" ry="50" stroke="white" strokeWidth="0.5" opacity="0.15" strokeDasharray="4 4" transform="rotate(-20 200 200)" />

        {/* Satellite on orbit */}
        {mounted && (
          <g transform="rotate(-20 200 200)">
            <g>
              <animateTransform
                attributeName="transform"
                type="rotate"
                from="0 200 200"
                to="360 200 200"
                dur="12s"
                repeatCount="indefinite"
              />
              <g transform="translate(340, 200)">
                {/* Satellite body */}
                <rect x="-6" y="-4" width="12" height="8" rx="1" fill="#1e293b" stroke="#06b6d4" strokeWidth="0.8" />
                {/* Solar panels */}
                <rect x="-20" y="-3" width="13" height="6" rx="0.5" fill="#0f172a" stroke="#06b6d4" strokeWidth="0.5" />
                <rect x="7" y="-3" width="13" height="6" rx="0.5" fill="#0f172a" stroke="#06b6d4" strokeWidth="0.5" />
                {/* Antenna */}
                <line x1="0" y1="-4" x2="0" y2="-8" stroke="#94a3b8" strokeWidth="0.5" />
                <circle cx="0" cy="-9" r="1.5" fill="none" stroke="#06b6d4" strokeWidth="0.5" />
                {/* Status light */}
                <circle cx="0" cy="0" r="1" fill="#06b6d4">
                  <animate attributeName="opacity" values="1;0.3;1" dur="1.5s" repeatCount="indefinite" />
                </circle>
              </g>
            </g>
          </g>
        )}

        {/* Second orbit (faded) */}
        <ellipse cx="200" cy="200" rx="120" ry="120" stroke="white" strokeWidth="0.3" opacity="0.08" strokeDasharray="2 6" />

        {/* Rocket (small, ascending) */}
        {mounted && (
          <g opacity="0.6">
            <animateTransform
              attributeName="transform"
              type="translate"
              values="0,0; -30,-60; -60,-120"
              dur="8s"
              repeatCount="indefinite"
            />
            <g transform="translate(100, 320) rotate(-45)">
              <path d="M0 0 L3 -12 L0 -16 L-3 -12 Z" fill="#94a3b8" />
              <path d="M-2 0 L-4 4 L0 2 L4 4 L2 0Z" fill="#f97316" opacity="0.8">
                <animate attributeName="opacity" values="0.5;1;0.5" dur="0.3s" repeatCount="indefinite" />
              </path>
            </g>
          </g>
        )}

        {/* Gradients */}
        <defs>
          <radialGradient id="earthGradient" cx="0.4" cy="0.4">
            <stop offset="0%" stopColor="#1e3a5f" />
            <stop offset="50%" stopColor="#0f2744" />
            <stop offset="100%" stopColor="#0a1929" />
          </radialGradient>
          <radialGradient id="atmosphereGlow" cx="0.5" cy="0.5">
            <stop offset="85%" stopColor="transparent" />
            <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.1" />
          </radialGradient>
          <radialGradient id="atmosphereStroke" cx="0.3" cy="0.3">
            <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.05" />
          </radialGradient>
        </defs>
      </svg>
    </div>
  );
}

/**
 * Smaller rocket icon for inline use.
 */
export function RocketIcon({ className = 'w-6 h-6' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 00-2.58 5.841m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448 14.9 14.9 0 01.06-.312m-2.24 2.39a4.493 4.493 0 00-1.757 4.306 4.493 4.493 0 004.306-1.758M16.5 9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
    </svg>
  );
}

/**
 * Satellite icon for inline use.
 */
export function SatelliteIcon({ className = 'w-6 h-6' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 3.75H6A2.25 2.25 0 003.75 6v1.5M16.5 3.75H18A2.25 2.25 0 0120.25 6v1.5m0 9V18A2.25 2.25 0 0118 20.25h-1.5m-9 0H6A2.25 2.25 0 013.75 18v-1.5M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}
