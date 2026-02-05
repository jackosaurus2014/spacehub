/**
 * Dashboard Layout Configuration
 * Allows users to customize their dashboard with preset layouts
 * and custom configurations saved to localStorage
 */

export type LayoutGridColumns = 1 | 2 | 3;
export type ModuleSize = 'compact' | 'standard' | 'expanded';

export interface DashboardSection {
  id: string;
  name: string;
  visible: boolean;
}

export interface LayoutPreset {
  id: string;
  name: string;
  description: string;
  icon: string;
  gridColumns: LayoutGridColumns;
  moduleSize: ModuleSize;
  sections: DashboardSection[];
  previewImageClass?: string;
}

export interface UserLayoutPreference {
  presetId: string | null;
  customConfig: {
    gridColumns: LayoutGridColumns;
    moduleSize: ModuleSize;
    sections: DashboardSection[];
  } | null;
  lastUpdated: string;
}

// Default sections available in the dashboard
export const DEFAULT_SECTIONS: DashboardSection[] = [
  { id: 'welcome', name: 'Welcome Header', visible: true },
  { id: 'quick-stats', name: 'Quick Stats', visible: true },
  { id: 'category-overview', name: 'Articles by Category', visible: true },
  { id: 'quick-actions', name: 'Quick Actions', visible: true },
  { id: 'coming-soon', name: 'Coming Soon', visible: true },
];

// Preset layouts for the dashboard
export const PRESET_LAYOUTS: LayoutPreset[] = [
  {
    id: 'compact',
    name: 'Compact',
    description: 'Maximizes information density with smaller cards and 3 columns',
    icon: '📱',
    gridColumns: 3,
    moduleSize: 'compact',
    sections: [
      { id: 'welcome', name: 'Welcome Header', visible: true },
      { id: 'quick-stats', name: 'Quick Stats', visible: true },
      { id: 'category-overview', name: 'Articles by Category', visible: true },
      { id: 'quick-actions', name: 'Quick Actions', visible: false },
      { id: 'coming-soon', name: 'Coming Soon', visible: false },
    ],
  },
  {
    id: 'detailed',
    name: 'Detailed',
    description: 'Full information view with expanded cards and 2 columns',
    icon: '📊',
    gridColumns: 2,
    moduleSize: 'expanded',
    sections: [
      { id: 'welcome', name: 'Welcome Header', visible: true },
      { id: 'quick-stats', name: 'Quick Stats', visible: true },
      { id: 'category-overview', name: 'Articles by Category', visible: true },
      { id: 'quick-actions', name: 'Quick Actions', visible: true },
      { id: 'coming-soon', name: 'Coming Soon', visible: true },
    ],
  },
  {
    id: 'focus-mode',
    name: 'Focus Mode',
    description: 'Minimalist view with single column and essential info only',
    icon: '🎯',
    gridColumns: 1,
    moduleSize: 'standard',
    sections: [
      { id: 'welcome', name: 'Welcome Header', visible: true },
      { id: 'quick-stats', name: 'Quick Stats', visible: true },
      { id: 'category-overview', name: 'Articles by Category', visible: true },
      { id: 'quick-actions', name: 'Quick Actions', visible: false },
      { id: 'coming-soon', name: 'Coming Soon', visible: false },
    ],
  },
];

const STORAGE_KEY = 'spacenexus-dashboard-layout';

/**
 * Get the user's layout preference from localStorage
 */
export function getLayoutPreference(): UserLayoutPreference | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return null;
    }
    return JSON.parse(stored) as UserLayoutPreference;
  } catch (error) {
    console.error('Failed to parse layout preference:', error);
    return null;
  }
}

/**
 * Save the user's layout preference to localStorage
 */
export function setLayoutPreference(preference: UserLayoutPreference): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    preference.lastUpdated = new Date().toISOString();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(preference));
  } catch (error) {
    console.error('Failed to save layout preference:', error);
  }
}

/**
 * Apply a preset layout
 */
