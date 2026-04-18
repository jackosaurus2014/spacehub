/**
 * Seed script: 6 example Investor Theses
 *
 * Usage: `npx tsx scripts/seed-investor-thesis.ts`
 *
 * Creates a seed "investor" user if none exists (email seed-investor@spacenexus.us),
 * then upserts 6 published theses keyed by slug.
 */

import prisma from '../src/lib/db';

function makeSlug(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .substring(0, 80);
}

const THESES: Array<{
  title: string;
  summary: string;
  bodyMd: string;
  sectors: string[];
  stagePreference: string | null;
  geography: string | null;
}> = [
  {
    title: 'In-space servicing: contrarian bet on Orbital Recovery Missions',
    summary:
      'LEO is getting crowded. The companies that extend satellite life via refueling, relocation, and debris removal will own a multi-billion dollar annuity. The consensus is still "too early" — that is the opportunity.',
    bodyMd: `## Thesis

In-space servicing (IOS) — refueling, inspection, relocation, and end-of-life tug services — is the most under-priced category in space right now. Launch is commoditized. Satellites are shrinking. But the installed base in LEO and GEO is now large enough that losing a $500M asset to a stuck thruster is a board-level event.

## Why now?

- Over 10,000 active satellites are on-orbit, with 5,000+ added in the last five years.
- GEO refueling demos from Orbit Fab and Astroscale are demonstrating real docking, not just paperwork.
- Defense customers are finally writing recurring servicing contracts, not just one-off demos.

## What we want to see

- Fleet-based economics: more than 3 servicers per provider, so a single mission failure is not company-ending.
- Fuel depot strategy — not just one tug, but a propellant distribution network.
- A credible path to un-subsidized commercial customers (not just USSF).

## Risks

- Docking is hard. Close approach operations remain the single biggest technical risk.
- Regulatory ambiguity around rendezvous and proximity operations (RPO).
- Insurance markets are still immature.`,
    sectors: ['in-space-servicing', 'orbital-debris', 'defense'],
    stagePreference: 'series_a',
    geography: 'US',
  },
  {
    title: "Why I'm bullish on launch-as-a-service by 2028",
    summary:
      "Launch is not a commodity — it's an infrastructure layer, and the companies building vertically integrated LaaS stacks (vehicle + integration + logistics + range) will capture more margin than a pure-launch-vehicle view suggests.",
    bodyMd: `## Thesis

The "launch is commoditized" narrative misses the point. The real product is *getting a payload to the right orbit, on schedule, with integration services bundled in*. That is a services-and-logistics business, not a commodity hardware business.

## Why now?

- Starship reusability is no longer hypothetical; cadence is on track.
- Medium-lift capacity at sub-$3,000/kg opens up entirely new mission classes.
- The bottleneck is shifting from launch *capacity* to integration, logistics, and range availability.

## What we want to see

- Proprietary integration facilities and transport fleets.
- Long-term anchor contracts from constellation operators.
- A path to serving non-US customers at scale without ITAR friction.

## Risks

- One more SpaceX generation ahead could re-commoditize everything below medium-lift.
- US Government demand is a concentration risk for early-stage LaaS players.`,
    sectors: ['launch', 'logistics'],
    stagePreference: 'series_b',
    geography: 'Global',
  },
  {
    title: 'The commercial LEO station opportunity',
    summary:
      'The post-ISS commercial LEO economy will not be one station — it will be three or four purpose-built platforms plus free-flyers. The winners will own the *customer*, not the habitat.',
    bodyMd: `## Thesis

NASA's commercial LEO destinations (CLDs) will birth a real commercial market by the end of this decade. But the value will accrue to whoever builds the *customer pipeline* — pharma, materials, national space agencies — not the hardware itself.

## Why now?

- ISS retirement creates a hard 2030 forcing function.
- Pharma R&D is quietly building microgravity pipelines.
- National agencies in UAE, India, and Europe need a platform they do not have to own.

## What we want to see

- Signed MOUs with at least 3 non-US national programs.
- In-space manufacturing customers with a real path to terrestrial revenue.
- Modular architectures that allow phased capex.

## Risks

- Certification timelines slip, and a gap year after ISS kills early revenue.
- Crew transport bottleneck persists longer than expected.`,
    sectors: ['stations', 'in-space-manufacturing', 'life-sciences'],
    stagePreference: 'growth',
    geography: 'US',
  },
  {
    title: 'Underappreciated small-sat component makers',
    summary:
      "Everyone's funding constellation operators. But the picks-and-shovels story — reaction wheels, star trackers, propulsion modules — is where gross margins and defensibility actually live.",
    bodyMd: `## Thesis

In a gold rush, sell picks. The small-sat boom has produced a dozen high-quality component vendors with 60%+ gross margins, qualified hardware, and a growing flight heritage — yet they trade at 1/3 the multiple of the constellation operators that depend on them.

## Why now?

- Constellation operators are consolidating suppliers after supply-chain scares in 2023-2025.
- Flight heritage is a moat that compounds year over year.
- Defense demand for hardened parts is creating a premium tier.

## What we want to see

- >30% gross margins.
- 2+ independent anchor customers.
- Clear roadmap to higher-value subsystems (not just widgets).

## Risks

- Vertical integration by large operators (e.g. "why buy a reaction wheel when we can build it").
- Export controls can cut off 30% of TAM overnight.`,
    sectors: ['components', 'supply-chain', 'defense'],
    stagePreference: 'seed',
    geography: 'US',
  },
  {
    title: 'Lunar economy moat: where value accrues',
    summary:
      "The lunar economy is real, but the value will not accrue evenly. Communications relays, positioning, and surface power are the 'TCP/IP' layers — own one of those and you own the decade.",
    bodyMd: `## Thesis

The lunar economy — NASA Artemis, CLPS landers, commercial rovers, eventual ISRU — will grow 10x this decade. But most of the economic value will accrue not to the lander companies but to the *infrastructure layer*: comms, PNT, and power.

## Why now?

- NASA LunaNet and ESA Moonlight are funding comms relay infrastructure right now.
- CLPS cadence is ramping from 2 to 5+ missions per year.
- Starship HLS cargo flights open up the surface power opportunity.

## What we want to see

- Long-term NASA/ESA contracts, not just study awards.
- A multi-customer roadmap (not just Artemis program dependency).
- Technical architecture that works pre- and post- Starship HLS.

## Risks

- Program slips — Artemis III and IV both at risk of multi-year delays.
- Competition from national programs (China, India) with non-commercial pricing.`,
    sectors: ['lunar', 'communications', 'pnt'],
    stagePreference: 'series_a',
    geography: 'Global',
  },
  {
    title: 'The defense-tech dual-use thesis',
    summary:
      'The best space-tech companies of the next decade will be dual-use by default — building for commercial economics but with defense-grade hardening. Pure-commercial and pure-defense both lose.',
    bodyMd: `## Thesis

The space sector bifurcated between "commercial" and "defense" for the last 20 years. That era is ending. The winners of the 2025-2030 cohort will be dual-use: priced like commercial, hardened like defense, sold to both.

## Why now?

- DoD and allied agencies are explicitly buying commercial capability (Proliferated Warfighter, SDA).
- Commercial LEO customers want the resilience defense customers demand.
- Investor appetite for defense-adjacent companies has never been higher.

## What we want to see

- Revenue from both commercial and government customers — neither greater than 70%.
- A founding team that understands acquisition cycles.
- Product architecture that does not require ITAR lockdown for commercial sales.

## Risks

- Execution complexity — dual-use is *harder*, not easier.
- ITAR / export control overhead can crush commercial velocity.
- Political risk: defense budgets are cyclical.`,
    sectors: ['defense', 'dual-use', 'national-security'],
    stagePreference: 'series_a',
    geography: 'US',
  },
];

