/**
 * Seed script for Speaking Opportunities
 *
 * Run with: npx tsx scripts/seed-speaking-opportunities.ts
 *
 * Idempotent: uses deterministic title+organization pairs to skip duplicates.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface Seed {
  title: string;
  organization: string;
  conferenceName?: string;
  topic: string;
  description: string;
  // offsets in days from "today" so dates stay in the future when the script runs
  eventOffsetDays: number;
  deadlineOffsetDays?: number;
  location?: string;
  isRemote: boolean;
  compensation?: string;
  audienceSize?: number;
  cfpUrl?: string;
  contactEmail?: string;
  contactName?: string;
  tags: string[];
  featured?: boolean;
}

const SEEDS: Seed[] = [
  {
    title: 'Keynote speaker search — Space Symposium 2026',
    organization: 'Space Foundation',
    conferenceName: 'Space Symposium 2026',
    topic: 'Future of commercial-government space partnerships',
    description:
      'The Space Foundation is looking for senior industry voices to deliver a 25-minute plenary keynote on how commercial and national security space programs are converging. Expect an audience of government acquisition leads, major primes, and new-space founders. Travel and lodging for two nights covered.',
    eventOffsetDays: 120,
    deadlineOffsetDays: 45,
    location: 'Colorado Springs, CO, USA',
    isRemote: false,
    compensation: 'Travel + lodging covered, $2,500 honorarium',
    audienceSize: 11000,
    cfpUrl: 'https://www.spacesymposium.org/speakers/',
    contactEmail: 'speakers@spacefoundation.org',
    contactName: 'Program Committee',
    tags: ['policy', 'commercial', 'keynote', 'national-security'],
    featured: true,
  },
  {
    title: 'Student track — International Astronautical Congress 2026',
    organization: 'International Astronautical Federation',
    conferenceName: 'IAC 2026',
    topic: 'Student research presentations across all IAF technical committees',
    description:
      'IAF is accepting abstracts for the dedicated student track at IAC 2026. Graduate and advanced undergraduate students may submit to any IAF technical committee. Accepted students receive a reduced registration fee and are eligible for the IAF Emerging Space Leaders Grant.',
    eventOffsetDays: 175,
    deadlineOffsetDays: 30,
    location: 'Milan, Italy',
    isRemote: false,
    compensation: 'Reduced registration; grant eligibility',
    audienceSize: 8000,
    cfpUrl: 'https://iafastro.directory/iac/2026/',
    contactEmail: 'students@iafastro.org',
    tags: ['academic', 'student', 'research'],
  },
  {
    title: 'Panel: Responsive launch in a contested environment',
    organization: 'SmallSat Alliance',
    conferenceName: 'SmallSat Symposium 2026',
    topic: 'Responsive launch, tactical space, rapid reconstitution',
    description:
      'Seeking 3 panelists with direct experience in responsive launch vehicles, rideshare orchestration, or on-orbit servicing. 45-minute moderated panel. Looking for a mix of startup and established-prime perspectives. Remote participation via video bridge is available for non-US speakers.',
    eventOffsetDays: 60,
    deadlineOffsetDays: 21,
    location: 'Mountain View, CA, USA',
    isRemote: true,
    compensation: 'Comped registration; no honorarium',
    audienceSize: 2500,
    cfpUrl: 'https://smallsatsymposium.com/speakers',
    contactEmail: 'program@smallsatalliance.org',
    contactName: 'Tanya Morales',
    tags: ['launch', 'defense', 'panel', 'newspace'],
    featured: true,
  },
  {
    title: 'SPIE Defense + Commercial Sensing — Earth observation track',
    organization: 'SPIE',
    conferenceName: 'SPIE DCS 2026',
    topic: 'Remote sensing, hyperspectral imaging, AI for EO',
    description:
      'SPIE is accepting technical paper abstracts for the Earth observation and remote sensing tracks. Preference given to novel hyperspectral, radar, and on-board AI work with flight heritage or near-term flight plans. Accepted papers appear in SPIE Proceedings.',
    eventOffsetDays: 95,
    deadlineOffsetDays: 14,
    location: 'Orlando, FL, USA',
    isRemote: false,
    compensation: 'Self-funded; SPIE Proceedings publication included',
    audienceSize: 3200,
    cfpUrl: 'https://spie.org/conferences-and-exhibitions/defense-commercial-sensing',
    contactEmail: 'dcs@spie.org',
    tags: ['earth-observation', 'hyperspectral', 'AI', 'academic'],
  },
  {
    title: 'Space Tech Expo — Manufacturing & test workshop speaker slots',
    organization: 'Space Tech Expo',
    conferenceName: 'Space Tech Expo USA 2026',
    topic: 'Spacecraft manufacturing, environmental testing, assembly/integration',
    description:
      'Two 30-minute workshop slots available on the advanced manufacturing stage. Seeking practitioner-led talks on AIT best practices, environmental testing pitfalls, or digital-twin adoption. Talks must be vendor-neutral (no product pitches).',
    eventOffsetDays: 140,
    deadlineOffsetDays: 55,
    location: 'Long Beach, CA, USA',
    isRemote: false,
    compensation: 'Free exhibitor-hall pass; no honorarium',
    audienceSize: 5000,
    cfpUrl: 'https://www.spacetechexpo.com/speaker-proposals',
    contactEmail: 'content@spacetechexpo.com',
    contactName: 'Josh Turner',
    tags: ['manufacturing', 'testing', 'workshop'],
  },
  {
    title: 'AIAA SciTech — Propulsion paper invitations',
    organization: 'AIAA',
    conferenceName: 'AIAA SciTech Forum 2027',
    topic: 'Electric propulsion, green monopropellants, detonation engines',
    description:
      'AIAA Propulsion & Energy Committee is inviting full-paper submissions for SciTech 2027. Particular interest in Hall-effect thrusters for cislunar logistics, ASCENT/green-prop flight demonstrations, and rotating detonation engines. Double-blind peer review.',
    eventOffsetDays: 260,
    deadlineOffsetDays: 75,
    location: 'Orlando, FL, USA',
    isRemote: false,
    compensation: 'Self-funded',
    audienceSize: 5500,
    cfpUrl: 'https://www.aiaa.org/scitech/presentations-papers/call-for-papers',
    contactEmail: 'scitech-propulsion@aiaa.org',
    tags: ['propulsion', 'academic', 'paper'],
  },
  {
    title: 'SpaceOps 2026 — Mission operations lightning talks',
    organization: 'AIAA / DGLR / JSASS',
    conferenceName: 'SpaceOps Conference 2026',
    topic: 'Autonomous operations, anomaly response, mission control automation',
    description:
      'Seeking short 10-minute lightning talks from mission operators. Ideal candidates have flown (or are currently flying) a LEO/GEO/deep-space mission and can share concrete anomaly-response stories. Fully remote participation supported via conference streaming platform.',
    eventOffsetDays: 165,
    deadlineOffsetDays: 40,
    location: 'Montreal, Canada',
    isRemote: true,
    compensation: 'Comped virtual registration',
    audienceSize: 1200,
    cfpUrl: 'https://www.spaceops.org/cfp',
    contactEmail: 'program@spaceops.org',
    contactName: 'Dr. Lina Okafor',
    tags: ['operations', 'lightning-talk', 'autonomy', 'remote'],
  },
  {
    title: 'GEOINT Symposium — Commercial satellite imagery panel',
    organization: 'USGIF',
    conferenceName: 'GEOINT 2026',
    topic: 'Commercial imagery purchasing and NGA partnerships',
    description:
      'USGIF is seeking two commercial-imagery executives and one NGA program lead for a moderated panel on the evolving government-commercial imagery relationship. Security clearance helpful but not required — session is unclassified.',
    eventOffsetDays: 150,
    deadlineOffsetDays: 35,
    location: 'San Diego, CA, USA',
    isRemote: false,
    compensation: 'Full-conference pass + $1,000 honorarium',
    audienceSize: 4500,
    cfpUrl: 'https://usgif.org/symposium/speakers',
    contactEmail: 'content@usgif.org',
    contactName: 'Robert Chen',
    tags: ['earth-observation', 'defense', 'panel', 'imagery'],
  },
  {
    title: 'NewSpace Conference — Founder fireside chats',
    organization: 'Space Frontier Foundation',
    conferenceName: 'NewSpace 2026',
    topic: 'Early-stage founder journeys and pivot stories',
    description:
      'Seeking 6 early-stage space founders (pre-Series-B) for 20-minute fireside chats. Looking for honest pivot/failure stories as much as success stories. Remote participation welcome for international founders.',
    eventOffsetDays: 100,
    // no submission deadline — rolling until filled
    location: 'Seattle, WA, USA',
    isRemote: true,
    compensation: 'Comped full-conference pass; travel not covered',
    audienceSize: 1500,
    cfpUrl: 'https://newspace.spacefrontier.org/speakers',
    contactEmail: 'speakers@spacefrontier.org',
    tags: ['startup', 'founder', 'fireside', 'investment'],
  },
  {
    title: 'Virtual webinar series — Orbital debris & space sustainability',
    organization: 'Secure World Foundation',
    topic: 'Active debris removal, end-of-life policy, space traffic management',
    description:
      'SWF is curating a 6-part virtual webinar series on debris and sustainability. Looking for policy experts, ADR engineers, and STM operators willing to lead a 45-minute session plus Q&A. Fully remote. Each session gets professional A/V production and post-event distribution.',
    eventOffsetDays: 35,
    deadlineOffsetDays: 10,
    isRemote: true,
    compensation: 'Unpaid; full video distribution + promotion',
    audienceSize: 600,
    cfpUrl: 'https://swfound.org/events',
    contactEmail: 'webinars@swfound.org',
    contactName: 'Dr. Priya Sastry',
    tags: ['sustainability', 'debris', 'policy', 'remote', 'webinar'],
  },
];

async function main() {
  console.log('Seeding Speaking Opportunities...');
  const now = new Date();
  now.setHours(12, 0, 0, 0);

  let created = 0;
  let skipped = 0;

  for (const seed of SEEDS) {
    // Dedupe by title + organization
    const existing = await prisma.speakingOpportunity.findFirst({
      where: { title: seed.title, organization: seed.organization },
      select: { id: true },
    });
    if (existing) {
      skipped++;
      continue;
    }

    const eventDate = new Date(now.getTime() + seed.eventOffsetDays * 86400_000);
    const submissionDeadline =
      seed.deadlineOffsetDays !== undefined
        ? new Date(now.getTime() + seed.deadlineOffsetDays * 86400_000)
        : null;

    await prisma.speakingOpportunity.create({
      data: {
        title: seed.title,
        organization: seed.organization,
        conferenceName: seed.conferenceName ?? null,
        topic: seed.topic,
        description: seed.description,
        eventDate,
        submissionDeadline,
        location: seed.location ?? null,
        isRemote: seed.isRemote,
        compensation: seed.compensation ?? null,
        audienceSize: seed.audienceSize ?? null,
        cfpUrl: seed.cfpUrl ?? null,
        contactEmail: seed.contactEmail ?? null,
        contactName: seed.contactName ?? null,
        tags: seed.tags,
        status: 'approved',
        featured: Boolean(seed.featured),
      },
    });
    created++;
  }

  console.log(`Done. Created ${created}, skipped ${skipped} (already existed).`);
}

main()
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
