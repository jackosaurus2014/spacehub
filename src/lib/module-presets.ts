// ─── Persona-preset homepage module selection ────────────────────────────────
// Stores which of the homepage-renderable modules a user wants on their
// dashboard (ModuleContainer), optionally tied to a persona preset.
// Storage is localStorage; changes are broadcast via the existing
// 'module-config-changed' CustomEvent so ModuleContainer re-reads live.

import type { Persona } from '@/lib/user-preferences';

/**
 * The module ids that ModuleContainer can actually render — must stay in sync
 * with the MODULE_COMPONENTS map in src/components/modules/ModuleContainer.tsx.
 */
export const HOMEPAGE_MODULE_IDS: string[] = [
  'mission-control',
  'blogs-articles',
  'news-feed',
  'market-intel',
  'resource-exchange',
  'business-opportunities',
  'solar-exploration',
  'space-insurance',
  'launch-windows',
  'satellite-tracker',
  'regulatory-hub',
  'spectrum-management',
  'orbital-management',
];

/** Curated homepage module sets per persona, in display order. */
export const PERSONA_MODULE_PRESETS: Record<Persona, string[]> = {
  enthusiast: [
    'mission-control',
    'news-feed',
    'blogs-articles',
    'solar-exploration',
    'satellite-tracker',
    'launch-windows',
    'market-intel',
    'business-opportunities',
  ],
  professional: [
    'mission-control',
    'satellite-tracker',
    'launch-windows',
    'orbital-management',
    'regulatory-hub',
    'spectrum-management',
    'resource-exchange',
    'space-insurance',
    'news-feed',
  ],
  investor: [
    'mission-control',
    'market-intel',
    'business-opportunities',
    'blogs-articles',
    'news-feed',
    'space-insurance',
    'orbital-management',
    'solar-exploration',
  ],
};

export const PRESET_STORAGE_KEY = 'spacenexus-home-modules';

/** Reuse the event ModuleConfigurator already dispatches so all listeners stay unified. */
const MODULE_CONFIG_CHANGED_EVENT = 'module-config-changed';

interface StoredHomeModulePreset {
  v: 1;
  personaId: string | null;
  ids: string[];
}

export interface HomeModulePreset {
  personaId: string | null;
  ids: string[];
}

/**
 * Load the stored homepage module preset.
 * Returns null when unset or invalid (legacy behavior: show all modules).
 * Ids are filtered to the currently renderable HOMEPAGE_MODULE_IDS.
 */
export function loadHomeModulePreset(): HomeModulePreset | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(PRESET_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredHomeModulePreset;
    if (!parsed || parsed.v !== 1 || !Array.isArray(parsed.ids)) return null;
    const known = new Set(HOMEPAGE_MODULE_IDS);
    const ids = parsed.ids.filter(
      (id): id is string => typeof id === 'string' && known.has(id)
    );
    if (ids.length === 0) return null;
    const personaId = typeof parsed.personaId === 'string' ? parsed.personaId : null;
    return { personaId, ids };
  } catch {
    return null;
  }
}

/**
 * Persist the homepage module preset and notify listeners via the existing
 * 'module-config-changed' CustomEvent.
 */
export function saveHomeModulePreset(ids: string[], personaId: string | null): void {
  if (typeof window === 'undefined') return;
  try {
    const known = new Set(HOMEPAGE_MODULE_IDS);
    const payload: StoredHomeModulePreset = {
      v: 1,
      personaId,
      ids: ids.filter(id => known.has(id)),
    };
    localStorage.setItem(PRESET_STORAGE_KEY, JSON.stringify(payload));
    window.dispatchEvent(new CustomEvent(MODULE_CONFIG_CHANGED_EVENT));
  } catch {
    // quota exceeded — fail silently
  }
}
