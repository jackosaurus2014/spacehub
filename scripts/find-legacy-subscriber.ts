/** Locate the legacy Enterprise subscriber migrated to pro (read-only). */
import prisma from '../src/lib/db';

async function main() {
  const users = await prisma.user.findMany({
    where: { subscriptionTier: 'pro', stripeSubscriptionId: { not: null } },
    select: {
      id: true,
      email: true,
      name: true,
      subscriptionTier: true,
      subscriptionStatus: true,
      subscriptionStartDate: true,
      stripeCustomerId: true,
      stripeSubscriptionId: true,
    },
  });
  console.log(JSON.stringify(users, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
