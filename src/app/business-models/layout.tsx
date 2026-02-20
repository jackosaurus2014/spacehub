import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Space Business Model Templates & Unit Economics',
  description: 'Space-specific financial model templates with industry benchmarks for launch services, satellite operations, Earth observation, and more. Build investor-ready projections with real unit economics.',
  keywords: ['space business model', 'satellite unit economics', 'launch service economics', 'space startup financial model'],
  openGraph: {
    title: 'SpaceNexus - Space Business Model Templates & Unit Economics',
    description: 'Space-specific financial model templates with industry benchmarks for launch services, satellite operations, Earth observation, and more.',
    url: 'https://spacenexus.us/business-models',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SpaceNexus - Space Business Model Templates & Unit Economics',
    description: 'Space-specific financial model templates with industry benchmarks for launch services, satellite operations, Earth observation, and more.',
  },
  alternates: {
    canonical: 'https://spacenexus.us/business-models',
  },
};

export default function BusinessModelsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
