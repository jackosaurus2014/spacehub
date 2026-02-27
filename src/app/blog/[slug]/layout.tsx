import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: {
    template: '%s | SpaceNexus Blog',
    default: 'Blog Post | SpaceNexus',
  },
  description: 'Read in-depth space industry analysis, market intelligence, and expert insights on the SpaceNexus blog.',
  openGraph: {
    title: 'SpaceNexus Blog',
    description: 'Read in-depth space industry analysis, market intelligence, and expert insights on the SpaceNexus blog.',
    siteName: 'SpaceNexus',
  },
};

export default function BlogPostLayout({ children }: { children: React.ReactNode }) {
  return children;
}
