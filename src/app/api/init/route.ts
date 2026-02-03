import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { fetchSpaceflightNews } from '@/lib/news-fetcher';
import { fetchLaunchLibraryEvents } from '@/lib/events-fetcher';
import { initializeBlogSources, fetchBlogPosts } from '@/lib/blogs-fetcher';
import { initializeCompanies } from '@/lib/companies-data';
import { initializeResources } from '@/lib/resources-data';
import { initializeOpportunities } from '@/lib/opportunities-data';

export const dynamic = 'force-dynamic';

export async function POST() {
  const results: Record<string, string> = {};

  try {
    // Check and initialize news
    const newsCount = await prisma.newsArticle.count();
    if (newsCount === 0) {
      const count = await fetchSpaceflightNews();
      results.news = `Fetched ${count} articles`;
    } else {
      results.news = `Already has ${newsCount} articles`;
    }

    // Check and initialize events
    const eventsCount = await prisma.spaceEvent.count();
    if (eventsCount === 0) {
      const count = await fetchLaunchLibraryEvents();
      results.events = `Fetched ${count} events`;
    } else {
      results.events = `Already has ${eventsCount} events`;
    }

    // Check and initialize blogs
    const blogsCount = await prisma.blogPost.count();
    if (blogsCount === 0) {
      await initializeBlogSources();
      const count = await fetchBlogPosts();
      results.blogs = `Fetched ${count} blog posts`;
    } else {
      results.blogs = `Already has ${blogsCount} blog posts`;
    }

    // Check and initialize companies
    const companiesCount = await prisma.spaceCompany.count();
    if (companiesCount === 0) {
      const count = await initializeCompanies();
      results.companies = `Initialized ${count} companies`;
    } else {
      results.companies = `Already has ${companiesCount} companies`;
    }

    // Check and initialize resources
    const resourcesCount = await prisma.spaceResource.count();
    if (resourcesCount === 0) {
      const count = await initializeResources();
      results.resources = `Initialized ${count} resources`;
    } else {
      results.resources = `Already has ${resourcesCount} resources`;
    }

    // Check and initialize opportunities
    const opportunitiesCount = await prisma.businessOpportunity.count();
    if (opportunitiesCount === 0) {
      const count = await initializeOpportunities();
      results.opportunities = `Initialized ${count} opportunities`;
    } else {
      results.opportunities = `Already has ${opportunitiesCount} opportunities`;
    }

    return NextResponse.json({
      success: true,
      message: 'Initialization complete',
      results,
    });
  } catch (error) {
    console.error('Initialization error:', error);
    return NextResponse.json(
      { success: false, error: String(error), results },
      { status: 500 }
    );
  }
}

export async function GET() {
  // Check current data status
  try {
    const [news, events, blogs, companies, resources, opportunities] = await Promise.all([
      prisma.newsArticle.count(),
      prisma.spaceEvent.count(),
      prisma.blogPost.count(),
      prisma.spaceCompany.count(),
      prisma.spaceResource.count(),
      prisma.businessOpportunity.count(),
    ]);

    const needsInit = news === 0 || events === 0 || companies === 0;

    return NextResponse.json({
      initialized: !needsInit,
      counts: { news, events, blogs, companies, resources, opportunities },
    });
  } catch (error) {
    return NextResponse.json({ initialized: false, error: String(error) });
  }
}
