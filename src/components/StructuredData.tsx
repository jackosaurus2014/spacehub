export default function StructuredData() {
  const organizationSchema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'SpaceNexus',
    legalName: 'SpaceNexus LLC',
    url: 'https://spacenexus.us',
    logo: 'https://spacenexus.us/logo.png',
    description:
      'SpaceNexus is a comprehensive space industry intelligence platform providing real-time data on launches, satellite tracking, market trends, company profiles, and business opportunities across the $1.8 trillion space economy.',
    foundingDate: '2024',
    foundingLocation: {
      '@type': 'Place',
      address: {
        '@type': 'PostalAddress',
        addressLocality: 'Houston',
        addressRegion: 'TX',
        addressCountry: 'US',
      },
    },
    sameAs: [
      'https://twitter.com/spacenexus',
      'https://linkedin.com/company/spacenexus',
      'https://github.com/jackosaurus2014/spacehub',
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
    address: {
      '@type': 'PostalAddress',
      streetAddress: '1234 Orbit Drive, Suite 500',
      addressLocality: 'Houston',
      addressRegion: 'TX',
      postalCode: '77058',
      addressCountry: 'US',
    },
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
    description:
      'Your comprehensive gateway to space industry intelligence. Track launches, satellites, market data, 200+ company profiles, and discover business opportunities.',
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
    description: 'The most comprehensive space industry intelligence platform. Track 19,000+ satellites, monitor launches, analyze market data, and access 200+ company profiles.',
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
        price: '29',
        priceCurrency: 'USD',
        priceSpecification: {
          '@type': 'UnitPriceSpecification',
          price: '29',
          priceCurrency: 'USD',
          billingDuration: 'P1M',
        },
        description: 'Advanced analytics, AI insights, full company profiles, procurement intelligence, and ad-free experience.',
      },
      {
        '@type': 'Offer',
        name: 'Enterprise',
        price: '99',
        priceCurrency: 'USD',
        priceSpecification: {
          '@type': 'UnitPriceSpecification',
          price: '99',
          priceCurrency: 'USD',
          billingDuration: 'P1M',
        },
        description: 'API access, SSO, custom dashboards, dedicated support, and team collaboration.',
      },
    ],
    featureList: [
      'Real-time launch tracking with countdown timers',
      'Satellite tracking for 19,000+ objects on 3D globe',
      '200+ space company profiles with financial data',
      'AI-powered market intelligence (Claude)',
      'News aggregation from 50+ curated sources',
      'Government procurement intelligence (SAM.gov)',
      'Space weather and debris monitoring',
      'Regulatory compliance tracking',
      'B2B space marketplace',
      'Space talent job board',
    ],
    screenshot: 'https://spacenexus.us/og-image.png',
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
    </>
  );
}
