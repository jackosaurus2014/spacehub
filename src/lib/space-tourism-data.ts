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
  // Enhanced fields
  gForces: string;
  weightlessDuration: string;
  totalFlights: number | null; // number of tourism flights completed
  founded: number | null;
  headquarters: string;
  safetyRecord: string;
}

// Tourism industry statistics
export const TOURISM_STATS = {
  totalTouristsToDate: 44,
  totalTouristsLabel: '44+',
  revenueProjection2030: '$3B',
  revenueProjection2030Value: 3000000000,
  marketGrowthRate: '17.1% CAGR',
  averageSuborbitalTraining: '3 days',
  averageOrbitalTraining: '4-6 months',
  gForcesRange: '0G - 6G',
  weightlessnessSuborbital: '3-4 minutes',
  weightlessnessOrbital: 'Days to weeks',
  firstSpaceTourist: 'Dennis Tito (2001)',
  firstSpaceTouristCost: '$20M',
  countriesRepresented: 15,
  youngestTourist: 'Oliver Daemen (18)',
  oldestTourist: 'Wally Funk (82)',
  totalInvestment: '$12B+',
  activeProviders: 5,
  plannedProviders: 7,
};

// Future destination data
export interface FutureDestination {
  id: string;
  name: string;
  icon: string;
  timeline: string;
  description: string;
  keyPlayers: string[];
  estimatedCost: string;
  distance: string;
  challenges: string[];
  status: 'in_development' | 'conceptual' | 'far_future';
}

export const FUTURE_DESTINATIONS: FutureDestination[] = [
  {
    id: 'lunar-tourism',
    name: 'Lunar Tourism',
    icon: '🌙',
    timeline: '2026-2030',
    description: 'Circumlunar flights will take tourists around the Moon and back, offering views of the lunar far side and the iconic Earthrise. SpaceX\'s Starship is the leading candidate for these missions, with dearMoon as the pathfinder.',
    keyPlayers: ['SpaceX (Starship)', 'Blue Origin (Blue Moon)', 'ispace'],
    estimatedCost: '$50M - $150M per seat',
    distance: '384,400 km',
    challenges: [
      'Radiation exposure during transit',
      'Multi-day life support requirements',
      'Communication delays',
      'Re-entry at lunar return velocities (11 km/s)',
    ],
    status: 'in_development',
  },
  {
    id: 'space-hotels',
    name: 'Orbital Space Hotels',
    icon: '🏨',
    timeline: '2027-2032',
    description: 'Purpose-built space stations designed for tourism, offering multi-day stays with luxury amenities in low Earth orbit. Guests will experience continuous microgravity, 16 sunrises per day, and Earth observation from custom-designed viewing lounges.',
    keyPlayers: ['Orbital Assembly (Voyager Station)', 'Vast (Haven-1)', 'Axiom Space (Axiom Station)', 'Bigelow Aerospace'],
    estimatedCost: '$5M - $20M per stay',
    distance: '400-500 km (LEO)',
    challenges: [
      'Station construction and assembly in orbit',
      'Maintaining artificial gravity (if applicable)',
      'Emergency evacuation procedures',
      'Long-term life support for guests',
    ],
    status: 'in_development',
  },
  {
    id: 'point-to-point',
    name: 'Point-to-Point Suborbital Travel',
    icon: '🌐',
    timeline: '2028-2035',
    description: 'Rocket-powered travel between major cities on Earth via suborbital trajectories. New York to Shanghai in 39 minutes, London to Sydney in 51 minutes. SpaceX\'s Starship could serve as the first vehicle for this revolutionary transport.',
    keyPlayers: ['SpaceX (Starship)', 'Blue Origin', 'Rocket Lab'],
    estimatedCost: '$2K - $25K per ticket (projected)',
    distance: 'Up to 20,000 km (Earth surface)',
    challenges: [
      'Sonic boom regulations over populated areas',
      'Offshore spaceport infrastructure',
      'Passenger safety at scale',
      'Cost reduction to airline-competitive levels',
    ],
    status: 'conceptual',
  },
  {
    id: 'asteroid-visits',
    name: 'Asteroid Flyby Missions',
    icon: '☄️',
    timeline: '2035-2045',
    description: 'Deep space tourism missions to visit near-Earth asteroids, offering weeks-long journeys beyond the Earth-Moon system. Tourists could witness asteroid surfaces up close, participate in scientific observations, and experience true deep space travel.',
    keyPlayers: ['SpaceX', 'NASA (partnership)', 'Planetary Resources (legacy)'],
    estimatedCost: '$100M+ per seat',
    distance: '1-50 million km',
    challenges: [
      'Months-long mission duration',
      'Deep space radiation shielding',
      'Psychological health over extended missions',
      'Propulsion requirements for rendezvous',
    ],
    status: 'far_future',
  },
  {
    id: 'mars-tourism',
    name: 'Mars Tourism',
    icon: '🔴',
    timeline: '2040-2060+',
    description: 'The ultimate frontier: tourism trips to Mars orbit or the Martian surface. A round trip would take approximately 2-3 years including surface stay. Early missions would likely orbit Mars before landing missions become feasible for tourists.',
    keyPlayers: ['SpaceX (Starship)', 'NASA/Artemis partnerships', 'International collaboration'],
    estimatedCost: '$500K - $10M+ (Musk target)',
    distance: '55-401 million km',
    challenges: [
      'Round trip duration of 2-3 years',
      'Severe radiation exposure',
      'Mars atmospheric entry and landing',
      'Surface habitat requirements',
      'Medical emergencies far from Earth',
    ],
    status: 'far_future',
  },
  {
    id: 'orbital-habitats',
    name: 'Commercial Orbital Habitats',
    icon: '🛸',
    timeline: '2030-2040',
    description: 'Large-scale rotating space habitats providing partial or full artificial gravity, designed as permanent orbital settlements with tourism as a key revenue stream. These facilities could host hundreds of guests with Earth-like living conditions.',
    keyPlayers: ['Orbital Assembly (Voyager Class)', 'Blue Origin (Orbital Reef)', 'Nanoracks (Starlab)'],
    estimatedCost: '$1M - $10M per stay',
    distance: '400-1,000 km (LEO)',
    challenges: [
      'Massive construction costs ($100B+)',
      'Rotating structure engineering',
      'Long-term habitation safety',
      'Supply chain from Earth',
    ],
    status: 'conceptual',
  },
];

