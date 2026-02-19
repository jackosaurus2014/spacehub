'use client';

interface ArticleSchemaProps {
  headline: string;
  description: string;
  url: string;
  datePublished: string;
  dateModified?: string;
  author?: string;
  image?: string;
  section?: string;
}

export default function ArticleSchema({
  headline,
  description,
  url,
  datePublished,
  dateModified,
  author = 'SpaceNexus',
  image,
  section,
}: ArticleSchemaProps) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline,
    description,
    url: url.startsWith('http') ? url : `https://spacenexus.us${url}`,
    datePublished,
    ...(dateModified && { dateModified }),
    author: {
      '@type': 'Organization',
      name: author,
      url: 'https://spacenexus.us',
    },
    publisher: {
      '@type': 'Organization',
      name: 'SpaceNexus',
      logo: {
        '@type': 'ImageObject',
        url: 'https://spacenexus.us/spacenexus-logo.png',
      },
    },
    ...(image && {
      image: {
        '@type': 'ImageObject',
        url: image.startsWith('http') ? image : `https://spacenexus.us${image}`,
      },
    }),
    ...(section && { articleSection: section }),
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': url.startsWith('http') ? url : `https://spacenexus.us${url}`,
    },
    inLanguage: 'en-US',
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, '\\u003c') }}
    />
  );
}
