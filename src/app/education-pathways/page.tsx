'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import AnimatedPageHeader from '@/components/ui/AnimatedPageHeader';
import Breadcrumbs from '@/components/ui/Breadcrumbs';
import ScrollReveal from '@/components/ui/ScrollReveal';

// ────────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────────

type InterestFilter = 'all' | 'engineering' | 'science' | 'business' | 'software' | 'operations';

interface CareerPathway {
  id: string;
  title: string;
  interest: InterestFilter;
  icon: string;
  color: string;
  borderColor: string;
  bgColor: string;
  description: string;
  educationTrack: string;
  progressionSteps: string[];
  topSchools: string[];
  keySkills: string[];
  avgTimeToSenior: string;
}

interface University {
  rank: number;
  name: string;
  strengths: string[];
  notableAlumni: string[];
  researchFocus: string;
  acceptanceRate: string;
}

interface Certification {
  name: string;
  acronym: string;
  issuer: string;
  description: string;
  relevance: string;
  difficulty: string;
}

interface SalaryRole {
  role: string;
  min: number;
  max: number;
  level: 'entry' | 'mid' | 'senior' | 'executive';
}

interface InternshipProgram {
  company: string;
  programName: string;
  description: string;
  duration: string;
  paidStatus: string;
  url: string;
}

// ────────────────────────────────────────────────────────────────
// Data — Career Pathways
// ────────────────────────────────────────────────────────────────

const INTEREST_FILTERS: Record<InterestFilter, { label: string; color: string }> = {
  all:          { label: 'All Paths',    color: 'text-slate-300' },
  engineering:  { label: 'Engineering',  color: 'text-blue-400' },
  science:      { label: 'Science',      color: 'text-purple-400' },
  business:     { label: 'Business',     color: 'text-amber-400' },
  software:     { label: 'Software',     color: 'text-cyan-400' },
  operations:   { label: 'Operations',   color: 'text-green-400' },
};

const CAREER_PATHWAYS: CareerPathway[] = [
  {
    id: 'aerospace-engineering',
    title: 'Aerospace Engineering',
    interest: 'engineering',
    icon: '\u{1F680}',
    color: 'text-blue-400',
    borderColor: 'border-blue-500/30',
    bgColor: 'bg-blue-500/10',
    description: 'Design, analyze, and test aircraft, spacecraft, satellites, and missiles. Aerospace engineers are at the core of every space mission, from launch vehicles to deep-space probes.',
    educationTrack: 'BS/MS in Aerospace Engineering or Mechanical Engineering with aerospace concentration',
    progressionSteps: ['Junior Systems Engineer', 'Systems Engineer', 'Lead Engineer', 'Principal Engineer', 'Chief Engineer'],
    topSchools: ['MIT', 'Stanford', 'Georgia Tech', 'Purdue', 'University of Michigan'],
    keySkills: ['Orbital mechanics', 'Structural analysis', 'Propulsion design', 'MATLAB/Simulink', 'FEA/CFD tools'],
    avgTimeToSenior: '8-12 years',
  },
  {
    id: 'satellite-communications',
    title: 'Satellite Communications',
    interest: 'engineering',
    icon: '\u{1F4E1}',
    color: 'text-teal-400',
    borderColor: 'border-teal-500/30',
    bgColor: 'bg-teal-500/10',
    description: 'Engineer the communications links that connect satellites to ground stations and users. This field encompasses RF engineering, signal processing, and network architecture for space-based systems.',
    educationTrack: 'BS/MS in Electrical Engineering with RF/Communications focus',
    progressionSteps: ['RF Test Engineer', 'Link Engineer', 'RF Systems Engineer', 'Communications Architect', 'VP Communications Engineering'],
    topSchools: ['MIT', 'Stanford', 'CU Boulder'],
    keySkills: ['RF design', 'Link budget analysis', 'Antenna design', 'Signal processing', 'HFSS/CST Studio'],
    avgTimeToSenior: '7-10 years',
  },
  {
    id: 'space-science',
    title: 'Space Science & Astronomy',
    interest: 'science',
    icon: '\u{1F52D}',
    color: 'text-purple-400',
    borderColor: 'border-purple-500/30',
    bgColor: 'bg-purple-500/10',
    description: 'Investigate the fundamental nature of the universe through observation, theory, and experimentation. Space scientists lead missions, analyze data from telescopes, and push the boundaries of human knowledge.',
    educationTrack: 'BS in Physics/Astronomy, MS/PhD in Astrophysics, Planetary Science, or related field',
    progressionSteps: ['Graduate Researcher', 'Postdoctoral Fellow', 'Research Scientist', 'Principal Investigator', 'Department Chair / Lab Director'],
    topSchools: ['Caltech', 'Princeton', 'Johns Hopkins (APL)', 'UC Berkeley'],
    keySkills: ['Data analysis (Python/IDL)', 'Statistical methods', 'Proposal writing', 'Spectroscopy', 'Computational modeling'],
    avgTimeToSenior: '10-15 years (includes PhD + postdoc)',
  },
  {
    id: 'space-business',
    title: 'Space Business & Policy',
    interest: 'business',
    icon: '\u{1F4BC}',
    color: 'text-amber-400',
    borderColor: 'border-amber-500/30',
    bgColor: 'bg-amber-500/10',
    description: 'Shape the strategic direction of space organizations through business development, policy analysis, financial planning, and program management. The commercial space boom has created enormous demand for business talent.',
    educationTrack: 'MBA, MPP (Master of Public Policy), or MS in Space Studies',
    progressionSteps: ['Analyst / Associate', 'Senior Analyst', 'Program Manager', 'Director', 'VP / C-Suite'],
    topSchools: ['MIT Sloan', 'International Space University (ISU)', 'Georgetown'],
    keySkills: ['Financial modeling', 'Government contracting (FAR/DFAR)', 'Market analysis', 'Policy analysis', 'Stakeholder management'],
    avgTimeToSenior: '8-12 years',
  },
  {
    id: 'software-engineering',
    title: 'Software Engineering',
    interest: 'software',
    icon: '\u{1F4BB}',
    color: 'text-cyan-400',
    borderColor: 'border-cyan-500/30',
    bgColor: 'bg-cyan-500/10',
    description: 'Build the software that controls spacecraft, processes telemetry, runs ground systems, and analyzes mission data. Software is the fastest-growing discipline in the space industry.',
    educationTrack: 'BS/MS in Computer Science, Computer Engineering, or related field',
    progressionSteps: ['Junior Developer', 'Mission Software Engineer', 'Flight Software Engineer', 'Staff/Principal Engineer', 'Software Architect / Engineering Director'],
    topSchools: ['MIT', 'Stanford', 'CMU', 'Georgia Tech', 'Caltech'],
    keySkills: ['Python', 'C++', 'Rust', 'MATLAB', 'Embedded systems', 'RTOS'],
    avgTimeToSenior: '6-10 years',
  },
  {
    id: 'manufacturing-ops',
    title: 'Manufacturing & Operations',
    interest: 'operations',
    icon: '\u{1F3ED}',
    color: 'text-green-400',
    borderColor: 'border-green-500/30',
    bgColor: 'bg-green-500/10',
    description: 'Oversee the production, assembly, integration, and testing (AIT) of spacecraft and launch vehicles. Manufacturing engineers ensure quality, efficiency, and reliability at scale.',
    educationTrack: 'BS in Mechanical Engineering, Industrial Engineering, or Manufacturing Engineering',
    progressionSteps: ['Test Engineer', 'Manufacturing Engineer', 'Production Lead', 'Director of Manufacturing', 'VP Manufacturing / Operations'],
    topSchools: ['Georgia Tech', 'Purdue', 'MIT', 'U Michigan', 'Virginia Tech'],
    keySkills: ['AS9100 quality management', 'Lean manufacturing', 'Six Sigma', 'Additive manufacturing', 'Cleanroom operations'],
    avgTimeToSenior: '8-12 years',
  },
];

