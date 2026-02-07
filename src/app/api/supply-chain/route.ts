import { NextResponse } from 'next/server';
import {
  SUPPLY_CHAIN_COMPANIES,
  SUPPLY_RELATIONSHIPS,
  SUPPLY_SHORTAGES,
  getSupplyChainStats,
  getCompaniesByTier,
  getCompaniesByCountry,
  getCompanyById,
  getRelationshipsForCompany,
  getHighRiskRelationships,
  getCriticalShortages,
  getShortagesByCategory,
} from '@/lib/supply-chain-data';
import { SupplyChainTier } from '@/types';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
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
        const stats = getSupplyChainStats();
        return NextResponse.json(stats);
      }

      case 'companies': {
        let companies = [...SUPPLY_CHAIN_COMPANIES];

        // Filter by tier
        if (tier) {
          companies = getCompaniesByTier(tier);
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
        const company = getCompanyById(companyId);
        if (!company) {
          return NextResponse.json({ error: 'Company not found' }, { status: 404 });
        }
        const relationships = getRelationshipsForCompany(companyId);
        return NextResponse.json({ company, relationships });
      }

      case 'relationships': {
        let relationships = [...SUPPLY_RELATIONSHIPS];

        // Filter by risk level
        if (riskLevel === 'high') {
          relationships = getHighRiskRelationships();
        } else if (riskLevel) {
          relationships = relationships.filter((r) => r.geopoliticalRisk === riskLevel);
        }

        // Filter by company
        if (companyId) {
          relationships = getRelationshipsForCompany(companyId);
        }

        return NextResponse.json({ relationships });
      }

      case 'shortages': {
        let shortages = [...SUPPLY_SHORTAGES];

        // Filter by severity
        if (severity === 'critical') {
          shortages = getCriticalShortages();
        } else if (severity) {
          shortages = shortages.filter((s) => s.severity === severity);
        }

        // Filter by category
        if (category) {
          shortages = getShortagesByCategory(category);
        }

        return NextResponse.json({ shortages });
      }

      case 'risks': {
        // Get all high-risk data
        const highRiskRelationships = getHighRiskRelationships();
        const criticalShortages = getCriticalShortages();
        const highRiskCountries = SUPPLY_CHAIN_COMPANIES.filter((c) =>
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
