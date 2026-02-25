import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Space Startup Tracker',
  description: 'Track 40+ innovative space startups across launch, satellites, Earth observation, in-space services, tourism, mining, manufacturing, and defense. Funding stages, investor data, and ones to watch.',
  keywords: [
    'space startups',
    'space startup tracker',
    'space VC funding',
    'NewSpace startups',
    'space industry startups',
    'space startup funding',
    'space Series A',
    'space venture capital',
    'emerging space companies',
    'ones to watch space',
  ],
  openGraph: {
    title: 'Space Startup Tracker | SpaceNexus',
    description: 'Track 40+ innovative space startups with funding stages, investor data, and trending indicators.',
    url: 'https://spacenexus.us/startup-tracker',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Space Startup Tracker | SpaceNexus',
    description: 'Track 40+ innovative space startups with funding stages, investor data, and trending indicators.',
  },
  alternates: {
    canonical: 'https://spacenexus.us/startup-tracker',
  },
};

export default function StartupTrackerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
