import prisma from './db';
import { safeJsonParse } from './errors';
import { PlanetaryBody, SurfaceLander } from '@/types';

// Seed data for planetary bodies
export const PLANETARY_BODIES_SEED = [
  {
    slug: 'mars',
    name: 'Mars',
    description: 'The Red Planet, fourth from the Sun. Target of numerous exploration missions.',
    diameter: 6779,
    type: 'planet',
    textureUrl: '/textures/mars_texture.jpg',
    color: '#c1440e',
    hasBeenExplored: true,
  },
  {
    slug: 'moon',
    name: 'Moon',
    description: 'Earth\'s only natural satellite. Site of historic Apollo missions.',
    diameter: 3474,
    type: 'moon',
    textureUrl: '/textures/moon_texture.jpg',
    color: '#888888',
    hasBeenExplored: true,
  },
  {
    slug: 'titan',
    name: 'Titan',
    description: 'Saturn\'s largest moon with a dense atmosphere. Only moon with surface liquid.',
    diameter: 5150,
    type: 'moon',
    textureUrl: '/textures/titan_texture.jpg',
    color: '#d4a574',
    hasBeenExplored: true,
  },
  {
    slug: 'venus',
    name: 'Venus',
    description: 'Earth\'s sister planet with extreme surface conditions.',
    diameter: 12104,
    type: 'planet',
    textureUrl: '/textures/venus_texture.jpg',
    color: '#e6c35c',
    hasBeenExplored: true,
  },
];

