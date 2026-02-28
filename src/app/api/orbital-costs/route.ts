import { NextResponse } from 'next/server';
import { ORBITAL_SYSTEMS } from '@/lib/orbital-costs-data';
import { logger } from '@/lib/logger';
import { internalError } from '@/lib/errors';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    return NextResponse.json({
      systems: ORBITAL_SYSTEMS.map((s) => ({
        slug: s.slug,
        name: s.name,
        variant: s.variant,
        icon: s.icon,
        category: s.category,
        description: s.description,
        orbit: s.orbit,
        totalMassKg: s.totalMassKg,
        crewCapacity: s.crewCapacity,
        powerKw: s.powerKw,
        designLifeYears: s.designLifeYears,
        techReadinessLevel: s.techReadinessLevel,
        totalCostUSD: s.costBreakdown.total,
        annualOperatingCostUSD: s.annualOperatingCostUSD,
        insuranceFirstYearUSD: s.insurance.totalFirstYearUSD,
      })),
      count: ORBITAL_SYSTEMS.length,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Failed to fetch orbital costs', { error: error instanceof Error ? error.message : String(error) });
    return internalError('Failed to fetch orbital costs');
  }
}
