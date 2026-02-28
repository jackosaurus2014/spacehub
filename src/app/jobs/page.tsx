'use client';

import React, { useState, useMemo, useCallback } from 'react';
import AnimatedPageHeader from '@/components/ui/AnimatedPageHeader';
import ScrollReveal, {
  StaggerContainer,
  StaggerItem,
} from '@/components/ui/ScrollReveal';
import Breadcrumbs from '@/components/ui/Breadcrumbs';
import JobPostingSchema from '@/components/seo/JobPostingSchema';
import { motion, AnimatePresence } from 'framer-motion';
import RelatedModules from '@/components/ui/RelatedModules';
import { PAGE_RELATIONS } from '@/lib/module-relationships';
import EmptyState from '@/components/ui/EmptyState';

// ────────────────────────────────────────
// Types
// ────────────────────────────────────────

type ExperienceLevel = 'Entry' | 'Mid' | 'Senior' | 'Lead' | 'Director';
type JobType = 'Full-time' | 'Contract' | 'Part-time' | 'Internship';
type LocationType = 'Remote' | 'Hybrid' | 'On-site';
type JobCategory =
  | 'Engineering'
  | 'Science'
  | 'Business'
  | 'Operations'
  | 'Software'
  | 'Manufacturing';
type SortOption = 'newest' | 'salary-high' | 'salary-low' | 'company-az';

interface JobPosting {
  id: number;
  title: string;
  company: string;
  location: string;
  locationType: LocationType;
  salaryMin: number;
  salaryMax: number;
  postedDate: string;
  experienceLevel: ExperienceLevel;
  jobType: JobType;
  category: JobCategory;
  skills: string[];
  description: string;
  requirements: string[];
  applyUrl: string;
  companyColor: string;
}

// ────────────────────────────────────────
// Company color map
// ────────────────────────────────────────

const COMPANY_COLORS: Record<string, string> = {
  SpaceX: 'bg-slate-700',
  'Blue Origin': 'bg-blue-700',
  'Rocket Lab': 'bg-red-700',
  'Relativity Space': 'bg-orange-600',
  'Firefly Aerospace': 'bg-yellow-600',
  'Northrop Grumman': 'bg-indigo-700',
  'Lockheed Martin': 'bg-blue-800',
  L3Harris: 'bg-emerald-700',
  'BAE Systems': 'bg-red-800',
  'Planet Labs': 'bg-cyan-700',
  Maxar: 'bg-purple-700',
  BlackSky: 'bg-slate-600',
  'Spire Global': 'bg-teal-700',
  'Axiom Space': 'bg-amber-700',
  'Sierra Space': 'bg-sky-700',
  Astroscale: 'bg-violet-700',
  'NASA JPL': 'bg-red-600',
  ESA: 'bg-blue-600',
  JAXA: 'bg-rose-700',
  Astranis: 'bg-fuchsia-700',
  'Varda Space': 'bg-pink-700',
  'Impulse Space': 'bg-lime-700',
  'Stoke Space': 'bg-orange-700',
  'United Launch Alliance': 'bg-blue-900',
  'Virgin Orbit': 'bg-red-600',
  'Terran Orbital': 'bg-sky-800',
  'ABL Space Systems': 'bg-emerald-800',
  'Muon Space': 'bg-indigo-600',
  'York Space Systems': 'bg-teal-800',
  'True Anomaly': 'bg-slate-500',
};

function getCompanyColor(company: string): string {
  return COMPANY_COLORS[company] || 'bg-cyan-700';
}

// ────────────────────────────────────────
// Job data (42 postings)
// ────────────────────────────────────────

