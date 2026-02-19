'use client';

interface ServiceSchemaProps {
  name: string;
  description: string;
  url: string;
  provider: string;
  category: string;
  price?: string;
  priceCurrency?: string;
}

export default function ServiceSchema({
  name,
  description,
  url,
  provider,
  category,
  price,
  priceCurrency = 'USD',
}: ServiceSchemaProps) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name,
    description,
    url: url.startsWith('http') ? url : `https://spacenexus.us${url}`,
    provider: {
      '@type': 'Organization',
      name: provider,
    },
    category,
    ...(price && {
      offers: {
        '@type': 'Offer',
        price,
        priceCurrency,
        availability: 'https://schema.org/InStock',
      },
    }),
    areaServed: 'Worldwide',
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
