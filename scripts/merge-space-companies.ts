/**
 * One-time merge: SpaceCompany (legacy) → CompanyProfile (canonical).
 *
 * Founder decision (2026-08): CompanyProfile is the single source of truth
 * for company facts. All app code has been repointed; this script migrates
 * whatever rows remain in the dormant SpaceCompany table.
 *
 * Behavior:
 *  - Matches each SpaceCompany row to a CompanyProfile by slug, then ticker
 *    (base symbol, so 'MDA' matches 'MDA.TO'), then normalized name.
 *  - MATCHED rows: fills ONLY null/empty CompanyProfile fields from the
 *    SpaceCompany row (units converted: SpaceCompany stores marketCap and
 *    valuation in BILLIONS and funding/revenue in MILLIONS; CompanyProfile
 *    stores raw USD). Where both sides have a value and they disagree, the
 *    conflict is REPORTED and CompanyProfile wins (no overwrite).
 *  - UNMATCHED rows: creates a minimal CompanyProfile (linked back via
 *    companyId) so no company is lost — e.g. Mitsubishi Heavy (7011),
 *    Airbus (AIR), Sidus Space (SIDU) existed only in SpaceCompany seeds.
 *  - IDEMPOTENT: re-running matches the previously created profiles by slug
 *    and finds nothing left to fill.
 *  - Never deletes SpaceCompany rows and never touches the schema.
 *
 * Usage:
 *   npx tsx scripts/merge-space-companies.ts             # DRY RUN (default)
 *   npx tsx scripts/merge-space-companies.ts --apply     # write changes
 *   railway run npx tsx scripts/merge-space-companies.ts --apply   # prod
 */

import prisma from '../src/lib/db';

const APPLY = process.argv.includes('--apply');

// ── Helpers ─────────────────────────────────────────────────────────────────

function normalizeName(s: string): string {
  return s
    .toLowerCase()
    .replace(/\b(inc|corp|corporation|company|co|ltd|llc|plc|sa|se|gmbh|technologies|technology)\b/g, '')
    .replace(/[^a-z0-9]/g, '');
}

function baseTicker(t: string): string {
  return t.toUpperCase().split('.')[0];
}

const ISO3_TO_ISO2: Record<string, string> = {
  USA: 'US', CHN: 'CN', RUS: 'RU', JPN: 'JP', FRA: 'FR', GBR: 'GB', DEU: 'DE',
  IND: 'IN', KOR: 'KR', ISR: 'IL', NZL: 'NZ', AUS: 'AU', CAN: 'CA', LUX: 'LU',
  ARE: 'AE', ITA: 'IT', ESP: 'ES', FIN: 'FI', SWE: 'SE', CHE: 'CH', NOR: 'NO',
  DNK: 'DK', POL: 'PL', UKR: 'UA', SGP: 'SG', TWN: 'TW', BRA: 'BR', MEX: 'MX',
  ARG: 'AR', TUR: 'TR', SAU: 'SA', NLD: 'NL', BEL: 'BE', AUT: 'AT', PRT: 'PT',
  GRC: 'GR', CZE: 'CZ', IRL: 'IE', ZAF: 'ZA', EUR: 'EU',
};

/** SpaceCompany stored ISO-3; CompanyProfile stores ISO-2. */
function toProfileCountry(country: string | null): string | null {
  if (!country) return null;
  const c = country.toUpperCase();
  return ISO3_TO_ISO2[c] || c;
}

function parseYearDate(s: string | null): Date | null {
  if (!s) return null;
  const m = s.match(/(\d{4})/);
  return m ? new Date(Date.UTC(parseInt(m[1], 10), 0, 1)) : null;
}

