import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Space News',
  description: 'Stay up to date with the latest space industry news. Breaking stories on launches, discoveries, space agencies, commercial spaceflight, and astronomical events.',
  keywords: [
    'space news',
    'NASA news',
    'SpaceX news',
    'rocket launch news',
    'astronomy news',
    'space exploration news',
    'satellite news',
    'space industry updates',
    'space technology news',
    'commercial spaceflight',
  ],
  openGraph: {
    title: 'Space News | SpaceNexus',
    description: 'Breaking space industry news on launches, discoveries, and commercial spaceflight.',
    url: 'https://spacenexus.us/news',
    images: [
      {
        url: '/og-news.png',
        width: 1200,
        height: 630,
        alt: 'SpaceNexus News - Latest Space Industry Updates',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Space News | SpaceNexus',
    description: 'Breaking space industry news on launches, discoveries, and commercial spaceflight.',
    images: ['/og-news.png'],
  },
  alternates: {
    canonical: 'https://spacenexus.us/news',
  },
};

export default function NewsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const newsWebSiteSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'SpaceNexus News',
    url: 'https://spacenexus.us/news',
    description:
      'Breaking space industry news on launches, discoveries, satellites, commercial spaceflight, and astronomical events.',
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
      url: 'https://spacenexus.us',
      logo: {
        '@type': 'ImageObject',
        url: 'https://spacenexus.us/spacenexus-logo.png',
      },
    },
    inLanguage: 'en-US',
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(newsWebSiteSchema).replace(/</g, '\\u003c'),
        }}
      />
      {children}
    </>
  );
}
