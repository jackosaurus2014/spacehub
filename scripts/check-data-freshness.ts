import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const now = new Date();
  console.log(`Current time (UTC): ${now.toISOString()}\n`);

  // Check latest blog posts
  const latestBlogs = await prisma.blogPost.findMany({
    orderBy: { publishedAt: 'desc' },
    take: 5,
    select: { title: true, publishedAt: true, fetchedAt: true, source: { select: { name: true } } },
  });
  console.log('=== LATEST BLOG POSTS ===');
  for (const b of latestBlogs) {
    const pubAge = Math.round((now.getTime() - new Date(b.publishedAt).getTime()) / (1000 * 60 * 60));
    const fetchAge = b.fetchedAt ? Math.round((now.getTime() - new Date(b.fetchedAt).getTime()) / (1000 * 60 * 60)) : 'N/A';
    console.log(`  [${pubAge}h ago pub, ${fetchAge}h ago fetched] ${b.title?.slice(0, 60)} (${b.source?.name || 'unknown'})`);
  }

  // Check latest news articles
  const latestNews = await prisma.newsArticle.findMany({
    orderBy: { publishedAt: 'desc' },
    take: 5,
    select: { title: true, publishedAt: true, fetchedAt: true, source: true },
  });
  console.log('\n=== LATEST NEWS ARTICLES ===');
  for (const n of latestNews) {
    const pubAge = Math.round((now.getTime() - new Date(n.publishedAt).getTime()) / (1000 * 60 * 60));
    const fetchAge = n.fetchedAt ? Math.round((now.getTime() - new Date(n.fetchedAt).getTime()) / (1000 * 60 * 60)) : 'N/A';
    console.log(`  [${pubAge}h ago pub, ${fetchAge}h ago fetched] ${n.title?.slice(0, 60)} (${n.source})`);
  }

  // Check latest AI insights
  const latestInsights = await prisma.aIInsight.findMany({
    orderBy: { generatedAt: 'desc' },
    take: 5,
    select: { title: true, generatedAt: true, category: true },
  });
  console.log('\n=== LATEST AI INSIGHTS ===');
  if (latestInsights.length === 0) {
    console.log('  No AI insights found in database');
  }
  for (const i of latestInsights) {
    const age = Math.round((now.getTime() - new Date(i.generatedAt).getTime()) / (1000 * 60 * 60));
    console.log(`  [${age}h ago] [${i.category}] ${i.title?.slice(0, 70)}`);
  }

  // Check total counts
  const totalBlogs = await prisma.blogPost.count();
  const totalNews = await prisma.newsArticle.count();
  const totalInsights = await prisma.aIInsight.count();

  // Check blogs in last 48h and news in last 36h (AI insights windows)
  const thirtysSixHoursAgo = new Date(Date.now() - 36 * 60 * 60 * 1000);
  const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);
  const recentNews = await prisma.newsArticle.count({ where: { publishedAt: { gte: thirtysSixHoursAgo } } });
  const recentBlogs = await prisma.blogPost.count({ where: { publishedAt: { gte: fortyEightHoursAgo } } });

  console.log('\n=== SUMMARY ===');
  console.log(`  Total blogs: ${totalBlogs}`);
  console.log(`  Total news:  ${totalNews}`);
  console.log(`  Total AI insights: ${totalInsights}`);
  console.log(`  Blogs in last 48h (AI window): ${recentBlogs}`);
  console.log(`  News in last 36h (AI window):  ${recentNews}`);

  // Check blog sources count
  const totalSources = await prisma.blogSource.count();
  const activeSources = await prisma.blogSource.count({ where: { isActive: true } });
  console.log(`  Blog sources: ${activeSources} active / ${totalSources} total`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