// ────────────────────────────────────────────────────────────────
// Data — Top 20 Space Programs
// ────────────────────────────────────────────────────────────────

const TOP_UNIVERSITIES: University[] = [
  { rank: 1, name: 'Massachusetts Institute of Technology (MIT)', strengths: ['Aerospace systems', 'AI for space', 'Propulsion'], notableAlumni: ['Buzz Aldrin', 'Ronald McNair'], researchFocus: 'Autonomous systems, space propulsion, satellite design', acceptanceRate: '3-4%' },
  { rank: 2, name: 'California Institute of Technology (Caltech)', strengths: ['JPL partnership', 'Planetary science', 'Astrophysics'], notableAlumni: ['Frank Borman', 'Harrison Schmitt'], researchFocus: 'Deep space exploration, exoplanets, gravitational waves', acceptanceRate: '3-4%' },
  { rank: 3, name: 'Stanford University', strengths: ['Satellite technology', 'Space business', 'CubeSats'], notableAlumni: ['Sally Ride', 'Mae Jemison (MD)'], researchFocus: 'Small satellites, GPS technology, space entrepreneurship', acceptanceRate: '3-4%' },
  { rank: 4, name: 'Georgia Institute of Technology', strengths: ['Aerospace design', 'Combustion', 'Space systems'], notableAlumni: ['John Young', 'Timothy Kopra'], researchFocus: 'Hypersonics, electric propulsion, space situational awareness', acceptanceRate: '17-21%' },
  { rank: 5, name: 'Purdue University', strengths: ['Propulsion', 'Astronaut pipeline', 'Structures'], notableAlumni: ['Neil Armstrong', 'Gus Grissom', 'Eugene Cernan'], researchFocus: 'Rocket propulsion, composite structures, orbital mechanics', acceptanceRate: '53-60%' },
  { rank: 6, name: 'University of Michigan', strengths: ['Spacecraft design', 'Plasma dynamics', 'Remote sensing'], notableAlumni: ['Jim McDivitt', 'Jack Lousma'], researchFocus: 'Electric propulsion, space weather, satellite constellations', acceptanceRate: '18-23%' },
  { rank: 7, name: 'University of Colorado Boulder', strengths: ['Atmospheric science', 'Space operations', 'CubeSats'], notableAlumni: ['Scott Carpenter', 'Kjell Lindgren'], researchFocus: 'Planetary atmospheres, space weather, small satellite missions', acceptanceRate: '80-85%' },
  { rank: 8, name: 'University of Maryland', strengths: ['Rotorcraft', 'Reliability engineering', 'GSFC proximity'], notableAlumni: ['Robert Curbeam'], researchFocus: 'Space robotics, Earth observation, reliability engineering', acceptanceRate: '44-52%' },
  { rank: 9, name: 'Penn State University', strengths: ['Gas dynamics', 'Propulsion', 'Acoustics'], notableAlumni: ['Guion Bluford'], researchFocus: 'Turbulence, combustion instability, additive manufacturing', acceptanceRate: '55-63%' },
  { rank: 10, name: 'Virginia Tech', strengths: ['Autonomy', 'UAVs', 'Structural dynamics'], notableAlumni: ['Chris Hadfield (honorary)'], researchFocus: 'Autonomous vehicles, structural health monitoring, hypersonics', acceptanceRate: '57-65%' },
  { rank: 11, name: 'University of Texas at Austin', strengths: ['Orbital mechanics', 'Astrodynamics', 'Materials'], notableAlumni: ['Alan Bean'], researchFocus: 'Space debris tracking, astrodynamics, high-temperature materials', acceptanceRate: '29-35%' },
  { rank: 12, name: 'UCLA', strengths: ['Plasma physics', 'Materials science', 'Earth observation'], notableAlumni: ['Anna Lee Fisher'], researchFocus: 'Magnetospheric physics, advanced materials, remote sensing', acceptanceRate: '9-12%' },
  { rank: 13, name: 'University of Southern California (USC)', strengths: ['Astronautics', 'ASTE program', 'Systems engineering'], notableAlumni: ['Neil Armstrong (honorary)'], researchFocus: 'Liquid rocket propulsion, space architecture, cubesat missions', acceptanceRate: '12-16%' },
  { rank: 14, name: 'University of Illinois Urbana-Champaign', strengths: ['Computational methods', 'Hypersonics', 'Controls'], notableAlumni: ['Steve Nagel', 'Joseph Tanner'], researchFocus: 'Computational aerodynamics, GN&C, additive manufacturing', acceptanceRate: '44-52%' },
  { rank: 15, name: 'Carnegie Mellon University (CMU)', strengths: ['Robotics', 'Software systems', 'AI'], notableAlumni: ['Various NASA researchers'], researchFocus: 'Space robotics, autonomous navigation, machine learning for space', acceptanceRate: '11-15%' },
  { rank: 16, name: 'Johns Hopkins University', strengths: ['APL research', 'Planetary science', 'Instrumentation'], notableAlumni: ['Various APL mission leads'], researchFocus: 'Planetary defense (DART), heliophysics, space instrumentation', acceptanceRate: '7-9%' },
  { rank: 17, name: 'Cornell University', strengths: ['Astronomy', 'Remote sensing', 'Planetary geology'], notableAlumni: ['Carl Sagan (faculty)', 'Steve Squyres'], researchFocus: 'Planetary exploration, radio astronomy, Mars science', acceptanceRate: '8-11%' },
  { rank: 18, name: 'Princeton University', strengths: ['Astrophysics', 'Plasma physics', 'Theoretical physics'], notableAlumni: ['Pete Conrad', 'Various astrophysicists'], researchFocus: 'Exoplanet detection, dark matter, fusion propulsion concepts', acceptanceRate: '4-6%' },
  { rank: 19, name: 'University of Arizona', strengths: ['Optics', 'Planetary imaging', 'Steward Observatory'], notableAlumni: ['Various planetary scientists'], researchFocus: 'Planetary imaging (HiRISE), mirror fabrication, OSIRIS-REx', acceptanceRate: '87-90%' },
  { rank: 20, name: 'U.S. Air Force Academy', strengths: ['Space operations', 'Astronautics', 'Military space'], notableAlumni: ['Numerous military astronauts'], researchFocus: 'Space situational awareness, small satellites, space operations', acceptanceRate: '11-13%' },
];

