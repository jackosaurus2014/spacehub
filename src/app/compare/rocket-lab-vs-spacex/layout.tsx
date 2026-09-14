import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Rocket Lab vs SpaceX: 93 Launches vs 680 (2026)',
  description: 'Electron has flown 93 missions; Falcon 9 has flown 680. Rocket Lab and SpaceX compared on vehicles, prices, reuse, revenue and what Neutron changes.',
  keywords: ['Rocket Lab vs SpaceX', 'RKLB vs SpaceX', 'Electron vs Falcon 9', 'Neutron vs Falcon 9', 'space company comparison 2026'],
  openGraph: {
    title: 'Rocket Lab vs SpaceX: 93 Launches vs 680 (2026)',
    description: 'Electron has flown 93 missions; Falcon 9 has flown 680. Rocket Lab and SpaceX compared on vehicles, prices, reuse, revenue and what Neutron changes.',
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
    title: 'Rocket Lab vs SpaceX: 93 Launches vs 680 (2026)',
    description: 'Electron has flown 93 missions; Falcon 9 has flown 680. Rocket Lab and SpaceX compared on vehicles, prices, reuse, revenue and what Neutron changes.',
    images: ['/api/og?title=Rocket+Lab+vs+SpaceX&subtitle=Full+Vertical+Comparison+2026&type=compare'],
  },
  alternates: { canonical: 'https://spacenexus.us/compare/rocket-lab-vs-spacex' },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
