import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Space Industry Newsletters Compared | SpaceNexus',
  description:
    'Compare the top space industry newsletters side-by-side: Payload Space, SpaceNexus Weekly Brief, Orbital Index, T-Minus, and Space Explored. Frequency, content focus, price, and audience analysis.',
  keywords: [
    'space newsletter comparison',
    'Payload Space newsletter',
    'SpaceNexus Weekly Brief',
    'Orbital Index newsletter',
    'T-Minus newsletter',
    'Space Explored newsletter',
    'best space newsletter',
    'space industry news',
    'space newsletter free',
    'aerospace newsletter',
  ],
  openGraph: {
    title: 'Space Industry Newsletters Compared | SpaceNexus',
    description:
      'Side-by-side comparison of the top space industry newsletters. Find the right newsletter for your role in the space economy.',
    type: 'website',
    url: 'https://spacenexus.us/compare/newsletters',
    siteName: 'SpaceNexus',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Space Industry Newsletters Compared | SpaceNexus',
    description:
      'Compare the top space industry newsletters: frequency, content, pricing, and audience.',
  },
  alternates: {
    canonical: 'https://spacenexus.us/compare/newsletters',
  },
};

export default function NewsletterCompareLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
