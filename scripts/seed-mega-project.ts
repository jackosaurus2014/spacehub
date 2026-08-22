/**
 * Seed a cooperative Mega-Project.
 *
 * Run: npm run seed:mega-project             (defaults to space_elevator)
 *      npm run seed:mega-project -- dyson_sphere
 *      npx tsx scripts/seed-mega-project.ts interstellar_probe
 *
 * Creates the named project with status 'active', sets start/end dates, and
 * populates phase cost configuration. Safe to re-run (checks for an existing
 * active project first).
 *
 * AAA Round 1 E3.3: this used to hardcode `space_elevator`, which meant three
 * of the four authored definitions could never be instantiated on any server
 * — and the one that could grants `launch_cost_reduction`, which until this
 * wave had no consumer at all. The reward is wired now
 * (mega-projects.ts::getLaunchCostMultiplier) and the seeder takes an
 * argument. Pass `--list` to see what is available.
 */

import { PrismaClient } from '@prisma/client';
import {
  MEGA_PROJECT_DEFINITIONS,
  buildPhaseCostsForDb,
} from '../src/lib/game/mega-projects';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Mega-Project Seeder ---\n');

  // Check if there's already an active or announced mega-project
  const existing = await prisma.megaProject.findFirst({
    where: { status: { in: ['active', 'announced', 'extended'] } },
  });

  if (existing) {
    console.log(`An active mega-project already exists: "${existing.title}" (${existing.status})`);
    console.log(`ID: ${existing.id}`);
    console.log('Skipping seed. Delete the existing project first if you want to re-seed.');
    return;
  }

  const args = process.argv.slice(2).filter(a => a !== '--');
  if (args.includes('--list')) {
    console.log('Available mega-project definitions:');
    for (const d of MEGA_PROJECT_DEFINITIONS) {
      const capex = d.phases.reduce((n, ph) => n + ph.moneyCost, 0);
      console.log(`  ${d.type.padEnd(20)} ${d.title.padEnd(24)} $${(capex / 1e9).toFixed(0)}B over ${d.durationDays}d — reward: ${d.permanentBonus.label}`);
    }
    return;
  }

  const requestedType = args[0] || 'space_elevator';
  const definition = MEGA_PROJECT_DEFINITIONS.find(d => d.type === requestedType);
  if (!definition) {
    console.error(`No mega-project definition named "${requestedType}".`);
    console.error(`Known types: ${MEGA_PROJECT_DEFINITIONS.map(d => d.type).join(', ')}`);
    process.exitCode = 1;
    return;
  }
  console.log(`Seeding "${definition.title}" (${definition.type}) — reward: ${definition.permanentBonus.label}
`);

  // Calculate dates
  const now = new Date();
  const startsAt = new Date(now);
  const endsAt = new Date(now);
  endsAt.setDate(endsAt.getDate() + definition.durationDays);

  // Build phase costs JSON
  const phaseCosts = buildPhaseCostsForDb(definition);

  // Build initial phase progress (all zeroes)
  const initialPhaseProgress: Record<string, Record<string, number>> = {};
  for (const phase of phaseCosts) {
    const progress: Record<string, number> = { cash: 0 };
    for (const resourceId of Object.keys(phase.resourceCosts)) {
      progress[resourceId] = 0;
    }
    initialPhaseProgress[String(phase.phase)] = progress;
  }

  // Create the project
  const project = await prisma.megaProject.create({
    data: {
      projectType: definition.type,
      title: definition.title,
      description: definition.description,
      currentPhase: 1,
      totalPhases: definition.totalPhases,
      phaseCosts: JSON.parse(JSON.stringify(phaseCosts)),
      totalMoneyFunded: 0,
      totalResourceFunded: initialPhaseProgress,
      status: 'active',
      startsAt,
      endsAt,
      permanentBonus: {
        type: definition.permanentBonus.type,
        label: definition.permanentBonus.label,
        value: definition.permanentBonus.baseValue,
      },
    },
  });

  console.log('Space Elevator mega-project created successfully!\n');
  console.log(`  ID:         ${project.id}`);
  console.log(`  Title:      ${project.title}`);
  console.log(`  Status:     ${project.status}`);
  console.log(`  Phases:     ${project.totalPhases}`);
  console.log(`  Starts:     ${startsAt.toISOString()}`);
  console.log(`  Ends:       ${endsAt.toISOString()}`);
  console.log(`  Duration:   ${definition.durationDays} days`);
  console.log('');
  console.log('Phase breakdown:');
  for (const phase of phaseCosts) {
    const resourceList = Object.entries(phase.resourceCosts)
      .map(([id, qty]) => `${qty?.toLocaleString()} ${id}`)
      .join(', ');
    console.log(`  Phase ${phase.phase}: ${phase.name}`);
    console.log(`    Cash:      $${(phase.moneyCost / 1e9).toFixed(0)}B`);
    console.log(`    Resources: ${resourceList}`);
    console.log(`    Duration:  ${phase.durationDays} days`);
  }
  console.log('');
  console.log(`Permanent bonus: ${definition.permanentBonus.label}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
