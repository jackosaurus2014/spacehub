import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const sampleEvents = [
  {
    externalId: 'seed-1',
    name: 'Artemis II Crewed Lunar Mission',
    description: 'First crewed Artemis mission to fly around the Moon. Four astronauts will travel around the Moon in the Orion spacecraft.',
    type: 'moon_mission',
    status: 'upcoming',
    launchDate: new Date(Date.now() + 12 * 60 * 60 * 1000), // 12 hours from now
    location: 'Kennedy Space Center, FL',
    country: 'USA',
    agency: 'NASA',
    rocket: 'SLS Block 1',
    mission: 'Artemis II',
    imageUrl: 'https://www.nasa.gov/wp-content/uploads/2023/03/artemis-ii-patch.png',
  },
  {
    externalId: 'seed-2',
    name: 'SpaceX Starship Flight 8',
    description: 'Test flight of the SpaceX Starship and Super Heavy launch system.',
    type: 'launch',
    status: 'upcoming',
    launchDate: new Date(Date.now() + 36 * 60 * 60 * 1000), // 36 hours from now
    location: 'Starbase, TX',
    country: 'USA',
    agency: 'SpaceX',
    rocket: 'Starship',
    mission: 'IFT-8',
    imageUrl: 'https://live.staticflickr.com/65535/52822012900_7b tried_n.jpg',
  },
  {
    externalId: 'seed-3',
    name: 'Falcon 9 | Starlink Group 12-5',
    description: 'SpaceX Falcon 9 launch carrying Starlink satellites to low Earth orbit.',
    type: 'satellite',
    status: 'upcoming',
    launchDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
    location: 'Cape Canaveral SFS, FL',
    country: 'USA',
    agency: 'SpaceX',
    rocket: 'Falcon 9 Block 5',
    mission: 'Starlink Group 12-5',
  },
  {
    externalId: 'seed-4',
    name: 'Crew Dragon | Crew-10',
    description: 'SpaceX Crew Dragon mission to the International Space Station carrying four astronauts.',
    type: 'crewed_mission',
    status: 'upcoming',
    launchDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days from now
    location: 'Kennedy Space Center, FL',
    country: 'USA',
    agency: 'SpaceX / NASA',
    rocket: 'Falcon 9 Block 5',
    mission: 'Crew-10',
    imageUrl: 'https://www.nasa.gov/wp-content/uploads/2023/09/spacex_crew-7_mission_patch.png',
  },
  {
    externalId: 'seed-5',
    name: 'Ariane 6 | Communications Satellites',
    description: 'European Ariane 6 rocket launching communications satellites.',
    type: 'launch',
    status: 'upcoming',
    launchDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000), // 21 days from now
    location: 'Kourou, French Guiana',
    country: 'FRA',
    agency: 'Arianespace',
    rocket: 'Ariane 6',
  },
  {
    externalId: 'seed-6',
    name: 'Chang\'e 7 Lunar South Pole Mission',
    description: 'Chinese lunar mission to explore the Moon\'s south pole, including an orbiter, lander, and rover.',
    type: 'moon_mission',
    status: 'upcoming',
    launchDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days from now
    location: 'Wenchang Space Launch Site',
    country: 'CHN',
    agency: 'CNSA',
    rocket: 'Long March 5',
    mission: 'Chang\'e 7',
  },
  {
    externalId: 'seed-7',
    name: 'Europa Clipper Science Phase Begins',
    description: 'NASA\'s Europa Clipper begins science operations at Jupiter\'s moon Europa.',
    type: 'probe',
    status: 'upcoming',
    launchDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
    country: 'USA',
    agency: 'NASA / JPL',
    mission: 'Europa Clipper',
  },
  {
    externalId: 'seed-8',
    name: 'Mars Sample Return Launch',
    description: 'Earth Return Orbiter mission to retrieve samples collected by Perseverance rover.',
    type: 'mars_mission',
    status: 'tbd',
    launchDate: new Date(Date.now() + 730 * 24 * 60 * 60 * 1000), // 2 years from now
    country: 'USA',
    agency: 'NASA / ESA',
    rocket: 'TBD',
    mission: 'Mars Sample Return',
  },
  {
    externalId: 'seed-9',
    name: 'Axiom Station Module 1',
    description: 'First module of the Axiom commercial space station to be attached to ISS.',
    type: 'orbital_hab',
    status: 'upcoming',
    launchDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000), // 6 months from now
    location: 'Kennedy Space Center, FL',
    country: 'USA',
    agency: 'Axiom Space',
    rocket: 'Falcon 9 Block 5',
    mission: 'AxStation Module 1',
  },
  {
    externalId: 'seed-10',
    name: 'JAXA Lunar Landing',
    description: 'Japanese precision lunar lander mission.',
    type: 'moon_mission',
    status: 'upcoming',
    launchDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days from now
    location: 'Tanegashima Space Center',
    country: 'JPN',
    agency: 'JAXA',
    rocket: 'H-IIA',
    mission: 'SLIM-2',
  },
  {
    externalId: 'seed-11',
    name: 'Blue Origin New Glenn Maiden Flight',
    description: 'First orbital launch of Blue Origin\'s New Glenn heavy-lift rocket.',
    type: 'launch',
    status: 'upcoming',
    launchDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000), // 45 days from now
    location: 'Cape Canaveral SFS, FL',
    country: 'USA',
    agency: 'Blue Origin',
    rocket: 'New Glenn',
  },
  {
    externalId: 'seed-12',
    name: 'Starship Lunar Lander Demo',
    description: 'SpaceX Starship demonstration for NASA\'s Human Landing System.',
    type: 'moon_mission',
    status: 'tbc',
    launchDate: new Date(Date.now() + 400 * 24 * 60 * 60 * 1000), // ~13 months from now
    location: 'Starbase, TX',
    country: 'USA',
    agency: 'SpaceX / NASA',
    rocket: 'Starship',
    mission: 'HLS Demo',
  },
];

async function main() {
  console.log('Seeding space events...');

  for (const event of sampleEvents) {
    await prisma.spaceEvent.upsert({
      where: { externalId: event.externalId },
      update: event,
      create: event,
    });
    console.log(`Added: ${event.name}`);
  }

  console.log('Seeding complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
