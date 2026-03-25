import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Rocket Lab vs Astra Space: Small Launch Comparison 2026',
  description: 'Compare Rocket Lab (RKLB) and Astra Space side by side — Electron vs LV0009, revenue, launch history, business model pivot, stock performance, and future outlook for small launch providers.',
  keywords: ['Rocket Lab vs Astra', 'RKLB vs ASTR', 'Electron rocket vs Astra', 'small launch vehicle comparison', 'Rocket Lab Astra comparison 2026', 'small sat launch providers'],
  openGraph: {
    title: 'Rocket Lab vs Astra Space: Small Launch Comparison 2026 | SpaceNexus',
    description: 'Side-by-side comparison of Rocket Lab and Astra Space — from small launch vehicles to diverging business strategies.',
    url: 'https://spacenexus.us/compare/rocket-lab-vs-astra',
    type: 'article',
    images: [{
      url: '/api/og?title=Rocket+Lab+vs+Astra+Space&subtitle=Small+Launch+Vehicle+Comparison+2026&type=compare',
      width: 1200,
      height: 630,
      alt: 'Rocket Lab vs Astra Space Comparison',
    }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Rocket Lab vs Astra Space: Small Launch Comparison 2026 | SpaceNexus',
    description: 'Side-by-side comparison of Rocket Lab and Astra Space — Electron vs LV0009, revenue, and diverging strategies.',
    images: ['/api/og?title=Rocket+Lab+vs+Astra+Space&subtitle=Small+Launch+Vehicle+Comparison+2026&type=compare'],
  },
  alternates: { canonical: 'https://spacenexus.us/compare/rocket-lab-vs-astra' },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
