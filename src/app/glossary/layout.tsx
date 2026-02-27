import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Space Industry Glossary | SpaceNexus',
  description: 'Comprehensive glossary of 200+ space industry terms, acronyms, and technical definitions for professionals and enthusiasts.',
  openGraph: {
    title: 'Space Industry Glossary | SpaceNexus',
    description: 'Comprehensive glossary of 200+ space industry terms, acronyms, and technical definitions for professionals and enthusiasts.',
  },
};

export default function GlossaryLayout({ children }: { children: React.ReactNode }) {
  return children;
}
