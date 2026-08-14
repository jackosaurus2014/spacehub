/**
 * One-time backfill: migrate the legacy hardcoded brief content into the new
 * DB-backed PublishedBrief table (prisma/schema.prisma), and mirror the
 * weekly economy/hiring AIInsight rows that already exist in production.
 *
 * Idempotent — safe to re-run (upserts by slug).
 *
 * Sources migrated:
 *   1. The `BRIEFS` array hardcoded in src/app/intelligence-brief/page.tsx
 *      (4 historic weekly-intelligence briefs) → briefType 'weekly_intelligence'.
 *      NOTE: src/app/newsletter-archive/page.tsx currently has NO separate
 *      hardcoded past-briefs array (its "Past Editions" section is just
 *      explanatory text pointing at /ai-insights) — nothing to migrate there.
 *   2. Existing AIInsight rows whose slug starts with
 *      'state-of-the-space-economy' (briefType 'economy') or 'whos-hiring'
 *      (briefType 'hiring') — mirrored via the same upsert helper the weekly
 *      crons now call going forward (src/lib/published-briefs.ts).
 *
 * Run (after `npx prisma db push` has created the PublishedBrief table):
 *   npx tsx scripts/backfill-published-briefs.ts
 */
import prisma from '@/lib/db';
import { mirrorInsightAsBrief, type BriefType } from '@/lib/published-briefs';

// ─── 1. Legacy hardcoded weekly-intelligence briefs ──────────────────────────
// Mirrors the BRIEFS array in src/app/intelligence-brief/page.tsx verbatim
// (data only — that file also owns the React rendering, which now reads
// from the DB instead once this backfill has run).

interface BriefSection {
  category: string;
  icon: string;
  headline: string;
  details: string[];
}

interface LegacyWeeklyBrief {
  id: string;
  weekOf: string;
  dateRange: string;
  topStory: { headline: string; summary: string };
  sections: BriefSection[];
  keyTakeaway: string;
}

