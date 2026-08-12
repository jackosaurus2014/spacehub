import { SITE_STATS } from '@/lib/site-stats';

export default function StructuredData() {
  const organizationSchema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'SpaceNexus',
    legalName: 'SpaceNexus LLC',
    url: 'https://spacenexus.us',
    logo: 'https://spacenexus.us/logo.png',
    description: `SpaceNexus is a comprehensive space industry intelligence platform providing real-time data on launches, satellite tracking, market trends, company profiles, and business opportunities across a global space economy projected to reach ${SITE_STATS.spaceEconomyProjection}.`,
    foundingDate: '2024',
    sameAs: [
      'https://twitter.com/spacenexus',
      'https://linkedin.com/company/spacenexus',
    ],
    contactPoint: [
      {
        '@type': 'ContactPoint',
        contactType: 'customer service',
        email: 'support@spacenexus.us',
        availableLanguage: ['English'],
      },
      {
        '@type': 'ContactPoint',
        contactType: 'sales',
        email: 'sales@spacenexus.us',
        availableLanguage: ['English'],
      },
    ],
    numberOfEmployees: {
      '@type': 'QuantitativeValue',
      value: '2-10',
    },
    knowsAbout: [
      'Space Industry',
      'Satellite Tracking',
      'Launch Vehicle Operations',
      'Space Market Intelligence',
      'Aerospace Engineering',
      'Space Procurement',
      'Space Regulatory Compliance',
    ],
  };

  const websiteSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'SpaceNexus',
    alternateName: 'SpaceNexus Space Intelligence',
    url: 'https://spacenexus.us',
    description: `Your comprehensive gateway to space industry intelligence. Track launches, satellites, market data, ${SITE_STATS.companies} company profiles, and discover business opportunities.`,
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: 'https://spacenexus.us/news?search={search_term_string}',
      },
      'query-input': 'required name=search_term_string',
    },
    publisher: {
      '@type': 'Organization',
      name: 'SpaceNexus',
      logo: {
        '@type': 'ImageObject',
        url: 'https://spacenexus.us/logo.png',
      },
    },
    inLanguage: 'en-US',
  };

  const softwareApplicationSchema = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'SpaceNexus',
    description: `A comprehensive space industry intelligence platform. Track ${SITE_STATS.satellites} satellites, monitor launches, analyze market data, and access ${SITE_STATS.companies} company profiles.`,
    applicationCategory: 'BusinessApplication',
    applicationSubCategory: 'Space Industry Intelligence',
    operatingSystem: 'Web, Android, iOS',
    url: 'https://spacenexus.us',
    offers: [
      {
        '@type': 'Offer',
        name: 'Explorer (Free)',
        price: '0',
        priceCurrency: 'USD',
        description: 'Core features including news feeds, satellite tracking, mission countdowns, and public data.',
      },
      {
        '@type': 'Offer',
        name: 'Professional',
        price: '19.99',
        priceCurrency: 'USD',
        priceSpecification: {
          '@type': 'UnitPriceSpecification',
          price: '19.99',
          priceCurrency: 'USD',
          billingDuration: 'P1M',
        },
        description: 'Advanced analytics, AI insights, full company profiles, procurement intelligence, API access, custom dashboards, and ad-free experience.',
      },
    ],
    featureList: [
      'Real-time launch tracking with countdown timers',
      `Satellite tracking for ${SITE_STATS.satellites} objects on 3D globe`,
      `${SITE_STATS.companies} space company profiles with financial data`,
      'AI-powered market intelligence (Claude)',
      `News aggregation from ${SITE_STATS.newsFeeds} curated sources`,
      'Government procurement intelligence (SAM.gov)',
      'Space weather and debris monitoring',
      'Regulatory compliance tracking',
      'B2B space marketplace',
      'Space talent job board',
    ],
    screenshot: 'https://spacenexus.us/og-image.png',
  };

  const webApplicationSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'SpaceNexus',
    url: 'https://spacenexus.us',
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
    description: `Space industry intelligence platform providing real-time launch tracking, satellite monitoring, market data, ${SITE_STATS.companies} company profiles, and business opportunities across the global space economy.`,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(organizationSchema).replace(/</g, '\\u003c'),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(websiteSchema).replace(/</g, '\\u003c'),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(softwareApplicationSchema).replace(/</g, '\\u003c'),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(webApplicationSchema).replace(/</g, '\\u003c'),
        }}
      />
    </>
  );
}
