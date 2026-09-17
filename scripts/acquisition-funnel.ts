/**
 * How many of our visitors do we keep? (2026-09-17)
 *
 *   railway ssh -s spacehub -- npx tsx scripts/acquisition-funnel.ts
 *
 * The growth snapshot reports MAU and search impressions, and the CTR audit
 * reports which pages rank without being clicked. Neither answers the
 * question that decides where effort should go: of the people who already
 * arrive, what fraction leave us a way to reach them again?
 *
 * That ratio decides whether the lever is acquisition or conversion. If
 * 20,000 people visit and 40 give us an email, more traffic is worth very
 * little until the capture rate moves — and the drill on
 * /guide/space-launch-cost-comparison (2026-09-17) showed the search tail is
 * too diffuse to farm for more traffic anyway: its top 500 queries are 7.6%
 * of its impressions.
 *
 * "Kept" deliberately counts three things, because they are three different
 * levels of commitment and they fail differently:
 *   - accounts        (User)                  full signup
 *   - digest subs     (NewsletterSubscriber)  verified email, no account
 *   - launch watches  (LaunchWatch)           verified email, one launch
 *
 * Per-landing-page return rate comes from GA4 and is the other half: a page
 * that captures nobody but brings people back is still working.
 *
 * Read-only. Prints `HEX <hex JSON>` (the ssh pipe mangles plain text).
 */
import { PrismaClient } from '@prisma/client';
import { fetchGA4Users, fetchGA4LandingReturns } from '../src/lib/growth-metrics';

const prisma = new PrismaClient();

const DAYS = 30;

async function main() {
  const since = new Date(Date.now() - DAYS * 86_400_000);

  const [
    accounts,
    accountsPrior,
    digest,
    watches,
    accountsTotal,
    digestTotal,
  ] = await Promise.all([
    prisma.user.count({ where: { createdAt: { gte: since } } }),
    prisma.user.count({
      where: { createdAt: { gte: new Date(since.getTime() - DAYS * 86_400_000), lt: since } },
    }),
    prisma.newsletterSubscriber.count({
      where: { createdAt: { gte: since }, verified: true, unsubscribedAt: null },
    }),
    prisma.launchWatch.count({
      where: { createdAt: { gte: since }, verified: true, unsubscribedAt: null },
    }),
    prisma.user.count(),
    prisma.newsletterSubscriber.count({ where: { verified: true, unsubscribedAt: null } }),
  ]);

  // GA4 and Search Console are external; a failure there must not look like
  // a zero, so each is reported separately and errors are surfaced.
  const errors: string[] = [];
  let ga4: { mau: number | null; wau: number | null } = { mau: null, wau: null };
  try {
    ga4 = await fetchGA4Users();
  } catch (err) {
    errors.push(`ga4 users: ${err instanceof Error ? err.message : String(err)}`);
  }
  let landing: Awaited<ReturnType<typeof fetchGA4LandingReturns>> = [];
  try {
    landing = await fetchGA4LandingReturns(25, 40);
  } catch (err) {
    errors.push(`ga4 landing: ${err instanceof Error ? err.message : String(err)}`);
  }

  const kept = accounts + digest + watches;
  const visitors = ga4.mau;

  console.log('HEX ' + Buffer.from(JSON.stringify({
    days: DAYS,
    visitors,
    kept,
    keptPer1000Visitors: visitors ? Number(((kept / visitors) * 1000).toFixed(1)) : null,
    breakdown: { accounts, digest, watches },
    accountsPriorWindow: accountsPrior,
    totals: { accounts: accountsTotal, digest: digestTotal },
    // Sorted by return rate, not by size: the question is which entry points
    // produce people who come back, so a small page that works is the find.
    landingByReturnRate: [...landing].sort((a, b) => b.returnRatePct - a.returnRatePct).slice(0, 20),
    landingByVolume: landing.slice(0, 20),
    errors,
  })).toString('hex'));
}

main()
  .then(async () => { await prisma.$disconnect(); process.exit(0); })
  .catch(async (err) => { console.error(err); await prisma.$disconnect(); process.exit(1); });