async function getOrCreateSeedInvestorUser(): Promise<string> {
  const email = 'seed-investor@spacenexus.us';
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    // Make sure the user has the investor badge so the UI renders correctly.
    if (existing.verifiedBadge !== 'investor') {
      await prisma.user.update({
        where: { id: existing.id },
        data: { verifiedBadge: 'investor' },
      });
    }
    return existing.id;
  }
  const created = await prisma.user.create({
    data: {
      email,
      name: 'SpaceNexus Research Desk',
      password: 'seed-only-not-used-for-login',
      verifiedBadge: 'investor',
    },
  });
  return created.id;
}

async function main() {
  console.log('Seeding investor theses...');

  const authorUserId = await getOrCreateSeedInvestorUser();
  console.log(`Using author user id: ${authorUserId}`);

  let created = 0;
  let updated = 0;

  for (const t of THESES) {
    const slug = makeSlug(t.title);
    const existing = await prisma.investorThesis.findUnique({ where: { slug } });
    if (existing) {
      await prisma.investorThesis.update({
        where: { id: existing.id },
        data: {
          title: t.title,
          summary: t.summary,
          bodyMd: t.bodyMd,
          sectors: t.sectors,
          stagePreference: t.stagePreference,
          geography: t.geography,
          publishedAt: existing.publishedAt ?? new Date(),
        },
      });
      updated += 1;
    } else {
      await prisma.investorThesis.create({
        data: {
          slug,
          authorUserId,
          title: t.title,
          summary: t.summary,
          bodyMd: t.bodyMd,
          sectors: t.sectors,
          stagePreference: t.stagePreference,
          geography: t.geography,
          publishedAt: new Date(),
        },
      });
      created += 1;
    }
  }

  console.log(`Done. Created: ${created}, updated: ${updated}.`);
}

main()
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
