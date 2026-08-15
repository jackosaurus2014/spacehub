/**
 * One-time prod cleanup: delete FundingOpportunity rows that fail the
 * corrected isSpaceRelated() filter (2026-08-14 data-integrity fix).
 *
 * src/lib/funding/opportunity-fetcher.ts previously matched on bare 'space'
 * (and other generic words), which let clearly off-topic federal grants
 * onto /funding-opportunities — e.g. USDA's "Community Forest and Open
 * Space Conservation Program" and the State Dept's "Enhancing and
 * Supporting the Network of American Spaces in Armenia" (cultural
 * centers). This script re-evaluates every existing FundingOpportunity row
 * against the corrected filter and deletes the ones that now fail it.
 * Rows sourced from 'manual' (STATE_INCENTIVES — hand-curated, not run
 * through isSpaceRelated) are always kept regardless of keyword match.
 *
 * Usage:
 *   npx tsx scripts/clean-off-topic-funding-opportunities.ts             # DRY RUN
 *   npx tsx scripts/clean-off-topic-funding-opportunities.ts --apply     # delete
 */

import prisma from '../src/lib/db';

const APPLY = process.argv.includes('--apply');

// Mirrors the corrected filter in src/lib/funding/opportunity-fetcher.ts.
const SPACE_KEYWORDS = [
  'space technology', 'space station', 'space telescope', 'space debris',
  'space weather', 'space domain awareness', 'space situational awareness',
  'space propulsion', 'space exploration', 'space launch', 'space force',
  'outer space', 'spacecraft', 'spaceport', 'satellite', 'orbital',
  'in-space', 'cislunar', 'deep space', 'low earth orbit',
  'geostationary orbit', 'launch vehicle', 'launch pad', 'launch site',
  'launch services', 'rocket propulsion', 'reusable rocket',
  'remote sensing', 'earth observation', 'lunar lander', 'lunar surface',
  'lunar exploration', 'lunar orbit', 'lunar mission', 'mars mission',
  'mars exploration', 'mars sample', 'asteroid detection',
  'asteroid deflection', 'asteroid mining', 'planetary defense',
  'planetary science', 'astrophysics', 'astronomical sciences',
  'small satellite', 'cubesat', 'satellite constellation',
  'satellite payload', 'satellite navigation', 'gps satellite',
  'microgravity',
];

const EXCLUDE_PHRASES = [
  'satellite campus', 'satellite office', 'satellite clinic',
  'satellite location', 'satellite center', 'satellite facility',
  'open space', 'space conservation', 'parking space', 'green space',
  'community space', 'gallery space', 'exhibition space', 'workspace',
  'coworking space', 'maker space', 'american spaces', 'cultural space',
  'event space', 'retail space',
];

const SPACE_AGENCIES = [
  'NASA', 'SPACE FORCE', 'SPACEWERX', 'AFWERX', 'DARPA',
  'ESA', 'EUROPEAN SPACE AGENCY', 'UK SPACE AGENCY', 'CANADIAN SPACE AGENCY',
  'JAXA', 'CNES', 'DLR', 'ISRO',
];

function isSpaceRelated(text: string, agency?: string): boolean {
  const lower = text.toLowerCase();
  if (EXCLUDE_PHRASES.some(p => lower.includes(p))) return false;
  if (SPACE_KEYWORDS.some(kw => lower.includes(kw))) return true;
  if (agency) {
    const upperAgency = agency.toUpperCase();
    if (SPACE_AGENCIES.some(a => upperAgency.includes(a))) return true;
  }
  return false;
}

async function main() {
  console.log(`clean-off-topic-funding-opportunities — ${APPLY ? 'APPLY mode (deleting)' : 'DRY RUN (pass --apply to delete)'}\n`);

  const rows = await prisma.fundingOpportunity.findMany({
    select: { id: true, title: true, description: true, agency: true, source: true },
  });
  console.log(`Total FundingOpportunity rows: ${rows.length}\n`);

  const toDelete = rows.filter((r) => {
    if (r.source === 'manual') return false; // hand-curated STATE_INCENTIVES, never auto-filtered
    return !isSpaceRelated(`${r.title} ${r.description || ''}`, r.agency);
  });

  console.log(`Rows failing the corrected filter: ${toDelete.length}\n`);
  for (const r of toDelete) {
    console.log(`  DELETE  "${r.title}" — agency: ${r.agency}, source: ${r.source}`);
  }

  if (APPLY && toDelete.length > 0) {
    const result = await prisma.fundingOpportunity.deleteMany({
      where: { id: { in: toDelete.map((r) => r.id) } },
    });
    console.log(`\nDeleted ${result.count} rows.`);
  } else if (!APPLY) {
    console.log('\nDry run only — re-run with --apply to delete.');
  }

  const remaining = await prisma.fundingOpportunity.count();
  console.log(`\nFundingOpportunity rows remaining: ${APPLY ? remaining : rows.length - toDelete.length} (currently in DB: ${remaining})`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
