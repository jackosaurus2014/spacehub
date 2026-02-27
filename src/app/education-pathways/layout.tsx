import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Space Industry Education & Career Pathways | SpaceNexus',
  description: 'Comprehensive guide to education and career paths in the space industry. Top universities, certifications, salary data, internships, and skills in demand.',
  openGraph: {
    title: 'Space Industry Education & Career Pathways | SpaceNexus',
    description: 'Comprehensive guide to education and career paths in the space industry. Top universities, certifications, salary data, internships, and skills in demand.',
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
