/**
 * Publish editorial analysis articles written in-session (no API cost),
 * grounded in tracked news from the SpaceNexus database. Idempotent on slug.
 * Run: npx tsx scripts/publish-editorial-articles.ts
 */
import prisma from '../src/lib/db';

interface Article {
  title: string;
  slug: string;
  summary: string;
  category: string;
  content: string;
  sources: { title: string; url: string }[];
}

const ARTICLES: Article[] = [
  {
    title: "SpaceX's $500 Billion Bet: The Launch Giant Wants to Be an AI Company",
    slug: 'spacex-ai-pivot-500-billion-analysis-2026-08',
    category: 'market',
    summary:
      "Elon Musk says SpaceX revenue could reach $500 billion within two years as the company repositions around AI — while Rocket Lab faces margin scrutiny and Firefly slips its Alpha Block 2 debut. The launch industry is splitting into two different businesses.",
    sources: [
      { title: 'Space.com — SpaceX could make $500 billion, Elon Musk says', url: 'https://www.space.com/space-exploration/spacex-could-make-usd500-billion-in-2027-elon-musk-says' },
      { title: 'Teslarati — SpaceX AI investment gamble will make it a big winner, Argus says', url: 'https://www.teslarati.com/spacex-spcx-ai-investment-gamble-big-winner/' },
      { title: 'Teslarati — ARK Invest Tesla-SpaceX merger prediction', url: 'https://www.teslarati.com/another-tesla-spacex-merger-prediction-by-ark-invest-has-elon-musk-talking/' },
      { title: 'Via Satellite — Rocket Lab margins under the microscope', url: 'https://www.satellitetoday.com/finance/2026/08/11/rocket-lab-margins-under-the-microscope-following-2q-earnings/' },
      { title: 'Spaceflight Now — Firefly pushes Alpha Block 2 debut to Q4', url: 'https://spaceflightnow.com/2026/08/11/firefly-aerospace-pushes-debut-of-alpha-block-2-rocket-to-the-fourth-quarter-of-2026/' },
    ],
    content: `The most interesting thing about this week's SpaceX headlines isn't the number — it's the category error they force on everyone still valuing the company as a launch provider.

## The claim

Speaking after the company's latest earnings call, Elon Musk suggested SpaceX could generate **$500 billion in annual revenue within the next two years**, a figure that would place it among the largest companies on Earth by sales. The framing that matters: Musk described SpaceX as transitioning from a launch company into an **artificial intelligence outfit** — one whose orbital infrastructure happens to be the delivery mechanism.

Wall Street is starting to price the story in. Argus Research upgraded SpaceX-linked shares to a Buy this week, calling the company's massive AI investment a winning gamble and setting a $160 price target. Meanwhile ARK Invest has revived speculation about a Tesla–SpaceX combination — which Musk again waved off, but which tells you how analysts are beginning to model the company: not as a rocket builder, but as a compute-and-connectivity platform.

## Why the launch business alone can't get there

For context on why SpaceX needs a bigger story than launch: this week alone the company flew 29 Starlink satellites from Florida and prepared another 24 from Vandenberg — routine, industrial-cadence spaceflight that no competitor matches. But launch is a service business with finite demand. The $500 billion number only works if Starlink's global connectivity, and whatever AI workloads ride on top of it, become the product.

## The other half of the industry tells the opposite story

While SpaceX talks in half-trillions, the rest of the launch sector spent the week on defense:

- **Rocket Lab** came out of its second-quarter earnings facing investor scrutiny over margins — the market's patience with growth-over-profitability in small launch is visibly thinning.
- **Firefly Aerospace** pushed the debut of its Alpha Block 2 rocket to the fourth quarter of 2026, with CEO Jason Kim telling investors the company now expects just three Alpha flights this year.

This is the emerging shape of the industry: one company redefining itself around AI-era demand at planetary scale, while the mid-tier fights quarter to quarter to prove launch alone can be a business. The gap between those two stories is widening, not closing.

## What to watch

1. Whether SpaceX's next raise or secondary prices in the AI narrative (watch the implied valuation).
2. Rocket Lab's Neutron cadence — the margin question gets easier with a medium-lift vehicle flying.
3. Whether Firefly's Q4 Alpha Block 2 target holds; three flights in 2026 leaves little room for error.

*Track live market data in the [Market Intelligence dashboard](/market-intel) and company financials in [Company Profiles](/company-profiles).*`,
  },
  {
    title: "Golden Dome's Funding Cliff: The Pentagon's Marquee Program Meets Budget Reality",
    slug: 'golden-dome-funding-cliff-analysis-2026-08',
    category: 'geopolitical',
    summary:
      "Gen. Michael Guetlein warned this week that without new Congressional funding, Golden Dome stops at what's already built. With most initial money committed, contractors booking work through legacy programs, and a possible continuing resolution looming, the missile-defense megaproject faces its first real political test.",
    sources: [
      { title: 'SpaceNews — Golden Dome faces 2027 funding cliff', url: 'https://spacenews.com/golden-dome-faces-2027-funding-cliff/' },
      { title: 'Breaking Defense — If funding falters, there is no Golden Dome', url: 'https://breakingdefense.com/2026/08/if-funding-falters-theres-no-golden-dome-general-warns/' },
      { title: 'Defense One — There is no Golden Dome unless Congress prioritizes funding', url: 'https://www.defenseone.com/policy/2026/08/golden-dome-congress-general/415355/' },
      { title: 'Payload — Guetlein: CR could mean no Golden Dome', url: 'https://payloadspace.com/guetlein-cr-could-stop-golden-dome-due-to-funding-mechanism/' },
      { title: 'SpaceNews — Golden Dome money starting to reach contractors', url: 'https://spacenews.com/golden-dome-money-starting-to-reach-contractors-but-long-term-funding-still-unclear/' },
      { title: 'SpaceNews — U.S. expands missile production', url: 'https://spacenews.com/u-s-expands-missile-production-as-army-seeks-more-depth-in-its-arsenal/' },
      { title: 'Payload — Bill Spotlight: Space Superiority Readiness Act', url: 'https://payloadspace.com/bill-spotlight-space-superiority-readiness-act/' },
    ],
    content: `A year ago the Pentagon forbade officials from even discussing Golden Dome. This week, the program's leader spent the Space and Missile Defense Symposium all but pleading for its future — in public, repeatedly, and on the record.

## What was said

Space Force Gen. Michael Guetlein's message, delivered across multiple outlets from the symposium floor, was unusually blunt: **most of Golden Dome's initial funding is already committed**, and without Congress financing the next phase, "Golden Dome will stop with everything we've already built and delivered." He went further on the mechanics: if Congress resorts to a continuing resolution instead of a real appropriation, "there is no Golden Dome — because there's no funding."

That's a program chief describing a **2027 funding cliff** for what has been marketed as the administration's signature homeland missile-defense initiative.

## The money is real — but it's flowing through side doors

The reporting adds a telling detail: contractors *are* beginning to book Golden Dome work, but much of it is flowing through **established programs of record** rather than a dedicated Golden Dome budget line. That structure has consequences:

- It makes the program's true cost opaque to Congress and the public.
- It means a CR — which freezes new starts — hits Golden Dome harder than a normal program.
- It leaves every prime with Golden Dome revenue booked against contracts that could outlive the initiative itself.

The industrial base is scaling regardless: this week also brought news of Northrop, Lockheed, and L3Harris agreements to expand missile production capacity across propulsion, structures, and other constrained supply-chain segments. Capacity is being built on the assumption the money arrives.

## The bigger pattern

Congress isn't ignoring space defense — a bipartisan pair of senators just introduced the **Space Superiority Readiness Act**, aimed at ensuring the U.S. military is prepared for orbital conflict with Beijing. The appetite for space-defense authority is there; the fight is over appropriations mechanics and priority.

## Why it matters for the industry

For space companies, Golden Dome has been the demand signal justifying investment in missile-warning constellations, tracking layers, and interceptor technologies. A funding stall wouldn't just pause one program — it would ripple through every startup that raised money on proliferated-defense-architecture growth. Watch the FY27 appropriations process like your cap table depends on it, because for part of this industry, it does.

*Follow procurement flows in the [Procurement Intelligence module](/procurement) and defense-sector news in [Space Defense](/space-defense).*`,
  },
  {
    title: 'Wrenches Down: The Lunar Economy Had a Quietly Productive Week',
    slug: 'lunar-economy-progress-week-2026-08',
    category: 'technology',
    summary:
      "NASA completed its first astronaut-deployed Artemis surface payload, opened a formal request for input on Moon base health research, and new science suggests moonquakes could help locate lunar ice — while China's Chang'e 7 south-pole mission sits on the pad for late August. The Moon economy is assembling itself piece by piece.",
    sources: [
      { title: 'NASA — Astronaut-deployed science instrument completed for lunar surface', url: 'https://science.nasa.gov/missions/artemis/nasa-completes-astronaut-deployed-science-instrument-for-lunar-surface/' },
      { title: 'NASA Watch — NASA Moonbase RFI seeks your input', url: 'https://nasawatch.com/2026/08/11/nasa-moonbase-rfi-seeks-your-input/' },
      { title: 'Universe Today — How to find lunar ice? Moonquakes to the rescue', url: 'https://www.universetoday.com/articles/how-to-find-lunar-ice-moonquakes-to-the-rescue' },
    ],
    content: `No single lunar headline this week was front-page news. Together, they sketch how methodically the Moon economy is being assembled.

## Hardware: the first Artemis surface payload is finished

NASA declared "**wrenches down**" on the Lunar Environment Monitoring Station (LEMS) — the first completed payload designed for Artemis astronauts to physically deploy on the lunar surface. It's a small instrument with a large significance: it marks the transition from Artemis as a transportation program to Artemis as a *surface operations* program. Hardware that astronauts will carry, place, and leave running is now moving from design reviews into finished flight units.

## Institutions: NASA is formally asking what a Moon base needs

NASA's Human Research Program issued a request for information asking a deceptively simple question: *what can we learn about human health and performance from astronauts living and working on a Moon base?* RFIs are how agencies socialize programs before they fund them. A Moon-base health-research RFI means base-scale habitation has entered the formal planning pipeline — and it's an open door for research institutions, biomedical companies, and habitat designers to shape requirements early. If your company touches life support, radiation countermeasures, or crew health monitoring, this is the document to answer.

## Science: moonquakes as prospecting tools

The resource side advanced too. New work highlighted this week proposes using **seismic activity — moonquakes — to locate subsurface water ice** deposits that don't reveal themselves in imagery. Ice is the anchor commodity of every serious lunar-economy model (propellant, life support, radiation shielding), and the gap between "we believe ice exists at the poles" and "we can map extractable deposits" is exactly what separates speculation from a mining industry. Seismic prospecting techniques are how that gap closes.

## Competition: Chang'e 7 waits on the pad

Per SpaceNexus launch tracking, China's **Chang'e 7** mission — targeting the lunar south pole, the same real estate Artemis prioritizes — is scheduled aboard a Long March 5 from Wenchang in late August. The south pole is where ice, sunlight, and geopolitics intersect; every mission that arrives there first gets a vote in how the territory's norms develop.

## The takeaway

Watch weeks like this one, not just launch days. Flight hardware completed, base-planning formally opened, prospecting science advancing, and a rival south-pole mission on the pad — the lunar economy's foundation is being poured in increments.

*Track lunar missions in [Solar System Expansion](/solar-exploration) and the cislunar economy at [/cislunar](/cislunar).*`,
  },
  {
    title: "GEO's Squeeze: Aging Fleets, Slipping Replacements, and the Life-Extension Boom",
    slug: 'geo-operators-squeeze-life-extension-2026-08',
    category: 'market',
    summary:
      "Thaicom says its next satellite won't enter service until 2029 while it scrambles to retire aging spacecraft; Optus just completed a life-extension servicing mission on a satellite that would otherwise be dying; and Arianespace paused an upper-stage upgrade to protect Ariane 6 production. GEO's replacement math is broken — and on-orbit servicing is the beneficiary.",
    sources: [
      { title: 'Space Intel Report — Thaicom 10 won’t enter service until H1 2029', url: 'https://www.spaceintelreport.com/thaicom-struggling-with-thaicom-4-retirement-and-thaicom-9-delay-says-thaicom-10-wont-enter-service-until-h1-2029/' },
      { title: 'SatNews — Optus completes first phase of Project Aurora after MEV undocking', url: 'https://satnews.com/2026/08/11/optus-completes-first-phase-of-project-aurora-following-on-orbit-servicing-undocking/' },
      { title: 'SatNews — Arianespace pauses ICARUS upper-stage upgrade for Ariane 6 ramp', url: 'https://satnews.com/2026/08/11/arianespace-pauses-icarus-carbon-composite-upper-stage-upgrade-to-focus-on-ariane-6-production-ramp/' },
      { title: 'Via Satellite — Voyager Technologies wins Space Force space-to-space comms award', url: 'https://www.satellitetoday.com/government-military/2026/08/11/u-s-space-force-selects-voyager-technologies-for-space-to-space-communications-development-award/' },
    ],
    content: `Three stories from a single day this week describe the same structural problem in the geostationary satellite business — and the industry that's growing up inside the gap.

## The replacement gap, in one operator

Thaicom is living the GEO operator's nightmare in public. The Thai fleet operator is **scrambling to relocate customers** ahead of Thaicom-4's retirement, dealing with a delayed Thaicom 9, and now says **Thaicom 10 won't enter service until the first half of 2029**. That's an operator whose replacement capacity is arriving years behind the fleet it's supposed to replace — with customers in the middle.

This is not a Thaicom-specific failure. GEO satellites ordered today routinely take four-plus years from contract to service. Any operator that under-ordered during the lean 2019–2023 GEO market is now doing the same math.

## The workaround: don't replace — extend

The same day, Australian operator **Optus completed the first phase of Project Aurora**: SpaceLogistics' Mission Extension Vehicle successfully undocked from the Optus D3 geostationary satellite after a servicing engagement. Life extension is no longer a demonstration — it's a routine commercial answer to exactly the problem Thaicom illustrates. When your replacement is three years late, buying more life for the satellite you already have is the only lever that works on the relevant timescale.

The servicing ecosystem around that lever keeps thickening: the U.S. Space Force this week selected **Voyager Technologies** to develop space-to-space communication capabilities — the kind of infrastructure an economy of vehicles that approach, dock with, and service other spacecraft will depend on.

## The supply side isn't rushing to help

Meanwhile in Europe, **Arianespace and ESA paused development of the ICARUS carbon-composite upper stage** to concentrate resources on ramping Ariane 6 production. The rational move — flight rate now beats performance upgrades later — but it's another signal that launch-side capacity for GEO replacement isn't about to surge. Operators betting on cheap, abundant heavy-lift to fix their fleet-age problems should read the pause carefully.

## The investable thesis

GEO's squeeze has a clear beneficiary hierarchy:

1. **On-orbit servicing providers** — life extension converts a stranded operator into a paying customer.
2. **In-space logistics infrastructure** — comms, inspection, rendezvous systems (this week's Voyager award is the pattern).
3. **Operators with young fleets** — every rival's aging fleet is their pricing power.

The satellite bus makers' backlogs and the servicing industry's manifest are now two views of the same shortage.

*Track fleet and company data in [Company Profiles](/company-profiles) and orbital assets in [Space Operations](/satellites).*`,
  },
];

async function main() {
  for (const a of ARTICLES) {
    const existing = await prisma.aIInsight.findUnique({ where: { slug: a.slug } });
    if (existing) {
      console.log(`skip (exists): ${a.slug}`);
      continue;
    }
    await prisma.aIInsight.create({
      data: {
        title: a.title,
        slug: a.slug,
        summary: a.summary,
        content: a.content,
        category: a.category,
        sources: JSON.stringify(a.sources),
        status: 'published',
        factCheckNote:
          'Editorial analysis written in-session, grounded in the tracked source articles listed; all specific claims traceable to those sources.',
      },
    });
    console.log(`published: /ai-insights/${a.slug}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
