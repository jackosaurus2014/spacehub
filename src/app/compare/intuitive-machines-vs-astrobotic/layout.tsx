import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Intuitive Machines vs Astrobotic: Lunar Lander Comparison 2026',
  description: 'Compare Intuitive Machines and Astrobotic side by side — CLPS contracts, lunar lander designs, mission results, NASA partnerships, and business models. Updated 2026.',
  keywords: ['Intuitive Machines vs Astrobotic', 'CLPS comparison', 'lunar lander companies', 'Nova-C', 'Peregrine lander', 'Moon landing 2026'],
  openGraph: {
    title: 'Intuitive Machines vs Astrobotic: Lunar Lander Comparison 2026 | SpaceNexus',
    description: 'Side-by-side comparison of Intuitive Machines and Astrobotic — CLPS contracts, mission results, and lunar lander technology.',
    url: 'https://spacenexus.us/compare/intuitive-machines-vs-astrobotic',
    type: 'article',
    images: [{
      url: '/api/og?title=Intuitive+Machines+vs+Astrobotic&subtitle=Lunar+Lander+Comparison+2026&type=compare',
      width: 1200,
      height: 630,
      alt: 'Intuitive Machines vs Astrobotic Comparison',
    }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Intuitive Machines vs Astrobotic: Lunar Lander Comparison 2026 | SpaceNexus',
    description: 'Intuitive Machines vs Astrobotic — comparing the two leading commercial lunar lander companies.',
    images: ['/api/og?title=Intuitive+Machines+vs+Astrobotic&subtitle=Lunar+Lander+Comparison+2026&type=compare'],
  },
  alternates: { canonical: 'https://spacenexus.us/compare/intuitive-machines-vs-astrobotic' },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
