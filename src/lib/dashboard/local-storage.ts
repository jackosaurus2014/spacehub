/**
 * LocalStorage fallback for dashboard layouts
 * Used when user is not logged in or on the free tier
 */

const STORAGE_KEY = 'spacenexus-dashboard-layouts';

export interface LocalWidget {
  id: string;
  moduleId: string;
  widgetType: string;
  title?: string;
  x: number;
  y: number;
  w: number;
  h: number;
  minW: number;
  minH: number;
  config?: Record<string, unknown>;
  order: number;
}

export interface LocalLayout {
  id: string;
  name: string;
  description?: string;
  isDefault: boolean;
  gridColumns: number;
  widgets: LocalWidget[];
  createdAt: string;
  updatedAt: string;
}

function generateId(): string {
  return `local-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Get all stored layouts from localStorage
 */
export function getLocalLayouts(): LocalLayout[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    return JSON.parse(stored) as LocalLayout[];
  } catch {
    return [];
  }
}

/**
 * Save layouts to localStorage
 */
function saveLocalLayouts(layouts: LocalLayout[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(layouts));
  } catch {
    // localStorage full or unavailable
  }
}

/**
 * Get the default layout, or first layout if no default
 */
export function getDefaultLocalLayout(): LocalLayout | null {
  const layouts = getLocalLayouts();
  if (layouts.length === 0) return null;
  return layouts.find((l) => l.isDefault) ?? layouts[0];
}

/**
 * Get a layout by ID
 */
export function getLocalLayout(id: string): LocalLayout | null {
  const layouts = getLocalLayouts();
  return layouts.find((l) => l.id === id) ?? null;
}

/**
 * Create a new layout (free tier: max 1 layout)
 */
export function createLocalLayout(
  name: string,
  description?: string,
  widgets?: Omit<LocalWidget, 'id'>[]
): LocalLayout | null {
  const layouts = getLocalLayouts();

  // Free tier limit: 1 layout
  if (layouts.length >= 1) {
    return null;
  }

  const now = new Date().toISOString();
  const newLayout: LocalLayout = {
    id: generateId(),
    name,
    description,
    isDefault: layouts.length === 0,
    gridColumns: 12,
    widgets: (widgets ?? []).map((w) => ({ ...w, id: generateId() })),
    createdAt: now,
    updatedAt: now,
  };

  layouts.push(newLayout);
  saveLocalLayouts(layouts);
  return newLayout;
}

/**
 * Update an existing layout
 */
export function updateLocalLayout(
  id: string,
  updates: Partial<Pick<LocalLayout, 'name' | 'description' | 'isDefault' | 'gridColumns' | 'widgets'>>
): LocalLayout | null {
  const layouts = getLocalLayouts();
  const index = layouts.findIndex((l) => l.id === id);
  if (index === -1) return null;

  // If setting as default, unset other defaults
  if (updates.isDefault) {
    layouts.forEach((l) => (l.isDefault = false));
  }

  layouts[index] = {
    ...layouts[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  saveLocalLayouts(layouts);
  return layouts[index];
}

/**
 * Delete a layout
 */
export function deleteLocalLayout(id: string): boolean {
  const layouts = getLocalLayouts();
  const filtered = layouts.filter((l) => l.id !== id);
  if (filtered.length === layouts.length) return false;

  // If we deleted the default, make the first one default
  if (filtered.length > 0 && !filtered.some((l) => l.isDefault)) {
    filtered[0].isDefault = true;
  }

  saveLocalLayouts(filtered);
  return true;
}

/**
 * Add a widget to a layout
 */
export function addWidgetToLocalLayout(
  layoutId: string,
  widget: Omit<LocalWidget, 'id'>
): LocalWidget | null {
  const layouts = getLocalLayouts();
  const layout = layouts.find((l) => l.id === layoutId);
  if (!layout) return null;

  const newWidget: LocalWidget = { ...widget, id: generateId() };
  layout.widgets.push(newWidget);
  layout.updatedAt = new Date().toISOString();

  saveLocalLayouts(layouts);
  return newWidget;
}

/**
 * Update a widget in a layout
 */
export function updateLocalWidget(
  layoutId: string,
  widgetId: string,
  updates: Partial<Omit<LocalWidget, 'id'>>
): LocalWidget | null {
  const layouts = getLocalLayouts();
  const layout = layouts.find((l) => l.id === layoutId);
  if (!layout) return null;

  const widgetIndex = layout.widgets.findIndex((w) => w.id === widgetId);
  if (widgetIndex === -1) return null;

  layout.widgets[widgetIndex] = { ...layout.widgets[widgetIndex], ...updates };
  layout.updatedAt = new Date().toISOString();

  saveLocalLayouts(layouts);
  return layout.widgets[widgetIndex];
}

/**
 * Remove a widget from a layout
 */
export function removeWidgetFromLocalLayout(layoutId: string, widgetId: string): boolean {
  const layouts = getLocalLayouts();
  const layout = layouts.find((l) => l.id === layoutId);
  if (!layout) return false;

  const before = layout.widgets.length;
  layout.widgets = layout.widgets.filter((w) => w.id !== widgetId);
  if (layout.widgets.length === before) return false;

  layout.updatedAt = new Date().toISOString();
  saveLocalLayouts(layouts);
  return true;
}
