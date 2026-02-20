import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Live Launch Coverage',
  description: 'Watch live rocket launch streams with real-time telemetry, mission commentary, and multi-angle video feeds. Never miss a SpaceX, NASA, or Rocket Lab launch.',
  keywords: [
    'live launch',
    'launch stream',
    'rocket launch live',
    'SpaceX live',
    'launch webcast',
  ],
  openGraph: {
    title: 'Live Launch Coverage | SpaceNexus',
    description: 'Watch live rocket launch streams with real-time telemetry, mission commentary, and multi-angle video feeds. Never miss a SpaceX, NASA, or Rocket Lab launch.',
    url: 'https://spacenexus.us/live',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Live Launch Coverage | SpaceNexus',
    description: 'Watch live rocket launch streams with real-time telemetry, mission commentary, and multi-angle video feeds. Never miss a SpaceX, NASA, or Rocket Lab launch.',
  },
  alternates: {
    canonical: 'https://spacenexus.us/live',
  },
};

export default function LiveLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
