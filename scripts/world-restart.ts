/**
 * World restart — bumps the shared world to a new epoch.
 * Epoch 1 → 2 executed 2026-08-24 16:00 UTC; reusable for later restarts.
 *
 * Wipes SHARED-WORLD GAME STATE so every corporation starts the new era on
 * equal footing under the post-overhaul rules. Local player saves are handled
 * separately and automatically: bumping WORLD_EPOCH in src/lib/game/
 * world-reset.ts makes save-load.ts archive each older-epoch save to
 * ARCHIVED_SAVE_KEY (never deletes it) and start that player fresh.
 *
 * USAGE
 *   npx tsx scripts/world-restart.ts              # DRY RUN — counts only
 *   npx tsx scripts/world-restart.ts --backup     # write a JSON backup, no deletes
 *   npx tsx scripts/world-restart.ts --apply      # requires a prior --backup file
 *
 * WHY AN EXPLICIT ALLOWLIST, NOT A PATTERN MATCH
 * ----------------------------------------------
 * The schema mixes three unrelated families that a naive name pattern would
 * conflate, and deleting from the wrong one would destroy live SITE data that
 * has nothing to do with the game:
 *
 *   - `DocketSnapshot`  — Regulations.gov docket intelligence (Regulatory Radar)
 *   - `OrbitalSlot` / `OrbitalService*` / `OrbitalEvent` — the site's real-world
 *     orbital tracking and satellite-servicing marketplace
 *   - `MarketResource`, `Zone` — GAME *definition* tables (slug/name/description).
 *     These are reference data the engine reads, not player state. Wiping them
 *     would empty the market catalogue rather than reset it.
 *
 * So every table below was chosen deliberately and is player- or world-STATE
 * for the shared game. Anything not listed is preserved.
 */
import prisma from '../src/lib/db';
import * as fs from 'fs';
import * as path from 'path';

/** Shared-world game state, wiped in dependency-safe order (children first). */
const WIPE_ORDER: string[] = [
  // — offense / competitive records
  'poachOffer', 'priceCampaign', 'espionageMission', 'espionageProfile',
  'marketAuditLog', 'marketAlert',
  // — market book and derived telemetry
  'marketFill', 'marketLimitOrder', 'marketOrder', 'marketPriceCandle',
  'tradeStatDaily',
  // — accord chair (Round 1 E1)
  'accordChairBallot', 'accordChairWrit', 'accordChairCandidacy',
  'accordFracture', 'accordChairTerm',
  // — orbital slot auctions (game-side; NOT the site's OrbitalSlot table)
  'orbitalSlotBid', 'orbitalSlotLease', 'orbitalSlotAuction',
  'orbitalSlotOccupancy',
  // — alliances / corporations
  'allianceDailyTaskCompletion', 'allianceDailyTask',
  'allianceProjectContribution', 'allianceProject',
  'allianceEventContribution', 'allianceEventScore', 'allianceEvent',
  'alliancePledge', 'allianceCharter', 'allianceResearch', 'alliancePerk',
  'allianceDiplomacy', 'allianceLog', 'allianceMember', 'alliance',
  // — shares / takeovers
  'corpShareHolding', 'corpShareRegistry',
  // — seasons, leagues, speed runs, predictions
  'seasonParticipation', 'seasonChallenge', 'seasonalEvent',
  'leagueBracketEntry', 'playerLeagueProfile',
  'speedRunAttempt', 'speedRunChallenge',
  'predictionStake',
  // — contracts, bounties, bidding
  'contractBid', 'biddingContract', 'resourceBounty',
  // — mega-projects and chapters
  'megaProjectContribution', 'megaProjectPlayerProgress',
  'megaProjectAllianceScore', 'chapterContribution', 'npcProgramStake',
  // — world simulation state
  'locationDemandPool', 'locationExtraction', 'laborIndex', 'laneUsage',
  'zoneInfluence', 'globalMilestone', 'governanceChallenge',
  'colonyClaim', 'rivalAssignment',
  // — per-player records and the ledger (last: many rows reference profiles)
  'gameMentorship', 'gameChatMessage', 'playerActivity', 'gameLedgerEntry',
  'corpEraRecord', 'publishedCorpReport',
  // — profiles themselves, last of all
  'gameProfile',
];

