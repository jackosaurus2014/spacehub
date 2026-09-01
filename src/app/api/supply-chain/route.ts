import { NextResponse } from 'next/server';
import {
  SUPPLY_CHAIN_COMPANIES as FALLBACK_COMPANIES,
  SUPPLY_RELATIONSHIPS as FALLBACK_RELATIONSHIPS,
  SUPPLY_SHORTAGES as FALLBACK_SHORTAGES,
} from '@/lib/supply-chain-data';
import {
  SupplyChainTier,
  SupplyChainCompany,
  SupplyRelationship,
  SupplyShortage,
} from '@/types';
import { getModuleContent, mergeCuratedWithDynamic } from '@/lib/dynamic-content';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

// ---------------------------------------------------------------------------
// Curated + dynamic merge (2026-08-31 freshness-audit fix)
//
// The nightly AI refresher (ai-data-research cron -> src/lib/ai-data-refresher.ts)
// stores whole-section blobs in DynamicContent. On 2026-08-29 it replaced the
// 63-company curated catalog with a 6-company blob, so this Pro-gated page
// showed "0 suppliers" in every non-prime tier. The curated dataset in
// src/lib/supply-chain-data.ts is now the FLOOR: dynamic rows update or add on
// top of it (dynamic wins collisions — the refreshed-catalog rule from the
// 2026-08-24 mergeCuratedWithDynamic precedent) and can never shrink the page.
// ---------------------------------------------------------------------------

/** Normalize AI-produced tier spellings ('1', 'Tier 1', 'prime contractor', …). */
function normalizeTier(raw: unknown): SupplyChainTier | null {
  const t = String(raw ?? '').toLowerCase().replace(/[\s_-]/g, '');
  if (t === 'prime' || t === 'primecontractor' || t === 'tier0' || t === '0') return 'prime';
  if (t === 'tier1' || t === '1') return 'tier1';
  if (t === 'tier2' || t === '2') return 'tier2';
  if (t === 'tier3' || t === '3') return 'tier3';
  return null;
}

const RISK_LEVELS = new Set(['high', 'medium', 'low', 'none']);
const SHORTAGE_SEVERITIES = new Set(['critical', 'high', 'medium', 'low']);

// Helper functions that operate on dynamic data arrays
function computeStats(
  companies: SupplyChainCompany[],
  relationships: SupplyRelationship[],
  shortages: SupplyShortage[]
) {
  return {
    totalCompanies: companies.length,
    primeContractors: companies.filter((c) => c.tier === 'prime').length,
    tier1Suppliers: companies.filter((c) => c.tier === 'tier1').length,
    tier2Suppliers: companies.filter((c) => c.tier === 'tier2').length,
    tier3Suppliers: companies.filter((c) => c.tier === 'tier3').length,
    totalRelationships: relationships.length,
    // NOTE (2026-08-31 freshness audit): highRisk and critical are OVERLAPPING
    // flags on the same relationship (a link can be both geopolitically high-risk
    // AND critical), so these two counts legitimately do not partition
    // totalRelationships and must never be summed against it in the UI.
    highRiskRelationships: relationships.filter((r) => r.geopoliticalRisk === 'high').length,
    criticalRelationships: relationships.filter((r) => r.isCritical === true).length,
    totalShortages: shortages.length,
    criticalShortages: shortages.filter((s) => s.severity === 'critical').length,
    highSeverityShortages: shortages.filter((s) => s.severity === 'high').length,
    countriesWithHighRisk: ['CHN', 'RUS', 'COD'],
    usCompanies: companies.filter((c) => c.countryCode === 'USA').length,
    europeanCompanies: companies.filter((c) => ['EUR', 'FRA', 'DEU', 'GBR', 'NOR', 'ITA'].includes(c.countryCode)).length,
  };
}

