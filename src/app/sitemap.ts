import { MetadataRoute } from 'next';
import prisma from '@/lib/db';
import { BLOG_POSTS } from '@/lib/blog-content';
import { logger } from '@/lib/logger';

const BASE_URL = 'https://spacenexus.us';

/**
 * Generate sitemap segments for the sitemap index.
 * Next.js auto-creates /sitemap.xml as an index pointing to /sitemap/0.xml, /sitemap/1.xml, etc.
 */
export async function generateSitemaps() {
  return [{ id: 0 }, { id: 1 }, { id: 2 }, { id: 3 }];
}

export default async function sitemap({ id }: { id: number }): Promise<MetadataRoute.Sitemap> {
  switch (id) {
    case 0:
      return getStaticRoutes();
    case 1:
      return getCompanyRoutes();
    case 2:
      return getMarketplaceRoutes();
    case 3:
      return getContentRoutes();
    default:
      return [];
  }
}

// Segment 0: All static/module pages
function getStaticRoutes(): MetadataRoute.Sitemap {
  const routes = [
    // Homepage
    { url: BASE_URL, changeFrequency: 'daily' as const, priority: 1.0 },

    // Main modules
    { url: `${BASE_URL}/mission-control`, changeFrequency: 'hourly' as const, priority: 0.9 },
    { url: `${BASE_URL}/news`, changeFrequency: 'hourly' as const, priority: 0.9 },
    { url: `${BASE_URL}/market-intel`, changeFrequency: 'hourly' as const, priority: 0.9 },
    { url: `${BASE_URL}/satellites`, changeFrequency: 'hourly' as const, priority: 0.9 },
    { url: `${BASE_URL}/business-opportunities`, changeFrequency: 'daily' as const, priority: 0.8 },
    { url: `${BASE_URL}/mission-cost`, changeFrequency: 'daily' as const, priority: 0.8 },
    { url: `${BASE_URL}/compliance`, changeFrequency: 'daily' as const, priority: 0.8 },
    { url: `${BASE_URL}/solar-exploration`, changeFrequency: 'weekly' as const, priority: 0.8 },
    { url: `${BASE_URL}/space-talent`, changeFrequency: 'daily' as const, priority: 0.8 },
    { url: `${BASE_URL}/space-environment`, changeFrequency: 'hourly' as const, priority: 0.8 },

    // Sub-module pages
    { url: `${BASE_URL}/space-economy`, changeFrequency: 'daily' as const, priority: 0.7 },
    { url: `${BASE_URL}/space-capital`, changeFrequency: 'daily' as const, priority: 0.7 },
    { url: `${BASE_URL}/launch-vehicles`, changeFrequency: 'weekly' as const, priority: 0.7 },
    { url: `${BASE_URL}/launch-windows`, changeFrequency: 'daily' as const, priority: 0.7 },
    { url: `${BASE_URL}/constellations`, changeFrequency: 'weekly' as const, priority: 0.7 },
    { url: `${BASE_URL}/ground-stations`, changeFrequency: 'weekly' as const, priority: 0.7 },
    { url: `${BASE_URL}/space-stations`, changeFrequency: 'weekly' as const, priority: 0.7 },
    { url: `${BASE_URL}/cislunar`, changeFrequency: 'weekly' as const, priority: 0.7 },
    { url: `${BASE_URL}/mars-planner`, changeFrequency: 'weekly' as const, priority: 0.7 },
    { url: `${BASE_URL}/asteroid-watch`, changeFrequency: 'daily' as const, priority: 0.7 },
    { url: `${BASE_URL}/orbital-slots`, changeFrequency: 'daily' as const, priority: 0.7 },
    { url: `${BASE_URL}/spectrum`, changeFrequency: 'weekly' as const, priority: 0.7 },
    { url: `${BASE_URL}/patents`, changeFrequency: 'weekly' as const, priority: 0.7 },
    { url: `${BASE_URL}/space-manufacturing`, changeFrequency: 'weekly' as const, priority: 0.7 },
    { url: `${BASE_URL}/spaceports`, changeFrequency: 'weekly' as const, priority: 0.7 },
    { url: `${BASE_URL}/space-defense`, changeFrequency: 'weekly' as const, priority: 0.7 },
    { url: `${BASE_URL}/supply-chain`, changeFrequency: 'daily' as const, priority: 0.7 },
    { url: `${BASE_URL}/space-mining`, changeFrequency: 'weekly' as const, priority: 0.7 },
    { url: `${BASE_URL}/resource-exchange`, changeFrequency: 'daily' as const, priority: 0.7 },
    { url: `${BASE_URL}/space-insurance`, changeFrequency: 'weekly' as const, priority: 0.7 },
    { url: `${BASE_URL}/blueprints`, changeFrequency: 'weekly' as const, priority: 0.7 },
    { url: `${BASE_URL}/orbital-costs`, changeFrequency: 'weekly' as const, priority: 0.7 },
    { url: `${BASE_URL}/procurement`, changeFrequency: 'daily' as const, priority: 0.7 },
    { url: `${BASE_URL}/space-tourism`, changeFrequency: 'weekly' as const, priority: 0.7 },

    // Investor & Entrepreneur tools
    { url: `${BASE_URL}/investors`, changeFrequency: 'daily' as const, priority: 0.8 },
    { url: `${BASE_URL}/market-sizing`, changeFrequency: 'weekly' as const, priority: 0.7 },
    { url: `${BASE_URL}/funding-opportunities`, changeFrequency: 'daily' as const, priority: 0.7 },
    { url: `${BASE_URL}/funding-tracker`, changeFrequency: 'daily' as const, priority: 0.7 },
    { url: `${BASE_URL}/customer-discovery`, changeFrequency: 'weekly' as const, priority: 0.7 },
    { url: `${BASE_URL}/regulatory-risk`, changeFrequency: 'weekly' as const, priority: 0.7 },
    { url: `${BASE_URL}/business-models`, changeFrequency: 'weekly' as const, priority: 0.7 },
    { url: `${BASE_URL}/space-events`, changeFrequency: 'daily' as const, priority: 0.7 },
    { url: `${BASE_URL}/investment-thesis`, changeFrequency: 'weekly' as const, priority: 0.6 },
    { url: `${BASE_URL}/deal-rooms`, changeFrequency: 'weekly' as const, priority: 0.6 },

    // Company Intelligence directory
    { url: `${BASE_URL}/company-profiles`, changeFrequency: 'daily' as const, priority: 0.8 },

    // Blog index
    { url: `${BASE_URL}/blog`, changeFrequency: 'weekly' as const, priority: 0.7 },

    // City-specific landing pages
    { url: `${BASE_URL}/space-industry/houston`, changeFrequency: 'monthly' as const, priority: 0.6 },
    { url: `${BASE_URL}/space-industry/washington-dc`, changeFrequency: 'monthly' as const, priority: 0.6 },
    { url: `${BASE_URL}/space-industry/los-angeles`, changeFrequency: 'monthly' as const, priority: 0.6 },
    { url: `${BASE_URL}/space-industry/colorado-springs`, changeFrequency: 'monthly' as const, priority: 0.6 },
    { url: `${BASE_URL}/space-industry/cape-canaveral`, changeFrequency: 'monthly' as const, priority: 0.6 },
    { url: `${BASE_URL}/space-industry/huntsville`, changeFrequency: 'monthly' as const, priority: 0.6 },
    { url: `${BASE_URL}/space-industry/tucson`, changeFrequency: 'monthly' as const, priority: 0.6 },
    { url: `${BASE_URL}/space-industry/seattle`, changeFrequency: 'monthly' as const, priority: 0.6 },

    // Content and tools
    { url: `${BASE_URL}/blogs`, changeFrequency: 'daily' as const, priority: 0.6 },
    { url: `${BASE_URL}/launch`, changeFrequency: 'daily' as const, priority: 0.6 },
    { url: `${BASE_URL}/live`, changeFrequency: 'hourly' as const, priority: 0.6 },
    { url: `${BASE_URL}/ai-insights`, changeFrequency: 'daily' as const, priority: 0.6 },
    { url: `${BASE_URL}/search`, changeFrequency: 'weekly' as const, priority: 0.5 },
    { url: `${BASE_URL}/dashboard`, changeFrequency: 'weekly' as const, priority: 0.4 },
    { url: `${BASE_URL}/dashboard/builder`, changeFrequency: 'weekly' as const, priority: 0.4 },
    { url: `${BASE_URL}/alerts`, changeFrequency: 'daily' as const, priority: 0.5 },
    { url: `${BASE_URL}/my-watchlists`, changeFrequency: 'weekly' as const, priority: 0.4 },
    { url: `${BASE_URL}/provider-dashboard`, changeFrequency: 'weekly' as const, priority: 0.4 },

    // Guides
    { url: `${BASE_URL}/guide`, changeFrequency: 'monthly' as const, priority: 0.7 },
    { url: `${BASE_URL}/guide/space-industry`, changeFrequency: 'monthly' as const, priority: 0.5 },
    { url: `${BASE_URL}/guide/space-industry-market-size`, changeFrequency: 'monthly' as const, priority: 0.6 },
    { url: `${BASE_URL}/guide/how-satellite-tracking-works`, changeFrequency: 'monthly' as const, priority: 0.6 },
    { url: `${BASE_URL}/guide/itar-compliance-guide`, changeFrequency: 'monthly' as const, priority: 0.6 },
    { url: `${BASE_URL}/guide/space-launch-cost-comparison`, changeFrequency: 'monthly' as const, priority: 0.6 },
    { url: `${BASE_URL}/guide/commercial-space-economy`, changeFrequency: 'monthly' as const, priority: 0.6 },
    { url: `${BASE_URL}/guide/space-launch-schedule-2026`, changeFrequency: 'weekly' as const, priority: 0.7 },
    { url: `${BASE_URL}/guide/satellite-tracking-guide`, changeFrequency: 'monthly' as const, priority: 0.7 },
    { url: `${BASE_URL}/guide/space-business-opportunities`, changeFrequency: 'monthly' as const, priority: 0.7 },
    { url: `${BASE_URL}/guide/space-regulatory-compliance`, changeFrequency: 'monthly' as const, priority: 0.7 },
    { url: `${BASE_URL}/guide/space-economy-investment`, changeFrequency: 'monthly' as const, priority: 0.7 },

    // Learning Center
    { url: `${BASE_URL}/learn`, changeFrequency: 'monthly' as const, priority: 0.7 },
    { url: `${BASE_URL}/learn/satellite-launch-cost`, changeFrequency: 'monthly' as const, priority: 0.7 },
    { url: `${BASE_URL}/learn/space-industry-market-size`, changeFrequency: 'monthly' as const, priority: 0.7 },
    { url: `${BASE_URL}/learn/how-to-track-satellites`, changeFrequency: 'monthly' as const, priority: 0.7 },
    { url: `${BASE_URL}/learn/space-companies-to-watch`, changeFrequency: 'monthly' as const, priority: 0.7 },

    // Regulation explainers index
    { url: `${BASE_URL}/regulation-explainers`, changeFrequency: 'monthly' as const, priority: 0.7 },

    // Comparison pages
    { url: `${BASE_URL}/compare`, changeFrequency: 'monthly' as const, priority: 0.6 },
    { url: `${BASE_URL}/compare/bloomberg-terminal`, changeFrequency: 'monthly' as const, priority: 0.6 },
    { url: `${BASE_URL}/compare/quilty-analytics`, changeFrequency: 'monthly' as const, priority: 0.6 },
    { url: `${BASE_URL}/compare/payload-space`, changeFrequency: 'monthly' as const, priority: 0.6 },

    // Marketplace
    { url: `${BASE_URL}/marketplace`, changeFrequency: 'daily' as const, priority: 0.7 },
    { url: `${BASE_URL}/marketplace/search`, changeFrequency: 'daily' as const, priority: 0.6 },
    { url: `${BASE_URL}/marketplace/copilot`, changeFrequency: 'weekly' as const, priority: 0.6 },

    // Conversion pages
    { url: `${BASE_URL}/pricing`, changeFrequency: 'monthly' as const, priority: 0.5 },
    { url: `${BASE_URL}/developer`, changeFrequency: 'monthly' as const, priority: 0.5 },
    { url: `${BASE_URL}/advertise`, changeFrequency: 'monthly' as const, priority: 0.4 },
    { url: `${BASE_URL}/contact`, changeFrequency: 'monthly' as const, priority: 0.4 },
    { url: `${BASE_URL}/faq`, changeFrequency: 'monthly' as const, priority: 0.4 },
    { url: `${BASE_URL}/press`, changeFrequency: 'monthly' as const, priority: 0.4 },
    { url: `${BASE_URL}/account`, changeFrequency: 'monthly' as const, priority: 0.3 },

    // Legal pages
    { url: `${BASE_URL}/privacy`, changeFrequency: 'monthly' as const, priority: 0.3 },
    { url: `${BASE_URL}/terms`, changeFrequency: 'monthly' as const, priority: 0.3 },
    { url: `${BASE_URL}/cookies`, changeFrequency: 'monthly' as const, priority: 0.3 },

    // Auth pages
    { url: `${BASE_URL}/login`, changeFrequency: 'monthly' as const, priority: 0.3 },
    { url: `${BASE_URL}/register`, changeFrequency: 'monthly' as const, priority: 0.3 },
  ];

  return routes.map(route => ({
    ...route,
    lastModified: new Date(),
  }));
}

