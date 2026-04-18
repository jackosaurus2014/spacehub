/**
 * Seed script for SpaceHistoryEvent.
 *
 * Run with: npx tsx scripts/seed-space-history.ts
 *
 * Safe to re-run: upserts by slug.
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

type Cat = 'launch' | 'landing' | 'mission' | 'discovery' | 'policy' | 'milestone';

interface Seed {
  slug: string;
  title: string;
  description: string;
  eventDate: string; // ISO yyyy-mm-dd
  category: Cat;
  featured?: boolean;
  imageUrl?: string | null;
  sourceUrls?: string[];
}

function monthDayFromIso(iso: string): string {
  const d = new Date(iso + 'T00:00:00Z');
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${m}-${day}`;
}

function yearFromIso(iso: string): number {
  return new Date(iso + 'T00:00:00Z').getUTCFullYear();
}

const SEED: Seed[] = [
  // --- Early Space Age ---
  {
    slug: 'sputnik-1-launch-1957',
    title: 'Sputnik 1 — The first artificial satellite',
    description:
      "The Soviet Union launched Sputnik 1, Earth's first artificial satellite, marking the beginning of the Space Age and igniting the Space Race.",
    eventDate: '1957-10-04',
    category: 'launch',
    featured: true,
    sourceUrls: ['https://www.nasa.gov/history/sputnik/'],
  },
  {
    slug: 'laika-sputnik-2-1957',
    title: 'Laika becomes the first animal in orbit',
    description:
      'Aboard Sputnik 2, the Soviet dog Laika became the first living creature to orbit the Earth, paving the way for human spaceflight.',
    eventDate: '1957-11-03',
    category: 'mission',
    sourceUrls: ['https://www.nasa.gov/history/'],
  },
  {
    slug: 'explorer-1-launch-1958',
    title: 'Explorer 1 — First US satellite launched',
    description:
      'The United States launched its first satellite, Explorer 1, which discovered the Van Allen radiation belts around Earth.',
    eventDate: '1958-01-31',
    category: 'launch',
    sourceUrls: ['https://www.jpl.nasa.gov/missions/explorer-1'],
  },
  {
    slug: 'nasa-established-1958',
    title: 'NASA is established',
    description:
      'President Dwight D. Eisenhower signed the National Aeronautics and Space Act of 1958, establishing NASA on July 29, 1958.',
    eventDate: '1958-07-29',
    category: 'policy',
    sourceUrls: ['https://www.nasa.gov/history/'],
  },
  {
    slug: 'gagarin-vostok-1-1961',
    title: 'Yuri Gagarin becomes the first human in space',
    description:
      'Soviet cosmonaut Yuri Gagarin completed a single orbit of Earth aboard Vostok 1, becoming the first human in space.',
    eventDate: '1961-04-12',
    category: 'milestone',
    featured: true,
    sourceUrls: ['https://www.nasa.gov/history/'],
  },
  {
    slug: 'shepard-freedom-7-1961',
    title: 'Alan Shepard — First American in space',
    description:
      'Alan Shepard flew a suborbital Mercury-Redstone flight aboard Freedom 7, becoming the first American in space.',
    eventDate: '1961-05-05',
    category: 'mission',
    sourceUrls: ['https://www.nasa.gov/mission/mercury-redstone-3/'],
  },
  {
    slug: 'kennedy-moon-speech-1961',
    title: 'Kennedy sets the Moon goal before Congress',
    description:
      'President John F. Kennedy announced the goal of landing an American on the Moon and returning safely before the decade ended.',
    eventDate: '1961-05-25',
    category: 'policy',
    sourceUrls: ['https://www.nasa.gov/history/'],
  },
  {
    slug: 'glenn-friendship-7-1962',
    title: 'John Glenn orbits the Earth',
    description:
      'John Glenn became the first American to orbit Earth, making three orbits aboard the Mercury capsule Friendship 7.',
    eventDate: '1962-02-20',
    category: 'milestone',
    sourceUrls: ['https://www.nasa.gov/mission/mercury-atlas-6/'],
  },
  {
    slug: 'tereshkova-vostok-6-1963',
    title: 'Valentina Tereshkova — First woman in space',
    description:
      'Soviet cosmonaut Valentina Tereshkova launched aboard Vostok 6 and became the first woman to fly in space.',
    eventDate: '1963-06-16',
    category: 'milestone',
    sourceUrls: ['https://www.nasa.gov/history/'],
  },
  {
    slug: 'leonov-first-spacewalk-1965',
    title: 'Alexei Leonov performs the first spacewalk',
    description:
      'Cosmonaut Alexei Leonov left the Voskhod 2 capsule for 12 minutes, becoming the first human to perform a spacewalk.',
    eventDate: '1965-03-18',
    category: 'milestone',
    sourceUrls: ['https://www.nasa.gov/history/'],
  },
  {
    slug: 'apollo-1-fire-1967',
    title: 'Apollo 1 cabin fire',
    description:
      'A cabin fire during a launch rehearsal for Apollo 1 killed astronauts Gus Grissom, Ed White, and Roger Chaffee.',
    eventDate: '1967-01-27',
    category: 'mission',
    sourceUrls: ['https://www.nasa.gov/mission/apollo-1/'],
  },
  {
    slug: 'apollo-8-launch-1968',
    title: 'Apollo 8 — First crewed mission to orbit the Moon',
    description:
      'Apollo 8 launched Frank Borman, Jim Lovell, and Bill Anders to lunar orbit, where they delivered the Christmas Eve broadcast and captured Earthrise.',
    eventDate: '1968-12-21',
    category: 'launch',
    sourceUrls: ['https://www.nasa.gov/mission/apollo-8/'],
  },
  {
    slug: 'apollo-11-launch-1969',
    title: 'Apollo 11 launches from Kennedy Space Center',
    description:
      'Apollo 11 lifted off atop a Saturn V rocket, beginning the mission that would land humans on the Moon for the first time.',
    eventDate: '1969-07-16',
    category: 'launch',
    featured: true,
    sourceUrls: ['https://www.nasa.gov/mission/apollo-11/'],
  },
  {
    slug: 'apollo-11-moon-landing-1969',
    title: 'Neil Armstrong and Buzz Aldrin walk on the Moon',
    description:
      "Apollo 11's Lunar Module Eagle landed in the Sea of Tranquility. Neil Armstrong stepped onto the lunar surface, followed by Buzz Aldrin.",
    eventDate: '1969-07-20',
    category: 'landing',
    featured: true,
    sourceUrls: ['https://www.nasa.gov/mission/apollo-11/'],
  },
  {
    slug: 'apollo-13-explosion-1970',
    title: 'Apollo 13 oxygen tank explosion',
    description:
      "Apollo 13's Service Module oxygen tank ruptured en route to the Moon. NASA and the crew turned the lunar lander into a lifeboat and returned safely.",
    eventDate: '1970-04-13',
    category: 'mission',
    sourceUrls: ['https://www.nasa.gov/mission/apollo-13/'],
  },
  {
    slug: 'apollo-17-last-moonwalk-1972',
    title: 'Apollo 17 astronauts leave the Moon',
    description:
      'Gene Cernan and Harrison Schmitt concluded the final Apollo lunar surface mission, the last time humans walked on the Moon to date.',
    eventDate: '1972-12-14',
    category: 'milestone',
    sourceUrls: ['https://www.nasa.gov/mission/apollo-17/'],
  },

  // --- Skylab & early Shuttle ---
  {
    slug: 'skylab-launch-1973',
    title: 'Skylab — First US space station launched',
    description:
      "Skylab launched atop the final Saturn V rocket. Three crews performed 171 days of science aboard America's first space station.",
    eventDate: '1973-05-14',
    category: 'launch',
    sourceUrls: ['https://www.nasa.gov/mission/skylab/'],
  },
  {
    slug: 'viking-1-mars-landing-1976',
    title: 'Viking 1 lands on Mars',
    description:
      "NASA's Viking 1 became the first successful US landing on Mars, transmitting the first high-resolution images from the Martian surface.",
    eventDate: '1976-07-20',
    category: 'landing',
    sourceUrls: ['https://www.nasa.gov/mission/viking-1/'],
  },
  {
    slug: 'voyager-1-launch-1977',
    title: 'Voyager 1 launched',
    description:
      'Voyager 1 launched on a Titan IIIE rocket to explore the outer planets. It later became the first human-made object to enter interstellar space.',
    eventDate: '1977-09-05',
    category: 'launch',
    sourceUrls: ['https://www.jpl.nasa.gov/missions/voyager-1/'],
  },
  {
    slug: 'sts-1-columbia-launch-1981',
    title: 'STS-1 — Space Shuttle Columbia first launch',
    description:
      'Space Shuttle Columbia launched on its maiden voyage (STS-1) with John Young and Robert Crippen, beginning the 30-year Shuttle era.',
    eventDate: '1981-04-12',
    category: 'launch',
    sourceUrls: ['https://www.nasa.gov/mission/sts-1/'],
  },
  {
    slug: 'sally-ride-sts-7-1983',
    title: 'Sally Ride becomes the first American woman in space',
    description:
      'Aboard STS-7, Sally Ride became the first American woman and the third woman to travel to space.',
    eventDate: '1983-06-18',
    category: 'milestone',
    sourceUrls: ['https://www.nasa.gov/mission/sts-7/'],
  },
  {
    slug: 'challenger-disaster-1986',
    title: 'Space Shuttle Challenger disaster',
    description:
      'Space Shuttle Challenger broke apart 73 seconds after launch, killing all seven crew members including teacher Christa McAuliffe.',
    eventDate: '1986-01-28',
    category: 'mission',
    featured: true,
    sourceUrls: ['https://www.nasa.gov/challenger/'],
  },
  {
    slug: 'voyager-pale-blue-dot-1990',
    title: 'Voyager 1 captures the "Pale Blue Dot"',
    description:
      'From 6 billion kilometers away, Voyager 1 photographed Earth as a tiny pale blue dot in a sunbeam, at the request of Carl Sagan.',
    eventDate: '1990-02-14',
    category: 'discovery',
    sourceUrls: ['https://www.jpl.nasa.gov/images/pia00452-solar-system-portrait-earth-as-pale-blue-dot'],
  },
  {
    slug: 'hubble-launch-1990',
    title: 'Hubble Space Telescope launched',
    description:
      'Space Shuttle Discovery (STS-31) deployed the Hubble Space Telescope into low Earth orbit, revolutionizing astronomy.',
    eventDate: '1990-04-24',
    category: 'launch',
    sourceUrls: ['https://www.nasa.gov/mission/hubble-space-telescope/'],
  },
  {
    slug: 'mae-jemison-sts-47-1992',
    title: 'Mae Jemison becomes first African American woman in space',
    description:
      'Mae Jemison launched aboard STS-47 on Space Shuttle Endeavour, becoming the first African American woman in space.',
    eventDate: '1992-09-12',
    category: 'milestone',
    sourceUrls: ['https://www.nasa.gov/mission/sts-47/'],
  },
  {
    slug: 'mars-pathfinder-landing-1997',
    title: 'Mars Pathfinder lands on Mars',
    description:
      'Mars Pathfinder touched down in Ares Vallis and deployed the Sojourner rover — the first successful rover on another planet.',
    eventDate: '1997-07-04',
    category: 'landing',
    sourceUrls: ['https://www.jpl.nasa.gov/missions/mars-pathfinder/'],
  },
  {
    slug: 'iss-zarya-launch-1998',
    title: 'Zarya — first ISS module launched',
    description:
      'The Russian-built Zarya control module launched on a Proton rocket, becoming the first component of the International Space Station.',
    eventDate: '1998-11-20',
    category: 'launch',
    sourceUrls: ['https://www.nasa.gov/international-space-station/'],
  },
  {
    slug: 'columbia-disaster-2003',
    title: 'Space Shuttle Columbia disaster',
    description:
      'Space Shuttle Columbia broke apart during reentry over Texas, killing all seven crew members aboard STS-107.',
    eventDate: '2003-02-01',
    category: 'mission',
    featured: true,
    sourceUrls: ['https://www.nasa.gov/columbia/'],
  },
  {
    slug: 'spirit-landing-2004',
    title: 'Spirit rover lands on Mars',
    description:
      "NASA's Mars Exploration Rover Spirit landed in Gusev Crater, beginning a mission that far exceeded its 90-day design life.",
    eventDate: '2004-01-04',
    category: 'landing',
    sourceUrls: ['https://mars.nasa.gov/mer/'],
  },
  {
    slug: 'hubble-ultra-deep-field-2004',
    title: 'Hubble Ultra-Deep Field released',
    description:
      "NASA released the Hubble Ultra-Deep Field — one of the deepest views of the universe ever taken, revealing ~10,000 galaxies.",
    eventDate: '2004-03-09',
    category: 'discovery',
    sourceUrls: ['https://hubblesite.org/contents/media/images/2004/07/1471-Image.html'],
  },
  {
    slug: 'kepler-launch-2009',
    title: 'Kepler Space Telescope launched',
    description:
      'NASA launched the Kepler Space Telescope to search for Earth-size exoplanets. It confirmed more than 2,600 planets over its mission.',
    eventDate: '2009-03-07',
    category: 'launch',
    sourceUrls: ['https://www.nasa.gov/mission/kepler/'],
  },

  // --- Commercial firsts ---
  {
    slug: 'dragon-crs-1-launch-2012',
    title: 'SpaceX Dragon CRS-1 launches',
    description:
      'Dragon CRS-1 launched on Falcon 9 — the first fully operational commercial cargo delivery to the International Space Station.',
    eventDate: '2012-10-07',
    category: 'launch',
    sourceUrls: ['https://www.nasa.gov/mission/spacex-crs-1/'],
  },
  {
    slug: 'curiosity-mars-landing-2012',
    title: 'Curiosity rover lands on Mars',
    description:
      "NASA's Curiosity rover landed in Gale Crater using the revolutionary sky crane system, beginning the Mars Science Laboratory mission.",
    eventDate: '2012-08-06',
    category: 'landing',
    featured: true,
    sourceUrls: ['https://mars.nasa.gov/msl/'],
  },
  {
    slug: 'falcon-9-first-reuse-2017',
    title: 'SpaceX flies a reused Falcon 9 booster',
    description:
      'SpaceX launched SES-10 on a Falcon 9 first stage previously flown on CRS-8 — the first orbital-class rocket booster reuse.',
    eventDate: '2017-03-30',
    category: 'milestone',
    sourceUrls: ['https://www.spacex.com/'],
  },
  {
    slug: 'falcon-heavy-demo-2018',
    title: 'Falcon Heavy demonstration flight',
    description:
      'SpaceX launched Falcon Heavy on its maiden flight, sending a Tesla Roadster toward Mars orbit and recovering two of three boosters.',
    eventDate: '2018-02-06',
    category: 'launch',
    sourceUrls: ['https://www.spacex.com/'],
  },
  {
    slug: 'new-horizons-arrokoth-2019',
    title: 'New Horizons flies past Arrokoth',
    description:
      'NASA\'s New Horizons spacecraft flew past Kuiper Belt object Arrokoth (2014 MU69), the most distant object ever visited.',
    eventDate: '2019-01-01',
    category: 'mission',
    sourceUrls: ['https://www.nasa.gov/mission/new-horizons/'],
  },
  {
    slug: 'crew-dragon-demo-2-2020',
    title: 'Crew Dragon Demo-2 — first commercial crew launch',
    description:
      'SpaceX Crew Dragon Demo-2 launched Bob Behnken and Doug Hurley to the ISS, the first crewed orbital flight from US soil since 2011.',
    eventDate: '2020-05-30',
    category: 'launch',
    featured: true,
    sourceUrls: ['https://www.nasa.gov/mission/spacex-demo-2/'],
  },
  {
    slug: 'perseverance-mars-landing-2021',
    title: 'Perseverance rover lands on Mars',
    description:
      'NASA\'s Perseverance rover landed in Jezero Crater, carrying the Ingenuity helicopter and instruments to search for signs of ancient life.',
    eventDate: '2021-02-18',
    category: 'landing',
    sourceUrls: ['https://mars.nasa.gov/mars2020/'],
  },
  {
    slug: 'ingenuity-first-flight-2021',
    title: 'Ingenuity performs first powered flight on Mars',
    description:
      "NASA's Ingenuity helicopter completed the first powered, controlled flight on another planet, a 39-second hover over Jezero Crater.",
    eventDate: '2021-04-19',
    category: 'milestone',
    sourceUrls: ['https://mars.nasa.gov/technology/helicopter/'],
  },
  {
    slug: 'jwst-launch-2021',
    title: 'James Webb Space Telescope launched',
    description:
      'The James Webb Space Telescope launched aboard an Ariane 5 from French Guiana, bound for the Sun-Earth L2 Lagrange point.',
    eventDate: '2021-12-25',
    category: 'launch',
    featured: true,
    sourceUrls: ['https://www.nasa.gov/mission/webb/'],
  },
  {
    slug: 'axiom-1-launch-2022',
    title: 'Axiom-1 — first fully private mission to ISS',
    description:
      'Axiom Space launched Axiom-1 aboard a SpaceX Crew Dragon, the first fully private astronaut mission to the International Space Station.',
    eventDate: '2022-04-08',
    category: 'launch',
    sourceUrls: ['https://www.nasa.gov/mission/axiom-mission-1/'],
  },
  {
    slug: 'jwst-first-images-2022',
    title: 'JWST releases its first full-color images',
    description:
      "President Biden unveiled JWST's first image — SMACS 0723 — followed by a suite of full-color science releases from the new observatory.",
    eventDate: '2022-07-12',
    category: 'discovery',
    sourceUrls: ['https://www.nasa.gov/mission/webb/'],
  },
  {
    slug: 'dart-impact-2022',
    title: 'DART impacts asteroid Dimorphos',
    description:
      "NASA's DART spacecraft deliberately impacted the asteroid Dimorphos, successfully altering its orbit in the first planetary defense test.",
    eventDate: '2022-09-26',
    category: 'mission',
    sourceUrls: ['https://www.nasa.gov/mission/dart/'],
  },
  {
    slug: 'artemis-1-launch-2022',
    title: 'Artemis I launches',
    description:
      'NASA launched Artemis I on the Space Launch System rocket, sending an uncrewed Orion capsule on a 25-day mission around the Moon.',
    eventDate: '2022-11-16',
    category: 'launch',
    featured: true,
    sourceUrls: ['https://www.nasa.gov/mission/artemis-i/'],
  },
];

async function main() {
  let created = 0;
  let updated = 0;

  for (const item of SEED) {
    const monthDay = monthDayFromIso(item.eventDate);
    const year = yearFromIso(item.eventDate);

    const existing = await prisma.spaceHistoryEvent.findUnique({
      where: { slug: item.slug },
    });

    await prisma.spaceHistoryEvent.upsert({
      where: { slug: item.slug },
      create: {
        slug: item.slug,
        title: item.title,
        description: item.description,
        eventDate: new Date(item.eventDate + 'T00:00:00Z'),
        monthDay,
        year,
        category: item.category,
        imageUrl: item.imageUrl ?? null,
        sourceUrls: item.sourceUrls ?? [],
        relatedCompanyIds: [],
        featured: item.featured ?? false,
      },
      update: {
        title: item.title,
        description: item.description,
        eventDate: new Date(item.eventDate + 'T00:00:00Z'),
        monthDay,
        year,
        category: item.category,
        imageUrl: item.imageUrl ?? null,
        sourceUrls: item.sourceUrls ?? [],
        featured: item.featured ?? false,
      },
    });

    if (existing) updated += 1;
    else created += 1;
  }

  const total = await prisma.spaceHistoryEvent.count();
  console.log(
    `Seed complete. Created: ${created}, Updated: ${updated}. Total events in DB: ${total}.`,
  );
}

main()
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
