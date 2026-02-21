import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Executive Move Tracker | SpaceNexus',
  description: 'Track C-suite and VP-level leadership changes across the space industry. Monitor hiring, departures, and promotions at SpaceX, Blue Origin, and 100+ space companies.',
  keywords: ['space executive moves', 'aerospace leadership changes', 'space industry hiring', 'space CEO changes', 'defense space executives'],
  openGraph: {
    title: 'Executive Move Tracker | SpaceNexus',
    description: 'Track C-suite and VP-level leadership changes across the space industry. Monitor hiring, departures, and promotions at SpaceX, Blue Origin, and 100+ space companies.',
    url: 'https://spacenexus.us/executive-moves',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Executive Move Tracker | SpaceNexus',
    description: 'Track C-suite and VP-level leadership changes across the space industry.',
  },
  alternates: {
    canonical: 'https://spacenexus.us/executive-moves',
  },
};

export default function ExecutiveMovesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