// Segment 1: Company profiles from database
async function getCompanyRoutes(): Promise<MetadataRoute.Sitemap> {
  try {
    const companyProfiles = await prisma.companyProfile.findMany({
      select: { slug: true, updatedAt: true },
    });

    return companyProfiles.map(profile => ({
      url: `${BASE_URL}/company-profiles/${profile.slug}`,
      lastModified: profile.updatedAt,
      changeFrequency: 'weekly' as const,
      priority: 0.6,
    }));
  } catch (error) {
    logger.error('Sitemap segment 1: Failed to fetch company profiles', {
      error: error instanceof Error ? error.message : String(error),
    });
    return [];
  }
}

// Segment 2: Marketplace listings from database
async function getMarketplaceRoutes(): Promise<MetadataRoute.Sitemap> {
  try {
    const serviceListings = await prisma.serviceListing.findMany({
      where: { status: 'active' },
      select: { slug: true, updatedAt: true },
    });

    return serviceListings.map(listing => ({
      url: `${BASE_URL}/marketplace/listings/${listing.slug}`,
      lastModified: listing.updatedAt,
      changeFrequency: 'weekly' as const,
      priority: 0.5,
    }));
  } catch (error) {
    logger.error('Sitemap segment 2: Failed to fetch marketplace listings', {
      error: error instanceof Error ? error.message : String(error),
    });
    return [];
  }
}

