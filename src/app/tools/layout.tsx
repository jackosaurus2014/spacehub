import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Space Industry Tools',
  description: 'The complete directory of SpaceNexus: launch trackers and rocket pages, news and analysis, market data, business and compliance tools, courses, engineering calculators, and reference data — searchable.',
  openGraph: {
    title: 'Space Industry Tools | SpaceNexus',
    description: 'The complete directory of SpaceNexus: launch trackers and rocket pages, news and analysis, market data, business and compliance tools, courses, engineering calculators, and reference data — searchable.',
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
    description: 'The complete directory of SpaceNexus: launch trackers and rocket pages, news and analysis, market data, business and compliance tools, courses, engineering calculators, and reference data — searchable.',
    images: ['/api/og?title=Space+Engineering+Tools&subtitle=Professional+calculators%2C+comparison+tools%2C+and+planning+resources&type=tools'],
  },
  alternates: {
    canonical: 'https://spacenexus.us/tools',
  },
};

export default function ToolsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