// Timeline milestones for the industry
export interface TourismMilestone {
  year: number;
  event: string;
  significance: string;
  icon: string;
}

export const TOURISM_MILESTONES: TourismMilestone[] = [
  { year: 2001, event: 'Dennis Tito visits ISS', significance: 'First space tourist; paid $20M for an 8-day mission aboard ISS via Russian Soyuz.', icon: '🏆' },
  { year: 2004, event: 'SpaceShipOne wins X Prize', significance: 'First private crewed spacecraft to reach space twice in two weeks, catalyzing commercial space tourism.', icon: '🏅' },
  { year: 2009, event: 'Space Adventures orbital flights', significance: 'Seven private citizens visited ISS between 2001-2009, proving orbital tourism demand.', icon: '🛰️' },
  { year: 2021, event: 'New Shepard NS-16 (Bezos)', significance: 'Blue Origin\'s first crewed flight with Jeff Bezos, oldest (Wally Funk, 82) and youngest (Oliver Daemen, 18) astronauts.', icon: '🚀' },
  { year: 2021, event: 'VSS Unity 22 (Branson)', significance: 'Richard Branson flies to space on Virgin Galactic\'s Unity, beating Bezos by 9 days.', icon: '✈️' },
  { year: 2021, event: 'Inspiration4 (SpaceX)', significance: 'First all-civilian orbital mission. Four private citizens orbited Earth for 3 days aboard Crew Dragon.', icon: '🌍' },
  { year: 2022, event: 'Axiom Mission 1', significance: 'First fully private crew mission to ISS, spending 17 days in orbit.', icon: '🏠' },
  { year: 2023, event: 'Polaris Dawn announced', significance: 'SpaceX mission including first commercial spacewalk, pushing boundaries of private spaceflight.', icon: '🌟' },
  { year: 2024, event: 'Polaris Dawn Mission', significance: 'First commercial EVA (spacewalk) performed by civilian crew at 700km altitude.', icon: '🚶' },
  { year: 2025, event: 'Space Perspective test flights', significance: 'Stratospheric balloon tourism enters testing phase, offering gentle ascent to 30km.', icon: '🎈' },
  { year: 2026, event: 'Vast Haven-1 launch target', significance: 'First commercial single-module space station, precursor to full-scale space hotels.', icon: '🏗️' },
  { year: 2027, event: 'Voyager Station construction begins', significance: 'Orbital Assembly targets construction start for first rotating space hotel with artificial gravity.', icon: '🔮' },
];

