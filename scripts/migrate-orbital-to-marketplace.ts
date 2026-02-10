/**
 * Migrate orbital services data into marketplace ServiceListing model.
 * Creates editorial listings linked to matching CompanyProfiles.
 *
 * Run: npx tsx scripts/migrate-orbital-to-marketplace.ts
 */

import prisma from '../src/lib/db';
import { ORBITAL_SERVICES_SEED } from '../src/lib/orbital-services-data';
import { generateSlug } from '../src/lib/marketplace-types';

// Map orbital service categories to marketplace categories + subcategories
const CATEGORY_MAP: Record<string, { category: string; subcategory: string }> = {
  earth_observation: { category: 'satellite', subcategory: 'earth_observation' },
  in_orbit_computing: { category: 'in_space', subcategory: 'in_orbit_computing' },
  hosted_payload: { category: 'in_space', subcategory: 'hosted_payload' },
  space_solar: { category: 'power', subcategory: 'space_solar' },
  communications: { category: 'satellite', subcategory: 'communications' },
  sensor_service: { category: 'satellite', subcategory: 'earth_observation' },
  ground_station: { category: 'ground', subcategory: 'ground_stations' },
  launch: { category: 'launch', subcategory: 'dedicated' },
  debris_tracking: { category: 'environment', subcategory: 'debris_tracking' },
  manufacturing: { category: 'manufacturing', subcategory: 'satellite_buses' },
  engineering: { category: 'engineering', subcategory: 'systems_engineering' },
};

// Map orbital pricing models to marketplace pricing types
const PRICING_MAP: Record<string, string> = {
  per_km2: 'per_unit',
  per_pass: 'per_unit',
  per_minute: 'per_unit',
  per_image: 'per_unit',
  per_gb: 'per_unit',
  fixed: 'fixed',
  hourly: 'hourly',
  subscription: 'subscription',
  monthly: 'subscription',
  annual: 'subscription',
  custom: 'rfq_only',
  negotiated: 'rfq_only',
};

async function migrate() {
  console.log('Starting orbital services → marketplace migration...');
  console.log(`Found ${ORBITAL_SERVICES_SEED.length} orbital services to migrate.\n`);

  let created = 0;
  let skipped = 0;
  let errors = 0;

  // Preload all company profiles for matching
  const companies = await prisma.companyProfile.findMany({
    select: { id: true, name: true, slug: true },
  });
  const companyByName = new Map<string, { id: string; slug: string }>();
  for (const c of companies) {
    companyByName.set(c.name.toLowerCase(), { id: c.id, slug: c.slug });
    // Also try partial matches
    const parts = c.name.toLowerCase().split(/\s+/);
    if (parts.length > 1) {
      companyByName.set(parts[0], { id: c.id, slug: c.slug });
    }
  }

  for (const svc of ORBITAL_SERVICES_SEED) {
    try {
      const slug = `marketplace-${svc.slug}`;

      // Check if already migrated
      const existing = await prisma.serviceListing.findUnique({ where: { slug } });
      if (existing) {
        console.log(`  SKIP: ${svc.serviceName} (${svc.providerName}) — already exists`);
        skipped++;
        continue;
      }

      // Find matching company profile
      const providerLower = svc.providerName.toLowerCase();
      let company = companyByName.get(providerLower);
      if (!company) {
        // Try partial match
        const entries = Array.from(companyByName.entries());
        for (const [name, co] of entries) {
          if (providerLower.includes(name) || name.includes(providerLower)) {
            company = co;
            break;
          }
        }
      }
      // Also try matching by providerSlug
      if (!company && svc.providerSlug) {
        const bySlug = companies.find((c) => c.slug === svc.providerSlug);
        if (bySlug) company = { id: bySlug.id, slug: bySlug.slug };
      }

      if (!company) {
        console.log(`  WARN: No company profile found for "${svc.providerName}" — skipping`);
        skipped++;
        continue;
      }

      // Map category
      const catMap = CATEGORY_MAP[svc.category] || { category: 'engineering', subcategory: 'systems_engineering' };

      // Map pricing
      const pricingType = PRICING_MAP[svc.pricingModel] || 'rfq_only';

      await prisma.serviceListing.create({
        data: {
          companyId: company.id,
          slug,
          name: svc.serviceName,
          description: svc.description,
          category: catMap.category,
          subcategory: catMap.subcategory,
          pricingType,
          priceMin: svc.priceMin || null,
          priceMax: svc.priceMax || null,
          priceUnit: svc.priceUnit || null,
          pricingNotes: svc.pricingNotes || null,
          specifications: (svc.specifications || {}) as any,
          certifications: [],
          coverageArea: svc.coverage || null,
          status: 'active',
          isEditorial: true,
          sourceService: 'orbital-services',
        },
      });

      console.log(`  OK: ${svc.serviceName} (${svc.providerName}) → ${catMap.category}/${catMap.subcategory}`);
      created++;
    } catch (err: any) {
      console.error(`  ERR: ${svc.serviceName} (${svc.providerName}) — ${err.message}`);
      errors++;
    }
  }

  console.log(`\n--- Migration Complete ---`);
  console.log(`Created: ${created}`);
  console.log(`Skipped: ${skipped}`);
  console.log(`Errors:  ${errors}`);

  await prisma.$disconnect();
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
