// Shared stock-sector classification (extracted 2026-09-01 from
// src/app/space-stocks/page.tsx for G13 — the SpaceNexus Pure-Play Index
// must bucket EXACTLY like the stocks page or the two would drift, the
// disease the fact-check audit spent a day curing). Additive heuristic
// (sector first, then tags); no per-company hardcoding, so new
// CompanyProfile rows classify automatically.

export const EO_SECTORS = new Set(['earth-observation', 'satellite-operator', 'ground-segment', 'data-analytics']);
export const EO_TAGS = new Set([
  'earth-observation', 'satellite-operator', 'geospatial', 'geoint', 'rf-geolocation',
  'remote-sensing', 'multispectral', 'hyperspectral', 'sar', 'vsat', 'broadband',
  'satcom', 'satellite-communications', 'mobile-satellite-services', 'iot',
]);

export type StockBucket = 'primes' | 'eo' | 'pureplay';

export function classifySection(sector: string | null, tags: string[]): StockBucket {
  const s = (sector || '').toLowerCase();
  if (s.startsWith('defense')) return 'primes';
  if (EO_SECTORS.has(s)) return 'eo';
  const lowerTags = tags.map((t) => t.toLowerCase());
  if (lowerTags.some((t) => EO_TAGS.has(t))) return 'eo';
  return 'pureplay';
}