// Segment 3: Blog posts + AI insights + regulation explainers
async function getContentRoutes(): Promise<MetadataRoute.Sitemap> {
  // Static blog posts
  const blogRoutes: MetadataRoute.Sitemap = BLOG_POSTS.map(post => ({
    url: `${BASE_URL}/blog/${post.slug}`,
    lastModified: post.updatedAt ? new Date(post.updatedAt) : new Date(post.publishedAt),
    changeFrequency: 'monthly' as const,
    priority: 0.6,
  }));

  // AI insights from database
  let insightRoutes: MetadataRoute.Sitemap = [];
  let explainerRoutes: MetadataRoute.Sitemap = [];

  try {
    const [insights, explainers] = await Promise.all([
      prisma.aIInsight.findMany({
        select: { slug: true, generatedAt: true },
        orderBy: { generatedAt: 'desc' },
      }),
      prisma.regulationExplainer.findMany({
        select: { slug: true, updatedAt: true },
        orderBy: { updatedAt: 'desc' },
      }),
    ]);

    insightRoutes = insights.map(insight => ({
      url: `${BASE_URL}/ai-insights/${insight.slug}`,
      lastModified: insight.generatedAt,
      changeFrequency: 'weekly' as const,
      priority: 0.5,
    }));

    explainerRoutes = explainers.map(explainer => ({
      url: `${BASE_URL}/regulation-explainers/${explainer.slug}`,
      lastModified: explainer.updatedAt,
      changeFrequency: 'monthly' as const,
      priority: 0.5,
    }));
  } catch (error) {
    logger.error('Sitemap segment 3: Failed to fetch content routes', {
      error: error instanceof Error ? error.message : String(error),
    });
  }

  return [...blogRoutes, ...insightRoutes, ...explainerRoutes];
}
