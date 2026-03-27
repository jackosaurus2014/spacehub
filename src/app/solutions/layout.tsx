import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  description: 'SpaceNexus solutions for investors, analysts, engineers, and executives in the space industry.',
  alternates: {
    canonical: 'https://spacenexus.us/solutions',
  },
  openGraph: {
    title: 'Solutions for Every Space Professional | SpaceNexus',
    description: 'Discover SpaceNexus solutions tailored for space investors, analysts, engineers, and executives.',
    images: [{ url: '/api/og?title=Solutions&type=data', width: 1200, height: 630, alt: 'Solutions' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Solutions for Every Space Professional | SpaceNexus',
    description: 'Discover SpaceNexus solutions tailored for space investors, analysts, engineers, and executives.',
    images: ['/api/og?title=Solutions&type=data'],
  },
};

export default function SolutionsLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
