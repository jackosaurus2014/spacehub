'use client';

import React, { useState, useMemo, useRef, useCallback } from 'react';
import AnimatedPageHeader from '@/components/ui/AnimatedPageHeader';
import ScrollReveal from '@/components/ui/ScrollReveal';
import EmptyState from '@/components/ui/EmptyState';
import ShareButton from '@/components/ui/ShareButton';
import RelatedModules from '@/components/ui/RelatedModules';
import { PAGE_RELATIONS } from '@/lib/module-relationships';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Category =
  | 'Orbital Mechanics'
  | 'Propulsion'
  | 'Business'
  | 'Regulatory'
  | 'Communications'
  | 'Earth Observation'
  | 'Launch'
  | 'Spacecraft'
  | 'Space Environment'
  | 'Navigation & Tracking'
  | 'Exploration'
  | 'Defense & Security';

interface GlossaryTerm {
  term: string;
  definition: string;
  category: Category;
}

// ---------------------------------------------------------------------------
// Data  (69 terms, sorted alphabetically by term)
// ---------------------------------------------------------------------------

const GLOSSARY_TERMS: GlossaryTerm[] = [
  {
    term: 'Active Debris Removal (ADR)',
    definition:
      'Technologies and missions designed to physically capture and deorbit defunct satellites, spent rocket stages, and other large debris objects from Earth orbit. ADR approaches include robotic arms, harpoons, nets, magnetic capture, and laser ablation. Key programs include ESA\'s ClearSpace-1 mission (planned to remove a Vespa upper stage), Astroscale\'s ADRAS-J rendezvous and proximity operations demonstrator, and various DARPA-funded concepts. ADR is considered essential to preventing the Kessler Syndrome and maintaining the long-term sustainability of the orbital environment.',
    category: 'Space Environment',
  },
  {
    term: 'Apogee',
    definition:
      'The point in an elliptical orbit around Earth where the orbiting object is farthest from the planet. For satellites in geostationary transfer orbits, the apogee is typically near geostationary altitude (~35,786 km). Apogee kick motors are used to circularize the orbit at this altitude.',
    category: 'Orbital Mechanics',
  },
  {
    term: 'Artemis Accords',
    definition:
      'A set of bilateral agreements between the United States and partner nations establishing practical principles for the peaceful exploration and use of the Moon, Mars, and other celestial bodies. Rooted in the Outer Space Treaty of 1967, the Accords address topics such as transparency, interoperability, emergency assistance, registration of space objects, release of scientific data, protecting heritage sites, space resources, and deconfliction of activities.',
    category: 'Regulatory',
  },
  {
    term: 'Artemis Program',
    definition:
      'NASA\'s flagship lunar exploration program aimed at returning humans to the Moon and establishing a sustainable long-term presence. Artemis uses the Space Launch System (SLS) rocket and Orion spacecraft. Artemis I (2022) was an uncrewed test flight, Artemis II (2025) will carry astronauts around the Moon, and Artemis III will land the first woman and first person of color on the lunar surface using SpaceX\'s Starship HLS. The program also includes the Gateway lunar space station and international partnerships through the Artemis Accords.',
    category: 'Exploration',
  },
  {
    term: 'Cislunar Space',
    definition:
      'The region of space between Earth and the Moon, including lunar orbit. This volume is of growing strategic and commercial interest due to plans for lunar gateways, propellant depots, relay satellites, and resource extraction missions. Cislunar space extends roughly 384,400 km from Earth.',
    category: 'Exploration',
  },
  {
    term: 'CLPS (Commercial Lunar Payload Services)',
    definition:
      'A NASA program that contracts private companies to deliver science and technology payloads to the surface of the Moon. CLPS supports the Artemis program by enabling frequent, low-cost lunar access through commercial landers such as those built by Intuitive Machines, Astrobotic, and Firefly Aerospace.',
    category: 'Business',
  },
  {
    term: 'Commercial Crew',
    definition:
      'A NASA program that partners with private companies (SpaceX and Boeing) to develop and operate spacecraft capable of transporting astronauts to and from the International Space Station and low Earth orbit. The program shifted human spaceflight from government-owned vehicles to commercially built and operated systems.',
    category: 'Business',
  },
  {
    term: 'Conjunction Assessment',
    definition:
      'The process of predicting close approaches between orbiting objects and evaluating the probability of collision. Conjunction assessments are performed by the 18th Space Defense Squadron (U.S. Space Force) and commercial providers. Operators receive Conjunction Data Messages (CDMs) and must decide whether to execute an avoidance maneuver.',
    category: 'Defense & Security',
  },
  {
    term: 'Constellation',
    definition:
      'A coordinated group of satellites working together as a system to provide continuous or near-continuous coverage of a region or the entire globe. Examples include GPS (navigation), Iridium (communications), and Planet Labs (Earth observation). Constellation design involves selecting orbital planes, altitudes, and phasing to achieve coverage goals.',
    category: 'Spacecraft',
  },
  {
    term: 'Coronal Mass Ejection (CME)',
    definition:
      'A massive expulsion of magnetized plasma from the Sun\'s corona into the solar wind. CMEs that impact Earth can cause geomagnetic storms, disrupt satellite electronics, degrade GPS accuracy, induce currents in power grids, and increase radiation exposure for astronauts. Travel time from Sun to Earth is typically 1-3 days.',
    category: 'Space Environment',
  },
  {
    term: 'CRADA (Cooperative Research and Development Agreement)',
    definition:
      'A legal agreement between a federal laboratory (e.g., NASA, AFRL) and one or more non-federal parties to collaborate on research and development. CRADAs allow the government to contribute personnel, facilities, equipment, and intellectual property while the partner contributes funding, personnel, or materials. They protect proprietary information and give partners preferential licensing rights.',
    category: 'Business',
  },
  {
    term: 'CubeSat',
    definition:
      'A class of miniaturized satellite built in standard units (U) of 10 cm x 10 cm x 10 cm, where 1U has a mass of approximately 1.33 kg. Common form factors include 1U, 3U, 6U, and 12U. Originally developed for university education, CubeSats are now used for commercial Earth observation, IoT connectivity, technology demonstration, and scientific research.',
    category: 'Spacecraft',
  },
  {
    term: 'Commercial Space Station',
    definition:
      'A privately developed and operated orbital habitat designed to succeed the International Space Station (ISS), which is scheduled for deorbit around 2030. NASA\'s Commercial LEO Destinations (CLD) program has awarded contracts to Axiom Space, Vast, Blue Origin (Orbital Reef), and Starlab (a Voyager Space and Airbus venture). These stations will serve government astronauts, private researchers, and space tourists, creating a new commercial market for microgravity services valued at an estimated $8-12 billion annually.',
    category: 'Business',
  },
  {
    term: 'Delta-V',
    definition:
      'A scalar measure of the change in velocity required to perform a specific orbital maneuver, expressed in meters per second (m/s). Delta-V budgets are fundamental to mission design and determine how much propellant a spacecraft needs. For example, reaching LEO from Earth\'s surface requires roughly 9,400 m/s of delta-V.',
    category: 'Orbital Mechanics',
  },
  {
    term: 'Direct-to-Device (D2D)',
    definition:
      'A satellite connectivity architecture that enables standard, unmodified smartphones and IoT devices to communicate directly with orbiting satellites without requiring specialized ground hardware. D2D services provide emergency SOS messaging, basic text connectivity, and increasingly voice and broadband data in areas without terrestrial cell coverage. Key players include AST SpaceMobile (broadband from space), SpaceX/T-Mobile (Starlink direct-to-cell), and Apple/Globalstar (emergency SOS on iPhones). D2D is considered the next major frontier in satellite communications.',
    category: 'Communications',
  },
  {
    term: 'Deorbit',
    definition:
      'A deliberate maneuver to lower a spacecraft\'s orbit so that it re-enters Earth\'s atmosphere and either burns up or lands in a controlled manner (typically in the South Pacific Oceanic Uninhabited Area). Deorbiting is a critical component of space debris mitigation guidelines, which recommend disposal within 5 years of mission end (updated from 25 years).',
    category: 'Orbital Mechanics',
  },
  {
    term: 'Electric Propulsion',
    definition:
      'A class of spacecraft propulsion systems that use electrical energy to accelerate propellant, achieving much higher specific impulse (1,500-10,000+ seconds) than chemical rockets but at lower thrust levels. Major types include Hall-effect thrusters (used by Starlink satellites and Maxar spacecraft), gridded ion engines (Dawn, GOCE), pulsed plasma thrusters, and electrospray systems. Electric propulsion is the dominant technology for station-keeping, orbit raising, and deep-space missions, dramatically reducing propellant mass requirements.',
    category: 'Propulsion',
  },
  {
    term: 'EAR (Export Administration Regulations)',
    definition:
      'U.S. Department of Commerce regulations that control the export of commercial and dual-use items, including certain satellite components, ground equipment, and space-related technologies listed on the Commerce Control List (CCL). EAR applies to items not covered by ITAR and uses the Entity List to restrict exports to specific foreign parties.',
    category: 'Regulatory',
  },
  {
    term: 'FCC Licensing',
    definition:
      'The process by which the U.S. Federal Communications Commission authorizes the use of radio frequencies for space and Earth stations. FCC licenses are required for satellite uplinks, downlinks, and inter-satellite links. The FCC also imposes orbital debris mitigation requirements as part of the licensing process, including a bond or insurance for deorbit compliance.',
    category: 'Regulatory',
  },
  {
    term: 'GEO (Geostationary Earth Orbit)',
    definition:
      'A circular equatorial orbit at approximately 35,786 km altitude where a satellite\'s orbital period matches Earth\'s rotation (23 hours 56 minutes). Satellites in GEO appear stationary relative to a ground observer, making this orbit ideal for communications, weather monitoring, and missile early warning. The GEO belt is a limited and highly regulated resource.',
    category: 'Orbital Mechanics',
  },
  {
    term: 'Geofencing',
    definition:
      'A technique used in Earth observation and satellite imagery to restrict data collection, processing, or distribution over specific geographic areas. Geofencing may be applied for regulatory compliance, national security requirements, or customer-specific data policies. It is also used in satellite-based IoT for location-triggered alerts.',
    category: 'Earth Observation',
  },
  {
    term: 'Graveyard Orbit',
    definition:
      'A disposal orbit several hundred kilometers above the geostationary belt (typically GEO + 300 km) where decommissioned GEO satellites are moved at end of life. This keeps the valuable GEO belt clear of defunct spacecraft. The maneuver to reach graveyard orbit requires approximately 11 m/s of delta-V.',
    category: 'Orbital Mechanics',
  },
  {
    term: 'Ground Station',
    definition:
      'A facility on Earth\'s surface equipped with antennas, receivers, transmitters, and data processing equipment used to communicate with satellites and other spacecraft. Ground station networks (e.g., AWS Ground Station, KSAT, SSC) provide telemetry, tracking, command (TT&C), and data downlink services. The ground segment is often the bottleneck in satellite operations.',
    category: 'Communications',
  },
  {
    term: 'HEO (Highly Elliptical Orbit)',
    definition:
      'An orbit with a high eccentricity, resulting in a very low perigee and a very high apogee. Satellites in HEO spend most of their orbital period near apogee, providing extended coverage over high-latitude regions. Notable HEO types include Molniya orbits (63.4 deg inclination, ~12-hour period) and Tundra orbits (~24-hour period).',
    category: 'Orbital Mechanics',
  },
  {
    term: 'Hohmann Transfer',
    definition:
      'A fuel-efficient orbital transfer maneuver that moves a spacecraft between two circular orbits using two engine burns. The first burn places the spacecraft into an elliptical transfer orbit, and the second burn circularizes at the destination altitude. While not the fastest method, the Hohmann transfer requires the minimum delta-V for coplanar orbit changes.',
    category: 'Orbital Mechanics',
  },
  {
    term: 'In-Situ Resource Utilization (ISRU)',
    definition:
      'The practice of harvesting and processing materials found at an exploration site (Moon, Mars, asteroids) rather than transporting them from Earth. Key ISRU concepts include extracting water ice from lunar regolith for propellant production, manufacturing oxygen from the Martian atmosphere (demonstrated by MOXIE on Perseverance), and using regolith for construction materials.',
    category: 'Exploration',
  },
  {
    term: 'Inclination',
    definition:
      'The angle between a satellite\'s orbital plane and Earth\'s equatorial plane, measured in degrees. An inclination of 0 deg is equatorial, 90 deg is polar, and values greater than 90 deg indicate a retrograde orbit. Inclination determines the range of latitudes a satellite can observe or serve. Changing inclination is one of the most delta-V-expensive maneuvers.',
    category: 'Orbital Mechanics',
  },
  {
    term: 'ITAR (International Traffic in Arms Regulations)',
    definition:
      'U.S. State Department regulations administered by the Directorate of Defense Trade Controls (DDTC) that control the export and temporary import of defense articles and services on the U.S. Munitions List. Many satellites, launch vehicles, and their components are ITAR-controlled. Violations can result in civil penalties up to $500,000 per violation and criminal penalties including imprisonment.',
    category: 'Regulatory',
  },
  {
    term: 'ITU Filing',
    definition:
      'The process of registering satellite frequency assignments and orbital positions with the International Telecommunication Union, a United Nations specialized agency. ITU filings are necessary to secure international recognition of spectrum rights and to coordinate with other satellite operators to avoid harmful interference. The process can take 7+ years.',
    category: 'Regulatory',
  },
  {
    term: 'Ka-band',
    definition:
      'A portion of the microwave electromagnetic spectrum (26.5-40 GHz) increasingly used for high-throughput satellite communications. Ka-band supports higher data rates than Ku-band but is more susceptible to rain fade (signal attenuation due to precipitation). Used extensively by HTS (High Throughput Satellite) systems and LEO broadband constellations like Starlink.',
    category: 'Communications',
  },
  {
    term: 'Kessler Syndrome',
    definition:
      'A theoretical scenario proposed by NASA scientist Donald Kessler in 1978, in which the density of orbital debris in LEO becomes high enough that collisions between objects generate more fragments, creating a cascading chain reaction. This runaway effect could render certain orbital regimes unusable for generations. Active debris removal and responsible operations are aimed at preventing this outcome.',
    category: 'Space Environment',
  },
  {
    term: 'Ku-band',
    definition:
      'A portion of the microwave electromagnetic spectrum (12-18 GHz) widely used for satellite television broadcasting (DTH), maritime and aviation connectivity, and VSAT (Very Small Aperture Terminal) communications. Ku-band offers a balance between bandwidth capacity and rain-fade resilience, making it the workhorse of traditional satellite communications.',
    category: 'Communications',
  },
  {
    term: 'L-band',
    definition:
      'A portion of the microwave electromagnetic spectrum (1-2 GHz) used for mobile satellite services, GPS navigation signals, and satellite radio. L-band signals penetrate foliage and buildings better than higher frequencies, making the band ideal for handheld and mobile applications. Inmarsat and Iridium operate primarily in L-band.',
    category: 'Communications',
  },
  {
    term: 'Lagrange Points',
    definition:
      'Five positions (L1-L5) in a two-body gravitational system (e.g., Sun-Earth or Earth-Moon) where a small object can maintain a stable or semi-stable position relative to the two larger bodies. L1 is used for solar observation (SOHO, DSCOVR), L2 for deep-space telescopes (JWST), and L4/L5 are stable equilibrium points considered for future space stations or depots.',
    category: 'Orbital Mechanics',
  },
  {
    term: 'LEO (Low Earth Orbit)',
    definition:
      'An orbit with an altitude between approximately 160 km and 2,000 km above Earth\'s surface. LEO is the most accessible and densely populated orbital regime, hosting the ISS, Earth observation satellites, broadband mega-constellations, and scientific missions. Orbital periods in LEO range from about 88 to 127 minutes. Objects in LEO experience atmospheric drag that naturally decays their orbits.',
    category: 'Orbital Mechanics',
  },
  {
    term: 'Maneuver Planning',
    definition:
      'The process of calculating and scheduling orbital maneuvers for a spacecraft, including station-keeping, collision avoidance, orbit raising/lowering, and phasing. Maneuver planning accounts for propellant budgets, thruster performance, orbital mechanics constraints, conjunction assessments, and operational windows. Autonomous maneuver planning is increasingly used in large constellations.',
    category: 'Orbital Mechanics',
  },
  {
    term: 'Mega-Constellation',
    definition:
      'A satellite constellation consisting of hundreds to thousands of spacecraft, typically in LEO, designed to provide global broadband internet, IoT connectivity, or persistent Earth observation. Notable mega-constellations include Starlink (SpaceX, 6,000+ deployed), OneWeb (648 satellites), and Amazon Kuiper (planned 3,236 satellites). They raise concerns about orbital debris, light pollution, and radio frequency interference.',
    category: 'Spacecraft',
  },
  {
    term: 'MEO (Medium Earth Orbit)',
    definition:
      'An orbit with an altitude between LEO (2,000 km) and GEO (35,786 km). MEO is primarily used for navigation satellite constellations (GPS at ~20,200 km, Galileo at ~23,222 km, GLONASS at ~19,130 km) and some communications constellations (O3b/SES mPOWER at ~8,062 km). MEO offers a balance between coverage area and signal latency.',
    category: 'Orbital Mechanics',
  },
  {
    term: 'Multispectral Imaging',
    definition:
      'An Earth observation technique that captures image data at multiple specific wavelengths across the electromagnetic spectrum (typically 3-10 bands in visible, near-infrared, and shortwave infrared). Used for agriculture monitoring, environmental assessment, mineral exploration, and defense applications. Differs from hyperspectral imaging, which uses hundreds of contiguous narrow bands.',
    category: 'Earth Observation',
  },
  {
    term: 'NORAD (North American Aerospace Defense Command)',
    definition:
      'A bi-national U.S.-Canadian military organization responsible for aerospace warning, aerospace control, and maritime warning for North America. In the space domain, NORAD (via the 18th Space Defense Squadron) maintains the public catalog of tracked space objects and provides conjunction assessment services to satellite operators worldwide.',
    category: 'Defense & Security',
  },
  {
    term: 'On-Orbit Servicing (OOS)',
    definition:
      'The capability to inspect, refuel, repair, upgrade, or reposition satellites and other spacecraft while in orbit, extending their operational lifetime and reducing the need for costly replacements. Technologies include robotic arms, autonomous docking, and in-space refueling. Key programs include Northrop Grumman\'s Mission Extension Vehicle (MEV), which has successfully docked with and extended the life of GEO satellites, Astroscale\'s ELSA-d debris removal demonstrator, and DARPA\'s RSGS program. OOS is a rapidly growing market projected to reach $4.5 billion by 2030.',
    category: 'Spacecraft',
  },
  {
    term: 'Orbital Period',
    definition:
      'The time a satellite takes to complete one full orbit around Earth. Orbital period is determined by the semi-major axis of the orbit per Kepler\'s third law. A satellite in LEO at 400 km has a period of about 92 minutes, while a GEO satellite has a period of 23 hours 56 minutes (one sidereal day). Orbital period is a fundamental parameter in constellation design.',
    category: 'Orbital Mechanics',
  },
  {
    term: 'Payload Fairing',
    definition:
      'The protective nose cone structure at the top of a launch vehicle that shields the spacecraft payload from aerodynamic forces, heating, and acoustic vibrations during ascent through the atmosphere. Fairings are jettisoned once the vehicle reaches the vacuum of space (typically at 110-130 km altitude). SpaceX recovers and reuses fairings to reduce launch costs.',
    category: 'Launch',
  },
  {
    term: 'Perigee',
    definition:
      'The point in an elliptical orbit around Earth where the orbiting object is closest to the planet. In a transfer orbit, the perigee is at the lower altitude. Perigee altitude is critical for atmospheric drag calculations and determines whether a spacecraft will experience significant orbital decay. Extremely low perigees (below ~160 km) lead to rapid re-entry.',
    category: 'Orbital Mechanics',
  },
  {
    term: 'Radiation Hardening',
    definition:
      'The process of designing and manufacturing electronic components and systems to withstand the ionizing radiation environment of space, including galactic cosmic rays, solar particle events, and trapped radiation in the Van Allen belts. Techniques include using silicon-on-insulator (SOI) substrates, redundant circuits (triple modular redundancy), error-correcting codes, and shielding.',
    category: 'Spacecraft',
  },
  {
    term: 'Reusability',
    definition:
      'The design philosophy and engineering practice of building launch vehicle stages, fairings, or spacecraft to be flown multiple times rather than discarded after a single use. SpaceX\'s Falcon 9 first stage has demonstrated over 20 flights on a single booster. Reusability dramatically reduces launch costs and is a key enabler of the modern commercial space economy.',
    category: 'Launch',
  },
  {
    term: 'Rideshare',
    definition:
      'A launch arrangement where multiple payloads from different customers share a single launch vehicle, significantly reducing per-kilogram launch costs. Dedicated rideshare programs (e.g., SpaceX Transporter, ISRO PSLV rideshare) deploy dozens of smallsats on a single mission. Payload adapters and deployers like those from D-Orbit and Exolaunch facilitate rideshare logistics.',
    category: 'Launch',
  },
  {
    term: 'S-band',
    definition:
      'A portion of the microwave electromagnetic spectrum (2-4 GHz) used for telemetry, tracking, and command (TT&C) communications with spacecraft, weather radar, and some mobile satellite services. S-band is commonly used for housekeeping data links due to its reliability and relatively simple ground equipment requirements.',
    category: 'Communications',
  },
  {
    term: 'SAR (Synthetic Aperture Radar)',
    definition:
      'An active remote sensing technique that uses radar pulses from a moving platform (satellite or aircraft) to create high-resolution 2D or 3D images of Earth\'s surface. SAR operates day and night and can penetrate clouds, smoke, and certain ground cover. Applications include maritime surveillance, change detection, subsidence monitoring, ice mapping, and defense intelligence. Notable SAR operators include Capella Space, ICEYE, and Umbra.',
    category: 'Earth Observation',
  },
  {
    term: 'SBIR/STTR',
    definition:
      'Small Business Innovation Research (SBIR) and Small Business Technology Transfer (STTR) are U.S. government programs that reserve a percentage of federal R&D funding for small businesses. Phase I awards (~$150K) fund feasibility studies, Phase II (~$1M) funds prototype development, and Phase III involves commercialization. NASA, DoD, and other agencies offer SBIR/STTR topics relevant to space technology.',
    category: 'Business',
  },
  {
    term: 'Smallsat',
    definition:
      'A general term for satellites with a mass under 500 kg, encompassing categories such as minisats (100-500 kg), microsats (10-100 kg), nanosats (1-10 kg, including CubeSats), and picosats (under 1 kg). The smallsat revolution has been driven by miniaturized electronics, commercial off-the-shelf (COTS) components, and reduced launch costs.',
    category: 'Spacecraft',
  },
  {
    term: 'Solar Flare',
    definition:
      'A sudden, intense burst of electromagnetic radiation from the Sun\'s atmosphere caused by the release of magnetic energy associated with sunspot activity. Solar flares are classified by X-ray peak flux: A, B, C, M (moderate), and X (extreme). Large flares can cause radio blackouts, degrade GPS accuracy, and increase radiation doses for astronauts and high-altitude aviators within minutes.',
    category: 'Space Environment',
  },
  {
    term: 'Space Economy',
    definition:
      'The full range of commercial, governmental, and academic activities that generate value from space-related resources, infrastructure, and data. The global space economy was valued at approximately $626 billion in 2025, with commercial activities accounting for roughly 80% of total revenue. Major segments include satellite communications, Earth observation, launch services, ground equipment manufacturing, space tourism, and downstream data analytics. Investment banks and consulting firms project the space economy will surpass $1 trillion by 2030-2035, driven by mega-constellations, in-space manufacturing, and cislunar commerce.',
    category: 'Business',
  },
  {
    term: 'Space Act Agreement',
    definition:
      'A legal instrument authorized by the Space Act of 1958 that allows NASA to enter into agreements with other government agencies, private companies, academic institutions, and international organizations. Funded Space Act Agreements (SAAs) involve NASA funding to the partner; unfunded SAAs involve no exchange of funds; reimbursable SAAs involve the partner funding NASA. The Commercial Crew and CLPS programs use SAAs.',
    category: 'Business',
  },
  {
    term: 'Space Tourism',
    definition:
      'Commercial human spaceflight experiences offered to private individuals, ranging from brief suborbital flights to multi-day orbital missions and planned lunar flybys. Blue Origin\'s New Shepard and Virgin Galactic\'s SpaceShipTwo provide suborbital flights reaching the edge of space (80-100 km altitude) for approximately $250,000-$450,000 per seat. SpaceX has conducted orbital tourism missions (Inspiration4, Polaris Dawn) and plans lunar flybys with Starship. Axiom Space arranges private astronaut missions to the ISS. The space tourism market is projected to grow to $8 billion annually by 2030.',
    category: 'Business',
  },
  {
    term: 'Space Debris',
    definition:
      'Non-functional human-made objects in Earth orbit, including spent rocket stages, defunct satellites, fragments from collisions or explosions, and mission-related debris (lens caps, thermal blankets, paint flakes). As of 2024, approximately 36,500 objects larger than 10 cm are tracked, with an estimated 130 million fragments larger than 1 mm. Debris travels at 7-8 km/s in LEO, making even millimeter-sized particles hazardous.',
    category: 'Space Environment',
  },
  {
    term: 'Space Situational Awareness (SSA)',
    definition:
      'The knowledge and characterization of the space environment, including the location and behavior of natural and human-made objects in orbit. SSA encompasses space surveillance (tracking objects), space weather monitoring, and near-Earth object detection. Both government (U.S. Space Force, EU SST) and commercial providers (LeoLabs, ExoAnalytic) contribute to the SSA ecosystem.',
    category: 'Defense & Security',
  },
  {
    term: 'Space Weather',
    definition:
      'Conditions in the space environment driven by solar activity, including solar wind variations, geomagnetic storms, solar energetic particle events, and ionospheric disturbances. Space weather affects satellite operations (charging, drag, single-event upsets), communications (HF blackouts, GPS scintillation), power grids (geomagnetically induced currents), and human spaceflight (radiation exposure).',
    category: 'Space Environment',
  },
  {
    term: 'Spaceflight Safety',
    definition:
      'The discipline encompassing all practices, regulations, and technologies aimed at protecting human life, spacecraft, and the orbital environment during space missions. This includes launch range safety (flight termination systems, exclusion zones), crew safety (abort systems, life support redundancy), and orbital safety (conjunction assessment, collision avoidance maneuvers). The FAA\'s Office of Commercial Space Transportation (AST) oversees launch and re-entry safety for U.S. commercial missions, while NASA maintains human-rating standards for crewed vehicles.',
    category: 'Regulatory',
  },
  {
    term: 'Specific Impulse (Isp)',
    definition:
      'A measure of propulsion efficiency defined as the thrust produced per unit weight of propellant consumed per second, expressed in seconds. Higher Isp means more efficient propellant use. Chemical rockets achieve 200-460s (hydrolox engines like RS-25 reach ~450s), ion thrusters achieve 1,500-10,000s, and Hall-effect thrusters typically achieve 1,500-3,000s. Isp is the single most important metric for comparing propulsion systems.',
    category: 'Propulsion',
  },
  {
    term: 'Spectrum Allocation',
    definition:
      'The process by which national regulators (e.g., FCC in the U.S., Ofcom in the UK) and international bodies (ITU) designate specific portions of the radio frequency spectrum for particular uses, such as satellite communications, Earth exploration, radio astronomy, or mobile services. Spectrum is a finite and increasingly contested resource, with growing demand from LEO mega-constellations and terrestrial 5G networks.',
    category: 'Regulatory',
  },
  {
    term: 'SSO (Sun-Synchronous Orbit)',
    definition:
      'A near-polar, slightly retrograde orbit (typically 97-99 deg inclination, 600-800 km altitude) in which the orbital plane precesses at the same rate as Earth orbits the Sun, maintaining a consistent angle between the orbital plane and the Sun. This ensures consistent lighting conditions for Earth observation, making SSO the preferred orbit for optical imaging, environmental monitoring, and meteorological satellites.',
    category: 'Orbital Mechanics',
  },
  {
    term: 'Starship',
    definition:
      'SpaceX\'s fully reusable, super-heavy-lift launch system consisting of the Super Heavy first-stage booster and the Starship upper stage/spacecraft. Standing approximately 121 meters tall, it is the largest and most powerful rocket ever built, with a payload capacity of 100-150 tonnes to low Earth orbit. Starship is powered by Raptor engines burning liquid methane and liquid oxygen. It is designed for a wide range of missions including Starlink deployment, lunar landings (NASA HLS contract for Artemis), Mars colonization, point-to-point Earth transport, and in-space refueling. SpaceX has conducted multiple test flights from Starbase in Boca Chica, Texas.',
    category: 'Launch',
  },
  {
    term: 'Stage Separation',
    definition:
      'The event during a launch vehicle\'s ascent when a spent propulsion stage is jettisoned to reduce mass, allowing the next stage to ignite and continue accelerating the payload toward orbit. Stage separation is a critical and high-risk phase of launch, involving pyrotechnic bolts, pneumatic pushers, or cold-gas separation systems. Modern vehicles like Falcon 9 use cold-gas thrusters for clean separation.',
    category: 'Launch',
  },
  {
    term: 'Thrust-to-Weight Ratio',
    definition:
      'A dimensionless ratio of an engine\'s thrust to the weight of the vehicle (or engine) it propels, indicating the vehicle\'s ability to accelerate. A TWR greater than 1.0 is required for liftoff from a planetary surface. The Saturn V had a liftoff TWR of about 1.2, while the Space Shuttle had approximately 1.5. Higher TWR allows more aggressive ascent trajectories but may increase structural loads.',
    category: 'Propulsion',
  },
  {
    term: 'TLE (Two-Line Element Set)',
    definition:
      'A standardized data format encoding the orbital elements of an Earth-orbiting object at a given epoch. TLEs are published by the 18th Space Defense Squadron and distributed via Space-Track.org. Each TLE contains the NORAD catalog number, classification, epoch, mean motion derivatives, drag term (B*), inclination, RAAN, eccentricity, argument of perigee, mean anomaly, and mean motion. TLEs are used with the SGP4 propagation model.',
    category: 'Navigation & Tracking',
  },
  {
    term: 'Uplink / Downlink',
    definition:
      'Uplink refers to the radio frequency signal transmitted from a ground station (or user terminal) to a satellite, while downlink refers to the signal transmitted from the satellite back to Earth. Uplink and downlink typically use different frequency bands to avoid interference. The downlink capacity is often the constraining factor in satellite communication system design.',
    category: 'Communications',
  },
  {
    term: 'Van Allen Belts',
    definition:
      'Two donut-shaped zones of energetically charged particles (protons and electrons) trapped by Earth\'s magnetic field. The inner belt (1,000-6,000 km) contains high-energy protons, while the outer belt (13,000-60,000 km) is dominated by high-energy electrons. Spacecraft transiting or dwelling in the Van Allen belts require radiation hardening. The belts were discovered in 1958 by James Van Allen using Explorer 1 data.',
    category: 'Space Environment',
  },
  {
    term: 'X-band',
    definition:
      'A portion of the microwave electromagnetic spectrum (8-12 GHz) used by military satellite communications, deep-space communications (NASA DSN), high-resolution SAR imaging, and weather radar. X-band offers a good balance between antenna size, atmospheric propagation, and bandwidth. It is the primary band for government and defense SATCOM systems worldwide.',
    category: 'Communications',
  },
];

