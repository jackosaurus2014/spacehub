import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Community Guidelines | SpaceNexus',
  description: 'Community guidelines and code of conduct for SpaceNexus. Includes ITAR/EAR export control obligations, content policies, and professional standards.',
  openGraph: {
    title: 'Community Guidelines | SpaceNexus',
    description: 'Community guidelines and code of conduct for SpaceNexus. Includes ITAR/EAR export control obligations, content policies, and professional standards.',
  },
  alternates: {
    canonical: 'https://spacenexus.us/community/guidelines',
  },
};

export default function GuidelinesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
