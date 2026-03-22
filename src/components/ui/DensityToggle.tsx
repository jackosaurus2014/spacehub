'use client';

import { useState, useEffect } from 'react';
import { loadPreferences, setDensity } from '@/lib/user-preferences';
import type { Density } from '@/lib/user-preferences';

const DENSITY_OPTIONS: { value: Density; label: string; icon: string }[] = [
  { value: 'comfortable', label: 'Comfortable', icon: '░' },
  { value: 'standard', label: 'Standard', icon: '▒' },
  { value: 'compact', label: 'Compact', icon: '▓' },
];

/**
 * V3 Density Toggle — switches between comfortable/standard/compact density.
 * Place in navigation dropdown or settings panel.
 */
export default function DensityToggle() {
  const [current, setCurrent] = useState<Density>('standard');

  useEffect(() => {
    const prefs = loadPreferences();
    if (prefs?.density) {
      setCurrent(prefs.density);
      document.documentElement.setAttribute('data-density', prefs.density);
    }
  }, []);

  const handleChange = (density: Density) => {
    setCurrent(density);
    setDensity(density);
  };

  return (
    <div className="flex items-center gap-1">
      <span className="text-[10px] uppercase tracking-[0.1em] text-zinc-500 font-medium mr-1.5">Density</span>
      {DENSITY_OPTIONS.map((opt) => (
        <button
          key={opt.value}
          onClick={() => handleChange(opt.value)}
          className={`px-2 py-1 rounded text-[10px] font-medium transition-colors ${
            current === opt.value
              ? 'bg-indigo-500/15 text-indigo-400 border border-indigo-500/20'
              : 'text-zinc-500 hover:text-zinc-300 border border-transparent'
          }`}
          title={opt.label}
        >
          {opt.icon}
        </button>
      ))}
    </div>
  );
}
