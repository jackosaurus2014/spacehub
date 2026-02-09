'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  AVAILABLE_MODULES,
  PARENT_MODULES,
  getChildModules,
  MODULE_SECTIONS,
  type ModuleConfig,
  type ModuleSection,
} from '@/types';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ModuleConfigState {
  moduleId: string;
  enabled: boolean;
  position: number;
}

// ─── Constants ───────────────────────────────────────────────────────────────

export const MODULE_CONFIG_STORAGE_KEY = 'spacenexus-module-config';
export const MODULE_CONFIG_CHANGED_EVENT = 'module-config-changed';

// ─── Helpers (exported for sidebar use) ──────────────────────────────────────

/** Build default config from AVAILABLE_MODULES definitions */
export function getDefaultConfig(): ModuleConfigState[] {
  return PARENT_MODULES.map((m, index) => ({
    moduleId: m.moduleId,
    enabled: m.defaultEnabled,
    position: index,
  }));
}

/** Load config from localStorage, falling back to defaults */
export function loadModuleConfig(): ModuleConfigState[] {
  if (typeof window === 'undefined') return getDefaultConfig();

  try {
    const stored = localStorage.getItem(MODULE_CONFIG_STORAGE_KEY);
    if (stored) {
      const parsed: ModuleConfigState[] = JSON.parse(stored);
      // Validate structure and reconcile with current module list
      const knownIds = new Set(PARENT_MODULES.map(m => m.moduleId));
      const storedIds = new Set(parsed.map(c => c.moduleId));

      // Keep stored entries that still exist
      const reconciled = parsed.filter(c => knownIds.has(c.moduleId));

      // Add any new modules that weren't in stored config
      let maxPosition = reconciled.length > 0
        ? Math.max(...reconciled.map(c => c.position))
        : -1;

      for (const m of PARENT_MODULES) {
        if (!storedIds.has(m.moduleId)) {
          maxPosition++;
          reconciled.push({
            moduleId: m.moduleId,
            enabled: m.defaultEnabled,
            position: maxPosition,
          });
        }
      }

      return reconciled.sort((a, b) => a.position - b.position);
    }
  } catch {
    // fall through to defaults
  }

  return getDefaultConfig();
}

