import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sierra Space vs Axiom Space: Commercial Space Comparison 2026',
  description: 'Compare Sierra Space and Axiom Space side by side — Dream Chaser vs ISS modules, commercial station approaches, crew vehicles, NASA contracts, and funding. Updated 2026.',
  keywords: ['Sierra Space vs Axiom Space', 'Dream Chaser', 'commercial space station', 'Axiom station', 'post-ISS comparison 2026'],
  openGraph: {
    title: 'Sierra Space vs Axiom Space: Commercial Space Comparison 2026 | SpaceNexus',
    description: 'Side-by-side comparison of Sierra Space and Axiom Space — Dream Chaser spaceplane vs commercial ISS modules.',
    url: 'https://spacenexus.us/compare/sierra-space-vs-axiom-space',
    type: 'article',
    images: [{
      url: '/api/og?title=Sierra+Space+vs+Axiom+Space&subtitle=Commercial+Space+Comparison+2026&type=compare',
      width: 1200,
      height: 630,
      alt: 'Sierra Space vs Axiom Space Comparison',
    }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Sierra Space vs Axiom Space: Commercial Space Comparison 2026 | SpaceNexus',
    description: 'Sierra Space vs Axiom Space — comparing Dream Chaser, commercial stations, and post-ISS strategies.',
    images: ['/api/og?title=Sierra+Space+vs+Axiom+Space&subtitle=Commercial+Space+Comparison+2026&type=compare'],
  },
  alternates: { canonical: 'https://spacenexus.us/compare/sierra-space-vs-axiom-space' },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
