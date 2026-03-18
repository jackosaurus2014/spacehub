import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Space Industry Acronyms & Abbreviations | A-Z Reference',
  description:
    'Searchable A-Z reference of 100+ space industry acronyms and abbreviations. Covers LEO, GEO, ITAR, TLE, SGP4, SSA, GNSS, and more — organized by category with definitions.',
  keywords: [
    'space acronyms',
    'space industry abbreviations',
    'satellite acronyms',
    'space terminology',
    'LEO MEO GEO orbit acronyms',
    'ITAR EAR space regulations',
    'space industry glossary',
    'aerospace acronyms reference',
    'space technology terms',
    'rocket acronyms',
  ],
  openGraph: {
    title: 'Space Industry Acronyms & Abbreviations | SpaceNexus',
    description:
      'Searchable A-Z reference of 100+ space acronyms — LEO, GEO, ITAR, TLE, SGP4, GNSS, and more. Organized by category with expert definitions.',
    url: 'https://spacenexus.us/acronyms',
    type: 'website',
    images: ['/og-image.png'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Space Industry Acronyms & Abbreviations | SpaceNexus',
    description:
      'Searchable A-Z reference of 100+ space acronyms — LEO, GEO, ITAR, TLE, SGP4, GNSS, and more. Organized by category with expert definitions.',
    images: ['/og-image.png'],
  },
  alternates: {
    canonical: 'https://spacenexus.us/acronyms',
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
