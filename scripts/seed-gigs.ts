/**
 * Seed the gig marketplace with 15 sample gigs across varied categories.
 *
 * Run with:   npx tsx scripts/seed-gigs.ts
 *
 * This script:
 *  1. Ensures at least one seed employer user + EmployerProfile exists.
 *  2. Inserts (or upserts by title+employerId) 15 GigOpportunity rows.
 *  3. Is idempotent: re-running will not produce duplicates.
 */

import crypto from 'crypto';
import prisma from '../src/lib/db';

type SeedGig = {
  title: string;
  description: string;
  category: 'engineering' | 'operations' | 'business' | 'research' | 'legal' | 'manufacturing';
  workType: 'freelance' | 'contract' | 'part_time' | 'consulting' | 'side_project';
  skills: string[];
  duration?: string;
  hoursPerWeek?: number;
  budgetMin?: number;
  budgetMax?: number;
  budgetType?: 'hourly' | 'fixed' | 'monthly';
  location?: string;
  remoteOk: boolean;
  clearanceRequired?: boolean;
  companyName: string;
};

const SEED_GIGS: SeedGig[] = [
  {
    title: 'Satellite Operations Consultant',
    description:
      'Support a Series A earth-observation startup with satellite mission planning and ground ops integration. You will help design an automated tasking workflow and own hand-off to the ops team.',
    category: 'operations',
    workType: 'consulting',
    skills: ['satellite operations', 'mission planning', 'stk', 'python'],
    duration: '3 months',
    hoursPerWeek: 20,
    budgetMin: 120,
    budgetMax: 180,
    budgetType: 'hourly',
    remoteOk: true,
    companyName: 'Orbital Insight Labs',
  },
  {
    title: 'Avionics Firmware Contract (STM32 / RTOS)',
    description:
      'We need a firmware contractor to bring up a new flight computer on an STM32H7 running FreeRTOS. Scope includes bootloader, CAN bus comms, and hardware-in-the-loop test harness.',
    category: 'engineering',
    workType: 'contract',
    skills: ['stm32', 'freertos', 'c', 'can bus', 'avionics'],
    duration: '6 months',
    hoursPerWeek: 40,
    budgetMin: 140,
    budgetMax: 200,
    budgetType: 'hourly',
    location: 'Los Angeles, CA',
    remoteOk: false,
    clearanceRequired: false,
    companyName: 'Pericyne Aerospace',
  },
  {
    title: 'Space Policy Writer — FCC / ITU Filings',
    description:
      'Freelance technical writer needed to draft and polish FCC Part 25 filings and ITU coordination documents for a new LEO constellation.',
    category: 'legal',
    workType: 'freelance',
    skills: ['fcc filings', 'itu', 'space policy', 'technical writing'],
    duration: 'Ongoing',
    budgetMin: 80,
    budgetMax: 130,
    budgetType: 'hourly',
    remoteOk: true,
    companyName: 'Helios Broadband',
  },
  {
    title: 'GNC Algorithms Side Project (Rendezvous & Proximity Ops)',
    description:
      'Small paid side project to prototype a rendezvous and proximity operations controller in MATLAB/Simulink, with a Python reference implementation.',
    category: 'research',
    workType: 'side_project',
    skills: ['gnc', 'matlab', 'simulink', 'python', 'kalman filter'],
    duration: '6 weeks',
    hoursPerWeek: 10,
    budgetMin: 6000,
    budgetMax: 9000,
    budgetType: 'fixed',
    remoteOk: true,
    companyName: 'Kepler Dynamics',
  },
  {
    title: 'Composite Manufacturing Engineer (Part-time)',
    description:
      'Part-time engineer to support a small launch vehicle startup with carbon fiber layup process optimization and autoclave cure profile validation.',
    category: 'manufacturing',
    workType: 'part_time',
    skills: ['composites', 'autoclave', 'manufacturing', 'process engineering'],
    duration: '4 months',
    hoursPerWeek: 20,
    budgetMin: 90,
    budgetMax: 130,
    budgetType: 'hourly',
    location: 'Long Beach, CA',
    remoteOk: false,
    companyName: 'Arclight Launch',
  },
  {
    title: 'Space Economy Market Analyst',
    description:
      'Research-driven analyst needed to produce a quarterly briefing on commercial space market segments (launch, EO, SATCOM, ISAM) for an investor newsletter.',
    category: 'business',
    workType: 'contract',
    skills: ['market research', 'financial modeling', 'space economy'],
    duration: '12 months',
    hoursPerWeek: 15,
    budgetMin: 5000,
    budgetMax: 7500,
    budgetType: 'monthly',
    remoteOk: true,
    companyName: 'North Star Capital',
  },
  {
    title: 'RF / Spectrum Engineering Consultant',
    description:
      'Help design Ka-band user terminal antenna arrays and run link budget analyses for a new mobile satcom offering.',
    category: 'engineering',
    workType: 'consulting',
    skills: ['rf engineering', 'ka-band', 'link budget', 'antennas'],
    duration: '2 months',
    budgetMin: 12000,
    budgetMax: 18000,
    budgetType: 'fixed',
    remoteOk: true,
    companyName: 'Stratonet',
  },
  {
    title: 'Launch Mission Manager (Contract)',
    description:
      'Own customer-facing mission management for 2-3 upcoming rideshare missions: payload onboarding, ICD reviews, launch readiness reviews, and post-mission reports.',
    category: 'operations',
    workType: 'contract',
    skills: ['mission management', 'launch integration', 'icd', 'customer success'],
    duration: '9 months',
    hoursPerWeek: 32,
    budgetMin: 110,
    budgetMax: 160,
    budgetType: 'hourly',
    location: 'Cape Canaveral, FL',
    remoteOk: true,
    companyName: 'Rideshare Aerospace',
  },
  {
    title: 'Orbital Debris Research Writer',
    description:
      'Freelance researcher/writer to produce a long-form report on post-mission disposal compliance trends across LEO constellations.',
    category: 'research',
    workType: 'freelance',
    skills: ['orbital debris', 'research', 'writing', 'compliance'],
    duration: 'One-time',
    budgetMin: 4000,
    budgetMax: 6000,
    budgetType: 'fixed',
    remoteOk: true,
    companyName: 'Astra Sustainability Institute',
  },
  {
    title: 'Defense Space Systems Engineer (TS/SCI)',
    description:
      'Systems engineering support on a classified DoD space program. Must have active TS/SCI clearance. Expect on-site work in Colorado Springs.',
    category: 'engineering',
    workType: 'contract',
    skills: ['systems engineering', 'dod', 'space defense', 'ts/sci'],
    duration: '12 months',
    hoursPerWeek: 40,
    budgetMin: 180,
    budgetMax: 240,
    budgetType: 'hourly',
    location: 'Colorado Springs, CO',
    remoteOk: false,
    clearanceRequired: true,
    companyName: 'Aegis Defense Systems',
  },
  {
    title: 'Ground Station Network Automation Engineer',
    description:
      'Build Python + Kubernetes automation to schedule passes across a multi-vendor ground station network (KSAT, AWS Ground Station, Viasat).',
    category: 'engineering',
    workType: 'contract',
    skills: ['python', 'kubernetes', 'ground stations', 'automation', 'aws'],
    duration: '4 months',
    hoursPerWeek: 30,
    budgetMin: 130,
    budgetMax: 180,
    budgetType: 'hourly',
    remoteOk: true,
    companyName: 'Groundlink Systems',
  },
  {
    title: 'Lunar ISRU Business Development Lead',
    description:
      'Part-time BD lead to open conversations with lunar lander OEMs and NASA CLPS stakeholders for an ISRU oxygen extraction technology.',
    category: 'business',
    workType: 'part_time',
    skills: ['business development', 'lunar', 'isru', 'nasa clps'],
    duration: '6 months',
    hoursPerWeek: 20,
    budgetMin: 6000,
    budgetMax: 9000,
    budgetType: 'monthly',
    remoteOk: true,
    companyName: 'Regolith Resources',
  },
  {
    title: 'Export Control (ITAR/EAR) Attorney — Part-time',
    description:
      'Experienced ITAR/EAR attorney needed part-time to review product classifications and licensing strategy for an emerging launch services company.',
    category: 'legal',
    workType: 'part_time',
    skills: ['itar', 'ear', 'export control', 'space law'],
    duration: 'Ongoing',
    hoursPerWeek: 10,
    budgetMin: 300,
    budgetMax: 500,
    budgetType: 'hourly',
    remoteOk: true,
    companyName: 'Vector Legal Counsel',
  },
  {
    title: 'CubeSat Bus Integration Technician (On-site)',
    description:
      'Hands-on integration technician for two 6U CubeSat builds. Mechanical assembly, harness routing, and environmental test support.',
    category: 'manufacturing',
    workType: 'contract',
    skills: ['cubesat', 'assembly', 'harnessing', 'environmental testing'],
    duration: '3 months',
    hoursPerWeek: 40,
    budgetMin: 60,
    budgetMax: 90,
    budgetType: 'hourly',
    location: 'Boulder, CO',
    remoteOk: false,
    companyName: 'Tesseract Space',
  },
  {
    title: 'Space Industry Content Marketer (Freelance)',
    description:
      'Freelance content marketer to produce 4 long-form articles/month on commercial space topics for a fast-growing SaaS platform serving the industry.',
    category: 'business',
    workType: 'freelance',
    skills: ['content marketing', 'space industry', 'seo', 'copywriting'],
    duration: '6 months',
    hoursPerWeek: 15,
    budgetMin: 3000,
    budgetMax: 5000,
    budgetType: 'monthly',
    remoteOk: true,
    companyName: 'SpaceNexus (seed demo)',
  },
];

