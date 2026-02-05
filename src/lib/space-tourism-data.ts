// Space Tourism Data - Seed data and types for the Space Tourism Marketplace

export type ExperienceType = 'suborbital' | 'orbital' | 'station' | 'lunar' | 'balloon';
export type TourismStatus = 'active' | 'upcoming' | 'sold_out' | 'future';

export interface SpaceTourismOffering {
  id: string;
  provider: string;
  name: string;
  experienceType: ExperienceType;
  price: number | null; // null for TBD
  priceDisplay: string;
  duration: string;
  altitude: number | null; // km, null for TBD
  altitudeDisplay: string;
  description: string;
  features: string[];
  requirements: string[];
  status: TourismStatus;
  logoIcon: string;
  maxPassengers: number;
  trainingDuration: string;
  launchSite: string;
  vehicleName: string;
  firstFlight: string | null;
  websiteUrl: string;
}

// Seed data for space tourism offerings
export const SPACE_TOURISM_OFFERINGS: SpaceTourismOffering[] = [
  {
    id: 'blue-origin-new-shepard',
    provider: 'Blue Origin',
    name: 'New Shepard',
    experienceType: 'suborbital',
    price: 450000,
    priceDisplay: '$450K',
    duration: '11 minutes',
    altitude: 100,
    altitudeDisplay: '100 km',
    description: 'Experience the overview effect with Blue Origin\'s New Shepard rocket. Cross the Karman line at 100km altitude and enjoy several minutes of weightlessness while gazing down at Earth through the largest windows ever flown in space.',
    features: [
      'Cross the Karman line (100km)',
      '3-4 minutes of weightlessness',
      'Largest windows flown in space',
      'Fully autonomous flight',
      'Pressurized crew capsule',
      'Views of Earth\'s curvature',
    ],
    requirements: [
      'Minimum age 18 years',
      'Height between 5\'0" and 6\'4"',
      'Weight under 223 lbs',
      'Able to climb launch tower (7 flights)',
      'Medical clearance required',
    ],
    status: 'active',
    logoIcon: 'BO',
    maxPassengers: 6,
    trainingDuration: '1 day',
    launchSite: 'West Texas, USA',
    vehicleName: 'New Shepard',
    firstFlight: '2021',
    websiteUrl: 'https://www.blueorigin.com',
  },
  {
    id: 'virgin-galactic',
    provider: 'Virgin Galactic',
    name: 'VSS Unity',
    experienceType: 'suborbital',
    price: 450000,
    priceDisplay: '$450K',
    duration: '90 minutes',
    altitude: 80,
    altitudeDisplay: '80 km',
    description: 'Virgin Galactic\'s spaceplane-based experience offers a unique air-launch profile. Take off from a conventional runway, release at altitude, and ignite the rocket motor for a thrilling climb to space with panoramic Earth views.',
    features: [
      'Air-launched from carrier aircraft',
      'Up to 6 minutes of weightlessness',
      'Panoramic windows throughout',
      'Runway takeoff and landing',
      'Spacesuit included',
      'Multiple days of training experience',
    ],
    requirements: [
      'Minimum age 18 years',
      'Pass centrifuge training',
      'Medical evaluation required',
      'Physically able to withstand 3.5G',
      'Multi-day training commitment',
    ],
    status: 'active',
    logoIcon: 'VG',
    maxPassengers: 6,
    trainingDuration: '3-4 days',
    launchSite: 'Spaceport America, New Mexico',
    vehicleName: 'VSS Unity',
    firstFlight: '2021',
    websiteUrl: 'https://www.virgingalactic.com',
  },
  {
    id: 'spacex-inspiration4',
    provider: 'SpaceX',
    name: 'Crew Dragon Orbital',
    experienceType: 'orbital',
    price: 55000000,
    priceDisplay: '$55M',
    duration: 'Multi-day (3-5 days)',
    altitude: 575,
    altitudeDisplay: '575 km',
    description: 'True orbital spaceflight aboard SpaceX\'s Crew Dragon capsule. Orbit Earth for multiple days at altitudes higher than the ISS, experiencing prolonged weightlessness and witnessing 15+ sunrises and sunsets per day.',
    features: [
      'True orbital spaceflight',
      'Multi-day mission duration',
      'Cupola dome window',
      'Higher altitude than ISS',
      '15+ sunrises/sunsets per day',
      'Proven human-rated vehicle',
      'Experienced astronaut crew support',
    ],
    requirements: [
      'Extensive medical screening',
      'Several months of training',
      'Physical fitness requirements',
      'Mission-specific preparation',
      'Psychological evaluation',
    ],
    status: 'active',
    logoIcon: 'SX',
    maxPassengers: 4,
    trainingDuration: '4-6 months',
    launchSite: 'Kennedy Space Center, Florida',
    vehicleName: 'Falcon 9 / Crew Dragon',
    firstFlight: '2021',
    websiteUrl: 'https://www.spacex.com',
  },
  {
    id: 'axiom-space-station',
    provider: 'Axiom Space',
    name: 'ISS Mission',
    experienceType: 'station',
    price: 55000000,
    priceDisplay: '$55M+',
    duration: '10 days',
    altitude: 420,
    altitudeDisplay: '420 km (ISS orbit)',
    description: 'Visit the International Space Station with Axiom Space. Spend 10 days living and working alongside professional astronauts, conducting experiments, and experiencing life in microgravity on humanity\'s orbital outpost.',
    features: [
      'Visit the International Space Station',
      '10 days in orbit',
      'Live with professional astronauts',
      'Conduct microgravity experiments',
      'Earth observation opportunities',
      'Private astronaut training program',
      'Customizable mission activities',
    ],
    requirements: [
      'Comprehensive medical evaluation',
      'Extensive astronaut training program',
      'Physical fitness certification',
      'ISS crew compatibility assessment',
      'Emergency procedure proficiency',
      'Russian language basics',
    ],
    status: 'active',
    logoIcon: 'AX',
    maxPassengers: 4,
    trainingDuration: '15+ weeks',
    launchSite: 'Kennedy Space Center, Florida',
    vehicleName: 'SpaceX Crew Dragon',
    firstFlight: '2022',
    websiteUrl: 'https://www.axiomspace.com',
  },
  {
    id: 'spacex-dear-moon',
    provider: 'SpaceX',
    name: 'dearMoon Lunar Flyby',
    experienceType: 'lunar',
    price: null,
    priceDisplay: 'TBD',
    duration: '~6 days',
    altitude: null,
    altitudeDisplay: '384,400 km (Moon distance)',
    description: 'The dearMoon project aims to send a crew of artists and creatives on a lunar flyby mission aboard SpaceX\'s Starship. Loop around the Moon and return to Earth in approximately 6 days on the most ambitious private space mission ever attempted.',
    features: [
      'First civilian lunar flyby',
      'Loop around the Moon',
      'See the far side of the Moon',
      'Starship spacecraft',
      'Historic mission opportunity',
      'Creative/artistic crew',
      'Documentary coverage',
    ],
    requirements: [
      'Selected through application process',
      'Creative/artistic background preferred',
      'Willing to undergo extensive training',
      'Medical clearance for deep space',
      'Commitment to mission timeline',
    ],
    status: 'future',
    logoIcon: 'DM',
    maxPassengers: 8,
    trainingDuration: 'TBD (estimated 6+ months)',
    launchSite: 'Starbase, Texas',
    vehicleName: 'Starship',
    firstFlight: null,
    websiteUrl: 'https://dearmoon.earth',
  },
  {
    id: 'space-perspective-balloon',
    provider: 'Space Perspective',
    name: 'Spaceship Neptune',
    experienceType: 'balloon',
    price: 125000,
    priceDisplay: '$125K',
    duration: '6 hours',
    altitude: 30,
    altitudeDisplay: '30 km',
    description: 'Ascend gently to the edge of space in Space Perspective\'s pressurized Neptune capsule, lifted by a giant stratospheric balloon. Enjoy 6 hours of breathtaking views including 2 hours at peak altitude, complete with refreshments and reclining seats.',
    features: [
      'Gentle balloon ascent',
      '6-hour total experience',
      '2 hours at peak altitude',
      '360-degree panoramic views',
      'Spacious pressurized capsule',
      'Refreshments included',
      'No spacesuit required',
      'Wi-Fi connectivity',
      'Ocean splashdown recovery',
    ],
    requirements: [
      'Minimum age 18 years',
      'Basic physical fitness',
      'No extreme claustrophobia',
      'Able to board capsule',
      'Weather-dependent launch',
    ],
    status: 'upcoming',
    logoIcon: 'SP',
    maxPassengers: 8,
    trainingDuration: 'Pre-flight briefing only',
    launchSite: 'Space Coast, Florida',
    vehicleName: 'Spaceship Neptune',
    firstFlight: '2025 (planned)',
    websiteUrl: 'https://www.spaceperspective.com',
  },
];

