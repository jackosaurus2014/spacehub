'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import AnimatedPageHeader from '@/components/ui/AnimatedPageHeader';
import ScrollReveal from '@/components/ui/ScrollReveal';
import RelatedModules from '@/components/ui/RelatedModules';
import { PAGE_RELATIONS } from '@/lib/module-relationships';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Category =
  | 'Organizations'
  | 'Technology'
  | 'Orbits'
  | 'Propulsion'
  | 'Communications'
  | 'Military/Defense'
  | 'Business'
  | 'Regulatory'
  | 'Operations';

interface Acronym {
  acronym: string;
  fullForm: string;
  category: Category;
  definition: string;
}

// ---------------------------------------------------------------------------
// Data (100+ acronyms, sorted alphabetically)
// ---------------------------------------------------------------------------

const ACRONYMS: Acronym[] = [
  { acronym: 'AEHF', fullForm: 'Advanced Extremely High Frequency', category: 'Military/Defense', definition: 'A constellation of U.S. military communications satellites providing jam-resistant, global, secure communications for strategic command and tactical warfighters.' },
  { acronym: 'AFRL', fullForm: 'Air Force Research Laboratory', category: 'Organizations', definition: 'The primary scientific research and development center for the U.S. Air Force and U.S. Space Force, responsible for developing space, cyber, and weapons technologies.' },
  { acronym: 'AOCS', fullForm: 'Attitude and Orbit Control System', category: 'Technology', definition: 'The onboard subsystem responsible for determining and controlling a spacecraft\'s orientation (attitude) and orbital position using sensors, actuators, reaction wheels, and thrusters.' },
  { acronym: 'APOGEE', fullForm: 'Apogee (highest orbital point)', category: 'Orbits', definition: 'The point in an elliptical orbit around Earth where the orbiting object is farthest from the planet. Opposite of perigee.' },
  { acronym: 'ASAT', fullForm: 'Anti-Satellite Weapon', category: 'Military/Defense', definition: 'A weapon designed to incapacitate or destroy satellites for strategic military purposes. Types include direct-ascent kinetic kill vehicles, co-orbital interceptors, directed energy weapons, and cyberattacks.' },
  { acronym: 'BLEO', fullForm: 'Beyond Low Earth Orbit', category: 'Orbits', definition: 'A general term for any destination or mission beyond LEO, including MEO, GEO, cislunar space, the Moon, Mars, and deep space.' },
  { acronym: 'BOL', fullForm: 'Beginning of Life', category: 'Operations', definition: 'The initial operational phase of a satellite after launch and commissioning, when power generation, propellant reserves, and component performance are at their peak.' },
  { acronym: 'BUC', fullForm: 'Block Upconverter', category: 'Communications', definition: 'A device used in satellite communications ground stations that converts an intermediate frequency signal to a higher frequency (e.g., Ku-band or Ka-band) for transmission to a satellite.' },
  { acronym: 'C2', fullForm: 'Command and Control', category: 'Military/Defense', definition: 'The exercise of authority and direction over military space assets, including satellite tasking, maneuvering, and defensive operations in the space domain.' },
  { acronym: 'CAIB', fullForm: 'Columbia Accident Investigation Board', category: 'Organizations', definition: 'The independent board established to investigate the Space Shuttle Columbia disaster of February 1, 2003, which resulted in landmark safety recommendations for human spaceflight.' },
  { acronym: 'CDM', fullForm: 'Conjunction Data Message', category: 'Operations', definition: 'A standardized message format used to communicate predicted close approaches between orbiting objects, including miss distance, time of closest approach, and collision probability.' },
  { acronym: 'CLPS', fullForm: 'Commercial Lunar Payload Services', category: 'Business', definition: 'A NASA program contracting private companies to deliver science and technology payloads to the lunar surface, supporting the Artemis program with frequent, low-cost Moon access.' },
  { acronym: 'CNES', fullForm: 'Centre National d\'Etudes Spatiales', category: 'Organizations', definition: 'The French government space agency responsible for shaping and implementing France\'s space policy. CNES operates the Guiana Space Centre and partners with ESA on major programs.' },
  { acronym: 'COLA', fullForm: 'Collision Avoidance', category: 'Operations', definition: 'The process and maneuvers undertaken to prevent collisions between orbiting objects, triggered by conjunction assessments that exceed acceptable risk thresholds.' },
  { acronym: 'COMSAT', fullForm: 'Communications Satellite', category: 'Communications', definition: 'Any artificial satellite stationed in space for the purpose of telecommunications, relaying radio, television, internet, and telephone signals between ground stations.' },
  { acronym: 'COPUOS', fullForm: 'Committee on the Peaceful Uses of Outer Space', category: 'Regulatory', definition: 'A United Nations committee established in 1959 that serves as the primary international forum for developing space law and promoting international cooperation in the peaceful use of outer space.' },
  { acronym: 'COTS', fullForm: 'Commercial Off-The-Shelf', category: 'Technology', definition: 'Standard commercially available hardware or software components used in spacecraft and satellite systems, reducing costs compared to custom space-qualified parts but requiring additional testing for the space environment.' },
  { acronym: 'CRADA', fullForm: 'Cooperative Research and Development Agreement', category: 'Business', definition: 'A legal agreement between a U.S. federal laboratory and non-federal parties to collaborate on R&D, allowing shared use of government facilities and intellectual property while protecting proprietary information.' },
  { acronym: 'CSLA', fullForm: 'Commercial Space Launch Act', category: 'Regulatory', definition: 'U.S. legislation (originally 1984, amended multiple times) that governs the licensing and regulation of commercial space launch and reentry activities by the FAA.' },
  { acronym: 'CSpOC', fullForm: 'Combined Space Operations Center', category: 'Military/Defense', definition: 'The multinational operations center at Vandenberg Space Force Base that provides space situational awareness, command and control, and space defense for U.S. and allied forces.' },
  { acronym: 'DARPA', fullForm: 'Defense Advanced Research Projects Agency', category: 'Organizations', definition: 'A U.S. Department of Defense agency that develops breakthrough technologies for national security, including satellite servicing (RSGS), space domain awareness, and responsive launch programs.' },
  { acronym: 'DLR', fullForm: 'Deutsches Zentrum fur Luft- und Raumfahrt', category: 'Organizations', definition: 'The German Aerospace Center, Germany\'s national center for aerospace, energy, and transportation research. DLR develops satellite systems, conducts space science, and manages German astronaut activities.' },
  { acronym: 'DMSP', fullForm: 'Defense Meteorological Satellite Program', category: 'Military/Defense', definition: 'A U.S. Department of Defense program operating polar-orbiting satellites that provide weather and environmental data to support military operations and civilian weather forecasting.' },
  { acronym: 'DoD', fullForm: 'Department of Defense', category: 'Organizations', definition: 'The United States federal executive department charged with coordinating and supervising all agencies and functions related to national security and the armed forces, including military space operations.' },
  { acronym: 'DSN', fullForm: 'Deep Space Network', category: 'Communications', definition: 'NASA\'s international network of large radio antennas located in California, Spain, and Australia that supports interplanetary spacecraft missions and provides radar and radio astronomy observations.' },
  { acronym: 'EAR', fullForm: 'Export Administration Regulations', category: 'Regulatory', definition: 'U.S. Department of Commerce regulations controlling the export of commercial and dual-use items, including satellite components and space-related technologies on the Commerce Control List.' },
  { acronym: 'EDRS', fullForm: 'European Data Relay System', category: 'Communications', definition: 'An ESA program using GEO relay satellites with laser inter-satellite links to provide near-real-time data relay from LEO satellites, cutting data delivery times from hours to minutes.' },
  { acronym: 'EGSE', fullForm: 'Electrical Ground Support Equipment', category: 'Technology', definition: 'The suite of electrical test equipment used on the ground to simulate, test, and verify spacecraft electrical systems and payloads before launch, including power supplies, signal generators, and data recorders.' },
  { acronym: 'ELV', fullForm: 'Expendable Launch Vehicle', category: 'Propulsion', definition: 'A launch vehicle designed for single use, with stages and components that are discarded after one flight. Examples include Atlas V, Delta IV, Ariane 5, and early versions of Falcon 9.' },
  { acronym: 'EMC', fullForm: 'Electromagnetic Compatibility', category: 'Technology', definition: 'The ability of a spacecraft\'s electronic systems to function without generating electromagnetic interference that degrades other onboard systems or violates emission standards.' },
  { acronym: 'EOL', fullForm: 'End of Life', category: 'Operations', definition: 'The planned termination of a satellite\'s operational mission, typically triggered by propellant depletion, power degradation, or component failure. Disposal (deorbit or graveyard orbit) follows EOL.' },
  { acronym: 'EO', fullForm: 'Earth Observation', category: 'Technology', definition: 'The use of satellite-based sensors to gather information about Earth\'s surface, atmosphere, and oceans, including optical imaging, radar, lidar, and multispectral/hyperspectral instruments.' },
  { acronym: 'ESA', fullForm: 'European Space Agency', category: 'Organizations', definition: 'An intergovernmental organization of 22 member states dedicated to the exploration of space. ESA develops launch vehicles (Ariane, Vega), scientific missions, Earth observation programs, and human spaceflight through ISS partnership.' },
  { acronym: 'EVA', fullForm: 'Extravehicular Activity', category: 'Operations', definition: 'Any activity performed by an astronaut outside a spacecraft, commonly called a spacewalk. EVAs are conducted for ISS maintenance, satellite servicing, and will be critical for Artemis lunar surface operations.' },
  { acronym: 'FAA-AST', fullForm: 'Federal Aviation Administration Office of Commercial Space Transportation', category: 'Regulatory', definition: 'The U.S. government office responsible for licensing and regulating commercial launch and reentry vehicles, launch and reentry sites, and ensuring public safety during commercial space operations.' },
  { acronym: 'FCC', fullForm: 'Federal Communications Commission', category: 'Regulatory', definition: 'The U.S. regulatory agency that licenses radio frequencies for space and Earth stations, imposes orbital debris mitigation requirements, and manages spectrum allocation for satellite communications.' },
  { acronym: 'FDIR', fullForm: 'Fault Detection, Isolation, and Recovery', category: 'Operations', definition: 'The onboard autonomous system that detects anomalies in spacecraft subsystems, isolates the faulty component, and initiates recovery procedures to maintain safe operations without ground intervention.' },
  { acronym: 'FOC', fullForm: 'Full Operational Capability', category: 'Operations', definition: 'The milestone at which a satellite constellation or system has all planned spacecraft deployed and operational, achieving its designed performance and coverage specifications.' },
  { acronym: 'GBSD', fullForm: 'Ground Based Strategic Deterrent', category: 'Military/Defense', definition: 'The U.S. Air Force program (now Sentinel) to replace the Minuteman III ICBM system, with space-based early warning and communication satellites providing critical support for nuclear deterrence.' },
  { acronym: 'GEO', fullForm: 'Geostationary Earth Orbit', category: 'Orbits', definition: 'A circular equatorial orbit at approximately 35,786 km altitude where a satellite\'s orbital period matches Earth\'s rotation, making the satellite appear stationary relative to a point on the ground.' },
  { acronym: 'GNSS', fullForm: 'Global Navigation Satellite System', category: 'Technology', definition: 'The general term for satellite constellations providing global positioning, navigation, and timing services. Includes GPS (U.S.), GLONASS (Russia), Galileo (EU), and BeiDou (China).' },
  { acronym: 'GPS', fullForm: 'Global Positioning System', category: 'Technology', definition: 'A U.S. Space Force-operated constellation of 31 MEO satellites providing global positioning, navigation, and timing services. GPS III satellites provide improved accuracy (0.6m) and the L5 civil signal.' },
  { acronym: 'GTO', fullForm: 'Geostationary Transfer Orbit', category: 'Orbits', definition: 'An elliptical orbit used to transfer a satellite from LEO to GEO. The perigee is at LEO altitude and the apogee is at GEO altitude, where a circularization burn places the satellite into its final orbit.' },
  { acronym: 'HEO', fullForm: 'Highly Elliptical Orbit', category: 'Orbits', definition: 'An orbit with high eccentricity providing extended dwell time over high-latitude regions. Includes Molniya orbits (12-hour period) and Tundra orbits (24-hour period) used for communications and early warning.' },
  { acronym: 'HTS', fullForm: 'High Throughput Satellite', category: 'Communications', definition: 'A satellite design using multiple spot beams and frequency reuse to deliver substantially higher data throughput (typically 20x or more) than conventional wide-beam satellites at lower cost per bit.' },
  { acronym: 'IADC', fullForm: 'Inter-Agency Space Debris Coordination Committee', category: 'Organizations', definition: 'An international forum of 13 space agencies that coordinates activities related to space debris research, mitigation guidelines, and measurement campaigns to protect the orbital environment.' },
  { acronym: 'IOC', fullForm: 'Initial Operational Capability', category: 'Operations', definition: 'The milestone at which a new satellite system or constellation has sufficient spacecraft deployed to begin providing its intended service, even if the full constellation is not yet complete.' },
  { acronym: 'IOT', fullForm: 'Internet of Things', category: 'Communications', definition: 'In the space context, satellite-based IoT refers to constellations providing global connectivity for remote sensors, asset trackers, and devices in areas without terrestrial network coverage.' },
  { acronym: 'ISL', fullForm: 'Inter-Satellite Link', category: 'Communications', definition: 'A communication link between two satellites, using radio frequency or optical (laser) technology. ISLs enable data routing across a constellation without ground station relays, reducing latency.' },
  { acronym: 'ISRO', fullForm: 'Indian Space Research Organisation', category: 'Organizations', definition: 'India\'s national space agency responsible for the country\'s space program, including the PSLV and GSLV launch vehicles, Chandrayaan lunar missions, and Gaganyaan human spaceflight program.' },
  { acronym: 'ISS', fullForm: 'International Space Station', category: 'Organizations', definition: 'A modular space station in LEO (408 km altitude) jointly operated by NASA, Roscosmos, ESA, JAXA, and CSA. The ISS has been continuously occupied since November 2000 and is planned for deorbit around 2030.' },
  { acronym: 'ITAR', fullForm: 'International Traffic in Arms Regulations', category: 'Regulatory', definition: 'U.S. State Department regulations controlling the export of defense articles on the U.S. Munitions List, including many satellites and launch vehicle components. Violations carry severe civil and criminal penalties.' },
  { acronym: 'ITU', fullForm: 'International Telecommunication Union', category: 'Regulatory', definition: 'A United Nations specialized agency responsible for international coordination of radio frequency spectrum and satellite orbital positions. ITU filings secure spectrum rights and prevent harmful interference.' },
  { acronym: 'JAXA', fullForm: 'Japan Aerospace Exploration Agency', category: 'Organizations', definition: 'Japan\'s national aerospace agency responsible for space research, technology development, and satellite operations. JAXA operates the H-IIA/H3 launch vehicles and contributes the Kibo module to the ISS.' },
  { acronym: 'JPL', fullForm: 'Jet Propulsion Laboratory', category: 'Organizations', definition: 'A NASA-funded research and development center managed by Caltech in Pasadena, California. JPL designs and operates robotic planetary missions including Mars rovers, Voyager, and the Europa Clipper.' },
  { acronym: 'KSAT', fullForm: 'Kongsberg Satellite Services', category: 'Business', definition: 'A Norwegian company operating one of the world\'s largest commercial ground station networks, providing satellite data downlink, telemetry, and command services from 25+ sites including polar stations.' },
  { acronym: 'LEO', fullForm: 'Low Earth Orbit', category: 'Orbits', definition: 'An orbit between approximately 160 km and 2,000 km altitude. LEO is the most accessible orbital regime, hosting the ISS, Earth observation satellites, and broadband mega-constellations like Starlink.' },
  { acronym: 'LNA', fullForm: 'Low Noise Amplifier', category: 'Communications', definition: 'A critical component in satellite ground station receive chains that amplifies very weak signals received from satellites while adding minimal noise, preserving signal quality for processing.' },
  { acronym: 'LOX', fullForm: 'Liquid Oxygen', category: 'Propulsion', definition: 'A cryogenic oxidizer used in most liquid-propellant rocket engines. LOX is paired with fuels such as RP-1 (kerosene), liquid hydrogen, or liquid methane. It must be stored at -183 degrees C.' },
  { acronym: 'LRO', fullForm: 'Lunar Reconnaissance Orbiter', category: 'Technology', definition: 'A NASA robotic spacecraft orbiting the Moon since 2009, providing detailed surface mapping, temperature data, and radiation measurements used to plan Artemis landing sites and future lunar operations.' },
  { acronym: 'MEO', fullForm: 'Medium Earth Orbit', category: 'Orbits', definition: 'An orbit between 2,000 km and 35,786 km altitude, primarily used by navigation constellations (GPS, Galileo, GLONASS) and some communications systems (O3b mPOWER).' },
  { acronym: 'MGSE', fullForm: 'Mechanical Ground Support Equipment', category: 'Technology', definition: 'The mechanical fixtures, handling tools, transportation containers, and integration equipment used to assemble, test, transport, and install spacecraft and payloads before launch.' },
  { acronym: 'MLI', fullForm: 'Multi-Layer Insulation', category: 'Technology', definition: 'Thermal blankets consisting of multiple thin reflective layers (typically aluminized Mylar or Kapton) used on spacecraft to control temperature by minimizing radiative heat transfer in the vacuum of space.' },
  { acronym: 'MMH', fullForm: 'Monomethylhydrazine', category: 'Propulsion', definition: 'A storable, hypergolic liquid fuel commonly used in spacecraft propulsion systems paired with nitrogen tetroxide (NTO) as the oxidizer. MMH ignites on contact with NTO, eliminating the need for an ignition system.' },
  { acronym: 'MPCV', fullForm: 'Multi-Purpose Crew Vehicle', category: 'Technology', definition: 'The official designation for NASA\'s Orion spacecraft, designed to carry astronauts to deep-space destinations including the Moon (Artemis program) and eventually Mars.' },
  { acronym: 'NASA', fullForm: 'National Aeronautics and Space Administration', category: 'Organizations', definition: 'The U.S. federal agency responsible for the civil space program, aeronautics research, and space science. NASA operates the Artemis program, ISS, James Webb Space Telescope, and numerous robotic missions.' },
  { acronym: 'NGSO', fullForm: 'Non-Geostationary Satellite Orbit', category: 'Orbits', definition: 'A regulatory and industry term for any satellite orbit that is not geostationary, including LEO, MEO, and HEO systems. NGSO constellations require ITU coordination with existing GEO operators.' },
  { acronym: 'NOAA', fullForm: 'National Oceanic and Atmospheric Administration', category: 'Organizations', definition: 'A U.S. scientific and regulatory agency operating weather satellites (GOES, JPSS), providing space weather forecasts, and licensing commercial remote sensing systems under the Land Remote Sensing Policy Act.' },
  { acronym: 'NORAD', fullForm: 'North American Aerospace Defense Command', category: 'Military/Defense', definition: 'A bi-national U.S.-Canadian military organization providing aerospace warning and defense for North America, maintaining the catalog of tracked space objects and supporting conjunction assessments.' },
  { acronym: 'NRO', fullForm: 'National Reconnaissance Office', category: 'Military/Defense', definition: 'The U.S. intelligence agency responsible for designing, building, launching, and operating reconnaissance satellites that provide intelligence data to senior policymakers and the military.' },
  { acronym: 'NSSL', fullForm: 'National Security Space Launch', category: 'Military/Defense', definition: 'The U.S. Space Force program (formerly EELV) that procures launch services for national security payloads. Phase 2 contracts were awarded to ULA (Vulcan Centaur) and SpaceX (Falcon 9/Heavy).' },
  { acronym: 'NTO', fullForm: 'Nitrogen Tetroxide', category: 'Propulsion', definition: 'A storable, hypergolic oxidizer used with MMH or UDMH in spacecraft bipropellant systems. NTO and its fuel pairs are preferred for missions requiring reliable, restartable engines without cryogenic storage.' },
  { acronym: 'OOS', fullForm: 'On-Orbit Servicing', category: 'Operations', definition: 'The capability to inspect, refuel, repair, upgrade, or relocate satellites in orbit, extending their operational life and reducing the need for replacement launches. Demonstrated by Northrop Grumman\'s MEV missions.' },
  { acronym: 'OST', fullForm: 'Outer Space Treaty', category: 'Regulatory', definition: 'The 1967 Treaty on Principles Governing the Activities of States in the Exploration and Use of Outer Space, the foundational international space law prohibiting nuclear weapons in space, national appropriation of celestial bodies, and requiring state responsibility for space activities.' },
  { acronym: 'PNT', fullForm: 'Positioning, Navigation, and Timing', category: 'Technology', definition: 'The trio of services provided by GNSS constellations. PNT is critical for military operations, aviation, maritime navigation, autonomous vehicles, financial transaction timestamping, and telecommunications network synchronization.' },
  { acronym: 'PPE', fullForm: 'Power and Propulsion Element', category: 'Technology', definition: 'The first module of NASA\'s Lunar Gateway, providing solar electric propulsion, power distribution, and communications for the cislunar space station supporting Artemis missions.' },
  { acronym: 'PSMA', fullForm: 'Payload Safety and Mission Assurance', category: 'Operations', definition: 'The engineering discipline ensuring that satellite payloads and mission systems meet safety standards, reliability requirements, and performance specifications through testing, analysis, and quality control processes.' },
  { acronym: 'RAAN', fullForm: 'Right Ascension of the Ascending Node', category: 'Orbits', definition: 'One of the six classical orbital elements, defining the angle measured in the equatorial plane from the vernal equinox to the point where the orbit crosses the equator northward. RAAN determines the orientation of the orbital plane.' },
  { acronym: 'RCS', fullForm: 'Reaction Control System', category: 'Propulsion', definition: 'A set of small thrusters on a spacecraft used for attitude control and fine orbital adjustments, typically using monopropellant (hydrazine) or bipropellant (MMH/NTO) systems.' },
  { acronym: 'RF', fullForm: 'Radio Frequency', category: 'Communications', definition: 'The portion of the electromagnetic spectrum (3 kHz to 300 GHz) used for satellite communications, radar, and telemetry. Key satellite bands include L, S, C, X, Ku, Ka, and V-band.' },
  { acronym: 'RFQ', fullForm: 'Request for Quotation', category: 'Business', definition: 'A formal procurement document inviting suppliers to submit pricing and capability proposals for specific goods or services. In the space industry, RFQs cover satellite manufacturing, launch services, and ground equipment.' },
  { acronym: 'RLV', fullForm: 'Reusable Launch Vehicle', category: 'Propulsion', definition: 'A launch vehicle designed to be recovered and reflown multiple times, dramatically reducing per-flight costs. SpaceX\'s Falcon 9 first stage has demonstrated over 20 flights on a single booster.' },
  { acronym: 'RTG', fullForm: 'Radioisotope Thermoelectric Generator', category: 'Propulsion', definition: 'A power source converting heat from radioactive decay (typically plutonium-238) into electricity via thermoelectric couples. RTGs power deep-space missions (Voyager, New Horizons, Curiosity) where solar panels are impractical.' },
  { acronym: 'SAA', fullForm: 'Space Act Agreement', category: 'Business', definition: 'A legal instrument allowing NASA to partner with private companies, universities, and international organizations. SAAs come in funded, unfunded, and reimbursable forms and underpin programs like Commercial Crew and CLPS.' },
  { acronym: 'SAM', fullForm: 'System for Award Management', category: 'Business', definition: 'The U.S. government\'s official portal (SAM.gov) for entity registration, contract opportunity listings, and federal procurement data. All companies seeking government space contracts must register in SAM.' },
  { acronym: 'SAR', fullForm: 'Synthetic Aperture Radar', category: 'Technology', definition: 'An active remote sensing technique using radar pulses from a moving satellite to create high-resolution imagery through clouds, at night, and in all weather conditions. Used by Capella Space, ICEYE, and Umbra.' },
  { acronym: 'SATCOM', fullForm: 'Satellite Communications', category: 'Communications', definition: 'The broad field encompassing all telecommunications services delivered via satellite, including broadband internet, television broadcasting, voice, maritime/aviation connectivity, and military communications.' },
  { acronym: 'SBAS', fullForm: 'Satellite-Based Augmentation System', category: 'Technology', definition: 'A system using GEO satellites to broadcast correction signals that improve GNSS accuracy, integrity, and availability for aviation and precision applications. Includes WAAS (U.S.), EGNOS (EU), and GAGAN (India).' },
  { acronym: 'SBIR', fullForm: 'Small Business Innovation Research', category: 'Business', definition: 'A U.S. government program reserving a percentage of federal R&D funding for small businesses across three phases: feasibility (Phase I, ~$150K), prototype (Phase II, ~$1M), and commercialization (Phase III).' },
  { acronym: 'SDA', fullForm: 'Space Development Agency', category: 'Military/Defense', definition: 'A U.S. Department of Defense agency (now part of U.S. Space Force) building the Proliferated Warfighter Space Architecture (PWSA), a mesh network of hundreds of LEO satellites for missile tracking and data transport.' },
  { acronym: 'SEP', fullForm: 'Solar Electric Propulsion', category: 'Propulsion', definition: 'A propulsion technology using solar-generated electricity to accelerate ionized propellant (typically xenon or krypton) to produce thrust. SEP provides very high specific impulse (1,500-10,000s) for efficient deep-space missions and orbit raising.' },
  { acronym: 'SLC', fullForm: 'Space Launch Complex', category: 'Operations', definition: 'A facility at a launch range containing the launch pad, service structures, propellant storage, and support infrastructure for assembling and launching rockets. Notable SLCs include SLC-40 (SpaceX) and SLC-41 (ULA) at Cape Canaveral.' },
  { acronym: 'SLS', fullForm: 'Space Launch System', category: 'Propulsion', definition: 'NASA\'s super heavy-lift launch vehicle designed for deep-space missions. SLS Block 1 produces 8.8 million pounds of thrust and launched Artemis I in November 2022. Block 2 will deliver 130 metric tons to LEO.' },
  { acronym: 'SMC', fullForm: 'Space and Missile Systems Center', category: 'Organizations', definition: 'The former USAF center responsible for acquiring military space systems, now reorganized as Space Systems Command (SSC) under the U.S. Space Force.' },
  { acronym: 'SOC', fullForm: 'Satellite Operations Center', category: 'Operations', definition: 'The ground facility from which a satellite or constellation is monitored and controlled, housing flight dynamics, telemetry processing, commanding, and anomaly resolution teams.' },
  { acronym: 'SPADOC', fullForm: 'Space Defense Operations Center', category: 'Military/Defense', definition: 'A command center within the Combined Space Operations Center that detects, tracks, and characterizes objects in Earth orbit and provides space defense warnings and assessments.' },
  { acronym: 'SpOC', fullForm: 'Space Operations Command', category: 'Military/Defense', definition: 'One of three U.S. Space Force field commands, responsible for generating, presenting, and sustaining space forces including satellite operations, missile warning, and space domain awareness.' },
  { acronym: 'SRP', fullForm: 'Solar Radiation Pressure', category: 'Orbits', definition: 'The force exerted on a spacecraft by photons from the Sun, causing small but cumulative perturbations to its orbit. SRP must be modeled in precise orbit determination and is a significant factor for large, lightweight satellites.' },
  { acronym: 'SSA', fullForm: 'Space Situational Awareness', category: 'Operations', definition: 'The knowledge of the space environment including the location, trajectory, and characteristics of natural and man-made objects in orbit, plus space weather conditions and near-Earth objects.' },
  { acronym: 'SSC', fullForm: 'Space Systems Command', category: 'Organizations', definition: 'The U.S. Space Force field command responsible for developing, acquiring, and sustaining lethal and resilient space capabilities, including launch services, satellites, and ground systems.' },
  { acronym: 'SSO', fullForm: 'Sun-Synchronous Orbit', category: 'Orbits', definition: 'A near-polar orbit (typically 600-800 km, 97-99 deg inclination) where the orbital plane maintains a fixed angle relative to the Sun, ensuring consistent lighting for Earth observation.' },
  { acronym: 'STTR', fullForm: 'Small Business Technology Transfer', category: 'Business', definition: 'A companion program to SBIR that requires small businesses to partner with nonprofit research institutions, facilitating technology transfer from labs to the commercial marketplace.' },
  { acronym: 'SWE', fullForm: 'Space Weather Event', category: 'Operations', definition: 'Any solar-driven disturbance affecting the near-Earth space environment, including solar flares, coronal mass ejections, geomagnetic storms, and solar energetic particle events that impact satellite operations.' },
  { acronym: 'TAA', fullForm: 'Technical Assistance Agreement', category: 'Regulatory', definition: 'An ITAR-required agreement authorizing the export of defense services, including technical data and assistance, to foreign persons for activities such as satellite integration at non-U.S. launch sites.' },
  { acronym: 'TLE', fullForm: 'Two-Line Element Set', category: 'Operations', definition: 'A standardized data format encoding the orbital elements of an Earth-orbiting object at a given epoch, published by the 18th Space Defense Squadron and used with the SGP4 propagation model.' },
  { acronym: 'TMI', fullForm: 'Trans-Mars Injection', category: 'Orbits', definition: 'The propulsive maneuver that places a spacecraft on a trajectory from Earth orbit to Mars. TMI typically requires a delta-V of approximately 3.6 km/s from LEO, depending on the launch window.' },
  { acronym: 'TRL', fullForm: 'Technology Readiness Level', category: 'Technology', definition: 'A 9-point scale (TRL 1-9) developed by NASA to assess the maturity of a technology from basic principles (TRL 1) through successful mission operations (TRL 9). TRL assessments guide funding decisions and risk management.' },
  { acronym: 'TT&C', fullForm: 'Telemetry, Tracking, and Command', category: 'Communications', definition: 'The essential communications functions for satellite operations: telemetry (downlinking health/status data), tracking (determining orbital position), and command (uplinking instructions to the spacecraft).' },
  { acronym: 'TWTA', fullForm: 'Traveling Wave Tube Amplifier', category: 'Communications', definition: 'A vacuum tube amplifier used in satellite communication payloads to amplify microwave signals for downlink transmission. TWTAs provide high power output and efficiency across wide bandwidths.' },
  { acronym: 'UDMH', fullForm: 'Unsymmetrical Dimethylhydrazine', category: 'Propulsion', definition: 'A storable, hypergolic liquid rocket fuel used with NTO in launch vehicle upper stages and spacecraft propulsion. UDMH is carcinogenic and being phased out in favor of less toxic alternatives.' },
  { acronym: 'ULA', fullForm: 'United Launch Alliance', category: 'Business', definition: 'A joint venture of Boeing and Lockheed Martin providing launch services with Atlas V, Delta IV Heavy (retired), and the new Vulcan Centaur. ULA has a 100% mission success rate across 150+ launches.' },
  { acronym: 'USAF', fullForm: 'United States Air Force', category: 'Organizations', definition: 'The air service branch of the U.S. Armed Forces, historically responsible for military space operations before the establishment of the U.S. Space Force as an independent branch in December 2019.' },
  { acronym: 'USSF', fullForm: 'United States Space Force', category: 'Organizations', definition: 'The space service branch of the U.S. Armed Forces, established December 20, 2019, responsible for organizing, training, and equipping space forces to protect U.S. and allied interests in space.' },
  { acronym: 'VLEO', fullForm: 'Very Low Earth Orbit', category: 'Orbits', definition: 'Orbits below approximately 450 km altitude, offering higher resolution imaging and lower latency but requiring more frequent orbit maintenance due to increased atmospheric drag.' },
  { acronym: 'VSAT', fullForm: 'Very Small Aperture Terminal', category: 'Communications', definition: 'A compact satellite ground terminal (typically 0.75-2.4m antenna) used for broadband internet, enterprise networking, and point-of-sale transactions via geostationary satellites.' },
];

