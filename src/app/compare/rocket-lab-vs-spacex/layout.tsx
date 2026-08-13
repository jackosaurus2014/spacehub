import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Rocket Lab vs SpaceX: 55+ Launches (2026)',
  description: 'Electron has flown 55+ missions; Falcon 9 has flown 300+. Compare Rocket Lab and SpaceX on vehicles, revenue, and building end-to-end space companies in 2026.',
  keywords: ['Rocket Lab vs SpaceX', 'RKLB vs SpaceX', 'Electron vs Falcon 9', 'Neutron vs Falcon 9', 'space company comparison 2026'],
  openGraph: {
    title: 'Rocket Lab vs SpaceX: 55+ Launches (2026)',
    description: 'Electron has flown 55+ missions; Falcon 9 has flown 300+. Compare Rocket Lab and SpaceX on vehicles, revenue, and building end-to-end space companies in 2026.',
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
    title: 'Rocket Lab vs SpaceX: 55+ Launches (2026)',
    description: 'Electron has flown 55+ missions; Falcon 9 has flown 300+. Full vertical comparison of two end-to-end space companies.',
    images: ['/api/og?title=Rocket+Lab+vs+SpaceX&subtitle=Full+Vertical+Comparison+2026&type=compare'],
  },
  alternates: { canonical: 'https://spacenexus.us/compare/rocket-lab-vs-spacex' },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
