import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Technology Readiness Assessment',
  description: 'Comprehensive TRL assessment tool with interactive 9-level scale reference, self-assessment questionnaire, and 28+ emerging space technology tracker.',
  openGraph: {
    title: 'Technology Readiness Assessment | SpaceNexus',
    description: 'Comprehensive TRL assessment tool with interactive 9-level scale reference, self-assessment questionnaire, and 28+ emerging space technology tracker.',
  },
    twitter: {
    card: 'summary_large_image',
    title: 'Technology Readiness Assessment | SpaceNexus',
    description: 'Comprehensive TRL assessment tool with interactive 9-level scale reference, self-assessment questionnaire, and 28+ emerging space technology tracker.',
    images: ['/og-image.png'],
  },
  alternates: {
    canonical: 'https://spacenexus.us/tech-readiness',
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
