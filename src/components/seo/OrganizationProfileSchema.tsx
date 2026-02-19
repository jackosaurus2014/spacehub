'use client';

interface OrganizationProfileSchemaProps {
  name: string;
  description: string;
  url: string;
  logo?: string;
  foundingDate?: string;
  location?: string;
  employeeCount?: string;
  industry?: string;
  parentOrganization?: string;
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
}: OrganizationProfileSchemaProps) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name,
    description,
    url: url.startsWith('http') ? url : `https://spacenexus.us${url}`,
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
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
