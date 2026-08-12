'use client';

import { useState, useEffect } from 'react';
import { loadPreferences, setPersona, getDefaultPreferences, savePreferences } from '@/lib/user-preferences';
import type { Persona } from '@/lib/user-preferences';
import { HOMEPAGE_MODULE_IDS, PERSONA_MODULE_PRESETS, saveHomeModulePreset } from '@/lib/module-presets';

const PERSONAS = [
  {
    id: 'enthusiast' as Persona,
    icon: '🔭',
    label: 'Enthusiast',
    description: 'Launches, news, podcasts, and Space Tycoon',
    features: ['Launch countdowns', 'Space weather', 'Game access', 'Night sky guide'],
  },
  {
    id: 'professional' as Persona,
    icon: '📊',
    label: 'Professional',
    description: 'Data tools, compliance, engineering calculators',
    features: ['Satellite tracking', 'Regulatory hub', 'Engineering tools', 'Workforce analytics'],
  },
  {
    id: 'investor' as Persona,
    icon: '💰',
    label: 'Investor & Founder',
    description: 'Funding, deal flow, market intelligence',
    features: ['Funding tracker', 'Company profiles', 'Deal rooms', 'Deal flow database'],
  },
];

/**
 * V3 Persona Picker — shown on first visit to customize the experience.
 * After selection, saves to localStorage and adjusts sidebar + homepage order.
 */
export default function PersonaPicker() {
  const [hasPersona, setHasPersona] = useState(true); // Assume yes to prevent flash
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  useEffect(() => {
    const prefs = loadPreferences();
    if (!prefs) {
      setHasPersona(false);
    }
  }, []);

  const handleSelect = (persona: Persona) => {
    setPersona(persona);
    // Curate the homepage dashboard to this persona's module preset
    saveHomeModulePreset(PERSONA_MODULE_PRESETS[persona], persona);
    setHasPersona(true);
    // Optionally reload to apply persona-based sidebar
    window.location.reload();
  };

  const handleSkip = () => {
    // Record a neutral preference record so the picker doesn't re-prompt,
    // and keep the legacy show-everything homepage (all modules, no persona).
    savePreferences(getDefaultPreferences('enthusiast'));
    saveHomeModulePreset(HOMEPAGE_MODULE_IDS, null);
    setHasPersona(true);
    window.location.reload();
  };

  if (hasPersona) return null;

  return (
    <section className="py-16 relative z-10">
      <div className="container mx-auto px-4 max-w-3xl">
        <div className="card-terminal">
          {/* Terminal chrome */}
          <div className="card-terminal__header">
            <div className="flex items-center gap-2">
              <div className="card-terminal__dots">
                <div className="card-terminal__dot card-terminal__dot--red" />
                <div className="card-terminal__dot card-terminal__dot--amber" />
                <div className="card-terminal__dot card-terminal__dot--green" />
              </div>
              <span className="card-terminal__path">spacenexus:~/welcome</span>
            </div>
          </div>

          <div className="p-6 md:p-8">
            <div className="text-center mb-8">
              <h2 className="text-display text-xl md:text-2xl mb-2">How do you use space?</h2>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                Choose your path to customize your experience. You can change this anytime.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {PERSONAS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => handleSelect(p.id)}
                  onMouseEnter={() => setHoveredId(p.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  className="text-left p-5 rounded-lg border transition-all duration-150"
                  style={{
                    background: hoveredId === p.id ? 'var(--bg-hover)' : 'var(--bg-elevated)',
                    borderColor: hoveredId === p.id ? 'var(--accent-primary)' : 'var(--border-subtle)',
                  }}
                >
                  <span className="text-2xl block mb-2">{p.icon}</span>
                  <h3 className="text-sm font-bold mb-1" style={{ color: 'var(--text-primary)' }}>{p.label}</h3>
                  <p className="text-xs mb-3" style={{ color: 'var(--text-tertiary)' }}>{p.description}</p>
                  <ul className="space-y-1">
                    {p.features.map((f) => (
                      <li key={f} className="flex items-center gap-1.5 text-[10px]" style={{ color: 'var(--text-secondary)' }}>
                        <span style={{ color: '#56F000' }}>&#10003;</span>
                        {f}
                      </li>
                    ))}
                  </ul>
                </button>
              ))}
            </div>

            <div className="text-center mt-4">
              <button
                onClick={handleSkip}
                className="text-xs underline-offset-2 hover:underline transition-colors"
                style={{ color: 'var(--text-muted)' }}
              >
                Skip — show me everything
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
