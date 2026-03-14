import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Space Company Directory - 200+ Company Profiles',
  description: 'Browse 200+ space company profiles with financials, funding data, and competitive analysis. From SpaceX to emerging startups.',
  keywords: ['space companies', 'aerospace company directory', 'space company profiles', 'SpaceX profile', 'satellite companies', 'space startups'],
  openGraph: {
    type: 'website',
    siteName: 'SpaceNexus',
    locale: 'en_US',
    title: 'SpaceNexus Company Directory - 200+ Space Companies',
    description: 'Browse 200+ space company profiles with financials, funding data, and competitive analysis. From SpaceX to emerging startups.',
    url: 'https://spacenexus.us/company-profiles',
    images: [
      {
        url: '/og-companies.png',
        width: 1200,
        height: 630,
        alt: 'SpaceNexus Company Directory - 200+ Aerospace Company Profiles',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    site: '@spacenexus',
    creator: '@spacenexus',
    title: 'SpaceNexus Company Directory - 200+ Space Companies',
    description: 'Browse 200+ space company profiles with financials, funding data, and competitive analysis. From SpaceX to emerging startups.',
    images: ['/og-companies.png'],
  },
  alternates: {
    canonical: 'https://spacenexus.us/company-profiles',
  },
};

export default function CompanyProfilesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
