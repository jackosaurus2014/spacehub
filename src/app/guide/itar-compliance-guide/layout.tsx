import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'ITAR Compliance Guide for Space Companies | SpaceNexus',
  description: 'Complete ITAR compliance guide for space and defense companies. Export control requirements, registration process, and best practices for aerospace firms.',
  openGraph: {
    title: 'ITAR Compliance Guide for Space Companies | SpaceNexus',
    description: 'Complete ITAR compliance guide for space and defense companies. Export control requirements, registration process, and best practices.',
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
