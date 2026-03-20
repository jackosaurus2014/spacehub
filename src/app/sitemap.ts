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
    { url: `${BASE_URL}/space-law`, changeFrequency: 'weekly' as const, priority: 0.8 },
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
    { url: `${BASE_URL}/mission-pipeline`, changeFrequency: 'weekly' as const, priority: 0.7 },
    { url: `${BASE_URL}/mission-stats`, changeFrequency: 'weekly' as const, priority: 0.7 },
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
    { url: `${BASE_URL}/investment-tracker`, changeFrequency: 'weekly' as const, priority: 0.7 },
    { url: `${BASE_URL}/customer-discovery`, changeFrequency: 'weekly' as const, priority: 0.7 },
    { url: `${BASE_URL}/regulatory-risk`, changeFrequency: 'weekly' as const, priority: 0.7 },
    { url: `${BASE_URL}/business-models`, changeFrequency: 'weekly' as const, priority: 0.7 },
    { url: `${BASE_URL}/space-events`, changeFrequency: 'daily' as const, priority: 0.7 },
    { url: `${BASE_URL}/investment-thesis`, changeFrequency: 'weekly' as const, priority: 0.6 },
    { url: `${BASE_URL}/deal-rooms`, changeFrequency: 'weekly' as const, priority: 0.6 },

    // Company Intelligence directory
    { url: `${BASE_URL}/company-profiles`, changeFrequency: 'daily' as const, priority: 0.8 },
    { url: `${BASE_URL}/company-profiles/sponsor`, changeFrequency: 'monthly' as const, priority: 0.5 },

    // Blog index
    { url: `${BASE_URL}/blog`, changeFrequency: 'weekly' as const, priority: 0.7 },
    { url: `${BASE_URL}/blog/topics`, changeFrequency: 'weekly' as const, priority: 0.6 },

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
    { url: `${BASE_URL}/alerts`, changeFrequency: 'daily' as const, priority: 0.5 },

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
    { url: `${BASE_URL}/guide/space-mining-guide`, changeFrequency: 'monthly' as const, priority: 0.7 },
    { url: `${BASE_URL}/guide/space-companies-directory`, changeFrequency: 'monthly' as const, priority: 0.7 },
    { url: `${BASE_URL}/guide/satellite-companies`, changeFrequency: 'monthly' as const, priority: 0.7 },

    // Learning Center
    { url: `${BASE_URL}/learn`, changeFrequency: 'monthly' as const, priority: 0.7 },
    { url: `${BASE_URL}/learn/satellite-launch-cost`, changeFrequency: 'monthly' as const, priority: 0.7 },
    { url: `${BASE_URL}/learn/space-industry-market-size`, changeFrequency: 'monthly' as const, priority: 0.7 },
    { url: `${BASE_URL}/learn/how-to-track-satellites`, changeFrequency: 'monthly' as const, priority: 0.7 },
    { url: `${BASE_URL}/learn/space-companies-to-watch`, changeFrequency: 'monthly' as const, priority: 0.7 },
    { url: `${BASE_URL}/learn/space-industry`, changeFrequency: 'monthly' as const, priority: 0.7 },

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
    { url: `${BASE_URL}/marketplace/rfq/new`, changeFrequency: 'monthly' as const, priority: 0.5 },

    // Features directory
    { url: `${BASE_URL}/features`, changeFrequency: 'weekly' as const, priority: 0.8 },

    // Conversion pages
    { url: `${BASE_URL}/pricing`, changeFrequency: 'monthly' as const, priority: 0.5 },
    { url: `${BASE_URL}/developer`, changeFrequency: 'monthly' as const, priority: 0.5 },
    { url: `${BASE_URL}/advertise`, changeFrequency: 'monthly' as const, priority: 0.4 },
    { url: `${BASE_URL}/satellite-2026`, changeFrequency: 'weekly' as const, priority: 0.6 },
    { url: `${BASE_URL}/contact`, changeFrequency: 'monthly' as const, priority: 0.4 },
    { url: `${BASE_URL}/faq`, changeFrequency: 'monthly' as const, priority: 0.4 },
    { url: `${BASE_URL}/press`, changeFrequency: 'monthly' as const, priority: 0.4 },
    { url: `${BASE_URL}/media-kit`, changeFrequency: 'monthly' as const, priority: 0.4 },

    // Legal pages
    { url: `${BASE_URL}/privacy`, changeFrequency: 'monthly' as const, priority: 0.3 },
    { url: `${BASE_URL}/terms`, changeFrequency: 'monthly' as const, priority: 0.3 },
    { url: `${BASE_URL}/cookies`, changeFrequency: 'monthly' as const, priority: 0.3 },
    { url: `${BASE_URL}/data-safety`, changeFrequency: 'monthly' as const, priority: 0.4 },
    { url: `${BASE_URL}/legal/dmca`, changeFrequency: 'monthly' as const, priority: 0.3 },

    // App download
    { url: `${BASE_URL}/app`, changeFrequency: 'monthly' as const, priority: 0.6 },

    // Platform status
    { url: `${BASE_URL}/status`, changeFrequency: 'daily' as const, priority: 0.4 },
    { url: `${BASE_URL}/roadmap`, changeFrequency: 'monthly' as const, priority: 0.5 },
    { url: `${BASE_URL}/integrations`, changeFrequency: 'monthly' as const, priority: 0.5 },
    { url: `${BASE_URL}/testimonials`, changeFrequency: 'monthly' as const, priority: 0.5 },
    { url: `${BASE_URL}/discover`, changeFrequency: 'weekly' as const, priority: 0.7 },
    { url: `${BASE_URL}/this-day-in-space`, changeFrequency: 'daily' as const, priority: 0.6 },
    { url: `${BASE_URL}/beginners`, changeFrequency: 'monthly' as const, priority: 0.6 },
    { url: `${BASE_URL}/night-sky-guide`, changeFrequency: 'monthly' as const, priority: 0.6 },
    { url: `${BASE_URL}/space-quiz`, changeFrequency: 'monthly' as const, priority: 0.5 },
    { url: `${BASE_URL}/vs`, changeFrequency: 'monthly' as const, priority: 0.6 },
    { url: `${BASE_URL}/launch-alerts`, changeFrequency: 'monthly' as const, priority: 0.6 },
    { url: `${BASE_URL}/space-tycoon`, changeFrequency: 'monthly' as const, priority: 0.7 },

    // Community
    { url: `${BASE_URL}/community`, changeFrequency: 'weekly' as const, priority: 0.7 },
    { url: `${BASE_URL}/community/forums`, changeFrequency: 'weekly' as const, priority: 0.7 },
    { url: `${BASE_URL}/community/directory`, changeFrequency: 'weekly' as const, priority: 0.6 },
    { url: `${BASE_URL}/community/guidelines`, changeFrequency: 'monthly' as const, priority: 0.3 },

    // Additional content pages
    { url: `${BASE_URL}/contract-awards`, changeFrequency: 'weekly' as const, priority: 0.7 },
    { url: `${BASE_URL}/deal-flow`, changeFrequency: 'weekly' as const, priority: 0.7 },
    { url: `${BASE_URL}/ecosystem-map`, changeFrequency: 'weekly' as const, priority: 0.6 },
    { url: `${BASE_URL}/executive-moves`, changeFrequency: 'weekly' as const, priority: 0.7 },
    { url: `${BASE_URL}/government-budgets`, changeFrequency: 'monthly' as const, priority: 0.6 },
    { url: `${BASE_URL}/intelligence-brief`, changeFrequency: 'weekly' as const, priority: 0.8 },
    { url: `${BASE_URL}/market-map`, changeFrequency: 'monthly' as const, priority: 0.6 },
    { url: `${BASE_URL}/regulatory-calendar`, changeFrequency: 'weekly' as const, priority: 0.7 },
    { url: `${BASE_URL}/reports`, changeFrequency: 'weekly' as const, priority: 0.6 },
    { url: `${BASE_URL}/reports/space-economy-2026`, changeFrequency: 'monthly' as const, priority: 0.7 },
    { url: `${BASE_URL}/resources`, changeFrequency: 'monthly' as const, priority: 0.6 },
    { url: `${BASE_URL}/salary-benchmarks`, changeFrequency: 'weekly' as const, priority: 0.6 },
    { url: `${BASE_URL}/deals`, changeFrequency: 'weekly' as const, priority: 0.6 },
    { url: `${BASE_URL}/space-score`, changeFrequency: 'weekly' as const, priority: 0.5 },
    { url: `${BASE_URL}/supply-chain-map`, changeFrequency: 'weekly' as const, priority: 0.5 },
    { url: `${BASE_URL}/launch-cost-calculator`, changeFrequency: 'weekly' as const, priority: 0.5 },
    { url: `${BASE_URL}/news-digest`, changeFrequency: 'daily' as const, priority: 0.7 },
    { url: `${BASE_URL}/startup-tracker`, changeFrequency: 'weekly' as const, priority: 0.7 },
    { url: `${BASE_URL}/report-cards`, changeFrequency: 'monthly' as const, priority: 0.7 },
    { url: `${BASE_URL}/tech-readiness`, changeFrequency: 'monthly' as const, priority: 0.6 },
    { url: `${BASE_URL}/regulations`, changeFrequency: 'monthly' as const, priority: 0.6 },
    { url: `${BASE_URL}/industry-trends`, changeFrequency: 'weekly' as const, priority: 0.7 },
    { url: `${BASE_URL}/orbit-guide`, changeFrequency: 'monthly' as const, priority: 0.6 },
    { url: `${BASE_URL}/career-guide`, changeFrequency: 'monthly' as const, priority: 0.7 },
    { url: `${BASE_URL}/acronyms`, changeFrequency: 'monthly' as const, priority: 0.6 },
    { url: `${BASE_URL}/space-weather`, changeFrequency: 'daily' as const, priority: 0.7 },
    { url: `${BASE_URL}/compare/satellite-buses`, changeFrequency: 'monthly' as const, priority: 0.6 },
    { url: `${BASE_URL}/propulsion-database`, changeFrequency: 'monthly' as const, priority: 0.6 },
    { url: `${BASE_URL}/space-agencies`, changeFrequency: 'monthly' as const, priority: 0.6 },
    { url: `${BASE_URL}/launch-sites`, changeFrequency: 'monthly' as const, priority: 0.6 },
    { url: `${BASE_URL}/frequency-bands`, changeFrequency: 'monthly' as const, priority: 0.6 },
    { url: `${BASE_URL}/materials-database`, changeFrequency: 'monthly' as const, priority: 0.6 },
    { url: `${BASE_URL}/podcasts`, changeFrequency: 'weekly' as const, priority: 0.6 },
    { url: `${BASE_URL}/earth-events`, changeFrequency: 'daily' as const, priority: 0.7 },
    { url: `${BASE_URL}/debris-remediation`, changeFrequency: 'weekly' as const, priority: 0.6 },
    { url: `${BASE_URL}/isru`, changeFrequency: 'weekly' as const, priority: 0.6 },
    { url: `${BASE_URL}/space-comms`, changeFrequency: 'weekly' as const, priority: 0.6 },
    { url: `${BASE_URL}/constellation-designer`, changeFrequency: 'weekly' as const, priority: 0.6 },
    { url: `${BASE_URL}/unit-economics`, changeFrequency: 'weekly' as const, priority: 0.6 },
    { url: `${BASE_URL}/orbital-calculator`, changeFrequency: 'weekly' as const, priority: 0.6 },
    // reading-list removed — disallowed in robots.txt
    { url: `${BASE_URL}/debris-tracker`, changeFrequency: 'daily' as const, priority: 0.7 },
    { url: `${BASE_URL}/glossary`, changeFrequency: 'monthly' as const, priority: 0.6 },
    { url: `${BASE_URL}/timeline`, changeFrequency: 'monthly' as const, priority: 0.6 },
    { url: `${BASE_URL}/tools`, changeFrequency: 'monthly' as const, priority: 0.6 },
    { url: `${BASE_URL}/company-research`, changeFrequency: 'weekly' as const, priority: 0.6 },
    { url: `${BASE_URL}/link-budget-calculator`, changeFrequency: 'monthly' as const, priority: 0.5 },
    { url: `${BASE_URL}/power-budget-calculator`, changeFrequency: 'monthly' as const, priority: 0.5 },
    { url: `${BASE_URL}/imagery-providers`, changeFrequency: 'monthly' as const, priority: 0.5 },

    // Wave 48 pages
    { url: `${BASE_URL}/news-aggregator`, changeFrequency: 'hourly' as const, priority: 0.7 },
    { url: `${BASE_URL}/jobs`, changeFrequency: 'daily' as const, priority: 0.7 },
    { url: `${BASE_URL}/portfolio-tracker`, changeFrequency: 'daily' as const, priority: 0.7 },
    { url: `${BASE_URL}/mission-simulator`, changeFrequency: 'weekly' as const, priority: 0.7 },

    // Wave 49 pages
    { url: `${BASE_URL}/radiation-calculator`, changeFrequency: 'weekly' as const, priority: 0.6 },
    { url: `${BASE_URL}/launch-manifest`, changeFrequency: 'daily' as const, priority: 0.7 },
    { url: `${BASE_URL}/frequency-database`, changeFrequency: 'weekly' as const, priority: 0.6 },
    { url: `${BASE_URL}/supply-chain-risk`, changeFrequency: 'daily' as const, priority: 0.7 },

    // Wave 50 pages
    { url: `${BASE_URL}/standards-reference`, changeFrequency: 'weekly' as const, priority: 0.6 },
    { url: `${BASE_URL}/thermal-calculator`, changeFrequency: 'weekly' as const, priority: 0.6 },
    { url: `${BASE_URL}/ground-station-directory`, changeFrequency: 'weekly' as const, priority: 0.6 },
    { url: `${BASE_URL}/clean-room-reference`, changeFrequency: 'monthly' as const, priority: 0.6 },

    // Wave 51 pages
    { url: `${BASE_URL}/launch-economics`, changeFrequency: 'weekly' as const, priority: 0.7 },
    { url: `${BASE_URL}/funding-rounds`, changeFrequency: 'daily' as const, priority: 0.7 },
    { url: `${BASE_URL}/debris-catalog`, changeFrequency: 'daily' as const, priority: 0.7 },
    { url: `${BASE_URL}/education-pathways`, changeFrequency: 'weekly' as const, priority: 0.6 },

    // Wave 52 pages
    { url: `${BASE_URL}/sustainability-scorecard`, changeFrequency: 'weekly' as const, priority: 0.7 },
    { url: `${BASE_URL}/ma-tracker`, changeFrequency: 'daily' as const, priority: 0.7 },
    { url: `${BASE_URL}/satellite-bus-comparison`, changeFrequency: 'weekly' as const, priority: 0.6 },
    { url: `${BASE_URL}/rf-spectrum`, changeFrequency: 'weekly' as const, priority: 0.6 },

    // Wave 53 pages
    { url: `${BASE_URL}/propulsion-comparison`, changeFrequency: 'weekly' as const, priority: 0.6 },
    { url: `${BASE_URL}/space-edge-computing`, changeFrequency: 'weekly' as const, priority: 0.6 },
    { url: `${BASE_URL}/conferences`, changeFrequency: 'weekly' as const, priority: 0.7 },
    { url: `${BASE_URL}/newsletters-directory`, changeFrequency: 'weekly' as const, priority: 0.6 },

    // Wave 54 pages
    { url: `${BASE_URL}/market-segments`, changeFrequency: 'weekly' as const, priority: 0.7 },
    { url: `${BASE_URL}/patent-landscape`, changeFrequency: 'weekly' as const, priority: 0.6 },
    { url: `${BASE_URL}/workforce-analytics`, changeFrequency: 'weekly' as const, priority: 0.7 },

    // Missing public pages
    { url: `${BASE_URL}/mission-heritage`, changeFrequency: 'monthly' as const, priority: 0.6 },
    { url: `${BASE_URL}/regulatory-tracker`, changeFrequency: 'weekly' as const, priority: 0.7 },
    { url: `${BASE_URL}/space-investors`, changeFrequency: 'weekly' as const, priority: 0.7 },

    // Widgets, Newsletter Archive, Why SpaceNexus
    { url: `${BASE_URL}/widgets`, changeFrequency: 'weekly' as const, priority: 0.6 },
    { url: `${BASE_URL}/newsletter-archive`, changeFrequency: 'weekly' as const, priority: 0.6 },
    { url: `${BASE_URL}/why-spacenexus`, changeFrequency: 'monthly' as const, priority: 0.7 },

    // About & Dashboard
    { url: `${BASE_URL}/about`, changeFrequency: 'monthly' as const, priority: 0.5 },
    { url: `${BASE_URL}/dashboard`, changeFrequency: 'daily' as const, priority: 0.6 },

    // Developer pages
    { url: `${BASE_URL}/developer/docs`, changeFrequency: 'monthly' as const, priority: 0.5 },
    { url: `${BASE_URL}/developer/explorer`, changeFrequency: 'monthly' as const, priority: 0.4 },
    { url: `${BASE_URL}/api-access`, changeFrequency: 'monthly' as const, priority: 0.7 },

    // Procurement
    { url: `${BASE_URL}/procurement/awards`, changeFrequency: 'weekly' as const, priority: 0.6 },

    // Additional comparison pages
    { url: `${BASE_URL}/compare/satellites`, changeFrequency: 'monthly' as const, priority: 0.6 },
    { url: `${BASE_URL}/compare/companies`, changeFrequency: 'monthly' as const, priority: 0.6 },
    { url: `${BASE_URL}/compare/launch-vehicles`, changeFrequency: 'monthly' as const, priority: 0.6 },

    // Wave 70 pages
    { url: `${BASE_URL}/satellite-tracker`, changeFrequency: 'daily' as const, priority: 0.8 },

    // Wave 71 pages (SEO landing pages, content)
    { url: `${BASE_URL}/solutions`, changeFrequency: 'monthly' as const, priority: 0.8 },
    { url: `${BASE_URL}/solutions/investors`, changeFrequency: 'monthly' as const, priority: 0.8 },
    { url: `${BASE_URL}/solutions/analysts`, changeFrequency: 'monthly' as const, priority: 0.8 },
    { url: `${BASE_URL}/solutions/engineers`, changeFrequency: 'monthly' as const, priority: 0.8 },
    { url: `${BASE_URL}/solutions/executives`, changeFrequency: 'monthly' as const, priority: 0.8 },
    { url: `${BASE_URL}/use-cases`, changeFrequency: 'monthly' as const, priority: 0.7 },
    { url: `${BASE_URL}/enterprise`, changeFrequency: 'monthly' as const, priority: 0.8 },
    { url: `${BASE_URL}/security`, changeFrequency: 'monthly' as const, priority: 0.6 },
    { url: `${BASE_URL}/report/state-of-space-2026`, changeFrequency: 'monthly' as const, priority: 0.7 },
    { url: `${BASE_URL}/case-studies`, changeFrequency: 'monthly' as const, priority: 0.7 },
    { url: `${BASE_URL}/book-demo`, changeFrequency: 'monthly' as const, priority: 0.6 },
    { url: `${BASE_URL}/getting-started`, changeFrequency: 'monthly' as const, priority: 0.7 },

    // Help Center
    { url: `${BASE_URL}/help`, changeFrequency: 'monthly' as const, priority: 0.6 },

    // Careers
    { url: `${BASE_URL}/careers`, changeFrequency: 'monthly' as const, priority: 0.5 },

    // Solutions sub-page
    { url: `${BASE_URL}/solutions/space-professionals`, changeFrequency: 'monthly' as const, priority: 0.7 },

    // Changelog
    { url: `${BASE_URL}/changelog`, changeFrequency: 'weekly' as const, priority: 0.4 },

    // Widget sub-pages
    { url: `${BASE_URL}/widgets/market-snapshot`, changeFrequency: 'daily' as const, priority: 0.4 },
    { url: `${BASE_URL}/widgets/next-launch`, changeFrequency: 'daily' as const, priority: 0.4 },
    { url: `${BASE_URL}/widgets/space-weather`, changeFrequency: 'daily' as const, priority: 0.4 },

    // Industry Scorecard & Space Calendar
    { url: `${BASE_URL}/industry-scorecard`, changeFrequency: 'monthly' as const, priority: 0.8 },
    { url: `${BASE_URL}/space-calendar`, changeFrequency: 'weekly' as const, priority: 0.7 },

    // Space Industry Map & Startup Directory
    { url: `${BASE_URL}/space-map`, changeFrequency: 'weekly' as const, priority: 0.8 },
    { url: `${BASE_URL}/startup-directory`, changeFrequency: 'weekly' as const, priority: 0.7 },

    // Space Industry Statistics
    { url: `${BASE_URL}/space-stats`, changeFrequency: 'monthly' as const, priority: 0.8 },

    // Data Sources transparency page
    { url: `${BASE_URL}/data-sources`, changeFrequency: 'monthly' as const, priority: 0.6 },

    // Newsletter
    { url: `${BASE_URL}/newsletter`, changeFrequency: 'weekly' as const, priority: 0.7 },

    // Daily Digest
    { url: `${BASE_URL}/daily-digest`, changeFrequency: 'daily' as const, priority: 0.7 },

    // Alternatives & Competitors
    { url: `${BASE_URL}/alternatives`, changeFrequency: 'monthly' as const, priority: 0.7 },

    // Regulatory tools
    { url: `${BASE_URL}/licensing-checker`, changeFrequency: 'monthly' as const, priority: 0.7 },
    { url: `${BASE_URL}/export-classifications`, changeFrequency: 'monthly' as const, priority: 0.7 },

    // Regulatory Agencies Directory
    { url: `${BASE_URL}/regulatory-agencies`, changeFrequency: 'monthly' as const, priority: 0.7 },

    // Compliance Checklist
    { url: `${BASE_URL}/compliance-checklist`, changeFrequency: 'monthly' as const, priority: 0.7 },

    // Enthusiast guide pages
    { url: `${BASE_URL}/satellite-spotting`, changeFrequency: 'monthly' as const, priority: 0.7 },
    { url: `${BASE_URL}/aurora-forecast`, changeFrequency: 'daily' as const, priority: 0.7 },

    // Legal Resources
    { url: `${BASE_URL}/legal-resources`, changeFrequency: 'monthly' as const, priority: 0.7 },
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
