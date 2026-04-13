/**
 * Post a new live blog entry for Artemis II
 * Usage: npx tsx scripts/post-live-blog.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const entries = [
  {
    title: 'SPLASHDOWN! Artemis II Crew Safely Home After 10-Day Lunar Mission',
    body: 'Orion splashed down in the Pacific Ocean at 12:57 p.m. EDT today, approximately 740 miles west of San Diego. The four Artemis II astronauts — Commander Reid Wiseman, Pilot Victor Glover, Mission Specialists Christina Koch and Jeremy Hansen — are confirmed safe and in good health after their historic 10-day mission around the Moon. Orion\'s heat shield withstood temperatures of approximately 5,000°F during re-entry at 24,500 mph, performing flawlessly at lunar return velocities with a crew aboard for the first time. Navy divers from the USS Portland have attached a stability collar to the capsule and recovery operations are underway. This marks the first time humans have returned from deep space since Apollo 17 in December 1972.',
    type: 'milestone',
    source: 'admin',
    pinned: true,
    eventTag: 'artemis-ii',
  },
  {
    title: 'Crew Extracted from Orion — All Four Astronauts in Excellent Health',
    body: 'The Artemis II crew has been successfully extracted from the Orion capsule and brought aboard the USS Portland. All four astronauts walked out under their own power and are undergoing preliminary medical evaluations. Commander Wiseman gave a thumbs up to the recovery teams, and Pilot Glover radioed Houston with the message: "We\'re home, and the Moon was worth the trip." NASA\'s Chief Astronaut and flight surgeons report the crew is in excellent physical condition. The astronauts will be transported to Naval Air Station North Island in San Diego for further evaluation before returning to Johnson Space Center in Houston.',
    type: 'update',
    source: 'admin',
    pinned: false,
    eventTag: 'artemis-ii',
  },
  {
    title: 'NASA Administrator: "Artemis III Lunar Landing Now Cleared to Proceed"',
    body: 'In a press conference following splashdown, NASA Administrator Bill Nelson confirmed that the success of Artemis II clears the path for Artemis III — the mission that will land the first woman and first person of color on the lunar surface. "Today we proved that Orion can safely carry a crew to the Moon and bring them home," Nelson said. "Every system performed at or above expectations. Artemis III is now our next giant leap." NASA announced that Artemis III crew assignments will be revealed within 60 days, with launch targeted for late 2027. The agency also confirmed that the Artemis II Orion capsule will be transported to Kennedy Space Center for detailed post-flight analysis, with particular focus on heat shield performance data.',
    type: 'milestone',
    source: 'admin',
    pinned: false,
    eventTag: 'artemis-ii',
  },
];

async function main() {
  console.log('Posting Artemis II live blog updates (Splashdown & Recovery)...\n');

  for (const entry of entries) {
    const created = await prisma.liveBlogEntry.create({ data: entry });
    console.log(`  ✓ [${created.type.toUpperCase()}] ${created.title}`);
  }

  const total = await prisma.liveBlogEntry.count({ where: { eventTag: 'artemis-ii' } });
  console.log(`\nDone. Total Artemis II live blog entries: ${total}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
