'use client';

import { useState, useEffect, useCallback } from 'react';
import { AVAILABLE_MODULES } from '@/types';
import type { Persona } from '@/lib/user-preferences';
import {
  HOMEPAGE_MODULE_IDS,
  PERSONA_MODULE_PRESETS,
  loadHomeModulePreset,
  saveHomeModulePreset,
} from '@/lib/module-presets';

interface HomeModulePickerProps {
  isOpen: boolean;
  onClose: () => void;
}

const PERSONA_LABELS: Record<Persona, string> = {
  enthusiast: 'Enthusiast',
  professional: 'Professional',
  investor: 'Investor',
  jobseeker: 'Job Seeker & Talent',
};

function isKnownPersona(id: string | null): id is Persona {
  return id === 'enthusiast' || id === 'professional' || id === 'investor' || id === 'jobseeker';
}

function arraysEqual(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((v, i) => v === b[i]);
}

/**
 * Modal picker for which modules appear on the homepage dashboard.
 * Seeded from the stored persona preset (or all renderable modules when unset).
 * Saving persists via saveHomeModulePreset, which broadcasts
 * 'module-config-changed' so ModuleContainer updates live.
 */
export default function HomeModulePicker({ isOpen, onClose }: HomeModulePickerProps) {
  // Ordered list of selected module ids — order is preserved into the saved preset.
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [personaId, setPersonaId] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  // Seed from the current preset (or all 13) each time the modal opens
  useEffect(() => {
    if (isOpen) {
      const preset = loadHomeModulePreset();
      setSelectedIds(preset ? [...preset.ids] : [...HOMEPAGE_MODULE_IDS]);
      setPersonaId(preset?.personaId ?? null);
      setHasChanges(false);
    }
  }, [isOpen]);

  // Escape key handler + body scroll lock (matches ModuleConfigurator shell)
  const handleEscape = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    },
    [onClose]
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, handleEscape]);

  const toggleModule = (moduleId: string) => {
    setSelectedIds(prev =>
      prev.includes(moduleId)
        ? prev.filter(id => id !== moduleId)
        : [...prev, moduleId]
    );
    setHasChanges(true);
  };

  const handleSelectAll = () => {
    setSelectedIds([...HOMEPAGE_MODULE_IDS]);
    setHasChanges(true);
  };

  const handleResetToPersona = () => {
    if (!isKnownPersona(personaId)) return;
    setSelectedIds([...PERSONA_MODULE_PRESETS[personaId]]);
    setHasChanges(true);
  };

  const handleSave = () => {
    if (selectedIds.length === 0) return;
    // Keep the persona tag only if the selection still matches that persona's preset
    const keepPersona =
      isKnownPersona(personaId) && arraysEqual(selectedIds, PERSONA_MODULE_PRESETS[personaId])
        ? personaId
        : null;
    saveHomeModulePreset(selectedIds, keepPersona);
    setHasChanges(false);
    onClose();
  };

  if (!isOpen) return null;

  const modules = HOMEPAGE_MODULE_IDS
    .map(id => AVAILABLE_MODULES.find(m => m.moduleId === id))
    .filter((m): m is NonNullable<typeof m> => m !== undefined);

  const canResetToPersona = isKnownPersona(personaId);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Customize homepage modules"
        className="relative w-full max-w-2xl max-h-[90vh] overflow-hidden bg-[#0a0a0a]/95 backdrop-blur-xl border border-white/[0.06] rounded-2xl shadow-2xl shadow-black/50 animate-scale-in"
      >
        {/* Top gradient accent */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/[0.06]">
          <div>
            <h2 className="text-xl font-display font-bold text-white flex items-center gap-2">
              <svg className="w-5 h-5 text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
              Customize Homepage
            </h2>
            <p className="text-star-300 text-sm mt-1">
              {selectedIds.length} of {modules.length} modules shown
              {canResetToPersona && ` · ${PERSONA_LABELS[personaId]} preset`}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close homepage module picker"
            className="text-star-300 hover:text-white transition-colors p-2 hover:bg-white/[0.06] rounded-lg min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Instruction bar */}
        <div className="px-6 py-3 bg-white/[0.04] border-b border-white/[0.04] flex items-center gap-2 text-xs text-star-300">
          <svg className="w-4 h-4 text-white/70 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>Choose which modules appear on your homepage dashboard. At least one must stay selected.</span>
        </div>

        {/* Content: checkbox grid */}
        <div className="overflow-y-auto max-h-[calc(90vh-250px)] p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {modules.map(mod => {
              const checked = selectedIds.includes(mod.moduleId);
              const inputId = `home-module-${mod.moduleId}`;
              return (
                <label
                  key={mod.moduleId}
                  htmlFor={inputId}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border cursor-pointer transition-all ${
                    checked
                      ? 'bg-white/[0.04] border-white/[0.1] hover:border-white/[0.15]'
                      : 'bg-black/40 border-white/[0.03] opacity-60 hover:opacity-80'
                  }`}
                >
                  <input
                    id={inputId}
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleModule(mod.moduleId)}
                    className="w-4 h-4 rounded border-white/20 bg-white/[0.06] accent-white flex-shrink-0"
                  />
                  <span className="text-lg flex-shrink-0 w-7 text-center" aria-hidden="true">
                    {mod.icon}
                  </span>
                  <span className={`text-sm font-medium truncate ${checked ? 'text-white' : 'text-star-300'}`}>
                    {mod.name}
                  </span>
                </label>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-white/[0.06] bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <button
              onClick={handleSelectAll}
              className="text-star-300 hover:text-white text-sm transition-colors"
            >
              Select all
            </button>
            {canResetToPersona && (
              <button
                onClick={handleResetToPersona}
                className="text-star-300 hover:text-white text-sm transition-colors"
              >
                Reset to {PERSONA_LABELS[personaId]}
              </button>
            )}
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-star-300 hover:text-white border border-white/[0.06] rounded-lg hover:border-white/[0.1] transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!hasChanges || selectedIds.length === 0}
              className="px-6 py-2 text-sm font-medium text-black bg-gradient-to-r from-white to-white/80 rounded-lg hover:from-white hover:to-white/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-white/5"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
