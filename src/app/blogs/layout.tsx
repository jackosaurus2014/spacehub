import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Space Industry Blog & Analysis',
  description: 'Expert analysis, news, and insights on the space industry. Coverage of launches, satellite technology, space economy, regulatory developments, and market trends.',
  keywords: ['space industry blog', 'aerospace analysis', 'space news analysis', 'satellite industry insights', 'space economy articles'],
  openGraph: {
    title: 'SpaceNexus Blog - Space Industry Analysis & Insights',
    description: 'Expert analysis and insights on the space industry from SpaceNexus.',
    url: 'https://spacenexus.us/blogs',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SpaceNexus Blog - Space Industry Analysis & Insights',
    description: 'Expert analysis and insights on the space industry from SpaceNexus.',
    images: ['/og-image.png'],
  },
  alternates: {
    canonical: 'https://spacenexus.us/blogs',
  },
};

export default function BlogsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
