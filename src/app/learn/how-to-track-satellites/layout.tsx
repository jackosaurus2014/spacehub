import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'How to Track Satellites in Real Time',
  description: 'Complete guide to tracking satellites in real time. Learn about tools, techniques, and platforms for monitoring objects in orbit.',
  alternates: {
    canonical: 'https://spacenexus.us/learn/how-to-track-satellites',
  },
  openGraph: {
    title: 'How to Track Satellites in Real Time | SpaceNexus',
    description: 'Complete guide to tracking satellites in real time. Learn about tools, techniques, and platforms for monitoring objects in orbit.',
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
