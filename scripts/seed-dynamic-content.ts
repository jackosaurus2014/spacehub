/**
 * Seed script for DynamicContent table
 *
 * Migrates all hardcoded data from 14+ pages into the DynamicContent database table.
 * Run with: npx tsx scripts/seed-dynamic-content.ts
 *
 * This script extracts const arrays from page files and stores them as JSON blobs
 * with appropriate TTL policies from freshness-policies.ts
 */

import { PrismaClient } from '@prisma/client';
import { getExpiresAt, FRESHNESS_POLICIES } from '../src/lib/freshness-policies';

const prisma = new PrismaClient();

// Helper to upsert content with standard fields
async function upsertContent(
  module: string,
  section: string,
  data: any[],
  options: {
    sourceType?: string;
    aiConfidence?: number;
    isActive?: boolean;
    version?: number;
  } = {}
) {
  const now = new Date();
  const contentKey = `${module}:${section}`;

  const record = {
    module,
    section,
    data: JSON.stringify(data),
    sourceType: options.sourceType || 'seed',
    expiresAt: getExpiresAt(module),
    refreshedAt: now,
    lastVerified: now,
    aiConfidence: options.aiConfidence ?? 1.0,
    isActive: options.isActive ?? true,
    version: options.version ?? 1,
  };

  await prisma.dynamicContent.upsert({
    where: { contentKey },
    update: record,
    create: { contentKey, ...record },
  });

  console.log(`  ✓ ${contentKey}`);
}