// ---------------------------------------------------------------------------
// Category configuration (color-coded badges)
// ---------------------------------------------------------------------------

const CATEGORY_COLORS: Record<Category, { bg: string; text: string; border: string; chip: string }> = {
  Organizations: {
    bg: 'bg-blue-500/10',
    text: 'text-blue-400',
    border: 'border-blue-500/30',
    chip: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
  },
  Technology: {
    bg: 'bg-cyan-500/10',
    text: 'text-cyan-400',
    border: 'border-cyan-500/30',
    chip: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
  },
  Orbits: {
    bg: 'bg-indigo-500/10',
    text: 'text-indigo-400',
    border: 'border-indigo-500/30',
    chip: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40',
  },
  Propulsion: {
    bg: 'bg-orange-500/10',
    text: 'text-orange-400',
    border: 'border-orange-500/30',
    chip: 'bg-orange-500/20 text-orange-300 border-orange-500/40',
  },
  Communications: {
    bg: 'bg-purple-500/10',
    text: 'text-purple-400',
    border: 'border-purple-500/30',
    chip: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
  },
  'Military/Defense': {
    bg: 'bg-red-500/10',
    text: 'text-red-400',
    border: 'border-red-500/30',
    chip: 'bg-red-500/20 text-red-300 border-red-500/40',
  },
  Business: {
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-400',
    border: 'border-emerald-500/30',
    chip: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
  },
  Regulatory: {
    bg: 'bg-amber-500/10',
    text: 'text-amber-400',
    border: 'border-amber-500/30',
    chip: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
  },
  Operations: {
    bg: 'bg-teal-500/10',
    text: 'text-teal-400',
    border: 'border-teal-500/30',
    chip: 'bg-teal-500/20 text-teal-300 border-teal-500/40',
  },
};

