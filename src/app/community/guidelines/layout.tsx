import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Community Guidelines | SpaceNexus',
  description: 'Community guidelines and code of conduct for SpaceNexus, the space industry intelligence platform. Includes ITAR/EAR export control obligations and content policies.',
  openGraph: {
    title: 'Community Guidelines | SpaceNexus',
    description: 'Community guidelines and code of conduct for SpaceNexus, the space industry intelligence platform. Includes ITAR/EAR export control obligations and content policies.',
  },
  alternates: {
    canonical: 'https://spacenexus.us/community/guidelines',
  },
};

export default function GuidelinesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
