import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('=== Hadrian funding rounds (all) ===');
  const hadrian = await prisma.fundingRound.findMany({ where: { company: { name: { contains: 'Hadrian', mode: 'insensitive' } } }, include: { company: { select: { name: true, totalFunding: true, valuation: true } } } });
  console.log(JSON.stringify(hadrian, null, 1));

  console.log('\n=== K2 Space funding rounds (all) ===');
  const k2 = await prisma.fundingRound.findMany({ where: { company: { name: { contains: 'K2 Space', mode: 'insensitive' } } }, include: { company: { select: { name: true, totalFunding: true, valuation: true } } } });
  console.log(JSON.stringify(k2, null, 1));

  console.log('\n=== Investor: Bond, notable "formerly ICONIQ" check + a few more ===');
  const inv = await prisma.investor.findMany({ where: { name: { contains: 'Bond', mode: 'insensitive' } } });
  console.log(JSON.stringify(inv, null, 1));

  console.log('\n=== Investor updatedAt spread ===');
  const invAll = await prisma.investor.findMany({ select: { name: true, createdAt: true, updatedAt: true }, orderBy: { updatedAt: 'desc' }, take: 5 });
  console.log(JSON.stringify(invAll, null, 1));

  console.log('\n=== SpaceCompany old table - does it still exist / have rows? ===');
  try {
    const sc = await prisma.spaceCompany.count();
    console.log('SpaceCompany count:', sc);
    const sample = await prisma.spaceCompany.findMany({ take: 3, select: { name: true, updatedAt: true } });
    console.log(JSON.stringify(sample, null, 1));
  } catch (e) { console.log('err', (e as Error).message); }

  console.log('\n=== CompanyProfile totalFunding vs sum(FundingRound.amount) mismatches (sample) ===');
  const companies = await prisma.companyProfile.findMany({ where: { fundingRounds: { some: {} } }, include: { fundingRounds: { select: { amount: true } } }, take: 400 });
  let mismatches = 0;
  for (const c of companies) {
    const sum = c.fundingRounds.reduce((a, r) => a + (r.amount || 0), 0);
    if (c.totalFunding && Math.abs(sum - c.totalFunding) / c.totalFunding > 0.15) {
      mismatches++;
      if (mismatches <= 15) console.log(`${c.name}: totalFunding=${c.totalFunding} sum(rounds)=${sum}`);
    }
  }
  console.log('Total mismatches >15%:', mismatches, 'of', companies.length);

  console.log('\n=== Reports/ReportCard-like models search ===');
  const models = Object.keys(prisma).filter(k => !k.startsWith('_') && !k.startsWith('$'));
  console.log(models.filter(m => /report|score|brief|digest/i.test(m)));

  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
