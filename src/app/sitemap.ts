import { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://spacenexus.us';

  const routes = [
    // Homepage
    { url: baseUrl, changeFrequency: 'daily' as const, priority: 1.0 },

    // Main modules (high priority, frequently updated)
    { url: `${baseUrl}/mission-control`, changeFrequency: 'hourly' as const, priority: 0.9 },
    { url: `${baseUrl}/news`, changeFrequency: 'hourly' as const, priority: 0.9 },
    { url: `${baseUrl}/market-intel`, changeFrequency: 'hourly' as const, priority: 0.9 },
    { url: `${baseUrl}/satellites`, changeFrequency: 'hourly' as const, priority: 0.9 },
    { url: `${baseUrl}/business-opportunities`, changeFrequency: 'daily' as const, priority: 0.8 },
    { url: `${baseUrl}/mission-cost`, changeFrequency: 'daily' as const, priority: 0.8 },
    { url: `${baseUrl}/compliance`, changeFrequency: 'daily' as const, priority: 0.8 },
    { url: `${baseUrl}/solar-exploration`, changeFrequency: 'weekly' as const, priority: 0.8 },
    { url: `${baseUrl}/space-talent`, changeFrequency: 'daily' as const, priority: 0.8 },
    { url: `${baseUrl}/space-environment`, changeFrequency: 'hourly' as const, priority: 0.8 },

    // Sub-module pages
    { url: `${baseUrl}/space-economy`, changeFrequency: 'daily' as const, priority: 0.7 },
    { url: `${baseUrl}/space-capital`, changeFrequency: 'daily' as const, priority: 0.7 },
    { url: `${baseUrl}/launch-vehicles`, changeFrequency: 'weekly' as const, priority: 0.7 },
    { url: `${baseUrl}/launch-windows`, changeFrequency: 'daily' as const, priority: 0.7 },
    { url: `${baseUrl}/constellations`, changeFrequency: 'weekly' as const, priority: 0.7 },
    { url: `${baseUrl}/ground-stations`, changeFrequency: 'weekly' as const, priority: 0.7 },
    { url: `${baseUrl}/space-stations`, changeFrequency: 'weekly' as const, priority: 0.7 },
    { url: `${baseUrl}/cislunar`, changeFrequency: 'weekly' as const, priority: 0.7 },
    { url: `${baseUrl}/mars-planner`, changeFrequency: 'weekly' as const, priority: 0.7 },
    { url: `${baseUrl}/asteroid-watch`, changeFrequency: 'daily' as const, priority: 0.7 },
    { url: `${baseUrl}/orbital-slots`, changeFrequency: 'daily' as const, priority: 0.7 },
    { url: `${baseUrl}/spectrum`, changeFrequency: 'weekly' as const, priority: 0.7 },
    { url: `${baseUrl}/patents`, changeFrequency: 'weekly' as const, priority: 0.7 },
    { url: `${baseUrl}/space-manufacturing`, changeFrequency: 'weekly' as const, priority: 0.7 },
    { url: `${baseUrl}/spaceports`, changeFrequency: 'weekly' as const, priority: 0.7 },
    { url: `${baseUrl}/space-defense`, changeFrequency: 'weekly' as const, priority: 0.7 },
    { url: `${baseUrl}/supply-chain`, changeFrequency: 'daily' as const, priority: 0.7 },
    { url: `${baseUrl}/space-mining`, changeFrequency: 'weekly' as const, priority: 0.7 },
    { url: `${baseUrl}/resource-exchange`, changeFrequency: 'daily' as const, priority: 0.7 },
    { url: `${baseUrl}/space-insurance`, changeFrequency: 'weekly' as const, priority: 0.7 },
    { url: `${baseUrl}/blueprints`, changeFrequency: 'weekly' as const, priority: 0.7 },
    { url: `${baseUrl}/orbital-costs`, changeFrequency: 'weekly' as const, priority: 0.7 },
    { url: `${baseUrl}/procurement`, changeFrequency: 'daily' as const, priority: 0.7 },

    // Additional module pages
    { url: `${baseUrl}/space-tourism`, changeFrequency: 'weekly' as const, priority: 0.7 },

    // Company Intelligence
    { url: `${baseUrl}/company-profiles`, changeFrequency: 'daily' as const, priority: 0.8 },

    // Original blog content
    { url: `${baseUrl}/blog`, changeFrequency: 'weekly' as const, priority: 0.7 },

    // City-specific landing pages
    { url: `${baseUrl}/space-industry/houston`, changeFrequency: 'monthly' as const, priority: 0.6 },
    { url: `${baseUrl}/space-industry/washington-dc`, changeFrequency: 'monthly' as const, priority: 0.6 },
    { url: `${baseUrl}/space-industry/los-angeles`, changeFrequency: 'monthly' as const, priority: 0.6 },
    { url: `${baseUrl}/space-industry/colorado-springs`, changeFrequency: 'monthly' as const, priority: 0.6 },
    { url: `${baseUrl}/space-industry/cape-canaveral`, changeFrequency: 'monthly' as const, priority: 0.6 },
    { url: `${baseUrl}/space-industry/huntsville`, changeFrequency: 'monthly' as const, priority: 0.6 },
    { url: `${baseUrl}/space-industry/tucson`, changeFrequency: 'monthly' as const, priority: 0.6 },
    { url: `${baseUrl}/space-industry/seattle`, changeFrequency: 'monthly' as const, priority: 0.6 },

    // Content and tools
    { url: `${baseUrl}/blogs`, changeFrequency: 'daily' as const, priority: 0.6 },
    { url: `${baseUrl}/launch`, changeFrequency: 'daily' as const, priority: 0.6 },
    { url: `${baseUrl}/live`, changeFrequency: 'hourly' as const, priority: 0.6 },
    { url: `${baseUrl}/ai-insights`, changeFrequency: 'daily' as const, priority: 0.6 },
    { url: `${baseUrl}/search`, changeFrequency: 'weekly' as const, priority: 0.5 },
    { url: `${baseUrl}/dashboard`, changeFrequency: 'daily' as const, priority: 0.5 },
    { url: `${baseUrl}/alerts`, changeFrequency: 'daily' as const, priority: 0.5 },
    { url: `${baseUrl}/guide/space-industry`, changeFrequency: 'monthly' as const, priority: 0.5 },
    { url: `${baseUrl}/guide/space-industry-market-size`, changeFrequency: 'monthly' as const, priority: 0.6 },
    { url: `${baseUrl}/guide/how-satellite-tracking-works`, changeFrequency: 'monthly' as const, priority: 0.6 },
    { url: `${baseUrl}/guide/itar-compliance-guide`, changeFrequency: 'monthly' as const, priority: 0.6 },
    { url: `${baseUrl}/guide/space-launch-cost-comparison`, changeFrequency: 'monthly' as const, priority: 0.6 },
    { url: `${baseUrl}/guide/commercial-space-economy`, changeFrequency: 'monthly' as const, priority: 0.6 },
    { url: `${baseUrl}/guide/space-launch-schedule-2026`, changeFrequency: 'weekly' as const, priority: 0.7 },
    { url: `${baseUrl}/guide/satellite-tracking-guide`, changeFrequency: 'monthly' as const, priority: 0.7 },
    { url: `${baseUrl}/guide/space-business-opportunities`, changeFrequency: 'monthly' as const, priority: 0.7 },
    { url: `${baseUrl}/guide/space-regulatory-compliance`, changeFrequency: 'monthly' as const, priority: 0.7 },
    { url: `${baseUrl}/guide/space-economy-investment`, changeFrequency: 'monthly' as const, priority: 0.7 },

    // Learning Center
    { url: `${baseUrl}/learn`, changeFrequency: 'monthly' as const, priority: 0.7 },
    { url: `${baseUrl}/learn/satellite-launch-cost`, changeFrequency: 'monthly' as const, priority: 0.7 },
    { url: `${baseUrl}/learn/space-industry-market-size`, changeFrequency: 'monthly' as const, priority: 0.7 },
    { url: `${baseUrl}/learn/how-to-track-satellites`, changeFrequency: 'monthly' as const, priority: 0.7 },
    { url: `${baseUrl}/learn/space-companies-to-watch`, changeFrequency: 'monthly' as const, priority: 0.7 },

    // Comparison pages
    { url: `${baseUrl}/compare`, changeFrequency: 'monthly' as const, priority: 0.6 },
    { url: `${baseUrl}/compare/bloomberg-terminal`, changeFrequency: 'monthly' as const, priority: 0.6 },
    { url: `${baseUrl}/compare/quilty-analytics`, changeFrequency: 'monthly' as const, priority: 0.6 },
    { url: `${baseUrl}/compare/payload-space`, changeFrequency: 'monthly' as const, priority: 0.6 },

    // Marketplace
    { url: `${baseUrl}/marketplace`, changeFrequency: 'daily' as const, priority: 0.7 },
    { url: `${baseUrl}/marketplace/search`, changeFrequency: 'daily' as const, priority: 0.6 },
    { url: `${baseUrl}/marketplace/copilot`, changeFrequency: 'weekly' as const, priority: 0.5 },

    // Conversion pages
    { url: `${baseUrl}/pricing`, changeFrequency: 'monthly' as const, priority: 0.5 },
    { url: `${baseUrl}/developer`, changeFrequency: 'monthly' as const, priority: 0.5 },
    { url: `${baseUrl}/advertise`, changeFrequency: 'monthly' as const, priority: 0.4 },
    { url: `${baseUrl}/contact`, changeFrequency: 'monthly' as const, priority: 0.4 },
    { url: `${baseUrl}/faq`, changeFrequency: 'monthly' as const, priority: 0.4 },
    { url: `${baseUrl}/press`, changeFrequency: 'monthly' as const, priority: 0.4 },
    { url: `${baseUrl}/account`, changeFrequency: 'monthly' as const, priority: 0.3 },

    // Legal pages
    { url: `${baseUrl}/privacy`, changeFrequency: 'monthly' as const, priority: 0.3 },
    { url: `${baseUrl}/terms`, changeFrequency: 'monthly' as const, priority: 0.3 },
    { url: `${baseUrl}/cookies`, changeFrequency: 'monthly' as const, priority: 0.3 },

    // Auth pages
    { url: `${baseUrl}/login`, changeFrequency: 'monthly' as const, priority: 0.3 },
    { url: `${baseUrl}/register`, changeFrequency: 'monthly' as const, priority: 0.3 },
  ];

  return routes.map(route => ({
    ...route,
    lastModified: new Date(),
  }));
}
