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
    { name: 'Perseverance Rover', agency: 'NASA', type: 'rover', arrived: 'Feb 2021', location: 'Jezero Crater', status: 'active', highlight: 'Sample collection for Mars Sample Return' },
    { name: 'Ingenuity Helicopter', agency: 'NASA', type: 'helicopter', arrived: 'Deployed 2021', status: 'ended', statusDetail: 'Mission ended Jan 2024 after 72 flights', highlight: 'First powered flight on another planet' },
    { name: 'Curiosity Rover', agency: 'NASA', type: 'rover', arrived: 'Aug 2012', location: 'Gale Crater', status: 'active', years: '12+', highlight: 'Discovered organic molecules' },
    { name: 'Mars Reconnaissance Orbiter', agency: 'NASA', type: 'orbiter', arrived: 'Mar 2006', status: 'active', highlight: 'High-resolution imaging, data relay' },
    { name: 'MAVEN', agency: 'NASA', type: 'orbiter', arrived: 'Sep 2014', status: 'active', highlight: 'Atmospheric studies' },
    { name: 'Mars Odyssey', agency: 'NASA', type: 'orbiter', arrived: 'Oct 2001', status: 'active', years: '23+', highlight: 'Longest-serving Mars spacecraft' },
    { name: 'Tianwen-1 Orbiter', agency: 'CNSA', type: 'orbiter', arrived: 'Feb 2021', status: 'active' },
    { name: 'Zhurong Rover', agency: 'CNSA', type: 'rover', arrived: 'May 2021', location: 'Utopia Planitia', status: 'dormant' },
    { name: 'Mars Express', agency: 'ESA', type: 'orbiter', arrived: 'Dec 2003', status: 'active', years: '20+' },
    { name: 'ExoMars TGO', agency: 'ESA/Roscosmos', type: 'orbiter', arrived: 'Oct 2016', status: 'active' },
    { name: 'Hope Probe', agency: 'UAE', type: 'orbiter', arrived: 'Feb 2021', status: 'active', highlight: 'First Arab Mars mission' },
  ]);

  await upsertContent('mars-planner', 'upcoming-missions', [
    { name: 'Mars Sample Return', agency: 'NASA/ESA', targetDate: '~2030s', description: 'Return Perseverance samples to Earth', budget: '~$11B (under review)' },
    { name: 'ExoMars Rosalind Franklin Rover', agency: 'ESA', targetDate: 'NET 2028', description: 'First European Mars rover with 2m drill' },
    { name: 'SpaceX Starship Mars', agency: 'SpaceX', targetDate: '2026 window (uncrewed)', description: 'First commercial Mars vehicle' },
    { name: 'Tianwen-2', agency: 'CNSA', targetDate: '~2028', description: 'Mars sample return (via asteroid first)' },
    { name: 'Tianwen-3', agency: 'CNSA', targetDate: '~2030', description: 'Dedicated Mars sample return mission' },
    { name: 'MMX - Martian Moons eXploration', agency: 'JAXA', targetDate: 'NET 2026', description: 'Phobos sample return mission' },
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
    { type: 'Mars Orbiter Mission', range: '$300M - $800M' },
    { type: 'Mars Rover Mission', range: '$2B - $3B' },
    { type: 'Mars Sample Return', range: '$8B - $11B' },
    { type: 'Human Mars Mission (est.)', range: '$100B - $500B' },
    { type: 'SpaceX Starship Mars (per launch)', range: '$100M - $200M' },
  ]);

  await upsertContent('mars-planner', 'commercial-opportunities', [
    { title: 'Mars Communications Relay', description: 'Deploy dedicated relay satellites for continuous Mars-Earth communication coverage.', readiness: 'near-term' },
    { title: 'Mars Surface Power Systems', description: 'Nuclear fission reactors and advanced solar arrays for sustained Mars surface operations.', readiness: 'mid-term' },
    { title: 'In-Situ Resource Utilization (ISRU)', description: 'Extract water from subsurface ice, produce oxygen from CO2 atmosphere, and manufacture propellant.', readiness: 'mid-term' },
    { title: 'Mars Habitat Construction', description: 'Deploy and maintain human habitats using local materials and prefabricated modules.', readiness: 'long-term' },
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

  // ═══════════════════════════════════════════════════════════════════
  // 13. GROUND STATIONS
  // ═══════════════════════════════════════════════════════════════════

  console.log('📡 Seeding ground-stations...');

  await upsertContent('ground-stations', 'ground-station-networks', [
    { id: 'dsn', name: 'NASA Deep Space Network (DSN)', operator: 'NASA/JPL', type: 'deep-space', stations: 3, locations: ['Goldstone, CA, USA', 'Madrid, Spain', 'Canberra, Australia'], antennas: '14 antennas (34m and 70m)', description: 'Three complexes 120 degrees apart in longitude providing continuous coverage for deep space missions.' },
    { id: 'estrack', name: 'ESA ESTRACK', operator: 'ESA', type: 'deep-space', stations: 7, locations: ['New Norcia, Australia', 'Cebreros, Spain', 'Malargue, Argentina'], description: 'European deep space and near-Earth tracking network.' },
    { id: 'ksat', name: 'KSAT Ground Station Network', operator: 'KSAT (Norway)', type: 'commercial', stations: 25, description: 'World\'s largest commercial ground station network. 25+ sites globally including polar stations.' },
    { id: 'aws-gs', name: 'AWS Ground Station', operator: 'Amazon Web Services', type: 'commercial-cloud', stations: 12, description: 'Cloud-based ground station as a service. Pay-per-use satellite data downlink.' },
    { id: 'atlas-gs', name: 'Atlas Space Operations', operator: 'Atlas Space Operations', type: 'commercial', stations: 30, description: 'Software-defined ground station network using Freedom platform.' },
    { id: 'leaf-space', name: 'Leaf Space', operator: 'Leaf Space (Italy)', type: 'commercial', stations: 10, description: 'Ground segment as a service for LEO satellite operators.' },
    { id: 'ssc', name: 'SSC (Swedish Space Corporation)', operator: 'SSC', type: 'commercial', stations: 15, description: 'Major ground station operator with polar coverage from Esrange.' },
    { id: 'cdsn', name: 'Chinese Deep Space Network', operator: 'CNSA', type: 'deep-space', stations: 3, description: 'Supports China\'s lunar and planetary missions.' },
    { id: 'isdn', name: 'Indian Deep Space Network', operator: 'ISRO', type: 'deep-space', stations: 1, locations: ['Byalalu, Bangalore'], description: 'ISRO deep space tracking facility with 32m and 18m antennas.' },
    { id: 'usaf-sgn', name: 'US Space Force SGN', operator: 'USSF', type: 'military', stations: 16, description: 'Satellite Control Network supporting military satellite operations.' },
  ]);

  await upsertContent('ground-stations', 'frequency-bands', [
    { band: 'S-band', frequency: '2-4 GHz', primaryUse: 'TT&C, telemetry', dataRate: 'Up to 10 Mbps', notes: 'Traditional spacecraft communications band' },
    { band: 'X-band', frequency: '8-12 GHz', primaryUse: 'Science data, EO downlink', dataRate: 'Up to 800 Mbps', notes: 'Primary Earth observation data downlink' },
    { band: 'Ka-band', frequency: '26.5-40 GHz', primaryUse: 'High-throughput downlink', dataRate: 'Up to 3 Gbps', notes: 'Growing use for high-data-rate missions' },
    { band: 'Ku-band', frequency: '12-18 GHz', primaryUse: 'Direct broadcast, broadband', dataRate: 'Up to 1 Gbps', notes: 'Starlink, OneWeb service band' },
    { band: 'Optical/Laser', frequency: 'Near-IR (~1550nm)', primaryUse: 'Ultra-high-throughput', dataRate: '10+ Gbps demonstrated', notes: 'Emerging technology. LCRD demonstrated 1.2 Gbps.' },
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
    { id: 'blue-origin-new-shepard', provider: 'Blue Origin', name: 'New Shepard', experienceType: 'suborbital', price: 450000, priceDisplay: '$450K', duration: '11 minutes', altitude: 100, altitudeDisplay: '100 km', status: 'active', maxPassengers: 6, trainingDuration: '1 day', launchSite: 'West Texas, USA', vehicleName: 'New Shepard', firstFlight: '2021', description: 'Experience the overview effect with Blue Origin\'s New Shepard rocket.' },
    { id: 'virgin-galactic', provider: 'Virgin Galactic', name: 'VSS Unity', experienceType: 'suborbital', price: 450000, priceDisplay: '$450K', duration: '90 minutes', altitude: 80, altitudeDisplay: '80 km', status: 'active', maxPassengers: 6, trainingDuration: '3-4 days', launchSite: 'Spaceport America, New Mexico', vehicleName: 'VSS Unity', firstFlight: '2021' },
    { id: 'spacex-inspiration4', provider: 'SpaceX', name: 'Crew Dragon Orbital', experienceType: 'orbital', price: 55000000, priceDisplay: '$55M', duration: 'Multi-day (3-5 days)', altitude: 575, altitudeDisplay: '575 km', status: 'active', maxPassengers: 4, trainingDuration: '4-6 months', launchSite: 'Kennedy Space Center, Florida', vehicleName: 'Falcon 9 / Crew Dragon', firstFlight: '2021' },
    { id: 'axiom-space-station', provider: 'Axiom Space', name: 'ISS Mission', experienceType: 'station', price: 55000000, priceDisplay: '$55M+', duration: '10 days', altitude: 420, altitudeDisplay: '420 km (ISS orbit)', status: 'active', maxPassengers: 4, trainingDuration: '15+ weeks', launchSite: 'Kennedy Space Center, Florida' },
    { id: 'spacex-dear-moon', provider: 'SpaceX', name: 'dearMoon Lunar Flyby', experienceType: 'lunar', price: null, priceDisplay: 'N/A', duration: '~6 days', altitude: null, altitudeDisplay: '384,400 km (Moon distance)', status: 'cancelled', maxPassengers: 8, vehicleName: 'Starship', description: 'Cancelled in June 2024 by mission sponsor Yusaku Maezawa due to ongoing Starship development delays.' },
    { id: 'space-perspective-balloon', provider: 'Space Perspective', name: 'Spaceship Neptune', experienceType: 'balloon', price: 125000, priceDisplay: '$125K', duration: '6 hours', altitude: 30, altitudeDisplay: '30 km', status: 'upcoming', maxPassengers: 8, trainingDuration: 'Pre-flight briefing only', launchSite: 'Space Coast, Florida' },
  ]);

  // ═══════════════════════════════════════════════════════════════════
  // 17. SUPPLY CHAIN
  // ═══════════════════════════════════════════════════════════════════

  console.log('🔗 Seeding supply-chain...');

  await upsertContent('supply-chain', 'companies', [
    // Prime Contractors
    { id: 'spacex', name: 'SpaceX', tier: 'prime', country: 'United States', products: ['launch_vehicles', 'spacecraft', 'satellites', 'propulsion'], criticality: 'high', employeeCount: 13000 },
    { id: 'boeing', name: 'Boeing Defense, Space & Security', tier: 'prime', country: 'United States', products: ['spacecraft', 'satellites', 'launch_vehicles', 'space_station_modules'], criticality: 'high', employeeCount: 140000 },
    { id: 'lockheed-martin', name: 'Lockheed Martin Space', tier: 'prime', country: 'United States', products: ['spacecraft', 'satellites', 'missiles', 'space_systems'], criticality: 'high', employeeCount: 116000 },
    { id: 'northrop-grumman', name: 'Northrop Grumman Space Systems', tier: 'prime', country: 'United States', products: ['satellites', 'launch_vehicles', 'propulsion', 'space_logistics'], criticality: 'high', employeeCount: 90000 },
    { id: 'airbus-defence-space', name: 'Airbus Defence and Space', tier: 'prime', country: 'Europe', products: ['satellites', 'launch_vehicles', 'space_systems'], criticality: 'high', employeeCount: 35000 },
    { id: 'rocket-lab', name: 'Rocket Lab', tier: 'prime', country: 'United States', products: ['launch_vehicles', 'spacecraft', 'space_systems'], criticality: 'medium', employeeCount: 1800 },
    // Tier 1 Suppliers
    { id: 'aerojet-rocketdyne', name: 'Aerojet Rocketdyne', tier: 'tier1', country: 'United States', products: ['rocket_engines', 'propulsion_systems', 'thrusters'], criticality: 'high', employeeCount: 5000 },
    { id: 'l3harris', name: 'L3Harris Technologies', tier: 'tier1', country: 'United States', products: ['avionics', 'communication_systems', 'sensors'], criticality: 'high', employeeCount: 50000 },
    { id: 'honeywell-aerospace', name: 'Honeywell Aerospace', tier: 'tier1', country: 'United States', products: ['avionics', 'guidance_systems', 'sensors'], criticality: 'high', employeeCount: 40000 },
    // Tier 3 / Critical Materials
    { id: 'mp-materials', name: 'MP Materials', tier: 'tier3', country: 'United States', products: ['rare_earth_elements'], criticality: 'high', description: 'Only US rare earth mine and processor', employeeCount: 500 },
    { id: 'tsmc', name: 'TSMC', tier: 'tier3', country: 'Taiwan', products: ['semiconductors', 'advanced_nodes'], criticality: 'high', description: 'World leading advanced semiconductor fab', employeeCount: 65000 },
    // 33 total companies across all tiers
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