// All unique categories from the data
const ALL_CATEGORIES: Category[] = Array.from(
  new Set(ACRONYMS.map((a) => a.category))
).sort() as Category[];

// Alphabet
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function AcronymsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);

  // Filtered and grouped acronyms
  const filteredGrouped = useMemo(() => {
    const lowerQuery = searchQuery.toLowerCase();

    const filtered = ACRONYMS.filter((a) => {
      const matchesSearch =
        !searchQuery ||
        a.acronym.toLowerCase().includes(lowerQuery) ||
        a.fullForm.toLowerCase().includes(lowerQuery) ||
        a.definition.toLowerCase().includes(lowerQuery);
      const matchesCategory = !selectedCategory || a.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });

    const grouped: Record<string, Acronym[]> = {};
    for (const item of filtered) {
      const letter = item.acronym[0].toUpperCase();
      if (!grouped[letter]) grouped[letter] = [];
      grouped[letter].push(item);
    }

    return grouped;
  }, [searchQuery, selectedCategory]);

  // Letters that have acronyms
  const activeLetters = useMemo(() => new Set(Object.keys(filteredGrouped)), [filteredGrouped]);

  // Total visible count
  const visibleCount = useMemo(
    () => Object.values(filteredGrouped).reduce((sum, arr) => sum + arr.length, 0),
    [filteredGrouped]
  );

  // Scroll to letter section
  const scrollToLetter = (letter: string) => {
    const el = document.getElementById(`acronym-section-${letter}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* ---- Header ---- */}
        <AnimatedPageHeader
          title="Space Industry Acronyms"
          subtitle="A comprehensive A-Z reference of acronyms and abbreviations used across the global space industry — from launch operations to regulatory frameworks."
          icon={<span className="text-4xl">&#128292;</span>}
          breadcrumb="Resources"
          accentColor="cyan"
        />

        {/* ---- Search & Category Filter ---- */}
        <ScrollReveal delay={0.1}>
          <div className="mb-6 space-y-4">
            {/* Search bar */}
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <svg
                  className="h-5 w-5 text-slate-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
                  />
                </svg>
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search acronyms, full forms, or definitions..."
                className="w-full pl-12 pr-4 py-3 bg-slate-800/50 border border-slate-700/50 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-400/50 focus:border-cyan-400/30 transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-white transition-colors"
                  aria-label="Clear search"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>

            {/* Category filter chips */}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedCategory(null)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
                  selectedCategory === null
                    ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-lg shadow-cyan-500/10'
                    : 'bg-slate-800/50 text-slate-400 border-slate-700/50 hover:border-slate-600 hover:text-slate-300'
                }`}
              >
                All ({ACRONYMS.length})
              </button>
              {ALL_CATEGORIES.map((cat) => {
                const count = ACRONYMS.filter((a) => a.category === cat).length;
                const colors = CATEGORY_COLORS[cat];
                const isActive = selectedCategory === cat;
                return (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(isActive ? null : cat)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
                      isActive
                        ? `${colors.chip} shadow-lg`
                        : 'bg-slate-800/50 text-slate-400 border-slate-700/50 hover:border-slate-600 hover:text-slate-300'
                    }`}
                  >
                    {cat} ({count})
                  </button>
                );
              })}
            </div>

            {/* Results count */}
            <p className="text-sm text-slate-400">
              Showing{' '}
              <span className="text-cyan-400 font-semibold">{visibleCount}</span> of{' '}
              <span className="text-slate-300">{ACRONYMS.length}</span> acronyms
            </p>
          </div>
        </ScrollReveal>

        {/* ---- A-Z Letter Navigation ---- */}
        <ScrollReveal delay={0.15}>
          <nav
            aria-label="Alphabetical navigation"
            className="mb-8 sticky top-0 z-10 bg-slate-900/95 backdrop-blur-sm py-3 -mx-4 px-4 sm:-mx-6 sm:px-6 border-b border-slate-800/50"
          >
            <div className="flex flex-wrap gap-1 justify-center">
              {ALPHABET.map((letter) => {
                const hasAcronyms = activeLetters.has(letter);
                return (
                  <button
                    key={letter}
                    onClick={() => hasAcronyms && scrollToLetter(letter)}
                    disabled={!hasAcronyms}
                    className={`w-9 h-9 rounded-lg text-sm font-bold flex items-center justify-center transition-all ${
                      hasAcronyms
                        ? 'bg-slate-800/50 text-cyan-400 border border-slate-700/50 hover:bg-cyan-500/20 hover:border-cyan-400/30 hover:shadow-lg hover:shadow-cyan-500/5 cursor-pointer'
                        : 'text-slate-600 cursor-not-allowed'
                    }`}
                    aria-label={`Jump to letter ${letter}`}
                  >
                    {letter}
                  </button>
                );
              })}
            </div>
          </nav>
        </ScrollReveal>

        {/* ---- Acronym Sections ---- */}
        <div className="space-y-10">
          {ALPHABET.map((letter) => {
            const items = filteredGrouped[letter];
            if (!items || items.length === 0) return null;

            return (
              <section
                key={letter}
                id={`acronym-section-${letter}`}
                aria-label={`Acronyms starting with ${letter}`}
              >
                {/* Letter heading */}
                <ScrollReveal>
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-br from-cyan-400 to-blue-500 leading-none">
                      {letter}
                    </span>
                    <div className="flex-1 h-px bg-gradient-to-r from-cyan-500/30 to-transparent" />
                    <span className="text-xs text-slate-500 font-medium">
                      {items.length} acronym{items.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                </ScrollReveal>

                {/* Acronym cards */}
                <div className="space-y-3">
                  {items.map((item, idx) => {
                    const colors = CATEGORY_COLORS[item.category];

                    return (
                      <ScrollReveal key={item.acronym} delay={idx * 0.03}>
                        <div className="group rounded-xl border bg-slate-800/50 border-slate-700/50 hover:border-cyan-400/30 hover:bg-slate-800/70 transition-all duration-300 p-5">
                          <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                            {/* Acronym badge */}
                            <div className="flex-shrink-0">
                              <span className="inline-flex items-center justify-center px-3 py-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 font-mono font-bold text-lg tracking-wide min-w-[80px] text-center">
                                {item.acronym}
                              </span>
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2">
                                <h3 className="text-white font-semibold text-base group-hover:text-cyan-50 transition-colors">
                                  {item.fullForm}
                                </h3>
                                <span
                                  className={`inline-flex self-start px-2.5 py-0.5 rounded-full text-xs font-medium border ${colors.bg} ${colors.text} ${colors.border}`}
                                >
                                  {item.category}
                                </span>
                              </div>
                              <p className="text-slate-400 text-sm leading-relaxed">
                                {item.definition}
                              </p>
                            </div>
                          </div>
                        </div>
                      </ScrollReveal>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>

        {/* ---- Empty state ---- */}
        {visibleCount === 0 && (
          <div className="text-center py-20">
            <div className="text-6xl mb-4 opacity-40">&#128269;</div>
            <h3 className="text-xl text-slate-300 font-semibold mb-2">No acronyms found</h3>
            <p className="text-slate-400 max-w-md mx-auto">
              Try adjusting your search query or clearing the category filter to see more results.
            </p>
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory(null);
              }}
              className="mt-4 px-4 py-2 rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 hover:bg-cyan-500/30 transition-all text-sm font-medium"
            >
              Reset filters
            </button>
          </div>
        )}

        {/* ---- Footer stats ---- */}
        <ScrollReveal delay={0.1}>
          <div className="mt-16 pt-8 border-t border-slate-800/50">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-12">
              {[
                { label: 'Total Acronyms', value: ACRONYMS.length, color: 'text-cyan-400' },
                { label: 'Categories', value: ALL_CATEGORIES.length, color: 'text-purple-400' },
                {
                  label: 'Letters Covered',
                  value: new Set(ACRONYMS.map((a) => a.acronym[0].toUpperCase())).size,
                  color: 'text-emerald-400',
                },
                {
                  label: 'Avg. Definition',
                  value: `${Math.round(
                    ACRONYMS.reduce((s, a) => s + a.definition.split(' ').length, 0) /
                      ACRONYMS.length
                  )} words`,
                  color: 'text-amber-400',
                },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 text-center hover:border-cyan-400/20 transition-all"
                >
                  <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
                  <div className="text-xs text-slate-400 mt-1">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </ScrollReveal>

        {/* ---- Related Resources ---- */}
        <ScrollReveal delay={0.15}>
          <div className="mb-8">
            <h2 className="text-xl font-bold text-slate-100 mb-4">Related Resources</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                {
                  href: '/glossary',
                  title: 'Space Glossary',
                  description: 'In-depth definitions of key space industry terms and concepts.',
                  icon: '\u{1F4DA}',
                },
                {
                  href: '/orbit-guide',
                  title: 'Orbit Guide',
                  description: 'Visual guide to orbital types, altitudes, and their applications.',
                  icon: '\u{1F6F0}\uFE0F',
                },
                {
                  href: '/career-guide',
                  title: 'Career Guide',
                  description: 'Explore career paths, skills, and opportunities in the space sector.',
                  icon: '\u{1F680}',
                },
                {
                  href: '/resources',
                  title: 'Resources Hub',
                  description: 'Curated links, data sources, and tools for space professionals.',
                  icon: '\u{1F517}',
                },
              ].map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="group bg-slate-800/50 border border-slate-700/50 rounded-xl p-5 hover:border-cyan-400/30 hover:bg-slate-800/70 transition-all duration-300"
                >
                  <div className="text-2xl mb-2">{link.icon}</div>
                  <h3 className="text-white font-semibold mb-1 group-hover:text-cyan-300 transition-colors">
                    {link.title}
                  </h3>
                  <p className="text-slate-400 text-sm">{link.description}</p>
                </Link>
              ))}
            </div>
          </div>
        </ScrollReveal>

        <RelatedModules modules={PAGE_RELATIONS['acronyms']} />
      </div>
    </div>
  );
}