// ────────────────────────────────────────────────────────────────
// Data — Professional Certifications
// ────────────────────────────────────────────────────────────────

const CERTIFICATIONS: Certification[] = [
  { name: 'Project Management Professional', acronym: 'PMP', issuer: 'PMI', description: 'Gold standard for project management professionals. Demonstrates ability to manage projects using predictive, agile, and hybrid approaches.', relevance: 'Required or preferred for PM roles at primes and NASA centers', difficulty: 'Moderate' },
  { name: 'Systems Engineering (ASEP/CSEP)', acronym: 'SE', issuer: 'INCOSE', description: 'Associate (ASEP) and Certified (CSEP) levels validate systems engineering competence and experience across the full lifecycle.', relevance: 'Highly valued at Boeing, Northrop Grumman, Lockheed Martin, and NASA', difficulty: 'Moderate-High' },
  { name: 'Certified Systems Engineering Professional', acronym: 'CSEP', issuer: 'INCOSE', description: 'Advanced certification requiring 5+ years of SE experience. Demonstrates mastery of systems thinking, requirements, architecture, and integration.', relevance: 'Differentiator for senior SE roles and leadership positions', difficulty: 'High' },
  { name: 'FCC Amateur / Commercial Licenses', acronym: 'FCC', issuer: 'Federal Communications Commission', description: 'Licenses for operating radio equipment. General and Extra class amateur licenses or GROL for commercial satellite communications work.', relevance: 'Essential for satellite communications, ground station, and spectrum roles', difficulty: 'Low-Moderate' },
  { name: 'Security Clearances (TS/SCI)', acronym: 'TS/SCI', issuer: 'U.S. Government', description: 'Top Secret / Sensitive Compartmented Information clearance. Required for classified defense and intelligence space programs.', relevance: 'Required for 40%+ of aerospace positions; significant salary premium', difficulty: 'N/A (government-granted)' },
  { name: 'AS9100 Lead Auditor', acronym: 'AS9100', issuer: 'Various (BSI, SAI Global)', description: 'Certification to audit aerospace quality management systems based on the AS9100 standard derived from ISO 9001.', relevance: 'Critical for manufacturing, quality, and supply chain roles', difficulty: 'Moderate' },
];

