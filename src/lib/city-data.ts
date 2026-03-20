// City-specific data for local SEO landing pages

export interface SpaceCity {
  slug: string;
  name: string;
  state: string;
  title: string;
  description: string;
  heroText: string;
  stats: { label: string; value: string }[];
  keyFacilities: { name: string; type: string; description: string }[];
  majorCompanies: { name: string; slug: string; focus: string }[];
  jobMarket: { avgSalary: string; openPositions: string; topRoles: string[] };
  whyThisCity: string[];
  nearbyLaunchSites?: string[];
}

export const SPACE_CITIES: SpaceCity[] = [
  {
    slug: 'houston',
    name: 'Houston',
    state: 'Texas',
    title: 'Space Industry in Houston, TX — Companies, Jobs & Resources',
    description:
      'Houston is the heart of human spaceflight. Home to NASA Johnson Space Center, 150+ aerospace companies, and thousands of space industry jobs. Explore the Houston space ecosystem.',
    heroText:
      'Houston has been the center of human spaceflight since 1961. Home to NASA\'s Johnson Space Center, Mission Control, and a thriving commercial space ecosystem, the Greater Houston area employs more than 45,000 people in aerospace.',
    stats: [
      { label: 'Aerospace Companies', value: '150+' },
      { label: 'Space Industry Jobs', value: '45,000+' },
      { label: 'NASA Center', value: 'Johnson Space Center' },
      { label: 'Annual Economic Impact', value: '$5.2B' },
    ],
    keyFacilities: [
      { name: 'NASA Johnson Space Center', type: 'Government', description: 'Home of Mission Control, astronaut training, and the International Space Station program office' },
      { name: 'Houston Spaceport', type: 'Spaceport', description: 'FAA-licensed commercial spaceport at Ellington Airport, supporting horizontal launch operations' },
      { name: 'Axiom Space HQ', type: 'Commercial', description: 'Building the world\'s first commercial space station, headquarters in Houston' },
      { name: 'Intuitive Machines HQ', type: 'Commercial', description: 'Lunar lander company that achieved the first commercial Moon landing (IM-1) in 2024' },
      { name: 'Nanoracks / Voyager Space', type: 'Commercial', description: 'In-space services and commercial space station development (Starlab)' },
    ],
    majorCompanies: [
      { name: 'Axiom Space', slug: 'axiom-space', focus: 'Commercial space station' },
      { name: 'Intuitive Machines', slug: 'intuitive-machines', focus: 'Lunar landers and services' },
      { name: 'Nanoracks', slug: 'nanoracks', focus: 'In-space services' },
      { name: 'Jacobs Engineering', slug: 'jacobs', focus: 'NASA support services' },
      { name: 'KBR', slug: 'kbr', focus: 'Mission operations support' },
      { name: 'Boeing (Houston office)', slug: 'boeing', focus: 'Starliner, ISS operations' },
    ],
    jobMarket: {
      avgSalary: '$105,000',
      openPositions: '2,500+',
      topRoles: ['Flight Controller', 'Systems Engineer', 'Mission Operations', 'Propulsion Engineer', 'Software Engineer'],
    },
    whyThisCity: [
      'Home to NASA Johnson Space Center and Mission Control since 1961',
      'Growing commercial space hub with Axiom Space, Intuitive Machines, and 150+ companies',
      'FAA-licensed Houston Spaceport at Ellington Airport',
      'Strong university pipeline: Rice University, University of Houston, Texas A&M (nearby)',
      'Lower cost of living than other major space hubs (DC, LA, SF)',
      'No state income tax',
    ],
  },
  {
    slug: 'washington-dc',
    name: 'Washington, D.C.',
    state: 'District of Columbia',
    title: 'Space Industry in Washington, D.C. — Policy, Contracts & Companies',
    description:
      'Washington, D.C. is the policy and procurement center of the U.S. space industry. Home to NASA HQ, Space Force, FAA, and major defense contractors. Explore the D.C. space ecosystem.',
    heroText:
      'Washington, D.C. and the surrounding Northern Virginia/Maryland corridor is where space policy, procurement, and strategy converge. Home to NASA Headquarters, the U.S. Space Force, and the headquarters of most major defense contractors, the D.C. metro area is essential for anyone working in space policy or government contracting.',
    stats: [
      { label: 'Space/Defense Companies', value: '200+' },
      { label: 'Government Agencies', value: '10+' },
      { label: 'Annual Contract Value', value: '$50B+' },
      { label: 'Space Policy Organizations', value: '30+' },
    ],
    keyFacilities: [
      { name: 'NASA Headquarters', type: 'Government', description: 'Central leadership for all NASA programs, policy, and budget decisions' },
      { name: 'U.S. Space Force (Pentagon)', type: 'Government', description: 'Military branch responsible for space operations, procurement, and strategy' },
      { name: 'NASA Goddard Space Flight Center', type: 'Government', description: 'Major NASA center in Greenbelt, MD — Earth science, astrophysics, and Hubble/JWST operations' },
      { name: 'NRO Headquarters', type: 'Government', description: 'National Reconnaissance Office in Chantilly, VA — intelligence satellite programs' },
      { name: 'FAA Office of Commercial Space Transportation', type: 'Government', description: 'Regulates commercial launch and reentry operations' },
    ],
    majorCompanies: [
      { name: 'Northrop Grumman', slug: 'northrop-grumman', focus: 'Launch vehicles, satellites, defense' },
      { name: 'Lockheed Martin', slug: 'lockheed-martin', focus: 'Orion, GPS III, missile defense' },
      { name: 'L3Harris Technologies', slug: 'l3harris', focus: 'Space sensors, ground systems' },
      { name: 'Maxar Technologies', slug: 'maxar', focus: 'Earth observation, satellite buses' },
      { name: 'Leidos', slug: 'leidos', focus: 'IT services, defense space systems' },
      { name: 'SAIC', slug: 'saic', focus: 'Space engineering and integration' },
    ],
    jobMarket: {
      avgSalary: '$125,000',
      openPositions: '5,000+',
      topRoles: ['Program Manager', 'Systems Engineer', 'Policy Analyst', 'Business Development', 'Intelligence Analyst'],
    },
    whyThisCity: [
      'Proximity to NASA HQ, Space Force, NRO, and FAA decision-makers',
      'Largest concentration of space defense contractors in the world',
      'Space policy organizations: Aerospace Industries Association, Space Foundation, Satellite Industry Association',
      'Government contracting ecosystem with established primes and subcontractor networks',
      'Think tanks and research: CSIS, RAND, Aerospace Corporation',
      'Strong cleared workforce with TS/SCI access for classified programs',
    ],
  },
  {
    slug: 'los-angeles',
    name: 'Los Angeles',
    state: 'California',
    title: 'Space Industry in Los Angeles, CA — NewSpace Hub & Launch Operations',
    description:
      'Los Angeles is the birthplace of the American space industry and the epicenter of NewSpace. Home to SpaceX, Rocket Lab, and the Space Force\'s Space Systems Command.',
    heroText:
      'Los Angeles has been the center of American aerospace since the 1940s. Today, the greater LA area — from Hawthorne to El Segundo to Long Beach — is the undisputed capital of NewSpace, home to SpaceX, Rocket Lab, Virgin Orbit\'s legacy, and the Space Force\'s Space Systems Command. More rockets are designed in LA than anywhere else on Earth.',
    stats: [
      { label: 'Aerospace Companies', value: '300+' },
      { label: 'Space Industry Jobs', value: '60,000+' },
      { label: 'Launch Companies HQ', value: '10+' },
      { label: 'Military Space', value: 'Space Systems Command' },
    ],
    keyFacilities: [
      { name: 'SpaceX Headquarters', type: 'Commercial', description: 'Hawthorne, CA — world\'s most prolific rocket manufacturer, Falcon 9, Starship, Starlink' },
      { name: 'The Aerospace Corporation', type: 'FFRDC', description: 'El Segundo — federally funded R&D center supporting Space Force and NRO' },
      { name: 'Space Systems Command (SSC)', type: 'Government', description: 'Los Angeles AFB — responsible for acquiring and operating military space systems' },
      { name: 'Rocket Lab USA HQ', type: 'Commercial', description: 'Long Beach — Electron and Neutron rockets, Photon spacecraft' },
      { name: 'JPL (Jet Propulsion Laboratory)', type: 'Government', description: 'Pasadena — NASA center managed by Caltech, planetary science and Mars rovers' },
    ],
    majorCompanies: [
      { name: 'SpaceX', slug: 'spacex', focus: 'Launch services, Starlink, Starship' },
      { name: 'Rocket Lab', slug: 'rocket-lab', focus: 'Small/medium launch, spacecraft' },
      { name: 'Boeing Space (El Segundo)', slug: 'boeing', focus: 'Satellites, SLS core stage' },
      { name: 'Raytheon (El Segundo)', slug: 'raytheon', focus: 'Space sensors, missile warning' },
      { name: 'Relativity Space', slug: 'relativity-space', focus: '3D-printed rockets (Terran R)' },
      { name: 'ABL Space Systems', slug: 'abl-space', focus: 'Responsive launch (RS1)' },
    ],
    jobMarket: {
      avgSalary: '$130,000',
      openPositions: '4,500+',
      topRoles: ['Propulsion Engineer', 'Avionics Engineer', 'Manufacturing Engineer', 'Software Engineer', 'Structures Engineer'],
    },
    whyThisCity: [
      'SpaceX, Rocket Lab, Relativity, and ABL Space all headquartered in greater LA',
      'JPL — NASA\'s premier planetary science and robotics center',
      'Space Systems Command — primary military space acquisition organization',
      'The Aerospace Corporation — FFRDC supporting all national security space programs',
      'Caltech, UCLA, USC — world-class aerospace engineering programs',
      'Vandenberg Space Force Base (2.5 hours north) for polar orbit launches',
    ],
    nearbyLaunchSites: ['Vandenberg Space Force Base (Lompoc, CA)'],
  },
  {
    slug: 'colorado-springs',
    name: 'Colorado Springs',
    state: 'Colorado',
    title: 'Space Industry in Colorado Springs, CO — Military Space & Defense',
    description:
      'Colorado Springs is the military space capital of the world. Home to U.S. Space Command, NORAD, Schriever SFB, and the annual Space Symposium.',
    heroText:
      'Colorado Springs is where military space operations happen. Home to U.S. Space Command, NORAD/USNORTHCOM, Schriever Space Force Base, and Peterson Space Force Base, the region is the nerve center for America\'s space defense. The annual Space Symposium, the largest gathering of military and commercial space leaders, takes place here every April.',
    stats: [
      { label: 'Space/Defense Companies', value: '250+' },
      { label: 'Military Space Personnel', value: '25,000+' },
      { label: 'Space Symposium Attendees', value: '15,000+' },
      { label: 'Space Force Bases', value: '3' },
    ],
    keyFacilities: [
      { name: 'U.S. Space Command HQ', type: 'Government', description: 'Peterson SFB — unified combatant command for military space operations' },
      { name: 'NORAD/USNORTHCOM', type: 'Government', description: 'Cheyenne Mountain Complex — missile warning and space surveillance' },
      { name: 'Schriever Space Force Base', type: 'Government', description: 'Home of Space Operations Command — GPS, SBIRS, satellite control' },
      { name: 'Space Foundation HQ', type: 'Non-Profit', description: 'Industry association that hosts the annual Space Symposium' },
      { name: 'National Space Defense Center', type: 'Government', description: 'Combined space operations center for national defense' },
    ],
    majorCompanies: [
      { name: 'Northrop Grumman', slug: 'northrop-grumman', focus: 'Missile warning, space sensors' },
      { name: 'L3Harris Technologies', slug: 'l3harris', focus: 'Ground systems, space domain awareness' },
      { name: 'Lockheed Martin', slug: 'lockheed-martin', focus: 'GPS III, satellite systems' },
      { name: 'Raytheon', slug: 'raytheon', focus: 'Space sensors, C2 systems' },
      { name: 'Ball Aerospace', slug: 'ball-aerospace', focus: 'Instruments, smallsats (nearby Boulder)' },
      { name: 'Sierra Space', slug: 'sierra-space', focus: 'Dream Chaser spaceplane (Louisville, CO)' },
    ],
    jobMarket: {
      avgSalary: '$110,000',
      openPositions: '3,000+',
      topRoles: ['Space Operations', 'Systems Engineer', 'Cybersecurity', 'Intelligence Analyst', 'Program Manager'],
    },
    whyThisCity: [
      'U.S. Space Command and 3 Space Force bases',
      'NORAD and Cheyenne Mountain — iconic space defense facilities',
      'Annual Space Symposium — the industry\'s most important networking event',
      'Large cleared workforce with space operations experience',
      'Growing commercial space presence alongside established defense contractors',
      'CU Boulder (1 hour north) — top-5 aerospace engineering program',
    ],
  },
  {
    slug: 'cape-canaveral',
    name: 'Cape Canaveral',
    state: 'Florida',
    title: 'Space Industry on Florida\'s Space Coast — Launch Capital of the World',
    description:
      'Cape Canaveral and Florida\'s Space Coast is the launch capital of the world. Home to Kennedy Space Center, Cape Canaveral Space Force Station, and a booming commercial space ecosystem.',
    heroText:
      'Florida\'s Space Coast — stretching from Cape Canaveral to Titusville to Melbourne — is where rockets fly. Kennedy Space Center and Cape Canaveral Space Force Station host the majority of U.S. orbital launches, and the region is experiencing a renaissance as SpaceX, ULA, Blue Origin, and Relativity build and launch from the area.',
    stats: [
      { label: 'Annual Launches', value: '100+' },
      { label: 'Launch Pads', value: '10+' },
      { label: 'Space Coast Jobs', value: '30,000+' },
      { label: 'NASA Center', value: 'Kennedy Space Center' },
    ],
    keyFacilities: [
      { name: 'Kennedy Space Center', type: 'Government', description: 'NASA\'s primary launch center — Vehicle Assembly Building, LC-39A/B, multi-user spaceport' },
      { name: 'Cape Canaveral Space Force Station', type: 'Government', description: 'Military launch complex with SLC-40 (SpaceX), SLC-41 (ULA), and historic pads' },
      { name: 'SpaceX Launch Complex 39A', type: 'Commercial', description: 'SpaceX\'s primary East Coast pad for Falcon 9, Falcon Heavy, and future Starship' },
      { name: 'Blue Origin Launch Complex 36', type: 'Commercial', description: 'New Glenn launch site at Cape Canaveral' },
      { name: 'ULA SLC-41', type: 'Commercial', description: 'Atlas V and Vulcan Centaur launch pad' },
    ],
    majorCompanies: [
      { name: 'SpaceX', slug: 'spacex', focus: 'Launch operations, Starlink deployment' },
      { name: 'United Launch Alliance', slug: 'ula', focus: 'Vulcan Centaur, Atlas V' },
      { name: 'Blue Origin', slug: 'blue-origin', focus: 'New Glenn launches' },
      { name: 'L3Harris Technologies', slug: 'l3harris', focus: 'Melbourne HQ — space sensors' },
      { name: 'Northrop Grumman', slug: 'northrop-grumman', focus: 'Solid rocket motors, spacecraft' },
      { name: 'Jacobs Engineering', slug: 'jacobs', focus: 'KSC ground operations support' },
    ],
    jobMarket: {
      avgSalary: '$95,000',
      openPositions: '2,000+',
      topRoles: ['Launch Operations', 'Ground Systems Engineer', 'Test Engineer', 'Quality Engineer', 'Technician'],
    },
    whyThisCity: [
      'More orbital launches per year than any other site in the Western Hemisphere',
      'Kennedy Space Center — NASA\'s primary launch facility since Mercury',
      'SpaceX, ULA, and Blue Origin all launch from the Cape',
      'Favorable launch azimuth for equatorial and ISS-inclined orbits',
      'Florida\'s favorable tax environment (no state income tax)',
      'Growing commercial space ecosystem with SpaceX Starbase East and Relativity',
    ],
    nearbyLaunchSites: ['Kennedy Space Center LC-39A/B', 'Cape Canaveral SFS SLC-40/41', 'Blue Origin LC-36'],
  },
  {
    slug: 'huntsville',
    name: 'Huntsville',
    state: 'Alabama',
    title: 'Space Industry in Huntsville, AL — Rocket City & Defense Hub',
    description:
      'Huntsville is "Rocket City" — home to NASA Marshall Space Flight Center, Redstone Arsenal, and the largest concentration of rocket scientists in the world. 400+ aerospace companies and 40,000+ jobs.',
    heroText:
      'Huntsville, Alabama — known worldwide as "Rocket City" — has been at the heart of American rocketry since Wernher von Braun\'s team developed the Saturn V here. Home to NASA\'s Marshall Space Flight Center, the U.S. Army\'s Redstone Arsenal, and Cummings Research Park (the second-largest research park in the U.S.), Huntsville boasts 400+ aerospace and defense companies and the largest concentration of rocket scientists in the world.',
    stats: [
      { label: 'Aerospace/Defense Companies', value: '400+' },
      { label: 'Space Industry Jobs', value: '40,000+' },
      { label: 'Annual Economic Impact', value: '$8B+' },
      { label: 'NASA Center', value: 'Marshall Space Flight Center' },
    ],
    keyFacilities: [
      { name: 'NASA Marshall Space Flight Center', type: 'Government', description: 'NASA\'s propulsion center — developed Saturn V, Space Shuttle engines, and SLS. Manages major launch vehicle and science programs' },
      { name: 'Redstone Arsenal', type: 'Government', description: 'U.S. Army installation housing the Space and Missile Defense Command, Missile Defense Agency, and multiple defense organizations' },
      { name: 'Cummings Research Park', type: 'Research', description: 'Second-largest research park in the U.S. with 300+ companies and 30,000+ employees focused on defense, space, and technology' },
      { name: 'ULA Decatur Facility', type: 'Commercial', description: 'United Launch Alliance rocket manufacturing facility producing Atlas V, Delta IV, and Vulcan Centaur stages' },
      { name: 'U.S. Space & Rocket Center', type: 'Museum', description: 'World\'s largest space museum, home to Space Camp and the Davidson Center with a full Saturn V on display' },
    ],
    majorCompanies: [
      { name: 'Northrop Grumman', slug: 'northrop-grumman', focus: 'Missile defense, propulsion systems' },
      { name: 'Boeing', slug: 'boeing', focus: 'SLS core stage, defense systems' },
      { name: 'Lockheed Martin', slug: 'lockheed-martin', focus: 'Missile defense, space systems' },
      { name: 'Blue Origin', slug: 'blue-origin', focus: 'BE-4 rocket engine facility' },
      { name: 'Dynetics (Leidos)', slug: 'leidos', focus: 'Space launch systems, defense solutions' },
      { name: 'Aerojet Rocketdyne', slug: 'aerojet-rocketdyne', focus: 'RS-25 engines, propulsion systems' },
    ],
    jobMarket: {
      avgSalary: '$98,000',
      openPositions: '3,500+',
      topRoles: ['Propulsion Engineer', 'Systems Engineer', 'Missile Defense Analyst', 'Program Manager', 'Test Engineer'],
    },
    whyThisCity: [
      'Largest concentration of rocket scientists and engineers in the world',
      'NASA Marshall Space Flight Center — the birthplace of American rocketry and SLS program lead',
      'Massive defense presence with Redstone Arsenal, MDA, and Space & Missile Defense Command',
      'Blue Origin BE-4 engine production facility bringing next-gen propulsion jobs',
      'Significantly lower cost of living than other major space hubs (DC, LA, Houston)',
      'University of Alabama in Huntsville — top aerospace and defense engineering programs',
    ],
  },
  {
    slug: 'tucson',
    name: 'Tucson',
    state: 'Arizona',
    title: 'Space Industry in Tucson, AZ — Missile Defense & Planetary Science',
    description:
      'Tucson is a growing space and defense hub. Home to Raytheon Missiles & Defense (RTX), the University of Arizona\'s world-leading Lunar & Planetary Lab, and 150+ aerospace/defense companies.',
    heroText:
      'Tucson, Arizona sits at the intersection of missile defense and planetary science. Home to Raytheon Missiles & Defense (now RTX), the University of Arizona\'s world-renowned Lunar & Planetary Laboratory, Davis-Monthan Air Force Base, and innovative companies like World View and Paragon Space Development, Tucson has quietly built a formidable space and defense ecosystem with 150+ companies and proximity to military test ranges across the Southwest.',
    stats: [
      { label: 'Aerospace/Defense Companies', value: '150+' },
      { label: 'Defense & Space Jobs', value: '15,000+' },
      { label: 'Annual Defense Impact', value: '$4B+' },
      { label: 'Planetary Science Rank', value: '#1 University' },
    ],
    keyFacilities: [
      { name: 'Raytheon Missiles & Defense HQ', type: 'Commercial', description: 'RTX\'s Missiles & Defense division headquarters — one of the largest missile defense employers in the world, with 13,000+ employees in Tucson' },
      { name: 'UA Lunar & Planetary Laboratory', type: 'Research', description: 'World-leading planetary science institute — led OSIRIS-REx asteroid sample return mission, Phoenix Mars Lander, and multiple NASA instruments' },
      { name: 'UA Steward Observatory & Mirror Lab', type: 'Research', description: 'Richard F. Caris Mirror Lab produces the world\'s largest telescope mirrors, including for the Giant Magellan Telescope' },
      { name: 'Davis-Monthan Air Force Base', type: 'Government', description: 'U.S. Air Force installation supporting combat search and rescue, electronic warfare, and aerospace sustainment operations' },
      { name: 'Pima Air & Space Museum', type: 'Museum', description: 'One of the largest aerospace museums in the world with 400+ aircraft and spacecraft, adjacent to AMARG boneyard' },
    ],
    majorCompanies: [
      { name: 'Raytheon / RTX', slug: 'raytheon', focus: 'Missiles, missile defense systems, sensors' },
      { name: 'University of Arizona', slug: 'university-of-arizona', focus: 'Planetary science, optics, space instruments' },
      { name: 'Paragon Space Development', slug: 'paragon-space', focus: 'Life support, thermal control systems' },
      { name: 'World View', slug: 'world-view', focus: 'Stratospheric balloon platforms' },
      { name: 'General Dynamics', slug: 'general-dynamics', focus: 'IT services, defense electronics' },
      { name: 'Leonardo DRS', slug: 'leonardo-drs', focus: 'Infrared sensors, defense electronics' },
    ],
    jobMarket: {
      avgSalary: '$92,000',
      openPositions: '1,200+',
      topRoles: ['Missile Defense Engineer', 'Optics Scientist', 'Planetary Scientist', 'Defense Analyst', 'Systems Engineer'],
    },
    whyThisCity: [
      'Raytheon Missiles & Defense HQ — one of the world\'s largest missile defense operations with 13,000+ local employees',
      'University of Arizona Lunar & Planetary Lab — #1 ranked planetary science program, led OSIRIS-REx',
      'UA Steward Observatory Mirror Lab — producing mirrors for the next generation of giant telescopes',
      'Growing commercial space presence with World View (stratospheric platforms) and Paragon Space Development',
      'Proximity to White Sands Missile Range, Yuma Proving Ground, and other Southwest military test ranges',
      'Lower cost of living and warm climate attracting aerospace talent from higher-cost markets',
    ],
  },
  {
    slug: 'seattle',
    name: 'Seattle',
    state: 'Washington',
    title: 'Space Industry in Seattle, WA — Blue Origin, Kuiper & Tech Innovation',
    description:
      'Seattle is a rising space powerhouse. Home to Blue Origin HQ, Amazon Project Kuiper, and 200+ aerospace companies, the region combines deep tech talent with a booming commercial space ecosystem.',
    heroText:
      'Seattle and the greater Puget Sound region have a storied aerospace heritage — and are now at the forefront of commercial space. Blue Origin\'s headquarters in Kent, Amazon\'s Project Kuiper satellite constellation, and a thriving startup ecosystem including Spaceflight Industries and BlackSky have transformed the region into a major space hub. With 200+ aerospace companies, 50,000+ aerospace jobs, and an unmatched tech talent pool, Seattle is where software meets space.',
    stats: [
      { label: 'Aerospace Companies', value: '200+' },
      { label: 'Aerospace Jobs', value: '50,000+' },
      { label: 'Aerospace Economic Impact', value: '$15B+' },
      { label: 'Major Space HQs', value: 'Blue Origin, Kuiper' },
    ],
    keyFacilities: [
      { name: 'Blue Origin Headquarters', type: 'Commercial', description: 'Kent, WA — headquarters and manufacturing for New Shepard, New Glenn, and Blue Moon lunar lander programs' },
      { name: 'Amazon Project Kuiper', type: 'Commercial', description: 'Amazon\'s 3,236-satellite broadband constellation program, with offices across the Seattle metro area' },
      { name: 'Museum of Flight', type: 'Museum', description: 'One of the largest air and space museums in the world, located at Boeing Field with extensive space artifacts' },
      { name: 'UW Aerospace Engineering', type: 'Research', description: 'University of Washington\'s William E. Boeing Department of Aeronautics & Astronautics — top research and talent pipeline' },
      { name: 'Spaceflight Industries HQ', type: 'Commercial', description: 'Rideshare launch services and smallsat deployment, pioneering the launch-as-a-service model' },
    ],
    majorCompanies: [
      { name: 'Blue Origin', slug: 'blue-origin', focus: 'Launch vehicles, lunar landers, engines' },
      { name: 'Amazon / Project Kuiper', slug: 'amazon-kuiper', focus: 'Broadband satellite constellation' },
      { name: 'Spaceflight Industries', slug: 'spaceflight-industries', focus: 'Rideshare launch services' },
      { name: 'Aerojet Rocketdyne', slug: 'aerojet-rocketdyne', focus: 'Propulsion systems, AR1 engine' },
      { name: 'BlackSky', slug: 'blacksky', focus: 'Earth observation, geospatial intelligence' },
      { name: 'ZeroG Lab', slug: 'zerog-lab', focus: 'Microgravity research and services' },
    ],
    jobMarket: {
      avgSalary: '$125,000',
      openPositions: '4,000+',
      topRoles: ['Rocket Propulsion Engineer', 'Satellite Software Engineer', 'Constellation Operations', 'Aerospace Data Scientist', 'Avionics Engineer'],
    },
    whyThisCity: [
      'Blue Origin HQ in Kent — building New Glenn, Blue Moon, and the BE-4 engine powering ULA\'s Vulcan',
      'Amazon Project Kuiper bringing thousands of satellite engineering jobs to the region',
      'Massive tech talent pool from Amazon, Microsoft, Google, and Boeing creating strong cross-pollination',
      'Thriving space startup ecosystem including BlackSky, Spaceflight Industries, and others',
      'University of Washington Boeing Department of Aeronautics & Astronautics driving research and talent',
      'Strong venture capital presence and proximity to Silicon Valley investment networks',
    ],
  },
  // ─── NEW CITIES ──────────────────────────────────────────────────────
  {
    slug: 'san-francisco',
    name: 'San Francisco',
    state: 'CA',
    title: 'Space Industry in San Francisco, CA — Companies, Jobs & Resources',
    description: 'San Francisco and the Bay Area are home to Planet Labs, Astra, and a thriving space startup ecosystem. Discover space companies and jobs in San Francisco.',
    heroText: 'San Francisco\'s tech ecosystem drives innovation in Earth observation, satellite data, and space startups.',
    stats: [{ label: 'Aerospace Companies', value: '40+' }, { label: 'Space Industry Jobs', value: '3,000+' }, { label: 'Annual Economic Impact', value: '$2.8B' }],
    keyFacilities: [
      { name: 'Planet Labs HQ', type: 'Commercial', description: 'Largest Earth observation constellation — 200+ satellites imaging Earth daily' },
      { name: 'Capella Space HQ', type: 'Commercial', description: 'SAR satellite constellation for all-weather, day-night imaging' },
      { name: 'Astra HQ (Alameda)', type: 'Commercial', description: 'Small launch vehicle developer' },
    ],
    majorCompanies: [
      { name: 'Planet Labs', slug: 'planet-labs', focus: 'Earth observation constellation' },
      { name: 'Capella Space', slug: 'capella-space', focus: 'SAR imaging satellites' },
      { name: 'Astra', slug: 'astra', focus: 'Small launch vehicles' },
      { name: 'Momentus', slug: 'momentus', focus: 'In-space transportation' },
      { name: 'Spire Global', slug: 'spire-global', focus: 'Maritime and weather data' },
      { name: 'Loft Orbital', slug: 'loft-orbital', focus: 'Space infrastructure as a service' },
    ],
    jobMarket: {
      avgSalary: '$140,000',
      openPositions: '3,000+',
      topRoles: ['Satellite Software Engineer', 'Data Scientist', 'Mission Operations', 'Product Manager', 'RF Engineer'],
    },
    whyThisCity: [
      'Planet Labs operates the largest Earth observation constellation from SF — over 200 satellites',
      'Strong venture capital ecosystem — Andreessen Horowitz, Founders Fund, and Khosla Ventures all invest in space',
      'Tech talent crossover from Google, Meta, Apple creating a deep engineering talent pool',
      'UC Berkeley Space Sciences Laboratory driving fundamental research',
      'Proximity to NASA Ames Research Center in Mountain View',
    ],
  },
  {
    slug: 'denver',
    name: 'Denver',
    state: 'CO',
    title: 'Space Industry in Denver, CO — Companies, Jobs & Resources',
    description: 'Denver and the Front Range corridor are major aerospace hubs with Lockheed Martin, United Launch Alliance, and Ball Aerospace. Explore space opportunities in Denver.',
    heroText: 'Colorado has the second-largest aerospace workforce in the US, anchored by Lockheed Martin, ULA, and Ball Aerospace along the Front Range.',
    stats: [{ label: 'Aerospace Companies', value: '60+' }, { label: 'Space Industry Jobs', value: '5,000+' }, { label: 'Annual Economic Impact', value: '$4.5B' }],
    keyFacilities: [
      { name: 'Lockheed Martin Space (Littleton)', type: 'Commercial', description: 'GPS III, Orion spacecraft, Mars missions — largest space employer in Colorado' },
      { name: 'United Launch Alliance (Centennial)', type: 'Commercial', description: 'Vulcan Centaur rocket development and operations' },
      { name: 'Ball Aerospace (Boulder)', type: 'Commercial', description: 'Space instruments, smallsats, and optical systems' },
    ],
    majorCompanies: [
      { name: 'Lockheed Martin Space', slug: 'lockheed-martin', focus: 'GPS III, Orion, Mars helicopters' },
      { name: 'United Launch Alliance', slug: 'ula', focus: 'Vulcan Centaur, Atlas V, Delta IV' },
      { name: 'Ball Aerospace', slug: 'ball-aerospace', focus: 'Instruments, CubeSats, optical systems' },
      { name: 'Sierra Space', slug: 'sierra-space', focus: 'Dream Chaser spaceplane' },
      { name: 'Maxar Technologies', slug: 'maxar', focus: 'Earth imagery, satellite buses' },
      { name: 'York Space Systems', slug: 'york-space', focus: 'Standard satellite bus manufacturing' },
    ],
    jobMarket: {
      avgSalary: '$120,000',
      openPositions: '5,000+',
      topRoles: ['Systems Engineer', 'Satellite Integration Specialist', 'Propulsion Engineer', 'Software Developer', 'Test Engineer'],
    },
    whyThisCity: [
      'Colorado has the second-largest aerospace workforce in the US after California',
      'Lockheed Martin\'s largest space facility is in Littleton — builds GPS, Orion, and Mars missions',
      'ULA headquarters and Vulcan Centaur development in Centennial',
      'University of Colorado Boulder aerospace program is a top-5 national program',
      'Lower cost of living than LA/SF with comparable aerospace salaries',
    ],
  },
  {
    slug: 'albuquerque',
    name: 'Albuquerque',
    state: 'NM',
    title: 'Space Industry in Albuquerque, NM — Companies, Jobs & Resources',
    description: 'Albuquerque is home to Sandia National Laboratories, Spaceport America access, and a growing commercial space sector. Discover space opportunities in New Mexico.',
    heroText: 'Albuquerque combines national security space research at Sandia Labs with commercial space access via Spaceport America.',
    stats: [{ label: 'Aerospace Companies', value: '25+' }, { label: 'Space Industry Jobs', value: '2,000+' }, { label: 'Annual Economic Impact', value: '$1.5B' }],
    keyFacilities: [
      { name: 'Sandia National Laboratories', type: 'Government', description: 'Nuclear weapons, satellite technology, directed energy research' },
      { name: 'Air Force Research Laboratory (Kirtland AFB)', type: 'Government', description: 'Space vehicles, directed energy, and advanced sensors research' },
      { name: 'Spaceport America (nearby)', type: 'Spaceport', description: 'World\'s first purpose-built commercial spaceport — Virgin Galactic operations' },
    ],
    majorCompanies: [
      { name: 'Sandia National Labs', slug: 'sandia', focus: 'National security space technology' },
      { name: 'Virgin Galactic', slug: 'virgin-galactic', focus: 'Suborbital space tourism' },
      { name: 'Boeing (Kirtland)', slug: 'boeing', focus: 'Directed energy, space systems' },
      { name: 'Northrop Grumman', slug: 'northrop-grumman', focus: 'Missile defense, space sensors' },
      { name: 'Raytheon', slug: 'raytheon', focus: 'Defense electronics, sensors' },
    ],
    jobMarket: {
      avgSalary: '$105,000',
      openPositions: '2,000+',
      topRoles: ['Research Scientist', 'Directed Energy Engineer', 'Space Systems Analyst', 'Test Engineer', 'Security Specialist'],
    },
    whyThisCity: [
      'Sandia National Labs is a world leader in space-related national security technology',
      'Kirtland AFB hosts the Air Force Research Laboratory\'s space vehicles directorate',
      'Spaceport America — first purpose-built commercial spaceport — is 90 miles south',
      'University of New Mexico mechanical and electrical engineering programs feed the workforce',
      'Lowest cost of living among major aerospace hubs',
    ],
  },
  {
    slug: 'vandenberg',
    name: 'Vandenberg',
    state: 'CA',
    title: 'Space Industry in Vandenberg, CA — Launch Site, Companies & Resources',
    description: 'Vandenberg Space Force Base is the West Coast launch hub for polar orbit missions. SpaceX, ULA, and others launch from Vandenberg. Explore space opportunities.',
    heroText: 'Vandenberg is the only US launch site for polar orbit missions — critical for Earth observation and defense satellites.',
    stats: [{ label: 'Launch Facilities', value: '3+' }, { label: 'Space Industry Jobs', value: '1,500+' }, { label: 'Annual Economic Impact', value: '$1.2B' }],
    keyFacilities: [
      { name: 'Vandenberg Space Force Base', type: 'Government', description: 'Primary US launch site for polar and sun-synchronous orbit missions' },
      { name: 'SpaceX SLC-4E', type: 'Commercial', description: 'Falcon 9 and Falcon Heavy launch and landing complex' },
      { name: 'ULA SLC-3', type: 'Commercial', description: 'Atlas V launch complex for national security missions' },
    ],
    majorCompanies: [
      { name: 'SpaceX', slug: 'spacex', focus: 'Falcon 9 polar launches, Starlink deployment' },
      { name: 'United Launch Alliance', slug: 'ula', focus: 'National security polar orbit launches' },
      { name: 'Northrop Grumman', slug: 'northrop-grumman', focus: 'ICBM maintenance, space launch support' },
      { name: 'Space Force', slug: 'ussf', focus: 'Launch operations, space domain awareness' },
    ],
    jobMarket: {
      avgSalary: '$110,000',
      openPositions: '1,500+',
      topRoles: ['Launch Operations Engineer', 'Range Safety Officer', 'Mission Assurance', 'Ground Systems Technician', 'Telemetry Engineer'],
    },
    whyThisCity: [
      'Only US launch site for polar and sun-synchronous orbits — essential for Earth observation and defense satellites',
      'SpaceX launches Starlink satellites and national security payloads from SLC-4E',
      'ULA operates Atlas V (transitioning to Vulcan) for DoD and NRO missions',
      'Growing launch cadence — 20+ launches per year and increasing',
      'California Polytechnic State University (Cal Poly) in nearby San Luis Obispo is a CubeSat pioneer',
    ],
  },
];

export function getCity(slug: string): SpaceCity | undefined {
  return SPACE_CITIES.find((city) => city.slug === slug);
}
