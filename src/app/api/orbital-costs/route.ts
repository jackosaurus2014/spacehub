import { NextResponse } from 'next/server';
import { ORBITAL_SYSTEMS } from '@/lib/orbital-costs-data';

export const dynamic = 'force-dynamic';

export async function GET() {
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
}
