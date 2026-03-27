import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Relativity Space vs Firefly Aerospace: Comparison | SpaceNexus',
  description:
    'Compare Relativity Space and Firefly Aerospace side-by-side: 3D-printed rockets vs traditional manufacturing, Terran R vs Alpha and MLV, launch capabilities, and funding.',
  keywords: [
    'Relativity Space vs Firefly',
    'Relativity Space vs Firefly Aerospace',
    'Terran R vs Firefly Alpha',
    'new space launch companies',
    '3D printed rocket comparison',
    'small launch vehicle comparison',
    'emerging launch providers',
  ],
  openGraph: {
    title: 'Relativity Space vs Firefly Aerospace: Comparison | SpaceNexus',
    description:
      'Compare Relativity Space and Firefly Aerospace side-by-side: 3D-printed rockets vs traditional manufacturing, launch capabilities, and future roadmaps.',
    type: 'website',
    url: 'https://spacenexus.us/compare/relativity-space-vs-firefly',
    siteName: 'SpaceNexus',
    images: [
      {
        url: '/api/og?title=Relativity+Space+vs+Firefly&type=compare',
        width: 1200,
        height: 630,
        alt: 'Relativity Space vs Firefly Aerospace Comparison',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Relativity Space vs Firefly Aerospace: Comparison | SpaceNexus',
    description:
      'Compare Relativity Space and Firefly Aerospace side-by-side: 3D-printed rockets vs traditional manufacturing, launch capabilities, and future roadmaps.',
    images: ['/api/og?title=Relativity+Space+vs+Firefly&type=compare'],
  },
  alternates: {
    canonical: 'https://spacenexus.us/compare/relativity-space-vs-firefly',
  },
};

export default function RelativitySpaceVsFireflyLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
