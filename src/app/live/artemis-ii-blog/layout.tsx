import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Artemis II Live Blog — Real-Time Launch Updates | SpaceNexus',
  description:
    "Follow NASA's Artemis II Moon mission live. Real-time updates on the launch, crew status, mission milestones, and more. Updated every 15 seconds.",
  keywords: [
    'artemis 2 live blog',
    'artemis ii live updates',
    'artemis launch live',
    'nasa moon mission live blog',
    'artemis 2 real time updates',
    'artemis ii launch blog',
    'nasa artemis live',
    'artemis 2 mission updates',
  ],
  openGraph: {
    title: 'Artemis II Live Blog — Real-Time Launch Updates | SpaceNexus',
    description:
      "Follow NASA's Artemis II Moon mission live. Real-time updates on the launch, crew status, mission milestones, and more. Updated every 15 seconds.",
    url: 'https://spacenexus.us/live/artemis-ii-blog',
    images: [
      {
        url: '/api/og?title=Artemis+II+Live+Blog&subtitle=Real-Time+Launch+Updates&type=data',
        width: 1200,
        height: 630,
        alt: 'Artemis II Live Blog - Real-Time Launch Updates',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Artemis II Live Blog — Real-Time Launch Updates | SpaceNexus',
    description:
      "Follow NASA's Artemis II Moon mission live. Real-time updates on the launch, crew status, mission milestones, and more. Updated every 15 seconds.",
    images: ['/api/og?title=Artemis+II+Live+Blog&subtitle=Real-Time+Launch+Updates&type=data'],
  },
  alternates: {
    canonical: 'https://spacenexus.us/live/artemis-ii-blog',
  },
};

export default function ArtemisIIBlogLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
