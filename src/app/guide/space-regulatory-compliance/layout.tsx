import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Space Regulatory Compliance Guide | SpaceNexus',
  description: 'Navigate space regulatory compliance with this guide. FCC licensing, FAA launch permits, ITU spectrum coordination, ITAR/EAR export controls, and international treaties.',
  openGraph: {
    title: 'Space Regulatory Compliance Guide | SpaceNexus',
    description: 'Navigate space regulatory compliance. FCC licensing, FAA launch permits, ITU spectrum coordination, and export controls.',
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