// Seed data for space tourism offerings
export const SPACE_TOURISM_OFFERINGS: SpaceTourismOffering[] = [
  {
    id: 'virgin-galactic',
    provider: 'Virgin Galactic',
    name: 'SpaceShipTwo',
    experienceType: 'suborbital',
    price: 450000,
    priceDisplay: '$450K',
    duration: '90 minutes total',
    altitude: 90,
    altitudeDisplay: '~90 km',
    description: 'Virgin Galactic\'s SpaceShipTwo offers a unique air-launch suborbital experience. The spaceplane is carried to 15km by the WhiteKnightTwo mothership, then released to ignite its hybrid rocket motor for a thrilling climb to space. Passengers experience up to 6 minutes of weightlessness with panoramic Earth views before a gliding runway landing.',
    features: [
      'Air-launched from WhiteKnightTwo carrier',
      'Up to 6 minutes of weightlessness',
      '17 panoramic windows throughout cabin',
      'Runway takeoff and glide landing',
      'Custom Under Armour spacesuit included',
      'Multi-day astronaut readiness training',
      'NASA-recognized astronaut wings',
      'Personal window seat guaranteed',
    ],
    requirements: [
      'Minimum age 18 years',
      'Pass centrifuge and altitude training',
      'Medical evaluation required',
      'Physically able to withstand 3.5G',
      'Multi-day Spaceport America training',
      'Not pregnant or recently had surgery',
    ],
    status: 'active',
    logoIcon: 'VG',
    maxPassengers: 6,
    trainingDuration: '3-4 days',
    launchSite: 'Spaceport America, New Mexico',
    vehicleName: 'SpaceShipTwo (VSS Unity/Imagine)',
    firstFlight: '2021',
    websiteUrl: 'https://www.virgingalactic.com',
    gForces: '3.5G max during boost, 6G during re-entry',
    weightlessDuration: '5-6 minutes',
    totalFlights: 7,
    founded: 2004,
    headquarters: 'Las Cruces, New Mexico',
    safetyRecord: '7 crewed flights, 1 fatal test accident (2014)',
  },
  {
    id: 'blue-origin-new-shepard',
    provider: 'Blue Origin',
    name: 'New Shepard',
    experienceType: 'suborbital',
    price: 250000,
    priceDisplay: '$200-300K est.',
    duration: '11 minutes',
    altitude: 100,
    altitudeDisplay: '100+ km',
    description: 'Blue Origin\'s New Shepard is a fully reusable vertical-takeoff, vertical-landing suborbital rocket. It crosses the internationally recognized Karman line at 100km, giving passengers 3-4 minutes of weightlessness while gazing through the largest windows ever flown in space. The fully autonomous flight requires minimal training.',
    features: [
      'Crosses the Karman line (100+ km)',
      '3-4 minutes of weightlessness',
      'Largest windows ever flown in space',
      'Fully autonomous flight (no pilot needed)',
      'Pressurized crew capsule with reclining seats',
      'Views of Earth\'s curvature and thin blue atmosphere',
      'Propulsive booster landing for reuse',
      'Emergency escape system throughout flight',
    ],
    requirements: [
      'Minimum age 18 years',
      'Height between 5\'0" and 6\'4"',
      'Weight between 110-223 lbs',
      'Able to climb launch tower (7 flights of stairs)',
      'Medical clearance required',
      'Able to fasten/unfasten harness within 15 seconds',
    ],
    status: 'active',
    logoIcon: 'BO',
    maxPassengers: 6,
    trainingDuration: '1 day (14 hours)',
    launchSite: 'Launch Site One, West Texas',
    vehicleName: 'New Shepard',
    firstFlight: '2021',
    websiteUrl: 'https://www.blueorigin.com',
    gForces: '3G during ascent, 5G during descent',
    weightlessDuration: '3-4 minutes',
    totalFlights: 9,
    founded: 2000,
    headquarters: 'Kent, Washington',
    safetyRecord: '9 crewed flights, 0 incidents; 1 uncrewed failure (NS-23, 2022)',
  },
  {
    id: 'spacex-crew-dragon',
    provider: 'SpaceX',
    name: 'Crew Dragon Orbital',
    experienceType: 'orbital',
    price: 55000000,
    priceDisplay: '~$55M/seat',
    duration: '3-5 days (free-flight) / 10+ days (ISS)',
    altitude: 575,
    altitudeDisplay: '200-575 km',
    description: 'True orbital spaceflight aboard SpaceX\'s proven Crew Dragon capsule, launched on the Falcon 9 rocket. Private missions like Inspiration4 and Polaris Dawn have demonstrated multi-day free-flight missions at altitudes exceeding the ISS. Passengers experience prolonged weightlessness, witness 15+ sunrises per day, and can participate in scientific research.',
    features: [
      'True orbital spaceflight (LEO)',
      'Multi-day mission duration (3-10+ days)',
      'Cupola dome observation window',
      'Can reach altitudes higher than ISS',
      '15+ sunrises and sunsets per day',
      'Proven human-rated vehicle (50+ crewed flights)',
      'Experienced astronaut crew support',
      'In-orbit scientific research opportunities',
      'First commercial EVA capability (Polaris Dawn)',
    ],
    requirements: [
      'Extensive medical screening (NASA-level)',
      '4-6 months of astronaut training',
      'Physical fitness certification',
      'Mission-specific preparation and simulations',
      'Psychological evaluation',
      'Centrifuge and altitude chamber training',
    ],
    status: 'active',
    logoIcon: 'SX',
    maxPassengers: 4,
    trainingDuration: '4-6 months',
    launchSite: 'Kennedy Space Center, LC-39A, Florida',
    vehicleName: 'Falcon 9 / Crew Dragon',
    firstFlight: '2021 (tourism)',
    websiteUrl: 'https://www.spacex.com',
    gForces: '3-4G during ascent, 4-6G during re-entry',
    weightlessDuration: 'Continuous for 3-10+ days',
    totalFlights: 5,
    founded: 2002,
    headquarters: 'Hawthorne, California',
    safetyRecord: '50+ crewed flights, 0 loss-of-crew incidents',
  },
  {
    id: 'spacex-starship',
    provider: 'SpaceX',
    name: 'Starship Tourism',
    experienceType: 'orbital',
    price: 2000000,
    priceDisplay: '$100K-$10M est.',
    duration: 'Hours (suborbital) to days (orbital)',
    altitude: null,
    altitudeDisplay: '100-400+ km',
    description: 'SpaceX\'s Starship is the world\'s most powerful rocket, designed for missions ranging from Earth point-to-point suborbital hops to Mars expeditions. With capacity for 100+ passengers, Starship promises to dramatically reduce per-seat costs to orbit. Tourism applications include suborbital flights, orbital stays, and lunar flybys.',
    features: [
      'World\'s largest and most powerful rocket',
      'Capacity for 100+ passengers',
      'Dramatically lower per-seat orbital costs',
      'Point-to-point Earth travel capability',
      'Lunar flyby mission capability',
      'Full reusability (booster + ship)',
      'Massive interior volume for passenger comfort',
      'Potential for artificial gravity via rotation',
    ],
    requirements: [
      'Requirements TBD pending tourism program launch',
      'Expected to require basic medical clearance',
      'Training duration varies by mission profile',
      'Suborbital: minimal training expected',
      'Orbital/lunar: extensive training required',
    ],
    status: 'future',
    logoIcon: 'SS',
    maxPassengers: 100,
    trainingDuration: 'TBD (varies by mission)',
    launchSite: 'Starbase, Boca Chica, Texas',
    vehicleName: 'Starship / Super Heavy',
    firstFlight: null,
    websiteUrl: 'https://www.spacex.com/vehicles/starship/',
    gForces: '~3G during ascent (estimated)',
    weightlessDuration: 'Minutes (suborbital) to days (orbital)',
    totalFlights: null,
    founded: 2002,
    headquarters: 'Hawthorne, California',
    safetyRecord: 'In testing phase; multiple successful orbital test flights',
  },
  {
    id: 'axiom-space-station',
    provider: 'Axiom Space',
    name: 'ISS Private Missions',
    experienceType: 'station',
    price: 55000000,
    priceDisplay: '~$55M/seat',
    duration: '10-14 days',
    altitude: 420,
    altitudeDisplay: '420 km (ISS orbit)',
    description: 'Axiom Space operates private astronaut missions to the International Space Station, launching aboard SpaceX Crew Dragon. Spend 10-14 days living alongside professional astronauts, conducting microgravity experiments, Earth observation, and experiencing daily life on humanity\'s orbital outpost. Axiom is also building its own commercial station modules.',
    features: [
      'Visit the International Space Station',
      '10-14 days living in orbit',
      'Live with professional astronauts',
      'Conduct microgravity research experiments',
      'Earth observation from ISS Cupola',
      'Full private astronaut training program',
      'Customizable mission activities and research',
      'Launch and return on SpaceX Crew Dragon',
      'Post-flight astronaut certification',
    ],
    requirements: [
      'Comprehensive medical evaluation',
      'Extensive astronaut training program (15+ weeks)',
      'Physical fitness certification (NASA-adjacent standards)',
      'ISS crew compatibility assessment',
      'Emergency procedure proficiency',
      'Basic Russian language familiarity',
      'Psychological evaluation',
    ],
    status: 'active',
    logoIcon: 'AX',
    maxPassengers: 4,
    trainingDuration: '15+ weeks',
    launchSite: 'Kennedy Space Center, LC-39A, Florida',
    vehicleName: 'SpaceX Falcon 9 / Crew Dragon',
    firstFlight: '2022',
    websiteUrl: 'https://www.axiomspace.com',
    gForces: '3-4G ascent, 4-6G re-entry (Crew Dragon)',
    weightlessDuration: 'Continuous for 10-14 days',
    totalFlights: 4,
    founded: 2016,
    headquarters: 'Houston, Texas',
    safetyRecord: '4 successful private missions to ISS',
  },
  {
    id: 'space-perspective-balloon',
    provider: 'Space Perspective',
    name: 'Spaceship Neptune',
    experienceType: 'balloon',
    price: 125000,
    priceDisplay: '$125K',
    duration: '6 hours total',
    altitude: 30,
    altitudeDisplay: '30 km (edge of space)',
    description: 'Ascend gently to the edge of space in Space Perspective\'s Spaceship Neptune, a pressurized capsule lifted by a massive stratospheric balloon. Enjoy 6 hours of breathtaking views including 2 hours at peak altitude of 30km. With reclining seats, refreshments, Wi-Fi, and a zero-G-force ascent, this is the most accessible space tourism experience available.',
    features: [
      'Gentle balloon ascent (no rocket, no G-forces)',
      '6-hour total experience (2 hours at peak)',
      '360-degree panoramic floor-to-ceiling windows',
      'See the curvature of Earth and black sky of space',
      'Spacious pressurized capsule with lounge seating',
      'Craft cocktails and refreshments included',
      'No spacesuit required - wear what you want',
      'Wi-Fi connectivity for live-sharing',
      'Ocean splashdown and ship recovery',
    ],
    requirements: [
      'Minimum age 18 years',
      'Basic physical fitness (no extreme demands)',
      'No extreme claustrophobia',
      'Able to board and egress capsule',
      'Weather-dependent launch scheduling',
    ],
    status: 'upcoming',
    logoIcon: 'SP',
    maxPassengers: 8,
    trainingDuration: 'Pre-flight briefing only (few hours)',
    launchSite: 'Space Coast Spaceport, Florida',
    vehicleName: 'Spaceship Neptune (SpaceBalloon)',
    firstFlight: '2025 (planned)',
    websiteUrl: 'https://www.spaceperspective.com',
    gForces: '0G additional forces (gentle balloon ascent)',
    weightlessDuration: 'N/A (not weightless - stratospheric, not orbital)',
    totalFlights: null,
    founded: 2019,
    headquarters: 'Cape Canaveral, Florida',
    safetyRecord: 'Multiple successful uncrewed test flights',
  },
  {
    id: 'world-view-stratollite',
    provider: 'World View',
    name: 'Stratospheric Explorer',
    experienceType: 'balloon',
    price: 50000,
    priceDisplay: '$50K-$500K',
    duration: '6-12 hours',
    altitude: 30,
    altitudeDisplay: '30 km',
    description: 'World View offers stratospheric balloon flights to 30km altitude using their Stratollite technology. The experience focuses on prolonged, gentle ascent to the edge of space with extended time at peak altitude for photography, contemplation, and Earth observation. Available in tourism and research configurations.',
    features: [
      'Extended stratospheric float duration',
      'Large pressurized gondola',
      'Research and tourism configurations',
      'Gentle ascent with no G-forces',
      'Earth curvature and black sky views',
      'Extended time at peak altitude',
      'Premium interior with viewing areas',
      'Professional photography support',
    ],
    requirements: [
      'Minimum age 18 years',
      'Basic medical clearance',
      'No severe claustrophobia',
      'Able to sit comfortably for extended periods',
      'Pre-flight orientation session',
    ],
    status: 'upcoming',
    logoIcon: 'WV',
    maxPassengers: 8,
    trainingDuration: 'Pre-flight orientation (1 day)',
    launchSite: 'Tucson, Arizona (and other sites)',
    vehicleName: 'Stratollite / World View Capsule',
    firstFlight: '2025 (planned)',
    websiteUrl: 'https://www.worldview.space',
    gForces: '0G additional forces (balloon ascent)',
    weightlessDuration: 'N/A (stratospheric, not weightless)',
    totalFlights: null,
    founded: 2012,
    headquarters: 'Tucson, Arizona',
    safetyRecord: 'Extensive uncrewed Stratollite flight heritage',
  },
  {
    id: 'orbital-assembly-voyager',
    provider: 'Orbital Assembly',
    name: 'Voyager Station',
    experienceType: 'station',
    price: 5000000,
    priceDisplay: '$5M+ est.',
    duration: 'Multi-day stay (3-14 days)',
    altitude: 500,
    altitudeDisplay: '~500 km (LEO)',
    description: 'Orbital Assembly\'s Voyager Station is designed to be the world\'s first space hotel with artificial gravity. A rotating wheel structure will provide partial gravity for guest comfort while offering stunning Earth views. The station will include luxury suites, restaurants, recreation areas, and research facilities.',
    features: [
      'World\'s first rotating space hotel',
      'Partial artificial gravity for comfort',
      'Luxury guest suites with Earth views',
      'On-board restaurant and bar',
      'Recreation and fitness areas',
      'Research and conference facilities',
      'Multiple gravity levels (hub vs rim)',
      'Space-themed entertainment and activities',
      'Regular shuttle service from Earth',
    ],
    requirements: [
      'Medical screening (less restrictive than orbital flights)',
      'Pre-flight orientation and safety training',
      'Physical ability to handle reduced gravity',
      'Emergency evacuation training',
      'Age requirements TBD',
    ],
    status: 'future',
    logoIcon: 'OA',
    maxPassengers: 400,
    trainingDuration: '3-5 days pre-flight',
    launchSite: 'TBD (shuttle service)',
    vehicleName: 'Voyager Station (rotating habitat)',
    firstFlight: '2027+ (targeted)',
    websiteUrl: 'https://orbitalassembly.com',
    gForces: 'Varies by transport vehicle',
    weightlessDuration: 'Available at station hub (zero-G zone)',
    totalFlights: null,
    founded: 2019,
    headquarters: 'Fontana, California',
    safetyRecord: 'Pre-construction phase',
  },
  {
    id: 'vast-haven-1',
    provider: 'Vast',
    name: 'Haven-1 Station',
    experienceType: 'station',
    price: null,
    priceDisplay: 'TBD',
    duration: 'Up to 30 days',
    altitude: 400,
    altitudeDisplay: '~400 km (LEO)',
    description: 'Vast\'s Haven-1 is a commercial single-module space station designed to support crews of up to 4 for missions lasting up to 30 days. It serves as a pathfinder for Vast\'s larger multi-module stations. Haven-1 will host both private astronaut missions and research activities, launching aboard SpaceX Falcon 9.',
    features: [
      'First commercial single-module space station',
      'Missions up to 30 days',
      'Research and tourism combined',
      'Large viewport windows for Earth observation',
      'Private crew quarters',
      'Microgravity research facilities',
      'Pathfinder for larger Vast stations',
      'SpaceX Crew Dragon transport',
    ],
    requirements: [
      'Astronaut-level medical evaluation',
      'Multi-month training program',
      'Physical fitness certification',
      'Mission-specific preparation',
      'Psychological evaluation for extended stay',
    ],
    status: 'upcoming',
    logoIcon: 'VS',
    maxPassengers: 4,
    trainingDuration: 'Several months',
    launchSite: 'Kennedy Space Center, Florida',
    vehicleName: 'SpaceX Falcon 9 / Crew Dragon',
    firstFlight: '2025-2026 (targeted)',
    websiteUrl: 'https://www.vast.space',
    gForces: '3-4G ascent, 4-6G re-entry (Crew Dragon)',
    weightlessDuration: 'Continuous for up to 30 days',
    totalFlights: null,
    founded: 2021,
    headquarters: 'Long Beach, California',
    safetyRecord: 'Pre-launch phase; leveraging SpaceX Crew Dragon safety record',
  },
  {
    id: 'sierra-space-dream-chaser',
    provider: 'Sierra Space',
    name: 'Dream Chaser',
    experienceType: 'orbital',
    price: null,
    priceDisplay: 'TBD',
    duration: 'Days to weeks',
    altitude: 400,
    altitudeDisplay: '400 km (LEO)',
    description: 'Sierra Space\'s Dream Chaser is a reusable lifting-body spaceplane that launches on a Vulcan Centaur rocket and lands on conventional runways like the Space Shuttle. Initially designed for cargo to ISS, the crewed variant will transport astronauts and private citizens to low Earth orbit and commercial space stations.',
    features: [
      'Reusable spaceplane with runway landing',
      'Low-G re-entry (1.5G max) - gentlest of any capsule',
      'Piloted vehicle (not capsule-based)',
      'Conventional runway landing',
      'Designed for ISS and commercial station access',
      'Up to 7 crew capacity in crewed variant',
      'Folding wings for launch fairing fit',
      'Multiple mission configurations',
    ],
    requirements: [
      'Medical clearance (standards TBD)',
      'Astronaut training program',
      'Physical fitness requirements',
      'Mission-specific preparation',
      'Requirements to be finalized for tourism',
    ],
    status: 'future',
    logoIcon: 'SS',
    maxPassengers: 7,
    trainingDuration: 'TBD (estimated weeks to months)',
    launchSite: 'Cape Canaveral, Florida',
    vehicleName: 'Dream Chaser / Vulcan Centaur',
    firstFlight: null,
    websiteUrl: 'https://www.sierraspace.com',
    gForces: '3G ascent, 1.5G re-entry (gentlest)',
    weightlessDuration: 'Continuous during orbital mission',
    totalFlights: null,
    founded: 2021,
    headquarters: 'Louisville, Colorado',
    safetyRecord: 'Cargo variant in testing; crewed variant in development',
  },
  {
    id: 'spacex-dear-moon',
    provider: 'SpaceX',
    name: 'dearMoon Lunar Flyby',
    experienceType: 'lunar',
    price: null,
    priceDisplay: 'TBD (privately funded)',
    duration: '~6 days round trip',
    altitude: null,
    altitudeDisplay: '384,400 km (Moon distance)',
    description: 'The dearMoon project, funded by Japanese billionaire Yusaku Maezawa, aims to send a crew of artists and creatives on a circumlunar flyby mission aboard SpaceX\'s Starship. The crew will loop around the Moon, seeing the far side and experiencing the iconic Earthrise, on what would be the most ambitious private space mission ever attempted.',
    features: [
      'First civilian lunar flyby mission',
      'Loop around the Moon (free-return trajectory)',
      'View the lunar far side up close',
      'Experience Earthrise from cislunar space',
      'Starship - world\'s most powerful rocket',
      'Curated crew of artists and creatives',
      'Documentary and media coverage',
      'Historic Apollo-era trajectory recreation',
    ],
    requirements: [
      'Selected through competitive application process',
      'Creative/artistic background preferred',
      'Willing to undergo extensive astronaut training',
      'Medical clearance for deep space travel',
      'Commitment to multi-year mission timeline',
      'Ability to handle psychological isolation',
    ],
    status: 'future',
    logoIcon: 'DM',
    maxPassengers: 8,
    trainingDuration: 'TBD (estimated 6-12 months)',
    launchSite: 'Starbase, Boca Chica, Texas',
    vehicleName: 'Starship / Super Heavy',
    firstFlight: null,
    websiteUrl: 'https://dearmoon.earth',
    gForces: '~3G ascent (estimated), ~6G re-entry',
    weightlessDuration: 'Continuous for ~6 days (coast phase)',
    totalFlights: null,
    founded: null,
    headquarters: 'N/A (SpaceX partnership)',
    safetyRecord: 'Pending first mission',
  },
  {
    id: 'blue-origin-orbital-reef',
    provider: 'Blue Origin',
    name: 'Orbital Reef Station',
    experienceType: 'station',
    price: null,
    priceDisplay: 'TBD',
    duration: 'Days to weeks',
    altitude: 500,
    altitudeDisplay: '~500 km (LEO)',
    description: 'Orbital Reef is a planned commercial space station being developed by Blue Origin in partnership with Sierra Space, Boeing, and others. Designed as a "mixed-use business park" in space, it will accommodate tourism, research, manufacturing, and media production with capacity for up to 10 residents.',
    features: [
      'Mixed-use commercial space station',
      'Tourism, research, and manufacturing',
      'Large habitable volume',
      'Multiple docking ports for visiting vehicles',
      'Earth observation and photography',
      'Microgravity research laboratories',
      'Media production capabilities',
      'Partnership with Sierra Space and Boeing',
    ],
    requirements: [
      'Medical evaluation and clearance',
      'Astronaut training program',
      'Physical fitness requirements',
      'Station safety orientation',
      'Requirements to be defined closer to operations',
    ],
    status: 'future',
    logoIcon: 'OR',
    maxPassengers: 10,
    trainingDuration: 'TBD (weeks to months)',
    launchSite: 'Cape Canaveral or KSC, Florida',
    vehicleName: 'Various (New Glenn, Dream Chaser, Starliner)',
    firstFlight: '2027+ (targeted)',
    websiteUrl: 'https://www.orbitalreef.com',
    gForces: 'Varies by transport vehicle',
    weightlessDuration: 'Continuous during station stay',
    totalFlights: null,
    founded: 2021,
    headquarters: 'Kent, Washington',
    safetyRecord: 'Pre-construction phase',
  },
];

