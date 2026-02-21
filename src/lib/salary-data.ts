// ─────────────────────────────────────────────────────────────────────────────
// Space Industry Salary Benchmarks — Comprehensive Dataset
// Based on aggregated data from Glassdoor, Levels.fyi, BLS, and industry reports
// ─────────────────────────────────────────────────────────────────────────────

export type SalaryCategory =
  | 'engineering'
  | 'mission-operations'
  | 'business'
  | 'science'
  | 'executive'
  | 'manufacturing';

export type DemandLevel = 'high' | 'medium' | 'low';

export type LocationRegion = 'US' | 'EU' | 'Remote';

export interface ExperienceLevelRange {
  min: number;
  max: number;
}

export interface SalaryRole {
  id: string;
  title: string;
  category: SalaryCategory;
  salaryRange: {
    min: number;
    median: number;
    max: number;
    p25: number;
    p75: number;
  };
  locations: LocationRegion[];
  experienceLevels: {
    junior: ExperienceLevelRange;
    mid: ExperienceLevelRange;
    senior: ExperienceLevelRange;
  };
  topCompanies: string[];
  growthRate: string;
  demandLevel: DemandLevel;
  description: string;
  skills: string[];
}

export interface CompanyCompensation {
  company: string;
  slug: string;
  type: 'new-space' | 'traditional-defense' | 'government' | 'startup';
  baseSalaryMultiplier: number; // relative to market median
  equityNote: string;
  benefitsNote: string;
  culture: string;
}

