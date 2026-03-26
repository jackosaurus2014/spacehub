import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Spire Global vs HawkEye 360: RF Analytics Comparison 2026',
  description: 'Compare Spire Global and HawkEye 360 side by side — RF analytics vs signal intelligence, constellation size, defense customers, and data products. Updated 2026.',
  keywords: ['Spire vs HawkEye 360', 'RF analytics satellite', 'signal intelligence comparison', 'SIGINT satellite', 'space-based RF 2026'],
  openGraph: {
    title: 'Spire Global vs HawkEye 360: RF Analytics Comparison 2026 | SpaceNexus',
    description: 'Side-by-side comparison of Spire Global and HawkEye 360 — two leaders in space-based radio frequency intelligence.',
    url: 'https://spacenexus.us/compare/spire-vs-hawkeye-360',
    type: 'article',
    images: [{
      url: '/api/og?title=Spire+vs+HawkEye+360&subtitle=RF+Analytics+Comparison+2026&type=compare',
      width: 1200,
      height: 630,
      alt: 'Spire vs HawkEye 360 Comparison',
    }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Spire Global vs HawkEye 360: RF Analytics Comparison 2026 | SpaceNexus',
    description: 'Spire Global vs HawkEye 360 — comparing RF analytics vs signal intelligence approaches.',
    images: ['/api/og?title=Spire+vs+HawkEye+360&subtitle=RF+Analytics+Comparison+2026&type=compare'],
  },
  alternates: { canonical: 'https://spacenexus.us/compare/spire-vs-hawkeye-360' },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
