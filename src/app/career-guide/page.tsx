'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import AnimatedPageHeader from '@/components/ui/AnimatedPageHeader';
import ScrollReveal from '@/components/ui/ScrollReveal';
import RelatedModules from '@/components/ui/RelatedModules';
import { PAGE_RELATIONS } from '@/lib/module-relationships';

// ────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────

type CareerCategory =
  | 'engineering'
  | 'software'
  | 'business'
  | 'science'
  | 'operations'
  | 'legal-policy'
  | 'emerging';

type GrowthRate = 'hot' | 'growing' | 'stable' | 'declining';

type EducationLevel = 'bachelors' | 'masters' | 'phd' | 'varies';

interface CareerPath {
  title: string;
  category: CareerCategory;
  salaryRange: { min: number; max: number };
  education: EducationLevel;
  skills: string[];
  growthRate: GrowthRate;
  description: string;
  companies: string[];
  dayInLife: string;
}

// ────────────────────────────────────────────────────────────────
// Data
// ────────────────────────────────────────────────────────────────

const CATEGORIES: Record<CareerCategory, { label: string; color: string; bg: string; border: string }> = {
  engineering:   { label: 'Engineering',   color: 'text-blue-400',    bg: 'bg-blue-500/20',    border: 'border-blue-500/30' },
  software:      { label: 'Software',      color: 'text-cyan-400',    bg: 'bg-cyan-500/20',    border: 'border-cyan-500/30' },
  business:      { label: 'Business',      color: 'text-yellow-400',  bg: 'bg-yellow-500/20',  border: 'border-yellow-500/30' },
  science:       { label: 'Science',       color: 'text-purple-400',  bg: 'bg-purple-500/20',  border: 'border-purple-500/30' },
  operations:    { label: 'Operations',    color: 'text-green-400',   bg: 'bg-green-500/20',   border: 'border-green-500/30' },
  'legal-policy':{ label: 'Legal & Policy',color: 'text-orange-400',  bg: 'bg-orange-500/20',  border: 'border-orange-500/30' },
  emerging:      { label: 'Emerging',      color: 'text-pink-400',    bg: 'bg-pink-500/20',    border: 'border-pink-500/30' },
};

