import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: "How Much Does It Cost to Launch a Satellite in 2026? Falcon 9 $74M, Rideshare from $350k",
  description: 'Falcon 9 launch cost: ~$74M ($3,246/kg). SpaceX rideshare: $350k for 50 kg. Electron: ~$8M. Ariane 6, Vulcan, Starship and 12 more rockets compared, plus what a satellite really costs to fly.',
  alternates: {
    canonical: 'https://spacenexus.us/guide/space-launch-cost-comparison',
  },
  openGraph: {
    title: 'How Much Does It Cost to Launch a Satellite in 2026? Falcon 9 $74M, Rideshare from $350k | SpaceNexus',
    description: 'Falcon 9 launch cost: ~$74M ($3,246/kg). SpaceX rideshare: $350k for 50 kg. Electron: ~$8M. Ariane 6, Vulcan, Starship and 12 more rockets compared, plus what a satellite really costs to fly.',
    images: [
      {
        url: '/api/og?title=Space+Launch+Cost+Comparison&subtitle=Cost+per+kilogram+data+for+SpaceX%2C+ULA%2C+Arianespace%2C+Rocket+Lab%2C+and+more&type=guide',
        width: 1200,
        height: 630,
        alt: 'Space Launch Cost Comparison Guide',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Space Launch Cost Comparison Guide | SpaceNexus',
    description: 'Compare space launch costs across providers. Cost per kilogram data for SpaceX, ULA, Arianespace, and more.',
    images: ['/api/og?title=Space+Launch+Cost+Comparison&subtitle=Cost+per+kilogram+data+for+SpaceX%2C+ULA%2C+Arianespace%2C+Rocket+Lab%2C+and+more&type=guide'],
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
