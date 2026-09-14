/**
 * SpaceNexus Research — supply-chain exposure for a saved portfolio.
 *
 * The analytic Research actually sells. Anyone can read one company's
 * supply-chain page for free; what an investor or a strategy team cannot do
 * today is ask "across these 30 holdings, where am I concentrated, what single
 * points of failure do I own twice, and which shortages hit more than one of
 * them at once". That is a portfolio-level aggregation over data we already
 * hold, computed deterministically — no model is called anywhere in this file.
 */

import {
  SUPPLY_CHAIN_COMPANIES,
  SUPPLY_RELATIONSHIPS,
  SUPPLY_SHORTAGES,
} from '@/lib/supply-chain-data';
import { BOM_RISK_ITEMS } from '@/lib/supply-chain-bom-risks';
import type { SupplyChainCompany } from '@/types';

export interface ExposureCount {
  key: string;
  label: string;
  count: number;
  /** Share of matched holdings, 0-100, rounded to one decimal. */
  percent: number;
}

export interface SingleSourceDependency {
  supplierId: string;
  supplierName: string;
  supplierCountry: string;
  /** Holdings that depend on this supplier. */
  dependentHoldings: string[];
  criticalEdges: number;
}

export interface PortfolioExposure {
  /** Identifiers the caller supplied. */
  requested: string[];
  /** Those we could resolve to a supply-chain company. */
  matched: { id: string; slug: string; name: string; tier: string; country: string }[];
  /** Those we could not, named explicitly rather than silently dropped. */
  unmatched: string[];
  byTier: ExposureCount[];
  byCountry: ExposureCount[];
  byCriticality: ExposureCount[];
  /** Suppliers that more than one holding depends on. The concentration risk. */
  sharedSuppliers: SingleSourceDependency[];
  /** BOM risk items whose primary suppliers intersect the portfolio. */
  bomRiskItems: {
    id: string;
    component: string;
    category: string;
    riskLevel: string;
    leadTime: string;
    viaHoldings: string[];
    alternativeCount: number;
  }[];
  /** Tracked shortages touching the portfolio. */
  shortages: {
    id: string;
    material: string;
    severity: string;
    viaHoldings: string[];
    alternativeSupplierCount: number;
  }[];
  /** Headline counts, so the UI does not have to re-derive them. */
  summary: {
    holdingsMatched: number;
    highCriticality: number;
    highRiskEdges: number;
    criticalOrHighBomItems: number;
    singleSourceComponents: number;
  };
  /**
   * What this analysis can and cannot see. Returned with every response so the
   * limits travel with the numbers.
   */
  coverageNote: string;
}

export const EXPOSURE_COVERAGE_NOTE =
  'Computed over our curated supply-chain roster and BOM risk register, which cover Western launch, satellite and station programmes. A holding we cannot match is listed under "unmatched" rather than scored as zero risk, and an absent supplier edge means we have no public evidence of one — not that none exists.';

const TIER_LABELS: Record<string, string> = {
  prime: 'Prime contractor',
  tier1: 'Tier 1 supplier',
  tier2: 'Tier 2 supplier',
  tier3: 'Tier 3 supplier',
};

const CRITICALITY_LABELS: Record<string, string> = {
  high: 'High criticality',
  medium: 'Medium criticality',
  low: 'Low criticality',
};

const norm = (s: string) => s.trim().toLowerCase();

/** Resolve a free-text holding (id, slug or company name) to a roster company. */
function resolveHolding(raw: string): SupplyChainCompany | null {
  const needle = norm(raw);
  if (!needle) return null;
  return (
    SUPPLY_CHAIN_COMPANIES.find(
      (c) => norm(c.id) === needle || norm(c.slug) === needle || norm(c.name) === needle
    ) ?? null
  );
}