const LEGACY_INTELLIGENCE_BRIEFS: LegacyWeeklyBrief[] = [
  {
    id: 'aug-10-2026',
    weekOf: 'August 10, 2026',
    dateRange: 'Aug 10 - Aug 16',
    topStory: {
      headline: 'Rocket Lab Posts Record Quarter as $8B Iridium Deal Reshapes the Sector',
      summary: 'Rocket Lab\'s August 10 investor update paired record Q2 revenue of $234M (up 62% YoY) and a record $2.36B backlog with the June agreement to acquire Iridium for $54/share — roughly $8B in enterprise value, expected to close mid-2027. Shares still fell as Q3 margin guidance reflected peak Neutron first-flight spending; the rocket remains on track for pad delivery in Q4 2026.',
    },
    sections: [
      { category: 'Market', icon: '📊', headline: 'SpaceX Priced Like an AI Company; the Mid-Tier Gets Margin Questions', details: ['Argus Research upgraded SpaceX-linked shares to Buy with a $160 target after Elon Musk projected $500B in annual revenue within roughly two years', 'Rocket Lab (RKLB) fell post-earnings despite record revenue as Neutron first-flight spending pressured Q3 margin guidance', 'Firefly Aerospace (FLY) pushed its Alpha Block 2 debut to Q4 2026 and now expects just three Alpha flights this year'] },
      { category: 'Launches', icon: '🚀', headline: 'SpaceX Reaches 93 Falcon Flights for the Year', details: ['Starlink 17-38 from Vandenberg on Aug 8 was SpaceX\'s 50th West Coast launch of 2026', 'Starlink 10-19 from Cape Canaveral on Aug 11 was the year\'s 93rd Falcon 9 flight and 72nd Starlink mission', 'Starship\'s first orbital Starlink V3 deployment attempt is targeted for late August from Starbase'] },
      { category: 'Regulatory', icon: '⚖️', headline: 'Golden Dome Faces a 2027 Funding Cliff', details: ['Gen. Michael Guetlein warned that most of Golden Dome\'s initial funding is already committed — and that under a continuing resolution "there is no Golden Dome"', 'Contractors are booking Golden Dome work largely through existing programs of record, keeping the program\'s true cost opaque to Congress', 'A bipartisan Space Superiority Readiness Act was introduced to ensure US military readiness for orbital conflict'] },
      { category: 'Lunar', icon: '🌕', headline: 'A Quietly Productive Week for the Moon Economy', details: ['NASA declared "wrenches down" on LEMS — the first completed science payload designed for Artemis astronauts to deploy on the lunar surface', 'NASA opened a formal request for input on Moon base health and research needs', 'New research suggests moonquake seismology could help locate lunar ice deposits'] },
    ],
    keyTakeaway: 'The launch industry is splitting into two different businesses. One company is being underwritten as an AI-era platform; the rest are being asked about gross margins. Rocket Lab\'s answer — buy Iridium and bolt recurring communications revenue onto the launch stack — is the boldest response yet, and the template rivals will now be measured against.',
  },
  {
    id: 'feb-17-2026',
    weekOf: 'February 17, 2026',
    dateRange: 'Feb 17 - Feb 23',
    topStory: {
      headline: 'Starship Achieves Rapid Reusability Milestone',
      summary: 'SpaceX successfully launched and recovered a Starship booster within 48 hours of its previous flight, marking the fastest turnaround for the Super Heavy vehicle. At the time, the company said it aimed for weekly cadence by Q3 2026. (Update, August 2026: weekly Starship cadence has not yet been reached — the program\'s next milestone is a first orbital Starlink V3 deployment attempt in late August.)',
    },
    sections: [
      { category: 'Funding', icon: '💰', headline: '3 Notable Rounds This Week', details: ['Impulse Space raises $175M Series C for orbital transfer vehicles', 'Muon Space closes $45M Series A for climate monitoring satellites', 'Astroforge secures $25M for asteroid mining proof-of-concept mission'] },
      { category: 'Launches', icon: '🚀', headline: '5 Launches This Week (3 SpaceX, 1 China, 1 Rocket Lab)', details: ['SpaceX Starlink Group 12-4 from Cape Canaveral (60 sats)', 'SpaceX Starlink Group 12-5 from Vandenberg (60 sats)', 'SpaceX Transporter-13 rideshare (42 customer payloads)', 'CZ-2D from Jiuquan (YG-40 reconnaissance constellation)', 'Electron "Data With Destiny" from Mahia (HawkEye 360 cluster)'] },
      { category: 'Regulatory', icon: '⚖️', headline: 'FCC Approves New Ka-Band Allocation', details: ['New 2GHz allocation in 27.5-28.35 GHz for NGSO systems', 'Expected to benefit Starlink Gen2 and Amazon Kuiper', 'SpaceX and SES filed comments supporting the expansion'] },
      { category: 'Personnel', icon: '👤', headline: '2 Executive Moves', details: ['Former Blue Origin VP of Mission Operations joins Axiom Space as SVP', 'L3Harris appoints new President of Space & Airborne Systems division'] },
      { category: 'Market', icon: '📊', headline: 'Space Sector Index Up 2.3%', details: ['Rocket Lab (RKLB) up 8.1% on strong Q4 earnings beat', 'Planet Labs (PL) up 4.2% on new defense contract', 'AST SpaceMobile (ASTS) down 3.5% on dilution concerns'] },
    ],
    keyTakeaway: 'Starship rapid reusability changes the economics of everything. At weekly cadence, cost-per-kg to LEO could drop below $100 -- disrupting the entire launch industry and enabling new business models in orbital manufacturing, debris removal, and mega-constellation deployment.',
  },
  {
    id: 'feb-10-2026',
    weekOf: 'February 10, 2026',
    dateRange: 'Feb 10 - Feb 16',
    topStory: {
      headline: 'Artemis II Crew Completes Final Training Milestone',
      summary: 'NASA announced the four-person Artemis II crew had completed their final integrated training exercise, including a full mission simulation. (Update: Artemis II launched from Kennedy Space Center on April 1, 2026 and splashed down April 10 after a successful nine-day lunar flyby — the first crewed flight beyond low Earth orbit since Apollo. SpaceNexus\'s live mission coverage is archived.)',
    },
    sections: [
      { category: 'Funding', icon: '💰', headline: 'Relativity Space Closes $200M Growth Round', details: ['Relativity Space raises $200M at $4.2B valuation for Terran R development', 'True Anomaly raises $100M Series B for space domain awareness', 'Inversion Space raises $20M Seed for Earth re-entry capsule delivery'] },
      { category: 'Launches', icon: '🚀', headline: '4 Launches (2 SpaceX, 1 ULA, 1 Arianespace)', details: ['SpaceX Starlink Group 12-3 from Cape Canaveral', 'SpaceX CRS-32 ISS resupply from Kennedy Space Center', 'ULA Vulcan Centaur carries NRO payload from Vandenberg', 'Ariane 6 commercial debut carries 2 GEO commsats from Kourou'] },
      { category: 'Regulatory', icon: '⚖️', headline: 'EU Proposes Space Traffic Management Framework', details: ['European Commission publishes draft regulation for STM', 'Would require all EU-licensed satellites to carry tracking beacons', 'Industry reaction mixed -- concerns about cost burden on smallsat operators'] },
      { category: 'Personnel', icon: '👤', headline: 'New Leadership at Aerojet Rocketdyne Division', details: ['L3Harris names new President of Aerojet Rocketdyne division', 'Replaces interim leadership following 2023 acquisition integration'] },
      { category: 'Market', icon: '📊', headline: 'Satellite Stocks Rally on Earnings', details: ['SES up 6.3% after beating revenue estimates on O3b mPOWER demand', 'Iridium up 3.8% on IoT subscriber growth (+22% YoY)', 'Maxar Technologies flat after mixed guidance for 2026'] },
    ],
    keyTakeaway: 'The Ariane 6 commercial debut is a crucial milestone for European launch autonomy. With Russia no longer available and heavy reliance on SpaceX, Europe needs an independent path to orbit. Watch for pricing competitiveness vs. Falcon 9.',
  },
  {
    id: 'feb-03-2026',
    weekOf: 'February 3, 2026',
    dateRange: 'Feb 3 - Feb 9',
    topStory: {
      headline: 'Amazon Launches First Kuiper Production Satellites',
      summary: 'Amazon successfully deployed the first batch of 60 production Kuiper satellites aboard a ULA Atlas V, beginning the build-out of its 3,236-satellite broadband constellation. Service is expected to begin in late 2026.',
    },
    sections: [
      { category: 'Funding', icon: '💰', headline: '2 Seed Rounds in Debris Removal', details: ['ClearSpace raises $30M to fund ClearSpace-2 mission targeting defunct ESA satellite', 'Neumann Space raises $12M for in-orbit refueling and debris management'] },
      { category: 'Launches', icon: '🚀', headline: '6 Launches (4 SpaceX, 1 China, 1 India)', details: ['SpaceX Starlink (3 missions) from Cape Canaveral and Vandenberg', 'SpaceX launches Kuiper batch on contract from ULA', 'CZ-7A carries Tianzhou cargo to CSS from Wenchang', 'ISRO PSLV carries 7 international smallsats from Sriharikota'] },
      { category: 'Regulatory', icon: '⚖️', headline: 'ITAR Reform Bill Introduced in Senate', details: ['Bipartisan bill would streamline ITAR licensing for allied nations', 'Would create "trusted partner" fast-track for Five Eyes + Japan + EU', 'Industry groups strongly support -- current process takes 6-12 months'] },
      { category: 'Personnel', icon: '👤', headline: 'SpaceX VP Moves to Blue Origin', details: ['SpaceX VP of Starlink Engineering departs for Blue Origin as SVP of Project Kuiper competitor response', 'Marks third senior SpaceX departure to Blue Origin in 2026'] },
      { category: 'Market', icon: '📊', headline: 'Launch Provider Stocks Mixed', details: ['Rocket Lab (RKLB) up 2.1% on Neutron development update', 'Virgin Orbit (VORB) delisted after Chapter 11 proceedings', 'Astra Space (ASTR) down 12% on going-concern warning'] },
    ],
    keyTakeaway: 'Amazon entering the LEO broadband race with production Kuiper satellites will intensify competition with Starlink. Watch for pricing wars and government contract battles, especially in underserved markets where both systems will compete for rural broadband subsidies.',
  },
];

