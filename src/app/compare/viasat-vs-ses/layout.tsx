import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Viasat vs SES: Satellite Communications Comparison 2026',
  description: 'Compare Viasat and SES side by side — satellite fleets, revenue, post-merger integrations (Inmarsat and Intelsat), aviation and maritime markets, government contracts, and technology roadmaps.',
  keywords: ['Viasat vs SES', 'VSAT vs SES stock', 'satellite communications comparison', 'Viasat Inmarsat', 'SES Intelsat', 'satcom companies 2026'],
  openGraph: {
    title: 'Viasat vs SES: Satellite Communications Comparison 2026 | SpaceNexus',
    description: 'Side-by-side comparison of Viasat and SES — two satellite communications giants navigating major post-merger transformations.',
    url: 'https://spacenexus.us/compare/viasat-vs-ses',
    type: 'article',
    images: [{
      url: '/api/og?title=Viasat+vs+SES&subtitle=Satellite+Communications+Comparison+2026&type=compare',
      width: 1200,
      height: 630,
      alt: 'Viasat vs SES Comparison',
    }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Viasat vs SES: Satellite Communications Comparison 2026 | SpaceNexus',
    description: 'Side-by-side comparison of Viasat and SES — satellite fleets, revenue, mergers, and market strategy.',
    images: ['/api/og?title=Viasat+vs+SES&subtitle=Satellite+Communications+Comparison+2026&type=compare'],
  },
  alternates: { canonical: 'https://spacenexus.us/compare/viasat-vs-ses' },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
