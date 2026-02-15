import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Space Company Directory - 200+ Company Profiles',
  description: 'Comprehensive directory of 200+ space industry companies. Explore profiles with financial data, satellite assets, facility locations, and competitive analysis for SpaceX, Blue Origin, Rocket Lab, and more.',
  keywords: ['space companies', 'aerospace company directory', 'space company profiles', 'SpaceX profile', 'satellite companies', 'space startups'],
  openGraph: {
    title: 'SpaceNexus Company Directory - 200+ Space Companies',
    description: 'Comprehensive profiles of 200+ space industry companies with financial data, assets, and competitive analysis.',
    url: 'https://spacenexus.us/company-profiles',
  },
  alternates: {
    canonical: 'https://spacenexus.us/company-profiles',
  },
};

export default function CompanyProfilesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
