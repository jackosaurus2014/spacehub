import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Space Industry Acronyms',
  description: 'Searchable A-Z reference of 100+ space industry acronyms and abbreviations.',
  openGraph: {
    title: 'Space Industry Acronyms | SpaceNexus',
    description: 'Searchable A-Z reference of 100+ space industry acronyms and abbreviations.',
  },
    twitter: {
    card: 'summary_large_image',
    title: 'Space Industry Acronyms | SpaceNexus',
    description: 'Searchable A-Z reference of 100+ space industry acronyms and abbreviations.',
    images: ['/og-image.png'],
  },
  alternates: {
    canonical: 'https://spacenexus.us/acronyms',
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
