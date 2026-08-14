import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Starship Program Tracker — Live Flight History & News | SpaceNexus',
  description:
    "SpaceX Starship, tracked live: flight history through Flight 13 (Jul 24, 2026 — first operational Starlink V3 deployment), program roles (Starlink V3, Artemis HLS, propellant transfer, Mars), and a self-updating live news feed refreshed continuously as new coverage publishes.",
  keywords: [
    'starship tracker',
    'spacex starship',
    'starship flight 13',
    'starship flight 14',
    'super heavy booster',
    'starship hls',
    'raptor engine',
    'starship news',
    'starship starlink v3',
  ],
  openGraph: {
    title: 'Starship Program Tracker — Live Flight History & News | SpaceNexus',
    description:
      'SpaceX Starship, tracked live: flight history, program roles (Starlink V3, Artemis HLS, propellant transfer, Mars), and continuously-updating news.',
    url: 'https://spacenexus.us/starship',
    images: [
      {
        url: '/api/og?title=Starship+Program+Tracker&subtitle=Live+Flight+History+%26+News&type=data',
        width: 1200,
        height: 630,
        alt: 'Starship Program Tracker - Live Flight History and News',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Starship Program Tracker — Live Flight History & News | SpaceNexus',
    description:
      'SpaceX Starship, tracked live: flight history, program roles (Starlink V3, Artemis HLS, propellant transfer, Mars), and continuously-updating news.',
    images: ['/api/og?title=Starship+Program+Tracker&subtitle=Live+Flight+History+%26+News&type=data'],
  },
  alternates: {
    canonical: 'https://spacenexus.us/starship',
  },
};

export default function StarshipLayout({ children }: { children: React.ReactNode }) {
  return children;
}
