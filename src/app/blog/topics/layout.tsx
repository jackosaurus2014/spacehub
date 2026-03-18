import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Explore Topics - SpaceNexus Blog',
  description:
    'Browse 100+ original space industry articles by topic. Technology, analysis, guides, market intelligence, policy, and more.',
  keywords: [
    'space industry topics',
    'space blog categories',
    'space technology articles',
    'space market analysis',
    'space industry guides',
    'SpaceX articles',
    'satellite tracking guides',
    'space investment analysis',
  ],
  openGraph: {
    title: 'Explore Topics - SpaceNexus Blog',
    description:
      'Browse 100+ original space industry articles by topic. From CubeSats to nuclear propulsion, space law to cybersecurity.',
    url: 'https://spacenexus.us/blog/topics',
  },
  alternates: {
    canonical: 'https://spacenexus.us/blog/topics',
  },
};

export default function TopicsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