// ────────────────────────────────────────────────────────────────
// Data — Salary Ranges
// ────────────────────────────────────────────────────────────────

const SALARY_ROLES: SalaryRole[] = [
  { role: 'Entry Systems Engineer', min: 75, max: 95, level: 'entry' },
  { role: 'Mid Systems Engineer', min: 100, max: 130, level: 'mid' },
  { role: 'Senior Systems Engineer', min: 140, max: 180, level: 'senior' },
  { role: 'Software Engineer (Space)', min: 90, max: 160, level: 'mid' },
  { role: 'RF / Comms Engineer', min: 85, max: 140, level: 'mid' },
  { role: 'Mission Operations Engineer', min: 70, max: 120, level: 'mid' },
  { role: 'Thermal / Structural Engineer', min: 80, max: 150, level: 'mid' },
  { role: 'GN&C Engineer', min: 95, max: 170, level: 'mid' },
  { role: 'Data Scientist (Space)', min: 100, max: 175, level: 'mid' },
  { role: 'Flight Software Engineer', min: 110, max: 190, level: 'mid' },
  { role: 'Program Manager', min: 110, max: 170, level: 'senior' },
  { role: 'Manufacturing / Test Engineer', min: 70, max: 120, level: 'entry' },
  { role: 'Space Policy Analyst', min: 65, max: 110, level: 'entry' },
  { role: 'VP Engineering', min: 180, max: 280, level: 'executive' },
  { role: 'Chief Engineer', min: 200, max: 350, level: 'executive' },
];

const SALARY_MAX = 350;

const LEVEL_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  entry:     { bg: 'bg-green-500/20',  text: 'text-green-400',  border: 'border-green-500/30' },
  mid:       { bg: 'bg-blue-500/20',   text: 'text-blue-400',   border: 'border-blue-500/30' },
  senior:    { bg: 'bg-purple-500/20',  text: 'text-purple-400', border: 'border-purple-500/30' },
  executive: { bg: 'bg-amber-500/20',   text: 'text-amber-400',  border: 'border-amber-500/30' },
};

// ────────────────────────────────────────────────────────────────
// Data — Internship Programs
// ────────────────────────────────────────────────────────────────

const INTERNSHIP_PROGRAMS: InternshipProgram[] = [
  { company: 'NASA', programName: 'NASA Pathways Intern Employment Program', description: 'Federal internship pipeline converting into full-time civil service positions at NASA centers. Covers engineering, science, IT, and business.', duration: '10-16 weeks', paidStatus: 'Paid', url: 'https://intern.nasa.gov' },
  { company: 'SpaceX', programName: 'SpaceX Internship Program', description: 'Hands-on engineering and business internships at Hawthorne, McGregor, Cape Canaveral, and Starbase. Interns work on real flight hardware.', duration: '12 weeks', paidStatus: 'Paid', url: 'https://www.spacex.com/careers' },
  { company: 'Blue Origin', programName: 'Blue Origin Internships', description: 'Engineering, operations, and business internships supporting New Shepard, New Glenn, and Blue Moon programs across multiple sites.', duration: '12 weeks', paidStatus: 'Paid', url: 'https://www.blueorigin.com/careers' },
  { company: 'NASA JPL', programName: 'JPL Summer Internship Program', description: 'Research and engineering internships at the Jet Propulsion Laboratory working on interplanetary missions, Mars rovers, and Earth science.', duration: '10 weeks', paidStatus: 'Paid (stipend)', url: 'https://www.jpl.nasa.gov/edu/intern' },
  { company: 'Lockheed Martin', programName: 'STAR (Students Targeted for Aerospace Research)', description: 'Rotational program offering exposure to multiple engineering disciplines within space and defense programs.', duration: '10-12 weeks', paidStatus: 'Paid', url: 'https://www.lockheedmartin.com/careers' },
  { company: 'Northrop Grumman', programName: 'Northrop Grumman Internship Program', description: 'Technical and business internships across space, defense, and cyber sectors. Strong pipeline to full-time positions.', duration: '10-12 weeks', paidStatus: 'Paid', url: 'https://www.northropgrumman.com/careers' },
  { company: 'L3Harris', programName: 'L3Harris Internship / Co-op', description: 'Engineering internships focused on communications, electronic warfare, space payloads, and ISR systems.', duration: '12 weeks / 6 months (co-op)', paidStatus: 'Paid', url: 'https://www.l3harris.com/careers' },
  { company: 'Rocket Lab', programName: 'Rocket Lab Internships', description: 'Fast-paced internships working on Electron and Neutron launch vehicles, Photon spacecraft, and satellite components.', duration: '12 weeks', paidStatus: 'Paid', url: 'https://www.rocketlabusa.com/careers' },
  { company: 'Ball Aerospace', programName: 'Ball Aerospace Internships', description: 'Engineering and science internships on flagship programs including space telescopes, Earth observation satellites, and defense systems.', duration: '10-12 weeks', paidStatus: 'Paid', url: 'https://www.ball.com/aerospace/careers' },
  { company: 'Aerospace Corp', programName: 'The Aerospace Corporation Internships', description: 'FFRDC internships providing unique exposure to national security space systems analysis, architecture, and engineering.', duration: '10-12 weeks', paidStatus: 'Paid', url: 'https://aerospace.org/careers' },
];

