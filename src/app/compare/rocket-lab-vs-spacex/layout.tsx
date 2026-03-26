import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Rocket Lab vs SpaceX: Full Vertical Comparison 2026',
  description: 'Compare Rocket Lab and SpaceX side by side — launch vehicles, spacecraft, solar panels, revenue, market strategy, and the ambition to build end-to-end space companies. Updated 2026.',
  keywords: ['Rocket Lab vs SpaceX', 'RKLB vs SpaceX', 'Electron vs Falcon 9', 'Neutron vs Falcon 9', 'space company comparison 2026'],
  openGraph: {
    title: 'Rocket Lab vs SpaceX: Full Vertical Comparison 2026 | SpaceNexus',
    description: 'Side-by-side comparison of Rocket Lab and SpaceX — launch, spacecraft, and space systems across different scales.',
    url: 'https://spacenexus.us/compare/rocket-lab-vs-spacex',
    type: 'article',
    images: [{
      url: '/api/og?title=Rocket+Lab+vs+SpaceX&subtitle=Full+Vertical+Comparison+2026&type=compare',
      width: 1200,
      height: 630,
      alt: 'Rocket Lab vs SpaceX Comparison',
    }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Rocket Lab vs SpaceX: Full Vertical Comparison 2026 | SpaceNexus',
    description: 'Rocket Lab vs SpaceX — same ambition, different scale. Full vertical comparison of two end-to-end space companies.',
    images: ['/api/og?title=Rocket+Lab+vs+SpaceX&subtitle=Full+Vertical+Comparison+2026&type=compare'],
  },
  alternates: { canonical: 'https://spacenexus.us/compare/rocket-lab-vs-spacex' },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