export interface SalaryCategoryInfo {
  id: SalaryCategory;
  label: string;
  icon: string;
  avgMedian: number;
  roleCount: number;
  description: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Category Summaries
// ─────────────────────────────────────────────────────────────────────────────

export const SALARY_CATEGORIES: SalaryCategoryInfo[] = [
  {
    id: 'engineering',
    label: 'Engineering',
    icon: 'E',
    avgMedian: 158000,
    roleCount: 14,
    description: 'Systems, software, propulsion, thermal, structures, RF/comms, and ADCS engineers.',
  },
  {
    id: 'mission-operations',
    label: 'Mission Operations',
    icon: 'O',
    avgMedian: 138000,
    roleCount: 8,
    description: 'Flight dynamics, mission planning, ground systems, and launch operations.',
  },
  {
    id: 'business',
    label: 'Business',
    icon: 'B',
    avgMedian: 142000,
    roleCount: 10,
    description: 'Business development, program management, contracts, finance, and marketing.',
  },
  {
    id: 'science',
    label: 'Science',
    icon: 'S',
    avgMedian: 152000,
    roleCount: 8,
    description: 'Planetary science, astrophysics, Earth observation, and data science.',
  },
  {
    id: 'executive',
    label: 'Executive',
    icon: 'X',
    avgMedian: 310000,
    roleCount: 5,
    description: 'C-suite, VP, and Director-level positions across the space industry.',
  },
  {
    id: 'manufacturing',
    label: 'Manufacturing',
    icon: 'M',
    avgMedian: 105000,
    roleCount: 8,
    description: 'Technicians, quality engineers, test engineers, and machinists.',
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Complete Salary Dataset (53 roles)
// ─────────────────────────────────────────────────────────────────────────────

export const SALARY_ROLES: SalaryRole[] = [
  // ═══════════════════════════════════════════════════════════════
  // ENGINEERING
  // ═══════════════════════════════════════════════════════════════
  {
    id: 'systems-engineer',
    title: 'Systems Engineer',
    category: 'engineering',
    salaryRange: { min: 90000, median: 145000, max: 210000, p25: 115000, p75: 175000 },
    locations: ['US', 'EU', 'Remote'],
    experienceLevels: {
      junior: { min: 80000, max: 110000 },
      mid: { min: 110000, max: 160000 },
      senior: { min: 150000, max: 210000 },
    },
    topCompanies: ['Northrop Grumman', 'Lockheed Martin', 'Blue Origin', 'L3Harris'],
    growthRate: '+8% YoY',
    demandLevel: 'high',
    description: 'Design and integrate complex spacecraft systems, ensuring all subsystems work together. Requires strong cross-disciplinary knowledge.',
    skills: ['MBSE', 'Requirements Management', 'V&V', 'STK', 'DOORS'],
  },
  {
    id: 'software-engineer',
    title: 'Software Engineer (Flight/Ground)',
    category: 'engineering',
    salaryRange: { min: 95000, median: 155000, max: 245000, p25: 120000, p75: 195000 },
    locations: ['US', 'EU', 'Remote'],
    experienceLevels: {
      junior: { min: 85000, max: 125000 },
      mid: { min: 120000, max: 170000 },
      senior: { min: 160000, max: 245000 },
    },
    topCompanies: ['SpaceX', 'Planet Labs', 'Blue Origin', 'NASA JPL'],
    growthRate: '+12% YoY',
    demandLevel: 'high',
    description: 'Develop flight software, ground systems, and mission control applications. C/C++, Python, and real-time systems experience critical.',
    skills: ['C/C++', 'Python', 'RTOS', 'Linux', 'CI/CD', 'Git'],
  },
  {
    id: 'propulsion-engineer',
    title: 'Propulsion Engineer',
    category: 'engineering',
    salaryRange: { min: 95000, median: 160000, max: 240000, p25: 125000, p75: 195000 },
    locations: ['US'],
    experienceLevels: {
      junior: { min: 85000, max: 120000 },
      mid: { min: 120000, max: 175000 },
      senior: { min: 165000, max: 240000 },
    },
    topCompanies: ['SpaceX', 'Blue Origin', 'Stoke Space', 'Aerojet Rocketdyne'],
    growthRate: '+10% YoY',
    demandLevel: 'high',
    description: 'Design, test, and qualify liquid and solid rocket engines. Expertise in combustion, thermodynamics, and fluid mechanics.',
    skills: ['CFD', 'Thermodynamics', 'Test Operations', 'MATLAB', 'Fluid Mechanics'],
  },
  {
    id: 'thermal-engineer',
    title: 'Thermal Engineer',
    category: 'engineering',
    salaryRange: { min: 85000, median: 140000, max: 195000, p25: 110000, p75: 165000 },
    locations: ['US', 'EU'],
    experienceLevels: {
      junior: { min: 80000, max: 105000 },
      mid: { min: 105000, max: 150000 },
      senior: { min: 145000, max: 195000 },
    },
    topCompanies: ['Ball Aerospace', 'Northrop Grumman', 'SpaceX', 'Lockheed Martin'],
    growthRate: '+6% YoY',
    demandLevel: 'medium',
    description: 'Model and manage thermal environments for spacecraft and payloads. Analyze heat dissipation, radiator sizing, and thermal protection.',
    skills: ['Thermal Desktop', 'SINDA', 'ANSYS', 'FEA', 'Heat Transfer'],
  },
  {
    id: 'structures-engineer',
    title: 'Structures Engineer',
    category: 'engineering',
    salaryRange: { min: 85000, median: 138000, max: 200000, p25: 108000, p75: 168000 },
    locations: ['US', 'EU'],
    experienceLevels: {
      junior: { min: 78000, max: 108000 },
      mid: { min: 105000, max: 155000 },
      senior: { min: 145000, max: 200000 },
    },
    topCompanies: ['Relativity Space', 'Northrop Grumman', 'Boeing', 'Lockheed Martin'],
    growthRate: '+5% YoY',
    demandLevel: 'medium',
    description: 'Perform structural analysis, design load-bearing components, and ensure spacecraft survive launch and orbital environments.',
    skills: ['FEA', 'Nastran', 'ANSYS', 'Composites', 'Fatigue Analysis'],
  },
  {
    id: 'rf-comms-engineer',
    title: 'RF & Communications Engineer',
    category: 'engineering',
    salaryRange: { min: 95000, median: 150000, max: 210000, p25: 120000, p75: 180000 },
    locations: ['US', 'EU'],
    experienceLevels: {
      junior: { min: 85000, max: 115000 },
      mid: { min: 115000, max: 165000 },
      senior: { min: 155000, max: 210000 },
    },
    topCompanies: ['L3Harris', 'Mynaric', 'Viasat', 'SpaceX'],
    growthRate: '+9% YoY',
    demandLevel: 'high',
    description: 'Design RF systems, antenna arrays, and communication links for satellite constellations and deep-space missions.',
    skills: ['RF Design', 'Link Budget', 'Antenna Design', 'MATLAB', 'Signal Processing'],
  },
  {
    id: 'adcs-engineer',
    title: 'ADCS/GNC Engineer',
    category: 'engineering',
    salaryRange: { min: 100000, median: 158000, max: 220000, p25: 128000, p75: 188000 },
    locations: ['US', 'EU'],
    experienceLevels: {
      junior: { min: 90000, max: 125000 },
      mid: { min: 120000, max: 170000 },
      senior: { min: 160000, max: 220000 },
    },
    topCompanies: ['Blue Origin', 'Northrop Grumman', 'NASA JPL', 'True Anomaly'],
    growthRate: '+7% YoY',
    demandLevel: 'high',
    description: 'Design guidance, navigation, and control algorithms for spacecraft. Model orbital dynamics and develop attitude determination systems.',
    skills: ['MATLAB/Simulink', 'Control Theory', 'Orbital Mechanics', 'Kalman Filters', 'Python'],
  },
  {
    id: 'avionics-engineer',
    title: 'Avionics Engineer',
    category: 'engineering',
    salaryRange: { min: 95000, median: 155000, max: 225000, p25: 120000, p75: 185000 },
    locations: ['US'],
    experienceLevels: {
      junior: { min: 85000, max: 115000 },
      mid: { min: 115000, max: 165000 },
      senior: { min: 160000, max: 225000 },
    },
    topCompanies: ['Blue Origin', 'SpaceX', 'Lockheed Martin', 'Northrop Grumman'],
    growthRate: '+8% YoY',
    demandLevel: 'high',
    description: 'Design avionics hardware and electronics for flight computers, power distribution, and sensor interfaces.',
    skills: ['PCB Design', 'FPGA', 'VHDL/Verilog', 'Embedded Systems', 'DO-178C'],
  },
  {
    id: 'power-systems-engineer',
    title: 'Power Systems Engineer',
    category: 'engineering',
    salaryRange: { min: 85000, median: 135000, max: 185000, p25: 105000, p75: 160000 },
    locations: ['US', 'EU'],
    experienceLevels: {
      junior: { min: 78000, max: 105000 },
      mid: { min: 100000, max: 145000 },
      senior: { min: 140000, max: 185000 },
    },
    topCompanies: ['Astra Space', 'Redwire', 'Maxar', 'Boeing'],
    growthRate: '+6% YoY',
    demandLevel: 'medium',
    description: 'Design solar arrays, battery management systems, and power distribution for satellites and space stations.',
    skills: ['Power Electronics', 'Solar Cell Technology', 'Battery Systems', 'SPICE', 'EPS Design'],
  },
  {
    id: 'optical-engineer',
    title: 'Optical/Photonics Engineer',
    category: 'engineering',
    salaryRange: { min: 95000, median: 152000, max: 210000, p25: 120000, p75: 180000 },
    locations: ['US', 'EU'],
    experienceLevels: {
      junior: { min: 85000, max: 115000 },
      mid: { min: 115000, max: 165000 },
      senior: { min: 155000, max: 210000 },
    },
    topCompanies: ['Ball Aerospace', 'Mynaric', 'L3Harris', 'NASA GSFC'],
    growthRate: '+11% YoY',
    demandLevel: 'high',
    description: 'Design optical payloads, laser communication terminals, and imaging systems for Earth observation and deep-space missions.',
    skills: ['Optical Design', 'Zemax', 'CODEV', 'Laser Systems', 'Interferometry'],
  },
  {
    id: 'data-engineer-space',
    title: 'Data Engineer (Space Analytics)',
    category: 'engineering',
    salaryRange: { min: 100000, median: 155000, max: 220000, p25: 125000, p75: 185000 },
    locations: ['US', 'Remote'],
    experienceLevels: {
      junior: { min: 90000, max: 120000 },
      mid: { min: 120000, max: 170000 },
      senior: { min: 160000, max: 220000 },
    },
    topCompanies: ['Planet Labs', 'Spire Global', 'Capella Space', 'BlackSky'],
    growthRate: '+15% YoY',
    demandLevel: 'high',
    description: 'Build data pipelines for satellite imagery, telemetry, and geospatial analytics. Cloud-native architecture for petabyte-scale data.',
    skills: ['Python', 'AWS/GCP', 'Spark', 'PostgreSQL', 'Geospatial'],
  },
  {
    id: 'eclss-engineer',
    title: 'ECLSS/Life Support Engineer',
    category: 'engineering',
    salaryRange: { min: 100000, median: 155000, max: 210000, p25: 125000, p75: 180000 },
    locations: ['US'],
    experienceLevels: {
      junior: { min: 90000, max: 120000 },
      mid: { min: 115000, max: 165000 },
      senior: { min: 155000, max: 210000 },
    },
    topCompanies: ['Axiom Space', 'NASA JSC', 'Sierra Space', 'Vast'],
    growthRate: '+14% YoY',
    demandLevel: 'high',
    description: 'Design environmental control and life support systems for space stations and crewed vehicles. Rare expertise commanding premium.',
    skills: ['ECLSS Design', 'Fluid Systems', 'Thermal Control', 'MATLAB', 'Systems Engineering'],
  },
  {
    id: 'integration-test-engineer',
    title: 'Integration & Test Engineer',
    category: 'engineering',
    salaryRange: { min: 85000, median: 140000, max: 195000, p25: 110000, p75: 165000 },
    locations: ['US', 'EU'],
    experienceLevels: {
      junior: { min: 78000, max: 105000 },
      mid: { min: 105000, max: 150000 },
      senior: { min: 142000, max: 195000 },
    },
    topCompanies: ['Planet Labs', 'Northrop Grumman', 'Lockheed Martin', 'Ball Aerospace'],
    growthRate: '+6% YoY',
    demandLevel: 'medium',
    description: 'Lead spacecraft integration, environmental testing (vibration, thermal-vacuum), and launch site operations.',
    skills: ['Cleanroom Ops', 'TVAC Testing', 'Vibration Testing', 'Test Automation', 'EGSE'],
  },
  {
    id: 'mechanical-engineer',
    title: 'Mechanical Engineer',
    category: 'engineering',
    salaryRange: { min: 80000, median: 132000, max: 185000, p25: 100000, p75: 158000 },
    locations: ['US', 'EU'],
    experienceLevels: {
      junior: { min: 72000, max: 100000 },
      mid: { min: 98000, max: 145000 },
      senior: { min: 135000, max: 185000 },
    },
    topCompanies: ['Vast', 'SpaceX', 'Blue Origin', 'Relativity Space'],
    growthRate: '+5% YoY',
    demandLevel: 'medium',
    description: 'Design mechanical components, mechanisms, and deployment systems for spacecraft. CAD modeling and tolerance analysis.',
    skills: ['SolidWorks', 'NX', 'GD&T', 'Mechanisms', 'CAD/CAM'],
  },

  // ═══════════════════════════════════════════════════════════════
  // MISSION OPERATIONS
  // ═══════════════════════════════════════════════════════════════
  {
    id: 'flight-dynamics-analyst',
    title: 'Flight Dynamics Analyst',
    category: 'mission-operations',
    salaryRange: { min: 90000, median: 140000, max: 195000, p25: 112000, p75: 168000 },
    locations: ['US', 'EU'],
    experienceLevels: {
      junior: { min: 82000, max: 110000 },
      mid: { min: 108000, max: 155000 },
      senior: { min: 148000, max: 195000 },
    },
    topCompanies: ['NASA GSFC', 'ESA/ESOC', 'Northrop Grumman', 'AGI'],
    growthRate: '+6% YoY',
    demandLevel: 'medium',
    description: 'Plan and execute orbital maneuvers, conjunction assessments, and trajectory optimization. Real-time flight operations.',
    skills: ['STK', 'GMAT', 'Orbital Mechanics', 'Python', 'MATLAB'],
  },
  {
    id: 'mission-planner',
    title: 'Mission Planner',
    category: 'mission-operations',
    salaryRange: { min: 85000, median: 132000, max: 185000, p25: 105000, p75: 158000 },
    locations: ['US', 'EU'],
    experienceLevels: {
      junior: { min: 78000, max: 105000 },
      mid: { min: 102000, max: 148000 },
      senior: { min: 140000, max: 185000 },
    },
    topCompanies: ['SpaceX', 'NASA JPL', 'Northrop Grumman', 'SES'],
    growthRate: '+5% YoY',
    demandLevel: 'medium',
    description: 'Develop mission timelines, coordinate launch windows, and manage mission constraints across complex campaigns.',
    skills: ['Mission Analysis', 'Systems Engineering', 'Project Management', 'MATLAB', 'Risk Assessment'],
  },
  {
    id: 'ground-systems-engineer',
    title: 'Ground Systems Engineer',
    category: 'mission-operations',
    salaryRange: { min: 85000, median: 135000, max: 185000, p25: 108000, p75: 160000 },
    locations: ['US'],
    experienceLevels: {
      junior: { min: 78000, max: 105000 },
      mid: { min: 105000, max: 148000 },
      senior: { min: 140000, max: 185000 },
    },
    topCompanies: ['SpaceX', 'SES', 'Intelsat', 'KSAT'],
    growthRate: '+7% YoY',
    demandLevel: 'medium',
    description: 'Design and operate ground station networks, telemetry processing systems, and command uplink infrastructure.',
    skills: ['Ground Station Design', 'Telemetry', 'Linux', 'Networking', 'CCSDS'],
  },
  {
    id: 'launch-operations-engineer',
    title: 'Launch Operations Engineer',
    category: 'mission-operations',
    salaryRange: { min: 90000, median: 142000, max: 195000, p25: 112000, p75: 168000 },
    locations: ['US'],
    experienceLevels: {
      junior: { min: 82000, max: 110000 },
      mid: { min: 108000, max: 155000 },
      senior: { min: 148000, max: 195000 },
    },
    topCompanies: ['SpaceX', 'ULA', 'Rocket Lab', 'Firefly Aerospace'],
    growthRate: '+9% YoY',
    demandLevel: 'high',
    description: 'Manage launch campaigns including vehicle integration, pad operations, countdown procedures, and range safety compliance.',
    skills: ['Launch Procedures', 'Hazardous Systems', 'Range Safety', 'Propellant Handling', 'Countdown Management'],
  },
  {
    id: 'satellite-operations-analyst',
    title: 'Satellite Operations Analyst',
    category: 'mission-operations',
    salaryRange: { min: 80000, median: 125000, max: 170000, p25: 100000, p75: 148000 },
    locations: ['US', 'EU', 'Remote'],
    experienceLevels: {
      junior: { min: 72000, max: 98000 },
      mid: { min: 95000, max: 140000 },
      senior: { min: 135000, max: 170000 },
    },
    topCompanies: ['Planet Labs', 'SES', 'Intelsat', 'Eutelsat'],
    growthRate: '+8% YoY',
    demandLevel: 'high',
    description: 'Monitor satellite health and status, manage anomaly responses, and optimize constellation operations.',
    skills: ['Satellite Ops', 'Anomaly Resolution', 'CCSDS', 'Python', 'Shift Operations'],
  },
  {
    id: 'fleet-manager',
    title: 'Satellite Fleet Manager',
    category: 'mission-operations',
    salaryRange: { min: 110000, median: 160000, max: 215000, p25: 132000, p75: 188000 },
    locations: ['US', 'EU'],
    experienceLevels: {
      junior: { min: 100000, max: 130000 },
      mid: { min: 125000, max: 170000 },
      senior: { min: 160000, max: 215000 },
    },
    topCompanies: ['SES', 'Intelsat', 'Eutelsat', 'SpaceX'],
    growthRate: '+7% YoY',
    demandLevel: 'medium',
    description: 'Manage operational satellite fleets, capacity planning, and end-of-life deorbiting. Strategic asset management.',
    skills: ['Fleet Management', 'Capacity Planning', 'Spectrum Coordination', 'Business Analysis', 'Risk Management'],
  },
  {
    id: 'mission-manager',
    title: 'Mission Manager',
    category: 'mission-operations',
    salaryRange: { min: 120000, median: 168000, max: 225000, p25: 142000, p75: 195000 },
    locations: ['US'],
    experienceLevels: {
      junior: { min: 110000, max: 138000 },
      mid: { min: 135000, max: 178000 },
      senior: { min: 170000, max: 225000 },
    },
    topCompanies: ['SpaceX', 'ULA', 'Rocket Lab', 'Northrop Grumman'],
    growthRate: '+8% YoY',
    demandLevel: 'medium',
    description: 'Lead entire mission campaigns from manifest to orbit. Interface with customers, coordinate launch logistics, and manage mission assurance.',
    skills: ['Program Management', 'Customer Interface', 'Mission Assurance', 'Risk Management', 'Launch Campaign'],
  },
  {
    id: 'space-traffic-management',
    title: 'Space Traffic Management Analyst',
    category: 'mission-operations',
    salaryRange: { min: 90000, median: 135000, max: 180000, p25: 110000, p75: 158000 },
    locations: ['US', 'Remote'],
    experienceLevels: {
      junior: { min: 82000, max: 108000 },
      mid: { min: 105000, max: 148000 },
      senior: { min: 140000, max: 180000 },
    },
    topCompanies: ['LeoLabs', 'ExoAnalytic', 'Slingshot Aerospace', 'COMSPOC'],
    growthRate: '+18% YoY',
    demandLevel: 'high',
    description: 'Track space objects, perform conjunction assessments, and coordinate collision avoidance maneuvers. Rapidly growing field.',
    skills: ['SSA/SDA', 'Orbital Mechanics', 'Data Analytics', 'Python', 'Radar Systems'],
  },

  // ═══════════════════════════════════════════════════════════════
  // BUSINESS
  // ═══════════════════════════════════════════════════════════════
  {
    id: 'business-development',
    title: 'Business Development Manager',
    category: 'business',
    salaryRange: { min: 100000, median: 155000, max: 225000, p25: 125000, p75: 188000 },
    locations: ['US', 'EU'],
    experienceLevels: {
      junior: { min: 85000, max: 115000 },
      mid: { min: 115000, max: 168000 },
      senior: { min: 158000, max: 225000 },
    },
    topCompanies: ['SpaceX', 'Blue Origin', 'Northrop Grumman', 'L3Harris'],
    growthRate: '+7% YoY',
    demandLevel: 'high',
    description: 'Capture new business, develop proposals for government and commercial customers, and manage strategic partnerships.',
    skills: ['Capture Management', 'Proposal Writing', 'Customer Relations', 'Government Procurement', 'Shipley Process'],
  },
  {
    id: 'program-manager',
    title: 'Program Manager',
    category: 'business',
    salaryRange: { min: 110000, median: 165000, max: 235000, p25: 135000, p75: 198000 },
    locations: ['US'],
    experienceLevels: {
      junior: { min: 95000, max: 128000 },
      mid: { min: 125000, max: 178000 },
      senior: { min: 168000, max: 235000 },
    },
    topCompanies: ['Lockheed Martin', 'Northrop Grumman', 'RTX', 'Boeing'],
    growthRate: '+5% YoY',
    demandLevel: 'high',
    description: 'Manage multi-million dollar space programs, EVM reporting, schedule management, and cross-functional team leadership.',
    skills: ['EVM', 'MS Project', 'PMP Certification', 'Risk Management', 'DoD Acquisition'],
  },
  {
    id: 'contracts-manager',
    title: 'Contracts Manager',
    category: 'business',
    salaryRange: { min: 95000, median: 145000, max: 200000, p25: 118000, p75: 172000 },
    locations: ['US'],
    experienceLevels: {
      junior: { min: 80000, max: 108000 },
      mid: { min: 105000, max: 155000 },
      senior: { min: 148000, max: 200000 },
    },
    topCompanies: ['Northrop Grumman', 'Lockheed Martin', 'RTX', 'L3Harris'],
    growthRate: '+4% YoY',
    demandLevel: 'medium',
    description: 'Negotiate and manage FAR/DFARS contracts, modifications, and compliance requirements for government space programs.',
    skills: ['FAR/DFARS', 'Contract Negotiation', 'CPFF/FFP', 'Compliance', 'Government Contracting'],
  },
  {
    id: 'financial-analyst-space',
    title: 'Financial Analyst (Space Programs)',
    category: 'business',
    salaryRange: { min: 75000, median: 115000, max: 165000, p25: 92000, p75: 138000 },
    locations: ['US', 'Remote'],
    experienceLevels: {
      junior: { min: 68000, max: 90000 },
      mid: { min: 88000, max: 128000 },
      senior: { min: 125000, max: 165000 },
    },
    topCompanies: ['RTX', 'Lockheed Martin', 'Northrop Grumman', 'Boeing'],
    growthRate: '+4% YoY',
    demandLevel: 'medium',
    description: 'Financial planning and analysis for space programs. EVM, cost estimation, and budget management.',
    skills: ['EVM', 'Financial Modeling', 'SAP', 'Excel', 'Cost Estimation'],
  },
  {
    id: 'marketing-manager-space',
    title: 'Marketing Manager',
    category: 'business',
    salaryRange: { min: 80000, median: 125000, max: 175000, p25: 98000, p75: 148000 },
    locations: ['US', 'Remote'],
    experienceLevels: {
      junior: { min: 65000, max: 90000 },
      mid: { min: 88000, max: 135000 },
      senior: { min: 128000, max: 175000 },
    },
    topCompanies: ['Axiom Space', 'Rocket Lab', 'Planet Labs', 'SpaceX'],
    growthRate: '+6% YoY',
    demandLevel: 'medium',
    description: 'Drive brand awareness and lead generation in the space industry. B2B and B2G marketing for commercial space companies.',
    skills: ['B2B Marketing', 'Content Strategy', 'Digital Marketing', 'Trade Shows', 'PR'],
  },
  {
    id: 'product-manager-space',
    title: 'Product Manager',
    category: 'business',
    salaryRange: { min: 100000, median: 150000, max: 210000, p25: 122000, p75: 178000 },
    locations: ['US', 'Remote'],
    experienceLevels: {
      junior: { min: 88000, max: 118000 },
      mid: { min: 115000, max: 165000 },
      senior: { min: 155000, max: 210000 },
    },
    topCompanies: ['BlackSky', 'Planet Labs', 'Spire Global', 'Capella Space'],
    growthRate: '+10% YoY',
    demandLevel: 'high',
    description: 'Define product roadmaps for satellite data platforms, analytics tools, and space services.',
    skills: ['Product Strategy', 'Agile', 'User Research', 'Data Analytics', 'Technical Communication'],
  },
  {
    id: 'government-relations',
    title: 'Government Relations Manager',
    category: 'business',
    salaryRange: { min: 110000, median: 165000, max: 240000, p25: 135000, p75: 198000 },
    locations: ['US'],
    experienceLevels: {
      junior: { min: 95000, max: 125000 },
      mid: { min: 120000, max: 175000 },
      senior: { min: 168000, max: 240000 },
    },
    topCompanies: ['Blue Origin', 'SpaceX', 'Northrop Grumman', 'Lockheed Martin'],
    growthRate: '+5% YoY',
    demandLevel: 'medium',
    description: 'Manage relationships with Congress, DoD, NASA, and regulatory agencies. Policy advocacy and legislative strategy.',
    skills: ['Policy Analysis', 'Legislative Affairs', 'Stakeholder Management', 'Public Speaking', 'Regulatory Knowledge'],
  },
  {
    id: 'space-strategy-analyst',
    title: 'Strategy Analyst',
    category: 'business',
    salaryRange: { min: 75000, median: 115000, max: 165000, p25: 92000, p75: 138000 },
    locations: ['US', 'Remote'],
    experienceLevels: {
      junior: { min: 68000, max: 92000 },
      mid: { min: 90000, max: 128000 },
      senior: { min: 125000, max: 165000 },
    },
    topCompanies: ['Axiom Space', 'Sierra Space', 'NSR/Euroconsult', 'Quilty Space'],
    growthRate: '+8% YoY',
    demandLevel: 'medium',
    description: 'Analyze market trends, competitive landscape, and growth opportunities in the commercial space sector.',
    skills: ['Market Research', 'Financial Modeling', 'Competitive Analysis', 'Presentation Skills', 'Space Industry Knowledge'],
  },
  {
    id: 'space-regulatory-counsel',
    title: 'Space Regulatory Counsel',
    category: 'business',
    salaryRange: { min: 120000, median: 185000, max: 275000, p25: 148000, p75: 225000 },
    locations: ['US', 'Remote'],
    experienceLevels: {
      junior: { min: 105000, max: 140000 },
      mid: { min: 135000, max: 195000 },
      senior: { min: 185000, max: 275000 },
    },
    topCompanies: ['Sierra Space', 'SpaceX', 'Blue Origin', 'Hogan Lovells'],
    growthRate: '+12% YoY',
    demandLevel: 'high',
    description: 'Navigate FCC, FAA, NOAA, and international regulatory frameworks for space activities. Licensing and compliance.',
    skills: ['Space Law', 'FCC Licensing', 'FAA Regulations', 'ITU Coordination', 'Export Control/ITAR'],
  },
  {
    id: 'supply-chain-manager',
    title: 'Supply Chain Manager',
    category: 'business',
    salaryRange: { min: 90000, median: 135000, max: 190000, p25: 110000, p75: 162000 },
    locations: ['US'],
    experienceLevels: {
      junior: { min: 78000, max: 105000 },
      mid: { min: 102000, max: 148000 },
      senior: { min: 142000, max: 190000 },
    },
    topCompanies: ['SpaceX', 'Blue Origin', 'Lockheed Martin', 'Northrop Grumman'],
    growthRate: '+6% YoY',
    demandLevel: 'medium',
    description: 'Manage aerospace supply chains, vendor qualification, and procurement for flight-critical components.',
    skills: ['Procurement', 'Vendor Management', 'AS9100', 'ERP Systems', 'Logistics'],
  },

  // ═══════════════════════════════════════════════════════════════
  // SCIENCE
  // ═══════════════════════════════════════════════════════════════
  {
    id: 'planetary-scientist',
    title: 'Planetary Scientist',
    category: 'science',
    salaryRange: { min: 85000, median: 140000, max: 200000, p25: 110000, p75: 168000 },
    locations: ['US', 'EU'],
    experienceLevels: {
      junior: { min: 75000, max: 105000 },
      mid: { min: 102000, max: 150000 },
      senior: { min: 142000, max: 200000 },
    },
    topCompanies: ['NASA JPL', 'NASA GSFC', 'APL/JHU', 'SwRI'],
    growthRate: '+4% YoY',
    demandLevel: 'medium',
    description: 'Study planetary geology, atmospheres, and habitability. Lead instrument science for planetary missions.',
    skills: ['Remote Sensing', 'Spectroscopy', 'Python', 'IDL', 'Data Analysis'],
  },
  {
    id: 'astrophysicist',
    title: 'Astrophysicist / Research Scientist',
    category: 'science',
    salaryRange: { min: 80000, median: 135000, max: 195000, p25: 105000, p75: 165000 },
    locations: ['US', 'EU'],
    experienceLevels: {
      junior: { min: 70000, max: 100000 },
      mid: { min: 98000, max: 148000 },
      senior: { min: 140000, max: 195000 },
    },
    topCompanies: ['NASA', 'STScI', 'Caltech', 'MIT'],
    growthRate: '+3% YoY',
    demandLevel: 'low',
    description: 'Conduct astronomical research, analyze data from space telescopes, and publish findings. Academic-adjacent positions.',
    skills: ['Python', 'Statistical Analysis', 'Simulation', 'Data Reduction', 'Scientific Writing'],
  },
  {
    id: 'earth-observation-scientist',
    title: 'Earth Observation Scientist',
    category: 'science',
    salaryRange: { min: 90000, median: 145000, max: 205000, p25: 115000, p75: 175000 },
    locations: ['US', 'EU', 'Remote'],
    experienceLevels: {
      junior: { min: 80000, max: 108000 },
      mid: { min: 105000, max: 158000 },
      senior: { min: 150000, max: 205000 },
    },
    topCompanies: ['Planet Labs', 'Maxar', 'ICEYE', 'Capella Space'],
    growthRate: '+12% YoY',
    demandLevel: 'high',
    description: 'Develop algorithms and products from satellite imagery for agriculture, defense, climate, and infrastructure monitoring.',
    skills: ['Remote Sensing', 'GIS', 'Python', 'Machine Learning', 'SAR Processing'],
  },
  {
    id: 'data-scientist-space',
    title: 'Data Scientist (Space/Geospatial)',
    category: 'science',
    salaryRange: { min: 100000, median: 160000, max: 230000, p25: 128000, p75: 195000 },
    locations: ['US', 'Remote'],
    experienceLevels: {
      junior: { min: 88000, max: 120000 },
      mid: { min: 118000, max: 175000 },
      senior: { min: 165000, max: 230000 },
    },
    topCompanies: ['Planet Labs', 'Capella Space', 'BlackSky', 'Spire Global'],
    growthRate: '+16% YoY',
    demandLevel: 'high',
    description: 'Apply ML/AI to satellite data, build predictive models, and develop automated analysis pipelines.',
    skills: ['Python', 'TensorFlow/PyTorch', 'Computer Vision', 'Geospatial Analysis', 'Cloud Computing'],
  },
  {
    id: 'ai-ml-scientist-space',
    title: 'AI/ML Scientist',
    category: 'science',
    salaryRange: { min: 120000, median: 185000, max: 270000, p25: 148000, p75: 225000 },
    locations: ['US', 'Remote'],
    experienceLevels: {
      junior: { min: 105000, max: 140000 },
      mid: { min: 135000, max: 198000 },
      senior: { min: 190000, max: 270000 },
    },
    topCompanies: ['Capella Space', 'Planet Labs', 'SpaceX', 'Slingshot Aerospace'],
    growthRate: '+20% YoY',
    demandLevel: 'high',
    description: 'Research and develop AI models for autonomous navigation, anomaly detection, and on-board satellite processing.',
    skills: ['Deep Learning', 'Computer Vision', 'PyTorch', 'ONNX', 'Edge ML'],
  },
  {
    id: 'materials-scientist',
    title: 'Materials Scientist (Space)',
    category: 'science',
    salaryRange: { min: 90000, median: 142000, max: 195000, p25: 112000, p75: 168000 },
    locations: ['US'],
    experienceLevels: {
      junior: { min: 78000, max: 108000 },
      mid: { min: 105000, max: 155000 },
      senior: { min: 148000, max: 195000 },
    },
    topCompanies: ['Varda Space Industries', 'Redwire', 'NASA MSFC', 'Northrop Grumman'],
    growthRate: '+8% YoY',
    demandLevel: 'medium',
    description: 'Research advanced materials for space applications including composites, ceramics, and in-space manufacturing.',
    skills: ['Materials Characterization', 'Composites', 'Metallurgy', 'Testing Standards', 'Microgravity Research'],
  },
  {
    id: 'orbital-analyst',
    title: 'Orbital Mechanics Analyst',
    category: 'science',
    salaryRange: { min: 90000, median: 140000, max: 190000, p25: 112000, p75: 165000 },
    locations: ['US', 'EU'],
    experienceLevels: {
      junior: { min: 82000, max: 108000 },
      mid: { min: 105000, max: 152000 },
      senior: { min: 145000, max: 190000 },
    },
    topCompanies: ['True Anomaly', 'AGI/Ansys', 'Aerospace Corp', 'NASA GSFC'],
    growthRate: '+9% YoY',
    demandLevel: 'medium',
    description: 'Compute transfer orbits, design mission trajectories, and perform astrodynamics analysis.',
    skills: ['Astrodynamics', 'GMAT', 'STK', 'Python', 'MATLAB'],
  },
  {
    id: 'space-weather-scientist',
    title: 'Space Weather Scientist',
    category: 'science',
    salaryRange: { min: 85000, median: 135000, max: 185000, p25: 108000, p75: 158000 },
    locations: ['US', 'EU', 'Remote'],
    experienceLevels: {
      junior: { min: 75000, max: 105000 },
      mid: { min: 100000, max: 148000 },
      senior: { min: 140000, max: 185000 },
    },
    topCompanies: ['NOAA SWPC', 'NASA GSFC', 'The Aerospace Corporation', 'APL/JHU'],
    growthRate: '+10% YoY',
    demandLevel: 'medium',
    description: 'Monitor and forecast solar activity impacts on satellites, communications, and power grids. Growing importance.',
    skills: ['Heliophysics', 'Space Plasma Physics', 'Python', 'Data Assimilation', 'Forecasting Models'],
  },

  // ═══════════════════════════════════════════════════════════════
  // EXECUTIVE
  // ═══════════════════════════════════════════════════════════════
  {
    id: 'cto-space',
    title: 'Chief Technology Officer',
    category: 'executive',
    salaryRange: { min: 250000, median: 375000, max: 550000, p25: 300000, p75: 450000 },
    locations: ['US'],
    experienceLevels: {
      junior: { min: 200000, max: 280000 },
      mid: { min: 275000, max: 400000 },
      senior: { min: 380000, max: 550000 },
    },
    topCompanies: ['Impulse Space', 'Sierra Space', 'Vast', 'Rocket Lab'],
    growthRate: '+5% YoY',
    demandLevel: 'low',
    description: 'Set technical vision and strategy for space companies. Oversee engineering, R&D, and technology roadmaps.',
    skills: ['Technical Leadership', 'Strategy', 'Team Building', 'Innovation', 'Board Communication'],
  },
  {
    id: 'coo-space',
    title: 'Chief Operating Officer',
    category: 'executive',
    salaryRange: { min: 240000, median: 350000, max: 500000, p25: 285000, p75: 425000 },
    locations: ['US'],
    experienceLevels: {
      junior: { min: 195000, max: 270000 },
      mid: { min: 265000, max: 380000 },
      senior: { min: 370000, max: 500000 },
    },
    topCompanies: ['SpaceX', 'Blue Origin', 'Rocket Lab', 'Planet Labs'],
    growthRate: '+4% YoY',
    demandLevel: 'low',
    description: 'Oversee daily operations, manufacturing, supply chain, and launch operations at scale.',
    skills: ['Operations Management', 'Scaling', 'Manufacturing', 'Process Improvement', 'Leadership'],
  },
  {
    id: 'vp-engineering',
    title: 'VP of Engineering',
    category: 'executive',
    salaryRange: { min: 220000, median: 310000, max: 450000, p25: 260000, p75: 375000 },
    locations: ['US'],
    experienceLevels: {
      junior: { min: 185000, max: 250000 },
      mid: { min: 245000, max: 340000 },
      senior: { min: 330000, max: 450000 },
    },
    topCompanies: ['SpaceX', 'Blue Origin', 'Relativity Space', 'Stoke Space'],
    growthRate: '+6% YoY',
    demandLevel: 'low',
    description: 'Lead large engineering organizations, set technical direction, and manage multi-program portfolios.',
    skills: ['Engineering Leadership', 'Technical Strategy', 'Talent Development', 'Budget Management', 'Cross-functional Leadership'],
  },
  {
    id: 'director-programs',
    title: 'Director of Programs',
    category: 'executive',
    salaryRange: { min: 180000, median: 255000, max: 360000, p25: 215000, p75: 310000 },
    locations: ['US'],
    experienceLevels: {
      junior: { min: 155000, max: 210000 },
      mid: { min: 205000, max: 278000 },
      senior: { min: 270000, max: 360000 },
    },
    topCompanies: ['Northrop Grumman', 'Lockheed Martin', 'RTX', 'L3Harris'],
    growthRate: '+4% YoY',
    demandLevel: 'medium',
    description: 'Manage portfolios of space programs, P&L responsibility, customer relationships, and strategic growth.',
    skills: ['Portfolio Management', 'P&L Management', 'Customer Relations', 'Strategic Planning', 'Government Acquisition'],
  },
  {
    id: 'director-business-dev',
    title: 'Director of Business Development',
    category: 'executive',
    salaryRange: { min: 180000, median: 260000, max: 380000, p25: 218000, p75: 325000 },
    locations: ['US'],
    experienceLevels: {
      junior: { min: 155000, max: 210000 },
      mid: { min: 205000, max: 285000 },
      senior: { min: 278000, max: 380000 },
    },
    topCompanies: ['SpaceX', 'Blue Origin', 'Northrop Grumman', 'L3Harris'],
    growthRate: '+6% YoY',
    demandLevel: 'medium',
    description: 'Lead capture of major government and commercial programs. Build customer relationships and strategic partnerships.',
    skills: ['Strategic Capture', 'Executive Relations', 'Proposal Leadership', 'Pipeline Management', 'Market Analysis'],
  },

  // ═══════════════════════════════════════════════════════════════
  // MANUFACTURING
  // ═══════════════════════════════════════════════════════════════
  {
    id: 'manufacturing-technician',
    title: 'Manufacturing Technician',
    category: 'manufacturing',
    salaryRange: { min: 50000, median: 75000, max: 105000, p25: 60000, p75: 88000 },
    locations: ['US'],
    experienceLevels: {
      junior: { min: 45000, max: 62000 },
      mid: { min: 60000, max: 82000 },
      senior: { min: 78000, max: 105000 },
    },
    topCompanies: ['SpaceX', 'Blue Origin', 'Relativity Space', 'Rocket Lab'],
    growthRate: '+8% YoY',
    demandLevel: 'high',
    description: 'Assemble, integrate, and test spacecraft hardware. Cleanroom operations, soldering, and harness fabrication.',
    skills: ['IPC-610', 'Soldering', 'Cleanroom Ops', 'Blueprint Reading', 'Mechanical Assembly'],
  },
  {
    id: 'quality-engineer',
    title: 'Quality Assurance Engineer',
    category: 'manufacturing',
    salaryRange: { min: 75000, median: 115000, max: 160000, p25: 92000, p75: 138000 },
    locations: ['US'],
    experienceLevels: {
      junior: { min: 68000, max: 90000 },
      mid: { min: 88000, max: 125000 },
      senior: { min: 120000, max: 160000 },
    },
    topCompanies: ['Redwire', 'Northrop Grumman', 'Lockheed Martin', 'Ball Aerospace'],
    growthRate: '+5% YoY',
    demandLevel: 'medium',
    description: 'Ensure flight hardware meets quality standards. Manage AS9100 compliance, NCRs, and supplier quality.',
    skills: ['AS9100', 'Root Cause Analysis', 'Statistical Methods', 'Auditing', 'MRB'],
  },
  {
    id: 'test-engineer',
    title: 'Test Engineer',
    category: 'manufacturing',
    salaryRange: { min: 80000, median: 120000, max: 165000, p25: 98000, p75: 142000 },
    locations: ['US'],
    experienceLevels: {
      junior: { min: 72000, max: 95000 },
      mid: { min: 92000, max: 132000 },
      senior: { min: 128000, max: 165000 },
    },
    topCompanies: ['Relativity Space', 'SpaceX', 'Rocket Lab', 'Aerojet Rocketdyne'],
    growthRate: '+7% YoY',
    demandLevel: 'high',
    description: 'Design and execute test campaigns for propulsion, structures, and avionics. Develop test procedures and analyze results.',
    skills: ['Test Planning', 'Data Acquisition', 'LabVIEW', 'Instrumentation', 'TVAC/Vibration'],
  },
  {
    id: 'machinist-cnc',
    title: 'CNC Machinist',
    category: 'manufacturing',
    salaryRange: { min: 50000, median: 78000, max: 110000, p25: 62000, p75: 92000 },
    locations: ['US'],
    experienceLevels: {
      junior: { min: 45000, max: 62000 },
      mid: { min: 60000, max: 85000 },
      senior: { min: 82000, max: 110000 },
    },
    topCompanies: ['SpaceX', 'Blue Origin', 'Relativity Space', 'Rocket Lab'],
    growthRate: '+6% YoY',
    demandLevel: 'high',
    description: 'Program and operate CNC machines for precision aerospace components. Work with exotic alloys and tight tolerances.',
    skills: ['CNC Programming', 'GD&T', 'Mastercam', 'Exotic Alloys', 'Precision Measurement'],
  },
  {
    id: 'additive-manufacturing-engineer',
    title: 'Additive Manufacturing Engineer',
    category: 'manufacturing',
    salaryRange: { min: 85000, median: 130000, max: 185000, p25: 105000, p75: 158000 },
    locations: ['US'],
    experienceLevels: {
      junior: { min: 75000, max: 100000 },
      mid: { min: 98000, max: 142000 },
      senior: { min: 135000, max: 185000 },
    },
    topCompanies: ['Relativity Space', 'SpaceX', 'Velo3D', 'Launcher'],
    growthRate: '+15% YoY',
    demandLevel: 'high',
    description: 'Develop and optimize 3D printing processes for rocket engines and spacecraft components. DMLS, SLM, and DED processes.',
    skills: ['Metal AM', 'Process Development', 'Metallurgy', 'CAD', 'Materials Testing'],
  },
  {
    id: 'production-supervisor',
    title: 'Production Supervisor',
    category: 'manufacturing',
    salaryRange: { min: 80000, median: 115000, max: 160000, p25: 95000, p75: 138000 },
    locations: ['US'],
    experienceLevels: {
      junior: { min: 72000, max: 95000 },
      mid: { min: 92000, max: 125000 },
      senior: { min: 120000, max: 160000 },
    },
    topCompanies: ['Apex', 'SpaceX', 'Blue Origin', 'Northrop Grumman'],
    growthRate: '+5% YoY',
    demandLevel: 'medium',
    description: 'Lead manufacturing teams, manage production schedules, and ensure on-time delivery of flight hardware.',
    skills: ['Team Leadership', 'Lean Manufacturing', 'Production Planning', 'Safety', 'Quality Systems'],
  },
  {
    id: 'composites-technician',
    title: 'Composites Technician',
    category: 'manufacturing',
    salaryRange: { min: 50000, median: 72000, max: 100000, p25: 58000, p75: 85000 },
    locations: ['US'],
    experienceLevels: {
      junior: { min: 42000, max: 58000 },
      mid: { min: 55000, max: 78000 },
      senior: { min: 75000, max: 100000 },
    },
    topCompanies: ['Rocket Lab', 'Northrop Grumman', 'SpaceX', 'Boeing'],
    growthRate: '+7% YoY',
    demandLevel: 'medium',
    description: 'Lay up, cure, and finish composite structures for fairings, interstages, and payload adapters.',
    skills: ['Composite Layup', 'Autoclave Operations', 'NDI', 'Blueprint Reading', 'Hand Layup'],
  },
  {
    id: 'spacecraft-integration-tech',
    title: 'Spacecraft Integration Technician',
    category: 'manufacturing',
    salaryRange: { min: 55000, median: 80000, max: 110000, p25: 65000, p75: 95000 },
    locations: ['US'],
    experienceLevels: {
      junior: { min: 48000, max: 68000 },
      mid: { min: 65000, max: 88000 },
      senior: { min: 85000, max: 110000 },
    },
    topCompanies: ['Sierra Space', 'Northrop Grumman', 'Lockheed Martin', 'Ball Aerospace'],
    growthRate: '+6% YoY',
    demandLevel: 'medium',
    description: 'Integrate spacecraft subsystems, route harnesses, and prepare vehicles for environmental testing and launch.',
    skills: ['Spacecraft Assembly', 'Harnessing', 'Cleanroom Ops', 'ESD Handling', 'Torque Procedures'],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Company Compensation Comparisons
// ─────────────────────────────────────────────────────────────────────────────

export const COMPANY_COMPENSATIONS: CompanyCompensation[] = [
  {
    company: 'SpaceX',
    slug: 'spacex',
    type: 'new-space',
    baseSalaryMultiplier: 0.90,
    equityNote: 'Significant equity grants (restricted stock). IPO potential makes equity very valuable. 10-year exercise window.',
    benefitsNote: 'Standard benefits package. On-site meals. High-performance culture with long hours expected.',
    culture: 'Move fast, work hard. 60-80 hour weeks common. Unmatched resume impact. High attrition but exceptional learning.',
  },
  {
    company: 'Blue Origin',
    slug: 'blue-origin',
    type: 'new-space',
    baseSalaryMultiplier: 1.05,
    equityNote: 'Phantom equity units. Less liquid than public companies but competitive grants.',
    benefitsNote: 'Strong benefits including 401k match, health, dental, vision. Good work-life balance compared to SpaceX.',
    culture: 'Methodical approach: "Gradatim Ferociter." Better work-life balance. Well-funded with long-term vision.',
  },
  {
    company: 'Rocket Lab',
    slug: 'rocket-lab',
    type: 'new-space',
    baseSalaryMultiplier: 0.95,
    equityNote: 'RSUs as publicly traded company (RKLB). Transparent equity value.',
    benefitsNote: 'Competitive benefits. Note: NZ employees earn significantly less than US counterparts.',
    culture: 'Scrappy, innovative culture. High execution speed. Peter Beck sets ambitious pace.',
  },
  {
    company: 'Northrop Grumman',
    slug: 'northrop-grumman',
    type: 'traditional-defense',
    baseSalaryMultiplier: 1.08,
    equityNote: 'Annual stock grants and ESPP (15% discount). Stable public company stock.',
    benefitsNote: 'Excellent benefits: pension (legacy), 6% 401k match, tuition reimbursement. Clearance bonuses $5-15K/yr.',
    culture: 'Stable, process-heavy. 40-hour weeks typical. Strong job security. Slower pace but reliable career growth.',
  },
  {
    company: 'L3Harris',
    slug: 'l3harris',
    type: 'traditional-defense',
    baseSalaryMultiplier: 1.05,
    equityNote: 'RSUs for senior roles. ESPP available.',
    benefitsNote: 'Strong benefits package. Clearance bonuses. 9/80 schedules common. Good PTO.',
    culture: 'Integration culture post-merger. Strong space division. Good work-life balance with 9/80 schedules.',
  },
  {
    company: 'Lockheed Martin',
    slug: 'lockheed-martin',
    type: 'traditional-defense',
    baseSalaryMultiplier: 1.10,
    equityNote: 'Annual RSU grants. ESPP with 15% discount. Strong dividend stock.',
    benefitsNote: 'Top-tier benefits: pension (legacy), 10% 401k match, tuition reimbursement up to $25K/yr.',
    culture: 'Largest defense contractor. Very structured. AWS/9-80 schedules. Strong career development programs.',
  },
  {
    company: 'RTX (Raytheon)',
    slug: 'rtx-corporation',
    type: 'traditional-defense',
    baseSalaryMultiplier: 1.06,
    equityNote: 'RSUs for management. ESPP available. Good dividend history.',
    benefitsNote: 'Solid benefits including pension (some divisions), 6% match, education assistance.',
    culture: 'Large organization with varied culture by division. Collins Aerospace and Raytheon space divisions.',
  },
  {
    company: 'NASA / JPL',
    slug: 'nasa-jpl',
    type: 'government',
    baseSalaryMultiplier: 0.85,
    equityNote: 'No equity. GS pay scale (GS-11 to GS-15 for engineers). Locality pay adjustments.',
    benefitsNote: 'Federal benefits: FERS pension, TSP with 5% match, excellent health insurance, 13-26 PTO days.',
    culture: 'Mission-driven culture. Excellent job security. Meaningful work on flagship missions. JPL (Caltech-managed) pays more than civil service.',
  },
  {
    company: 'Ball Aerospace',
    slug: 'ball-aerospace',
    type: 'traditional-defense',
    baseSalaryMultiplier: 1.00,
    equityNote: 'Part of BAE Systems now. Stock options through parent company.',
    benefitsNote: 'Competitive benefits. Beautiful Boulder location. Flexible schedules.',
    culture: 'Strong instrument heritage (JWST, Kepler). Great for science-focused engineers. Moderate pace.',
  },
  {
    company: 'Relativity Space',
    slug: 'relativity-space',
    type: 'startup',
    baseSalaryMultiplier: 0.95,
    equityNote: 'Pre-IPO equity. Significant upside potential. Standard 4-year vest with 1-year cliff.',
    benefitsNote: 'Startup benefits: good health coverage, unlimited PTO, meals. LA-based.',
    culture: 'Innovation-focused (3D-printed rockets). Startup energy with growing headcount. High potential.',
  },
  {
    company: 'Planet Labs',
    slug: 'planet-labs',
    type: 'new-space',
    baseSalaryMultiplier: 1.02,
    equityNote: 'RSUs as publicly traded company (PL). Reasonable grants for tech company.',
    benefitsNote: 'Strong tech-company benefits. Remote-friendly. Inclusive culture.',
    culture: 'Data company culture (not traditional aerospace). Remote-friendly. Mission to image Earth daily.',
  },
  {
    company: 'Sierra Space',
    slug: 'sierra-space',
    type: 'new-space',
    baseSalaryMultiplier: 0.98,
    equityNote: 'Pre-IPO equity. Dream Chaser and commercial space station programs driving growth.',
    benefitsNote: 'Good benefits. Colorado-based. Growing rapidly.',
    culture: 'Ambitious programs. Building Dream Chaser spaceplane and Orbital Reef. Exciting roadmap.',
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// FAQ Data for structured data
// ─────────────────────────────────────────────────────────────────────────────

export const SALARY_FAQS = [
  {
    question: 'What is the average salary for a space industry engineer?',
    answer: 'Space industry engineers earn a median salary of approximately $155,000 per year in the US, ranging from $80,000 for entry-level positions to over $245,000 for senior roles. Software engineers and propulsion engineers tend to earn the most, while mechanical and structures engineers earn slightly less. Salaries vary significantly by company, with traditional defense contractors generally offering higher base pay than startups.',
  },
  {
    question: 'Do SpaceX engineers get paid less than other space companies?',
    answer: 'SpaceX typically pays 5-10% below market rate for base salary, but compensates with significant equity grants. Because SpaceX is privately held with strong growth, the total compensation (base + equity) can exceed competitors. However, the work culture demands long hours (60-80 hours/week is common), which affects the effective hourly rate.',
  },
  {
    question: 'What are the highest paying jobs in the space industry?',
    answer: 'The highest paying roles in space are C-suite executives ($250K-$550K+), followed by VP-level positions ($220K-$450K), AI/ML scientists ($120K-$270K), space regulatory counsel ($120K-$275K), and senior software engineers ($160K-$245K). Defense contractors with security clearance requirements often pay premium salaries, with clearance bonuses adding $5K-$15K annually.',
  },
  {
    question: 'How much does NASA pay compared to private space companies?',
    answer: 'NASA civil servants earn according to the GS pay scale, typically 15-20% below private sector equivalents for engineering roles. However, NASA offers exceptional benefits including a FERS pension, TSP with 5% matching, excellent health insurance, and strong job security. JPL employees (managed by Caltech) earn more than civil service positions but still typically below private sector rates.',
  },
  {
    question: 'Is a security clearance worth more money in the space industry?',
    answer: 'Yes, holding a security clearance significantly increases earning potential. Cleared professionals earn 10-20% more than non-cleared equivalents. Major defense contractors like Northrop Grumman, L3Harris, and Lockheed Martin offer annual clearance retention bonuses of $5,000-$15,000 on top of higher base salaries. TS/SCI clearances command the largest premiums.',
  },
  {
    question: 'What skills are in highest demand in the space industry right now?',
    answer: 'The fastest-growing skill demands in the space industry include AI/ML for satellite data processing (+20% YoY growth), space traffic management (+18% YoY), additive manufacturing for rocket components (+15% YoY), data science for geospatial analytics (+16% YoY), and ECLSS/life support engineering (+14% YoY) driven by commercial space stations.',
  },
  {
    question: 'How do European space salaries compare to US space salaries?',
    answer: 'European space industry salaries are generally 20-35% lower than US equivalents in absolute terms. A systems engineer earning $145K in the US might earn EUR 80K-100K in Europe. However, European positions often include stronger social benefits, more vacation time, and better work-life balance. ESA, Airbus Defence & Space, and Thales are major European employers.',
  },
  {
    question: 'Are remote jobs available in the space industry?',
    answer: 'Remote work is increasingly available in the space industry, particularly for software engineering, data science, product management, marketing, and business analysis roles. However, hardware engineering, manufacturing, launch operations, and satellite integration typically require on-site presence. About 15-20% of space industry jobs now offer remote or hybrid arrangements.',
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Utility functions
// ─────────────────────────────────────────────────────────────────────────────

export function getRolesByCategory(category: SalaryCategory): SalaryRole[] {
  return SALARY_ROLES.filter((r) => r.category === category);
}

export function getAverageSalaryByCategory(): { category: SalaryCategory; label: string; median: number }[] {
  return SALARY_CATEGORIES.map((cat) => {
    const roles = getRolesByCategory(cat.id);
    const avgMedian = roles.length > 0
      ? Math.round(roles.reduce((sum, r) => sum + r.salaryRange.median, 0) / roles.length)
      : 0;
    return { category: cat.id, label: cat.label, median: avgMedian };
  });
}

export function filterRoles(options: {
  category?: SalaryCategory;
  location?: LocationRegion;
  experienceLevel?: 'junior' | 'mid' | 'senior';
  demandLevel?: DemandLevel;
  search?: string;
}): SalaryRole[] {
  let roles = [...SALARY_ROLES];

  if (options.category) {
    roles = roles.filter((r) => r.category === options.category);
  }
  if (options.location) {
    roles = roles.filter((r) => r.locations.includes(options.location!));
  }
  if (options.demandLevel) {
    roles = roles.filter((r) => r.demandLevel === options.demandLevel);
  }
  if (options.search) {
    const q = options.search.toLowerCase();
    roles = roles.filter(
      (r) =>
        r.title.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q) ||
        r.skills.some((s) => s.toLowerCase().includes(q))
    );
  }

  return roles;
}
