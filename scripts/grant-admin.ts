import prisma from '@/lib/db';

async function main() {
  const email = process.argv[2];

  if (!email) {
    console.error('Usage: npx tsx scripts/grant-admin.ts <email>');
    process.exit(1);
  }

  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    console.error(`No user found with email: ${email}`);
    process.exit(1);
  }

  if (user.isAdmin) {
    console.log(`User ${email} is already an admin.`);
    process.exit(0);
  }

  await prisma.user.update({
    where: { email },
    data: { isAdmin: true },
  });

  console.log(`Admin access granted to ${email}`);
}

main()
  .catch((err) => {
    console.error('Error:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