// ---------------------------------------------------------------------------
// Category configuration (colors for filter chips and tags)
// ---------------------------------------------------------------------------

const CATEGORY_COLORS: Record<Category, { bg: string; text: string; border: string; chip: string }> = {
  'Orbital Mechanics': {
    bg: 'bg-blue-500/10',
    text: 'text-blue-400',
    border: 'border-blue-500/30',
    chip: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
  },
  Propulsion: {
    bg: 'bg-orange-500/10',
    text: 'text-orange-400',
    border: 'border-orange-500/30',
    chip: 'bg-orange-500/20 text-orange-300 border-orange-500/40',
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
  Communications: {
    bg: 'bg-purple-500/10',
    text: 'text-purple-400',
    border: 'border-purple-500/30',
    chip: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
  },
  'Earth Observation': {
    bg: 'bg-teal-500/10',
    text: 'text-teal-400',
    border: 'border-teal-500/30',
    chip: 'bg-teal-500/20 text-teal-300 border-teal-500/40',
  },
  Launch: {
    bg: 'bg-red-500/10',
    text: 'text-red-400',
    border: 'border-red-500/30',
    chip: 'bg-red-500/20 text-red-300 border-red-500/40',
  },
  Spacecraft: {
    bg: 'bg-white/5',
    text: 'text-slate-300',
    border: 'border-white/10',
    chip: 'bg-white/10 text-white/90 border-white/15',
  },
  'Space Environment': {
    bg: 'bg-yellow-500/10',
    text: 'text-yellow-400',
    border: 'border-yellow-500/30',
    chip: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40',
  },
  'Navigation & Tracking': {
    bg: 'bg-indigo-500/10',
    text: 'text-indigo-400',
    border: 'border-indigo-500/30',
    chip: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40',
  },
  Exploration: {
    bg: 'bg-pink-500/10',
    text: 'text-pink-400',
    border: 'border-pink-500/30',
    chip: 'bg-pink-500/20 text-pink-300 border-pink-500/40',
  },
  'Defense & Security': {
    bg: 'bg-slate-500/10',
    text: 'text-slate-300',
    border: 'border-slate-400/30',
    chip: 'bg-slate-500/20 text-slate-300 border-slate-400/40',
  },
};

// All unique categories from the data
const ALL_CATEGORIES: Category[] = Array.from(
  new Set(GLOSSARY_TERMS.map((t) => t.category))
).sort() as Category[];

// Alphabet
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function GlossaryPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [expandedTerms, setExpandedTerms] = useState<Set<string>>(new Set());

  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

  // Toggle a term's expanded state
  const toggleTerm = useCallback((term: string) => {
    setExpandedTerms((prev) => {
      const next = new Set(prev);
      if (next.has(term)) {
        next.delete(term);
      } else {
        next.add(term);
      }
      return next;
    });
  }, []);

  // Filtered and grouped terms
  const filteredGrouped = useMemo(() => {
    const lowerQuery = searchQuery.toLowerCase();

    const filtered = GLOSSARY_TERMS.filter((t) => {
      const matchesSearch =
        !searchQuery ||
        t.term.toLowerCase().includes(lowerQuery) ||
        t.definition.toLowerCase().includes(lowerQuery);
      const matchesCategory = !selectedCategory || t.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });

    // Group by first letter
    const grouped: Record<string, GlossaryTerm[]> = {};
    for (const term of filtered) {
      const letter = term.term[0].toUpperCase();
      if (!grouped[letter]) grouped[letter] = [];
      grouped[letter].push(term);
    }

    return grouped;
  }, [searchQuery, selectedCategory]);

  // Letters that have terms
  const activeLetters = useMemo(() => new Set(Object.keys(filteredGrouped)), [filteredGrouped]);

  // Total visible count
  const visibleCount = useMemo(
    () => Object.values(filteredGrouped).reduce((sum, arr) => sum + arr.length, 0),
    [filteredGrouped]
  );

  // Scroll to letter section
  const scrollToLetter = useCallback((letter: string) => {
    const el = sectionRefs.current[letter];
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a0a0a] via-[#0a0a0a] to-black">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* ---- Header ---- */}
        <div className="flex items-start justify-between gap-4">
          <AnimatedPageHeader
            title="Space Industry Glossary"
            subtitle="A comprehensive reference of key terms, acronyms, and concepts used across the global space industry — from orbital mechanics to regulatory frameworks."
            icon={<span className="text-4xl">&#128218;</span>}
            breadcrumb="Resources"
            accentColor="cyan"
          />
          <ShareButton
            title="Space Industry Glossary - SpaceNexus"
            url="https://spacenexus.us/glossary"
            description="A comprehensive reference of key terms, acronyms, and concepts used across the global space industry."
            className="mt-2 flex-shrink-0"
          />
        </div>

        {/* ---- Search & Filter ---- */}
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
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search terms or definitions..."
                className="w-full pl-12 pr-4 py-3 bg-white/[0.04] border border-white/[0.06] rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-white/10 transition-all"
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
                    ? 'bg-white/10 text-white/90 border-white/15 shadow-lg shadow-black/5'
                    : 'bg-white/[0.04] text-slate-400 border-white/[0.06] hover:border-white/[0.1] hover:text-slate-300'
                }`}
              >
                All ({GLOSSARY_TERMS.length})
              </button>
              {ALL_CATEGORIES.map((cat) => {
                const count = GLOSSARY_TERMS.filter((t) => t.category === cat).length;
                const colors = CATEGORY_COLORS[cat];
                const isActive = selectedCategory === cat;
                return (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(isActive ? null : cat)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
                      isActive
                        ? `${colors.chip} shadow-lg`
                        : 'bg-white/[0.04] text-slate-400 border-white/[0.06] hover:border-white/[0.1] hover:text-slate-300'
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
              <span className="text-slate-300 font-semibold">{visibleCount}</span> of{' '}
              <span className="text-slate-300">{GLOSSARY_TERMS.length}</span> terms
            </p>
          </div>
        </ScrollReveal>

        {/* ---- A-Z Letter Navigation ---- */}
        <ScrollReveal delay={0.15}>
          <nav
            aria-label="Alphabetical navigation"
            className="mb-8 sticky top-0 z-10 bg-[#0a0a0a]/95 backdrop-blur-sm py-3 -mx-4 px-4 sm:-mx-6 sm:px-6 border-b border-white/[0.04]"
          >
            <div className="flex flex-wrap gap-1 justify-center">
              {ALPHABET.map((letter) => {
                const hasTerms = activeLetters.has(letter);
                return (
                  <button
                    key={letter}
                    onClick={() => hasTerms && scrollToLetter(letter)}
                    disabled={!hasTerms}
                    className={`w-9 h-9 rounded-lg text-sm font-bold flex items-center justify-center transition-all ${
                      hasTerms
                        ? 'bg-white/[0.04] text-slate-300 border border-white/[0.06] hover:bg-slate-100/20 hover:border-white/10 hover:shadow-lg hover:shadow-black/20 cursor-pointer'
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

        {/* ---- Glossary Sections ---- */}
        <div className="space-y-10">
          {ALPHABET.map((letter) => {
            const terms = filteredGrouped[letter];
            if (!terms || terms.length === 0) return null;

            return (
              <section
                key={letter}
                ref={(el) => {
                  sectionRefs.current[letter] = el;
                }}
                aria-label={`Terms starting with ${letter}`}
              >
                {/* Letter heading */}
                <ScrollReveal>
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-br from-slate-300 to-blue-500 leading-none">
                      {letter}
                    </span>
                    <div className="flex-1 h-px bg-gradient-to-r from-white/30 to-transparent" />
                    <span className="text-xs text-slate-500 font-medium">
                      {terms.length} term{terms.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                </ScrollReveal>

                {/* Term cards */}
                <div className="space-y-3">
                  {terms.map((item, idx) => {
                    const isExpanded = expandedTerms.has(item.term);
                    const colors = CATEGORY_COLORS[item.category];

                    return (
                      <ScrollReveal key={item.term} delay={idx * 0.03}>
                        <div
                          className={`group rounded-xl border transition-all duration-300 ${
                            isExpanded
                              ? 'bg-white/[0.06] border-white/10 shadow-lg shadow-black/20'
                              : 'bg-white/[0.04] border-white/[0.06] hover:border-white/10 hover:bg-white/[0.06]'
                          }`}
                        >
                          <button
                            onClick={() => toggleTerm(item.term)}
                            className="w-full text-left px-5 py-4 flex items-center gap-4"
                            aria-expanded={isExpanded}
                          >
                            {/* Expand/collapse chevron */}
                            <svg
                              className={`w-5 h-5 text-slate-400 transition-transform duration-300 flex-shrink-0 ${
                                isExpanded ? 'rotate-90 text-slate-300' : 'group-hover:text-white'
                              }`}
                              fill="none"
                              viewBox="0 0 24 24"
                              strokeWidth={2}
                              stroke="currentColor"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                            </svg>

                            {/* Term name */}
                            <span className="text-white font-semibold text-lg flex-1 group-hover:text-white transition-colors">
                              {item.term}
                            </span>

                            {/* Category tag */}
                            <span
                              className={`hidden sm:inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium border ${colors.bg} ${colors.text} ${colors.border}`}
                            >
                              {item.category}
                            </span>
                          </button>

                          {/* Expandable definition */}
                          <div
                            className={`overflow-hidden transition-all duration-300 ${
                              isExpanded ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'
                            }`}
                          >
                            <div className="px-5 pb-4 pl-14">
                              <p className="text-slate-300 leading-relaxed">{item.definition}</p>
                              {/* Mobile category tag */}
                              <span
                                className={`sm:hidden inline-flex mt-3 px-2.5 py-0.5 rounded-full text-xs font-medium border ${colors.bg} ${colors.text} ${colors.border}`}
                              >
                                {item.category}
                              </span>
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
          <EmptyState
            icon={<span className="text-4xl">🔍</span>}
            title="No terms found"
            description="Try adjusting your search query or clearing the category filter to see more results."
            action={
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory(null);
                }}
                className="px-4 py-2 rounded-lg bg-white/10 text-white/90 border border-white/15 hover:bg-slate-100/30 transition-all text-sm font-medium"
              >
                Reset filters
              </button>
            }
          />
        )}

        {/* ---- Footer stats ---- */}
        <ScrollReveal delay={0.1}>
          <div className="mt-16 mb-8 pt-8 border-t border-white/[0.04]">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: 'Total Terms', value: GLOSSARY_TERMS.length, color: 'text-slate-300' },
                { label: 'Categories', value: ALL_CATEGORIES.length, color: 'text-purple-400' },
                {
                  label: 'Letters Covered',
                  value: new Set(GLOSSARY_TERMS.map((t) => t.term[0].toUpperCase())).size,
                  color: 'text-emerald-400',
                },
                {
                  label: 'Avg. Definition',
                  value: `${Math.round(
                    GLOSSARY_TERMS.reduce((s, t) => s + t.definition.split(' ').length, 0) /
                      GLOSSARY_TERMS.length
                  )} words`,
                  color: 'text-amber-400',
                },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="card p-4 text-center hover:border-white/10"
                >
                  <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
                  <div className="text-xs text-slate-400 mt-1">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </ScrollReveal>

        {/* ---- Explore More ---- */}
        <ScrollReveal delay={0.15}>
          <section className="mt-16 border-t border-white/[0.06] pt-8">
            <h2 className="text-xl font-bold text-white mb-6">Explore More</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <a href="/timeline" className="card p-4 hover:border-white/15 transition-colors group">
                <h3 className="text-white font-medium group-hover:text-white transition-colors">Space Industry Timeline</h3>
                <p className="text-slate-400 text-sm mt-1">68+ years of milestones from Sputnik to Artemis and the commercial era.</p>
              </a>
              <a href="/faq" className="card p-4 hover:border-white/15 transition-colors group">
                <h3 className="text-white font-medium group-hover:text-white transition-colors">Frequently Asked Questions</h3>
                <p className="text-slate-400 text-sm mt-1">Answers to common questions about the space industry and SpaceNexus.</p>
              </a>
              <a href="/education-pathways" className="card p-4 hover:border-white/15 transition-colors group">
                <h3 className="text-white font-medium group-hover:text-white transition-colors">Education Pathways</h3>
                <p className="text-slate-400 text-sm mt-1">Career tracks, top university programs, certifications, and salary data.</p>
              </a>
              <a href="/standards-reference" className="card p-4 hover:border-white/15 transition-colors group">
                <h3 className="text-white font-medium group-hover:text-white transition-colors">Standards Reference</h3>
                <p className="text-slate-400 text-sm mt-1">Technical standards and specifications used across the space industry.</p>
              </a>
            </div>
          </section>
        </ScrollReveal>

        <RelatedModules modules={PAGE_RELATIONS['glossary']} />

        <p className="text-center text-xs text-slate-500 mt-12 mb-4">Last updated March 2026</p>
      </div>

      {/* ─── Schema.org Structured Data ─────────────────────────────────── */}
      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'DefinedTermSet',
            name: 'Space Industry Glossary',
            description: 'Comprehensive glossary of 69 space industry terms covering orbital mechanics, propulsion, business, regulatory, communications, and more.',
            url: 'https://spacenexus.us/glossary',
            publisher: {
              '@type': 'Organization',
              name: 'SpaceNexus',
              url: 'https://spacenexus.us',
            },
            hasDefinedTerm: GLOSSARY_TERMS.map((t) => ({
              '@type': 'DefinedTerm',
              name: t.term,
              description: t.definition,
              inDefinedTermSet: 'https://spacenexus.us/glossary',
            })),
          }),
        }}
      />
    </div>
  );
}
