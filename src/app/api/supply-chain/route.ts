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
import { getModuleContent } from '@/lib/dynamic-content';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

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
    highRiskRelationships: relationships.filter((r) => r.geopoliticalRisk === 'high').length,
    criticalRelationships: relationships.filter((r) => r.isCritical).length,
    totalShortages: shortages.length,
    criticalShortages: shortages.filter((s) => s.severity === 'critical').length,
    highSeverityShortages: shortages.filter((s) => s.severity === 'high').length,
    countriesWithHighRisk: ['CHN', 'RUS', 'COD'],
    usCompanies: companies.filter((c) => c.countryCode === 'USA').length,
    europeanCompanies: companies.filter((c) => ['EUR', 'FRA', 'DEU', 'GBR'].includes(c.countryCode)).length,
  };
}

export async function GET(request: Request) {
  try {
    // Try to load supply chain data from DynamicContent, fall back to hardcoded data
    let allCompanies: SupplyChainCompany[] = FALLBACK_COMPANIES;
    let allRelationships: SupplyRelationship[] = FALLBACK_RELATIONSHIPS;
    let allShortages: SupplyShortage[] = FALLBACK_SHORTAGES;

    try {
      const [dynamicCompanies, dynamicRelationships, dynamicShortages] = await Promise.all([
        getModuleContent<SupplyChainCompany>('supply-chain', 'companies'),
        getModuleContent<SupplyRelationship>('supply-chain', 'relationships'),
        getModuleContent<SupplyShortage>('supply-chain', 'shortages'),
      ]);
      if (dynamicCompanies.length > 0) allCompanies = dynamicCompanies.map((item) => item.data);
      if (dynamicRelationships.length > 0) allRelationships = dynamicRelationships.map((item) => item.data);
      if (dynamicShortages.length > 0) allShortages = dynamicShortages.map((item) => item.data);
    } catch {
      // DynamicContent unavailable, use fallback data
    }

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
        return NextResponse.json(stats);
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

        return NextResponse.json({ companies });
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
        return NextResponse.json({ company, relationships });
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

        return NextResponse.json({ relationships });
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

        return NextResponse.json({ shortages });
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
