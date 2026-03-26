import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'SES vs Intelsat: Satellite Communications Comparison 2026',
  description: 'Compare SES and Intelsat side by side — fleet size, C-band spectrum, revenue, orbits, and their pending merger to create a satellite communications giant. Updated 2026.',
  keywords: ['SES vs Intelsat', 'satellite communications comparison', 'SES Intelsat merger', 'C-band spectrum', 'GEO satellite operators 2026'],
  openGraph: {
    title: 'SES vs Intelsat: Satellite Communications Comparison 2026 | SpaceNexus',
    description: 'Side-by-side comparison of SES and Intelsat — GEO/MEO fleets, C-band, and the pending merger creating the largest satellite operator.',
    url: 'https://spacenexus.us/compare/ses-vs-intelsat',
    type: 'article',
    images: [{
      url: '/api/og?title=SES+vs+Intelsat&subtitle=Satellite+Communications+Comparison+2026&type=compare',
      width: 1200,
      height: 630,
      alt: 'SES vs Intelsat Comparison',
    }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SES vs Intelsat: Satellite Communications Comparison 2026 | SpaceNexus',
    description: 'SES vs Intelsat — comparing fleets, C-band spectrum, and the mega-merger reshaping satellite communications.',
    images: ['/api/og?title=SES+vs+Intelsat&subtitle=Satellite+Communications+Comparison+2026&type=compare'],
  },
  alternates: { canonical: 'https://spacenexus.us/compare/ses-vs-intelsat' },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
