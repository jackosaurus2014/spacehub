'use client';

interface OrganizationProfileSchemaProps {
  name: string;
  description: string;
  /** The SpaceNexus profile URL path (e.g. /company-profiles/spacex) */
  url: string;
  logo?: string;
  foundingDate?: string;
  location?: string;
  employeeCount?: string;
  industry?: string;
  parentOrganization?: string;
  /** The company's official website URL */
  websiteUrl?: string;
  /** LinkedIn profile URL */
  linkedinUrl?: string;
  /** Twitter/X profile URL */
  twitterUrl?: string;
  /** Stock ticker symbol (for public companies) */
  ticker?: string;
  /** Stock exchange name */
  exchange?: string;
}

export default function OrganizationProfileSchema({
  name,
  description,
  url,
  logo,
  foundingDate,
  location,
  employeeCount,
  industry,
  parentOrganization,
  websiteUrl,
  linkedinUrl,
  twitterUrl,
  ticker,
  exchange,
}: OrganizationProfileSchemaProps) {
  const profileUrl = url.startsWith('http') ? url : `https://spacenexus.us${url}`;

  // Build sameAs array from social links and SpaceNexus profile
  const sameAs: string[] = [profileUrl];
  if (linkedinUrl) sameAs.push(linkedinUrl);
  if (twitterUrl) sameAs.push(twitterUrl);

  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name,
    description,
    // Use the company's own website if available, otherwise fall back to SpaceNexus profile
    url: websiteUrl || profileUrl,
    ...(logo && {
      logo: {
        '@type': 'ImageObject',
        url: logo.startsWith('http') ? logo : `https://spacenexus.us${logo}`,
      },
    }),
    ...(foundingDate && { foundingDate }),
    ...(location && {
      address: {
        '@type': 'PostalAddress',
        addressLocality: location,
      },
    }),
    ...(employeeCount && {
      numberOfEmployees: {
        '@type': 'QuantitativeValue',
        value: employeeCount,
      },
    }),
    ...(industry && { industry }),
    ...(parentOrganization && {
      parentOrganization: {
        '@type': 'Organization',
        name: parentOrganization,
      },
    }),
    ...(sameAs.length > 0 && { sameAs }),
    ...(ticker && {
      tickerSymbol: ticker,
      ...(exchange && {
        exchange: {
          '@type': 'Organization',
          name: exchange,
        },
      }),
    }),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, '\\u003c') }}
    />
  );
}
