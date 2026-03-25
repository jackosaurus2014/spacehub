import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'AST SpaceMobile vs Lynk Global: Direct-to-Device Satellite Comparison 2026',
  description: 'Compare AST SpaceMobile (ASTS) and Lynk Global side by side — direct-to-cell satellite technology, partnerships with AT&T and MNOs, satellite specs, funding, regulatory status, and market outlook.',
  keywords: ['AST SpaceMobile vs Lynk', 'ASTS stock', 'direct-to-device satellite', 'direct-to-cell comparison', 'satellite-to-phone', 'AST SpaceMobile Lynk Global comparison 2026'],
  openGraph: {
    title: 'AST SpaceMobile vs Lynk Global: Direct-to-Device Satellite Comparison 2026 | SpaceNexus',
    description: 'Side-by-side comparison of AST SpaceMobile and Lynk Global — the two leaders in direct-to-device satellite communications.',
    url: 'https://spacenexus.us/compare/ast-spacemobile-vs-lynk',
    type: 'article',
    images: [{
      url: '/api/og?title=AST+SpaceMobile+vs+Lynk+Global&subtitle=Direct-to-Device+Satellite+Comparison+2026&type=compare',
      width: 1200,
      height: 630,
      alt: 'AST SpaceMobile vs Lynk Global Comparison',
    }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AST SpaceMobile vs Lynk Global: Direct-to-Device Comparison 2026 | SpaceNexus',
    description: 'Side-by-side comparison of AST SpaceMobile and Lynk Global — direct-to-device satellite technology, partnerships, and outlook.',
    images: ['/api/og?title=AST+SpaceMobile+vs+Lynk+Global&subtitle=Direct-to-Device+Satellite+Comparison+2026&type=compare'],
  },
  alternates: { canonical: 'https://spacenexus.us/compare/ast-spacemobile-vs-lynk' },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
