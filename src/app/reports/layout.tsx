import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Intelligence Reports - AI-Powered Space Industry Research',
  description:
    'Generate comprehensive, AI-powered research reports on space industry sectors, companies, competitive landscapes, and market entry strategies. Data-driven insights from the SpaceNexus intelligence database.',
  keywords: [
    'space industry reports',
    'space market research',
    'space industry analysis',
    'satellite market report',
    'launch services market',
    'space competitive analysis',
    'space industry intelligence',
  ],
  openGraph: {
    title: 'SpaceNexus Intelligence Reports - AI-Powered Space Research',
    description:
      'Generate comprehensive AI-powered research reports on space industry sectors, companies, and market opportunities.',
    url: 'https://spacenexus.us/reports',
    images: [
      {
        url: '/og-reports.png',
        width: 1200,
        height: 630,
        alt: 'SpaceNexus Intelligence Reports',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SpaceNexus Intelligence Reports',
    description:
      'AI-powered space industry research reports. Sector overviews, company deep dives, competitive analysis, and market entry briefs.',
    images: ['/og-reports.png'],
  },
  alternates: {
    canonical: 'https://spacenexus.us/reports',
  },
};

export default function ReportsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
