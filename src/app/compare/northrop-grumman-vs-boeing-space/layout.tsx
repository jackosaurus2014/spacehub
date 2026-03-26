import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Northrop Grumman vs Boeing Space: Defense Prime Comparison 2026',
  description: 'Compare Northrop Grumman and Boeing space divisions — SLS vs Antares/Cygnus, satellite manufacturing, crew vehicles, defense contracts, and strategic direction. Updated 2026.',
  keywords: ['Northrop Grumman vs Boeing space', 'defense space comparison', 'SLS Boeing', 'Cygnus Antares', 'space defense primes 2026'],
  openGraph: {
    title: 'Northrop Grumman vs Boeing Space: Defense Prime Comparison 2026 | SpaceNexus',
    description: 'Side-by-side comparison of Northrop Grumman and Boeing space divisions — defense satellites, launch vehicles, and crew programs.',
    url: 'https://spacenexus.us/compare/northrop-grumman-vs-boeing-space',
    type: 'article',
    images: [{
      url: '/api/og?title=Northrop+Grumman+vs+Boeing+Space&subtitle=Defense+Prime+Comparison+2026&type=compare',
      width: 1200,
      height: 630,
      alt: 'Northrop Grumman vs Boeing Space Comparison',
    }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Northrop Grumman vs Boeing Space: Defense Prime Comparison 2026 | SpaceNexus',
    description: 'Northrop Grumman vs Boeing — comparing two defense primes across satellites, launch, and crew vehicles.',
    images: ['/api/og?title=Northrop+Grumman+vs+Boeing+Space&subtitle=Defense+Prime+Comparison+2026&type=compare'],
  },
  alternates: { canonical: 'https://spacenexus.us/compare/northrop-grumman-vs-boeing-space' },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
