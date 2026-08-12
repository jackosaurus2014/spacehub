import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Industry Reports - Space Industry Research',
  description:
    'In-depth research reports on the space industry: market sizing, company landscapes, investment trends, and regulatory developments from the SpaceNexus research team.',
  keywords: [
    'space industry reports',
    'space market research',
    'space industry analysis',
    'satellite market report',
    'launch services market',
    'space industry intelligence',
  ],
  openGraph: {
    title: 'SpaceNexus Industry Reports - Space Industry Research',
    description:
      'In-depth research reports on space industry sectors, companies, and market trends.',
    url: 'https://spacenexus.us/reports',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'SpaceNexus Industry Reports',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SpaceNexus Industry Reports',
    description:
      'In-depth space industry research reports: market sizing, company landscapes, investment trends, and regulatory developments.',
    images: ['/og-image.png'],
  },
  alternates: {
    canonical: 'https://spacenexus.us/reports',
  },
};

export default function ReportsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
