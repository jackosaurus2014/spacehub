'use client';

import { useEffect, useRef } from 'react';

/**
 * Lightweight animated star field using CSS-only animations.
 * Three parallax layers of stars for depth effect.
 * Used as background decoration on feature pages and landing sections.
 */
export default function StarField({ density = 'normal', className = '' }: { density?: 'sparse' | 'normal' | 'dense'; className?: string }) {
  const counts = { sparse: 30, normal: 60, dense: 100 };
  const count = counts[density];

  return (
    <div className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`} aria-hidden="true">
      {/* Layer 1 — slow, large stars (far) */}
      <div className="absolute inset-0 animate-star-drift-slow">
        {Array.from({ length: Math.floor(count * 0.3) }).map((_, i) => {
          const seed = i * 7 + 1;
          const x = ((Math.sin(seed) * 10000) % 1 + 1) % 1 * 100;
          const y = ((Math.sin(seed * 3 + 5) * 10000) % 1 + 1) % 1 * 100;
          const size = 1.5 + ((Math.sin(seed * 11) * 10000) % 1 + 1) % 1 * 1.5;
          return (
            <div
              key={`s1-${i}`}
              className="absolute rounded-full bg-white/30"
              style={{ left: `${x}%`, top: `${y}%`, width: size, height: size }}
            />
          );
        })}
      </div>

      {/* Layer 2 — medium speed, medium stars */}
      <div className="absolute inset-0 animate-star-drift-medium">
        {Array.from({ length: Math.floor(count * 0.4) }).map((_, i) => {
          const seed = i * 13 + 3;
          const x = ((Math.sin(seed) * 10000) % 1 + 1) % 1 * 100;
          const y = ((Math.sin(seed * 7 + 2) * 10000) % 1 + 1) % 1 * 100;
          const size = 0.8 + ((Math.sin(seed * 17) * 10000) % 1 + 1) % 1;
          return (
            <div
              key={`s2-${i}`}
              className="absolute rounded-full bg-white/20"
              style={{ left: `${x}%`, top: `${y}%`, width: size, height: size }}
            />
          );
        })}
      </div>

      {/* Layer 3 — fast, small stars (near) */}
      <div className="absolute inset-0 animate-star-drift-fast">
        {Array.from({ length: Math.floor(count * 0.3) }).map((_, i) => {
          const seed = i * 19 + 7;
          const x = ((Math.sin(seed) * 10000) % 1 + 1) % 1 * 100;
          const y = ((Math.sin(seed * 11 + 4) * 10000) % 1 + 1) % 1 * 100;
          return (
            <div
              key={`s3-${i}`}
              className="absolute rounded-full bg-white/10"
              style={{ left: `${x}%`, top: `${y}%`, width: 0.5, height: 0.5 }}
            />
          );
        })}
      </div>

      <style jsx>{`
        @keyframes star-drift-slow {
          0% { transform: translateY(0); }
          100% { transform: translateY(-20px); }
        }
        @keyframes star-drift-medium {
          0% { transform: translateY(0); }
          100% { transform: translateY(-10px); }
        }
        @keyframes star-drift-fast {
          0% { transform: translateY(0); }
          100% { transform: translateY(-5px); }
        }
        .animate-star-drift-slow {
          animation: star-drift-slow 20s ease-in-out infinite alternate;
        }
        .animate-star-drift-medium {
          animation: star-drift-medium 15s ease-in-out infinite alternate;
        }
        .animate-star-drift-fast {
          animation: star-drift-fast 10s ease-in-out infinite alternate;
        }
      `}</style>
    </div>
  );
}
