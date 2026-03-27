import type { Metadata } from 'next';

export const metadata: Metadata = {
  description: 'See what\'s coming next on SpaceNexus. Our public product roadmap and upcoming features.',
  alternates: {
    canonical: 'https://spacenexus.us/roadmap',
  },
  openGraph: {
    title: 'Product Roadmap | SpaceNexus',
    description: "See what's next for SpaceNexus. Our public roadmap covers upcoming features, integrations, and platform improvements for 2026 and beyond.",
    images: [{ url: '/api/og?title=Product+Roadmap&type=data', width: 1200, height: 630, alt: 'Product Roadmap' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Product Roadmap | SpaceNexus',
    description: "See what's next for SpaceNexus. Our public roadmap covers upcoming features, integrations, and platform improvements for 2026 and beyond.",
    images: ['/api/og?title=Product+Roadmap&type=data'],
  },
};

export default function RoadmapLayout({ children }: { children: React.ReactNode }) {
  return children;
}