function legacyBriefToMarkdown(brief: LegacyWeeklyBrief): string {
  const lines: string[] = [];
  lines.push(`*Week of ${brief.weekOf} (${brief.dateRange})*`);
  lines.push('');
  lines.push(`## Top Story: ${brief.topStory.headline}`);
  lines.push('');
  lines.push(brief.topStory.summary);
  lines.push('');
  for (const section of brief.sections) {
    lines.push(`## ${section.icon} ${section.category}: ${section.headline}`);
    lines.push('');
    for (const detail of section.details) lines.push(`- ${detail}`);
    lines.push('');
  }
  lines.push('## Key Takeaway');
  lines.push('');
  lines.push(brief.keyTakeaway);
  return lines.join('\n');
}

async function backfillLegacyIntelligenceBriefs(): Promise<{ created: number; updated: number; skipped: number }> {
  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const brief of LEGACY_INTELLIGENCE_BRIEFS) {
    const publishedAt = new Date(brief.weekOf);
    if (Number.isNaN(publishedAt.getTime())) {
      console.warn(`Skipping "${brief.id}" — unparseable weekOf date "${brief.weekOf}"`);
      skipped++;
      continue;
    }

    const existing = await prisma.publishedBrief.findUnique({ where: { slug: brief.id } });
    await prisma.publishedBrief.upsert({
      where: { slug: brief.id },
      create: {
        slug: brief.id,
        title: brief.topStory.headline,
        briefType: 'weekly_intelligence' satisfies BriefType,
        summary: brief.topStory.summary,
        contentMd: legacyBriefToMarkdown(brief),
        publishedAt,
      },
      update: {
        title: brief.topStory.headline,
        summary: brief.topStory.summary,
        contentMd: legacyBriefToMarkdown(brief),
        publishedAt,
      },
    });

    if (existing) updated++;
    else created++;
  }

  return { created, updated, skipped };
}

