import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Board Prep Report - SpaceNexus Reports',
  description:
    'Generate AI-powered quarterly board briefings for space industry companies. Market landscape, competitive intelligence, regulatory developments, financial position, and strategic opportunities.',
  openGraph: {
    title: 'Board Prep Report - SpaceNexus',
    description:
      'AI-powered quarterly board briefings for space companies. Comprehensive market, competitive, regulatory, and financial analysis.',
    url: 'https://spacenexus.us/reports/board-prep',
  },
  alternates: {
    canonical: 'https://spacenexus.us/reports/board-prep',
  },
};

export default function BoardPrepLayout({ children }: { children: React.ReactNode }) {
  return children;
}
