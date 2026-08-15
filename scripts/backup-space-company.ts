/**
 * Backup: dump every SpaceCompany row to a timestamped JSON file before the
 * table is dropped.
 *
 * Context (2026-08-14): SpaceCompany is the legacy, pre-merge company table.
 * CompanyProfile has been the single source of truth since the 8/14 merge
 * (see src/lib/company-roster.ts; the one-time migration script that copied
 * SpaceCompany rows into CompanyProfile — scripts/merge-space-companies.ts —
 * has completed its job and was deleted). No application code reads or
 * writes SpaceCompany anymore, and its Prisma model has been removed from
 * prisma/schema.prisma (schema-only change; the coordinator runs the actual
 * `npx prisma db push` that drops the table).
 *
 * This script queries the table via raw SQL rather than `prisma.spaceCompany`
 * so it keeps compiling and stays runnable even though the model no longer
 * exists in the schema — right up until the table itself is actually dropped.
 *
 * Read-only: does not modify or delete any SpaceCompany rows.
 *
 * Usage:
 *   npx tsx scripts/backup-space-company.ts
 *   railway run npx tsx scripts/backup-space-company.ts   # against prod
 *
 * Output: scripts/backups/space-company-<ISO-timestamp>.json
 */

import fs from 'fs';
import path from 'path';
import prisma from '../src/lib/db';

interface SpaceCompanyRow {
  id: string;
  [key: string]: unknown;
}

async function main() {
  const rows = await prisma.$queryRawUnsafe<SpaceCompanyRow[]>(
    'SELECT * FROM "SpaceCompany" ORDER BY "createdAt" ASC'
  );

  const backupDir = path.join(__dirname, 'backups');
  fs.mkdirSync(backupDir, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outPath = path.join(backupDir, `space-company-${timestamp}.json`);

  const payload = {
    table: 'SpaceCompany',
    backedUpAt: new Date().toISOString(),
    rowCount: rows.length,
    rows,
  };

  fs.writeFileSync(outPath, JSON.stringify(payload, null, 2), 'utf-8');

  console.log(`Backed up ${rows.length} SpaceCompany row(s) to ${outPath}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