async function ensureSeedEmployer(): Promise<string> {
  const SEED_EMAIL = 'gig-seed@spacenexus.us';

  let user = await prisma.user.findUnique({ where: { email: SEED_EMAIL } });
  if (!user) {
    // Password is required by the schema but this is a non-interactive seed
    // account — use a random, unusable value so it cannot be signed in with.
    user = await prisma.user.create({
      data: {
        email: SEED_EMAIL,
        name: 'SpaceNexus Gig Seeder',
        password: `!seed:${crypto.randomBytes(24).toString('hex')}`,
      },
    });
  }

  let employer = await prisma.employerProfile.findUnique({
    where: { userId: user.id },
  });
  if (!employer) {
    employer = await prisma.employerProfile.create({
      data: {
        userId: user.id,
        companyName: 'SpaceNexus Gig Board',
        description:
          'Seed employer used to populate the SpaceNexus gig marketplace with sample opportunities.',
        verified: true,
      },
    });
  }

  return employer.id;
}

async function main() {
  console.log('Seeding gig marketplace…');
  const employerId = await ensureSeedEmployer();

  let created = 0;
  let skipped = 0;

  for (const gig of SEED_GIGS) {
    const existing = await prisma.gigOpportunity.findFirst({
      where: { employerId, title: gig.title },
      select: { id: true },
    });

    if (existing) {
      skipped += 1;
      continue;
    }

    await prisma.gigOpportunity.create({
      data: {
        employerId,
        title: gig.title,
        description: gig.description,
        category: gig.category,
        skills: gig.skills,
        workType: gig.workType,
        duration: gig.duration ?? null,
        hoursPerWeek: gig.hoursPerWeek ?? null,
        budgetMin: gig.budgetMin ?? null,
        budgetMax: gig.budgetMax ?? null,
        budgetType: gig.budgetType ?? 'hourly',
        location: gig.location ?? null,
        remoteOk: gig.remoteOk,
        clearanceRequired: gig.clearanceRequired ?? false,
      },
    });
    created += 1;
  }

  console.log(`Done. Created ${created} new gig(s); skipped ${skipped} existing.`);
}

main()
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
