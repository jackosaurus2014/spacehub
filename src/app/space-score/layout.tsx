import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Space Score Leaderboard - Company Ratings & Rankings',
  description: 'Space Score is a composite 0-1000 rating system for space companies measuring Innovation, Financial Health, Market Position, Operational Capacity, and Growth Trajectory. See how SpaceX, Blue Origin, Rocket Lab, and 100+ companies rank.',
  keywords: [
    'space company ratings',
    'space score',
    'space industry rankings',
    'aerospace company comparison',
    'SpaceX score',
    'space company leaderboard',
    'space industry analysis',
    'space company metrics',
  ],
  openGraph: {
    title: 'SpaceNexus Space Score - Company Ratings & Leaderboard',
    description: 'Composite 0-1000 rating system for 100+ space companies across Innovation, Financial Health, Market Position, Operations, and Growth.',
    url: 'https://spacenexus.us/space-score',
    images: [
      {
        url: '/og-space-score.png',
        width: 1200,
        height: 630,
        alt: 'SpaceNexus Space Score Leaderboard - Rating 100+ Space Companies',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SpaceNexus Space Score - Company Ratings & Leaderboard',
    description: 'Composite 0-1000 rating system for 100+ space companies across 5 key dimensions.',
    images: ['/og-space-score.png'],
  },
  alternates: {
    canonical: 'https://spacenexus.us/space-score',
  },
};

export default function SpaceScoreLayout({ children }: { children: React.ReactNode }) {
  return children;
}
