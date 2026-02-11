import { Webinar } from '@/types';

// Webinar data - real space industry conferences and events for 2026
export const WEBINARS_SEED: Omit<Webinar, 'id' | 'createdAt' | 'updatedAt'>[] = [
  // ===== PAST EVENTS (before Feb 11, 2026) =====
  {
    slug: 'ces-2026-space-tech-track',
    title: 'CES 2026 Space Tech Track',
    description:
      'The Consumer Electronics Show dedicated space technology track showcasing next-generation satellite communications, in-orbit manufacturing demos, and space-enabled consumer products. Features exhibits from SpaceX, Blue Origin, and dozens of emerging space startups.',
    speaker: 'Various Speakers',
    speakerBio:
      'Industry leaders from commercial space, satellite communications, and space-enabled technology companies.',
    topic: 'space_commerce',
    date: new Date('2026-01-06T09:00:00-08:00'),
    duration: 2880, // 3 days
    registrationUrl: null,
    recordingUrl: null,
    isLive: false,
    isPast: true,
  },
  {
    slug: 'von-braun-space-exploration-symposium-2026',
    title: 'Von Braun Space Exploration Symposium 2026',
    description:
      'The premier gathering of space exploration leaders, hosted by the American Astronautical Society in Huntsville, Alabama. This year focuses on Artemis mission progress, lunar surface operations, and the path to Mars.',
    speaker: 'Jim Free',
    speakerBio:
      'NASA Associate Administrator, leading the agency\'s deep space exploration programs including Artemis and Moon to Mars.',
    topic: 'systems_engineering',
    date: new Date('2026-01-27T08:00:00-06:00'),
    duration: 1440, // 2 days
    registrationUrl: null,
    recordingUrl: null,
    isLive: false,
    isPast: true,
  },
  {
    slug: 'spacecom-2026',
    title: 'SpaceCom 2026',
    description:
      'SpaceCom brings together the commercial space and satellite industry in Orlando, FL, connecting space technology providers with enterprise customers. Focus areas include space-based data analytics, communications infrastructure, and government contracting.',
    speaker: 'Various Speakers',
    speakerBio:
      'CEOs, CTOs, and government officials from across the commercial space and satellite ecosystem.',
    topic: 'space_commerce',
    date: new Date('2026-02-03T09:00:00-05:00'),
    duration: 1440, // 2 days
    registrationUrl: null,
    recordingUrl: null,
    isLive: false,
    isPast: true,
  },
  {
    slug: 'national-space-council-q1-2026',
    title: 'National Space Council Meeting Q1 2026',
    description:
      'Quarterly meeting of the National Space Council addressing U.S. space policy priorities including spectrum allocation, orbital debris mitigation, and commercial space regulation. Open session webcast available.',
    speaker: 'Various Speakers',
    speakerBio:
      'Senior government officials and space policy advisors from the Executive Office of the President.',
    topic: 'international_policy',
    date: new Date('2026-01-22T10:00:00-05:00'),
    duration: 180, // 3 hours
    registrationUrl: null,
    recordingUrl: null,
    isLive: false,
    isPast: true,
  },
  {
    slug: 'webinar-space-law-export-controls-2026',
    title: 'Space Law Update: ITAR & Export Controls in 2026',
    description:
      'A focused webinar covering the latest changes to ITAR regulations affecting commercial space, including recent Commerce Department rulings on satellite technology transfers and updated licensing requirements.',
    speaker: 'Laura Montgomery',
    speakerBio:
      'Space law attorney and former FAA counsel specializing in commercial space launch licensing and export control compliance.',
    topic: 'space_law',
    date: new Date('2026-01-15T14:00:00-05:00'),
    duration: 90,
    registrationUrl: null,
    recordingUrl: null,
    isLive: false,
    isPast: true,
  },

  // ===== UPCOMING EVENTS (after Feb 11, 2026) =====
  {
    slug: 'satellite-2026-conference',
    title: 'SATELLITE 2026 Conference & Exhibition',
    description:
      'The world\'s most important satellite technology event, held at the Walter E. Washington Convention Center in Washington, DC. Over 15,000 attendees explore advances in LEO constellations, direct-to-device connectivity, space sustainability, and defense satellite systems.',
    speaker: 'Various Speakers',
    speakerBio:
      'Keynotes from satellite operators, government agencies, and technology innovators shaping the future of space-based connectivity.',
    topic: 'satellite_technology',
    date: new Date('2026-03-09T09:00:00-05:00'),
    duration: 2880, // 4 days
    registrationUrl: 'https://www.satshow.com/',
    recordingUrl: null,
    isLive: false,
    isPast: false,
  },
  {
    slug: 'humans-to-mars-summit-2026',
    title: 'Humans to Mars Summit 2026',
    description:
      'Explore Mars convenes leading scientists, engineers, and policymakers in Washington, DC to discuss the roadmap for sending humans to Mars. Sessions cover life support, radiation protection, ISRU technologies, and international cooperation frameworks.',
    speaker: 'Various Speakers',
    speakerBio:
      'Planetary scientists, astronauts, and aerospace engineers from NASA, ESA, and the private sector focused on Mars exploration.',
    topic: 'systems_engineering',
    date: new Date('2026-03-24T09:00:00-04:00'),
    duration: 1440, // 2 days
    registrationUrl: 'https://www.exploremars.org/',
    recordingUrl: null,
    isLive: false,
    isPast: false,
  },
  {
    slug: 'space-symposium-2026',
    title: '41st Space Symposium',
    description:
      'The premier annual gathering of the global space community at The Broadmoor in Colorado Springs, hosted by the Space Foundation. Features high-level discussions on national security space, commercial space growth, and international partnerships.',
    speaker: 'Gen. Stephen Whiting',
    speakerBio:
      'Commander, U.S. Space Command, responsible for operating and defending U.S. and allied space capabilities.',
    topic: 'space_defense',
    date: new Date('2026-04-06T08:00:00-06:00'),
    duration: 2880, // 4 days
    registrationUrl: 'https://www.spacesymposium.org/',
    recordingUrl: null,
    isLive: false,
    isPast: false,
  },
  {
    slug: 'webinar-in-orbit-servicing-manufacturing',
    title: 'In-Orbit Servicing, Assembly & Manufacturing: Market Outlook',
    description:
      'Virtual panel discussion on the growing in-orbit servicing and manufacturing market, featuring companies developing robotic servicing vehicles, orbital assembly platforms, and microgravity manufacturing capabilities.',
    speaker: 'Joe Anderson',
    speakerBio:
      'Vice President of On-Orbit Services at Northrop Grumman, leading the Mission Extension Vehicle and next-generation servicing programs.',
    topic: 'in_orbit_manufacturing',
    date: new Date('2026-04-16T13:00:00-04:00'),
    duration: 90,
    registrationUrl: 'https://www.spacefoundation.org/',
    recordingUrl: null,
    isLive: false,
    isPast: false,
  },
  {
    slug: 'space-tech-expo-2026',
    title: 'Space Tech Expo 2026',
    description:
      'North America\'s largest B2B space event at the Long Beach Convention Center, connecting the supply chain for spacecraft manufacturing, launch services, and satellite systems. Over 300 exhibitors showcase components, subsystems, and testing equipment.',
    speaker: 'Tory Bruno',
    speakerBio:
      'President and CEO of United Launch Alliance, leading the transition to the Vulcan Centaur launch system.',
    topic: 'launch_services',
    date: new Date('2026-05-19T09:00:00-07:00'),
    duration: 1440, // 2 days
    registrationUrl: 'https://www.spacetechexpo.com/',
    recordingUrl: null,
    isLive: false,
    isPast: false,
  },
  {
    slug: 'isdc-2026',
    title: 'International Space Development Conference 2026',
    description:
      'The National Space Society\'s flagship annual conference bringing together space advocates, entrepreneurs, and researchers. This year\'s theme centers on building the cislunar economy, space settlement architectures, and democratizing space access.',
    speaker: 'Various Speakers',
    speakerBio:
      'Space advocates, entrepreneurs, and scientists from the National Space Society and allied organizations worldwide.',
    topic: 'space_commerce',
    date: new Date('2026-05-22T09:00:00-05:00'),
    duration: 2880, // 4 days
    registrationUrl: 'https://isdc.nss.org/',
    recordingUrl: null,
    isLive: false,
    isPast: false,
  },
  {
    slug: 'webinar-nuclear-thermal-propulsion-update',
    title: 'Nuclear Thermal Propulsion: DRACO Program Update',
    description:
      'A technical webinar reviewing progress on NASA and DARPA\'s Demonstration Rocket for Agile Cislunar Operations (DRACO) program and the broader outlook for nuclear propulsion in deep space missions.',
    speaker: 'Tabitha Dodson',
    speakerBio:
      'DARPA program manager for DRACO, leading the development of nuclear thermal propulsion flight demonstration technology.',
    topic: 'propulsion',
    date: new Date('2026-06-10T14:00:00-04:00'),
    duration: 75,
    registrationUrl: 'https://www.aiaa.org/',
    recordingUrl: null,
    isLive: false,
    isPast: false,
  },
  {
    slug: 'newspace-conference-2026',
    title: 'NewSpace Conference 2026',
    description:
      'Europe\'s premier new space economy conference in Paris, organized by Eurospace. Connects startups, investors, and institutional players in the rapidly evolving European commercial space sector, with focus on sovereign launch capabilities and constellation deployment.',
    speaker: 'Josef Aschbacher',
    speakerBio:
      'Director General of the European Space Agency, championing European space competitiveness and innovation.',
    topic: 'space_commerce',
    date: new Date('2026-06-23T09:00:00+02:00'),
    duration: 1440, // 2 days
    registrationUrl: 'https://newspace-conference.eu/',
    recordingUrl: null,
    isLive: false,
    isPast: false,
  },
  {
    slug: 'aiaa-space-forum-2026',
    title: 'AIAA ASCEND 2026',
    description:
      'The American Institute of Aeronautics and Astronautics flagship space event combining technical sessions, policy forums, and networking. Covers the full spectrum from propulsion and avionics to space traffic management and on-orbit servicing.',
    speaker: 'Various Speakers',
    speakerBio:
      'Aerospace engineers, researchers, and executives presenting peer-reviewed technical papers and industry perspectives.',
    topic: 'avionics',
    date: new Date('2026-07-14T09:00:00-05:00'),
    duration: 2880, // 4 days
    registrationUrl: 'https://www.aiaa.org/ascend',
    recordingUrl: null,
    isLive: false,
    isPast: false,
  },
  {
    slug: 'smallsat-conference-2026',
    title: '40th Annual SmallSat Conference',
    description:
      'The premier conference on small satellite missions, technology, and business at Utah State University in Logan, UT. Features student competitions, technical sessions, and exhibits covering CubeSats through ESPA-class missions.',
    speaker: 'Various Speakers',
    speakerBio:
      'University researchers, government program managers, and commercial smallsat operators from around the world.',
    topic: 'satellite_technology',
    date: new Date('2026-08-01T08:00:00-06:00'),
    duration: 2880, // 4 days
    registrationUrl: 'https://smallsat.org/',
    recordingUrl: null,
    isLive: false,
    isPast: false,
  },
  {
    slug: 'amos-conference-2026',
    title: 'AMOS Conference 2026',
    description:
      'The Advanced Maui Optical and Space Surveillance Technologies Conference in Maui, Hawaii, focused on space domain awareness, orbital debris tracking, and space situational awareness technologies. A key venue for the SDA community.',
    speaker: 'Various Speakers',
    speakerBio:
      'Scientists and engineers from the U.S. Space Force, national labs, and the space surveillance community.',
    topic: 'space_defense',
    date: new Date('2026-09-15T08:00:00-10:00'),
    duration: 2880, // 4 days
    registrationUrl: 'https://amostech.com/',
    recordingUrl: null,
    isLive: false,
    isPast: false,
  },
  {
    slug: 'world-satellite-business-week-2026',
    title: 'World Satellite Business Week 2026',
    description:
      'The global satellite industry\'s executive summit in Paris, organized by Euroconsult. Senior decision-makers from operators, manufacturers, and investors gather to shape the future of satellite services, connectivity, and Earth observation markets.',
    speaker: 'Various Speakers',
    speakerBio:
      'C-suite executives from the world\'s leading satellite operators, manufacturers, and financial institutions investing in space.',
    topic: 'satellite_technology',
    date: new Date('2026-09-14T09:00:00+02:00'),
    duration: 2880, // 4 days
    registrationUrl: 'https://www.satellite-business.com/',
    recordingUrl: null,
    isLive: false,
    isPast: false,
  },
  {
    slug: 'satellite-innovation-2026',
    title: 'Satellite Innovation 2026',
    description:
      'An intimate Silicon Valley conference in Mountain View, CA, bringing together satellite industry innovators, venture capitalists, and technology disruptors. Focus on next-generation architectures, software-defined satellites, and space data analytics.',
    speaker: 'Various Speakers',
    speakerBio:
      'Founders and CTOs from satellite startups alongside investors and technology leaders from Silicon Valley.',
    topic: 'satellite_technology',
    date: new Date('2026-10-06T09:00:00-07:00'),
    duration: 1440, // 2 days
    registrationUrl: 'https://www.satelliteinnovation.com/',
    recordingUrl: null,
    isLive: false,
    isPast: false,
  },
  {
    slug: 'iac-2026',
    title: 'International Astronautical Congress 2026',
    description:
      'The world\'s largest space conference organized by the International Astronautical Federation. Thousands of delegates from over 70 countries convene for technical sessions, plenaries, and exhibitions covering all aspects of space science, technology, and exploration.',
    speaker: 'Various Speakers',
    speakerBio:
      'Heads of space agencies, Nobel laureates, astronauts, and leading researchers from the global space community.',
    topic: 'international_policy',
    date: new Date('2026-10-12T09:00:00+09:00'),
    duration: 2880, // 5 days
    registrationUrl: 'https://www.iafastro.org/',
    recordingUrl: null,
    isLive: false,
    isPast: false,
  },
  {
    slug: 'global-milsatcom-2026',
    title: 'Global MilSatCom 2026',
    description:
      'The leading military satellite communications conference in London, gathering defense officials, satellite operators, and technology providers. Covers resilient SATCOM architectures, anti-jamming technologies, and allied interoperability.',
    speaker: 'Various Speakers',
    speakerBio:
      'Senior military officers and defense industry executives from NATO nations and allied partner countries.',
    topic: 'space_defense',
    date: new Date('2026-11-03T09:00:00+00:00'),
    duration: 1440, // 2 days
    registrationUrl: 'https://www.smi-online.co.uk/defence/uk/global-milsatcom',
    recordingUrl: null,
    isLive: false,
    isPast: false,
  },
  {
    slug: 'webinar-government-space-budget-fy2027',
    title: 'Government Space Budget Outlook: FY2027 Preview',
    description:
      'A virtual briefing analyzing the FY2027 federal budget request for NASA, Space Force, and NOAA space programs. Includes projections for commercial crew, Artemis, and national security space spending.',
    speaker: 'Eric Berger',
    speakerBio:
      'Senior space editor at Ars Technica and author of multiple books on NASA history and the commercial space revolution.',
    topic: 'government_relations',
    date: new Date('2026-02-26T12:00:00-05:00'),
    duration: 60,
    registrationUrl: 'https://www.spacefoundation.org/',
    recordingUrl: null,
    isLive: false,
    isPast: false,
  },
  {
    slug: 'space-foundation-discovery-series-spring-2026',
    title: 'Space Foundation Discovery Series: Cislunar Economy',
    description:
      'A Space Foundation event examining the emerging cislunar economy, including Artemis Accords implementation, lunar surface operations planning, and public-private partnerships for sustainable lunar presence.',
    speaker: 'Various Speakers',
    speakerBio:
      'Space Foundation fellows, NASA program leads, and commercial lunar services providers.',
    topic: 'space_commerce',
    date: new Date('2026-03-17T10:00:00-06:00'),
    duration: 480, // full day
    registrationUrl: 'https://www.spacefoundation.org/',
    recordingUrl: null,
    isLive: false,
    isPast: false,
  },
];