// ─── 2. Mirror existing weekly economy/hiring AIInsight rows ────────────────

async function backfillAIInsightMirrors(): Promise<{ mirrored: number; failed: number }> {
  const rows = await prisma.aIInsight.findMany({
    where: {
      OR: [
        { slug: { startsWith: 'state-of-the-space-economy' } },
        { slug: { startsWith: 'whos-hiring' } },
      ],
    },
    select: { id: true, slug: true, title: true, summary: true, content: true, generatedAt: true },
  });

  let mirrored = 0;
  let failed = 0;

  for (const row of rows) {
    const briefType: BriefType = row.slug.startsWith('whos-hiring') ? 'hiring' : 'economy';
    const ok = await mirrorInsightAsBrief({
      id: row.id,
      slug: row.slug,
      title: row.title,
      summary: row.summary,
      content: row.content,
      publishedAt: row.generatedAt,
      briefType,
    });
    if (ok) mirrored++;
    else failed++;
  }

  return { mirrored, failed };
}

// ─── Runner ───────────────────────────────────────────────────────────────────

async function main() {
  console.log('Backfilling legacy intelligence-brief entries into PublishedBrief...');
  const legacy = await backfillLegacyIntelligenceBriefs();
  console.log(`  weekly_intelligence: ${legacy.created} created, ${legacy.updated} updated, ${legacy.skipped} skipped`);

  console.log('Mirroring existing weekly economy/hiring AIInsight rows into PublishedBrief...');
  const mirrors = await backfillAIInsightMirrors();
  console.log(`  economy/hiring mirrors: ${mirrors.mirrored} upserted, ${mirrors.failed} failed`);

  if (mirrors.failed > 0) {
    console.warn('Some AIInsight mirrors failed — re-run this script after investigating (upsert is idempotent).');
  }

  console.log('Done.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