/**
 * Deliberately PRESERVED — documented so a future run does not "helpfully"
 * add them. Definition/reference tables and everything site-side.
 */
const PRESERVED = [
  'MarketResource / Zone — game DEFINITION tables (catalogue, not state)',
  'OrbitalSlot, OrbitalService*, OrbitalEvent — site orbital tracking & marketplace',
  'DocketSnapshot, RegulatoryAction, ComplianceQuestion — Regulatory Radar (site)',
  'NewsArticle, AIInsight, PublishedBrief, SpaceEvent — editorial/site content',
  'User, Subscription, FeedbackSubmission — accounts and site feedback',
];

async function countAll(): Promise<Record<string, number>> {
  const counts: Record<string, number> = {};
  for (const model of WIPE_ORDER) {
    const delegate = (prisma as unknown as Record<string, { count?: () => Promise<number> }>)[model];
    if (!delegate?.count) { counts[model] = -1; continue; } // -1 = model absent
    try { counts[model] = await delegate.count(); } catch { counts[model] = -1; }
  }
  return counts;
}

async function main() {
  const apply = process.argv.includes('--apply');
  const backup = process.argv.includes('--backup');
  const backupPath = path.join(process.cwd(), 'world-restart-backup.json');

  console.log('World restart — shared-world epoch wipe');
  console.log(apply ? 'Mode: APPLY (destructive)' : backup ? 'Mode: BACKUP' : 'Mode: DRY RUN');
  console.log('');

  const before = await countAll();
  const present = Object.entries(before).filter(([, n]) => n >= 0);
  const missing = Object.entries(before).filter(([, n]) => n < 0).map(([m]) => m);
  const total = present.reduce((s, [, n]) => s + n, 0);

  console.log('--- rows that WOULD be deleted ---');
  for (const [model, n] of present.filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${String(n).padStart(8)}  ${model}`);
  }
  console.log(`\n  TOTAL: ${total} rows across ${present.filter(([, n]) => n > 0).length} tables`);
  if (missing.length) console.log(`  (not present in client, skipped: ${missing.join(', ')})`);

  console.log('\n--- PRESERVED (never touched) ---');
  for (const p of PRESERVED) console.log(`  · ${p}`);

  if (backup) {
    const dump: Record<string, unknown[]> = {};
    for (const [model] of present.filter(([, n]) => n > 0)) {
      const d = (prisma as unknown as Record<string, { findMany?: () => Promise<unknown[]> }>)[model];
      if (d?.findMany) dump[model] = await d.findMany();
    }
    fs.writeFileSync(backupPath, JSON.stringify(dump, null, 2));
    const mb = (fs.statSync(backupPath).size / 1048576).toFixed(1);
    console.log(`\nBackup written: ${backupPath} (${mb} MB)`);
    return;
  }

  if (!apply) {
    console.log('\nDRY RUN — nothing deleted. Run with --backup first, then --apply.');
    return;
  }

  // Refuse to destroy anything without a backup on disk.
  if (!fs.existsSync(backupPath)) {
    console.error('\nREFUSING: no world-restart-backup.json found. Run --backup first.');
    process.exitCode = 1;
    return;
  }
  const age = (Date.now() - fs.statSync(backupPath).mtimeMs) / 3600000;
  if (age > 6) {
    console.error(`\nREFUSING: backup is ${age.toFixed(1)}h old. Re-run --backup.`);
    process.exitCode = 1;
    return;
  }

  console.log('\nDeleting...');
  for (const [model] of present.filter(([, n]) => n > 0)) {
    const d = (prisma as unknown as Record<string, { deleteMany?: () => Promise<{ count: number }> }>)[model];
    if (!d?.deleteMany) continue;
    const r = await d.deleteMany();
    console.log(`  ${String(r.count).padStart(8)}  ${model}`);
  }
  console.log('\nWipe complete. Remaining steps in src/lib/game/world-reset.ts:');
  console.log('  · bump WORLD_EPOCH (archives every older-epoch local save)');
  console.log('  · set WORLD_RESET_AT = null and EPOCH_BEGAN_AT to this restart');
  console.log('WorldResetNotice.tsx then flips itself from countdown to new-era');
  console.log('copy for NEW_ERA_NOTICE_DAYS. Build, then deploy.');
}

main().finally(() => prisma.$disconnect());
