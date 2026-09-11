/**
 * Reachout tools for `railway ssh` (2026-09-10). Output is hex-encoded
 * where it matters because the ssh pipe drops the letter "s" from plain
 * text (observed 9/10; decode with Buffer.from(hex, 'hex')).
 *
 *   npx tsx scripts/reachout-tools.ts show <contactSubmissionId>
 *   npx tsx scripts/reachout-tools.ts close <contactSubmissionId> [status]   (default: responded)
 *   npx tsx scripts/reachout-tools.ts user <email>                            (hex JSON: id, name, tier, stripe ids)
 *   npx tsx scripts/reachout-tools.ts emailtoken <email>                      (hex JSON: latest unused EmailChangeToken — QA of the confirm step)
 */
import prisma from '../src/lib/db';

const hex = (v: unknown) => Buffer.from(JSON.stringify(v)).toString('hex');

async function main() {
  const [cmd, arg, arg2] = process.argv.slice(2);
  if (cmd === 'show') {
    const row = await prisma.contactSubmission.findFirst({ where: { id: { startsWith: arg } }, select: { id: true, name: true, email: true, subject: true, status: true, createdAt: true, message: true } });
    console.log('HEX', hex(row));
  } else if (cmd === 'close') {
    const status = arg2 || 'responded';
    const res = await prisma.contactSubmission.updateMany({ where: { id: { startsWith: arg } }, data: { status } });
    console.log('HEX', hex({ updated: res.count, status }));
  } else if (cmd === 'user') {
    const u = await prisma.user.findFirst({ where: { email: { equals: arg, mode: 'insensitive' } }, select: { id: true, email: true, name: true, createdAt: true, subscriptionTier: true, stripeCustomerId: true, stripeSubscriptionId: true, subscriptionStatus: true } as never });
    console.log('HEX', hex(u));
  } else if (cmd === 'emailtoken') {
    const u = await prisma.user.findFirst({ where: { email: { equals: arg, mode: 'insensitive' } }, select: { id: true } });
    const t = u ? await prisma.emailChangeToken.findFirst({ where: { userId: u.id, used: false }, orderBy: { createdAt: 'desc' }, select: { token: true, newEmail: true, expiresAt: true } }) : null;
    console.log('HEX', hex(t));
  } else {
    console.log('usage: show <id> | close <id> [status] | user <email>');
  }
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
