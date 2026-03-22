// ─── V3: User Preferences System ──────────────────────────────────────────
// Stored in localStorage, synced to server for logged-in users.
// Controls persona, density, sidebar modules, and per-module layouts.

export type Persona = 'enthusiast' | 'professional' | 'investor';
export type Density = 'comfortable' | 'standard' | 'compact';

export interface PanelConfig {
  id: string;
  visible: boolean;
  collapsed: boolean;
  order: number;
}

export interface ModuleLayout {
  panels: PanelConfig[];
}

export interface UserPreferences {
  persona: Persona;
  density: Density;
  sidebarModules: string[];
  sidebarExpanded: boolean;
  moduleLayouts: Record<string, ModuleLayout>;
  version: number;
}

const STORAGE_KEY = 'spacenexus_prefs';
const CURRENT_VERSION = 1;

/** Default sidebar modules per persona */
const PERSONA_SIDEBAR_DEFAULTS: Record<Persona, string[]> = {
  enthusiast: [
    '/mission-control', '/space-tycoon', '/launch-manifest', '/news',
    '/podcasts', '/blog', '/night-sky-guide', '/space-weather',
  ],
  professional: [
    '/mission-control', '/satellites', '/launch-manifest', '/compliance',
    '/space-weather', '/tools', '/workforce-analytics', '/space-tycoon',
  ],
  investor: [
    '/mission-control', '/market-intel', '/company-profiles', '/funding-tracker',
    '/startup-directory', '/deal-rooms', '/investment-thesis', '/space-tycoon',
  ],
};

/** Default density per persona */
const PERSONA_DENSITY_DEFAULTS: Record<Persona, Density> = {
  enthusiast: 'comfortable',
  professional: 'standard',
  investor: 'standard',
};

export function getDefaultPreferences(persona: Persona = 'enthusiast'): UserPreferences {
  return {
    persona,
    density: PERSONA_DENSITY_DEFAULTS[persona],
    sidebarModules: PERSONA_SIDEBAR_DEFAULTS[persona],
    sidebarExpanded: false,
    moduleLayouts: {},
    version: CURRENT_VERSION,
  };
}

export function loadPreferences(): UserPreferences | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as UserPreferences;
    if (parsed.version !== CURRENT_VERSION) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function savePreferences(prefs: UserPreferences): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
    // Apply density to document for CSS custom property overrides
    document.documentElement.setAttribute('data-density', prefs.density);
  } catch { /* quota exceeded — fail silently */ }
}

export function setPersona(persona: Persona): UserPreferences {
  const existing = loadPreferences();
  const prefs = existing || getDefaultPreferences(persona);
  prefs.persona = persona;
  prefs.density = PERSONA_DENSITY_DEFAULTS[persona];
  prefs.sidebarModules = PERSONA_SIDEBAR_DEFAULTS[persona];
  savePreferences(prefs);
  return prefs;
}

export function setDensity(density: Density): void {
  const prefs = loadPreferences() || getDefaultPreferences();
  prefs.density = density;
  savePreferences(prefs);
}

export function getModuleLayout(moduleId: string): ModuleLayout | null {
  const prefs = loadPreferences();
  return prefs?.moduleLayouts[moduleId] || null;
}

export function saveModuleLayout(moduleId: string, layout: ModuleLayout): void {
  const prefs = loadPreferences() || getDefaultPreferences();
  prefs.moduleLayouts[moduleId] = layout;
  savePreferences(prefs);
}
