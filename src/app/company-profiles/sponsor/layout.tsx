import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sponsor a Company Profile',
  description: 'Upgrade your company profile on SpaceNexus with sponsored tiers. Gain premium visibility, verified badges, and enhanced features for your space industry listing.',
  openGraph: {
    title: 'Sponsor a Company Profile | SpaceNexus',
    description: 'Upgrade your company profile on SpaceNexus with sponsored tiers. Gain premium visibility, verified badges, and enhanced features for your space industry listing.',
  },
};

export default function SponsorLayout({ children }: { children: React.ReactNode }) {
  return children;
}