// ────────────────────────────────────────────────────────────────
// Data — Skills in Demand
// ────────────────────────────────────────────────────────────────

const SKILLS_TECHNICAL = [
  { name: 'Python', demand: 'Very High', category: 'Languages' },
  { name: 'MATLAB', demand: 'High', category: 'Languages' },
  { name: 'C++', demand: 'High', category: 'Languages' },
  { name: 'Rust', demand: 'Growing', category: 'Languages' },
  { name: 'GIS / Geospatial Analysis', demand: 'High', category: 'Domain' },
  { name: 'RF Engineering', demand: 'Very High', category: 'Domain' },
  { name: 'Orbital Mechanics', demand: 'High', category: 'Domain' },
  { name: 'Thermal Analysis', demand: 'High', category: 'Domain' },
];

const SKILLS_TOOLS = [
  { name: 'STK (Systems Tool Kit)', category: 'Simulation' },
  { name: 'GMAT (General Mission Analysis Tool)', category: 'Mission Design' },
  { name: 'SolidWorks / CATIA', category: 'CAD' },
  { name: 'ANSYS', category: 'FEA/CFD' },
  { name: 'FreeFlyer', category: 'Mission Planning' },
];

const SKILLS_SOFT = [
  'Systems thinking',
  'Cross-functional collaboration',
  'Technical writing',
  'Stakeholder communication',
  'Risk assessment',
  'Project management',
];

// ────────────────────────────────────────────────────────────────
// Section Components
// ────────────────────────────────────────────────────────────────

