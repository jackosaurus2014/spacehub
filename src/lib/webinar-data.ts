import { Webinar } from '@/types';

// Helper to generate dates relative to now
const daysFromNow = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(14, 0, 0, 0); // Set to 2 PM
  return date;
};

const daysAgo = (days: number) => daysFromNow(-days);

// Seed data for Virtual Technical Panels - 10 webinars
export const WEBINARS_SEED: Omit<Webinar, 'id' | 'createdAt' | 'updatedAt'>[] = [
  // Upcoming webinars
  {
    slug: 'space-nuclear-payloads-future',
    title: 'Space Nuclear Payloads: Powering the Future of Deep Space Exploration',
    description: 'Explore the latest developments in space nuclear propulsion and power systems. Topics include NTP (Nuclear Thermal Propulsion), RTGs for outer planet missions, and the regulatory landscape for launching nuclear materials.',
    speaker: 'Dr. Michael Rodriguez',
    speakerBio: 'NASA Nuclear Systems Lead with 20 years experience in space nuclear power. Led power system development for Mars 2020 and Europa Clipper missions.',
    topic: 'space_nuclear',
    date: daysFromNow(7),
    duration: 90,
    registrationUrl: 'https://example.com/register/space-nuclear',
    recordingUrl: null,
    isLive: false,
    isPast: false,
  },
  {
    slug: 'in-orbit-manufacturing-revolution',
    title: 'In-Orbit Manufacturing: Building the Space Economy',
    description: 'Learn how microgravity manufacturing is creating new opportunities for pharmaceuticals, fiber optics, and advanced materials. Featuring insights from leading in-space manufacturing companies.',
    speaker: 'Sarah Kim, CEO',
    speakerBio: 'Founder of Orbital Forge, pioneering in-space manufacturing of ZBLAN fiber optics. Former materials scientist at MIT Lincoln Laboratory.',
    topic: 'in_orbit_manufacturing',
    date: daysFromNow(14),
    duration: 75,
    registrationUrl: 'https://example.com/register/iom',
    recordingUrl: null,
    isLive: false,
    isPast: false,
  },
  {
    slug: 'satellite-servicing-economics',
    title: 'Satellite Servicing: The Business Case for Life Extension',
    description: 'Deep dive into the economics of satellite servicing, assembly, and manufacturing (OSAM). Analysis of GEO servicing market, LEO mega-constellation maintenance, and debris removal services.',
    speaker: 'Tom Bradley',
    speakerBio: 'VP of Business Development at Astroscale. Previously led on-orbit servicing programs at Northrop Grumman including MEV-1 and MEV-2.',
    topic: 'satellite_servicing',
    date: daysFromNow(21),
    duration: 60,
    registrationUrl: 'https://example.com/register/satellite-servicing',
    recordingUrl: null,
    isLive: false,
    isPast: false,
  },
  {
    slug: 'debris-mitigation-strategies',
    title: 'Space Debris Mitigation: Technical and Policy Solutions',
    description: 'Comprehensive overview of active debris removal technologies, space traffic management, and international policy frameworks. Including case studies of recent conjunction events.',
    speaker: 'Dr. Jennifer Park',
    speakerBio: 'Director of Space Sustainability at The Aerospace Corporation. Lead author of debris mitigation guidelines adopted by multiple space agencies.',
    topic: 'debris_mitigation',
    date: daysFromNow(28),
    duration: 90,
    registrationUrl: 'https://example.com/register/debris-mitigation',
    recordingUrl: null,
    isLive: false,
    isPast: false,
  },
  {
    slug: 'lunar-isru-mining',
    title: 'Lunar ISRU: From Regolith to Resources',
    description: 'Technical deep-dive into in-situ resource utilization on the Moon. Water ice extraction, oxygen production, and how ISRU enables sustainable lunar presence under Artemis.',
    speaker: 'Dr. Amanda Foster',
    speakerBio: 'Chief Scientist at Lunar Resources Inc. Former NASA ISRU technology lead. PhD in planetary geology from Caltech.',
    topic: 'lunar_isru',
    date: daysFromNow(35),
    duration: 75,
    registrationUrl: 'https://example.com/register/lunar-isru',
    recordingUrl: null,
    isLive: false,
    isPast: false,
  },

  // Live webinar
  {
    slug: 'commercial-space-stations-live',
    title: 'LIVE: Commercial Space Stations - The Post-ISS Era',
    description: 'Join us live for a panel discussion on commercial space station development. Featuring representatives from Axiom, Vast, and Orbital Reef discussing the transition from ISS.',
    speaker: 'Panel Discussion',
    speakerBio: 'Featuring leaders from Axiom Space, Vast, and Blue Origin\'s Orbital Reef program moderated by space policy expert Dr. Margaret Wilson.',
    topic: 'commercial_stations',
    date: new Date(), // Now
    duration: 120,
    registrationUrl: null,
    recordingUrl: null,
    isLive: true,
    isPast: false,
  },

  // Past webinars with recordings
  {
    slug: 'advanced-propulsion-technologies',
    title: 'Advanced Propulsion Technologies: Beyond Chemical Rockets',
    description: 'Survey of next-generation propulsion systems including electric propulsion, solar sails, and experimental concepts. How these technologies enable new mission architectures.',
    speaker: 'Dr. Carlos Rivera',
    speakerBio: 'Former NASA JPL propulsion scientist, led development of Dawn spacecraft ion propulsion system.',
    topic: 'propulsion_tech',
    date: daysAgo(14),
    duration: 90,
    registrationUrl: null,
    recordingUrl: 'https://example.com/recordings/advanced-propulsion',
    isLive: false,
    isPast: true,
  },
  {
    slug: 'space-policy-regulatory-landscape',
    title: 'Space Policy & Regulation: Navigating the New Commercial Era',
    description: 'Essential overview of space licensing, export controls, and international frameworks for commercial space companies. Practical guidance for startups and established operators.',
    speaker: 'Dr. Sarah Chen',
    speakerBio: 'Partner at Hogan Lovells space law practice, former FAA/AST counsel with 15+ years in space regulatory matters.',
    topic: 'space_policy',
    date: daysAgo(21),
    duration: 75,
    registrationUrl: null,
    recordingUrl: 'https://example.com/recordings/space-policy',
    isLive: false,
    isPast: true,
  },
  {
    slug: 'in-orbit-servicing-tech',
    title: 'In-Orbit Servicing Technologies: Docking, Refueling, and Repair',
    description: 'Technical deep-dive into spacecraft servicing technologies including proximity operations, docking mechanisms, fluid transfer, and robotic manipulation systems.',
    speaker: 'Mark Anderson',
    speakerBio: 'Chief Engineer at Orbit Fab specializing in spacecraft refueling architectures. Former Orbital ATK capture system lead.',
    topic: 'satellite_servicing',
    date: daysAgo(30),
    duration: 60,
    registrationUrl: null,
    recordingUrl: 'https://example.com/recordings/in-orbit-servicing',
    isLive: false,
    isPast: true,
  },
  {
    slug: 'commercial-station-economics',
    title: 'Commercial Space Station Economics: Building the Business Case',
    description: 'Financial analysis of commercial space station ventures including revenue models, customer segments, and the path to profitability for LEO destinations.',
    speaker: 'David Chang, CFO',
    speakerBio: 'Chief Financial Officer at Axiom Space, previously led space investment practice at Morgan Stanley.',
    topic: 'commercial_stations',
    date: daysAgo(45),
    duration: 60,
    registrationUrl: null,
    recordingUrl: 'https://example.com/recordings/station-economics',
    isLive: false,
    isPast: true,
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
    avgDuration: Math.round(webinars.reduce((sum, w) => sum + w.duration, 0) / webinars.length),
  };
}
