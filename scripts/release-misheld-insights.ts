/**
 * One-shot: release AI insights that are held for review WITHOUT a
 * major-issues justification.
 *
 * Background (2026-08-20 audit): every daily AI article generated between
 * 2026-08-16 and 2026-08-20 landed in `pending_review` even when its stored
 * fact-check note showed a passing verdict ("Minor notes: …", or an
 * unprefixed pass summary). Per the founder decision of 2026-08-15 those
 * articles should have auto-published; only `major_issues` is held. See
 * src/lib/fact-check-gate.ts for the root cause and the permanent fix.
 *
 * Selection rule (matches src/lib/fact-check-gate.ts exactly):
 *   status = 'pending_review'
 *   AND factCheckNote IS NOT NULL
 *   AND factCheckNote does NOT start with 'MAJOR ISSUES:'
 *
 * Rows with a NULL note are deliberately LEFT HELD and only reported — we
 * cannot prove they passed, and the system's posture is fail-closed.
 * Rows with status 'rejected' are never touched: that is a real editorial
 * decision made through the reject flow.
 *
 * Usage:
 *   npx tsx scripts/release-misheld-insights.ts            # dry run (default)
 *   npx tsx scripts/release-misheld-insights.ts --apply     # write
 */

import prisma from '../src/lib/db';
import { MAJOR_ISSUES_PREFIX, isMisheld } from '../src/lib/fact-check-gate';

interface HeldRow {
  id: string;
  slug: string;
  title: string;
  status: string;
  category: string;
  factCheckNote: string | null;
  generatedAt: Date;
}

function firstLine(note: string | null): string {
  if (!note) return '(no fact-check note)';
  const line = note.split('\n')[0].trim();
  return line.length > 150 ? `${line.slice(0, 147)}...` : line;
}

async function main() {
  const apply = process.argv.includes('--apply');

  const held = (await (prisma.aIInsight as any).findMany({
    where: { status: 'pending_review' },
    orderBy: { generatedAt: 'asc' },
    select: {
      id: true,
      slug: true,
      title: true,
      status: true,
      category: true,
      factCheckNote: true,
      generatedAt: true,
    },
  })) as HeldRow[];

  const releasable = held.filter((row) => isMisheld(row.status, row.factCheckNote));
  const genuinelyHeld = held.filter((row) => row.factCheckNote?.startsWith(MAJOR_ISSUES_PREFIX));
  const unknown = held.filter((row) => !row.factCheckNote);

  console.log(`Mode: ${apply ? 'APPLY (writing)' : 'DRY RUN (no writes — pass --apply to write)'}`);
  console.log(`pending_review rows: ${held.length}`);
  console.log(`  releasable (passed fact-check): ${releasable.length}`);
  console.log(`  correctly held (MAJOR ISSUES):  ${genuinelyHeld.length}`);
  console.log(`  no note — left held for a human: ${unknown.length}`);

  if (releasable.length > 0) {
    console.log('\n--- WOULD PUBLISH ---');
    for (const row of releasable) {
      console.log(`\n  ${row.generatedAt.toISOString().slice(0, 10)}  [${row.category}]  ${row.title}`);
      console.log(`    slug: ${row.slug}`);
      console.log(`    note: ${firstLine(row.factCheckNote)}`);
    }
  }

  if (genuinelyHeld.length > 0) {
    console.log('\n--- STAYING HELD (major issues) ---');
    for (const row of genuinelyHeld) {
      console.log(`  ${row.generatedAt.toISOString().slice(0, 10)}  ${row.slug}`);
      console.log(`    ${firstLine(row.factCheckNote)}`);
    }
  }

  if (unknown.length > 0) {
    console.log('\n--- STAYING HELD (no fact-check note — needs a human) ---');
    for (const row of unknown) {
      console.log(`  ${row.generatedAt.toISOString().slice(0, 10)}  ${row.slug}`);
    }
  }

  if (!apply) {
    console.log('\nDry run complete. Re-run with --apply to publish the releasable rows.');
    return;
  }

  if (releasable.length === 0) {
    console.log('\nNothing to release.');
    return;
  }

  // reviewToken is intentionally preserved so the admin edit/unpublish links
  // in the editorial email keep working after release (same as auto-publish).
  const result = await (prisma.aIInsight as any).updateMany({
    where: { id: { in: releasable.map((row) => row.id) } },
    data: { status: 'published' },
  });

  console.log(`\nPublished ${result.count} article(s).`);
}

main()
  .catch((error) => {
    console.error('release-misheld-insights failed:', error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
