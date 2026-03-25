import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Space Industry Tools',
  description: 'Professional tools for space industry analysis including calculators, comparison tools, and planning resources.',
  openGraph: {
    title: 'Space Industry Tools | SpaceNexus',
    description: 'Professional tools for space industry analysis including calculators, comparison tools, and planning resources.',
    images: [
      {
        url: '/api/og?title=Space+Engineering+Tools&subtitle=Professional+calculators%2C+comparison+tools%2C+and+planning+resources&type=tools',
        width: 1200,
        height: 630,
        alt: 'Space Engineering Tools',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Space Industry Tools | SpaceNexus',
    description: 'Professional tools for space industry analysis including calculators, comparison tools, and planning resources.',
    images: ['/api/og?title=Space+Engineering+Tools&subtitle=Professional+calculators%2C+comparison+tools%2C+and+planning+resources&type=tools'],
  },
  alternates: {
    canonical: 'https://spacenexus.us/tools',
  },
};

export default function ToolsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
