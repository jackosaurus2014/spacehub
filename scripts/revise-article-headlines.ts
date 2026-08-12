/** Freshness pass: re-anchor three article headlines/summaries on the week's dated events. */
import prisma from '../src/lib/db';

const REVISIONS: { slug: string; title: string; summary: string }[] = [
  {
    slug: 'golden-dome-funding-cliff-analysis-2026-08',
    title: "'There Is No Golden Dome' Without New Money, Its Own Commander Warns",
    summary:
      "After a year in which the Pentagon forbade officials from discussing Golden Dome, Gen. Michael Guetlein went on record this week — repeatedly — warning that most initial funding is committed and a continuing resolution would stop the program cold. Contractors are booking the money through legacy programs while the FY27 fight looms.",
  },
  {
    slug: 'lunar-economy-progress-week-2026-08',
    title: "Wrenches Down: NASA Finishes Its First Astronaut-Deployed Artemis Payload — and Opens the Moon-Base Question",
    summary:
      "Two dated milestones this week: NASA declared the LEMS lunar surface instrument complete — the first payload Artemis astronauts will deploy by hand — and issued a formal RFI on Moon-base health research. Add new moonquake ice-prospecting science and Chang'e 7 on the pad for late August, and the lunar economy's foundation advanced on every front at once.",
  },
  {
    slug: 'geo-operators-squeeze-life-extension-2026-08',
    title: "Thaicom Slips to 2029 as Optus Buys More Orbital Life: GEO's Replacement Math, in One Day",
    summary:
      "On the same day this week, Thaicom admitted its next satellite won't serve customers until H1 2029, Optus completed a life-extension servicing engagement on an aging spacecraft, and Arianespace paused an upper-stage upgrade to protect the Ariane 6 ramp. Three announcements, one broken replacement equation — and on-orbit servicing collecting the difference.",
  },
];

async function main() {
  for (const r of REVISIONS) {
    const updated = await prisma.aIInsight.update({
      where: { slug: r.slug },
      data: { title: r.title, summary: r.summary },
    });
    console.log(`revised: ${updated.slug}`);
    console.log(`  -> ${updated.title}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