function PathwayCard({ pathway }: { pathway: CareerPathway }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={`card p-6 ${pathway.borderColor}`}>
      <div className="flex items-start gap-4 mb-4">
        <span className="text-3xl">{pathway.icon}</span>
        <div className="flex-1 min-w-0">
          <h3 className={`text-xl font-bold ${pathway.color}`}>{pathway.title}</h3>
          <p className="text-xs text-slate-400 mt-1">{pathway.educationTrack}</p>
        </div>
      </div>

      <p className="text-sm text-slate-300 leading-relaxed mb-4">{pathway.description}</p>

      {/* Career Progression */}
      <div className="mb-4">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Career Progression</p>
        <div className="flex flex-wrap items-center gap-1">
          {pathway.progressionSteps.map((step, i) => (
            <span key={step} className="flex items-center gap-1">
              <span className={`text-xs px-2 py-1 rounded-md ${pathway.bgColor} ${pathway.color} border ${pathway.borderColor}`}>
                {step}
              </span>
              {i < pathway.progressionSteps.length - 1 && (
                <svg className="w-3 h-3 text-slate-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              )}
            </span>
          ))}
        </div>
        <p className="text-xs text-slate-500 mt-2">Average time to senior level: {pathway.avgTimeToSenior}</p>
      </div>

      <button
        onClick={() => setExpanded(!expanded)}
        className={`text-sm ${pathway.color} hover:opacity-80 transition-opacity flex items-center gap-1`}
        aria-expanded={expanded}
      >
        {expanded ? 'Hide Details' : 'Show Schools & Skills'}
        <svg
          className={`w-4 h-4 transition-transform ${expanded ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {expanded && (
        <div className="mt-4 pt-4 border-t border-slate-700/50 space-y-4">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Top Schools</p>
            <div className="flex flex-wrap gap-2">
              {pathway.topSchools.map((school) => (
                <span key={school} className="text-xs bg-slate-700/50 text-slate-200 px-2.5 py-1 rounded-md border border-slate-600/50">
                  {school}
                </span>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Key Skills</p>
            <div className="flex flex-wrap gap-2">
              {pathway.keySkills.map((skill) => (
                <span key={skill} className={`text-xs ${pathway.bgColor} ${pathway.color} px-2.5 py-1 rounded-md border ${pathway.borderColor}`}>
                  {skill}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function UniversityRow({ uni }: { uni: University }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border-b border-slate-700/40 last:border-b-0">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-4 py-3 px-4 hover:bg-slate-800/40 transition-colors text-left"
        aria-expanded={expanded}
      >
        <span className="text-sm font-bold text-cyan-400 w-8 shrink-0">#{uni.rank}</span>
        <span className="text-sm text-slate-200 flex-1 min-w-0">{uni.name}</span>
        <span className="text-xs text-slate-400 hidden sm:inline shrink-0">{uni.acceptanceRate}</span>
        <svg
          className={`w-4 h-4 text-slate-400 transition-transform shrink-0 ${expanded ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {expanded && (
        <div className="px-4 pb-4 pl-12 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Program Strengths</p>
            <div className="flex flex-wrap gap-1">
              {uni.strengths.map((s) => (
                <span key={s} className="text-xs bg-cyan-500/10 text-cyan-400 px-2 py-0.5 rounded border border-cyan-500/20">{s}</span>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Notable Alumni</p>
            <p className="text-xs text-slate-300">{uni.notableAlumni.join(', ')}</p>
          </div>
          <div className="sm:col-span-2">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Research Focus</p>
            <p className="text-xs text-slate-300">{uni.researchFocus}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Acceptance Rate</p>
            <p className="text-xs text-slate-300">{uni.acceptanceRate}</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────
// Main Page
// ────────────────────────────────────────────────────────────────

export default function EducationPathwaysPage() {
  const [activeFilter, setActiveFilter] = useState<InterestFilter>('all');
  const [activeSection, setActiveSection] = useState<string>('pathways');

  const filteredPathways = useMemo(() => {
    if (activeFilter === 'all') return CAREER_PATHWAYS;
    return CAREER_PATHWAYS.filter((p) => p.interest === activeFilter);
  }, [activeFilter]);

  const sections = [
    { id: 'pathways', label: 'Career Paths' },
    { id: 'universities', label: 'Top Programs' },
    { id: 'certifications', label: 'Certifications' },
    { id: 'salaries', label: 'Salary Data' },
    { id: 'internships', label: 'Internships' },
    { id: 'skills', label: 'Skills' },
  ];

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 px-4 py-12 md:px-8">
      <div className="max-w-6xl mx-auto">
        <Breadcrumbs items={[
          { label: 'Resources', href: '/resources' },
          { label: 'Education & Career Pathways' },
        ]} />

        <AnimatedPageHeader
          title="Space Industry Education & Career Pathways"
          subtitle="Your comprehensive guide to building a career in space. From top university programs and certifications to salary benchmarks and internship opportunities across six major career tracks."
          icon={<span className="text-4xl">{'\u{1F393}'}</span>}
          accentColor="cyan"
        />

        {/* Section Nav */}
        <ScrollReveal>
          <div className="flex flex-wrap gap-2 mb-8">
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeSection === section.id
                    ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-500/20'
                    : 'bg-slate-800/60 text-slate-300 hover:bg-slate-700/60 border border-slate-700/50'
                }`}
              >
                {section.label}
              </button>
            ))}
          </div>
        </ScrollReveal>

        {/* ───────────────── Career Pathways Section ───────────────── */}
        {activeSection === 'pathways' && (
          <>
            {/* Interest Filter */}
            <ScrollReveal>
              <div className="card p-4 mb-6">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Filter by Interest</p>
                <div className="flex flex-wrap gap-2">
                  {(Object.entries(INTEREST_FILTERS) as [InterestFilter, { label: string; color: string }][]).map(([key, val]) => (
                    <button
                      key={key}
                      onClick={() => setActiveFilter(key)}
                      className={`px-3 py-1.5 rounded-lg text-sm transition-all ${
                        activeFilter === key
                          ? 'bg-cyan-600 text-white'
                          : `bg-slate-800/60 ${val.color} hover:bg-slate-700/60 border border-slate-700/50`
                      }`}
                    >
                      {val.label}
                    </button>
                  ))}
                </div>
              </div>
            </ScrollReveal>

            {/* Pathway Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-12">
              {filteredPathways.map((pathway, i) => (
                <ScrollReveal key={pathway.id} delay={Math.min(i * 0.08, 0.4)}>
                  <PathwayCard pathway={pathway} />
                </ScrollReveal>
              ))}
            </div>

            {filteredPathways.length === 0 && (
              <div className="text-center py-16">
                <p className="text-4xl mb-3">{'\u{1F52D}'}</p>
                <p className="text-lg text-slate-400">No pathways match the selected filter.</p>
                <button
                  onClick={() => setActiveFilter('all')}
                  className="mt-3 text-cyan-400 hover:text-cyan-300 underline text-sm"
                >
                  Show all paths
                </button>
              </div>
            )}
          </>
        )}

        {/* ───────────────── Top 20 Universities Section ───────────────── */}
        {activeSection === 'universities' && (
          <ScrollReveal>
            <div className="card p-0 overflow-hidden mb-12">
              <div className="px-6 py-4 border-b border-slate-700/50">
                <h2 className="text-xl font-bold text-slate-100">Top 20 Space & Aerospace Programs</h2>
                <p className="text-sm text-slate-400 mt-1">
                  Leading university programs for aerospace engineering, space science, and related disciplines. Click any row to expand details.
                </p>
              </div>

              <div className="divide-y divide-slate-700/30">
                {/* Header */}
                <div className="flex items-center gap-4 py-2 px-4 bg-slate-800/40 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  <span className="w-8">Rank</span>
                  <span className="flex-1">University</span>
                  <span className="hidden sm:inline">Acceptance</span>
                  <span className="w-4" />
                </div>

                {TOP_UNIVERSITIES.map((uni) => (
                  <UniversityRow key={uni.rank} uni={uni} />
                ))}
              </div>
            </div>
          </ScrollReveal>
        )}

        {/* ───────────────── Certifications Section ───────────────── */}
        {activeSection === 'certifications' && (
          <ScrollReveal>
            <div className="mb-12">
              <h2 className="text-xl font-bold text-slate-100 mb-2">Professional Certifications</h2>
              <p className="text-sm text-slate-400 mb-6">
                Industry-recognized certifications that boost your credibility and earning potential in the space sector.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {CERTIFICATIONS.map((cert) => (
                  <div key={cert.acronym} className="card p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="text-lg font-semibold text-slate-100">{cert.name}</h3>
                        <span className="text-xs bg-cyan-500/15 text-cyan-400 px-2 py-0.5 rounded border border-cyan-500/20 inline-block mt-1">
                          {cert.acronym}
                        </span>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        cert.difficulty === 'High'
                          ? 'bg-red-500/15 text-red-400 border border-red-500/20'
                          : cert.difficulty === 'Moderate-High'
                          ? 'bg-orange-500/15 text-orange-400 border border-orange-500/20'
                          : cert.difficulty === 'Moderate'
                          ? 'bg-yellow-500/15 text-yellow-400 border border-yellow-500/20'
                          : cert.difficulty === 'Low-Moderate'
                          ? 'bg-green-500/15 text-green-400 border border-green-500/20'
                          : 'bg-slate-500/15 text-slate-400 border border-slate-500/20'
                      }`}>
                        {cert.difficulty}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mb-2">Issued by: {cert.issuer}</p>
                    <p className="text-sm text-slate-300 leading-relaxed mb-3">{cert.description}</p>
                    <div className="bg-slate-900/50 rounded-lg p-3 border border-slate-700/30">
                      <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-1">Industry Relevance</p>
                      <p className="text-xs text-slate-300">{cert.relevance}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </ScrollReveal>
        )}

        {/* ───────────────── Salary Section ───────────────── */}
        {activeSection === 'salaries' && (
          <ScrollReveal>
            <div className="mb-12">
              <h2 className="text-xl font-bold text-slate-100 mb-2">Salary Ranges by Role</h2>
              <p className="text-sm text-slate-400 mb-6">
                Approximate U.S. salary ranges for common space industry positions. Based on 2025-2026 industry data.
              </p>

              <div className="card p-5 overflow-hidden">
                {/* Legend */}
                <div className="flex flex-wrap gap-3 mb-5">
                  {Object.entries(LEVEL_COLORS).map(([level, colors]) => (
                    <span key={level} className={`text-xs px-2.5 py-1 rounded-full border ${colors.bg} ${colors.text} ${colors.border} capitalize`}>
                      {level}
                    </span>
                  ))}
                </div>

                <div className="space-y-3">
                  {SALARY_ROLES.map((role) => {
                    const lc = LEVEL_COLORS[role.level];
                    const minPct = (role.min / SALARY_MAX) * 100;
                    const rangePct = ((role.max - role.min) / SALARY_MAX) * 100;

                    return (
                      <div key={role.role} className="flex items-center gap-3">
                        <div className="w-48 shrink-0 flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${lc.bg} border ${lc.border} shrink-0`} />
                          <span className="text-xs text-slate-300 truncate" title={role.role}>{role.role}</span>
                        </div>
                        <div className="relative flex-1 h-6 bg-slate-700/40 rounded">
                          <div
                            className={`absolute h-full rounded ${lc.bg} border ${lc.border}`}
                            style={{ left: `${minPct}%`, width: `${rangePct}%` }}
                          />
                          <span
                            className={`absolute text-xs ${lc.text} font-medium whitespace-nowrap`}
                            style={{ left: `${minPct + rangePct + 1}%`, top: '3px' }}
                          >
                            ${role.min}K - ${role.max}K
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Scale */}
                <div className="flex justify-between mt-4 text-xs text-slate-500 border-t border-slate-700/40 pt-3">
                  <span>$0</span>
                  <span>$50K</span>
                  <span>$100K</span>
                  <span>$150K</span>
                  <span>$200K</span>
                  <span>$250K</span>
                  <span>$300K</span>
                  <span>$350K</span>
                </div>
              </div>

              <p className="text-xs text-slate-500 mt-3">
                * Salary data reflects U.S. market compensation from industry surveys, Glassdoor, and public government pay scales. Actual pay varies by location, clearance level, company size, and experience.
              </p>
            </div>
          </ScrollReveal>
        )}

        {/* ───────────────── Internships Section ───────────────── */}
        {activeSection === 'internships' && (
          <ScrollReveal>
            <div className="mb-12">
              <h2 className="text-xl font-bold text-slate-100 mb-2">Top Internship Programs</h2>
              <p className="text-sm text-slate-400 mb-6">
                The 10 most impactful internship and early-career programs in the space industry. These are the primary pipelines into full-time space careers.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {INTERNSHIP_PROGRAMS.map((program) => (
                  <div key={program.company} className="card p-5">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="text-base font-semibold text-slate-100">{program.company}</h3>
                        <p className="text-xs text-cyan-400">{program.programName}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs bg-green-500/15 text-green-400 px-2 py-0.5 rounded border border-green-500/20">
                          {program.paidStatus}
                        </span>
                      </div>
                    </div>
                    <p className="text-sm text-slate-300 leading-relaxed mb-3">{program.description}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-400">Duration: {program.duration}</span>
                      <a
                        href={program.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors flex items-center gap-1"
                      >
                        Learn more
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </ScrollReveal>
        )}

        {/* ───────────────── Skills Section ───────────────── */}
        {activeSection === 'skills' && (
          <ScrollReveal>
            <div className="mb-12">
              <h2 className="text-xl font-bold text-slate-100 mb-2">Skills in Demand</h2>
              <p className="text-sm text-slate-400 mb-6">
                The most sought-after technical skills, tools, and soft skills across the space industry in 2026.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Technical Skills */}
                <div className="card p-5">
                  <h3 className="text-base font-semibold text-cyan-400 mb-4 flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
                    </svg>
                    Technical Skills
                  </h3>
                  <div className="space-y-2">
                    {SKILLS_TECHNICAL.map((skill) => (
                      <div key={skill.name} className="flex items-center justify-between">
                        <div>
                          <span className="text-sm text-slate-200">{skill.name}</span>
                          <span className="text-xs text-slate-500 ml-2">({skill.category})</span>
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded ${
                          skill.demand === 'Very High'
                            ? 'bg-red-500/15 text-red-400 border border-red-500/20'
                            : skill.demand === 'High'
                            ? 'bg-amber-500/15 text-amber-400 border border-amber-500/20'
                            : 'bg-green-500/15 text-green-400 border border-green-500/20'
                        }`}>
                          {skill.demand}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Tools */}
                <div className="card p-5">
                  <h3 className="text-base font-semibold text-purple-400 mb-4 flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.42 15.17l-5.1-5.1m0 0L11.42 4.97m-5.1 5.1h14.25" />
                    </svg>
                    Industry Tools
                  </h3>
                  <div className="space-y-3">
                    {SKILLS_TOOLS.map((tool) => (
                      <div key={tool.name} className="bg-slate-800/50 rounded-lg p-3 border border-slate-700/30">
                        <p className="text-sm text-slate-200 font-medium">{tool.name}</p>
                        <p className="text-xs text-slate-400">{tool.category}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Soft Skills */}
                <div className="card p-5">
                  <h3 className="text-base font-semibold text-emerald-400 mb-4 flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                    </svg>
                    Soft Skills
                  </h3>
                  <div className="space-y-2">
                    {SKILLS_SOFT.map((skill) => (
                      <div key={skill} className="flex items-center gap-2 py-2 border-b border-slate-700/30 last:border-b-0">
                        <span className="text-emerald-400">{'\u25B8'}</span>
                        <span className="text-sm text-slate-200">{skill}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </ScrollReveal>
        )}

        {/* ───────────────── Quick Stats Banner ───────────────── */}
        <ScrollReveal delay={0.1}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[
              { label: 'Career Paths', value: '6', sub: 'major tracks' },
              { label: 'Universities', value: '20', sub: 'top programs' },
              { label: 'Certifications', value: '6', sub: 'professional' },
              { label: 'Internships', value: '10', sub: 'pipeline programs' },
            ].map((stat) => (
              <div key={stat.label} className="card p-4 text-center">
                <p className="text-2xl font-bold text-cyan-400">{stat.value}</p>
                <p className="text-sm text-slate-300 font-medium">{stat.label}</p>
                <p className="text-xs text-slate-500">{stat.sub}</p>
              </div>
            ))}
          </div>
        </ScrollReveal>

        {/* ───────────────── Related Links ───────────────── */}
        <ScrollReveal delay={0.15}>
          <div className="card p-6 mb-8">
            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4">Continue Exploring</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                { href: '/career-guide', label: 'Career Guide', desc: '25 detailed career paths with salary data', icon: '\u{1F3AF}' },
                { href: '/space-talent', label: 'Space Talent Hub', desc: 'Browse open positions and workforce analytics', icon: '\u{1F4BC}' },
                { href: '/salary-benchmarks', label: 'Salary Benchmarks', desc: 'Detailed compensation data by role and level', icon: '\u{1F4B0}' },
                { href: '/glossary', label: 'Space Glossary', desc: 'Terminology and acronyms decoded', icon: '\u{1F4D6}' },
              ].map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="flex items-start gap-3 p-3 rounded-lg bg-slate-900/40 border border-slate-700/30 hover:border-cyan-500/40 hover:bg-slate-800/60 transition-colors group"
                >
                  <span className="text-2xl">{link.icon}</span>
                  <div>
                    <p className="text-sm font-medium text-slate-200 group-hover:text-cyan-400 transition-colors">{link.label}</p>
                    <p className="text-xs text-slate-400">{link.desc}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </ScrollReveal>

        {/* Disclaimer */}
        <p className="text-xs text-slate-500 text-center mt-8 max-w-2xl mx-auto">
          Information is compiled from publicly available university data, industry surveys, and government pay scales.
          Acceptance rates, salary ranges, and program details are approximate and subject to change. Last updated February 2026.
        </p>
      </div>
    </main>
  );
}
