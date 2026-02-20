import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Real-Time Launch Tracker',
  description: 'Track upcoming and recent rocket launches worldwide. Live countdowns, mission details, and launch history from SpaceX, NASA, Rocket Lab, and more.',
  keywords: [
    'rocket launch tracker',
    'upcoming launches',
    'SpaceX launch schedule',
    'NASA launches',
    'launch countdown',
    'rocket launch live',
  ],
  openGraph: {
    title: 'Real-Time Launch Tracker | SpaceNexus',
    description: 'Track upcoming and recent rocket launches worldwide with live countdowns and mission details.',
    url: 'https://spacenexus.us/launch',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Real-Time Launch Tracker | SpaceNexus',
    description: 'Track upcoming and recent rocket launches worldwide with live countdowns and mission details.',
  },
  alternates: {
    canonical: 'https://spacenexus.us/launch',
  },
};

export default function LaunchLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
