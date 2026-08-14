import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Artemis Program Tracker — Live Mission Timeline & News | SpaceNexus',
  description:
    "The living tracker for NASA's Artemis Moon program: mission timeline (Artemis I-V+), Artemis III status (restructured, NET late 2027), hardware milestones, and a self-updating live news feed refreshed continuously as new coverage publishes.",
  keywords: [
    'artemis program tracker',
    'artemis iii',
    'artemis iii date',
    'nasa artemis timeline',
    'orion spacecraft news',
    'starship hls',
    'blue moon lander',
    'artemis news',
    'nasa moon program',
  ],
  openGraph: {
    title: 'Artemis Program Tracker — Live Mission Timeline & News | SpaceNexus',
    description:
      "NASA's Artemis Moon program, tracked live: mission timeline, Artemis III status (NET late 2027), hardware milestones, and continuously-updating news.",
    url: 'https://spacenexus.us/artemis',
    images: [
      {
        url: '/api/og?title=Artemis+Program+Tracker&subtitle=Live+Mission+Timeline+%26+News&type=data',
        width: 1200,
        height: 630,
        alt: 'Artemis Program Tracker - Live Mission Timeline and News',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Artemis Program Tracker — Live Mission Timeline & News | SpaceNexus',
    description:
      "NASA's Artemis Moon program, tracked live: mission timeline, Artemis III status (NET late 2027), hardware milestones, and continuously-updating news.",
    images: ['/api/og?title=Artemis+Program+Tracker&subtitle=Live+Mission+Timeline+%26+News&type=data'],
  },
  alternates: {
    canonical: 'https://spacenexus.us/artemis',
  },
};

export default function ArtemisLayout({ children }: { children: React.ReactNode }) {
  return children;
}
