/**
 * JSON-LD structured data component for SEO.
 * Renders a <script type="application/ld+json"> tag with the given schema.
 */

interface JsonLdProps {
  data: Record<string, unknown>;
}

export default function JsonLd({ data }: JsonLdProps) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

/** WebApplication schema for calculator/tool pages */
export function toolJsonLd({
  name,
  description,
  url,
  category = 'Space Industry Tool',
}: {
  name: string;
  description: string;
  url: string;
  category?: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name,
    description,
    url,
    applicationCategory: category,
    operatingSystem: 'Any',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
    provider: {
      '@type': 'Organization',
      name: 'SpaceNexus',
      url: 'https://spacenexus.us',
    },
  };
}

/** SoftwareApplication schema for the main platform */
export function platformJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'SpaceNexus',
    description: 'Space industry intelligence platform with real-time data, market analytics, and engineering tools.',
    url: 'https://spacenexus.us',
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Any',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
      description: 'Free tier available',
    },
    provider: {
      '@type': 'Organization',
      name: 'SpaceNexus',
      url: 'https://spacenexus.us',
    },
  };
}