// Experience type labels
export const EXPERIENCE_TYPES: { value: ExperienceType; label: string; icon: string; description: string }[] = [
  { value: 'suborbital', label: 'Suborbital', icon: '🚀', description: 'Brief spaceflight crossing 80-100km' },
  { value: 'orbital', label: 'Orbital', icon: '🛰️', description: 'Multi-day Earth orbit mission' },
  { value: 'station', label: 'Space Station', icon: '🏠', description: 'Visit the ISS or private stations' },
  { value: 'lunar', label: 'Lunar', icon: '🌙', description: 'Journey to or around the Moon' },
  { value: 'balloon', label: 'High-Altitude Balloon', icon: '🎈', description: 'Stratospheric ascent experience' },
];

// Provider info for filtering
export const TOURISM_PROVIDERS = [
  'Blue Origin',
  'Virgin Galactic',
  'SpaceX',
  'Axiom Space',
  'Space Perspective',
];

// Status labels
export const TOURISM_STATUS_LABELS: Record<TourismStatus, { label: string; color: string }> = {
  active: { label: 'Accepting Bookings', color: 'bg-green-500/20 text-green-400 border-green-500/30' },
  upcoming: { label: 'Coming Soon', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  sold_out: { label: 'Sold Out', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
  future: { label: 'Future Mission', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
};

// Helper functions
export function getOfferingById(id: string): SpaceTourismOffering | undefined {
  return SPACE_TOURISM_OFFERINGS.find((o) => o.id === id);
}

export function getOfferingsByProvider(provider: string): SpaceTourismOffering[] {
  return SPACE_TOURISM_OFFERINGS.filter((o) => o.provider === provider);
}

export function getOfferingsByExperienceType(type: ExperienceType): SpaceTourismOffering[] {
  return SPACE_TOURISM_OFFERINGS.filter((o) => o.experienceType === type);
}

export function getOfferingsInPriceRange(min: number, max: number): SpaceTourismOffering[] {
  return SPACE_TOURISM_OFFERINGS.filter((o) => {
    if (o.price === null) return false;
    return o.price >= min && o.price <= max;
  });
}

export function filterOfferings(options?: {
  provider?: string;
  experienceType?: ExperienceType;
  minPrice?: number;
  maxPrice?: number;
  status?: TourismStatus;
}): SpaceTourismOffering[] {
  let results = [...SPACE_TOURISM_OFFERINGS];

  if (options?.provider) {
    results = results.filter((o) => o.provider === options.provider);
  }
  if (options?.experienceType) {
    results = results.filter((o) => o.experienceType === options.experienceType);
  }
  if (options?.minPrice !== undefined) {
    results = results.filter((o) => o.price !== null && o.price >= options.minPrice!);
  }
  if (options?.maxPrice !== undefined) {
    results = results.filter((o) => o.price !== null && o.price <= options.maxPrice!);
  }
  if (options?.status) {
    results = results.filter((o) => o.status === options.status);
  }

  return results;
}
