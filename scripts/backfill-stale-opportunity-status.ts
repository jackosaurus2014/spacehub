/**
 * One-time backfill: apply the same status-transition logic now embedded in
 * POST /api/funding-opportunities and POST /api/procurement/opportunities
 * to close currently-stale rows immediately, rather than waiting for the
 * next scheduled cron run (funding-opportunities-refresh: 09:00 UTC daily;
 * procurement-sam-refresh: 13:30 UTC daily — both in src/lib/cron-scheduler.ts).
 *
 * Safe to re-run — both updateMany calls are idempotent (they only touch
 * rows currently in the "stale but still marked active/open" state).
 *
 * Usage: DATABASE_URL=... npx tsx scripts/backfill-stale-opportunity-status.ts
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({ datasources: { db: { url: process.env.DATABASE_URL } } });

async function main() {
  const now = new Date();

  const fundingOpenBefore = await prisma.fundingOpportunity.count({ where: { status: 'open' } });
  const procurementActiveBefore = await prisma.procurementOpportunity.count({ where: { isActive: true } });

  const fundingClosed = await prisma.fundingOpportunity.updateMany({
    where: { deadline: { lt: now }, status: 'open' },
    data: { status: 'closed' },
  });

  const procurementClosed = await prisma.procurementOpportunity.updateMany({
    where: { isActive: true, responseDeadline: { lt: now } },
    data: { isActive: false },
  });

  const fundingOpenAfter = await prisma.fundingOpportunity.count({ where: { status: 'open' } });
  const procurementActiveAfter = await prisma.procurementOpportunity.count({ where: { isActive: true } });

  console.log('FundingOpportunity: open before=%d, closed=%d, open after=%d', fundingOpenBefore, fundingClosed.count, fundingOpenAfter);
  console.log('ProcurementOpportunity: active before=%d, closed=%d, active after=%d', procurementActiveBefore, procurementClosed.count, procurementActiveAfter);
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