// Experience type labels
export const EXPERIENCE_TYPES: { value: ExperienceType; label: string; icon: string; description: string }[] = [
  { value: 'suborbital', label: 'Suborbital', icon: '🚀', description: 'Brief spaceflight crossing 80-100km altitude boundary' },
  { value: 'orbital', label: 'Orbital', icon: '🛰️', description: 'Multi-day mission orbiting Earth in LEO' },
  { value: 'station', label: 'Space Station', icon: '🏠', description: 'Visit ISS or commercial space stations' },
  { value: 'lunar', label: 'Lunar', icon: '🌙', description: 'Journey to or around the Moon' },
  { value: 'balloon', label: 'High-Altitude Balloon', icon: '🎈', description: 'Gentle stratospheric ascent to 30km' },
];

// Provider info for filtering
export const TOURISM_PROVIDERS = [
  'Axiom Space',
  'Blue Origin',
  'Orbital Assembly',
  'Sierra Space',
  'Space Perspective',
  'SpaceX',
  'Vast',
  'Virgin Galactic',
  'World View',
];

// Status labels
export const TOURISM_STATUS_LABELS: Record<TourismStatus, { label: string; color: string }> = {
  active: { label: 'Accepting Bookings', color: 'bg-green-500/20 text-green-400 border-green-500/30' },
  upcoming: { label: 'Coming Soon', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  sold_out: { label: 'Sold Out', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
  future: { label: 'Future Mission', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
};

// Comparison table data for quick reference
export interface ComparisonRow {
  provider: string;
  vehicle: string;
  type: ExperienceType;
  altitude: string;
  duration: string;
  gForces: string;
  training: string;
  price: string;
  seats: number;
  status: TourismStatus;
}

export const QUICK_COMPARISON_TABLE: ComparisonRow[] = [
  { provider: 'Virgin Galactic', vehicle: 'SpaceShipTwo', type: 'suborbital', altitude: '~90 km', duration: '90 min total', gForces: '3.5-6G', training: '3-4 days', price: '$450K', seats: 6, status: 'active' },
  { provider: 'Blue Origin', vehicle: 'New Shepard', type: 'suborbital', altitude: '100+ km', duration: '11 min', gForces: '3-5G', training: '1 day', price: '$200-300K', seats: 6, status: 'active' },
  { provider: 'SpaceX', vehicle: 'Crew Dragon', type: 'orbital', altitude: '200-575 km', duration: '3-10 days', gForces: '3-6G', training: '4-6 months', price: '~$55M', seats: 4, status: 'active' },
  { provider: 'SpaceX', vehicle: 'Starship', type: 'orbital', altitude: '100-400+ km', duration: 'Hours-days', gForces: '~3G', training: 'TBD', price: '$100K-$10M', seats: 100, status: 'future' },
  { provider: 'Axiom Space', vehicle: 'Crew Dragon (ISS)', type: 'station', altitude: '420 km', duration: '10-14 days', gForces: '3-6G', training: '15+ weeks', price: '~$55M', seats: 4, status: 'active' },
  { provider: 'Space Perspective', vehicle: 'Neptune', type: 'balloon', altitude: '30 km', duration: '6 hours', gForces: '0G extra', training: 'Briefing', price: '$125K', seats: 8, status: 'upcoming' },
  { provider: 'World View', vehicle: 'Stratollite', type: 'balloon', altitude: '30 km', duration: '6-12 hours', gForces: '0G extra', training: '1 day', price: '$50K-$500K', seats: 8, status: 'upcoming' },
  { provider: 'Orbital Assembly', vehicle: 'Voyager Station', type: 'station', altitude: '~500 km', duration: '3-14 days', gForces: 'Varies', training: '3-5 days', price: '$5M+', seats: 400, status: 'future' },
  { provider: 'Vast', vehicle: 'Haven-1', type: 'station', altitude: '~400 km', duration: 'Up to 30 days', gForces: '3-6G', training: 'Months', price: 'TBD', seats: 4, status: 'upcoming' },
  { provider: 'Sierra Space', vehicle: 'Dream Chaser', type: 'orbital', altitude: '400 km', duration: 'Days-weeks', gForces: '3-1.5G', training: 'TBD', price: 'TBD', seats: 7, status: 'future' },
  { provider: 'SpaceX', vehicle: 'Starship (Lunar)', type: 'lunar', altitude: '384,400 km', duration: '~6 days', gForces: '3-6G', training: '6-12 months', price: 'TBD', seats: 8, status: 'future' },
  { provider: 'Blue Origin', vehicle: 'Orbital Reef', type: 'station', altitude: '~500 km', duration: 'Days-weeks', gForces: 'Varies', training: 'TBD', price: 'TBD', seats: 10, status: 'future' },
];

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
