/**
 * Client-side data export utilities for SpaceNexus.
 *
 * Supports CSV and JSON export with proper escaping, browser download
 * triggers, and domain-specific data formatters (companies, launches,
 * satellites). Inspired by PitchBook-style data export workflows.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ExportOptions {
  /** Subset of keys to include (in order). Defaults to all keys from first row. */
  columns?: string[];
  /** Map of raw key -> human-readable header label. */
  headers?: Record<string, string>;
  /** strftime-style hint (unused currently; reserved for future formatters). */
  dateFormat?: string;
}

export interface CompanyExport {
  name: string;
  sector: string;
  headquarters: string;
  foundedYear: number | null;
  employeeCount: number | null;
  totalFunding: string | null;
  status: string;
  website: string | null;
  ticker: string | null;
  marketCap: string | null;
}

export interface LaunchExport {
  name: string;
  provider: string;
  vehicle: string;
  date: string;
  status: string;
  orbit: string;
  payload: string;
  site: string;
}

export interface SatelliteExport {
  name: string;
  operator: string;
  orbitType: string;
  status: string;
  launchDate: string;
  missionType: string;
  constellation: string | null;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function escapeCSV(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n') || value.includes('\r')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function formatCSVValue(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.join('; ');
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getNestedValue(obj: any, path: string): unknown {
  return path.split('.').reduce((acc: unknown, key) => {
    if (acc && typeof acc === 'object') return (acc as Record<string, unknown>)[key];
    return undefined;
  }, obj);
}

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function humanize(key: string): string {
  return key
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

// ---------------------------------------------------------------------------
// Core export functions
// ---------------------------------------------------------------------------

/**
 * Convert an array of objects to CSV and trigger a browser download.
 *
 * Handles commas, quotes, and newlines inside values via RFC 4180 escaping.
 */
export function exportToCSV(
  data: Record<string, unknown>[],
  filename: string,
  options?: ExportOptions,
): void {
  if (data.length === 0) return;

  const keys = options?.columns ?? Object.keys(data[0]);
  const headerMap = options?.headers ?? {};

  const headerRow = keys.map((k) => escapeCSV(headerMap[k] ?? humanize(k))).join(',');

  const rows = data.map((row) =>
    keys.map((k) => escapeCSV(formatCSVValue(getNestedValue(row, k)))).join(','),
  );

  const csv = [headerRow, ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const safeName = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  triggerDownload(blob, safeName);
}

/**
 * Download arbitrary data as a JSON file.
 */
export function exportToJSON(
  data: unknown,
  filename: string,
  options?: { pretty?: boolean },
): void {
  const pretty = options?.pretty ?? true;
  const json = pretty ? JSON.stringify(data, null, 2) : JSON.stringify(data);
  const blob = new Blob([json], { type: 'application/json' });
  const safeName = filename.endsWith('.json') ? filename : `${filename}.json`;
  triggerDownload(blob, safeName);
}

/**
 * Consistent date formatting for export files.
 *
 * Returns YYYY-MM-DD format. Invalid inputs return an empty string.
 */
export function formatExportDate(date: string | Date): string {
  try {
    const d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime())) return '';
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  } catch {
    return '';
  }
}

// ---------------------------------------------------------------------------
// Domain-specific data preparers
// ---------------------------------------------------------------------------

/**
 * Format company data for export with clean, human-readable column names.
 */
export function prepareCompanyExport(companies: CompanyExport[]): Record<string, unknown>[] {
  return companies.map((c) => ({
    'Company Name': c.name,
    'Sector': c.sector,
    'Headquarters': c.headquarters,
    'Founded Year': c.foundedYear ?? '',
    'Employee Count': c.employeeCount ?? '',
    'Total Funding': c.totalFunding ?? '',
    'Status': c.status,
    'Website': c.website ?? '',
    'Ticker': c.ticker ?? '',
    'Market Cap': c.marketCap ?? '',
  }));
}

/**
 * Format launch data for export with clean column names.
 */
export function prepareLaunchExport(launches: LaunchExport[]): Record<string, unknown>[] {
  return launches.map((l) => ({
    'Mission Name': l.name,
    'Provider': l.provider,
    'Vehicle': l.vehicle,
    'Date': formatExportDate(l.date),
    'Status': l.status,
    'Orbit': l.orbit,
    'Payload': l.payload,
    'Launch Site': l.site,
  }));
}

/**
 * Format satellite data for export with clean column names.
 */
export function prepareSatelliteExport(satellites: SatelliteExport[]): Record<string, unknown>[] {
  return satellites.map((s) => ({
    'Satellite Name': s.name,
    'Operator': s.operator,
    'Orbit Type': s.orbitType,
    'Status': s.status,
    'Launch Date': formatExportDate(s.launchDate),
    'Mission Type': s.missionType,
    'Constellation': s.constellation ?? '',
  }));
}

// ---------------------------------------------------------------------------
// Backward-compatible aliases
// ---------------------------------------------------------------------------

/**
 * @deprecated Use `exportToJSON` instead. Kept for backward compatibility.
 */
export function downloadJSON<T>(data: T[], filename: string): void {
  exportToJSON(data, filename);
}

/**
 * @deprecated Use `exportToCSV` instead. Kept for backward compatibility.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function downloadCSV(
  data: any[],
  filename: string,
  columns?: { key: string; label: string }[],
): void {
  if (data.length === 0) return;

  const opts: ExportOptions | undefined = columns
    ? {
        columns: columns.map((c) => c.key),
        headers: Object.fromEntries(columns.map((c) => [c.key, c.label])),
      }
    : undefined;

  exportToCSV(data as Record<string, unknown>[], filename, opts);
}