async function main() {
  console.log('🌌 Starting DynamicContent seed...\n');

  // ═══════════════════════════════════════════════════════════════════
  // 1. SPACE STATIONS
  // ═══════════════════════════════════════════════════════════════════

  console.log('📡 Seeding space-stations...');

  await upsertContent('space-stations', 'active-stations', [
    {
      id: 'iss',
      name: 'International Space Station (ISS)',
      operator: 'NASA / Roscosmos / ESA / JAXA / CSA',
      country: 'International',
      status: 'operational',
      orbit: 'Low Earth Orbit (LEO)',
      altitude: '~408 km',
      inclination: '51.6 degrees',
      crewCapacity: 6,
      currentCrew: 7,
      mass: '~420,000 kg',
      pressurizedVolume: '916 m3',
      power: '~215 kW (solar arrays)',
      dockingPorts: 8,
      modules: [
        { name: 'Zarya (FGB)', type: 'Control Module', launchDate: 'Nov 1998', mass: '19,323 kg', builder: 'Khrunichev' },
        { name: 'Unity (Node 1)', type: 'Connecting Node', launchDate: 'Dec 1998', mass: '11,612 kg', builder: 'Boeing' },
        { name: 'Zvezda (SM)', type: 'Service Module', launchDate: 'Jul 2000', mass: '19,051 kg', builder: 'RSC Energia' },
        { name: 'Destiny', type: 'US Laboratory', launchDate: 'Feb 2001', mass: '14,515 kg', builder: 'Boeing' },
        { name: 'Quest', type: 'Joint Airlock', launchDate: 'Jul 2001', mass: '6,064 kg', builder: 'Boeing' },
        { name: 'Harmony (Node 2)', type: 'Connecting Node', launchDate: 'Oct 2007', mass: '14,288 kg', builder: 'Thales Alenia Space' },
        { name: 'Columbus', type: 'ESA Laboratory', launchDate: 'Feb 2008', mass: '10,300 kg', builder: 'Thales Alenia Space' },
        { name: 'Kibo (JEM)', type: 'JAXA Laboratory', launchDate: 'Jun 2008', mass: '15,900 kg', builder: 'JAXA / Mitsubishi' },
        { name: 'Tranquility (Node 3)', type: 'Life Support Node', launchDate: 'Feb 2010', mass: '15,500 kg', builder: 'Thales Alenia Space' },
        { name: 'Cupola', type: 'Observation Module', launchDate: 'Feb 2010', mass: '1,805 kg', builder: 'Thales Alenia Space' },
        { name: 'Rassvet (MRM-1)', type: 'Docking/Storage', launchDate: 'May 2010', mass: '5,075 kg', builder: 'RSC Energia' },
        { name: 'BEAM', type: 'Expandable Module', launchDate: 'Apr 2016', mass: '1,413 kg', builder: 'Bigelow Aerospace' },
        { name: 'Nauka (MLM)', type: 'Multipurpose Lab', launchDate: 'Jul 2021', mass: '20,350 kg', builder: 'Khrunichev' },
        { name: 'Prichal', type: 'Docking Node', launchDate: 'Nov 2021', mass: '3,890 kg', builder: 'RSC Energia' },
      ],
      visitingVehicles: [
        { name: 'Crew Dragon', type: 'crew', operator: 'SpaceX', status: 'active' },
        { name: 'Soyuz MS', type: 'crew', operator: 'Roscosmos', status: 'active' },
        { name: 'Cargo Dragon', type: 'cargo', operator: 'SpaceX', status: 'active' },
        { name: 'Cygnus', type: 'cargo', operator: 'Northrop Grumman', status: 'active' },
        { name: 'Progress MS', type: 'cargo', operator: 'Roscosmos', status: 'active' },
        { name: 'HTV-X', type: 'cargo', operator: 'JAXA', status: 'active' },
        { name: 'Starliner', type: 'crew', operator: 'Boeing', status: 'testing' },
      ],
      launchDate: 'November 20, 1998',
      continuousOccupation: 'Since November 2, 2000 (Expedition 1)',
      plannedRetirement: '~2030 (controlled deorbit planned)',
      researchFacilities: [
        'US National Laboratory',
        'Columbus (ESA) laboratory',
        'Kibo (JAXA) laboratory with exposed facility',
        'Nauka (Russian) multipurpose laboratory',
        'Cold Atom Laboratory',
        'Materials Science Research Rack',
        'Combustion Integrated Rack',
        'Fluids Integrated Rack',
        'Microgravity Science Glovebox',
      ],
      description: 'The International Space Station is the largest human-made structure in space, a collaborative effort of 15 nations. It has been continuously inhabited since November 2, 2000, making it the longest continuous human presence in low Earth orbit -- over 25 years. The ISS orbits Earth approximately every 90 minutes at a speed of about 28,000 km/h. Over 270 individuals from 21 countries have visited the station. The ISS serves as a microgravity and space environment research laboratory where scientific research is conducted in astrobiology, astronomy, meteorology, physics, and other fields. It is scheduled for decommissioning around 2030, with NASA planning a controlled deorbit using a dedicated deorbit vehicle.',
    },
    {
      id: 'tiangong',
      name: 'Tiangong Space Station',
      operator: 'CMSA (China Manned Space Agency)',
      country: 'China',
      status: 'operational',
      orbit: 'Low Earth Orbit (LEO)',
      altitude: '~390 km',
      inclination: '41.5 degrees',
      crewCapacity: 3,
      currentCrew: 3,
      mass: '~100,000 kg (with visiting vehicles)',
      pressurizedVolume: '~340 m3',
      power: '~100 kW (solar arrays)',
      dockingPorts: 5,
      modules: [
        { name: 'Tianhe (Core Module)', type: 'Core/Living Module', launchDate: 'Apr 2021', mass: '22,600 kg', builder: 'CAST' },
        { name: 'Wentian', type: 'Laboratory Module', launchDate: 'Jul 2022', mass: '23,000 kg', builder: 'CAST' },
        { name: 'Mengtian', type: 'Laboratory Module', launchDate: 'Oct 2022', mass: '23,000 kg', builder: 'CAST' },
      ],
      visitingVehicles: [
        { name: 'Shenzhou', type: 'crew', operator: 'CMSA', status: 'active' },
        { name: 'Tianzhou', type: 'cargo', operator: 'CMSA', status: 'active' },
      ],
      launchDate: 'April 29, 2021 (Tianhe core)',
      continuousOccupation: 'Since June 2022 (Shenzhou-14)',
      plannedRetirement: '2035+ (designed for 15+ year lifespan)',
      researchFacilities: [
        'Wentian laboratory (life sciences, biotechnology)',
        'Mengtian laboratory (microgravity physics, fluid science)',
        'Exposed experiment platform (space science payloads)',
        'Robotic arm (10m, 25-ton capacity)',
        'Xuntian space telescope (co-orbital, 2m aperture)',
        'Cold atom clock experiments',
        'Containerless processing facilities',
      ],
      description: 'China\'s Tiangong (meaning "Heavenly Palace") is the country\'s permanently crewed space station in low Earth orbit. The T-shaped three-module station was assembled between 2021 and 2022, with Tianhe serving as the core living and command module, and Wentian and Mengtian as laboratory modules. The station supports a crew of 3, with 6 during rotation handovers. China plans to expand Tiangong with additional modules over the coming years, potentially increasing its mass to over 180 tonnes. The associated Xuntian Space Telescope, a Hubble-class observatory, orbits near the station and can dock for servicing. China has invited international collaboration, with experiments from multiple countries being conducted aboard.',
    },
  ]);

  await upsertContent('space-stations', 'commercial-stations', [
    {
      id: 'axiom',
      name: 'Axiom Station',
      developer: 'Axiom Space',
      partners: ['NASA', 'Thales Alenia Space', 'SpaceX'],
      status: 'assembly',
      fundingSource: 'NASA NextSTEP-2 ISS module contract ($140M) + private funding',
      estimatedCost: '$2B+',
      targetLaunch: 'Axiom Hab 1 module: 2026 (attached to ISS), free-flying: ~2028-2030',
      crewCapacity: 8,
      pressurizedVolume: 'TBD (multi-module station)',
      orbit: 'LEO (~400 km)',
      launchVehicle: 'SpaceX Falcon Heavy / Starship',
      capabilities: [
        'Initially attached to ISS Node 2 forward port',
        'Modules detach to become free-flying station when ISS retires',
        'Research and manufacturing in microgravity',
        'Earth observation cupola window',
        'Commercial astronaut missions (Ax-1 through Ax-4 completed/planned)',
        'In-space manufacturing and materials science',
        'Space tourism and sovereign astronaut training',
      ],
      nasaCLD: false,
      description: 'Axiom Space is building the world\'s first commercial space station. The station will initially attach modules to the ISS beginning in 2026, then detach to become an independent free-flying station when the ISS is retired. Axiom has already conducted multiple private astronaut missions (Ax-1, Ax-2, Ax-3, Ax-4) to the ISS using SpaceX Crew Dragon. The company was awarded $140 million by NASA under the NextSTEP-2 program for a commercial ISS module. Axiom Station is designed to serve researchers, manufacturers, and sovereign astronauts from countries that don\'t have their own space programs.',
    },
    {
      id: 'vast-haven1',
      name: 'Haven-1',
      developer: 'Vast',
      partners: ['SpaceX', 'Launcher (Vast subsidiary)'],
      status: 'development',
      fundingSource: 'Private funding (~$400M+ raised)',
      targetLaunch: 'NET 2026 (on SpaceX Falcon 9)',
      crewCapacity: 4,
      pressurizedVolume: '~100 m3',
      orbit: 'LEO',
      launchVehicle: 'SpaceX Falcon 9',
      capabilities: [
        'Single-module station (first commercial single-launch station)',
        'Artificial gravity research (future Haven-2 rotating station)',
        'Crew transported via SpaceX Crew Dragon',
        'Up to 30-day crew missions',
        'Microgravity research platform',
        'Pathfinder for larger Vast stations',
      ],
      nasaCLD: false,
      description: 'Vast\'s Haven-1 aims to be the world\'s first commercial space station to achieve orbit, launching as a single module aboard a SpaceX Falcon 9 rocket. Founded by cryptocurrency entrepreneur Jed McCaleb, Vast has raised over $400 million in private funding. Haven-1 is designed as a pathfinder for the larger Haven-2 station, which will incorporate artificial gravity via rotation. The first crewed mission will use SpaceX Crew Dragon to transport up to 4 astronauts for stays of up to 30 days. Vast acquired Launcher in 2023, gaining in-house propulsion and vehicle expertise.',
    },
    {
      id: 'orbital-reef',
      name: 'Orbital Reef',
      developer: 'Blue Origin / Sierra Space',
      partners: ['Blue Origin', 'Sierra Space', 'Boeing', 'Redwire Space', 'Genesis Engineering Solutions', 'Arizona State University'],
      status: 'development',
      fundingSource: 'NASA CLD award ($130M) + Blue Origin/Sierra Space funding',
      estimatedCost: '$3B+ estimated',
      targetLaunch: '2027-2028',
      crewCapacity: 10,
      pressurizedVolume: '~830 m3 (with LIFE module)',
      orbit: 'LEO (~500 km)',
      launchVehicle: 'Blue Origin New Glenn / ULA Vulcan',
      capabilities: [
        'Core module by Blue Origin',
        'LIFE inflatable habitat by Sierra Space (expandable module)',
        'Science and research park concept',
        'In-space manufacturing facilities',
        'Film and media production studio',
        'Space tourism accommodations',
        'Regenerative life support systems',
        'Dream Chaser cargo vehicle access (Sierra Space)',
      ],
      nasaCLD: true,
      description: 'Orbital Reef is a planned commercial space station being developed as a joint venture between Blue Origin and Sierra Space, with contributions from Boeing, Redwire Space, and others. Designed as a "mixed-use business park in space," it aims to accommodate research, industrial, commercial, and tourism activities. NASA awarded the consortium $130 million under the CLD program. Sierra Space\'s LIFE (Large Integrated Flexible Environment) expandable module would provide significantly more pressurized volume than traditional rigid modules. The station will be serviced by Sierra Space\'s Dream Chaser spaceplane and other commercial vehicles.',
    },
    {
      id: 'starlab',
      name: 'Starlab',
      developer: 'Starlab Space (Voyager Space / Airbus)',
      partners: ['Voyager Space', 'Airbus Defence and Space', 'Mitsubishi Corporation', 'MDA Space'],
      status: 'development',
      fundingSource: 'NASA CLD award ($217.5M) + Airbus/Voyager funding',
      estimatedCost: '$2-3B estimated',
      targetLaunch: '2028',
      crewCapacity: 4,
      pressurizedVolume: '~340 m3',
      orbit: 'LEO (~400 km)',
      launchVehicle: 'SpaceX Starship (single launch)',
      capabilities: [
        'Single-launch deployment on Starship',
        'George Washington Carver Science Park',
        'Regenerative ECLSS (life support)',
        'Canadarm-heritage robotic arm (MDA)',
        'Open architecture for international partners',
        'Continuous crewed operations',
        'Modular payload accommodation',
      ],
      nasaCLD: true,
      description: 'Starlab is a commercial space station being developed by Starlab Space, a joint venture between Voyager Space and Airbus Defence and Space. It was awarded $217.5 million by NASA under the CLD program. The station is designed for single-launch deployment aboard a SpaceX Starship, which would deliver the entire station to orbit in one mission. Starlab features an integrated design with the "George Washington Carver Science Park" for research, and a robotic arm developed by MDA Space (the Canadian company behind Canadarm). Mitsubishi Corporation joined the partnership to bring Japanese expertise and international partnerships.',
    },
  ]);

  await upsertContent('space-stations', 'crew', [
    // ISS Expedition 72/73
    { name: 'Sunita Williams', nationality: 'United States', agency: 'NASA', role: 'Commander', station: 'ISS', mission: 'Crew Flight Test / Expedition 72', launchDate: 'Jun 2024', expectedReturn: 'Early 2025' },
    { name: 'Butch Wilmore', nationality: 'United States', agency: 'NASA', role: 'Flight Engineer', station: 'ISS', mission: 'Crew Flight Test / Expedition 72', launchDate: 'Jun 2024', expectedReturn: 'Early 2025' },
    { name: 'Don Pettit', nationality: 'United States', agency: 'NASA', role: 'Flight Engineer', station: 'ISS', mission: 'Expedition 72 (Soyuz MS-26)', launchDate: 'Sep 2024', expectedReturn: 'Mar 2025' },
    { name: 'Aleksandr Gorbunov', nationality: 'Russia', agency: 'Roscosmos', role: 'Flight Engineer', station: 'ISS', mission: 'SpaceX Crew-9', launchDate: 'Sep 2024', expectedReturn: 'Feb 2025' },
    { name: 'Nick Hague', nationality: 'United States', agency: 'NASA', role: 'Flight Engineer', station: 'ISS', mission: 'SpaceX Crew-9', launchDate: 'Sep 2024', expectedReturn: 'Feb 2025' },
    { name: 'Alexey Ovchinin', nationality: 'Russia', agency: 'Roscosmos', role: 'Flight Engineer', station: 'ISS', mission: 'Soyuz MS-26', launchDate: 'Sep 2024', expectedReturn: 'Mar 2025' },
    { name: 'Ivan Vagner', nationality: 'Russia', agency: 'Roscosmos', role: 'Flight Engineer', station: 'ISS', mission: 'Soyuz MS-26', launchDate: 'Sep 2024', expectedReturn: 'Mar 2025' },
    // Tiangong - Shenzhou-19
    { name: 'Cai Xuzhe', nationality: 'China', agency: 'CMSA', role: 'Commander', station: 'Tiangong', mission: 'Shenzhou-19', launchDate: 'Oct 2024', expectedReturn: 'Apr 2025' },
    { name: 'Song Lingdong', nationality: 'China', agency: 'CMSA', role: 'Flight Engineer', station: 'Tiangong', mission: 'Shenzhou-19', launchDate: 'Oct 2024', expectedReturn: 'Apr 2025' },
    { name: 'Wang Haoze', nationality: 'China', agency: 'CMSA', role: 'Payload Specialist', station: 'Tiangong', mission: 'Shenzhou-19', launchDate: 'Oct 2024', expectedReturn: 'Apr 2025' },
  ]);

  await upsertContent('space-stations', 'crew-rotations', [
    { mission: 'SpaceX Crew-9', station: 'ISS', vehicle: 'Crew Dragon', launchDate: 'Sep 2024', status: 'current', crew: ['Nick Hague', 'Aleksandr Gorbunov'] },
    { mission: 'Soyuz MS-26', station: 'ISS', vehicle: 'Soyuz', launchDate: 'Sep 2024', status: 'current', crew: ['Alexey Ovchinin', 'Ivan Vagner', 'Don Pettit'] },
    { mission: 'Shenzhou-19', station: 'Tiangong', vehicle: 'Shenzhou', launchDate: 'Oct 2024', status: 'current', crew: ['Cai Xuzhe', 'Song Lingdong', 'Wang Haoze'] },
    { mission: 'SpaceX Crew-10', station: 'ISS', vehicle: 'Crew Dragon', launchDate: 'Early 2025', status: 'upcoming', crew: ['Anne McClain', 'Nichole Ayers', 'Takuya Onishi', 'Kirill Peskov'] },
    { mission: 'Soyuz MS-27', station: 'ISS', vehicle: 'Soyuz', launchDate: 'Mar 2025', status: 'upcoming', crew: ['TBD (3 crew)'] },
    { mission: 'Shenzhou-20', station: 'Tiangong', vehicle: 'Shenzhou', launchDate: 'Apr 2025', status: 'upcoming', crew: ['TBD (3 crew)'] },
    { mission: 'SpaceX Crew-11', station: 'ISS', vehicle: 'Crew Dragon', launchDate: 'Mid 2025', status: 'planned', crew: ['TBD (4 crew)'] },
    { mission: 'Soyuz MS-28', station: 'ISS', vehicle: 'Soyuz', launchDate: 'Sep 2025', status: 'planned', crew: ['TBD (3 crew)'] },
    { mission: 'Shenzhou-21', station: 'Tiangong', vehicle: 'Shenzhou', launchDate: 'Oct 2025', status: 'planned', crew: ['TBD (3 crew)'] },
    { mission: 'Axiom-4 (Ax-4)', station: 'ISS', vehicle: 'Crew Dragon', launchDate: '2025', status: 'planned', crew: ['Peggy Whitson (Cmdr)', '3 private astronauts'] },
  ]);

  await upsertContent('space-stations', 'cld-milestones', [
    { date: 'Dec 2021', event: 'CLD Phase 1 Awards', details: 'NASA awarded $415.6M to three companies: Blue Origin ($130M), Nanoracks/Voyager ($160M), Northrop Grumman ($125.6M)', status: 'completed' },
    { date: '2022', event: 'Nanoracks/Voyager recompeted as Starlab', details: 'Voyager Space partnered with Airbus, later forming Starlab Space JV. Northrop Grumman exited, Axiom Space entered.', status: 'completed' },
    { date: 'Jan 2023', event: 'Axiom CLD Award', details: 'Axiom Space received $228M NASA CLD funding for their commercial station concept', status: 'completed' },
    { date: '2023-2024', event: 'CLD Phase 1 Development', details: 'Continued design maturation, systems definition reviews, and preliminary design reviews for all CLD partners', status: 'completed' },
    { date: '2025-2026', event: 'CLD Critical Design Reviews', details: 'CLD providers undergo critical design reviews; NASA evaluates readiness for Phase 2 certification', status: 'in-progress' },
    { date: '2026-2027', event: 'First Commercial Modules Launch', details: 'Axiom Hab 1 module attaches to ISS; Vast Haven-1 targets independent orbit', status: 'upcoming' },
    { date: '2028', event: 'Starlab & Orbital Reef Launches', details: 'Second wave of commercial stations target initial operational capability', status: 'planned' },
    { date: '2030', event: 'ISS Decommissioning', details: 'NASA plans controlled deorbit of ISS into remote South Pacific (Point Nemo). SpaceX awarded ~$843M for deorbit vehicle.', status: 'planned' },
    { date: '2030+', event: 'Full Commercial LEO Operations', details: 'NASA transitions to purchasing services from commercial stations rather than operating its own facility', status: 'planned' },
  ]);

  // ═══════════════════════════════════════════════════════════════════
  // 2. CONSTELLATIONS
  // ═══════════════════════════════════════════════════════════════════

  console.log('✨ Seeding constellations...');

  await upsertContent('constellations', 'constellations', [
    {
      id: 'starlink',
      name: 'Starlink',
      operator: 'SpaceX',
      country: 'United States',
      activeSatellites: 6421,
      authorizedSatellites: 12000,
      plannedGeneration: 'Gen1 (Gen2: 29,988 authorized)',
      altitudeKm: '550',
      inclinationDeg: '53',
      frequencyBands: 'Ku/Ka-band',
      serviceType: 'Broadband',
      status: 'deploying',
      latencyEstimate: '20-40 ms',
      deorbitPlan: '5-year autonomous deorbit via ion propulsion; ~5-year atmospheric decay at 550 km',
      fccLicense: 'FCC approved Gen1 (12,000) & Gen2 (7,500 initially); modification granted Dec 2022',
      ituFiling: 'Multiple ITU filings under USSAT-NGSO-10 and related coordination requests',
      debrisCompliance: 'Compliant - active deorbit capability, 97%+ success on autonomous collision avoidance',
      description: 'The largest commercial satellite constellation by active spacecraft count. Provides high-speed, low-latency broadband globally, including underserved and remote areas. Direct-to-cell capability being deployed with T-Mobile partnership.',
      launchProvider: 'SpaceX Falcon 9 / Starship (Gen2)',
      firstLaunch: 'May 2019',
      estimatedCompletion: 'Gen1: 2025, Gen2: ongoing',
    },
    {
      id: 'oneweb',
      name: 'OneWeb',
      operator: 'Eutelsat OneWeb',
      country: 'United Kingdom / France',
      activeSatellites: 634,
      authorizedSatellites: 648,
      plannedGeneration: 'Gen1 (Gen2: ~2,000 planned)',
      altitudeKm: '1,200',
      inclinationDeg: '87.9',
      frequencyBands: 'Ku/Ka-band',
      serviceType: 'Broadband',
      status: 'operational',
      latencyEstimate: '30-50 ms',
      deorbitPlan: '25-year deorbit compliance; satellites equipped with hall-effect thrusters for EOL maneuvers',
      fccLicense: 'FCC market access granted; operates under UK Ofcom license',
      ituFiling: 'ITU filings coordinated through UK administration; Ku/Ka spectrum rights secured',
      debrisCompliance: 'Compliant - meets inter-agency debris mitigation guidelines; 25-year rule adherence confirmed',
      description: 'Global LEO broadband constellation now fully deployed. Merged with Eutelsat in 2023 to create a multi-orbit operator. Focuses on enterprise, government, maritime, and aviation connectivity.',
      launchProvider: 'Arianespace Soyuz (initial), SpaceX Falcon 9, ISRO GSLV Mk III',
      firstLaunch: 'February 2019',
      estimatedCompletion: 'Gen1: Complete (2023)',
    },
    {
      id: 'kuiper',
      name: 'Project Kuiper',
      operator: 'Amazon',
      country: 'United States',
      activeSatellites: 2,
      authorizedSatellites: 3236,
      plannedGeneration: 'Phase 1 (3,236 satellites)',
      altitudeKm: '590-630',
      inclinationDeg: '33-51.9',
      frequencyBands: 'Ka-band',
      serviceType: 'Broadband',
      status: 'pre-launch',
      latencyEstimate: '20-40 ms (estimated)',
      deorbitPlan: 'Designed for autonomous deorbit within 355 days of EOL; atmospheric decay < 10 years at operating altitude',
      fccLicense: 'FCC license granted July 2020; must deploy 50% by July 2026 per FCC milestone requirements',
      ituFiling: 'ITU Ka-band filings under US administration; coordination ongoing with existing NGSO operators',
      debrisCompliance: 'Planned compliant - committed to 355-day post-mission disposal (exceeds FCC 25-year rule)',
      description: 'Amazon\'s planned LEO broadband constellation to compete with Starlink. Two prototype satellites (KuiperSat-1 & KuiperSat-2) launched October 2023. Mass production facility operational in Kirkland, WA. FCC requires 50% deployment by mid-2026.',
      launchProvider: 'ULA Vulcan Centaur, Arianespace Ariane 6, Blue Origin New Glenn',
      firstLaunch: 'October 2023 (prototypes)',
      estimatedCompletion: '2028-2029 (full constellation)',
    },
    {
      id: 'iridium-next',
      name: 'Iridium NEXT',
      operator: 'Iridium Communications',
      country: 'United States',
      activeSatellites: 66,
      authorizedSatellites: 75,
      plannedGeneration: 'Gen2 (66 active + 9 on-orbit spares)',
      altitudeKm: '780',
      inclinationDeg: '86.4',
      frequencyBands: 'L/Ka-band',
      serviceType: 'Voice/IoT',
      status: 'operational',
      latencyEstimate: '30-50 ms (voice), <1 sec (SBD)',
      deorbitPlan: 'Active deorbit at EOL; original Iridium constellation deorbited successfully (completed 2019)',
      fccLicense: 'FCC licensed; renewed spectrum rights for L-band operations',
      ituFiling: 'ITU L-band priority rights; Ka-band feeder link filings coordinated globally',
      debrisCompliance: 'Exemplary - successfully deorbited entire Gen1 constellation; Gen2 designed with full deorbit capability',
      description: 'The only satellite constellation providing true pole-to-pole global coverage. NEXT generation replaced original 1990s constellation. Supports voice, data, IoT (via Iridium Certus), and hosts government payloads. Powers Garmin inReach and Apple Emergency SOS.',
      launchProvider: 'SpaceX Falcon 9',
      firstLaunch: 'January 2017 (NEXT series)',
      estimatedCompletion: 'Complete (2019)',
    },
    {
      id: 'o3b-mpower',
      name: 'O3b mPOWER',
      operator: 'SES',
      country: 'Luxembourg',
      activeSatellites: 11,
      authorizedSatellites: 11,
      plannedGeneration: 'mPOWER (11 satellites, expandable)',
      altitudeKm: '8,000 (MEO)',
      inclinationDeg: '0 (equatorial)',
      frequencyBands: 'Ka-band',
      serviceType: 'Broadband',
      status: 'operational',
      latencyEstimate: '100-150 ms',
      deorbitPlan: 'MEO orbit; satellites equipped with propulsion for graveyard orbit disposal at EOL',
      fccLicense: 'FCC licensed for Ka-band NGSO operations; US market access granted',
      ituFiling: 'ITU Ka-band priority filings for MEO equatorial constellation; coordination with GEO operators completed',
      debrisCompliance: 'Compliant - MEO disposal orbit plan approved; inter-agency guidelines met',
      description: 'Next-generation MEO constellation from SES, successor to the original O3b fleet. Each satellite delivers multiple terabits of throughput with fully steerable beams. Serves telcos, cruise lines, energy, and government customers with fiber-like connectivity.',
      launchProvider: 'SpaceX Falcon 9',
      firstLaunch: 'December 2022',
      estimatedCompletion: 'Complete (2024)',
    },
    {
      id: 'telesat-lightspeed',
      name: 'Telesat Lightspeed',
      operator: 'Telesat',
      country: 'Canada',
      activeSatellites: 0,
      authorizedSatellites: 198,
      plannedGeneration: 'Lightspeed (198 satellites)',
      altitudeKm: '1,015-1,325',
      inclinationDeg: '98.98 / 50.88',
      frequencyBands: 'Ka-band',
      serviceType: 'Broadband',
      status: 'development',
      latencyEstimate: '30-50 ms (estimated)',
      deorbitPlan: 'Designed for post-mission disposal within 5 years; electric propulsion for controlled deorbit',
      fccLicense: 'FCC processing application; Canadian ISED license granted; ITAR considerations for US payloads',
      ituFiling: 'ITU Ka-band filings coordinated through Canadian administration; global coverage spectrum secured',
      debrisCompliance: 'Planned compliant - designed to exceed IADC guidelines with active deorbit and collision avoidance',
      description: 'Telesat\'s planned LEO constellation targeting enterprise, government, maritime, and aero markets. MDA selected as prime manufacturer. Constellation optimized for high-throughput, low-latency service with advanced mesh networking between satellites.',
      launchProvider: 'TBD (multiple launch agreements being negotiated)',
      firstLaunch: '2026 (planned)',
      estimatedCompletion: '2028 (planned)',
    },
    {
      id: 'guowang',
      name: 'Guowang (GW)',
      operator: 'China SatNet (China Satellite Network Group)',
      country: 'China',
      activeSatellites: 20,
      authorizedSatellites: 13000,
      plannedGeneration: 'GW Constellation (~13,000 satellites)',
      altitudeKm: '508-1,145',
      inclinationDeg: '30-85 (multiple shells)',
      frequencyBands: 'TBD (Ka/Ku expected)',
      serviceType: 'Broadband',
      status: 'development',
      latencyEstimate: '20-50 ms (estimated)',
      deorbitPlan: 'Details not publicly disclosed; expected to follow CNSA debris mitigation standards',
      fccLicense: 'N/A - Operates under Chinese regulatory framework (MIIT/CNSA)',
      ituFiling: 'Large-scale ITU filings submitted through Chinese administration; spectrum priority under WRC-23 framework',
      debrisCompliance: 'Under development - expected to meet Chinese national space debris standards (aligned with IADC)',
      description: 'China\'s national broadband mega-constellation managed by the state-owned China Satellite Network Group (est. 2021). Aims to provide global broadband coverage as a strategic national infrastructure. Early test satellites launched beginning 2024.',
      launchProvider: 'Long March series (CZ-5B, CZ-8, commercial rockets)',
      firstLaunch: '2024 (test satellites)',
      estimatedCompletion: '2030+ (estimated)',
    },
    {
      id: 'qianfan',
      name: 'Qianfan (G60 Starlink)',
      operator: 'Shanghai Spacecom Satellite Technology (SSST)',
      country: 'China',
      activeSatellites: 60,
      authorizedSatellites: 14000,
      plannedGeneration: 'G60 Constellation (~14,000 planned)',
      altitudeKm: '1,160',
      inclinationDeg: '53',
      frequencyBands: 'TBD (Ku/Ka expected)',
      serviceType: 'Broadband',
      status: 'deploying',
      latencyEstimate: '25-50 ms (estimated)',
      deorbitPlan: 'Details limited; satellites expected to include propulsion for post-mission disposal',
      fccLicense: 'N/A - Operates under Chinese regulatory framework',
      ituFiling: 'ITU filings submitted through Chinese administration; broadband NGSO spectrum claims registered',
      debrisCompliance: 'Under development - details on specific compliance measures not yet publicly available',
      description: 'Shanghai-backed commercial mega-constellation project, sometimes called "China\'s Starlink." Backed by the G60 Science and Technology Innovation Valley initiative. Rapid deployment began in 2024 with batch launches of 18 satellites per mission. Aims to provide global broadband internet.',
      launchProvider: 'Long March 8, Smart Dragon 3, commercial launch vehicles',
      firstLaunch: 'August 2024',
      estimatedCompletion: '2030+ (estimated)',
    },
  ]);

  // ═══════════════════════════════════════════════════════════════════
  // 3. SPACE ECONOMY - Multiple sections
  // ═══════════════════════════════════════════════════════════════════

  console.log('💰 Seeding space-economy...');

  await upsertContent('space-economy', 'market-segments', [
    { name: 'Satellite Services', revenue: 184, share: 32.3, growth: 3.8, description: 'Direct-to-home TV, satellite radio, broadband, managed services, remote sensing data' },
    { name: 'Ground Equipment', revenue: 145, share: 25.4, growth: 4.5, description: 'GNSS devices, satellite terminals, network equipment, VSAT systems' },
    { name: 'Government Space Budgets', revenue: 117, share: 20.5, growth: 8.2, description: 'Civil space agencies, military/intelligence space programs, R&D' },
    { name: 'Satellite Manufacturing', revenue: 15.8, share: 2.8, growth: 12.1, description: 'Commercial and government satellite production, smallsat manufacturing' },
    { name: 'Launch Industry', revenue: 8.4, share: 1.5, growth: 15.7, description: 'Commercial launch services, rideshare, dedicated small-launch' },
    { name: 'Non-Satellite Industry', revenue: 99.8, share: 17.5, growth: 6.8, description: 'Human spaceflight, space stations, deep space exploration, suborbital, in-space services' },
  ]);

  await upsertContent('space-economy', 'quarterly-vc', [
    { quarter: 'Q1', year: 2024, totalInvested: 2.1, dealCount: 62, topSector: 'Earth Observation' },
    { quarter: 'Q2', year: 2024, totalInvested: 1.8, dealCount: 55, topSector: 'Launch' },
    { quarter: 'Q3', year: 2024, totalInvested: 3.2, dealCount: 71, topSector: 'Communications' },
    { quarter: 'Q4', year: 2024, totalInvested: 2.4, dealCount: 58, topSector: 'In-Space Services' },
    { quarter: 'Q1', year: 2025, totalInvested: 2.7, dealCount: 64, topSector: 'National Security' },
    { quarter: 'Q2', year: 2025, totalInvested: 2.3, dealCount: 59, topSector: 'Earth Observation' },
  ]);

  await upsertContent('space-economy', 'annual-investment', [
    { year: 2019, vcInvestment: 5.8, debtFinancing: 3.2, publicOfferings: 0.6, totalPrivate: 9.6 },
    { year: 2020, vcInvestment: 7.6, debtFinancing: 4.1, publicOfferings: 3.2, totalPrivate: 14.9 },
    { year: 2021, vcInvestment: 15.4, debtFinancing: 7.8, publicOfferings: 13.3, totalPrivate: 36.5 },
    { year: 2022, vcInvestment: 8.0, debtFinancing: 5.9, publicOfferings: 1.1, totalPrivate: 15.0 },
    { year: 2023, vcInvestment: 6.1, debtFinancing: 4.5, publicOfferings: 0.8, totalPrivate: 11.4 },
    { year: 2024, vcInvestment: 9.5, debtFinancing: 5.2, publicOfferings: 1.4, totalPrivate: 16.1 },
  ]);

  await upsertContent('space-economy', 'government-budgets', [
    {
      agency: 'NASA',
      country: 'United States',
      flag: '🇺🇸',
      budget2024: 25.4,
      budget2025: 25.2,
      change: -0.8,
      currency: 'USD',
      focusAreas: ['Artemis / Lunar', 'Mars Sample Return', 'ISS Transition', 'Earth Science', 'Space Technology'],
      notes: 'FY2025 enacted. Includes Artemis program, commercial crew/cargo, and science missions.',
    },
    {
      agency: 'US Space Force (DoD Space)',
      country: 'United States',
      flag: '🇺🇸',
      budget2024: 30.3,
      budget2025: 33.7,
      change: 11.2,
      currency: 'USD',
      focusAreas: ['GPS III/IIIF', 'Next-Gen OPIR', 'Space Development Agency', 'National Security Space Launch', 'Missile Warning'],
      notes: 'Includes USSF, NRO, SDA, and MDA space programs. Fastest-growing U.S. space budget.',
    },
    {
      agency: 'NOAA (Space Programs)',
      country: 'United States',
      flag: '🇺🇸',
      budget2024: 3.2,
      budget2025: 3.5,
      change: 9.4,
      currency: 'USD',
      focusAreas: ['GOES-U Weather Satellites', 'JPSS Polar Satellites', 'Space Weather Prediction', 'Ocean/Climate Monitoring'],
      notes: 'Satellite division budget. Operates GOES-16/17/18/U and JPSS constellation for weather forecasting.',
    },
    {
      agency: 'ESA',
      country: 'Europe',
      flag: '🇪🇺',
      budget2024: 7.8,
      budget2025: 8.1,
      change: 3.8,
      currency: 'EUR',
      focusAreas: ['Ariane 6', 'ExoMars', 'Copernicus / Sentinel', 'Lunar Gateway', 'Space Safety'],
      notes: '22 member states. Record budget from 2022 Ministerial. Ariane 6 maiden flight 2024.',
    },
    {
      agency: 'CNSA (estimated)',
      country: 'China',
      flag: '🇨🇳',
      budget2024: 14.0,
      budget2025: 16.0,
      change: 14.3,
      currency: 'USD',
      focusAreas: ['Tiangong Space Station', 'Chang\'e Lunar Program', 'Tianwen Mars', 'BeiDou Navigation', 'Long March Rockets'],
      notes: 'Estimated from open-source analysis. Includes CASC and military space. Actual figures not publicly disclosed.',
    },
    {
      agency: 'CNES',
      country: 'France',
      flag: '🇫🇷',
      budget2024: 3.4,
      budget2025: 3.5,
      change: 2.9,
      currency: 'EUR',
      focusAreas: ['Ariane Group', 'Earth Observation', 'Defense Space', 'Telecommunications', 'Science Missions'],
      notes: 'Largest ESA contributor. Includes national programs and ESA contribution. Kourou spaceport operator.',
    },
    {
      agency: 'DLR (Space Agency)',
      country: 'Germany',
      flag: '🇩🇪',
      budget2024: 2.8,
      budget2025: 2.9,
      change: 3.6,
      currency: 'EUR',
      focusAreas: ['Earth Observation', 'Robotics & Exploration', 'Satellite Communications', 'Space Science', 'Microgravity Research'],
      notes: 'Second-largest ESA contributor. Strong in Earth observation, robotics, and materials science.',
    },
    {
      agency: 'JAXA',
      country: 'Japan',
      flag: '🇯🇵',
      budget2024: 1.5,
      budget2025: 1.6,
      change: 6.7,
      currency: 'USD',
      focusAreas: ['H3 Launch Vehicle', 'Lunar Polar Exploration (LUPEX)', 'Hayabusa / Asteroid Science', 'ISS / Kibo Operations', 'Earth Observation'],
      notes: 'MEXT budget for space. SLIM lunar lander success 2024. H3 rocket now operational.',
    },
    {
      agency: 'ISRO',
      country: 'India',
      flag: '🇮🇳',
      budget2024: 1.5,
      budget2025: 1.6,
      change: 6.7,
      currency: 'USD',
      focusAreas: ['Gaganyaan (Human Spaceflight)', 'Chandrayaan Lunar', 'GSLV / LVM3 Rockets', 'NavIC Navigation', 'Remote Sensing'],
      notes: 'Dept of Space FY2025-26 budget. Chandrayaan-3 success. Gaganyaan crewed flight planned 2025-26.',
    },
    {
      agency: 'Roscosmos',
      country: 'Russia',
      flag: '🇷🇺',
      budget2024: 3.1,
      budget2025: 3.7,
      change: 19.4,
      currency: 'USD',
      focusAreas: ['ISS Operations / Soyuz', 'GLONASS Navigation', 'Angara Rockets', 'Luna Program', 'Sphere Constellation'],
      notes: 'Nominal increase offset by ruble weakness. Declining international partnerships post-2022.',
    },
    {
      agency: 'ASI',
      country: 'Italy',
      flag: '🇮🇹',
      budget2024: 2.5,
      budget2025: 2.6,
      change: 4.0,
      currency: 'EUR',
      focusAreas: ['COSMO-SkyMed', 'Vega-C Rocket', 'Space Economy', 'ISS / Columbus', 'Lunar Exploration'],
      notes: 'Third-largest ESA contributor. Strong in Earth observation and small launch vehicles (Vega).',
    },
    {
      agency: 'UKSA',
      country: 'United Kingdom',
      flag: '🇬🇧',
      budget2024: 0.8,
      budget2025: 0.9,
      change: 12.5,
      currency: 'GBP',
      focusAreas: ['OneWeb / Connectivity', 'Space Sustainability', 'Earth Observation', 'SaxaVord Spaceport', 'Regulation & Licensing'],
      notes: 'Growing investment. National Space Strategy 2021. First UK orbital launch attempts from Scotland.',
    },
    {
      agency: 'CSA',
      country: 'Canada',
      flag: '🇨🇦',
      budget2024: 0.4,
      budget2025: 0.5,
      change: 25.0,
      currency: 'CAD',
      focusAreas: ['Canadarm3 / Lunar Gateway', 'RADARSAT', 'Astronaut Program', 'Space Health', 'AI & Robotics'],
      notes: 'CAD $834M planned through 2026. Key Lunar Gateway partner via Canadarm3 robotic arm.',
    },
    {
      agency: 'KASA',
      country: 'South Korea',
      flag: '🇰🇷',
      budget2024: 0.7,
      budget2025: 0.8,
      change: 14.3,
      currency: 'USD',
      focusAreas: ['KSLV-II Nuri Rocket', 'Korea Pathfinder Lunar Orbiter', 'Satellite Development', 'Space Surveillance', 'Commercial Space'],
      notes: 'Korea Aerospace Administration established 2024. Nuri rocket now operational. Lunar orbiter success.',
    },
    {
      agency: 'ASA',
      country: 'Australia',
      flag: '🇦🇺',
      budget2024: 0.2,
      budget2025: 0.2,
      change: 0.0,
      currency: 'AUD',
      focusAreas: ['Space Situational Awareness', 'Earth Observation', 'Satellite Communications', 'Launch Capability', 'Moon to Mars Program'],
      notes: 'AUD $207M over 5 years. Focus on positioning, navigation, timing, and Earth observation.',
    },
  ]);

  await upsertContent('space-economy', 'workforce-stats', [
    { category: 'Total U.S. Space Workforce', value: '360,000+', detail: 'Direct space industry employment including commercial, civil, and national security', source: 'Space Foundation 2024' },
    { category: 'Global Space Workforce', value: '1,200,000+', detail: 'Estimated total across all space-faring nations', source: 'OECD Space Economy 2024' },
    // Additional workforce stats...
  ]);

  await upsertContent('space-economy', 'launch-cost-trends', [
    { vehicle: 'Space Shuttle', operator: 'NASA', year: 2011, costPerKgLEO: 54500, payload: 27500, reusable: true },
    { vehicle: 'Falcon 9 (reused)', operator: 'SpaceX', year: 2025, costPerKgLEO: 2720, payload: 22800, reusable: true },
    // Additional launch cost data...
  ]);

  // ═══════════════════════════════════════════════════════════════════
  // 4. SPACE CAPITAL
  // ═══════════════════════════════════════════════════════════════════

  console.log('💸 Seeding space-capital...');

  await upsertContent('space-capital', 'investors', [
    {
      id: 'space-capital-vc', name: 'Space Capital', type: 'Dedicated Space VC',
      description: 'The most active dedicated space venture fund, investing across the space value chain from launch to applications.',
      investmentThesis: 'Space is a $5T industry being rebuilt by technology-driven companies. We invest in the infrastructure layer.',
      aum: '$400M+', checkSizeRange: '$2M-$20M', stagePreference: ['Seed', 'Series A', 'Series B'],
      sectorFocus: ['Launch', 'Earth Observation', 'Communications', 'In-Space Services', 'Analytics'],
      dealCount: 85, totalDeployed: '$300M+',
      notablePortfolio: ['Spire Global', 'Capella Space', 'Muon Space', 'Hawkeye 360'],
      website: 'https://www.spacecapital.com', hqLocation: 'New York, NY', foundedYear: 2017,
    },
    {
      id: 'seraphim-space', name: 'Seraphim Space', type: 'Dedicated Space VC',
      description: 'World\'s largest dedicated space tech fund, investing in companies harnessing the space ecosystem.',
      investmentThesis: 'Space infrastructure is enabling a new wave of data-driven businesses that will transform every industry.',
      aum: '$300M+', checkSizeRange: '$1M-$15M', stagePreference: ['Seed', 'Series A', 'Series B'],
      sectorFocus: ['Earth Observation', 'Communications', 'Analytics', 'Climate', 'Maritime'],
      dealCount: 60, totalDeployed: '$200M+',
      notablePortfolio: ['ICEYE', 'LeoLabs', 'D-Orbit', 'Isotropic Systems'],
      website: 'https://seraphim.vc', hqLocation: 'London, UK', foundedYear: 2016,
    },
    {
      id: 'spacefund', name: 'SpaceFund', type: 'Dedicated Space VC',
      description: 'Early-stage venture fund exclusively focused on space companies with a portfolio across the value chain.',
      investmentThesis: 'We invest at the frontier of space commerce where deep tech meets market opportunity.',
      aum: '$50M+', checkSizeRange: '$250K-$5M', stagePreference: ['Seed', 'Series A'],
      sectorFocus: ['Launch', 'In-Space Services', 'Mining', 'Manufacturing'],
      dealCount: 30, totalDeployed: '$40M+',
      notablePortfolio: ['Orbit Fab', 'Stoke Space', 'Turion Space'],
      website: 'https://spacefund.com', hqLocation: 'Houston, TX', foundedYear: 2017,
    },
    {
      id: 'promus-ventures', name: 'Promus Ventures', type: 'Dedicated Space VC',
      description: 'Space-focused venture capital firm investing in commercial space and advanced aerospace technologies.',
      investmentThesis: 'Backing founders building the picks-and-shovels infrastructure for the space economy.',
      aum: '$100M+', checkSizeRange: '$1M-$10M', stagePreference: ['Seed', 'Series A', 'Series B'],
      sectorFocus: ['Launch', 'Satellites', 'Analytics', 'Defense'],
      dealCount: 40, totalDeployed: '$75M+',
      notablePortfolio: ['Multiple space startups'],
      website: 'https://promusventures.com', hqLocation: 'San Francisco, CA', foundedYear: 2018,
    },
    {
      id: 'type-one-ventures', name: 'Type One Ventures', type: 'Dedicated Space VC',
      description: 'Australian-based space-focused venture fund investing in deep tech space companies globally.',
      investmentThesis: 'Investing in the space technology platforms that will define the next decade of exploration and commerce.',
      aum: '$50M+', checkSizeRange: '$500K-$5M', stagePreference: ['Seed', 'Series A'],
      sectorFocus: ['Earth Observation', 'Communications', 'Launch', 'Space Domain Awareness'],
      dealCount: 25, totalDeployed: '$35M+',
      notablePortfolio: ['HEO Robotics', 'Fleet Space', 'Quasar Satellite Technologies'],
      website: 'https://typeoneventures.com', hqLocation: 'Sydney, Australia', foundedYear: 2019,
    },
    {
      id: 'in-q-tel', name: 'In-Q-Tel', type: 'Government/Strategic',
      description: 'U.S. intelligence community\'s strategic investor, bridging national security needs with commercial innovation.',
      investmentThesis: 'We identify and invest in cutting-edge technologies that protect and preserve U.S. security.',
      aum: '$500M+', checkSizeRange: '$500K-$25M', stagePreference: ['Series A', 'Series B', 'Series C'],
      sectorFocus: ['Space Domain Awareness', 'Earth Observation', 'Communications', 'Cybersecurity'],
      dealCount: 40, totalDeployed: '$400M+',
      notablePortfolio: ['Planet Labs', 'Capella Space', 'HawkEye 360', 'Aalyria'],
      website: 'https://www.iqt.org', hqLocation: 'Arlington, VA', foundedYear: 1999,
    },
    {
      id: 'founders-fund', name: 'Founders Fund', type: 'Deep Tech VC',
      description: 'Peter Thiel\'s flagship fund known for backing transformative deep tech companies including multiple space leaders.',
      investmentThesis: 'We invest in companies building breakthrough technologies that reshape industries and advance humanity.',
      aum: '$12B+', checkSizeRange: '$5M-$100M', stagePreference: ['Series A', 'Series B', 'Late Stage'],
      sectorFocus: ['Launch', 'In-Space Transport', 'Manufacturing', 'Defense'],
      dealCount: 12, totalDeployed: '$2B+',
      notablePortfolio: ['SpaceX', 'Relativity Space', 'Varda Space', 'Impulse Space', 'Stoke Space'],
      website: 'https://foundersfund.com', hqLocation: 'San Francisco, CA', foundedYear: 2005,
    },
    {
      id: 'a16z', name: 'a16z (Andreessen Horowitz)', type: 'Generalist VC',
      description: 'Silicon Valley powerhouse with a growing space and defense portfolio through its American Dynamism practice.',
      investmentThesis: 'American Dynamism backs companies building for national interest including aerospace, defense, and infrastructure.',
      aum: '$35B+', checkSizeRange: '$10M-$200M', stagePreference: ['Series B', 'Series C', 'Late Stage'],
      sectorFocus: ['Launch', 'Defense', 'Manufacturing', 'Satellites'],
      dealCount: 8, totalDeployed: '$1B+',
      notablePortfolio: ['Relativity Space', 'Hadrian', 'Anduril', 'K2 Space'],
      website: 'https://a16z.com', hqLocation: 'Menlo Park, CA', foundedYear: 2009,
    },
    {
      id: 'bessemer', name: 'Bessemer Venture Partners', type: 'Generalist VC',
      description: 'One of the oldest U.S. VC firms with a strong track record in space and satellite investments.',
      investmentThesis: 'Investing in category-defining companies from seed to IPO across cloud, space, and deep tech.',
      aum: '$20B+', checkSizeRange: '$5M-$100M', stagePreference: ['Series A', 'Series B', 'Late Stage'],
      sectorFocus: ['Launch', 'Earth Observation', 'Communications', 'Analytics'],
      dealCount: 10, totalDeployed: '$500M+',
      notablePortfolio: ['Rocket Lab', 'Spire Global', 'Slingshot Aerospace'],
      website: 'https://www.bvp.com', hqLocation: 'San Francisco, CA', foundedYear: 1911,
    },
    {
      id: 'khosla', name: 'Khosla Ventures', type: 'Deep Tech VC',
      description: 'Deep tech-focused fund investing in space companies pushing technological boundaries.',
      investmentThesis: 'We back audacious entrepreneurs building breakthrough technologies in energy, AI, space, and biotech.',
      aum: '$15B+', checkSizeRange: '$5M-$50M', stagePreference: ['Series A', 'Series B'],
      sectorFocus: ['Launch', 'Propulsion', 'Materials', 'Space Infrastructure'],
      dealCount: 6, totalDeployed: '$200M+',
      notablePortfolio: ['Astra', 'Momentus', 'K2 Space'],
      website: 'https://www.khoslaventures.com', hqLocation: 'Menlo Park, CA', foundedYear: 2004,
    },
    {
      id: 'dcvc', name: 'DCVC (Data Collective)', type: 'Deep Tech VC',
      description: 'Deep tech venture fund that has been an early backer of multiple space and geospatial companies.',
      investmentThesis: 'We invest in deep tech companies where computational approaches create unfair advantages.',
      aum: '$3B+', checkSizeRange: '$2M-$25M', stagePreference: ['Series A', 'Series B'],
      sectorFocus: ['Earth Observation', 'Analytics', 'Climate', 'Geospatial'],
      dealCount: 8, totalDeployed: '$100M+',
      notablePortfolio: ['Planet Labs', 'Capella Space', 'Descartes Labs'],
      website: 'https://www.dcvc.com', hqLocation: 'San Francisco, CA', foundedYear: 2011,
    },
    {
      id: 'draper', name: 'Draper Associates', type: 'Deep Tech VC',
      description: 'Tim Draper\'s early-stage fund, one of the earliest investors in SpaceX and other space companies.',
      investmentThesis: 'We back visionary entrepreneurs tackling the world\'s biggest challenges with disruptive technology.',
      aum: '$4B+', checkSizeRange: '$500K-$10M', stagePreference: ['Seed', 'Series A'],
      sectorFocus: ['Launch', 'Space Infrastructure', 'Defense', 'Propulsion'],
      dealCount: 5, totalDeployed: '$50M+',
      notablePortfolio: ['SpaceX (early)', 'Firefly Aerospace', 'Planet Labs'],
      website: 'https://www.draper.vc', hqLocation: 'San Mateo, CA', foundedYear: 1985,
    },
    {
      id: 'initialized', name: 'Initialized Capital', type: 'Deep Tech VC',
      description: 'Garry Tan\'s early-stage fund that backed Relativity Space in its earliest days.',
      investmentThesis: 'Investing at the earliest stages in founders building category-defining companies.',
      aum: '$3B+', checkSizeRange: '$1M-$15M', stagePreference: ['Seed', 'Series A'],
      sectorFocus: ['Launch', 'Manufacturing', 'Software'],
      dealCount: 4, totalDeployed: '$30M+',
      notablePortfolio: ['Relativity Space', 'Coinbase', 'Instacart'],
      website: 'https://initialized.com', hqLocation: 'San Francisco, CA', foundedYear: 2012,
    },
    {
      id: 'obvious', name: 'Obvious Ventures', type: 'Impact VC',
      description: 'Impact-focused fund backing companies with world-positive missions including space sustainability.',
      investmentThesis: 'We invest in companies that are both world-positive and venture-scale, creating lasting impact.',
      aum: '$1B+', checkSizeRange: '$2M-$20M', stagePreference: ['Series A', 'Series B'],
      sectorFocus: ['Earth Observation', 'Climate', 'Sustainability', 'Analytics'],
      dealCount: 3, totalDeployed: '$30M+',
      notablePortfolio: ['Planet Labs', 'Medium', 'Beyond Meat'],
      website: 'https://obvious.com', hqLocation: 'San Francisco, CA', foundedYear: 2014,
    },
    {
      id: 'lockheed-ventures', name: 'Lockheed Martin Ventures', type: 'Corporate VC',
      description: 'Strategic investment arm of the world\'s largest defense contractor, focused on dual-use space tech.',
      investmentThesis: 'We invest in and partner with companies developing technologies that complement our core defense and space programs.',
      aum: '$200M+', checkSizeRange: '$5M-$25M', stagePreference: ['Series A', 'Series B', 'Series C'],
      sectorFocus: ['Defense', 'Satellites', 'Launch', 'Cybersecurity', 'AI'],
      dealCount: 15, totalDeployed: '$150M+',
      notablePortfolio: ['Terran Orbital', 'Rocket Lab', 'ABL Space', 'Omnispace'],
      website: 'https://www.lockheedmartin.com/ventures', hqLocation: 'Bethesda, MD', foundedYear: 2007,
    },
    {
      id: 'rtx-ventures', name: 'RTX Ventures', type: 'Corporate VC',
      description: 'Strategic venture arm of RTX (Raytheon Technologies), investing in next-gen aerospace and defense.',
      investmentThesis: 'Accelerating innovation by investing in startups with technologies adjacent to our aerospace and defense businesses.',
      aum: '$300M+', checkSizeRange: '$5M-$25M', stagePreference: ['Series A', 'Series B'],
      sectorFocus: ['Defense', 'Propulsion', 'Materials', 'Space Domain Awareness'],
      dealCount: 10, totalDeployed: '$100M+',
      notablePortfolio: ['Slingshot Aerospace', 'Ursa Major Technologies', 'Impulse Space'],
      website: 'https://www.rtx.com/ventures', hqLocation: 'Arlington, VA', foundedYear: 2019,
    },
    {
      id: 'airbus-ventures', name: 'Airbus Ventures', type: 'Corporate VC',
      description: 'Strategic VC arm of Airbus investing in disruptive aerospace, space, and defense technologies.',
      investmentThesis: 'We partner with founders reshaping the future of flight, space, and connected intelligence.',
      aum: '$250M+', checkSizeRange: '$2M-$20M', stagePreference: ['Series A', 'Series B'],
      sectorFocus: ['Earth Observation', 'Communications', 'Analytics', 'Urban Air Mobility'],
      dealCount: 12, totalDeployed: '$100M+',
      notablePortfolio: ['Spire Global', 'LeoLabs', 'Isotropic Systems', 'Mynaric'],
      website: 'https://airbusventures.vc', hqLocation: 'San Francisco, CA', foundedYear: 2015,
    },
    {
      id: 'boeing-horizonx', name: 'Boeing HorizonX', type: 'Corporate VC',
      description: 'Boeing\'s venture investment arm identifying and investing in emerging aerospace technologies.',
      investmentThesis: 'Identifying technologies transforming aerospace and manufacturing to maintain Boeing\'s competitive edge.',
      aum: '$200M+', checkSizeRange: '$5M-$20M', stagePreference: ['Series A', 'Series B'],
      sectorFocus: ['Manufacturing', 'AI', 'Autonomy', 'Advanced Materials'],
      dealCount: 8, totalDeployed: '$80M+',
      notablePortfolio: ['SparkCognition', 'Matternet', 'Fortem Technologies'],
      website: 'https://www.boeing.com/company/key-orgs/horizon-x', hqLocation: 'Chicago, IL', foundedYear: 2017,
    },
    {
      id: 'y-combinator', name: 'Y Combinator', type: 'Accelerator',
      description: 'World\'s top startup accelerator with a growing cohort of space and deep tech companies.',
      investmentThesis: 'We fund early-stage startups and provide mentorship, network, and demo day access to 1000+ investors.',
      aum: 'N/A', checkSizeRange: '$500K (standard deal)', stagePreference: ['Pre-seed', 'Seed'],
      sectorFocus: ['Launch', 'Satellites', 'Software', 'Analytics', 'All Sectors'],
      dealCount: 20, totalDeployed: '$10M+',
      notablePortfolio: ['Relativity Space (early)', 'Astranis', 'Phantom Space'],
      website: 'https://www.ycombinator.com', hqLocation: 'San Francisco, CA', foundedYear: 2005,
    },
    {
      id: 'techstars-allied', name: 'Techstars (Allied Space)', type: 'Accelerator',
      description: 'Techstars accelerator program in partnership with the U.S. Space Force and Air Force.',
      investmentThesis: 'Connecting dual-use startups with military end-users and DoD funding through structured acceleration.',
      aum: 'N/A', checkSizeRange: '$120K (standard deal)', stagePreference: ['Pre-seed', 'Seed'],
      sectorFocus: ['Defense', 'Space Domain Awareness', 'Communications', 'Cybersecurity'],
      dealCount: 15, totalDeployed: '$5M+',
      notablePortfolio: ['Slingshot Aerospace', 'Scout Space', 'Kall Morris'],
      website: 'https://www.techstars.com/accelerators/allied-space', hqLocation: 'Los Angeles, CA', foundedYear: 2020,
    },
  ]);

  await upsertContent('space-capital', 'funding-by-year', [
    { year: 2019, amount: 5.8, deals: 178 },
    { year: 2020, amount: 7.7, deals: 163 },
    { year: 2021, amount: 15.4, deals: 272 },
    { year: 2022, amount: 8.1, deals: 234 },
    { year: 2023, amount: 6.9, deals: 198 },
    { year: 2024, amount: 8.4, deals: 210 },
    { year: 2025, amount: 7.2, deals: 185 },
  ]);

  // ═══════════════════════════════════════════════════════════════════
  // 5. SPACE DEFENSE — Now seeded via dedicated scripts/seed-space-defense.ts
  // Run separately: npx tsx scripts/seed-space-defense.ts
  // ═══════════════════════════════════════════════════════════════════

  console.log('🛡️ Space defense: skipped (use scripts/seed-space-defense.ts)');

  // ═══════════════════════════════════════════════════════════════════
  // 6. CISLUNAR
  // ═══════════════════════════════════════════════════════════════════

  console.log('🌙 Seeding cislunar...');

  await upsertContent('cislunar', 'artemis-missions', [
    { id: 'artemis-1', name: 'Artemis I', date: 'Nov 16 - Dec 11, 2022', status: 'completed', vehicle: 'SLS Block 1 / Orion (EFT-1)', crew: 0, objectives: ['Uncrewed test flight of SLS and Orion', 'Distant retrograde orbit around the Moon', 'Heat shield reentry test at lunar return speeds', 'Orion systems validation in deep space'], description: 'Successfully completed a 25.5-day mission traveling 1.4 million miles. Orion performed multiple lunar flybys, entered a distant retrograde orbit (DRO), and set a new distance record for a spacecraft designed to carry humans (268,563 miles from Earth).' },
    { id: 'artemis-2', name: 'Artemis II', date: 'NET Mar 2026', status: 'upcoming', vehicle: 'SLS Block 1 / Orion', crew: 4, crewNames: ['Reid Wiseman (CDR)', 'Victor Glover (Pilot)', 'Christina Koch (MS)', 'Jeremy Hansen (MS, CSA)'], objectives: ['First crewed Artemis flight (4 astronauts)', 'Lunar free-return trajectory flyby', 'Test Orion life support systems with crew', 'Manual piloting demonstrations'], internationalContributions: ['CSA: Jeremy Hansen (first non-American on lunar trajectory)'], description: 'The first crewed Artemis mission will carry astronauts on an approximately 10-day free-return trajectory around the Moon. Crew includes the first woman (Koch) and first person of color (Glover) to leave low Earth orbit.' },
    { id: 'artemis-3', name: 'Artemis III', date: 'NET 2028', status: 'planned', vehicle: 'SLS Block 1 / Orion', hls: 'SpaceX Starship HLS', crew: 4, objectives: ['First crewed lunar landing since Apollo 17 (1972)', 'South polar region surface operations (~6.5 days)', 'Up to 2 astronauts on lunar surface via Starship HLS', 'Moonwalks for science collection and technology demos'], description: 'This historic mission will return humans to the lunar surface for the first time in over 50 years. Delayed from original mid-2026 target due to Starship HLS development timeline and Orion heat shield evaluation.' },
    { id: 'artemis-4', name: 'Artemis IV', date: 'NET 2028', status: 'planned', vehicle: 'SLS Block 1B / Orion', hls: 'SpaceX Starship HLS (enhanced)', crew: 4, objectives: ['First crewed mission to the Lunar Gateway', 'Delivery of I-HAB module to Gateway', 'Dock Orion with PPE+HALO in NRHO', 'Potential surface sortie via Starship HLS'], description: 'Artemis IV marks the debut of the SLS Block 1B configuration with its more powerful Exploration Upper Stage (EUS).' },
    { id: 'artemis-5', name: 'Artemis V', date: 'NET 2030', status: 'planned', vehicle: 'SLS Block 1B / Orion', hls: 'Blue Origin Blue Moon Mark 2', crew: 4, objectives: ['Second provider HLS demonstration (Blue Origin)', 'Blue Moon Mark 2 crewed lunar landing', 'Further Gateway assembly and outfitting', 'Extended surface operations'], description: 'Artemis V will feature Blue Origin\'s Blue Moon Mark 2 Human Landing System, providing NASA a second independent crew transportation option.' },
    { id: 'artemis-6-plus', name: 'Artemis VI+', date: '2031 and beyond', status: 'planned', vehicle: 'SLS Block 1B or Block 2 / Orion', hls: 'Alternating SpaceX / Blue Origin HLS', crew: 4, objectives: ['Sustained lunar presence with annual missions', 'Extended surface stays (weeks to months)', 'Lunar surface habitat deployment', 'ISRU demonstrations at scale'], description: 'The sustained phase of Artemis envisions regular missions to the Gateway and lunar surface through the 2030s.' },
  ]);

  await upsertContent('cislunar', 'clps-missions', [
    { id: 'peregrine-1', name: 'Peregrine Mission One', company: 'Astrobotic Technology', lander: 'Peregrine', launchDate: 'Jan 8, 2024', status: 'failure', payloads: ['NASA LETS', 'NASA NSS', 'NASA NIRVSS', 'NASA PITMS', 'NASA LRA', 'CMU Iris rover'], result: 'Propulsion anomaly shortly after launch caused oxidizer leak.', contractValue: '$79.5M', description: 'The first CLPS delivery attempt.' },
    { id: 'im-1', name: 'IM-1 (Nova-C Odysseus)', company: 'Intuitive Machines', lander: 'Nova-C "Odysseus"', launchDate: 'Feb 15, 2024', landingSite: 'Malapert A crater (south polar region)', status: 'partial-success', payloads: ['NASA ROLSES', 'NASA LN-1', 'NASA LRA', 'NASA NDL', 'NASA SCALPSS', 'NASA ILO-X'], result: 'First US soft landing on the Moon since Apollo 17 and first commercial lunar landing. Tipped onto its side during landing.', contractValue: '$118M', description: 'Historic mission -- first commercial lunar landing.' },
    { id: 'im-2', name: 'IM-2 (Athena)', company: 'Intuitive Machines', lander: 'Nova-C "Athena"', launchDate: 'Feb 26, 2025', landingSite: 'Shackleton crater ridge', status: 'partial-success', payloads: ['NASA PRIME-1', 'TRIDENT drill', 'MSolo', 'Micro-Nova hopper', 'Nokia 4G/LTE demo', 'Lunar Outpost MAPP rover'], contractValue: '$130M', result: 'Launched Feb 26, 2025. Landed near south pole Mar 6, 2025 but tipped sideways due to altimeter failure. Southernmost lunar landing ever achieved. Mission ended Mar 7 due to insufficient power.', description: 'IM-2 targeted Shackleton crater with PRIME-1 ice mining experiment. Achieved southernmost lunar landing in history.' },
    { id: 'blue-ghost-1', name: 'Blue Ghost Mission 1', company: 'Firefly Aerospace', lander: 'Blue Ghost', launchDate: 'Jan 15, 2025', landingSite: 'Mare Crisium', status: 'success', payloads: ['NASA LISTER', 'NASA LRA', 'NASA LETS', 'NASA BFSS', 'NASA RAC', 'NASA SPELLS', 'Honeybee Robotics LUNARSABER'], contractValue: '$93.3M', result: 'First fully successful commercial soft landing on the Moon (Mar 2, 2025). Operated for 14 days on the lunar surface, the longest commercial lunar surface mission.', description: 'Firefly\'s first CLPS mission. Successfully landed at Mare Crisium and completed a 14-day surface mission.' },
    { id: 'im-3', name: 'IM-3', company: 'Intuitive Machines', lander: 'Nova-C (enhanced)', launchDate: 'Late 2025', landingSite: 'Reiner Gamma', status: 'planned', payloads: ['NASA Lunar Vertex'], contractValue: '$77.5M', description: 'IM-3 will deliver Lunar Vertex to Reiner Gamma swirl.' },
    { id: 'griffin-viper', name: 'Griffin / VIPER', company: 'Astrobotic Technology', lander: 'Griffin', launchDate: 'Cancelled', status: 'failure', payloads: ['NASA VIPER rover (cancelled Jul 2024)'], result: 'NASA cancelled VIPER in July 2024 due to cost overruns ($609M+ vs $433M original).', contractValue: '$320M+', description: 'Originally planned to deliver NASA\'s VIPER rover to the lunar south pole.' },
    { id: 'clps-cs3', name: 'CS-3 (Draper/Firefly)', company: 'Draper / Firefly Aerospace', lander: 'Blue Ghost (Series 2)', launchDate: 'NET 2026', landingSite: 'Schrodinger basin (far side)', status: 'planned', payloads: ['Farside Seismic Suite', 'LITMS'], contractValue: '$73M', description: 'First US landing on the far side of the Moon.' },
    { id: 'blue-ghost-2', name: 'Blue Ghost Mission 2', company: 'Firefly Aerospace', lander: 'Blue Ghost', launchDate: 'NET 2026', status: 'planned', payloads: ['NASA Lunar PlanetVac'], contractValue: '$110M', description: 'Firefly\'s second CLPS award.' },
  ]);

  await upsertContent('cislunar', 'isru-programs', [
    { id: 'prime-1', name: 'PRIME-1', organization: 'NASA / Honeybee Robotics', category: 'water-ice', trl: 6, status: 'active', description: 'First attempt to drill into lunar surface and analyze subsurface volatiles. Flying on IM-2 to Shackleton crater.', targetDate: 'Q1 2025' },
    { id: 'viper-legacy', name: 'VIPER Instrument Suite Legacy', organization: 'NASA Ames', category: 'prospecting', trl: 7, status: 'cancelled', description: 'VIPER cancelled July 2024 after exceeding $609M budget. Instruments may fly on future missions.' },
    { id: 'moxie-heritage', name: 'MOXIE Heritage / Lunar Oxygen Extraction', organization: 'NASA JPL / MIT', category: 'oxygen', trl: 5, status: 'active', description: 'Building on MOXIE success on Mars, developing lunar oxygen extraction from regolith.' },
    { id: 'isru-pilot', name: 'Lunar Surface ISRU Pilot Plant', organization: 'NASA / Multiple contractors', category: 'propellant', trl: 3, status: 'planned', description: 'Long-term vision for ISRU pilot plant producing water, oxygen, and propellant from lunar resources.', targetDate: 'Post-2030' },
    { id: 'regolith-processing', name: 'Lunar Regolith Construction Materials', organization: 'NASA / ICON / AI SpaceFactory', category: 'regolith', trl: 4, status: 'active', description: 'ICON received $57.2M contract for 3D printing with regolith (Project Olympus).' },
    { id: 'lunar-metals', name: 'Lunar Metal Extraction', organization: 'ESA / Universities', category: 'metals', trl: 3, status: 'active', description: 'Molten salt electrolysis to extract iron, aluminum, titanium from regolith.' },
    { id: 'water-ice-mapping', name: 'Lunar Water Ice Mapping', organization: 'NASA / ISRO / KARI', category: 'water-ice', trl: 5, status: 'active', description: 'Multiple missions confirmed water ice in permanently shadowed regions. Estimated 600M+ metric tons.' },
  ]);

  await upsertContent('cislunar', 'infrastructure', [
    { id: 'gateway-ppe-halo', name: 'Lunar Gateway (PPE + HALO)', category: 'gateway', developer: 'Lanteris Space Systems (PPE) / Northrop Grumman (HALO)', status: 'under-construction', description: 'First two Gateway modules. 60 kW solar electric propulsion + crew capacity of 4.', timeline: 'Launch NET 2027 on Falcon Heavy', cost: '~$1.3B combined' },
    { id: 'lunanet', name: 'LunaNet Communications Architecture', category: 'communications', developer: 'NASA / ESA / JAXA', status: 'development', description: 'Interoperable lunar communications and navigation framework.', timeline: 'Phased deployment 2025-2030' },
    { id: 'moonlight', name: 'ESA Moonlight Initiative', category: 'communications', developer: 'ESA / SSTL / Telespazio', status: 'development', description: 'Commercial lunar communications and navigation service.', timeline: 'Lunar Pathfinder NET 2026', cost: '~EUR 340M' },
    { id: 'starship-hls', name: 'SpaceX Starship HLS', category: 'transport', developer: 'SpaceX', status: 'development', description: 'Starship Human Landing System for Artemis III and subsequent missions.', cost: '$2.89B + $1.15B option' },
    { id: 'blue-moon', name: 'Blue Origin Blue Moon Mark 2', category: 'transport', developer: 'Blue Origin (National Team)', status: 'development', description: 'HLS for Artemis V and beyond. Single-stage LOX/LH2 design.', cost: '$3.4B' },
    { id: 'surface-power', name: 'Fission Surface Power System', category: 'power', developer: 'NASA / DOE / Lockheed Martin', status: 'development', description: '40 kW nuclear fission reactor for lunar surface.', cost: '$150M+' },
    { id: 'surface-hab', name: 'Lunar Surface Habitat', category: 'surface', developer: 'NASA / Multiple contractors', status: 'concept', description: 'Pressurized habitat for extended lunar surface stays.' },
    { id: 'lpr', name: 'Lunar Terrain Vehicle (LTV)', category: 'surface', developer: 'Lunar Dawn (Intuitive Machines + AVL + Northrop Grumman + Michelin)', status: 'development', description: 'Next-gen rover for Artemis EVAs. Crewed and autonomous modes.', cost: '$4.6B max potential' },
  ]);

  await upsertContent('cislunar', 'investments', [
    { id: 'nasa-artemis-total', program: 'Artemis Program (Total)', organization: 'NASA', type: 'government', amount: '$93B+', amountNum: 93000, period: 'FY2012-FY2025', category: 'Program Total', description: 'Total Artemis costs including SLS, Orion, Ground Systems, HLS, spacesuits, and Gateway.' },
    { id: 'sls-dev', program: 'Space Launch System (SLS)', organization: 'NASA / Boeing', type: 'government', amount: '$23.8B', amountNum: 23800, period: 'FY2011-FY2024', category: 'Launch Vehicle' },
    { id: 'orion-dev', program: 'Orion Multi-Purpose Crew Vehicle', organization: 'NASA / Lockheed Martin', type: 'government', amount: '$20.4B', amountNum: 20400, period: 'FY2006-FY2024', category: 'Crew Vehicle' },
    { id: 'hls-spacex', program: 'HLS Option A - SpaceX Starship', organization: 'NASA / SpaceX', type: 'government', amount: '$4.04B', amountNum: 4040, category: 'Human Landing System' },
    { id: 'hls-blue', program: 'HLS Sustaining Lunar Development - Blue Origin', organization: 'NASA / Blue Origin', type: 'government', amount: '$3.4B', amountNum: 3400, category: 'Human Landing System' },
    { id: 'gateway-contracts', program: 'Lunar Gateway (All Modules)', organization: 'NASA + ESA + JAXA + CSA', type: 'government', amount: '~$7.8B', amountNum: 7800, category: 'Orbital Infrastructure' },
    { id: 'clps-total', program: 'CLPS Task Orders (Cumulative)', organization: 'NASA', type: 'government', amount: '$2.6B+', amountNum: 2600, category: 'Commercial Lunar Delivery' },
    { id: 'xeva-suits', program: 'xEVA Spacesuits (Axiom Space)', organization: 'NASA / Axiom Space', type: 'government', amount: '$228.5M', amountNum: 228, category: 'Crew Systems' },
    { id: 'ltv-contract', program: 'Lunar Terrain Vehicle (LTV)', organization: 'NASA / Intuitive Machines', type: 'government', amount: '$4.6B', amountNum: 4600, category: 'Surface Mobility' },
    { id: 'esa-terrae-novae', program: 'ESA Terrae Novae / Exploration Envelope', organization: 'ESA', type: 'international', amount: '~EUR 2.7B', amountNum: 2900, category: 'European Exploration' },
    { id: 'jaxa-lunar', program: 'JAXA Lunar Programs', organization: 'JAXA', type: 'international', amount: '~$1.5B', amountNum: 1500, category: 'Japanese Lunar Program' },
    { id: 'isro-chandrayaan', program: 'ISRO Chandrayaan Program', organization: 'ISRO', type: 'international', amount: '~$300M', amountNum: 300, category: 'Indian Lunar Program' },
  ]);

  await upsertContent('cislunar', 'gateway-modules', [
    { id: 'ppe', name: 'Power & Propulsion Element', abbreviation: 'PPE', builder: 'Lanteris Space Systems (formerly Maxar Technologies)', mass: '~5,000 kg', power: '60 kW solar electric propulsion', launchDate: 'NET 2027', status: 'integration', cost: '~$375M', partners: ['NASA'], description: 'Provides power, high-rate communications, attitude control, and orbital maneuvering.' },
    { id: 'halo', name: 'Habitation and Logistics Outpost', abbreviation: 'HALO', builder: 'Northrop Grumman', mass: '~8,600 kg', crewCapacity: '4 (up to 30 days)', launchDate: 'NET 2027', status: 'construction', cost: '~$935M', partners: ['NASA'], description: 'Initial crew module derived from Cygnus spacecraft design.' },
    { id: 'ihab', name: 'International Habitation Module', abbreviation: 'I-HAB', builder: 'Thales Alenia Space (ESA)', launchDate: 'Artemis IV (NET 2028)', status: 'manufacturing', cost: 'ESA contribution (~EUR 600M)', partners: ['ESA', 'JAXA', 'NASA'], description: 'ESA contribution providing enhanced life support and crew quarters.' },
    { id: 'esprit', name: 'ESPRIT', abbreviation: 'ESPRIT', builder: 'Thales Alenia Space', launchDate: 'NET 2029', status: 'design', partners: ['ESA'], description: 'European System Providing Refueling, Infrastructure and Telecommunications.' },
    { id: 'canadarm3', name: 'Canadarm3', abbreviation: 'Canadarm3', builder: 'MDA Space', launchDate: 'NET 2028', status: 'development', cost: '~$2.2B CAD', partners: ['CSA'], description: 'AI-powered robotic arm for Gateway assembly and maintenance.' },
  ]);

  await upsertContent('cislunar', 'international-partners', [
    { agency: 'ESA', country: 'Europe', flag: 'EU', contributions: ['I-HAB module', 'ESPRIT module', 'Orion European Service Module', 'Moonlight communications', 'PROSPECT lunar drill'], keyHardware: 'I-HAB + Orion ESM' },
    { agency: 'JAXA', country: 'Japan', flag: 'JP', contributions: ['I-HAB ECLSS components', 'HTV-X cargo vehicle', 'SLIM lunar lander heritage', 'LUPEX rover (with ISRO)'], keyHardware: 'I-HAB ECLSS + HTV-X' },
    { agency: 'CSA', country: 'Canada', flag: 'CA', contributions: ['Canadarm3 robotic system', 'Artemis II crew member (Hansen)', 'Deep space robotics'], keyHardware: 'Canadarm3' },
    { agency: 'ISRO', country: 'India', flag: 'IN', contributions: ['Chandrayaan program heritage', 'LUPEX rover (with JAXA)', 'Artemis Accords signatory'], keyHardware: 'LUPEX rover' },
    { agency: 'ASA', country: 'Australia', flag: 'AU', contributions: ['Lunar rover', 'Artemis Accords founding signatory', 'Deep Space Network support'], keyHardware: 'Lunar rover' },
    { agency: 'KARI/KASA', country: 'South Korea', flag: 'KR', contributions: ['Danuri lunar orbiter (ShadowCam)', 'Future lander mission', 'Artemis Accords signatory'], keyHardware: 'Danuri/ShadowCam' },
  ]);

  // ═══════════════════════════════════════════════════════════════════
  // 7. COMPLIANCE
  // ═══════════════════════════════════════════════════════════════════

  console.log('⚖️ Seeding compliance...');

  await upsertContent('compliance', 'treaties', [
    { id: 'ost', name: 'Outer Space Treaty', fullName: 'Treaty on Principles Governing the Activities of States in the Exploration and Use of Outer Space', adoptedYear: 1966, entryIntoForceYear: 1967, status: 'in_force', ratifications: 114, signatories: 23, depositary: 'UN Secretary-General', keyProvisions: ['Outer space is free for exploration and use by all states', 'No national appropriation', 'No weapons of mass destruction in orbit', 'States bear international responsibility', 'States liable for damage caused by space objects'], description: 'The foundational treaty of international space law.', significance: 'Cornerstone of space law, ratified by all major spacefaring nations.' },
    { id: 'rescue', name: 'Rescue Agreement', adoptedYear: 1967, entryIntoForceYear: 1968, status: 'in_force', ratifications: 99, signatories: 23 },
    { id: 'liability', name: 'Liability Convention', adoptedYear: 1971, entryIntoForceYear: 1972, status: 'in_force', ratifications: 98, signatories: 19 },
    { id: 'registration', name: 'Registration Convention', adoptedYear: 1974, entryIntoForceYear: 1976, status: 'in_force', ratifications: 72, signatories: 4 },
    { id: 'moon', name: 'Moon Agreement', adoptedYear: 1979, entryIntoForceYear: 1984, status: 'not_in_force', ratifications: 18, signatories: 4, significance: 'Not ratified by any major spacefaring nation.' },
  ]);

  await upsertContent('compliance', 'artemis-signatories', [
    { id: 'us', country: 'United States', dateSigned: '2020-10-13', region: 'North America', spaceAgency: 'NASA', implementationStatus: 'implementing' },
    { id: 'au', country: 'Australia', dateSigned: '2020-10-13', region: 'Oceania', spaceAgency: 'ASA', implementationStatus: 'implementing' },
    { id: 'ca', country: 'Canada', dateSigned: '2020-10-13', region: 'North America', spaceAgency: 'CSA', implementationStatus: 'implementing' },
    { id: 'jp', country: 'Japan', dateSigned: '2020-10-13', region: 'Asia-Pacific', spaceAgency: 'JAXA', implementationStatus: 'implementing' },
    { id: 'gb', country: 'United Kingdom', dateSigned: '2020-10-13', region: 'Europe', spaceAgency: 'UKSA', implementationStatus: 'implementing' },
    { id: 'fr', country: 'France', dateSigned: '2022-06-07', region: 'Europe', spaceAgency: 'CNES', implementationStatus: 'implementing' },
    { id: 'de', country: 'Germany', dateSigned: '2023-09-14', region: 'Europe', spaceAgency: 'DLR', implementationStatus: 'implementing' },
    { id: 'in', country: 'India', dateSigned: '2023-06-23', region: 'Asia-Pacific', spaceAgency: 'ISRO', implementationStatus: 'implementing' },
    // 43 total signatories as of early 2025
  ]);

  await upsertContent('compliance', 'regulatory-bodies', [
    { id: 'unoosa', name: 'UN Office for Outer Space Affairs', abbreviation: 'UNOOSA', type: 'un', headquarters: 'Vienna, Austria', established: 1958 },
    { id: 'copuos', name: 'Committee on the Peaceful Uses of Outer Space', abbreviation: 'COPUOS', type: 'un', headquarters: 'Vienna, Austria', established: 1959 },
    { id: 'itu', name: 'International Telecommunication Union', abbreviation: 'ITU', type: 'un', headquarters: 'Geneva, Switzerland', established: 1865 },
    { id: 'faa-ast', name: 'FAA Office of Commercial Space Transportation', abbreviation: 'FAA/AST', type: 'national', headquarters: 'Washington, D.C.', established: 1984 },
    { id: 'fcc', name: 'Federal Communications Commission', abbreviation: 'FCC', type: 'national', headquarters: 'Washington, D.C.', established: 1934 },
    { id: 'noaa', name: 'National Oceanic and Atmospheric Administration', abbreviation: 'NOAA', type: 'national', headquarters: 'Washington, D.C.', established: 1970 },
    { id: 'esa', name: 'European Space Agency', abbreviation: 'ESA', type: 'regional', headquarters: 'Paris, France', established: 1975, members: '22 Member States' },
    { id: 'iadc', name: 'Inter-Agency Space Debris Coordination Committee', abbreviation: 'IADC', type: 'industry', established: 1993, members: '13 Space Agencies' },
  ]);

  await upsertContent('compliance', 'fcc-filings', [
    { id: 'fcc-1', applicant: 'SpaceX Services, Inc.', filingType: 'Part 25 NGSO Modification', band: 'Ku/Ka-band', orbitType: 'NGSO', status: 'granted', dateFiled: '2020-05-26', satelliteCount: 2814, summary: 'SpaceX Gen2 modification to lower orbital shells.' },
    { id: 'fcc-2', applicant: 'SpaceX Services, Inc.', filingType: 'Part 25 Gen2 System', band: 'Ku/Ka/V-band', orbitType: 'NGSO', status: 'granted', dateFiled: '2022-01-18', satelliteCount: 7500, summary: 'SpaceX Gen2 constellation authorization for 7,500 satellites.' },
    { id: 'fcc-3', applicant: 'Kuiper Systems LLC (Amazon)', filingType: 'Part 25 NGSO License', band: 'Ka-band', orbitType: 'NGSO', status: 'granted', dateFiled: '2019-07-04', satelliteCount: 3236, summary: 'Amazon Project Kuiper 3,236-satellite broadband constellation.' },
    { id: 'fcc-6', applicant: 'AST SpaceMobile, Inc.', filingType: 'Part 25 NGSO License', band: 'V-band', orbitType: 'NGSO', status: 'granted', dateFiled: '2022-10-03', satelliteCount: 243, summary: 'AST SpaceMobile 243 BlueBird satellites for direct-to-cellular.' },
    // 12 total FCC filings
  ]);

  await upsertContent('compliance', 'faa-licenses', [
    { id: 'faa-1', licenseNumber: 'LRLO 24-118A', licensee: 'Space Exploration Technologies Corp.', vehicle: 'Falcon 9 / Dragon', launchSite: 'KSC LC-39A, CCSFS SLC-40, VSFB SLC-4E', status: 'active', missionsAuthorized: 100 },
    { id: 'faa-2', licenseNumber: 'LRLO 23-112', licensee: 'Space Exploration Technologies Corp.', vehicle: 'Starship / Super Heavy', launchSite: 'Boca Chica, TX (Starbase)', status: 'active', missionsAuthorized: 10 },
    { id: 'faa-3', licenseNumber: 'LRLO 24-120', licensee: 'Rocket Lab USA, Inc.', vehicle: 'Electron', launchSite: 'Wallops Flight Facility LC-2', status: 'active', missionsAuthorized: 50 },
    { id: 'faa-5', licenseNumber: 'LRLO 23-108', licensee: 'United Launch Alliance, LLC', vehicle: 'Vulcan Centaur', launchSite: 'CCSFS SLC-41', status: 'active', missionsAuthorized: 30 },
    { id: 'faa-8', licenseNumber: 'LRLO 23-105', licensee: 'Blue Origin, LLC', vehicle: 'New Glenn', launchSite: 'CCSFS LC-36', status: 'active', missionsAuthorized: 25 },
    // 12 total FAA licenses
  ]);

  await upsertContent('compliance', 'federal-register-entries', [
    { id: 'fr-1', agency: 'FCC', title: 'Space Innovation: NGSO Deployment Milestone Rules', documentType: 'Final Rule', publishedDate: '2024-09-29', impact: 'high', summary: 'Revised deployment milestones for NGSO satellite constellations.' },
    { id: 'fr-2', agency: 'FCC', title: 'Mitigation of Orbital Debris in the New Space Age', documentType: 'Final Rule', publishedDate: '2024-03-15', impact: 'high', summary: '5-year post-mission disposal rule for LEO satellites.' },
    { id: 'fr-3', agency: 'FCC', title: 'Supplemental Coverage from Space', documentType: 'Proposed Rule', publishedDate: '2024-11-20', impact: 'high', summary: 'Framework for direct-to-device satellite services.' },
    { id: 'fr-4', agency: 'FAA', title: 'Streamlining Launch and Reentry Licensing', documentType: 'Final Rule', publishedDate: '2024-05-18', impact: 'high', summary: 'Part 450 modernization of commercial space launch regulations.' },
    // 12 total Federal Register entries
  ]);

  await upsertContent('compliance', 'national-laws', [
    { id: 'us-cslca', country: 'United States', name: 'Commercial Space Launch Competitiveness Act', year: 2015, status: 'enacted', agency: 'FAA / NOAA', description: 'Extends commercial space launch indemnification, grants US citizens property rights over space resources obtained, extends ISS operations authorization through 2024.', keyProvisions: ['Title IV: Space resource rights for US citizens', 'Launch indemnification extension', 'ISS authorization extension', 'Regulatory streamlining provisions'], significance: 'First national law recognizing private property rights in space resources.' },
    { id: 'us-space-act-2010', country: 'United States', name: 'NASA Authorization Act of 2010', year: 2010, status: 'enacted', agency: 'NASA', description: 'Directed NASA to develop the SLS launch vehicle, Orion crew vehicle, and pursue commercial crew transportation to ISS.', keyProvisions: ['SLS development mandate', 'Orion crew vehicle continuation', 'Commercial crew program authorization', 'Technology development priorities'], significance: 'Established current architecture for Artemis program and commercial crew.' },
    { id: 'us-csla-1984', country: 'United States', name: 'Commercial Space Launch Act of 1984', year: 1984, status: 'amended', agency: 'FAA/DOT', description: 'Original legislation establishing US commercial space launch licensing framework. Created the Office of Commercial Space Transportation.', keyProvisions: ['Commercial launch licensing requirement', 'FAA/AST regulatory authority', 'Government indemnification framework', 'Insurance requirements'], significance: 'Foundation of US commercial space regulatory framework. Amended multiple times since 1984.' },
    { id: 'uk-sia-2018', country: 'United Kingdom', name: 'Space Industry Act 2018', year: 2018, status: 'enacted', agency: 'UK CAA / UKSA', description: 'Comprehensive UK legislation enabling commercial spaceflight from UK territory. Covers launch vehicles, orbital carriers, suborbital activities, and spaceport operations.', keyProvisions: ['Launch operator licensing', 'Spaceport licensing', 'Orbital activities licensing', 'Range control provisions', 'Third-party liability framework', 'Environmental assessment requirements'], significance: 'First comprehensive UK space legislation. Enables launches from SaxaVord, Sutherland, and other UK spaceports.' },
    { id: 'uk-outer-space-act', country: 'United Kingdom', name: 'Outer Space Act 1986', year: 1986, status: 'amended', agency: 'UKSA', description: 'Original UK space legislation requiring licensing for UK nationals conducting space activities anywhere in the world.', keyProvisions: ['License requirement for space activities', 'Liability cap provisions', 'Registration obligations', 'Supervisory authority designation'], significance: 'Basis for UK space regulation for 30+ years. Supplemented by Space Industry Act 2018.' },
    { id: 'fr-loi-spatiale', country: 'France', name: 'French Space Operations Act (Loi relative aux operations spatiales)', year: 2008, status: 'enacted', agency: 'CNES', description: 'Comprehensive French space activities law covering launch authorization, in-orbit operations, and liability. One of the most detailed national space laws.', keyProvisions: ['Launch and orbital operations authorization', 'Technical regulations on debris mitigation', 'Operator liability framework', 'Government guarantee above insurance limits', 'Technology transfer controls'], significance: 'Model national space law. First to require specific technical standards for debris mitigation as condition of authorization.' },
    { id: 'de-satellite-data-security', country: 'Germany', name: 'Satellite Data Security Act (SatDSiG)', year: 2007, status: 'enacted', agency: 'DLR / BSI', description: 'German law controlling distribution of high-resolution satellite imagery. Requires sensitivity review for Earth observation data exceeding certain resolution thresholds.', keyProvisions: ['Classification of satellite data by sensitivity', 'Distribution restrictions for high-resolution data', 'Government review for sensitive areas', 'Penalties for unauthorized distribution'], significance: 'Key model for national remote sensing data protection. Affects TerraSAR-X and other German EO missions.' },
    { id: 'jp-space-activities-act', country: 'Japan', name: 'Space Activities Act', year: 2016, status: 'enacted', agency: 'Cabinet Office / JAXA', description: 'Japan\'s first comprehensive space activities legislation covering launch licensing, satellite management, and third-party liability.', keyProvisions: ['Launch licensing requirement', 'Satellite management standards', 'Third-party liability and insurance', 'Government indemnification program', 'Debris mitigation requirements'], significance: 'Established Japan\'s commercial space regulatory framework. Enables private launch operators like Interstellar Technologies and Space One.' },
    { id: 'au-space-act', country: 'Australia', name: 'Space (Launches and Returns) Act 2018', year: 2018, status: 'enacted', agency: 'Australian Space Agency', description: 'Updated Australian space legislation modernizing the regulatory framework for launches from Australian territory, including Equatorial Launch Australia.', keyProvisions: ['Launch permit requirements', 'Overseas launch certificates', 'High-power rocket provisions', 'Liability framework', 'Environmental assessment requirements'], significance: 'Supports growing Australian launch industry including Equatorial Launch Australia and Southern Launch facilities.' },
    { id: 'lu-space-resources', country: 'Luxembourg', name: 'Law on the Exploration and Use of Space Resources', year: 2017, status: 'enacted', agency: 'Luxembourg Space Agency', description: 'Second national law (after US) explicitly recognizing ownership rights over space resources. Part of Luxembourg\'s initiative to become a European hub for space resources.', keyProvisions: ['Recognition of property rights over space resources', 'Authorization framework for resource missions', 'Supervision requirements', 'Designed to attract space mining companies'], significance: 'Second country to enact space resource property rights legislation. Attracted several space mining companies to establish European headquarters in Luxembourg.' },
    { id: 'uae-space-law', country: 'United Arab Emirates', name: 'UAE National Space Law (Federal Law No. 12 of 2019)', year: 2019, status: 'enacted', agency: 'UAE Space Agency', description: 'Comprehensive UAE space legislation covering space activities, licensing, liability, and space object registration. Part of UAE\'s ambitions in Mars exploration and satellite operations.', keyProvisions: ['Space activity licensing', 'Registration of space objects', 'Liability and insurance framework', 'Environmental protection provisions', 'Space debris mitigation'], significance: 'Reflects growing space ambitions of Gulf states. Supports MBR Space Centre, Hope Mars Mission, and commercial satellite operations.' },
    { id: 'nz-outer-space-act', country: 'New Zealand', name: 'Outer Space and High-altitude Activities Act 2017', year: 2017, status: 'enacted', agency: 'NZ Ministry of Business', description: 'New Zealand space legislation enabling Rocket Lab\'s Launch Complex 1 on Mahia Peninsula. Covers launch, in-orbit, and high-altitude activities.', keyProvisions: ['Launch and payload permits', 'Orbital and high-altitude activity licensing', 'Technology safeguards agreements', 'Environmental requirements', 'Third-party liability'], significance: 'Enabled Rocket Lab to establish the first private orbital launch site. Model for small-nation space legislation.' },
  ]);

  await upsertContent('compliance', 'artemis-principles', [
    { title: 'Peaceful Purposes', description: 'Activities conducted under the Accords shall be exclusively for peaceful purposes pursuant to the Outer Space Treaty. This includes civil exploration and use of outer space.' },
    { title: 'Transparency', description: 'Signatories commit to broad dissemination of information regarding national space policies and plans, consistent with national rules and regulations.' },
    { title: 'Interoperability', description: 'Signatories will strive to support interoperability of space systems, including through use of common standards and support for open standards.' },
    { title: 'Emergency Assistance', description: 'Signatories commit to taking all reasonable steps to render emergency assistance to astronauts in distress, consistent with the Rescue Agreement.' },
    { title: 'Registration of Space Objects', description: 'Signatories intend to determine which signatory should register any relevant space object, consistent with the Registration Convention.' },
    { title: 'Release of Scientific Data', description: 'Signatories commit to publicly releasing scientific data from their activities to promote transparency and international scientific cooperation.' },
    { title: 'Preserving Outer Space Heritage', description: 'Signatories intend to preserve outer space heritage, including historic landing sites, artifacts, and other evidence of activity on celestial bodies.' },
    { title: 'Space Resources', description: 'Signatories affirm that the extraction and utilization of space resources can be conducted consistent with the Outer Space Treaty, and intend to share scientific information arising from such activities.' },
    { title: 'Deconfliction of Activities', description: 'Signatories commit to coordinating activities and providing notification regarding safety zones, consistent with the Outer Space Treaty.' },
    { title: 'Orbital Debris', description: 'Signatories commit to planning for the safe, timely, and efficient disposal of space debris, including spacecraft and launch vehicles at end of mission.' },
  ]);

  await upsertContent('compliance', 'legal-proceedings', [
    { id: 'lp-1', title: 'FCC v. Swarm Technologies - Unauthorized Satellite Launch', type: 'fcc_enforcement', parties: 'FCC v. Swarm Technologies, Inc.', status: 'resolved', year: 2018, jurisdiction: 'FCC', description: 'First FCC enforcement action for unauthorized satellite launch. $900,000 consent decree after Swarm launched SpaceBEE satellites without authorization.', significance: 'Established FCC authority over pre-launch authorization and trackability standards.', outcome: '$900,000 consent decree. Company later acquired by SpaceX.' },
    { id: 'lp-2', title: 'FCC v. DISH Network - First Orbital Debris Fine', type: 'fcc_enforcement', parties: 'FCC v. DISH Network LLC', status: 'resolved', year: 2023, jurisdiction: 'FCC', description: 'First-ever FCC fine for orbital debris violation. DISH fined $150,000 for failing to deorbit EchoStar-7 to required graveyard orbit.', significance: 'Precedent-setting for orbital debris mitigation enforcement.', outcome: '$150,000 civil penalty. Compliance plan required.' },
    { id: 'lp-3', title: 'DOJ/DOS v. Loral/Hughes - China Technology Transfer', type: 'export_control', parties: 'United States v. Loral / Hughes Electronics', status: 'resolved', year: 2002, jurisdiction: 'DDTC / DOJ', description: 'Loral and Hughes settled charges of providing unauthorized technical assistance to China for Long March rocket failures. $60M+ total penalties.', significance: 'Led to transfer of satellite export jurisdiction from Commerce to State Department.', outcome: '$14M (Loral) + $32M (Hughes) in penalties. Changed satellite export control framework.' },
    { id: 'lp-4', title: 'BIS/DDTC v. Aeroflex - Rad-Hard Electronics Export', type: 'export_control', parties: 'BIS / DDTC v. Aeroflex Incorporated', status: 'resolved', year: 2020, jurisdiction: 'BIS / DDTC', description: 'Aeroflex settled for $57 million for exporting radiation-hardened microelectronics to China without licenses.', significance: 'One of largest export control settlements. Highlights sensitivity of space-grade components.', outcome: '$57 million combined settlement.' },
    { id: 'lp-5', title: 'FAA Investigation - SpaceX Starship IFT-1 Anomaly', type: 'faa_enforcement', parties: 'FAA v. SpaceX', status: 'resolved', year: 2023, jurisdiction: 'FAA', description: 'FAA mishap investigation after Starship IFT-1 broke apart during ascent on April 20, 2023. Required 63 corrective actions.', significance: 'Tested FAA approach to developmental flight test oversight.', outcome: '63 corrective measures implemented. License modified for IFT-2.' },
    { id: 'lp-6', title: 'Viasat v. FCC - Starlink Gen2 NEPA Challenge', type: 'nepa_challenge', parties: 'Viasat v. FCC / SpaceX', status: 'resolved', year: 2023, jurisdiction: 'D.C. Circuit', description: 'Viasat challenged FCC approval of Starlink Gen2 constellation. D.C. Circuit upheld FCC categorical exclusion from NEPA.', significance: 'Landmark ruling: FCC not required to conduct NEPA review for satellite licensing.', outcome: 'Petition denied. FCC authority affirmed.' },
    { id: 'lp-7', title: 'Save RGV v. FAA - Starbase Environmental Review', type: 'nepa_challenge', parties: 'Environmental Groups v. FAA', status: 'resolved', year: 2022, jurisdiction: 'D.C. District Court', description: 'Environmental groups challenged FAA environmental assessment for SpaceX Starship at Boca Chica.', significance: 'Precedent for NEPA review of commercial spaceport operations.', outcome: 'Mitigated FONSI upheld. 75+ mitigation conditions imposed.' },
    { id: 'lp-8', title: 'Boeing v. SpaceX - Crew Capsule Patent Settlement', type: 'patent_litigation', parties: 'Boeing v. SpaceX', status: 'resolved', year: 2019, jurisdiction: 'C.D. California', description: 'Boeing alleged SpaceX Crew Dragon infringed patents on thermal protection and landing systems. Settled with cross-licensing.', significance: 'Demonstrates patent tensions in commercial crew. Settlement pattern preferred.', outcome: 'Confidential settlement. Cross-licensing agreement reported.' },
    { id: 'lp-9', title: 'ITU - OneWeb v. Intelsat Coordination Dispute', type: 'itu_dispute', parties: 'OneWeb v. Intelsat', status: 'resolved', year: 2021, jurisdiction: 'ITU', description: 'Complex spectrum coordination dispute between OneWeb NGSO constellation and Intelsat GSO fleet in Ku-band.', significance: 'Key precedent for mega-constellation vs. GSO spectrum sharing.', outcome: 'Coordination agreement reached. PFD limits established.' },
    { id: 'lp-10', title: 'Planet Labs - DDTC ITAR Voluntary Disclosure', type: 'export_control', parties: 'DDTC v. Planet Labs PBC', status: 'resolved', year: 2023, jurisdiction: 'DDTC', description: 'Planet Labs disclosed ITAR violations from sharing satellite technical data with foreign nationals without licenses during rapid growth.', significance: 'Highlights export compliance challenges for fast-growing NewSpace companies.', outcome: '$2.8M penalty (partial suspension). External auditor required for 3 years.' },
    { id: 'lp-11', title: 'FAA/CAA - Virgin Orbit UK Launch Investigation', type: 'faa_enforcement', parties: 'FAA / UK CAA / Virgin Orbit', status: 'resolved', year: 2023, jurisdiction: 'FAA / UK CAA', description: 'Joint investigation of Virgin Orbit LauncherOne failure during first orbital launch from UK (Jan 2023). Fuel filter anomaly identified.', significance: 'First UK orbital launch attempt. Highlighted international regulatory coordination challenges.', outcome: 'Root cause identified. Informed UK licensing procedures. Company ceased operations.' },
    { id: 'lp-12', title: 'FCC v. Spectrum Five - Spectrum Warehousing', type: 'fcc_enforcement', parties: 'FCC v. Spectrum Five LLC', status: 'resolved', year: 2019, jurisdiction: 'FCC', description: 'FCC revoked orbital slot authorization from Spectrum Five for failing to meet construction milestones.', significance: 'Reinforced milestone enforcement for GSO orbital slots.', outcome: 'License revoked. Orbital slot returned to availability.' },
    { id: 'lp-13', title: 'EPA v. Aerojet Rocketdyne - Perchlorate Superfund', type: 'nepa_challenge', parties: 'EPA / California v. Aerojet Rocketdyne', status: 'active', year: 2020, jurisdiction: 'EPA / California', description: 'Ongoing Superfund remediation for perchlorate and TCE contamination from decades of rocket propellant testing. $1B+ estimated cleanup cost.', significance: 'Largest California Superfund site. Long-term environmental liability from space industry.', outcome: 'Ongoing. $1B+ estimated remediation over decades.' },
    { id: 'lp-14', title: 'DOJ v. NuSil Technology - Silicone Export Violations', type: 'export_control', parties: 'DOJ v. NuSil Technology LLC', status: 'resolved', year: 2021, jurisdiction: 'DOJ', description: 'NuSil settled charges for exporting controlled space-grade silicone materials without BIS licenses.', significance: 'Enforcement extending to specialized material suppliers in space supply chain.', outcome: '$4.6 million settlement. Enhanced compliance program required.' },
  ]);

  await upsertContent('compliance', 'bid-protests', [
    { id: 'bp-1', title: 'Blue Origin v. NASA (HLS)', shortTitle: 'Blue Origin v. NASA (HLS)', caseNumber: 'B-419783', forum: 'gao', outcome: 'denied', program: 'crewed', protester: 'Blue Origin Federation, LLC', awardee: 'SpaceX', agency: 'NASA', contractValue: '$2.89 billion', yearFiled: 2021, yearDecided: 2021, decisionDate: '2021-07-30', description: 'Blue Origin protested NASA sole-source HLS award to SpaceX. GAO found NASA acted within discretion due to funding constraints.', significance: 'Landmark Artemis program protest. Affirmed NASA procurement flexibility under budget constraints.', keyFindings: ['Single award reasonable given budget shortfall', 'SpaceX evaluation was consistent with solicitation', 'NASA properly considered cost realism'] },
    { id: 'bp-2', title: 'Dynetics v. NASA (HLS)', shortTitle: 'Dynetics v. NASA (HLS)', caseNumber: 'B-419783.3', forum: 'gao', outcome: 'denied', program: 'crewed', protester: 'Dynetics, Inc.', awardee: 'SpaceX', agency: 'NASA', contractValue: '$2.89 billion', yearFiled: 2021, yearDecided: 2021, decisionDate: '2021-07-30', description: 'Dynetics companion protest to Blue Origin HLS challenge. Mass margin concerns did not invalidate evaluation.', significance: 'Companion case affirming NASA technical evaluation discretion.', keyFindings: ['Technical evaluation of Dynetics proposal was reasonable', 'Negative mass margin properly considered', 'Agency discretion in technical ratings upheld'] },
    { id: 'bp-3', title: 'Blue Origin v. USA (HLS COFC)', shortTitle: 'Blue Origin v. USA (COFC)', caseNumber: '21-1695C', forum: 'cofc', outcome: 'denied', program: 'crewed', protester: 'Blue Origin Federation, LLC', awardee: 'SpaceX', agency: 'NASA', contractValue: '$2.89 billion', yearFiled: 2021, yearDecided: 2021, decisionDate: '2021-11-04', judge: 'Judge Richard Hertling', description: 'After GAO denial, Blue Origin escalated to COFC. Court upheld NASA procurement decision.', significance: 'Final adjudication of HLS challenge. Ended legal obstacles to SpaceX Starship HLS.', keyFindings: ['NASA source selection was reasonable and rational', 'Budget constraints justified single-award approach', 'Court deferred to NASA technical expertise'] },
    { id: 'bp-4', title: 'SpaceX v. USAF (EELV Block Buy)', shortTitle: 'SpaceX v. USAF (EELV)', caseNumber: '14-354C', forum: 'cofc', outcome: 'settled', program: 'defense', protester: 'SpaceX', awardee: 'United Launch Alliance', agency: 'U.S. Air Force', contractValue: '$11 billion (36 cores)', yearFiled: 2014, yearDecided: 2015, decisionDate: '2015-01-23', description: 'SpaceX challenged USAF sole-source block buy of 36 EELV cores from ULA. Settled when AF agreed to compete future launches.', significance: 'Broke ULA monopoly on national security launches. Transformed US launch industry.', keyFindings: ['Block buy reduced from 36 to 28 cores', 'Future launches opened to competition', 'Led to NSSL Phase 2 competition'] },
    { id: 'bp-5', title: 'SNC v. NASA (CCtCap)', shortTitle: 'SNC v. NASA (CCtCap)', caseNumber: 'B-410550', forum: 'gao', outcome: 'denied', program: 'crewed', protester: 'Sierra Nevada Corporation', awardee: 'Boeing / SpaceX', agency: 'NASA', contractValue: '$6.8 billion', yearFiled: 2014, yearDecided: 2015, decisionDate: '2015-01-05', description: 'Sierra Nevada protested CCtCap selection of only Boeing and SpaceX, excluding Dream Chaser.', significance: 'Key commercial crew procurement precedent. SNC later won CRS-2 cargo contract.', keyFindings: ['NASA evaluation methodology was reasonable', 'Best-value trade-off within NASA discretion', 'Minor procedural recommendations issued'] },
    { id: 'bp-6', title: 'Orbital ATK v. NASA (CRS-2)', shortTitle: 'Orbital ATK v. NASA (CRS-2)', caseNumber: '16-291C', forum: 'cofc', outcome: 'denied', program: 'iss', protester: 'Orbital ATK', awardee: 'Sierra Nevada / SpaceX', agency: 'NASA', contractValue: '$14 billion', yearFiled: 2016, yearDecided: 2016, decisionDate: '2016-04-25', description: 'Orbital ATK challenged CRS-2 ISS resupply contract evaluation.', significance: 'Upheld NASA multi-award ISS resupply strategy.', keyFindings: ['Multi-award approach was reasonable', 'Technical ratings properly supported', 'Cost evaluation upheld'] },
    { id: 'bp-7', title: 'Blue Origin v. DoD (NSSL Phase 2)', shortTitle: 'Blue Origin v. DoD (NSSL)', caseNumber: '20-1112C', forum: 'cofc', outcome: 'denied', program: 'defense', protester: 'Blue Origin', awardee: 'ULA / SpaceX', agency: 'Space Force', contractValue: '$5.3 billion', yearFiled: 2020, yearDecided: 2020, decisionDate: '2020-10-30', description: 'Blue Origin challenged NSSL Phase 2 award to ULA and SpaceX, excluding New Glenn.', significance: 'Affirmed Space Force discretion in two-provider national security launch strategy.', keyFindings: ['Two-provider strategy was reasonable', 'Technical evaluation proper', 'Blue Origin eligible for NSSL Phase 3'] },
    { id: 'bp-8', title: 'L3Harris v. SDA (Tranche 2 Tracking)', shortTitle: 'L3Harris v. SDA (Tracking)', caseNumber: 'B-421809', forum: 'gao', outcome: 'denied', program: 'defense', protester: 'L3Harris Technologies', awardee: 'Northrop Grumman', agency: 'Space Development Agency', contractValue: '$2.5 billion', yearFiled: 2023, yearDecided: 2023, decisionDate: '2023-09-18', description: 'L3Harris challenged SDA Tranche 2 Tracking Layer satellite procurement.', significance: 'Tests SDA rapid acquisition model for proliferated LEO defense constellations.', keyFindings: ['SDA evaluation upheld', 'Rapid acquisition procedures properly followed', 'Cost realism adequate'] },
    { id: 'bp-9', title: 'Raytheon v. USSF (Next-Gen OPIR)', shortTitle: 'Raytheon v. USSF (OPIR)', caseNumber: 'B-421456', forum: 'gao', outcome: 'denied', program: 'defense', protester: 'Raytheon Technologies', awardee: 'Lockheed Martin / Northrop Grumman', agency: 'U.S. Space Force', contractValue: '$4.9 billion', yearFiled: 2023, yearDecided: 2023, decisionDate: '2023-06-12', description: 'Raytheon protested Next-Gen OPIR missile warning satellite awards.', significance: 'Critical program replacing SBIRS missile warning capability.', keyFindings: ['Space Force evaluation was rational', 'Technical scoring reasonable', 'Past performance properly evaluated'] },
    { id: 'bp-10', title: 'Viasat v. FCC (Starlink Gen2)', shortTitle: 'Viasat v. FCC (Starlink)', caseNumber: '22-1337', forum: 'dc_circuit', outcome: 'denied', program: 'satellite', protester: 'Viasat, Inc.', awardee: 'SpaceX', agency: 'FCC', contractValue: 'N/A', yearFiled: 2022, yearDecided: 2023, decisionDate: '2023-08-09', description: 'Viasat challenged FCC Starlink Gen2 approval on NEPA environmental review grounds.', significance: 'Landmark: FCC not required to conduct NEPA review for satellite licensing.', keyFindings: ['FCC categorical NEPA exclusion upheld', 'Orbital debris analysis adequate', 'FCC authority to manage orbital resources affirmed'] },
    { id: 'bp-11', title: 'Firefly v. USSF (TacRS)', shortTitle: 'Firefly v. USSF (TacRS)', caseNumber: 'B-422301', forum: 'gao', outcome: 'corrective_action', program: 'defense', protester: 'Firefly Aerospace', awardee: 'Rocket Lab', agency: 'U.S. Space Force', contractValue: '$87.5 million', yearFiled: 2024, yearDecided: 2024, decisionDate: '2024-03-22', description: 'Firefly protested tactically responsive space launch award to Rocket Lab.', significance: 'Tests responsive space launch evaluation criteria.', keyFindings: ['GAO recommended corrective action', 'Technical evaluation needed clarification', 'Award modified after re-evaluation'] },
    { id: 'bp-12', title: 'Orbital ATK v. USAF (GPS III)', shortTitle: 'Orbital ATK v. USAF (GPS III)', caseNumber: 'B-413208', forum: 'gao', outcome: 'denied', program: 'defense', protester: 'Orbital ATK', awardee: 'SpaceX', agency: 'U.S. Air Force', contractValue: '$96.5 million', yearFiled: 2017, yearDecided: 2017, decisionDate: '2017-05-01', description: 'Orbital ATK protested GPS III satellite launch contract award to SpaceX Falcon 9.', significance: 'Confirmed SpaceX competitiveness for national security GPS launches.', keyFindings: ['Air Force evaluation reasonable', 'SpaceX met all requirements', 'Best-value determination supported'] },
  ]);

  await upsertContent('compliance', 'itu-filings', [
    { id: 'itu-1', networkName: 'STARLINK', administration: 'United States (FCC)', filingType: 'Art.9 Coordination', serviceBand: 'Ku/Ka/V-band', orbitType: 'NGSO', status: 'active', dateFiled: '2016-11-15', satellites: 42000, summary: 'SpaceX Starlink mega-constellation ITU coordination covering Gen1 and Gen2 systems.' },
    { id: 'itu-2', networkName: 'KUIPER', administration: 'United States (FCC)', filingType: 'Art.9 Coordination', serviceBand: 'Ka-band', orbitType: 'NGSO', status: 'active', dateFiled: '2019-04-04', satellites: 3236, summary: 'Amazon Project Kuiper constellation ITU coordination for Ka-band NGSO system.' },
    { id: 'itu-3', networkName: 'ONEWEB', administration: 'United Kingdom (Ofcom)', filingType: 'Art.9 Coordination', serviceBand: 'Ku/Ka-band', orbitType: 'NGSO', status: 'active', dateFiled: '2017-01-12', satellites: 648, summary: 'OneWeb LEO broadband constellation ITU coordination and notification filings.' },
    { id: 'itu-4', networkName: 'O3b mPOWER', administration: 'Luxembourg', filingType: 'Art.11 Notification', serviceBand: 'Ka-band', orbitType: 'MEO', status: 'active', dateFiled: '2019-06-01', satellites: 11, summary: 'SES O3b mPOWER medium Earth orbit high-throughput satellite system.' },
    { id: 'itu-5', networkName: 'GW-A59', administration: 'China', filingType: 'Art.9 Coordination', serviceBand: 'Ku/Ka/V-band', orbitType: 'NGSO', status: 'active', dateFiled: '2020-09-21', satellites: 12992, summary: 'China GW constellation (Guowang) - massive state-backed LEO broadband system.' },
    { id: 'itu-6', networkName: 'IRIS2', administration: 'European Union', filingType: 'Art.9 Coordination', serviceBand: 'Ka/Q/V-band', orbitType: 'NGSO', status: 'pending', dateFiled: '2024-01-15', satellites: 290, summary: 'EU IRIS2 sovereign connectivity constellation for government and civilian broadband.' },
    { id: 'itu-7', networkName: 'TELESAT-LEO', administration: 'Canada', filingType: 'Art.9 Coordination', serviceBand: 'Ka-band', orbitType: 'NGSO', status: 'active', dateFiled: '2018-05-20', satellites: 198, summary: 'Telesat Lightspeed LEO constellation for enterprise and government broadband.' },
    { id: 'itu-8', networkName: 'AST-5G', administration: 'United States (FCC)', filingType: 'Art.9 Coordination', serviceBand: 'V-band', orbitType: 'NGSO', status: 'active', dateFiled: '2022-10-15', satellites: 243, summary: 'AST SpaceMobile BlueBird direct-to-cellular satellite constellation.' },
  ]);

  await upsertContent('compliance', 'sec-filings', [
    { id: 'sec-1', company: 'SpaceX', ticker: 'Private', filingType: 'S-1', dateFiled: '2025-01-15', summary: 'SpaceX Starlink subsidiary IPO registration statement (speculated). Would be one of the largest tech IPOs in history.', keyMetric: '$350B+', keyMetricLabel: 'Estimated Valuation', url: 'https://www.sec.gov/' },
    { id: 'sec-2', company: 'Rocket Lab USA', ticker: 'RKLB', filingType: '10-K', dateFiled: '2025-02-28', period: 'FY 2024', summary: 'Annual report for Rocket Lab showing Electron launch cadence and Neutron development progress.', keyMetric: '$436M', keyMetricLabel: 'FY2024 Revenue', url: 'https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=RKLB' },
    { id: 'sec-3', company: 'Planet Labs PBC', ticker: 'PL', filingType: '10-K', dateFiled: '2025-03-01', period: 'FY 2025', summary: 'Planet Labs annual report covering Earth observation data business and defense contracts.', keyMetric: '$244M', keyMetricLabel: 'FY2025 Revenue', url: 'https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=PL' },
    { id: 'sec-4', company: 'AST SpaceMobile', ticker: 'ASTS', filingType: '10-K', dateFiled: '2025-03-15', period: 'FY 2024', summary: 'AST SpaceMobile annual report covering BlueBird satellite deployment and MNO partnership revenues.', keyMetric: '$12.5M', keyMetricLabel: 'FY2024 Revenue', url: 'https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=ASTS' },
    { id: 'sec-5', company: 'Iridium Communications', ticker: 'IRDM', filingType: '10-K', dateFiled: '2025-02-20', period: 'FY 2024', summary: 'Iridium annual report showing stable satellite communications revenue and Project Stardust D2D partnership.', keyMetric: '$804M', keyMetricLabel: 'FY2024 Revenue', url: 'https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=IRDM' },
    { id: 'sec-6', company: 'Viasat Inc.', ticker: 'VSAT', filingType: '10-K', dateFiled: '2025-05-30', period: 'FY 2025', summary: 'Viasat annual report covering satellite broadband operations post-Inmarsat acquisition and ViaSat-3 constellation.', keyMetric: '$4.2B', keyMetricLabel: 'FY2025 Revenue (est.)', url: 'https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=VSAT' },
    { id: 'sec-7', company: 'Spire Global', ticker: 'SPIR', filingType: '10-K', dateFiled: '2025-03-01', period: 'FY 2024', summary: 'Spire Global annual report covering space-based data analytics, maritime, aviation, and weather tracking.', keyMetric: '$118M', keyMetricLabel: 'FY2024 Revenue', url: 'https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=SPIR' },
    { id: 'sec-8', company: 'Terran Orbital', ticker: 'LLAP', filingType: '8-K', dateFiled: '2024-12-15', summary: 'Terran Orbital acquisition by Lockheed Martin completed. Satellite manufacturing consolidated under LM Space.', keyMetric: '$450M', keyMetricLabel: 'Acquisition Price', url: 'https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=LLAP' },
  ]);

  // ═══════════════════════════════════════════════════════════════════
  // 8. ASTEROID WATCH
  // ═══════════════════════════════════════════════════════════════════

  console.log('☄️ Seeding asteroid-watch...');

  await upsertContent('asteroid-watch', 'close-approaches', [
    { id: 'ca-1', name: '2024 YR4', date: '2032-12-22', distanceLD: 0.8, distanceAU: 0.0021, diameterMin: 40, diameterMax: 90, velocity: 17.2, torino: 0, palermo: -99, isPHA: true, orbitClass: 'Apollo', note: 'Was Torino 3 in Jan-Feb 2025 (peaked at 3.1% impact probability); downgraded to 0 on Feb 23, 2025 after additional observations. ~4% chance of lunar impact remains.' },
    { id: 'ca-2', name: '99942 Apophis', date: '2029-04-13', distanceLD: 0.1, distanceAU: 0.00026, diameterMin: 340, diameterMax: 340, velocity: 7.4, torino: 0, palermo: -99, isPHA: true, orbitClass: 'Aten' },
    { id: 'ca-3', name: '2025 BZ2', date: '2026-02-12', distanceLD: 3.2, distanceAU: 0.0082, diameterMin: 8, diameterMax: 18, velocity: 12.8, torino: 0, palermo: -99, isPHA: false, orbitClass: 'Apollo' },
    { id: 'ca-5', name: '2024 MK', date: '2026-02-18', distanceLD: 5.1, distanceAU: 0.013, diameterMin: 120, diameterMax: 260, velocity: 21.3, torino: 0, palermo: -99, isPHA: true, orbitClass: 'Apollo' },
    { id: 'ca-17', name: '101955 Bennu', date: '2060-09-25', distanceLD: 1.9, distanceAU: 0.005, diameterMin: 490, diameterMax: 490, velocity: 6.2, torino: 0, palermo: -99, isPHA: true, orbitClass: 'Apollo' },
    // 18 total close approaches
  ]);

  await upsertContent('asteroid-watch', 'neo-stats', [
    { totalNEOs: 35472, totalPHAs: 2397, totalNEAs: 35110, totalNECs: 132, last30DaysDiscoveries: 148, lastYearDiscoveries: 3128, largestNEA: { name: '1036 Ganymed', diameter: 41 }, closestApproach2025: { name: '2024 YR4', distance: '0.002 AU' } },
  ]);

  await upsertContent('asteroid-watch', 'size-categories', [
    { label: '1 km+', range: '>1 km diameter', known: 856, estimated: 920, completeness: 93, color: 'from-red-500 to-red-400' },
    { label: '140 m - 1 km', range: '140m to 1km', known: 10832, estimated: 25000, completeness: 43, color: 'from-orange-500 to-orange-400' },
    { label: '40 m - 140 m', range: '40m to 140m', known: 14200, estimated: 500000, completeness: 2.8, color: 'from-yellow-500 to-yellow-400' },
    { label: '10 m - 40 m', range: '10m to 40m', known: 6800, estimated: 10000000, completeness: 0.07, color: 'from-green-500 to-green-400' },
    { label: '<10 m', range: 'Less than 10m', known: 2784, estimated: 100000000, completeness: 0.003, color: 'from-blue-500 to-blue-400' },
  ]);

  await upsertContent('asteroid-watch', 'defense-programs', [
    { id: 'dart', name: 'DART (Double Asteroid Redirection Test)', agency: 'NASA', status: 'Completed - Success', description: 'First-ever planetary defense technology demonstration. Reduced Dimorphos orbital period by 33 minutes.', timeline: 'Launched Nov 2021, Impact Sep 26 2022' },
    { id: 'hera', name: 'Hera Mission', agency: 'ESA', status: 'En Route - Arriving 2026', description: 'ESA follow-up to Didymos-Dimorphos system. Launched October 7, 2024.', timeline: 'Arrival late 2026' },
    { id: 'neo-surveyor', name: 'NEO Surveyor', agency: 'NASA/JPL', status: 'In Development', description: 'Space-based infrared telescope to discover 90% of 140m+ NEOs.', timeline: 'Launch June 2028' },
    { id: 'pdco', name: 'Planetary Defense Coordination Office (PDCO)', agency: 'NASA', status: 'Active', description: 'Coordinates all NASA-funded NEO detection surveys. Annual budget ~$200M.' },
    { id: 'iawn', name: 'International Asteroid Warning Network (IAWN)', agency: 'UN-endorsed', status: 'Active', description: '40+ member organizations from 20+ countries coordinating NEO detection.' },
    { id: 'osiris-apex', name: 'OSIRIS-APEX', agency: 'NASA', status: 'En Route to Apophis', description: 'Redirected OSIRIS-REx spacecraft heading to Apophis for 2029 close approach study.', timeline: 'Arrival April 2029' },
  ]);

  await upsertContent('asteroid-watch', 'mining-targets', [
    { id: 'mt-1', name: 'Ryugu', designation: '162173', spectralType: 'Cb', diameterKm: 0.9, deltaV: 4.66, estimatedValue: '$82.76 billion', resources: ['Water', 'Carbon', 'Organic compounds'], accessibility: 'Accessible' },
    { id: 'mt-2', name: 'Bennu', designation: '101955', spectralType: 'B', diameterKm: 0.49, deltaV: 5.09, estimatedValue: '$669 million', resources: ['Water', 'Carbon', 'Organics', 'Magnetite'], accessibility: 'Accessible' },
    { id: 'mt-3', name: 'Nereus', designation: '4660', spectralType: 'Xe', diameterKm: 0.33, deltaV: 4.97, estimatedValue: '$4.71 billion', resources: ['Iron', 'Nickel', 'Cobalt', 'Platinum-group metals'], accessibility: 'Accessible' },
    { id: 'mt-8', name: '16 Psyche', designation: '16', spectralType: 'M', diameterKm: 226, deltaV: 9.4, estimatedValue: '$10 quintillion (theoretical)', resources: ['Iron', 'Nickel', 'Gold', 'Platinum'], accessibility: 'Difficult' },
    // 10 total mining targets
  ]);

  await upsertContent('asteroid-watch', 'mining-companies', [
    { name: 'AstroForge', status: 'Active', focus: 'Platinum-group metal extraction', funding: '$13M+', description: 'Developing refinery technology for in-space platinum extraction.' },
    { name: 'TransAstra', status: 'Active', focus: 'Optical mining using concentrated sunlight', funding: '$18M+', description: 'Patented optical mining technology using concentrated solar energy.' },
    { name: 'Karman+', status: 'Active', focus: 'In-space resource utilization infrastructure', funding: '$4.7M', description: 'Building orbital infrastructure for processing asteroid materials.' },
    { name: 'Origin Space', status: 'Active', focus: 'NEO mining and space resources', funding: 'Undisclosed', description: 'Chinese company that launched NEO-1 test spacecraft in 2021.' },
    { name: 'Planetary Resources', status: 'Defunct (2018)', focus: 'Asteroid prospecting and water mining', funding: '$50M+ before closure', description: 'Pioneer asteroid mining company. Assets acquired by ConsenSys.' },
    { name: 'Deep Space Industries', status: 'Acquired (2019)', focus: 'Asteroid mining and spacecraft propulsion', description: 'Acquired by Bradford Space. Technology lives on in propulsion products.' },
  ]);

  await upsertContent('asteroid-watch', 'survey-telescopes', [
    { name: 'Catalina Sky Survey (CSS)', operator: 'University of Arizona / NASA', neoDiscoveries: 14250, percentContribution: 47.2, status: 'Active' },
    { name: 'Pan-STARRS', operator: 'University of Hawaii / NASA', neoDiscoveries: 8930, percentContribution: 29.6, status: 'Active' },
    { name: 'ATLAS', operator: 'University of Hawaii / NASA', neoDiscoveries: 3840, percentContribution: 12.7, status: 'Active' },
    { name: 'Vera C. Rubin Observatory (LSST)', operator: 'NSF / DOE', neoDiscoveries: 0, percentContribution: 0, status: 'Commissioning - First Light 2025' },
    // 7 total telescopes
  ]);

  await upsertContent('asteroid-watch', 'discovery-milestones', [
    { year: 1990, cumulativeNEOs: 134, cumulativePHAs: 20, notable: 'Spaceguard Survey proposed' },
    { year: 2000, cumulativeNEOs: 1222, cumulativePHAs: 277, notable: 'LINEAR dominates discovery' },
    { year: 2010, cumulativeNEOs: 7075, cumulativePHAs: 1190, notable: 'WISE/NEOWISE launches' },
    { year: 2015, cumulativeNEOs: 13251, cumulativePHAs: 1644, notable: 'PDCO established at NASA' },
    { year: 2020, cumulativeNEOs: 24126, cumulativePHAs: 2110, notable: '2020 CD3 - second known mini-moon' },
    { year: 2022, cumulativeNEOs: 29723, cumulativePHAs: 2268, notable: 'DART impacts Dimorphos' },
    { year: 2023, cumulativeNEOs: 32417, cumulativePHAs: 2325, notable: 'OSIRIS-REx returns Bennu sample' },
    { year: 2024, cumulativeNEOs: 33950, cumulativePHAs: 2365, notable: 'Hera mission launches; NEOWISE decommissioned' },
    { year: 2025, cumulativeNEOs: 35100, cumulativePHAs: 2390, notable: 'Vera Rubin first light' },
    { year: 2026, cumulativeNEOs: 35472, cumulativePHAs: 2397, notable: 'Rubin Observatory survey operations begin' },
  ]);

  // ═══════════════════════════════════════════════════════════════════
  // 9. PATENTS
  // ═══════════════════════════════════════════════════════════════════

  console.log('📜 Seeding patents...');

  await upsertContent('patents', 'filings-by-year', [
    { year: 2015, total: 28400, us: 11200, china: 6800, europe: 5100, japan: 2900, other: 2400 },
    { year: 2016, total: 30100, us: 11800, china: 7600, europe: 5300, japan: 2800, other: 2600 },
    { year: 2017, total: 32500, us: 12400, china: 8700, europe: 5500, japan: 2700, other: 3200 },
    { year: 2018, total: 35200, us: 13100, china: 10100, europe: 5600, japan: 2800, other: 3600 },
    { year: 2019, total: 38400, us: 13800, china: 12200, europe: 5700, japan: 2700, other: 4000 },
    { year: 2020, total: 41100, us: 14200, china: 14100, europe: 5900, japan: 2600, other: 4300 },
    { year: 2021, total: 44800, us: 14900, china: 16500, europe: 6100, japan: 2700, other: 4600 },
    { year: 2022, total: 48200, us: 15600, china: 18400, europe: 6300, japan: 2800, other: 5100 },
    { year: 2023, total: 52100, us: 16200, china: 20800, europe: 6500, japan: 2900, other: 5700 },
    { year: 2024, total: 56300, us: 17100, china: 23100, europe: 6700, japan: 3000, other: 6400 },
    { year: 2025, total: 58900, us: 17600, china: 24600, europe: 6800, japan: 3100, other: 6800 },
  ]);

  await upsertContent('patents', 'patent-holders', [
    { id: 'boeing', name: 'Boeing', country: 'USA', portfolioSize: 4280, recentFilings: 620, keyAreas: ['Satellite Systems', 'Launch Vehicles', 'Space Stations', 'Autonomous Guidance'], trend: 'stable', trendPct: 2.1 },
    { id: 'lockheed', name: 'Lockheed Martin', country: 'USA', portfolioSize: 3950, recentFilings: 580, keyAreas: ['Missile Defense', 'Satellite Buses', 'Deep Space Navigation'], trend: 'up', trendPct: 5.4 },
    { id: 'spacex', name: 'SpaceX', country: 'USA', portfolioSize: 890, recentFilings: 310, keyAreas: ['Reusable Vehicles', 'Satellite Constellations', 'Propulsion'], trend: 'up', trendPct: 22.5 },
    { id: 'casc', name: 'CASC / CAST', country: 'China', portfolioSize: 5100, recentFilings: 1840, keyAreas: ['Launch Vehicles', 'Space Stations', 'BeiDou Navigation'], trend: 'up', trendPct: 28.4 },
    { id: 'nasa', name: 'NASA', country: 'USA', portfolioSize: 3600, recentFilings: 280, keyAreas: ['Propulsion', 'Life Support', 'Materials Science', 'Remote Sensing'], trend: 'stable', trendPct: 1.5 },
    // 15 total patent holders
  ]);

  await upsertContent('patents', 'tech-categories', [
    { id: 'propulsion', name: 'Propulsion Systems', totalPatents: 12400, growthRate: 7.2, acceleration: 'high' },
    { id: 'satcom', name: 'Satellite Communications', totalPatents: 14200, growthRate: 9.8, acceleration: 'high' },
    { id: 'earth-obs', name: 'Earth Observation', totalPatents: 9800, growthRate: 8.4, acceleration: 'high' },
    { id: 'debris', name: 'Debris Removal & SSA', totalPatents: 2800, growthRate: 18.5, acceleration: 'high' },
    { id: 'manufacturing', name: 'In-Space Manufacturing', totalPatents: 1900, growthRate: 22.3, acceleration: 'high' },
    { id: 'reusable', name: 'Reusable Launch Vehicles', totalPatents: 4200, growthRate: 11.6, acceleration: 'moderate' },
    { id: 'optical-comms', name: 'Optical Communications', totalPatents: 3100, growthRate: 24.7, acceleration: 'high' },
    { id: 'life-support', name: 'Life Support & Habitation', totalPatents: 3400, growthRate: 6.8, acceleration: 'moderate' },
    { id: 'isru', name: 'ISRU & Resource Utilization', totalPatents: 1600, growthRate: 19.8, acceleration: 'high' },
    { id: 'navigation', name: 'Navigation & PNT', totalPatents: 5800, growthRate: 5.1, acceleration: 'steady' },
  ]);

  await upsertContent('patents', 'nasa-patents', [
    { id: 'nasa-1', title: 'High-Performance Spaceflight Computing (HPSC)', center: 'Goddard', category: 'Computing', patentNumber: 'US 11,442,868', year: 2022, licensable: true, status: 'available' },
    { id: 'nasa-2', title: 'MOXIE - Mars Oxygen ISRU Experiment', center: 'JPL', category: 'ISRU', patentNumber: 'US 11,236,001', year: 2022, licensable: true, status: 'licensed' },
    { id: 'nasa-3', title: 'Ingenuity Mars Helicopter Rotor Blade Design', center: 'JPL', category: 'Aeronautics', patentNumber: 'US 11,305,866', year: 2022, licensable: true, status: 'available' },
    { id: 'nasa-4', title: 'Laser Communication Relay Demonstration Terminal', center: 'Goddard', category: 'Communications', patentNumber: 'US 11,588,556', year: 2023, licensable: true, status: 'available' },
    { id: 'nasa-10', title: 'Deep Space Optical Communications Photon-Counting Receiver', center: 'JPL', category: 'Communications', patentNumber: 'US 11,843,415', year: 2023, licensable: true, status: 'available' },
    { id: 'nasa-11', title: 'Kilopower Fission Reactor for Space Applications', center: 'Glenn', category: 'Power', patentNumber: 'US 11,183,311', year: 2021, licensable: false, status: 'active' },
    { id: 'nasa-12', title: 'Electrodynamic Dust Shield (EDS)', center: 'Kennedy', category: 'Materials', patentNumber: 'US 10,722,927', year: 2020, licensable: true, status: 'licensed' },
    // 12 total NASA patents
  ]);

  await upsertContent('patents', 'litigation-cases', [
    { id: 'lit-1', title: 'Blue Origin v. United States (HLS Contract Protest)', parties: 'Blue Origin v. United States / SpaceX (intervenor)', year: 2021, status: 'dismissed', category: 'Government Contract' },
    { id: 'lit-3', title: 'Viasat v. SpaceX (Starlink Interference)', parties: 'Viasat v. FCC / SpaceX', year: 2023, status: 'ongoing', category: 'Satellite Communications' },
  ]);

  await upsertContent('patents', 'geographic-distribution', [
    { country: 'United States', share: 29.9, totalPatents: 17600, trend: 'stable' },
    { country: 'China', share: 41.8, totalPatents: 24600, trend: 'up' },
    { country: 'Europe (EPO)', share: 11.5, totalPatents: 6800, trend: 'stable' },
    { country: 'Japan', share: 5.3, totalPatents: 3100, trend: 'stable' },
    { country: 'India', share: 3.2, totalPatents: 1900, trend: 'up' },
    { country: 'South Korea', share: 2.1, totalPatents: 1200, trend: 'up' },
    { country: 'Russia', share: 1.8, totalPatents: 1050, trend: 'down' },
    { country: 'Other', share: 4.4, totalPatents: 2250, trend: 'up' },
  ]);

  // ═══════════════════════════════════════════════════════════════════
  // 10. LAUNCH VEHICLES
  // ═══════════════════════════════════════════════════════════════════

  console.log('🚀 Seeding launch-vehicles...');

  await upsertContent('launch-vehicles', 'vehicles', [
    { id: 'falcon-9', name: 'Falcon 9 Block 5', manufacturer: 'SpaceX', country: 'United States', status: 'Operational', heightM: 70, payloadLeoKg: 22800, payloadGtoKg: 8300, costMillions: 67, costPerKgLeo: 2940, totalLaunches: 382, successes: 380, successRate: 99.5, consecutiveSuccesses: 310, reusable: true, engines: '9x Merlin 1D + 1x Merlin Vacuum', propellant: 'RP-1 / LOX', firstFlight: '2010-06-04', description: 'The workhorse of the global launch industry.' },
    { id: 'falcon-heavy', name: 'Falcon Heavy', manufacturer: 'SpaceX', country: 'United States', status: 'Operational', heightM: 70, payloadLeoKg: 63800, costMillions: 97, costPerKgLeo: 1520, totalLaunches: 11, successes: 11, successRate: 100, reusable: true, firstFlight: '2018-02-06', description: 'Most powerful operational rocket.' },
    { id: 'starship', name: 'Starship / Super Heavy', manufacturer: 'SpaceX', country: 'United States', status: 'In Development', heightM: 121, payloadLeoKg: 150000, costMillions: 10, costPerKgLeo: 67, totalLaunches: 7, successes: 3, successRate: 42.9, reusable: true, engines: '33x Raptor + 6x Raptor', propellant: 'CH4 / LOX', firstFlight: '2023-04-20', description: 'Largest and most powerful rocket ever flown.' },
    { id: 'electron', name: 'Electron', manufacturer: 'Rocket Lab', country: 'United States', status: 'Operational', heightM: 18, payloadLeoKg: 300, costMillions: 7.5, totalLaunches: 56, successes: 51, successRate: 91.1, firstFlight: '2017-05-25' },
    { id: 'neutron', name: 'Neutron', manufacturer: 'Rocket Lab', country: 'United States', status: 'In Development', heightM: 43, payloadLeoKg: 13000, costMillions: 50, reusable: true, firstFlight: '2025 (target)' },
    { id: 'vulcan-centaur', name: 'Vulcan Centaur', manufacturer: 'ULA', country: 'United States', status: 'Operational', heightM: 61.6, payloadLeoKg: 27200, costMillions: 110, totalLaunches: 3, successes: 3, successRate: 100, engines: '2x BE-4 + 1-2x RL-10C', firstFlight: '2024-01-08' },
    { id: 'new-glenn', name: 'New Glenn', manufacturer: 'Blue Origin', country: 'United States', status: 'Operational', heightM: 98, payloadLeoKg: 45000, costMillions: 68, totalLaunches: 2, successes: 2, reusable: true, engines: '7x BE-4 + 2x BE-3U', firstFlight: '2025-01-16' },
    { id: 'ariane-6', name: 'Ariane 6', manufacturer: 'ArianeGroup', country: 'France / ESA', status: 'Operational', heightM: 56, payloadLeoKg: 21650, costMillions: 77, totalLaunches: 2, successes: 1, firstFlight: '2024-07-09' },
    { id: 'h3', name: 'H3', manufacturer: 'JAXA / MHI', country: 'Japan', status: 'Operational', heightM: 63, payloadLeoKg: 16500, costMillions: 51, totalLaunches: 4, successes: 3, firstFlight: '2023-03-07' },
    { id: 'pslv', name: 'PSLV', manufacturer: 'ISRO', country: 'India', status: 'Operational', heightM: 44, payloadLeoKg: 3800, costMillions: 21, totalLaunches: 62, successes: 59, successRate: 95.2, firstFlight: '1993-09-20' },
    { id: 'lvm3', name: 'LVM3 (GSLV Mk III)', manufacturer: 'ISRO', country: 'India', status: 'Operational', heightM: 43.5, payloadLeoKg: 10000, costMillions: 46, totalLaunches: 8, successes: 7, firstFlight: '2017-06-05' },
    { id: 'long-march-5', name: 'Long March 5', manufacturer: 'CALT', country: 'China', status: 'Operational', heightM: 56.97, payloadLeoKg: 25000, totalLaunches: 15, successes: 13, firstFlight: '2016-11-03' },
    { id: 'long-march-5b', name: 'Long March 5B', manufacturer: 'CALT', country: 'China', status: 'Operational', heightM: 53.66, payloadLeoKg: 22000, totalLaunches: 5, successes: 5, successRate: 100, firstFlight: '2020-05-05' },
    { id: 'soyuz-2', name: 'Soyuz-2', manufacturer: 'RKTs Progress', country: 'Russia', status: 'Operational', heightM: 46.3, payloadLeoKg: 8200, totalLaunches: 130, successes: 126, successRate: 96.9, firstFlight: '2004-11-08' },
    { id: 'terran-r', name: 'Terran R', manufacturer: 'Relativity Space', country: 'United States', status: 'In Development', heightM: 66, payloadLeoKg: 23500, reusable: true, description: 'Fully 3D-printed reusable rocket.' },
    // Additional vehicles: Alpha, Kuaizhou, Atlas V, Delta IV Heavy, etc.
  ]);

  // ═══════════════════════════════════════════════════════════════════
  // 11. MARS PLANNER
  // ═══════════════════════════════════════════════════════════════════

  console.log('🔴 Seeding mars-planner...');

  await upsertContent('mars-planner', 'active-missions', [
    { name: 'Perseverance Rover', agency: 'NASA', agencyFlag: '🇺🇸', type: 'rover', arrived: 'Feb 2021', location: 'Jezero Crater', status: 'active', highlight: 'Sample collection for Mars Sample Return' },
    { name: 'Ingenuity Helicopter', agency: 'NASA', agencyFlag: '🇺🇸', type: 'helicopter', arrived: 'Deployed 2021', status: 'ended', statusDetail: 'Mission ended Jan 2024 after 72 flights', highlight: 'First powered flight on another planet' },
    { name: 'Curiosity Rover', agency: 'NASA', agencyFlag: '🇺🇸', type: 'rover', arrived: 'Aug 2012', location: 'Gale Crater', status: 'active', years: '12+', highlight: 'Discovered organic molecules' },
    { name: 'Mars Reconnaissance Orbiter', agency: 'NASA', agencyFlag: '🇺🇸', type: 'orbiter', arrived: 'Mar 2006', status: 'active', highlight: 'High-resolution imaging, data relay' },
    { name: 'MAVEN', agency: 'NASA', agencyFlag: '🇺🇸', type: 'orbiter', arrived: 'Sep 2014', status: 'active', highlight: 'Atmospheric studies' },
    { name: 'Mars Odyssey', agency: 'NASA', agencyFlag: '🇺🇸', type: 'orbiter', arrived: 'Oct 2001', status: 'active', years: '23+', highlight: 'Longest-serving Mars spacecraft' },
    { name: 'Tianwen-1 Orbiter', agency: 'CNSA', agencyFlag: '🇨🇳', type: 'orbiter', arrived: 'Feb 2021', status: 'active', highlight: 'China\'s first Mars orbiter' },
    { name: 'Zhurong Rover', agency: 'CNSA', agencyFlag: '🇨🇳', type: 'rover', arrived: 'May 2021', location: 'Utopia Planitia', status: 'dormant', highlight: 'Lost contact May 2022, hibernation mode' },
    { name: 'Mars Express', agency: 'ESA', agencyFlag: '🇪🇺', type: 'orbiter', arrived: 'Dec 2003', status: 'active', years: '20+', highlight: 'Subsurface radar, atmospheric analysis' },
    { name: 'ExoMars TGO', agency: 'ESA/Roscosmos', agencyFlag: '🇪🇺', type: 'orbiter', arrived: 'Oct 2016', status: 'active', highlight: 'Trace gas detection, data relay' },
    { name: 'Hope Probe', agency: 'UAE', agencyFlag: '🇦🇪', type: 'orbiter', arrived: 'Feb 2021', status: 'active', highlight: 'First Arab Mars mission' },
  ]);

  await upsertContent('mars-planner', 'upcoming-missions', [
    { name: 'Mars Sample Return', agency: 'NASA/ESA', agencyFlag: '🇺🇸', targetDate: '~2030s', description: 'Return Perseverance samples to Earth', budget: '~$11B (under review)' },
    { name: 'ExoMars Rosalind Franklin Rover', agency: 'ESA', agencyFlag: '🇪🇺', targetDate: 'NET 2028', description: 'First European Mars rover with 2m drill' },
    { name: 'SpaceX Starship Mars', agency: 'SpaceX', agencyFlag: '🇺🇸', targetDate: '2026 window (uncrewed)', description: 'First commercial Mars vehicle' },
    { name: 'Tianwen-2', agency: 'CNSA', agencyFlag: '🇨🇳', targetDate: '~2028', description: 'Mars sample return (via asteroid first)' },
    { name: 'Tianwen-3', agency: 'CNSA', agencyFlag: '🇨🇳', targetDate: '~2030', description: 'Dedicated Mars sample return mission' },
    { name: 'MMX - Martian Moons eXploration', agency: 'JAXA', agencyFlag: '🇯🇵', targetDate: 'NET 2026', description: 'Phobos sample return mission' },
  ]);

  await upsertContent('mars-planner', 'launch-windows', [
    { period: 'Late 2026', note: 'Hohmann transfer ~7 months' },
    { period: 'Early 2029', note: 'Next window after 2026' },
    { period: 'Mid 2031', note: 'Favorable alignment' },
    { period: 'Late 2033', note: 'Long-range planning target' },
  ]);

  await upsertContent('mars-planner', 'mars-facts', [
    { distance_sun: '227.9M km (1.52 AU)', distance_earth: '55M km (closest) to 401M km (farthest)', diameter: '6,779 km (53% of Earth)', gravity: '3.72 m/s2 (38% of Earth)', day_length: '24h 37m (sol)', year_length: '687 Earth days', atmosphere: '95% CO2, 2.6% N2, 1.9% Ar', surface_temp: '-87C to -5C (avg -63C)', moons: 'Phobos, Deimos' },
  ]);

  await upsertContent('mars-planner', 'cost-estimates', [
    { type: 'Mars Orbiter Mission', range: '$300M - $800M', icon: '🛰️' },
    { type: 'Mars Rover Mission', range: '$2B - $3B', icon: '🤖' },
    { type: 'Mars Sample Return', range: '$8B - $11B', icon: '📦' },
    { type: 'Human Mars Mission (est.)', range: '$100B - $500B', icon: '👨‍🚀' },
    { type: 'SpaceX Starship Mars (per launch)', range: '$100M - $200M', icon: '🚀' },
  ]);

  await upsertContent('mars-planner', 'commercial-opportunities', [
    { title: 'Mars Communications Relay', description: 'Deploy dedicated relay satellites for continuous Mars-Earth communication coverage.', icon: '📡', readiness: 'near-term' },
    { title: 'Mars Surface Power Systems', description: 'Nuclear fission reactors and advanced solar arrays for sustained Mars surface operations.', icon: '⚡', readiness: 'mid-term' },
    { title: 'In-Situ Resource Utilization (ISRU)', description: 'Extract water from subsurface ice, produce oxygen from CO2 atmosphere, and manufacture propellant.', icon: '⛏️', readiness: 'mid-term' },
    { title: 'Mars Habitat Construction', description: 'Deploy and maintain human habitats using local materials and prefabricated modules.', icon: '🏗️', readiness: 'long-term' },
  ]);

  await upsertContent('mars-planner', 'transfer-types', [
    { name: 'Hohmann Transfer', duration: '7-9 months', description: 'Minimum-energy trajectory using two engine burns. Most fuel-efficient but slowest option. Used by most robotic missions.' },
    { name: 'Fast Conjunction', duration: '4-6 months', description: 'Higher-energy trajectory trading fuel for shorter transit time. Preferred for crewed missions to reduce radiation exposure.' },
    { name: 'Opposition Class', duration: '14-18 months total', description: 'Short Mars stay (30-60 days) with Venus gravity assist on return. Requires a Venus flyby. Higher total mission delta-v.' },
    { name: 'Ballistic Capture', duration: '8-11 months', description: 'Uses gravitational dynamics to be captured without a large orbit insertion burn. Saves fuel but takes longer.' },
  ]);

  // ═══════════════════════════════════════════════════════════════════
  // 12. SPACEPORTS (includes communications tab data)
  // ═══════════════════════════════════════════════════════════════════

  console.log('🏗️ Seeding spaceports...');

  await upsertContent('spaceports', 'active-spaceports', [
    { id: 'ksc', name: 'Kennedy Space Center', location: 'Cape Canaveral, FL, USA', latitude: 28.5729, longitude: -80.6490, operator: 'NASA / SpaceX / ULA / Blue Origin', status: 'operational', launchesPerYear: 70, capabilities: ['orbital', 'heavy-lift', 'crewed'], description: 'America\'s primary launch site. Multiple pads including LC-39A (SpaceX), SLC-41 (ULA), LC-36 (Blue Origin), and LC-39B (SLS/Artemis).' },
    { id: 'ccsfs', name: 'Cape Canaveral Space Force Station', location: 'Cape Canaveral, FL, USA', latitude: 28.4889, longitude: -80.5778, operator: 'USSF / SpaceX / ULA', status: 'operational', capabilities: ['orbital', 'national-security'] },
    { id: 'vsfb', name: 'Vandenberg Space Force Base', location: 'Lompoc, CA, USA', latitude: 34.7420, longitude: -120.5724, operator: 'USSF / SpaceX', status: 'operational', capabilities: ['polar', 'sso'] },
    { id: 'starbase', name: 'Starbase', location: 'Boca Chica, TX, USA', latitude: 25.9972, longitude: -97.1560, operator: 'SpaceX', status: 'operational', capabilities: ['super-heavy', 'reusable'], description: 'SpaceX Starship development and launch facility.' },
    { id: 'wallops', name: 'Wallops Flight Facility', location: 'Wallops Island, VA, USA', operator: 'NASA / Rocket Lab', status: 'operational', capabilities: ['small-lift', 'medium-lift'] },
    { id: 'mahia', name: 'Rocket Lab Launch Complex 1', location: 'Mahia Peninsula, New Zealand', operator: 'Rocket Lab', status: 'operational', capabilities: ['small-lift'] },
    { id: 'kourou', name: 'Guiana Space Centre', location: 'Kourou, French Guiana', operator: 'CNES / Arianespace', status: 'operational', capabilities: ['orbital', 'heavy-lift', 'equatorial'], description: 'Europe\'s spaceport near the equator. Launches Ariane 6 and Vega-C.' },
    { id: 'jiuquan', name: 'Jiuquan Satellite Launch Center', location: 'Gansu Province, China', operator: 'CNSA', status: 'operational', capabilities: ['crewed', 'orbital'] },
    { id: 'baikonur', name: 'Baikonur Cosmodrome', location: 'Kazakhstan', operator: 'Roscosmos', status: 'operational', capabilities: ['crewed', 'heavy-lift'], description: 'World\'s first and largest spaceport.' },
    // 20+ active spaceports
  ]);

  await upsertContent('spaceports', 'emerging-spaceports', [
    { id: 'saxavord', name: 'SaxaVord Spaceport', location: 'Unst, Shetland Islands', country: 'United Kingdom', developer: 'SaxaVord UK', status: 'under-construction', targetDate: '2025', plannedVehicles: ['RFA One', 'HyImpulse SL1', 'ABL Space RS1'] },
    { id: 'sutherland', name: 'Space Hub Sutherland', location: "A'Mhoine Peninsula, Scotland", country: 'United Kingdom', developer: 'HIE / Orbex', status: 'under-construction', targetDate: '2025-2026', plannedVehicles: ['Orbex Prime'] },
    { id: 'andoya', name: 'Andoya Spaceport', location: 'Andenes, Norway', country: 'Norway', developer: 'Andoya Space', status: 'under-construction', targetDate: '2025', plannedVehicles: ['Isar Aerospace Spectrum'] },
    { id: 'spaceport-america', name: 'Spaceport America', location: 'Sierra County, NM, USA', country: 'United States', developer: 'New Mexico Spaceport Authority', status: 'operational-suborbital', targetDate: 'Operational', plannedVehicles: ['Virgin Galactic SpaceShipTwo'] },
  ]);

  await upsertContent('spaceports', 'traffic-data', [
    { siteId: 'cape-combined', siteName: 'Cape Canaveral / KSC', country: 'United States', launches2022: 45, launches2023: 72, launches2024: 72, trend: 'up', successRate: 99.2 },
    { siteId: 'jiuquan', siteName: 'Jiuquan SLC', country: 'China', launches2022: 18, launches2023: 18, launches2024: 22, trend: 'up', successRate: 94.5 },
    { siteId: 'vandenberg', siteName: 'Vandenberg SFB', country: 'United States', launches2022: 9, launches2023: 15, launches2024: 18, trend: 'up', successRate: 98.0 },
    { siteId: 'wenchang', siteName: 'Wenchang SLS', country: 'China', launches2022: 6, launches2023: 7, launches2024: 13, trend: 'up', successRate: 97.0 },
    { siteId: 'xichang', siteName: 'Xichang SLC', country: 'China', launches2022: 12, launches2023: 14, launches2024: 12, trend: 'stable', successRate: 96.5 },
    { siteId: 'mahia', siteName: 'Mahia Peninsula (LC-1)', country: 'New Zealand', launches2022: 9, launches2023: 10, launches2024: 13, trend: 'up', successRate: 92.5 },
    { siteId: 'baikonur', siteName: 'Baikonur Cosmodrome', country: 'Kazakhstan', launches2022: 12, launches2023: 11, launches2024: 10, trend: 'down', successRate: 96.0 },
    { siteId: 'starbase', siteName: 'Starbase (Boca Chica)', country: 'United States', launches2022: 0, launches2023: 2, launches2024: 6, trend: 'up', successRate: 66.7 },
    { siteId: 'kourou', siteName: 'CSG (Kourou)', country: 'France (EU)', launches2022: 5, launches2023: 3, launches2024: 3, trend: 'down', successRate: 90.0 },
    { siteId: 'sriharikota', siteName: 'SDSC SHAR', country: 'India', launches2022: 5, launches2023: 7, launches2024: 7, trend: 'up', successRate: 93.0 },
  ]);

  await upsertContent('spaceports', 'dsn-complexes', [
    { id: 'goldstone', name: 'Goldstone DSCC', location: 'Mojave Desert, CA, USA', country: 'United States', established: 1958, antennas: [{ designation: 'DSS-14', diameter: '70m', bands: ['S-band', 'X-band'] }, { designation: 'DSS-25', diameter: '34m BWG', bands: ['S/X/Ka-band'] }, { designation: 'DSS-26', diameter: '34m BWG', bands: ['S/X/Ka-band'] }] },
    { id: 'canberra', name: 'Canberra DSCC', location: 'Tidbinbilla, ACT, Australia', country: 'Australia', established: 1965, antennas: [{ designation: 'DSS-43', diameter: '70m', bands: ['S-band', 'X-band'] }, { designation: 'DSS-35', diameter: '34m BWG', bands: ['S/X/Ka-band'] }, { designation: 'DSS-36', diameter: '34m BWG', bands: ['S/X/Ka-band'] }] },
    { id: 'madrid', name: 'Madrid DSCC', location: 'Robledo de Chavela, Spain', country: 'Spain', established: 1964, antennas: [{ designation: 'DSS-63', diameter: '70m', bands: ['S-band', 'X-band'] }, { designation: 'DSS-55', diameter: '34m BWG', bands: ['S/X/Ka-band'] }, { designation: 'DSS-56', diameter: '34m BWG', bands: ['S/X/Ka/K-band'] }] },
  ]);

  await upsertContent('spaceports', 'relay-networks', [
    { id: 'tdrs', name: 'TDRSS', operator: 'NASA', constellation: '6 active satellites', orbit: 'GEO', status: 'operational', dataRate: '800 Mbps (Ka-band SA)', users: ['ISS', 'Hubble', 'Landsat', 'GPM'] },
    { id: 'sda-transport', name: 'SDA Transport Layer', operator: 'U.S. Space Force', constellation: 'Tranche 0: 28, Tranche 1: 126', orbit: 'LEO', status: 'deploying', dataRate: '10 Gbps per optical crosslink' },
    { id: 'starshield', name: 'SpaceX Starshield', operator: 'SpaceX', constellation: 'Classified (50-100+)', orbit: 'LEO', status: 'deploying', dataRate: 'Classified' },
    { id: 'edrs', name: 'EDRS (SpaceDataHighway)', operator: 'ESA / Airbus', constellation: '2 active nodes', orbit: 'GEO', status: 'operational', dataRate: '1.8 Gbps (optical ISL)' },
    { id: 'aws-ground', name: 'AWS Ground Station', operator: 'Amazon Web Services', constellation: '12 antenna locations', orbit: 'Ground-based', status: 'operational', dataRate: '800 Mbps (X-band)' },
    { id: 'azure-orbital', name: 'Azure Orbital Ground Station', operator: 'Microsoft Azure', constellation: '5+ partner sites', orbit: 'Ground-based', status: 'operational', dataRate: '1+ Gbps (Ka-band)' },
  ]);

  await upsertContent('spaceports', 'optical-systems', [
    { id: 'lcrd', name: 'LCRD', operator: 'NASA GSFC', status: 'operational', type: 'relay', maxDataRate: '1.2 Gbps', wavelength: '1550 nm', launchDate: 'December 2021' },
    { id: 'dsoc', name: 'DSOC', operator: 'NASA JPL', status: 'demonstrated', type: 'deep-space', maxDataRate: '267 Mbps', wavelength: '1550 nm', launchDate: 'October 2023' },
    { id: 'mynaric', name: 'Mynaric CONDOR Mk3', operator: 'Mynaric AG', status: 'commercial', type: 'terminal', maxDataRate: '100 Gbps', wavelength: '1550 nm' },
    { id: 'caci-sa', name: 'CACI Crossbeam', operator: 'CACI International', status: 'commercial', type: 'terminal', maxDataRate: '100+ Gbps', wavelength: '1550 nm' },
    { id: 'tesat', name: 'Tesat-Spacecom LCT', operator: 'Tesat-Spacecom (Airbus)', status: 'operational', type: 'terminal', maxDataRate: '1.8 Gbps', wavelength: '1064 nm' },
    { id: 'spacex-laser', name: 'Starlink Laser ISLs', operator: 'SpaceX', status: 'operational', type: 'terminal', maxDataRate: '~100 Gbps', wavelength: '~1550 nm' },
  ]);

  await upsertContent('spaceports', 'lunar-comms-elements', [
    { id: 'lunanet', name: 'LunaNet', agency: 'NASA', status: 'Development', description: "NASA's architecture framework for lunar communications and navigation services using DTN protocol." },
    { id: 'csns', name: 'LCRNS', agency: 'NASA / ESA', status: 'Planned', description: 'Proposed relay satellite constellation for LunaNet with S-band and Ka-band links.' },
    { id: 'moonlight', name: 'ESA Moonlight', agency: 'ESA', status: 'Development', description: "ESA's commercial lunar comms constellation — 3-5 relay satellites in ELO." },
    { id: 'artemis-comms', name: 'Artemis Direct Communications', agency: 'NASA', status: 'Operational', description: 'S-band TT&C and Ka-band via DSN for near-side lunar operations.' },
    { id: 'gateway-comms', name: 'Lunar Gateway Communications', agency: 'NASA', status: 'Development', description: 'PPE Ka-band relay capability in NRHO for Artemis surface missions.' },
  ]);

  await upsertContent('spaceports', 'ccsds-protocols', [
    { name: 'Space Packet Protocol', abbreviation: 'SPP', layer: 'Network / Transport', usedBy: ['ISS', 'Mars rovers', 'JWST', 'Artemis'] },
    { name: 'TM/TC Space Data Link Protocol', abbreviation: 'TM/TC SDLP', layer: 'Data Link', usedBy: ['All DSN missions', 'ESA ESTRACK', 'JAXA'] },
    { name: 'Proximity-1 Space Link Protocol', abbreviation: 'Prox-1', layer: 'Data Link / Physical', usedBy: ['MRO', 'Mars Odyssey', 'MAVEN'] },
    { name: 'Delay/Disruption Tolerant Networking', abbreviation: 'DTN / BP', layer: 'Overlay / Network', usedBy: ['ISS', 'LunaNet (planned)'] },
    { name: 'CCSDS File Delivery Protocol', abbreviation: 'CFDP', layer: 'Application', usedBy: ['Mars missions', 'Juno', 'New Horizons'] },
    { name: 'Space Link Extension', abbreviation: 'SLE', layer: 'Cross-Support', usedBy: ['ESA-NASA cross-support', 'JAXA-NASA'] },
  ]);

  await upsertContent('spaceports', 'frequency-allocations', [
    { band: 'UHF', range: '390-450 MHz', typicalUse: 'Proximity links, CubeSat TT&C, IoT', maxDataRate: '~256 kbps - 2 Mbps' },
    { band: 'S-band', range: '2.0-2.3 GHz', typicalUse: 'Spacecraft TT&C, deep space uplink/downlink', maxDataRate: '~2-10 Mbps' },
    { band: 'X-band', range: '8.0-8.5 GHz', typicalUse: 'Deep space downlink, EO payload data', maxDataRate: '~10-800 Mbps' },
    { band: 'Ku-band', range: '12-18 GHz', typicalUse: 'TDRS, DTH broadcasting, VSAT, Starlink', maxDataRate: '~50 Mbps - 1 Gbps' },
    { band: 'Ka-band', range: '26.5-40 GHz', typicalUse: 'High-rate deep space, HTS broadband, LCRD', maxDataRate: '~100 Mbps - 10 Gbps' },
    { band: 'Optical', range: '~200 THz (1550 nm)', typicalUse: 'LCRD, DSOC, OISL, EDRS laser links', maxDataRate: '~1 Gbps - 100 Gbps' },
  ]);

  await upsertContent('spaceports', 'latency-by-orbit', [
    { orbit: 'LEO (550 km)', oneWayLatency: '~3.6 ms', roundTrip: '~7.2 ms', example: 'Starlink, ISS' },
    { orbit: 'MEO (8,000 km)', oneWayLatency: '~27 ms', roundTrip: '~54 ms', example: 'O3b mPOWER, GPS' },
    { orbit: 'GEO (35,786 km)', oneWayLatency: '~120 ms', roundTrip: '~240 ms', example: 'TDRS, EDRS, Intelsat' },
    { orbit: 'Lunar (384,400 km)', oneWayLatency: '~1.28 s', roundTrip: '~2.56 s', example: 'Artemis, Gateway' },
    { orbit: 'Earth-Sun L2 (1.5M km)', oneWayLatency: '~5 s', roundTrip: '~10 s', example: 'JWST, Euclid' },
    { orbit: 'Mars (avg. 225M km)', oneWayLatency: '~12.5 min', roundTrip: '~25 min', example: 'Perseverance' },
    { orbit: 'Jupiter (avg. 778M km)', oneWayLatency: '~43 min', roundTrip: '~86 min', example: 'Juno, Europa Clipper' },
    { orbit: 'Voyager 1 (~24.5B km)', oneWayLatency: '~22.7 hrs', roundTrip: '~45.4 hrs', example: 'Voyager 1' },
  ]);

  await upsertContent('spaceports', 'comms-hero-stats', [
    { label: 'DSN Antennas', value: '13' },
    { label: 'Relay Satellites', value: '40+' },
    { label: 'Optical Terminals On-Orbit', value: '9,000+' },
    { label: 'Max Optical Data Rate', value: '100 Gbps' },
  ]);

  await upsertContent('spaceports', 'estrack-stations', [
    { name: 'Malargue', location: 'Argentina', diameter: '35m', bands: 'X/Ka-band', role: 'Deep space' },
    { name: 'Cebreros', location: 'Spain', diameter: '35m', bands: 'X/Ka-band', role: 'Deep space' },
    { name: 'New Norcia', location: 'Australia', diameter: '35m', bands: 'S/X/Ka-band', role: 'Deep space' },
    { name: 'Kourou', location: 'French Guiana', diameter: '15m', bands: 'S-band', role: 'Launch support, LEO' },
    { name: 'Redu', location: 'Belgium', diameter: '15m', bands: 'S/X-band', role: 'LEO operations' },
    { name: 'Kiruna', location: 'Sweden', diameter: '15m', bands: 'S/X-band', role: 'Polar LEO support' },
    { name: 'Santa Maria', location: 'Azores', diameter: '5.5m', bands: 'S-band', role: 'Launch & early orbit' },
  ]);

  // ═══════════════════════════════════════════════════════════════════
  // 13. GROUND STATIONS
  // ═══════════════════════════════════════════════════════════════════

  console.log('📡 Seeding ground-stations...');

  await upsertContent('ground-stations', 'networks', [
    { id: 'dsn', name: 'NASA Deep Space Network (DSN)', stations: '3 Complexes, 14 Antennas (34m & 70m)', bands: ['S-band', 'X-band', 'Ka-band'], coverage: 'Full deep-space (360-degree longitude)', model: 'Government', pricingModel: 'NASA-allocated mission time', targetCustomers: 'NASA missions, select international partners (ESA, JAXA)', description: 'Three complexes (Goldstone CA, Madrid Spain, Canberra Australia) spaced 120 degrees apart in longitude providing continuous coverage for interplanetary and deep space missions. Operates the largest and most sensitive scientific telecommunications system in the world.', website: 'https://eyes.nasa.gov/dsn/', highlights: ['Largest steerable antennas (70m) for deep space comms', 'Supports 30+ active missions simultaneously', 'Voyager 1 & 2 at 24B+ km still communicating', 'Ka-band upgrade program for 10x throughput'], latencyInfo: 'Light-speed delay (Mars: 4-24 min)', uptimeGuarantee: '99.5% per complex' },
    { id: 'ksat', name: 'KSAT Ground Station Network', stations: '25+ Global Sites incl. Polar', bands: ['S-band', 'X-band', 'Ka-band', 'UHF'], coverage: 'Global (LEO, MEO, GEO, Lunar)', model: 'GaaS', pricingModel: 'Per-pass or subscription', targetCustomers: 'LEO/MEO satellite operators, EO companies, government agencies', description: 'World\'s largest commercial ground station network. Headquartered in Tromso, Norway with unique polar station coverage at both Svalbard (78N) and TrollSat Antarctica. Serves 300+ satellites across 50+ customers.', website: 'https://www.ksat.no', highlights: ['Unique dual-polar coverage (Svalbard + Antarctica)', 'KSATlite for SmallSat/CubeSat operators', 'Serves 300+ satellites for 50+ customers', 'Integrated optical ground terminal development'], latencyInfo: 'Contact windows: 5-15 min per LEO pass', uptimeGuarantee: '99.5% availability SLA' },
    { id: 'aws-gs', name: 'AWS Ground Station', stations: '12 Regions Worldwide', bands: ['S-band', 'X-band', 'Ka-band'], coverage: 'Global (LEO, MEO focus)', model: 'Cloud-integrated', pricingModel: 'Pay-per-minute ($3-10/min)', targetCustomers: 'NewSpace startups, EO analytics companies, IoT constellation operators', description: 'Cloud-based ground station as a service integrated with AWS. Schedule satellite contacts, downlink data directly to S3, and process with EC2/Lambda. No infrastructure investment required.', website: 'https://aws.amazon.com/ground-station/', highlights: ['Zero CAPEX — pure OPEX model', 'Direct integration with AWS cloud services (S3, EC2)', 'Self-service scheduling via API', 'Automatic data delivery to customer VPC'], latencyInfo: 'Data in S3 within seconds of contact end', uptimeGuarantee: '99.9% (AWS SLA)' },
    { id: 'atlas-gs', name: 'Atlas Space Operations', stations: '30+ Federated Antennas', bands: ['S-band', 'X-band', 'UHF'], coverage: 'Global LEO coverage', model: 'Aggregator', pricingModel: 'Per-pass subscription', targetCustomers: 'SmallSat operators, constellation companies, government R&D', description: 'Software-defined ground station network using Freedom platform. Federates third-party antennas into a unified network with automated scheduling and data routing.', website: 'https://atlasground.com', highlights: ['Freedom platform for automated scheduling', 'Federated model aggregates partner antennas', 'ML-optimized pass scheduling', 'Open architecture and API-first design'], latencyInfo: 'Near-real-time data delivery', uptimeGuarantee: '99.0% network availability' },
    { id: 'ssc', name: 'SSC (Swedish Space Corporation)', stations: '15+ Sites (incl. Esrange)', bands: ['S-band', 'X-band', 'Ka-band'], coverage: 'Global (polar + equatorial)', model: 'GaaS', pricingModel: 'Contract-based or per-pass', targetCustomers: 'Government agencies, ESA, commercial operators', description: 'Major ground station operator with unique polar coverage from Esrange, Sweden. Operates stations on every continent. Heritage provider for ESA and European government missions.', website: 'https://sscspace.com', highlights: ['Esrange polar station — every LEO pass visible', '50+ years operational heritage', 'Supports ESA Copernicus Sentinels', 'New optical ground terminal at Esrange'], latencyInfo: '10-15 min per LEO pass at polar sites', uptimeGuarantee: '99.5% per station' },
    { id: 'leaf-space', name: 'Leaf Space', stations: '10+ Stations', bands: ['S-band', 'X-band', 'UHF'], coverage: 'Global LEO', model: 'GaaS', pricingModel: 'Per-pass ($50-300/pass)', targetCustomers: 'CubeSat/SmallSat operators, university missions, IoT constellations', description: 'Italian ground segment as a service provider focused on LEO satellite operators. Leaf Line platform provides automated scheduling, data delivery, and mission analytics for small satellite missions.', website: 'https://leaf.space', highlights: ['Most affordable commercial GaaS', 'Leaf Line cloud platform for mission management', 'API-first for constellation automation', 'Supports 100+ CubeSat/SmallSat missions'], latencyInfo: 'Data delivery within minutes', uptimeGuarantee: '98.5% availability' },
    { id: 'estrack', name: 'ESA ESTRACK Network', stations: '7 Core + Partner Stations', bands: ['S-band', 'X-band', 'Ka-band'], coverage: 'Deep-space + LEO/MEO', model: 'Government', pricingModel: 'ESA mission allocation', targetCustomers: 'ESA missions, partner agency missions', description: 'European Space Tracking network with core stations at New Norcia (Australia), Cebreros (Spain), and Malargue (Argentina) for deep space, plus Kiruna, Kourou, Redu, and Santa Maria for near-Earth tracking.', website: 'https://www.esa.int/estrack', highlights: ['35m deep space antennas at 3 sites', 'Supports all ESA planetary missions', 'Upgrading to Ka-band for higher throughput', 'Optical ground terminal development at Tenerife'], latencyInfo: 'Light-speed delay for deep space', uptimeGuarantee: '99.5% per complex' },
    { id: 'usaf-sgn', name: 'US Space Force AFSCN', stations: '16 Worldwide Sites', bands: ['S-band', 'UHF', 'Ka-band'], coverage: 'Global military satellite support', model: 'Government', pricingModel: 'DoD-allocated', targetCustomers: 'US military satellites, NRO, allied nations', description: 'Air Force Satellite Control Network supporting DOD satellite operations worldwide. Provides TT&C for GPS, SBIRS, WGS, AEHF, and other national security space systems.', website: '', highlights: ['Supports all major DoD satellite constellations', 'GPS constellation primary ground control', 'Hardened and redundant operations', 'Modernization under Enterprise Ground Services'], latencyInfo: 'Near-real-time for GEO assets', uptimeGuarantee: '99.9% mission assurance' },
  ]);

  await upsertContent('ground-stations', 'frequency-bands', [
    { name: 'S-band', range: '2-4 GHz', color: 'text-green-400', borderColor: 'border-green-500/30', useCases: ['Telemetry, Tracking & Command (TT&C)', 'CubeSat/SmallSat primary link', 'Legacy spacecraft communications'], advantages: ['Well-established, mature technology', 'Low-cost ground equipment', 'All-weather reliability'], limitations: ['Limited bandwidth (10 Mbps max)', 'Increasingly congested spectrum', 'Not suitable for high-data-rate missions'], typicalDataRate: 'Up to 10 Mbps', commonUsers: ['CubeSats', 'ISS', 'Legacy missions', 'GPS L-band adjacent'] },
    { name: 'X-band', range: '8-12 GHz', color: 'text-blue-400', borderColor: 'border-blue-500/30', useCases: ['Earth observation data downlink', 'Science mission data return', 'Deep space communications'], advantages: ['High bandwidth (up to 800 Mbps)', 'Good rain fade resistance', 'Primary EO downlink standard'], limitations: ['More expensive ground terminals', 'Requires larger antennas than S-band', 'Licensed spectrum coordination needed'], typicalDataRate: 'Up to 800 Mbps', commonUsers: ['Sentinel satellites', 'Mars orbiters', 'Military EO', 'NASA science missions'] },
    { name: 'Ka-band', range: '26.5-40 GHz', color: 'text-purple-400', borderColor: 'border-purple-500/30', useCases: ['High-throughput data downlink', 'Broadband satellite internet', 'Next-gen deep space comms'], advantages: ['Very high bandwidth (up to 3+ Gbps)', 'Smaller antenna aperture needed', 'Growing allocation availability'], limitations: ['Significant rain fade attenuation', 'Requires adaptive coding/modulation', 'Higher-cost electronics'], typicalDataRate: 'Up to 3 Gbps', commonUsers: ['Starlink (user terminals)', 'JWST', 'Inmarsat GX', 'WorldView Legion'] },
    { name: 'Ku-band', range: '12-18 GHz', color: 'text-cyan-400', borderColor: 'border-cyan-500/30', useCases: ['Direct broadcast satellite TV', 'Broadband internet service', 'VSAT enterprise networks'], advantages: ['Good balance of bandwidth and rain resilience', 'Widely deployed infrastructure', 'Moderate terminal costs'], limitations: ['Moderate rain fade', 'Congested in some regions', 'Lower capacity than Ka-band'], typicalDataRate: 'Up to 1 Gbps', commonUsers: ['Starlink', 'OneWeb', 'SES', 'DirecTV'] },
    { name: 'Optical / Laser', range: 'Near-IR (~1550 nm)', color: 'text-amber-400', borderColor: 'border-amber-500/30', useCases: ['Ultra-high-throughput downlink', 'Inter-satellite crosslinks', 'Deep space high-rate return'], advantages: ['10-100x higher data rates than RF', 'No spectrum licensing required', 'Smaller, lighter terminals'], limitations: ['Blocked by clouds and weather', 'Requires precise pointing', 'Emerging technology — limited ground terminals'], typicalDataRate: '10+ Gbps demonstrated', commonUsers: ['LCRD (NASA)', 'Starlink crosslinks', 'EDRS (ESA)', 'NFIRE'] },
  ]);

  await upsertContent('ground-stations', 'hero-stats', [
    { label: 'Commercial Networks', value: '15+', color: 'text-cyan-400' },
    { label: 'Ground Stations Worldwide', value: '500+', color: 'text-green-400' },
    { label: 'Frequency Bands', value: '5 Primary', color: 'text-purple-400' },
    { label: 'Max Deep Space Range', value: '24B+ km', color: 'text-amber-400' },
  ]);

  await upsertContent('ground-stations', 'decision-factors', [
    { title: 'Coverage & Revisit', icon: '🌍', description: 'How often and where can you contact your satellite?', details: ['Polar stations for LEO sun-synchronous orbits', 'Equatorial sites for low-inclination orbits', 'Multiple stations for continuous contact windows', 'Consider handover gaps between passes'] },
    { title: 'Data Throughput', icon: '📡', description: 'How much data can you move per pass?', details: ['S-band: 10 Mbps — adequate for TT&C and small payloads', 'X-band: 800 Mbps — standard for EO missions', 'Ka-band: 3+ Gbps — high-throughput applications', 'Optical: 10+ Gbps — emerging for data-intensive missions'] },
    { title: 'Cost Model', icon: '💰', description: 'CAPEX vs OPEX trade-offs for your mission budget.', details: ['Owned stations: High CAPEX, low marginal cost per pass', 'GaaS: Zero CAPEX, predictable per-pass pricing', 'Cloud-integrated: Pay-per-minute, scales with demand', 'Consider total cost of ownership over mission lifetime'] },
    { title: 'Integration & Latency', icon: '⚡', description: 'How quickly can data reach your processing pipeline?', details: ['Cloud-native (AWS GS): Data in S3 within seconds', 'GaaS providers: Minutes to hours for data delivery', 'On-premise: Immediate but requires local infrastructure', 'Consider API availability for automated scheduling'] },
  ]);

  // ═══════════════════════════════════════════════════════════════════
  // 14. SPACE MANUFACTURING (includes imagery tab data)
  // ═══════════════════════════════════════════════════════════════════

  console.log('🏭 Seeding space-manufacturing...');

  await upsertContent('space-manufacturing', 'companies', [
    { id: 'varda', name: 'Varda Space Industries', status: 'active', focus: 'Pharmaceutical Manufacturing', facility: 'In-orbit capsule', product: 'API crystals (Ritonavir)', description: 'Successfully returned first space-manufactured pharmaceuticals to Earth in Feb 2024.' },
    { id: 'redwire', name: 'Redwire Space', status: 'active', focus: 'ISS Manufacturing & 3D Printing', facility: 'ISS facilities', product: 'Ceramic turbine blades, bioprinted tissue', description: 'Operates multiple ISS manufacturing facilities including Made In Space heritage.' },
    { id: 'space-forge', name: 'Space Forge', status: 'active', focus: 'Semiconductor Manufacturing', facility: 'ForgeStar capsule', product: 'Advanced semiconductors', description: 'UK-based company developing returnable satellite for semiconductor manufacturing.' },
    { id: 'flawless-photonics', name: 'Flawless Photonics', status: 'active', focus: 'ZBLAN Fiber Optics', facility: 'ISS / Free-flyer', product: 'ZBLAN optical fiber', description: 'Producing ultra-pure optical fiber in microgravity with dramatically reduced defects.' },
    // 12 total companies
  ]);

  await upsertContent('space-manufacturing', 'product-categories', [
    { id: 'pharma', name: 'Pharmaceuticals', marketSize: '$2.1B projected by 2035', advantage: 'Superior crystal structure formation in microgravity', companies: ['Varda Space', 'Merck ISS experiments'] },
    { id: 'fiber', name: 'ZBLAN Fiber Optics', marketSize: '$800M projected by 2032', advantage: '100x improvement in signal loss reduction', companies: ['Flawless Photonics', 'FOMS Inc.'] },
    { id: 'bioprint', name: 'Bioprinted Organs/Tissue', marketSize: '$1.5B projected by 2035', advantage: 'Microgravity enables layered tissue printing without scaffolds', companies: ['Redwire', 'nScrypt', 'Techshot'] },
    { id: 'semiconductors', name: 'Advanced Semiconductors', marketSize: '$500M projected by 2035', advantage: 'Reduced crystal defects in microgravity-grown wafers', companies: ['Space Forge', 'Northrop Grumman'] },
    { id: 'metals', name: 'Advanced Alloys & Metals', marketSize: '$300M projected by 2035', advantage: 'Novel alloys impossible under gravity constraints', companies: ['Made In Space / Redwire', 'Techshot'] },
    { id: 'construction', name: '3D Printed Structures', marketSize: '$1.2B projected by 2035', advantage: 'Large-scale construction in orbit and on lunar surface', companies: ['ICON', 'AI SpaceFactory', 'Relativity Space'] },
  ]);

  await upsertContent('space-manufacturing', 'market-projections', [
    { year: 2024, value: 0.3, segment: 'ISS Research' },
    { year: 2026, value: 1.2, segment: 'Early Commercial' },
    { year: 2028, value: 3.5, segment: 'Commercial Stations' },
    { year: 2030, value: 8.0, segment: 'Multi-Station Era' },
    { year: 2032, value: 15.0, segment: 'Scaled Production' },
    { year: 2035, value: 35.0, segment: 'Industrial Space' },
  ]);

  await upsertContent('space-manufacturing', 'img-providers', [
    { id: 'maxar', name: 'Maxar Technologies', constellation: 'WorldView Legion', resolution: '30 cm', coverage: 'Global', status: 'active', description: 'Industry-leading very-high-resolution optical imagery.' },
    { id: 'planet', name: 'Planet Labs', constellation: 'PlanetScope / SkySat', resolution: '3-5 m (PlanetScope) / 50 cm (SkySat)', coverage: 'Daily global', status: 'active', description: '200+ satellites providing daily whole-Earth imagery.' },
    { id: 'airbus-ds', name: 'Airbus Defence & Space', constellation: 'Pleiades Neo / SPOT', resolution: '30 cm', coverage: 'Global', status: 'active' },
    { id: 'capella', name: 'Capella Space', constellation: 'Capella SAR', resolution: '50 cm SAR', coverage: 'Global, all-weather', status: 'active', description: 'Commercial SAR constellation providing day/night, all-weather imaging.' },
    { id: 'iceye', name: 'ICEYE', constellation: 'ICEYE SAR', resolution: '25 cm SAR', coverage: 'Global, all-weather', status: 'active' },
    { id: 'blacksky', name: 'BlackSky', constellation: 'BlackSky Gen-3', resolution: '50 cm', coverage: 'Persistent monitoring', status: 'active' },
    // 14 total providers
  ]);

  await upsertContent('space-manufacturing', 'img-use-cases', [
    { name: 'Agriculture & Food Security', description: 'Crop monitoring, yield prediction, precision agriculture', growthRate: 12 },
    { name: 'Defense & Intelligence', description: 'ISR, change detection, targeting', growthRate: 8 },
    { name: 'Insurance & Finance', description: 'Catastrophe assessment, supply chain monitoring, ESG', growthRate: 18 },
    { name: 'Climate & Environment', description: 'Deforestation, methane detection, ice monitoring', growthRate: 15 },
    { name: 'Maritime & Shipping', description: 'Vessel tracking, port monitoring, illegal fishing detection', growthRate: 14 },
    { name: 'Urban Planning', description: 'Infrastructure monitoring, construction progress, 3D mapping', growthRate: 10 },
    { name: 'Energy & Mining', description: 'Pipeline monitoring, resource exploration, emissions tracking', growthRate: 16 },
    { name: 'Disaster Response', description: 'Flood mapping, wildfire monitoring, earthquake assessment', growthRate: 11 },
  ]);

  // ═══════════════════════════════════════════════════════════════════
  // 15. SATELLITES (from API route)
  // ═══════════════════════════════════════════════════════════════════

  console.log('🛰️ Seeding satellites...');

  await upsertContent('constellations', 'satellites', [
    { id: 'iss-zarya', name: 'International Space Station (ISS)', noradId: '25544', orbitType: 'LEO', altitude: 420, operator: 'NASA/Roscosmos/ESA/JAXA/CSA', country: 'International', status: 'active', purpose: 'Space Station', mass: 420000 },
    { id: 'tiangong', name: 'Tiangong Space Station', noradId: '48274', orbitType: 'LEO', altitude: 390, operator: 'CNSA', country: 'China', status: 'active', purpose: 'Space Station', mass: 100000 },
    { id: 'starlink-5001', name: 'Starlink-5001', noradId: '55001', orbitType: 'LEO', altitude: 540, operator: 'SpaceX', country: 'USA', status: 'active', purpose: 'Communications', mass: 800 },
    { id: 'gps-iii-sv01', name: 'GPS III SV01 (USA-289)', noradId: '43873', orbitType: 'MEO', altitude: 20200, operator: 'US Space Force', country: 'USA', status: 'active', purpose: 'Navigation', mass: 3880 },
    { id: 'goes-16', name: 'GOES-16 (GOES-East)', noradId: '41866', orbitType: 'GEO', altitude: 35786, operator: 'NOAA', country: 'USA', status: 'active', purpose: 'Weather', mass: 5192 },
    { id: 'landsat-9', name: 'Landsat 9', noradId: '49260', orbitType: 'SSO', altitude: 705, operator: 'NASA/USGS', country: 'USA', status: 'active', purpose: 'Earth Observation', mass: 2864 },
    { id: 'jwst', name: 'James Webb Space Telescope', noradId: '50463', orbitType: 'HEO', altitude: 1500000, operator: 'NASA/ESA/CSA', country: 'USA', status: 'active', purpose: 'Research', mass: 6500 },
    { id: 'hubble', name: 'Hubble Space Telescope', noradId: '20580', orbitType: 'LEO', altitude: 540, operator: 'NASA/ESA', country: 'USA', status: 'active', purpose: 'Research', mass: 11110 },
    // 30+ representative satellites
  ]);

  // ═══════════════════════════════════════════════════════════════════
  // 16. SPACE TOURISM
  // ═══════════════════════════════════════════════════════════════════

  console.log('🎈 Seeding space-tourism...');

  await upsertContent('space-tourism', 'offerings', [
    { id: 'blue-origin-new-shepard', provider: 'Blue Origin', name: 'New Shepard', experienceType: 'suborbital', price: 450000, priceDisplay: '$450K', duration: '11 minutes', altitude: 100, altitudeDisplay: '100 km', status: 'active', logoIcon: 'BO', maxPassengers: 6, trainingDuration: '1 day', launchSite: 'West Texas, USA', vehicleName: 'New Shepard', firstFlight: '2021', websiteUrl: 'https://www.blueorigin.com', description: 'Experience the overview effect with Blue Origin\'s New Shepard rocket. Fully autonomous capsule with the largest windows in spaceflight history.', features: ['Largest windows in spaceflight history', 'Fully autonomous — no pilot needed', '3+ minutes of weightlessness', 'Crew capsule lands under parachutes'], requirements: ['Must be 18+ years old', 'Able to climb launch tower (7 flights of stairs)', 'Height: 5\'0" to 6\'4"', 'Weight: 110-223 lbs'] },
    { id: 'virgin-galactic', provider: 'Virgin Galactic', name: 'VSS Unity', experienceType: 'suborbital', price: 450000, priceDisplay: '$450K', duration: '90 minutes', altitude: 80, altitudeDisplay: '80 km', status: 'active', logoIcon: 'VG', maxPassengers: 6, trainingDuration: '3-4 days', launchSite: 'Spaceport America, New Mexico', vehicleName: 'VSS Unity', firstFlight: '2021', websiteUrl: 'https://www.virgingalactic.com', description: 'Air-launched spaceplane providing a unique piloted spaceflight experience with runway landing.', features: ['Piloted spaceplane experience', 'Air-launch from carrier aircraft', 'Runway landing — airplane-style return', 'Large cabin with 17 windows'], requirements: ['Multi-day training program at Spaceport America', 'Moderate physical fitness', 'Medical screening required', 'Minimum age 18'] },
    { id: 'spacex-inspiration4', provider: 'SpaceX', name: 'Crew Dragon Orbital', experienceType: 'orbital', price: 55000000, priceDisplay: '$55M', duration: 'Multi-day (3-5 days)', altitude: 575, altitudeDisplay: '575 km', status: 'active', logoIcon: 'SX', maxPassengers: 4, trainingDuration: '4-6 months', launchSite: 'Kennedy Space Center, Florida', vehicleName: 'Falcon 9 / Crew Dragon', firstFlight: '2021', websiteUrl: 'https://www.spacex.com', description: 'Full orbital spaceflight aboard SpaceX Crew Dragon. Multi-day missions to low Earth orbit with cupola dome for 360-degree views.', features: ['True orbital spaceflight (not suborbital)', 'Multi-day mission duration', 'Cupola dome window for 360° views', 'Proven human-rated vehicle (NASA crew missions)'], requirements: ['4-6 months of astronaut training', 'Comprehensive medical evaluation', 'Physical fitness requirements', 'Centrifuge and simulator training'] },
    { id: 'axiom-space-station', provider: 'Axiom Space', name: 'ISS Mission', experienceType: 'station', price: 55000000, priceDisplay: '$55M+', duration: '10 days', altitude: 420, altitudeDisplay: '420 km (ISS orbit)', status: 'active', logoIcon: 'AX', maxPassengers: 4, trainingDuration: '15+ weeks', launchSite: 'Kennedy Space Center, Florida', vehicleName: 'SpaceX Crew Dragon', firstFlight: '2022', websiteUrl: 'https://www.axiomspace.com', description: 'Private astronaut missions to the International Space Station. Includes crew training, launch, 10-day ISS stay, and return.', features: ['Live and work aboard the ISS', '10 days in orbit', 'Conduct microgravity research', 'Full astronaut training program'], requirements: ['15+ weeks of training at NASA JSC and SpaceX', 'Medical certification (NASA Class III)', 'English language proficiency', 'Valid passport'] },
    { id: 'spacex-dear-moon', provider: 'SpaceX', name: 'dearMoon Lunar Flyby', experienceType: 'lunar', price: null, priceDisplay: 'N/A', duration: '~6 days', altitude: null, altitudeDisplay: '384,400 km (Moon distance)', status: 'future', logoIcon: 'SX', maxPassengers: 8, trainingDuration: 'TBD', launchSite: 'Boca Chica, Texas', vehicleName: 'Starship', firstFlight: null, websiteUrl: 'https://www.spacex.com/vehicles/starship/', description: 'Original dearMoon mission cancelled June 2024. Lunar tourism via Starship remains a long-term SpaceX goal pending vehicle readiness.', features: ['Lunar flyby trajectory', 'Views of the far side of the Moon', 'Largest crewed spacecraft ever built', 'Free-return trajectory (no lunar orbit insertion)'], requirements: ['Extended astronaut training program', 'Full medical clearance', 'Requirements TBD pending Starship readiness'] },
    { id: 'space-perspective-balloon', provider: 'Space Perspective', name: 'Spaceship Neptune', experienceType: 'balloon', price: 125000, priceDisplay: '$125K', duration: '6 hours', altitude: 30, altitudeDisplay: '30 km', status: 'upcoming', logoIcon: 'SP', maxPassengers: 8, trainingDuration: 'Pre-flight briefing only', launchSite: 'Space Coast, Florida', vehicleName: 'Spaceship Neptune', firstFlight: null, websiteUrl: 'https://spaceperspective.com', description: 'Gentle balloon ascent to the stratosphere in a pressurized capsule. No rockets, no G-forces. 360-degree panoramic views of Earth\'s curvature.', features: ['Zero G-force — gentle 2-hour ascent', '360° panoramic windows', 'Refreshment bar and Wi-Fi onboard', 'Splashdown ocean recovery'], requirements: ['No physical fitness requirements', 'Accessible to most abilities', 'Minimum age requirements apply', 'Pre-flight briefing only — no training'] },
  ]);

  // ═══════════════════════════════════════════════════════════════════
  // 17. SUPPLY CHAIN
  // ═══════════════════════════════════════════════════════════════════

  console.log('🔗 Seeding supply-chain...');

  await upsertContent('supply-chain', 'companies', [
    // Prime Contractors
    { id: 'spacex', slug: 'spacex', name: 'SpaceX', tier: 'prime', country: 'United States', countryCode: 'USA', products: ['launch_vehicles', 'spacecraft', 'satellites', 'propulsion'], customers: ['nasa', 'dod', 'commercial'], suppliers: ['aerojet-rocketdyne', 'moog', 'honeywell', 'te-connectivity'], criticality: 'high', headquarters: 'Hawthorne, CA', employeeCount: 13000 },
    { id: 'boeing', slug: 'boeing', name: 'Boeing Defense, Space & Security', tier: 'prime', country: 'United States', countryCode: 'USA', products: ['spacecraft', 'satellites', 'launch_vehicles', 'space_station_modules'], customers: ['nasa', 'dod', 'commercial'], suppliers: ['aerojet-rocketdyne', 'l3harris', 'ball-aerospace', 'honeywell'], criticality: 'high', headquarters: 'Arlington, VA', employeeCount: 140000 },
    { id: 'lockheed-martin', slug: 'lockheed-martin', name: 'Lockheed Martin Space', tier: 'prime', country: 'United States', countryCode: 'USA', products: ['spacecraft', 'satellites', 'missiles', 'space_systems'], customers: ['nasa', 'dod', 'nro'], suppliers: ['aerojet-rocketdyne', 'l3harris', 'northrop-grumman', 'honeywell'], criticality: 'high', headquarters: 'Bethesda, MD', employeeCount: 116000 },
    { id: 'northrop-grumman', slug: 'northrop-grumman', name: 'Northrop Grumman Space Systems', tier: 'prime', country: 'United States', countryCode: 'USA', products: ['satellites', 'launch_vehicles', 'propulsion', 'space_logistics'], customers: ['nasa', 'dod', 'commercial'], suppliers: ['aerojet-rocketdyne', 'l3harris', 'honeywell'], criticality: 'high', headquarters: 'Falls Church, VA', employeeCount: 90000 },
    { id: 'airbus-defence-space', slug: 'airbus-defence-space', name: 'Airbus Defence and Space', tier: 'prime', country: 'Europe', countryCode: 'EUR', products: ['satellites', 'launch_vehicles', 'space_systems'], customers: ['esa', 'eumetsat', 'commercial'], suppliers: ['safran', 'thales', 'ariane-group'], criticality: 'high', headquarters: 'Toulouse, France', employeeCount: 35000 },
    { id: 'rocket-lab', slug: 'rocket-lab', name: 'Rocket Lab', tier: 'prime', country: 'United States', countryCode: 'USA', products: ['launch_vehicles', 'spacecraft', 'space_systems'], customers: ['nasa', 'dod', 'commercial'], suppliers: ['rutherford-internal', 'composite-materials'], criticality: 'medium', headquarters: 'Long Beach, CA', employeeCount: 1800 },
    // Tier 1 Suppliers
    { id: 'aerojet-rocketdyne', slug: 'aerojet-rocketdyne', name: 'Aerojet Rocketdyne', tier: 'tier1', country: 'United States', countryCode: 'USA', products: ['rocket_engines', 'propulsion_systems', 'thrusters'], customers: ['spacex', 'boeing', 'lockheed-martin', 'northrop-grumman'], suppliers: ['specialty-metals-corp', 'honeywell'], criticality: 'high', headquarters: 'El Segundo, CA', employeeCount: 5000 },
    { id: 'l3harris', slug: 'l3harris', name: 'L3Harris Technologies', tier: 'tier1', country: 'United States', countryCode: 'USA', products: ['avionics', 'communication_systems', 'sensors'], customers: ['dod', 'nasa', 'boeing', 'lockheed-martin'], suppliers: ['tsmc', 'analog-devices', 'ti'], criticality: 'high', headquarters: 'Melbourne, FL', employeeCount: 50000 },
    { id: 'honeywell-aerospace', slug: 'honeywell-aerospace', name: 'Honeywell Aerospace', tier: 'tier1', country: 'United States', countryCode: 'USA', products: ['avionics', 'guidance_systems', 'sensors'], customers: ['boeing', 'lockheed-martin', 'northrop-grumman'], suppliers: ['tsmc', 'rare-earth-suppliers'], criticality: 'high', headquarters: 'Phoenix, AZ', employeeCount: 40000 },
    // Tier 3 / Critical Materials
    { id: 'mp-materials', slug: 'mp-materials', name: 'MP Materials', tier: 'tier3', country: 'United States', countryCode: 'USA', products: ['rare_earth_elements'], customers: ['honeywell-aerospace', 'general-motors', 'defense-primes'], suppliers: [], criticality: 'high', description: 'Only US rare earth mine and processor', headquarters: 'Las Vegas, NV', employeeCount: 500 },
    { id: 'tsmc', slug: 'tsmc', name: 'TSMC', tier: 'tier3', country: 'Taiwan', countryCode: 'TWN', products: ['semiconductors', 'advanced_nodes'], customers: ['l3harris', 'honeywell-aerospace', 'analog-devices'], suppliers: ['asml', 'applied-materials'], criticality: 'high', description: 'World leading advanced semiconductor fab', headquarters: 'Hsinchu, Taiwan', employeeCount: 65000 },
  ]);

  await upsertContent('supply-chain', 'relationships', [
    { id: 'rel-1', supplierId: 'aerojet-rocketdyne', supplierName: 'Aerojet Rocketdyne', customerId: 'spacex', customerName: 'SpaceX', products: ['thrusters', 'attitude_control'], annualValue: 50000000, geopoliticalRisk: 'none', isCritical: true },
    { id: 'rel-3', supplierId: 'aerojet-rocketdyne', supplierName: 'Aerojet Rocketdyne', customerId: 'boeing', customerName: 'Boeing', products: ['rs-25_engines', 'propulsion_systems'], annualValue: 200000000, geopoliticalRisk: 'none', isCritical: true },
    { id: 'rel-5', supplierId: 'china-northern-rare-earth', supplierName: 'China Northern Rare Earth', customerId: 'honeywell-aerospace', customerName: 'Honeywell Aerospace', products: ['rare_earth_magnets'], annualValue: 20000000, geopoliticalRisk: 'high', isCritical: true, notes: 'Critical dependency on Chinese rare earths' },
    { id: 'rel-6', supplierId: 'tsmc', supplierName: 'TSMC', customerId: 'analog-devices', customerName: 'Analog Devices', products: ['advanced_semiconductors'], annualValue: 100000000, geopoliticalRisk: 'medium', isCritical: true, notes: 'Taiwan geopolitical risk' },
    { id: 'rel-7', supplierId: 'vsmpo-avisma', supplierName: 'VSMPO-AVISMA', customerId: 'boeing', customerName: 'Boeing', products: ['titanium_forgings'], annualValue: 300000000, geopoliticalRisk: 'high', isCritical: true, notes: 'Russian titanium - seeking alternatives post-sanctions' },
    // 12 total relationships
  ]);

  await upsertContent('supply-chain', 'shortages', [
    { id: 'shortage-1', material: 'Radiation-Hardened Semiconductors', category: 'semiconductors', severity: 'critical', estimatedResolution: '2027', notes: 'Limited global capacity. Lead times 18-24 months.' },
    { id: 'shortage-2', material: 'Rare Earth Elements (Heavy)', category: 'rare_earth', severity: 'critical', estimatedResolution: '2028+', notes: 'China controls 90%+ of heavy rare earth processing.' },
    { id: 'shortage-3', material: 'Aerospace-Grade Titanium', category: 'specialty_metals', severity: 'high', estimatedResolution: '2026', notes: 'Russian sanctions impacted 30% of global supply.' },
    { id: 'shortage-4', material: 'Beryllium', category: 'specialty_metals', severity: 'high', estimatedResolution: 'Ongoing', notes: 'Single Western supplier (Materion).' },
    { id: 'shortage-5', material: 'Space-Grade Solar Cells', category: 'power', severity: 'medium', estimatedResolution: '2025', notes: 'High efficiency III-V cells in short supply.' },
    { id: 'shortage-6', material: 'Gallium', category: 'semiconductors', severity: 'high', estimatedResolution: '2027', notes: 'China controls 80%. Export restrictions announced 2023.' },
    { id: 'shortage-7', material: 'Cobalt', category: 'specialty_metals', severity: 'medium', estimatedResolution: '2026', notes: '70% from DRC with ethical concerns.' },
    { id: 'shortage-11', material: 'Germanium', category: 'sensors', severity: 'high', estimatedResolution: '2027', notes: 'China export restrictions effective Aug 2023.' },
    // 12 total shortages
  ]);

  console.log('\n✅ DynamicContent seed completed successfully!');
  console.log(`   Seeded 17 modules with ${Object.keys(FRESHNESS_POLICIES).length} freshness policies applied.`);
  console.log('   Run "npx tsx scripts/seed-dynamic-content.ts" to execute.\n');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding DynamicContent:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