const GROWTH_BADGES: Record<GrowthRate, { label: string; icon: string; classes: string }> = {
  hot:       { label: 'Hot',       icon: '\u{1F525}', classes: 'bg-red-500/20 text-red-400 border-red-500/30' },
  growing:   { label: 'Growing',   icon: '\u{1F4C8}', classes: 'bg-green-500/20 text-green-400 border-green-500/30' },
  stable:    { label: 'Stable',    icon: '\u{2696}\u{FE0F}',  classes: 'bg-slate-500/20 text-slate-300 border-slate-500/30' },
  declining: { label: 'Declining', icon: '\u{1F4C9}', classes: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
};

const EDUCATION_LABELS: Record<EducationLevel, string> = {
  bachelors: "Bachelor's Degree",
  masters: "Master's Degree",
  phd: 'Ph.D.',
  varies: 'Varies (BS-PhD)',
};

const SALARY_BRACKETS = [
  { label: 'All', min: 0, max: Infinity },
  { label: 'Under $100K', min: 0, max: 100000 },
  { label: '$100K - $150K', min: 100000, max: 150000 },
  { label: '$150K - $200K', min: 150000, max: 200000 },
  { label: '$200K+', min: 200000, max: Infinity },
];

const CAREER_PATHS: CareerPath[] = [
  // ── Engineering ──────────────────────────────────────────────
  {
    title: 'Propulsion Engineer',
    category: 'engineering',
    salaryRange: { min: 95000, max: 175000 },
    education: 'masters',
    skills: ['Thermodynamics', 'Combustion analysis', 'CFD', 'Test operations', 'MATLAB/Simulink'],
    growthRate: 'hot',
    description: 'Design, test, and optimize rocket engines and spacecraft propulsion systems. Work spans chemical, electric, and nuclear propulsion technologies.',
    companies: ['SpaceX', 'Aerojet Rocketdyne', 'Blue Origin', 'Relativity Space', 'Ursa Major Technologies'],
    dayInLife: 'Morning stand-up with the engine development team, then hours of running CFD simulations on injector plate designs. After lunch, head to the test stand for a 10-second hot-fire test of a turbopump assembly. End the day analyzing thrust chamber pressure data and updating thermal models.',
  },
  {
    title: 'GN&C Engineer',
    category: 'engineering',
    salaryRange: { min: 105000, max: 185000 },
    education: 'masters',
    skills: ['Kalman filtering', 'Control theory', 'Orbital mechanics', 'Simulink', 'C/C++'],
    growthRate: 'growing',
    description: 'Develop guidance, navigation, and control algorithms that steer spacecraft, rovers, and launch vehicles to their targets with extreme precision.',
    companies: ['NASA JPL', 'Northrop Grumman', 'Draper', 'Ball Aerospace', 'L3Harris'],
    dayInLife: 'Start with a Monte Carlo simulation run to verify your attitude control algorithm against 10,000 dispersed trajectories. Mid-morning, review star-tracker telemetry from an on-orbit spacecraft. Afternoon spent coding a new Kalman filter variant, then a design review with systems engineering.',
  },
  {
    title: 'Thermal Engineer',
    category: 'engineering',
    salaryRange: { min: 90000, max: 165000 },
    education: 'bachelors',
    skills: ['Thermal Desktop', 'SINDA', 'Heat transfer', 'FEA', 'Cryogenics'],
    growthRate: 'stable',
    description: 'Ensure spacecraft and payloads survive extreme temperature environments, from -270C in deep space shadow to +250C in direct sunlight.',
    companies: ['Lockheed Martin', 'Boeing', 'Northrop Grumman', 'Sierra Space', 'Maxar Technologies'],
    dayInLife: 'Begin with a thermal model correlation session comparing flight data against predictions. Run transient analyses for a communication satellite through eclipse seasons. Afternoon testing of multi-layer insulation samples in a thermal vacuum chamber. Close with a thermal interface meeting with the structures team.',
  },
  {
    title: 'Structural/Mechanical Engineer',
    category: 'engineering',
    salaryRange: { min: 88000, max: 160000 },
    education: 'bachelors',
    skills: ['NASTRAN', 'CATIA/SolidWorks', 'Composites', 'Vibration analysis', 'Loads & dynamics'],
    growthRate: 'stable',
    description: 'Design and analyze spacecraft structures that withstand launch loads, vibrations, and the rigors of operating in orbit or on other planetary bodies.',
    companies: ['SpaceX', 'Boeing', 'Lockheed Martin', 'Rocket Lab', 'Firefly Aerospace'],
    dayInLife: 'Morning reviewing FEA results from an overnight coupled loads analysis. Collaborate with manufacturing on a composite panel layup procedure. After lunch, witness a sine-sweep vibration test on a qualification unit. End the day finalizing mass property reports for an upcoming design review.',
  },
  {
    title: 'RF/Antenna Engineer',
    category: 'engineering',
    salaryRange: { min: 100000, max: 180000 },
    education: 'masters',
    skills: ['HFSS/CST', 'Link budget analysis', 'Antenna design', 'Microwave engineering', 'EMC/EMI'],
    growthRate: 'growing',
    description: 'Design antenna systems and RF communications links for satellites, ground stations, and deep-space networks enabling data transmission across millions of miles.',
    companies: ['L3Harris', 'Raytheon', 'Viasat', 'Amazon Kuiper', 'SES'],
    dayInLife: 'Start the day optimizing a phased-array antenna pattern in HFSS electromagnetic simulation. Mid-morning link budget review for a LEO constellation downlink. Afternoon in the anechoic chamber measuring radiation patterns on a prototype feed horn. Close with an interference analysis report for ITU coordination.',
  },
  {
    title: 'Systems Engineer',
    category: 'engineering',
    salaryRange: { min: 100000, max: 195000 },
    education: 'masters',
    skills: ['Requirements management', 'MBSE', 'SysML', 'Interface control', 'Trade studies'],
    growthRate: 'growing',
    description: 'Own the big picture: decompose mission requirements, manage interfaces between subsystems, lead trade studies, and ensure everything integrates into a working spacecraft.',
    companies: ['NASA', 'SpaceX', 'Ball Aerospace', 'Northrop Grumman', 'Raytheon'],
    dayInLife: 'Kick off with a requirements verification matrix review. Lead a trade study meeting on power vs. thermal constraints for a new instrument. Afternoon coordinating an interface control document update between propulsion and avionics teams. End with risk board preparation, updating likelihood and consequence ratings.',
  },

  // ── Software ─────────────────────────────────────────────────
  {
    title: 'Flight Software Engineer',
    category: 'software',
    salaryRange: { min: 115000, max: 200000 },
    education: 'bachelors',
    skills: ['C/C++', 'RTOS', 'DO-178C', 'Embedded systems', 'FPGA'],
    growthRate: 'hot',
    description: 'Write the mission-critical code that runs on spacecraft processors, handling everything from attitude control to autonomous fault protection.',
    companies: ['SpaceX', 'NASA JPL', 'Blue Origin', 'Relativity Space', 'Rocket Lab'],
    dayInLife: 'Morning code review for a fault-protection module written in C. Run hardware-in-the-loop tests on the avionics bench, injecting faults to verify autonomous safing responses. Afternoon pair-programming session on the command sequencing engine. End with a software integration test coordinated with the GN&C team.',
  },
  {
    title: 'Ground Systems Software Engineer',
    category: 'software',
    salaryRange: { min: 110000, max: 190000 },
    education: 'bachelors',
    skills: ['Python', 'Java', 'Kubernetes', 'CCSDS protocols', 'Database design'],
    growthRate: 'growing',
    description: 'Build the ground infrastructure that commands spacecraft, processes telemetry, and distributes mission data to operators and scientists worldwide.',
    companies: ['Raytheon', 'SAIC', 'KBR', 'Amazon AWS (Ground Station)', 'Kratos'],
    dayInLife: 'Start by triaging overnight alerts from the telemetry processing pipeline. Implement a new CCSDS packet decoder for an upcoming spacecraft. After lunch, performance-tune a PostgreSQL query that ingests orbital determination data. End the day deploying a Kubernetes update to the command-and-control microservices.',
  },
  {
    title: 'Mission Operations Software Developer',
    category: 'software',
    salaryRange: { min: 105000, max: 180000 },
    education: 'bachelors',
    skills: ['Python', 'React/TypeScript', 'Grafana', 'Telemetry systems', 'CI/CD'],
    growthRate: 'growing',
    description: 'Create the dashboards, planning tools, and automation systems that mission operators use to monitor and control spacecraft around the clock.',
    companies: ['NASA GSFC', 'Planet', 'Spire Global', 'Capella Space', 'Astroscale'],
    dayInLife: 'Morning sprint planning for the next iteration of the mission planning tool. Build a real-time React dashboard for constellation health monitoring. Afternoon debugging a telemetry visualization discrepancy with the ops team. Close with a demo of the new automated pass-scheduling feature to mission directors.',
  },
  {
    title: 'Space Data Scientist',
    category: 'software',
    salaryRange: { min: 120000, max: 210000 },
    education: 'masters',
    skills: ['Python', 'Machine learning', 'Satellite imagery', 'TensorFlow/PyTorch', 'Geospatial analysis'],
    growthRate: 'hot',
    description: 'Extract insights from the massive volumes of data generated by Earth observation satellites, space telescopes, and sensor networks using ML and statistical methods.',
    companies: ['Planet', 'Maxar', 'Orbital Insight', 'Umbra', 'BlackSky'],
    dayInLife: 'Begin training a convolutional neural network on SAR imagery for ship detection. Mid-morning presenting model performance metrics at a data science sync. Afternoon cleaning and labeling a new multispectral dataset. End the day writing a technical blog post on your latest change-detection algorithm.',
  },

  // ── Business ─────────────────────────────────────────────────
  {
    title: 'Business Development Manager',
    category: 'business',
    salaryRange: { min: 110000, max: 200000 },
    education: 'bachelors',
    skills: ['Pipeline management', 'Government proposals', 'Market analysis', 'Relationship building', 'Shipley process'],
    growthRate: 'growing',
    description: 'Identify and win new contracts for space products and services, managing relationships with government agencies, primes, and commercial customers.',
    companies: ['SpaceX', 'L3Harris', 'Lockheed Martin', 'Rocket Lab', 'York Space Systems'],
    dayInLife: 'Morning reviewing new opportunities on SAM.gov and NASA SEWP. Client call with a DoD program office to discuss constellation requirements. Afternoon refining a $50M proposal executive summary with the capture team. End the day at an industry mixer networking with potential teaming partners.',
  },
  {
    title: 'Program Manager',
    category: 'business',
    salaryRange: { min: 120000, max: 220000 },
    education: 'masters',
    skills: ['EVM', 'Risk management', 'Agile/Waterfall', 'Stakeholder management', 'PMP certification'],
    growthRate: 'stable',
    description: 'Lead complex space programs from concept through launch, managing cost, schedule, and technical performance across multidisciplinary engineering teams.',
    companies: ['Boeing', 'Northrop Grumman', 'NASA', 'Ball Aerospace', 'General Atomics'],
    dayInLife: 'Start with an earned value management review, checking CPI and SPI metrics. Lead a cross-functional IPT meeting on a critical path schedule slip. Afternoon preparing a quarterly program status brief for the customer. End the day reviewing risk register updates and approving a change request.',
  },
  {
    title: 'Space Strategy Consultant',
    category: 'business',
    salaryRange: { min: 100000, max: 195000 },
    education: 'masters',
    skills: ['Market sizing', 'Financial modeling', 'Due diligence', 'Space market knowledge', 'Presentation skills'],
    growthRate: 'growing',
    description: 'Advise space companies, investors, and government agencies on market entry, M&A, technology strategy, and competitive positioning in the evolving space economy.',
    companies: ['McKinsey Aerospace', 'Bryce Space & Technology', 'Quilty Space', 'Northern Sky Research', 'Euroconsult'],
    dayInLife: 'Morning building a TAM/SAM/SOM model for a small-sat launch market analysis. Client workshop on a satellite operator merger integration plan. Afternoon creating investor briefing slides on the cislunar economy. End the day on a call with a startup CEO preparing for a Series B pitch.',
  },
  {
    title: 'Contracts & Procurement Specialist',
    category: 'business',
    salaryRange: { min: 80000, max: 145000 },
    education: 'bachelors',
    skills: ['FAR/DFAR', 'Contract negotiation', 'Supply chain management', 'Cost analysis', 'ITAR compliance'],
    growthRate: 'stable',
    description: 'Manage the complex web of government and commercial contracts, ensuring compliance with federal acquisition regulations and export controls.',
    companies: ['Lockheed Martin', 'Raytheon', 'Boeing', 'NASA', 'US Space Force'],
    dayInLife: 'Morning reviewing a cost-plus-incentive-fee contract modification. Negotiate delivery terms with a critical subsystem vendor. Afternoon ITAR compliance review on an international subcontract. End the day preparing a contract deliverables status report for the program manager.',
  },

  // ── Science ──────────────────────────────────────────────────
  {
    title: 'Planetary Scientist',
    category: 'science',
    salaryRange: { min: 85000, max: 165000 },
    education: 'phd',
    skills: ['Remote sensing', 'Spectroscopy', 'Python/IDL', 'Proposal writing', 'Geological mapping'],
    growthRate: 'growing',
    description: 'Study the surfaces, atmospheres, and interiors of planets, moons, and asteroids using data from robotic missions and telescopic observations.',
    companies: ['NASA JPL', 'SwRI', 'APL/JHU', 'LPI', 'USGS Astrogeology'],
    dayInLife: 'Morning processing HiRISE images of Martian gullies, cataloguing seasonal changes. Write a section of a Discovery-class mission proposal. Afternoon analyzing spectral data from a near-Earth asteroid flyby. End the day presenting preliminary findings at a weekly science team telecon.',
  },
  {
    title: 'Astrophysicist',
    category: 'science',
    salaryRange: { min: 80000, max: 160000 },
    education: 'phd',
    skills: ['Statistical analysis', 'Computational modeling', 'Python/C++', 'Data reduction pipelines', 'Publication writing'],
    growthRate: 'stable',
    description: 'Investigate fundamental questions about the universe -- from exoplanet atmospheres to dark energy -- using data from space telescopes and ground-based observatories.',
    companies: ['NASA GSFC', 'STScI', 'Caltech/IPAC', 'MIT', 'CfA Harvard'],
    dayInLife: 'Begin reducing JWST Near-Infrared Spectrograph data of an exoplanet atmosphere. Morning coffee while reviewing a colleague\'s draft paper. Afternoon running N-body simulations of galaxy cluster dynamics. End the day at a departmental colloquium on gravitational wave follow-up observations.',
  },
  {
    title: 'Space Medicine Researcher',
    category: 'science',
    salaryRange: { min: 95000, max: 180000 },
    education: 'phd',
    skills: ['Physiology', 'Biostatistics', 'Experiment design', 'Radiation biology', 'Clinical research'],
    growthRate: 'hot',
    description: 'Study how microgravity and space radiation affect the human body, developing countermeasures to keep astronauts healthy on long-duration missions to Mars and beyond.',
    companies: ['NASA JSC', 'Translational Research Institute', 'KBR (NASA contractor)', 'ESA', 'Axiom Space'],
    dayInLife: 'Morning analyzing bone density scan results from ISS crew members 6 months post-flight. Design a new centrifuge protocol to study vestibular adaptation. Afternoon reviewing an IRB submission for a lunar mission radiation exposure study. End the day in a planning meeting for an upcoming ISS experiment upload.',
  },
  {
    title: 'Materials Scientist',
    category: 'science',
    salaryRange: { min: 90000, max: 170000 },
    education: 'phd',
    skills: ['Metallurgy', 'Additive manufacturing', 'Failure analysis', 'SEM/TEM', 'Polymer chemistry'],
    growthRate: 'growing',
    description: 'Develop advanced materials for spacecraft, from radiation-resistant composites to 3D-printed superalloys that survive the extreme environments of space propulsion and re-entry.',
    companies: ['NASA Glenn', 'Relativity Space', 'Velo3D', 'Lockheed Martin', 'SpaceX'],
    dayInLife: 'Start with a microstructure analysis of an additively manufactured Inconel 718 combustion chamber sample. Collaborate with propulsion engineers on material selection for a turbopump housing. Afternoon performing tensile tests on a new carbon-fiber layup. End the day documenting a root-cause failure analysis for a cracked thrust vector bearing.',
  },

  // ── Operations ───────────────────────────────────────────────
  {
    title: 'Mission Operations Engineer',
    category: 'operations',
    salaryRange: { min: 90000, max: 165000 },
    education: 'bachelors',
    skills: ['Orbital mechanics', 'Anomaly resolution', 'Procedures writing', 'Console operations', 'STK/GMAT'],
    growthRate: 'growing',
    description: 'Sit console in the mission operations center, monitoring spacecraft health, planning maneuvers, and responding to anomalies to keep missions on track.',
    companies: ['NASA JSC', 'SpaceX', 'Planet', 'Telesat', 'OneWeb'],
    dayInLife: 'Arrive for an 8-hour console shift, reviewing the overnight handover log. Execute a planned orbit-raising maneuver and verify telemetry. Mid-shift troubleshoot a solar array gimbal anomaly, running through contingency procedures. End the shift with a detailed handover brief to the next ops team.',
  },
  {
    title: 'Constellation Operations Manager',
    category: 'operations',
    salaryRange: { min: 105000, max: 185000 },
    education: 'bachelors',
    skills: ['Fleet management', 'Automation scripting', 'Collision avoidance', 'Licensing compliance', 'Performance metrics'],
    growthRate: 'hot',
    description: 'Oversee hundreds or thousands of satellites simultaneously, managing their orbits, software updates, and end-of-life disposal in the era of mega-constellations.',
    companies: ['SpaceX (Starlink)', 'Amazon Kuiper', 'OneWeb', 'Planet', 'Spire Global'],
    dayInLife: 'Morning reviewing conjunction alerts across the fleet and approving avoidance maneuvers. Coordinate a batch firmware update rolling out to 200 satellites. Afternoon analyzing constellation coverage gaps and adjusting orbital planes. End the day briefing leadership on fleet health metrics and deorbit campaign progress.',
  },
  {
    title: 'Launch Operations Engineer',
    category: 'operations',
    salaryRange: { min: 85000, max: 155000 },
    education: 'bachelors',
    skills: ['Launch procedures', 'Range safety', 'Hazardous operations', 'Countdown sequencing', 'Ground systems'],
    growthRate: 'growing',
    description: 'Prepare rockets for flight, manage countdown operations, and coordinate the highly choreographed sequence of events that culminate in a successful liftoff.',
    companies: ['SpaceX', 'ULA', 'Rocket Lab', 'Firefly Aerospace', 'Blue Origin'],
    dayInLife: 'Dawn arrival at the launch pad for a wet dress rehearsal, monitoring propellant loading sequences. Lead the ground systems readiness poll at T-4 hours. Afternoon running through abort scenario simulations with the launch director. End the day debriefing the rehearsal and updating countdown timeline notes.',
  },

  // ── Legal & Policy ───────────────────────────────────────────
  {
    title: 'Space Law Attorney',
    category: 'legal-policy',
    salaryRange: { min: 120000, max: 230000 },
    education: 'masters',
    skills: ['Outer Space Treaty', 'ITU regulations', 'ITAR/EAR', 'Licensing', 'International law'],
    growthRate: 'growing',
    description: 'Navigate the evolving legal landscape of outer space, advising on licensing, liability, property rights, and compliance with international treaties and national regulations.',
    companies: ['Hogan Lovells', 'DLA Piper', 'FAA/AST', 'FCC Space Bureau', 'Satellite Industry Association'],
    dayInLife: 'Morning drafting an FCC satellite license application for a new LEO constellation. Review an ITAR technical assistance agreement for an international launch. Afternoon researching Artemis Accords implications for a client lunar mining venture. End the day on a panel call preparing testimony for a Senate Commerce Committee hearing.',
  },
  {
    title: 'Regulatory Affairs Specialist',
    category: 'legal-policy',
    salaryRange: { min: 85000, max: 155000 },
    education: 'bachelors',
    skills: ['FCC/ITU filings', 'NEPA compliance', 'Policy analysis', 'Technical writing', 'Government relations'],
    growthRate: 'growing',
    description: 'Manage the regulatory approvals that every space mission requires -- spectrum licenses, launch permits, environmental reviews, and international coordination.',
    companies: ['FCC', 'FAA', 'NOAA', 'SpaceX', 'SES'],
    dayInLife: 'Start by preparing an ITU advance publication information filing for a new GEO satellite slot. Review draft FCC comments on a Notice of Proposed Rulemaking for spectrum sharing. Afternoon coordinating with the engineering team on interference analysis data for a frequency coordination meeting. End the day summarizing regulatory timeline risks for program management.',
  },

  // ── Emerging ─────────────────────────────────────────────────
  {
    title: 'AI/ML Engineer for Space Systems',
    category: 'emerging',
    salaryRange: { min: 130000, max: 230000 },
    education: 'masters',
    skills: ['PyTorch/TensorFlow', 'Edge AI', 'Computer vision', 'Reinforcement learning', 'Model optimization'],
    growthRate: 'hot',
    description: 'Deploy AI models on spacecraft for autonomous navigation, on-board image processing, predictive maintenance, and intelligent mission planning.',
    companies: ['SpaceX', 'Planet', 'Capella Space', 'KP Labs', 'Descartes Labs'],
    dayInLife: 'Morning quantizing a neural network to run on a spacecraft FPGA with 2W power budget. Test an autonomous docking algorithm in a high-fidelity simulator. Afternoon training a cloud-detection model on multispectral satellite data for on-board processing. End the day presenting edge-AI benchmark results to the avionics team.',
  },
  {
    title: 'Space Cybersecurity Engineer',
    category: 'emerging',
    salaryRange: { min: 120000, max: 210000 },
    education: 'bachelors',
    skills: ['NIST frameworks', 'Satellite link security', 'Threat modeling', 'Encryption systems', 'Penetration testing'],
    growthRate: 'hot',
    description: 'Protect spacecraft, ground systems, and space-to-ground links from cyber threats as space assets become critical national and commercial infrastructure.',
    companies: ['US Space Force', 'Northrop Grumman', 'L3Harris', 'Booz Allen Hamilton', 'Kratos'],
    dayInLife: 'Morning threat modeling session on a new satellite command uplink architecture. Run a penetration test on the mission operations center network. Afternoon analyzing anomalous telemetry patterns for potential spoofing. End the day updating the cybersecurity risk register and briefing the CISO on a new vulnerability disclosure.',
  },
  {
    title: 'In-Space Manufacturing Engineer',
    category: 'emerging',
    salaryRange: { min: 95000, max: 175000 },
    education: 'masters',
    skills: ['Additive manufacturing', 'Microgravity processes', 'Materials science', 'Robotics', 'Process control'],
    growthRate: 'hot',
    description: 'Pioneer the production of goods in microgravity, from fiber-optic cables and bioprinted tissues to large structures that can only be assembled in space.',
    companies: ['Redwire Space', 'Varda Space Industries', 'Made In Space (Redwire)', 'Axiom Space', 'Orbital Reef'],
    dayInLife: 'Morning analyzing crystal growth samples returned from the ISS, comparing against ground controls. Design a new print head for a microgravity metal sintering experiment. Afternoon running vacuum chamber tests on a ZBLAN fiber-drawing prototype. End the day reviewing telemetry from an on-orbit manufacturing payload.',
  },
  {
    title: 'Space Tourism Operations Manager',
    category: 'emerging',
    salaryRange: { min: 90000, max: 170000 },
    education: 'bachelors',
    skills: ['Customer experience', 'Safety management', 'Training program design', 'Aviation operations', 'Crisis management'],
    growthRate: 'hot',
    description: 'Manage the end-to-end experience for commercial spaceflight participants, from pre-flight training and medical screening through launch day and post-flight reintegration.',
    companies: ['Blue Origin', 'Virgin Galactic', 'SpaceX', 'Axiom Space', 'Space Perspective'],
    dayInLife: 'Morning briefing a crew of four spaceflight participants on zero-g safety procedures. Observe their centrifuge training session and review biometric data with the flight surgeon. Afternoon coordinating with launch ops on the customer experience timeline for launch day. End the day refining the post-flight media and celebration event plan.',
  },
];

// ────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────

function formatSalary(value: number): string {
  return `$${Math.round(value / 1000)}K`;
}

const MAX_SALARY = 250000;

// ────────────────────────────────────────────────────────────────
// Career Card Component
// ────────────────────────────────────────────────────────────────

function CareerCard({ career }: { career: CareerPath }) {
  const [expanded, setExpanded] = useState(false);
  const cat = CATEGORIES[career.category];
  const growth = GROWTH_BADGES[career.growthRate];
  const minPct = (career.salaryRange.min / MAX_SALARY) * 100;
  const maxPct = (career.salaryRange.max / MAX_SALARY) * 100;

  return (
    <div className={`bg-slate-800/60 border ${cat.border} rounded-xl p-5 hover:bg-slate-800/80 transition-colors`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-slate-100 truncate">{career.title}</h3>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className={`text-xs px-2 py-0.5 rounded-full border ${cat.bg} ${cat.color} ${cat.border}`}>
              {cat.label}
            </span>
            <span className={`text-xs px-2 py-0.5 rounded-full border ${growth.classes}`}>
              {growth.icon} {growth.label}
            </span>
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className="text-sm font-semibold text-emerald-400">
            {formatSalary(career.salaryRange.min)} - {formatSalary(career.salaryRange.max)}
          </p>
          <p className="text-xs text-slate-400">{EDUCATION_LABELS[career.education]}</p>
        </div>
      </div>

      {/* Salary Bar */}
      <div className="relative h-2 bg-slate-700 rounded-full mb-3 overflow-hidden" aria-label={`Salary range from ${formatSalary(career.salaryRange.min)} to ${formatSalary(career.salaryRange.max)}`}>
        <div
          className="absolute h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400"
          style={{ left: `${minPct}%`, width: `${maxPct - minPct}%` }}
        />
      </div>

      {/* Description */}
      <p className="text-sm text-slate-300 mb-3 leading-relaxed">{career.description}</p>

      {/* Skills */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {career.skills.map((skill) => (
          <span key={skill} className="text-xs bg-slate-700/60 text-slate-300 px-2 py-0.5 rounded-md">
            {skill}
          </span>
        ))}
      </div>

      {/* Companies */}
      <div className="mb-3">
        <p className="text-xs text-slate-400 mb-1">Who&apos;s hiring:</p>
        <div className="flex flex-wrap gap-1.5">
          {career.companies.map((company) => (
            <span key={company} className="text-xs bg-slate-700/40 text-slate-300 px-2 py-0.5 rounded border border-slate-600/50">
              {company}
            </span>
          ))}
        </div>
      </div>

      {/* Expand/Collapse */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="text-sm text-emerald-400 hover:text-emerald-300 transition-colors flex items-center gap-1"
        aria-expanded={expanded}
      >
        {expanded ? 'Hide' : 'Show'} A Day in the Life
        <svg
          className={`w-4 h-4 transition-transform ${expanded ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {expanded && (
        <div className="mt-3 p-4 bg-slate-900/50 rounded-lg border border-slate-700/50">
          <p className="text-xs text-emerald-400 font-semibold mb-1 uppercase tracking-wider">A Day in the Life</p>
          <p className="text-sm text-slate-300 leading-relaxed">{career.dayInLife}</p>
        </div>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────
// Stats Bar
// ────────────────────────────────────────────────────────────────

function StatsBar({ careers }: { careers: CareerPath[] }) {
  const avgMin = Math.round(careers.reduce((s, c) => s + c.salaryRange.min, 0) / careers.length / 1000);
  const avgMax = Math.round(careers.reduce((s, c) => s + c.salaryRange.max, 0) / careers.length / 1000);
  const hotCount = careers.filter((c) => c.growthRate === 'hot').length;
  const categories = new Set(careers.map((c) => c.category)).size;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
      {[
        { label: 'Career Paths', value: careers.length.toString(), sub: 'profiled' },
        { label: 'Avg Salary Range', value: `$${avgMin}K-$${avgMax}K`, sub: 'across all roles' },
        { label: 'Hot Careers', value: hotCount.toString(), sub: 'rapid growth' },
        { label: 'Categories', value: categories.toString(), sub: 'disciplines' },
      ].map((stat) => (
        <div key={stat.label} className="bg-slate-800/60 border border-slate-700/50 rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-emerald-400">{stat.value}</p>
          <p className="text-sm text-slate-300 font-medium">{stat.label}</p>
          <p className="text-xs text-slate-500">{stat.sub}</p>
        </div>
      ))}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────
// Salary Overview Chart (pure CSS)
// ────────────────────────────────────────────────────────────────

function SalaryOverview({ careers }: { careers: CareerPath[] }) {
  const sorted = [...careers].sort((a, b) => b.salaryRange.max - a.salaryRange.max).slice(0, 10);

  return (
    <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-5 mb-8">
      <h3 className="text-lg font-semibold text-slate-100 mb-4">Top 10 Highest-Paying Careers</h3>
      <div className="space-y-3">
        {sorted.map((career) => {
          const cat = CATEGORIES[career.category];
          const minPct = (career.salaryRange.min / MAX_SALARY) * 100;
          const maxPct = (career.salaryRange.max / MAX_SALARY) * 100;
          return (
            <div key={career.title} className="flex items-center gap-3">
              <span className="text-xs text-slate-300 w-44 truncate shrink-0" title={career.title}>
                {career.title}
              </span>
              <div className="relative flex-1 h-5 bg-slate-700/50 rounded">
                <div
                  className={`absolute h-full rounded ${cat.bg} border ${cat.border}`}
                  style={{ left: `${minPct}%`, width: `${maxPct - minPct}%` }}
                />
              </div>
              <span className="text-xs text-slate-400 w-24 text-right shrink-0">
                {formatSalary(career.salaryRange.min)}-{formatSalary(career.salaryRange.max)}
              </span>
            </div>
          );
        })}
      </div>
      <div className="flex justify-between mt-3 text-xs text-slate-500">
        <span>$0</span>
        <span>$50K</span>
        <span>$100K</span>
        <span>$150K</span>
        <span>$200K</span>
        <span>$250K</span>

        <RelatedModules modules={PAGE_RELATIONS['career-guide']} />
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────
// Growth Legend
// ────────────────────────────────────────────────────────────────

function GrowthLegend() {
  return (
    <div className="flex flex-wrap gap-3 mb-6">
      {(Object.entries(GROWTH_BADGES) as [GrowthRate, typeof GROWTH_BADGES[GrowthRate]][]).map(([key, badge]) => (
        <div key={key} className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border ${badge.classes}`}>
          <span>{badge.icon}</span>
          <span>{badge.label}</span>
        </div>
      ))}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────
// Main Page
// ────────────────────────────────────────────────────────────────

export default function CareerGuidePage() {
  const [categoryFilter, setCategoryFilter] = useState<CareerCategory | 'all'>('all');
  const [salaryBracket, setSalaryBracket] = useState(0);
  const [educationFilter, setEducationFilter] = useState<EducationLevel | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredCareers = useMemo(() => {
    return CAREER_PATHS.filter((career) => {
      if (categoryFilter !== 'all' && career.category !== categoryFilter) return false;

      const bracket = SALARY_BRACKETS[salaryBracket];
      if (career.salaryRange.max < bracket.min || career.salaryRange.min > bracket.max) return false;

      if (educationFilter !== 'all' && career.education !== educationFilter) return false;

      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          career.title.toLowerCase().includes(q) ||
          career.description.toLowerCase().includes(q) ||
          career.skills.some((s) => s.toLowerCase().includes(q)) ||
          career.companies.some((c) => c.toLowerCase().includes(q))
        );
      }

      return true;
    });
  }, [categoryFilter, salaryBracket, educationFilter, searchQuery]);

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 px-4 py-12 md:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <AnimatedPageHeader
          title="Space Industry Career Guide"
          subtitle="Explore 25 career paths across engineering, science, business, operations, law, and emerging space fields. Find your trajectory in the new space economy."
          icon={<span>🎯</span>}
          accentColor="emerald"
          breadcrumb="Resources / Career Guide"
        />

        {/* Stats */}
        <ScrollReveal>
          <StatsBar careers={CAREER_PATHS} />
        </ScrollReveal>

        {/* Salary Overview */}
        <ScrollReveal delay={0.1}>
          <SalaryOverview careers={CAREER_PATHS} />
        </ScrollReveal>

        {/* Growth Legend */}
        <ScrollReveal delay={0.15}>
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-2">Growth Rate Key</h3>
            <GrowthLegend />
          </div>
        </ScrollReveal>

        {/* Filters */}
        <ScrollReveal delay={0.2}>
          <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-5 mb-8">
            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">Filter Careers</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Search */}
              <div>
                <label htmlFor="career-search" className="block text-xs text-slate-400 mb-1">Search</label>
                <input
                  id="career-search"
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Title, skill, or company..."
                  className="w-full bg-slate-900/60 border border-slate-600/50 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>

              {/* Category */}
              <div>
                <label htmlFor="career-category" className="block text-xs text-slate-400 mb-1">Category</label>
                <select
                  id="career-category"
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value as CareerCategory | 'all')}
                  className="w-full bg-slate-900/60 border border-slate-600/50 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                >
                  <option value="all">All Categories</option>
                  {(Object.entries(CATEGORIES) as [CareerCategory, typeof CATEGORIES[CareerCategory]][]).map(([key, val]) => (
                    <option key={key} value={key}>{val.label}</option>
                  ))}
                </select>
              </div>

              {/* Salary */}
              <div>
                <label htmlFor="career-salary" className="block text-xs text-slate-400 mb-1">Salary Range</label>
                <select
                  id="career-salary"
                  value={salaryBracket}
                  onChange={(e) => setSalaryBracket(Number(e.target.value))}
                  className="w-full bg-slate-900/60 border border-slate-600/50 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                >
                  {SALARY_BRACKETS.map((b, i) => (
                    <option key={b.label} value={i}>{b.label}</option>
                  ))}
                </select>
              </div>

              {/* Education */}
              <div>
                <label htmlFor="career-education" className="block text-xs text-slate-400 mb-1">Education Level</label>
                <select
                  id="career-education"
                  value={educationFilter}
                  onChange={(e) => setEducationFilter(e.target.value as EducationLevel | 'all')}
                  className="w-full bg-slate-900/60 border border-slate-600/50 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                >
                  <option value="all">All Levels</option>
                  <option value="bachelors">Bachelor&apos;s Degree</option>
                  <option value="masters">Master&apos;s Degree</option>
                  <option value="phd">Ph.D.</option>
                  <option value="varies">Varies (BS-PhD)</option>
                </select>
              </div>
            </div>

            {/* Active filter count */}
            {(categoryFilter !== 'all' || salaryBracket !== 0 || educationFilter !== 'all' || searchQuery) && (
              <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-700/50">
                <p className="text-sm text-slate-400">
                  Showing <span className="text-emerald-400 font-semibold">{filteredCareers.length}</span> of{' '}
                  {CAREER_PATHS.length} careers
                </p>
                <button
                  onClick={() => {
                    setCategoryFilter('all');
                    setSalaryBracket(0);
                    setEducationFilter('all');
                    setSearchQuery('');
                  }}
                  className="text-sm text-slate-400 hover:text-slate-200 underline"
                >
                  Clear all filters
                </button>
              </div>
            )}
          </div>
        </ScrollReveal>

        {/* Career Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-12">
          {filteredCareers.map((career, i) => (
            <ScrollReveal key={career.title} delay={Math.min(i * 0.05, 0.4)}>
              <CareerCard career={career} />
            </ScrollReveal>
          ))}
        </div>

        {filteredCareers.length === 0 && (
          <div className="text-center py-16">
            <p className="text-4xl mb-3">🔭</p>
            <p className="text-lg text-slate-400">No careers match your filters.</p>
            <button
              onClick={() => {
                setCategoryFilter('all');
                setSalaryBracket(0);
                setEducationFilter('all');
                setSearchQuery('');
              }}
              className="mt-3 text-emerald-400 hover:text-emerald-300 underline text-sm"
            >
              Reset all filters
            </button>
          </div>
        )}

        {/* Getting Started Section */}
        <ScrollReveal>
          <div className="bg-gradient-to-r from-emerald-900/30 to-teal-900/30 border border-emerald-700/30 rounded-xl p-6 md:p-8 mb-10">
            <h2 className="text-xl font-bold text-slate-100 mb-4">How to Break Into the Space Industry</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-semibold text-emerald-400 uppercase tracking-wider mb-2">For Students</h3>
                <ul className="space-y-2 text-sm text-slate-300">
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-400 mt-0.5">&#9656;</span>
                    Pursue STEM internships at NASA centers, national labs, or space companies during undergrad
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-400 mt-0.5">&#9656;</span>
                    Join university CubeSat, rocketry, or rover competition teams for hands-on experience
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-400 mt-0.5">&#9656;</span>
                    Attend Space Symposium, SmallSat Conference, or IAC for networking and exposure
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-400 mt-0.5">&#9656;</span>
                    Consider dual degrees (engineering + business, science + policy) for versatility
                  </li>
                </ul>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-emerald-400 uppercase tracking-wider mb-2">For Career Changers</h3>
                <ul className="space-y-2 text-sm text-slate-300">
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-400 mt-0.5">&#9656;</span>
                    Software engineers: your skills transfer directly -- space companies need modern dev practices
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-400 mt-0.5">&#9656;</span>
                    Business professionals: BD, finance, and operations roles don&apos;t always need aerospace degrees
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-400 mt-0.5">&#9656;</span>
                    Get a security clearance early if targeting defense-adjacent space work
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-emerald-400 mt-0.5">&#9656;</span>
                    Leverage adjacent industry experience -- automotive, aviation, energy, and telecom skills are valued
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </ScrollReveal>

        {/* Related Links */}
        <ScrollReveal delay={0.1}>
          <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-6 mb-8">
            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">Continue Exploring</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                { href: '/space-talent', label: 'Space Talent Hub', desc: 'Browse open positions and workforce analytics', icon: '💼' },
                { href: '/salary-benchmarks', label: 'Salary Benchmarks', desc: 'Detailed compensation data by role and level', icon: '💰' },
                { href: '/resources', label: 'Learning Resources', desc: 'Courses, books, and communities', icon: '📚' },
                { href: '/glossary', label: 'Space Glossary', desc: 'Terminology and acronyms decoded', icon: '📖' },
              ].map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="flex items-start gap-3 p-3 rounded-lg bg-slate-900/40 border border-slate-700/30 hover:border-emerald-500/40 hover:bg-slate-800/60 transition-colors group"
                >
                  <span className="text-2xl">{link.icon}</span>
                  <div>
                    <p className="text-sm font-medium text-slate-200 group-hover:text-emerald-400 transition-colors">{link.label}</p>
                    <p className="text-xs text-slate-400">{link.desc}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </ScrollReveal>

        {/* Disclaimer */}
        <p className="text-xs text-slate-500 text-center mt-8 max-w-2xl mx-auto">
          Salary ranges are approximate and based on U.S. market data from industry surveys, Glassdoor, Levels.fyi,
          and public government pay scales. Actual compensation varies by location, company size, experience, clearance
          level, and market conditions. Last updated February 2026.
        </p>
      </div>
    </main>
  );
}
