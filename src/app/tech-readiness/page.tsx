'use client';

import { useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import AnimatedPageHeader from '@/components/ui/AnimatedPageHeader';
import ScrollReveal from '@/components/ui/ScrollReveal';
import RelatedModules from '@/components/ui/RelatedModules';
import { PAGE_RELATIONS } from '@/lib/module-relationships';

// ────────────────────────────────────────
// Types
// ────────────────────────────────────────

interface TRLLevel {
  level: number;
  name: string;
  description: string;
  activities: string[];
  evidence: string[];
  estimatedTimeToNext: string;
}

interface Technology {
  name: string;
  category: string;
  trl: number;
  description: string;
  developers: string[];
  timeline: string;
  impact: string;
  challenges: string[];
  keyMilestone?: string;
}

interface AssessmentQuestion {
  trl: number;
  question: string;
  helpText: string;
}

type SortField = 'trl' | 'name' | 'category' | 'timeline';
type SortDir = 'asc' | 'desc';
type ActiveTab = 'tracker' | 'scale' | 'assessment';
type MaturityFilter = 'all' | 'research' | 'development' | 'operational';

// ────────────────────────────────────────
// TRL Scale definitions (comprehensive)
// ────────────────────────────────────────

const TRL_SCALE: TRLLevel[] = [
  {
    level: 1,
    name: 'Basic Principles Observed',
    description:
      'Scientific research begins to be translated into applied research and development. Basic principles are observed and reported. The lowest level of technology readiness. Paper studies and scientific publications form the basis.',
    activities: [
      'Literature review and theoretical analysis',
      'Basic scientific research papers published',
      'Mathematical formulations of concept',
      'Physical principles identified and documented',
    ],
    evidence: [
      'Published research identifying principles underlying the technology',
      'Peer-reviewed journal papers or conference proceedings',
      'Initial scientific observations documented',
    ],
    estimatedTimeToNext: '1-3 years',
  },
  {
    level: 2,
    name: 'Technology Concept Formulated',
    description:
      'Invention begins. Practical applications are identified, though speculative. No proof or detailed analysis to support the assumptions. The concept and application are formulated.',
    activities: [
      'Defining potential applications and use cases',
      'Conceptual design studies and trade analyses',
      'Feasibility assessments and analytical studies',
      'Initial requirements identification',
    ],
    evidence: [
      'Documented concept descriptions and application scenarios',
      'Analytical studies confirming concept feasibility',
      'Trade study reports comparing approaches',
    ],
    estimatedTimeToNext: '1-2 years',
  },
  {
    level: 3,
    name: 'Experimental Proof of Concept',
    description:
      'Active research and development is initiated. Laboratory studies aim to validate analytical predictions of separate elements of the technology. Proof of concept for critical functions is demonstrated.',
    activities: [
      'Laboratory experiments on individual components',
      'Proof-of-concept demonstrations',
      'Breadboard-level validation of critical functions',
      'Preliminary design work on key subsystems',
    ],
    evidence: [
      'Laboratory test reports showing concept validity',
      'Measured data supporting analytical predictions',
      'Proof-of-concept hardware or software demonstrated',
    ],
    estimatedTimeToNext: '1-3 years',
  },
  {
    level: 4,
    name: 'Technology Validated in Lab',
    description:
      'Basic technological components are integrated to establish that they will work together. Integration of "ad hoc" hardware in a laboratory environment. Component or breadboard validation in a laboratory environment.',
    activities: [
      'Integration of component breadboards',
      'Laboratory testing of integrated subsystems',
      'Comparison of test results with analytical predictions',
      'Identification of remaining technical risks',
    ],
    evidence: [
      'System/subsystem integration test results in lab environment',
      'Updated models validated with test data',
      'Risk reduction reports from laboratory campaigns',
    ],
    estimatedTimeToNext: '1-2 years',
  },
  {
    level: 5,
    name: 'Technology Validated in Relevant Environment',
    description:
      'Basic technological components are integrated for testing in a simulated or realistic environment. Fidelity of breadboard technology increases significantly. The basic technical components are integrated with representative supporting elements.',
    activities: [
      'Component testing in simulated operational environment',
      'High-fidelity breadboard or brassboard testing',
      'Interface verification between subsystems',
      'Environmental exposure testing (thermal, vacuum, vibration)',
    ],
    evidence: [
      'Test data from relevant environment simulations',
      'Brassboard hardware demonstrated in realistic conditions',
      'Environmental test reports showing acceptable performance',
    ],
    estimatedTimeToNext: '1-2 years',
  },
  {
    level: 6,
    name: 'Technology Demonstrated in Relevant Environment',
    description:
      'Representative model or prototype system is tested in a relevant environment. A major step up from TRL 5 in the fidelity of the system and its environment. Engineering-scale models or prototypes are demonstrated.',
    activities: [
      'Prototype system demonstration in relevant environment',
      'Performance characterization under realistic conditions',
      'Preliminary design review of flight/operational system',
      'Identification of manufacturing and integration challenges',
    ],
    evidence: [
      'Engineering prototype test data in relevant environment',
      'Performance reports under simulated operational conditions',
      'System design documentation at preliminary level',
    ],
    estimatedTimeToNext: '1-3 years',
  },
  {
    level: 7,
    name: 'System Prototype Demonstration in Operational Environment',
    description:
      'Prototype near or at planned operational system. System prototype demonstration in an operational environment. Final design is virtually complete. Represents a major step up from TRL 6.',
    activities: [
      'System prototype testing in operational environment',
      'Near-final design validation',
      'Operational performance and reliability assessment',
      'Manufacturing process development and qualification',
    ],
    evidence: [
      'Prototype test data from actual operational environment',
      'Final system design documentation',
      'Manufacturing readiness assessment',
      'Operational limitations and constraints documented',
    ],
    estimatedTimeToNext: '1-2 years',
  },
  {
    level: 8,
    name: 'System Complete and Qualified',
    description:
      'Technology has been proven to work in its final form and under expected conditions. The actual system is completed and qualified through test and demonstration. End of system development.',
    activities: [
      'Qualification testing of final system configuration',
      'All manufacturing processes validated at scale',
      'Full operational testing under nominal and off-nominal conditions',
      'Documentation of operational procedures',
    ],
    evidence: [
      'Qualification test reports for the final system',
      'Manufacturing process qualification documentation',
      'Operational procedures and training materials',
      'System acceptance review completed',
    ],
    estimatedTimeToNext: '6-18 months',
  },
  {
    level: 9,
    name: 'Actual System Proven in Operational Environment',
    description:
      'The technology is in its final form and operated under the full range of operating mission conditions. Actual application of the technology in its final form under real-world conditions. The system has been successfully deployed and operated.',
    activities: [
      'Operational deployment and sustained mission use',
      'Performance monitoring and anomaly resolution',
      'Lessons learned documentation',
      'Technology transition to production and maintenance',
    ],
    evidence: [
      'Successful mission operations data and reports',
      'Post-flight / post-deployment performance analysis',
      'Lessons learned and best practices documented',
      'Operational history across multiple missions or deployments',
    ],
    estimatedTimeToNext: 'N/A (fully operational)',
  },
];

// ────────────────────────────────────────
// Self-Assessment Questions
// ────────────────────────────────────────

const ASSESSMENT_QUESTIONS: AssessmentQuestion[] = [
  {
    trl: 1,
    question: 'Have the basic scientific principles underlying this technology been identified and documented?',
    helpText: 'This includes published research, theoretical papers, or identified physical laws that form the foundation of the technology concept.',
  },
  {
    trl: 2,
    question: 'Has a practical application been identified and a technology concept or approach been formulated?',
    helpText: 'Beyond basic science, there should be a documented idea of how the principles could be applied to solve a specific problem or meet a need.',
  },
  {
    trl: 3,
    question: 'Has experimental proof of concept been achieved through laboratory experiments or modeling?',
    helpText: 'Critical functions or characteristics have been demonstrated through analytical studies, laboratory experiments, or simulations.',
  },
  {
    trl: 4,
    question: 'Have basic components been integrated and tested in a laboratory environment to validate functionality?',
    helpText: 'Individual components have been combined into a breadboard-level assembly and tested under controlled laboratory conditions.',
  },
  {
    trl: 5,
    question: 'Has the integrated technology been validated in a simulated or relevant environment?',
    helpText: 'The technology has been tested in conditions that simulate the intended operational environment, not just a standard laboratory.',
  },
  {
    trl: 6,
    question: 'Has a representative prototype been demonstrated in a relevant environment?',
    helpText: 'An engineering-scale model or prototype has been built and tested in conditions representative of the actual operating environment.',
  },
  {
    trl: 7,
    question: 'Has a system prototype been demonstrated in the actual operational environment?',
    helpText: 'A near-final system prototype has been tested in the actual space or operational environment (e.g., on the ISS, in orbit, or on a planetary surface).',
  },
  {
    trl: 8,
    question: 'Has the final system been completed, fully integrated, and qualified through testing?',
    helpText: 'The technology in its final configuration has passed all qualification testing, manufacturing is established, and it is ready for deployment.',
  },
  {
    trl: 9,
    question: 'Has the actual system been successfully deployed and proven through operational missions?',
    helpText: 'The technology has been used successfully in real operational missions, with verified performance data across its intended operating conditions.',
  },
];

// ────────────────────────────────────────
// Category metadata
// ────────────────────────────────────────

const CATEGORIES = [
  { id: 'Propulsion', icon: '\u{1F680}', color: 'text-orange-400' },
  { id: 'Power & Energy', icon: '\u{26A1}', color: 'text-yellow-400' },
  { id: 'Communications', icon: '\u{1F4E1}', color: 'text-blue-400' },
  { id: 'Manufacturing & ISRU', icon: '\u{1F3ED}', color: 'text-white/70' },
  { id: 'AI & Autonomy', icon: '\u{1F916}', color: 'text-purple-400' },
  { id: 'Life Support', icon: '\u{1FAC1}', color: 'text-green-400' },
  { id: 'Materials & Structures', icon: '\u{1F9F1}', color: 'text-amber-400' },
  { id: 'Orbital Operations', icon: '\u{1F6F0}\u{FE0F}', color: 'text-indigo-400' },
];

// ────────────────────────────────────────
// Technology data (28+ entries)
// ────────────────────────────────────────

const TECHNOLOGIES: Technology[] = [
  // --- Propulsion ---
  {
    name: 'Nuclear Thermal Propulsion',
    category: 'Propulsion',
    trl: 4,
    description:
      'Uses a nuclear fission reactor to heat hydrogen propellant, achieving roughly twice the specific impulse of chemical rockets. DARPA DRACO program aims for in-space demonstration by 2027. Enables faster crewed Mars transits by cutting travel time from 9 months to approximately 4.',
    developers: ['NASA', 'DARPA (DRACO)', 'BWX Technologies', 'Lockheed Martin'],
    timeline: '2027-2030',
    impact: 'Enables crewed Mars missions with reduced transit time and lower propellant mass',
    keyMilestone: 'DARPA DRACO in-space demo targeted for 2027',
    challenges: [
      'Nuclear regulatory approvals for launch',
      'Reactor shielding mass penalties',
      'Ground testing constraints for nuclear exhaust',
      'Public perception of nuclear in space',
    ],
  },
  {
    name: 'Ion Drives (Gridded Ion Thrusters)',
    category: 'Propulsion',
    trl: 9,
    description:
      'High-specific-impulse electric thrusters that ionize and electrostatically accelerate propellant. Flight-proven on Deep Space 1 (1998), Dawn (2007), and BepiColombo. Provide efficient delta-v for deep-space and station-keeping applications.',
    developers: ['NASA Glenn', 'Aerojet Rocketdyne', 'QinetiQ', 'JAXA'],
    timeline: 'Operational',
    impact: 'Enables efficient deep-space exploration and long-duration orbit maintenance',
    keyMilestone: 'Dawn mission orbited Vesta and Ceres using ion propulsion',
    challenges: [
      'Low thrust limits maneuver speeds',
      'Xenon propellant supply and cost',
      'Grid erosion limiting thruster lifetime beyond 50,000 hours',
    ],
  },
  {
    name: 'Reusable Rockets',
    category: 'Propulsion',
    trl: 9,
    description:
      'Vertically-landing orbital-class rocket boosters that can be reflown dozens of times. SpaceX Falcon 9 has demonstrated over 300 booster landings. Starship super-heavy booster caught by tower arms. Dramatically reduces launch cost per kilogram.',
    developers: ['SpaceX', 'Blue Origin', 'Rocket Lab', 'RocketStar'],
    timeline: 'Operational',
    impact: 'Reduced launch costs by 10x, enabling commercial space economy growth',
    keyMilestone: 'Falcon 9 boosters routinely flying 20+ times',
    challenges: [
      'Refurbishment turnaround time optimization',
      'Upper stage reusability still in development',
      'Scaling reusability to super-heavy class',
    ],
  },
  {
    name: 'Electric Propulsion (Hall-Effect Thrusters)',
    category: 'Propulsion',
    trl: 9,
    description:
      'Hall-effect thrusters use magnetic fields to trap electrons and create an electric field that accelerates ions. Widely deployed on commercial satellites (Starlink, OneWeb) and deep-space missions. Operating at 1-50 kW power levels.',
    developers: ['SpaceX', 'Busek', 'Safran', 'Aerojet Rocketdyne'],
    timeline: 'Operational',
    impact: 'Standard propulsion for satellite station-keeping and orbit-raising',
    keyMilestone: 'Thousands of Starlink satellites using krypton Hall thrusters',
    challenges: [
      'Scaling to higher power (100+ kW) for cargo tugs',
      'Channel erosion at high power levels',
      'Thrust density improvements needed for time-critical missions',
    ],
  },
  {
    name: 'CubeSat Propulsion Systems',
    category: 'Propulsion',
    trl: 8,
    description:
      'Miniaturized propulsion systems for CubeSats and small satellites including cold gas, electrospray, pulsed plasma, and water-based systems. Multiple vendors offering flight-qualified modules in 1U-3U form factors.',
    developers: ['Busek', 'Enpulsion', 'Bradford Space', 'Phase Four'],
    timeline: '2025-2026',
    impact: 'Enables constellation orbit maintenance and de-orbit for small satellites',
    keyMilestone: 'Hundreds of CubeSat propulsion modules deployed in orbit',
    challenges: [
      'Propellant storage density for long missions',
      'Power constraints on small platforms',
      'Qualification cost relative to CubeSat budgets',
    ],
  },
  {
    name: 'Rotating Detonation Engines',
    category: 'Propulsion',
    trl: 3,
    description:
      'Continuously detonates fuel in a rotating wave inside an annular chamber, achieving higher thermodynamic efficiency than deflagration combustion. Promises 25% fuel savings over traditional engines.',
    developers: ['NASA MSFC', 'Aerojet Rocketdyne', 'Venus Aerospace', 'JAXA'],
    timeline: '2029-2033',
    impact: 'Major improvement in fuel efficiency for upper stages and in-space propulsion',
    challenges: [
      'Stable detonation wave control',
      'Thermal management of chamber walls',
      'Scaling to flight-weight hardware',
      'Injector design for consistent detonation',
    ],
  },
  {
    name: 'Space Tethers (Electrodynamic)',
    category: 'Propulsion',
    trl: 5,
    description:
      'Conductive tethers that interact with Earth\'s magnetic field to generate thrust or drag without propellant. Demonstrated on TSS-1R (1996) and multiple sounding rocket experiments. Potential for propellantless orbit raising and de-orbit.',
    developers: ['Tethers Unlimited', 'NASA MSFC', 'JAXA', 'ESA'],
    timeline: '2027-2030',
    impact: 'Propellantless orbit changes and debris de-orbit capability',
    keyMilestone: 'Multiple suborbital tether deployment demonstrations completed',
    challenges: [
      'Tether survivability from micrometeorite impacts',
      'Current collection efficiency in ionosphere',
      'Deployment reliability for multi-kilometer tethers',
      'Attitude control during tether operations',
    ],
  },

  // --- Power & Energy ---
  {
    name: 'Space-Based Solar Power',
    category: 'Power & Energy',
    trl: 3,
    description:
      'Collects solar energy in orbit using massive arrays and beams it to Earth via microwave or laser. Caltech SSPD-1 / MAPLE experiment demonstrated wireless power transfer from orbit in 2023. Continuous power generation unaffected by weather or night.',
    developers: ['Caltech / SSPP', 'ESA SOLARIS', 'JAXA', 'Virtus Solis'],
    timeline: '2032-2040',
    impact: 'Continuous gigawatt-scale clean energy beamed to any location on Earth',
    keyMilestone: 'Caltech MAPLE demo -- first wireless power transfer from orbit (2023)',
    challenges: [
      'Enormous on-orbit assembly requirements',
      'Wireless power transfer efficiency losses',
      'Cost per watt vs. terrestrial solar',
      'Orbital debris risk for large structures',
    ],
  },
  {
    name: 'Space Nuclear Power (Fission Surface Power)',
    category: 'Power & Energy',
    trl: 6,
    description:
      'Compact nuclear fission reactors producing 1-40 kW of electrical power for lunar and Mars surface operations. NASA Kilopower/KRUSTY test demonstrated full-power Stirling-based system. Selected for Artemis lunar surface power.',
    developers: ['NASA Glenn', 'DOE / NNSA', 'Lockheed Martin', 'IX (Intuitive Machines)'],
    timeline: '2028-2030',
    impact: 'Reliable power for lunar bases through 14-day nights and Mars dust storms',
    keyMilestone: 'KRUSTY reactor demonstrated 28-hour full-power operation',
    challenges: [
      'Launch safety and nuclear regulatory approvals',
      'Heat rejection in vacuum environment',
      'Autonomous startup and load following',
      'Integration with habitat power grids',
    ],
  },
  {
    name: 'Solid-State Batteries for Space',
    category: 'Power & Energy',
    trl: 4,
    description:
      'All-solid-state lithium batteries offering higher energy density, wider temperature range, and improved safety over liquid electrolyte cells. Critical for EVA suits, rovers, and small spacecraft.',
    developers: ['QuantumScape', 'Samsung SDI', 'NASA JPL', 'Toyota'],
    timeline: '2027-2030',
    impact: 'Higher energy density and safety for spacesuits, rovers, and CubeSats',
    challenges: [
      'Interface resistance between solid electrolyte and electrodes',
      'Cycling stability in thermal extremes',
      'Manufacturing scale-up for space-grade cells',
    ],
  },

  // --- Communications ---
  {
    name: 'Laser Communications (Free-Space Optical)',
    category: 'Communications',
    trl: 8,
    description:
      'Free-space optical links using modulated laser beams to achieve 10-100x higher data rates than RF. NASA LCRD demonstrated 1.2 Gbps from GEO and is operational. DSOC pushing laser comms to deep space (Psyche mission).',
    developers: ['NASA GSFC', 'MIT Lincoln Lab', 'General Atomics', 'Mynaric'],
    timeline: 'Operational (LCRD)',
    impact: 'Enables HD video from deep space and massive data downlink from LEO constellations',
    keyMilestone: 'LCRD operational on GEO since 2021; DSOC on Psyche demonstrated deep-space laser link',
    challenges: [
      'Atmospheric scintillation and cloud blockage',
      'Precision pointing requirements (microradian)',
      'Ground station network geographic diversity needed',
      'Deep-space link budget constraints',
    ],
  },
  {
    name: 'Optical Inter-Satellite Links',
    category: 'Communications',
    trl: 8,
    description:
      'Laser-based communication links between satellites in orbit, enabling high-bandwidth mesh networking without ground relay. Starlink V2 satellites include laser inter-satellite links, connecting thousands of spacecraft.',
    developers: ['SpaceX (Starlink)', 'Mynaric', 'CACI (SA Photonics)', 'Tesat-Spacecom'],
    timeline: 'Operational',
    impact: 'Global low-latency connectivity and reduced ground station dependency',
    keyMilestone: 'Starlink V2 constellation operating with thousands of laser crosslinks',
    challenges: [
      'Acquisition and tracking at orbital velocities',
      'Thermal management of laser terminals',
      'Network routing optimization across dynamic topology',
    ],
  },
  {
    name: 'Quantum Key Distribution (Space-Based)',
    category: 'Communications',
    trl: 4,
    description:
      'Distributes quantum-encrypted keys via satellite using entangled photon pairs. China\'s Micius satellite demonstrated QKD over 1,200 km. Enables theoretically unbreakable encryption for space networks.',
    developers: ['USTC / Micius Team', 'ESA SAGA', 'ArQit', 'SpeQtral'],
    timeline: '2028-2032',
    impact: 'Ultra-secure communications for defense, financial, and diplomatic space links',
    keyMilestone: 'Micius demonstrated satellite-to-ground QKD over 1,200 km',
    challenges: [
      'Photon loss over long distances',
      'Daylight operation limitations',
      'Detector efficiency and dark counts',
      'Integration with classical network infrastructure',
    ],
  },
  {
    name: 'Delay/Disruption-Tolerant Networking',
    category: 'Communications',
    trl: 6,
    description:
      'Store-and-forward networking protocol suite designed for space environments where continuous connectivity is impossible. Implements Bundle Protocol for interplanetary internet.',
    developers: ['NASA JPL', 'Johns Hopkins APL', 'ESA ESOC', 'CCSDS'],
    timeline: '2026-2028',
    impact: 'Enables reliable data transfer across the solar system despite light-speed delays',
    challenges: [
      'Buffer management on resource-constrained spacecraft',
      'Security key management across delay',
      'Interoperability between agency implementations',
    ],
  },

  // --- Manufacturing & ISRU ---
  {
    name: 'Orbital Manufacturing (Microgravity)',
    category: 'Manufacturing & ISRU',
    trl: 5,
    description:
      'Leveraging microgravity for producing higher-purity materials. Varda Space Industries successfully returned a capsule with space-manufactured pharmaceuticals. ZBLAN fiber produced in space shows superior optical properties.',
    developers: ['Varda Space Industries', 'Space Tango', 'Redwire', 'Flawless Photonics'],
    timeline: '2026-2029',
    impact: 'Ultra-high-quality pharmaceuticals, optical fibers, and crystals not achievable under gravity',
    keyMilestone: 'Varda W-1 capsule returned space-manufactured pharmaceuticals to Earth (2024)',
    challenges: [
      'Return-to-Earth logistics and cost',
      'Automated furnace operation in microgravity',
      'Market price points for space-made products',
      'Contamination control in orbital facilities',
    ],
  },
  {
    name: '3D Printing in Space',
    category: 'Manufacturing & ISRU',
    trl: 7,
    description:
      'Additive manufacturing in microgravity for producing spare parts, tools, and structural components on-demand. Redwire (formerly Made In Space) has operated multiple 3D printers on ISS since 2014, printing tools, medical devices, and structural parts.',
    developers: ['Redwire', 'Relativity Space', 'NASA MSFC', 'Airbus'],
    timeline: '2025-2028',
    impact: 'Reduces logistics dependency for long-duration missions by manufacturing on-demand',
    keyMilestone: 'Multiple 3D printers operating on ISS; ratchet wrench printed and used in space',
    challenges: [
      'Metal feedstock handling in microgravity',
      'Quality assurance without full ground labs',
      'Outgassing and contamination in cabin',
      'Certification of printed flight-critical parts',
    ],
  },
  {
    name: 'Mars ISRU (Oxygen Extraction)',
    category: 'Manufacturing & ISRU',
    trl: 5,
    description:
      'Extracting oxygen from Martian atmospheric CO2 for propellant and life support. NASA MOXIE instrument on Perseverance rover successfully produced oxygen from Mars atmosphere 16 times during its operational period.',
    developers: ['NASA JPL (MOXIE)', 'MIT', 'OxEon Energy', 'Lockheed Martin'],
    timeline: '2028-2033',
    impact: 'Enables Mars propellant production for return flights and life support',
    keyMilestone: 'MOXIE produced 122g of oxygen on Mars, demonstrating CO2 electrolysis',
    challenges: [
      'Scaling from grams to tons of O2 per day',
      'Dust filtration from Martian atmosphere',
      'Thermal cycling in extreme Mars temperatures',
      'Power requirements for production-scale systems',
    ],
  },
  {
    name: 'Lunar Mining / ISRU',
    category: 'Manufacturing & ISRU',
    trl: 3,
    description:
      'Extracting water ice and minerals from lunar regolith for propellant, construction, and life support. NASA ISRU experiments, VIPER rover mission, and commercial lunar landers are advancing this capability.',
    developers: ['NASA (VIPER)', 'Intuitive Machines', 'Astrobotic', 'iSpace'],
    timeline: '2027-2032',
    impact: 'Enables sustained lunar presence and cislunar propellant depots',
    keyMilestone: 'NASA ISRU experiments; LCROSS confirmed water ice at lunar poles',
    challenges: [
      'Water ice deposit characterization uncertainty',
      'Regolith excavation in 1/6 gravity with abrasive dust',
      'Processing plant thermal management at poles',
      'Beneficiation of mixed regolith/ice deposits',
    ],
  },

  // --- AI & Autonomy ---
  {
    name: 'AI/ML for Space Operations',
    category: 'AI & Autonomy',
    trl: 6,
    description:
      'Machine learning systems for on-board satellite data processing, autonomous anomaly detection, and mission planning. Planet Labs uses on-board ML for cloud detection and image classification. ESA experimenting with autonomous operations.',
    developers: ['Planet Labs', 'NASA JPL', 'Slingshot Aerospace', 'Spire Global'],
    timeline: '2025-2028',
    impact: 'Reduces downlink bandwidth, enables real-time decision making, cuts ground ops costs',
    keyMilestone: 'Planet on-board processing classifying images before downlink',
    challenges: [
      'Radiation effects on ML accelerator hardware',
      'Training data scarcity for rare events',
      'Explainability requirements for safety-critical decisions',
      'Power-constrained inference on small satellites',
    ],
  },
  {
    name: 'Autonomous Navigation (Deep Space)',
    category: 'AI & Autonomy',
    trl: 6,
    description:
      'Spacecraft autonomously determining position and trajectory using star trackers, terrain-relative navigation, and pulsar-based timing. NASA OSIRIS-REx used autonomous NavCam to navigate to asteroid Bennu. DART mission used autonomous targeting.',
    developers: ['NASA JPL', 'Johns Hopkins APL', 'Draper', 'Malin Space Science Systems'],
    timeline: '2026-2029',
    impact: 'Enables missions to destinations with long light-time delays where ground control is impractical',
    keyMilestone: 'DART spacecraft autonomously navigated to Dimorphos impact',
    challenges: [
      'Validation of autonomous decisions in novel environments',
      'Sensor degradation over long-duration missions',
      'Recovery from navigation anomalies without ground contact',
      'Computational constraints on radiation-hardened processors',
    ],
  },
  {
    name: 'Satellite Swarm Coordination',
    category: 'AI & Autonomy',
    trl: 4,
    description:
      'Distributed AI algorithms enabling dozens to hundreds of small satellites to self-organize for coordinated observation, communication relay, or formation flying without centralized control.',
    developers: ['NASA Ames', 'MIT Space Systems Lab', 'ESA OPS-SAT', 'Swarm Technologies'],
    timeline: '2028-2031',
    impact: 'Enables distributed sensor networks and resilient space architectures',
    challenges: [
      'Inter-satellite communication bandwidth',
      'Consensus algorithms with signal latency',
      'Fault tolerance when nodes fail',
      'Spectrum management for large swarms',
    ],
  },

  // --- Materials & Structures ---
  {
    name: 'Inflatable Habitats',
    category: 'Materials & Structures',
    trl: 7,
    description:
      'Soft-goods habitat structures that launch compactly and expand on-orbit to provide large pressurized volumes. Bigelow Expandable Activity Module (BEAM) has been attached to ISS since 2016, exceeding its original 2-year demo period.',
    developers: ['Sierra Space', 'Bigelow Aerospace', 'NASA JSC', 'Lockheed Martin'],
    timeline: '2025-2027',
    impact: 'Dramatically increases habitable volume per launch mass for stations and bases',
    keyMilestone: 'BEAM module on ISS exceeded expectations over 8+ years of operation',
    challenges: [
      'MMOD protection for soft walls',
      'Pressure seal reliability over decades',
      'Fire safety in large-volume modules',
    ],
  },
  {
    name: 'Advanced Radiation Shielding',
    category: 'Materials & Structures',
    trl: 4,
    description:
      'Multi-layer composites incorporating hydrogen-rich polymers, boron nitride nanotubes, and regolith-derived ceramics for deep-space habitat protection against galactic cosmic rays and solar particle events.',
    developers: ['NASA Langley', 'Lockheed Martin', 'BNNT LLC', 'ESA'],
    timeline: '2028-2031',
    impact: 'Critical enabler for long-duration crewed missions beyond LEO',
    challenges: [
      'Mass penalties versus protection level',
      'GCR attenuation remains fundamentally difficult',
      'Integration with structural elements',
      'Long-term material degradation in space',
    ],
  },
  {
    name: 'Lunar Regolith Construction',
    category: 'Materials & Structures',
    trl: 3,
    description:
      'Uses concentrated solar energy or microwave sintering to fuse lunar regolith into structural blocks, roads, and landing pads. Reduces Earth-launched construction mass by up to 90%. ICON and AI SpaceFactory leading terrestrial simulant tests.',
    developers: ['ICON', 'AI SpaceFactory', 'ESA / Foster+Partners', 'NASA KSC'],
    timeline: '2029-2034',
    impact: 'Enables large-scale lunar base construction using local materials',
    challenges: [
      'Regolith variability across lunar sites',
      'Dust contamination of equipment',
      'Vacuum-compatible sintering processes',
      'Structural qualification standards for extraterrestrial construction',
    ],
  },

  // --- Orbital Operations ---
  {
    name: 'Active Debris Removal',
    category: 'Orbital Operations',
    trl: 6,
    description:
      'Spacecraft designed to rendezvous with and remove orbital debris. Astroscale ADRAS-J mission successfully demonstrated proximity operations with a spent rocket upper stage in 2024, capturing detailed images from close range.',
    developers: ['Astroscale', 'ClearSpace (ESA)', 'Northrop Grumman', 'D-Orbit'],
    timeline: '2026-2028',
    impact: 'Essential for preserving usable orbital environments and preventing Kessler syndrome',
    keyMilestone: 'Astroscale ADRAS-J performed first close-approach inspection of debris (2024)',
    challenges: [
      'Tumbling target capture mechanisms',
      'Legal liability for debris ownership',
      'Cost-effective removal at scale',
      'Non-cooperative target relative navigation',
    ],
  },
  {
    name: 'In-Orbit Servicing',
    category: 'Orbital Operations',
    trl: 7,
    description:
      'Spacecraft that rendezvous with, dock to, and extend the life of existing satellites through refueling, repair, or relocation. Northrop Grumman MEV-1 and MEV-2 successfully docked with and extended the life of Intelsat GEO satellites.',
    developers: ['Northrop Grumman (MEV)', 'Orbit Fab', 'Astroscale', 'NASA (OSAM-1)'],
    timeline: '2025-2027',
    impact: 'Extends satellite lifetimes by years, saving hundreds of millions per asset',
    keyMilestone: 'MEV-1 docked with Intelsat-901 and extended operations by 5+ years',
    challenges: [
      'Standardized servicing interfaces not yet universal',
      'Propellant transfer in microgravity',
      'Insurance and liability frameworks',
      'Debris generation risk during docking',
    ],
  },

  // --- Life Support ---
  {
    name: 'Closed-Loop Life Support (>98% Recovery)',
    category: 'Life Support',
    trl: 5,
    description:
      'Environmental Control and Life Support Systems recovering >98% of water and oxygen from crew metabolic waste. Builds on ISS ECLSS which achieves approximately 90% water recovery. Mars missions require near-complete closure.',
    developers: ['NASA MSFC', 'Collins Aerospace', 'Honeywell', 'Paragon SDC'],
    timeline: '2027-2030',
    impact: 'Essential for Mars missions where resupply from Earth is impossible',
    keyMilestone: 'ISS ECLSS achieving 90% water recovery; brine processor in testing',
    challenges: [
      'Brine processing for final water recovery percentage',
      'Trace contaminant removal reliability',
      'Biological fouling of membranes',
      'Spare parts and maintenance on multi-year missions',
    ],
  },
  {
    name: 'Artificial Gravity (Short-Radius Centrifuge)',
    category: 'Life Support',
    trl: 2,
    description:
      'Short-radius centrifuge systems providing intermittent or continuous partial gravity to counter bone loss, muscle atrophy, and fluid shift effects during long-duration spaceflight.',
    developers: ['NASA HRP', 'MIT Man-Vehicle Lab', 'University of Colorado', 'ESA'],
    timeline: '2032-2038',
    impact: 'Prevents physiological deconditioning on multi-year Mars transit missions',
    challenges: [
      'Coriolis effects and motion sickness',
      'Structural integration with spacecraft',
      'Minimum effective gravity dose unknown',
      'Mechanical bearing reliability over years',
    ],
  },
];

// ────────────────────────────────────────
// Helpers
// ────────────────────────────────────────

function getTrlColor(trl: number): string {
  const colors: Record<number, string> = {
    1: 'bg-red-600', 2: 'bg-red-500', 3: 'bg-orange-500',
    4: 'bg-amber-500', 5: 'bg-yellow-500', 6: 'bg-lime-500',
    7: 'bg-green-500', 8: 'bg-emerald-500', 9: 'bg-teal-500',
  };
  return colors[trl] || 'bg-slate-500';
}

function getTrlTextColor(trl: number): string {
  const colors: Record<number, string> = {
    1: 'text-red-400', 2: 'text-red-400', 3: 'text-orange-400',
    4: 'text-amber-400', 5: 'text-yellow-400', 6: 'text-lime-400',
    7: 'text-green-400', 8: 'text-emerald-400', 9: 'text-teal-400',
  };
  return colors[trl] || 'text-slate-400';
}

function getTrlBorderColor(trl: number): string {
  const colors: Record<number, string> = {
    1: 'border-red-600/40', 2: 'border-red-500/40', 3: 'border-orange-500/40',
    4: 'border-amber-500/40', 5: 'border-yellow-500/40', 6: 'border-lime-500/40',
    7: 'border-green-500/40', 8: 'border-emerald-500/40', 9: 'border-teal-500/40',
  };
  return colors[trl] || 'border-slate-500/40';
}

function getTrlGlowColor(trl: number): string {
  const colors: Record<number, string> = {
    1: 'shadow-red-500/20', 2: 'shadow-red-500/20', 3: 'shadow-orange-500/20',
    4: 'shadow-amber-500/20', 5: 'shadow-yellow-500/20', 6: 'shadow-lime-500/20',
    7: 'shadow-green-500/20', 8: 'shadow-emerald-500/20', 9: 'shadow-teal-500/20',
  };
  return colors[trl] || 'shadow-slate-500/20';
}

function parseTimelineYear(timeline: string): number {
  const match = timeline.match(/(\d{4})/);
  return match ? parseInt(match[1], 10) : 9999;
}

function getMaturityLabel(trl: number): string {
  if (trl <= 3) return 'Research';
  if (trl <= 6) return 'Development';
  return 'Operational';
}

function getMaturityBadgeClass(trl: number): string {
  if (trl <= 3) return 'bg-red-500/20 text-red-300 border-red-500/30';
  if (trl <= 6) return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
  return 'bg-green-500/20 text-green-300 border-green-500/30';
}

// ────────────────────────────────────────
// Component
// ────────────────────────────────────────

export default function TechReadinessPage() {
  // Tab state
  const [activeTab, setActiveTab] = useState<ActiveTab>('tracker');

  // Tracker state
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [maturityFilter, setMaturityFilter] = useState<MaturityFilter>('all');
  const [trlMin, setTrlMin] = useState<number>(1);
  const [trlMax, setTrlMax] = useState<number>(9);
  const [sortField, setSortField] = useState<SortField>('trl');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [expandedTech, setExpandedTech] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // TRL Scale state
  const [expandedLevel, setExpandedLevel] = useState<number | null>(null);

  // Assessment state
  const [assessmentAnswers, setAssessmentAnswers] = useState<Record<number, boolean | null>>({
    1: null, 2: null, 3: null, 4: null, 5: null, 6: null, 7: null, 8: null, 9: null,
  });
  const [assessmentStarted, setAssessmentStarted] = useState(false);
  const [assessmentComplete, setAssessmentComplete] = useState(false);

  // Computed assessment TRL
  const assessedTRL = useMemo(() => {
    let highestYes = 0;
    for (let i = 1; i <= 9; i++) {
      if (assessmentAnswers[i] === true) {
        highestYes = i;
      } else {
        break;
      }
    }
    return highestYes;
  }, [assessmentAnswers]);

  const assessmentProgress = useMemo(() => {
    const answered = Object.values(assessmentAnswers).filter((v) => v !== null).length;
    return (answered / 9) * 100;
  }, [assessmentAnswers]);

  // Filtered and sorted technologies
  const filteredTechs = useMemo(() => {
    const result = TECHNOLOGIES.filter((t) => {
      if (categoryFilter !== 'All' && t.category !== categoryFilter) return false;
      if (t.trl < trlMin || t.trl > trlMax) return false;
      if (maturityFilter !== 'all') {
        const maturity = getMaturityLabel(t.trl).toLowerCase();
        if (maturity !== maturityFilter) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = t.name.toLowerCase().includes(q);
        const matchesDesc = t.description.toLowerCase().includes(q);
        const matchesDev = t.developers.some((d) => d.toLowerCase().includes(q));
        if (!matchesName && !matchesDesc && !matchesDev) return false;
      }
      return true;
    });

    result.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'trl':
          cmp = a.trl - b.trl;
          break;
        case 'name':
          cmp = a.name.localeCompare(b.name);
          break;
        case 'category':
          cmp = a.category.localeCompare(b.category);
          break;
        case 'timeline':
          cmp = parseTimelineYear(a.timeline) - parseTimelineYear(b.timeline);
          break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return result;
  }, [categoryFilter, maturityFilter, trlMin, trlMax, sortField, sortDir, searchQuery]);

  // Category summary stats
  const categorySummary = useMemo(() => {
    return CATEGORIES.map((cat) => {
      const techs = TECHNOLOGIES.filter((t) => t.category === cat.id);
      const avgTrl = techs.length > 0
        ? Math.round((techs.reduce((sum, t) => sum + t.trl, 0) / techs.length) * 10) / 10
        : 0;
      return {
        ...cat,
        count: techs.length,
        avgTrl,
        minTrl: techs.length > 0 ? Math.min(...techs.map((t) => t.trl)) : 0,
        maxTrl: techs.length > 0 ? Math.max(...techs.map((t) => t.trl)) : 0,
      };
    });
  }, []);

  const toggleSort = useCallback((field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir(field === 'name' || field === 'category' ? 'asc' : 'desc');
    }
  }, [sortField]);

  const handleAssessmentAnswer = useCallback((trl: number, answer: boolean) => {
    setAssessmentAnswers((prev) => {
      const next = { ...prev, [trl]: answer };
      // If answering "No", skip remaining and set them to null
      if (!answer) {
        for (let i = trl + 1; i <= 9; i++) {
          next[i] = null;
        }
      }
      return next;
    });
    // Check if assessment is complete
    if (!answer || trl === 9) {
      setAssessmentComplete(true);
    }
  }, []);

  const resetAssessment = useCallback(() => {
    setAssessmentAnswers({ 1: null, 2: null, 3: null, 4: null, 5: null, 6: null, 7: null, 8: null, 9: null });
    setAssessmentStarted(false);
    setAssessmentComplete(false);
  }, []);

  // Determine which assessment question to show next
  const currentAssessmentQuestion = useMemo(() => {
    for (let i = 1; i <= 9; i++) {
      if (assessmentAnswers[i] === null) return i;
    }
    return null;
  }, [assessmentAnswers]);

  // ────────────────────────────────────────
  // Render
  // ────────────────────────────────────────

  return (
    <div className="min-h-screen bg-black text-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Header */}
        <AnimatedPageHeader
          title="Technology Readiness Assessment"
          subtitle="Comprehensive TRL assessment, tracking, and reference tool for emerging space technologies"
          icon={<span className="text-4xl">&#x1F52C;</span>}
          accentColor="purple"
        />

        {/* Tab Navigation */}
        <ScrollReveal delay={0.05}>
          <div className="mb-8 flex flex-wrap gap-2">
            {([
              { id: 'tracker' as ActiveTab, label: 'Technology Tracker', icon: '\u{1F4CA}' },
              { id: 'scale' as ActiveTab, label: 'TRL Scale Reference', icon: '\u{1F4CF}' },
              { id: 'assessment' as ActiveTab, label: 'Self-Assessment Tool', icon: '\u{2705}' },
            ]).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-5 py-3 rounded-xl text-sm font-medium transition-all flex items-center gap-2 ${
                  activeTab === tab.id
                    ? 'bg-purple-600/30 text-purple-200 border border-purple-500/50 shadow-lg shadow-purple-500/10'
                    : 'bg-white/[0.04] text-slate-400 border border-white/[0.06] hover:bg-white/[0.06] hover:text-white/90'
                }`}
              >
                <span>{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
        </ScrollReveal>

        {/* ═══════════════════════════════════════ */}
        {/* TAB: TRL Scale Reference               */}
        {/* ═══════════════════════════════════════ */}
        {activeTab === 'scale' && (
          <div className="space-y-6">
            {/* Compact Scale Overview */}
            <ScrollReveal delay={0.05}>
              <div className="card p-6">
                <h2 className="text-lg font-semibold text-slate-100 mb-2">
                  NASA Technology Readiness Level Scale
                </h2>
                <p className="text-sm text-slate-400 mb-4">
                  The TRL scale was originally developed by NASA in the 1970s and is now used worldwide
                  to assess technology maturity from basic research (TRL 1) through proven operational systems (TRL 9).
                  Click any level below for full details.
                </p>
                <div className="grid grid-cols-9 gap-1 mb-3">
                  {TRL_SCALE.map((trl) => (
                    <button
                      key={trl.level}
                      onClick={() => setExpandedLevel(expandedLevel === trl.level ? null : trl.level)}
                      className={`flex flex-col items-center p-1 rounded-lg transition-all ${
                        expandedLevel === trl.level
                          ? 'bg-white/[0.05] ring-1 ring-purple-500/40'
                          : 'hover:bg-white/[0.05]'
                      }`}
                    >
                      <div className={`w-full h-3 rounded-full ${getTrlColor(trl.level)}`} />
                      <span className={`text-sm font-bold mt-1 ${getTrlTextColor(trl.level)}`}>
                        {trl.level}
                      </span>
                      <span className="text-[9px] text-slate-400 text-center leading-tight mt-0.5 hidden lg:block">
                        {trl.name}
                      </span>
                    </button>
                  ))}
                </div>
                <div className="flex justify-between text-xs text-slate-500">
                  <span>&#x1F52C; Research (TRL 1-3)</span>
                  <span>&#x2699;&#xFE0F; Development (TRL 4-6)</span>
                  <span>&#x1F680; Operational (TRL 7-9)</span>
                </div>
              </div>
            </ScrollReveal>

            {/* Detailed TRL Cards */}
            <div className="space-y-4">
              {TRL_SCALE.map((trl, idx) => {
                const isExpanded = expandedLevel === trl.level;
                return (
                  <ScrollReveal key={trl.level} delay={Math.min(idx * 0.05, 0.4)}>
                    <div className={`card overflow-hidden transition-all ${
                      isExpanded ? 'ring-1 ring-purple-500/30' : ''
                    }`}>
                      {/* Level Header */}
                      <button
                        onClick={() => setExpandedLevel(isExpanded ? null : trl.level)}
                        className="w-full text-left p-5 flex items-start gap-4 hover:bg-white/[0.03] transition-colors"
                      >
                        {/* Level Badge */}
                        <div className="flex-shrink-0">
                          <div className={`w-14 h-14 rounded-xl flex items-center justify-center text-xl font-bold text-white shadow-lg ${getTrlColor(trl.level)} ${getTrlGlowColor(trl.level)}`}>
                            {trl.level}
                          </div>
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 flex-wrap">
                            <h3 className="text-base font-semibold text-slate-100">
                              TRL {trl.level}: {trl.name}
                            </h3>
                            <span className={`text-[10px] px-2.5 py-0.5 rounded-full border font-medium ${getMaturityBadgeClass(trl.level)}`}>
                              {getMaturityLabel(trl.level)}
                            </span>
                          </div>
                          <p className="text-sm text-slate-400 mt-1 line-clamp-2">
                            {trl.description}
                          </p>
                          {!isExpanded && (
                            <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
                              <span>&#x23F1;&#xFE0F; Time to next: {trl.estimatedTimeToNext}</span>
                              <span>&#x1F4CB; {trl.activities.length} typical activities</span>
                              <span>&#x1F4DD; {trl.evidence.length} evidence items</span>
                            </div>
                          )}
                        </div>

                        {/* Expand indicator */}
                        <div className="flex-shrink-0 text-slate-500">
                          <svg
                            className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                            fill="none" stroke="currentColor" viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </button>

                      {/* Expanded Details */}
                      {isExpanded && (
                        <div className="px-5 pb-5 border-t border-white/[0.06]">
                          {/* Progress visualization */}
                          <div className="mt-4 mb-5">
                            <div className="flex gap-1">
                              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((l) => (
                                <div
                                  key={l}
                                  className={`flex-1 h-2.5 rounded-full transition-all ${
                                    l <= trl.level ? getTrlColor(l) : 'bg-white/[0.06]'
                                  }`}
                                />
                              ))}
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                            {/* Description */}
                            <div>
                              <h4 className="text-xs font-semibold text-white/70 uppercase tracking-wider mb-2">
                                &#x1F4D6; Full Description
                              </h4>
                              <p className="text-sm text-slate-400 leading-relaxed">{trl.description}</p>
                              <div className="mt-3 px-3 py-2 rounded-lg bg-white/[0.05] border border-white/[0.06]">
                                <span className="text-xs text-slate-500">Estimated time to next TRL:</span>
                                <span className={`text-sm font-semibold ml-2 ${getTrlTextColor(trl.level)}`}>
                                  {trl.estimatedTimeToNext}
                                </span>
                              </div>
                            </div>

                            {/* Activities */}
                            <div>
                              <h4 className="text-xs font-semibold text-white/70 uppercase tracking-wider mb-2">
                                &#x2699;&#xFE0F; Typical Activities
                              </h4>
                              <ul className="space-y-2">
                                {trl.activities.map((activity, i) => (
                                  <li key={i} className="flex items-start gap-2 text-sm text-slate-400">
                                    <span className={`mt-0.5 flex-shrink-0 ${getTrlTextColor(trl.level)}`}>&#x25B8;</span>
                                    {activity}
                                  </li>
                                ))}
                              </ul>
                            </div>

                            {/* Evidence */}
                            <div>
                              <h4 className="text-xs font-semibold text-white/70 uppercase tracking-wider mb-2">
                                &#x1F4CB; Required Evidence
                              </h4>
                              <ul className="space-y-2">
                                {trl.evidence.map((ev, i) => (
                                  <li key={i} className="flex items-start gap-2 text-sm text-slate-400">
                                    <span className="text-purple-400 mt-0.5 flex-shrink-0">&#x2713;</span>
                                    {ev}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>

                          {/* Technologies at this TRL */}
                          <div className="mt-5 pt-4 border-t border-white/[0.04]">
                            <h4 className="text-xs font-semibold text-white/70 uppercase tracking-wider mb-2">
                              &#x1F680; Technologies Currently at TRL {trl.level}
                            </h4>
                            <div className="flex flex-wrap gap-2">
                              {TECHNOLOGIES.filter((t) => t.trl === trl.level).map((t) => (
                                <button
                                  key={t.name}
                                  onClick={() => {
                                    setActiveTab('tracker');
                                    setExpandedTech(t.name);
                                    setTrlMin(trl.level);
                                    setTrlMax(trl.level);
                                  }}
                                  className="px-3 py-1.5 text-xs rounded-lg bg-white/[0.05] text-white/70 border border-white/[0.06] hover:border-purple-500/40 hover:text-purple-300 transition-all"
                                >
                                  {t.name}
                                </button>
                              ))}
                              {TECHNOLOGIES.filter((t) => t.trl === trl.level).length === 0 && (
                                <span className="text-xs text-slate-500 italic">No tracked technologies at this level</span>
                              )}
                            </div>

        <RelatedModules modules={PAGE_RELATIONS['tech-readiness']} />
                          </div>
                        </div>
                      )}
                    </div>
                  </ScrollReveal>
                );
              })}
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════ */}
        {/* TAB: Self-Assessment Tool               */}
        {/* ═══════════════════════════════════════ */}
        {activeTab === 'assessment' && (
          <div className="space-y-6">
            {/* Assessment Introduction */}
            <ScrollReveal delay={0.05}>
              <div className="card p-6">
                <h2 className="text-lg font-semibold text-slate-100 mb-2">
                  TRL Self-Assessment Questionnaire
                </h2>
                <p className="text-sm text-slate-400 mb-4">
                  Answer each question sequentially to determine the Technology Readiness Level of your
                  space technology. The assessment follows NASA&apos;s standard TRL definitions. Answer
                  &quot;Yes&quot; only if the criterion has been fully met with documented evidence.
                </p>

                {/* Progress Bar */}
                <div className="mb-4">
                  <div className="flex justify-between text-xs text-slate-400 mb-1.5">
                    <span>Assessment Progress</span>
                    <span>{Math.round(assessmentProgress)}% Complete</span>
                  </div>
                  <div className="w-full bg-white/[0.06] rounded-full h-3 overflow-hidden">
                    <div
                      className="h-3 rounded-full bg-gradient-to-r from-purple-600 to-slate-200 transition-all duration-500"
                      style={{ width: `${assessmentProgress}%` }}
                    />
                  </div>
                </div>

                {/* Current TRL Result (always visible) */}
                <div className="flex items-center gap-4 p-4 rounded-xl bg-white/[0.05] border border-white/[0.06]">
                  <div className={`w-16 h-16 rounded-xl flex items-center justify-center text-2xl font-bold text-white shadow-lg ${
                    assessedTRL > 0 ? getTrlColor(assessedTRL) : 'bg-white/[0.06]'
                  }`}>
                    {assessedTRL > 0 ? assessedTRL : '?'}
                  </div>
                  <div>
                    <div className="text-sm text-slate-400">Current Assessed TRL</div>
                    <div className="text-lg font-semibold text-slate-100">
                      {assessedTRL > 0
                        ? `TRL ${assessedTRL}: ${TRL_SCALE[assessedTRL - 1].name}`
                        : 'Not yet determined'}
                    </div>
                    {assessedTRL > 0 && assessedTRL < 9 && (
                      <div className="text-xs text-slate-500 mt-0.5">
                        Next level: TRL {assessedTRL + 1} &mdash; {TRL_SCALE[assessedTRL].name}
                      </div>
                    )}
                  </div>
                </div>

                {!assessmentStarted && (
                  <button
                    onClick={() => setAssessmentStarted(true)}
                    className="mt-4 px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white font-medium rounded-xl transition-colors"
                  >
                    Start Assessment
                  </button>
                )}

                {assessmentStarted && (
                  <button
                    onClick={resetAssessment}
                    className="mt-4 px-4 py-2 bg-white/[0.06] hover:bg-white/[0.06] text-white/70 text-sm rounded-lg transition-colors"
                  >
                    Reset Assessment
                  </button>
                )}
              </div>
            </ScrollReveal>

            {/* Assessment Questions */}
            {assessmentStarted && (
              <div className="space-y-4">
                {ASSESSMENT_QUESTIONS.map((q, idx) => {
                  const answer = assessmentAnswers[q.trl];
                  const isCurrentQuestion = currentAssessmentQuestion === q.trl;
                  const isPastQuestion = answer !== null;
                  const isFutureQuestion = !isPastQuestion && !isCurrentQuestion;
                  const isLocked = isFutureQuestion && !assessmentComplete;

                  return (
                    <ScrollReveal key={q.trl} delay={Math.min(idx * 0.06, 0.5)}>
                      <div className={`card overflow-hidden transition-all ${
                        isCurrentQuestion ? 'ring-2 ring-purple-500/40 shadow-lg shadow-purple-500/10' : ''
                      } ${isLocked ? 'opacity-40' : ''}`}>
                        <div className="p-5">
                          <div className="flex items-start gap-4">
                            {/* TRL Badge */}
                            <div className="flex-shrink-0">
                              <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-lg font-bold text-white ${
                                answer === true ? getTrlColor(q.trl) : answer === false ? 'bg-white/[0.08]' : 'bg-white/[0.06]'
                              }`}>
                                {answer === true ? '\u2713' : answer === false ? '\u2717' : q.trl}
                              </div>
                              <div className="text-center text-[10px] text-slate-500 mt-1">TRL {q.trl}</div>
                            </div>

                            {/* Question */}
                            <div className="flex-1">
                              <h3 className="text-sm font-semibold text-slate-100 mb-1">{q.question}</h3>
                              <p className="text-xs text-slate-400 mb-3">{q.helpText}</p>

                              {/* Answer status or buttons */}
                              {answer !== null ? (
                                <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium ${
                                  answer ? 'bg-green-500/15 text-green-300 border border-green-500/30' : 'bg-red-500/15 text-red-300 border border-red-500/30'
                                }`}>
                                  {answer ? '\u2705 Yes -- criterion met' : '\u274C No -- not yet achieved'}
                                </div>
                              ) : isCurrentQuestion ? (
                                <div className="flex gap-3">
                                  <button
                                    onClick={() => handleAssessmentAnswer(q.trl, true)}
                                    className="px-5 py-2.5 bg-green-600/20 hover:bg-green-600/30 text-green-300 border border-green-500/40 hover:border-green-500/60 rounded-xl text-sm font-medium transition-all"
                                  >
                                    Yes
                                  </button>
                                  <button
                                    onClick={() => handleAssessmentAnswer(q.trl, false)}
                                    className="px-5 py-2.5 bg-red-600/20 hover:bg-red-600/30 text-red-300 border border-red-500/40 hover:border-red-500/60 rounded-xl text-sm font-medium transition-all"
                                  >
                                    No
                                  </button>
                                </div>
                              ) : (
                                <span className="text-xs text-slate-500 italic">Waiting for previous answers...</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </ScrollReveal>
                  );
                })}

                {/* Assessment Result Summary */}
                {assessmentComplete && (
                  <ScrollReveal delay={0.1}>
                    <div className="card p-6">
                      <h3 className="text-lg font-semibold text-slate-100 mb-4">Assessment Complete</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <div className="flex items-center gap-4 mb-4">
                            <div className={`w-20 h-20 rounded-2xl flex items-center justify-center text-3xl font-bold text-white shadow-xl ${
                              assessedTRL > 0 ? getTrlColor(assessedTRL) : 'bg-white/[0.06]'
                            } ${assessedTRL > 0 ? getTrlGlowColor(assessedTRL) : ''}`}>
                              {assessedTRL}
                            </div>
                            <div>
                              <div className="text-2xl font-bold text-slate-100">
                                TRL {assessedTRL}
                              </div>
                              <div className={`text-sm ${getTrlTextColor(assessedTRL)}`}>
                                {assessedTRL > 0 ? TRL_SCALE[assessedTRL - 1].name : 'Below TRL 1'}
                              </div>
                              <span className={`inline-block mt-1 text-[10px] px-2.5 py-0.5 rounded-full border font-medium ${getMaturityBadgeClass(assessedTRL || 1)}`}>
                                {getMaturityLabel(assessedTRL || 1)}
                              </span>
                            </div>
                          </div>

                          {/* TRL Progress */}
                          <div className="flex gap-1 mb-2">
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((l) => (
                              <div
                                key={l}
                                className={`flex-1 h-3 rounded-full ${l <= assessedTRL ? getTrlColor(l) : 'bg-white/[0.06]'}`}
                              />
                            ))}
                          </div>
                        </div>

                        <div>
                          {assessedTRL > 0 && assessedTRL < 9 && (
                            <div>
                              <h4 className="text-sm font-semibold text-white/90 mb-2">To reach TRL {assessedTRL + 1}:</h4>
                              <ul className="space-y-1.5">
                                {TRL_SCALE[assessedTRL].activities.map((a, i) => (
                                  <li key={i} className="flex items-start gap-2 text-xs text-slate-400">
                                    <span className="text-purple-400 mt-0.5 flex-shrink-0">&#x25B8;</span>
                                    {a}
                                  </li>
                                ))}
                              </ul>
                              <div className="mt-3 text-xs text-slate-500">
                                Estimated time: <span className="text-white/70">{TRL_SCALE[assessedTRL].estimatedTimeToNext}</span>
                              </div>
                            </div>
                          )}
                          {assessedTRL === 9 && (
                            <div className="p-4 rounded-xl bg-teal-500/10 border border-teal-500/30">
                              <p className="text-sm text-teal-300 font-medium">
                                Your technology is at the highest readiness level -- fully operational and flight-proven.
                              </p>
                            </div>
                          )}
                          {assessedTRL === 0 && (
                            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30">
                              <p className="text-sm text-red-300">
                                Your technology has not yet met TRL 1 criteria. Basic scientific principles
                                need to be identified and documented before progressing.
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </ScrollReveal>
                )}
              </div>
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════ */}
        {/* TAB: Technology Tracker                 */}
        {/* ═══════════════════════════════════════ */}
        {activeTab === 'tracker' && (
          <div className="space-y-6">
            {/* Overall Stats */}
            <ScrollReveal delay={0.05}>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="card p-4 text-center">
                  <div className="text-2xl font-bold text-purple-400">{TECHNOLOGIES.length}</div>
                  <div className="text-xs text-slate-400 mt-1">Technologies Tracked</div>
                </div>
                <div className="card p-4 text-center">
                  <div className="text-2xl font-bold text-green-400">
                    {TECHNOLOGIES.filter((t) => t.trl >= 7).length}
                  </div>
                  <div className="text-xs text-slate-400 mt-1">Operational (TRL 7+)</div>
                </div>
                <div className="card p-4 text-center">
                  <div className="text-2xl font-bold text-amber-400">
                    {TECHNOLOGIES.filter((t) => t.trl >= 4 && t.trl <= 6).length}
                  </div>
                  <div className="text-xs text-slate-400 mt-1">Development (TRL 4-6)</div>
                </div>
                <div className="card p-4 text-center">
                  <div className="text-2xl font-bold text-red-400">
                    {TECHNOLOGIES.filter((t) => t.trl <= 3).length}
                  </div>
                  <div className="text-xs text-slate-400 mt-1">Research (TRL 1-3)</div>
                </div>
              </div>
            </ScrollReveal>

            {/* Compact TRL Scale Bar */}
            <ScrollReveal delay={0.08}>
              <div className="card p-5">
                <h2 className="text-sm font-semibold text-white/90 mb-3">TRL Distribution</h2>
                <div className="grid grid-cols-9 gap-1.5">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((level) => {
                    const count = TECHNOLOGIES.filter((t) => t.trl === level).length;
                    return (
                      <button
                        key={level}
                        onClick={() => {
                          setTrlMin(level);
                          setTrlMax(level);
                        }}
                        className={`flex flex-col items-center p-1.5 rounded-lg transition-all ${
                          trlMin === level && trlMax === level
                            ? 'bg-white/[0.06] ring-1 ring-purple-500/40'
                            : 'hover:bg-white/[0.05]'
                        }`}
                      >
                        <div className={`w-full h-2.5 rounded-full ${getTrlColor(level)}`} />
                        <span className={`text-xs font-bold mt-1 ${getTrlTextColor(level)}`}>{level}</span>
                        <span className="text-[10px] text-slate-500">{count} tech{count !== 1 ? 's' : ''}</span>
                      </button>
                    );
                  })}
                </div>
                <div className="flex justify-between mt-2 text-[10px] text-slate-500">
                  <span>Research</span>
                  <span>Development</span>
                  <span>Operational</span>
                </div>
                {(trlMin !== 1 || trlMax !== 9) && (
                  <button
                    onClick={() => { setTrlMin(1); setTrlMax(9); }}
                    className="mt-2 text-xs text-purple-400 hover:text-purple-300 transition-colors"
                  >
                    Reset TRL filter
                  </button>
                )}
              </div>
            </ScrollReveal>

            {/* Category Summary Cards */}
            <ScrollReveal delay={0.1}>
              <div>
                <h2 className="text-sm font-semibold text-white/90 mb-3">Average TRL by Category</h2>
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
                  {categorySummary.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => setCategoryFilter(categoryFilter === cat.id ? 'All' : cat.id)}
                      className={`card-interactive p-3 text-left ${
                        categoryFilter === cat.id
                          ? '!border-purple-500/60 ring-1 ring-purple-500/30'
                          : ''
                      }`}
                    >
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <span className="text-base">{cat.icon}</span>
                        <span className={`text-[10px] font-medium ${cat.color}`}>{cat.id}</span>
                      </div>
                      <div className="flex items-end gap-1">
                        <span className={`text-lg font-bold ${getTrlTextColor(Math.round(cat.avgTrl))}`}>
                          {cat.avgTrl}
                        </span>
                        <span className="text-[9px] text-slate-500 mb-0.5">avg</span>
                      </div>
                      <div className="mt-1.5 w-full bg-white/[0.06] rounded-full h-1">
                        <div
                          className={`h-1 rounded-full ${getTrlColor(Math.round(cat.avgTrl))}`}
                          style={{ width: `${(cat.avgTrl / 9) * 100}%` }}
                        />
                      </div>
                      <div className="text-[9px] text-slate-500 mt-1">
                        {cat.count} &middot; TRL {cat.minTrl}-{cat.maxTrl}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </ScrollReveal>

            {/* Filters & Sort Controls */}
            <ScrollReveal delay={0.12}>
              <div className="card p-4">
                <div className="flex flex-col lg:flex-row lg:items-end gap-4">
                  {/* Search */}
                  <div className="flex-1">
                    <label className="block text-xs text-slate-400 mb-1">Search</label>
                    <input
                      type="search"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search technologies, developers..."
                      className="w-full bg-white/[0.06] border border-white/[0.1] rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50"
                    />
                  </div>

                  {/* Category */}
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Category</label>
                    <select
                      value={categoryFilter}
                      onChange={(e) => setCategoryFilter(e.target.value)}
                      className="w-full bg-white/[0.06] border border-white/[0.1] rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                    >
                      <option value="All">All Categories</option>
                      {CATEGORIES.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.icon} {cat.id}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Maturity Filter */}
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Maturity</label>
                    <select
                      value={maturityFilter}
                      onChange={(e) => setMaturityFilter(e.target.value as MaturityFilter)}
                      className="bg-white/[0.06] border border-white/[0.1] rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                    >
                      <option value="all">All Maturity</option>
                      <option value="research">Research (TRL 1-3)</option>
                      <option value="development">Development (TRL 4-6)</option>
                      <option value="operational">Operational (TRL 7-9)</option>
                    </select>
                  </div>

                  {/* TRL Range */}
                  <div className="flex gap-2">
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Min TRL</label>
                      <select
                        value={trlMin}
                        onChange={(e) => setTrlMin(Number(e.target.value))}
                        className="bg-white/[0.06] border border-white/[0.1] rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                      >
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                          <option key={n} value={n}>{n}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Max TRL</label>
                      <select
                        value={trlMax}
                        onChange={(e) => setTrlMax(Number(e.target.value))}
                        className="bg-white/[0.06] border border-white/[0.1] rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                      >
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                          <option key={n} value={n}>{n}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Sort */}
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Sort By</label>
                    <div className="flex gap-1">
                      {([
                        { field: 'trl' as SortField, label: 'TRL' },
                        { field: 'name' as SortField, label: 'Name' },
                        { field: 'category' as SortField, label: 'Category' },
                        { field: 'timeline' as SortField, label: 'Timeline' },
                      ]).map(({ field, label }) => (
                        <button
                          key={field}
                          onClick={() => toggleSort(field)}
                          className={`px-3 py-2 text-xs font-medium rounded-lg transition-colors ${
                            sortField === field
                              ? 'bg-purple-600 text-white'
                              : 'bg-white/[0.06] text-white/70 hover:bg-white/[0.06]'
                          }`}
                        >
                          {label}
                          {sortField === field && (
                            <span className="ml-1">{sortDir === 'asc' ? '\u2191' : '\u2193'}</span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-3 text-xs text-slate-400">
                  Showing {filteredTechs.length} of {TECHNOLOGIES.length} technologies
                  {(categoryFilter !== 'All' || maturityFilter !== 'all' || trlMin !== 1 || trlMax !== 9 || searchQuery) && (
                    <button
                      onClick={() => {
                        setCategoryFilter('All');
                        setMaturityFilter('all');
                        setTrlMin(1);
                        setTrlMax(9);
                        setSearchQuery('');
                      }}
                      className="ml-3 text-purple-400 hover:text-purple-300"
                    >
                      Clear all filters
                    </button>
                  )}
                </div>
              </div>
            </ScrollReveal>

            {/* Technology Cards */}
            <div className="space-y-4">
              {filteredTechs.map((tech, idx) => {
                const isExpanded = expandedTech === tech.name;
                return (
                  <ScrollReveal key={tech.name} delay={Math.min(idx * 0.04, 0.4)}>
                    <div className={`card overflow-hidden transition-all !border-l-4 ${getTrlBorderColor(tech.trl)} ${
                      isExpanded ? 'ring-1 ring-purple-500/20' : ''
                    }`}>
                      {/* Card Header */}
                      <button
                        onClick={() => setExpandedTech(isExpanded ? null : tech.name)}
                        className="w-full text-left p-4 sm:p-5 flex items-start gap-4 hover:bg-white/[0.03] transition-colors"
                      >
                        {/* TRL Badge */}
                        <div className="flex-shrink-0 flex flex-col items-center">
                          <div className={`w-12 h-12 rounded-lg flex items-center justify-center text-lg font-bold text-white shadow-md ${getTrlColor(tech.trl)}`}>
                            {tech.trl}
                          </div>
                          <span className="text-[10px] text-slate-500 mt-1">TRL</span>
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-sm sm:text-base font-semibold text-slate-100">
                              {tech.name}
                            </h3>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/[0.06] text-slate-400 border border-white/[0.08]">
                              {tech.category}
                            </span>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${getMaturityBadgeClass(tech.trl)}`}>
                              {getMaturityLabel(tech.trl)}
                            </span>
                          </div>
                          <p className="text-xs sm:text-sm text-slate-400 mt-1 line-clamp-2">
                            {tech.description}
                          </p>
                          <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-slate-500">
                            <span className="flex items-center gap-1">
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                              {tech.timeline}
                            </span>
                            <span className="flex items-center gap-1">
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                              </svg>
                              {tech.developers.length} developer{tech.developers.length !== 1 ? 's' : ''}
                            </span>
                            {tech.keyMilestone && (
                              <span className="flex items-center gap-1 text-purple-400/80">
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                Key milestone
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Expand indicator */}
                        <div className="flex-shrink-0 text-slate-500">
                          <svg
                            className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                            fill="none" stroke="currentColor" viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </div>
                      </button>

                      {/* Expanded Content */}
                      {isExpanded && (
                        <div className="px-4 sm:px-5 pb-5 border-t border-white/[0.06]">
                          {/* TRL Progress Bar */}
                          <div className="mt-4 mb-5">
                            <div className="flex justify-between text-xs text-slate-400 mb-1.5">
                              <span>Technology Readiness</span>
                              <span>TRL {tech.trl} / 9 &mdash; {TRL_SCALE[tech.trl - 1].name}</span>
                            </div>
                            <div className="flex gap-1">
                              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((level) => (
                                <div
                                  key={level}
                                  className={`flex-1 h-3 rounded-full transition-all ${
                                    level <= tech.trl ? getTrlColor(level) : 'bg-white/[0.06]'
                                  }`}
                                  title={`TRL ${level}: ${TRL_SCALE[level - 1].name}`}
                                />
                              ))}
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            {/* Full Description */}
                            <div>
                              <h4 className="text-xs font-semibold text-white/70 uppercase tracking-wider mb-2">
                                Description
                              </h4>
                              <p className="text-sm text-slate-400 leading-relaxed">{tech.description}</p>
                            </div>

                            {/* Impact & Milestone */}
                            <div>
                              <h4 className="text-xs font-semibold text-white/70 uppercase tracking-wider mb-2">
                                Expected Impact
                              </h4>
                              <p className="text-sm text-purple-300/90 leading-relaxed">{tech.impact}</p>

                              {tech.keyMilestone && (
                                <div className="mt-3 p-3 rounded-lg bg-purple-500/10 border border-purple-500/20">
                                  <h5 className="text-xs font-semibold text-purple-300 mb-1">Key Milestone</h5>
                                  <p className="text-xs text-slate-400">{tech.keyMilestone}</p>
                                </div>
                              )}
                            </div>

                            {/* Developers */}
                            <div>
                              <h4 className="text-xs font-semibold text-white/70 uppercase tracking-wider mb-2">
                                Key Developers &amp; Programs
                              </h4>
                              <div className="flex flex-wrap gap-1.5">
                                {tech.developers.map((dev) => (
                                  <span
                                    key={dev}
                                    className="px-2.5 py-1 text-xs rounded-md bg-white/[0.06] text-white/70 border border-white/[0.06]"
                                  >
                                    {dev}
                                  </span>
                                ))}
                              </div>
                            </div>

                            {/* Challenges */}
                            <div>
                              <h4 className="text-xs font-semibold text-white/70 uppercase tracking-wider mb-2">
                                Key Challenges
                              </h4>
                              <ul className="space-y-1.5">
                                {tech.challenges.map((challenge, i) => (
                                  <li key={i} className="flex items-start gap-2 text-xs text-slate-400">
                                    <span className="text-amber-500 mt-0.5 flex-shrink-0">&#x26A0;</span>
                                    {challenge}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>

                          {/* What it takes to advance */}
                          {tech.trl < 9 && (
                            <div className="mt-5 pt-4 border-t border-white/[0.04]">
                              <h4 className="text-xs font-semibold text-white/70 uppercase tracking-wider mb-2">
                                To Advance to TRL {tech.trl + 1}: {TRL_SCALE[tech.trl].name}
                              </h4>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                  <span className="text-[10px] text-slate-500 uppercase">Required Activities</span>
                                  <ul className="mt-1 space-y-1">
                                    {TRL_SCALE[tech.trl].activities.map((a, i) => (
                                      <li key={i} className="flex items-start gap-1.5 text-xs text-slate-400">
                                        <span className="text-white/70 mt-0.5 flex-shrink-0">&#x25B8;</span>
                                        {a}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                                <div>
                                  <span className="text-[10px] text-slate-500 uppercase">Required Evidence</span>
                                  <ul className="mt-1 space-y-1">
                                    {TRL_SCALE[tech.trl].evidence.map((e, i) => (
                                      <li key={i} className="flex items-start gap-1.5 text-xs text-slate-400">
                                        <span className="text-purple-400 mt-0.5 flex-shrink-0">&#x2713;</span>
                                        {e}
                                      </li>
                                    ))}
                                  </ul>
                                  <div className="mt-2 text-[10px] text-slate-500">
                                    Est. time: <span className="text-slate-400">{TRL_SCALE[tech.trl].estimatedTimeToNext}</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </ScrollReveal>
                );
              })}

              {filteredTechs.length === 0 && (
                <div className="card text-center py-16">
                  <p className="text-lg text-slate-400">No technologies match your filters</p>
                  <p className="text-sm text-slate-500 mt-1">Try adjusting the category, maturity, or TRL range</p>
                  <button
                    onClick={() => {
                      setCategoryFilter('All');
                      setMaturityFilter('all');
                      setTrlMin(1);
                      setTrlMax(9);
                      setSearchQuery('');
                    }}
                    className="mt-4 px-4 py-2 bg-purple-600/20 text-purple-300 border border-purple-500/40 rounded-lg text-sm hover:bg-purple-600/30 transition-colors"
                  >
                    Clear all filters
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Related Pages (all tabs) */}
        <ScrollReveal delay={0.15}>
          <div className="card p-6 mt-8">
            <h2 className="text-lg font-semibold text-slate-100 mb-4">Related Resources</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { href: '/patents', label: 'Patent Tracker', icon: '\u{1F4DC}', desc: 'Space technology patents and filings' },
                { href: '/blueprints', label: 'Blueprints', icon: '\u{1F4D0}', desc: 'Technical blueprints and schematics' },
                { href: '/tools', label: 'Tools', icon: '\u{1F6E0}\u{FE0F}', desc: 'Mission planning and analysis tools' },
                { href: '/glossary', label: 'Glossary', icon: '\u{1F4D6}', desc: 'Space industry terminology' },
              ].map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="group p-4 rounded-lg bg-white/[0.04] border border-white/[0.06] hover:border-purple-500/40 hover:bg-white/[0.06] transition-all"
                >
                  <span className="text-2xl">{link.icon}</span>
                  <h3 className="text-sm font-medium text-white/90 mt-2 group-hover:text-purple-300 transition-colors">
                    {link.label}
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">{link.desc}</p>
                </Link>
              ))}
            </div>
          </div>
        </ScrollReveal>

        {/* Footer spacing */}
        <div className="h-8" />
      </div>
    </div>
  );
}
