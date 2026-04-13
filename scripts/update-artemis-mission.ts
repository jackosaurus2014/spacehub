/**
 * Update Artemis II mission status in the database
 * - Marks past pre-launch events as completed
 * - Creates an active in-flight mission event with live stream
 *
 * Usage: npx tsx scripts/update-artemis-mission.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Mark all past Artemis II pre-launch events as completed
  const updated = await prisma.spaceEvent.updateMany({
    where: {
      name: { contains: 'Artemis II' },
      status: 'upcoming',
    },
    data: { status: 'completed' },
  });
  console.log(`Marked ${updated.count} past Artemis II events as completed`);

  // Check if active mission event already exists
  const existing = await prisma.spaceEvent.findFirst({
    where: { externalId: 'artemis-ii-mission-active' },
  });

  if (existing) {
    // Update it
    await prisma.spaceEvent.update({
      where: { id: existing.id },
      data: {
        webcastLive: true,
        isLive: true,
        status: 'in_progress',
      },
    });
    console.log(`Updated existing active mission event: ${existing.name}`);
  } else {
    // Create it
    const event = await prisma.spaceEvent.create({
      data: {
        externalId: 'artemis-ii-mission-active',
        name: 'Artemis II Mission — Live Coverage',
        description: 'Live coverage of NASA Artemis II crewed lunar flyby mission. Four astronauts are flying around the Moon aboard Orion, with closest approach on April 6 and splashdown targeted April 10.',
        type: 'launch',
        status: 'in_progress',
        launchDate: new Date('2026-04-01T22:24:00Z'),
        location: 'In Transit — Lunar Orbit',
        agency: 'NASA',
        rocket: 'SLS Block 1 / Orion',
        mission: 'Artemis II',
        videoUrl: 'https://www.youtube.com/watch?v=m3kR2KK8TEs',
        webcastLive: true,
        isLive: true,
        imageUrl: 'https://thespacedevs-prod.nyc3.digitaloceanspaces.com/media/images/artemis_ii_roll_image_20260127022614.jpg',
        infoUrl: 'https://www.nasa.gov/mission/artemis-ii/',
        crewCount: 4,
        crewDetails: 'Reid Wiseman (CDR), Victor Glover (PLT), Christina Koch (MS), Jeremy Hansen (MS/CSA)',
      },
    });
    console.log(`Created active mission event: ${event.name} (id: ${event.id})`);
  }

  // Verify
  const active = await prisma.spaceEvent.findMany({
    where: { status: 'in_progress' },
    select: { name: true, status: true, webcastLive: true, videoUrl: true },
  });
  console.log(`\nActive in-progress events:`, JSON.stringify(active, null, 2));
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
