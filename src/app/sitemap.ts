import { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://spacenexus.com';

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
    { url: `${baseUrl}/startups`, changeFrequency: 'daily' as const, priority: 0.7 },
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
    { url: `${baseUrl}/procurement`, changeFrequency: 'daily' as const, priority: 0.7 },

    // Content and tools
    { url: `${baseUrl}/blogs`, changeFrequency: 'daily' as const, priority: 0.6 },
    { url: `${baseUrl}/launch`, changeFrequency: 'daily' as const, priority: 0.6 },
    { url: `${baseUrl}/search`, changeFrequency: 'weekly' as const, priority: 0.5 },
    { url: `${baseUrl}/guide/space-industry`, changeFrequency: 'monthly' as const, priority: 0.5 },
    { url: `${baseUrl}/guide/space-industry-market-size`, changeFrequency: 'monthly' as const, priority: 0.6 },
    { url: `${baseUrl}/guide/how-satellite-tracking-works`, changeFrequency: 'monthly' as const, priority: 0.6 },
    { url: `${baseUrl}/guide/itar-compliance-guide`, changeFrequency: 'monthly' as const, priority: 0.6 },
    { url: `${baseUrl}/guide/space-launch-cost-comparison`, changeFrequency: 'monthly' as const, priority: 0.6 },
    { url: `${baseUrl}/guide/commercial-space-economy`, changeFrequency: 'monthly' as const, priority: 0.6 },

    // Conversion pages
    { url: `${baseUrl}/pricing`, changeFrequency: 'monthly' as const, priority: 0.5 },
    { url: `${baseUrl}/developer`, changeFrequency: 'monthly' as const, priority: 0.5 },
    { url: `${baseUrl}/contact`, changeFrequency: 'monthly' as const, priority: 0.4 },
    { url: `${baseUrl}/faq`, changeFrequency: 'monthly' as const, priority: 0.4 },

    // Auth pages
    { url: `${baseUrl}/login`, changeFrequency: 'monthly' as const, priority: 0.3 },
    { url: `${baseUrl}/register`, changeFrequency: 'monthly' as const, priority: 0.3 },
  ];

  return routes.map(route => ({
    ...route,
    lastModified: new Date(),
  }));
}
