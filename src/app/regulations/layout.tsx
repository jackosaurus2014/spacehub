import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Space Regulations Explorer',
  description: 'Searchable database of space regulations, treaties, and legal frameworks across 10+ jurisdictions.',
  openGraph: {
    title: 'Space Regulations Explorer | SpaceNexus',
    description: 'Searchable database of space regulations, treaties, and legal frameworks across 10+ jurisdictions.',
  },
    twitter: {
    card: 'summary_large_image',
    title: 'Space Regulations Explorer | SpaceNexus',
    description: 'Searchable database of space regulations, treaties, and legal frameworks across 10+ jurisdictions.',
    images: ['/og-image.png'],
  },
  alternates: {
    canonical: 'https://spacenexus.us/regulations',
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
