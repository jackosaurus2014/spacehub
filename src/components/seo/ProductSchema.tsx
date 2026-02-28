'use client';

interface ProductSchemaProps {
  name: string;
  description: string;
  url: string;
  image?: string;
  brand?: string;
  category?: string;
  price?: string;
  priceCurrency?: string;
  availability?: 'InStock' | 'OutOfStock' | 'PreOrder' | 'Discontinued';
  sku?: string;
}

export default function ProductSchema({
  name,
  description,
  url,
  image,
  brand,
  category,
  price,
  priceCurrency = 'USD',
  availability = 'InStock',
  sku,
}: ProductSchemaProps) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name,
    description,
    url: url.startsWith('http') ? url : `https://spacenexus.us${url}`,
    ...(image && {
      image: image.startsWith('http') ? image : `https://spacenexus.us${image}`,
    }),
    ...(brand && {
      brand: {
        '@type': 'Organization',
        name: brand,
      },
    }),
    ...(category && { category }),
    ...(sku && { sku }),
    ...(price && {
      offers: {
        '@type': 'Offer',
        price,
        priceCurrency,
        availability: `https://schema.org/${availability}`,
        url: url.startsWith('http') ? url : `https://spacenexus.us${url}`,
      },
    }),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, '\\u003c') }}
    />
  );
}