function tally(
  values: string[],
  labels: Record<string, string>,
  total: number
): ExposureCount[] {
  const counts = new Map<string, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  return Array.from(counts.entries())
    .map(([key, count]) => ({
      key,
      label: labels[key] ?? key,
      count,
      percent: total > 0 ? Math.round((count / total) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.count - a.count || a.key.localeCompare(b.key));
}

/**
 * Deterministic: the same holdings always produce the same report, so two
 * analysts comparing notes see the same numbers.
 */
export function computePortfolioExposure(holdings: string[]): PortfolioExposure {
  const requested = holdings.map((h) => String(h).trim()).filter(Boolean);
  const matched: SupplyChainCompany[] = [];
  const unmatched: string[] = [];
  const seen = new Set<string>();

  for (const raw of requested) {
    const company = resolveHolding(raw);
    if (!company) {
      unmatched.push(raw);
      continue;
    }
    if (seen.has(company.id)) continue;
    seen.add(company.id);
    matched.push(company);
  }

  const total = matched.length;
  const matchedIds = new Set(matched.map((c) => c.id));
  const nameById = new Map(matched.map((c) => [c.id, c.name]));

  // --- Shared suppliers: the concentration story -------------------------
  const supplierHits = new Map<
    string,
    { name: string; country: string; holdings: Set<string>; critical: number }
  >();
  let highRiskEdges = 0;

  for (const edge of SUPPLY_RELATIONSHIPS) {
    if (!matchedIds.has(edge.customerId)) continue;
    if (edge.geopoliticalRisk === 'high') highRiskEdges += 1;
    const supplierCompany = SUPPLY_CHAIN_COMPANIES.find((c) => c.id === edge.supplierId);
    const entry = supplierHits.get(edge.supplierId) ?? {
      name: edge.supplierName,
      country: supplierCompany?.countryCode ?? '',
      holdings: new Set<string>(),
      critical: 0,
    };
    entry.holdings.add(nameById.get(edge.customerId) ?? edge.customerName);
    if (edge.isCritical) entry.critical += 1;
    supplierHits.set(edge.supplierId, entry);
  }

  const sharedSuppliers: SingleSourceDependency[] = Array.from(supplierHits.entries())
    .filter(([, v]) => v.holdings.size > 1)
    .map(([supplierId, v]) => ({
      supplierId,
      supplierName: v.name,
      supplierCountry: v.country,
      dependentHoldings: Array.from(v.holdings).sort(),
      criticalEdges: v.critical,
    }))
    .sort(
      (a, b) =>
        b.dependentHoldings.length - a.dependentHoldings.length ||
        b.criticalEdges - a.criticalEdges ||
        a.supplierName.localeCompare(b.supplierName)
    );

  // --- BOM risk reachable through the portfolio --------------------------
  const holdingNames = new Set(matched.map((c) => norm(c.name)));
  const holdingSlugs = new Set(matched.map((c) => norm(c.slug)));

  const bomRiskItems = BOM_RISK_ITEMS.map((item) => {
    const via = new Set<string>();
    for (const supplier of item.primarySuppliers) {
      if (holdingNames.has(norm(supplier))) via.add(supplier);
    }
    for (const slug of item.supplierCompanyIds ?? []) {
      if (holdingSlugs.has(norm(slug))) {
        const c = matched.find((m) => norm(m.slug) === norm(slug));
        if (c) via.add(c.name);
      }
    }
    return {
      id: item.id,
      component: item.component,
      category: item.category as string,
      riskLevel: item.riskLevel as string,
      leadTime: item.leadTime,
      viaHoldings: Array.from(via).sort(),
      alternativeCount: item.alternatives.length,
    };
  })
    .filter((i) => i.viaHoldings.length > 0)
    .sort(
      (a, b) =>
        b.viaHoldings.length - a.viaHoldings.length || a.component.localeCompare(b.component)
    );

  // --- Shortages touching the portfolio ----------------------------------
  const shortages = SUPPLY_SHORTAGES.map((s) => {
    const via = s.impactedCompanies.filter((c) => holdingNames.has(norm(c)));
    return {
      id: s.id,
      material: s.material,
      severity: s.severity as string,
      viaHoldings: via.sort(),
      alternativeSupplierCount: s.alternativeSuppliers.length,
    };
  })
    .filter((s) => s.viaHoldings.length > 0)
    .sort(
      (a, b) => b.viaHoldings.length - a.viaHoldings.length || a.material.localeCompare(b.material)
    );

  return {
    requested,
    matched: matched.map((c) => ({
      id: c.id,
      slug: c.slug,
      name: c.name,
      tier: c.tier as string,
      country: c.countryCode,
    })),
    unmatched,
    byTier: tally(
      matched.map((c) => c.tier as string),
      TIER_LABELS,
      total
    ),
    byCountry: tally(
      matched.map((c) => c.countryCode),
      {},
      total
    ),
    byCriticality: tally(
      matched.map((c) => c.criticality as string),
      CRITICALITY_LABELS,
      total
    ),
    sharedSuppliers,
    bomRiskItems,
    shortages,
    summary: {
      holdingsMatched: total,
      highCriticality: matched.filter((c) => c.criticality === 'high').length,
      highRiskEdges,
      criticalOrHighBomItems: bomRiskItems.filter(
        (b) => b.riskLevel === 'critical' || b.riskLevel === 'high'
      ).length,
      singleSourceComponents: bomRiskItems.filter((b) => b.alternativeCount === 0).length,
    },
    coverageNote: EXPOSURE_COVERAGE_NOTE,
  };
}
