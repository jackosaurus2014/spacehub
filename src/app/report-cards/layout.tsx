import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Industry Report Cards',
  description: 'Quarterly performance assessments of major space companies with grades, metrics, and outlook.',
  openGraph: {
    title: 'Industry Report Cards | SpaceNexus',
    description: 'Quarterly performance assessments of major space companies with grades, metrics, and outlook.',
  },
    twitter: {
    card: 'summary_large_image',
    title: 'Industry Report Cards | SpaceNexus',
    description: 'Quarterly performance assessments of major space companies with grades, metrics, and outlook.',
    images: ['/og-image.png'],
  },
  alternates: {
    canonical: 'https://spacenexus.us/report-cards',
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
