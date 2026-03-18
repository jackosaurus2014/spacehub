import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Space Startup Directory | SpaceNexus',
  description:
    'Curated directory of 35+ notable space startups organized by funding stage and sector. Browse launch, satellite, data, in-space, and ground segment startups from pre-seed to Series C+.',
  openGraph: {
    title: 'Space Startup Directory | SpaceNexus',
    description:
      'Discover 35+ notable space startups across 5 sectors. Funding data, founding year, HQ, and links to full company profiles.',
    url: 'https://spacenexus.us/startup-directory',
  },
  alternates: {
    canonical: 'https://spacenexus.us/startup-directory',
  },
};

export default function StartupDirectoryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
