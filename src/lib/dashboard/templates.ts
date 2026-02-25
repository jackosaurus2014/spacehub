/**
 * Role-based dashboard templates for SpaceNexus
 * Pre-configured dashboard views based on user persona
 */

export interface DashboardTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  persona: string;
  widgets: {
    id: string;
    type: string;
    title: string;
    size: 'small' | 'medium' | 'large';
    link?: string;
  }[];
}

export const DASHBOARD_TEMPLATES: DashboardTemplate[] = [
  {
    id: 'investor',
    name: 'Investor Dashboard',
    description: 'Track funding rounds, company valuations, and market trends',
    icon: '\u{1F4C8}',
    persona: 'investor',
    widgets: [
      { id: 'funding-trends', type: 'chart', title: 'Funding Trends', size: 'large', link: '/funding-tracker' },
      { id: 'top-companies', type: 'list', title: 'Top Companies by Valuation', size: 'medium', link: '/company-profiles' },
      { id: 'recent-deals', type: 'list', title: 'Recent Deals', size: 'medium', link: '/deals' },
      { id: 'market-sizing', type: 'chart', title: 'Market Size by Sector', size: 'large', link: '/market-sizing' },
      { id: 'news-feed', type: 'feed', title: 'Industry News', size: 'medium', link: '/news' },
      { id: 'watchlist', type: 'list', title: 'My Watchlist', size: 'small', link: '/my-watchlists' },
    ],
  },
  {
    id: 'operator',
    name: 'Operator Dashboard',
    description: 'Monitor launches, satellites, and mission operations',
    icon: '\u{1F6F0}\uFE0F',
    persona: 'operator',
    widgets: [
      { id: 'next-launches', type: 'list', title: 'Upcoming Launches', size: 'large', link: '/launch' },
      { id: 'space-weather', type: 'status', title: 'Space Weather', size: 'medium', link: '/space-environment' },
      { id: 'satellite-status', type: 'list', title: 'Satellite Constellation Status', size: 'medium', link: '/satellites' },
      { id: 'debris-alerts', type: 'alert', title: 'Debris Alerts', size: 'small', link: '/space-environment?tab=debris' },
      { id: 'regulatory-deadlines', type: 'list', title: 'Regulatory Deadlines', size: 'medium', link: '/regulatory-calendar' },
      { id: 'mission-tools', type: 'links', title: 'Mission Tools', size: 'small', link: '/tools' },
    ],
  },
  {
    id: 'supplier',
    name: 'Supplier Dashboard',
    description: 'Track procurement opportunities, RFQs, and contracts',
    icon: '\u{1F3ED}',
    persona: 'supplier',
    widgets: [
      { id: 'active-rfqs', type: 'list', title: 'Active RFQs', size: 'large', link: '/marketplace' },
      { id: 'procurement-awards', type: 'list', title: 'Recent Contract Awards', size: 'medium', link: '/procurement/awards' },
      { id: 'supply-chain', type: 'status', title: 'Supply Chain Status', size: 'medium', link: '/supply-chain' },
      { id: 'compliance-status', type: 'status', title: 'Compliance Status', size: 'small', link: '/compliance' },
      { id: 'competitor-activity', type: 'feed', title: 'Competitor Activity', size: 'medium', link: '/news' },
      { id: 'teaming', type: 'list', title: 'Teaming Opportunities', size: 'small', link: '/marketplace' },
    ],
  },
  {
    id: 'executive',
    name: 'Executive Dashboard',
    description: 'High-level market overview with key metrics and trends',
    icon: '\u{1F454}',
    persona: 'executive',
    widgets: [
      { id: 'market-overview', type: 'chart', title: 'Space Economy Overview', size: 'large', link: '/space-economy' },
      { id: 'top-news', type: 'feed', title: 'Top Headlines', size: 'medium', link: '/news' },
      { id: 'key-metrics', type: 'stats', title: 'Key Industry Metrics', size: 'medium', link: '/market-intel' },
      { id: 'executive-moves', type: 'list', title: 'Executive Moves', size: 'medium', link: '/executive-moves' },
      { id: 'events-calendar', type: 'list', title: 'Upcoming Events', size: 'small', link: '/space-events' },
      { id: 'ai-insights', type: 'feed', title: 'AI Insights', size: 'medium', link: '/ai-insights' },
    ],
  },
];

/** localStorage key for storing the active template selection */
export const TEMPLATE_STORAGE_KEY = 'spacenexus-dashboard-template';

/**
 * Get a template by its ID
 */
export function getTemplateById(id: string): DashboardTemplate | undefined {
  return DASHBOARD_TEMPLATES.find((t) => t.id === id);
}

/**
 * Save the selected template ID to localStorage
 */
export function saveSelectedTemplate(templateId: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(TEMPLATE_STORAGE_KEY, templateId);
  } catch {
    // localStorage unavailable
  }
}

/**
 * Get the currently selected template ID from localStorage
 */
export function getSelectedTemplateId(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(TEMPLATE_STORAGE_KEY);
  } catch {
    return null;
  }
}

/**
 * Get the currently selected template (resolved from localStorage)
 */
export function getSelectedTemplate(): DashboardTemplate | null {
  const id = getSelectedTemplateId();
  if (!id) return null;
  return getTemplateById(id) ?? null;
}

/**
 * Clear the selected template from localStorage
 */
export function clearSelectedTemplate(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(TEMPLATE_STORAGE_KEY);
  } catch {
    // localStorage unavailable
  }
}

/** Map widget type to a display icon */
export function getWidgetTypeIcon(type: string): string {
  const icons: Record<string, string> = {
    chart: '\u{1F4CA}',
    list: '\u{1F4CB}',
    feed: '\u{1F4F0}',
    status: '\u{1F7E2}',
    alert: '\u{1F6A8}',
    links: '\u{1F517}',
    stats: '\u{1F4C8}',
  };
  return icons[type] || '\u{1F4E6}';
}

/** Map widget size to a CSS-friendly label */
export function getWidgetSizeLabel(size: 'small' | 'medium' | 'large'): string {
  const labels: Record<string, string> = {
    small: 'Compact',
    medium: 'Standard',
    large: 'Wide',
  };
  return labels[size] || size;
}
