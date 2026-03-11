import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Industry Trends & Analysis',
  description: 'Data-backed analysis of the top trends shaping the space industry from reusability to AI operations.',
  openGraph: {
    title: 'Industry Trends & Analysis | SpaceNexus',
    description: 'Data-backed analysis of the top trends shaping the space industry from reusability to AI operations.',
  },
    twitter: {
    card: 'summary_large_image',
    title: 'Industry Trends & Analysis | SpaceNexus',
    description: 'Data-backed analysis of the top trends shaping the space industry from reusability to AI operations.',
    images: ['/og-image.png'],
  },
  alternates: {
    canonical: 'https://spacenexus.us/industry-trends',
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