function safeJsonArray(s: string | null): string[] {
  if (!s) return [];
  try {
    const parsed = JSON.parse(s);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

/** Legacy snake_case focus area → CompanyProfile sector. */
function deriveSector(focusAreas: string[]): string | null {
  if (focusAreas.includes('launch_provider')) return 'launch';
  if (focusAreas.includes('defense')) return 'defense';
  if (focusAreas.includes('satellites') || focusAreas.includes('earth_observation') || focusAreas.includes('communications')) return 'satellite';
  if (focusAreas.includes('manufacturing')) return 'manufacturing';
  if (focusAreas.includes('space_infrastructure') || focusAreas.includes('space_stations')) return 'infrastructure';
  return null;
}

function toKebabTags(focusAreas: string[], subSectors: string[]): string[] {
  const all = [...focusAreas, ...subSectors].map((t) =>
    t.toLowerCase().replace(/_/g, '-')
  );
  return Array.from(new Set(all));
}

// Unit conversions: SpaceCompany billions/millions → CompanyProfile raw USD.
const billionsToUsd = (b: number | null): number | null => (b === null ? null : b * 1_000_000_000);
const millionsToUsd = (m: number | null): number | null => (m === null ? null : m * 1_000_000);

function approxEqual(a: number, b: number): boolean {
  if (a === b) return true;
  const denom = Math.max(Math.abs(a), Math.abs(b));
  return denom > 0 && Math.abs(a - b) / denom < 0.01; // 1% tolerance
}

// ── Main ────────────────────────────────────────────────────────────────────

interface Conflict {
  company: string;
  field: string;
  profileValue: unknown;
  legacyValue: unknown;
}

async function main() {
  console.log(`merge-space-companies — ${APPLY ? 'APPLY mode (writing)' : 'DRY RUN (pass --apply to write)'}\n`);

  const legacyRows = await prisma.spaceCompany.findMany();
  const profiles = await prisma.companyProfile.findMany({
    select: {
      id: true, slug: true, name: true, ticker: true, companyId: true,
      description: true, country: true, headquarters: true, foundedYear: true,
      website: true, logoUrl: true, isPublic: true, exchange: true,
      marketCap: true, employeeCount: true, totalFunding: true,
      lastFundingRound: true, lastFundingDate: true, valuation: true,
      revenueEstimate: true,
    },
  });

  console.log(`SpaceCompany rows: ${legacyRows.length}; CompanyProfile rows: ${profiles.length}\n`);

  const bySlug = new Map(profiles.map((p) => [p.slug, p]));
  const byTicker = new Map<string, (typeof profiles)[number]>();
  for (const p of profiles) {
    if (p.ticker) byTicker.set(baseTicker(p.ticker), p);
  }
  const byName = new Map(profiles.map((p) => [normalizeName(p.name), p]));

  const conflicts: Conflict[] = [];
  let matched = 0;
  let created = 0;
  let fieldsFilled = 0;

  for (const legacy of legacyRows) {
    const profile =
      bySlug.get(legacy.slug) ||
      (legacy.ticker ? byTicker.get(baseTicker(legacy.ticker)) : undefined) ||
      byName.get(normalizeName(legacy.name));

    // Legacy values converted to CompanyProfile units up front.
    const converted: Record<string, unknown> = {
      description: legacy.description,
      country: toProfileCountry(legacy.country),
      headquarters: legacy.headquarters,
      foundedYear: legacy.founded,
      website: legacy.website,
      logoUrl: legacy.logoUrl,
      ticker: legacy.ticker,
      exchange: legacy.exchange,
      marketCap: billionsToUsd(legacy.marketCap),
      valuation: billionsToUsd(legacy.valuation),
      totalFunding: millionsToUsd(legacy.totalFunding),
      revenueEstimate: millionsToUsd(legacy.revenueEstimate),
      lastFundingRound: legacy.lastFundingRound,
      lastFundingDate: parseYearDate(legacy.lastFundingDate),
      employeeCount: legacy.employeeCount,
    };

    if (profile) {
      matched++;
      const updates: Record<string, unknown> = {};

      for (const [field, legacyValue] of Object.entries(converted)) {
        if (legacyValue === null || legacyValue === undefined) continue;
        const profileValue = (profile as Record<string, unknown>)[field];

        if (profileValue === null || profileValue === undefined || profileValue === '') {
          updates[field] = legacyValue; // CompanyProfile has no value → fill
        } else if (
          typeof profileValue === 'number' &&
          typeof legacyValue === 'number' &&
          !approxEqual(profileValue, legacyValue)
        ) {
          conflicts.push({ company: legacy.name, field, profileValue, legacyValue });
        } else if (
          typeof profileValue === 'string' &&
          typeof legacyValue === 'string' &&
          profileValue.trim().toLowerCase() !== legacyValue.trim().toLowerCase() &&
          field !== 'description' // prose text always differs; not a fact conflict
        ) {
          conflicts.push({ company: legacy.name, field, profileValue, legacyValue });
        }
      }

      // isPublic disagreement is a fact conflict (CompanyProfile wins).
      if (profile.isPublic !== legacy.isPublic) {
        conflicts.push({
          company: legacy.name,
          field: 'isPublic',
          profileValue: profile.isPublic,
          legacyValue: legacy.isPublic,
        });
      }

      // Link the legacy row for provenance.
      if (!profile.companyId) updates.companyId = legacy.id;

      if (Object.keys(updates).length > 0) {
        fieldsFilled += Object.keys(updates).length;
        console.log(`FILL  ${legacy.slug} → ${profile.slug}: ${Object.keys(updates).join(', ')}`);
        if (APPLY) {
          await prisma.companyProfile.update({ where: { id: profile.id }, data: updates });
        }
      }
    } else {
      created++;
      const focusAreas = safeJsonArray(legacy.focusAreas);
      const subSectors = safeJsonArray(legacy.subSectors);
      let slug = legacy.slug;
      if (bySlug.has(slug)) slug = `${slug}-sc`; // paranoia; slug match would have hit above

      console.log(`CREATE ${slug} (${legacy.name}${legacy.ticker ? `, ${legacy.ticker}` : ''})`);
      if (APPLY) {
        const createdProfile = await prisma.companyProfile.create({
          data: {
            slug,
            companyId: legacy.id,
            name: legacy.name,
            description: legacy.description,
            country: toProfileCountry(legacy.country),
            headquarters: legacy.headquarters,
            foundedYear: legacy.founded,
            website: legacy.website,
            logoUrl: legacy.logoUrl,
            isPublic: legacy.isPublic,
            ticker: legacy.ticker,
            exchange: legacy.exchange,
            marketCap: billionsToUsd(legacy.marketCap),
            stockPrice: legacy.stockPrice,
            priceChange24h: legacy.priceChange24h,
            valuation: billionsToUsd(legacy.valuation),
            totalFunding: millionsToUsd(legacy.totalFunding),
            revenueEstimate: millionsToUsd(legacy.revenueEstimate),
            lastFundingRound: legacy.lastFundingRound,
            lastFundingDate: parseYearDate(legacy.lastFundingDate),
            employeeCount: legacy.employeeCount,
            status: 'active',
            sector: deriveSector(focusAreas),
            tags: toKebabTags(focusAreas, subSectors),
            ownershipType: legacy.isPublic ? 'public' : 'private',
            tier: 3,
            dataCompleteness: 35,
          },
        });
        bySlug.set(createdProfile.slug, { ...createdProfile } as (typeof profiles)[number]);
      }
    }
  }

  console.log('\n── Summary ─────────────────────────────────────────────');
  console.log(`Matched:           ${matched}`);
  console.log(`Created profiles:  ${created}`);
  console.log(`Fields filled:     ${fieldsFilled}`);
  console.log(`Conflicts (CompanyProfile wins, no overwrite): ${conflicts.length}`);
  for (const c of conflicts) {
    console.log(`  CONFLICT ${c.company}.${c.field}: profile=${JSON.stringify(c.profileValue)} legacy=${JSON.stringify(c.legacyValue)}`);
  }
  if (!APPLY) console.log('\nDry run only — re-run with --apply to write.');
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
