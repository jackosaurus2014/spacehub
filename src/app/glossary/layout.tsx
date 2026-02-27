import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Space Industry Glossary | SpaceNexus',
  description: 'Comprehensive glossary of 200+ space industry terms, acronyms, and technical definitions for professionals and enthusiasts.',
  openGraph: {
    type: 'website',
    siteName: 'SpaceNexus',
    locale: 'en_US',
    title: 'Space Industry Glossary | SpaceNexus',
    description: 'Comprehensive glossary of 200+ space industry terms, acronyms, and technical definitions for professionals and enthusiasts.',
    url: 'https://spacenexus.us/glossary',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'SpaceNexus - Space Industry Glossary',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    site: '@spacenexus',
    creator: '@spacenexus',
    title: 'Space Industry Glossary | SpaceNexus',
    description: 'Comprehensive glossary of 200+ space industry terms, acronyms, and technical definitions for professionals and enthusiasts.',
    images: ['/og-image.png'],
  },
  alternates: {
    canonical: 'https://spacenexus.io/glossary',
  },
};

export default function GlossaryLayout({ children }: { children: React.ReactNode }) {
  return children;
}