const JOB_POSTINGS: JobPosting[] = [
  {
    id: 1,
    title: 'Senior Propulsion Engineer',
    company: 'SpaceX',
    location: 'Hawthorne, CA',
    locationType: 'On-site',
    salaryMin: 150000,
    salaryMax: 200000,
    postedDate: '2026-02-25',
    experienceLevel: 'Senior',
    jobType: 'Full-time',
    category: 'Engineering',
    skills: ['Propulsion Systems', 'Thermodynamics', 'CFD', 'Python', 'MATLAB'],
    description:
      'Design and develop next-generation Raptor engine components for the Starship program. Work closely with the test operations team to validate hardware through hot-fire campaigns. Lead root-cause analysis of anomalies and drive continuous improvement of engine performance and reliability.',
    requirements: [
      'MS or PhD in Aerospace, Mechanical, or related engineering',
      '7+ years propulsion experience',
      'Experience with liquid rocket engines',
      'Proficiency in CFD and FEA tools',
      'US Citizenship or permanent residency required',
    ],
    applyUrl: '#',
    companyColor: getCompanyColor('SpaceX'),
  },
  {
    id: 2,
    title: 'GNC Software Engineer',
    company: 'SpaceX',
    location: 'Hawthorne, CA',
    locationType: 'On-site',
    salaryMin: 140000,
    salaryMax: 190000,
    postedDate: '2026-02-24',
    experienceLevel: 'Mid',
    jobType: 'Full-time',
    category: 'Software',
    skills: ['C++', 'Python', 'Guidance Navigation & Control', 'Embedded Systems', 'Simulink'],
    description:
      'Develop and validate guidance, navigation, and control algorithms for Falcon 9, Falcon Heavy, and Starship vehicles. Implement flight software in C++ for real-time embedded systems. Build high-fidelity simulation environments for Monte Carlo analysis.',
    requirements: [
      'BS in Aerospace, Computer Science, or related field',
      '4+ years GNC or flight software experience',
      'Strong C++ and Python skills',
      'Experience with real-time embedded systems',
      'ITAR: US Person required',
    ],
    applyUrl: '#',
    companyColor: getCompanyColor('SpaceX'),
  },
  {
    id: 3,
    title: 'Avionics Systems Engineer',
    company: 'Blue Origin',
    location: 'Kent, WA',
    locationType: 'On-site',
    salaryMin: 135000,
    salaryMax: 175000,
    postedDate: '2026-02-23',
    experienceLevel: 'Mid',
    jobType: 'Full-time',
    category: 'Engineering',
    skills: ['Avionics', 'Systems Engineering', 'DO-178C', 'VHDL', 'CAN Bus'],
    description:
      'Design and integrate avionics subsystems for the New Glenn launch vehicle. Develop requirements, interface documents, and verification plans. Collaborate with hardware and software teams to ensure system-level performance.',
    requirements: [
      'BS in Electrical or Aerospace Engineering',
      '5+ years avionics systems experience',
      'Knowledge of DO-178C and DO-254 standards',
      'Experience with space-rated electronics',
      'Must be a US citizen',
    ],
    applyUrl: '#',
    companyColor: getCompanyColor('Blue Origin'),
  },
  {
    id: 4,
    title: 'Orbital Mechanics Analyst',
    company: 'NASA JPL',
    location: 'Pasadena, CA',
    locationType: 'Hybrid',
    salaryMin: 120000,
    salaryMax: 165000,
    postedDate: '2026-02-22',
    experienceLevel: 'Mid',
    jobType: 'Full-time',
    category: 'Science',
    skills: ['Orbital Mechanics', 'GMAT', 'STK', 'Python', 'Astrodynamics'],
    description:
      'Perform trajectory design and mission analysis for deep-space exploration missions. Develop optimized transfer trajectories using gravity assists, low-thrust propulsion, and multi-body dynamics. Support mission planning for upcoming Europa Clipper and Mars Sample Return campaigns.',
    requirements: [
      'MS or PhD in Astrodynamics, Aerospace Engineering, or Physics',
      '3+ years mission design experience',
      'Proficiency in GMAT, STK, or equivalent tools',
      'Strong mathematical background in orbital mechanics',
      'US Citizenship required (JPL/NASA clearance)',
    ],
    applyUrl: '#',
    companyColor: getCompanyColor('NASA JPL'),
  },
  {
    id: 5,
    title: 'Satellite RF Engineer',
    company: 'L3Harris',
    location: 'Melbourne, FL',
    locationType: 'On-site',
    salaryMin: 110000,
    salaryMax: 155000,
    postedDate: '2026-02-22',
    experienceLevel: 'Mid',
    jobType: 'Full-time',
    category: 'Engineering',
    skills: ['RF Engineering', 'Antenna Design', 'Signal Processing', 'HFSS', 'Link Budget Analysis'],
    description:
      'Design and develop RF payloads for next-generation satellite communication systems. Perform link budget analysis, antenna pattern measurements, and EMI/EMC testing. Support integration and test campaigns for government and commercial programs.',
    requirements: [
      'BS or MS in Electrical Engineering',
      '4+ years RF or microwave engineering experience',
      'Experience with satellite communication systems',
      'Proficiency with HFSS, CST, or ADS tools',
      'Active Secret clearance or ability to obtain',
    ],
    applyUrl: '#',
    companyColor: getCompanyColor('L3Harris'),
  },
  {
    id: 6,
    title: 'Director of Mission Operations',
    company: 'Axiom Space',
    location: 'Houston, TX',
    locationType: 'On-site',
    salaryMin: 200000,
    salaryMax: 280000,
    postedDate: '2026-02-21',
    experienceLevel: 'Director',
    jobType: 'Full-time',
    category: 'Operations',
    skills: ['Mission Operations', 'Leadership', 'ISS Operations', 'Flight Director', 'Risk Management'],
    description:
      'Lead the mission operations team for Axiom commercial space station modules. Oversee flight controller training, mission planning, and real-time operations. Build the operations infrastructure for the world\'s first commercial space station.',
    requirements: [
      'BS in Engineering or related STEM field',
      '15+ years space operations experience',
      'Prior ISS flight controller or flight director experience strongly preferred',
      'Proven leadership of 20+ person technical teams',
      'US Citizenship required',
    ],
    applyUrl: '#',
    companyColor: getCompanyColor('Axiom Space'),
  },
  {
    id: 7,
    title: 'Additive Manufacturing Engineer',
    company: 'Relativity Space',
    location: 'Long Beach, CA',
    locationType: 'On-site',
    salaryMin: 120000,
    salaryMax: 170000,
    postedDate: '2026-02-21',
    experienceLevel: 'Mid',
    jobType: 'Full-time',
    category: 'Manufacturing',
    skills: ['Additive Manufacturing', '3D Printing', 'Metallurgy', 'DfAM', 'Process Development'],
    description:
      'Develop and optimize metal additive manufacturing processes for Terran R rocket components. Drive process parameter development, material characterization, and quality control procedures. Work at the intersection of AI-driven manufacturing and rocket science.',
    requirements: [
      'BS or MS in Materials Science, Mechanical Engineering, or related field',
      '3+ years additive manufacturing experience',
      'Knowledge of metal AM processes (WAAM, LPBF, DED)',
      'Experience with process parameter optimization',
      'US Person status required',
    ],
    applyUrl: '#',
    companyColor: getCompanyColor('Relativity Space'),
  },
  {
    id: 8,
    title: 'Satellite Imagery Data Scientist',
    company: 'Planet Labs',
    location: 'San Francisco, CA',
    locationType: 'Hybrid',
    salaryMin: 140000,
    salaryMax: 185000,
    postedDate: '2026-02-20',
    experienceLevel: 'Senior',
    jobType: 'Full-time',
    category: 'Science',
    skills: ['Machine Learning', 'Computer Vision', 'Python', 'TensorFlow', 'Remote Sensing', 'GIS'],
    description:
      'Build machine learning models to extract insights from Planet\'s daily global satellite imagery. Develop computer vision pipelines for change detection, object classification, and environmental monitoring. Drive product features that make geospatial analytics accessible to millions.',
    requirements: [
      'MS or PhD in Computer Science, Remote Sensing, or related field',
      '5+ years ML/CV experience with geospatial data',
      'Strong Python skills (TensorFlow/PyTorch, scikit-learn)',
      'Experience with large-scale data pipelines',
      'Publications in remote sensing or CV preferred',
    ],
    applyUrl: '#',
    companyColor: getCompanyColor('Planet Labs'),
  },
  {
    id: 9,
    title: 'Launch Vehicle Structures Engineer',
    company: 'Rocket Lab',
    location: 'Long Beach, CA',
    locationType: 'On-site',
    salaryMin: 115000,
    salaryMax: 160000,
    postedDate: '2026-02-20',
    experienceLevel: 'Mid',
    jobType: 'Full-time',
    category: 'Engineering',
    skills: ['Structural Analysis', 'FEA', 'Composites', 'Nastran', 'Fatigue & Fracture'],
    description:
      'Perform structural design and analysis for the Neutron launch vehicle. Develop finite element models, perform load analysis, and validate composite structure designs. Support testing campaigns from component-level through full-scale static testing.',
    requirements: [
      'BS or MS in Aerospace or Mechanical Engineering',
      '4+ years structural analysis experience',
      'Proficiency in Nastran, Abaqus, or HyperMesh',
      'Experience with composite materials analysis',
      'Must be legally authorized to work in the US',
    ],
    applyUrl: '#',
    companyColor: getCompanyColor('Rocket Lab'),
  },
  {
    id: 10,
    title: 'Space Debris Remediation Engineer',
    company: 'Astroscale',
    location: 'Denver, CO',
    locationType: 'Hybrid',
    salaryMin: 125000,
    salaryMax: 170000,
    postedDate: '2026-02-19',
    experienceLevel: 'Senior',
    jobType: 'Full-time',
    category: 'Engineering',
    skills: ['Rendezvous & Proximity Operations', 'Robotics', 'Systems Engineering', 'GNC', 'CONOPS'],
    description:
      'Design systems for active debris removal and satellite servicing missions. Develop concepts of operations for autonomous rendezvous and capture maneuvers. Lead trade studies for end-effector design and de-orbit strategies.',
    requirements: [
      'MS in Aerospace Engineering or Robotics',
      '6+ years spacecraft systems experience',
      'Knowledge of rendezvous & proximity operations',
      'Experience with robotic systems or mechanisms',
      'Familiarity with space sustainability guidelines',
    ],
    applyUrl: '#',
    companyColor: getCompanyColor('Astroscale'),
  },
  {
    id: 11,
    title: 'Spacecraft Integration & Test Lead',
    company: 'Sierra Space',
    location: 'Louisville, CO',
    locationType: 'On-site',
    salaryMin: 140000,
    salaryMax: 185000,
    postedDate: '2026-02-19',
    experienceLevel: 'Lead',
    jobType: 'Full-time',
    category: 'Engineering',
    skills: ['I&T', 'Spacecraft Testing', 'Cleanroom Operations', 'EMI/EMC', 'Thermal Vacuum'],
    description:
      'Lead integration and test activities for the Dream Chaser spaceplane. Coordinate multi-disciplinary teams through assembly, functional testing, and environmental test campaigns. Define test procedures and manage the I&T schedule.',
    requirements: [
      'BS in Aerospace or Mechanical Engineering',
      '8+ years spacecraft I&T experience',
      'Experience leading test campaigns (TVAC, vibration, EMI/EMC)',
      'Strong project management and leadership skills',
      'US Citizenship required',
    ],
    applyUrl: '#',
    companyColor: getCompanyColor('Sierra Space'),
  },
  {
    id: 12,
    title: 'GEO Satellite Payload Engineer',
    company: 'Astranis',
    location: 'San Francisco, CA',
    locationType: 'On-site',
    salaryMin: 130000,
    salaryMax: 175000,
    postedDate: '2026-02-18',
    experienceLevel: 'Mid',
    jobType: 'Full-time',
    category: 'Engineering',
    skills: ['Payload Design', 'RF Systems', 'Digital Signal Processing', 'FPGA', 'SATCOM'],
    description:
      'Design and develop communication payloads for small GEO broadband satellites. Work on next-generation software-defined radio architectures. Optimize payload performance for connectivity in underserved markets worldwide.',
    requirements: [
      'BS or MS in Electrical Engineering or Computer Engineering',
      '3+ years satellite payload or RF systems experience',
      'FPGA development experience (Verilog/VHDL)',
      'Understanding of digital communication theory',
      'US Person status required',
    ],
    applyUrl: '#',
    companyColor: getCompanyColor('Astranis'),
  },
  {
    id: 13,
    title: 'In-Space Manufacturing Scientist',
    company: 'Varda Space',
    location: 'El Segundo, CA',
    locationType: 'On-site',
    salaryMin: 130000,
    salaryMax: 180000,
    postedDate: '2026-02-18',
    experienceLevel: 'Senior',
    jobType: 'Full-time',
    category: 'Science',
    skills: ['Microgravity Research', 'Pharmaceuticals', 'Crystal Growth', 'Materials Science', 'DOE'],
    description:
      'Design and execute microgravity manufacturing experiments for pharmaceutical and advanced materials production. Develop processes for protein crystal growth and semiconductor manufacturing aboard autonomous space factories. Analyze results and iterate on process parameters.',
    requirements: [
      'PhD in Chemistry, Materials Science, Pharmaceutical Sciences, or related field',
      '3+ years crystallization or process development experience',
      'Experience with design of experiments (DOE)',
      'Understanding of microgravity effects on material processes',
      'Strong publication record preferred',
    ],
    applyUrl: '#',
    companyColor: getCompanyColor('Varda Space'),
  },
  {
    id: 14,
    title: 'Upper Stage Propulsion Engineer',
    company: 'Impulse Space',
    location: 'Redondo Beach, CA',
    locationType: 'On-site',
    salaryMin: 125000,
    salaryMax: 165000,
    postedDate: '2026-02-17',
    experienceLevel: 'Mid',
    jobType: 'Full-time',
    category: 'Engineering',
    skills: ['Propulsion', 'Pressure Systems', 'Fluid Dynamics', 'CAD', 'Test Operations'],
    description:
      'Design propulsion systems for orbital transfer vehicles and lunar landers. Develop propellant management systems, pressurization architectures, and thruster assemblies. Support hot-fire test campaigns and flight hardware acceptance.',
    requirements: [
      'BS or MS in Aerospace or Mechanical Engineering',
      '3+ years propulsion or fluid systems experience',
      'Hands-on hardware experience preferred',
      'Proficiency in CAD (NX, SolidWorks, or equivalent)',
      'Must be a US Person',
    ],
    applyUrl: '#',
    companyColor: getCompanyColor('Impulse Space'),
  },
  {
    id: 15,
    title: 'Reusable Rocket Test Engineer',
    company: 'Stoke Space',
    location: 'Kent, WA',
    locationType: 'On-site',
    salaryMin: 110000,
    salaryMax: 155000,
    postedDate: '2026-02-17',
    experienceLevel: 'Mid',
    jobType: 'Full-time',
    category: 'Engineering',
    skills: ['Test Engineering', 'Data Acquisition', 'LabVIEW', 'Cryogenic Systems', 'Propulsion Test'],
    description:
      'Plan and execute propulsion and integrated vehicle test campaigns for a fully reusable rocket. Design test setups, instrumentation plans, and data acquisition systems. Operate cryogenic propellant systems and analyze test data to validate flight readiness.',
    requirements: [
      'BS in Mechanical, Aerospace, or related Engineering',
      '3+ years test engineering experience',
      'Hands-on experience with propulsion test stands',
      'Proficiency in LabVIEW or similar DAQ software',
      'US Citizenship required',
    ],
    applyUrl: '#',
    companyColor: getCompanyColor('Stoke Space'),
  },
  {
    id: 16,
    title: 'Spacecraft Flight Software Developer',
    company: 'Northrop Grumman',
    location: 'Dulles, VA',
    locationType: 'On-site',
    salaryMin: 130000,
    salaryMax: 180000,
    postedDate: '2026-02-16',
    experienceLevel: 'Senior',
    jobType: 'Full-time',
    category: 'Software',
    skills: ['C', 'C++', 'RTOS', 'Flight Software', 'DO-178B', 'Unit Testing'],
    description:
      'Develop flight software for the Cygnus spacecraft and next-generation satellite platforms. Implement command & data handling, fault detection, and autonomous operations software. Ensure compliance with NASA safety and quality standards.',
    requirements: [
      'BS or MS in Computer Science or Software Engineering',
      '7+ years embedded/flight software experience',
      'Strong C/C++ programming skills',
      'Experience with RTOS (VxWorks, RTEMS, or similar)',
      'Active Secret clearance preferred',
    ],
    applyUrl: '#',
    companyColor: getCompanyColor('Northrop Grumman'),
  },
  {
    id: 17,
    title: 'Space Systems Business Development Manager',
    company: 'Lockheed Martin',
    location: 'Denver, CO',
    locationType: 'Hybrid',
    salaryMin: 150000,
    salaryMax: 210000,
    postedDate: '2026-02-15',
    experienceLevel: 'Senior',
    jobType: 'Full-time',
    category: 'Business',
    skills: ['Business Development', 'Proposal Writing', 'DoD Acquisition', 'Strategic Planning', 'CRM'],
    description:
      'Identify and capture new business opportunities in the national security space domain. Build relationships with DoD, NRO, and Space Force customers. Lead proposal development for multi-billion dollar space programs and drive strategic growth initiatives.',
    requirements: [
      'BS in Engineering or Business; MBA preferred',
      '10+ years space industry experience with 5+ in BD',
      'Deep knowledge of DoD space acquisition processes',
      'Proven capture management track record',
      'Active TS/SCI clearance required',
    ],
    applyUrl: '#',
    companyColor: getCompanyColor('Lockheed Martin'),
  },
  {
    id: 18,
    title: 'Satellite Constellation Analyst',
    company: 'Spire Global',
    location: 'Boulder, CO',
    locationType: 'Remote',
    salaryMin: 100000,
    salaryMax: 140000,
    postedDate: '2026-02-15',
    experienceLevel: 'Mid',
    jobType: 'Full-time',
    category: 'Science',
    skills: ['Orbital Analysis', 'Python', 'GNSS-RO', 'Data Analysis', 'Constellation Design'],
    description:
      'Analyze and optimize Spire\'s 100+ satellite constellation for weather data collection and maritime tracking. Develop tools for coverage analysis, contact scheduling, and orbit maintenance planning. Process and validate GNSS radio occultation data for weather forecasting.',
    requirements: [
      'BS or MS in Aerospace Engineering, Physics, or Atmospheric Science',
      '3+ years satellite operations or analysis experience',
      'Strong Python programming skills',
      'Understanding of LEO constellation dynamics',
      'Experience with GNSS or remote sensing data a plus',
    ],
    applyUrl: '#',
    companyColor: getCompanyColor('Spire Global'),
  },
  {
    id: 19,
    title: 'Space Situational Awareness Engineer',
    company: 'BAE Systems',
    location: 'Colorado Springs, CO',
    locationType: 'On-site',
    salaryMin: 120000,
    salaryMax: 165000,
    postedDate: '2026-02-14',
    experienceLevel: 'Mid',
    jobType: 'Full-time',
    category: 'Engineering',
    skills: ['SSA', 'Radar Systems', 'Orbit Determination', 'Sensor Fusion', 'MATLAB'],
    description:
      'Develop algorithms for space object tracking, conjunction assessment, and space domain awareness. Process data from ground-based radar and optical sensors. Support US Space Command operational mission with advanced catalog maintenance tools.',
    requirements: [
      'MS in Aerospace Engineering, Physics, or Applied Math',
      '4+ years SSA or astrodynamics experience',
      'Proficiency in MATLAB and Python',
      'Understanding of estimation theory and sensor fusion',
      'Active Secret clearance; TS/SCI preferred',
    ],
    applyUrl: '#',
    companyColor: getCompanyColor('BAE Systems'),
  },
  {
    id: 20,
    title: 'Earth Observation Product Manager',
    company: 'BlackSky',
    location: 'Herndon, VA',
    locationType: 'Hybrid',
    salaryMin: 130000,
    salaryMax: 170000,
    postedDate: '2026-02-14',
    experienceLevel: 'Senior',
    jobType: 'Full-time',
    category: 'Business',
    skills: ['Product Management', 'Geospatial Intelligence', 'Agile', 'GEOINT', 'Market Analysis'],
    description:
      'Own the product roadmap for BlackSky\'s real-time intelligence platform. Define requirements for satellite tasking, imagery analytics, and AI-driven monitoring products. Work with engineering, sales, and government customers to deliver high-impact capabilities.',
    requirements: [
      'BS in Engineering, CS, or related field; MBA a plus',
      '5+ years product management in geospatial or defense tech',
      'Knowledge of GEOINT tradecraft and IC customer needs',
      'Experience with agile product development',
      'Active security clearance preferred',
    ],
    applyUrl: '#',
    companyColor: getCompanyColor('BlackSky'),
  },
  {
    id: 21,
    title: 'Satellite Ground Systems Software Engineer',
    company: 'Maxar',
    location: 'Westminster, CO',
    locationType: 'Hybrid',
    salaryMin: 120000,
    salaryMax: 160000,
    postedDate: '2026-02-13',
    experienceLevel: 'Mid',
    jobType: 'Full-time',
    category: 'Software',
    skills: ['Java', 'Kubernetes', 'AWS', 'Ground Systems', 'Microservices', 'CI/CD'],
    description:
      'Build and maintain cloud-native ground system software for Maxar\'s Earth observation satellite constellation. Develop microservices for satellite commanding, telemetry processing, and mission planning. Deploy and operate systems on AWS using Kubernetes and modern DevOps practices.',
    requirements: [
      'BS in Computer Science or Software Engineering',
      '4+ years software development experience',
      'Strong Java or Kotlin skills',
      'Experience with AWS, Kubernetes, and CI/CD pipelines',
      'US Citizenship required; clearance preferred',
    ],
    applyUrl: '#',
    companyColor: getCompanyColor('Maxar'),
  },
  {
    id: 22,
    title: 'Thermal Engineer',
    company: 'Blue Origin',
    location: 'Kent, WA',
    locationType: 'On-site',
    salaryMin: 120000,
    salaryMax: 165000,
    postedDate: '2026-02-13',
    experienceLevel: 'Mid',
    jobType: 'Full-time',
    category: 'Engineering',
    skills: ['Thermal Analysis', 'Thermal Desktop', 'SINDA', 'Heat Transfer', 'Cryogenics'],
    description:
      'Perform thermal analysis and design for the New Glenn upper stage and spacecraft systems. Develop thermal models, select thermal control hardware, and support test correlation activities. Analyze cryogenic propellant management and boil-off mitigation strategies.',
    requirements: [
      'BS or MS in Aerospace, Mechanical, or related Engineering',
      '4+ years thermal engineering experience',
      'Proficiency in Thermal Desktop, SINDA, or ANSYS',
      'Experience with cryogenic or launch vehicle thermal systems',
      'Must be a US citizen',
    ],
    applyUrl: '#',
    companyColor: getCompanyColor('Blue Origin'),
  },
  {
    id: 23,
    title: 'Space Policy Analyst',
    company: 'ESA',
    location: 'Washington, DC',
    locationType: 'Hybrid',
    salaryMin: 95000,
    salaryMax: 130000,
    postedDate: '2026-02-12',
    experienceLevel: 'Mid',
    jobType: 'Full-time',
    category: 'Business',
    skills: ['Space Policy', 'International Relations', 'Technical Writing', 'Regulatory Affairs', 'ITAR/EAR'],
    description:
      'Support ESA\'s Washington liaison office in analyzing US space policy developments and their implications for international cooperation. Draft policy briefs, coordinate with NASA and State Department counterparts, and facilitate transatlantic space collaboration initiatives.',
    requirements: [
      'MA in International Relations, Space Policy, or Law',
      '3+ years space policy or government affairs experience',
      'Understanding of international space law and export controls',
      'Excellent written and verbal communication skills',
      'EU citizenship preferred; US work authorization required',
    ],
    applyUrl: '#',
    companyColor: getCompanyColor('ESA'),
  },
  {
    id: 24,
    title: 'Robotics Software Engineer',
    company: 'NASA JPL',
    location: 'Pasadena, CA',
    locationType: 'On-site',
    salaryMin: 135000,
    salaryMax: 175000,
    postedDate: '2026-02-12',
    experienceLevel: 'Senior',
    jobType: 'Full-time',
    category: 'Software',
    skills: ['ROS', 'C++', 'Python', 'Autonomous Navigation', 'Computer Vision', 'SLAM'],
    description:
      'Develop autonomous navigation and manipulation software for planetary rovers and ocean world explorers. Implement SLAM algorithms, path planning, and hazard avoidance systems. Contribute to flight software for Mars Sample Return and Europa surface missions.',
    requirements: [
      'MS or PhD in Robotics, CS, or Aerospace Engineering',
      '5+ years robotics software experience',
      'Proficiency in C++, Python, and ROS/ROS2',
      'Experience with computer vision and SLAM',
      'US Citizenship required (JPL clearance)',
    ],
    applyUrl: '#',
    companyColor: getCompanyColor('NASA JPL'),
  },
  {
    id: 25,
    title: 'Rocket Engine Test Technician',
    company: 'Firefly Aerospace',
    location: 'Briggs, TX',
    locationType: 'On-site',
    salaryMin: 65000,
    salaryMax: 95000,
    postedDate: '2026-02-11',
    experienceLevel: 'Entry',
    jobType: 'Full-time',
    category: 'Manufacturing',
    skills: ['Test Operations', 'Cryogenic Systems', 'Hydraulics', 'Pneumatics', 'Safety Systems'],
    description:
      'Support hot-fire test operations for Alpha and MLV rocket engines. Operate cryogenic propellant systems, maintain test stand infrastructure, and assist in data reduction. Work in a fast-paced environment at our central Texas test facility.',
    requirements: [
      'Associate degree or technical certification in Mechanical/Aerospace technology',
      '1+ years hands-on experience with mechanical systems',
      'Willingness to work outdoors in varying conditions',
      'Understanding of pressure systems and cryogenics a plus',
      'Must be a US Person',
    ],
    applyUrl: '#',
    companyColor: getCompanyColor('Firefly Aerospace'),
  },
  {
    id: 26,
    title: 'Machine Learning Engineer - Space Weather',
    company: 'Spire Global',
    location: 'Remote, US',
    locationType: 'Remote',
    salaryMin: 130000,
    salaryMax: 175000,
    postedDate: '2026-02-11',
    experienceLevel: 'Senior',
    jobType: 'Full-time',
    category: 'Software',
    skills: ['Machine Learning', 'Python', 'PyTorch', 'Weather Modeling', 'Data Engineering', 'Cloud'],
    description:
      'Build ML models that transform satellite-collected radio occultation data into actionable weather predictions. Develop end-to-end pipelines from raw data ingestion through model training and real-time inference. Collaborate with atmospheric scientists to advance the state of the art in space-based weather forecasting.',
    requirements: [
      'MS or PhD in Machine Learning, Atmospheric Science, or related field',
      '5+ years ML engineering experience',
      'Strong Python and PyTorch/TensorFlow skills',
      'Experience with geophysical or atmospheric data',
      'Ability to work independently in a distributed team',
    ],
    applyUrl: '#',
    companyColor: getCompanyColor('Spire Global'),
  },
  {
    id: 27,
    title: 'Lunar Surface Operations Planner',
    company: 'Blue Origin',
    location: 'Houston, TX',
    locationType: 'On-site',
    salaryMin: 140000,
    salaryMax: 190000,
    postedDate: '2026-02-10',
    experienceLevel: 'Senior',
    jobType: 'Full-time',
    category: 'Operations',
    skills: ['Mission Planning', 'EVA Operations', 'Lunar Science', 'CONOPS', 'Human Factors'],
    description:
      'Develop mission operations concepts for the Blue Moon lander and Artemis lunar surface activities. Plan EVA timelines, surface traverse routes, and science experiment sequences. Coordinate with NASA and international partners on landing site selection and surface operations procedures.',
    requirements: [
      'BS in Aerospace, Planetary Science, or related field',
      '7+ years mission operations or planning experience',
      'Knowledge of lunar surface environment and challenges',
      'Experience with EVA or surface operations planning',
      'US Citizenship required',
    ],
    applyUrl: '#',
    companyColor: getCompanyColor('Blue Origin'),
  },
  {
    id: 28,
    title: 'Space Economics Analyst',
    company: 'Axiom Space',
    location: 'Houston, TX',
    locationType: 'Hybrid',
    salaryMin: 95000,
    salaryMax: 135000,
    postedDate: '2026-02-10',
    experienceLevel: 'Mid',
    jobType: 'Full-time',
    category: 'Business',
    skills: ['Financial Modeling', 'Market Analysis', 'Space Economy', 'Business Strategy', 'Excel'],
    description:
      'Analyze the economics of commercial space station operations, LEO commercialization, and in-space manufacturing. Build financial models for new business lines including space tourism, ISS research services, and commercial destination operations. Support strategic planning and investor communications.',
    requirements: [
      'BA/BS in Economics, Finance, or Business; MBA preferred',
      '3+ years financial analysis or management consulting',
      'Knowledge of space industry market dynamics',
      'Strong financial modeling and presentation skills',
      'Passion for commercial space development',
    ],
    applyUrl: '#',
    companyColor: getCompanyColor('Axiom Space'),
  },
  {
    id: 29,
    title: 'Satellite Constellation Software Intern',
    company: 'Planet Labs',
    location: 'San Francisco, CA',
    locationType: 'Hybrid',
    salaryMin: 45000,
    salaryMax: 60000,
    postedDate: '2026-02-09',
    experienceLevel: 'Entry',
    jobType: 'Internship',
    category: 'Software',
    skills: ['Python', 'Satellite Operations', 'Linux', 'Git', 'Problem Solving'],
    description:
      'Join Planet\'s flight software team for a 12-week summer internship. Help build tools for satellite constellation management, anomaly detection, and automated operations. Gain hands-on experience working with a fleet of 200+ Earth observation satellites.',
    requirements: [
      'Currently pursuing BS or MS in Computer Science, Aerospace, or related field',
      'Strong Python fundamentals',
      'Familiarity with Linux and Git',
      'Interest in space systems and satellite operations',
      'Must be authorized to work in the US',
    ],
    applyUrl: '#',
    companyColor: getCompanyColor('Planet Labs'),
  },
  {
    id: 30,
    title: 'Spacecraft Power Systems Engineer',
    company: 'Northrop Grumman',
    location: 'Redondo Beach, CA',
    locationType: 'On-site',
    salaryMin: 115000,
    salaryMax: 155000,
    postedDate: '2026-02-09',
    experienceLevel: 'Mid',
    jobType: 'Full-time',
    category: 'Engineering',
    skills: ['Power Systems', 'Solar Arrays', 'Battery Management', 'EPS Design', 'SPICE Simulation'],
    description:
      'Design electrical power systems for GEO communication satellites and deep-space missions. Perform solar array sizing, battery selection, and power distribution architecture design. Support hardware integration and orbital performance analysis.',
    requirements: [
      'BS or MS in Electrical or Aerospace Engineering',
      '4+ years spacecraft power systems experience',
      'Knowledge of solar cell technology and Li-ion battery systems',
      'Experience with power system simulation tools',
      'Active Secret clearance or ability to obtain',
    ],
    applyUrl: '#',
    companyColor: getCompanyColor('Northrop Grumman'),
  },
  {
    id: 31,
    title: 'Launch Operations Engineer',
    company: 'Rocket Lab',
    location: 'Wallops Island, VA',
    locationType: 'On-site',
    salaryMin: 100000,
    salaryMax: 145000,
    postedDate: '2026-02-08',
    experienceLevel: 'Mid',
    jobType: 'Full-time',
    category: 'Operations',
    skills: ['Launch Operations', 'Range Safety', 'Countdown Procedures', 'Propellant Handling', 'Telemetry'],
    description:
      'Support Electron and Neutron launch campaigns from LC-2 at Wallops Flight Facility. Manage launch vehicle processing, propellant loading, and countdown operations. Coordinate with NASA and range safety to ensure safe and successful launches.',
    requirements: [
      'BS in Aerospace or Mechanical Engineering',
      '3+ years launch operations or vehicle processing experience',
      'Experience with cryogenic propellant handling',
      'Ability to support launch campaigns including nights/weekends',
      'Must be legally authorized to work in the US',
    ],
    applyUrl: '#',
    companyColor: getCompanyColor('Rocket Lab'),
  },
  {
    id: 32,
    title: 'Chief Technology Officer',
    company: 'Stoke Space',
    location: 'Kent, WA',
    locationType: 'On-site',
    salaryMin: 250000,
    salaryMax: 350000,
    postedDate: '2026-02-08',
    experienceLevel: 'Director',
    jobType: 'Full-time',
    category: 'Engineering',
    skills: ['Technical Leadership', 'Rocket Propulsion', 'Systems Architecture', 'Team Building', 'Fundraising'],
    description:
      'Lead the technology strategy and engineering organization for a fully reusable second-stage rocket company. Drive technical decisions across propulsion, structures, avionics, and recovery systems. Mentor engineering teams and represent the company to investors and partners.',
    requirements: [
      'MS or PhD in Aerospace Engineering or related field',
      '15+ years aerospace experience with 5+ in leadership',
      'Deep technical expertise in launch vehicle design',
      'Track record of shipping hardware to orbit',
      'US Citizenship required',
    ],
    applyUrl: '#',
    companyColor: getCompanyColor('Stoke Space'),
  },
  {
    id: 33,
    title: 'Spacecraft Attitude Determination & Control Engineer',
    company: 'Terran Orbital',
    location: 'Irvine, CA',
    locationType: 'On-site',
    salaryMin: 110000,
    salaryMax: 150000,
    postedDate: '2026-02-07',
    experienceLevel: 'Mid',
    jobType: 'Full-time',
    category: 'Engineering',
    skills: ['ADCS', 'Kalman Filtering', 'Reaction Wheels', 'Star Trackers', 'MATLAB'],
    description:
      'Design and analyze attitude determination and control systems for small satellite missions. Develop estimation algorithms, perform pointing error budgets, and select ADCS components. Support hardware-in-the-loop testing and on-orbit commissioning.',
    requirements: [
      'BS or MS in Aerospace Engineering',
      '3+ years ADCS experience',
      'Proficiency in MATLAB and/or Python',
      'Knowledge of estimation theory and Kalman filtering',
      'US Person status required',
    ],
    applyUrl: '#',
    companyColor: getCompanyColor('Terran Orbital'),
  },
  {
    id: 34,
    title: 'Space Launch Range Safety Analyst',
    company: 'United Launch Alliance',
    location: 'Cape Canaveral, FL',
    locationType: 'On-site',
    salaryMin: 105000,
    salaryMax: 145000,
    postedDate: '2026-02-07',
    experienceLevel: 'Mid',
    jobType: 'Full-time',
    category: 'Operations',
    skills: ['Range Safety', 'Risk Analysis', 'Trajectory Analysis', 'Flight Termination', 'AFSPCMAN'],
    description:
      'Perform flight safety analysis for Atlas V and Vulcan Centaur launch missions. Develop debris dispersion models, casualty expectation calculations, and flight safety limits. Coordinate with Space Launch Delta 45 for range approval and launch commit criteria.',
    requirements: [
      'BS in Aerospace Engineering, Physics, or Applied Math',
      '3+ years range safety or flight safety analysis experience',
      'Knowledge of AFSPCMAN 91-710 and RCC 321 standards',
      'Strong analytical and statistical modeling skills',
      'US Citizenship required; clearance may be needed',
    ],
    applyUrl: '#',
    companyColor: getCompanyColor('United Launch Alliance'),
  },
  {
    id: 35,
    title: 'Spacecraft Cybersecurity Engineer',
    company: 'L3Harris',
    location: 'Palm Bay, FL',
    locationType: 'On-site',
    salaryMin: 125000,
    salaryMax: 170000,
    postedDate: '2026-02-06',
    experienceLevel: 'Senior',
    jobType: 'Full-time',
    category: 'Software',
    skills: ['Cybersecurity', 'NIST RMF', 'Satellite Security', 'Encryption', 'Penetration Testing'],
    description:
      'Design and implement cybersecurity protections for satellite communication and ground systems. Perform threat modeling, vulnerability assessments, and penetration testing of space systems. Ensure compliance with NIST RMF, CNSSP-12, and emerging space cybersecurity standards.',
    requirements: [
      'BS in Computer Science, Cybersecurity, or related field',
      '6+ years cybersecurity experience; space systems preferred',
      'Knowledge of NIST RMF, STIGs, and crypto standards',
      'CISSP, CEH, or equivalent certification',
      'Active TS/SCI clearance required',
    ],
    applyUrl: '#',
    companyColor: getCompanyColor('L3Harris'),
  },
  {
    id: 36,
    title: 'Space Robotics Intern',
    company: 'NASA JPL',
    location: 'Pasadena, CA',
    locationType: 'On-site',
    salaryMin: 38000,
    salaryMax: 52000,
    postedDate: '2026-02-06',
    experienceLevel: 'Entry',
    jobType: 'Internship',
    category: 'Engineering',
    skills: ['Robotics', 'C++', 'Python', 'ROS', 'Mechanical Design'],
    description:
      'Join JPL\'s Robotic Vehicles and Manipulators group for a 10-week summer internship. Work on next-generation robotic systems for planetary exploration, including Mars helicopter follow-on and ocean world sampling mechanisms. Gain experience in one of the world\'s premier robotics labs.',
    requirements: [
      'Currently pursuing BS or MS in Robotics, ME, AE, EE, or CS',
      'Experience with C++ or Python',
      'Familiarity with ROS or robotic frameworks',
      'GPA 3.0 or higher',
      'US Citizenship required',
    ],
    applyUrl: '#',
    companyColor: getCompanyColor('NASA JPL'),
  },
  {
    id: 37,
    title: 'Space Sustainability & Regulatory Affairs Manager',
    company: 'Astroscale',
    location: 'Washington, DC',
    locationType: 'Hybrid',
    salaryMin: 120000,
    salaryMax: 160000,
    postedDate: '2026-02-05',
    experienceLevel: 'Senior',
    jobType: 'Full-time',
    category: 'Business',
    skills: ['Space Sustainability', 'Regulatory Affairs', 'Government Relations', 'Policy Analysis', 'UN COPUOS'],
    description:
      'Lead Astroscale\'s regulatory and government affairs activities in the US. Engage with FCC, FAA, DoC, and congressional stakeholders on orbital debris mitigation policy. Represent the company at industry conferences, UN COPUOS, and ITU proceedings.',
    requirements: [
      'BA/BS required; JD, MA in policy, or technical degree preferred',
      '7+ years space policy, regulatory, or government affairs experience',
      'Deep knowledge of space sustainability and debris mitigation frameworks',
      'Strong relationships within the DC space policy community',
      'Excellent communication and advocacy skills',
    ],
    applyUrl: '#',
    companyColor: getCompanyColor('Astroscale'),
  },
  {
    id: 38,
    title: 'Satellite Bus Platform Engineer',
    company: 'York Space Systems',
    location: 'Denver, CO',
    locationType: 'On-site',
    salaryMin: 105000,
    salaryMax: 145000,
    postedDate: '2026-02-05',
    experienceLevel: 'Mid',
    jobType: 'Full-time',
    category: 'Engineering',
    skills: ['Satellite Bus Design', 'Systems Engineering', 'Mechanical Design', 'CAD', 'Mass Budgets'],
    description:
      'Design and develop standardized satellite bus platforms for government and commercial missions. Perform trade studies on bus configurations, develop mass and power budgets, and support manufacturing process improvements for high-rate production.',
    requirements: [
      'BS or MS in Aerospace or Mechanical Engineering',
      '3+ years satellite design or systems engineering experience',
      'Proficiency in CAD tools (SolidWorks or NX)',
      'Understanding of satellite subsystems and interfaces',
      'US Citizenship required',
    ],
    applyUrl: '#',
    companyColor: getCompanyColor('York Space Systems'),
  },
  {
    id: 39,
    title: 'Synthetic Aperture Radar Scientist',
    company: 'Maxar',
    location: 'Palo Alto, CA',
    locationType: 'Hybrid',
    salaryMin: 145000,
    salaryMax: 195000,
    postedDate: '2026-02-04',
    experienceLevel: 'Senior',
    jobType: 'Full-time',
    category: 'Science',
    skills: ['SAR', 'Signal Processing', 'InSAR', 'Python', 'Remote Sensing', 'Radar Algorithms'],
    description:
      'Develop advanced SAR processing algorithms for Maxar\'s next-generation radar satellites. Research and implement InSAR, GMTI, and coherent change detection techniques. Drive innovation in radar-based Earth observation products.',
    requirements: [
      'PhD in Electrical Engineering, Remote Sensing, or Physics',
      '5+ years SAR algorithm development experience',
      'Strong signal processing and radar theory background',
      'Proficiency in Python and C++',
      'US Citizenship required; clearance preferred',
    ],
    applyUrl: '#',
    companyColor: getCompanyColor('Maxar'),
  },
  {
    id: 40,
    title: 'Space Domain Awareness Software Contractor',
    company: 'True Anomaly',
    location: 'Colorado Springs, CO',
    locationType: 'Hybrid',
    salaryMin: 140000,
    salaryMax: 180000,
    postedDate: '2026-02-04',
    experienceLevel: 'Senior',
    jobType: 'Contract',
    category: 'Software',
    skills: ['React', 'TypeScript', 'Three.js', 'Cesium', 'Orbit Visualization', 'WebGL'],
    description:
      'Build immersive 3D space domain awareness visualization tools. Develop web-based applications for orbital object tracking, conjunction visualization, and space threat assessment using CesiumJS and Three.js. Create intuitive interfaces for military operators.',
    requirements: [
      'BS in Computer Science or equivalent experience',
      '5+ years frontend development with React/TypeScript',
      'Experience with 3D visualization (Three.js, CesiumJS, or Unreal)',
      'Portfolio of interactive data visualization projects',
      'Active Secret clearance required',
    ],
    applyUrl: '#',
    companyColor: getCompanyColor('True Anomaly'),
  },
  {
    id: 41,
    title: 'Launch Vehicle Composites Technician',
    company: 'ABL Space Systems',
    location: 'El Segundo, CA',
    locationType: 'On-site',
    salaryMin: 60000,
    salaryMax: 85000,
    postedDate: '2026-02-03',
    experienceLevel: 'Entry',
    jobType: 'Full-time',
    category: 'Manufacturing',
    skills: ['Composites Fabrication', 'Autoclave Operations', 'Layup', 'NDI', 'Quality Control'],
    description:
      'Fabricate composite structures for the RS1 launch vehicle. Perform hand layup, autoclave curing, and secondary bonding operations. Conduct non-destructive inspection and support process development for production scaling.',
    requirements: [
      'High school diploma; composites certification or associate degree preferred',
      '1+ years composites manufacturing experience',
      'Ability to read engineering drawings',
      'Attention to detail and quality mindset',
      'Must be a US Person',
    ],
    applyUrl: '#',
    companyColor: getCompanyColor('ABL Space Systems'),
  },
  {
    id: 42,
    title: 'Climate Analytics Platform Engineer',
    company: 'Muon Space',
    location: 'Mountain View, CA',
    locationType: 'Hybrid',
    salaryMin: 135000,
    salaryMax: 180000,
    postedDate: '2026-02-03',
    experienceLevel: 'Senior',
    jobType: 'Full-time',
    category: 'Software',
    skills: ['Python', 'AWS', 'Data Pipelines', 'Climate Science', 'Distributed Systems', 'Terraform'],
    description:
      'Build the data platform for Muon Space\'s climate-focused satellite constellation. Design scalable data ingestion, processing, and distribution pipelines for microwave radiometer observations. Create analytics tools that transform raw satellite data into actionable climate intelligence.',
    requirements: [
      'BS or MS in Computer Science or related field',
      '5+ years data platform or backend engineering experience',
      'Strong Python and AWS experience',
      'Experience building large-scale data pipelines',
      'Interest in climate science and Earth observation',
    ],
    applyUrl: '#',
    companyColor: getCompanyColor('Muon Space'),
  },
  {
    id: 43,
    title: 'Spacecraft Thermal Vacuum Test Engineer',
    company: 'Lockheed Martin',
    location: 'Sunnyvale, CA',
    locationType: 'On-site',
    salaryMin: 110000,
    salaryMax: 150000,
    postedDate: '2026-02-02',
    experienceLevel: 'Mid',
    jobType: 'Full-time',
    category: 'Engineering',
    skills: ['Thermal Vacuum Testing', 'Test Planning', 'Data Acquisition', 'Contamination Control', 'Cleanroom'],
    description:
      'Plan and execute thermal vacuum test campaigns for satellite programs. Develop test procedures, manage chamber operations, and analyze thermal balance and cycle test data. Ensure flight hardware readiness through rigorous environmental testing.',
    requirements: [
      'BS in Aerospace, Mechanical, or related Engineering',
      '3+ years environmental test experience',
      'Experience with thermal vacuum chamber operations',
      'Knowledge of contamination control and cleanroom procedures',
      'Active Secret clearance or eligibility',
    ],
    applyUrl: '#',
    companyColor: getCompanyColor('Lockheed Martin'),
  },
  {
    id: 44,
    title: 'Satellite Communications Systems Architect',
    company: 'JAXA',
    location: 'Tsukuba, Japan (Remote collaboration)',
    locationType: 'Remote',
    salaryMin: 115000,
    salaryMax: 155000,
    postedDate: '2026-02-01',
    experienceLevel: 'Lead',
    jobType: 'Contract',
    category: 'Engineering',
    skills: ['SATCOM Architecture', 'Optical Communications', 'Link Budget', 'Space Networking', 'Ka-Band'],
    description:
      'Support JAXA\'s next-generation data relay satellite system architecture. Design optical and RF communication links for LEO-to-GEO relay and direct-to-ground communication. Contribute to international interoperability standards for space communication networks.',
    requirements: [
      'MS or PhD in Electrical Engineering or related field',
      '10+ years satellite communication systems experience',
      'Expertise in optical communications and Ka-band systems',
      'Experience with international space agency collaboration',
      'Knowledge of CCSDS standards preferred',
    ],
    applyUrl: '#',
    companyColor: getCompanyColor('JAXA'),
  },
];