export function applyPreset(presetId: string): UserLayoutPreference {
  const preset = PRESET_LAYOUTS.find(p => p.id === presetId);
  if (!preset) {
    throw new Error(`Preset "${presetId}" not found`);
  }

  const preference: UserLayoutPreference = {
    presetId: preset.id,
    customConfig: null,
    lastUpdated: new Date().toISOString(),
  };

  setLayoutPreference(preference);
  return preference;
}

/**
 * Apply a custom layout configuration
 */
export function applyCustomLayout(config: {
  gridColumns: LayoutGridColumns;
  moduleSize: ModuleSize;
  sections: DashboardSection[];
}): UserLayoutPreference {
  const preference: UserLayoutPreference = {
    presetId: null,
    customConfig: config,
    lastUpdated: new Date().toISOString(),
  };

  setLayoutPreference(preference);
  return preference;
}

/**
 * Get the effective layout configuration (preset or custom)
 */
export function getEffectiveLayout(): {
  gridColumns: LayoutGridColumns;
  moduleSize: ModuleSize;
  sections: DashboardSection[];
  isCustom: boolean;
  presetName?: string;
} {
  const preference = getLayoutPreference();

  // Default to detailed layout
  if (!preference) {
    const defaultPreset = PRESET_LAYOUTS.find(p => p.id === 'detailed')!;
    return {
      gridColumns: defaultPreset.gridColumns,
      moduleSize: defaultPreset.moduleSize,
      sections: defaultPreset.sections,
      isCustom: false,
      presetName: defaultPreset.name,
    };
  }

  // If using a preset
  if (preference.presetId) {
    const preset = PRESET_LAYOUTS.find(p => p.id === preference.presetId);
    if (preset) {
      return {
        gridColumns: preset.gridColumns,
        moduleSize: preset.moduleSize,
        sections: preset.sections,
        isCustom: false,
        presetName: preset.name,
      };
    }
  }

  // If using custom config
  if (preference.customConfig) {
    return {
      gridColumns: preference.customConfig.gridColumns,
      moduleSize: preference.customConfig.moduleSize,
      sections: preference.customConfig.sections,
      isCustom: true,
    };
  }

  // Fallback to detailed
  const defaultPreset = PRESET_LAYOUTS.find(p => p.id === 'detailed')!;
  return {
    gridColumns: defaultPreset.gridColumns,
    moduleSize: defaultPreset.moduleSize,
    sections: defaultPreset.sections,
    isCustom: false,
    presetName: defaultPreset.name,
  };
}

/**
 * Reset to default layout
 */
export function resetLayout(): void {
  if (typeof window === 'undefined') {
    return;
  }

  localStorage.removeItem(STORAGE_KEY);
}

/**
 * Get CSS class for grid columns
 */
export function getGridColumnsClass(columns: LayoutGridColumns): string {
  switch (columns) {
    case 1:
      return 'grid-cols-1';
    case 2:
      return 'grid-cols-1 md:grid-cols-2';
    case 3:
      return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3';
    default:
      return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3';
  }
}

/**
 * Get CSS classes for module size
 */
export function getModuleSizeClasses(size: ModuleSize): {
  padding: string;
  text: string;
  icon: string;
  gap: string;
} {
  switch (size) {
    case 'compact':
      return {
        padding: 'p-3',
        text: 'text-sm',
        icon: 'text-2xl',
        gap: 'gap-3',
      };
    case 'standard':
      return {
        padding: 'p-6',
        text: 'text-base',
        icon: 'text-4xl',
        gap: 'gap-6',
      };
    case 'expanded':
      return {
        padding: 'p-8',
        text: 'text-lg',
        icon: 'text-5xl',
        gap: 'gap-8',
      };
    default:
      return {
        padding: 'p-6',
        text: 'text-base',
        icon: 'text-4xl',
        gap: 'gap-6',
      };
  }
}

/**
 * Check if a section is visible
 */
export function isSectionVisible(sectionId: string, sections: DashboardSection[]): boolean {
  const section = sections.find(s => s.id === sectionId);
  return section?.visible ?? true;
}
