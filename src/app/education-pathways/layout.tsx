import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Space Industry Education & Career Pathways',
  description: 'Comprehensive guide to education and career paths in the space industry. Top universities, certifications, salary data, internships, and skills in demand.',
  openGraph: {
    type: 'website',
    siteName: 'SpaceNexus',
    locale: 'en_US',
    title: 'Space Industry Education & Career Pathways | SpaceNexus',
    description: 'Comprehensive guide to education and career paths in the space industry. Top universities, certifications, salary data, internships, and skills in demand.',
    url: 'https://spacenexus.us/education-pathways',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'SpaceNexus - Space Industry Education & Career Pathways',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    site: '@spacenexus',
    creator: '@spacenexus',
    title: 'Space Industry Education & Career Pathways | SpaceNexus',
    description: 'Comprehensive guide to education and career paths in the space industry. Top universities, certifications, salary data, internships, and skills in demand.',
    images: ['/og-image.png'],
  },
  alternates: {
    canonical: 'https://spacenexus.us/education-pathways',
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