// ────────────────────────────────────────
// Filter constants
// ────────────────────────────────────────

const CATEGORIES: JobCategory[] = [
  'Engineering',
  'Science',
  'Business',
  'Operations',
  'Software',
  'Manufacturing',
];

const EXPERIENCE_LEVELS: ExperienceLevel[] = [
  'Entry',
  'Mid',
  'Senior',
  'Lead',
  'Director',
];

const JOB_TYPES: JobType[] = ['Full-time', 'Contract', 'Part-time', 'Internship'];

const LOCATION_TYPES: LocationType[] = ['Remote', 'Hybrid', 'On-site'];

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'newest', label: 'Newest First' },
  { value: 'salary-high', label: 'Salary: High to Low' },
  { value: 'salary-low', label: 'Salary: Low to High' },
  { value: 'company-az', label: 'Company A-Z' },
];

const CATEGORY_ICONS: Record<JobCategory, string> = {
  Engineering: '\u2699\uFE0F',
  Science: '\uD83D\uDD2C',
  Business: '\uD83D\uDCBC',
  Operations: '\uD83D\uDCE1',
  Software: '\uD83D\uDCBB',
  Manufacturing: '\uD83C\uDFED',
};

// ────────────────────────────────────────
// Helpers
// ────────────────────────────────────────

