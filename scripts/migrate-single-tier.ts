/**
 * One-time migration: collapse the retired 'enterprise' subscription tier into 'pro'.
 * Idempotent — safe to re-run.
 *
 * Run: npx tsx scripts/migrate-single-tier.ts
 */
import prisma from '../src/lib/db';

async function main() {
  const tierResult = await prisma.user.updateMany({
    where: { subscriptionTier: 'enterprise' },
    data: { subscriptionTier: 'pro' },
  });
  console.log(`subscriptionTier enterprise -> pro: ${tierResult.count} user(s)`);

  const trialResult = await prisma.user.updateMany({
    where: { trialTier: 'enterprise' },
    data: { trialTier: 'pro' },
  });
  console.log(`trialTier enterprise -> pro: ${trialResult.count} user(s)`);

  // Ad campaigns targeting the removed tier: retarget to pro
  const campaigns = await prisma.adCampaign.findMany({
    where: { targetTiers: { has: 'enterprise' } },
    select: { id: true, targetTiers: true },
  });
  for (const c of campaigns) {
    const next = Array.from(
      new Set(c.targetTiers.map((t) => (t === 'enterprise' ? 'pro' : t)))
    );
    await prisma.adCampaign.update({ where: { id: c.id }, data: { targetTiers: next } });
  }
  console.log(`ad campaigns retargeted: ${campaigns.length}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
