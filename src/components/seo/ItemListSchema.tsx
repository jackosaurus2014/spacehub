'use client';

interface ListItem {
  name: string;
  url: string;
  image?: string;
  description?: string;
}

interface ItemListSchemaProps {
  name: string;
  description: string;
  url: string;
  items: ListItem[];
}

export default function ItemListSchema({ name, description, url, items }: ItemListSchemaProps) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name,
    description,
    url: url.startsWith('http') ? url : `https://spacenexus.us${url}`,
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: items.length,
      itemListElement: items.slice(0, 50).map((item, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: item.name,
        url: item.url.startsWith('http') ? item.url : `https://spacenexus.us${item.url}`,
        ...(item.description && { description: item.description }),
        ...(item.image && {
          image: item.image.startsWith('http') ? item.image : `https://spacenexus.us${item.image}`,
        }),
      })),
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, '\\u003c') }}
    />
  );
}