// Seed data for surface landers
export const SURFACE_LANDERS_SEED = [
  // Mars landers
  {
    slug: 'perseverance',
    name: 'Perseverance',
    missionType: 'rover',
    status: 'active',
    planetaryBodySlug: 'mars',
    latitude: 18.44,
    longitude: 77.45,
    landingSite: 'Jezero Crater',
    country: 'USA',
    agency: 'NASA',
    launchDate: new Date('2020-07-30'),
    landingDate: new Date('2021-02-18'),
    description: 'Mars 2020 mission rover searching for signs of ancient microbial life and collecting samples for future return to Earth.',
    objectives: ['Search for biosignatures', 'Collect rock samples', 'Test oxygen production', 'Characterize climate'],
    mass: 1025,
    powerSource: 'RTG',
  },
  {
    slug: 'curiosity',
    name: 'Curiosity',
    missionType: 'rover',
    status: 'active',
    planetaryBodySlug: 'mars',
    latitude: -4.59,
    longitude: 137.44,
    landingSite: 'Gale Crater',
    country: 'USA',
    agency: 'NASA',
    launchDate: new Date('2011-11-26'),
    landingDate: new Date('2012-08-06'),
    description: 'Mars Science Laboratory rover investigating Mars\' habitability and climate history.',
    objectives: ['Study habitability', 'Analyze geology', 'Study climate', 'Prepare for human exploration'],
    mass: 899,
    powerSource: 'RTG',
  },
  {
    slug: 'zhurong',
    name: 'Zhurong',
    missionType: 'rover',
    status: 'inactive',
    planetaryBodySlug: 'mars',
    latitude: 25.07,
    longitude: 109.93,
    landingSite: 'Utopia Planitia',
    country: 'China',
    agency: 'CNSA',
    launchDate: new Date('2020-07-23'),
    landingDate: new Date('2021-05-14'),
    description: 'China\'s first Mars rover, part of the Tianwen-1 mission. Currently in hibernation.',
    objectives: ['Map surface morphology', 'Study soil composition', 'Detect subsurface water ice', 'Study atmosphere'],
    mass: 240,
    powerSource: 'solar',
  },
  {
    slug: 'insight',
    name: 'InSight',
    missionType: 'lander',
    status: 'completed',
    planetaryBodySlug: 'mars',
    latitude: 4.50,
    longitude: 135.62,
    landingSite: 'Elysium Planitia',
    country: 'USA',
    agency: 'NASA',
    launchDate: new Date('2018-05-05'),
    landingDate: new Date('2018-11-26'),
    endDate: new Date('2022-12-21'),
    description: 'Interior Exploration using Seismic Investigations lander. Studied Mars\' deep interior.',
    objectives: ['Measure seismic activity', 'Study internal heat', 'Track rotation', 'Measure meteorite impacts'],
    mass: 358,
    powerSource: 'solar',
  },

  // Moon landers
  {
    slug: 'change-4',
    name: 'Chang\'e 4',
    missionType: 'lander',
    status: 'active',
    planetaryBodySlug: 'moon',
    latitude: -45.46,
    longitude: 177.59,
    landingSite: 'Von Karman Crater (Far Side)',
    country: 'China',
    agency: 'CNSA',
    launchDate: new Date('2018-12-07'),
    landingDate: new Date('2019-01-03'),
    description: 'First spacecraft to land on the far side of the Moon. Includes Yutu-2 rover.',
    objectives: ['Study far side geology', 'Radio astronomy', 'Plant growth experiments', 'Radiation measurements'],
    mass: 1200,
    powerSource: 'solar',
  },
  {
    slug: 'change-5',
    name: 'Chang\'e 5',
    missionType: 'sample_return',
    status: 'completed',
    planetaryBodySlug: 'moon',
    latitude: 43.1,
    longitude: -51.8,
    landingSite: 'Oceanus Procellarum',
    country: 'China',
    agency: 'CNSA',
    launchDate: new Date('2020-11-23'),
    landingDate: new Date('2020-12-01'),
    endDate: new Date('2020-12-16'),
    description: 'Lunar sample return mission that brought back 1.73 kg of Moon rocks.',
    objectives: ['Collect lunar samples', 'Study volcanic history', 'Return samples to Earth'],
    mass: 8200,
    powerSource: 'solar',
  },
  {
    slug: 'slim',
    name: 'SLIM',
    missionType: 'lander',
    status: 'completed',
    planetaryBodySlug: 'moon',
    latitude: -13.32,
    longitude: 25.25,
    landingSite: 'Shioli Crater',
    country: 'Japan',
    agency: 'JAXA',
    launchDate: new Date('2023-09-07'),
    landingDate: new Date('2024-01-19'),
    endDate: new Date('2024-04-01'),
    description: 'Smart Lander for Investigating Moon. Achieved precision landing within 100m of target.',
    objectives: ['Demonstrate precision landing', 'Study lunar geology', 'Test autonomous navigation'],
    mass: 700,
    powerSource: 'solar',
  },
  {
    slug: 'chandrayaan-3',
    name: 'Chandrayaan-3',
    missionType: 'lander',
    status: 'completed',
    planetaryBodySlug: 'moon',
    latitude: -69.37,
    longitude: 32.32,
    landingSite: 'South Pole (Shiv Shakti Point)',
    country: 'India',
    agency: 'ISRO',
    launchDate: new Date('2023-07-14'),
    landingDate: new Date('2023-08-23'),
    endDate: new Date('2023-09-04'),
    description: 'India\'s successful lunar lander. First to land near lunar south pole. Includes Pragyan rover.',
    objectives: ['Soft landing demonstration', 'South pole exploration', 'Thermal conductivity', 'Seismic activity'],
    mass: 1752,
    powerSource: 'solar',
  },
  {
    slug: 'apollo-11',
    name: 'Apollo 11',
    missionType: 'lander',
    status: 'completed',
    planetaryBodySlug: 'moon',
    latitude: 0.69,
    longitude: 23.43,
    landingSite: 'Sea of Tranquility',
    country: 'USA',
    agency: 'NASA',
    launchDate: new Date('1969-07-16'),
    landingDate: new Date('1969-07-20'),
    endDate: new Date('1969-07-21'),
    description: 'First crewed Moon landing. Neil Armstrong and Buzz Aldrin walked on the Moon.',
    objectives: ['Crewed lunar landing', 'EVA operations', 'Sample collection', 'Deploy experiments'],
    mass: 15103,
    powerSource: 'battery',
  },
  {
    slug: 'apollo-17',
    name: 'Apollo 17',
    missionType: 'lander',
    status: 'completed',
    planetaryBodySlug: 'moon',
    latitude: 20.19,
    longitude: 30.77,
    landingSite: 'Taurus-Littrow Valley',
    country: 'USA',
    agency: 'NASA',
    launchDate: new Date('1972-12-07'),
    landingDate: new Date('1972-12-11'),
    endDate: new Date('1972-12-14'),
    description: 'Final Apollo mission. Longest Moon stay and most samples collected.',
    objectives: ['Extended surface operations', 'Geology sampling', 'Deploy ALSEP', 'Lunar rover exploration'],
    mass: 16456,
    powerSource: 'battery',
  },

  // Titan lander
  {
    slug: 'huygens',
    name: 'Huygens',
    missionType: 'probe',
    status: 'completed',
    planetaryBodySlug: 'titan',
    latitude: -10.25,
    longitude: -167.68,
    landingSite: 'Adiri',
    country: 'Europe',
    agency: 'ESA',
    launchDate: new Date('1997-10-15'),
    landingDate: new Date('2005-01-14'),
    endDate: new Date('2005-01-14'),
    description: 'First landing in the outer solar system. Part of Cassini-Huygens mission.',
    objectives: ['Atmospheric descent analysis', 'Surface imaging', 'Study composition', 'Wind and weather data'],
    mass: 318,
    powerSource: 'battery',
  },

  // Venus lander
  {
    slug: 'venera-7',
    name: 'Venera 7',
    missionType: 'lander',
    status: 'completed',
    planetaryBodySlug: 'venus',
    latitude: -5,
    longitude: 351,
    landingSite: 'Venus Surface',
    country: 'Russia',
    agency: 'Roscosmos',
    launchDate: new Date('1970-08-17'),
    landingDate: new Date('1970-12-15'),
    endDate: new Date('1970-12-15'),
    description: 'First spacecraft to transmit data from another planet\'s surface. Survived 23 minutes.',
    objectives: ['Surface temperature', 'Atmospheric pressure', 'Landing demonstration'],
    mass: 490,
    powerSource: 'battery',
  },
];

