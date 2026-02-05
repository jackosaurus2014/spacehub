export default function StructuredData() {
  const organizationSchema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'SpaceNexus',
    url: 'https://spacenexus.com',
    logo: 'https://spacenexus.com/logo.png',
    description:
      'SpaceNexus is a comprehensive space industry intelligence platform providing real-time data on launches, market trends, solar activity, and business opportunities.',
    foundingDate: '2024',
    sameAs: [
      'https://twitter.com/spacenexus',
      'https://linkedin.com/company/spacenexus',
      'https://github.com/spacenexus',
    ],
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer service',
      email: 'support@spacenexus.com',
      availableLanguage: ['English'],
    },
    address: {
      '@type': 'PostalAddress',
      addressCountry: 'US',
    },
  };

  const websiteSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'SpaceNexus',
    url: 'https://spacenexus.com',
    description:
      'Your comprehensive gateway to space industry intelligence. Track launches, market data, solar activity, and discover business opportunities.',
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: 'https://spacenexus.com/news?search={search_term_string}',
      },
      'query-input': 'required name=search_term_string',
    },
    publisher: {
      '@type': 'Organization',
      name: 'SpaceNexus',
      logo: {
        '@type': 'ImageObject',
        url: 'https://spacenexus.com/logo.png',
      },
    },
  };

  const softwareApplicationSchema = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'SpaceNexus',
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    offers: {
      '@type': 'AggregateOffer',
      lowPrice: '0',
      highPrice: '499',
      priceCurrency: 'USD',
      offerCount: '3',
    },
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '4.8',
      ratingCount: '150',
    },
    featureList: [
      'Real-time launch tracking',
      'Space market intelligence',
      'Solar flare monitoring',
      'Orbital slot database',
      'Business opportunity discovery',
      'Space company analytics',
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(organizationSchema),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(websiteSchema),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(softwareApplicationSchema),
        }}
      />
    </>
  );
}