export async function GET(request: Request) {
  try {
    // Try to load supply chain data from DynamicContent, fall back to hardcoded data
    let allCompanies: SupplyChainCompany[] = FALLBACK_COMPANIES;
    let allRelationships: SupplyRelationship[] = FALLBACK_RELATIONSHIPS;
    let allShortages: SupplyShortage[] = FALLBACK_SHORTAGES;
    // 'merged' = curated floor + dynamic (AI-refreshed) rows on top.
    let dataSource: 'merged' | 'fallback' = 'fallback';
    let refreshedAt: string = new Date().toISOString();
    // Oldest of the three sections — refreshedAt above is module-wide-newest
    // and can mask a stale section behind a fresher one (the stale-content
    // audit's root cause); expose the honest oldest vintage too.
    let earliestRefresh: Date | null = null;

    try {
      const [dynamicCompanies, dynamicRelationships, dynamicShortages] = await Promise.all([
        getModuleContent<SupplyChainCompany>('supply-chain', 'companies'),
        getModuleContent<SupplyRelationship>('supply-chain', 'relationships'),
        getModuleContent<SupplyShortage>('supply-chain', 'shortages'),
      ]);
      // DynamicContent stores each section as a single JSON blob containing the full array
      let hasDbData = false;
      let latestRefresh: Date | null = null;
      // Helper: unwrap nested data (DB may store as { companies: [...] } wrapper)
      const unwrap = <T,>(raw: unknown, arrayKey: string, requiredField: string): T[] | null => {
        if (Array.isArray(raw) && raw.length > 0 && raw[0] && typeof raw[0] === 'object' && requiredField in (raw[0] as Record<string, unknown>)) {
          return raw as T[];
        }
        if (raw && typeof raw === 'object' && !Array.isArray(raw) && arrayKey in (raw as Record<string, unknown>)) {
          const nested = (raw as Record<string, unknown>)[arrayKey];
          if (Array.isArray(nested) && nested.length > 0) return nested as T[];
        }
        return null;
      };

      if (dynamicCompanies.length > 0) {
        const parsed = unwrap<SupplyChainCompany>(dynamicCompanies[0].data, 'companies', 'name');
        if (parsed) {
          // Normalize tiers first so '1'/'Tier 1' style values survive the
          // validity gate instead of being dropped (or worse, mis-counting
          // every tier as 0 on the stats tiles).
          const normalized = parsed.map((c) => ({ ...c, tier: (normalizeTier(c.tier) ?? c.tier) as SupplyChainTier }));
          const { merged } = mergeCuratedWithDynamic(
            FALLBACK_COMPANIES,
            normalized,
            (c) => c.name?.trim().toLowerCase() || undefined,
            (c) => typeof c.name === 'string' && c.name.trim().length > 0 && normalizeTier(c.tier) !== null,
          );
          allCompanies = merged;
          hasDbData = true;
        }
        latestRefresh = dynamicCompanies[0].refreshedAt;
        earliestRefresh = dynamicCompanies[0].refreshedAt;
      }
      if (dynamicRelationships.length > 0) {
        const parsed = unwrap<SupplyRelationship>(dynamicRelationships[0].data, 'relationships', 'supplierId');
        if (parsed) {
          const normalized = parsed.map((r) => ({
            ...r,
            geopoliticalRisk: String(r.geopoliticalRisk ?? '').toLowerCase() as SupplyRelationship['geopoliticalRisk'],
            isCritical: r.isCritical === true,
          }));
          const { merged } = mergeCuratedWithDynamic(
            FALLBACK_RELATIONSHIPS,
            normalized,
            (r) => (r.supplierId && r.customerId ? `${String(r.supplierId).toLowerCase()}->${String(r.customerId).toLowerCase()}` : undefined),
            (r) => !!r.supplierId && !!r.customerId && RISK_LEVELS.has(String(r.geopoliticalRisk)),
          );
          allRelationships = merged;
          hasDbData = true;
        }
        if (!latestRefresh || dynamicRelationships[0].refreshedAt > latestRefresh) {
          latestRefresh = dynamicRelationships[0].refreshedAt;
        }
        if (!earliestRefresh || dynamicRelationships[0].refreshedAt < earliestRefresh) {
          earliestRefresh = dynamicRelationships[0].refreshedAt;
        }
      }
      if (dynamicShortages.length > 0) {
        const parsed = unwrap<SupplyShortage>(dynamicShortages[0].data, 'shortages', 'material');
        if (parsed) {
          const normalized = parsed.map((s) => ({
            ...s,
            severity: String(s.severity ?? '').toLowerCase() as SupplyShortage['severity'],
          }));
          const { merged } = mergeCuratedWithDynamic(
            FALLBACK_SHORTAGES,
            normalized,
            (s) => s.material?.trim().toLowerCase() || undefined,
            (s) => typeof s.material === 'string' && s.material.trim().length > 0 && SHORTAGE_SEVERITIES.has(String(s.severity)),
          );
          allShortages = merged;
          hasDbData = true;
        }
        if (!latestRefresh || dynamicShortages[0].refreshedAt > latestRefresh) {
          latestRefresh = dynamicShortages[0].refreshedAt;
        }
        if (!earliestRefresh || dynamicShortages[0].refreshedAt < earliestRefresh) {
          earliestRefresh = dynamicShortages[0].refreshedAt;
        }
      }
      if (hasDbData && latestRefresh) {
        dataSource = 'merged';
        refreshedAt = latestRefresh.toISOString();
      }
    } catch {
      // DynamicContent unavailable, use fallback data
    }

    const _meta = {
      source: dataSource,
      refreshedAt,
      oldestRefreshedAt: earliestRefresh ? earliestRefresh.toISOString() : null,
      ttl: 1209600,
    };

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'stats';
    const tier = searchParams.get('tier') as SupplyChainTier | null;
    const country = searchParams.get('country');
    const companyId = searchParams.get('companyId');
    const category = searchParams.get('category');
    const riskLevel = searchParams.get('riskLevel');
    const severity = searchParams.get('severity');

    switch (type) {
      case 'stats': {
        const stats = computeStats(allCompanies, allRelationships, allShortages);
        return NextResponse.json({ ...stats, _meta });
      }

      case 'companies': {
        let companies = [...allCompanies];

        // Filter by tier
        if (tier) {
          companies = companies.filter((c) => c.tier === tier);
        }

        // Filter by country
        if (country) {
          companies = companies.filter((c) => c.countryCode === country);
        }

        // Filter by product category
        if (category) {
          companies = companies.filter((c) =>
            c.products.some((p) => p.toLowerCase().includes(category.toLowerCase()))
          );
        }

        return NextResponse.json({ companies, _meta });
      }

      case 'company': {
        if (!companyId) {
          return NextResponse.json({ error: 'companyId required' }, { status: 400 });
        }
        const company = allCompanies.find((c) => c.id === companyId);
        if (!company) {
          return NextResponse.json({ error: 'Company not found' }, { status: 404 });
        }
        const relationships = allRelationships.filter(
          (r) => r.supplierId === companyId || r.customerId === companyId
        );
        return NextResponse.json({ company, relationships, _meta });
      }

      case 'relationships': {
        let relationships = [...allRelationships];

        // Filter by risk level
        if (riskLevel === 'high') {
          relationships = relationships.filter((r) => r.geopoliticalRisk === 'high');
        } else if (riskLevel) {
          relationships = relationships.filter((r) => r.geopoliticalRisk === riskLevel);
        }

        // Filter by company
        if (companyId) {
          relationships = relationships.filter(
            (r) => r.supplierId === companyId || r.customerId === companyId
          );
        }

        return NextResponse.json({ relationships, _meta });
      }

      case 'shortages': {
        let shortages = [...allShortages];

        // Filter by severity
        if (severity === 'critical') {
          shortages = shortages.filter((s) => s.severity === 'critical');
        } else if (severity) {
          shortages = shortages.filter((s) => s.severity === severity);
        }

        // Filter by category
        if (category) {
          shortages = shortages.filter((s) => s.category === category);
        }

        return NextResponse.json({ shortages, _meta });
      }

      case 'risks': {
        // Get all high-risk data
        const highRiskRelationships = allRelationships.filter((r) => r.geopoliticalRisk === 'high');
        const criticalShortages = allShortages.filter((s) => s.severity === 'critical');
        const highRiskCountries = allCompanies.filter((c) =>
          ['CHN', 'RUS', 'COD'].includes(c.countryCode)
        );

        return NextResponse.json({
          highRiskRelationships,
          criticalShortages,
          highRiskCountries,
          summary: {
            totalHighRiskRelationships: highRiskRelationships.length,
            totalCriticalShortages: criticalShortages.length,
            riskCountries: ['China', 'Russia', 'DR Congo'],
          },
          _meta,
        });
      }

      default:
        return NextResponse.json({ error: 'Invalid type parameter' }, { status: 400 });
    }
  } catch (error) {
    logger.error('Supply chain API error', { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json(
      { error: 'Failed to fetch supply chain data' },
      { status: 500 }
    );
  }
}