// Initialize planetary bodies and landers
export async function initializeSolarExplorationData() {
  const results = {
    bodiesCreated: 0,
    landersCreated: 0,
  };

  // Create planetary bodies
  for (const bodyData of PLANETARY_BODIES_SEED) {
    const existing = await prisma.planetaryBody.findUnique({
      where: { slug: bodyData.slug },
    });

    if (!existing) {
      await prisma.planetaryBody.create({
        data: bodyData,
      });
      results.bodiesCreated++;
    }
  }

  // Create landers
  for (const landerData of SURFACE_LANDERS_SEED) {
    const existing = await prisma.surfaceLander.findUnique({
      where: { slug: landerData.slug },
    });

    if (!existing) {
      const { planetaryBodySlug, objectives, ...data } = landerData;
      const body = await prisma.planetaryBody.findUnique({
        where: { slug: planetaryBodySlug },
      });

      if (body) {
        await prisma.surfaceLander.create({
          data: {
            ...data,
            objectives: objectives ? JSON.stringify(objectives) : null,
            planetaryBodyId: body.id,
          },
        });
        results.landersCreated++;
      }
    }
  }

  return results;
}

// Query functions
export async function getPlanetaryBodies(): Promise<PlanetaryBody[]> {
  const bodies = await prisma.planetaryBody.findMany({
    orderBy: { name: 'asc' },
    include: {
      landers: {
        orderBy: { landingDate: 'desc' },
      },
    },
  });

  return bodies.map(body => ({
    ...body,
    type: body.type as PlanetaryBody['type'],
    landers: body.landers.map(l => ({
      ...l,
      missionType: l.missionType as SurfaceLander['missionType'],
      status: l.status as SurfaceLander['status'],
      objectives: l.objectives ? safeJsonParse(l.objectives, null) : null,
    })),
  }));
}

export async function getPlanetaryBodyBySlug(slug: string): Promise<PlanetaryBody | null> {
  const body = await prisma.planetaryBody.findUnique({
    where: { slug },
    include: {
      landers: {
        orderBy: { landingDate: 'desc' },
      },
    },
  });

  if (!body) return null;

  return {
    ...body,
    type: body.type as PlanetaryBody['type'],
    landers: body.landers.map(l => ({
      ...l,
      missionType: l.missionType as SurfaceLander['missionType'],
      status: l.status as SurfaceLander['status'],
      objectives: l.objectives ? safeJsonParse(l.objectives, null) : null,
    })),
  };
}

export async function getSurfaceLanders(options?: {
  planetaryBodyId?: string;
  status?: string;
  missionType?: string;
  limit?: number;
}): Promise<SurfaceLander[]> {
  const { planetaryBodyId, status, missionType, limit } = options || {};

  const landers = await prisma.surfaceLander.findMany({
    where: {
      ...(planetaryBodyId ? { planetaryBodyId } : {}),
      ...(status ? { status } : {}),
      ...(missionType ? { missionType } : {}),
    },
    include: {
      planetaryBody: true,
    },
    orderBy: { landingDate: 'desc' },
    take: limit,
  });

  return landers.map(l => ({
    ...l,
    missionType: l.missionType as SurfaceLander['missionType'],
    status: l.status as SurfaceLander['status'],
    objectives: l.objectives ? safeJsonParse(l.objectives, null) : null,
    planetaryBody: l.planetaryBody ? {
      ...l.planetaryBody,
      type: l.planetaryBody.type as PlanetaryBody['type'],
    } : undefined,
  }));
}

export async function getSolarExplorationStats() {
  const [
    totalBodies,
    totalLanders,
    activeLanders,
    completedLanders,
    landersByBody,
    landersByStatus,
  ] = await Promise.all([
    prisma.planetaryBody.count(),
    prisma.surfaceLander.count(),
    prisma.surfaceLander.count({ where: { status: 'active' } }),
    prisma.surfaceLander.count({ where: { status: 'completed' } }),
    prisma.surfaceLander.groupBy({
      by: ['planetaryBodyId'],
      _count: true,
    }),
    prisma.surfaceLander.groupBy({
      by: ['status'],
      _count: true,
    }),
  ]);

  // Get body names for the groupBy results
  const bodies = await prisma.planetaryBody.findMany({
    select: { id: true, name: true, slug: true },
  });
  const bodyMap = new Map(bodies.map(b => [b.id, b]));

  return {
    totalBodies,
    totalLanders,
    activeLanders,
    completedLanders,
    landersByBody: landersByBody.map(item => ({
      bodyId: item.planetaryBodyId,
      bodyName: bodyMap.get(item.planetaryBodyId)?.name || 'Unknown',
      bodySlug: bodyMap.get(item.planetaryBodyId)?.slug || 'unknown',
      count: item._count,
    })),
    landersByStatus: landersByStatus.map(item => ({
      status: item.status,
      count: item._count,
    })),
  };
}
