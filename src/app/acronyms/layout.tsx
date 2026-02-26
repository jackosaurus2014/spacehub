import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Space Industry Acronyms | SpaceNexus',
  description: 'Searchable A-Z reference of 100+ space industry acronyms and abbreviations.',
  openGraph: {
    title: 'Space Industry Acronyms | SpaceNexus',
    description: 'Searchable A-Z reference of 100+ space industry acronyms and abbreviations.',
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
