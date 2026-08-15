import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('=== CompanyProfile count & sample (SpaceX, Rocket Lab, Blue Origin) ===');
  const names = ['SpaceX', 'Rocket Lab', 'Blue Origin', 'Firefly', 'Voyager', 'Maxar', 'Vantor', 'Lanteris'];
  for (const n of names) {
    const rows = await prisma.companyProfile.findMany({
      where: { name: { contains: n, mode: 'insensitive' } },
      select: { slug: true, name: true, ticker: true, exchange: true, isPublic: true, marketCap: true, stockPrice: true, valuation: true, totalFunding: true, lastFundingRound: true, lastFundingDate: true, employeeCount: true, status: true, lastVerified: true, updatedAt: true },
    });
    console.log(`-- ${n} --`, JSON.stringify(rows, null, 1));
  }

  console.log('\n=== CompanyProfile totals ===');
  const total = await prisma.companyProfile.count();
  const pub = await prisma.companyProfile.count({ where: { isPublic: true } });
  console.log({ total, pub });

  console.log('\n=== Investor sample (10) ===');
  const investors = await prisma.investor.findMany({ take: 10, orderBy: { createdAt: 'desc' }, select: { name: true, type: true, headquarters: true, sectorFocus: true, investmentStage: true, notableDeals: true, portfolioCount: true, aum: true, fundSize: true, createdAt: true } });
  console.log(JSON.stringify(investors, null, 1));
  const investorCount = await prisma.investor.count();
  console.log('Investor total:', investorCount);

  console.log('\n=== FundingRound recent 10 ===');
  const rounds = await prisma.fundingRound.findMany({ take: 10, orderBy: { date: 'desc' }, select: { date: true, roundType: true, amount: true, company: { select: { name: true } } } });
  console.log(JSON.stringify(rounds, null, 1));
  const roundCount = await prisma.fundingRound.count();
  console.log('FundingRound total:', roundCount);

  console.log('\n=== FundingOpportunity recent 10 ===');
  const fo = await prisma.fundingOpportunity.findMany({ take: 10, orderBy: { createdAt: 'desc' } });
  console.log(JSON.stringify(fo, null, 1));
  const foCount = await prisma.fundingOpportunity.count();
  console.log('FundingOpportunity total:', foCount);

  console.log('\n=== WeeklyIntelligenceBrief recent 3 ===');
  const wib = await prisma.weeklyIntelligenceBrief.findMany({ take: 3, orderBy: { weekStart: 'desc' }, select: { weekStart: true, weekEnd: true, createdAt: true } });
  console.log(JSON.stringify(wib, null, 1));

  console.log('\n=== PublishedBrief recent 5 ===');
  const pb = await prisma.publishedBrief.findMany({ take: 5, orderBy: { createdAt: 'desc' } });
  console.log(JSON.stringify(pb, null, 1));

  console.log('\n=== PublishedCorpReport recent 5 ===');
  try {
    const pcr = await (prisma as any).publishedCorpReport.findMany({ take: 5, orderBy: { createdAt: 'desc' } });
    console.log(JSON.stringify(pcr, null, 1));
  } catch (e) { console.log('err', (e as Error).message); }

  console.log('\n=== CompanyScore recent 5 (report cards) ===');
  try {
    const cs = await (prisma as any).companyScore.findMany({ take: 5, orderBy: { createdAt: 'desc' }, include: { company: { select: { name: true } } } });
    console.log(JSON.stringify(cs, null, 1));
  } catch (e) { console.log('err', (e as Error).message); }

  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