function formatSalary(amount: number): string {
  if (amount >= 1000) {
    return `$${Math.round(amount / 1000)}k`;
  }
  return `$${amount.toLocaleString()}`;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function getLocationBadgeColor(type: LocationType): string {
  switch (type) {
    case 'Remote':
      return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
    case 'Hybrid':
      return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
    case 'On-site':
      return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
  }
}

function getExperienceBadgeColor(level: ExperienceLevel): string {
  switch (level) {
    case 'Entry':
      return 'bg-green-500/20 text-green-400';
    case 'Mid':
      return 'bg-cyan-500/20 text-cyan-400';
    case 'Senior':
      return 'bg-purple-500/20 text-purple-400';
    case 'Lead':
      return 'bg-orange-500/20 text-orange-400';
    case 'Director':
      return 'bg-red-500/20 text-red-400';
  }
}

// ────────────────────────────────────────
// Components
// ────────────────────────────────────────

function JobCard({
  job,
  isExpanded,
  onToggle,
}: {
  job: JobPosting;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="card p-5 cursor-pointer group" onClick={onToggle}>
      <div className="flex items-start gap-4">
        {/* Company logo placeholder */}
        <div
          className={`w-12 h-12 ${job.companyColor} rounded-full flex items-center justify-center text-white font-bold text-lg shrink-0 ring-2 ring-white/10`}
        >
          {job.company[0]}
        </div>

        {/* Main info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-slate-100 group-hover:text-cyan-400 transition-colors truncate">
                {job.title}
              </h3>
              <p className="text-slate-400 text-sm mt-0.5">
                {job.company} &middot; {job.location}
              </p>
            </div>
            <div className="text-right shrink-0 hidden sm:block">
              <p className="text-cyan-400 font-semibold text-sm">
                {formatSalary(job.salaryMin)} - {formatSalary(job.salaryMax)}
              </p>
              <p className="text-slate-500 text-xs mt-0.5">
                {formatDate(job.postedDate)}
              </p>
            </div>
          </div>

          {/* Mobile salary & date */}
          <div className="flex items-center gap-3 mt-2 sm:hidden">
            <p className="text-cyan-400 font-semibold text-sm">
              {formatSalary(job.salaryMin)} - {formatSalary(job.salaryMax)}
            </p>
            <span className="text-slate-600">&middot;</span>
            <p className="text-slate-500 text-xs">{formatDate(job.postedDate)}</p>
          </div>

          {/* Tags row */}
          <div className="flex flex-wrap items-center gap-2 mt-3">
            <span
              className={`text-xs px-2.5 py-1 rounded-full border ${getLocationBadgeColor(job.locationType)}`}
            >
              {job.locationType}
            </span>
            <span
              className={`text-xs px-2.5 py-1 rounded-full ${getExperienceBadgeColor(job.experienceLevel)}`}
            >
              {job.experienceLevel}
            </span>
            <span className="text-xs px-2.5 py-1 rounded-full bg-slate-700/50 text-slate-300">
              {job.jobType}
            </span>
            <span className="text-xs px-2.5 py-1 rounded-full bg-slate-700/50 text-slate-400">
              {CATEGORY_ICONS[job.category]} {job.category}
            </span>
          </div>

          {/* Skill tags */}
          <div className="flex flex-wrap gap-1.5 mt-3">
            {job.skills.slice(0, 4).map((skill) => (
              <span
                key={skill}
                className="text-xs px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/20"
              >
                {skill}
              </span>
            ))}
            {job.skills.length > 4 && (
              <span className="text-xs px-2 py-0.5 rounded bg-slate-700/40 text-slate-400">
                +{job.skills.length - 4} more
              </span>
            )}
          </div>
        </div>

        {/* Expand indicator */}
        <div className="shrink-0 mt-1">
          <motion.svg
            animate={{ rotate: isExpanded ? 180 : 0 }}
            transition={{ duration: 0.2 }}
            className="w-5 h-5 text-slate-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </motion.svg>
        </div>
      </div>

      {/* Expanded detail */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mt-5 pt-5 border-t border-slate-700/50 space-y-4">
              {/* Description */}
              <div>
                <h4 className="text-sm font-semibold text-slate-200 mb-2">
                  Description
                </h4>
                <p className="text-sm text-slate-400 leading-relaxed">
                  {job.description}
                </p>
              </div>

              {/* All skills */}
              <div>
                <h4 className="text-sm font-semibold text-slate-200 mb-2">
                  Skills
                </h4>
                <div className="flex flex-wrap gap-2">
                  {job.skills.map((skill) => (
                    <span
                      key={skill}
                      className="text-xs px-2.5 py-1 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/20"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>

              {/* Requirements */}
              <div>
                <h4 className="text-sm font-semibold text-slate-200 mb-2">
                  Requirements
                </h4>
                <ul className="space-y-1.5">
                  {job.requirements.map((req, i) => (
                    <li
                      key={i}
                      className="text-sm text-slate-400 flex items-start gap-2"
                    >
                      <span className="text-cyan-500 mt-1 shrink-0">
                        &#x2022;
                      </span>
                      {req}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Apply button */}
              <div className="flex items-center gap-3 pt-2">
                <a
                  href={job.applyUrl}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white text-sm rounded-lg font-medium transition-colors"
                  onClick={(e) => e.stopPropagation()}
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                    />
                  </svg>
                  Apply Now
                </a>
                <span className="text-xs text-slate-500">
                  Posted {formatDate(job.postedDate)}
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ────────────────────────────────────────
// Main page component
// ────────────────────────────────────────

export default function JobsBoardPage() {
  // Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<JobCategory | ''>('');
  const [selectedExperience, setSelectedExperience] = useState<ExperienceLevel | ''>('');
  const [selectedJobType, setSelectedJobType] = useState<JobType | ''>('');
  const [selectedLocation, setSelectedLocation] = useState<LocationType | ''>('');
  const [salaryMin, setSalaryMin] = useState(0);
  const [salaryMax, setSalaryMax] = useState(400000);
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [expandedJobId, setExpandedJobId] = useState<number | null>(null);
  const [visibleCount, setVisibleCount] = useState(15);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  // Filtered + sorted jobs
  const filteredJobs = useMemo(() => {
    let jobs = [...JOB_POSTINGS];

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      jobs = jobs.filter(
        (j) =>
          j.title.toLowerCase().includes(q) ||
          j.company.toLowerCase().includes(q) ||
          j.skills.some((s) => s.toLowerCase().includes(q))
      );
    }

    // Category
    if (selectedCategory) {
      jobs = jobs.filter((j) => j.category === selectedCategory);
    }

    // Experience
    if (selectedExperience) {
      jobs = jobs.filter((j) => j.experienceLevel === selectedExperience);
    }

    // Job type
    if (selectedJobType) {
      jobs = jobs.filter((j) => j.jobType === selectedJobType);
    }

    // Location type
    if (selectedLocation) {
      jobs = jobs.filter((j) => j.locationType === selectedLocation);
    }

    // Salary range
    jobs = jobs.filter(
      (j) => j.salaryMax >= salaryMin && j.salaryMin <= salaryMax
    );

    // Sort
    switch (sortBy) {
      case 'newest':
        jobs.sort(
          (a, b) =>
            new Date(b.postedDate).getTime() - new Date(a.postedDate).getTime()
        );
        break;
      case 'salary-high':
        jobs.sort((a, b) => b.salaryMax - a.salaryMax);
        break;
      case 'salary-low':
        jobs.sort((a, b) => a.salaryMin - b.salaryMin);
        break;
      case 'company-az':
        jobs.sort((a, b) => a.company.localeCompare(b.company));
        break;
    }

    return jobs;
  }, [
    searchQuery,
    selectedCategory,
    selectedExperience,
    selectedJobType,
    selectedLocation,
    salaryMin,
    salaryMax,
    sortBy,
  ]);

  const visibleJobs = filteredJobs.slice(0, visibleCount);
  const hasMore = visibleCount < filteredJobs.length;

  // Unique companies count
  const uniqueCompanies = useMemo(
    () => new Set(JOB_POSTINGS.map((j) => j.company)).size,
    []
  );

  const handleLoadMore = useCallback(() => {
    setVisibleCount((prev) => prev + 15);
  }, []);

  const handleClearFilters = useCallback(() => {
    setSearchQuery('');
    setSelectedCategory('');
    setSelectedExperience('');
    setSelectedJobType('');
    setSelectedLocation('');
    setSalaryMin(0);
    setSalaryMax(400000);
    setVisibleCount(15);
  }, []);

  const activeFilterCount = [
    searchQuery,
    selectedCategory,
    selectedExperience,
    selectedJobType,
    selectedLocation,
    salaryMin > 0 ? 'salary' : '',
    salaryMax < 400000 ? 'salary' : '',
  ].filter(Boolean).length;

  // ── Filter sidebar (shared between desktop and mobile) ──
  const filterContent = (
    <div className="space-y-5">
      {/* Search */}
      <div>
        <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">
          Search
        </label>
        <div className="relative">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="text"
            placeholder="Title, company, or skill..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setVisibleCount(15);
            }}
            className="w-full pl-10 pr-3 py-2.5 bg-slate-800/60 border border-slate-700 rounded-lg text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 transition-colors"
          />
        </div>
      </div>

      {/* Category */}
      <div>
        <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">
          Category
        </label>
        <select
          value={selectedCategory}
          onChange={(e) => {
            setSelectedCategory(e.target.value as JobCategory | '');
            setVisibleCount(15);
          }}
          className="w-full px-3 py-2.5 bg-slate-800/60 border border-slate-700 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 transition-colors appearance-none"
        >
          <option value="">All Categories</option>
          {CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>
              {CATEGORY_ICONS[cat]} {cat}
            </option>
          ))}
        </select>
      </div>

      {/* Experience Level */}
      <div>
        <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">
          Experience Level
        </label>
        <div className="flex flex-wrap gap-2">
          {EXPERIENCE_LEVELS.map((level) => (
            <button
              key={level}
              onClick={() => {
                setSelectedExperience(selectedExperience === level ? '' : level);
                setVisibleCount(15);
              }}
              className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                selectedExperience === level
                  ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-400'
                  : 'bg-slate-800/40 border-slate-700 text-slate-400 hover:border-slate-600'
              }`}
            >
              {level}
            </button>
          ))}
        </div>
      </div>

      {/* Job Type */}
      <div>
        <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">
          Job Type
        </label>
        <div className="flex flex-wrap gap-2">
          {JOB_TYPES.map((type) => (
            <button
              key={type}
              onClick={() => {
                setSelectedJobType(selectedJobType === type ? '' : type);
                setVisibleCount(15);
              }}
              className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                selectedJobType === type
                  ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-400'
                  : 'bg-slate-800/40 border-slate-700 text-slate-400 hover:border-slate-600'
              }`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      {/* Location */}
      <div>
        <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">
          Work Location
        </label>
        <div className="flex flex-wrap gap-2">
          {LOCATION_TYPES.map((loc) => (
            <button
              key={loc}
              onClick={() => {
                setSelectedLocation(selectedLocation === loc ? '' : loc);
                setVisibleCount(15);
              }}
              className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                selectedLocation === loc
                  ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-400'
                  : 'bg-slate-800/40 border-slate-700 text-slate-400 hover:border-slate-600'
              }`}
            >
              {loc}
            </button>
          ))}
        </div>
      </div>

      {/* Salary Range */}
      <div>
        <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wider">
          Salary Range
        </label>
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <label className="block text-[10px] text-slate-500 mb-1">Min</label>
              <input
                type="number"
                value={salaryMin || ''}
                onChange={(e) => {
                  setSalaryMin(Number(e.target.value) || 0);
                  setVisibleCount(15);
                }}
                placeholder="$0"
                step={10000}
                min={0}
                className="w-full px-2.5 py-2 bg-slate-800/60 border border-slate-700 rounded-lg text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 transition-colors"
              />
            </div>
            <span className="text-slate-600 mt-4">-</span>
            <div className="flex-1">
              <label className="block text-[10px] text-slate-500 mb-1">Max</label>
              <input
                type="number"
                value={salaryMax >= 400000 ? '' : salaryMax}
                onChange={(e) => {
                  setSalaryMax(Number(e.target.value) || 400000);
                  setVisibleCount(15);
                }}
                placeholder="No max"
                step={10000}
                min={0}
                className="w-full px-2.5 py-2 bg-slate-800/60 border border-slate-700 rounded-lg text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 transition-colors"
              />
            </div>
          </div>
          <input
            type="range"
            min={0}
            max={400000}
            step={10000}
            value={salaryMin}
            onChange={(e) => {
              setSalaryMin(Number(e.target.value));
              setVisibleCount(15);
            }}
            className="w-full accent-cyan-500"
          />
          <p className="text-xs text-slate-500 text-center">
            {formatSalary(salaryMin)} &mdash;{' '}
            {salaryMax >= 400000 ? 'No max' : formatSalary(salaryMax)}
          </p>
        </div>
      </div>

      {/* Clear filters */}
      {activeFilterCount > 0 && (
        <button
          onClick={handleClearFilters}
          className="w-full py-2 text-sm text-slate-400 hover:text-cyan-400 border border-slate-700 hover:border-cyan-500/40 rounded-lg transition-colors"
        >
          Clear all filters ({activeFilterCount})
        </button>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950">
      <JobPostingSchema
        jobs={JOB_POSTINGS.map((job) => ({
          title: job.title,
          company: job.company,
          location: job.location,
          description: job.description,
          datePosted: job.postedDate,
          url: job.applyUrl,
        }))}
      />
      <div className="container mx-auto px-4 py-8">
        <Breadcrumbs items={[{ label: 'Jobs' }]} />

        <AnimatedPageHeader
          title="Space Industry Jobs"
          subtitle="Discover your next role in the space economy. Browse open positions from leading aerospace companies, government agencies, and innovative startups."
          icon={
            <span role="img" aria-label="Satellite">
              &#x1F6F0;&#xFE0F;
            </span>
          }
          accentColor="cyan"
        />

        {/* Stats bar */}
        <ScrollReveal delay={0.2}>
          <div className="flex flex-wrap items-center gap-4 mb-8">
            <div className="card px-5 py-3 flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-sm text-slate-300">
                <span className="text-white font-bold">{JOB_POSTINGS.length}</span>{' '}
                open positions across{' '}
                <span className="text-white font-bold">{uniqueCompanies}</span>{' '}
                companies
              </span>
            </div>

            {filteredJobs.length !== JOB_POSTINGS.length && (
              <div className="px-4 py-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20">
                <span className="text-sm text-cyan-400">
                  Showing{' '}
                  <span className="font-bold">{filteredJobs.length}</span>{' '}
                  matching jobs
                </span>
              </div>
            )}

            {/* Sort (desktop) */}
            <div className="hidden md:flex items-center gap-2 ml-auto">
              <label className="text-xs text-slate-500 uppercase tracking-wider">
                Sort by
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="px-3 py-2 bg-slate-800/60 border border-slate-700 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-cyan-500 transition-colors appearance-none"
              >
                {SORT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </ScrollReveal>

        {/* Mobile filter toggle + sort */}
        <div className="flex items-center gap-3 mb-4 lg:hidden">
          <button
            onClick={() => setMobileFiltersOpen(!mobileFiltersOpen)}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-800/60 border border-slate-700 rounded-lg text-sm text-slate-300 hover:border-cyan-500/50 transition-colors"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
              />
            </svg>
            Filters
            {activeFilterCount > 0 && (
              <span className="w-5 h-5 rounded-full bg-cyan-500 text-white text-[10px] flex items-center justify-center font-bold">
                {activeFilterCount}
              </span>
            )}
          </button>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="flex-1 px-3 py-2.5 bg-slate-800/60 border border-slate-700 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-cyan-500 transition-colors appearance-none"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Mobile filter drawer */}
        <AnimatePresence>
          {mobileFiltersOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden lg:hidden mb-6"
            >
              <div className="card p-5">{filterContent}</div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main layout */}
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Desktop sidebar */}
          <aside className="hidden lg:block w-72 shrink-0">
            <div className="card p-5 sticky top-24">{filterContent}</div>
          </aside>

          {/* Job listings */}
          <main className="flex-1 min-w-0">
            {filteredJobs.length === 0 ? (
              <ScrollReveal>
                <EmptyState
                  icon={<span className="text-4xl">🔍</span>}
                  title="No jobs match your filters"
                  description="Try adjusting your search criteria or clearing filters to see more results."
                  action={
                    <button
                      onClick={handleClearFilters}
                      className="px-5 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white text-sm rounded-lg font-medium transition-colors"
                    >
                      Clear All Filters
                    </button>
                  }
                />
              </ScrollReveal>
            ) : (
              <StaggerContainer className="space-y-4" staggerDelay={0.05}>
                {visibleJobs.map((job) => (
                  <StaggerItem key={job.id}>
                    <JobCard
                      job={job}
                      isExpanded={expandedJobId === job.id}
                      onToggle={() =>
                        setExpandedJobId(
                          expandedJobId === job.id ? null : job.id
                        )
                      }
                    />
                  </StaggerItem>
                ))}
              </StaggerContainer>
            )}

            {/* Load more */}
            {hasMore && (
              <div className="mt-8 text-center">
                <button
                  onClick={handleLoadMore}
                  className="px-8 py-3 bg-slate-800/60 border border-slate-700 hover:border-cyan-500/50 text-slate-300 hover:text-cyan-400 rounded-lg text-sm font-medium transition-colors"
                >
                  Load More ({filteredJobs.length - visibleCount} remaining)
                </button>
              </div>
            )}

            {/* Showing count */}
            {filteredJobs.length > 0 && (
              <p className="text-center text-xs text-slate-500 mt-4">
                Showing {Math.min(visibleCount, filteredJobs.length)} of{' '}
                {filteredJobs.length} jobs
              </p>
            )}
          </main>
        </div>

        <RelatedModules modules={PAGE_RELATIONS['jobs']} />
      </div>
    </div>
  );
}