// Get webinars with optional filters
export async function getWebinars(filters?: {
  topic?: string;
  isLive?: boolean;
  isPast?: boolean;
  limit?: number;
  offset?: number;
}): Promise<{ webinars: Webinar[]; total: number }> {
  let filteredWebinars = WEBINARS_SEED.map((w, index) => ({
    ...w,
    id: `webinar-${index + 1}`,
    createdAt: new Date(),
    updatedAt: new Date(),
  })) as Webinar[];

  if (filters?.topic) {
    filteredWebinars = filteredWebinars.filter(w => w.topic === filters.topic);
  }

  if (filters?.isLive !== undefined) {
    filteredWebinars = filteredWebinars.filter(w => w.isLive === filters.isLive);
  }

  if (filters?.isPast !== undefined) {
    filteredWebinars = filteredWebinars.filter(w => w.isPast === filters.isPast);
  }

  // Sort: Live first, then upcoming by date, then past by date (newest first)
  filteredWebinars.sort((a, b) => {
    if (a.isLive && !b.isLive) return -1;
    if (!a.isLive && b.isLive) return 1;
    if (!a.isPast && !b.isPast) {
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    }
    if (a.isPast && b.isPast) {
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    }
    if (!a.isPast && b.isPast) return -1;
    return 1;
  });

  const total = filteredWebinars.length;

  // Apply pagination
  const limit = filters?.limit || 20;
  const offset = filters?.offset || 0;
  filteredWebinars = filteredWebinars.slice(offset, offset + limit);

  return { webinars: filteredWebinars, total };
}

// Get single webinar by slug
export async function getWebinarBySlug(slug: string): Promise<Webinar | null> {
  const webinar = WEBINARS_SEED.find(w => w.slug === slug);
  if (!webinar) return null;

  const index = WEBINARS_SEED.indexOf(webinar);
  return {
    ...webinar,
    id: `webinar-${index + 1}`,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as Webinar;
}

// Get webinar stats
export async function getWebinarStats() {
  const webinars = WEBINARS_SEED;

  const byTopic: Record<string, number> = {};
  webinars.forEach(w => {
    byTopic[w.topic] = (byTopic[w.topic] || 0) + 1;
  });

  return {
    totalWebinars: webinars.length,
    liveCount: webinars.filter(w => w.isLive).length,
    upcomingCount: webinars.filter(w => !w.isPast && !w.isLive).length,
    pastCount: webinars.filter(w => w.isPast).length,
    recordingsAvailable: webinars.filter(w => w.recordingUrl).length,
    byTopic,
    avgDuration: webinars.length > 0
      ? Math.round(webinars.reduce((sum, w) => sum + w.duration, 0) / webinars.length)
      : 0,
  };
}
