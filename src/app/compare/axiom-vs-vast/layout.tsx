import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Axiom Space vs Vast: Commercial Space Station Comparison 2026',
  description: 'Compare Axiom Space and Vast side by side — commercial space station architectures, NASA CLD contracts, timelines, funding, crew capacity, and business models for the post-ISS era.',
  keywords: ['Axiom Space vs Vast', 'commercial space station comparison', 'NASA CLD', 'Axiom station', 'Vast Haven-1', 'post-ISS space stations 2026'],
  openGraph: {
    title: 'Axiom Space vs Vast: Commercial Space Station Comparison 2026 | SpaceNexus',
    description: 'Side-by-side comparison of Axiom Space and Vast — two leading commercial space station developers.',
    url: 'https://spacenexus.us/compare/axiom-vs-vast',
    type: 'article',
    images: [{
      url: '/api/og?title=Axiom+Space+vs+Vast&subtitle=Commercial+Space+Station+Comparison+2026&type=compare',
      width: 1200,
      height: 630,
      alt: 'Axiom Space vs Vast Comparison',
    }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Axiom Space vs Vast: Commercial Space Station Comparison 2026 | SpaceNexus',
    description: 'Side-by-side comparison of Axiom Space and Vast — architectures, funding, and timelines for commercial space stations.',
    images: ['/api/og?title=Axiom+Space+vs+Vast&subtitle=Commercial+Space+Station+Comparison+2026&type=compare'],
  },
  alternates: { canonical: 'https://spacenexus.us/compare/axiom-vs-vast' },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