/** Save config to localStorage and dispatch event */
export function saveModuleConfig(config: ModuleConfigState[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(MODULE_CONFIG_STORAGE_KEY, JSON.stringify(config));
  window.dispatchEvent(new CustomEvent(MODULE_CONFIG_CHANGED_EVENT));
}

/** Get ordered, enabled parent modules (for sidebar consumption) */
export function getEnabledModules(): ModuleConfig[] {
  const config = loadModuleConfig();
  const enabledConfigs = config.filter(c => c.enabled).sort((a, b) => a.position - b.position);
  return enabledConfigs
    .map(c => PARENT_MODULES.find(m => m.moduleId === c.moduleId))
    .filter((m): m is ModuleConfig => m !== undefined);
}

/** Get full ordered list of parent modules with enabled state */
export function getOrderedModulesWithState(): (ModuleConfig & { enabled: boolean; position: number })[] {
  const config = loadModuleConfig();
  return config
    .sort((a, b) => a.position - b.position)
    .map(c => {
      const mod = PARENT_MODULES.find(m => m.moduleId === c.moduleId);
      if (!mod) return null;
      return { ...mod, enabled: c.enabled, position: c.position };
    })
    .filter((m): m is ModuleConfig & { enabled: boolean; position: number } => m !== null);
}

// ─── Component Props ─────────────────────────────────────────────────────────

interface ModuleConfiguratorProps {
  isOpen: boolean;
  onClose: () => void;
}

// ─── Section icon map ────────────────────────────────────────────────────────

const SECTION_ICONS: Record<ModuleSection, string> = {
  explore: '🔭',
  intelligence: '🧠',
  business: '💼',
  tools: '🛠️',
  data: '📊',
};

// ─── Component ───────────────────────────────────────────────────────────────

export default function ModuleConfigurator({ isOpen, onClose }: ModuleConfiguratorProps) {
  const [config, setConfig] = useState<ModuleConfigState[]>([]);
  const [hasChanges, setHasChanges] = useState(false);

  // Load on open
  useEffect(() => {
    if (isOpen) {
      setConfig(loadModuleConfig());
      setHasChanges(false);
    }
  }, [isOpen]);

  // Escape key handler
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

  // ─── Actions ─────────────────────────────────────────────────────────────

  const toggleModule = (moduleId: string) => {
    setConfig(prev => {
      const updated = prev.map(c =>
        c.moduleId === moduleId ? { ...c, enabled: !c.enabled } : c
      );
      return updated;
    });
    setHasChanges(true);
  };

  const moveModule = (moduleId: string, direction: 'up' | 'down') => {
    setConfig(prev => {
      const sorted = [...prev].sort((a, b) => a.position - b.position);
      const index = sorted.findIndex(c => c.moduleId === moduleId);
      if (index < 0) return prev;

      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= sorted.length) return prev;

      // Swap positions
      const temp = sorted[index].position;
      sorted[index] = { ...sorted[index], position: sorted[targetIndex].position };
      sorted[targetIndex] = { ...sorted[targetIndex], position: temp };

      return sorted.sort((a, b) => a.position - b.position);
    });
    setHasChanges(true);
  };

  const handleSave = () => {
    // Normalize positions to be sequential
    const normalized = config
      .sort((a, b) => a.position - b.position)
      .map((c, i) => ({ ...c, position: i }));

    saveModuleConfig(normalized);
    setConfig(normalized);
    setHasChanges(false);
    onClose();
  };

  const handleReset = () => {
    const defaults = getDefaultConfig();
    setConfig(defaults);
    setHasChanges(true);
  };

  if (!isOpen) return null;

  // Build sorted list with module definitions
  const sortedConfig = [...config].sort((a, b) => a.position - b.position);

  // Group by section for display
  const groupedModules: { section: ModuleSection; label: string; modules: (ModuleConfigState & { def: ModuleConfig })[] }[] = [];

  // First, build flat ordered list
  const orderedWithDefs = sortedConfig
    .map(c => {
      const def = PARENT_MODULES.find(m => m.moduleId === c.moduleId);
      if (!def) return null;
      return { ...c, def };
    })
    .filter((m): m is ModuleConfigState & { def: ModuleConfig } => m !== null);

  // Group by section
  for (const sec of MODULE_SECTIONS) {
    const sectionModules = orderedWithDefs.filter(m => m.def.section === sec.value);
    if (sectionModules.length > 0) {
      groupedModules.push({
        section: sec.value,
        label: sec.label,
        modules: sectionModules,
      });
    }
  }

  const enabledCount = config.filter(c => c.enabled).length;
  const totalCount = config.length;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-space-950/80 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-hidden bg-space-900/95 backdrop-blur-xl border border-space-600/50 rounded-2xl shadow-2xl shadow-space-950/50 animate-scale-in">
        {/* Top gradient accent */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-plasma-400/60 to-transparent" />

        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-space-600/50">
          <div>
            <h2 className="text-xl font-display font-bold text-white flex items-center gap-2">
              <svg className="w-5 h-5 text-plasma-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Configure Modules
            </h2>
            <p className="text-star-300 text-sm mt-1">
              {enabledCount} of {totalCount} modules enabled
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-star-300 hover:text-white transition-colors p-2 hover:bg-space-700/50 rounded-lg"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Instruction bar */}
        <div className="px-6 py-3 bg-space-800/50 border-b border-space-600/30 flex items-center gap-2 text-xs text-star-300">
          <svg className="w-4 h-4 text-plasma-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>Toggle modules on/off and use arrows to reorder. Changes update the sidebar.</span>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-230px)] p-4">
          {groupedModules.map((group) => (
            <div key={group.section} className="mb-5 last:mb-0">
              {/* Section header */}
              <div className="flex items-center gap-2 mb-2 px-2">
                <span className="text-base">{SECTION_ICONS[group.section]}</span>
                <h3 className="text-xs uppercase tracking-widest text-plasma-400/80 font-semibold">
                  {group.label}
                </h3>
                <div className="flex-1 h-px bg-space-600/30" />
              </div>

              {/* Module rows */}
              <div className="space-y-1">
                {group.modules.map((mod) => {
                  const globalIndex = sortedConfig.findIndex(c => c.moduleId === mod.moduleId);
                  const isFirst = globalIndex === 0;
                  const isLast = globalIndex === sortedConfig.length - 1;
                  const children = mod.def.isParent ? getChildModules(mod.moduleId) : [];

                  return (
                    <div key={mod.moduleId}>
                      <div
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-all ${
                          mod.enabled
                            ? 'bg-space-800/60 border-space-600/40 hover:border-plasma-400/30'
                            : 'bg-space-900/40 border-space-700/20 opacity-60'
                        }`}
                      >
                        {/* Icon */}
                        <span className="text-lg flex-shrink-0 w-7 text-center">
                          {mod.def.icon}
                        </span>

                        {/* Name & description */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={`text-sm font-medium ${mod.enabled ? 'text-white' : 'text-star-300'}`}>
                              {mod.def.name}
                            </span>
                            {mod.def.isPremium && (
                              <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-plasma-500/20 text-plasma-400 border border-plasma-500/30">
                                PRO
                              </span>
                            )}
                            {mod.def.isParent && children.length > 0 && (
                              <span className="text-[10px] text-star-400">
                                ({children.filter(c => c.defaultEnabled).length} sub-modules)
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-star-400 truncate mt-0.5">
                            {mod.def.description}
                          </p>
                        </div>

                        {/* Reorder arrows */}
                        <div className="flex flex-col gap-0.5 flex-shrink-0">
                          <button
                            onClick={() => moveModule(mod.moduleId, 'up')}
                            disabled={isFirst}
                            className={`p-1 rounded transition-colors ${
                              isFirst
                                ? 'text-space-600 cursor-not-allowed'
                                : 'text-star-300 hover:text-plasma-400 hover:bg-space-700/50'
                            }`}
                            aria-label={`Move ${mod.def.name} up`}
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                            </svg>
                          </button>
                          <button
                            onClick={() => moveModule(mod.moduleId, 'down')}
                            disabled={isLast}
                            className={`p-1 rounded transition-colors ${
                              isLast
                                ? 'text-space-600 cursor-not-allowed'
                                : 'text-star-300 hover:text-plasma-400 hover:bg-space-700/50'
                            }`}
                            aria-label={`Move ${mod.def.name} down`}
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </button>
                        </div>

                        {/* Toggle switch */}
                        <button
                          onClick={() => toggleModule(mod.moduleId)}
                          className="relative flex-shrink-0 overflow-hidden rounded-full"
                          aria-label={`${mod.enabled ? 'Disable' : 'Enable'} ${mod.def.name}`}
                        >
                          <div
                            className={`w-10 h-5 rounded-full transition-colors duration-200 ${
                              mod.enabled ? 'bg-plasma-500' : 'bg-space-600'
                            }`}
                          />
                          <div
                            className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform duration-200 ${
                              mod.enabled ? 'translate-x-5' : 'translate-x-0'
                            }`}
                          />
                        </button>
                      </div>

                      {/* Show children preview when parent is expanded */}
                      {mod.enabled && mod.def.isParent && children.length > 0 && (
                        <div className="ml-10 pl-3 border-l border-space-600/30 mt-1 mb-2 space-y-0.5">
                          {children.filter(c => c.defaultEnabled).map(child => (
                            <div
                              key={child.moduleId}
                              className="flex items-center gap-2 px-2 py-1.5 text-xs text-star-400"
                            >
                              <span className="text-sm w-5 text-center">{child.icon}</span>
                              <span>{child.name}</span>
                              {child.isPremium && (
                                <span className="text-[8px] font-semibold px-1 py-0.5 rounded bg-plasma-500/15 text-plasma-400/70 border border-plasma-500/20">
                                  PRO
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-space-600/50 bg-space-800/30">
          <button
            onClick={handleReset}
            className="text-star-300 hover:text-white text-sm transition-colors flex items-center gap-1.5"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Reset to Defaults
          </button>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-star-300 hover:text-white border border-space-600/50 rounded-lg hover:border-space-500 transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!hasChanges}
              className="px-6 py-2 text-sm font-medium text-space-900 bg-gradient-to-r from-plasma-400 to-plasma-500 rounded-lg hover:from-plasma-300 hover:to-plasma-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-plasma-500/20"
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
